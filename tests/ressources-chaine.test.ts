// Lot CHAINE de la chaîne des ressources (ADR 0011 §6 et §7) : planification sous le plafond partagé, import complet,
// maquette et script de recherche. Aucun réseau (transport injecté), aucun navigateur (rendeur injecté), aucun modèle.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { loadConfig } from '../src/config.ts';
import type { Montage } from '../src/media/montage.ts';
import type { ResultatRendu } from '../src/media/rendu.ts';
import { buildMaquetteData } from '../src/maquette/data.ts';
import { scriptRecherche } from '../src/maquette/recherche.ts';
import { textesDePublication } from '../src/recherche/index.ts';
import { classer, type DocumentRecherche } from '../src/recherche/moteur.ts';
import { rechercher } from '../src/recherche/rechercher.ts';
import { executerCapture } from '../src/ressources/capture.ts';
import { texteOrigine } from '../src/ressources/chaine.ts';
import { importer } from '../src/ressources/commandes/importer.ts';
import { planning } from '../src/ressources/commandes/planning.ts';
import type { EntreeRessource } from '../src/ressources/liste.ts';
import { motsClesDe } from '../src/ressources/mots-cles.ts';
import { ajouterJours, ecrirePlacement, jourParis, placer, renumeroter, retirerDuPlanning, type APlacer, type Occupation } from '../src/ressources/planification.ts';
import { BrouillonRessource, MENTION_IA } from '../src/ressources/schemas.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';

