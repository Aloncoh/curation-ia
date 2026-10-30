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

## 2026-10-30 — P2 Produits, versions et sources (en cours : maquette à valider)

- Plan validé par l'utilisateur ; mascotte fournie par l'utilisateur, rangée dans `assets/brand/` (planche d'origine et 4 découpages, droits d'usage à confirmer).
- Sources : releases GitHub de Claude Code, Codex CLI, Gemini CLI ; flux RSS OpenAI News et GitHub Changelog. Lecteur RSS/Atom `@rowanmanning/feed-parser` 2.1.5, champs lus directement dans le XML.
- Catalogue déterministe (migrations 0001 et 0002) : produits, versions, actualités, sources principale et secondaires ; règles et options écartées dans l'[ADR 0003](docs/decisions/0003-identite-produits-versions-actualites.md).
- Relecture adversariale du code (3 relecteurs, chaque constat contre-vérifié, puis un critique de complétude) : 27 constats, 25 confirmés, 1 incertain, 1 réfuté ; 7 manques de complétude. Contre-relecture des corrections et de la maquette : 17 constats démontrés. Tous traités par un correctif testé, sauf 6 documentés (règles et limites dans l'ADR 0003, notes des fixtures, contrainte d'intervalle reportée en P5). Principaux correctifs :
  - une release recréée avec un nouvel identifiant créait une seconde actualité → au plus une actualité par version, garantie par un index unique ;
  - double décodage des entités dans le lecteur de flux (un texte « &lt;img…&gt; » devenait une balise) → lecture directe du XML, un seul décodage ; flux Atom « text »/« xhtml » échappés ;
  - le mode fixture servait le même fichier à toutes les sources (fausses versions de Codex et Gemini) → une seule source exigée, contrôle du dépôt des releases, réservation des jobs limitée aux sources demandées ;
  - liens d'entrée limités en https aux hôtes de la source, titres sans caractères de contrôle ni d'inversion de sens, plafond de 3 000 entrées par flux, catégories propres à l'entrée ;
  - rattrapage des documents non rattachés, tag corrigé, date inconnue complétée, produit suivant la configuration ;
  - seconde collecte juste après un échec : la source reportée est signalée (et le code de sortie vaut 1) ; base au schéma d'un jalon précédent détectée avant toute collecte ; « trou possible » signalé ;
  - maquette : versions et dates de collecte issues des seules collectes réelles, extraits fidèles (SNAKE_CASE, chemins, entités), focus clavier conservé, lien d'évitement, aucun débordement à 375 px.
- Les nouveaux tests du catalogue ont été vérifiés en échec sur le code d'avant la relecture (5 sur 5) ; les relecteurs ont fait de même par mutation pour les autres. Tests : **150 réussis** (108 au début de la séance), vérification des types OK.
- Essai préliminaire sur une copie de la base : Codex CLI en échec « réponse trop volumineuse » (≈ 350 fichiers joints par release ; 11 Mo pour 20 releases, mesuré) → limite propre à cette source (12 Mio, 10 releases). Les fixtures réduites ne le montraient pas.
- **Essai réel le 2026-10-30 à 02:25 UTC** sur la base de P1 : migrations 0001–0002 appliquées ; 1re collecte : 5 sources réussies, 65 nouveaux documents + 5 documents de P1 rattachés, 44 actualités (14 versions, 30 annonces) ; 2e collecte : 0 nouveau document, 0 nouvelle actualité, 70 inchangés. Réponse réelle de Codex CLI : 5 571 996 octets. Vérifications SQL : aucun doublon, chaque release rattachée à exactement une version, au plus une actualité par version, 70 captures toutes issues de collectes réelles ([preuves](communication/linkedin/03-catalogue/preuves/brut/)).
- Maquette statique (`maquette/`, `npm run maquette`) : fil, fiche détail, états de chargement, vide, erreur et fin, sur téléphone et ordinateur, avec les 44 actualités réelles ; vérifiée dans un navigateur (clavier, titres, noms accessibles, 375 px, mode sombre). Pas d'audit axe-core automatisé (prévu pour le site en P4).
- Non fait : validation de la maquette par l'utilisateur (critère de sortie) ; commit des changements de P2.

