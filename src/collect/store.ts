// Enregistrement idempotent des documents collectés : nouveau, inchangé, ou modifié (nouvelle capture).
// À appeler dans une transaction : tout est enregistré, ou rien.
import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import type { Executor } from '../db/client.ts';
import { documentSnapshots, runs, sourceDocuments } from '../db/schema.ts';
import type { CollectedDocument } from './github-releases.ts';

export interface StoreCounts {
  newDocuments: number;
  unchangedDocuments: number;
  changedDocuments: number;
}

export interface StoredDocument {
  documentId: number;
  outcome: 'new' | 'unchanged' | 'changed';
  doc: CollectedDocument;
}

export async function storeDocuments(
  tx: Executor,
  sourceId: string,
  documents: CollectedDocument[],
  collectedAt: string,
  runId: string,
): Promise<{ counts: StoreCounts; stored: StoredDocument[] }> {
  const counts: StoreCounts = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0 };
  const stored: StoredDocument[] = [];
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
      stored.push({ documentId, outcome: 'new', doc });
    } else {
      documentId = existing.id;
      await tx.update(sourceDocuments).set(descriptive).where(eq(sourceDocuments.id, documentId));
      const [latest] = await tx
        .select({ seq: documentSnapshots.seq, contentHash: documentSnapshots.contentHash })
        .from(documentSnapshots)
        .where(eq(documentSnapshots.documentId, documentId))
        .orderBy(desc(documentSnapshots.seq))
        .limit(1);
      let unchanged = latest !== undefined && latest.contentHash === doc.contentHash;
      if (latest && !unchanged) {
        // La dernière capture peut être la page de l'article, lue par `approfondir` : son empreinte diffère toujours de
        // celle de la source. On compare alors à la dernière capture venue de la source elle-même. Sans cela, chaque
        // collecte voyait « modifié », réenregistrait l'accroche, et la page était relue à chaque passage (2026-11-20,
        // docs/lectures-turso.md, section 5).
        const [fromSource] = await tx
          .select({ contentHash: documentSnapshots.contentHash })
          .from(documentSnapshots)
          .leftJoin(runs, eq(runs.id, documentSnapshots.runId))
          .where(and(eq(documentSnapshots.documentId, documentId), or(isNull(runs.kind), ne(runs.kind, 'approfondir'))))
          .orderBy(desc(documentSnapshots.seq))
          .limit(1);
        unchanged = fromSource !== undefined && fromSource.contentHash === doc.contentHash;
      }
      if (unchanged) {
        counts.unchangedDocuments++;
        stored.push({ documentId, outcome: 'unchanged', doc });
        continue;
      }
      // Contenu modifié : nouvelle capture, l'ancienne est conservée.
      nextSeq = (latest?.seq ?? 0) + 1;
      counts.changedDocuments++;
      stored.push({ documentId, outcome: 'changed', doc });
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
  return { counts, stored };
}
