# État du projet

_Réécrit le 2026-11-05 (cap « réseau social vivant », SPEC §0). Seul l'état actuel figure ici ; relevés et notes datés : [docs/historique.md](docs/historique.md) ; journal des jalons : [PROGRESS.md](PROGRESS.md)._

## Cap

Réseau social vivant autour de l'IA, du développement et de la technologie : rapidité, pertinence du tri, angle éditorial utile, marque reconnaissable, communauté. Six agents (Nodi, Repo, Pyxo, Mova, Pulse, Radar), priorités inchangées. Volume et plafonds de dépense actuels conservés (voulus par l'utilisateur).

## Ce qui fonctionne réellement (vérifié le 2026-11-05)

- **Site** https://web-phi-nine-38.vercel.app (Vercel, projet `web`) sur la base **Turso `curation-ia`**, qui fait foi. 67 publications en ligne (Repo 30, Mova 13, Nodi 11, Pyxo 9, Pulse 2, Radar 2). Fil principal sans les versions déjà remplacées (vérifié sur les données en ligne).
- **Maquette en ligne** : `/maquette/accueil.html` et `/maquette/index.html`, copiées au build, non indexées. **Accueil refait le 2026-11-05 à la demande de l'utilisateur** : fond blanc, dégradé violet aux couleurs qui défilent, barre en pilules à indicateur glissant, curseur flèche, puis le titre « Curation [logo] AI » avec notre logo (anneau aux six couleurs, visière sombre) dont les yeux glissent et l'anneau pivote, et les six **vrais personnages** (rendus de l'utilisateur, détourés depuis les planches par Vision sur le Mac, `maquette/medias/agents/`) dont les yeux d'origine ont été effacés : des yeux lumineux de leur couleur glissent dans la visière, clignent, et le personnage pivote un peu en perspective ; ils se présentent tour à tour (demandes du 2026-11-06 : 3D « trop grosse », formes inventées refusées, « les vrais personnages doivent bouger de la même manière », mascotte du titre remplacée par notre logo), puis une fenêtre d'application façon messagerie (demande du 2026-11-06, qui remplace le bac des agents flottants, jugé « moche ») : les six agents à gauche avec le titre de leur dernier post publié, à droite la vraie capture de la page de ce post sur le site (`maquette/medias/tuto/`), ses étapes (source, citations, contrôles, publication) et un lien vers lui. Ajouts du 2026-11-06 (demandes de l'utilisateur) : champ de particules façon Antigravity, espacé et pâle (anneau autour du pointeur, qui se promène seul sur écran tactile) ; agents du haut qui se déplacent un peu en se dandinant ; sous le titre, une accroche dans le style de l'App Store (phrase en noir, suite en gris, police du système) qui couvre IA, dev et tech ; sous la fenêtre, la présentation des six agents (personnage animé, spécialité telle que le site l'affiche, bouton « Suivre » sans enregistrement), le délai de l'annonce au fil (médianes mesurées : repérée 2 h 30, rédigée et vérifiée 1 min, en ligne 11 min ; 3 h 30 de bout en bout, sur 4 nouveautés), puis suivre, lire, commenter et l'inscription ; le pied de page (droits d'auteur, mentions) sera dicté par l'utilisateur. Dégradé jugé « trop IA » remplacé par un papier lilas uni à grain fin ; police Recursive (axe « casual » pour les titres, « mono » pour dates et sources) au lieu d'Atkinson. Aucun texte rédigé sur la page (« ça fait trop ») ; titres repris tels que le site les affiche. Vérifié en local (bureau 1 366 px, 60 images/s, et mobile 375 px).
- **Chaîne automatique** (`chaine.yml`) : collecte, capture des pages, brouillons, contrôles avec élagage et relance, planification, traduction, publication sans relecture de ce qui passe tous les contrôles. Publications vues en ligne ce jour.
- **Recherche** (FTS5 + lexique `l1`) : 94 % sur le jeu `r1`. Avis de validité (version plus récente, source mise à jour) affiché.
- **Sources** : 102 en base, registre d'accès (six états, reprises espacées, aucune suppression), Hacker News en signal, EDGAR essayé en réel depuis le poste.
- **Tests** : 837 au vert.

## Couverture des agents (2026-11-10, vérifié sur la base en ligne)

- **Panne de publication du 10 au 11 novembre (corrigée le 2026-11-11)** : les 5 cycles planifiés ont été arrêtés par la limite de 20 min de GitHub pendant la découverte, avant la publication ; le bilan n'étant écrit qu'en fin de cycle, la découverte recommençait à chaque fois. Correction (commit 83f938a) : publication juste après la planification, bilan enregistré après chaque étape, limite 45 min. 13 posts prévus publiés à la main le 11 (dont n° 239, Fable 5.2 et Mythos 5.2). 90 découvertes GitHub en attente, rédigées à 6 par cycle depuis le 11 (demande de l'utilisateur).
- **266 sources définies** dans le code (91 avant), plus 108 dépôts suivis :
  - 175 ajoutées, flux testés en réel (`docs/sources.md` §3.12) ;
  - Anthropic lu par son plan de site : 15 pages collectées, dont celle de Fable 5.2.
- Bilan `npm run couverture` après la collecte du poste :

  | Agent | Sources | Collectées < 24 h |
  |---|---|---|
  | Nodi | 32 | 28 |
  | Pyxo | 27 | 19 |
  | Mova | 34 | 7 |
  | Pulse | 42 | 17 |
  | Radar | 41 | 24 |
  | Repo | 108 | 15 |

  Les versions GitHub, Show HN et la découverte élargie attendent le premier cycle en ligne (jeton d'Actions).
- **Découverte GitHub** : 60 thèmes dont les skills pour tous usages, trois fenêtres de dates, candidats par agent. Jeu de contrôle des 12 dépôts de l'utilisateur, absents des requêtes : 6/12 ramenés.
- **Premier cycle complet après la correction** (2026-11-11, 10:40 UTC, commit b149166) : terminé en 28 min, les 11 étapes réussies, 7 posts publiés automatiquement (n° 266-269, 273, 275, 276, dont 4 dépôts découverts). La collecte s'arrête à son échéance (50 sources sur 402 ce cycle, 207 en file) : la file sert désormais d'abord les sources jamais collectées, puis les moins récemment collectées.
- **Higgsfield** (2026-11-11) : flux officiel du blog ajouté (`feed:higgsfield-blog`), filtré sur les titres d'annonce (nouveaux modèles, studios, MCP) ; guides et classements écartés. L'annonce « Fable 5.2 sur Higgsfield MCP » n'existe que sur X (non branché) : Fable 5.2 reste couvert par le post n° 239.
- **Débit de la sélection** (2026-11-12) : 2 203 actualités collectées depuis le 8 novembre n'ont jamais été examinées. Depuis l'élargissement, 500 à 1 650 arrivent par jour, contre 30 examinées par cycle (70 à 120 par jour), les plus récentes d'abord ; un gros sujet couvert par plusieurs articles (affaire d'espionnage chez NVIDIA, 7 articles) n'est pas reconnu comme tel. Un regroupement des titres sans modèle a été essayé sur ces 2 203 titres et abandonné, car il groupait surtout des expressions banales (« open source », « coding agent »). Le tri des titres en lot par le modèle avant la sélection a été validé par l'utilisateur et construit le 2026-11-12 (ADR 0015).
- **Passage à Claude Haiku 5.5** (2026-11-13, décision de l'utilisateur, ADR 0016) : la chaîne est réglée sur `claude-haiku-5-5`. Ses étapes payantes exigent la clé du modèle choisi, et la traduction n'est plus réservée à DeepSeek. Tant que l'utilisateur n'a pas réclamé les crédits Max ni ajouté le secret `ANTHROPIC_API_KEY`, ces étapes sont sautées. **En attente de l'utilisateur** : la clé, et de nouveaux plafonds. Au coût de Haiku, environ 3 fois Flash par rédaction, le reste du plafond total de 4 $ (environ 1,64 $) tient quelques jours.
- **Cybersécurité et dépôts pour le travail** (2026-11-12, demande de l'utilisateur) : 11 flux de sécurité ajoutés (BleepingComputer, The Hacker News, Krebs, The Record, SecurityWeek, Dark Reading, CISA, Unit 42, Socket, Wiz, Project Zero), signés Pulse, contenus externes attribués, interrogés en réel le 2026-11-12 (docs/sources.md §3.13). Découverte GitHub : 16 thèmes de plus (productivité, bureau, MCP finance et TradingView, scraping, écriture, vidéo regardée par l'agent, orchestration d'agents) ; exemples de l'utilisateur ajoutés au jeu de contrôle. Collecte réelle à constater au prochain cycle. Consignes `s6` (décision de l'utilisateur du 2026-11-12, « Oui, toutes ») : une cyberattaque majeure entre dans le périmètre même sans lien avec l'IA ni le développement (impact 1, ou 2 si elle touche les outils de notre public) ; un incident local reste écarté. Aucune qualification payée à refaire (0 brouillon « qualifiee »).
  - Activé par `npm run brouillons` ; `CURATION_TRI=0` le coupe.
  - Testé sur fixtures, pas encore lancé en réel, faute de solde DeepSeek.
  - Au premier cycle réel, contrôler `tri_titres`, `tri_retenus` et `tri_echec` dans le bilan du lot, ainsi que le coût de l'étape `tri` dans `npm run couts`.
- **Rédaction des découvertes** : 6 par cycle depuis le 2026-11-11 (2 auparavant), sous les plafonds 0,10 $ par cycle et 0,40 $ par jour. TokenEconomizer (Microsoft), trouvé automatiquement, est en ligne (post n° 229). 90 découvertes attendent ; alerte de file dans `npm run etat`.
- **Fable 5.2** :
  - en ligne : « Mythos 5.2 sur Bedrock » (n° 214) et « Fable 5.2 dans GitHub Copilot » (n° 223) ;
  - l'annonce principale (n° 1449, avec la page d'Anthropic en appui) est rédigée, mais « à vérifier » : « 5.2 » absent des citations retenues, à reprendre par la relance.
- **Mova** : deux dossiers par étapes en ligne, vidéo (12 dépôts, n° 245) et 3D et Blender (8 dépôts, n° 246). Visuel refait le 2026-11-10 en cartes à notre identité : une carte de feutre cousue par ressource, avec la mascotte de Mova, un accessoire dessiné par étape (12 scènes différentes), l'étape, le nom et l'auteur. Aucune image de tiers ; images et lignes `media_asset` remplacées, statut et planning des posts inchangés.
- **Instagram** demandé comme source de skills : impossible sans contournement (robots.txt : `Disallow: /` pour tous). Voie officielle : API Graph de Meta, avec compte professionnel et application validée, donc décision de l'utilisateur. En attendant : liens transmis à la main, et thèmes « skills pour tous usages » ajoutés à la découverte GitHub.
- **Cycles** : aucun cycle GitHub depuis le 2026-11-09 à 20 h 29 UTC (cron non garanti). Le 2026-11-10, les étapes ont été lancées depuis le poste, sur la base en ligne : 17 posts publiés.
- **Vidéos des sources sous les posts** (décision de l'utilisateur du 2026-11-10, option « Vidéos des sources ») :
  - la vidéo que l'éditeur a placée dans sa page (lecteur YouTube ou Vimeo, ou balise `<video>`) est rattachée au post comme média `external_embed` ;
  - le montage reste le média principal ;
  - affichage sous le post, dans le fil et sur la page du post ;
  - rien n'est chargé chez l'hébergeur avant le clic ; YouTube passe par youtube-nocookie ;
  - la vidéo est attribuée à l'éditeur, avec un lien vers la page d'origine ;
  - nouvelle étape `videos` du cycle (posts des 3 derniers jours) ; rattrapage : `npm run videos -- --tous --confirmer` ;
  - 5 vidéos sur 131 posts en ligne (Meta ×3, AWS, NVIDIA/YouTube), vérifiées dans le navigateur.
  - Limite : les liens vidéo écrits dans un texte (README, « Watch the recording ») sont ignorés.
- **Accueil → réseau fluide** (2026-11-11) : chaque agent de la rangée ouvre sa page en fondu, le personnage devient la photo du profil, page préparée dès le survol (préparation non encore observée dans le Chrome piloté).
- **Dépense** : 1,60 $ sur 4 $ ; 0,31 $ le 2026-11-10.

## Construit, pas encore vérifié en ligne

- EDGAR dans la chaîne en ligne : attend le secret `CURATION_CONTACT_SEC`.
- Prompt `p3-22` (aucune définition, aucune formule promotionnelle) : en place, effet à constater sur les prochains posts.
- Trace durable de chaque cycle (`run` de type `cycle`) : en place, premier cycle tracé à venir.
- Collecte : 7 min au plus par cycle (écriture en base ~6 s par source) ; le reste passe au cycle suivant.

## Reste à développer

1. **Essai autonome** (P8 avancé) : un outil, protocole réduit, runner GitHub éphémère sans secret, conteneur sans réseau, trace consultable, relié au post initial. Demande une migration (table des essais).
2. **Parcours communauté** (P9 avancé) : compte → profil → contribution → commentaire ou proposition de correction avec preuves ; abonnements humains et agents. Attend le choix de la méthode de connexion.
3. **arXiv** (statut « prépublication non évaluée ») et rôles des sources dans le code (découverte, primaire, preuve de test).
4. **Hébergement du cycle** : dépôt public + Worker Cloudflare toutes les 10 min (ADR 0006, décision du 2026-11-06) ; code prêt dans `infra/declencheur/`, mise en route par l'utilisateur.
5. **Visuels** : fonds trop petits (504 × 171 px) ; logos au premier plan à revoir selon les droits ([docs/droits.md](docs/droits.md)) ; le site « ne donne pas envie » (retour de l'utilisateur du 2026-11-05) : la direction retenue est celle du nouvel accueil de la maquette (blanc, violet, mascottes animées), à porter ensuite sur le site.
6. 3 à 5 contenus LinkedIn avec preuves dans `communication/`, après vérification du parcours réel découverte → contenu → recherche.

## Prochaine action (plan validé par l'utilisateur le 2026-11-06, en questions à choix)

Ordre, avec mise en ligne et vérification à chaque étape, sur ordinateur d'abord :
- **Réseau refait le 2026-11-07 (demandes de l'utilisateur)** : menu gauche Réseau / Rechercher / Notifications / Messages / Reels / Profil, « Réglages » en bas (à la place de la langue) ; colonne droite comme sur X (« Rejoindre le réseau » + les six agents avec Suivre) ; « Comptes » retiré du menu ; barre Commenter / J'aime / Partager sous chaque post (pas de compteur, « avec un compte, bientôt ») ; page Rechercher interactive (propositions pendant la frappe, sujets du moment) ; page Réglages (Votre compte, Sécurité, Notifications en attente des comptes ; Système : langue, affichage bientôt, animations, taille du texte, police lisible, cookies ; Centre d'aide). Audit axe : 0 violation sur 180 vues.
0. **En cours chez l'utilisateur** : mise en route du déclencheur Cloudflare (`npx wrangler secret put GITHUB_TOKEN` lancé dans son terminal, réponse `y` attendue ; puis connexion Cloudflare, jeton GitHub fine-grained limité au dépôt avec Actions en écriture). Ensuite : `npx wrangler deploy` dans `infra/declencheur/`, vérifier qu'un cycle démarre dans les 10 min, puis mesurer le délai annonce → fil (objectif 20 min).
1. ~~Barre du haut~~ (fait le 2026-11-06 : indicateur calé sur l'onglet, fond plein au défilement).
2. ~~Accueil sur le vrai site~~ (fait le 2026-11-06, retouché plusieurs fois le même jour à la demande de l'utilisateur ; état final : `/` = accueil, fil à `/fil`. Titre « Curation [logo] AI » aligné à gauche, accroche style App Store (« repère ce qui sort en IA, en dev et en tech »), rangée des six personnages animés, « Créer un compte » (annonce « bientôt ») et « Voir le fil » ; fenêtre façon messagerie avec le dernier post de chaque agent en direct ; « Les six agents » en grille de 4 : rôle (« Nouveau skill »…), spécialité, trois vrais posts en exemples ; « De l'annonce au fil » : ticket du post le plus rapide mesuré depuis l'annonce (n° 134, 40 min, source primaire, citations retrouvées) et, pour Repo et Mova, ticket du repérage au post vérifié (skills : 4 min et 1 min) ; cas lents et médianes retirés à sa demande. Textes fr / en / he (hébreu à faire relire). Audit axe : 0 violation sur l'accueil ; reste une alerte ancienne sur `/recherche`, `label-content-name-mismatch`.)
3. **Pied de page et quatre pages légales** : mentions légales, confidentialité (page RGPD), cookies, CGU ; d'après les sources officielles (CNIL, Légifrance, loi israélienne), cases à remplir par l'utilisateur, « à faire relire ». Contact dans une variable Vercel, jamais versionné. « © 2026 [nom]. Tous droits réservés. », portée précisée dans les CGU (marque, design, code, base de données ; citations, logos et captures à leurs titulaires ; aspiration interdite). Nom de marque centralisé (nom définitif pas encore choisi). Ni politique de remboursement ni bandeau de cookies tant qu'inutiles (seul cookie : la langue).
4. **Inscription** : e-mail et « Continuer avec Google / GitHub / Apple » ; phrase sur les données, case CGU non cochée, « Continuer sans compte » vers le fil. Boutons inactifs d'abord ; puis GitHub et Google, puis e-mail, Apple plus tard (dépense). Comptes créés par l'utilisateur ; migration avec son accord.
5. ~~Réseau social~~ (2026-11-06 ; ensuite « Fil » et « Explorer » jugés doublons : un seul bouton « Réseau » sur la présentation, Accueil et Explorer fusionnés en une page « Réseau » (sujets en haut, posts dessous), `/recherche` sans requête renvoie à `/fil`. Avant : la page « fil » à part est supprimée ; « Fil » et « Voir le fil » mènent au vrai réseau, `/fil` = son accueil. Toutes les pages du réseau (accueil, Explorer, notifications, messages, Reels, comptes, profil, posts) partagent `Cadre.tsx` : application plein écran, sombre comme la fenêtre de l'accueil, menu à gauche (logo, rubriques, agents, langue), recherche et « Créer un compte » en haut, posts en cartes `CartePost` (étapes, boutons en pilule). Explorer : un rendu par sujet avec le nombre de posts, plus de doublons. Audit axe : 0 violation sur 168 vues.)
6. **Page d'un post**, dans la forme retenue ; les posts restent publics.
7. **Réglages** : Votre compte (dont suppression du compte), Sécurité, Notifications, Système (Affichage système / clair / sombre ; Langue fr / en / he ; Animations normales / réduites ; Texte : taille et police lisible ; Cookies), Centre d'aide (liens, texte dicté par l'utilisateur). Thème clair d'abord, sombre ensuite.

## Décisions applicables

- Publication automatique de ce qui passe tous les contrôles ; le reste demeure « à vérifier ».
- Budget DeepSeek autorisé : 4 $ au total (0,84 $ enregistré le 2026-11-05) ; plafonds en ligne 0,10 $ par cycle, 0,40 $ par jour, 3,95 $ au total ; prévenir avant d'approcher 4 $.
- Radar : big tech seulement quand le sujet touche l'IA (consignes `s5`). Presse et Hacker News toujours attribués, jamais confirmation primaire.
- Aucune source contournée (403, 429, robots.txt, Medium) ; une source bloquée est différée avec son motif.
- Migrations de la base en ligne : avec l'accord de l'utilisateur.

## En attente de l'utilisateur

0. **Solde DeepSeek épuisé (bloquant, 2026-11-12)** : toutes les réponses sont des 402 « Insufficient Balance » depuis le 2026-11-11 à 18:31 UTC ; plus aucun brouillon, découverte ni traduction. Recharger le compte sur la page « Top up » de DeepSeek (dépense : à faire par l'utilisateur). Dépense enregistrée à cette date : 1,86 $ sur le plafond de 4 $, qui ne correspond donc pas au solde réel du compte.
1. **Méthode de connexion** des comptes (parcours communauté).
2. **Migration** de la table des essais, au moment de l'essai.
3. **Hébergement du cycle** : choisi le 2026-11-06, dépôt public + déclencheur Cloudflare toutes les 10 min (ADR 0006), objectif 20 min de l'annonce au fil. Reste à faire par l'utilisateur : passer le dépôt en public, créer le compte Cloudflare et le jeton GitHub.
4. **Domaine** : disponibles le 2026-11-05 chez Vercel : `curationai.app` (9,99 $ la 1re année, 15 $ ensuite), `curationai.dev` (9,99 $, puis 13 $), `curationia.com` (12,03 $), `curationai.co` (29,99 $, puis 24,80 $), `getcuration.ai` (160 $ pour 2 ans) ; `curationai.fr`, `curationai.social`, `curation-ia.com`, `curationai.xyz` disponibles, prix non obtenus ; pris : `curationai.com`, `curation-ai.com`, `curationai.io`, `curationai.net`, `curation.ai`.
5. **Droits** : mascotte, avatars, bannières, fonds ; logos au premier plan ([docs/droits.md](docs/droits.md) §4).
6. Secret GitHub `CURATION_CONTACT_SEC` ; fonds en haute définition ; jeu de recherche non vu ; liste témoin « construire » ; X, Reddit, LMArena ; hébreu relu par un locuteur natif.

## Repères techniques

- **Base en ligne depuis le poste** : lignes `DATABASE_*` de `.env.local` commentées ; commande : `env $(sed -n 's/^# \(DATABASE_[A-Z_]*=[^ ]*\)$/\1/p' .env.local) npm run -s <commande>`, sans guillemets autour de `$(…)`. Ne jamais afficher `.env.local`.
- Commandes : `etat`, `couts`, `delais [-- --depuis <date>]`, `lancer -- --confirmer`, `publier -- --confirmer`, `approfondir`, `brouillons:recontroler`, `brouillons:planifier`, `recherche:evaluer`, `sources:registre`, `maquette` (régénère `maquette/donnees.js`).
- Dépôt `git@github.com:Aloncoh/curation-ia.git` (privé), branche `p3-brouillons`, envoi par `git push origin HEAD:main` ; Vercel déploie `main`.
- GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- `npm run web:typecheck` (le build ne vérifie pas les types) ; `drizzle-kit generate` : une colonne qui disparaît et une qui apparaît se font en deux migrations.
- Worktree `.worktrees/mobile` : ne pas y écrire.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
