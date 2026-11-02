// Lot SOCLE de la chaîne des ressources (ADR 0011) : schéma, normalisation, statut, capture, contrôles et commandes.
// Aucun réseau : transport et résolution injectés dans safeGet ; fixtures fabriquées (tests/fixtures/README.md).
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { genererBrouillons } from '../src/analysis/pipeline.ts';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { loadConfig } from '../src/config.ts';
import { lireReglageEntier } from '../src/control/settings.ts';
import { openDatabase } from '../src/db/client.ts';
import { MIGRATIONS_FOLDER, readJournal, runMigrations } from '../src/db/migrate.ts';
import { contientExpression, motsNormalises, normaliser, singulier } from '../src/recherche/normaliser.ts';
import { capturesDeRessource, executerCapture, jsonTrie, lireDepot } from '../src/ressources/capture.ts';
import { capturer } from '../src/ressources/commandes/capturer.ts';
import { chercher } from '../src/ressources/commandes/chercher.ts';
import { importer } from '../src/ressources/commandes/importer.ts';
import { planning } from '../src/ressources/commandes/planning.ts';
import { source } from '../src/ressources/commandes/source.ts';
import { verifier, verifierFichier } from '../src/ressources/commandes/verifier.ts';
import { controlerRessource, destinationDe, FORMULE_FIGEE, metadonneesDe, repereRedondant } from '../src/ressources/controles.ts';
import { RESSOURCES, type EntreeRessource } from '../src/ressources/liste.ts';
import { BrouillonRessource } from '../src/ressources/schemas.ts';
import { etatDepot, statutSortie } from '../src/ressources/statut.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';

const lire = (nom: string) => readFileSync(fileURLToPath(new URL(`./fixtures/ressources/${nom}`, import.meta.url)), 'utf8');
const BROUILLON = JSON.parse(lire('brouillon-demo-anim.json')) as Record<string, unknown>;
const copie = <T>(v: T): T => structuredClone(v);

const ANIM: EntreeRessource = { slug: 'demo-anim', nom: 'demo-anim', depot: 'exemple-org/demo-skills', chemins: ['skills/anim/SKILL.md', 'README.md'], compte: 'repo' };
const AUTRE: EntreeRessource = { slug: 'demo-autre', nom: 'demo-autre', depot: 'exemple-org/demo-skills', chemins: ['skills/autre/SKILL.md', 'README.md'], compte: 'repo' };
const FORK: EntreeRessource = { slug: 'demo-fork', nom: 'Demo Fork', depot: 'exemple-org/demo-fork', chemins: ['README.md'], compte: 'repo' };
const LISTE = [ANIM, AUTRE, FORK];

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const RESET = 1_793_635_200; // 2026-11-02T16:00:00Z
type Route = { status?: number; body: string; headers?: Record<string, string> };
const quota = (restant: number) => JSON.stringify({ resources: { core: { limit: 60, remaining: restant, reset: RESET } } });

function routes(): Record<string, Route> {
  return {
    [`${API}/rate_limit`]: { body: quota(50) },
    [`${API}/repos/exemple-org/demo-skills`]: { body: lire('depot-demo-skills.json'), headers: { 'x-ratelimit-remaining': '49', 'x-ratelimit-reset': String(RESET) } },
    [`${API}/repos/exemple-org/demo-skills/contents/skills/anim?ref=main`]: { body: lire('dossier-anim.json') },
    [`${API}/repos/exemple-org/demo-skills/contents/skills/autre?ref=main`]: { body: lire('dossier-autre.json') },
    [`${RAW}/exemple-org/demo-skills/main/README.md`]: { body: lire('readme-demo-skills.md') },
    [`${RAW}/exemple-org/demo-skills/main/skills/anim/SKILL.md`]: { body: lire('skill-anim.md') },
    [`${RAW}/exemple-org/demo-skills/main/skills/anim/LICENSE.txt`]: { body: lire('licence-anim.txt') },
    [`${RAW}/exemple-org/demo-skills/main/skills/autre/SKILL.md`]: { body: lire('skill-autre.md') },
    [`${API}/repos/exemple-org/demo-fork`]: { body: lire('depot-demo-fork.json') },
    [`${RAW}/exemple-org/demo-fork/main/README.md`]: { body: lire('readme-demo-fork.md') },
  };
}

/** Transport de test : répond selon l'URL (404 sinon) et garde la liste des URL appelées. */
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

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

const capture = (table: Record<string, Route>, extra: Partial<Parameters<typeof executerCapture>[0]> = {}) => {
  const transport = faux(table);
  return { transport, bilan: executerCapture({ database: t.database, userAgent: 'test', workerId: 'test', entrees: LISTE, transport, resolve: PUBLIQUE, horloge: HORLOGE, mode: 'fixture', ...extra }) };
};

async function capturesDe(e: EntreeRessource) {
  const c = await capturesDeRessource(t.database.client, e);
  return { captures: c, meta: metadonneesDe(c) };
}
const codes = (l: { code: string }[]) => l.map((c) => c.code);

