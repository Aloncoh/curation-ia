// Tests sur faux modèles et réseau simulé. Ils vérifient la mécanique de la comparaison, jamais la qualité d'un modèle :
// toute ligne porte l'origine `simulation`, que le rapport réel ignore.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErreurDeepSeek, estReprenableDeepSeek, modeleDeepSeek, type Modele, type ReponseModele, type RequeteModele } from '../src/analysis/modele.ts';
import { SYSTEME_QUALIFICATION } from '../src/analysis/prompts.ts';
import { coutMicroUsd, heurePleine } from '../src/analysis/tarifs.ts';
import { releasesUrl } from '../src/collect/github-releases.ts';
import { ARRET_APRES_ECHECS, comparerModeles, PLAFOND_COMPARAISON_MICRO_USD, type Bras } from '../src/comparaison/execution.ts';
import { lotDeComparaison } from '../src/comparaison/lot.ts';
import { bilanBras, dossierAveugle, rapportComparaison, tableauComparatif, type Sortie } from '../src/comparaison/rapport.ts';
import { setPaused } from '../src/control/settings.ts';
import { figerCorpus } from '../src/selection/corpus.ts';
import { runCollect } from '../src/worker/collect.ts';
import { CLAUDE_CODE, createTestDb, readFixture, routeFetcher, scalar, type TestDb } from './helpers/db.ts';

const QUALIFICATION = (passage: string) => ({
  criteres: {
    nouveaute_reelle: { note: 2, raison: 'Une fonction nouvelle.' }, utilite_concrete: { note: 2, raison: 'Usage décrit.' },
    impact_utilisateurs: { note: 2, raison: 'Concerne notre public.' }, solidite_sources: { note: 2, raison: 'Source d’origine.' },
  },
  passages: [passage], motif_rejet: null, compte: 'pyxo', nature: null, categories: [], produit: null, type_information: 'annonce_officielle',
});
const BROUILLON = (passage: string, produit: string) => {
  const cite = { texte: 'Nouvelle version, selon la source.', passages: [passage] };
  return { accroche: { ...cite, texte: `${produit} : nouvelle version, selon la source.` }, description: cite, nouveaute: cite, ce_que_ca_permet: cite, pour_qui: null, exemple_usage: null, acces: null, prerequis: null, cout: null, limites_connues: null, details: [], attributions: [], reperes: [cite], diapositives: ['accroche', 'nouveaute'], questions_a_tester: [] };
};
const corpsDu = (r: RequeteModele) => r.utilisateur.split('\n\n')[1] ?? '';
const reponse = (texte: string, cache = 0): ReponseModele => ({ texte, usage: { input: 1_000, output: 200, cache }, stop: 'end_turn' });

/** Répond comme le moteur l'attend, en citant le début du document reçu. */
const bonModele = (): Modele & { appels: RequeteModele[] } => {
  const appels: RequeteModele[] = [];
  return {
    appels,
    compter: async () => 1_000,
    appeler: async (r) => {
      appels.push(r);
      const passage = corpsDu(r).split(/\s+/).slice(0, 6).join(' ');
      const produit = /Produit \(catalogue, ne pas citer\) : (.*)\n/.exec(r.utilisateur)?.[1] ?? 'Produit';
      return reponse(JSON.stringify(r.systeme === SYSTEME_QUALIFICATION ? QUALIFICATION(passage) : BROUILLON(passage, produit)));
    },
  };
};
const bras = (id: string, client: Modele, modele = 'claude-haiku-5-5'): Bras => ({ id, modele, reglage: 'réglage de test', client, reprenable: () => false });

describe('tarifs relevés le 2026-11-01', () => {
  it('Haiku facture le cache à part', () => {
    expect(coutMicroUsd('claude-haiku-5-5', 2_000, 1_000)).toBe(700);
    expect(coutMicroUsd('claude-haiku-5-5', 2_000, 1_000, { cache: 1_000, cacheEcrit: 500 })).toBe(623);
  });
  it('DeepSeek change de prix selon l’heure, et double sans date', () => {
    const creuse = '2026-11-01T02:00:00.000Z'; // dimanche
    const pleine = '2026-11-02T02:00:00.000Z'; // lundi
    expect(heurePleine(new Date(creuse))).toBe(false);
    expect(heurePleine(new Date(pleine))).toBe(true);
    expect(heurePleine(new Date('2026-11-02T04:30:00.000Z'))).toBe(false);
    expect(coutMicroUsd('deepseek-flash', 1_000, 1_000, { quand: creuse })).toBe(750);
    expect(coutMicroUsd('deepseek-flash', 1_000, 1_000, { quand: pleine })).toBe(1_500);
    expect(coutMicroUsd('deepseek-flash', 1_000, 1_000)).toBe(1_500);
    expect(coutMicroUsd('deepseek-flash', 1_000, 0, { cache: 1_000, quand: creuse })).toBe(3);
  });
});

