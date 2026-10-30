// Rattachement déterministe des documents aux produits, aux versions et aux actualités (sans IA).
// Règles (docs/decisions/0003-identite-produits-versions-actualites.md) :
//  - un produit est identifié par la clé canonique déclarée dans la configuration de sa source ; ses champs
//    descriptifs (nom, éditeur…) suivent la configuration ;
//  - une version est identifiée par (produit, numéro de version) et décrite par son document d'origine : un autre
//    document au même numéro ne l'écrase pas, sauf pour faire passer une préversion en version stable ; si le tag
//    d'une release est corrigé, sa version change de numéro (et le titre de son actualité suit) ;
//  - une release stable donne au plus une actualité « version » par version : un autre document de la même version
//    (release recréée avec un nouvel identifiant) devient une source secondaire de cette actualité ;
//  - une préversion est enregistrée comme version, sans actualité ;
//  - une entrée de flux devient une actualité « annonce », sans produit tant qu'elle n'est pas qualifiée (P3) ;
//  - un document est la source principale d'au plus une actualité : une même annonce collectée deux fois, ou
//    republiée avec une nouvelle date, ne crée jamais de seconde actualité ; une date connue n'est jamais remplacée ;
//  - rattrapage : les documents de la source encore sans rattachement (par exemple collectés avant la migration 0001
//    et sortis depuis de la réponse de la source) sont repris à chaque collecte, à partir des colonnes stockées.
import { and, eq, inArray, notExists, notInArray, sql } from 'drizzle-orm';
import { normalizeVersion } from '../collect/github-releases.ts';
import type { StoredDocument } from '../collect/store.ts';
import type { Executor } from '../db/client.ts';
import { newsItemDocuments, newsItems, newsItemTargets, products, productVersions, sourceDocuments } from '../db/schema.ts';
import type { GithubReleasesSource, ProductRef, SourceDefinition } from '../sources.ts';

export interface LinkCounts {
  newProducts: number;
  newVersions: number;
  newNewsItems: number;
  /** Documents déjà en base, absents de la réponse courante, rattachés par rattrapage. */
  caughtUpDocuments: number;
}

/** Ce que le rattachement lit d'un document : identique qu'il vienne de la réponse courante ou de la base. */
interface LinkableDocument {
  documentId: number;
  title: string;
  version: string | null;
  announcedAt: string | null;
  prerelease: boolean;
}

const fromStored = (entry: StoredDocument): LinkableDocument => ({
  documentId: entry.documentId,
  title: entry.doc.title,
  version: entry.doc.version,
  announcedAt: entry.doc.announcedAt,
  prerelease: entry.doc.metadata.prerelease === true,
});

async function ensureProduct(tx: Executor, product: ProductRef, now: string): Promise<{ id: number; created: boolean }> {
  const descriptive = { name: product.name, publisher: product.publisher, category: product.category, repositoryUrl: product.repositoryUrl };
  const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.key, product.key));
  if (existing) {
    await tx.update(products).set(descriptive).where(eq(products.id, existing.id));
    return { id: existing.id, created: false };
  }
  const [created] = await tx
    .insert(products)
    .values({ key: product.key, ...descriptive, createdAt: now })
    .returning({ id: products.id });
  return { id: created!.id, created: true };
}

