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
- Bilan au commit : 324 tests au vert sur fixtures et faux modèle, types OK, 74 mutations du code de P3 toutes détectées (47 puis 27, après renforcement de 7 tests). Aucun appel réel, aucune dépense. Relecture ciblée des derniers correctifs encore en cours à ce commit.
- Essai de la chaîne sur une copie de la base avec un faux modèle : 327 actualités traitées, 66 laissées de côté, 0 exécution restée en cours ([relevé](communication/linkedin/05-ecosysteme-creatif/preuves/brut/essai-chaine-faux-modele-2026-10-31.txt)). Texte artificiel : cela ne dit rien de la qualité. Aucun appel réel, aucune dépense.