describe('adaptateur DeepSeek, réseau simulé', () => {
  const requete: RequeteModele = { modele: 'deepseek-flash', systeme: 's', utilisateur: 'u', maxTokens: 4_000, schema: { type: 'object' } };
  const complet = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] }], usage: { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 4 }, output_tokens_details: { reasoning_tokens: 0 } } };
  const avec = (repondre: () => Response | Promise<Response>, raisonnement: 'none' | 'low' = 'none') => {
    const envois: { url: string; init: RequestInit }[] = [];
    const fetch = async (url: unknown, init?: RequestInit) => { envois.push({ url: String(url), init: init! }); return repondre(); };
    return { envois, modele: modeleDeepSeek({ cle: 'sk-cle-factice-de-test', raisonnement, fetch: fetch as typeof globalThis.fetch }) };
  };

  it('demande une sortie au schéma, sans raisonnement, et reconstitue la réponse', async () => {
    const { envois, modele } = avec(() => Response.json(complet));
    expect(await modele.appeler(requete)).toEqual({ texte: '{"a":1}', usage: { input: 10, output: 5, cache: 4, raisonnement: 0 }, stop: 'end_turn' });
    expect(envois[0]!.url).toBe('https://api.deepseek.com/responses');
    const corps = JSON.parse(String(envois[0]!.init.body));
    expect(corps).toMatchObject({ model: 'deepseek-flash', instructions: 's', input: 'u', max_output_tokens: 4_000, reasoning: { effort: 'none' }, text: { format: { type: 'json_schema', name: 'sortie', schema: { type: 'object' } } } });
    expect(new Headers(envois[0]!.init.headers).get('authorization')).toBe('Bearer sk-cle-factice-de-test');
  });
  it('ignore le texte de raisonnement et traduit les arrêts', async () => {
    const raison = { ...complet, output: [{ type: 'reasoning', content: [{ type: 'reasoning_text', text: 'je pense' }] }, ...complet.output] };
    expect((await avec(() => Response.json(raison)).modele.appeler(requete)).texte).toBe('{"a":1}');
    const melange = { ...complet, output: [{ type: 'message', content: [{ type: 'reasoning_text', text: 'je pense' }, { type: 'output_text', text: '{"a":1}' }] }] };
    expect((await avec(() => Response.json(melange)).modele.appeler(requete)).texte).toBe('{"a":1}');
    const tronque = { ...complet, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } };
    expect((await avec(() => Response.json(tronque)).modele.appeler(requete)).stop).toBe('max_tokens');
    const filtre = { ...complet, status: 'incomplete', incomplete_details: { reason: 'content_filter' } };
    expect((await avec(() => Response.json(filtre)).modele.appeler(requete)).stop).toBe('refusal');
  });
  it('une panne se reprend, un refus non, et le message ne contient jamais la clé', async () => {
    const panne = await avec(() => new Response('x', { status: 503 })).modele.appeler(requete).catch((e: unknown) => e);
    expect(panne).toBeInstanceOf(ErreurDeepSeek);
    expect(estReprenableDeepSeek(panne)).toBe(true);
    const refus = await avec(() => Response.json({ error: { message: 'mauvaise clé sk-cle-factice-de-test' } }, { status: 401 })).modele.appeler(requete).catch((e: unknown) => e);
    expect(estReprenableDeepSeek(refus)).toBe(false);
    expect(String((refus as Error).message)).not.toContain('sk-');
  });
  it('une réponse illisible ou en échec est une erreur, pas une sortie', async () => {
    await expect(avec(() => new Response('pas du json')).modele.appeler(requete)).rejects.toThrow('illisible');
    await expect(avec(() => Response.json({ ...complet, status: 'failed' })).modele.appeler(requete)).rejects.toThrow('échec');
  });
  it('le comptage local majore la taille réelle', async () => {
    const texte = 'mot '.repeat(1_000);
    expect(await avec(() => Response.json(complet)).modele.compter({ ...requete, utilisateur: texte })).toBeGreaterThan(texte.length / 4);
  });
});