async function ensureVersion(
  tx: Executor,
  productId: number,
  doc: LinkableDocument,
  now: string,
): Promise<{ id: number; created: boolean; renamed: boolean; owned: boolean; isPrerelease: boolean }> {
  const version = normalizeVersion(doc.version ?? doc.title);
  const values = { isPrerelease: doc.prerelease, releasedAt: doc.announcedAt, sourceDocumentId: doc.documentId };
  const [existing] = await tx
    .select({ id: productVersions.id, isPrerelease: productVersions.isPrerelease, sourceDocumentId: productVersions.sourceDocumentId })
    .from(productVersions)
    .where(and(eq(productVersions.productId, productId), eq(productVersions.version, version)));
  if (!existing) {
    // Tag corrigé sur la même release (même document) : la version change de numéro au lieu d'en créer une seconde.
    const [owned] = await tx
      .select({ id: productVersions.id })
      .from(productVersions)
      .where(and(eq(productVersions.productId, productId), eq(productVersions.sourceDocumentId, doc.documentId)));
    if (owned) {
      await tx.update(productVersions).set({ version, ...values }).where(eq(productVersions.id, owned.id));
      return { id: owned.id, created: false, renamed: true, owned: true, isPrerelease: doc.prerelease };
    }
    const [created] = await tx
      .insert(productVersions)
      .values({ productId, version, createdAt: now, ...values })
      .returning({ id: productVersions.id });
    return { id: created!.id, created: true, renamed: false, owned: true, isPrerelease: doc.prerelease };
  }
  // Son propre document peut la mettre à jour (préversion devenue stable, date corrigée) ; un autre document seulement
  // pour la faire passer en version stable.
  const ownDocument = existing.sourceDocumentId === null || existing.sourceDocumentId === doc.documentId;
  if (ownDocument || (existing.isPrerelease && !doc.prerelease)) {
    await tx.update(productVersions).set(values).where(eq(productVersions.id, existing.id));
    return { id: existing.id, created: false, renamed: false, owned: true, isPrerelease: doc.prerelease };
  }
  return { id: existing.id, created: false, renamed: false, owned: false, isPrerelease: existing.isPrerelease };
}

/** Actualité dont le document est la source principale ; une date inconnue est complétée, une date connue jamais remplacée. */
async function primaryNewsItem(tx: Executor, doc: LinkableDocument): Promise<number | null> {
  const [link] = await tx
    .select({ id: newsItems.id, announcedAt: newsItems.announcedAt })
    .from(newsItemDocuments)
    .innerJoin(newsItems, eq(newsItems.id, newsItemDocuments.newsItemId))
    .where(and(eq(newsItemDocuments.documentId, doc.documentId), eq(newsItemDocuments.role, 'primary')));
  if (!link) return null;
  if (link.announcedAt === null && doc.announcedAt !== null) {
    await tx.update(newsItems).set({ announcedAt: doc.announcedAt }).where(eq(newsItems.id, link.id));
  }
  return link.id;
}

async function createNewsItem(
  tx: Executor,
  item: { kind: 'version' | 'annonce'; title: string; doc: LinkableDocument; runId: string },
  target?: { productId: number; productVersionId: number },
): Promise<void> {
  // « Vu pour la première fois » : date de première collecte du document (antérieure à ce rattachement en cas de rattrapage).
  const [document] = await tx
    .select({ firstCollectedAt: sourceDocuments.firstCollectedAt })
    .from(sourceDocuments)
    .where(eq(sourceDocuments.id, item.doc.documentId));
  const [created] = await tx
    .insert(newsItems)
    .values({
      kind: item.kind,
      title: item.title,
      announcedAt: item.doc.announcedAt,
      firstSeenAt: document!.firstCollectedAt,
      status: 'collected',
      createdByRunId: item.runId,
    })
    .returning({ id: newsItems.id });
  await tx.insert(newsItemDocuments).values({ newsItemId: created!.id, documentId: item.doc.documentId, role: 'primary' });
  if (target) await tx.insert(newsItemTargets).values({ newsItemId: created!.id, ...target });
}

