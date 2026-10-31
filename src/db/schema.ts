// Schéma de la base. Les dates sont des chaînes ISO 8601 en UTC (toujours au même format, donc comparables).
import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  (t) => [
    uniqueIndex('product_version_uq').on(t.productId, t.version),
    index('product_version_source_document_idx').on(t.sourceDocumentId),
  ],
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
    /** primary (source principale) | supporting (autre document de la même annonce, par ex. release recréée) */
    role: text('role').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.newsItemId, t.documentId] }),
    uniqueIndex('news_item_primary_document_uq').on(t.documentId).where(sql`role = 'primary'`),
    // Recherche par document (rattrapage, actualité d'un document) sans parcourir toute la table.
    index('news_item_document_document_idx').on(t.documentId),
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
  (t) => [
    primaryKey({ columns: [t.newsItemId, t.productId] }),
    // Au plus une actualité par version de produit (ADR 0003).
    uniqueIndex('news_item_target_version_uq').on(t.productVersionId).where(sql`product_version_id is not null`),
  ],
);

/** Réglages de pilotage (ex. pause). */
export const settings = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Exécution d'analyse : un lancement de `npm run brouillons`, avec ses plafonds. Rien n'est publié. Une seule à la fois. */
export const llmRuns = sqliteTable(
  'llm_run',
  {
    id: text('id').primaryKey(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    /** en_cours | terminee | arret_budget | arret_pause | echec | interrompue */
    status: text('status').notNull(),
    /** Renouvelé avant chaque appel : une exécution `en_cours` dont le bail a expiré est tenue pour interrompue. */
    leaseExpiresAt: text('lease_expires_at'),
    maxItems: integer('max_items').notNull(),
    capRunMicroUsd: integer('cap_run_micro_usd').notNull(),
    capTotalMicroUsd: integer('cap_total_micro_usd').notNull(),
    reason: text('reason'),
  },
  (t) => [uniqueIndex('llm_run_en_cours_uq').on(t.status).where(sql`status = 'en_cours'`)],
);

/** Tentative d'appel au modèle, y compris erreurs et reprises. Coût en millionièmes de dollar ; une réservation non soldée reste comptée. */
export const llmCalls = sqliteTable(
  'llm_call',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: text('run_id').notNull().references(() => llmRuns.id),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    stage: text('stage').notNull(),
    attempt: integer('attempt').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    /** reserve | reussi | erreur */
    status: text('status').notNull(),
    reservedMicroUsd: integer('reserved_micro_usd').notNull(),
    actualMicroUsd: integer('actual_micro_usd'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    stopReason: text('stop_reason'),
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (t) => [index('llm_call_run_idx').on(t.runId)],
);

/** Résultat pour une actualité : écartée ou brouillon. Unique par actualité : une seule publication principale, tous comptes confondus. */
export const postDrafts = sqliteTable(
  'post_draft',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    runId: text('run_id').notNull().references(() => llmRuns.id),
    /** qualifiee (reprise possible) | ecartee | sortie_invalide | sortie_tronquee | refus | rejete | a_verifier | controle_automatique (jamais une garantie factuelle) */
    status: text('status').notNull(),
    account: text('account'),
    rejectionReason: text('rejection_reason'),
    informationType: text('information_type'),
    snapshotId: integer('snapshot_id').notNull().references(() => documentSnapshots.id),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
    checks: text('checks', { mode: 'json' }).$type<unknown[]>(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('post_draft_news_item_uq').on(t.newsItemId)],
);

/** Compte public, agent ou humain (ADR 0004). Le badge « Agent IA » est dérivé de `type`, jamais saisi. */
export const accounts = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    handle: text('handle').notNull(),
    displayName: text('display_name').notNull(),
    type: text('type').notNull(),
    avatar: text('avatar').notNull(),
    bio: text('bio').notNull(),
    specialty: text('specialty').notNull(),
    provisional: integer('provisional', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('account_handle_uq').on(t.handle), check('account_type_ck', sql`type in ('agent', 'human')`)],
);

/** Publication signée d'une actualité : une seule par actualité, tous comptes confondus. Avant P5, rien n'atteint `publie`. */
export const posts = sqliteTable(
  'post',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: text('account_id').notNull().references(() => accounts.id),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    evidenceLevel: text('evidence_level').notNull(),
    /** Référence du test exécuté : obligatoire pour afficher `platform_test` (P8). */
    platformTestRef: text('platform_test_ref'),
    /** brouillon | a_verifier | rejete | en_attente | publie | retire */
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    publishedAt: text('published_at'),
  },
  (t) => [
    uniqueIndex('post_news_item_uq').on(t.newsItemId),
    check('post_evidence_level_ck', sql`evidence_level in ('documentary_analysis', 'external_demo', 'platform_test')`),
    check('post_platform_test_ck', sql`evidence_level <> 'platform_test' or length(trim(coalesce(platform_test_ref, ''))) > 0`),
    check('post_status_ck', sql`status in ('brouillon', 'a_verifier', 'rejete', 'en_attente', 'publie', 'retire')`),
  ],
);

/** Contenu affiché d'une publication. Une mise à jour ajoute une révision, jamais une nouvelle publication. */
export const postRevisions = sqliteTable(
  'post_revision',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id').notNull().references(() => posts.id),
    seq: integer('seq').notNull(),
    /** Analyse d'origine : modèle, version du prompt, exécution et contrôles. */
    draftId: integer('draft_id').notNull().references(() => postDrafts.id),
    content: text('content', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('post_revision_post_seq_uq').on(t.postId, t.seq)],
);

/** Captures citées par une révision. */
export const postSources = sqliteTable(
  'post_source',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    revisionId: integer('revision_id').notNull().references(() => postRevisions.id),
    documentId: integer('document_id').notNull().references(() => sourceDocuments.id),
    snapshotId: integer('snapshot_id').notNull().references(() => documentSnapshots.id),
  },
  (t) => [uniqueIndex('post_source_revision_snapshot_uq').on(t.revisionId, t.snapshotId)],
);

/** Média d'une publication : origine, droits et mention. Un média généré porte toujours la mention d'illustration. */
export const mediaAssets = sqliteTable(
  'media_asset',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id').notNull().references(() => posts.id),
    origin: text('origin').notNull(),
    altText: text('alt_text').notNull(),
    notice: text('notice'),
    license: text('license'),
    attribution: text('attribution'),
    content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('media_asset_post_idx').on(t.postId),
    check('media_asset_origin_ck', sql`origin in ('generated', 'platform_recording', 'external_embed', 'licensed_reuse')`),
    // `is`, pas `=` : une valeur NULL ferait passer un CHECK en SQLite.
    check('media_asset_notice_ck', sql`origin <> 'generated' or notice is 'Illustration — ne prouve pas le fonctionnement'`),
  ],
);
