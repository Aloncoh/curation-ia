// Rattachement déterministe des documents aux produits, aux versions et aux actualités (sans IA).
// Règles (docs/decisions/0003) :
//  - un produit est identifié par la clé canonique déclarée dans la configuration de sa source ;
//  - une version est identifiée par (produit, numéro de version) ;
//  - une release stable devient une actualité « version » ; une préversion est enregistrée comme version, sans actualité ;
//  - une entrée de flux devient une actualité « annonce », sans produit tant qu'elle n'est pas qualifiée (P3) ;
//  - un document est la source principale d'au plus une actualité : une même annonce collectée deux fois,
//    ou republiée avec une nouvelle date, ne crée jamais de seconde actualité, et sa date d'origine est conservée.
import { and, eq } from 'drizzle-orm';
import { normalizeVersion } from '../collect/github-releases.ts';
import type { StoredDocument } from '../collect/store.ts';
import type { Executor } from '../db/client.ts';
import { newsItemDocuments, newsItems, newsItemTargets, products, productVersions } from '../db/schema.ts';
import type { ProductRef, SourceDefinition } from '../sources.ts';

export interface LinkCounts {
  newProducts: number;
  newVersions: number;
  newNewsItems: number;
}

async function ensureProduct(tx: Executor, product: ProductRef, now: string): Promise<{ id: number; created: boolean }> {
  const inserted = await tx
    .insert(products)
    .values({ ...product, createdAt: now })
    .onConflictDoNothing({ target: products.key })
    .returning({ id: products.id });
  if (inserted[0]) return { id: inserted[0].id, created: true };
  const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.key, product.key));
  return { id: existing!.id, created: false };
}

async function ensureVersion(
  tx: Executor,
  productId: number,
  stored: StoredDocument,
  now: string,
): Promise<{ id: number; created: boolean; isPrerelease: boolean }> {
  const version = normalizeVersion(stored.doc.version ?? stored.doc.title);
  const isPrerelease = stored.doc.metadata.prerelease === true;
  const values = { isPrerelease, releasedAt: stored.doc.announcedAt, sourceDocumentId: stored.documentId };
  const [existing] = await tx
    .select({ id: productVersions.id })
    .from(productVersions)
    .where(and(eq(productVersions.productId, productId), eq(productVersions.version, version)));
  if (existing) {
    // Une préversion peut devenir stable, ou sa date être corrigée : on met à jour.
    await tx.update(productVersions).set(values).where(eq(productVersions.id, existing.id));
    return { id: existing.id, created: false, isPrerelease };
  }
  const [created] = await tx
    .insert(productVersions)
    .values({ productId, version, createdAt: now, ...values })
    .returning({ id: productVersions.id });
  return { id: created!.id, created: true, isPrerelease };
}

async function hasNewsItem(tx: Executor, documentId: number): Promise<boolean> {
  const [link] = await tx
    .select({ id: newsItemDocuments.newsItemId })
    .from(newsItemDocuments)
    .where(and(eq(newsItemDocuments.documentId, documentId), eq(newsItemDocuments.role, 'primary')));
  return link !== undefined;
}

async function createNewsItem(
  tx: Executor,
  item: { kind: 'version' | 'annonce'; title: string; announcedAt: string | null; documentId: number; now: string; runId: string },
  target?: { productId: number; productVersionId: number },
): Promise<void> {
  const [created] = await tx
    .insert(newsItems)
    .values({
      kind: item.kind,
      title: item.title,
      announcedAt: item.announcedAt,
      firstSeenAt: item.now,
      status: 'collected',
      createdByRunId: item.runId,
    })
    .returning({ id: newsItems.id });
  await tx.insert(newsItemDocuments).values({ newsItemId: created!.id, documentId: item.documentId, role: 'primary' });
  if (target) await tx.insert(newsItemTargets).values({ newsItemId: created!.id, ...target });
}

export async function linkDocuments(
  tx: Executor,
  source: SourceDefinition,
  stored: StoredDocument[],
  now: string,
  runId: string,
): Promise<LinkCounts> {
  const counts: LinkCounts = { newProducts: 0, newVersions: 0, newNewsItems: 0 };

  if (source.kind === 'github_releases') {
    const product = await ensureProduct(tx, source.product, now);
    if (product.created) counts.newProducts++;
    for (const entry of stored) {
      const version = await ensureVersion(tx, product.id, entry, now);
      if (version.created) counts.newVersions++;
      if (version.isPrerelease || (await hasNewsItem(tx, entry.documentId))) continue;
      await createNewsItem(
        tx,
        {
          kind: 'version',
          title: `${source.product.name} ${normalizeVersion(entry.doc.version ?? entry.doc.title)}`,
          announcedAt: entry.doc.announcedAt,
          documentId: entry.documentId,
          now,
          runId,
        },
        { productId: product.id, productVersionId: version.id },
      );
      counts.newNewsItems++;
    }
    return counts;
  }

  for (const entry of stored) {
    if (await hasNewsItem(tx, entry.documentId)) continue;
    await createNewsItem(tx, {
      kind: 'annonce',
      title: entry.doc.title,
      announcedAt: entry.doc.announcedAt,
      documentId: entry.documentId,
      now,
      runId,
    });
    counts.newNewsItems++;
  }
  return counts;
}