/** Documents de la source qui ne sont rattachés à rien : ni version, ni actualité. */
async function unlinkedDocuments(tx: Executor, sourceId: string, exclude: number[]): Promise<LinkableDocument[]> {
  const rows = await tx
    .select({
      documentId: sourceDocuments.id,
      title: sourceDocuments.title,
      version: sourceDocuments.version,
      announcedAt: sourceDocuments.announcedAt,
      metadata: sourceDocuments.metadata,
    })
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.sourceId, sourceId),
        exclude.length > 0 ? notInArray(sourceDocuments.id, exclude) : undefined,
        notExists(tx.select({ one: sql`1` }).from(newsItemDocuments).where(eq(newsItemDocuments.documentId, sourceDocuments.id))),
        notExists(tx.select({ one: sql`1` }).from(productVersions).where(eq(productVersions.sourceDocumentId, sourceDocuments.id))),
      ),
    )
    .orderBy(sourceDocuments.id);
  return rows.map(({ metadata, ...row }) => ({ ...row, prerelease: metadata?.prerelease === true }));
}

async function linkRelease(
  tx: Executor,
  source: GithubReleasesSource,
  productId: number,
  doc: LinkableDocument,
  counts: LinkCounts,
  now: string,
  runId: string,
): Promise<boolean> {
  const version = await ensureVersion(tx, productId, doc, now);
  if (version.created) counts.newVersions++;
  const title = `${source.product.name} ${normalizeVersion(doc.version ?? doc.title)}`;
  if (version.renamed) {
    const targets = tx.select({ id: newsItemTargets.newsItemId }).from(newsItemTargets).where(eq(newsItemTargets.productVersionId, version.id));
    await tx.update(newsItems).set({ title }).where(inArray(newsItems.id, targets));
  }
  if (doc.prerelease || version.isPrerelease) return version.owned;
  if ((await primaryNewsItem(tx, doc)) !== null) return true;

  // Une seule actualité par version : un second document de la même version (release recréée) la renforce.
  const [existing] = await tx
    .select({ newsItemId: newsItemTargets.newsItemId })
    .from(newsItemTargets)
    .where(eq(newsItemTargets.productVersionId, version.id));
  if (existing) {
    await tx
      .insert(newsItemDocuments)
      .values({ newsItemId: existing.newsItemId, documentId: doc.documentId, role: 'supporting' })
      .onConflictDoNothing();
    return true;
  }
  await createNewsItem(
    tx,
    { kind: 'version', title, doc, runId },
    { productId, productVersionId: version.id },
  );
  counts.newNewsItems++;
  return true;
}

async function linkAnnouncement(tx: Executor, doc: LinkableDocument, counts: LinkCounts, runId: string): Promise<void> {
  if ((await primaryNewsItem(tx, doc)) !== null) return;
  await createNewsItem(tx, { kind: 'annonce', title: doc.title, doc, runId });
  counts.newNewsItems++;
}

export async function linkDocuments(
  tx: Executor,
  source: SourceDefinition,
  stored: StoredDocument[],
  now: string,
  runId: string,
): Promise<LinkCounts> {
  const counts: LinkCounts = { newProducts: 0, newVersions: 0, newNewsItems: 0, caughtUpDocuments: 0 };
  const current = stored.map(fromStored);
  const caughtUp = await unlinkedDocuments(tx, source.id, current.map((doc) => doc.documentId));

  // Documents rattrapés d'abord (les plus anciens), puis la réponse courante dans son ordre. Un document rattrapé
  // n'est compté que s'il est réellement rattaché (une préversion dont le numéro appartient à un autre document
  // reste sans rattachement, et ne doit pas être comptée à chaque collecte).
  if (source.kind === 'github_releases') {
    const product = await ensureProduct(tx, source.product, now);
    if (product.created) counts.newProducts++;
    for (const doc of caughtUp) {
      if (await linkRelease(tx, source, product.id, doc, counts, now, runId)) counts.caughtUpDocuments++;
    }
    for (const doc of current) await linkRelease(tx, source, product.id, doc, counts, now, runId);
    return counts;
  }
  for (const doc of caughtUp) {
    await linkAnnouncement(tx, doc, counts, runId);
    counts.caughtUpDocuments++;
  }
  for (const doc of current) await linkAnnouncement(tx, doc, counts, runId);
  return counts;
}