const lire = (chemin: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${chemin}`, import.meta.url)), 'utf8');
const BROUILLON = JSON.parse(lire('ressources/brouillon-demo-anim.json')) as Record<string, any>;
const copie = <T>(v: T): T => structuredClone(v);

// --- Planification pure -----------------------------------------------------------------------------------------------

const R = { plafond: 20, reserve: 5, horizon: 60 };
const existante = (postId: number, ordre = postId): APlacer => ({ postId, priorite: 2, statutSortie: 'ressource_existante', ordre });

describe('planification sous le plafond partagé', () => {
  it('20 ressources existantes : 15 le premier jour (hors réserve), 5 le suivant ; le plafond n’est jamais dépassé', () => {
    const p = placer(Array.from({ length: 20 }, (_, i) => existante(i + 1)), new Map(), '2026-11-02', R);
    expect(p.filter((x) => x.jour === '2026-11-02')).toHaveLength(15);
    expect(p.filter((x) => x.jour === '2026-11-03')).toHaveLength(5);
    expect(p.every((x) => !x.utiliseReserve && x.etat === 'prevue')).toBe(true);
    // Rangs du premier jour : 1 à 15, dans l'ordre de la liste.
    expect(p.slice(0, 15).map((x) => x.rang)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('une nouvelle sortie passe avant les ressources existantes et prend la réserve ; une actualité de priorité 4 ne la prend jamais', () => {
    const items: APlacer[] = [...Array.from({ length: 15 }, (_, i) => existante(i + 1)), { postId: 99, priorite: 2, statutSortie: 'nouvelle_sortie', ordre: 50 }, { postId: 98, priorite: 4, statutSortie: 'actualite', ordre: 0 }];
    const p = placer(items, new Map(), '2026-11-02', R);
    const ns = p.find((x) => x.postId === 99)!;
    expect(p[0]!.postId).toBe(99);
    expect(ns).toMatchObject({ jour: '2026-11-02', utiliseReserve: true, rang: 1 });
    const a4 = p.find((x) => x.postId === 98)!;
    expect(a4).toMatchObject({ jour: '2026-11-03', utiliseReserve: false });
  });

  it('compte les autres contenus du jour, tous confondus ; reporte au-delà de l’horizon ; plafond nul = tout reporté', () => {
    const plein = new Map<string, Occupation>([['2026-11-02', { normales: 15, reserve: 0 }]]);
    expect(placer([existante(1)], plein, '2026-11-02', R)[0]!.jour).toBe('2026-11-03');
    const toutPlein = new Map<string, Occupation>(Array.from({ length: 3 }, (_, i) => [ajouterJours('2026-11-02', i), { normales: 15, reserve: 5 }]));
    expect(placer([existante(1)], toutPlein, '2026-11-02', { ...R, horizon: 3 })[0]).toMatchObject({ etat: 'reportee', jour: null, motif: 'plafond_atteint' });
    expect(placer([existante(1)], new Map(), '2026-11-02', { plafond: 0, reserve: 0, horizon: 60 })[0]!.etat).toBe('reportee');
    expect(() => placer([], new Map(), '2026-11-02', { plafond: 2, reserve: 3, horizon: 1 })).toThrow();
  });

  it('jour civil Europe/Paris, y compris au changement d’heure', () => {
    expect(jourParis('2026-11-02T23:30:00.000Z')).toBe('2026-11-03');
    expect(jourParis('2026-11-02T22:59:59.000Z')).toBe('2026-11-02');
    expect(ajouterJours('2026-10-24', 1)).toBe('2026-10-25');
    expect(ajouterJours('2026-10-25', 1)).toBe('2026-10-26');
  });
});

// --- Chaîne complète sur fixtures ---------------------------------------------------------------------------------------

const ANIM: EntreeRessource = { slug: 'demo-anim', nom: 'demo-anim', depot: 'exemple-org/demo-skills', chemins: ['skills/anim/SKILL.md', 'README.md'], compte: 'repo' };
const LISTE = [ANIM];
const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
type Route = { status?: number; body: string; headers?: Record<string, string> };

function routes(): Record<string, Route> {
  return {
    [`${API}/rate_limit`]: { body: JSON.stringify({ resources: { core: { limit: 60, remaining: 50, reset: 1_793_635_200 } } }) },
    [`${API}/repos/exemple-org/demo-skills`]: { body: lire('ressources/depot-demo-skills.json') },
    [`${API}/repos/exemple-org/demo-skills/contents/skills/anim?ref=main`]: { body: lire('ressources/dossier-anim.json') },
    [`${RAW}/exemple-org/demo-skills/main/README.md`]: { body: lire('ressources/readme-demo-skills.md') },
    [`${RAW}/exemple-org/demo-skills/main/skills/anim/SKILL.md`]: { body: lire('ressources/skill-anim.md') },
    [`${RAW}/exemple-org/demo-skills/main/skills/anim/LICENSE.txt`]: { body: lire('ressources/licence-anim.txt') },
  };
}
function faux(table: Record<string, Route>): Transport & { appels: string[] } {
  const appels: string[] = [];
  const t: Transport = async (req) => {
    const url = req.url.toString();
    appels.push(url);
    const r = table[url];
    if (!r) return { status: 404, headers: {}, body: Buffer.from('Not Found') };
    return { status: r.status ?? 200, headers: r.headers ?? {}, body: Buffer.from(r.body) };
  };
  return Object.assign(t, { appels });
}
const PUBLIQUE: Resolver = async () => [{ address: '140.82.112.6', family: 4 }];
const HORLOGE = () => new Date('2026-11-02T12:00:00.000Z');

/** Rendeur de test : écrit un faux JPEG, ou rend les défauts demandés, sans navigateur. */
function rendeur(defauts: string[] = []): ((m: Montage[], d: string) => Promise<ResultatRendu[]>) & { montages: Montage[] } {
  const montages: Montage[] = [];
  const f = async (ms: Montage[], dossier: string) => {
    montages.push(...ms);
    return ms.map((m) => {
      if (defauts.length > 0) return { id: m.id, fichier: null, defauts, duree_ms: 0, octets: 0 };
      const fichier = join(dossier, `${m.id}.jpg`);
      writeFileSync(fichier, 'jpeg');
      return { id: m.id, fichier, defauts: [], duree_ms: 1, octets: 4 };
    });
  };
  return Object.assign(f, { montages });
}

let t: TestDb;
let dossier: string;
let sortie: string[];
beforeEach(async () => {
  t = await createTestDb();
  dossier = mkdtempSync(join(tmpdir(), 'curation-chaine-'));
  sortie = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
  await executerCapture({ database: t.database, userAgent: 'test', workerId: 'test', entrees: LISTE, transport: faux(routes()), resolve: PUBLIQUE, horloge: HORLOGE, mode: 'fixture' });
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dossier, { recursive: true, force: true });
  t.cleanup();
});

const ctx = (o: { rendre?: ReturnType<typeof rendeur>; table?: Record<string, Route>; horloge?: () => Date } = {}) => ({
  config: loadConfig({}),
  database: t.database,
  dossier,
  liste: LISTE,
  transport: faux(o.table ?? routes()),
  resolve: PUBLIQUE,
  horloge: o.horloge ?? HORLOGE,
  rendre: o.rendre ?? rendeur(),
  dossierVisuels: dossier,
});
function brouillon(contenu: Record<string, any> = BROUILLON, nom = 'demo-anim.json'): string {
  const f = join(dossier, nom);
  writeFileSync(f, JSON.stringify(contenu));
  return f;
}
const ligne = async (sql: string) => (await t.database.client.execute(sql)).rows[0];

describe('importer : chaîne complète', () => {
  it('conforme : publication en attente, planifiée, indexée ; brouillon d’origine « Claude Code », bouton vérifié, mots-clés, visuel ; aucun appel au modèle', async () => {
    const r = rendeur();
    expect(await importer([brouillon()], ctx({ rendre: r }))).toBe(0);
    expect(sortie.join('\n')).toMatch(/demo-anim : planifiée le 2026-11-02 \(rang 1\)/);
    expect(await ligne('select status, evidence_level, account_id from post')).toMatchObject({ status: 'en_attente', evidence_level: 'documentary_analysis', account_id: 'repo' });
    expect(await ligne('select origine, model, prompt_version, status from post_draft')).toMatchObject({ origine: 'claude_code_developpement', model: 'claude-code', prompt_version: 'ressources-r2', status: 'controle_automatique' });
    expect(await ligne('select status, max_items, cap_run_micro_usd, reason from llm_run')).toMatchObject({ status: 'terminee', max_items: 0, cap_run_micro_usd: 0, reason: 'import ressources, aucun appel au modèle' });
    expect(await scalar(t.database, 'select count(*) from llm_call')).toBe(0);
    expect(await ligne('select jour, rang, priorite, statut_sortie, utilise_reserve, etat from publication_planifiee')).toMatchObject({ jour: '2026-11-02', rang: 1, priorite: 2, statut_sortie: 'ressource_existante', utilise_reserve: 0, etat: 'prevue' });
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(1);
    // Captures de fixture : elles ne tiennent pas lieu de vérification ; le lien est vérifié par l'API (transport injecté).
    expect(await ligne('select libelle, destination, resultat, motif, statut_http from post_bouton')).toMatchObject({ libelle: 'Voir le dépôt', destination: 'depot', resultat: 'verifie', motif: 'reponse_api', statut_http: 200 });
    expect(await ligne(`select origin, notice from media_asset`)).toMatchObject({ origin: 'generated', notice: 'Illustration — ne prouve pas le fonctionnement' });
    expect(r.montages[0]).toMatchObject({ gabarit: 'etapes', compte: 'repo' });
    const contenu = JSON.parse(String((await ligne('select content from post_revision'))!.content));
    expect(contenu).toMatchObject({ mention: MENTION_IA, origine: 'claude_code_developpement', statut_sortie: 'ressource_existante', nature: 'ressource', niveau_preuve: 'documentary_analysis' });
    expect(contenu.etat_depot.full_name).toBe('exemple-org/demo-skills');
    expect(await scalar(t.database, 'select count(*) from post_source')).toBe(contenu.captures.length);
    expect(await scalar(t.database, `select count(*) from post_mot_cle where champ = 'usage'`)).toBe(2);

    // Recherche en mode aperçu : retrouvée par un usage, sans son nom, étiquetée « pas encore publié ».
    const res = await rechercher(t.database.client, 'motion design', { mode: 'apercu' });
    expect(res.resultats[0]).toMatchObject({ nom: 'demo-anim', etiquette: 'pas encore publié' });
    expect(res.resultats[0]!.correspondances[0]).toMatchObject({ champ: 'usage', terme: 'motion design' });
    expect((await rechercher(t.database.client, 'motion design', { mode: 'public' })).total).toBe(0);
  });

  it('idempotent : un second import sans changement ne crée rien ; un contenu modifié ajoute une révision', async () => {
    const f = brouillon();
    await importer([f], ctx());
    const compter = async () => Promise.all(['post', 'post_revision', 'post_bouton', 'media_asset', 'post_mot_cle', 'llm_run', 'publication_planifiee'].map((x) => scalar(t.database, `select count(*) from ${x}`)));
    const avant = await compter();
    sortie = [];
    expect(await importer([f], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/demo-anim : inchangée \(en_attente, prévue le 2026-11-02\)/);
    expect(await compter()).toEqual(avant);

    const modifie = copie(BROUILLON);
    modifie.interet.texte = 'Il sert quand on demande du motion design sur une page web, selon la source.';
    await importer([brouillon(modifie)], ctx());
    expect(await scalar(t.database, 'select max(seq) from post_revision')).toBe(2);
    expect(await scalar(t.database, 'select count(*) from post')).toBe(1);
    // La ligne d'index suit la nouvelle révision.
    expect(await scalar(t.database, 'select revision_id from recherche_publication')).toBe(await scalar(t.database, 'select id from post_revision where seq = 2'));
  });

  it('défaut bloquant : rejetée avec motif, code 1 ; ni visuel, ni bouton, ni mot-clé, ni planning, ni index', async () => {
    const mauvais = copie(BROUILLON);
    mauvais.demarrage.commande = 'npm install -g demo-anim';
    const r = rendeur();
    expect(await importer([brouillon(mauvais)], ctx({ rendre: r }))).toBe(1);
    expect(sortie.join('\n')).toMatch(/demo-anim : rejetée — commande_introuvable/);
    expect(r.montages).toHaveLength(0);
    expect(await ligne('select status from post')).toMatchObject({ status: 'rejete' });
    expect(await ligne('select status, rejection_reason from post_draft')).toMatchObject({ status: 'rejete', rejection_reason: 'commande_introuvable' });
    for (const table of ['media_asset', 'post_bouton', 'post_mot_cle', 'publication_planifiee', 'recherche_publication']) expect(await scalar(t.database, `select count(*) from ${table}`)).toBe(0);
  });

  it('« à vérifier » : jamais forcée — ni planifiée ni indexée, motifs affichés ; une publication déjà planifiée en sort', async () => {
    await importer([brouillon()], ctx());
    expect(await scalar(t.database, 'select count(*) from publication_planifiee')).toBe(1);
    const douteux = copie(BROUILLON);
    douteux.accroche.texte = 'demo-anim, un skill pour animer des pages web ?';
    sortie = [];
    expect(await importer([brouillon(douteux)], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/demo-anim : à vérifier — non planifiée, non indexée : accroche_non_conforme/);
    expect(await ligne('select status from post')).toMatchObject({ status: 'a_verifier' });
    expect(await scalar(t.database, 'select count(*) from publication_planifiee')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(0);
    expect((await rechercher(t.database.client, 'motion design', { mode: 'apercu' })).total).toBe(0);
  });

  it('visuel refusé puis rendu au nouvel import ; lien en échec (404) : « à vérifier », aucun bouton affichable', async () => {
    const f = brouillon();
    expect(await importer([f], ctx({ rendre: rendeur(['etapes_hors_limites']) }))).toBe(0);
    expect(sortie.join('\n')).toMatch(/visuel_absent \(visuel : etapes_hors_limites\)/);
    expect(await ligne('select status from post')).toMatchObject({ status: 'a_verifier' });
    expect(await scalar(t.database, 'select count(*) from media_asset')).toBe(0);
    await importer([f], ctx());
    expect(await ligne('select status from post')).toMatchObject({ status: 'en_attente' });
    expect(await scalar(t.database, 'select count(*) from post_revision')).toBe(1);

    const sansDossier = routes();
    delete sansDossier[`${API}/repos/exemple-org/demo-skills/contents/skills/anim?ref=main`];
    // Huit jours plus tard : la vérification précédente n'est plus valable, le lien est recontrôlé et échoue.
    sortie = [];
    await importer([f], ctx({ table: sansDossier, horloge: () => new Date('2026-11-10T12:00:00.000Z') }));
    expect(sortie.join('\n')).toMatch(/lien_non_verifie \(bouton : introuvable\)/);
    expect(await ligne('select resultat, motif, statut_http from post_bouton order by id desc')).toMatchObject({ resultat: 'echec', motif: 'introuvable', statut_http: 404 });
    expect(await ligne('select status from post')).toMatchObject({ status: 'a_verifier' });
  });

  it('JSON invalide ou ressource inconnue : refusés avec motif, rien n’est écrit', async () => {
    const f = join(dossier, 'casse.json');
    writeFileSync(f, '{ pas du json');
    const inconnu = brouillon({ ...copie(BROUILLON), slug: 'demo-inconnue' }, 'inconnu.json');
    expect(await importer([f, inconnu], ctx())).toBe(1);
    expect(sortie.join('\n')).toMatch(/casse\.json : rejetée — json_invalide/);
    expect(sortie.join('\n')).toMatch(/demo-inconnue : rejetée — slug_inconnu/);
    expect(await scalar(t.database, 'select count(*) from post_draft')).toBe(0);
  });

  it('planning : plafond partagé réglable, report faute de place, puis place retrouvée ; jour passé reprogrammé avant P5', async () => {
    expect(await planning(['--plafond', '0', '--reserve', '0'], ctx())).toBe(0);
    await importer([brouillon()], ctx());
    expect(sortie.join('\n')).toMatch(/demo-anim : en attente, reportée faute de place/);
    expect(await ligne('select etat, jour, motif from publication_planifiee')).toMatchObject({ etat: 'reportee', jour: null, motif: 'plafond_atteint' });

    sortie = [];
    expect(await planning(['--plafond', '20', '--reserve', '5', '--recalculer'], ctx())).toBe(0);
    const texte = sortie.join('\n');
    expect(texte).toMatch(/2026-11-02 : 1 place\(s\) prise\(s\) sur 20, 19 restante\(s\) — hors réserve 1\/15, réserve 0\/5/);
    expect(texte).toMatch(/1\. demo-anim \(publication \d+\) — ressource existante — en attente, prévue/);

    // Le lendemain, sans publication (avant P5) : l'import reprogramme la publication prévue un jour passé.
    sortie = [];
    await importer([join(dossier, 'demo-anim.json')], ctx({ horloge: () => new Date('2026-11-03T09:00:00.000Z') }));
    expect(await ligne('select jour, motif from publication_planifiee')).toMatchObject({ jour: '2026-11-03', motif: 'reprogrammee_avant_p5' });
    expect(await planning(['--reserve', '30'], ctx())).toBe(1);
  });

  it('un réimport qui change le statut de sortie replace la publication : une ressource existante quitte la réserve', async () => {
    const reglage = (cle: string, valeur: number) =>
      t.database.client.execute({ sql: `insert into setting (key, value, updated_at) values (?, ?, 'x') on conflict(key) do update set value = excluded.value`, args: [cle, String(valeur)] });
    // Seuil large : le dépôt de fixture (créé le 2025-03-01) compte comme nouvelle sortie et prend la réserve.
    await reglage('ressources.seuil_nouvelle_sortie_jours', 1000);
    await importer([brouillon()], ctx());
    expect(await ligne('select statut_sortie, utilise_reserve from publication_planifiee')).toMatchObject({ statut_sortie: 'nouvelle_sortie', utilise_reserve: 1 });
    await reglage('ressources.seuil_nouvelle_sortie_jours', 1);
    await importer([join(dossier, 'demo-anim.json')], ctx());
    expect(JSON.parse(String((await ligne('select content from post_revision order by seq desc'))!.content)).statut_sortie).toBe('ressource_existante');
    expect(await ligne('select statut_sortie, utilise_reserve, etat, rang from publication_planifiee')).toMatchObject({ statut_sortie: 'ressource_existante', utilise_reserve: 0, etat: 'prevue', rang: 1 });
  });

  it('baisser le plafond replace aussitôt les publications prévues : aucun jour ne dépasse le nouveau plafond', async () => {
    await importer([brouillon()], ctx());
    expect(await ligne('select etat, jour from publication_planifiee')).toMatchObject({ etat: 'prevue', jour: '2026-11-02' });
    sortie = [];
    expect(await planning(['--plafond', '0', '--reserve', '0'], ctx())).toBe(0);
    expect(await ligne('select etat, jour, rang, motif from publication_planifiee')).toMatchObject({ etat: 'reportee', jour: null, rang: null, motif: 'plafond_atteint' });
    expect(sortie.join('\n')).not.toMatch(/place\(s\) prise\(s\) sur 0/);
    expect(await ligne(`select value from setting where key = 'publication.plafond_jour'`)).toMatchObject({ value: '0' });
  });

  it('rangs du jour uniques et sans trou : une publication retirée puis une autre placée', async () => {
    await importer([brouillon()], ctx());
    const c = t.database.client;
    // Publications supplémentaires, sans contenu : seul leur rang importe ici.
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const ni = await c.execute({ sql: `insert into news_item (kind, title, first_seen_at, status) values ('annonce', ?, 'x', 'collected') returning id`, args: [`n${i}`] });
      const p = await c.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at) values ('repo', ?, 'documentary_analysis', 'en_attente', 'x') returning id`, args: [Number(ni.rows[0]!.id)] });
      ids.push(Number(p.rows[0]!.id));
    }
    const rangs = async () => (await c.execute(`select post_id, rang from publication_planifiee where jour = '2026-11-02' and etat <> 'reportee' order by rang`)).rows.map((r) => [Number(r.post_id), Number(r.rang)]);
    const tx = await c.transaction('write');
    try {
      const a = { priorite: 2 as const, statutSortie: 'ressource_existante' as const };
      for (const id of ids.slice(0, 2)) await ecrirePlacement(tx, { postId: id, jour: '2026-11-02', rang: 1, utiliseReserve: false, etat: 'prevue', motif: null }, a, 'x');
      await renumeroter(tx, ['2026-11-02']);
      await retirerDuPlanning(tx, ids[0]!);
      // Rang calculé hors de la transaction (périmé) : l'écriture prend le premier rang libre, la renumérotation fixe l'ordre.
      await ecrirePlacement(tx, { postId: ids[2]!, jour: '2026-11-02', rang: 2, utiliseReserve: false, etat: 'prevue', motif: null }, a, 'x');
      await renumeroter(tx, ['2026-11-02']);
      await tx.commit();
    } finally {
      tx.close();
    }
    const r = await rangs();
    expect(r.map(([, rang]) => rang)).toEqual([1, 2, 3]);
    expect(r.map(([id]) => id)).not.toContain(ids[0]);
    // L'index unique (jour, rang) refuse un doublon écrit par un autre chemin.
    await expect(c.execute({ sql: `update publication_planifiee set rang = 1 where post_id = ?`, args: [ids[2]!] })).rejects.toThrow(/UNIQUE/);
  });
});

