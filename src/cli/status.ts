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
  const catalog = await client.execute(
    `select (select count(*) from product) as products, (select count(*) from product_version) as versions,
            (select count(*) from product_version where is_prerelease = 1) as prereleases,
            (select count(*) from news_item where kind = 'version') as version_items,
            (select count(*) from news_item where kind = 'annonce') as announcement_items,
            (select count(*) from news_item n join run r on r.id = n.created_by_run_id where r.mode = 'fixture') as fixture_items`,
  );
  const jobRows = await db.select({ status: jobs.status, n: count }).from(jobs).groupBy(jobs.status);
  const sourceRows = await db.select().from(sources);
  const lastRuns = await db.select().from(runs).orderBy(desc(runs.startedAt)).limit(10);

  const fromFixture = Number(fixtureSnapshots.rows[0]?.n ?? 0);
  console.log(`Base : ${describeDatabaseUrl(config.databaseUrl)}`);
  console.log(`Pause : ${(await isPaused(db)) ? 'OUI — aucun nouveau job ne sera réservé' : 'non'}`);
  console.log(
    `Documents : ${documents?.n ?? 0} — captures : ${snapshots?.n ?? 0}` +
      (fromFixture > 0 ? ` (dont ${fromFixture} issue(s) d'une fixture, pas d'une collecte réelle)` : ''),
  );
  const c = catalog.rows[0];
  console.log(
    `Produits : ${c?.products ?? 0} — versions : ${c?.versions ?? 0} (dont ${c?.prereleases ?? 0} préversion(s)) — ` +
      `actualités : ${c?.version_items ?? 0} version(s), ${c?.announcement_items ?? 0} annonce(s)` +
      (Number(c?.fixture_items ?? 0) > 0 ? ` (dont ${c?.fixture_items} créée(s) par une collecte fixture)` : ''),
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
      `  · ${run.startedAt} ${run.sourceId ?? '?'} ${run.status} (${run.mode}) +${run.newDocuments} =${run.unchangedDocuments} ~${run.changedDocuments} actualités +${run.newNewsItems}${error}`,
    );
  }
});
