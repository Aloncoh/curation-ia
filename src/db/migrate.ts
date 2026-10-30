// Application des migrations SQL versionnées du dossier drizzle/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Database } from './client.ts';
import { withBusyRetry } from './retry.ts';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Journal des migrations versionnées (drizzle/meta/_journal.json). */
export function readJournal(): { entries: { when: number; tag: string }[] } {
  return JSON.parse(readFileSync(fileURLToPath(new URL('../../drizzle/meta/_journal.json', import.meta.url)), 'utf8'));
}

export async function runMigrations(database: Database): Promise<void> {
  await withBusyRetry(database.client, () => migrate(database.db, { migrationsFolder: MIGRATIONS_FOLDER }));
}
