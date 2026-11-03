// Pilotage de la chaîne (P5) : ordre des étapes, pause, étapes payantes sans plafonds, sources dues, cadence de
// l'approfondissement, état et coûts. Faux exécuteur : aucune commande lancée, aucun réseau.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setPaused } from '../src/control/settings.ts';
import { coutsReels, ETAPES, etatDeLaChaine, lancerCycle, lireCycle, sourcesDues, type Etape } from '../src/pilotage/pilotage.ts';
import { SOURCES } from '../src/sources.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { ajouterActualite, socle } from './helpers/publications.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await socle(t.database.client);
});
afterEach(() => t.cleanup());

const PLAFONDS = { CURATION_MODELE: 'deepseek-flash', DEEPSEEK_API_KEY: 'cle-de-test', CURATION_MAX_ACTUALITES: '20', CURATION_MAX_TRADUCTIONS: '40', CURATION_PLAFOND_EXECUTION_USD: '0.05', CURATION_PLAFOND_TOTAL_USD: '3.99', CURATION_PLAFOND_JOUR_USD: '0.20' };

function faux(codes: Partial<Record<Etape['nom'], number>> = {}) {
  const appels: { nom: string; env: Record<string, string> }[] = [];
  return { appels, executer: async (e: Etape, env: Record<string, string>) => { appels.push({ nom: e.nom, env }); return { code: codes[e.nom] ?? 0 }; } };
}

describe('cycle', () => {
  it('enchaîne les sept étapes dans l\'ordre et enregistre son bilan', async () => {
    const f = faux({ collecte: 1 });
    const bilan = await lancerCycle({ database: t.database, executer: f.executer, env: PLAFONDS, confirme: true, maintenant: () => '2026-11-03T09:02:00.000Z' });
    expect(f.appels.map((a) => a.nom)).toEqual(ETAPES.map((e) => e.nom));
    // Une étape en échec n'empêche pas la publication du jour.
    expect(bilan.etapes.find((e) => e.nom === 'collecte')).toMatchObject({ statut: 'echec', code: 1 });
    expect(bilan.etapes.find((e) => e.nom === 'publication')!.statut).toBe('reussie');
    expect((await lireCycle(t.database.client))!.debut).toBe('2026-11-03T09:02:00.000Z');
  });

  it('refuse sans --confirmer et ne fait rien pendant la pause', async () => {
    const f = faux();
    expect((await lancerCycle({ database: t.database, executer: f.executer, env: PLAFONDS, confirme: false })).statut).toBe('refuse');
    await setPaused(t.database, true, 'x');
    expect((await lancerCycle({ database: t.database, executer: f.executer, env: PLAFONDS, confirme: true })).statut).toBe('pause');
    expect(f.appels).toEqual([]);
  });

  it('saute les étapes payantes sans modèle, clé ou plafonds', async () => {
    const f = faux();
    const bilan = await lancerCycle({ database: t.database, executer: f.executer, env: { CURATION_MODELE: 'deepseek-flash' }, confirme: true });
    expect(f.appels.map((a) => a.nom)).toEqual(['collecte', 'approfondissement', 'controles', 'planification', 'publication']);
    expect(bilan.etapes.find((e) => e.nom === 'brouillons')!.motif).toContain('DEEPSEEK_API_KEY');
  });

  it('ne collecte que les sources dues et n\'approfondit qu\'une fois par heure', async () => {
    const c = t.database.client;
    const toutes = await sourcesDues(c, '2026-11-03T09:00:00.000Z');
    expect(toutes).toHaveLength(SOURCES.length);
    const f = faux();
    await lancerCycle({ database: t.database, executer: f.executer, env: PLAFONDS, confirme: true, maintenant: () => '2026-11-03T09:00:00.000Z' });
    expect(f.appels[0]!.env.CURATION_ONLY_SOURCES!.split(',')).toHaveLength(SOURCES.length);
    // Toutes les sources viennent de réussir : aucune n'est due 5 minutes plus tard, et l'approfondissement attend.
    for (const s of SOURCES) {
      await c.execute({ sql: `insert or ignore into source (id, kind, name, config, allowed_hosts, created_at) values (?, 'feed', ?, '{}', '[]', 'x')`, args: [s.id, s.id] });
      await c.execute({ sql: `update source set last_success_at = '2026-11-03T09:00:30.000Z' where id = ?`, args: [s.id] });
    }
    const g = faux();
    const bilan = await lancerCycle({ database: t.database, executer: g.executer, env: PLAFONDS, confirme: true, maintenant: () => '2026-11-03T09:05:00.000Z' });
    expect(bilan.etapes.slice(0, 2).map((e) => [e.nom, e.statut])).toEqual([['collecte', 'sautee'], ['approfondissement', 'sautee']]);
    expect(g.appels.map((a) => a.nom)).not.toContain('approfondissement');
  });
});

