# Feuille de route — CURATION AI

> Feuille de route validée le 2026-10-30 (avec le plan de P1), puis **adaptée le même jour à la vision du produit précisée par l'utilisateur** : un réseau social visuel avec agents éditoriaux IA ([ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)). La V1 (P0–P5) garde son objectif et ses jalons ; leur contenu est adapté (fil social, compte éditorial, publications). **Orientation validée par l'utilisateur le 2026-10-30** ; le découpage après la V1 (P6–P14) reste **prévisionnel** et ne doit pas alourdir la V1.

> **Mise à jour du 2026-10-31** : P3 reste **en cours**. La collecte des 24 sources fonctionne en réel ; la génération de brouillons, testée sur faux modèle, n'a jamais appelé le vrai modèle (aucun brouillon réel, critères de sortie non atteints) ; l'affichage reste une maquette statique locale. Le code sans dépense est écrit, tables de publication comprises (migration 0004) ; restent le premier lot réel, le coût mesuré et la revue des brouillons. Détail : STATE.md. Reddit reste dans le périmètre comme source différée, faute d'accès autorisé (docs/sources.md §3.7).

> **Mise à jour du 2026-10-30 — écosystème IA et créatif** (SPEC §3.4) : P3 passe de 6 à 24 sources actives et ajoute à chaque brouillon l'accès, le coût, la nature de l'actualité, la date et le niveau de preuve. P2 n'est pas repris. Sources sans flux simple (Perplexity, Grok, Seedance, Kling, Runway…) : adaptateurs en P6. Publication automatique inchangée (P5). Impact : aucune dépense ; le lot réel de P3 attend les compléments listés dans STATE.md, puis l'accord de l'utilisateur et sa clé.

## Jalons

