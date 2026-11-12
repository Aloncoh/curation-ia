# Historique

Évolution datée des jalons et des vérifications **réellement faites**. L'état courant est dans [STATE.md](STATE.md) ; les traces d'exécution détaillées sont en base.

## 2026-11-12 — Tri des titres par le modèle avant la sélection

- Demande : faire passer les gros sujets avant le flot d'actualités (« Oui, prépare-le »).
- Fait (ADR 0015, `src/analysis/tri.ts`) :
  - quand la file dépasse le lot, un appel trie jusqu'à 600 titres récents (3 jours) et choisit l'ordre d'examen ;
  - il ne publie ni n'écarte rien, et un échec ramène à l'ordre habituel ;
  - le tri est activé par la commande réelle, tracé dans `llm_call` (étape `tri`) et pris sous les plafonds existants.
- Vérifié : 8 tests sur fixtures (`tests/tri.test.ts`, faux modèle), et la suite complète, 875 tests, passe ; le typecheck passe aussi.
- Non vérifié : aucun appel réel, puisque le solde DeepSeek est épuisé (402). Le coût de 0,003 à 0,006 $ par lot reste une estimation.

## 2026-11-12 — Nouveautés absentes du fil : solde DeepSeek épuisé

- Demande : pourquoi l'affaire d'espionnage chez NVIDIA, Fable 5.2, Gemini, DeepSeek et Higgsfield avec Claude n'apparaissent pas.
- Constaté en base (lecture seule) :
  - Ces nouvelles sont collectées : 7 articles sur l'affaire NVIDIA, DeepSeek V4.1 Flash, les annonces Higgsfield (Flux 3, GPT Image 2.6, Micro Drama Ads), collectées le 11 à 18:08 grâce au nouvel ordre de la file.
  - Déjà en ligne : Fable 5.2 (n° 239, 223), Gemini 4 Carbon (n° 255, 258), Higgsfield (n° 238, 201).
  - Les 3 cycles depuis le 11 à 18:06 UTC sont en échec : 56 appels refusés par DeepSeek avec la réponse 402, « Insufficient Balance » d'après la documentation officielle consultée ce jour.
  - Même avant, 2 203 actualités collectées depuis le 8 n'avaient jamais été examinées (30 par cycle).
