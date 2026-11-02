DROP INDEX `selection_decision_uq`;--> statement-breakpoint
ALTER TABLE `selection_decision` ADD `prompt_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `selection_decision` ADD `remplacee_le` text;--> statement-breakpoint
CREATE UNIQUE INDEX `selection_decision_uq` ON `selection_decision` (`news_item_id`,`juge`,`consignes_version`,`snapshot_id`,`prompt_version`) WHERE remplacee_le is null;--> statement-breakpoint
ALTER TABLE `selection_avis` ADD `aveugle` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `selection_corpus` ADD `snapshot_id` integer REFERENCES document_snapshot(id);--> statement-breakpoint
UPDATE `selection_corpus` SET `snapshot_id` = (select s.id from news_item_document nd join document_snapshot s on s.document_id = nd.document_id where nd.news_item_id = selection_corpus.news_item_id and nd.role = 'primary' and s.captured_at <= selection_corpus.created_at order by s.seq desc limit 1);