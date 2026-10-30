# Feuille de route — CURATION AI

> Proposition du 2026-10-30, **en attente de validation** (avec le plan de P1). Elle réordonne les jalons du brief pour que la V1 — la chaîne autonome déployée — arrive avant les fonctions communautaires, comme décidé lors du cadrage.

## Jalons

| Jalon | Résultat visible | Critère de sortie | Dépend de | Portée |
|---|---|---|---|---|
| **P0** Cadrage | SPEC, règles de travail, coûts relevés sur sources officielles | validé par l'utilisateur | — | **réalisé le 2026-10-30** |
| **P1** Collecte fiable | 5 releases réelles de Claude Code stockées avec provenance + export JSON lisible | voir le plan ci-dessous | P0 | **réalisé le 2026-10-30** (V1) |
| **P2** Produits et sources | produits et versions reliés aux documents ; autres dépôts GitHub officiels et un flux officiel d'annonces de modèles et d'applications ; maquette du parcours construite autour de la mascotte | doublons exacts et annonces distinctes gérés par des tests ; maquette validée | P1 | V1 |
| **P3** Analyse IA | une annonce réelle devient un brouillon d'analyse structuré, cité et révisable ; coût réel mesuré | critères 7.3 de SPEC ; coût par analyse mesuré et comparé à l'estimation | P2, budget validé, crédits API activés avec accord | V1 |
| **P4** Site | API, fil, page de détail, historique des versions | critères 7.4 de SPEC | P3 | V1 |
| **P5** Chaîne autonome en ligne | publication automatique planifiée (GitHub Actions), quotas et plafond, commandes lancer / état / pause / coûts, déploiement (Vercel, Turso), domaine | démonstration V1 (SPEC §10) | P4, accord sur hébergement et domaine | **fin de la V1** |
| **P6** Sources et contrôles avancés | plusieurs types de sources, regroupement, évaluation sur corpus, agent si utile | seuils d'évaluation de SPEC §10 | V1 | après V1 |
| **P7** Pilotage et classement | interface d'administration ; score de découverte et formule de classement documentée | à préciser | P6 | après V1 |
| **P8** Communauté | comptes, favoris, votes, commentaires, retours de test ; modération, anti-abus, confidentialité | à préciser avant ouverture | V1 | après V1 |
| **P9** Newsletter | aperçu hebdomadaire, puis inscription et envoi via une intégration choisie | aucun envoi pendant le développement | P8 | après V1 |
| **P10** Dossier final | démonstration, dossier de diplôme, brouillon LinkedIn final | à préciser | — | fin |

Correspondance avec le brief : son P5 devient P6 ; son P6 devient P5 ; son P7 est réparti entre P5 (commandes) et P7 (interface) ; son déploiement (P10) passe en P5.

---

## Estimation jusqu'à la V1 _(présentée le 2026-10-30, à la fin de P1)_

Environ **6 à 9 séances de travail** de 2 à 4 heures pour P2 à P5 (P2 : 1–2 ; P3 : 2 ; P4 : 2 ; P5 : 1–2), soit **2 à 4 semaines** à raison de 2 ou 3 séances par semaine. Hypothèses : validations rapides des plans ; comptes (Vercel, Turso, Claude Console) créés par l'utilisateur quand ils sont demandés ; crédits API Max disponibles en P3 ; pas de blocage par une source ; P0 et P1 ont pris une longue séance chacun, avec les recherches et relectures. Estimation, pas engagement : elle sera réévaluée à la fin de chaque jalon.

---

## P2 — Produits, versions et sources _(plan proposé)_

**Résultat attendu.** Les documents collectés sont rattachés à des produits et à des versions identifiés ; plusieurs sources officielles sont collectées ; chaque annonce devient une « actualité » sans doublon ; une maquette du parcours (fil et page de détail) est construite autour de la mascotte. Toujours sans IA.

**Étapes**

0. Premier commit git de l'état P0–P1.
1. **Sources supplémentaires** (à valider), avec le même collecteur sécurisé :
   - releases GitHub officielles de `openai/codex` et `google-gemini/gemini-cli` (flux vérifiés le 2026-10-30) ;
   - un flux d'annonces de modèles et d'applications : OpenAI News (RSS officiel) et GitHub Changelog (RSS officiel, dont Copilot) — Anthropic ne publie pas de flux : lecture ciblée de sa page d'actualités reportée à P6, après vérification des droits.
2. **Lecteur de flux RSS / Atom** (`@rowanmanning/feed-parser`), mêmes garanties que l'API GitHub (liste blanche, taille, délai, validation).
3. **Modèle produit** : tables `product`, `product_version`, `news_item`, et liens actualité ↔ documents et actualité ↔ produits / versions. Règle d'unicité documentée en ADR : un produit = (éditeur, identifiant canonique) déclaré dans la configuration de la source ; une version = (produit, numéro de version) ; aucune fusion sur un simple nom proche.
4. **Création des actualités** : une release → une actualité de type « version », rattachée à sa version de produit ; une entrée de flux → une actualité de type « annonce », non rattachée à un produit tant qu'elle n'est pas qualifiée (P3).
5. **Tests** : même annonce collectée deux fois → une seule actualité ; deux annonces distinctes sur le même produit → deux actualités ; entrée de flux republiée avec une nouvelle date → pas de nouvel événement ; source RSS en panne ou mal formée → données intactes.
6. **Maquette** : fil et page de détail, sur mobile et ordinateur, construits autour de la mascotte, avec de vraies données collectées clairement identifiées ; présentée pour validation avant P4.
7. **Communication** : COMPRENDRE_LE_PROJET.md (produits, versions, actualités), brouillon LinkedIn 03, STATE et PROGRESS.