- Fait (commit 3570aea) : le bilan du cycle nomme le solde épuisé au lieu de « code de sortie 1 », et les étapes payantes suivantes du cycle sont sautées. 2 tests ajoutés ; 867 tests et typecheck passent. Regroupement des titres par sujet sans modèle essayé sur les 2 203 titres réels puis abandonné (groupes surtout faits d'expressions banales).
- Non vérifié : le nouveau motif dans un vrai cycle (prochain cycle planifié).

## 2026-11-11 — Passage fluide de l'accueil au réseau

- Demande : la page de démarrage n'était pas fluide quand on appuie sur un agent. Constat mesuré : le serveur répond en 0,6 à 1,3 s, et pendant ce temps rien ne bouge ; ensuite l'écran passe d'un coup du fond clair au réseau sombre. Aucune image perdue à 60 i/s (mesure dans Chrome).
- Fait : chaque agent de la rangée mène à sa page ; fondu entre les pages (View Transitions) ; le personnage cliqué devient la photo du profil ; la présentation automatique se met en pause au survol ; la page suivante est préparée dès le survol (speculationrules).
- Vérifié : en local, clic sur Mova → /comptes/mova sans erreur console ; 862 tests et le typecheck passent ; en ligne, la règle et la transition sont servies et le clic sur Nodi mène à sa page sans erreur. Non observé : la préparation au survol ne s'est pas déclenchée dans le Chrome piloté par l'extension (à revérifier dans un Chrome ordinaire).

## 2026-11-10 (soir) — Vidéos des sources sous les posts

- Demande : « ajouter des vidéos en dessous des posts visibles » ; option choisie : « Vidéos des sources ».
- Mesure avant développement, sur la base en ligne : seules 12 publications sur 123 citent une adresse vidéo dans leurs sources, et ces adresses ne sont pas toutes des vidéos du sujet.
- Détection construite (`src/media/video-source.ts`) :
  - lecteur YouTube ou Vimeo intégré, ou balise `<video>` de la page ;
  - ou la source elle-même quand c'est une vidéo YouTube ;
  - seuls un identifiant ou une adresse https sont gardés, jamais du HTML.
- Rattachement : média `external_embed`, sans migration. L'origine existait déjà dans le schéma. Les six lectures du « dernier média » l'excluent, donc le montage reste le média principal.
- Affichage : bouton à notre identité, lecteur d'origine seulement après le clic. Présent dans le fil et sur la page du post. Mention fr/en/he : éditeur, hébergeur réel, lien vers la page d'origine.
- Tests : 862 passent (8 nouveaux, sur données fabriquées). Types du cœur et du site vérifiés.
- **Essai réel :**
  - aperçu puis écriture sur la base en ligne : 5 vidéos sur 131 posts (n° 134, 158, 209, 235 et 243) ;
  - en ligne : la vidéo YouTube du n° 209 se lit dans la page ;
  - le fichier Meta du n° 134 se charge (aucune requête avant le clic) ;
  - le fil montre 2 blocs vidéo.
- Mise au point : le `main` local datait d'avant la réécriture de l'historique (ses 30 commits sont sur GitHub). Il est réaligné sur `origin/main` et l'ancien est gardé dans `ancien-main-local`.

## 2026-11-10 — Couverture élargie des six agents, chaîne rétablie jusqu'au fil

- **Claude Fable 5.2** confirmé à la source primaire : page d'Anthropic du 9 novembre 2026, et `claude-fable-5-2` dans la documentation des modèles. Parcours retracé :
  - collecté le 9 novembre vers 20 h 17 UTC, par AWS, GitHub Changelog et Hacker News (Anthropic n'a aucun flux) ;
  - le post Mythos 5.2 sur Bedrock a été publié (n° 214) ;
  - l'annonce principale est tombée en « sortie invalide », sans motif gardé (21 cas depuis le 7 novembre).

  Corrections : motif noté sur l'appel, une nouvelle demande, reprise des sorties invalides récentes ; plan de site d'Anthropic lu par Nodi ; sujets repris par plusieurs sources traités d'abord.
- **Cycles en échec** les 8 et 9 novembre :
  - collecte tuée à 10 min ;
  - découverte en échec pour un seul dépôt.

  Mesure : l'écriture en base prend 6,3 s par source, le réseau 0,4 s. Un essai à 8 files en parallèle a échoué sur la base en ligne (écritures concurrentes refusées) et a été retiré aussitôt. Retenu : la collecte s'arrête à 7 min (le reste passe au cycle suivant), et l'étape n'échoue que si toutes les sources échouent.
- **Sources** : 266 définies dans le code (91 avant). 175 ajoutées, flux testés en réel (`docs/sources.md` §3.12). Collecte réelle depuis le poste : 52 nouveaux flux collectés, 3 en échec, avec leur motif.
- **Découverte GitHub** : 47 thèmes répartis sur les six agents, trois fenêtres de dates, 100 résultats par requête, jeton d'Actions (limites vérifiées dans la documentation GitHub ce jour). Jeu de contrôle des 12 dépôts de l'utilisateur, absents des requêtes : 0/12 avant, 4/12, puis 6/12. 1 869 dépôts trouvés, 18 candidats (3 par agent).
- **Découvertes** : 90 en attente.
  - Deux lots réels de 5 : 6 rédigées, 1 planifiée (`microsoft/TokenEconomizer`, post n° 229), les autres « à vérifier » (copie de plus de 8 mots du README, réserve de la source non reprise), 0,063 $.
  - Élagage ajouté pour les éléments secondaires.
  - Rédaction réactivée à 2 par cycle.
  - Alerte « file qui vieillit » dans `npm run etat` ; bilan par agent : `npm run couverture`.
- **Mova** : deux dossiers par étapes, « Boîte à outils vidéo pour agents » (12) et « 3D et Blender pour agents » (8).
  - Dépôts vérifiés par l'API GitHub ; pistes de la planche rapprochées par auteur.
  - Deux pistes en chinois non retenues ; mention « 12/12 installed » non reprise.
  - Le site regroupe les ressources par étape (fr, en, he).
- Tests : 851 au vert (11 nouveaux).

## 2026-11-05 — Cap « réseau social vivant » : consolidation, maquette en ligne, latence mesurée

- Demande de l'utilisateur : pivot vers un réseau social vivant (SPEC §0), puis « le site actuellement ne donne pas envie » et « déploie la maquette aussi ».
- Maquette en ligne sous `/maquette/` (copiée au build, `noindex`), vérifiée dans le navigateur sur le déploiement `916a515`.
- Fil principal : les versions déjà remplacées n'y figurent plus (il s'ouvrait sur Claude Code 2.1.309 suivi de 2.1.318) ; vérifié sur les données Turso ; test ajouté.
- Latence des nouveautés après la mise en ligne (`npm run delais`) : 4 publications mesurables ; détection médiane 2,5 h, traitement 58 s, disponibilité 11 min. Cron : 6 exécutions planifiées en 25 h. Décision dans l'ADR 0006 : le cron ne convient pas ; choix d'hébergement soumis à l'utilisateur. Chaque cycle est désormais tracé en base.
- Prompt `p3-22` : aucune définition, même d'un terme rare ; aucune formule promotionnelle ; pas d'ouverture interchangeable.
- STATE réécrit (état actuel seulement), historique dans `docs/historique.md`, ROADMAP allégée (P8 et P9 avancés), SPEC §0, `docs/droits.md` (logos au premier plan contraires aux conditions d'Anthropic, Google et ElevenLabs ; fonds de 504 × 171 px trop petits), domaines relevés chez Vercel.
- Tests : 837 au vert ; types du site et du dépôt vérifiés.

## 2026-11-05 — P6, bloc 2b : rédaction des découvertes améliorée (toujours coupée en ligne)

- Cinq lots réels en local, mesurés un par un : 0 brouillon sans écart bloquant au départ, puis plus aucun écart bloquant de citation après le passage aux citations par numéro.
- Causes trouvées et corrigées : citations recopiées inexactement (numéros de passage), mots-clés trop longs, clés en trop dans les étapes, commandes citées comme passages, lignes de tableau trop courtes, révision réécrite en français (message de révision en français), repères trop longs, démarrage sans passages, grille trop indulgente (listes « awesome », recherches personnelles, utilité moyenne).
- Restent « à vérifier » : `contexte_a_relire` (une condition de la source absente du texte) et `copie_de_la_source`. Aucun brouillon publiable sans relecture ; la rédaction en ligne reste coupée.
- Dépense cumulée des essais : 0,19 $, comptée dans la base locale seulement. Tests : 799 au vert.

## 2026-11-05 — P6, bloc 2b : grille d1 et rédaction des découvertes (construit, pas encore en ligne)

- Sujets de découverte élargis à 17 à la demande de l'utilisateur (« pas seulement design et motion : skills, agents, IA… »).
- Agent des découvertes : grille `d1` notée par le modèle avec passages, décision du code, rédaction r2, une révision, import dans la chaîne des ressources. Étapes `decouverte` (toutes les 6 h) et `redaction_decouvertes` (payante) ajoutées au cycle. Un montage absent du serveur n'est plus servi comme image cassée : la publication garde sa couverture.
- Essai réel en local (DeepSeek Flash, 6,7 centimes, comptés dans la base locale seulement) :
  - grille : 8 dépôts notés, coût moyen 0,2 centime ; 2 écartés par le code avant tout appel (README en chinois) ; 2 outils pour téléviseurs retenus à tort, d'où le champ `domaine` ajouté (prompt `d1-2`) ;
  - rédaction : causes des refus enregistrées par champ ; mots-clés trop longs corrigés (retirés par le code, consigne précisée) ; restent des citations introuvables et des noms ou chiffres absents des citations. 0 brouillon publiable sur 5 : rien n'a été publié.
- En ligne : la rédaction payante reste coupée tant que le taux de réussite est insuffisant. Tests : voir le dernier passage de la suite.

## 2026-11-05 — P6, bloc 2a : découverte automatique de dépôts GitHub

- Seuil choisi par l'utilisateur : 100 étoiles, lu dans le réglage `decouverte.seuil_etoiles` (SPEC §7.3 ter mise à jour).
- `npm run ressources -- decouvrir` : recherche GitHub sur six sujets (skills, MCP, Claude Code, agents), dépôts créés depuis 30 jours ; le code revérifie le seuil et écarte archives, forks et dépôts connus. Avec `--capturer`, les candidats entrent dans la chaîne des ressources pour Repo, décision `approfondir` (motif `grille_d1_a_faire`) : rien n'est rédigé ni publié.
- Essai réel en local : 60 dépôts trouvés, 8 candidats listés, 4 capturés (`day-trader-skill`, `pixelfx`, `founder-skill`, `huashu-motion`). Constat : la recherche par sujet ramène aussi des dépôts hors sujet (un outil pour téléviseurs étiqueté `claude-code`) : c'est le rôle de la grille `d1`.
- Tests : 788 au vert (5 nouveaux).

## 2026-11-05 — P6 lancé : regroupement multi-sources (bloc 1)

- Plan de P6 validé par l'utilisateur (« Oui, lance P6 »). Bloc 1 réalisé ([ADR 0014](docs/decisions/0014-regroupement-multi-sources.md)) : à la collecte, une annonce sur le même sujet qu'une annonce récente d'une autre source la renforce au lieu de créer une actualité ; ses documents apparaissent dans les sources du post.
- Mesuré sur la base locale (754 annonces) : la première règle donnait 35 paires dont 32 fausses ; la règle retenue en donne 3, toutes justes.
- Tests : 783 au vert (dont 3 nouveaux : règle sur des titres réels, collecte de deux flux sur le même sujet, seconde collecte sans effet). Pas encore observé en ligne : il faut qu'une annonce arrive par deux sources.
- Radar élargi le même jour : flux Google, Samsung, Intel, Shopify ; rubriques TechCrunch et The Verge pour Tesla, TSMC, Qualcomm, Broadcom, Oracle et LG.

## 2026-11-05 — P5 : mesures en ligne, logo animé

- Logo central de l'accueil (maquette) : à chaque tour, ses yeux et sa lueur prennent la couleur de l'agent suivant (Nodi, Repo, Pyxo, Mova, Pulse, Radar) ; six couleurs relevées en navigateur, une par tour de 6 s.
- `logo.svg` ajouté aux fichiers déployés ; vérifié en ligne (200, `image/svg+xml`). 778 tests au vert. Poussé sur `main` (`1380db3`).
- FTS5 essayé sur la base Turso hébergée : il fonctionne (ADR 0008).
- `npm run delais` sur la base en ligne : 4 publications mesurables sur 35, médiane d'environ 6 jours, due au stock copié. Le délai réel de la chaîne reste non mesuré.

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

## 2026-10-30 — P2, vision sociale : maquette révisée (en cours : maquette à valider)

- Décisions de l'utilisateur : réseau social visuel avec agents éditoriaux IA ([ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)) ; orientation de la feuille de route révisée validée, P6–P14 prévisionnels ; langue du navigateur parmi les langues disponibles (langues du lancement à valider) ; exemples clairement signalés.
- **Exemples vérifiés** (`src/maquette/exemples.ts`, `verifierExemple` dans `src/maquette/data.ts`) : 4 exemples rédigés par Claude Code, rattachés à leur actualité réelle ; chaque passage cherché mot pour mot (espaces normalisés, mots entiers) dans le texte brut de la dernière capture du document, qui doit venir d'une collecte réelle ; chaque nombre d'un texte doit figurer dans ses passages ; le titre du média doit nommer l'actualité. Sur la base réelle : **50 passages sur 50 retrouvés**, 4 exemples vérifiés, 0 introuvable (`npm run maquette`, [sortie](communication/linkedin/04-vision-sociale/preuves/brut/maquette.log)). Tests : collecte « live » servie par les fixtures des 3 sources citées → 4 exemples, toutes citations retrouvées ; passage modifié → « à vérifier » ; document absent ou capture de fixture → introuvable ; diapositives sans affirmation ajoutée.
- **Reel d'exemple** (`npm run maquette:reel`, macOS) : vidéo 720 × 1280 de 47,3 s, 4 segments dont le texte est celui des champs vérifiés de l'exemple Copilot Fusion, voix de synthèse « Flo », 14 sous-titres WebVTT placés au-dessus des mentions ; ffmpeg 9.0.2 local. Défauts vus sur les images rendues et corrigés : point médian absent de la police (carré), texte long chevauchant la mascotte (mise en page calculée sur la hauteur disponible).
- **Maquette sociale** (`maquette/index.html`) : fil de publications, publication détaillée (citations et contrôle), profil `@veilleuse` (publications, Reels, méthode, sources, comptes envisagés), Reels (vidéo hébergée + emplacements « prévu »), actualités collectées, fiche, états, sélecteur de langue ; légende réel / exemple / prévu. Vérifiée dans le navigateur intégré : ordinateur (sombre et clair), 375 px (clair, aucun débordement horizontal), ordre de tabulation, carrousel aux flèches, lecteur au clavier (espace, M, C), lecture réelle de la vidéo et des sous-titres, négociation de langue (préférences fr puis en-US/he-IL simulées → français, langue de secours ; choix manuel conservé puis retiré). Défauts trouvés et corrigés pendant ces essais : collision de classe CSS (`.reel`), onglets du profil vides (tableau imbriqué), texte des emplacements débordant, boutons du carrousel masquant le texte à 375 px. Pas d'audit axe-core (prévu en P4).
- **Recherche sur les accès aux sources** : 6 thèmes (X et Reddit, écosystème IA et dev, flux officiels, incidents et design, médias, langues et cadre légal), 203 constats, chacun contre-vérifié par un second agent sur la page officielle : 166 confirmés, 35 corrigés, 2 invérifiables ([JSON](communication/linkedin/04-vision-sociale/preuves/brut/recherche-sources-2026-10-30-contre-verifiee.json)) ; registre [docs/sources.md](docs/sources.md).
- **Relecture adversariale** du code de la séance (5 angles : exactitude, règles produit, accessibilité, sécurité, tests ; chaque constat contre-vérifié par un second agent) : 46 constats, **28 confirmés**, 18 écartés ; tous corrigés. Principaux : un passage coupé au milieu d'un mot était « trouvé » (« available » dans « unavailable », « scored 6 » dans « scored 60 ») → recherche bornée aux mots entiers ; exemples écartés selon la même règle que le fil (dernière capture non réelle) ; textes d'exemples qui disaient plus que leurs passages (« trois niveaux », « à deux points de » pour « within two points of », « depuis le chat ») → passages ajoutés ou textes resserrés, nouveau contrôle des nombres ; mention « Analyse IA à partir des sources » absente des Reels et de la vidéo ; signature des médias sans badge « Agent IA » ; accessibilité (focus masqué par la barre du bas, états actifs invisibles en mode sombre, contrastes de l'anneau de focus et de l'étiquette « Réel », nom accessible du sélecteur de langue, titres des pages d'erreur, annonces fictives sur la page États) ; un test tautologique remplacé, garde-fous contre une vidéo ou des données de maquette périmées (empreintes SHA-256). Aucune vulnérabilité confirmée (contenus insérés comme texte, `execFile` sans shell, `drawtext` par fichier).
- **Contre-relecture des corrections** (2 agents) : 27 corrections confirmées sur 30 contrôles, 3 partielles, 15 nouveaux points mineurs, tous traités : séparateurs décimaux (« Opus 5 » était trouvé dans « Opus 5.5 ») ; virgule décimale française ; libellés de détail limités à une liste fermée ; plan de dessin du Reel sorti dans une fonction pure testée (chaque image porte les deux mentions) ; nuances rétablies dans les exemples (« si besoin » / « when needed », « dont il n'a vu que le début », « dans les sessions cloud », filigrane « visible », « annoncés bientôt », paramètres gérés Enterprise, clients où essayer la génération d'images, auteur de l'évaluation non précisé par l'annonce) ; style des titres d'erreur ; espace avant « ↗ ». Limite connue : les nombres écrits en lettres ne sont pas contrôlés automatiquement.
- Tests : **178 réussis** (150 au début de la séance), vérification des types OK.



## 2026-10-30 — P2 : quatre comptes, médias pertinents, fil allégé (maquette à valider)

- Fait : profils Nodi, Repo, Pyxo, Mova ; publications réparties ; 6 exemples + 1 projet GitHub mesuré ; médias originaux dont les éléments sont cités ; cartes allégées ; contrôles déplacés vers le détail et les coulisses ; sujets sans collecte signalés.
- Vérifié : `npm run maquette` (6 vérifiés, 0 à vérifier), `npm test`, `tsc`, fil en largeur ordinateur, fil, profil et Reels à 375 px sans débordement.
- Non fait : commit ; validation visuelle ; audit d'accessibilité automatisé ; profil et Reels vus seulement à 375 px.

- Ajout de Pulse : profil, fiche incident vide, registre de sources (1 connectée, 1 partielle, 6 à intégrer), publication unique par actualité documentée.

- Format « Sélection » ajouté à la couverture et documenté (hors V1, P6) ; aucun exemple rédigé.

- Ajout de Radar : profil, registre de sources, exemple GitHub Enterprise, filtre par auteur, une publication principale par actualité.

- 2026-10-30 : maquette P2 validée par l'utilisateur ; P2 terminé.

## 2026-10-30 — P3 (en cours, sans dépense)

- P2 fusionné après tests, types et `npm run maquette`.
- Fait : migration 0003, budget réservé avant appel, qualification, attribution, code des brouillons, contrôles de soutien et de contexte. À cette date, seuls le budget, la pause, l'écartement et les sorties invalides avaient tourné sur faux modèle (rédaction couverte le 2026-10-31).
- Non fait : aucun appel réel ; adaptateur Anthropic compilé mais jamais exécuté.
- Radar : exemple trop niche réattribué à Pyxo, format photo et gros titre documenté.

- Radar : source `feed:google-gemini` collectée en réel, exemple Gemini 4 Carbon avec photo créditée du Press Corner.

## 2026-10-30 — P3 : écosystème IA et créatif (en cours)

- Recherche sur 6 domaines et contre-vérification indépendante (12 agents) ; recommandations revues au regard du code.
- 18 flux officiels ajoutés : collecte réelle réussie, 329 documents, seconde collecte sans doublon. DeepMind reporté (gzip non demandé).
- Brouillons : accès, coût, nature, date, niveau de preuve ; contrôle `attribution_manquante` ; prompt `p3-2`. 199 tests au vert sur fixtures ; aucun appel réel au modèle.
- 2026-10-31 : l'utilisateur a refusé de déposer la demande d'accès à Reddit. Claude Code a pris ce refus pour un retrait du cadrage, sans que cela ait été demandé, puis a rétabli Reddit le jour même à la demande de l'utilisateur, en source différée avec motif et conditions de reprise (`docs/sources.md` §3.7).
- 2026-10-31 : collecte réelle des 24 sources sur une copie de la base : 24 réussites, 15 nouveaux documents, 14 nouvelles actualités, 28 nouvelles captures de documents déjà connus, soit 43 captures au total ([sortie brute](communication/linkedin/05-ecosysteme-creatif/preuves/brut/collecte-reelle-2026-10-31-copie-de-base.txt)). `llm_run`, `llm_call` et `post_draft` vides : aucun brouillon réel ([relevé](communication/linkedin/05-ecosysteme-creatif/preuves/brut/etat-reel-2026-10-31.txt)).
- 2026-10-31 : une source retirée du registre (DeepMind) n'est plus présentée comme suivie par la maquette ; le bandeau date les données par la dernière collecte.
- 2026-10-31 : relecture indépendante avant commit (4 angles, 8 agents) : 40 constats confirmés, 3 rejetés. Contre-vérification des corrections (2 agents) : 18 constats de plus, surtout des corrections incomplètes, traités ensuite et vérifiés par tests et mutations, sans troisième relecture indépendante. Corrigés : textes périmés ou trop affirmatifs, statut de Reddit, schéma envoyé à l'API, injection par le contenu collecté, citations trop courtes, attribution, nom du produit transmis au modèle, captures inexploitables, secrets masqués dans les traces, lecture de `.env.local`, test de la rédaction de bout en bout sur faux modèle (`p3-3`). Non traités, listés dans STATE.md : compléments de P3 et fiabilisation avant le premier lot réel. Réaction réelle de l'API au schéma toujours non vérifiée. Bilan : 240 tests au vert sur fixtures et faux modèle, types OK, 23 mutations du code de P3 toutes détectées, maquette contrôlée dans le navigateur.

## 2026-10-31 — P3 : fiabilisation et publication non publiée (en cours)

- Lots : exécution unique avec bail, clôture des exécutions interrompues, relance sans repayer la qualification, réponses tronquées et refus distingués, reprise sur erreur de comptage et sur base verrouillée, second tarif de Haiku (revérifié le 2026-10-31 sur la page officielle), dépassement de réservation visible.
- Brouillons : `details`, `attributions`, `diapositives` (références à des champs, jamais de texte nouveau), `categories`, `produit`, `version_cible` ; prompt `p3-4`. Contrôles ajoutés : « sources contradictoires » (`src/analysis/valeurs.ts`), média non conforme, auteur et produit introuvables, cri en majuscules.
- Publication : migration 0004, tables `account`, `post`, `post_revision`, `post_source`, `media_asset` ; création dans la transaction du brouillon ; rien n'atteint `publie`. Les tests ont révélé qu'un `CHECK` SQLite laissait passer une mention vide : corrigé (`is` au lieu de `=`).
- Relecture indépendante du bloc (2 angles, 4 agents) : 22 constats confirmés, 3 rejetés, tous traités. Le plus grave, reproduit avec le vrai SDK : une rédaction tronquée doublée à 24 000 tokens était refusée avant l'envoi, ce qui bloquait le lot et repayait à chaque relance ; l'appel passe en flux, testé avec le vrai SDK et un réseau simulé. Aussi : bail perdu, expressions régulières quadratiques, titre collecté retiré du média, benchmarks, copie de la source, citations à cheval sur titre et texte, documents alignés.
- `npm run brouillons:relire` : document de relecture avec écarts et coût enregistré ; prompt `p3-5`.
- Bilan au commit `fb359af` : 324 tests au vert sur fixtures et faux modèle, types OK, 74 mutations du code de P3 toutes détectées. Aucun appel réel, aucune dépense.
- Relecture ciblée des derniers correctifs : 2 défauts importants et 9 mineurs. Corrigés : battement de bail qui perdait une écriture après un verrou, balises encore possibles dans le bloc de données, surcharge en plein flux, marge de budget sur une réponse tronquée, décimales de prix, écritures d'une même version, faux positifs sur les pourcentages, la réserve et les formats de fichier, tests renforcés. Gardé volontairement : un refus 400 arrête le lot.
- Bilan : 346 tests au vert, types OK, 12 mutations de plus toutes détectées (86 au total), chaîne rejouée sur une copie de la base. Ces dernières corrections n'ont pas eu de nouvelle relecture indépendante.
- Essai de la chaîne sur une copie de la base avec un faux modèle : 327 actualités traitées, 66 laissées de côté, 0 exécution restée en cours ([relevé](communication/linkedin/05-ecosysteme-creatif/preuves/brut/essai-chaine-faux-modele-2026-10-31.txt)). Texte artificiel : cela ne dit rien de la qualité. Aucun appel réel, aucune dépense.

## 2026-11-01 — Comparaison de Haiku et DeepSeek Flash : prête, non lancée

- Demande : comparer les deux modèles sur un même lot réel, 1 $ au plus. **Aucun appel réel fait** : ni clé Anthropic, ni clé DeepSeek, ni compte DeepSeek.
- Vérifié sur les pages officielles : `claude-haiku-5-5` (0,10 / 0,50 $, cache 0,01 $), `deepseek-flash` (0,15 / 0,60 $ en heures creuses, double en heures pleines, cache 0,003 $), API Responses de DeepSeek. Non établi : schéma imposé par DeepSeek, raisonnement compté dans `output_tokens`.
- Construit : `src/comparaison/`, `npm run comparaison`, adaptateur DeepSeek, table `comparaison_sortie` (migration 0008, appliquée après sauvegarde), cache des consignes pour Haiku, tarifs à heures pleines, masquage des clés `sk-`, `.env.example`. ADR 0009, règle de choix fixée avant tout résultat.
- Lot : 24 sujets du jeu de développement, 21 analysés, 42 appels par modèle. Coût estimé sans cache au tarif le plus haut : 0,02 $ pour Haiku, 0,05 $ pour Flash.
- Tests sur simulation seulement, marqués comme tels : 544 au vert, types OK, 13 mutations détectées sur 13 après correction de deux tests trop faibles. Ces tests ne valident aucun modèle.
- Saisie guidée `npm run cles` : 557 tests au vert ; masquage vérifié dans un vrai pseudo-terminal avec des clés factices, aucune affichée, fichier en 600. Accord de l'utilisateur pour l'envoi d'annonces publiques à DeepSeek. Crédits Max vérifiés : liaison sur claude.ai, sans carte, 7 jours sur le plan, requêtes arrêtées à épuisement.

## 2026-11-01 — Harmonisation avec l'expérience cible (P3 toujours en cours)

- Avancement vérifié : `post_draft`, `post`, `llm_run`, `llm_call` et `selection_avis` vides, collection `avis` vide, pas de `.env.local` ; P3 n'est pas terminé.
- Documents : SPEC (§2, §3.1, §3.5, §7.3 ter, §7.15, §7.16, §10, §11, six comptes, médias de la V1), ROADMAP (P3 à P6, P9, P12), docs/agents-editoriaux.md, docs/delais.md, docs/budget-modeles.md, docs/sources.md, COMPRENDRE_LE_PROJET.md §16. ADR 0008 proposée, complément de l'ADR 0005.
- Moteur, sans appel : `exemple_usage`, `prerequis`, deux catégories, contrôle `essai_non_realise`, prompt `p3-9` ; délai de bout en bout dans `npm run delais`. Essais réels de ces champs : aucun.
- Essai local de FTS5 avec `@libsql/client` (SQLite 3.45.1) : accents ignorés ; « sécuriser » ne trouve pas « sécurité » ; une saisie brute provoque une erreur. Documentation Turso lue le 2026-11-01 : contradictoire sur FTS5 pour une base hébergée, non établi.
- Repère GitHub sans jeton, 4 requêtes : dépôts « mcp » créés depuis 90 jours, 798 à 50 étoiles et plus, 230 à 200, 102 à 500, 55 à 1 000.
- Bilan : 519 tests au vert, types OK. Pas de relecture indépendante de ces changements.

## 2026-11-01 — P3 : sélection, délais, budget et montages (en cours)

- Recherche sur 4 sujets contre-vérifiée (8 agents) : tarifs et conditions DeepSeek, limites de détection, formats et droits des visuels. Aucun appel à l'API DeepSeek, aucun compte, aucune clé.
- Sélection (ADR 0005) : quatre critères, décision par le code, statut `a_approfondir`, consignes versionnées, corpus figé de 60 sujets, avis humains et évaluation appariée. Trois juges Claude Code : s1, 21/24 unanimes ; s2, 20/24 et 28/36. Les précisions de s2 n'ont pas amélioré l'accord.
- Délais (ADR 0006, proposée) : sonde réelle de 91 minutes, 1 920 requêtes, 0 erreur, 1 entrée nouvelle, aucun délai de détection mesurable ([rapport](communication/linkedin/06-selection-delais-visuels/preuves/brut/delais-2026-10-31.md)). Chaîne locale : 7 ms par actualité sur faux modèle.
- Budget : estimation par `npm run budget`, tailles mesurées sur nos textes ([rapport](communication/linkedin/06-selection-delais-visuels/preuves/brut/budget-2026-10-31.md)). Aucun coût réel.
- Montages (ADR 0007) : 7 gabarits rendus par Chrome local, champ `reperes` ajouté au brouillon (prompt `p3-8`), détourage essayé avec Apple Vision, 8 exemples rendus sans défaut.
- Relecture indépendante (3 angles, 9 agents) : 54 constats. Sur les 6 contre-vérifiés, 6 réels, dont 2 ramenés de bloquant à important. Corrigés, entre autres : date future comptée comme détection rapide, brouillons mélangés aux sujets écartés dans la préparation, crédit non contrôlé, débordement des fiches non vu, requalification qui laissait une décision périmée, doute du modèle ignoré, jeu d'évaluation mêlé aux corrections. Restent en limites documentées : date de mise à jour d'un flux Atom prise pour une date de sortie, attente fixe de 15 minutes après un refus de débit, corpus plus large que ce que traite le moteur.
- Contre-relecture des corrections (2 agents) : 15 constats de plus, dont une requalification qui écrasait une ligne déjà vue, une publication à tort hors des sujets appariés et quatre images non signalées comme exemples. Traités, sauf l'image tronquée lisible par le navigateur, gardée en limite. Ces dernières corrections n'ont pas eu de nouvelle relecture indépendante.
- Bilan : 509 tests au vert, types OK ; 252 décisions enregistrées inchangées sous les garde-fous corrigés. Page de revue publiée en privé, écriture et lecture de sa collection `avis` vérifiées par un essai retiré ensuite ; le clic réel sur la page n'a pas été essayé. Aucune dépense.



**Résultat réel du 2026-11-01** (21 sujets, heures creuses) : dépense réelle 0,083 $ (Haiku 0,061 $, Flash 0,022 $). Valides du premier coup : Haiku 42/42, Flash 40/42. Latence de rédaction p50 : 14,8 s contre 5,8 s. Relecture à l'aveugle par un seul agent, sur 19 sujets : fidélité 4,6/5 contre 3,9/5, clarté 3,2/5 contre 3,7/5, éléments inventés ou erronés 3 contre 13. Recommandation : Haiku par défaut, décision de l'utilisateur attendue. Aucun des deux n'est publiable sans contrôle. Défaut trouvé : schéma `Brouillon` refusé par la grammaire d'Anthropic, désormais donné en consigne et validé par Zod (`imposerSchema`, sans test dédié).


## 2026-11-02 — volume, priorités, clarté, mobile

Plafond de 20 publications par jour, sans quota ; ordre de priorité ; objectif de la minute rétabli ; consignes `s3`, prompt `p3-10`, fonction de priorité (558 tests au vert, types OK, aucun appel au modèle) ; ADR 0010 proposée, exigences Apple, Google, PWA et Expo relevées le 2026-11-02.

## 2026-11-02 — Chaîne des ressources, recherche et maquette façon X (P3 toujours en cours)

- Demande de l'utilisateur : publier les ressources de sa liste (20 du fil X de @Slonski_rt, puis ECC), retrouvables par une recherche, avant P6. [ADR 0011](docs/decisions/0011-chaine-des-ressources.md) ; migrations 0009 et 0010 ; commande `npm run ressources -- capturer|source|verifier|importer|chercher|planning`.
- Rédaction : 21 brouillons écrits par Claude Code pendant le développement, selon la règle de ton (prompt `p3-11`), sans appel au modèle. Origine enregistrée et affichée comme telle.
- Relevé de la base locale (lecture seule, 2026-11-02) : 21 publications `en_attente`, aucune publiée ; 21 brouillons `controle_automatique` ; 69 vérifications de bouton réussies par l'API GitHub entre 15:33 et 18:46 UTC, toutes « Voir le dépôt » ; 1 088 mots-clés (nom 54, catégorie 54, usages 310, technologies 284, termes proches 386) ; 21 publications dans l'index plein texte ; planning sous le plafond, 15 le 2026-11-02 et 6 le 2026-11-03, aucune sur la réserve des nouveautés prioritaires ; 6 imports tracés « aucun appel au modèle ». 21 visuels dans `maquette/medias/montages/ressources/`.
- Recherche, mode aperçu, essayée sur la base : « mémoire » 3 résultats, « code review » 1, « motion design » 1 seul (frontend-design), « sécuriser » 0 ; en mode public, 0 résultat, puisque rien n'est publié. « motion design » devait retrouver plusieurs ressources (SPEC §7.15) : écart constaté, non corrigé.
- Maquette : disposition façon X (logo et navigation à gauche, profil de l'utilisateur en aperçu, « Plus » pour Coulisses et États, recherche collante en haut, colonne « À suivre »), post réduit (« Voir plus », bouton vers le dépôt au-dessus de l'image, « Afficher les commentaires » avec état vide, partager, ligne de mention IA et lien « Sources »), mots-clés invisibles, `maquette/recherche.js` généré depuis le moteur partagé. Données régénérées par `npm run maquette` (fichiers du 2026-11-02, 20:47).
- Documents : décisions et retours d'interface du 2026-11-02 reportés dans SPEC (§2, §3.1, §3.3, §6 bis, §7.2, §7.3 ter, §7.4, §7.7, §7.8, §7.12, §7.15, §8) et CLAUDE.md (valeur absente masquée).
- Vérifié : `npm test`, 682 tests au vert, dont ceux de la chaîne et de la recherche (`tests/ressources-*.test.ts`, `tests/recherche.test.ts`),, et `npm run typecheck` OK.
- Non fait : revue dans le navigateur de la dernière version de la maquette pendant cette mise à jour des documents ; relecture indépendante de la chaîne ; publication réelle (P5) ; commit.


## 2026-11-02 — premier lot réel de brouillons

DeepSeek Flash, 30 actualités, 34 appels, 0,0125 $ (budget autorisé 4 $). 19 écartées, 7 à approfondir, 1 sortie invalide, 3 brouillons. Relus par l'utilisateur : les 3 sont validés ; condition de la publication automatique remplie (SPEC §7.4). `brouillons:relire` corrigé (découvertes exclues). 683 tests au vert.

## 2026-11-03 — P4 site social construit en local (en cours)

- Point de départ : `b698ffa` sur `p3-brouillons`. Base sauvegardée (`exports/curation-avant-p4.db`), puis migration 0011 (`post_traduction`). [ADR 0013](docs/decisions/0013-site-api-traductions.md).
- **Construit** :
  - espaces de travail npm : `apps/web` (Next.js 16.4.4, React 19.3.1), `packages/contrat` (schémas Zod de l'API v1), `packages/textes` (catalogues en, fr, he, choix de la langue repris de la session mobile) ;
  - API v1 (`src/api/v1`) : fil paginé par curseur, publication, comptes, recherche ; les lecteurs de la maquette acceptent une liste d'identifiants ;
  - pages : fil, publication, profils, comptes, Explorer et recherche ; manifeste et icônes ; routes à liste fermée pour les montages et les avatars ;
  - étape `npm run traduire` (option `--recontroler` sans appel) et contrôle des traductions par le code (`src/traduction/`) ;
  - `src/media/rendu.ts` calcule désormais son chemin sans `new URL(gabarit, import.meta.url)`, que Turbopack ne sait pas résoudre ; même résultat pour les commandes.
- **Défaut trouvé par les tests et corrigé** : le nom cliquable d'un site de sélection n'était pas recontrôlé à l'affichage. React bloquait le `javascript:`, mais émettait quand même le lien.
- **Lot réel de traduction** (DeepSeek Flash, 2026-11-03, 08:22–08:27 UTC, heures pleines, plafonds de 0,20 $ par exécution et de 3,99 $ au total) :
  - premier passage : 64 traductions (32 publications × fr, he), 58 valides, 6 écarts, 0 erreur, 0,0302 $ ;
  - deux reprises des écarts (0,0022 $ et 0,0016 $), avec entre les deux un recontrôle gratuit après correction d'un faux positif (« Rated » pris pour un nom propre) ;
  - résultat : **61 valides, 3 écarts fondés**, affichés en anglais ;
  - total : **74 appels, 40 091 tokens d'entrée, 21 000 de sortie, 0,0340 $**, soit environ 0,0011 $ par publication pour les deux langues (estimation de l'ADR 0012 : 0,0015 $) ;
  - DeepSeek en base : 0,2568 $, plus 0,0099 $ hors base, sur 4 $ autorisés.
- **Vérifié** :
  - `npx vitest run` : 751 tests au vert, dont 34 nouveaux (traduction, API v1, langues, rendu du site : hébreu de droite à gauche, langue de secours, choix mémorisé, « Voir l'original », `<img onerror>`, `javascript:`, chemins des médias) ;
  - `npm run typecheck`, `npm run web:typecheck` et `npm run web:build` réussis ;
  - navigateur intégré, en, fr et he, sur ordinateur et à 375 px : langue du navigateur, choix mémorisé par cookie après rechargement, page en miroir en hébreu, « Voir l'original » dans les deux sens, profil, recherche ;
  - axe-core 4.14.0 : 0 violation sur 36 vues (6 pages × 3 langues × 375 et 1 280 px, thème clair).
  - Preuves : `communication/linkedin/07-site-trilingue/preuves/brut/`.
- **Non fait** :
  - fiche d'approfondissement et historique des versions ; carrousels à plusieurs images ;
  - texte alternatif traduit ; thème sombre audité ;
  - police hébraïque (décision de l'utilisateur) ; relecture native de l'hébreu ;
  - installation réelle sur un téléphone (seul le manifeste est servi et vérifié) ;
  - mise en ligne (P5).

## 2026-11-03 — P4 terminé (site social, en local)

- Demande de l'utilisateur, transmise par la session principale : « finis les 4 éléments ; tu as compris que les écritures en hébreu en fonction du système ».
- **Construit** :
  - fiche d'approfondissement (`/p/:id/fiche`, `/api/v1/publications/:id/fiche`) avec historique des révisions et versions du produit suivi ;
  - carrousels de diapositives dessinés par le site pour les 10 actualités ;
  - traduction de la fiche et du texte alternatif, servies par partie (post, fiche, texte alternatif) ;
  - `npm run traduire` complète une traduction existante champ par champ ;
  - hébreu en police du système (`:lang(he)`, sans police embarquée) — interprétation à confirmer par l'utilisateur.
- **Contrôle affiné sur les écarts réels**, puis recontrôle gratuit :
  - deux-points compté comme début de phrase (« Étape 1 : In Claude Code… » faisait de « In » un nom propre) ;
  - un original déjà en français peut rester identique en français.
- **Lots réels** (DeepSeek Flash, 08:43–08:50 UTC, heures pleines, plafonds de 0,30 $ puis 0,10 $ par exécution et de 3,99 $ au total) :
  - complément : 64 appels, 0,0446 $ ; reprise des écarts : 17 appels, 0,0029 $ ;
  - traductions de P4 en tout : 155 appels, 0,0815 $ ;
  - couverture servie : en français, posts 32 sur 32, fiches 30 sur 31, textes alternatifs 22 sur 22 ; en hébreu, posts 31 sur 32, fiches 26 sur 31, textes alternatifs 22 sur 22 ;
  - DeepSeek en base : 0,3043 $, plus 0,0099 $ hors base, sur 4 $ autorisés.
- **Défauts trouvés et corrigés** :
  - fonctions passées d'un composant serveur au carrousel client ;
  - `<li role="group">` dans une liste et rôle `region` sur `<figure>` (relevés par axe-core) ;
  - bloc de commande défilant inatteignable au clavier ;
  - « Licence · Non renseigné » affiché à côté d'une licence propre connue.
- **Vérifié** :
  - 759 tests au vert ; `typecheck`, `web:typecheck` et `web:build` réussis ;
  - axe-core 4.14.0 : 0 violation sur 96 vues (8 pages dont 2 fiches × 3 langues × 375 et 1 280 px × thèmes clair et sombre) ;
  - parcours au clavier complet d'une publication ;
  - navigateur intégré, en, fr et he : fiche traduite avec « Voir l'original », carrousel (bouton et défilement), langue mémorisée.
  - Preuves : `communication/linkedin/07-site-trilingue/preuves/brut/`.
- **Critères de sortie de P4 remplis** : API v1, site installable (manifeste servi), fil, publication, profils, fiche, historique des versions, montages, images et carrousels rendus par le code, trois langues avec traduction et « Voir l'original », critères 7.4 (texte brut ou assaini testé avec `<img onerror>` et `javascript:`, axe-core, clavier, 375 px). **P4 clôturé.**
- **Non fait, hors critères** :
  - relecture native de l'hébreu ;
  - installation réelle sur un téléphone ;
  - liens entre publications et produits suivis (versions masquées pour les 32 publications prévues) ;
  - mots anglais laissés par la traduction, non détectés.
- Plan de P5 proposé dans ROADMAP.md, rien n'est déployé.

## 2026-11-03 — P5 préparé en local (rien n'est déployé)

- **Décision de l'utilisateur**, transmise par la session principale : « Actions, 5 minutes ». [ADR 0006](docs/decisions/0006-delai-de-publication.md) mise à jour :
  - l'objectif d'une minute n'est pas atteignable avec ce choix ;
  - GitHub ne garantit pas l'heure d'un cron (documentation consultée le 2026-11-03) ;
  - cron aux minutes 2, 7, …, 57.
- **Construit** :
  - `src/publication/publier.ts` et `npm run publier` : passage de « en attente » à « publiée » par une mise à jour conditionnelle, dans une transaction qui recompte le plafond du jour ; vérification mot pour mot refaite avant publication ; `doublon_possible` (même produit et même version, ou titres similaires à 0,8 ou plus sur 7 jours) ; `obsolete` (actualité prévue depuis plus de 2 jours) ;
  - `src/pilotage/pilotage.ts` et `npm run lancer`, `etat`, `couts` : sources dues seulement, approfondissement au plus une fois par heure, étapes payantes sautées sans clé ni plafonds, plafond par jour (`CURATION_PLAFOND_JOUR_USD`), pause vérifiée avant chaque étape, bilan dans `chaine.dernier_cycle` ;
  - `src/db/copie.ts` et `npm run turso:copier` ;
  - connexion Turso par `DATABASE_URL` et `DATABASE_AUTH_TOKEN` (commandes et site) ;
  - `.github/workflows/chaine.yml` et `verifications.yml` ;
  - `apps/web/vercel.json`, fichiers montages et avatars inclus au build, `racineDepot()` pour un site lancé depuis `apps/web`.
- **Défaut de conception relevé et traité** : la collecte ignorait l'intervalle propre à chaque source ; le cycle ne collecte plus que les sources dues.
- **Constat de test** : deux cycles dans un même processus Node se bloquent sur le verrou SQLite, dont l'attente est synchrone. La concurrence réelle se teste donc entre deux processus ; en production, GitHub n'en lance qu'un à la fois.
- **Vérifié** :
  - `npx vitest run` : 777 tests au vert, dont les nouveaux (publication 7, pilotage 6, copie 3, site 2) ; types et `next build` OK ;
  - copie réelle de `data/curation.db` vers un fichier vide : mêmes nombres de lignes (49 publications, 64 traductions, 595 captures, 555 appels, 32 lignes d'index) ;
  - `npm run publier` sur cette copie jetable : 20 publiées (le plafond), 0 au second passage ;
  - `data/curation.db` : toujours 0 publication ;
  - site local inchangé (montages, avatars, fiche, API ; chemin `..` refusé).
- **Non fait** : aucun compte, aucun secret, aucun appel à Turso, Vercel ou GitHub ; workflows jamais exécutés ; FTS5 sur Turso non essayé ; aucun délai mesuré de bout en bout.


## 2026-11-04 — Mise en ligne (P5)

- Site en ligne sur Vercel (https://web-phi-nine-38.vercel.app), base Turso `curation-ia` copiée et vérifiée (`npm run etat`), 34 publications publiées à la demande de l'utilisateur (plafond relevé à 50).
- Premier cycle GitHub Actions réussi (déclenché à la main) : 29 sources collectées, 10 sujets rédigés (4 écartés, 1 invalide, 5 à vérifier, 0 publié), 4 traductions ; durée 6 min 15 s, au-dessus de l'estimation de 2,5 min : à remesurer sur les cycles horaires.
- Audit axe-core en ligne (`node apps/web/scripts/audit-axe.ts https://web-phi-nine-38.vercel.app`) : 0 violation sur 144 vues (12 pages dont les 4 rubriques réservées aux membres, 3 langues, 375 et 1 280 px, thèmes clair et sombre).

## 2026-11-06 — Refonte, étape 2 : l'accueil sur le vrai site

- `/` devient l'accueil repris de la maquette (titre et logo animé, accroche, six personnages qui regardent, se présentent et se déplacent, fenêtre façon messagerie avec le dernier post publié de chaque agent lu par l'API v1, présentation des six agents, délai mesuré de l'annonce au fil) ; le fil passe à `/fil` (« Accueil » et « Retour » du cadre y mènent). Textes en anglais, français et hébreu (hébreu à faire relire). « Créer un compte » et « Suivre » annoncent « bientôt » : aucune création de compte n'existe.
- Accessibilité : contrastes calculés (4,69 à 15,69:1), onglets de la fenêtre au clavier (flèches), curseur normal rendu dès qu'on utilise le clavier, animations coupées si l'appareil demande moins de mouvement.
- **Vérifié** : types, 837 tests, `next build`, captures locales à 1 366 et 375 px, audit axe-core (`apps/web/scripts/audit-axe.ts`, accueil et `/fil` ajoutés) : 156 vues, 0 violation sur l'accueil et le fil ; 12 vues avec une alerte ancienne sur `/recherche` (`label-content-name-mismatch`), non traitée ici.

## 2026-11-06 — Accueil et fil refaits, dépôt public, déclencheur préparé

- **Accueil** : refait plusieurs fois avec l'utilisateur (trop « modèle IA » au départ). État final décrit dans STATE (étape 2). Données en direct par l'API v1 ; deux nouvelles fonctions de mesure (`relevesMesurables`, `plusRapideDuRepere`) testées.
- **Fil** (`/fil`) : sur le modèle de l'accueil (titre, rangée d'agents, fenêtre en grand, filtre par agent, posts en cartes de la fenêtre via `CartePost`). La première version en cartes façon X a été retirée à sa demande.
- **Délai** : décision A + B de l'ADR 0006 (objectif 20 min). Historique audité (aucun secret), adresse Gmail de l'auteur remplacée par l'adresse anonyme GitHub dans les 105 commits (contenu identique vérifié, historique réécrit envoyé avec son accord), dépôt passé en public par l'utilisateur (vérifié par l'API GitHub), cron GitHub toutes les 15 min en filet, Worker Cloudflare prêt (`infra/declencheur/`), non déployé.
- **Vérifié** : 840 tests, types, `next build`, audit axe-core (156 vues : 0 violation sur l'accueil et le fil), captures locales et en ligne à 1 366 et 375 px.
- **Non fait** : déclencheur Cloudflare (attend l'utilisateur), pages légales, inscription, page d'un post, réglages.

## 2026-11-11 — Panne de publication : cycles coupés à 20 min

- **Constat** (API GitHub et base en ligne) : cycles du 10/11 02:45, 10:29, 18:09, 23:27 et du 11/11 02:56 tous `cancelled` à 20 min ; dernière publication le 10/11 à 09:20 UTC ; 13 posts prévus non publiés, dont le n° 239 (annonce officielle de Fable 5.2 et Mythos 5.2).
- **Cause** : la publication venait en dernier, après la découverte (> 6 min) ; le bilan `chaine.dernier_cycle` n'était écrit qu'en fin de cycle, donc la cadence de 6 h de la découverte n'était jamais retenue.
- **Correction** (83f938a) : étape de publication ajoutée après la planification, bilan partiel enregistré après chaque étape (`statut: en_cours`), `timeout-minutes` 45. Test ajouté ; 8 tests du pilotage et types vérifiés.
- **Rattrapage** : `npm run publier -- --confirmer` le 11/11 : 13 publiés, 0 doublon, 0 à vérifier ; n° 239 vérifié en ligne. `npm run videos` : 0 vidéo sur 32 posts.
- **Non vérifié** : le prochain cycle planifié complet (dépend de l'heure du cron GitHub).


## 2026-11-11 — Premier cycle complet, Higgsfield, ordre de la file de collecte

- Cycle planifié de 10:40 UTC (commit b149166) : statut « termine » en 28 min, 11 étapes réussies ; 7 posts publiés par le cycle lui-même (n° 266-269, 273, 275, 276). Vérifié dans `chaine.dernier_cycle` et la table `post` de production.
- Source `feed:higgsfield-blog` ajoutée avec un filtre de titres (option `titres` des flux) : sur le flux réel, 15 annonces gardées, 281 articles refusés (`titre_hors_motif`). Enregistrée en base par le cycle, pas encore collectée : 179 jobs devant elle dans la file.
- File de collecte : 207 jobs en attente, ~50 traités par cycle avant l'échéance. Ordre changé de « premier arrivé » à « jamais collectée, puis moins récemment collectée » (test ajouté). 865 tests, typecheck OK.
- Rédaction des découvertes portée de 2 à 6 par cycle (demande de l'utilisateur).

## 2026-11-12 — Sources de cybersécurité, thèmes de dépôts pour le travail

- Demande de l'utilisateur : sources sur les cyberattaques ; dépôts pour le travail, les agents, la productivité, les MCP (TradingView) et l'écriture, exemples HyperFrames, Humanizer, watch, Apify, find-skills, Orca.
- 11 flux de sécurité ajoutés (Pulse, contenus externes attribués), chacun interrogé en réel le 2026-11-12 avec `safeGet` et notre analyseur : 200 sans redirection, robots.txt lu jokers compris (docs/sources.md §3.13). Collecte par la chaîne : à constater au prochain cycle.
- Découverte GitHub : 16 thèmes de plus (156 requêtes par passage). Essai réel `ressources decouvrir --controle`, sans capture ni écriture : 2 184 dépôts trouvés, 21 candidats (3 par agent), jeu de contrôle 10/19. Parmi les exemples de l'utilisateur : HyperFrames, Humanizer, find-skills (déjà publiés), Apify MCP (« mcp server », établis) et Orca (« agent orchestration », montants) ramenés ; claude-video (dernier push le 2026-09-25), tradesdontlie/tradingview-mcp (dernier push le 2026-10-21) et atilaahmettaner/tradingview-mcp (créé en 2025, 5 269 étoiles, sous le seuil de 10 000 des établis) écartés par les fenêtres de dates, pas par les thèmes.
- Tests : 875 au vert (commit 61b70fa).
