// npm run collect — lance une collecte sur les sources actives.
import { setTimeout as sleep } from 'node:timers/promises';
import { createFixtureFetcher, createLiveFetcher } from '../collect/fetchers.ts';
import { selectSources } from '../sources.ts';
import { runCollect } from '../worker/collect.ts';
import { runCommand, workerId } from './shared.ts';

await runCommand(async ({ config, database }) => {
  const fixture = config.fixturePath;
  if (fixture) console.log(`MODE FIXTURE : données lues dans ${fixture}, aucune requête réseau.`);
  else console.log('Collecte en mode réel.');

  const hold = config.testHoldInStoreMs;
  const summary = await runCollect({
    database,
    fetcher: fixture
      ? createFixtureFetcher(fixture, config.fixtureDelayMs)
      : createLiveFetcher({ timeoutMs: config.fetchTimeoutMs, maxBytes: config.maxResponseBytes, userAgent: config.userAgent }),
    mode: fixture ? 'fixture' : 'live',
    workerId: workerId(),
    leaseMs: config.leaseMs,
    maxAttempts: config.maxAttempts,
    retryBackoffMs: config.retryBackoffMs,
    definitions: selectSources(config.onlySources),
    hooks: hold > 0 ? { insideStoreTransaction: () => sleep(hold) } : undefined,
  });

  for (const run of summary.runs) {
    if (run.status === 'failed') {
      console.log(`✗ ${run.sourceName} : échec (${run.errorKind}) — ${run.errorMessage} [exécution ${run.runId}]`);
    } else {
      const note = run.status === 'interrupted' ? ` — ${run.errorMessage}` : '';
      console.log(
        `✓ ${run.sourceName} : ${run.newDocuments} nouveau(x), ${run.unchangedDocuments} inchangé(s), ` +
          `${run.changedDocuments} modifié(s) avec nouvelle capture, ${run.newNewsItems} nouvelle(s) actualité(s)${note} [exécution ${run.runId}]`,
      );
    }
  }
  if (summary.paused) {
    console.log('Collecte en pause : aucun nouveau job réservé (reprendre avec : npm run resume).');
  } else if (summary.runs.length === 0) {
    console.log('Aucun job disponible : une autre collecte est peut-être en cours, ou une nouvelle tentative est programmée plus tard.');
  }
  return summary.runs.some((run) => run.status === 'failed') ? 1 : 0;
});
