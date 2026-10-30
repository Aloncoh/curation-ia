// Orchestration d'une collecte : jobs → récupération → validation → enregistrement → traces.
// Code entièrement déterministe : aucun modèle d'IA n'intervient ici.
// Chaque changement d'état (début, fin réussie, échec) est écrit dans une seule transaction :
// un arrêt brutal entre deux étapes ne laisse jamais de trace incohérente.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
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
  runId: string;
  sourceId: string;
  sourceName: string;
  status: 'succeeded' | 'failed' | 'interrupted';
  errorKind: string | null;
  errorMessage: string | null;
}

export interface CollectSummary {
  paused: boolean;
  enqueued: number;
  runs: RunSummary[];
}

const EMPTY_COUNTS: StoreCounts = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0 };
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
  if (await isPaused(database.db)) return { paused: true, enqueued: 0, runs: [] };

  const enqueued = await enqueueCollectJobs(database.client, definitions.map((def) => def.id), now(), options.maxAttempts);
  const summaries: RunSummary[] = [];

  for (;;) {
    await recoverExpiredLeases(database.client, now());
    // La réservation échoue d'elle-même si la pause est active (condition dans la même instruction SQL).
    const job = await claimNextJob(database.client, workerId, now(), options.leaseMs);
    if (!job) break;
    summaries.push(await processJob(options, job, findDefinition(job.sourceId, definitions), now));
  }
  return { paused: await isPaused(database.db), enqueued, runs: summaries };
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
    const url = releasesUrl(definition.config);

    const fetched = await options.fetcher(url, GITHUB_API_HEADERS, definition.allowedHosts);
    await recordStep('succeeded', { url, httpStatus: fetched.status, bytes: fetched.bytes, mode: options.mode });

    stepName = 'parse';
    const documents = parseReleases(fetched.body);
    await recordStep('succeeded', { documents: documents.length });

    // Fin réussie : documents, étape, job, exécution et source dans une seule transaction.
    stepName = 'store';
    const storeSeq = ++seq;
    const storeStart = stepStart;
    const outcome = await withBusyRetry(client, () =>
      db.transaction(async (tx) => {
        const collectedAt = now();
        const counts = await storeDocuments(tx, job.sourceId, documents, collectedAt, runId);
        if (options.hooks?.insideStoreTransaction) await options.hooks.insideStoreTransaction();
        const finishedAt = now();
        await insertStep(tx, { runId, seq: storeSeq, name: 'store', status: 'succeeded', startedAt: storeStart, finishedAt, detail: { ...counts } });
        const kept = await completeJob(tx, job.id, workerId, finishedAt);
        await finishRun(tx, runId, {
          status: kept ? 'succeeded' : 'interrupted',
          finishedAt,
          ...counts,
          errorKind: kept ? null : 'lease_lost',
          errorMessage: kept ? null : LEASE_LOST_MESSAGE,
        });
        if (kept) await tx.update(sources).set({ status: 'ok', lastSuccessAt: finishedAt }).where(eq(sources.id, job.sourceId));
        return { counts, kept };
      }),
    );
    return {
      runId,
      sourceId: job.sourceId,
      sourceName,
      status: outcome.kept ? 'succeeded' : 'interrupted',
      ...outcome.counts,
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
