// Étape de traduction (ADR 0012) : champs traduits, contrôle des chiffres, versions et noms propres, lot avec un faux
// modèle (aucun réseau, aucune dépense), budget et écarts. La vérification mot pour mot reste sur l'original.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Modele, RequeteModele } from '../src/analysis/modele.ts';
import { avecAlias, champsDeLaFiche, champsDuPost, champsTraduisibles, partieServable } from '../src/traduction/champs.ts';
import { controlerTraduction, invariants } from '../src/traduction/controle.ts';
import { lireSortie, messageTraduction, recontrolerTraductions, traduirePublications } from '../src/traduction/traduire.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';
import { ajouterActualite, ajouterTraduction, contenuActualite, socle } from './helpers/publications.ts';

describe('champs traduits', () => {
  it('prend tout le texte affiché du post, titre (accroche) compris, puis la fiche à part', () => {
    const contenu = {
      accroche: { texte: 'A', passages: [] }, description: { texte: 'B', passages: [] }, interet: { texte: 'C', passages: [] },
      reperes: [{ texte: 'D', passages: [] }], exemple_usage: { texte: 'E', passages: [] }, mots_cles: { nom: 'x' },
      demarrage: { etapes: [{ texte: 'F', passages: [] }], commande: 'npx skills add x' }, limites: [{ texte: 'G', passages: [] }],
    };
    expect(champsDuPost('ressource', contenu).map((x) => x.cle)).toEqual(['accroche', 'description', 'interet', 'reperes.0', 'exemple_usage', 'limites.0']);
    expect(champsDeLaFiche('ressource', contenu).map((x) => x.cle)).toEqual(['fiche.exemple_usage', 'fiche.demarrage.etapes.0', 'fiche.limites.0']);
    expect(champsTraduisibles('ressource', contenu)).toHaveLength(7);
    // Contexte d'usage et limites, repris de la fiche : traduits une seule fois, sous leur clé `fiche.`.
    const traduits = avecAlias({ 'fiche.exemple_usage': 'e', 'fiche.limites.0': 'g' });
    expect([traduits.exemple_usage, traduits['limites.0']]).toEqual(['e', 'g']);
    // Sans limite dans la source : un bloc fixe, jamais envoyé à la traduction.
    const sansLimite = champsDuPost('ressource', { ...contenu, limites: [] });
    expect(sansLimite.at(-1)).toEqual({ cle: 'limites.aucune', texte: 'No limits stated by the source.' });
    expect(champsTraduisibles('ressource', { ...contenu, limites: [] }).some((c) => c.cle === 'limites.aucune')).toBe(false);
    const actualite = { accroche: { texte: 'A', passages: [] }, details: [{ titre: 'How it works', texte: 'T', passages: [] }], attributions: [{ auteur: 'Google DeepMind', texte: '88.2% on X', conditions: { texte: 'Without guardrails', passages: [] } }], questions_a_tester: ['Q?'] };
    expect(champsDeLaFiche('actualite', actualite).map((x) => x.cle)).toEqual(['fiche.details.0.titre', 'fiche.details.0.texte', 'fiche.attributions.0.texte', 'fiche.attributions.0.conditions', 'fiche.questions_a_tester.0']);
    const s = champsTraduisibles('selection', { accroche: { texte: 'A', passages: [] }, ressources: [{ nom: 'Godly', explication: { texte: 'E', passages: [] } }] });
    expect(s).toEqual([{ cle: 'accroche', texte: 'A' }, { cle: 'ressources.0.explication', texte: 'E' }]);
    expect(partieServable(s, { accroche: 'a', 'ressources.0.explication': 'e' }, new Set())).toBe(true);
    expect(partieServable(s, { accroche: 'a' }, new Set())).toBe(false);
    expect(partieServable(s, { accroche: 'a', 'ressources.0.explication': 'e' }, new Set(['accroche']))).toBe(false);
  });
});

