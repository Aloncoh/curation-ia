// Orchestration d'une collecte : jobs → récupération → validation → enregistrement → traces.
// Code entièrement déterministe : aucun modèle d'IA n'intervient ici.
// Chaque changement d'état (début, fin réussie, échec) est écrit dans une seule transaction :
// un arrêt brutal entre deux étapes ne laisse jamais de trace incohérente.
import { HACKERNEWS_HEADERS, parseHackerNews } from '../collect/hackernews.ts';
import { classerEchec, lireRetryAfter, prochainEssai } from '../collect/acces.ts';
import { HUGGINGFACE_HEADERS, parseModelesTendance } from '../collect/huggingface.ts';
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
  /** Nombre de files de travail en parallèle (1 par défaut). */
  concurrence?: number;
  /**
   * Durée au-delà de laquelle aucun nouveau job n'est pris (2026-11-10) : l'étape de collecte est tuée à 10 min et un
   * cycle s'arrête à la première étape en échec. Les sources non atteintes restent en file pour le cycle suivant.
   */
  dureeMaxMs?: number;
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
  /** reportee : job jamais tenté, laissé au cycle suivant par la durée maximale de la collecte. */
  reason: 'retry_scheduled' | 'leased_elsewhere' | 'reportee';
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
export function adapterFor(definition: SourceDefinition): { url: string; headers: Record<string, string>; parse: (body: string) => ParsedFeed } {
  if (definition.kind === 'github_releases') {
    const parse = (body: string) => ({ documents: parseReleases(body, definition.config), rejected: {} });
    return { url: releasesUrl(definition.config), headers: GITHUB_API_HEADERS, parse };
  }
  if (definition.kind === 'hackernews') {
    return { url: definition.config.url, headers: HACKERNEWS_HEADERS, parse: (body) => parseHackerNews(body, definition.config) };
  }
  if (definition.kind === 'huggingface_models') {
    return { url: definition.config.url, headers: HUGGINGFACE_HEADERS, parse: (body) => parseModelesTendance(body, definition.config) };
  }
  return { url: definition.config.url, headers: definition.userAgent ? { ...FEED_HEADERS, 'user-agent': definition.userAgent } : FEED_HEADERS, parse: (body) => parseFeedItems(body, definition.config) };
}
const LEASE_LOST_MESSAGE =
  "Bail perdu avant la fin : le job a été repris par un autre worker ou clos par la récupération (documents enregistrés de façon idempotente)";

function classifyError(error: unknown): { kind: string; message: string; status?: number | undefined; retryAfter?: string | undefined } {
  if (error instanceof SafeFetchError) return { kind: error.kind, message: error.message, status: error.status, retryAfter: error.retryAfter };
  if (error instanceof SourceFormatError) return { kind: error.kind, message: error.message };
  return { kind: 'internal', message: error instanceof Error ? error.message : String(error) };
}

export async function runCollect(options: CollectOptions): Promise<CollectSummary> {
  const { database, workerId } = options;
  const clock = options.clock ?? (() => new Date());
  const now = () => clock().toISOString();
  const toutes = options.definitions ?? SOURCES;
  // Une source différée reste synchronisée au registre (état, motif) mais n'est jamais mise en file.
  const definitions = toutes.filter((def) => !def.differee);

  await syncSources(database, toutes, now());
  if (await isPaused(database.db)) return { paused: true, enqueued: 0, runs: [], skipped: [] };

  const enqueued = await enqueueCollectJobs(database.client, definitions.map((def) => def.id), now(), options.maxAttempts);
  const summaries: RunSummary[] = [];

  // Plusieurs files de travail en parallèle (2026-11-10) : la collecte séquentielle de ~170 sources dépassait les 10 min
  // de l'étape (cycles en échec les 8 et 9 novembre), surtout à cause des allers-retours vers la base distante. Chaque
  // file a son identifiant de worker et réserve ses jobs par bail : un job n'est jamais traité deux fois.
  const files = Math.max(1, options.concurrence ?? 1);
  const echeance = options.dureeMaxMs === undefined ? null : Date.parse(now()) + options.dureeMaxMs;
  await Promise.all(Array.from({ length: files }, async (_, i) => {
    const id = files === 1 ? workerId : `${workerId}-${i + 1}`;
    for (;;) {
      if (echeance !== null && Date.parse(now()) >= echeance) break;
      await recoverExpiredLeases(database.client, now());
      // La réservation échoue d'elle-même si la pause est active (condition dans la même instruction SQL).
      const job = await claimNextJob(database.client, id, now(), options.leaseMs, definitions.map((def) => def.id));
      if (!job) break;
      summaries.push(await processJob({ ...options, workerId: id }, job, findDefinition(job.sourceId, definitions), now));
    }
  }));
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
      reason: job.status === 'leased' ? 'leased_elsewhere' : job.last_error === null ? 'reportee' : 'retry_scheduled',
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
        if (kept) await tx.update(sources).set({ status: 'ok', lastSuccessAt: finishedAt, accesEtat: 'ok', accesDetail: null, echecsConsecutifs: 0, reessaiApres: null }).where(eq(sources.id, job.sourceId));
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
    const { kind, message, status, retryAfter } = classifyError(error);
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
          // Registre d'accès : état observé, échecs consécutifs et date de reprise espacée (Retry-After respecté).
          const [avant] = await tx.select({ echecs: sources.echecsConsecutifs }).from(sources).where(eq(sources.id, job.sourceId));
          const echecs = (avant?.echecs ?? 0) + 1;
          const etat = classerEchec({ kind, status });
          const t = Date.parse(finishedAt);
          await tx.update(sources).set({
            status: 'error', lastErrorAt: finishedAt, lastError: message,
            accesEtat: etat, accesDetail: message, echecsConsecutifs: echecs, reessaiApres: prochainEssai(etat, echecs, t, lireRetryAfter(retryAfter, t)),
          }).where(eq(sources.id, job.sourceId));
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