**Critères de sortie** : tests verts (dont les scénarios de l'étape 5) ; essai réel sur toutes les sources validées, seconde collecte sans doublon ; chaque release réelle rattachée à exactement une version de produit ; maquette validée par l'utilisateur.

**Hors P2** : analyse IA, qualification, site réel (P4), planification et mise en ligne (P5).

**Coût** : 0 €. **Prérequis** : le fichier de la mascotte dans `assets/brand/`.

---

## P1 — Collecte fiable d'une source officielle _(réalisé le 2026-10-30 — résultats dans PROGRESS.md)_

Tous les critères de sortie ci-dessous sont atteints : 90 tests réussis, essai réel sur l'API GitHub (5 documents, seconde collecte sans doublon), preuves dans `communication/linkedin/02-collecte/preuves/`. Écarts par rapport au plan : réservation et changements d'état rendus atomiques et réouverture des connexions libSQL après verrou, à la suite de la relecture adversariale ; `better-sqlite3` non nécessaire ; TypeScript 7 conservé.

**Résultat attendu.** La commande de collecte récupère les 5 dernières releases réelles du dépôt officiel `anthropics/claude-code` via l'API REST GitHub, les stocke durablement avec leur provenance et leurs dates, et un export JSON lisible les montre. Relancer ne crée aucun doublon ; une panne de source ou une interruption n'abîme rien. Sans interface ni IA.

**Étapes**

1. **Initialisation** : `git init`, `.gitignore` (dont `.env.local` et la base locale), `package.json` (Node 24), configuration TypeScript compatible avec l'exécution directe par Node ; dépendances : `@libsql/client`, `drizzle-orm`, `drizzle-kit`, `zod`, `vitest`, `typescript` (7, repli 6 si un outil ne suit pas). Documents : README.md, PROGRESS.md, docs/architecture.md, ADR 0001 (TypeScript), ADR 0002 (SQLite / libSQL), docs/skills.md.
2. **Schéma et première migration** : `source`, `source_document` (unique sur source + identifiant externe), `document_snapshot` (unique sur document + hash), `job` (statut, bail, tentatives, clé d'idempotence unique), `run` et `run_step` (traces), `setting` (pause).
3. **Collecteur GitHub Releases** : liste blanche `api.github.com` ; validation de l'adresse IP résolue ; aucune redirection suivie ; délai et taille maximum ; en-têtes User-Agent et version d'API ; réponse validée par schéma ; URL et dates normalisées (UTC) ; hash SHA-256 du contenu ; classement de chaque release en « nouveau », « inchangé » ou « nouvelle capture ».
4. **Jobs et exécutions** : réservation par une instruction SQL unique avec attente et nouvelle tentative si la base est verrouillée ; bail de durée limitée, reprise d'un bail expiré ; 3 tentatives au plus ; chaque exécution tracée (statut, compteurs, motif d'échec).
5. **Commandes** : `npm run collect`, `npm run status`, `npm run export`, `npm run pause`, `npm run resume`, `npm run db:migrate`.
6. **Tests sur fixtures (sans réseau)** : première collecte ; seconde collecte sans changement ; release modifiée → une seule nouvelle capture ; erreur HTTP 500, délai dépassé, JSON invalide, redirection, réponse trop volumineuse, hôte non autorisé, adresse IP interdite → exécution « échouée » avec motif, données intactes ; deux processus réels sur le même fichier → un seul prend le job (sinon bascule documentée vers `better-sqlite3`) ; processus tué en pleine collecte puis relancé → aucun doublon ; pause → aucun job pris.
7. **Essai réel documenté** : collecte des 5 releases, seconde collecte, redémarrage ; sorties brutes conservées dans `communication/linkedin/02-collecte/preuves/brut/` ; résultat consigné dans PROGRESS.md.
8. **Communication** : section « Collecte » de COMPRENDRE_LE_PROJET.md passée en « réalisé » ; brouillon LinkedIn 02 ; STATE.md à jour.

**Critères de sortie**

- `npm test` réussit sur tous les scénarios de l'étape 6.
- 5 documents réels de l'API GitHub stockés avec : source, identifiant externe (id de release), version (tag), URL d'origine et normalisée, date d'annonce (`published_at`), date de collecte, hash et contenu.
- Export JSON lisible produit.
- Seconde collecte réelle : 0 nouveau document, 0 nouvelle capture ; aucune ligne en double (vérifié par requête SQL).
- Redémarrage après interruption : ni perte ni doublon.
- Erreur de source simulée : exécution marquée échouée avec motif, données inchangées.
- Aucun secret dans le dépôt ; aucun appel réseau hors `api.github.com`.
- Si le réseau est indisponible : fixture explicitement marquée « fixture », essai réel reporté, sans annoncer 5 documents récupérés.

**Hors P1** : interface, IA, autres sources, identité produit, planification GitHub Actions, déploiement.

**Coût** : 0 €. Aucun compte requis (API GitHub publique, sans authentification, 60 requêtes par heure).

**Décisions techniques prises en cours de route** (signalées dans le bilan, ADR si structurantes) : version de TypeScript ; pilote SQLite si le test de concurrence échoue ; règles exactes de normalisation des URL.
