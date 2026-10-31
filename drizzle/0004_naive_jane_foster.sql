CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`type` text NOT NULL,
	`avatar` text NOT NULL,
	`bio` text NOT NULL,
	`specialty` text NOT NULL,
	`provisional` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "account_type_ck" CHECK(type in ('agent', 'human'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_handle_uq` ON `account` (`handle`);--> statement-breakpoint
CREATE TABLE `media_asset` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`origin` text NOT NULL,
	`alt_text` text NOT NULL,
	`notice` text,
	`license` text,
	`attribution` text,
	`content` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "media_asset_origin_ck" CHECK(origin in ('generated', 'platform_recording', 'external_embed', 'licensed_reuse')),
	CONSTRAINT "media_asset_notice_ck" CHECK(origin <> 'generated' or notice is 'Illustration — ne prouve pas le fonctionnement')
);
--> statement-breakpoint
CREATE INDEX `media_asset_post_idx` ON `media_asset` (`post_id`);--> statement-breakpoint
CREATE TABLE `post_revision` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`draft_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`draft_id`) REFERENCES `post_draft`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_revision_post_seq_uq` ON `post_revision` (`post_id`,`seq`);--> statement-breakpoint
CREATE TABLE `post_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`revision_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`snapshot_id` integer NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `post_revision`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `source_document`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `document_snapshot`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_source_revision_snapshot_uq` ON `post_source` (`revision_id`,`snapshot_id`);--> statement-breakpoint
CREATE TABLE `post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` text NOT NULL,
	`news_item_id` integer NOT NULL,
	`evidence_level` text NOT NULL,
	`platform_test_ref` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_evidence_level_ck" CHECK(evidence_level in ('documentary_analysis', 'external_demo', 'platform_test')),
	CONSTRAINT "post_platform_test_ck" CHECK(evidence_level <> 'platform_test' or length(trim(coalesce(platform_test_ref, ''))) > 0),
	CONSTRAINT "post_status_ck" CHECK(status in ('brouillon', 'a_verifier', 'rejete', 'en_attente', 'publie', 'retire'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_news_item_uq` ON `post` (`news_item_id`);--> statement-breakpoint
ALTER TABLE `llm_run` ADD `lease_expires_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `llm_run_en_cours_uq` ON `llm_run` (`status`) WHERE status = 'en_cours';