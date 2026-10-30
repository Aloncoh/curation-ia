// Export JSON lisible : sources, documents avec leurs captures (et le mode, réel ou fixture, de chaque capture),
// dernières exécutions. Lu dans une seule transaction pour donner un état cohérent.
import { asc, desc } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { documentSnapshots, runs, sources, sourceDocuments } from '../db/schema.ts';

export async function buildExport(db: Db, generatedAt: string) {
  const data = await db.transaction(async (tx) => ({
    allSources: await tx.select().from(sources).orderBy(asc(sources.id)),
    documents: await tx.select().from(sourceDocuments).orderBy(desc(sourceDocuments.announcedAt), asc(sourceDocuments.id)),
    snapshots: await tx.select().from(documentSnapshots).orderBy(asc(documentSnapshots.documentId), asc(documentSnapshots.seq)),
    allRuns: await tx.select({ id: runs.id, mode: runs.mode }).from(runs),
    recentRuns: await tx.select().from(runs).orderBy(desc(runs.startedAt)).limit(10),
  }));
  const modeOfRun = new Map(data.allRuns.map((run) => [run.id, run.mode]));
  const modeOf = (runId: string | null) => (runId ? (modeOfRun.get(runId) ?? 'inconnu') : 'inconnu');

  return {
    generated_at: generatedAt,
    note: "Documents bruts collectés depuis des sources officielles. Ce ne sont pas encore des fiches ni des analyses. Une capture en mode « fixture » provient d'un fichier de test, pas d'une collecte réelle.",
    sources: data.allSources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      status: source.status,
      last_success_at: source.lastSuccessAt,
      last_error: source.lastError,
    })),
    documents: data.documents.map((doc) => {
      const docSnapshots = data.snapshots.filter((snapshot) => snapshot.documentId === doc.id);
      return {
        source_id: doc.sourceId,
        external_id: doc.externalId,
        title: doc.title,
        version: doc.version,
        url: doc.url,
        normalized_url: doc.normalizedUrl,
        announced_at: doc.announcedAt,
        first_collected_at: doc.firstCollectedAt,
        last_seen_at: doc.lastSeenAt,
        first_capture_mode: modeOf(docSnapshots[0]?.runId ?? null),
        snapshots: docSnapshots.map((snapshot) => ({
          seq: snapshot.seq,
          captured_at: snapshot.capturedAt,
          collected_in_mode: modeOf(snapshot.runId),
          content_hash: snapshot.contentHash,
          content_length: snapshot.content.length,
          content: snapshot.content,
          run_id: snapshot.runId,
        })),
      };
    }),
    recent_runs: data.recentRuns.map((run) => ({
      id: run.id,
      mode: run.mode,
      status: run.status,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      new_documents: run.newDocuments,
      unchanged_documents: run.unchangedDocuments,
      changed_documents: run.changedDocuments,
      error_kind: run.errorKind,
      error_message: run.errorMessage,
    })),
  };
}
