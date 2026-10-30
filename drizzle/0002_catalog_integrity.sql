CREATE INDEX `news_item_document_document_idx` ON `news_item_document` (`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `news_item_target_version_uq` ON `news_item_target` (`product_version_id`) WHERE product_version_id is not null;--> statement-breakpoint
CREATE INDEX `product_version_source_document_idx` ON `product_version` (`source_document_id`);