describe('comparaison sur un même lot, faux modèles', () => {
  let t: TestDb;
  const lignes = async () => (await t.database.client.execute(`select * from comparaison_sortie order by id`)).rows as unknown as (Sortie & { origine: string })[];
  const lancer = (b: Bras[], cap = PLAFOND_COMPARAISON_MICRO_USD) => comparerModeles({ database: t.database, bras: b, origine: 'simulation', capMicroUsd: cap, attente: async () => {} });

  beforeEach(async () => {
    t = await createTestDb();
    await runCollect({ database: t.database, fetcher: routeFetcher({ [releasesUrl(CLAUDE_CODE.config)]: readFixture() }), mode: 'live', workerId: 't', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions: [CLAUDE_CODE] });
    await figerCorpus(t.database.client, 'g', { developpement: 3, evaluation: 2 }, '2026-11-01T00:00:00.000Z');
  });
  afterEach(() => t.cleanup());

  it('chaque modèle qualifie et rédige les mêmes sujets, avec les mêmes prompts', async () => {
    const a = bonModele();
    const b = bonModele();
    const r = await lancer([bras('a', a), bras('b', b)]);
    expect(r.statut).toBe('terminee');
    const sujets = (await lotDeComparaison(t.database.client)).filter((s) => s.analysable);
    expect(sujets.length).toBeGreaterThan(0);
    expect(a.appels).toHaveLength(sujets.length * 2);
    expect(new Set(a.appels.map((x) => x.utilisateur))).toEqual(new Set(b.appels.map((x) => x.utilisateur)));
    const sorties = await lignes();
    expect(sorties.filter((s) => s.etape === 'redaction' && s.statut === 'valide')).toHaveLength(sujets.length * 2);
    expect(sorties.every((s) => s.origine === 'simulation')).toBe(true);
  });

  it('rédige même un sujet que le modèle écarte : les brouillons restent comparables', async () => {
    const a = bonModele();
    const appeler = a.appeler;
    a.appeler = async (r) => {
      const rendu = await appeler(r);
      if (r.systeme !== SYSTEME_QUALIFICATION) return rendu;
      const q = JSON.parse(rendu.texte);
      return { ...rendu, texte: JSON.stringify({ ...q, criteres: { ...q.criteres, utilite_concrete: { note: 0, raison: 'Aucun usage.' } }, compte: null, motif_rejet: 'sans_interet_concret' }) };
    };
    await lancer([bras('a', a)]);
    const sorties = await lignes();
    expect(sorties.filter((s) => s.etape === 'qualification').every((s) => s.decision === 'ecarter')).toBe(true);
    expect(sorties.filter((s) => s.etape === 'redaction' && s.statut === 'valide').length).toBeGreaterThan(0);
  });

  it('ne crée ni brouillon, ni publication, ni décision de sélection', async () => {
    await lancer([bras('a', bonModele())]);
    expect((await lignes()).length).toBeGreaterThan(0);
    for (const table of ['post_draft', 'post', 'post_revision', 'selection_decision']) expect(await scalar(t.database, `select count(*) from ${table}`)).toBe(0);
  });

  it('une sortie invalide est tracée, et trois d’affilée arrêtent le lot', async () => {
    const m = bonModele();
    m.appeler = async () => reponse('{pas du json');
    const r = await lancer([bras('a', m)]);
    expect(r.statut).toBe('arret_format');
    expect(r.motif).toContain(`${ARRET_APRES_ECHECS} sorties`);
    expect((await lignes()).map((s) => s.statut)).toEqual(Array(ARRET_APRES_ECHECS).fill('json_invalide'));
  });

  it('une sortie hors schéma n’est jamais tenue pour valide', async () => {
    const m = bonModele();
    const appeler = m.appeler;
    let n = 0;
    m.appeler = async (r) => (n++ === 0 ? reponse('{"champ":"inconnu"}') : appeler(r));
    await lancer([bras('a', m)]);
    expect((await lignes())[0]).toMatchObject({ etape: 'qualification', statut: 'schema_invalide', contenu: null });
  });

  it('une réponse tronquée repart une fois avec le double de tokens, et les deux tentatives sont comptées', async () => {
    const m = bonModele();
    const appeler = m.appeler;
    const plafonds: number[] = [];
    m.appeler = async (r) => {
      plafonds.push(r.maxTokens);
      return plafonds.length === 1 ? { ...reponse('{'), stop: 'max_tokens' } : appeler(r);
    };
    await lancer([bras('a', m)]);
    expect(plafonds.slice(0, 2)).toEqual([4_000, 8_000]);
    const [premiere] = await lignes();
    expect(premiere).toMatchObject({ statut: 'valide', tentatives: 2 });
    expect(Number(premiere!.cout_micro_usd)).toBe(2 * coutMicroUsd('claude-haiku-5-5', 1_000, 200));
  });

  it('le plafond arrête le lot avant la dépense, tous modèles confondus, même en cas de relance', async () => {
    // Chaque appel coûte presque tout le plafond : seule la somme de tous les lancements peut le dépasser.
    const couteux = () => {
      const m = bonModele();
      const appeler = m.appeler;
      m.appeler = async (r) => ({ ...(await appeler(r)), usage: { input: 1_000, output: 12_000 } });
      return m;
    };
    const cap = coutMicroUsd('claude-haiku-5-5', 1_000, 12_000) + 1_000;
    const depense = () => scalar(t.database, `select coalesce(sum(coalesce(actual_micro_usd, reserved_micro_usd)), 0) from llm_call`);
    expect((await lancer([bras('a', couteux())], cap)).statut).toBe('arret_budget');
    const apresPremier = await depense();
    expect(apresPremier).toBeLessThanOrEqual(cap);
    expect((await lancer([bras('a', couteux())], cap)).statut).toBe('arret_budget');
    expect(await depense()).toBe(apresPremier);
  });

  it('refuse un plafond au-dessus du budget accordé', async () => {
    await expect(lancer([bras('a', bonModele())], PLAFOND_COMPARAISON_MICRO_USD + 1)).rejects.toThrow('1 $');
  });

  it('la pause arrête le lot avant tout appel', async () => {
    await setPaused(t.database, true, '2026-11-01T00:00:00.000Z');
    const m = bonModele();
    expect((await lancer([bras('a', m)])).statut).toBe('arret_pause');
    expect(m.appels).toHaveLength(0);
  });

  it('une relance ne repaie pas ce qui est fait', async () => {
    await lancer([bras('a', bonModele())]);
    const m = bonModele();
    await lancer([bras('a', m)]);
    expect(m.appels).toHaveLength(0);
  });

  it('une relance reprend ce qui a échoué, et garde le coût déjà payé', async () => {
    const panne = bonModele();
    panne.appeler = async () => { throw new Error('panne'); };
    await lancer([bras('a', panne)]);
    const coutEchec = Number((await lignes())[0]!.cout_micro_usd);
    expect(coutEchec).toBeGreaterThan(0);
    await lancer([bras('a', bonModele())]);
    const [premiere] = await lignes();
    expect(premiere).toMatchObject({ statut: 'valide' });
    expect(Number(premiere!.cout_micro_usd)).toBe(coutEchec + coutMicroUsd('claude-haiku-5-5', 1_000, 200));
  });

  it('une erreur d’API est tracée sans la clé', async () => {
    const m = bonModele();
    m.appeler = async () => { throw new Error('refus pour sk-abcdef123456'); };
    await lancer([bras('a', m)]);
    const texte = JSON.stringify(await lignes()) + JSON.stringify((await t.database.client.execute(`select error from llm_call`)).rows);
    expect(texte).toContain('***');
    expect(texte).not.toContain('sk-abcdef123456');
  });

  it('le rapport ignore les simulations : aucun modèle n’est évalué sans appel réel', async () => {
    await lancer([bras('a', bonModele()), bras('b', bonModele())]);
    const r = await rapportComparaison(t.database.client, 'x');
    expect(r).toContain('Aucun résultat réel');
    expect(r).not.toContain('Coût total du lot');
  });
});

