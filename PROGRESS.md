# Historique

Évolution datée des jalons et des vérifications **réellement faites**. L'état courant est dans [STATE.md](STATE.md) ; les traces d'exécution détaillées sont en base.

## 2026-10-30 — P0 Cadrage (terminé)

- Dossier vide vérifié ; outils : Node 24.16.0, npm 11.13.0, git 2.39.5, SQLite 3.45.3 (CLI) ; ni Docker, ni Homebrew, ni PostgreSQL.
- Cinq décisions produit prises par l'utilisateur (public, périmètre éditorial, V1 minimale déployée, budget à 0 € au départ, rôles) puis méthode de travail (bilans courts, `communication/`).
- Recherche contre-vérifiée sur les coûts et la stack : 279 informations, 270 confirmées, 7 corrigées, 2 invérifiables ([preuves](communication/linkedin/01-cadrage/preuves/recherche-verifiee.md)).
- Documents : CLAUDE.md, SPEC.md, ROADMAP.md, STATE.md, docs/brief-initial.md, communication/ ; relecture par deux agents indépendants (35 remarques intégrées).
- Feuille de route et plan de P1 validés par l'utilisateur.

## 2026-10-30 — P1 Collecte fiable (terminé)

- Dépôt git initialisé ; dépendances fixées : @libsql/client 0.18.0, drizzle-orm 0.45.4, zod 4.6.7, drizzle-kit 0.31.11, vitest 5.0.5, typescript 7.0.2, @types/node 24.19.2.
- Constat : le moteur SQLite embarqué par libSQL est en 3.45.1 (mesuré) → base locale sans WAL ([ADR 0002](docs/decisions/0002-sqlite-libsql-turso.md)).
- Schéma et première migration (7 tables), collecteur sécurisé, file de jobs à bail, traces, pause, export, commandes.
- Relecture adversariale du code (3 relecteurs, chaque point contre-vérifié) : 22 remarques, 18 confirmées, toutes traitées. Principales corrections :
  - libSQL laisse une connexion inutilisable après un verrou plus long que le délai d'attente → réouverture des connexions avant chaque nouvelle tentative (test dédié ; il échoue sans le correctif) ;
  - chaque changement d'état (début, fin réussie, échec) écrit dans une seule transaction ; une exécution abandonnée est toujours marquée « interrompue » ;
  - pause vérifiée dans l'instruction même de réservation ; champs descriptifs (date, prerelease) mis à jour sans nouvelle capture ;
  - sécurité : certificat toujours vérifié, aucun proxy implicite, plages IPv6 supplémentaires refusées, délai couvrant la résolution DNS, secrets masqués dans les erreurs, `.env` ignoré par git ;
  - tests renforcés : arrêt brutal pendant l'enregistrement, contenu et empreinte vérifiés, mode fixture tracé, réservations réellement concurrentes.
- Tests : **90 réussis** (`npm test`), vérification des types OK ; les tests multi-processus et de verrou réussis 5 fois de suite ; répartition observée lors de la dernière exécution : 152 / 148 jobs entre les deux processus, aucun en double.
- **Essai réel le 2026-10-30 à 01:26 UTC** sur l'API GitHub : 1re collecte 5 nouveaux documents (v2.1.309 à v2.1.314), 2e collecte 0 nouveau / 5 inchangés, pause respectée, aucun doublon (requête SQL), 1 capture par document ([preuves](communication/linkedin/02-collecte/preuves/brut/)).
- Non fait en réel (couvert par les tests sur fixtures) : arrêt brutal d'un collecteur réel, panne de la vraie source.