describe('migration 0009', () => {
  async function cheminPublication(client: TestDb['database']['client']) {
    await client.batch(
      [
        `insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'feed', 'S', '{}', '[]', 'x')`,
        `insert into source_document (source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values ('s', 'e', 'https://a.b', 'https://a.b', 't', 'x', 'x')`,
        `insert into document_snapshot (document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 1, 'h', 't', 'c', 'markdown', 'x')`,
        `insert into news_item (kind, title, first_seen_at, status) values ('annonce', 't', 'x', 'collected')`,
        `insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('repo', 'repo', 'Repo', 'agent', 'a', 'b', 'c', 1, 'x')`,
        `insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 0, 0, 0)`,
        `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, created_at) values (1, 'r', 'controle_automatique', 1, 'm', 'p', 'x')`,
        `insert into post (account_id, news_item_id, evidence_level, status, created_at) values ('repo', 1, 'documentary_analysis', 'brouillon', 'x')`,
        `insert into post_revision (post_id, seq, draft_id, content, created_at) values (1, 1, 1, '{}', 'x')`,
      ],
      'write',
    );
  }

  it('recrée post_draft sans casser les clés étrangères des lignes existantes', async () => {
    // Base arrêtée à la migration 0008, avec une révision qui pointe vers un brouillon.
    const dossier = mkdtempSync(join(tmpdir(), 'curation-migr-'));
    try {
      mkdirSync(join(dossier, 'meta'));
      const journal = readJournal();
      const avant = journal.entries.slice(0, journal.entries.findIndex((e) => e.tag === '0009_chaine_ressources'));
      expect(avant.map((e) => e.tag).at(-1)).toBe('0008_comparaison_sortie');
      writeFileSync(join(dossier, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: avant }));
      for (const e of avant) copyFileSync(join(MIGRATIONS_FOLDER, `${e.tag}.sql`), join(dossier, `${e.tag}.sql`));
      const url = `file:${join(dossier, 'ancienne.db')}`;
      const base = openDatabase(url, 5_000);
      await migrate(base.db, { migrationsFolder: dossier });
      await cheminPublication(base.client);
      await runMigrations(base);
      const draft = await base.client.execute('select id, origine from post_draft');
      expect(draft.rows.map((r) => [Number(r.id), r.origine])).toEqual([[1, 'agent_site']]);
      expect((await base.client.execute('pragma foreign_key_check')).rows).toEqual([]);
      expect((await base.client.execute('pragma integrity_check')).rows[0]?.integrity_check).toBe('ok');
      // Une clé étrangère cassée serait refusée : la table recréée garde ses références.
      await expect(base.client.execute(`insert into post_revision (post_id, seq, draft_id, content, created_at) values (1, 2, 99, '{}', 'x')`)).rejects.toThrow(/FOREIGN KEY/);
      base.close();
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  });

  it('pose les contraintes des mots-clés, du bouton, du planning et de l’origine', async () => {
    const c = t.database.client;
    await cheminPublication(c);
    const motCle = (champ: string, raison: string | null, passage: string | null) =>
      c.execute({ sql: `insert into post_mot_cle (post_id, revision_id, champ, terme, terme_normalise, raison, passage, created_at) values (1, 1, ?, 't', ?, ?, ?, 'x')`, args: [champ, `${champ}${raison}${passage}`, raison, passage] });
    await expect(motCle('terme_proche', null, null)).rejects.toThrow(/post_mot_cle_raison_ck/);
    await expect(motCle('terme_proche', '  ', null)).rejects.toThrow(/post_mot_cle_raison_ck/);
    await expect(motCle('usage', null, null)).rejects.toThrow(/post_mot_cle_passage_ck/);
    await expect(motCle('technologie', null, '')).rejects.toThrow(/post_mot_cle_passage_ck/);
    await expect(motCle('hashtag', null, null)).rejects.toThrow(/post_mot_cle_champ_ck/);
    await motCle('usage', null, 'un passage cité');
    await motCle('terme_proche', 'raison qui relie le terme', null);
    await expect(motCle('usage', null, 'un passage cité')).rejects.toThrow(/UNIQUE/);

    const bouton = (libelle: string, destination: string) =>
      c.execute({ sql: `insert into post_bouton (post_id, revision_id, libelle, destination, url, hote, url_controle, resultat, verifie_le, created_at) values (1, 1, ?, ?, 'https://github.com/o/r', 'github.com', 'https://api.github.com/repos/o/r', 'verifie', 'x', 'x')`, args: [libelle, destination] });
    await expect(bouton('Installer', 'depot')).rejects.toThrow(/post_bouton_coherence_ck/);
    await expect(bouton('Voir le dépôt', 'installation')).rejects.toThrow(/post_bouton_coherence_ck/);
    await bouton('Voir le dépôt', 'depot');
    // Migration 0010 : https seulement, et github.com pour un dépôt.
    const boutonUrl = (url: string, hote: string) =>
      c.execute({ sql: `insert into post_bouton (post_id, revision_id, libelle, destination, url, hote, url_controle, resultat, verifie_le, created_at) values (1, 1, 'Voir le dépôt', 'depot', ?, ?, ?, 'verifie', 'x', 'x')`, args: [url, hote, url] });
    await expect(boutonUrl('http://github.com/o/r', 'github.com')).rejects.toThrow(/post_bouton_url_ck/);
    await expect(boutonUrl('https://evil.example/x', 'evil.example')).rejects.toThrow(/post_bouton_url_ck/);

    const plan = (etat: string, jour: string | null, priorite = 2) =>
      c.execute({ sql: `insert or replace into publication_planifiee (post_id, jour, rang, priorite, statut_sortie, etat, created_at, updated_at) values (1, ?, ?, ?, 'ressource_existante', ?, 'x', 'x')`, args: [jour, jour ? 1 : null, priorite, etat] });
    await expect(plan('prevue', null)).rejects.toThrow(/publication_planifiee_jour_ck/);
    await expect(plan('prevue', '2026-11-03', 5)).rejects.toThrow(/publication_planifiee_priorite_ck/);
    await plan('reportee', null);
    await plan('prevue', '2026-11-03');

    await expect(c.execute(`update post_draft set origine = 'autre'`)).rejects.toThrow(/post_draft_origine_ck/);
    await c.execute(`update post_draft set origine = 'claude_code_developpement'`);
  });

  it('crée l’index FTS5 : expression, accents retirés, préfixe', async () => {
    const c = t.database.client;
    const docs = [
      [1, 'anime js', 'motion design animation web svg', 'animer une page'],
      [2, 'claude mem', 'memoire session', 'garder la mémoire'],
      [3, 'gsap', 'motion design', 'animation'],
    ];
    for (const [id, nom, motsCles, texte] of docs) await c.execute({ sql: 'insert into recherche_publication (post_id, revision_id, nom, mots_cles, texte) values (?, ?, ?, ?, ?)', args: [id!, id!, nom!, motsCles!, texte!] });
    const ids = async (q: string) => (await c.execute({ sql: 'select post_id from recherche_publication where recherche_publication match ? order by post_id', args: [q] })).rows.map((r) => Number(r.post_id));
    expect(await ids('"motion design"')).toEqual([1, 3]);
    expect(await ids('"memoire"')).toEqual([2]);
    expect(await ids('anim*')).toEqual([1, 3]);
  });
});

