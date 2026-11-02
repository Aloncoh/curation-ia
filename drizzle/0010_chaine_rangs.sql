-- Écrit à la main : renumérote les rangs déjà écrits (doublons possibles avant ce lot) pour que l'index unique puisse être créé.
UPDATE `publication_planifiee` SET `rang` = (
	SELECT x.n FROM (
		SELECT `post_id`, row_number() OVER (PARTITION BY `jour` ORDER BY `rang`, `post_id`) AS n
		FROM `publication_planifiee` WHERE `etat` <> 'reportee'
	) x WHERE x.`post_id` = `publication_planifiee`.`post_id`
) WHERE `etat` <> 'reportee';--> statement-breakpoint
CREATE UNIQUE INDEX `publication_planifiee_jour_rang_uq` ON `publication_planifiee` (`jour`,`rang`) WHERE etat <> 'reportee';--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_bouton` (
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
	CONSTRAINT "post_bouton_resultat_ck" CHECK(resultat in ('verifie', 'echec')),
	CONSTRAINT "post_bouton_url_ck" CHECK(url like 'https://%' and (destination = 'installation' or hote = 'github.com'))
);
--> statement-breakpoint
INSERT INTO `__new_post_bouton`("id", "post_id", "revision_id", "libelle", "destination", "url", "hote", "url_controle", "statut_http", "resultat", "motif", "snapshot_id", "verifie_le", "created_at") SELECT "id", "post_id", "revision_id", "libelle", "destination", "url", "hote", "url_controle", "statut_http", "resultat", "motif", "snapshot_id", "verifie_le", "created_at" FROM `post_bouton`;--> statement-breakpoint
DROP TABLE `post_bouton`;--> statement-breakpoint
ALTER TABLE `__new_post_bouton` RENAME TO `post_bouton`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `post_bouton_post_idx` ON `post_bouton` (`post_id`,`verifie_le`);