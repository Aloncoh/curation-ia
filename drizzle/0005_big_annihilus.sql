CREATE TABLE `detection_observee` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`announced_at` text,
	`precision` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`previous_check_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `detection_observee_uq` ON `detection_observee` (`source_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `selection_avis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`news_item_id` integer NOT NULL,
	`decision_id` integer,
	`decision` text NOT NULL,
	`motif` text,
	`portee` text DEFAULT 'cas_particulier' NOT NULL,
	`regle_version` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decision_id`) REFERENCES `selection_decision`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "selection_avis_decision_ck" CHECK(decision in ('publier', 'ecarter', 'approfondir')),
	CONSTRAINT "selection_avis_portee_ck" CHECK(portee in ('cas_particulier', 'a_confirmer', 'regle_proposee'))
);
--> statement-breakpoint
CREATE INDEX `selection_avis_news_item_idx` ON `selection_avis` (`news_item_id`);--> statement-breakpoint
CREATE TABLE `selection_corpus` (
	`news_item_id` integer PRIMARY KEY NOT NULL,
	`jeu` text NOT NULL,
	`strate` text NOT NULL,
	`graine` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "selection_corpus_jeu_ck" CHECK(jeu in ('developpement', 'evaluation'))
);
--> statement-breakpoint
CREATE TABLE `selection_decision` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`news_item_id` integer NOT NULL,
	`origine` text NOT NULL,
	`juge` text NOT NULL,
	`consignes_version` text NOT NULL,
	`decision` text NOT NULL,
	`criteres` text,
	`motif` text NOT NULL,
	`passages` text NOT NULL,
	`snapshot_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `document_snapshot`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "selection_decision_origine_ck" CHECK(origine in ('regles', 'juge_developpement', 'modele')),
	CONSTRAINT "selection_decision_decision_ck" CHECK(decision in ('publier', 'ecarter', 'approfondir'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `selection_decision_uq` ON `selection_decision` (`news_item_id`,`juge`,`consignes_version`);--> statement-breakpoint
CREATE TABLE `sonde_requete` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`started_at` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`http_status` integer,
	`bytes` integer DEFAULT 0 NOT NULL,
	`conditional` integer NOT NULL,
	`has_etag` integer DEFAULT false NOT NULL,
	`has_last_modified` integer DEFAULT false NOT NULL,
	`cache_control` text,
	`age_seconds` integer,
	`rate_remaining` integer,
	`websub_hub` text,
	`new_entries` integer DEFAULT 0 NOT NULL,
	`error_kind` text
);
--> statement-breakpoint
CREATE INDEX `sonde_requete_source_idx` ON `sonde_requete` (`source_id`,`started_at`);