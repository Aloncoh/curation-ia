// Lot RECHERCHE de la chaîne des ressources (ADR 0011 §5) : mots-clés structurés, index FTS5, classement et explication.
// Fixtures fabriquées (tests/fixtures/README.md) ; aucun réseau, aucun appel au modèle.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { desindexer, indexer, textesDePublication } from '../src/recherche/index.ts';
import { classer, POIDS, type DocumentRecherche } from '../src/recherche/moteur.ts';
import { rechercher, requeteFts, RequeteInvalide, TAILLE_PAGE_MAX } from '../src/recherche/rechercher.ts';
import { chercher } from '../src/ressources/commandes/chercher.ts';
import { enregistrerMotsCles, motsClesDe, motsClesDesRevisions, raisonSuffisante, type LigneMotCle } from '../src/ressources/mots-cles.ts';
import { BrouillonRessource } from '../src/ressources/schemas.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';

interface Publication {
  slug: string;
  statut: string;
  planifiee: boolean;
  jour: string | null;
  contenu: Record<string, unknown>;
  mots_cles: BrouillonRessource['mots_cles'];
}
const lire = (chemin: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${chemin}`, import.meta.url)), 'utf8');
const PUBLICATIONS = JSON.parse(lire('recherche/publications.json')) as Publication[];
const BROUILLON = BrouillonRessource.parse(JSON.parse(lire('ressources/brouillon-demo-anim.json')));
const NOW = '2026-11-02T12:00:00.000Z';

let t: TestDb;
/** post_id de chaque publication de fixture, par slug. */
let ids: Record<string, number>;

async function socle(): Promise<void> {
  const c = t.database.client;
  await c.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'feed', 'S', '{}', '[]', 'x')`);
  await c.execute(`insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 0, 0, 0)`);
  await c.execute(`insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (1, 's', 'e', 'u', 'u', 't', 'x', 'x')`);
  await c.execute(`insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 1, 1, 'h', 't', 'c', 'html', 'x')`);
  await c.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('repo', 'repo', 'Repo', 'agent', 'a', 'b', 's', 1, 'x')`);
}

/** Crée publication, révision, planification éventuelle, puis mots-clés et index dans une même transaction. */
async function creer(p: Publication, n: number): Promise<{ postId: number; revisionId: number; indexee: boolean }> {
  const c = t.database.client;
  await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, status) values (?, 'decouverte', ?, ?, 'collected')`, args: [n, p.slug, NOW] });
  const draft = await c.execute({
    sql: `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, origine, created_at) values (?, 'r', 'controle_automatique', 1, 'claude-code', 'ressources-r2', 'claude_code_developpement', ?) returning id`,
    args: [n, NOW],
  });
  const publie = p.statut === 'publie' ? `${p.jour}T08:00:00.000Z` : null;
  const post = await c.execute({
    sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at, published_at) values ('repo', ?, 'documentary_analysis', ?, ?, ?) returning id`,
    args: [n, p.statut, NOW, publie],
  });
  const postId = Number(post.rows[0]!.id);
  const revision = await c.execute({
    sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, 1, ?, ?, ?) returning id`,
    args: [postId, Number(draft.rows[0]!.id), JSON.stringify({ slug: p.slug, ...p.contenu }), NOW],
  });
  const revisionId = Number(revision.rows[0]!.id);
  if (p.planifiee) {
    await c.execute({
      sql: `insert into publication_planifiee (post_id, jour, rang, priorite, statut_sortie, utilise_reserve, etat, created_at, updated_at) values (?, ?, ?, 2, 'ressource_existante', 0, ?, ?, ?)`,
      // Un rang par publication : l'index unique (jour, rang) refuse les doublons.
      args: [postId, p.jour, n, p.statut === 'publie' ? 'publiee' : 'prevue', NOW, NOW],
    });
  }
  const { lignes, refus } = motsClesDe(p.mots_cles);
  expect(refus).toEqual([]);
  const tx = await c.transaction('write');
  try {
    await enregistrerMotsCles(tx, postId, revisionId, lignes, NOW);
    const indexee = await indexer(tx, postId, revisionId);
    await tx.commit();
    return { postId, revisionId, indexee };
  } finally {
    tx.close();
  }
}

