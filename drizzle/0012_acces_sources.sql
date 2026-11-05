ALTER TABLE `source` ADD `acces_etat` text;--> statement-breakpoint
ALTER TABLE `source` ADD `acces_detail` text;--> statement-breakpoint
ALTER TABLE `source` ADD `echecs_consecutifs` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `source` ADD `reessai_apres` text;