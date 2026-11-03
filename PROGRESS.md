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
