import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURE_PATH, createTestDb, scalar, type TestDb } from './helpers/db.ts';
import { startCollect } from './helpers/cli.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

describe('arrêt brutal puis relance', () => {
  it('processus tué en pleine collecte puis relancé : ni perte ni doublon, exécution marquée interrompue', async () => {
    const env = { DATABASE_URL: t.url, CURATION_FIXTURE: FIXTURE_PATH, CURATION_ONLY_SOURCES: 'github-releases:anthropics/claude-code', CURATION_LEASE_MS: '1000' };
    const first = startCollect({ ...env, CURATION_FIXTURE_DELAY_MS: '5000' });

    // Attendre que le premier processus ait réservé le job et démarré son exécution, puis le tuer.
    const deadline = Date.now() + 8_000;
    while ((await scalar(t.database, "select count(*) from run where status = 'running'")) === 0) {
      if (Date.now() > deadline) throw new Error("le premier collecteur n'a jamais démarré");
      await sleep(100);
    }
    first.child.kill('SIGKILL');
    const killed = await first.done;
    expect(killed.signal).toBe('SIGKILL');
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(0);

    // Le bail (1 s) expire, puis un nouveau collecteur reprend le job.
    await sleep(1_200);
    const second = await startCollect({ ...env, CURATION_FIXTURE_DELAY_MS: '0' }).done;
    expect(second.code).toBe(0);
    expect(second.stdout).toContain('5 nouveau(x)');

    const runs = (await t.database.client.execute('select status, error_kind from run order by started_at')).rows;
    expect(runs.map((row) => `${row.status}:${row.error_kind ?? ''}`)).toEqual(['interrupted:interrupted', 'succeeded:']);
    const job = (await t.database.client.execute('select status, attempts from job')).rows;
    expect(job).toHaveLength(1);
    expect(job[0]).toMatchObject({ status: 'succeeded', attempts: 2 });
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(5);
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(5);
  });

  it("processus tué pendant l'enregistrement : rien n'est à moitié écrit, la relance enregistre tout une seule fois", async () => {
    const env = { DATABASE_URL: t.url, CURATION_FIXTURE: FIXTURE_PATH, CURATION_ONLY_SOURCES: 'github-releases:anthropics/claude-code', CURATION_LEASE_MS: '1000' };
    // Le premier collecteur attend 5 s à l'intérieur de la transaction, après avoir écrit les documents.
    const first = startCollect({ ...env, CURATION_TEST_HOLD_IN_STORE_MS: '5000' });

    const deadline = Date.now() + 8_000;
    while ((await scalar(t.database, 'select count(*) from run_step')) < 2) {
      if (Date.now() > deadline) throw new Error("le premier collecteur n'a jamais atteint l'enregistrement");
      await sleep(50);
    }
    await sleep(400);
    first.child.kill('SIGKILL');
    expect((await first.done).signal).toBe('SIGKILL');
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(0);

    await sleep(1_200);
    const second = await startCollect(env).done;
    expect(second.code).toBe(0);
    expect(second.stdout).toContain('5 nouveau(x)');
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(5);
    expect(await scalar(t.database, 'select count(*) from document_snapshot')).toBe(5);
    expect(
      await scalar(t.database, 'select count(*) from source_document d where (select count(*) from document_snapshot s where s.document_id = d.id) <> 1'),
    ).toBe(0);
    const runs = (await t.database.client.execute('select status from run order by started_at')).rows.map((row) => row.status);
    expect(runs).toEqual(['interrupted', 'succeeded']);
  });
});

describe('mode fixture', () => {
  it('refusé sans CURATION_ONLY_SOURCES : le même fichier serait servi à toutes les sources', async () => {
    const result = await startCollect({ DATABASE_URL: t.url, CURATION_FIXTURE: FIXTURE_PATH, CURATION_ONLY_SOURCES: '' }).done;
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('CURATION_ONLY_SOURCES');
    expect(await scalar(t.database, 'select count(*) from source_document')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from run')).toBe(0);
  });
});