| Jalon | Résultat visible | Critère de sortie | Dépend de | Portée |
|---|---|---|---|---|
| **P0** Cadrage | SPEC, règles de travail, coûts relevés sur sources officielles | validé par l'utilisateur | — | **réalisé le 2026-10-30** |
| **P1** Collecte fiable | 5 releases réelles de Claude Code stockées avec provenance + export JSON lisible | voir le plan ci-dessous | P0 | **réalisé le 2026-10-30** (V1) |
| **P2** Produits, sources et maquette | produits et versions reliés aux documents ; 5 sources officielles ; **maquette du fil social, du profil de l'agent éditorial et de l'espace Reels**, autour de la mascotte | doublons exacts et annonces distinctes gérés par des tests ; maquette validée | P1 | V1 — **réalisé le 2026-10-30** |
| **P3** Analyse sourcée et brouillons de publication | une annonce réelle devient un **brouillon de publication** signé par le compte éditorial principal : accroche fidèle, nouveauté, intérêt concret, limites connues, textes du carrousel, citations vérifiées ; coût réel mesuré | critères 7.3, 7.7 et 7.8 de SPEC (parties V1) ; coût par brouillon mesuré et comparé à l'estimation | P2, budget validé, crédits API activés avec accord | V1 — **en cours**, critères non atteints |
| **P4** Site social | API, **fil de publications**, page de publication, **profil de l'agent éditorial**, fiche d'approfondissement et historique des versions ; images et carrousels générés par le code ; langue du navigateur parmi les langues disponibles, changement manuel, langue de secours | critères 7.4 de SPEC, dont contenus collectés en texte brut ou assainis côté serveur par liste blanche, testés avec `<img onerror>` et `javascript:` (ADR 0003) | P3, nom du compte éditorial et langues du lancement décidés | V1 |
| **P5** Chaîne autonome en ligne | publication automatique planifiée (GitHub Actions) respectant l'intervalle de chaque source (GitHub Changelog : au moins toutes les heures), la fréquence maximale de publication, les quotas et le plafond ; commandes lancer / état / pause / coûts ; déploiement (Vercel, Turso), domaine | démonstration V1 (SPEC §10) | P4, accord sur hébergement et domaine | **fin de la V1** |
| **P6** Sources élargies et veille | registre des sources en base ; nouvelles sources vérifiées (Hugging Face, registre MCP, annuaires de skills, pages d'état pour les incidents, labos, langages, matériel, design et motion) ; X selon l'accès validé ; Reddit différé tant qu'aucun accès autorisé n'existe (docs/sources.md §3.7) ; veille de profils externes ; regroupement multi-sources ; incidents suivis et révisés ; score de découverte ; comptes éditoriaux spécialisés si utiles | seuils d'évaluation de SPEC §10 ; chaque source active testée en réel | V1, arbitrages chiffrés (X, Reddit) | après V1 — proposé |
| **P7** Médias et Reels | espace Reels (vertical, lecture, son, sous-titres, sources) ; démonstrations externes intégrées et attribuées ; nos vidéos de présentation (motion design par le code) | critères 7.8 et 7.10 de SPEC | P6, hébergement vidéo et budget validés | après V1 — proposé |
| **P8** Tests de la plateforme | premiers tests réellement exécutés dans un bac à sable, publiés au niveau « Test de la plateforme » | critères 7.11 de SPEC | P7, bac à sable et budget validés | après V1 — proposé |
| **P9** Comptes et contributions humaines | comptes, profils, publications des membres, abonnements (humains et IA), commentaires, réactions, enregistrements, partages ; administration, modération, signalements, blocages | critères 7.12 (P9) ; obligations légales vérifiées avant ouverture | V1 (P6–P8 souhaitables) | après V1 — proposé |
| **P10** Messagerie privée | messages, demandes de messages, blocages, signalements ; données isolées des agents (ADR à venir) | critères 7.12 (P10) | P9 | après V1 — proposé |
| **P11** Groupes thématiques | groupes publics et privés, modération | critères 7.12 (P11) | P9 | après V1 — proposé |
| **P12** Langues | langue du navigateur, sélecteur, repli ; traductions identifiées, original conservé | critères 7.13 | V1 ; langues et mode de traduction décidés | après V1 — proposé, **déplaçable** (peut suivre P5) |
| **P13** Newsletter | aperçu hebdomadaire, puis inscription et envoi via une intégration choisie | aucun envoi pendant le développement | P9 | après V1 — proposé |
| **P14** Dossier final | démonstration, dossier de diplôme, brouillon LinkedIn final | à préciser | V1 | **déplaçable** : après n'importe quel jalon postérieur à la V1 |

Correspondance avec la feuille de route du 2026-10-30 : P0–P5 inchangés (contenu adapté) ; l'ancien P6 (sources et contrôles avancés) devient P6, élargi ; l'ancien P7 (pilotage et classement) est réparti entre P6 (score de découverte) et P9 (interface d'administration, utile à la modération) ; l'ancien P8 (communauté) devient P9 ; l'ancien P9 (newsletter) devient P13 ; l'ancien P10 (dossier final) devient P14. Nouveaux : P7 (médias et Reels), P8 (tests), P10 (messagerie), P11 (groupes), P12 (langues). Correspondance avec le brief d'origine : son P5 devient P6 ; son P6 devient P5 ; son P7 est réparti entre P5 (commandes) et P9 (interface) ; son déploiement (P10) passe en P5.

---

## Estimation jusqu'à la V1 _(présentée le 2026-10-30 à la fin de P1, réévaluée le même jour après la précision de la vision)_

Environ **7 à 11 séances de travail** de 2 à 4 heures pour finir P2 et faire P3 à P5 (P2 : la maquette révisée, ½–1 ; P3 : 2–3 ; P4 : 2–3 ; P5 : 1–2), soit **3 à 5 semaines** à raison de 2 ou 3 séances par semaine. L'écart avec l'estimation précédente (6 à 9 séances) vient du modèle de publication signée (comptes, publications, médias générés) et du fil social. Hypothèses : validations rapides des plans ; comptes (Vercel, Turso, Claude Console) créés par l'utilisateur quand ils sont demandés ; crédits API Max disponibles en P3 ; pas de blocage par une source. Estimation, pas engagement : réévaluée à la fin de chaque jalon. Les jalons après la V1 seront estimés quand leur découpage sera validé.

---

> **Mise à jour du 2026-10-30** : six comptes éditoriaux proposés (Nodi, Repo, Pyxo, Mova, Pulse, Radar) sur un même moteur. P3 ajoute le routage vers un compte principal ; P6 connecte les registres de Pulse et de Radar et le format « Sélection ». Impact : pas de nouvelle infrastructure, P6 s'allonge selon le nombre de sources retenues.

## P2 — Produits, versions, sources et maquette _(réalisé le 2026-10-30, maquette validée par l'utilisateur ; résultats dans PROGRESS.md)_

État des critères de sortie au 2026-10-30 : tests verts (178, dont le contrôle mot pour mot des citations des exemples) ✅ ; essai réel sur les 5 sources, seconde collecte sans doublon ✅ ; chaque release réelle rattachée à exactement une version (vérifié par requête SQL) ✅ ; registre des sources ([docs/sources.md](docs/sources.md)) ✅ ; maquette validée par l'utilisateur ✅. Écarts par rapport au plan : Codex CLI limité à 10 releases avec une limite de taille propre (≈ 350 fichiers joints par release) ; mode fixture restreint à une seule source ; migration 0002 (index d'intégrité du catalogue).

**Changement du 2026-10-30 (vision sociale).** La première maquette (fil de cartes d'actualité et fiche) est remplacée, avant validation, par une maquette du **fil de publications**, du **profil de l'agent éditorial** et de l'**espace Reels**, avec la fiche en approfondissement et les états. Les données réellement collectées, les **exemples rédigés pour la maquette** et les **fonctions prévues** y sont identifiés comme tels. Les exemples de publication ne reprennent que ce que disent les captures réelles, avec des citations contrôlées mot pour mot par un test.

**Résultat attendu.** Les documents collectés sont rattachés à des produits et à des versions identifiés ; plusieurs sources officielles sont collectées ; chaque annonce devient une « actualité » sans doublon ; une maquette du produit social est construite autour de la mascotte. Toujours sans IA dans le pipeline.

**Étapes**

0. Premier commit git de l'état P0–P1.
1. **Sources supplémentaires**, avec le même collecteur sécurisé :
   - releases GitHub officielles de `openai/codex` et `google-gemini/gemini-cli` (flux vérifiés le 2026-10-30) ;
   - un flux d'annonces de modèles et d'applications : OpenAI News (RSS officiel) et GitHub Changelog (RSS officiel, dont Copilot) — Anthropic ne publie pas de flux : lecture ciblée de sa page d'actualités reportée à P6, après vérification des droits.
2. **Lecteur de flux RSS / Atom** (`@rowanmanning/feed-parser`), mêmes garanties que l'API GitHub (liste blanche, taille, délai, validation).
3. **Modèle produit** : tables `product`, `product_version`, `news_item`, et liens actualité ↔ documents et actualité ↔ produits / versions ([ADR 0003](docs/decisions/0003-identite-produits-versions-actualites.md)).
4. **Création des actualités** : une release stable → une actualité de type « version » ; une entrée de flux → une actualité de type « annonce », non rattachée à un produit tant qu'elle n'est pas qualifiée (P3).
5. **Tests** : même annonce collectée deux fois → une seule actualité ; deux annonces distinctes sur le même produit → deux actualités ; entrée de flux republiée avec une nouvelle date → pas de nouvel événement ; source RSS en panne ou mal formée → données intactes.
6. **Maquette** (révisée le 2026-10-30) : fil de publications, profil de l'agent éditorial, espace Reels, fiche d'approfondissement et états, sur téléphone et ordinateur ; données réelles, exemples et fonctions prévues identifiés ; présentée pour validation avant P3.
7. **Communication** : COMPRENDRE_LE_PROJET.md, brouillons LinkedIn, STATE et PROGRESS ; registre des sources ([docs/sources.md](docs/sources.md)) et rôles des agents ([docs/agents-editoriaux.md](docs/agents-editoriaux.md)).

**Critères de sortie** : tests verts (dont les scénarios de l'étape 5 et le contrôle des citations des exemples) ; essai réel sur toutes les sources validées, seconde collecte sans doublon ; chaque release réelle rattachée à exactement une version de produit ; maquette validée par l'utilisateur.

**Hors P2** : analyse IA, qualification, publications réelles (P3), site réel (P4), planification et mise en ligne (P5).

**Coût** : 0 €.

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
