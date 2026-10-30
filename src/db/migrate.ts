// Application des migrations SQL versionnées du dossier drizzle/.
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Database } from './client.ts';
import { withBusyRetry } from './retry.ts';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(database: Database): Promise<void> {
  await withBusyRetry(database.client, () => migrate(database.db, { migrationsFolder: MIGRATIONS_FOLDER }));
}