describe('normalisation de la recherche', () => {
  it('retire accents, ligatures, casse et ponctuation', () => {
    expect(normaliser('Mémoire de l’Œuvre — Anime.js !')).toBe('memoire oeuvre anime js');
  });
  it('pluriels simples, appliqués pareil des deux côtés', () => {
    expect(['effets', 'animations', 'jeux', 'process', 'campus', 'analysis', 'macos', 'nextjs', 'bus', 'ios'].map(singulier)).toEqual([
      'effet', 'animation', 'jeu', 'process', 'campus', 'analysis', 'macos', 'nextjs', 'bus', 'ios',
    ]);
    expect(normaliser('Effets visuels')).toBe(normaliser('effet visuel'));
  });
  it('retire les mots vides et compare en mots entiers', () => {
    expect(motsNormalises('le motion design pour the web')).toEqual(['motion', 'design', 'web']);
    expect(contientExpression('Des animations web fluides', 'animation web')).toBe(true);
    expect(contientExpression('Des animations web fluides', 'anim')).toBe(false);
    expect(contientExpression('texte', '   ')).toBe(false);
  });
});

describe('statut de sortie et état du dépôt', () => {
  it('nouvelle sortie seulement si la création est connue et récente', () => {
    expect(statutSortie('2026-10-25T00:00:00Z', '2026-11-02T00:00:00Z', 14)).toBe('nouvelle_sortie');
    expect(statutSortie('2026-10-19T00:00:00Z', '2026-11-02T00:00:00Z', 14)).toBe('nouvelle_sortie');
    expect(statutSortie('2026-10-18T23:59:59Z', '2026-11-02T00:00:00Z', 14)).toBe('ressource_existante');
    expect(statutSortie(null, '2026-11-02T00:00:00Z', 14)).toBe('ressource_existante');
    expect(statutSortie('illisible', '2026-11-02T00:00:00Z', 14)).toBe('ressource_existante');
    // Une date future (horloge décalée) ne fait pas une nouveauté.
    expect(statutSortie('2026-11-05T00:00:00Z', '2026-11-02T00:00:00Z', 14)).toBe('ressource_existante');
  });
  it('état daté : inactivité, licence inconnue, fork et parent', () => {
    const m = lireDepot(lire('depot-demo-skills.json'), 'exemple-org/demo-skills');
    const e = etatDepot({ ...m, pushed_at: '2026-03-17T00:00:00Z' }, '2026-11-02T12:00:00.000Z', 90);
    expect(e).toMatchObject({ etoiles: 1234, etoiles_au: '2026-11-02T12:00:00.000Z', licence: null, inactif: true, jours_sans_push: 230, fork: false, parent: null, date_ajout_skill: null });
    const f = etatDepot(lireDepot(lire('depot-demo-fork.json'), 'exemple-org/demo-fork'), '2026-11-02T12:00:00.000Z', 90);
    expect(f).toMatchObject({ fork: true, parent: { full_name: 'origine-org/learning-loop' }, licence: 'MIT', inactif: false });
  });
  it('réglages entiers : défaut du code, valeur en base, valeur illisible refusée', async () => {
    expect(await lireReglageEntier(t.database.db, 'publication.plafond_jour')).toBe(20);
    await t.database.client.execute(`insert into setting (key, value, updated_at) values ('publication.plafond_jour', '12', 'x')`);
    expect(await lireReglageEntier(t.database.db, 'publication.plafond_jour')).toBe(12);
    await t.database.client.execute(`update setting set value = 'vingt' where key = 'publication.plafond_jour'`);
    await expect(lireReglageEntier(t.database.db, 'publication.plafond_jour')).rejects.toThrow(/invalide/);
  });
});