describe('maquette : publications de ressources et recherche', () => {
  it('expose la publication planifiée avec bouton, mots-clés, badge, origine et mention ; résume les non planifiées', async () => {
    await importer([brouillon()], ctx());
    const data = await buildMaquetteData(t.database.client, '2026-11-02T13:00:00.000Z');
    expect(data.ressources).toHaveLength(1);
    const r = data.ressources[0]!;
    expect(r).toMatchObject({ slug: 'demo-anim', statut: 'en_attente', etiquette: 'pas encore publié', badge: 'Ressource existante', mention: MENTION_IA });
    expect(r.origine.texte).toBe(texteOrigine('claude_code_developpement'));
    expect(r.origine.texte).toMatch(/Rédigé pendant le développement par Claude Code/);
    expect(r.bouton).toMatchObject({ libelle: 'Voir le dépôt', url: 'https://github.com/exemple-org/demo-skills/tree/main/skills/anim', aria_label: 'Voir le dépôt exemple-org/demo-skills sur GitHub (nouvel onglet)' });
    // Les mots-clés ne sont pas dans la publication affichée : ils ne servent qu'à la recherche.
    expect(r).not.toHaveProperty('mots_cles');
    expect(r).not.toHaveProperty('categorie');
    expect(data.recherche[0]!.motsCles.map((m) => m.champ)).toEqual(['nom', 'categorie', 'usage', 'usage', 'technologie', 'technologie', 'terme_proche']);
    expect(r.demarrage.mention_commande).toBe('Commande citée de la documentation, non exécutée par la plateforme');
    // Visuel rendu hors du dossier maquette/ (dossier temporaire du test) : jamais servi.
    expect(r.visuel).toBeNull();
    expect(data.news_items.some((n) => n.title === 'demo-anim')).toBe(false);
    expect(data.recherche).toHaveLength(1);
    expect(classer('motion design', data.recherche)[0]!.postId).toBe(r.post_id);

    // Le bouton disparaît quand sa vérification dépasse la durée de validité (7 jours).
    expect((await buildMaquetteData(t.database.client, '2026-11-10T13:00:00.000Z')).ressources[0]!.bouton).toBeNull();

    const douteux = copie(BROUILLON);
    douteux.accroche.texte = 'demo-anim ?';
    await importer([brouillon(douteux)], ctx());
    const apres = await buildMaquetteData(t.database.client, '2026-11-02T13:00:00.000Z');
    expect(apres.ressources).toHaveLength(0);
    expect(apres.recherche).toHaveLength(0);
    expect(apres.ressources_non_planifiees[0]).toMatchObject({ slug: 'demo-anim', statut: 'a_verifier' });
    expect(apres.ressources_non_planifiees[0]!.motifs.map((m) => m.code)).toContain('accroche_non_conforme');
  });

  it('recherche.js : même classement et mêmes explications que moteur.ts (parité)', () => {
    // Le fichier réellement servi par la maquette, pas seulement le script généré en mémoire : un `npm run maquette`
    // oublié ferait échouer ce test.
    const servi = readFileSync(fileURLToPath(new URL('../maquette/recherche.js', import.meta.url)), 'utf8');
    expect(servi).toBe(scriptRecherche());
    const fenetre: Record<string, any> = {};
    runInNewContext(servi, { window: fenetre });
    const publications = JSON.parse(lire('recherche/publications.json')) as { slug: string; jour: string | null; contenu: Record<string, unknown>; mots_cles: BrouillonRessource['mots_cles'] }[];
    const documents: DocumentRecherche[] = publications.map((p, i) => ({
      postId: i + 1,
      revisionId: i + 1,
      jour: p.jour,
      motsCles: motsClesDe(p.mots_cles).lignes.map(({ champ, terme, raison, passage }) => ({ champ, terme, raison, passage })),
      textes: textesDePublication(p.contenu),
    }));
    for (const q of ['motion design', 'anim', 'deuxième cerveau', 'tests navigateur', 'Œuvres', 'de la', 'SVG animations']) {
      for (const tri of ['pertinence', 'recents'] as const) {
        const attendu = classer(q, documents, tri);
        expect(JSON.parse(JSON.stringify(fenetre.RECHERCHE.classer(q, documents, tri)))).toEqual(JSON.parse(JSON.stringify(attendu)));
      }
    }
    expect(fenetre.RECHERCHE.classer('motion design', documents).length).toBeGreaterThanOrEqual(2);
  });
});
