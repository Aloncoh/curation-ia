// Verrou tenu par un autre programme plus longtemps que le délai d'attente de SQLite :
// après la nouvelle tentative, l'écriture doit être réellement enregistrée et ne laisser aucun verrou.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Database } from '../src/db/client.ts';
import { withBusyRetry } from '../src/db/retry.ts';
import { settings } from '../src/db/schema.ts';
import { claimNextJob, enqueueCollectJobs } from '../src/jobs/queue.ts';
import { SOURCES, syncSources } from '../src/sources.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

let t: TestDb;
let worker: Database;
let locker: Database;

beforeEach(async () => {
  t = await createTestDb();
  await syncSources(t.database, SOURCES, new Date().toISOString());
  worker = openDatabase(t.url, 200);
  locker = openDatabase(t.url, 200);
});
afterEach(() => {
  worker.close();
  locker.close();
  t.cleanup();
});

/** Un autre « programme » prend le verrou d'écriture pendant `ms` millisecondes. */
async function holdWriteLock(ms: number): Promise<void> {
  const tx = await locker.client.transaction('write');
  setTimeout(() => {
    tx.rollback()
      .catch(() => {})
      .finally(() => tx.close());
  }, ms);
}

describe('verrou plus long que le délai d’attente', () => {
  it('une réservation de job est bien enregistrée et visible des autres connexions', async () => {
    await enqueueCollectJobs(t.database.client, [SOURCES[0]!.id], new Date().toISOString(), 3);
    await holdWriteLock(700);

    const claimed = await claimNextJob(worker.client, 'W', new Date().toISOString(), 60_000);
    expect(claimed).not.toBeNull();

    const job = (await t.database.client.execute('select status, attempts, lease_owner from job')).rows[0];
    expect(job).toMatchObject({ status: 'leased', attempts: 1, lease_owner: 'W' });
    // Aucun verrou résiduel : une autre connexion peut écrire.
    await t.database.client.execute("insert into setting (key, value, updated_at) values ('libre', 'oui', 'x')");
  });

  it('une transaction est bien validée et ne laisse aucun verrou', async () => {
    await holdWriteLock(700);

    await withBusyRetry(worker.client, () =>
      worker.db.transaction(async (tx) => {
        await tx.insert(settings).values({ key: 'transaction', value: 'validée', updatedAt: 'x' });
      }),
    );

    const row = (await t.database.client.execute("select value from setting where key = 'transaction'")).rows[0];
    expect(row?.value).toBe('validée');
    await t.database.client.execute("insert into setting (key, value, updated_at) values ('libre', 'oui', 'x')");
  });
});
