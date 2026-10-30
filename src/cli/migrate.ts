// npm run db:migrate — crée ou met à jour les tables à partir des migrations versionnées.
import { describeDatabaseUrl } from '../config.ts';
import { runMigrations } from '../db/migrate.ts';
import { runCommand } from './shared.ts';

await runCommand(
  async ({ config, database }) => {
    await runMigrations(database);
    console.log(`Base à jour : ${describeDatabaseUrl(config.databaseUrl)}`);
  },
  { requireSchema: false },
);
