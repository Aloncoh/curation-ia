CREATE TABLE `llm_call` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`news_item_id` integer NOT NULL,
	`stage` text NOT NULL,
	`attempt` integer NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`status` text NOT NULL,
	`reserved_micro_usd` integer NOT NULL,
	`actual_micro_usd` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`stop_reason` text,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `llm_run`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `llm_call_run_idx` ON `llm_call` (`run_id`);--> statement-breakpoint
CREATE TABLE `llm_run` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`max_items` integer NOT NULL,
	`cap_run_micro_usd` integer NOT NULL,
	`cap_total_micro_usd` integer NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `post_draft` (
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
	`created_at` text NOT NULL,
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `llm_run`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`snapshot_id`) REFERENCES `document_snapshot`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_draft_news_item_uq` ON `post_draft` (`news_item_id`);