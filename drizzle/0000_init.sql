CREATE TABLE `document_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`content_hash` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`content_format` text NOT NULL,
	`captured_at` text NOT NULL,
	`run_id` text,
	FOREIGN KEY (`document_id`) REFERENCES `source_document`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_snapshot_document_seq_uq` ON `document_snapshot` (`document_id`,`seq`);--> statement-breakpoint
CREATE TABLE `job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`source_id` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer NOT NULL,
	`available_at` text NOT NULL,
	`lease_owner` text,
	`lease_until` text,
	`run_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `source`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_active_uq` ON `job` (`kind`,`source_id`) WHERE status in ('pending', 'leased');--> statement-breakpoint
CREATE INDEX `job_claim_idx` ON `job` (`status`,`available_at`);--> statement-breakpoint
CREATE TABLE `run_step` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`seq` integer NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`detail` text,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_step_run_seq_uq` ON `run_step` (`run_id`,`seq`);--> statement-breakpoint
CREATE TABLE `run` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`job_id` integer,
	`source_id` text,
	`mode` text NOT NULL,
	`worker_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`new_documents` integer DEFAULT 0 NOT NULL,
	`unchanged_documents` integer DEFAULT 0 NOT NULL,
	`changed_documents` integer DEFAULT 0 NOT NULL,
	`error_kind` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_document` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`title` text NOT NULL,
	`version` text,
	`announced_at` text,
	`first_collected_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`metadata` text,
	FOREIGN KEY (`source_id`) REFERENCES `source`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_document_source_external_uq` ON `source_document` (`source_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `source` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`allowed_hosts` text NOT NULL,
	`fetch_interval_minutes` integer,
	`active` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'never' NOT NULL,
	`last_success_at` text,
	`last_error_at` text,
	`last_error` text,
	`created_at` text NOT NULL
);