describe('destination du bouton', () => {
  it('un dépôt ou un dossier GitHub est « Voir le dépôt », jamais « Installer »', () => {
    expect(destinationDe('https://github.com/anthropics/skills')).toBe('depot');
    expect(destinationDe('https://github.com/anthropics/skills/tree/main/skills/frontend-design')).toBe('depot');
    expect(destinationDe('https://github.com/o/r/releases/tag/v1')).toBeNull();
    expect(destinationDe('https://github.com/o/r/releases/tag/v1', { releasesAvecFichiers: true })).toBe('telechargement');
    for (const url of ['http://github.com/o/r', 'https://github.com/o', 'https://evil.example/o/r', 'https://github.com/o/r?x=1', 'https://github.com/o/r/blob/main/README.md', 'pas une url']) {
      expect(destinationDe(url)).toBeNull();
    }
  });
});

describe('liste des ressources', () => {
  it('21 ressources, slugs uniques, dépôts au format canonique, premier chemin principal', () => {
    expect(RESSOURCES).toHaveLength(21);
    expect(new Set(RESSOURCES.map((e) => e.slug)).size).toBe(21);
    expect(new Set(RESSOURCES.map((e) => e.depot)).size).toBe(16);
    for (const e of RESSOURCES) {
      expect(e.depot).toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
      expect(e.chemins[0]).toMatch(/(?:^|\/)(?:SKILL|README)\.md$/);
    }
    expect(RESSOURCES.find((e) => e.slug === 'scientific-agent-skills')!.depot).toBe('K-Dense-AI/scientific-agent-skills');
    // ECC vient de l'utilisateur, pas du fil X : sa provenance le dit ; les autres gardent la provenance commune.
    expect(RESSOURCES.find((e) => e.slug === 'ecc')!.decouverteVia).toMatch(/hors du fil X/);
    expect(RESSOURCES.filter((e) => e.decouverteVia !== undefined).map((e) => e.slug)).toEqual(['ecc']);
  });
});