describe('bilan et lecture à l’aveugle, données construites', () => {
  const sortie = (changements: Partial<Sortie>): Sortie => ({
    bras: 'a', modele: 'm', reglage: 'r', news_item_id: 1, etape: 'redaction', statut: 'valide', tentatives: 1, contenu: JSON.stringify(BROUILLON('un passage cité', 'Produit')), controles: '[]',
    decision: null, duree_ms: 1_000, tokens_entree: 100, tokens_cache: 40, tokens_sortie: 50, tokens_raisonnement: 0, cout_micro_usd: 10, ...changements,
  });

  it('sépare format, écarts factuels, autres écarts, latence et coût', () => {
    const b = bilanBras([
      sortie({ controles: JSON.stringify([{ champ: 'nouveaute', code: 'citation_introuvable' }, { champ: 'accroche', code: 'accroche_non_conforme' }]) }),
      sortie({ news_item_id: 2, controles: JSON.stringify([{ champ: 'captures', code: 'sources_contradictoires' }]), duree_ms: 3_000 }),
      sortie({ news_item_id: 3, statut: 'json_invalide', contenu: null, controles: null, duree_ms: 2_000 }),
      sortie({ news_item_id: 1, etape: 'qualification', decision: 'publier', tentatives: 2, contenu: null, controles: null }),
    ], new Set([1]), new Map([[1, 'publier']]));
    expect(b).toMatchObject({ redactions: 3, redactions_valides: 2, json_invalides: 1, qualifications_valides: 1, valides_du_premier_coup: 2, ecarts_factuels: 1, autres_ecarts: 1, brouillons_sans_ecart: 1, passages_introuvables: 1, ecarts_factuels_textes_courts: 1, accords_juges: 1, comparables_juges: 1, cout_total_micro_usd: 40 });
    expect(b.latence_redaction_p50_s).toBe(2);
    expect(b.champs_par_texte_court).toBe(1);
  });
  it('une contradiction entre captures n’est pas reprochée au modèle', () => {
    const b = bilanBras([sortie({ controles: JSON.stringify([{ champ: 'captures', code: 'sources_contradictoires' }]) })], new Set(), new Map());
    expect(b).toMatchObject({ ecarts_factuels: 0, brouillons_sans_ecart: 1 });
  });
  it('une valeur absente reste « non mesuré »', () => {
    const b = bilanBras([sortie({ etape: 'qualification', duree_ms: null, contenu: null, controles: null })], new Set(), new Map());
    const tableau = tableauComparatif([b]).join('\n');
    expect(tableau).toContain('Rédactions valides | non mesuré');
    expect(tableau).toContain('Latence rédaction, p50 / p90 | non mesuré / non mesuré');
  });
  it('le dossier à l’aveugle ne nomme aucun modèle, et sa clé reste à part', () => {
    const sujet = { id: 1, jeu: 'developpement', source: 's', genre: 'annonce', titre: 'Titre', annonce_le: null, url: 'https://exemple.test/a', snapshot_id: 1, texte: 'Texte de la source', titre_actualite: 'Titre', source_nom: 'Source', produit: null, version: null, texte_court: true, analysable: true };
    const { markdown, cle } = dossierAveugle([sujet], [sortie({ bras: 'haiku', modele: 'claude-haiku-5-5' }), sortie({ bras: 'flash', modele: 'deepseek-flash' })]);
    expect(markdown).toContain('Version A');
    expect(markdown).toContain('Version B');
    expect(markdown).not.toMatch(/haiku|flash|claude|deepseek/i);
    expect(Object.values(cle['1']!).sort()).toEqual(['flash', 'haiku']);
  });
  it('un sujet rédigé par un seul modèle n’entre pas dans le dossier', () => {
    const sujet = { id: 1, jeu: 'd', source: 's', genre: 'a', titre: 'T', annonce_le: null, url: 'u', snapshot_id: 1, texte: 'x', titre_actualite: 'T', source_nom: 'S', produit: null, version: null, texte_court: true, analysable: true };
    expect(dossierAveugle([sujet], [sortie({ bras: 'a' }), sortie({ bras: 'b', statut: 'json_invalide', contenu: null })]).cle).toEqual({});
  });
});
