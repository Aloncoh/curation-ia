// Base SQLite temporaire, migrée, propre à chaque test.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceFetcher } from '../../src/collect/fetchers.ts';
import { SafeFetchError } from '../../src/collect/safe-fetch.ts';
import { openDatabase, type Database } from '../../src/db/client.ts';
import { runMigrations } from '../../src/db/migrate.ts';
import { SOURCES, type GithubReleasesSource } from '../../src/sources.ts';

/** Réponse réelle de l'API GitHub (5 releases de anthropics/claude-code), capturée le 2026-10-30 — voir fixtures/README.md. */
export const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/github-releases-claude-code.json', import.meta.url));

export const readFixture = (): string => readFileSync(FIXTURE_PATH, 'utf8');
export const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');

export const CLAUDE_CODE = SOURCES.find((def) => def.id === 'github-releases:anthropics/claude-code') as GithubReleasesSource;

/** Fetcher de test qui répond selon l'URL demandée (404 si inconnue) et garde la liste des URL appelées. */
export function routeFetcher(routes: Record<string, string>): SourceFetcher & { calls: string[] } {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const body = routes[url];
    if (body === undefined) throw new SafeFetchError('http_status', 'Réponse HTTP 404', 404);
    return { status: 200, body, bytes: Buffer.byteLength(body) };
  };
  return Object.assign(fetcher, { calls });
}

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