describe('capture', () => {
  it('capture dépôts, fichiers, dossiers et licence locale, une requête par adresse, et trace tout', async () => {
    const { transport, bilan } = capture(routes());
    const b = await bilan;
    expect(b.code).toBe(0);
    expect(b.ressources.map((r) => [r.slug, r.resultat, r.decision?.decision, r.decision?.motif])).toEqual([
      ['demo-anim', 'capturee', 'publier', 'liste_utilisateur'],
      ['demo-autre', 'capturee', 'publier', 'liste_utilisateur'],
      ['demo-fork', 'capturee', 'publier', 'liste_utilisateur'],
    ]);
    // Dépôt et README partagés : une seule requête chacun dans l'exécution.
    expect(transport.appels.filter((u) => u === `${API}/repos/exemple-org/demo-skills`)).toHaveLength(1);
    expect(transport.appels.filter((u) => u.endsWith('demo-skills/main/README.md'))).toHaveLength(1);
    expect(transport.appels.every((u) => u.startsWith(`${API}/`) || u.startsWith(`${RAW}/`))).toBe(true);

    const { captures, meta } = await capturesDe(ANIM);
    expect(captures.map((c) => c.document)).toEqual(['depot', 'fichier:skills/anim/SKILL.md', 'dossier:skills/anim', 'fichier:skills/anim/LICENSE.txt', 'fichier:README.md']);
    expect(meta).toMatchObject({ full_name: 'exemple-org/demo-skills', stargazers_count: 1234, license: null, topics: ['animation', 'svg'] });
    expect(captures[0]!.contenu).not.toContain('owner');
    expect(captures[0]!.contenu).toBe(jsonTrie(meta));
    expect(captures.find((c) => c.document === 'dossier:skills/anim')!.url).toBe('https://github.com/exemple-org/demo-skills/tree/main/skills/anim');

    const c = t.database.client;
    const items = await c.execute(`select n.kind, n.title, n.announced_at, d.external_id from news_item n join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary' join source_document d on d.id = nd.document_id order by n.id`);
    expect(items.rows.map((r) => [r.kind, r.title, r.announced_at, r.external_id])).toEqual([
      ['decouverte', 'demo-anim', null, 'fichier:skills/anim/SKILL.md'],
      ['decouverte', 'demo-autre', null, 'fichier:skills/autre/SKILL.md'],
      ['decouverte', 'Demo Fork', null, 'fichier:README.md'],
    ]);
    const src = await c.execute(`select id, kind, status, allowed_hosts from source order by id`);
    expect(src.rows.map((r) => [r.id, r.kind, r.status])).toEqual([
      ['github-ressource:exemple-org/demo-fork', 'github-ressource', 'ok'],
      ['github-ressource:exemple-org/demo-skills', 'github-ressource', 'ok'],
    ]);
    expect(JSON.parse(String(src.rows[0]!.allowed_hosts))).toEqual(['api.github.com', 'raw.githubusercontent.com']);
    const run = await c.execute(`select kind, mode, status, new_news_items from run`);
    expect(run.rows[0]).toMatchObject({ kind: 'ressources_capture', mode: 'fixture', status: 'succeeded', new_news_items: 3 });
    expect(await scalar(t.database, `select count(*) from run_step where name = 'requete'`)).toBe(transport.appels.length);
    expect(await scalar(t.database, `select count(*) from selection_decision where origine = 'regles' and juge = 'code' and consignes_version = 'liste-2026-11-02'`)).toBe(3);
  });

  it('relance idempotente : récente sautée, forcée sans nouvelle capture, étoiles changées = nouvelle capture', async () => {
    await capture(routes()).bilan;
    const snapshots = await scalar(t.database, 'select count(*) from document_snapshot');
    const recente = capture(routes());
    expect((await recente.bilan).ressources.map((r) => r.resultat)).toEqual(['recente', 'recente', 'recente']);
    expect(recente.transport.appels).toEqual([`${API}/rate_limit`]);

    const forcee = await capture(routes(), { forcer: true }).bilan;
    expect(forcee.compteurs).toMatchObject({ newDocuments: 0, changedDocuments: 0, newNewsItems: 0 });
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(snapshots);
    expect(await scalar(t.database, 'select count(*) from selection_decision')).toBe(3);

    const table = routes();
    table[`${API}/repos/exemple-org/demo-skills`]!.body = lire('depot-demo-skills.json').replace('1234', '1300');
    const etoiles = await capture(table, { forcer: true, entrees: [ANIM] }).bilan;
    expect(etoiles.ressources[0]!.documents.find((d) => d.document === 'depot')!.issue).toBe('changed');
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(snapshots + 1);
    // Les étoiles n'entrent dans aucune décision : rien n'est requalifié.
    expect(await scalar(t.database, 'select count(*) from selection_decision where remplacee_le is not null')).toBe(0);
  });

  it('refuse une redirection et une adresse privée, et trace chaque refus', async () => {
    const table = routes();
    table[`${API}/repos/exemple-org/demo-fork`] = { status: 301, body: '', headers: { location: 'https://api.github.com/repositories/1' } };
    const b = await capture(table).bilan;
    expect(b.code).toBe(1);
    expect(b.ressources.find((r) => r.slug === 'demo-fork')).toMatchObject({ resultat: 'echec' });
    const refus = await t.database.client.execute(`select detail from run_step where status = 'failed' and name = 'requete'`);
    expect(refus.rows.map((r) => JSON.parse(String(r.detail)).refus.kind)).toEqual(['redirect']);
    expect(await scalar(t.database, `select count(*) from source where status = 'error'`)).toBe(1);

    const privee = await capture(routes(), { resolve: async () => [{ address: '10.0.0.1', family: 4 }], forcer: true }).bilan;
    expect(privee.code).toBe(1);
    expect(privee.ressources.every((r) => r.resultat === 'echec')).toBe(true);
    const kinds = await t.database.client.execute(`select detail from run_step where status = 'failed' and name = 'requete'`);
    expect(kinds.rows.map((r) => JSON.parse(String(r.detail)).refus.kind)).toContain('forbidden_address');
  });

  it('plafond d’API : arrêt propre en code 2 avec l’heure de réinitialisation, puis reprise', async () => {
    const table = routes();
    table[`${API}/rate_limit`] = { body: quota(1) };
    table[`${API}/repos/exemple-org/demo-skills`]!.headers = { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(RESET) };
    const { transport, bilan } = capture(table);
    const b = await bilan;
    expect(b.code).toBe(2);
    expect(b.quotaEpuise).toBe(true);
    expect(b.quota.reinitialisation).toBe('2026-11-02T16:00:00.000Z');
    expect(b.ressources.map((r) => r.resultat)).toEqual(['non_traitee', 'non_traitee', 'non_traitee']);
    // Aucune requête d'API n'est envoyée une fois le plafond atteint.
    expect(transport.appels.filter((u) => u.startsWith(`${API}/repos/`))).toEqual([`${API}/repos/exemple-org/demo-skills`]);
    expect(await t.database.client.execute(`select status, error_kind from run`).then((r) => r.rows[0])).toMatchObject({ status: 'failed', error_kind: 'quota_epuise' });

    const reprise = await capture(routes()).bilan;
    expect(reprise.code).toBe(0);
    expect(reprise.ressources.map((r) => r.resultat)).toEqual(['capturee', 'capturee', 'capturee']);
  });

  it('un 403 de plafond est reconnu comme tel', async () => {
    const table = routes();
    table[`${API}/repos/exemple-org/demo-skills`] = { status: 403, body: '{}', headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(RESET) } };
    const b = await capture(table).bilan;
    expect(b).toMatchObject({ code: 2, quotaEpuise: true });
  });

  it('chemin principal absent : échec sans actualité ; dépôt archivé : écarté', async () => {
    const table = routes();
    delete table[`${RAW}/exemple-org/demo-skills/main/skills/autre/SKILL.md`];
    table[`${API}/repos/exemple-org/demo-fork`]!.body = lire('depot-demo-fork.json').replace('"archived": false', '"archived": true');
    const b = await capture(table).bilan;
    expect(b.code).toBe(1);
    expect(b.ressources.find((r) => r.slug === 'demo-autre')).toMatchObject({ resultat: 'echec', decision: { decision: 'approfondir', motif: 'chemin_principal_absent' } });
    expect(b.ressources.find((r) => r.slug === 'demo-autre')!.documents).toContainEqual({ document: 'fichier:skills/autre/SKILL.md', issue: 'absent' });
    expect(b.ressources.find((r) => r.slug === 'demo-fork')).toMatchObject({ resultat: 'capturee', decision: { decision: 'ecarter', motif: 'depot_archive' } });
    const absent = await t.database.client.execute(`select detail from run_step where name = 'requete' and detail like '%autre/SKILL.md%'`);
    expect(JSON.parse(String(absent.rows[0]!.detail))).toMatchObject({ statut: 404, absent: true, refus: null });
    expect(await scalar(t.database, `select count(*) from news_item`)).toBe(2);
  });

  it('une découverte ne part jamais au moteur de rédaction', async () => {
    await capture(routes(), { mode: 'live' }).bilan;
    const modele = { appels: 0, compter: async () => 100, appeler: async () => Promise.reject(new Error('appel interdit')) };
    const espion = vi.spyOn(modele, 'appeler');
    await genererBrouillons({ database: t.database, modele, nomModele: 'claude-opus-5-5', maxItems: 5, capRunMicroUsd: 10_000_000, capTotalMicroUsd: 10_000_000, attente: async () => {} });
    expect(espion).not.toHaveBeenCalled();
    expect(await scalar(t.database, 'select count(*) from llm_call')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from post_draft')).toBe(0);
  });
});

