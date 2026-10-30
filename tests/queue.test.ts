import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setPaused } from '../src/control/settings.ts';
import { attachRun, claimNextJob, completeJob, enqueueCollectJobs, failJob, recoverExpiredLeases } from '../src/jobs/queue.ts';
import { insertRun } from '../src/jobs/runs.ts';
import { SOURCES, syncSources } from '../src/sources.ts';
import { runCollect } from '../src/worker/collect.ts';
import { createTestDb, fakeFetcher, readFixture, scalar, type TestDb } from './helpers/db.ts';

const SOURCE = SOURCES[0]!.id;
const BASE = Date.parse('2026-10-30T10:00:00.000Z');
const at = (offsetMs: number) => new Date(BASE + offsetMs).toISOString();

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await syncSources(t.database, SOURCES, at(0));
});
afterEach(() => t.cleanup());

describe('file de jobs', () => {
  it('un seul job actif par source, même demandé deux fois', async () => {
    expect(await enqueueCollectJobs(t.database.client, [SOURCE], at(0), 3)).toBe(1);
    expect(await enqueueCollectJobs(t.database.client, [SOURCE], at(1), 3)).toBe(0);
    expect(await scalar(t.database, 'select count(*) from job')).toBe(1);
  });

  it('la pause empêche la réservation dans la même instruction, même appelée directement', async () => {
    await enqueueCollectJobs(t.database.client, [SOURCE], at(0), 3);
    await setPaused(t.database, true, at(0));
    expect(await claimNextJob(t.database.client, 'A', at(1), 60_000)).toBeNull();
    await setPaused(t.database, false, at(2));
    expect(await claimNextJob(t.database.client, 'A', at(3), 60_000)).not.toBeNull();
  });

  it('bail perdu : le worker dépossédé ne peut ni terminer ni faire échouer le job', async () => {
    await enqueueCollectJobs(t.database.client, [SOURCE], at(0), 3);
    const a = await claimNextJob(t.database.client, 'A', at(0), 1_000);
    const b = await claimNextJob(t.database.client, 'B', at(2_000), 60_000);
    expect(b).toMatchObject({ id: a?.id, attempts: 2 });

    expect(await completeJob(t.database.db, a!.id, 'A', at(2_100))).toBe(false);
    expect(await failJob(t.database.db, a!, 'A', 'erreur', at(2_100), 1_000)).toBe('lease_lost');
    const job = (await t.database.client.execute('select status, lease_owner from job')).rows[0];
    expect(job).toMatchObject({ status: 'leased', lease_owner: 'B' });
    expect(await completeJob(t.database.db, b!.id, 'B', at(2_200))).toBe(true);
  });

  it("un job ayant épuisé ses tentatives passe en échec et ne bloque plus sa source", async () => {
    await enqueueCollectJobs(t.database.client, [SOURCE], at(0), 0);
    expect(await claimNextJob(t.database.client, 'A', at(1), 60_000)).toBeNull();
    await recoverExpiredLeases(t.database.client, at(2));
    expect(await scalar(t.database, "select count(*) from job where status = 'failed'")).toBe(1);
    expect(await enqueueCollectJobs(t.database.client, [SOURCE], at(3), 3)).toBe(1);
  });

  it("job repris juste après l'expiration du bail : l'exécution précédente est marquée « interrompue », même si la récupération ne l'a pas vue", async () => {
    // Le worker A réserve le job (bail jusqu'à +1 s), démarre son exécution puis s'arrête.
    await enqueueCollectJobs(t.database.client, [SOURCE], at(0), 3);
    const a = await claimNextJob(t.database.client, 'A', at(0), 1_000);
    await insertRun(t.database.db, { id: 'run-A', kind: 'collect', jobId: a!.id, sourceId: SOURCE, mode: 'fixture', workerId: 'A', startedAt: at(0) });
    await attachRun(t.database.db, a!.id, 'A', 'run-A');

    // Le worker B lit l'heure juste avant l'expiration pendant la récupération, juste après pour la réservation.
    let calls = 0;
    const clock = () => new Date(BASE + (++calls <= 3 ? 999 : 1_001 + calls));
    const summary = await runCollect({
      database: t.database,
      fetcher: fakeFetcher(readFixture()),
      mode: 'fixture',
      workerId: 'B',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 1_000,
      clock,
    });

    expect(summary.runs.map((run) => run.status)).toEqual(['succeeded']);
    const runs = (await t.database.client.execute('select id, status from run order by started_at')).rows;
    expect(runs.find((run) => run.id === 'run-A')?.status).toBe('interrupted');
    expect(await scalar(t.database, "select count(*) from run where status = 'running'")).toBe(0);
    expect(await scalar(t.database, "select attempts from job")).toBe(2);
  });
});
