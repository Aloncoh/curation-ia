CREATE TABLE `post_bouton` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`revision_id` integer NOT NULL,
	`libelle` text NOT NULL,
	`destination` text NOT NULL,
	`url` text NOT NULL,
	`hote` text NOT NULL,
	`url_controle` text NOT NULL,
	`statut_http` integer,
	`resultat` text NOT NULL,
	`motif` text,
	`snapshot_id` integer,
	`verifie_le` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revision_id`) REFERENCES `post_revision`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `document_snapshot`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_bouton_libelle_ck" CHECK(libelle in ('Voir le dépôt', 'Installer', 'Télécharger')),
	CONSTRAINT "post_bouton_destination_ck" CHECK(destination in ('depot', 'installation', 'telechargement')),
	CONSTRAINT "post_bouton_coherence_ck" CHECK((destination = 'depot' and libelle = 'Voir le dépôt') or (destination = 'installation' and libelle = 'Installer') or (destination = 'telechargement' and libelle = 'Télécharger')),
	CONSTRAINT "post_bouton_resultat_ck" CHECK(resultat in ('verifie', 'echec'))
);
--> statement-breakpoint
CREATE INDEX `post_bouton_post_idx` ON `post_bouton` (`post_id`,`verifie_le`);--> statement-breakpoint
CREATE TABLE `post_mot_cle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`revision_id` integer NOT NULL,
	`champ` text NOT NULL,
	`terme` text NOT NULL,
	`terme_normalise` text NOT NULL,
	`raison` text,
	`passage` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revision_id`) REFERENCES `post_revision`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_mot_cle_champ_ck" CHECK(champ in ('nom', 'categorie', 'usage', 'technologie', 'terme_proche')),
	CONSTRAINT "post_mot_cle_raison_ck" CHECK(champ <> 'terme_proche' or length(trim(coalesce(raison, ''))) > 0),
	CONSTRAINT "post_mot_cle_passage_ck" CHECK(champ not in ('usage', 'technologie') or length(trim(coalesce(passage, ''))) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_mot_cle_uq` ON `post_mot_cle` (`revision_id`,`champ`,`terme_normalise`);--> statement-breakpoint
CREATE INDEX `post_mot_cle_terme_idx` ON `post_mot_cle` (`terme_normalise`);--> statement-breakpoint
CREATE INDEX `post_mot_cle_post_idx` ON `post_mot_cle` (`post_id`);--> statement-breakpoint
CREATE TABLE `publication_planifiee` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`jour` text,
	`rang` integer,
	`priorite` integer NOT NULL,
	`statut_sortie` text NOT NULL,
	`utilise_reserve` integer DEFAULT false NOT NULL,
	`etat` text NOT NULL,
	`motif` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "publication_planifiee_priorite_ck" CHECK(priorite in (1, 2, 3, 4)),
	CONSTRAINT "publication_planifiee_statut_sortie_ck" CHECK(statut_sortie in ('ressource_existante', 'nouvelle_sortie', 'actualite')),
	CONSTRAINT "publication_planifiee_etat_ck" CHECK(etat in ('prevue', 'reportee', 'publiee')),
	CONSTRAINT "publication_planifiee_jour_ck" CHECK(etat = 'reportee' or (jour is not null and rang is not null))
);
--> statement-breakpoint
CREATE INDEX `publication_planifiee_jour_idx` ON `publication_planifiee` (`jour`,`etat`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_draft` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`news_item_id` integer NOT NULL,
	`run_id` text NOT NULL,
	`status` text NOT NULL,
	`account` text,
	`rejection_reason` text,
	`information_type` text,
	`snapshot_id` integer NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`content` text,
	`checks` text,
	`origine` text DEFAULT 'agent_site' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `llm_run`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `document_snapshot`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_draft_origine_ck" CHECK(origine in ('agent_site', 'claude_code_developpement'))
);
--> statement-breakpoint
INSERT INTO `__new_post_draft`("id", "news_item_id", "run_id", "status", "account", "rejection_reason", "information_type", "snapshot_id", "model", "prompt_version", "content", "checks", "created_at") SELECT "id", "news_item_id", "run_id", "status", "account", "rejection_reason", "information_type", "snapshot_id", "model", "prompt_version", "content", "checks", "created_at" FROM `post_draft`;--> statement-breakpoint
DROP TABLE `post_draft`;--> statement-breakpoint
ALTER TABLE `__new_post_draft` RENAME TO `post_draft`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `post_draft_news_item_uq` ON `post_draft` (`news_item_id`);--> statement-breakpoint
-- Ajouts écrits à la main (ADR 0011). drizzle-kit 0.31.11 recopiait la colonne `origine`, absente de l'ancienne table :
-- elle est retirée de la recopie ci-dessus, la valeur par défaut s'applique aux lignes existantes.
-- Index de recherche : table virtuelle FTS5, non déclarée dans drizzle (src/db/schema.ts). Elle reçoit des textes déjà
-- normalisés par src/recherche/normaliser.ts. Repli prévu si une base refuse FTS5 : recherche_terme, en SQL simple.
CREATE VIRTUAL TABLE `recherche_publication` USING fts5(post_id UNINDEXED, revision_id UNINDEXED, nom, mots_cles, texte, tokenize = 'unicode61 remove_diacritics 2', prefix = '2 3');