describe('plafond du jour', () => {
  it('saute les étapes payantes quand la dépense du jour atteint le plafond', async () => {
    await ajouterActualite(t.database.client, 1);
    await t.database.client.execute(`insert into llm_call (run_id, news_item_id, stage, attempt, model, prompt_version, status, reserved_micro_usd, actual_micro_usd, started_at) values ('r', 1, 'traduction', 1, 'deepseek-flash', 't1', 'reussi', 300000, 250000, '2026-11-03T06:00:00.000Z')`);
    const f = faux();
    const bilan = await lancerCycle({ database: t.database, executer: f.executer, env: PLAFONDS, confirme: true, maintenant: () => '2026-11-03T09:00:00.000Z' });
    expect(f.appels.map((a) => a.nom)).not.toContain('brouillons');
    expect(f.appels.map((a) => a.nom)).not.toContain('traduction');
    expect(bilan.etapes.find((e) => e.nom === 'traduction')!.motif).toContain('plafond du jour atteint');
    // Le lendemain (Europe/Paris), le compteur repart de zéro.
    const g = faux();
    await lancerCycle({ database: t.database, executer: g.executer, env: PLAFONDS, confirme: true, maintenant: () => '2026-11-04T09:00:00.000Z' });
    expect(g.appels.map((a) => a.nom)).toContain('traduction');
  });
});

describe('état et coûts', () => {
  it('résume la file, les reportées par motif et la dépense', async () => {
    const c = t.database.client;
    await ajouterActualite(c, 1);
    const { postId } = await ajouterActualite(c, 2);
    await c.execute({ sql: `update publication_planifiee set etat = 'reportee', motif = 'doublon_possible' where post_id = ?`, args: [postId] });
    await c.execute(`insert into llm_call (run_id, news_item_id, stage, attempt, model, prompt_version, status, reserved_micro_usd, actual_micro_usd, started_at) values ('r', 1, 'traduction', 1, 'deepseek-flash', 't1', 'reussi', 900, 500, '2026-11-03T08:00:00.000Z'), ('r', 1, 'redaction', 1, 'deepseek-flash', 'p3', 'erreur', 700, null, '2026-11-02T08:00:00.000Z')`);
    const e = await etatDeLaChaine(t.database, '2026-11-03T09:00:00.000Z', 20);
    expect(e).toMatchObject({ pause: false, jour: '2026-11-03', publiees_aujourdhui: 0, en_attente: 1, reportees: [{ motif: 'doublon_possible', n: 1 }], depense_micro_usd: 1200 });
    const couts = await coutsReels(c);
    expect(couts.total_micro_usd).toBe(1200);
    expect(couts.par_etape).toEqual([{ etape: 'redaction', appels: 1, micro_usd: 700 }, { etape: 'traduction', appels: 1, micro_usd: 500 }]);
    expect(couts.par_jour).toEqual([{ jour: '2026-11-03', micro_usd: 500 }, { jour: '2026-11-02', micro_usd: 700 }]);
  });
});
