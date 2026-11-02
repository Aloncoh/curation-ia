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

/** Requête de la sonde de détection : ce que la source a répondu, sans rien écrire dans le catalogue. */
export const sondeRequetes = sqliteTable(
  'sonde_requete',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('source_id').notNull(),
    startedAt: text('started_at').notNull(),
    durationMs: integer('duration_ms').notNull(),
    /** null si aucune réponse n'est arrivée. */
    httpStatus: integer('http_status'),
    bytes: integer('bytes').notNull().default(0),
    conditional: integer('conditional', { mode: 'boolean' }).notNull(),
    hasEtag: integer('has_etag', { mode: 'boolean' }).notNull().default(false),
    hasLastModified: integer('has_last_modified', { mode: 'boolean' }).notNull().default(false),
    cacheControl: text('cache_control'),
    /** Âge annoncé par le cache devant la source, en secondes ; null si absent. */
    ageSeconds: integer('age_seconds'),
    rateRemaining: integer('rate_remaining'),
    /** Adresse du hub WebSub annoncé par le flux ; null si aucun. */
    websubHub: text('websub_hub'),
    newEntries: integer('new_entries').notNull().default(0),
    errorKind: text('error_kind'),
  },
  (t) => [index('sonde_requete_source_idx').on(t.sourceId, t.startedAt)],
);

/** Entrée apparue pendant une sonde : le premier passage sert de référence, il ne compte jamais comme une détection. */
export const detectionsObservees = sqliteTable(
  'detection_observee',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('source_id').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    announcedAt: text('announced_at'),
    /** seconde | minute | arrondie | jour | inconnue : en dessous de la minute, le délai n'est pas mesurable. */
    precision: text('precision').notNull(),
    firstSeenAt: text('first_seen_at').notNull(),
    /** Fin de la vérification précédente : l'entrée n'était pas encore visible à ce moment-là. */
    previousCheckAt: text('previous_check_at').notNull(),
  },
  (t) => [uniqueIndex('detection_observee_uq').on(t.sourceId, t.externalId)],
);

/** Actualités figées pour la sélection : `developpement` sert à régler les consignes, `evaluation` ne sert jamais à les écrire. */
export const selectionCorpus = sqliteTable(
  'selection_corpus',
  {
    newsItemId: integer('news_item_id').primaryKey().references(() => newsItems.id),
    jeu: text('jeu').notNull(),
    strate: text('strate').notNull(),
    /** Capture figée avec le sujet : deux versions de consignes sont comparées sur le même texte. */
    snapshotId: integer('snapshot_id').references(() => documentSnapshots.id),
    graine: text('graine').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [check('selection_corpus_jeu_ck', sql`jeu in ('developpement', 'evaluation')`)],
);

/** Décision de sélection, avec ses critères : c'est elle qui explique pourquoi un sujet a été retenu ou non. */
export const selectionDecisions = sqliteTable(
  'selection_decision',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    /** regles (code, sans appel) | juge_developpement (Claude Code pendant le développement, pas le moteur) | modele (moteur du site) */
    origine: text('origine').notNull(),
    juge: text('juge').notNull(),
    consignesVersion: text('consignes_version').notNull(),
    /** Vide pour un juge de développement. */
    promptVersion: text('prompt_version').notNull().default(''),
    /** publier | ecarter | approfondir */
    decision: text('decision').notNull(),
    /** Notes et raisons par critère ; null pour une décision du code. */
    criteres: text('criteres', { mode: 'json' }).$type<Record<string, unknown>>(),
    motif: text('motif').notNull(),
    /** Passages de la capture, contrôlés mot pour mot. */
    passages: text('passages', { mode: 'json' }).notNull().$type<string[]>(),
    snapshotId: integer('snapshot_id').references(() => documentSnapshots.id),
    /** Une requalification garde l'ancienne ligne, que l'humain a pu voir, et la marque remplacée. */
    remplaceeLe: text('remplacee_le'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    // Une seule décision active par clé ; les lignes remplacées restent, autant qu'il y a eu de requalifications.
    uniqueIndex('selection_decision_uq').on(t.newsItemId, t.juge, t.consignesVersion, t.snapshotId, t.promptVersion).where(sql`remplacee_le is null`),
    check('selection_decision_origine_ck', sql`origine in ('regles', 'juge_developpement', 'modele')`),
    check('selection_decision_decision_ck', sql`decision in ('publier', 'ecarter', 'approfondir')`),
  ],
);

/**
 * Avis humain sur un sujet : une confirmation ou une correction, jamais une règle en soi. `portee` dit ce que l'humain en
 * fait ; seule une nouvelle version des consignes, relue et datée, transforme des avis en règle, en les citant.
 */
export const selectionAvis = sqliteTable(
  'selection_avis',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    /** Décision montrée à l'humain. */
    decisionId: integer('decision_id').references(() => selectionDecisions.id),
    /** Déclaré, jamais déduit : l'humain n'a vu aucune décision du système sur ce sujet. */
    aveugle: integer('aveugle', { mode: 'boolean' }).notNull().default(false),
    decision: text('decision').notNull(),
    motif: text('motif'),
    /** cas_particulier | a_confirmer | regle_proposee */
    portee: text('portee').notNull().default('cas_particulier'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('selection_avis_news_item_idx').on(t.newsItemId),
    check('selection_avis_decision_ck', sql`decision in ('publier', 'ecarter', 'approfondir')`),
    check('selection_avis_portee_ck', sql`portee in ('cas_particulier', 'a_confirmer', 'regle_proposee')`),
  ],
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

/**
 * Sortie d'un modèle pendant une comparaison. Elle reste ici : elle ne devient ni un brouillon ni une publication.
 * `origine` sépare les appels réels des essais simulés, qui ne valident jamais un modèle.
 */
export const comparaisonSorties = sqliteTable(
  'comparaison_sortie',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: text('run_id').notNull().references(() => llmRuns.id),
    /** reel | simulation */
    origine: text('origine').notNull(),
    bras: text('bras').notNull(),
    modele: text('modele').notNull(),
    reglage: text('reglage').notNull(),
    newsItemId: integer('news_item_id').notNull().references(() => newsItems.id),
    snapshotId: integer('snapshot_id').notNull().references(() => documentSnapshots.id),
    /** qualification | redaction */
    etape: text('etape').notNull(),
    promptVersion: text('prompt_version').notNull(),
    /** valide | json_invalide | schema_invalide | tronquee | refus | erreur */
    statut: text('statut').notNull(),
    tentatives: integer('tentatives').notNull(),
    /** Texte tel que le modèle l'a rendu, pour relire une sortie refusée par le schéma. */
    brut: text('brut'),
    contenu: text('contenu', { mode: 'json' }).$type<Record<string, unknown>>(),
    controles: text('controles', { mode: 'json' }).$type<{ champ: string; code: string; detail?: string }[]>(),
    decision: text('decision'),
    motif: text('motif'),
    dureeMs: integer('duree_ms'),
    tokensEntree: integer('tokens_entree'),
    tokensCache: integer('tokens_cache'),
    tokensSortie: integer('tokens_sortie'),
    tokensRaisonnement: integer('tokens_raisonnement'),
    /** Coût calculé des tentatives ; une tentative sans réponse garde sa réservation. */
    coutMicroUsd: integer('cout_micro_usd').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('comparaison_sortie_uq').on(t.origine, t.bras, t.newsItemId, t.etape, t.snapshotId, t.promptVersion),
    check('comparaison_sortie_origine_ck', sql`origine in ('reel', 'simulation')`),
    check('comparaison_sortie_etape_ck', sql`etape in ('qualification', 'redaction')`),
  ],
);
