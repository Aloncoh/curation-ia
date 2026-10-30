import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLiveFetcher, type SourceFetcher } from '../src/collect/fetchers.ts';
import { contentHash, normalizeText } from '../src/collect/normalize.ts';
import { SafeFetchError } from '../src/collect/safe-fetch.ts';
import { setPaused } from '../src/control/settings.ts';
import type { Database } from '../src/db/client.ts';
import { runCollect } from '../src/worker/collect.ts';
import { SOURCES } from '../src/sources.ts';
import { createTestDb, fakeFetcher, readFixture, scalar, type TestDb } from './helpers/db.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

const collect = (database: Database, fetcher: SourceFetcher, overrides: { maxAttempts?: number } = {}) =>
  runCollect({
    database,
    fetcher,
    mode: 'fixture',
    workerId: 'test-worker',
    leaseMs: 60_000,
    maxAttempts: overrides.maxAttempts ?? 3,
    retryBackoffMs: 60_000,
  });

const counts = async (database: Database) => ({
  documents: await scalar(database, 'select count(*) from source_document'),
  snapshots: await scalar(database, 'select count(*) from document_snapshot'),
});

type Release = { id: number; tag_name: string; name: string | null; html_url: string; body: string | null; prerelease: boolean; published_at: string | null };
const fixtureReleases = () => JSON.parse(readFixture()) as Release[];

