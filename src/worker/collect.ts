// Orchestration d'une collecte : jobs → récupération → validation → enregistrement → traces.
// Code entièrement déterministe : aucun modèle d'IA n'intervient ici.
// Chaque changement d'état (début, fin réussie, échec) est écrit dans une seule transaction :
// un arrêt brutal entre deux étapes ne laisse jamais de trace incohérente.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { linkDocuments } from '../catalog/link.ts';
import { FEED_HEADERS, parseFeedItems, type ParsedFeed } from '../collect/feeds.ts';
import { GITHUB_API_HEADERS, parseReleases, releasesUrl, SourceFormatError } from '../collect/github-releases.ts';
import type { SourceFetcher } from '../collect/fetchers.ts';
import { SafeFetchError } from '../collect/safe-fetch.ts';
import { storeDocuments, type StoreCounts } from '../collect/store.ts';
import { isPaused } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { sources } from '../db/schema.ts';
import { attachRun, claimNextJob, completeJob, enqueueCollectJobs, failJob, recoverExpiredLeases, type ClaimedJob } from '../jobs/queue.ts';
import { finishRun, insertRun, insertStep, interruptRunningRuns } from '../jobs/runs.ts';
import { findDefinition, SOURCES, syncSources, type SourceDefinition } from '../sources.ts';

export interface CollectOptions {
  database: Database;
  fetcher: SourceFetcher;
  mode: 'live' | 'fixture';
  workerId: string;
  leaseMs: number;
  maxAttempts: number;
  retryBackoffMs: number;
  definitions?: SourceDefinition[];
  clock?: () => Date;
  /** Points d'arrêt pour les tests d'arrêt brutal (jamais utilisés en mode réel). */
  hooks?: { insideStoreTransaction?: () => Promise<void> };
}

export interface RunSummary extends StoreCounts {
  newNewsItems: number;
  /** Toutes les entrées reçues étaient nouvelles alors que la source avait déjà été collectée : des entrées ont pu être manquées. */
  possibleGap: boolean;
  runId: string;
  sourceId: string;
  sourceName: string;
  status: 'succeeded' | 'failed' | 'interrupted';
  errorKind: string | null;
  errorMessage: string | null;
}

/** Source sans exécution pendant cette collecte : nouvelle tentative programmée plus tard, ou job tenu par un autre worker. */
export interface SkippedSource {
  sourceId: string;
  sourceName: string;
  reason: 'retry_scheduled' | 'leased_elsewhere';
  availableAt: string | null;
  lastError: string | null;
}

export interface CollectSummary {
  paused: boolean;
  enqueued: number;
  runs: RunSummary[];
  skipped: SkippedSource[];
}

const EMPTY_COUNTS = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0, newNewsItems: 0, possibleGap: false };

/** Ce qui change d'un type de source à l'autre : l'adresse interrogée, les en-têtes et la lecture de la réponse. */
function adapterFor(definition: SourceDefinition): { url: string; headers: Record<string, string>; parse: (body: string) => ParsedFeed } {
  if (definition.kind === 'github_releases') {
    const parse = (body: string) => ({ documents: parseReleases(body, definition.config), rejected: {} });
    return { url: releasesUrl(definition.config), headers: GITHUB_API_HEADERS, parse };
  }
  return { url: definition.config.url, headers: FEED_HEADERS, parse: (body) => parseFeedItems(body, definition.config) };
}
const LEASE_LOST_MESSAGE =
  "Bail perdu avant la fin : le job a été repris par un autre worker ou clos par la récupération (documents enregistrés de façon idempotente)";

function classifyError(error: unknown): { kind: string; message: string } {
  if (error instanceof SafeFetchError) return { kind: error.kind, message: error.message };
  if (error instanceof SourceFormatError) return { kind: error.kind, message: error.message };
  return { kind: 'internal', message: error instanceof Error ? error.message : String(error) };
}

export async function runCollect(options: CollectOptions): Promise<CollectSummary> {
  const { database, workerId } = options;
  const clock = options.clock ?? (() => new Date());
  const now = () => clock().toISOString();
  const definitions = options.definitions ?? SOURCES;

  await syncSources(database, definitions, now());
  if (await isPaused(database.db)) return { paused: true, enqueued: 0, runs: [], skipped: [] };

  const enqueued = await enqueueCollectJobs(database.client, definitions.map((def) => def.id), now(), options.maxAttempts);
  const summaries: RunSummary[] = [];

  for (;;) {
    await recoverExpiredLeases(database.client, now());
    // La réservation échoue d'elle-même si la pause est active (condition dans la même instruction SQL).
    const job = await claimNextJob(database.client, workerId, now(), options.leaseMs, definitions.map((def) => def.id));
    if (!job) break;
    summaries.push(await processJob(options, job, findDefinition(job.sourceId, definitions), now));
  }
  const paused = await isPaused(database.db);
  const skipped = paused ? [] : await skippedSources(database, definitions, summaries);
  return { paused, enqueued, runs: summaries, skipped };
}

/** Sources demandées qui n'ont pas eu d'exécution : jamais passées sous silence (ex. seconde collecte juste après un échec). */
async function skippedSources(database: Database, definitions: SourceDefinition[], runs: RunSummary[]): Promise<SkippedSource[]> {
  const done = new Set(runs.map((run) => run.sourceId));
  const skipped: SkippedSource[] = [];
  for (const def of definitions.filter((candidate) => !done.has(candidate.id))) {
    const result = await database.client.execute({
      sql: "select status, available_at, last_error from job where kind = 'collect' and source_id = ? and status in ('pending', 'leased') order by id desc limit 1",
      args: [def.id],
    });
    const job = result.rows[0];
    if (!job) continue;
    skipped.push({
      sourceId: def.id,
      sourceName: def.name,
      reason: job.status === 'leased' ? 'leased_elsewhere' : 'retry_scheduled',
      availableAt: job.status === 'pending' ? String(job.available_at) : null,
      lastError: job.last_error === null ? null : String(job.last_error),
    });
  }
  return skipped;
}