beforeEach(async () => {
  t = await createTestDb();
  await socle();
  ids = {};
  for (const [i, p] of PUBLICATIONS.entries()) ids[p.slug] = (await creer(p, i + 1)).postId;
});
afterEach(() => t.cleanup());

const slugs = (r: { resultats: { post_id: number }[] }) => r.resultats.map((x) => Object.entries(ids).find(([, id]) => id === x.post_id)?.[0]);

describe('mots-clés structurés', () => {
  it('prépare des lignes normalisées, avec passage pour les usages et raison pour les termes proches', () => {
    const { lignes, refus } = motsClesDe(BROUILLON.mots_cles);
    expect(refus).toEqual([]);
    expect(lignes.map((l) => [l.champ, l.terme, l.termeNormalise])).toEqual([
      ['nom', 'demo-anim', 'demo anim'],
      ['categorie', 'MCP et skills', 'mcp skill'],
      ['usage', 'motion design', 'motion design'],
      ['usage', 'animation web', 'animation web'],
      ['technologie', 'Anime.js', 'anime js'],
      ['technologie', 'SVG', 'svg'],
      ['terme_proche', 'effets visuels', 'effet visuel'],
    ]);
    expect(lignes.find((l) => l.champ === 'usage')!.passage).toBe('Use this skill when the user asks for motion design on a web page.');
    expect(lignes.find((l) => l.champ === 'terme_proche')!.raison).toBe('Une animation web produit des effets visuels sur une page.');
  });

  it('refuse un terme proche sans raison suffisante, un terme vide et un usage sans passage ; garde un doublon une seule fois', () => {
    const mc = structuredClone(BROUILLON.mots_cles);
    mc.termes_proches = [
      { terme: 'effets visuels', raison: '' },
      { terme: 'motion graphics', raison: 'proche du motion' },
      { terme: 'de la', raison: 'Une raison assez longue pour passer.' },
    ];
    mc.usages = [...mc.usages, { texte: 'Motion Design', passages: ['Use this skill when the user asks for motion design on a web page.'] }, { texte: 'effets', passages: [] }];
    const { lignes, refus } = motsClesDe(mc);
    expect(refus.map((r) => [r.champ, r.code])).toEqual([
      ['usage', 'usage_sans_passage'],
      ['terme_proche', 'terme_proche_sans_raison'],
      ['terme_proche', 'terme_proche_sans_raison'],
      ['terme_proche', 'terme_vide'],
    ]);
    expect(lignes.filter((l) => l.champ === 'usage').map((l) => l.terme)).toEqual(['motion design', 'animation web']);
    expect(raisonSuffisante('un deux trois — quatre')).toBe(true);
    expect(raisonSuffisante('un deux — trois')).toBe(false);
  });

  it('enregistrerMotsCles refuse un terme proche sans raison, et la base aussi', async () => {
    const c = t.database.client;
    const id = ids['demo-anim']!;
    const revision = Number((await c.execute({ sql: 'select id from post_revision where post_id = ?', args: [id] })).rows[0]!.id);
    const fautive: LigneMotCle = { champ: 'terme_proche', terme: 'motion graphics', termeNormalise: 'motion graphic', raison: ' ', passage: null };
    const tx = await c.transaction('write');
    try {
      await expect(enregistrerMotsCles(tx, id, revision, [fautive], NOW)).rejects.toThrow(/sans raison/);
    } finally {
      tx.close();
    }
    await expect(
      c.execute({ sql: `insert into post_mot_cle (post_id, revision_id, champ, terme, terme_normalise, raison, created_at) values (?, ?, 'terme_proche', 'x', 'x', '  ', ?)`, args: [id, revision, NOW] }),
    ).rejects.toThrow(/post_mot_cle_raison_ck/);
    // Rien n'a changé : les mots-clés enregistrés restent ceux de la fixture.
    expect((await motsClesDesRevisions(c, [revision])).get(revision)!.map((l) => l.terme)).toContain('motion design');
  });
});

