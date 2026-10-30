// Enregistrement idempotent des documents collectés : nouveau, inchangé, ou modifié (nouvelle capture).
// À appeler dans une transaction : tout est enregistré, ou rien.
import { and, desc, eq } from 'drizzle-orm';
import type { Executor } from '../db/client.ts';
import { documentSnapshots, sourceDocuments } from '../db/schema.ts';
import type { CollectedDocument } from './github-releases.ts';

export interface StoreCounts {
  newDocuments: number;
  unchangedDocuments: number;
  changedDocuments: number;
}

export async function storeDocuments(
  tx: Executor,
  sourceId: string,
  documents: CollectedDocument[],
  collectedAt: string,
  runId: string,
): Promise<StoreCounts> {
  const counts: StoreCounts = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0 };
  for (const doc of documents) {
    // Champs descriptifs : toujours remis à jour, même si le contenu (et donc la capture) ne change pas.
    const descriptive = {
      url: doc.url,
      normalizedUrl: doc.normalizedUrl,
      title: doc.title,
      version: doc.version,
      announcedAt: doc.announcedAt,
      metadata: doc.metadata,
      lastSeenAt: collectedAt,
    };
    const [existing] = await tx
      .select({ id: sourceDocuments.id })
      .from(sourceDocuments)
      .where(and(eq(sourceDocuments.sourceId, sourceId), eq(sourceDocuments.externalId, doc.externalId)));

    let documentId: number;
    let nextSeq = 1;
    if (!existing) {
      const [created] = await tx
        .insert(sourceDocuments)
        .values({ sourceId, externalId: doc.externalId, firstCollectedAt: collectedAt, ...descriptive })
        .returning({ id: sourceDocuments.id });
      documentId = created!.id;
      counts.newDocuments++;
    } else {
      documentId = existing.id;
      await tx.update(sourceDocuments).set(descriptive).where(eq(sourceDocuments.id, documentId));
      const [latest] = await tx
        .select({ seq: documentSnapshots.seq, contentHash: documentSnapshots.contentHash })
        .from(documentSnapshots)
        .where(eq(documentSnapshots.documentId, documentId))
        .orderBy(desc(documentSnapshots.seq))
        .limit(1);
      if (latest && latest.contentHash === doc.contentHash) {
        counts.unchangedDocuments++;
        continue;
      }
      // Contenu modifié : nouvelle capture, l'ancienne est conservée.
      nextSeq = (latest?.seq ?? 0) + 1;
      counts.changedDocuments++;
    }

    await tx.insert(documentSnapshots).values({
      documentId,
      seq: nextSeq,
      contentHash: doc.contentHash,
      title: doc.title,
      content: doc.content,
      contentFormat: doc.contentFormat,
      capturedAt: collectedAt,
      runId,
    });
  }
  return counts;
}