async function processJob(
  options: CollectOptions,
  job: ClaimedJob,
  definition: SourceDefinition | undefined,
  now: () => string,
): Promise<RunSummary> {
  const { client, db } = options.database;
  const { workerId } = options;
  const runId = randomUUID();
  const sourceName = definition?.name ?? job.sourceId;

  // Début : exécutions précédentes de ce job interrompues, nouvelle exécution créée et rattachée, d'un seul bloc.
  const startedAt = now();
  await withBusyRetry(client, () =>
    db.transaction(async (tx) => {
      await interruptRunningRuns(tx, job.id, startedAt);
      await insertRun(tx, { id: runId, kind: 'collect', jobId: job.id, sourceId: job.sourceId, mode: options.mode, workerId, startedAt });
      await attachRun(tx, job.id, workerId, runId);
    }),
  );

  let seq = 0;
  let stepName = 'fetch';
  let stepStart = now();
  const recordStep = async (status: 'succeeded' | 'failed', detail: Record<string, unknown>) => {
    const finishedAt = now();
    const step = { runId, seq: ++seq, name: stepName, status, startedAt: stepStart, finishedAt, detail };
    await withBusyRetry(client, () => insertStep(db, step));
    stepStart = finishedAt;
  };

  try {
    if (!definition) throw new Error(`Source inconnue dans la configuration : ${job.sourceId}`);
    const adapter = adapterFor(definition);

    const fetched = await options.fetcher(adapter.url, adapter.headers, definition.allowedHosts, { maxBytes: definition.maxResponseBytes });
    await recordStep('succeeded', { url: adapter.url, httpStatus: fetched.status, bytes: fetched.bytes, mode: options.mode });

    stepName = 'parse';
    const { documents, rejected } = adapter.parse(fetched.body);
    await recordStep('succeeded', { documents: documents.length, rejected });

    // Fin réussie : documents, produits, versions, actualités, étape, job, exécution et source dans une seule transaction.
    stepName = 'store';
    const storeSeq = ++seq;
    const storeStart = stepStart;
    const outcome = await withBusyRetry(client, () =>
      db.transaction(async (tx) => {
        const collectedAt = now();
        const [previous] = await tx.select({ lastSuccessAt: sources.lastSuccessAt }).from(sources).where(eq(sources.id, job.sourceId));
        const { counts, stored } = await storeDocuments(tx, job.sourceId, documents, collectedAt, runId);
        // Fenêtre de la source dépassée depuis la dernière collecte réussie : signalé, jamais masqué.
        const possibleGap = Boolean(previous?.lastSuccessAt) && documents.length > 0 && counts.newDocuments === documents.length;
        const links = await linkDocuments(tx, definition, stored, collectedAt, runId);
        if (options.hooks?.insideStoreTransaction) await options.hooks.insideStoreTransaction();
        const finishedAt = now();
        await insertStep(tx, {
          runId,
          seq: storeSeq,
          name: 'store',
          status: 'succeeded',
          startedAt: storeStart,
          finishedAt,
          detail: { ...counts, ...links, possibleGap },
        });
        const kept = await completeJob(tx, job.id, workerId, finishedAt);
        await finishRun(tx, runId, {
          status: kept ? 'succeeded' : 'interrupted',
          finishedAt,
          ...counts,
          newNewsItems: links.newNewsItems,
          errorKind: kept ? null : 'lease_lost',
          errorMessage: kept ? null : LEASE_LOST_MESSAGE,
        });
        if (kept) await tx.update(sources).set({ status: 'ok', lastSuccessAt: finishedAt }).where(eq(sources.id, job.sourceId));
        return { counts, links, kept, possibleGap };
      }),
    );
    return {
      runId,
      sourceId: job.sourceId,
      sourceName,
      status: outcome.kept ? 'succeeded' : 'interrupted',
      ...outcome.counts,
      newNewsItems: outcome.links.newNewsItems,
      possibleGap: outcome.possibleGap,
      errorKind: outcome.kept ? null : 'lease_lost',
      errorMessage: outcome.kept ? null : LEASE_LOST_MESSAGE,
    };
  } catch (error) {
    const { kind, message } = classifyError(error);
    const failSeq = ++seq;
    const failStart = stepStart;
    // Échec : étape, job, exécution et source dans une seule transaction ; la source n'est pas touchée si le bail est perdu.
    const outcome = await withBusyRetry(client, () =>
      db.transaction(async (tx) => {
        const finishedAt = now();
        await insertStep(tx, { runId, seq: failSeq, name: stepName, status: 'failed', startedAt: failStart, finishedAt, detail: { errorKind: kind, error: message } });
        const result = await failJob(tx, job, workerId, message, finishedAt, options.retryBackoffMs);
        if (result === 'lease_lost') {
          await finishRun(tx, runId, { status: 'interrupted', finishedAt, errorKind: kind, errorMessage: `${message} — ${LEASE_LOST_MESSAGE}` });
        } else {
          await finishRun(tx, runId, { status: 'failed', finishedAt, errorKind: kind, errorMessage: message });
          await tx.update(sources).set({ status: 'error', lastErrorAt: finishedAt, lastError: message }).where(eq(sources.id, job.sourceId));
        }
        return result;
      }),
    );
    return {
      runId,
      sourceId: job.sourceId,
      sourceName,
      status: outcome === 'lease_lost' ? 'interrupted' : 'failed',
      ...EMPTY_COUNTS,
      errorKind: kind,
      errorMessage: message,
    };
  }
}