describe('index', () => {
  it('indexe seulement les publications publiées ou en attente planifiées, textes normalisés', async () => {
    const c = t.database.client;
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(5);
    for (const exclu of ['demo-a-verifier', 'demo-non-planifiee']) {
      expect(await scalar(t.database, `select count(*) from recherche_publication where post_id = ${ids[exclu]}`)).toBe(0);
    }
    const ligne = (await c.execute({ sql: 'select nom, mots_cles, texte from recherche_publication where post_id = ?', args: [ids['demo-memoire']!] })).rows[0]!;
    expect(ligne.nom).toBe('demo memoire');
    expect(String(ligne.mots_cles)).toBe('agent automatisation memoire agent markdown deuxieme cerveau');
    expect(String(ligne.texte)).not.toMatch(/[A-ZÀ-ÿ]/);
  });

  it('une nouvelle révision remplace la ligne ; un retrait la supprime', async () => {
    const c = t.database.client;
    const id = ids['demo-courbes']!;
    const draft = Number((await c.execute({ sql: 'select draft_id from post_revision where post_id = ?', args: [id] })).rows[0]!.draft_id);
    const nouvelle = await c.execute({
      sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, 2, ?, ?, ?) returning id`,
      args: [id, draft, JSON.stringify({ accroche: { texte: 'demo-courbes, révision avec un parallaxe', passages: [] } }), NOW],
    });
    const revision2 = Number(nouvelle.rows[0]!.id);
    const tx = await c.transaction('write');
    await enregistrerMotsCles(tx, id, revision2, motsClesDe(PUBLICATIONS[1]!.mots_cles).lignes, NOW);
    expect(await indexer(tx, id, revision2)).toBe(true);
    await tx.commit();
    expect(await scalar(t.database, `select count(*) from recherche_publication where post_id = ${id}`)).toBe(1);
    expect(await scalar(t.database, `select revision_id from recherche_publication where post_id = ${id}`)).toBe(revision2);
    expect(slugs(await rechercher(c, 'parallaxe', { mode: 'apercu' }))).toEqual(['demo-courbes']);

    await c.execute({ sql: `update post set status = 'retire' where id = ?`, args: [id] });
    // Même avant la désindexation, la requête filtre sur le statut.
    expect(slugs(await rechercher(c, 'parallaxe', { mode: 'apercu' }))).toEqual([]);
    const tx2 = await c.transaction('write');
    expect(await indexer(tx2, id, revision2)).toBe(false);
    await tx2.commit();
    expect(await scalar(t.database, `select count(*) from recherche_publication where post_id = ${id}`)).toBe(0);

    const tx3 = await c.transaction('write');
    await desindexer(tx3, ids['demo-anim']!);
    await tx3.commit();
    expect(slugs(await rechercher(c, 'animation web', { mode: 'apercu' }))).toEqual([]);
  });

  it('le texte de la publication reprend les parties rédigées, pas les mots-clés ni les champs du code', () => {
    expect(textesDePublication({ accroche: { texte: 'A' }, demarrage: { etapes: [{ texte: 'B' }], commande: 'npx x' }, limites: [{ texte: 'C' }], statut_sortie: 'nouvelle_sortie' })).toEqual(['A', 'B', 'C']);
    expect(textesDePublication(null)).toEqual([]);
  });
});

describe('rechercher', () => {
  it('« motion design » retrouve plusieurs ressources par usages et termes proches, sans leur nom', async () => {
    const r = await rechercher(t.database.client, 'motion design', { mode: 'apercu' });
    expect(slugs(r)).toEqual(['demo-courbes', 'demo-anim', 'demo-video']);
    for (const x of r.resultats) {
      expect(x.nom).not.toMatch(/motion|design/i);
      expect(x.correspondances.some((c) => c.champ === 'nom')).toBe(false);
    }
    // demo-tableur parle de « design de schéma » mais jamais de motion : chaque mot doit être couvert.
    expect(slugs(r)).not.toContain('demo-tableur');
    // Brouillon à vérifier et publication non planifiée : jamais dans les résultats.
    expect(slugs(r)).not.toContain('demo-a-verifier');
    expect(slugs(r)).not.toContain('demo-non-planifiee');
    expect(r.resultats[0]!.score).toBe(POIDS.usage.expression + POIDS.categorie.mot);
  });

  it('explique chaque correspondance : champ, terme, raison enregistrée pour un terme proche, extrait cité', async () => {
    const r = await rechercher(t.database.client, 'motion design', { mode: 'apercu' });
    const anim = r.resultats.find((x) => x.post_id === ids['demo-anim'])!;
    expect(anim.correspondances).toEqual([
      { champ: 'terme_proche', terme: 'motion design', raison: "L'animation web d'éléments d'interface relève du motion design.", extrait: null },
    ]);
    const courbes = r.resultats.find((x) => x.post_id === ids['demo-courbes'])!;
    expect(courbes.correspondances[0]).toEqual({
      champ: 'usage',
      terme: 'motion design',
      raison: 'Expression « motion design » trouvée dans un usage.',
      extrait: 'Use it for motion design between pages.',
    });
    expect(courbes.correspondances[1]).toMatchObject({ champ: 'categorie', terme: 'design', raison: 'Mot « design » trouvé dans la catégorie.' });
    expect(r.resultats.every((x) => x.correspondances.length > 0)).toBe(true);
  });

  it('un terme sans rapport ne remonte rien', async () => {
    for (const q of ['comptabilité', 'recette de cuisine', 'motion comptable']) {
      const r = await rechercher(t.database.client, q, { mode: 'apercu' });
      expect(r.total, q).toBe(0);
      expect(r.message).toBeNull();
    }
  });

  it('ignore accents, majuscules et pluriels simples, à l’index comme à la requête', async () => {
    const c = t.database.client;
    for (const q of ['memoire agent', 'Mémoires des AGENTS', 'mémoire', 'deuxieme cerveau']) expect(slugs(await rechercher(c, q, { mode: 'apercu' })), q).toEqual(['demo-memoire']);
    expect(slugs(await rechercher(c, 'animations web', { mode: 'apercu' }))).toEqual(['demo-anim']);
    expect(slugs(await rechercher(c, 'Effet d’interface', { mode: 'apercu' }))).toEqual(['demo-anim']);
  });

  it('le dernier mot vaut aussi comme début de mot, et l’explication le dit', async () => {
    const r = await rechercher(t.database.client, 'anim', { mode: 'apercu' });
    expect(slugs(r)).toContain('demo-anim');
    const usage = r.resultats.find((x) => x.post_id === ids['demo-anim'])!.correspondances.find((c) => c.champ === 'usage')!;
    expect(usage.raison).toBe('Mot « anim » trouvé dans un usage (« anim » complète « animation »).');
    // Deux lettres ne suffisent pas pour un préfixe.
    expect((await rechercher(t.database.client, 'an', { mode: 'apercu' })).total).toBe(0);
  });

  it('mode public : seulement les publications publiées ; aperçu : étiquette « pas encore publié »', async () => {
    const c = t.database.client;
    expect(slugs(await rechercher(c, 'motion design'))).toEqual(['demo-video']);
    const r = await rechercher(c, 'motion design', { mode: 'apercu' });
    expect(r.resultats.map((x) => [x.statut, x.etiquette])).toEqual([
      ['en_attente', 'pas encore publié'],
      ['en_attente', 'pas encore publié'],
      ['publie', null],
    ]);
    expect(r.resultats.find((x) => x.post_id === ids['demo-video'])!.jour).toBe('2026-11-01');
  });

  it('saisies hostiles : jamais transmises brutes au moteur FTS5, jamais d’erreur SQL', async () => {
    const c = t.database.client;
    for (const q of ['foo"', '"motion" OR *', 'NEAR(motion design)', 'nom:motion', '-design', '^svg', "'; drop table post; --", 'mots_cles : effet', '*', '()']) {
      await expect(rechercher(c, q, { mode: 'apercu' }), q).resolves.toBeDefined();
    }
    expect(await scalar(t.database, 'select count(*) from post')).toBe(PUBLICATIONS.length);
    expect(requeteFts({ mots: ['foo', 'bar'], prefixe: true, variantes: [[], []] })).toBe('("foo") OR ("bar"*)');
    expect(requeteFts({ mots: ['a"b'], prefixe: false, variantes: [[]] })).toBe('("a""b")');
    // Les équivalents du lexique entrent comme alternatives, toujours entre guillemets.
    expect(requeteFts({ mots: ['securiser'], prefixe: true, variantes: [['security', 'secure']] })).toBe('("securiser"* OR "security" OR "secure")');
    // « OR » devient un mot vide : la requête cherche motion, sans opérateur.
    expect((await rechercher(c, '"motion" OR *', { mode: 'apercu' })).requete_normalisee).toBe('motion');
  });

  it('requête vide après normalisation : réponse vide qui le dit ; saisie hors limites : refusée', async () => {
    const c = t.database.client;
    const vide = await rechercher(c, 'le la des !!', { mode: 'apercu' });
    expect(vide).toMatchObject({ total: 0, resultats: [], curseur_suivant: null });
    expect(vide.message).toMatch(/Aucun mot à chercher/);
    await expect(rechercher(c, '')).rejects.toBeInstanceOf(RequeteInvalide);
    await expect(rechercher(c, 'x'.repeat(201))).rejects.toBeInstanceOf(RequeteInvalide);
    await expect(rechercher(c, 42)).rejects.toBeInstanceOf(RequeteInvalide);
    await expect(rechercher(c, 'svg', { limite: TAILLE_PAGE_MAX + 1 })).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it('curseur opaque : pages successives, refusé pour une autre requête ou s’il est altéré', async () => {
    const c = t.database.client;
    const p1 = await rechercher(c, 'motion design', { mode: 'apercu', limite: 2 });
    expect(p1.resultats).toHaveLength(2);
    expect(p1.curseur_suivant).not.toBeNull();
    const p2 = await rechercher(c, 'motion design', { mode: 'apercu', limite: 2, curseur: p1.curseur_suivant });
    expect(slugs(p2)).toEqual(['demo-video']);
    expect(p2.curseur_suivant).toBeNull();
    await expect(rechercher(c, 'svg', { mode: 'apercu', limite: 2, curseur: p1.curseur_suivant })).rejects.toBeInstanceOf(RequeteInvalide);
    await expect(rechercher(c, 'motion design', { mode: 'public', limite: 2, curseur: p1.curseur_suivant })).rejects.toBeInstanceOf(RequeteInvalide);
    await expect(rechercher(c, 'motion design', { mode: 'apercu', curseur: 'pas-un-curseur' })).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it('tri « récents » : jour le plus récent d’abord', async () => {
    const r = await rechercher(t.database.client, 'motion design', { mode: 'apercu', tri: 'recents' });
    expect(slugs(r)).toEqual(['demo-courbes', 'demo-anim', 'demo-video']);
  });
});

describe('moteur (pur)', () => {
  const doc = (postId: number, motsCles: DocumentRecherche['motsCles'], textes: string[] = [], jour: string | null = null): DocumentRecherche => ({ postId, revisionId: postId, jour, motsCles, textes });

  it('un terme proche sans raison n’explique rien et ne remonte pas', () => {
    const docs = [doc(1, [{ champ: 'terme_proche', terme: 'motion design', raison: '  ', passage: null }]), doc(2, [{ champ: 'terme_proche', terme: 'motion design', raison: null, passage: null }])];
    expect(classer('motion design', docs)).toEqual([]);
  });

  it('un terme proche ne compte que pour l’expression entière : un seul mot partagé ne suffit pas', () => {
    const docs = [doc(1, [{ champ: 'terme_proche', terme: 'motion design', raison: 'Une raison assez longue ici.', passage: null }])];
    expect(classer('design graphique', docs)).toEqual([]);
    expect(classer('motion', docs).map((r) => r.score)).toEqual([POIDS.terme_proche.expression]);
  });

  it('répéter un mot-clé n’augmente pas le score ; le texte est plafonné', () => {
    const une = doc(1, [{ champ: 'usage', terme: 'animation web', raison: null, passage: 'p' }]);
    const repetee = doc(2, [1, 2, 3].map(() => ({ champ: 'usage' as const, terme: 'animation web', raison: null, passage: 'p' })));
    const [a, b] = classer('animation', [une, repetee]);
    expect(a!.score).toBe(b!.score);
    const long = doc(3, [], ['alpha beta gamma delta epsilon']);
    expect(classer('alpha gamma epsilon delta', [long])[0]!.score).toBe(6);
    expect(classer('alpha beta', [long])[0]).toMatchObject({ score: POIDS.texte.expression, correspondances: [{ champ: 'texte', extrait: 'alpha beta gamma delta epsilon' }] });
  });

  it('l’expression ne s’étend pas sur deux parties du texte', () => {
    const r = classer('motion design', [doc(1, [], ['On parle de motion.', 'Puis de design.'])]);
    expect(r[0]!.score).toBe(2 * POIDS.texte.mot);
    expect(r[0]!.correspondances[0]!.raison).toBe('Mots « motion », « design » trouvés dans le texte de la publication.');
  });
});

describe('commande chercher', () => {
  let sortie: string[];
  beforeEach(() => {
    sortie = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
  });
  afterEach(() => vi.restoreAllMocks());
  const ctx = () => ({ config: loadConfig({}), database: t.database });

  it('affiche résultats et correspondances en mode aperçu ; code 0 même sans résultat', async () => {
    expect(await chercher(['motion', 'design'], ctx())).toBe(0);
    const texte = sortie.join('\n');
    expect(texte).toContain('mode apercu');
    expect(texte).toContain('3 résultat(s)');
    expect(texte).toContain('pas encore publié');
    expect(texte).toContain("terme proche « motion design » : L'animation web d'éléments d'interface relève du motion design.");
    sortie = [];
    expect(await chercher(['comptabilité'], ctx())).toBe(0);
    expect(sortie.join('\n')).toContain('0 résultat(s)');
  });

  it('sortie JSON et code 1 pour une saisie invalide', async () => {
    expect(await chercher(['svg', '--json'], ctx())).toBe(0);
    expect(JSON.parse(sortie.join('\n')).resultats.map((r: { nom: string }) => r.nom)).toEqual(['demo-anim']);
    expect(await chercher([], ctx())).toBe(1);
    expect(await chercher(['svg', '--curseur', 'faux'], ctx())).toBe(1);
  });
});

describe('lexique et couverture partielle (P6 bloc 4, 2026-11-05)', () => {
  const doc = (postId: number, textes: string[], motsCles: DocumentRecherche['motsCles'] = []): DocumentRecherche => ({ postId, revisionId: postId, jour: '2026-11-05', motsCles, textes });

  it('une requête en français trouve un texte anglais par le lexique, et l’explication le dit', () => {
    const r = classer('lunettes', [doc(1, ['XREAL AURA: wired XR glasses running Android XR']), doc(2, ['A new MacBook Pro display'])]);
    expect(r.map((x) => x.postId)).toEqual([1]);
    expect(r[0]!.correspondances[0]!.raison).toContain('terme proche du lexique : « lunette » → « glasses »');
  });

  it('jusqu’à deux mots, tous sont exigés ; à partir de trois, un peut manquer, et le résultat complet passe devant', () => {
    expect(classer('motion comptable', [doc(1, ['Motion design tools for the web'])])).toEqual([]);
    const r = classer('synthèse vocale locale', [doc(1, ['Speech for your phone, open weights']), doc(2, ['Voice speech synthesis that runs local on device'])]);
    expect(r.map((x) => [x.postId, x.complet])).toEqual([[2, true], [1, false]]);
  });

  it('le produit et les catégories d’une actualité servent de nom et de catégorie : elle n’est plus évincée par les ressources', () => {
    const actualite = doc(1, ['GitHub Copilot app adds Projects and desktop control'], [{ champ: 'nom', terme: 'GitHub Copilot app', raison: null, passage: null }]);
    const ressource = doc(2, ['Works with Copilot and Cursor'], [{ champ: 'technologie', terme: 'Copilot', raison: null, passage: 'Works with Copilot' }]);
    expect(classer('Copilot', [ressource, actualite])[0]!.postId).toBe(1);
  });
});