describe('contrôles d’un brouillon', () => {
  async function controler(brouillon: unknown, entree: EntreeRessource = ANIM) {
    const { captures, meta } = await capturesDe(entree);
    return controlerRessource(brouillon, captures, meta, entree);
  }
  beforeEach(async () => {
    await capture(routes()).bilan;
  });

  it('le brouillon de démonstration est conforme', async () => {
    expect(BrouillonRessource.safeParse(BROUILLON).success).toBe(true);
    expect(await controler(BROUILLON)).toEqual({ bloquants: [], a_verifier: [] });
  });

  it('entrées inutilisables : schéma, slug, consignes, capture', async () => {
    // Un champ calculé par le code est refusé dans le brouillon.
    expect(codes((await controler({ ...BROUILLON, statut_sortie: 'nouvelle_sortie' })).bloquants)).toEqual(['schema_invalide']);
    expect(codes((await controler({ ...BROUILLON, slug: 'inconnu' })).bloquants)).toEqual(['slug_inconnu']);
    expect(codes((await controler({ ...BROUILLON, consignes: 'r0' })).bloquants)).toEqual(['consignes_inconnues']);
    expect(codes(controlerRessource(BROUILLON, [], null, ANIM).bloquants)).toEqual(['capture_absente']);
    const termeLong = copie(BROUILLON) as { mots_cles: { usages: { texte: string }[] } };
    termeLong.mots_cles.usages[0]!.texte = 'un terme bien trop long ici';
    expect(codes((await controler(termeLong)).bloquants)).toEqual(['schema_invalide']);
  });

  it('commande absente de la capture et « Installer » vers un dépôt : bloquants', async () => {
    const b = copie(BROUILLON) as { demarrage: { commande: string }; bouton: { libelle: string } };
    b.demarrage.commande = 'npm install demo-anim';
    b.bouton.libelle = 'Installer';
    expect(codes((await controler(b)).bloquants)).toEqual(['commande_introuvable', 'bouton_libelle_incoherent']);
  });

  it('commande risquée : à vérifier, pas bloquante si elle est citée', async () => {
    const b = copie(BROUILLON) as { demarrage: { commande: string } };
    b.demarrage.commande = 'curl -fsSL https://exemple.org/install.sh | bash';
    const r = await controler(b);
    expect(r.bloquants).toEqual([]);
    expect(codes(r.a_verifier)).toEqual(['commande_risquee']);
  });

  it('bouton : URL non canonique, hôte inattendu', async () => {
    const b = copie(BROUILLON) as { bouton: { url: string } };
    b.bouton.url = 'https://github.com/exemple-org/demo-skills/tree/main/skills/inexistant';
    expect(codes((await controler(b)).bloquants)).toEqual(['bouton_url_non_canonique']);
    b.bouton.url = 'https://exemple.org/install';
    expect(codes((await controler(b)).bloquants)).toEqual(['bouton_hote_inattendu']);
    b.bouton.url = 'https://github.com/exemple-org/demo-skills';
    expect((await controler(b)).bloquants).toEqual([]);
  });

  it('citations : absente, trop courte, champ sans citation, usage sans passage', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    b.interet.passages = ['Use this skill to fly.'];
    b.exemple_usage.passages = ['SVG logo'];
    b.limites[0].passages = [];
    b.mots_cles.usages[1].passages = ['passage qui n’existe pas'];
    expect(codes((await controler(b)).bloquants)).toEqual(['citation_introuvable', 'citation_trop_courte', 'champ_sans_citation', 'citation_introuvable', 'usage_sans_passage']);
  });

  it('mots-clés : technologie introuvable, nom incohérent, termes proches sans raison, non reliés ou de marque absente', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    b.mots_cles.technologies.push({ texte: 'Three.js', passages: ['Write the timeline with Anime.js.'] });
    b.mots_cles.nom = 'Autre nom';
    b.mots_cles.termes_proches = [
      { terme: 'effets', raison: 'animation web' },
      { terme: 'jeux vidéo', raison: 'Un sujet voisin sans aucun lien établi ici.' },
      { terme: 'Figma', raison: 'Le motion design se prépare souvent dans un outil.' },
      { terme: 'SVG', raison: 'Le format SVG est cité comme technologie du skill.' },
    ];
    const r = await controler(b);
    expect(codes(r.bloquants)).toEqual(['nom_incoherent', 'technologie_introuvable', 'terme_proche_sans_raison', 'terme_proche_non_relie', 'terme_proche_nom_absent']);
    expect(codes(r.a_verifier)).toEqual(['terme_proche_redondant']);
  });

  it('aucun essai revendiqué, aucune popularité invoquée, mots-clés compris', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    b.interet.texte = 'Nous avons testé ce skill sur une page web.';
    b.mots_cles.termes_proches[0].raison = 'Une animation web très populaire chez les designers.';
    expect(codes((await controler(b)).bloquants)).toEqual(['essai_non_realise', 'popularite_invoquee']);
  });

  it('à vérifier : licence locale omise, accroche non conforme, repère trop long, nombre absent', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    b.licence_locale = null;
    b.accroche.texte = 'Un skill incroyable pour animer vos pages !';
    b.reperes[0] = { texte: 'Animations web avec Anime.js et SVG, transitions CSS et chronologies détaillées', passages: ['Create web animations with Anime.js, SVG and CSS transitions.'] };
    b.description.texte = 'Un skill qui crée 12 animations web avec Anime.js, SVG et CSS.';
    const r = await controler(b);
    expect(r.bloquants).toEqual([]);
    expect(codes(r.a_verifier).sort()).toEqual(['accroche_non_conforme', 'accroche_non_conforme', 'licence_locale_absente', 'nombre_absent_des_citations', 'repere_trop_long'].sort());
  });

  it('une étape du visuel « étapes » plus longue que sa case est signalée avant l’import, à vérifier', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    expect(b.demarrage.etapes.length).toBeGreaterThanOrEqual(2);
    b.demarrage.etapes[1].texte = `${b.demarrage.etapes[1].texte} ${'x'.repeat(90)}`.slice(0, 81);
    const r = await controler(b);
    expect(r.a_verifier.filter((c) => c.code === 'etape_trop_longue')).toEqual([{ champ: 'demarrage.etapes:1', code: 'etape_trop_longue', detail: '81 caractères, 80 au plus' }]);
    // Une seule étape ne devient pas une case du visuel : sa longueur n'est pas bornée ici.
    b.demarrage.etapes = [b.demarrage.etapes[1]];
    expect(codes((await controler(b)).a_verifier)).not.toContain('etape_trop_longue');
  });

  it('consignes r2 : formule d’ouverture figée et repère qui redit le post, à vérifier', async () => {
    const b = copie(BROUILLON) as Record<string, any>;
    b.interet.texte = 'Ce qui le distingue : il sert quand on demande du motion design sur une page web.';
    b.reperes[0] = { texte: 'Animations web avec Anime.js et SVG', passages: ['Create web animations with Anime.js, SVG and CSS transitions.'] };
    const r = await controler(b);
    expect(r.bloquants).toEqual([]);
    expect(r.a_verifier).toEqual([
      { champ: 'interet', code: 'formule_figee', detail: expect.any(String) },
      { champ: 'reperes:0', code: 'repere_redondant', detail: 'Animations web avec Anime.js et SVG' },
    ]);
    // En milieu de texte, après une phrase, la formule reste figée ; un repère qui apporte un point nouveau passe.
    expect(FORMULE_FIGEE.test('Un skill pour animer. Ce qui la démarque : la chronologie.')).toBe(true);
    expect(FORMULE_FIGEE.test('Il distingue une illustration d’une démonstration.')).toBe(false);
    expect(repereRedondant('Vérification du rendu dans le navigateur', [b.accroche.texte, b.description.texte], ['demo-anim'])).toBe(false);
    // Le nom de la ressource ne compte pas : un repère réduit au nom n'est pas jugé.
    expect(repereRedondant('demo-anim', [b.accroche.texte], ['demo-anim'])).toBe(false);
  });

  it('fork : attribution d’origine exigée, parent inconnu bloquant', async () => {
    const brouillon = {
      ...copie(BROUILLON),
      slug: 'demo-fork',
      accroche: { texte: 'Demo Fork garde ce que l’agent apprend', passages: ['A learning loop skill for coding agents.'] },
      description: { texte: 'Une boucle d’apprentissage pour agents de code.', passages: ['A learning loop skill for coding agents.'] },
      interet: { texte: 'Il enregistre ce que l’agent a appris comme un nouveau skill.', passages: ['It saves what the agent learned during a session as a new skill.'] },
      exemple_usage: { texte: 'Usage possible : conserver un apprentissage de séance.', passages: ['It saves what the agent learned during a session as a new skill.'] },
      demarrage: { etapes: [{ texte: 'Installer le skill puis relancer l’agent.', passages: ['and restart the agent.'] }], commande: 'npx skills add exemple-org/demo-fork', passages: ['and restart the agent.'] },
      compatibilites: [],
      limites: [],
      licence_locale: null,
      mots_cles: { nom: 'Demo Fork', categorie: 'MCP et skills', usages: [{ texte: 'apprentissage continu', passages: ['A learning loop skill for coding agents.'] }], technologies: [], termes_proches: [] },
      bouton: { libelle: 'Voir le dépôt', url: 'https://github.com/exemple-org/demo-fork' },
      reperes: [{ texte: 'Relance de l’agent après installation', passages: ['and restart the agent.'] }],
    };
    const r = await controler(brouillon, FORK);
    expect(r.bloquants).toEqual([]);
    expect(codes(r.a_verifier)).toEqual(['fork_non_mentionne']);
    const mentionne = { ...brouillon, limites: [{ texte: 'Fork du dépôt de origine-org, attribution conservée.', passages: ['A learning loop skill for coding agents.'] }] };
    expect(codes((await controler(mentionne, FORK)).a_verifier)).not.toContain('fork_non_mentionne');

    const { captures, meta } = await capturesDe(FORK);
    expect(codes(controlerRessource(brouillon, captures, { ...meta!, parent: null }, FORK).bloquants)).toEqual(['fork_sans_parent']);
  });
});