describe('contrôle par le code', () => {
  it('relève chiffres, versions, noms propres, code et adresses', () => {
    const i = invariants('Mistral Large 4 (Le Chonk) runs on vLLM 0.9.2 with GPT-6.1 Terra; see `npx skills add` and https://mistral.ai/news. 96.6% of requests, $0.70.');
    expect(i).toEqual(expect.arrayContaining(['Large', 'Chonk', 'vLLM', '0.9.2', 'GPT-6.1', 'Terra', 'npx skills add', 'https://mistral.ai/news', '96.6', '0.70']));
    // Début de phrase, mois, « AI » et le mot courant après un nombre se traduisent.
    expect(invariants('Teams ship it in October. AI-generated 1-trillion-parameter models.')).toEqual(['1']);
    // Cas réel du lot du 2026-11-03 : « Rated » n'est pas un nom ; « Widget » devant une version, si.
    expect(invariants('Rated 1-10 per dimension; below 35/50, revise')).toEqual(['1', '10', '35', '50']);
    expect(invariants('Widget 2.1 ships')).toEqual(['2.1', 'Widget']);
  });

  it('accepte une traduction fidèle et refuse un chiffre changé, un nom perdu ou un nombre ajouté', () => {
    const original = [{ cle: 'accroche', texte: 'Widget 2.1 cuts GPU latency by 40%' }];
    expect(controlerTraduction(original, { accroche: 'Widget 2.1 réduit la latence GPU de 40%' }, 'fr')).toEqual([]);
    const ecarts = controlerTraduction(original, { accroche: 'Le widget 2.2 réduit la latence de 45 % en 3 étapes' }, 'fr');
    expect(ecarts.map((e) => `${e.code}:${e.detail}`)).toEqual(expect.arrayContaining(['invariant_absent:Widget', 'invariant_absent:2.1', 'invariant_absent:40', 'invariant_absent:GPU', 'nombre_ajoute:2.2', 'nombre_ajoute:3']));
  });

  it('exige de l\'hébreu en hébreu, tous les champs et rien de plus', () => {
    const original = [{ cle: 'accroche', texte: 'Widget 2.1 is out' }, { cle: 'description', texte: 'Faster' }];
    const e = controlerTraduction(original, { accroche: 'Widget 2.1 is out', extra: 'x' }, 'he').map((x) => x.code);
    expect(e).toEqual(expect.arrayContaining(['champ_en_trop', 'champ_manquant', 'langue_non_conforme']));
    expect(controlerTraduction(original, { accroche: 'Widget 2.1 יצא', description: 'מהיר יותר' }, 'he')).toEqual([]);
  });

  it('lit la sortie JSON, même dans un bloc de code, et refuse une clé en double', () => {
    expect(lireSortie('```json\n{"champs":[{"cle":"accroche","texte":"Bonjour"}]}\n```')).toEqual({ accroche: 'Bonjour' });
    expect(lireSortie('{"champs":[{"cle":"a","texte":"x"},{"cle":"a","texte":"y"}]}')).toBeNull();
    expect(lireSortie('pas du JSON')).toBeNull();
  });
});

describe('lot de traduction (faux modèle)', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
    await socle(t.database.client);
    await ajouterActualite(t.database.client, 1);
  });
  afterEach(() => t.cleanup());

  /** Faux modèle : rend chaque champ préfixé, en gardant tout le texte ; `alterer` peut changer la sortie. */
  const fauxModele = (alterer: (texte: string, langue: string) => string = (x) => x): Modele & { requetes: RequeteModele[] } => {
    const requetes: RequeteModele[] = [];
    return {
      requetes,
      compter: async () => 400,
      appeler: async (r) => {
        requetes.push(r);
        const { langue_cible, champs } = JSON.parse(r.utilisateur) as { langue_cible: string; champs: { cle: string; texte: string }[] };
        const prefixe = langue_cible === 'he' ? 'תרגום: ' : 'Traduction : ';
        return { texte: JSON.stringify({ champs: champs.map((c) => ({ cle: c.cle, texte: alterer(`${prefixe}${c.texte}`, langue_cible) })) }), usage: { input: 400, output: 200 }, stop: 'end_turn' };
      },
    };
  };
  const options = (modele: Modele) => ({ client: t.database.client, modele, nomModele: 'deepseek-flash', maxTraductions: 10, capRunMicroUsd: 50_000, capTotalMicroUsd: 1_000_000, estReprenable: () => false, maintenant: () => '2026-11-03T12:00:00.000Z' });

  it('traduit en français et en hébreu, trace le coût et ne retraduit pas une traduction valide', async () => {
    const modele = fauxModele();
    const bilan = await traduirePublications(options(modele));
    expect(bilan).toMatchObject({ statut: 'terminee', valides: 2, ecarts: [], erreurs: [], restantes: 0 });
    expect(bilan.depense_micro_usd).toBeGreaterThan(0);
    expect(await scalar(t.database, `select count(*) from post_traduction where statut = 'valide'`)).toBe(2);
    expect(await scalar(t.database, `select count(*) from llm_call where stage = 'traduction' and status = 'reussi' and actual_micro_usd > 0`)).toBe(2);
    // Les invariants de l'original sont donnés au modèle, et le titre (accroche) fait partie des champs envoyés.
    const envoye = JSON.parse(modele.requetes[0]!.utilisateur) as { garder_tels_quels: string[]; champs: { cle: string }[] };
    expect(envoye.garder_tels_quels).toEqual(expect.arrayContaining(['Widget', '2.1', '40', 'GPU', 'API']));
    expect(envoye.champs.map((c) => c.cle)).toEqual(['accroche', 'description', 'ce_que_ca_permet']);
    const second = await traduirePublications(options(fauxModele()));
    expect(second.valides).toBe(0);
    expect(await scalar(t.database, `select count(*) from llm_call`)).toBe(2);
  });

  it('garde en écart, sans la servir, une traduction qui change un chiffre', async () => {
    const bilan = await traduirePublications(options(fauxModele((x) => x.replace('40%', '45%'))));
    expect(bilan.valides).toBe(0);
    expect(bilan.ecarts).toHaveLength(2);
    expect(bilan.ecarts[0]!.ecarts).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'invariant_absent', detail: '40' })]));
    expect(await scalar(t.database, `select count(*) from post_traduction where statut = 'ecart'`)).toBe(2);
  });

  it('n\'appelle pas le modèle sans marge de budget', async () => {
    const modele = fauxModele();
    const bilan = await traduirePublications({ ...options(modele), capRunMicroUsd: 1 });
    expect(bilan.statut).toBe('arret_budget');
    expect(modele.requetes).toHaveLength(0);
    expect(await scalar(t.database, `select count(*) from llm_call`)).toBe(0);
    expect(await scalar(t.database, `select count(*) from llm_run where status = 'arret_budget'`)).toBe(1);
  });

  it('dit au modèle de garder les chaînes à l\'identique', () => {
    expect(JSON.parse(messageTraduction('he', [{ cle: 'accroche', texte: 'Claude Code 2.1.314 ships' }])).garder_tels_quels).toEqual(['2.1.314', 'Code']);
  });
});

