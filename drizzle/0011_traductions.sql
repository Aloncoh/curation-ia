CREATE TABLE `post_traduction` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`revision_id` integer NOT NULL,
	`langue` text NOT NULL,
	`champs` text NOT NULL,
	`origine` text NOT NULL,
	`modele` text,
	`prompt_version` text,
	`llm_call_id` integer,
	`statut` text NOT NULL,
	`ecarts` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `post_revision`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`llm_call_id`) REFERENCES `llm_call`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_traduction_langue_ck" CHECK(langue in ('fr', 'he')),
	CONSTRAINT "post_traduction_origine_ck" CHECK(origine in ('machine', 'humaine')),
	CONSTRAINT "post_traduction_statut_ck" CHECK(statut in ('valide', 'ecart')),
	CONSTRAINT "post_traduction_modele_ck" CHECK(origine <> 'machine' or length(trim(coalesce(modele, ''))) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_traduction_revision_langue_uq` ON `post_traduction` (`revision_id`,`langue`);