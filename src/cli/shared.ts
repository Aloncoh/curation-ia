// Démarrage commun des commandes : configuration, ouverture de la base, fermeture propre, code de sortie.
import { hostname } from 'node:os';
import { describeDatabaseUrl, loadConfig, redactSecrets, type AppConfig } from '../config.ts';
import { isInitialized, openDatabase, type Database } from '../db/client.ts';

export const workerId = () => `${hostname()}:${process.pid}`;

/** Charge .env.local s'il existe (variables locales non versionnées). */
function loadLocalEnv(): void {
  try {
    process.loadEnvFile('.env.local');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export async function runCommand(
  task: (context: { config: AppConfig; database: Database }) => Promise<number | void>,
  options: { requireSchema?: boolean } = {},
): Promise<void> {
  let database: Database | undefined;
  try {
    loadLocalEnv();
    const config = loadConfig();
    database = openDatabase(config.databaseUrl, config.dbBusyTimeoutMs);
    if (options.requireSchema !== false && !(await isInitialized(database.client))) {
      console.error(`Base non initialisée (${describeDatabaseUrl(config.databaseUrl)}). Lancez d'abord : npm run db:migrate`);
      process.exitCode = 1;
      return;
    }
    const code = await task({ config, database });
    process.exitCode = code ?? 0;
  } catch (error) {
    console.error(`Erreur : ${redactSecrets(error instanceof Error ? error.message : String(error))}`);
    process.exitCode = 1;
  } finally {
    database?.close();
  }
}