describe('recontrôle sans appel', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
    await socle(t.database.client);
  });
  afterEach(() => t.cleanup());

  it('réapplique les règles actuelles aux traductions stockées', async () => {
    const { revisionId } = await ajouterActualite(t.database.client, 1);
    const fr = { accroche: 'Widget 2.1 réduit la latence GPU de 40% (1)', description: 'Acme publie Widget 2.1 pour les GPU.', ce_que_ca_permet: 'Plus rapide, avec une clé API.' };
    await ajouterTraduction(t.database.client, revisionId, 'fr', fr, 'ecart');
    await ajouterTraduction(t.database.client, revisionId, 'he', { ...fr, accroche: 'Widget 2.2' });
    const r = await recontrolerTraductions(t.database.client);
    expect(r.verifiees).toBe(2);
    expect(r.changees).toEqual([{ revision_id: revisionId, langue: 'fr', statut: 'valide' }, { revision_id: revisionId, langue: 'he', statut: 'ecart' }]);
  });
});

describe('fiche et texte alternatif traduits en complément', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
    await socle(t.database.client);
  });
  afterEach(() => t.cleanup());

  it('n\'envoie que les champs manquants, garde le post déjà traduit et contrôle l\'ensemble', async () => {
    const c = t.database.client;
    const { postId, revisionId } = await ajouterActualite(c, 1, { contenu: { ...contenuActualite(1), nouveaute: { texte: 'Widget 2.1 adds a GPU mode.', passages: [] }, questions_a_tester: ['Does the GPU mode need CUDA 12?'] } });
    await c.execute({ sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', 'Widget 2.1 steps', 'Illustration — ne prouve pas le fonctionnement', '{"forme":"montage"}', 'x')`, args: [postId] });
    const post = { accroche: 'Widget 2.1 réduit la latence GPU de 40% (1)', description: 'Acme publie Widget 2.1 pour les GPU.', ce_que_ca_permet: 'Plus rapide, avec une clé API.' };
    await ajouterTraduction(c, revisionId, 'fr', post);
    const requetes: string[] = [];
    const modele: Modele = {
      compter: async () => 300,
      appeler: async (r) => {
        requetes.push(r.utilisateur);
        const { champs } = JSON.parse(r.utilisateur) as { champs: { cle: string; texte: string }[] };
        return { texte: JSON.stringify({ champs: champs.map((x) => ({ cle: x.cle, texte: `FR ${x.texte}` })) }), usage: { input: 300, output: 100 }, stop: 'end_turn' };
      },
    };
    const bilan = await traduirePublications({ client: c, modele, nomModele: 'deepseek-flash', langues: ['fr'], maxTraductions: 5, capRunMicroUsd: 50_000, capTotalMicroUsd: 1_000_000, estReprenable: () => false });
    expect(bilan.valides).toBe(1);
    expect(JSON.parse(requetes[0]!).champs.map((x: { cle: string }) => x.cle)).toEqual(['fiche.nouveaute', 'fiche.questions_a_tester.0', 'media.alt']);
    const champs = JSON.parse(String((await c.execute('select champs from post_traduction')).rows[0]!.champs)) as Record<string, string>;
    expect(champs).toMatchObject({ ...post, 'media.alt': 'FR Widget 2.1 steps', 'fiche.nouveaute': 'FR Widget 2.1 adds a GPU mode.' });
  });
});

describe('règles affinées sur le lot du 2026-11-03 (fiche et texte alternatif)', () => {
  it('compte le deux-points comme un début de phrase', () => {
    expect(invariants('With mcp-builder, Claude studies the API. Étape 1 : In Claude Code, add the repository. Étape 2 : Then mention it')).toEqual(['1', '2', 'Claude', 'API', 'Code']);
  });
  it('accepte qu\'un original déjà en français reste identique en français, pas en hébreu', () => {
    const original = [{ cle: 'fiche.questions_a_tester.0', texte: 'Le fichier généré s\'ouvre-t-il avec toutes les propriétés éditables ?' }];
    expect(controlerTraduction(original, { 'fiche.questions_a_tester.0': original[0]!.texte }, 'fr')).toEqual([]);
    expect(controlerTraduction(original, { 'fiche.questions_a_tester.0': original[0]!.texte }, 'he').map((e) => e.code)).toEqual(['non_traduit', 'langue_non_conforme']);
  });
});