describe('collecte', () => {
  it('première collecte : 5 documents et 5 captures, avec provenance, dates, contenu et traces', async () => {
    const summary = await collect(t.database, fakeFetcher(readFixture()));
    expect(summary.runs).toHaveLength(1);
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 5, unchangedDocuments: 0, changedDocuments: 0 });
    expect(await counts(t.database)).toEqual({ documents: 5, snapshots: 5 });

    const doc = (await t.database.client.execute("select * from source_document where external_id = '425846009'")).rows[0];
    expect(doc).toMatchObject({
      source_id: 'github-releases:anthropics/claude-code',
      version: 'v2.1.312',
      url: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
      normalized_url: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
      announced_at: '2026-10-27T20:24:20.000Z',
    });
    expect(String(doc?.first_collected_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Le contenu stocké est bien celui de la release, et son empreinte se recalcule à l'identique.
    const [release] = fixtureReleases();
    const snapshot = (
      await t.database.client.execute(
        "select title, content, content_hash from document_snapshot where document_id = (select id from source_document where external_id = '425846009')",
      )
    ).rows[0];
    expect(snapshot?.content).toBe(normalizeText(release!.body ?? ''));
    expect(snapshot?.content_hash).toBe(
      contentHash({ title: String(snapshot?.title), version: 'v2.1.312', content: String(snapshot?.content) }),
    );

    const steps = await t.database.client.execute('select name, status from run_step order by seq');
    expect(steps.rows.map((row) => `${row.name}:${row.status}`)).toEqual(['fetch:succeeded', 'parse:succeeded', 'store:succeeded']);
    expect(await scalar(t.database, "select count(*) from run where status = 'succeeded' and mode = 'fixture' and new_documents = 5")).toBe(1);
    expect(await scalar(t.database, "select count(*) from job where status = 'succeeded'")).toBe(1);
    expect(await scalar(t.database, "select count(*) from source where status = 'ok' and last_success_at is not null")).toBe(1);
  });

  it("conserve l'URL d'origine et calcule une URL normalisée distincte", async () => {
    const releases = fixtureReleases();
    releases[0]!.html_url = 'https://GitHub.com/anthropics/claude-code/releases/tag/v2.1.312/?utm_source=feed#notes';
    await collect(t.database, fakeFetcher(JSON.stringify(releases)));
    const doc = (await t.database.client.execute("select url, normalized_url from source_document where external_id = '425846009'")).rows[0];
    expect(doc?.url).toBe('https://GitHub.com/anthropics/claude-code/releases/tag/v2.1.312/?utm_source=feed#notes');
    expect(doc?.normalized_url).toBe('https://github.com/anthropics/claude-code/releases/tag/v2.1.312');
  });

  it('seconde collecte après redémarrage : aucun nouveau document ni capture', async () => {
    await collect(t.database, fakeFetcher(readFixture()));
    const before = (await t.database.client.execute('select external_id, first_collected_at from source_document order by id')).rows;

    const reopened = t.reopen();
    const summary = await collect(reopened, fakeFetcher(readFixture()));
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 0, unchangedDocuments: 5, changedDocuments: 0 });
    expect(await counts(reopened)).toEqual({ documents: 5, snapshots: 5 });
    const after = (await reopened.client.execute('select external_id, first_collected_at from source_document order by id')).rows;
    expect(after).toEqual(before);
  });

  it("contenu modifié : une seule nouvelle capture, l'ancienne est conservée", async () => {
    await collect(t.database, fakeFetcher(readFixture()));
    const releases = fixtureReleases();
    releases[0]!.body = `${releases[0]!.body}\n- Correctif ajouté après publication`;
    const modified = JSON.stringify(releases);

    const summary = await collect(t.database, fakeFetcher(modified));
    expect(summary.runs[0]).toMatchObject({ newDocuments: 0, unchangedDocuments: 4, changedDocuments: 1 });
    expect(await counts(t.database)).toEqual({ documents: 5, snapshots: 6 });
    const snapshots = await t.database.client.execute(
      "select seq, content_hash from document_snapshot where document_id = (select id from source_document where external_id = '425846009') order by seq",
    );
    expect(snapshots.rows.map((row) => Number(row.seq))).toEqual([1, 2]);
    expect(snapshots.rows[0]?.content_hash).not.toBe(snapshots.rows[1]?.content_hash);

    const again = await collect(t.database, fakeFetcher(modified));
    expect(again.runs[0]).toMatchObject({ newDocuments: 0, unchangedDocuments: 5, changedDocuments: 0 });
    expect(await counts(t.database)).toEqual({ documents: 5, snapshots: 6 });
  });

  it('date de publication ou statut de prerelease modifiés sans changement de contenu : fiche document mise à jour, aucune capture', async () => {
    await collect(t.database, fakeFetcher(readFixture()));
    const releases = fixtureReleases();
    releases[0]!.published_at = '2026-10-29T12:00:00Z';
    releases[0]!.prerelease = true;
    const summary = await collect(t.database, fakeFetcher(JSON.stringify(releases)));
    expect(summary.runs[0]).toMatchObject({ newDocuments: 0, unchangedDocuments: 5, changedDocuments: 0 });
    expect(await counts(t.database)).toEqual({ documents: 5, snapshots: 5 });
    const doc = (await t.database.client.execute("select announced_at, metadata from source_document where external_id = '425846009'")).rows[0];
    expect(doc?.announced_at).toBe('2026-10-29T12:00:00.000Z');
    expect(JSON.parse(String(doc?.metadata))).toMatchObject({ prerelease: true });
  });

  const failingFetcher = (error: Error): SourceFetcher => async () => {
    throw error;
  };

  it.each([
    ['http_status', failingFetcher(new SafeFetchError('http_status', 'Réponse HTTP 500', 500))],
    ['timeout', failingFetcher(new SafeFetchError('timeout', 'Délai dépassé (15000 ms)'))],
    ['redirect', failingFetcher(new SafeFetchError('redirect', 'Redirection refusée (HTTP 301)', 301))],
    ['too_large', failingFetcher(new SafeFetchError('too_large', 'Réponse trop volumineuse'))],
    ['forbidden_address', failingFetcher(new SafeFetchError('forbidden_address', 'Adresse interdite'))],
    ['network', failingFetcher(new SafeFetchError('network', 'ECONNRESET'))],
    ['invalid_response', fakeFetcher('<html>Service indisponible</html>')],
    ['invalid_response', fakeFetcher(JSON.stringify({ message: 'API rate limit exceeded' }))],
  ])('source en erreur (%s) : exécution échouée avec motif et étape en échec, données intactes', async (kind, fetcher) => {
    await collect(t.database, fakeFetcher(readFixture()));
    const hashesBefore = (await t.database.client.execute('select content_hash from document_snapshot order by id')).rows;

    const summary = await collect(t.database, fetcher);
    expect(summary.runs[0]).toMatchObject({ status: 'failed', errorKind: kind });
    expect(await counts(t.database)).toEqual({ documents: 5, snapshots: 5 });
    expect((await t.database.client.execute('select content_hash from document_snapshot order by id')).rows).toEqual(hashesBefore);

    const run = (await t.database.client.execute("select id, status, error_kind, error_message from run where status = 'failed'")).rows[0];
    expect(run).toMatchObject({ status: 'failed', error_kind: kind });
    expect(String(run?.error_message).length).toBeGreaterThan(0);
    const step = (await t.database.client.execute({ sql: 'select status, detail from run_step where run_id = ? order by seq desc limit 1', args: [String(run?.id)] })).rows[0];
    expect(step?.status).toBe('failed');
    expect(JSON.parse(String(step?.detail))).toMatchObject({ errorKind: kind });

    const job = (await t.database.client.execute('select status, attempts, last_error from job order by id desc limit 1')).rows[0];
    expect(job).toMatchObject({ status: 'pending', attempts: 1 });
    expect(job?.last_error).toBeTruthy();
    expect(await scalar(t.database, "select count(*) from source where status = 'error' and last_error is not null")).toBe(1);
  });

  it('tentatives épuisées : le job passe en échec définitif', async () => {
    const summary = await collect(t.database, failingFetcher(new SafeFetchError('http_status', 'Réponse HTTP 503', 503)), { maxAttempts: 1 });
    expect(summary.runs[0]?.status).toBe('failed');
    expect(await scalar(t.database, "select count(*) from job where status = 'failed'")).toBe(1);
  });

  it("pause : aucun job pris et aucun appel à la source, jusqu'à la reprise", async () => {
    await setPaused(t.database, true, new Date().toISOString());
    const fetcher = fakeFetcher(readFixture());
    const paused = await collect(t.database, fetcher);
    expect(paused).toMatchObject({ paused: true, runs: [] });
    expect(fetcher.calls).toBe(0);
    expect(await scalar(t.database, 'select count(*) from run')).toBe(0);

    await setPaused(t.database, false, new Date().toISOString());
    const resumed = await collect(t.database, fetcher);
    expect(resumed.runs[0]?.status).toBe('succeeded');
    expect(fetcher.calls).toBe(1);
  });

  it('le collecteur réel refuse un hôte absent de la liste blanche de la source, sans requête réseau', async () => {
    const restricted = SOURCES.map((def) => ({ ...def, allowedHosts: ['example.org'] }));
    const summary = await runCollect({
      database: t.database,
      fetcher: createLiveFetcher({ timeoutMs: 1_000, maxBytes: 1_024, userAgent: 'test' }),
      mode: 'live',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: restricted,
    });
    expect(summary.runs[0]).toMatchObject({ status: 'failed', errorKind: 'disallowed_url' });
  });
});
