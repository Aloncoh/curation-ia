// Schéma de la base. Les dates sont des chaînes ISO 8601 en UTC (toujours au même format, donc comparables).
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Source configurée (ex. les releases GitHub d'un dépôt officiel). */
export const sources = sqliteTable('source', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  config: text('config', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  allowedHosts: text('allowed_hosts', { mode: 'json' }).notNull().$type<string[]>(),
  fetchIntervalMinutes: integer('fetch_interval_minutes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  /** never | ok | error */
  status: text('status').notNull().default('never'),
  lastSuccessAt: text('last_success_at'),
  lastErrorAt: text('last_error_at'),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
});

/** Document effectivement collecté, identifié par (source, identifiant externe). */
export const sourceDocuments = sqliteTable(
  'source_document',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('source_id').notNull().references(() => sources.id),
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    title: text('title').notNull(),
    version: text('version'),
    /** Date de l'annonce selon la source ; null si inconnue. */
    announcedAt: text('announced_at'),
    firstCollectedAt: text('first_collected_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [uniqueIndex('source_document_source_external_uq').on(t.sourceId, t.externalId)],
);

/** Capture du contenu d'un document : une nouvelle ligne seulement quand le contenu change. */
export const documentSnapshots = sqliteTable(
  'document_snapshot',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentId: integer('document_id').notNull().references(() => sourceDocuments.id),
    seq: integer('seq').notNull(),
    contentHash: text('content_hash').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    contentFormat: text('content_format').notNull(),
    capturedAt: text('captured_at').notNull(),
    runId: text('run_id').references(() => runs.id),
  },
  (t) => [uniqueIndex('document_snapshot_document_seq_uq').on(t.documentId, t.seq)],
);

/** Travail à faire. Au plus un job actif (pending ou leased) par source et par type. */
export const jobs = sqliteTable(
  'job',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind').notNull(),
    sourceId: text('source_id').notNull().references(() => sources.id),
    /** pending | leased | succeeded | failed */
    status: text('status').notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull(),
    availableAt: text('available_at').notNull(),
    leaseOwner: text('lease_owner'),
    leaseUntil: text('lease_until'),
    runId: text('run_id'),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('job_active_uq')
      .on(t.kind, t.sourceId)
      .where(sql`status in ('pending', 'leased')`),
    index('job_claim_idx').on(t.status, t.availableAt),
  ],
);

/** Exécution d'un job : ce qui s'est réellement passé, pour la traçabilité. */
export const runs = sqliteTable('run', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  jobId: integer('job_id'),
  sourceId: text('source_id'),
  /** live | fixture */
  mode: text('mode').notNull(),
  workerId: text('worker_id').notNull(),
  /** running | succeeded | failed | interrupted */
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  newDocuments: integer('new_documents').notNull().default(0),
  unchangedDocuments: integer('unchanged_documents').notNull().default(0),
  changedDocuments: integer('changed_documents').notNull().default(0),
  newNewsItems: integer('new_news_items').notNull().default(0),
  errorKind: text('error_kind'),
  errorMessage: text('error_message'),
});

/** Étape d'une exécution (récupération, analyse de la réponse, enregistrement). */
export const runSteps = sqliteTable(
  'run_step',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: text('run_id').notNull().references(() => runs.id),
    seq: integer('seq').notNull(),
    name: text('name').notNull(),
    /** succeeded | failed */
    status: text('status').notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at').notNull(),
    durationMs: integer('duration_ms').notNull(),
    detail: text('detail', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [uniqueIndex('run_step_run_seq_uq').on(t.runId, t.seq)],
);

/**
 * Produit suivi. Identité stable : la clé canonique « éditeur/produit » déclarée dans la configuration de la source
 * (jamais déduite d'un nom proche). Voir docs/decisions/0003.
 */
export const products = sqliteTable(
  'product',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    publisher: text('publisher').notNull(),
    category: text('category'),
    repositoryUrl: text('repository_url'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('product_key_uq').on(t.key)],
);

/** Version identifiable d'un produit, rattachée au document qui l'annonce. */
export const productVersions = sqliteTable(
  'product_version',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id').notNull().references(() => products.id),
    version: text('version').notNull(),
    isPrerelease: integer('is_prerelease', { mode: 'boolean' }).notNull(),
    /** Date de publication selon la source ; null si inconnue. */
    releasedAt: text('released_at'),
    sourceDocumentId: integer('source_document_id').references(() => sourceDocuments.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('product_version_uq').on(t.productId, t.version)],
);

/** Actualité du fil : une annonce ou un événement, appuyé sur un ou plusieurs documents. */
export const newsItems = sqliteTable('news_item', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** version | annonce */
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  /** Date de l'événement selon la source, fixée à la création : une republication ne la change pas. */
  announcedAt: text('announced_at'),
  firstSeenAt: text('first_seen_at').notNull(),
  /** collected (P2) ; brouillon, à vérifier, publié… à partir de P3 */
  status: text('status').notNull(),
  createdByRunId: text('created_by_run_id').references(() => runs.id),
});

/** Documents sur lesquels s'appuie une actualité. Un document est la source principale d'au plus une actualité. */
export const newsItemDocuments = sqliteTable(
  'news_item_document',
  {
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    documentId: integer('document_id').notNull().references(() => sourceDocuments.id),
    /** primary | supporting */
    role: text('role').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.newsItemId, t.documentId] }),
    uniqueIndex('news_item_primary_document_uq').on(t.documentId).where(sql`role = 'primary'`),
  ],
);

/** Produits (et versions, si connues) concernés par une actualité. */
export const newsItemTargets = sqliteTable(
  'news_item_target',
  {
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    productId: integer('product_id').notNull().references(() => products.id),
    productVersionId: integer('product_version_id').references(() => productVersions.id),
  },
  (t) => [primaryKey({ columns: [t.newsItemId, t.productId] })],
);

/** Réglages de pilotage (ex. pause). */
export const settings = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
