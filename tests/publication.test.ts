// Publication réelle (P5) sur une base temporaire : passage atomique et idempotent de « en attente » à « publiée »,
// plafond quotidien, `doublon_possible`, actualité obsolète, passage introuvable, pause, cycles concurrents.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setPaused } from '../src/control/settings.ts';
import { cleProduit, doublonDe, publierLesDues, similariteTitres } from '../src/publication/publier.ts';
import { jourParis } from '../src/ressources/planification.ts';
import { startNode } from './helpers/cli.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';
import { ajouterActualite, contenuActualite, socle } from './helpers/publications.ts';

const MATIN = '2026-11-03T07:00:00.000Z';
let t: TestDb;

beforeEach(async () => {
  t = await createTestDb();
  await socle(t.database.client);
});
afterEach(() => t.cleanup());

const produit = (n: number, nom: string, version: string, titre?: string) =>
  ajouterActualite(t.database.client, n, { titre: titre ?? `${nom} ${version} release ${n}`, contenu: { ...contenuActualite(n), produit: nom, version_cible: version } });

describe('règles', () => {
  it('reconnaît un doublon par produit et version, ou par titre très proche', () => {
    expect(cleProduit({ produit: 'Claude Code', version_cible: 'v2.1.314' })).toBe('claude code@2.1.314');
    expect(cleProduit({ produit: 'Figma', version_cible: 'version non précisée' })).toBeNull();
    expect(similariteTitres('Gemini 4 Carbon: our next frontier model', 'Gemini 4 Carbon — our next frontier model')).toBe(1);
    expect(similariteTitres('Gemini 4 Carbon launches', 'Voxtral 3 transcription')).toBe(0);
    const recents = [{ post_id: 1, titre: 'Claude Code 2.1.314', cle: 'claude code@2.1.314' }];
    expect(doublonDe({ post_id: 2, titre: 'Changelog', cle: 'claude code@2.1.314' }, recents)).toEqual({ avec: 1, raison: 'meme_produit_version' });
    expect(doublonDe({ post_id: 3, titre: 'Claude Code 2.1.314', cle: null }, recents)).toEqual({ avec: 1, raison: 'titre_proche' });
    expect(doublonDe({ post_id: 4, titre: 'Codex CLI 0.167', cle: 'codex cli@0.167' }, recents)).toBeNull();
  });
});

describe('publication', () => {
  it('publie une fois les publications du jour, et rejouer ne change rien', async () => {
    for (const n of [1, 2]) await produit(n, `Widget${n}`, '2.1');
    await ajouterActualite(t.database.client, 3, { jour: '2026-11-04' });
    const bilan = await publierLesDues(t.database, MATIN);
    expect(bilan).toMatchObject({ jour: '2026-11-03', publiees: [1, 2], doublons: [], plafond_atteint: false });
    expect(await scalar(t.database, `select count(*) from post where status = 'publie' and published_at = '${MATIN}'`)).toBe(2);
    expect(await scalar(t.database, `select count(*) from publication_planifiee where etat = 'publiee'`)).toBe(2);
    const encore = await publierLesDues(t.database, '2026-11-03T07:05:00.000Z');
    expect(encore.publiees).toEqual([]);
    expect(await scalar(t.database, `select count(*) from post where status = 'publie'`)).toBe(2);
  });

  it('deux cycles concurrents, dans deux processus, ne publient chaque publication qu\'une fois', async () => {
    // Dans un même processus, l'attente de verrou de SQLite est synchrone : la concurrence réelle se teste entre processus.
    const aujourdhui = jourParis(new Date());
    for (const n of [1, 2, 3, 4, 5, 6]) await ajouterActualite(t.database.client, n, { jour: aujourdhui, titre: `Subject ${'abcdef'[n - 1]!.repeat(4)}`, contenu: { ...contenuActualite(n), produit: `Widget${n}` } });
    t.database.close();
    const env = { DATABASE_URL: t.url, DATABASE_AUTH_TOKEN: '' };
    const [a, b] = await Promise.all([startNode('src/cli/publier.ts', ['--confirmer'], env).done, startNode('src/cli/publier.ts', ['--confirmer'], env).done]);
    expect([a.code, b.code]).toEqual([0, 0]);
    const publiees = [...JSON.parse(a.stdout).publiees, ...JSON.parse(b.stdout).publiees].sort();
    expect(publiees).toEqual([1, 2, 3, 4, 5, 6]);
    const base = t.reopen();
    expect(await scalar(base, `select count(*) from post where status = 'publie'`)).toBe(6);
  }, 30_000);

  it('respecte le plafond du jour, recompté avant chaque publication', async () => {
    await t.database.client.execute(`insert into setting (key, value, updated_at) values ('publication.plafond_jour', '2', 'x')`);
    for (const n of [1, 2, 3]) await produit(n, `Widget${n}`, '2.1');
    const bilan = await publierLesDues(t.database, MATIN);
    expect(bilan.publiees).toEqual([1, 2]);
    expect(bilan.plafond_atteint).toBe(true);
    expect(await scalar(t.database, `select count(*) from post where status = 'en_attente'`)).toBe(1);
  });

  it('laisse en attente un doublon possible, avec son motif', async () => {
    await produit(1, 'Widget', '2.1', 'Acme ships Widget 2.1');
    await produit(2, 'Widget', '2.1', 'Widget 2.1 changelog');
    const bilan = await publierLesDues(t.database, MATIN);
    expect(bilan.publiees).toEqual([1]);
    expect(bilan.doublons).toEqual([{ post_id: 2, avec: 1, raison: 'meme_produit_version' }]);
    const r = await t.database.client.execute(`select p.status, pp.etat, pp.motif from post p join publication_planifiee pp on pp.post_id = p.id where p.id = 2`);
    expect(r.rows[0]).toMatchObject({ status: 'en_attente', etat: 'reportee', motif: 'doublon_possible' });
  });

  it('ne publie ni une actualité obsolète ni une actualité dont un passage est introuvable', async () => {
    await ajouterActualite(t.database.client, 1, { jour: '2026-10-30' });
    await ajouterActualite(t.database.client, 2, { contenu: { ...contenuActualite(2), accroche: { texte: 'x', passages: ['This sentence is not in the capture.'] } } });
    const bilan = await publierLesDues(t.database, MATIN);
    expect([bilan.publiees, bilan.obsoletes, bilan.a_verifier]).toEqual([[], [1], [2]]);
    expect(await scalar(t.database, `select count(*) from post where status = 'publie'`)).toBe(0);
  });

  it('ne publie rien pendant la pause', async () => {
    await produit(1, 'Widget', '2.1');
    await setPaused(t.database, true, MATIN);
    expect((await publierLesDues(t.database, MATIN)).en_pause).toBe(true);
    expect(await scalar(t.database, `select count(*) from post where status = 'publie'`)).toBe(0);
  });
});
