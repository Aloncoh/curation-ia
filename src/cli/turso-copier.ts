// npm run turso:copier : prépare la base en ligne (P5) à partir de la base locale.
// - Cible : DATABASE_URL (libsql://…turso.io) et DATABASE_AUTH_TOKEN, saisis par l'utilisateur dans son environnement.
// - Source : CURATION_SOURCE_DB (par défaut file:data/curation.db).
// Sans --confirmer, affiche seulement ce qui serait copié. Avec --confirmer : migrations sur la cible, puis copie de
// toutes les tables (refusée si la cible contient déjà des publications). Jamais lancée par Claude sur Turso.
import { describeDatabaseUrl } from '../config.ts';
import { openDatabase } from '../db/client.ts';
import { copierBase, tablesACopier } from '../db/copie.ts';
import { runMigrations } from '../db/migrate.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ config, database }) => {
  const sourceUrl = process.env.CURATION_SOURCE_DB?.trim() || 'file:data/curation.db';
  if (sourceUrl === config.databaseUrl) { console.error('Refus : la cible (DATABASE_URL) est la base source. Indiquer la base Turso dans DATABASE_URL.'); return 1; }
  const source = openDatabase(sourceUrl, config.dbBusyTimeoutMs);
  try {
    console.log(`Source : ${describeDatabaseUrl(sourceUrl)} → cible : ${describeDatabaseUrl(config.databaseUrl)}`);
    if (!process.argv.includes('--confirmer')) {
      for (const t of await tablesACopier(source.client)) {
        const n = await source.client.execute(`select count(*) as n from ${JSON.stringify(t)}`);
        console.log(`  · ${t} : ${Number(n.rows[0]!.n)} ligne(s)`);
      }
      console.log('Aperçu seulement. Ajouter --confirmer pour migrer la cible puis copier.');
      return 0;
    }
    await runMigrations(database);
    const bilan = await copierBase(source.client, database.client);
    for (const b of bilan) console.log(`  · ${b.table} : ${b.lignes} ligne(s) copiée(s)`);
    return 0;
  } finally {
    source.close();
  }
}, { requireSchema: false });
