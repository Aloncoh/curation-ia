CREATE TABLE `news_item_document` (
	`news_item_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`news_item_id`, `document_id`),
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `source_document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_item_primary_document_uq` ON `news_item_document` (`document_id`) WHERE role = 'primary';--> statement-breakpoint
CREATE TABLE `news_item_target` (
	`news_item_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_version_id` integer,
	PRIMARY KEY(`news_item_id`, `product_id`),
	FOREIGN KEY (`news_item_id`) REFERENCES `news_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_version_id`) REFERENCES `product_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `news_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`announced_at` text,
	`first_seen_at` text NOT NULL,
	`status` text NOT NULL,
	`created_by_run_id` text,
	FOREIGN KEY (`created_by_run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_version` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`version` text NOT NULL,
	`is_prerelease` integer NOT NULL,
	`released_at` text,
	`source_document_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_version_uq` ON `product_version` (`product_id`,`version`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`publisher` text NOT NULL,
	`category` text,
	`repository_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_key_uq` ON `product` (`key`);--> statement-breakpoint
ALTER TABLE `run` ADD `new_news_items` integer DEFAULT 0 NOT NULL;