// Base SQLite temporaire, migrée, propre à chaque test.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceFetcher } from '../../src/collect/fetchers.ts';
import { openDatabase, type Database } from '../../src/db/client.ts';
import { runMigrations } from '../../src/db/migrate.ts';

/** Réponse réelle de l'API GitHub (5 releases de anthropics/claude-code), capturée le 2026-10-30 — voir fixtures/README.md. */
export const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/github-releases-claude-code.json', import.meta.url));

export const readFixture = (): string => readFileSync(FIXTURE_PATH, 'utf8');

export interface TestDb {
  dir: string;
  url: string;
  database: Database;
  reopen(): Database;
  cleanup(): void;
}

export async function createTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(join(tmpdir(), 'curation-test-'));
  const url = `file:${join(dir, 'test.db')}`;
  const handle: TestDb = {
    dir,
    url,
    database: openDatabase(url, 5_000),
    reopen() {
      handle.database.close();
      handle.database = openDatabase(url, 5_000);
      return handle.database;
    },
    cleanup() {
      handle.database.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
  await runMigrations(handle.database);
  return handle;
}

/** Fetcher de test : renvoie un corps donné (ou lève une erreur) et compte ses appels. */
export function fakeFetcher(response: string | (() => string)): SourceFetcher & { calls: number } {
  const fetcher = Object.assign(
    async () => {
      fetcher.calls++;
      const body = typeof response === 'function' ? response() : response;
      return { status: 200, body, bytes: Buffer.byteLength(body) };
    },
    { calls: 0 },
  );
  return fetcher;
}

export async function scalar(database: Database, sql: string): Promise<number> {
  const result = await database.client.execute(sql);
  return Number(result.rows[0]?.[0] ?? 0);
}