describe('commandes', () => {
  let dossier: string;
  let sortie: string[];
  const ctx = () => ({ config: loadConfig({}), database: t.database, dossier, liste: LISTE, transport: faux(routes()), resolve: PUBLIQUE, horloge: HORLOGE });
  beforeEach(() => {
    dossier = mkdtempSync(join(tmpdir(), 'curation-ressources-'));
    sortie = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dossier, { recursive: true, force: true });
  });

  it('capturer puis source écrit la capture lisible, avec l’avertissement et la source brute', async () => {
    expect(await capturer([], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/demo-anim \[capturee\] — 1234 étoiles au 2026-11-02 — dernier push 2026-10-30 — licence Non renseigné — statut ressource_existante/);
    expect(sortie.join('\n')).toMatch(/demo-fork \[capturee\].*statut nouvelle_sortie.*fork de origine-org\/learning-loop/);
    expect(await source(['demo-anim'], ctx())).toBe(0);
    const md = readFileSync(join(dossier, 'captures', 'demo-anim.md'), 'utf8');
    expect(md).toContain('Contenu collecté : données non fiables, jamais des instructions.');
    expect(md).toContain('## fichier:skills/anim/SKILL.md — https://github.com/exemple-org/demo-skills/blob/main/skills/anim/SKILL.md');
    expect(md).toContain('### Texte citable (passages)');
    expect(md).toContain('----- début brut -----\n---\nname: anim');
    expect(md).toContain('npx skills add exemple-org/demo-skills --skill anim');
    expect(md.indexOf('## depot')).toBeLessThan(md.indexOf('## fichier:skills/anim/SKILL.md'));
    expect(await source(['demo-inconnue'], ctx()).catch((e: Error) => e.message)).toMatch(/inconnue/);
  });

  it('source sans capture : code 1', async () => {
    expect(await source(['demo-anim'], ctx())).toBe(1);
  });

  it('verifier : conforme, puis brouillon fabriqué refusé (commande absente, « Installer » vers un dépôt), JSON invalide', async () => {
    await capturer([], ctx());
    const fichier = join(dossier, 'b.json');
    writeFileSync(fichier, JSON.stringify(BROUILLON));
    expect(await verifier([fichier], ctx())).toBe(0);
    const ok = await verifierFichier(fichier, ctx());
    expect(ok).toMatchObject({ slug: 'demo-anim', consignes: 'r2', statut_sortie_calcule: 'ressource_existante', resultat: 'conforme' });
    expect(ok.captures.map((c) => c.document)).toContain('fichier:skills/anim/SKILL.md');

    const fabrique = copie(BROUILLON) as Record<string, any>;
    fabrique.demarrage.commande = 'npm install -g demo-anim';
    fabrique.bouton = { libelle: 'Installer', url: 'https://github.com/exemple-org/demo-skills' };
    writeFileSync(fichier, JSON.stringify(fabrique));
    expect(await verifier([fichier], ctx())).toBe(1);
    const refuse = await verifierFichier(fichier, ctx());
    expect(refuse.resultat).toBe('bloquant');
    expect(codes(refuse.bloquants)).toEqual(['commande_introuvable', 'bouton_libelle_incoherent']);

    writeFileSync(fichier, '{ pas du json');
    expect(await verifier([fichier], ctx())).toBe(1);
  });

  it('les sous-commandes des lots suivants sont construites (tests/ressources-chaine.test.ts)', async () => {
    // Dossier sans brouillon : rien à importer ; planning vide.
    expect(await importer([], ctx())).toBe(0);
    expect(await planning([], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/Aucune publication planifiée/);
    // « chercher » est construit par le lot RECHERCHE : une saisie vide est refusée en code 1 (tests/recherche.test.ts).
    expect(await chercher([], ctx())).toBe(1);
  });
});
