// npm run collect — lance une collecte sur les sources actives.
import { setTimeout as sleep } from 'node:timers/promises';
import { createFixtureFetcher, createLiveFetcher } from '../collect/fetchers.ts';
import { selectSources } from '../sources.ts';
import { runCollect } from '../worker/collect.ts';
import { runCommand, workerId } from './shared.ts';

await runCommand(async ({ config, database }) => {
  const fixture = config.fixturePath;
  // Le fichier de fixture est servi à chaque source interrogée : sans restriction, des releases d'un dépôt
  // seraient rattachées aux produits des autres sources.
  if (fixture && config.onlySources?.length !== 1) {
    console.error(
      'Mode fixture : indiquez exactement une source avec CURATION_ONLY_SOURCES (le même fichier serait servi à toutes les sources).',
    );
    return 1;
  }
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
    // Une seule file (2026-11-10) : l'essai à 8 files a échoué sur la base en ligne (écriture d'une exécution refusée) ;
    // à reprendre après correction de la cause.
    concurrence: 1,
    // 7 min au plus (étape tuée à 10 min ; une écriture en base prend jusqu'à 10 s) : le reste passe au cycle suivant.
    dureeMaxMs: fixture ? undefined : 7 * 60_000,
    hooks: hold > 0 ? { insideStoreTransaction: () => sleep(hold) } : undefined,
  });

  for (const run of summary.runs) {
    if (run.status === 'failed') {
      console.log(`✗ ${run.sourceName} : échec (${run.errorKind}) — ${run.errorMessage} [exécution ${run.runId}]`);
    } else {
      const note =
        (run.status === 'interrupted' ? ` — ${run.errorMessage}` : '') +
        (run.possibleGap ? ' — ⚠ toutes les entrées reçues sont nouvelles : des entrées plus anciennes ont pu être manquées' : '');
      console.log(
        `✓ ${run.sourceName} : ${run.newDocuments} nouveau(x), ${run.unchangedDocuments} inchangé(s), ` +
          `${run.changedDocuments} modifié(s) avec nouvelle capture, ${run.newNewsItems} nouvelle(s) actualité(s)${note} [exécution ${run.runId}]`,
      );
    }
  }
  for (const skip of summary.skipped) {
    console.log(
      skip.reason === 'retry_scheduled'
        ? `⏸ ${skip.sourceName} : non collectée — nouvelle tentative programmée à ${skip.availableAt}${skip.lastError ? ` (dernière erreur : ${skip.lastError})` : ''}`
        : skip.reason === 'reportee'
          ? `⏭ ${skip.sourceName} : reportée au cycle suivant (durée maximale de la collecte atteinte)`
          : `⏸ ${skip.sourceName} : non collectée — job en cours dans un autre processus`,
    );
  }
  if (summary.paused) {
    console.log('Collecte en pause : aucun nouveau job réservé (reprendre avec : npm run resume).');
  } else if (summary.runs.length === 0) {
    console.log('Aucun job disponible : une autre collecte est peut-être en cours, ou une nouvelle tentative est programmée plus tard.');
  }
  // Code 1 seulement si toutes les collectes ont échoué (2026-11-10, 266 sources) : une source isolée en panne garde son
  // motif et sa reprise espacée au registre des accès, sans marquer tout le cycle en échec.
  const echecs = summary.runs.filter((run) => run.status === 'failed').length;
  if (echecs > 0) console.log(`${echecs} source(s) en échec sur ${summary.runs.length} ; détail au registre : npm run sources:registre`);
  return summary.runs.length > 0 && echecs === summary.runs.length ? 1 : 0;
});
