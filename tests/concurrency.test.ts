import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURE_PATH, createTestDb, scalar, type TestDb } from './helpers/db.ts';
import { startCollect, startNode } from './helpers/cli.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

describe('concurrence entre processus', () => {
  it('deux collecteurs lancés en même temps : un seul traite le job', async () => {
    const env = { DATABASE_URL: t.url, CURATION_FIXTURE: FIXTURE_PATH, CURATION_FIXTURE_DELAY_MS: '1500' };
    const [a, b] = await Promise.all([startCollect(env).done, startCollect(env).done]);

    expect(a.code).toBe(0);
    expect(b.code).toBe(0);
    const outputs = [a.stdout, b.stdout];
    expect(outputs.filter((out) => out.includes('5 nouveau(x)'))).toHaveLength(1);
    expect(outputs.filter((out) => out.includes('Aucun job disponible'))).toHaveLength(1);

    expect(await scalar(t.database, 'select count(*) from run')).toBe(1);
    expect(await scalar(t.database, "select count(*) from run where status = 'succeeded' and mode = 'fixture'")).toBe(1);
    expect(await scalar(t.database, 'select count(*) from job')).toBe(1);
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(5);
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(5);
  });

  it('300 jobs réservés par deux processus en parallèle : aucun job réservé deux fois', async () => {
    const now = new Date().toISOString();
    const statements = [];
    for (let i = 1; i <= 300; i++) {
      statements.push({
        sql: `insert into source (id, kind, name, config, allowed_hosts, created_at) values (?, 'test', ?, '{}', '[]', ?)`,
        args: [`test:${i}`, `source ${i}`, now],
      });
      statements.push({
        sql: `insert into job (kind, source_id, status, attempts, max_attempts, available_at, created_at, updated_at)
              values ('collect', ?, 'pending', 0, 3, ?, ?, ?)`,
        args: [`test:${i}`, now, now, now],
      });
    }
    await t.database.client.batch(statements, 'write');

    const startAt = String(Date.now() + 800);
    const [a, b] = await Promise.all([
      startNode('tests/helpers/claim-worker.ts', [t.url, 'worker-a', startAt], {}).done,
      startNode('tests/helpers/claim-worker.ts', [t.url, 'worker-b', startAt], {}).done,
    ]);
    expect(a.stderr).toBe('');
    expect(b.stderr).toBe('');
    const claimedA = JSON.parse(a.stdout) as number[];
    const claimedB = JSON.parse(b.stdout) as number[];

    // Les deux processus ont réellement réservé des jobs en concurrence, sans jamais obtenir le même.
    expect(claimedA.length).toBeGreaterThan(0);
    expect(claimedB.length).toBeGreaterThan(0);
    const overlap = claimedA.filter((id) => claimedB.includes(id));
    expect(overlap).toEqual([]);
    expect(new Set([...claimedA, ...claimedB]).size).toBe(300);
    expect(claimedA.length + claimedB.length).toBe(300);
    expect(await scalar(t.database, "select count(*) from job where status = 'leased' and attempts = 1")).toBe(300);
    console.info(`Répartition : worker-a ${claimedA.length} jobs, worker-b ${claimedB.length} jobs`);
  });
});
