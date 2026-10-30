// npm run status — état de la collecte : pause, sources, volumes, jobs, dernières exécutions.
import { desc, sql } from 'drizzle-orm';
import { describeDatabaseUrl } from '../config.ts';
import { isPaused } from '../control/settings.ts';
import { documentSnapshots, jobs, runs, sources, sourceDocuments } from '../db/schema.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ config, database }) => {
  const { db, client } = database;
  const count = sql<number>`count(*)`;
  const [documents] = await db.select({ n: count }).from(sourceDocuments);
  const [snapshots] = await db.select({ n: count }).from(documentSnapshots);
  const fixtureSnapshots = await client.execute(
    "select count(*) as n from document_snapshot s join run r on r.id = s.run_id where r.mode = 'fixture'",
  );
  const jobRows = await db.select({ status: jobs.status, n: count }).from(jobs).groupBy(jobs.status);
  const sourceRows = await db.select().from(sources);
  const lastRuns = await db.select().from(runs).orderBy(desc(runs.startedAt)).limit(5);

  const fromFixture = Number(fixtureSnapshots.rows[0]?.n ?? 0);
  console.log(`Base : ${describeDatabaseUrl(config.databaseUrl)}`);
  console.log(`Pause : ${(await isPaused(db)) ? 'OUI — aucun nouveau job ne sera réservé' : 'non'}`);
  console.log(
    `Documents : ${documents?.n ?? 0} — captures : ${snapshots?.n ?? 0}` +
      (fromFixture > 0 ? ` (dont ${fromFixture} issue(s) d'une fixture, pas d'une collecte réelle)` : ''),
  );
  console.log(`Jobs : ${jobRows.map((row) => `${row.status} ${row.n}`).join(', ') || 'aucun'}`);
  console.log('Sources :');
  for (const source of sourceRows) {
    const error = source.lastError ? ` — dernière erreur : ${source.lastError}` : '';
    console.log(`  · ${source.name} [${source.status}] dernier succès : ${source.lastSuccessAt ?? 'jamais'}${error}`);
  }
  console.log('Dernières exécutions :');
  for (const run of lastRuns) {
    const error = run.errorKind ? ` — ${run.errorKind} : ${run.errorMessage}` : '';
    console.log(
      `  · ${run.startedAt} ${run.status} (${run.mode}) +${run.newDocuments} =${run.unchangedDocuments} ~${run.changedDocuments}${error}`,
    );
  }
});
