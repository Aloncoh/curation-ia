# État du projet

_Mis à jour le 2026-11-05 : **P5 en ligne** (https://web-phi-nine-38.vercel.app, Turso, chaîne GitHub Actions toutes les heures) ; reste à clore : délai de bout en bout sur des publications nées après la mise en ligne, domaine (décision et dépense de l'utilisateur), démonstration. Nouveau logo et accueil animé (maquette) poussés le 2026-11-05 ; P4 réalisé ; P3 toujours ouvert._

- **Bannières de profil (2026-11-05)** : les six fournies par l'utilisateur (dossier `BANIERE/`, non versionné), recadrées sans les boutons de l'outil d'images, rangées en `assets/brand/banniere-<agent>.webp`, servies en ligne (200 pour les six).
- **Fonds de couverture (2026-11-05)** : les 18 fonds fournis par l'utilisateur (trois par agent, avatar en bas à droite) n'existent que sous forme d'une planche 1536×1024 (`FONDS/pourpost.png`, non versionnée) ; découpés en `assets/brand/fond-<agent>-<1..3>.webp` (environ 505×165 chacun, lignes : Mova, Nodi, Pulse, Pyxo, Radar, Repo). Rendu vérifié en local : avatar visible, image un peu douce à cause de la petite taille. Des originaux en haute définition, s'ils existent, la rendraient nette (même nom de fichier, aucun code à changer).
- **Radar sans publication (constat du 2026-11-05)** : aucun cycle en ligne de 03:28 à 12:14 UTC (cron de GitHub irrégulier) ; un cycle lancé à la main depuis le poste le même jour, pendant celui de GitHub (brouillons refusés par le bail, comme prévu), puis un second à 30 actualités : 26 écartées (communiqués sans rapport avec l'IA : Amazon dans les États, Cyber Monday, sport, art…), 2 à approfondir dont le premier sujet Radar (Amazon × Uber Eats, preuve partielle), 109 sans texte (Intel, AMD, Hugging Face, Higgsfield, Notion : flux sans contenu). Dépense du jour 0,017 $. `CURATION_MAX_ACTUALITES` passé de 10 à 30 dans la chaîne en ligne, plafonds inchangés. Radar publiera quand un article sur l'IA avec assez de texte passera ; les flux sans contenu demandent une capture de la page.
  Capture des pages étendue le même jour (demande de l'utilisateur) : l'approfondissement capture aussi, avant l'analyse, la page des actualités récentes (14 jours) au flux vide ou maigre, 30 par passage, refus non redemandés avant 24 h. Essai réel : 27 pages capturées sur 30 (3 refus 403 d'OpenAI), puis cycle à 30 : 2 planifiées (Figma, Higgsfield), 5 à vérifier. **Les sujets Radar capturés ont été écartés « hors périmètre »** (Amazon × Uber Eats, résultats d'AMD, Fitbit) : la grille ne retient que l'IA. Décision de l'utilisateur du même jour : **big tech liée à l'IA** (SPEC, consignes `s5`, prompt `p3-19`). Cycle réel avec s5 : 6 sujets routés vers Radar ; 2 brouillons « à vérifier » (posts 115 Apple MacBook Pro M5, 116 XREAL AURA sous Android XR ; écarts : contexte à relire, nombre hors citation, accès sans indice), 4 écartés (résultats d'Intel, Samsung, Microsoft, Omniverse : « sans intérêt concret »). Relecture de l'utilisateur le même jour (« Seulement XREAL ») : deux avis enregistrés (`selection_avis`, cas particuliers), post 116 XREAL validé, planifié, traduit et **publié — premier post de Radar**, vérifié en ligne sur son profil ; post 115 Apple rejeté (lien avec l'IA trop faible). Les sujets Radar écartés avant s5 ne sont pas requalifiés (un brouillon par actualité, historique gardé). Dépense du jour : 0,10 $ (total 0,63 $).
- **Publication automatique (2026-11-05, demande de l'utilisateur : « du moment où c'est déployé, ça doit être automatique »)** : élagage des champs secondaires en écart à l'étape « controles » (`src/analysis/elagage.ts`, SPEC) ; en réel : 15 brouillons débloqués sur 36, 14 publiés aussitôt (Nodi 5, Mova 4, Repo 3, Pyxo 2) et 1 doublon écarté. Pulse : six sources officielles ajoutées (Cloudflare, Databricks, AWS ML, GitHub Engineering, états de Claude et d'OpenAI), collectées en réel ; premier post de Pulse publié (post 124, Cloudflare Zero Wire), 8 autres à vérifier. Reste bloquant : `contexte_a_relire` sur un champ principal (47 écarts sur 29 brouillons), qu'on ne peut lever qu'en réécrivant. Plafond du jour presque atteint (0,164 $ sur 0,20 $ ; total 0,69 $ sur 4 $).
- **Logos et flèches (2026-11-05, demande de l'utilisateur)** : vrais logos sur les couvertures — dépôts GitHub sans marque connue : logo GitHub (plus de monogramme, toujours aucun avatar de personne) ; Claude : logo Claude ; Microsoft : ses quatre carrés ; Spline : avatar de son organisation GitHub officielle (`public/logos/spline.webp`). Restent en monogramme, faute de logo libre ou officiel lisible : OpenAI (retrait demandé à simple-icons), Amazon, Oracle, TSMC, Vapi, Midjourney. Flèches façon miniature YouTube (rouges ou jaunes, contour blanc) qui désignent le logo, trois variantes selon le post (flèche du haut, du bas, cercle et flèche).
- **P6 en cours (2026-11-05)** : bloc 1 réalisé, regroupement multi-sources à la collecte (ADR 0014). Bloc 2a réalisé : `npm run ressources -- decouvrir [--capturer]`, seuil de 100 étoiles (décision de l'utilisateur, réglage `decouverte.seuil_etoiles`), candidats capturés avec la décision `approfondir` (motif `grille_d1_a_faire`), jamais publiés d'office ; essai réel en local : 60 dépôts trouvés, 4 capturés. Sujets élargis à 17 le même jour à la demande de l'utilisateur (skills, MCP, agents, LLM, IA générative, code, outils IA, RAG, automatisation, voix, image, vidéo, design, motion).
  Bloc 2b construit (`npm run ressources -- rediger --confirmer`, agent-decouvertes.ts) : grille `d1` notée par le modèle (domaine, utilité, documentation, limites, passages), décision du code (archivé, inactif, hors sujet, popularité invoquée, écriture sans espaces, passage introuvable), rédaction r2 en anglais, une révision sur les écarts des contrôles, import dans la chaîne des ressources (origine « agent du site », Repo). Essai réel en local, 6,7 centimes : 8 dépôts notés, 6 retenus par la grille (dont 2 hors sujet, d'où le champ `domaine` ajouté ensuite), 0 publiable — rédactions refusées ou « à vérifier » par les contrôles (citations introuvables, noms et chiffres absents des citations, texte trop proche de la source). En ligne : recherche et capture actives toutes les 6 heures (gratuites) ; rédaction coupée (`CURATION_MAX_DECOUVERTES` absente) jusqu'à un taux de réussite suffisant.
  Amélioration du même jour (demande de l'utilisateur) : citations choisies par numéro de passage découpé par le code (mot pour mot par construction), commandes numérotées, révision gardée en anglais, mots-clés, repères et démarrage nettoyés sans rien inventer, listes « awesome » écartées, seule une utilité « forte » publiée. Résultat sur les deux derniers lots réels : plus aucun écart bloquant de citation ; 4 brouillons « à vérifier » (conditions de la source à reprendre dans le texte, phrases trop proches de la source), aucun publiable sans relecture. Dépense des essais : 0,19 $ (base locale).
- **Radar élargi (2026-11-05, demande de l'utilisateur)** : flux Google, Samsung, Intel et Shopify (Newsfile) ajoutés et collectés en réel en local (62 actualités) ; la sortie d'un modèle reste à Nodi. Sans flux officiel lisible pour Tesla, TSMC, Qualcomm, Broadcom, Oracle (403 ou aucun flux public) et LG (flux renvoyant vers un site sans rapport) : rubriques par entreprise de TechCrunch (les six) et de The Verge (Tesla, LG), ajoutées le 2026-11-05 comme presse attribuée, 139 articles collectés en réel en local. Chaînes YouTube officielles trouvées, mais leurs flux répondaient 404 (comme celui d'AI Search ce jour-là) : à réessayer. Constat : les sources Radar n'étaient pas encore dans la base en ligne, le code n'ayant été poussé que le 2026-11-05 vers 00:03 UTC ; elles seront collectées au prochain cycle.
- **Mesures du 2026-11-05 (base en ligne, lecture seule)** : FTS5 fonctionne sur Turso ; `npm run delais` donne 35 publiées, dont 4 mesurables de bout en bout, médiane 521 051 s (environ 6 jours). Ce chiffre mesure le rattrapage du stock copié, pas la chaîne : il faut des actualités sorties après la mise en ligne.

## P5 — chaîne en ligne (préparé le 2026-11-03, en attente des comptes de l'utilisateur)

- **Décision de l'utilisateur** (2026-11-04) : dépôt privé, cycle toutes les heures (cron `7 * * * *`) ; public et 5 minutes si l'heure ne suffit pas (ADR 0006). Durée réelle d'un cycle à mesurer au premier lancement.
- **Décision de l'utilisateur** (2026-11-03) : « Actions, 5 minutes ». ADR 0006 mise à jour. L'objectif d'une minute n'est pas atteignable ainsi, et GitHub ne garantit pas l'heure d'un cron.
- **Préparé** :
  - workflows `.github/workflows/chaine.yml` (cron `2-59/5 * * * *`, un seul cycle à la fois, désactivé tant que `CHAINE_ACTIVE` ≠ `oui`, secrets du dépôt seulement) et `verifications.yml` (types et tests à chaque envoi) ;
  - commandes `npm run lancer`, `publier`, `etat`, `couts` et `turso:copier` ;
  - plafond par jour en plus des plafonds par exécution et total ;
  - connexion Turso (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) ;
  - site prêt pour Vercel (`apps/web/vercel.json`, région `cdg1`, fichiers montages et avatars inclus) ; en production, il n'affiche que les publications publiées.
- **Vérifié en local** :
  - publication atomique et idempotente, testée avec deux processus concurrents ;
  - copie complète de la base vers un fichier vide : mêmes nombres de lignes ;
  - publication sur cette copie jetable : 20 publiées (le plafond), puis 0 au second passage ;
  - aucune publication réelle sur `data/curation.db`, aucun appel à Turso, Vercel ni GitHub.
- **À créer par l'utilisateur** : voir ROADMAP.md, section « P5 — plan » (Vercel, Turso `curation-ai` en `aws-eu-west-1`, dépôt privé, secrets `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEEPSEEK_API_KEY`, variables `CURATION_PLAFOND_JOUR_USD`, `CURATION_PLAFOND_TOTAL_USD`, `CHAINE_ACTIVE`, variables Vercel `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, domaine).
- **Risques** :
  - releases GitHub lues sans jeton (60 requêtes par heure et par adresse) sur des runners partagés ;
  - ~~FTS5 jamais essayé sur Turso~~ : essayé le 2026-11-05, il fonctionne sur la base hébergée (ADR 0008) ;
  - workflow de vérification jamais lancé sous Linux ;
  - versions des actions (`checkout@v5`, `setup-node@v5`) à confirmer au premier lancement.

## P4 — site social (réalisé le 2026-11-03, en local ; rien n'est publié)

- **Construit** ([ADR 0013](docs/decisions/0013-site-api-traductions.md) et son complément) :
  - site Next.js 16.4.4 (`apps/web`), lancé par `npm run web:dev` sur http://localhost:3000 : fil, publication, fiche (`/p/:id/fiche`), profils, comptes, Explorer, recherche, manifeste ;
  - API v1 (`/api/v1/*`, dont `/publications/:id/fiche`), contrat dans `packages/contrat` ;
  - interface en anglais, français et hébreu (`packages/textes`) : cookie, puis navigateur, puis anglais. En hébreu, `dir="rtl"` et police du système (`:lang(he)`, sans police embarquée).
- **Traductions** : la table `post_traduction` et `npm run traduire` couvrent trois parties, le post, la fiche (`fiche.*`) et le texte alternatif (`media.alt`). Chaque partie est contrôlée par le code et servie séparément. « Voir l'original » existe pour le post et pour la fiche ; le texte des images et des carrousels reste en anglais.
- **Lots réels** (2026-11-03, 08:22–08:50 UTC, heures pleines) : 155 appels, **0,0815 $**. Couverture :
  - en français : 32 posts sur 32, 30 fiches sur 31, 22 textes alternatifs sur 22 ;
  - en hébreu : 31 posts sur 32, 26 fiches sur 31, 22 textes alternatifs sur 22.
  - Les écarts restants sont fondés (« US », « 3D », « 1 » perdus, une étape laissée en anglais) et s'affichent en anglais.
- **Vérifié** :
  - 759 tests au vert ; types OK (`typecheck`, `web:typecheck`) ; `next build` réussi ;
  - axe-core : 0 violation sur 96 vues (8 pages, 3 langues, 375 et 1 280 px, thèmes clair et sombre) ;
  - navigation au clavier complète sur une publication ;
  - navigateur, en, fr et he, à 375 px et sur ordinateur : fiche, carrousel, choix mémorisé, « Voir l'original ».
- **Interprétation à confirmer** : « les écritures en hébreu en fonction du système » a été lu comme « police du système de l'appareil, aucune police hébraïque embarquée » (Rubik abandonnée).
- **Limites connues** :
  - versions du produit masquées pour les 32 publications, aucune n'étant reliée à un produit suivi ;
  - mots anglais laissés en tête de phrase par endroits, non détectés par le contrôle ;
  - questions à tester encore en français dans quelques originaux anglais ;
  - hébreu de l'interface à faire relire par un locuteur natif avant le lancement ;
  - installation réelle sur téléphone non essayée.
- **Pour P5, à demander à l'utilisateur** : comptes Vercel et Turso, un domaine, un dépôt GitHub pour les Actions.

- **Phase** : P2 fusionné dans `main`. **P3 en cours, pas terminé**, et **P4 réalisé en local** ; **P5 préparé en local** (voir plus haut), sur `p3-brouillons`. Chaîne des ressources (ADR 0011) avancée avant P6 à la demande de l'utilisateur, sans rouvrir de jalon. Relevé de la base locale le 2026-11-03 : 38 publications, dont 28 `en_attente` et planifiées, 9 `a_verifier` et 1 `rejete`. Rien n'est publié.
- **Dépôt** : `main` à `e56db82` ; `p3-brouillons` non fusionnée, non poussée (aucun dépôt distant) : le travail P3 du 2026-11-03 est dans `b698ffa`, P4 dans le commit qui suit. Branche `mobile` à `17f8408`, dans `.worktrees/mobile`, non fusionnée.
- **Tests** : 777 au vert sur fixtures et faux modèle (`npx vitest run`, 2026-11-03 11:06), types OK. Après l'arrêt forcé : `git fsck` ne signale rien, `PRAGMA integrity_check` répond ok, aucun fichier modifié n'est vide. **Blocages** : aucun. **Dépenses DeepSeek** (budget autorisé : 4 $) : 0,3043 $ comptés en base au 2026-11-03 10:52 (traductions P4 comprises, 0,0815 $), plus 0,0099 $ de traduction des ressources **absents de la base** (voir plus bas), soit environ 0,314 $. Haiku : 0,061 $ réels (comparaison du 2026-11-01). Aucun compte créé.

## Ce qui fonctionne réellement (vérifié le 2026-10-31, complété le 2026-11-02)

- **Collecte : oui, à la main.** 24 sources sur 24 au dernier essai sur copie. Aucune planification (P5). Base de travail : 393 actualités, arrêtée au 2026-10-30, dont 66 inexploitables ; 57 % des actualités ont moins de 400 caractères de texte.
- **Sélection : oui, sans le moteur.** Quatre critères, décision calculée par le code (ADR 0005). Corpus figé : 24 sujets de développement, 36 d'évaluation. Trois juges Claude Code ont noté les 60 sujets selon les consignes `s2` : 20/24 et 28/36 unanimes. Aucun avis humain encore.
- **Délais : mesure partielle.** Sonde de 91 minutes : 1 920 requêtes, 0 erreur, 1 entrée nouvelle, **aucun délai de détection mesurable**. Chaîne locale : 7 ms. Montage : environ 0,4 s. Modèle et mise en ligne : non mesurés (docs/delais.md).
- **Budget : estimé, jamais mesuré.** 100 publications : 0,34 $ avec Flash, 0,28 $ avec Haiku, plus 5 à 6 % estimés pour les deux champs ajoutés le 2026-11-01 (docs/budget-modeles.md).
- **Montages : oui, en local.** 7 gabarits, 8 exemples, tous signalés comme tels (`npm run montage`, ADR 0007). Pas encore affichés dans la maquette.
- **Brouillons de l'agent du site : non, jamais exécutés en réel.** Seule la comparaison de deux modèles a appelé une API (2026-11-01) ; elle n'écrit pas de brouillon.
- **Chaîne des ressources : oui, en local, sans modèle** (vérifié le 2026-11-02). 21 ressources capturées par l'API GitHub, 21 brouillons rédigés par Claude Code et contrôlés par le code, 21 visuels rendus, 21 boutons « Voir le dépôt » vérifiés (69 vérifications réussies entre 15:33 et 18:46 UTC), 1 088 mots-clés enregistrés, 21 publications indexées et planifiées sous le plafond (15 le 2026-11-02, 6 le 2026-11-03), toutes `en_attente`. Publication réelle : P5.
- **Recherche : oui, en mode aperçu.** Par exemple « mémoire » trouve 3 ressources, « code review » 1, chacune avec sa raison ; en mode public, 0 résultat, puisque rien n'est publié. « motion design » ne trouve qu'une ressource (frontend-design), alors que SPEC §7.15 en attend plusieurs : à revoir.
- **Affichage : site réel en local depuis le 2026-11-03** (section P4 plus haut) ; la maquette statique locale reste disponible, façon X (colonne gauche, recherche en haut, post réduit, mots-clés invisibles), avec les 21 publications de ressources en aperçu ; Retours d'interface du 2026-11-02 reportés dans SPEC §6 bis ; leur conformité complète n'a pas été revue dans un navigateur pendant la mise à jour des documents.

## Harmonisation du 2026-11-01

Vision comparée au dépôt ; aucun jalon rouvert ; périmètre de la V1 inchangé. SPEC §3.1, §3.5, §7.3 ter, §7.15, §7.16 ; ROADMAP ; [ADR 0008](docs/decisions/0008-recherche-des-publications.md) (proposée) ; complément de l'ADR 0005.

- **Corrigé dans les documents** : six comptes au lieu d'un compte principal, public élargi, médias de la V1 (montages), maquette validée, langues de P12.
- **Corrigé dans le moteur, sans appel** : `exemple_usage`, `prerequis`, catégories sécurité et hébergement, contrôle `essai_non_realise` (prompt `p3-9`) ; délai de bout en bout dans `npm run delais`.
- **Contradictions résolues** : le filtre de 14 jours et la note de nouveauté ne s'appliquent pas aux découvertes ; le seuil d'étoiles agit à l'entrée, jamais dans une note.
- **Lacunes constatées** : le corpus ne couvre que l'usage « rester informé » (54 annonces, 6 versions, aucune ressource) ; aucun contrôle de doublon entre sources (garde-fou en P5) ; FTS5 non établi sur une base Turso hébergée (essai en P5).

## Reste à faire dans P3

- **Sans dépense** : importer les corrections, écrire les consignes `s3` (avis, public élargi), recueillir les avis à l'aveugle sur le jeu d'évaluation, comparer. Afficher les montages dans la maquette une fois validés.
- **Avec ton accord, ta clé et tes plafonds** : premier lot réel, réponse réelle de l'API, coût et latence mesurés, revue des brouillons. Évaluer le moteur sur le corpus demandera une commande dédiée.
- **Reporté** : les révisions datées (P5) ; la lecture de l'article complet pour les sources à titre seul, à proposer après lecture de leurs conditions.
- **Limites gardées volontairement** : un refus 400 de l'API ou une coupure en plein flux arrête le lot. Une image tronquée mais lisible par le navigateur n'est pas détectée. Le contrôle entre deux captures n'a encore aucun cas réel.

## Ce qui est prêt à montrer

- Maquette : `maquette/index.html` (configuration `maquette` de `.claude/launch.json`, puis `/maquette/index.html`) : disposition façon X (logo et navigation à gauche, profil de l'utilisateur en aperçu, recherche toujours visible en haut), fil, publication détaillée, 21 publications de ressources en aperçu, Explorer, Notifications, Reels, profils des agents, Coulisses et États dans « Plus ».
- 8 exemples + earshot (projet GitHub mesuré), comptes Nodi, Repo, Pyxo, Mova, Pulse (sans publication : aucun incident collecté), Radar ; filtre par auteur ; les 8 exemples : **108 passages sur 108** retrouvés mot pour mot (mots entiers) dans les captures réelles ; Reel d'exemple de 47,3 s (`maquette/medias/`).
- [Page de revue privée](https://claude.ai/artifact/6ywWE9bnPD9muroD9wq23K) : exemples à corriger, montages, budget, délais.
- `docs/sources.md` : 24 sources actives, registre des candidates, 203 constats contre-vérifiés (166 confirmés, 35 corrigés, 2 invérifiables).
- Relecture adversariale (5 angles) : 28 constats confirmés, tous corrigés ; contre-relecture : 15 points mineurs de plus, tous traités (détail dans PROGRESS.md).

## Décisions de l'utilisateur du 2026-11-02 (proposées par la session mobile, confirmées ici)

**Reportées le 2026-11-02** : points 1 à 5 dans SPEC (§3.1, §6 bis, §7.2, §7.7, §7.12) ; point 5 aussi dans CLAUDE.md ; point 6 dans SPEC §7.4. Retours d'interface du même jour (disposition façon X, post réduit, mots-clés invisibles, en-tête sans bandeau ni grande photo) dans SPEC §6 bis ; règle de ton dans SPEC §2.
1. **Conversation avec un agent** : autorisée, comme exception limitée à la règle des messages privés. L'agent lit seulement la conversation que l'utilisateur ouvre volontairement avec lui ; son seul outil est la recherche des publications ; il n'accède à aucun autre message privé ni groupe privé. Aucun appel payant sans budget validé.
2. **Connexion obligatoire** dans le produit cible ; l'accès de démonstration de l'application sert seulement aux essais.
3. **Abonnements et Abonnés** : ils regroupent tous les comptes, humains et agents IA, sans catégories séparées. On suit un compte pour ses publications ; le fil « Abonnements » les rassemble. Une mention discrète suffit à identifier un compte IA. Aucune amitié réciproque pour l'instant.
4. **Interface** : aucune indication de jalon ; une fonction indisponible est signalée discrètement.
7. **Équilibre des comptes** : signature selon le sujet, comptes alternés dans le planning ; 21 ressources réparties Radar 5, Mova 4, Pyxo 4, Repo 4, Nodi 4 (docs/agents-editoriaux.md).
6. **Passage à la publication automatique** : après 2 brouillons consécutifs relus sans affirmation non soutenue (au lieu de 10) ; reporté dans SPEC §7.4.
5. **Information facultative absente** : masquée à l'affichage au lieu de « Non renseigné » ; `null` reste la règle en base.

## Décisions de l'utilisateur (2026-10-30, à respecter)

- Orientation de la feuille de route révisée validée ; P6–P14 prévisionnels, sans alourdir la V1.
- Langue : celle du navigateur parmi les langues disponibles, choix manuel, langue de secours (construit en P4).
- Six comptes éditoriaux provisoires sur un même moteur ; « Veilleuse » : mascotte du site et présentatrice. Exemples toujours signalés comme tels.
- **2026-10-31 : Reddit reste dans le périmètre, en source différée.** Demande d'accès non déposée ; il ne doit pas être exclu du cadrage. Motif et conditions de reprise : docs/sources.md §3.7.

## Maquette du 2026-11-02 (soir)

Rendu proche de X, post de sélection (6 sites design web, Godly exclu, « free » et « 800+ » non repris faute de preuve), recherche sur les 31 publications affichées, actions sans compteur ni effet simulé, Messages et Mon profil (Abonnements, Abonnés vides). Langues décidées (ADR 0012). 710 tests au vert. Manque : police hébraïque à choisir (la session mobile recommande Rubik, OFL, graisses 300 à 900, planche dans `docs/mobile/preuves/` ; question posée à l'utilisateur dans la session mobile) ; droits des captures de sites non tranchés.

## Premier lot réel (2026-11-02, 20:12 UTC)

Budget autorisé par l'utilisateur : 4 $ au total. Lot DeepSeek Flash de 30 actualités : 19 écartées, 7 à approfondir, 1 sortie invalide, 3 brouillons « à vérifier » (post_draft 90, 105, 113), 34 appels, **0,0125 $** dépensés. **Relecture faite le 2026-11-02 : « Les 3 sont OK »** (posts 22, 23, 24, passés en attente et planifiés dans la réserve des nouveautés prioritaires). La condition de passage à la publication automatique (2 brouillons consécutifs sans affirmation non soutenue, SPEC §7.4) est remplie ; l'activation effective demande la chaîne en ligne (P5). `brouillons:relire` corrigé (les découvertes en sont exclues).

## Actualités de l'agent dans le fil (2026-11-03)

- Le fil affiche désormais les actualités réelles de l'agent (`src/maquette/actualites.ts`), avec une revérification mot pour mot à l'affichage ; le même jour, elles passent avant les ressources. `npm run brouillons:planifier` planifie les brouillons sans écart (en attente, jamais publiés) ; les « à vérifier » attendent une relecture.
- Second lot DeepSeek Flash : 138 actualités de moins de 14 jours, 0,045 $ (total DeepSeek 0,094 $ ; budget autorisé 4 $). Résultat : 1 sans écart (planifiée, post 32), 17 « à vérifier » (posts 26 à 43), 13 à approfondir, 60 écartées, 45 trop anciennes, 73 sans texte.
- Entraînement de l'agent (2026-11-03, demande de l'utilisateur) :
  - Consigne de rédaction p3-12 : règles de citation tirées des écarts du lot réel.
  - Consignes de sélection s4 : premiers exemples humains (`selection_avis` 1 à 3, « Les 3 sont OK »).
  - Contrôle `soutien_nom_absent` : un nom est désormais attesté par le titre, par un sigle courant ou par sa présence telle quelle dans la source ; un nom absent de la source reste un écart. Nouvelles commandes `brouillons:recontroler` (gratuite) et `brouillons:planifier`.
  - 12 brouillons non relus ont été archivés (`exports/brouillons-remplaces-2026-11-03.json` ; la base avait été sauvegardée dans le dossier temporaire de la session, perdu à l'arrêt forcé), puis réécrits : 0,012 $. Écarts par brouillon : environ 19 avant, 11 après.
  - Résultat : 5 actualités planifiées (posts 22, 23, 24, 32, 45) ; 15 « à vérifier », dont 5 anciennes versions de Claude Code (2.1.304 à 2.1.310) laissées hors planning. DeepSeek, total dépensé : 0,106 $ sur les 4 $ autorisés. 713 tests au vert.

## Posts en anglais (2026-11-03)

- Décisions de l'utilisateur : posts et texte des images en anglais ; traduction de tout le post, titre compris, automatique comme sur X (SPEC §7.13, ADR 0012 point 5).
- Fait : consigne de rédaction p3-13 en anglais ; contrôles bilingues, avec un nouvel écart `langue_non_conforme` ; libellés des montages en anglais. 714 tests au vert.
- Les 16 actualités de l'agent ont été réécrites en anglais pour 0,015 $ (DeepSeek, total 0,12 $ sur 4 $). Les versions françaises sont archivées dans `exports/brouillons-francais-2026-11-03*.json` ; la sauvegarde de la base, faite dans le dossier temporaire de la session, a été perdue à l'arrêt forcé.
- Résultat : 1 actualité planifiée (Cursor Agent SDK, post 63) ; 11 en anglais à relire, dont les anciens posts 22 à 24, que l'utilisateur avait validés en français ; les anglais sont des textes nouveaux ; 1 rejetée (média). Les écarts restants sont surtout des réserves de la source à relire et des copies de phrases.
- Encore en français : les 21 ressources, la sélection et les exemples de la maquette (rédigés par Claude Code), ainsi que leurs montages déjà rendus.

## Autocorrection de l'agent (2026-11-03)

- Demande de l'utilisateur : « redige les tous ». Consigne p3-15 : une passe d'autocorrection (étape `revision`) reçoit les écarts du code, et n'est gardée que si elle en compte moins ; une règle de langue est écrite en anglais. Deux faux positifs corrigés : le produit est attesté par le nom de la source officielle, et une réserve n'est pas exigée dans un repère d'image. 716 tests au vert.
- Résultat : 6 actualités en anglais planifiées (posts 63, 69, 71, 72, 74, 76). 4 restent « à vérifier », avec de vrais écarts (réserve omise, citation inexacte, chiffre hors citation), dont Claude Code 2.1.314 et GitHub Actions pull_request_target ; 1 sortie invalide. Les 5 anciennes versions de Claude Code restent hors planning. DeepSeek, total dépensé : 0,149 $ sur 4 $. Archives : `exports/brouillons-avant-*.json`.

## Ressources en anglais (2026-11-03)

- Les textes des 21 brouillons de ressources et de la sélection, rédigés en français par Claude Code, ont été traduits en anglais par DeepSeek Flash : 22 appels, 0,0099 $, sans chiffre modifié. Le script ponctuel et les versions françaises sont archivés dans `exports/brouillons-ressources-francais-2026-11-03/` (copiés depuis le dossier temporaire). **Ces 22 appels ne sont pas en base** : le script appelait le modèle directement, sans passer par `llm_call`, qui exige une actualité. Le montant de 0,0099 $ vient de la sortie du script et ne peut pas être revérifié ; le plafond total ne le compte pas. Passages, commandes, mots-clés et boutons sont inchangés. 14 champs ont été corrigés à la main par Claude Code (repères trop longs ou redondants, réserves, noms).
- Réimport complet : 21 ressources et 1 sélection conformes, planifiées et indexées ; images refaites en anglais.
- Contrôles : négations et conditions anglaises reconnues (« doesn't », « no », « if », « depending ») ; pas de réserve exigée dans un repère d'image (ressources et actualités). La mention de l'image est en anglais (`MENTION_IMAGE`) ; la base garde la mention française de référence, imposée par une contrainte `media_asset_notice_ck`.
- Reste en français : les 8 exemples et le projet écrits à la main pour la maquette (`src/maquette/exemples.ts`), et l'interface (trilingue en P4). 717 tests au vert.

## Nouveaux modèles et étape « approfondir » (2026-11-03)

- Constat de l'utilisateur : GPT-6.1 Terra et Gemini 4 Carbon n'avaient pas été publiés. Cause : les flux RSS d'OpenAI et de Google ne donnent qu'une phrase (50 et 66 caractères), et aucune étape ne lisait l'article.
- Nouvelle étape `npm run approfondir` (`src/collect/approfondir.ts`) : pour une actualité « à approfondir » ou écartée faute de source, elle capture la page officielle (safeGet, hôtes autorisés de la source) et l'enregistre comme nouvelle capture (`text`) ; chaque refus est tracé dans `run`. Résultat : 19 pages capturées sur 21. openai.com refuse la collecte (403) pour Terra et LifeVal ; aucun contournement.
- Lot DeepSeek : 0,074 $ (total 0,22 $ sur 4 $). Gemini 4 Carbon, Mistral Large 4 OSS et Voxtral 3 ont été corrigés par Claude Code sur demande de l'utilisateur (« poste les ») : attribution des benchmarks, chiffre hors citation retiré, réserves reprises, une attribution sans conditions retirée, aucune information ajoutée. Base sauvegardée dans `exports/curation-avant-corrections-modeles.db`.
- Planning recalculé par priorité (`planning --recalculer`, base sauvegardée dans `exports/curation-avant-replanification.db`) : les 3 modèles ouvrent le 3 novembre. 10 actualités planifiées.
- Limite connue : la collecte suivante du flux verra la capture de l'article comme un changement et réenregistrera la phrase du flux. C'est sans effet sur les posts planifiés, qui citent leur propre capture, mais à corriger avant P5.
- Exemples de la maquette, Reel et montages de démonstration en anglais (travail commencé par la session curation-ai-5f, terminé ici) : voix anglaise, mentions dessinées en anglais, manifeste et images régénérés. 717 tests au vert.
- Source YouTube « AI Search » (@theAIsearch, chaîne UCIgnGlGkVRhd4qNFcEwLL4A) demandée par l'utilisateur : le flux RSS répond 404 le 2026-11-03. Rôle proposé : signal de découverte (contenu externe attribué), le post citant la source officielle. Confirmé le 2026-11-03 : signal de découverte seulement. Remplacé le 2026-11-04 par décision de l'utilisateur : source de rédaction au même niveau que GitHub (flux Atom de la chaîne, 200 le 2026-11-04, collecté toutes les heures), un sujet par vidéo, signé par Nodi, chaque affirmation attribuée à la chaîne (consigne p3-16). WorldofAI (@intheworldofai) ajoutée puis retirée le 2026-11-04 à la demande de l'utilisateur (vidéos surtout faites de fuites, toutes écartées) ; fuites et rumeurs écrites comme non confirmées. Décision de l'utilisateur du 2026-11-04 : le filtre de sélection s'applique tel quel aux vidéos ; une vidéo non confirmée, sans intérêt concret ou à la source insuffisante est abandonnée (premier lot : 10 vidéos soumises, aucune retenue, 0 brouillon).
- Source LinkedIn demandée par l'utilisateur le 2026-11-04 (« à partir de maintenant »). Même rôle qu'X et AI Search : signal de découverte, contenu externe attribué, chaque post cite la source officielle. Pas de collecte automatique : LinkedIn n'offre pas de flux public et interdit la collecte automatisée de ses pages (conditions d'utilisation, à relire sur la page officielle avant toute collecte) ; les posts sont transmis par l'utilisateur, comme les posts X.
- Sélection « références design » (2026-11-04, post X de @elbyron0) : Design Spells (HTTP 429) et Deck Gallery (HTTP 403, protection anti-robot) refusent la collecte, non contournée : différés avec ce motif ; la sélection paraît avec les 3 sites capturés.

## Ajustements du 2026-11-02

- Plafond de 20 publications par jour, sans quota ; priorités modèles, ressources, fonctionnalités, autres (SPEC §3.6). Consignes `s3`, prompt `p3-10`, `prioriteEditoriale` testée (558 tests). Application du plafond : P5.
- Objectif de la minute rétabli pour les nouveautés prioritaires (ADR 0006).
- Ressources pour construire : 47 candidates dans 4 domaines (docs/ressources-candidates.md), vérifiées par des agents sur les pages officielles, non triées. Liste du fil X et ECC : 21 publications préparées par la chaîne des ressources (ADR 0011), en attente.
- Mobile : ADR 0010 validée le 2026-11-02 (API partagée et site installable en P4, application Expo en P9 bis).

## Session mobile (2026-11-02)

Worktree `.worktrees/mobile` (exclu localement via `.git/info/exclude`), branche `mobile` partie de `6fe6a6e` (à jour au 2026-11-02). Règles de partage dans `.worktrees/mobile/MOBILE.md`. La session mobile écrit seulement `apps/mobile/**` et `docs/mobile/**`. La session principale garde tout le reste, dont `packages/contrat/` (API v1) et la racine. Ports : 4173 maquette, 3000 site, 8081 Expo. Aucun compte ni dépense mobile sans accord. Ne pas écrire dans `.worktrees/`.

M3 construit le 2026-11-03 et validé par l'utilisateur (« je valide tout »), non commité : barre commune, Mon profil, interface en/fr/he (catalogues typés dans `src/textes/`), hébreu de droite à gauche sur le web, « Pour toi » ordonné par centres d'intérêt. 89 tests mobiles au vert. Détail : `docs/mobile/M3.md`, ADR mobile 0004. Besoins d'API pour P4 : `propositions-contrat.md` §8 (langue du contenu, clé de champ dans les extraits de recherche, bouton, ordre de « Pour toi » côté serveur en P9).

## En attente de l'utilisateur

1. **Corriger les 15 exemples** sur la page de revue (0 avis reçu au 2026-11-01). Les avis sont dans la collection `avis` de la page ; Claude les importe avec `npm run selection -- avis`.
2. **Modèle par défaut** : comparaison réelle faite (0,083 $, ADR 0009). DeepSeek Flash choisi par l'utilisateur le 2026-11-01, contre la recommandation Haiku, risque d'erreurs connu (13 contre 3). `npm run brouillons` accepte DeepSeek Flash depuis le 2026-11-02 (CURATION_MODELE=deepseek-flash, DEEPSEEK_API_KEY), sans aucun appel réel à ce jour. La première clé Anthropic exposée en conversation a été supprimée.
3. **Hébergement du cycle de 60 s** (objectif de la minute rétabli le 2026-11-02, ADR 0006) et jeton GitHub : à décider avant P5.
4. **Montages** : valider le style (ADR 0007), et décider si annoter ou détourer une capture d'éditeur est acceptable (docs/visuels.md §4).
5. Kits presse autorisés ; droits à vérifier photo par photo avant mise en ligne.
6. ~~Langues~~ décidées le 2026-11-02 (anglais d'origine, français et hébreu, SPEC §7.13). Reste : nom définitif du compte éditorial — avant P4.
7. Droits d'usage de la mascotte ; fréquence maximale de publication — avant le premier lot réel de P3.
8. Décisions sur les sources et médias (X, reprise de Reddit, sources aux conditions restrictives, hébergement vidéo, traduction, bacs à sable, points juridiques) : `docs/sources.md` §8.1 — avant P6/P7.
9. Propositions : préciser SPEC §7.3 « sous-chaîne exacte » en « bornée à des mots entiers », et « les textes du média généré » en « les diapositives, désignées par nom de champ » (déjà appliqué par le code).
10. **Seuil d'étoiles** (avant P6) : valeur, et portes d'entrée sous le seuil. Proposition : 500, avec progression mesurée ou mention par une source suivie (SPEC §11).
13. **Trier les 47 ressources** sur https://claude.ai/artifact/YGeV9JfuPUGTajUTzF9Yxb (collections `tri` et `propositions`) ; liste source docs/ressources-candidates.md (garder ou retirer, avec motif).
12. **Mobile** (ADR 0010, validée) : comptes Apple (99 USD/an) et Google (25 USD) à décider avant P9 bis.
11. ~~Recherche en P4 ou P6~~ : dépassé, recherche par mots-clés construite pour les ressources (SPEC §7.15).
14. **Chaîne des ressources** : relire les 21 publications en aperçu dans la maquette ; confirmer les réglages proposés (réserve de 5, nouvelle sortie à 14 jours, inactivité à 90 jours, vérification de lien valable 7 jours ; SPEC §11) — avant P5.

## Mise en ligne (2026-11-04)

- Base Turso `curation-ia` (aws-eu-west-1) créée par l'utilisateur ; copie faite le 2026-11-04 (`npm run turso:copier -- --confirmer`) : migrations et toutes les tables, vérifiées par `npm run etat` (34 en attente, 0 publiée, 0,5042 $). Première publication le 2026-11-04 à la demande de l'utilisateur (`npm run publier -- --confirmer` sur Turso) : 20 publiées (plafond du jour atteint), visibles sur https://web-phi-nine-38.vercel.app, traduites en français. Puis, à sa demande, plafond relevé à 50 par jour (`ressources -- planning --plafond 50 --recalculer`) et les 14 restantes publiées : 34 publiées, 0 en attente. **La base Turso fait désormais foi** : la base locale ne reflète pas ces publications.
- Projet Vercel `web` (racine `apps/web`) et variables `DATABASE_URL`, `DATABASE_AUTH_TOKEN` créés par l'utilisateur ; premier déploiement à confirmer. Secrets GitHub posés par l'utilisateur (à confirmer : variables de plafond).
- `.env.local` : les lignes `DATABASE_URL` et `DATABASE_AUTH_TOKEN` (Turso) sont **commentées** : actives, elles feraient écrire toutes les commandes locales dans la base en ligne. Les décommenter seulement pour une opération voulue sur Turso.

## Rôles des agents (2026-11-05, décision de l'utilisateur)

- Ressources signées selon le rôle : **tous les skills à Repo** (« chacun a sa spécialité, il ne faut pas interférer ») ; Mova garde les outils et sites de design. 17 posts réattribués dans Turso (agent seul, statut publié inchangé) et leurs montages régénérés.
- **Radar couvre toutes les annonces des grandes entreprises** (NVIDIA, Microsoft, Apple, Amazon, Tesla obligatoires ; liste ouverte), sauf la sortie d'un modèle d'IA (Nodi). Sources officielles ajoutées et signées par Radar (`compte: 'radar'` dans sources.ts) : NVIDIA Newsroom et Blog, Microsoft Source, Apple Newsroom, About Amazon, AMD, Meta. **Tesla : aucun flux public, site refusé (403) le 2026-11-05 — différé, non contourné** (piste : X officiel, API payante, ou posts transmis par l'utilisateur). Consigne p3-17.
- Couvertures : plus d'avatar GitHub (souvent un visage), monogramme du dépôt à la place.

## Prochaine action

L'utilisateur crée lui-même, dans l'ordre : compte Vercel, compte Turso (base `curation-ai`, `aws-eu-west-1`), dépôt GitHub privé, secrets et variables (noms exacts dans ROADMAP.md, « P5 — plan »), domaine. Ensuite, avec son accord : `npm run turso:copier -- --confirmer`, premier envoi du code, un cycle lancé à la main, vérification en ligne, puis `CHAINE_ACTIVE` = `oui`. Confirmer aussi l'interprétation de la police hébraïque. Aucun appel payant sans plafonds explicites et `--confirmer`.

## Repères techniques

- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Site : `npm run web:dev` depuis la racine (configuration `site` de `.claude/launch.json`) ; `next build` ne vérifie pas les types avec TypeScript 7, d'où `npm run web:typecheck`. Un module `'use client'` n'exporte que des composants : une fonction partagée va dans `apps/web/lib/`.
- Les agents d'un workflow de recherche peuvent utiliser le navigateur intégré : vérifier la maquette dans un onglet à soi (`tabs_create`) et toujours passer son `tabId`.
- `drizzle-kit generate` s'arrête sur une question si une colonne disparaît en même temps qu'une autre apparaît : le faire en deux migrations.
- La sonde et les relectures utilisent `data/curation.db` : attendre la fin de la sonde avant une migration.
- `npm run maquette` sort en code 1 si un exemple est « à vérifier » ou introuvable ; `npm run maquette:reel` (macOS, ffmpeg dans `~/.local/bin`) ; les tests échouent si `maquette/donnees.js` ou la vidéo sont périmés.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
