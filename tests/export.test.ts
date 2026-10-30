import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildExport } from '../src/export/export.ts';
import { runCollect } from '../src/worker/collect.ts';
import { CLAUDE_CODE, createTestDb, fakeFetcher, readFixture, type TestDb } from './helpers/db.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

describe('export JSON', () => {
  it('expose documents, captures et exécutions dans un format lisible', async () => {
    await runCollect({
      database: t.database,
      fetcher: fakeFetcher(readFixture()),
      mode: 'fixture',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [CLAUDE_CODE],
    });
    const data = await buildExport(t.database.db, '2026-10-30T00:00:00.000Z');
    const parsed = JSON.parse(JSON.stringify(data)) as typeof data;

    expect(parsed.documents).toHaveLength(5);
    expect(parsed.documents[0]).toMatchObject({ version: 'v2.1.312', announced_at: '2026-10-27T20:24:20.000Z' });
    for (const doc of parsed.documents) {
      expect(doc.first_capture_mode).toBe('fixture');
      expect(doc.snapshots).toHaveLength(1);
      expect(doc.snapshots[0]?.collected_in_mode).toBe('fixture');
      expect(doc.snapshots[0]?.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(doc.snapshots[0]?.content_length).toBe(doc.snapshots[0]?.content.length);
    }
    expect(parsed.recent_runs[0]).toMatchObject({ mode: 'fixture', status: 'succeeded', new_documents: 5 });
    expect(parsed.note).toContain('pas encore des fiches');
  });
});
