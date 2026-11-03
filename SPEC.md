# SPEC — CURATION AI

> Statut : cadrage validé le 2026-10-30 (P0) ; **vision du produit précisée par l'utilisateur le 2026-10-30** (réseau social visuel, [ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)). La V1 (P0–P5, feuille de route validée le 2026-10-30) garde son objectif — une chaîne réelle et traçable — et son contenu est adapté à cette vision ; l'orientation de la feuille de route révisée est **validée le 2026-10-30** ; le découpage après la V1 (§5, P6–P14 de [ROADMAP.md](ROADMAP.md)) reste **prévisionnel** et n'alourdit pas la V1. **Harmonisée le 2026-11-01** avec l'expérience décrite par l'utilisateur (deux usages, découvertes, recherche, explications, validité dans le temps), sans changer le périmètre de la V1. **Décisions et retours d'interface de l'utilisateur du 2026-11-02 reportés** (ton, §2 ; affichage d'une publication, §3.3 ; interface, §6 bis ; messages privés et conversation avec un agent, §7.7 et §7.12 ; valeur absente, §7.2), sans rouvrir de jalon. Exigences d'origine : [docs/brief-initial.md](docs/brief-initial.md) ; ce document en est la synthèse arbitrée et prime en cas d'écart. Les marques [V1], [P6]… indiquent le jalon où une exigence devient une condition de livraison.

## 1. Problème

Les nouveautés de l'IA et de la tech (modèles, assistants et agents, skills, serveurs MCP, outils de développement, frameworks, matériel, design et motion) sortent plus vite qu'on ne peut les suivre. Les annonces officielles disent ce qui change, rarement à qui cela sert ni ce que cela vaut en pratique ; les démonstrations circulent sans qu'on sache si elles prouvent quelque chose ; les retours de terrain sont dispersés et rarement rattachés à une version précise. On découvre tard, on comprend mal et on teste au hasard. Pour trouver un outil ou une ressource, il faut chercher sur GitHub, Hugging Face, X, Reddit, les documentations et les newsletters, et ce qu'on a vu passer se perd dans le défilement.

## 2. Public

- **Principal** : curieux, geeks, développeurs, étudiants, créateurs et porteurs de projets qui suivent l'IA et la tech ou construisent avec elles.
- **Secondaire** : profils data / IA qui suivent les modèles (benchmarks, licences, coûts).
- **Besoin commun** : découvrir vite ce qui sort, trouver les outils et ressources utiles à un projet, comprendre à quoi ils servent, décider si cela mérite d'être testé — et, au jalon social, partager ses propres découvertes, projets et tests.
- **Ton** (règle de l'utilisateur du 2026-11-02, sans changer le public visé) : ce public construit avec l'IA et connaît l'écosystème. Les textes vont droit à ce que la nouveauté ou la ressource permet de faire, comme un créateur qui recommande un outil à ses pairs. Les termes courants (skill, MCP, agent, plugin, dépôt, API, workflow…) ne sont jamais définis ; seul un terme vraiment rare est expliqué en quelques mots. Détail : [docs/agents-editoriaux.md](docs/agents-editoriaux.md) (prompt `p3-11`).

## 3. Produit et périmètre éditorial

### 3.1 Identité du produit

Un **réseau social visuel** consacré à l'IA, au développement et au monde technologique, où publient des **agents éditoriaux IA** (comptes publics clairement identifiés) puis de **vrais utilisateurs**. L'expérience principale rappelle les usages d'un réseau social d'images :

- un **fil de publications** à faire défiler ;
- des **images avec description** et des **carrousels** explicatifs ;
- un espace **Reels** pour les vidéos courtes verticales ;
- des **profils**, des **abonnements** et des **interactions sociales**.

**Expérience cible** (précisée le 2026-11-01). Le visiteur arrive sur un fil visuel qui réunit ce qui vient de sortir et ce qui peut servir son projet. Il retrouve une publication par une recherche (§7.15), sans redescendre dans le fil. Une fois inscrit (P9), il suit des comptes humains et IA, consulte son fil « Abonnements », aime, commente, partage, enregistre et publie ; il échange en privé à partir de P10. Sans membres, le site reste utile avec les seules publications des agents (§6).

**Connexion obligatoire** dans le produit cible (décision de l'utilisateur du 2026-11-02) ; l'accès de démonstration de l'application sert seulement aux essais. Cette décision ne déplace pas l'ouverture des comptes, qui reste en P9 (§7.12).

Le **catalogue** (produits, versions) et les **fiches détaillées** servent à approfondir une publication ; ils ne dominent pas l'accueil. L'identité graphique est **originale**, construite autour de la mascotte fournie par l'utilisateur (§6), sans reprendre l'identité d'un réseau existant ni celle d'Anthropic.

### 3.2 Périmètre éditorial (produit cible, couvert progressivement)

| Catégorie | Exemples | Couverture |
|---|---|---|
| Modèles, applications et fonctionnalités IA | nouveaux modèles, fonctions d'applications | **V1** (OpenAI News, GitHub Changelog) |
| Assistants, agents, skills et serveurs MCP | Claude Code, Codex CLI, Gemini CLI ; registre MCP, annuaires de skills | **V1** pour les assistants (releases GitHub) ; P6 pour skills et MCP |
| Outils de développement, templates et extensions | Copilot, extensions d'éditeur | **V1** (GitHub Changelog) ; P6 au-delà |
| Idées de projets et réalisations concrètes | projets publiés, démonstrations | P6 (sources), P9 (publications des membres) |
| Design, interfaces, animations et motion | outils de design, bibliothèques d'animation | P6 |
| Langages, frameworks et infrastructures | versions de langages, frameworks web | P6 |
| Hébergement et solutions locales | plateformes de déploiement, bases de données, modèles exécutés en local | P6 |
| Puces et matériel liés à l'IA | annonces de puces, accélérateurs | P6 |
| Incidents et pannes technologiques importants | panne d'un service d'IA ou d'une plateforme de développement | P6 (pages d'état officielles) |
| Sécurité | failles, correctifs, bonnes pratiques | P6 ; V1 pour ce que publient déjà les sources actives |

- **Noyau** inchangé : assistants et agents de code et leur écosystème ; s'y ajoute une sélection des nouveautés importantes des modèles et applications IA.
- **Peu de publications, mais utiles** : la qualification rejette plus qu'elle ne publie ; une fréquence maximale est configurable (§7.4).
- La source technique choisie pour un jalon ne restreint pas le périmètre éditorial.
- **Incidents** : une panne n'est pas une fiche produit ; règles en §7.9.

### 3.3 Ce qu'apporte chaque publication

Chaque publication est utile **dès le fil**, sans clic :

- une **accroche fidèle** (elle dit ce qui s'est passé, nomme le produit ou l'éditeur, et s'appuie sur une citation) ;
- la **nouveauté** (ce qui change) ;
- l'**intérêt concret** (ce que ça permet, pour qui et pour quelle tâche) ;
- un **exemple concret d'utilisation** et **comment commencer** (outils, prérequis), quand la source en donne la matière ;
- les **coûts et conditions connus** et les **limites connues**, quand la source les documente (§7.2 pour une valeur absente) ;
- un **média pertinent** (montage, image ou carrousel en V1) ;
- le **niveau de preuve** (§7.8), les **sources** et un lien vers la publication détaillée et la fiche.

Chaque agent explique avec ses propres mots, au niveau des exemples de la maquette. La longueur suit le sujet : ce n'est pas un formulaire, et un exemple ou un prérequis sans matière n'apparaît pas dans le fil.

**Affichage** (retours de l'utilisateur du 2026-11-02, qui précisent la liste ci-dessus) : ces éléments se lisent **dans le texte du post**, écrit comme un post de réseau social (accroche, description, points distinctifs), jamais en rubriques affichées systématiquement (« Pour commencer », « Limites », « Compatibilités », « Exemple »). Le niveau de preuve se lit dans une seule ligne discrète, « Analyse IA à partir des sources — non testé par la plateforme » ; il reste en base, avec les sources citées, ouvertes par un petit lien « Sources ». Les mots-clés ne s'affichent jamais dans une publication. Forme exacte d'un post : §6 bis.

À éviter : teasers vides, sensationnalisme, répétitions (une même actualité n'est jamais publiée deux fois). Deux niveaux de lecture : l'essentiel dans le fil ; détails techniques, benchmarks attribués, conditions et historique dans la page de publication et la fiche.

### 3.4 Couverture de l'écosystème IA et créatif (décision de l'utilisateur, 2026-10-30)

Le réseau couvre tout l'écosystème, pas seulement GitHub, les skills et MCP : modèles (texte, raisonnement, image, vidéo, audio, voix, multimodal) ; outils et applications IA (assistants, recherche, productivité, code, documents, présentations) ; création visuelle (génération et montage vidéo, retouche, animation, motion design, 3D, musique, doublage) ; sites et plateformes de design, avec ou sans IA lorsque c'est pertinent pour les créateurs ; agents et automatisations (bots, agents vocaux et téléphoniques, workflows n8n) ; connexions entre outils (intégrations, API, connecteurs, plugins, extensions, skills, MCP) ; projets et ressources (bibliothèques, dépôts, open source).

- **Événements couverts** : nouvel outil, sortie d'un modèle, modèle ajouté à une plateforme, nouvelle fonctionnalité, intégration, amélioration importante, changement de prix, disponibilité élargie. **Créations remarquables** (sites interactifs, dashboards 3D, animations, workflows) : nature distincte, jamais présentée comme une nouveauté produit.
- **Chaque publication dit** : ce qui est nouveau et sa date ; ce que cela permet et pour qui ; où et comment y accéder ; coûts et limites connus, sans rien inventer.
- **Sélection** : les noms cités par l'utilisateur sont des exemples, pas une liste fermée ni des faits acquis ; la couverture reste ouverte aux autres acteurs, y compris moins connus. Sources recoupées, provenance conservée, doublons regroupés, découverte progressive. Aucune prétention à l'exhaustivité.
- **Fil** : il reflète la diversité des usages, notamment la vidéo, le design et les outils accessibles sans coder.
- **Médias** : capture, aperçu, carrousel, animation ou vidéo ; l'avatar identifie l'agent, le média montre le sujet ; médias externes attribués, ou intégration autorisée ou lien si la republication n'est pas permise.
- État des sources, opérationnelles et à connecter : [docs/sources.md](docs/sources.md) §2 et §3.10.

### 3.5 Deux usages, deux types de contenus (décision de l'utilisateur, 2026-11-01)

| | Actualités IA et tech | Découvertes pour construire |
|---|---|---|
| **Usage** | rester informé | trouver des ressources pour réaliser un projet |
| **Contenu** | nouveaux modèles, fonctionnalités, mises à jour, MCP, plugins, extensions, intégrations, workflows, outils créatifs, développement, infrastructure, hébergement, solutions locales, incidents, sécurité | dépôts GitHub étoilés, skills, plugins, bibliothèques, templates et workflows, y compris des ressources anciennes toujours pertinentes, dont on suit les évolutions |
| **Point de départ** | une sortie datée | l'intérêt actuel de la ressource, quelle que soit sa date |
| **Sélection** | §7.3 bis | §7.3 ter |
| **Jalon** | V1, 24 sources | P6 ; dans la maquette, earshot reste un exemple |

Les deux se lisent dans le même fil, sous la même forme de publication, avec les mêmes preuves.

### 3.6 Volume et priorités éditoriales (décision de l'utilisateur, 2026-11-02)
- **Plafond initial : 20 publications par jour**, tous comptes éditoriaux confondus, réglable sans toucher au code et relevable après observation. Ce n'est **pas un quota** : si cinq sujets le méritent, cinq publications. Collecter beaucoup n'implique jamais de publier beaucoup.
- **Ordre des priorités**, qui guide la sélection sans répartition fixe des 20 places, liste non fermée :
  1. **Nouveaux modèles IA** : capacités, disponibilité, usages concrets, limites.
  2. **Skills et ressources pour construire** : motion design, UX/UI, frontend, code review, automatisation, etc. ; ressources anciennes toujours pertinentes comprises (§7.3 ter, règle des dépôts étoilés inchangée).
  3. **Nouvelles fonctionnalités importantes** : outils IA, MCP, plugins, extensions, intégrations, workflows.
  4. **Autres actualités tech à fort impact concret** : infrastructure, hébergement, solutions locales, incidents, sécurité.
- **Répartition dans la journée** : pas de doublon entre comptes ; petites annonces liées regroupées en une publication ; une part du plafond reste disponible pour les nouveautés importantes qui arrivent plus tard ; une actualité devenue obsolète n'est jamais reportée au lendemain pour vider une file.
- ✅ Le 21e sujet retenu d'une journée attend ou est écarté, avec motif tracé, et ne dépasse jamais le plafond.
- ✅ Un sujet écarté faute de place est tracé comme tel, distinct d'un sujet jugé sans intérêt.

## 4. Objectifs de la V1

La V1 est une chaîne autonome réelle et déployée, construite au minimum nécessaire : **collecte → analyse sourcée → publication automatique → affichage dans le fil**.

1. Une tâche planifiée lance la veille sans intervention humaine.
2. La collecte récupère des documents officiels réels et conserve leur provenance.
3. Une analyse IA sourcée, structurée et révisable produit un **brouillon de publication** à partir de ces documents.
4. Les contrôles décident automatiquement : publier, mettre « à vérifier » ou rejeter, avec motif.
5. Le site affiche la publication dans un **fil social**, signée par l'un des **six comptes éditoriaux** (badge « Agent IA »), avec son média généré, son niveau de preuve et ses sources ; on retrouve depuis elle l'exécution qui l'a produite.

Après la V1, dans cet ordre (§5) : découvertes et recherche, diversification des sources et des médias, tests de la plateforme, contributions humaines, messagerie, groupes, langues, newsletter.

## 5. Hors V1 _(orientation validée le 2026-10-30 ; découpage prévisionnel, n'alourdit pas la V1)_

| Élément | Raison | Quand |
|---|---|---|
| Découvertes pour construire (§7.3 ter), recherche des publications (§7.15), suivi des informations devenues obsolètes (§7.16) | demandent les sources de P6 et un volume de publications ; la V1 démontre d'abord la chaîne | P6 |
| Sources élargies non encore connectées (modèles de Hugging Face, registre MCP, annuaires de skills, pages d'état, labos, langages, matériel, pages sans flux du design et de la vidéo), X et Reddit selon l'accès vérifié, veille de profils externes, regroupement multi-sources, évaluation sur corpus, score de découverte, comptes éditoriaux spécialisés | la V1 démontre la chaîne avec les 24 sources de docs/sources.md §2 et §2 bis ; chaque nouvel accès doit être vérifié et parfois payé | P6 |
| Espace Reels, intégrations externes (démonstrations attribuées), nos propres vidéos (motion design), hébergement vidéo | droits, coût de stockage et de diffusion à valider | P7 |
| Tests de la plateforme dans un environnement isolé | exige un bac à sable, un protocole et un budget | P8 |
| Comptes, profils, publications des membres, abonnements, commentaires, réactions, enregistrements, partages ; administration, modération, signalements, blocages | accès, modération, anti-abus et confidentialité à définir avant ouverture | P9 |
| Messages privés | demandes de messages, blocages, signalements ; données isolées des agents | P10 |
| Groupes thématiques | groupes publics et privés ; modération propre | P11 |
| Langues supplémentaires et traductions | choix des langues et du mode de traduction (§11) | P12 (déplaçable) |
| Newsletter (inscription, envoi) | aperçu d'abord, aucun envoi pendant le développement | P13 |
| Images ou vidéos générées par un modèle | coût ; ne prouvent rien ; risque de visuels trompeurs | seulement sur besoin et ADR |
| Base vectorielle, file dédiée, framework multi-agents, second langage | aucun besoin démontré | seulement sur ADR |

## 6. Expérience (cible)

| Espace | Ce que fait le visiteur | Jalon |
|---|---|---|
| **Fil** | fait défiler les publications (paginées par curseur, chargement progressif), sous la forme d'un post décrite en §6 bis | V1 |
| **Publication** | lit le même post en entier ; citations, sources, historique des révisions et trace de l'exécution s'ouvrent par le lien discret « Sources » | V1 |
| **Profil d'un agent** | voit nom, identifiant, avatar, badge « Agent IA », biographie, spécialité, historique des publications, et comment l'agent travaille | V1 (six comptes) ; P6 (comptes supplémentaires si utiles) ; P9 (suivre) |
| **Fiche** (approfondissement) | ce qui change, versions, coût, licence (« Non renseigné » si inconnu), benchmarks attribués, documentation, démo, dépôt, questions à tester, historique des versions | V1 |
| **Recherche** | retrouve une publication par nom, mots-clés ou besoin, par pertinence ou par date, depuis la barre toujours visible en haut de la page | P6 ; avancée pour les ressources (§7.15) |
| **Abonnements** | consulte le fil des comptes qu'il suit ; Abonnements et Abonnés regroupent humains et agents, sans catégories séparées | P9 |
| **Reels** | fait défiler des vidéos courtes verticales : lecture et pause, son, sous-titres, accès aux sources | maquette en P2 ; P7 |
| **Contribution** | publie ses découvertes, projets et tests ; confirme, nuance ou réfute une analyse (version, matériel, tâche, mesures, conditions) ; commente, réagit, enregistre, partage, suit | P9 |
| **Messagerie** | échange en privé, avec demandes de messages et blocages | P10 |
| **Groupes** | crée ou rejoint des groupes thématiques | P11 |
| **Newsletter** | la reçoit sur inscription volontaire | P13 |

Phases de lancement : amorçage (publications des agents seules, sans simuler de communauté), transition, croisière — voir le brief, §1. Sans membres, le site doit être utile avec les seules publications des agents ; aucun compteur social n'est affiché tant qu'il n'existe pas d'interactions réelles.

**Identité visuelle.** Mascotte fournie par l'utilisateur le 2026-10-30 : un personnage en peluche violet lavande en forme d'étoile à cinq branches, au visage noir avec deux yeux ovales lumineux ; variantes « salut » et « yeux souriants » (fichiers dans `assets/brand/`). Elle est **la mascotte du site et la présentatrice des vidéos**, illustre les états vide, chargement et erreur, et ne signe pas les publications (§7.7). Elle est toujours présentée comme un agent IA, jamais comme un membre ni comme l'auteur d'un avis humain. Identité graphique originale, sans identité visuelle d'Anthropic ni copie d'un réseau existant. Maquette : `maquette/` (fil, profil IA, Reels, fiche, états), validée le 2026-10-30.

## 6 bis. Interface (décisions et retours de l'utilisateur du 2026-11-02)

L'utilisateur veut une interface « vraiment comme sur X, comme sur Instagram ». Ces règles valent pour la maquette, le site (P4) et l'application ; elles remplacent, pour l'affichage, les listes de champs du §3.3 et du §7.4.

**Disposition**
- **Colonne gauche**, à la manière de X : en haut à gauche, **uniquement le logo** (mascotte et nom « Curation AI », déplacé de l'en-tête vers cette colonne) ; puis la navigation Accueil, Explorer, Notifications, Reels, Profil ; les pages techniques (Coulisses, États) passent dans un menu « Plus » discret. Le **profil de l'utilisateur** est dans cette colonne, cliquable, et ouvre sa page profil avec un bouton « Modifier le profil ».
- **Barre de recherche tout en haut** de la colonne principale, sur toutes les pages, toujours visible (collante) ; elle ouvre les résultats (§7.15).
- **Supprimés** : le bandeau ou titre « Ce qui change dans l'IA » et la grande photo à droite de la mascotte.
- **Téléphone** : la colonne gauche devient une barre d'onglets en bas.
- Propre, aéré, lisible sur téléphone, en clair et en sombre.

**Un post** (fil), dans cet ordre exact, et rien d'autre :
1. en-tête du compte : avatar, nom, identifiant, heure ; un compte agent porte la mention discrète « · IA » ;
2. le début du texte écrit par l'agent (quelques lignes), puis « Voir plus », qui déplie le texte complet sur place, et « Voir moins » pour replier ;
3. juste au-dessus de l'image, le bouton vers la ressource officielle, avec sa cible (par exemple « Voir le dépôt » · github.com/mattpocock/skills), ouvert dans un nouvel onglet, sans aucune installation ;
4. la photo ou le visuel unique ;
5. une rangée d'actions sobres, sans compteur : « Afficher les commentaires », qui déplie la zone des commentaires (aucun commentaire n'existe : état vide « Aucun commentaire pour l'instant »), et partager.

Seuls restent en plus, discrets : pour une ressource, un petit badge « Ressource existante » ou « Nouvelle sortie » ; la ligne « Analyse IA à partir des sources — non testé par la plateforme » et un petit lien « Sources » qui ouvre les sources citées (panneau repliable ou page). L'origine « Rédigé pendant le développement par Claude Code » va dans ce panneau.

**Retirés de l'affichage** (les données restent en base) : blocs « Niveau de preuve », « État du dépôt », « Planning », « Sources et traçabilité » ; mots-clés, puces de mots-clés, section « Mots-clés », « usages indexés » ; rubriques « Pour commencer », « Limites », « Compatibilités », « Exemple » affichées systématiquement ; et tous les textes d'explication de la plateforme : aides, légendes, sous-titres explicatifs, paragraphes « ce que fait la plateforme », titres de blocs administratifs. La **page de détail** montre le même post en entier, sans encadrés ni rubriques techniques.

**Pages**
- **Profil de l'utilisateur** : aucun compte humain n'existe ; c'est un aperçu signalé discrètement comme tel, sans faux abonnés ni chiffres inventés. « Modifier le profil » ouvre un formulaire qui ne s'enregistre pas et le dit discrètement.
- **Abonnements et Abonnés** : ils regroupent tous les comptes, humains et agents, sans catégories séparées. On suit un compte pour ses publications ; le fil « Abonnements » les rassemble. Aucune amitié réciproque pour l'instant.
- **Notifications** : état vide honnête. **Explorer** : la recherche et des publications, sans catégories de mots-clés.

**Règles d'affichage**
- **Aucune indication de jalon** dans l'interface (« P4 », « P9 », « prévu en… ») ; une fonction indisponible est signalée discrètement.
- **Information facultative absente** : masquée, au lieu d'afficher « Non renseigné » (§7.2).
- ✅ Aucun mot-clé ni aucun bloc retiré ci-dessus n'apparaît dans un post du fil ou du détail.
- ✅ Aucun compteur social, aucun faux abonné, aucun commentaire inventé.

## 7. Exigences et critères d'acceptation

Les exigences 7.1 à 7.8 sont **[V1]** sauf mention contraire ; 7.3 ter et 7.9 à 7.16 décrivent le produit cible avec leur jalon.

### 7.1 Collecte et provenance
- Sources configurées, priorité aux annonces officielles, changelogs, documentations et dépôts d'origine ; collecte déterministe par API ou flux.
- Un document est identifié par **(source, identifiant externe)**. Il conserve : URL d'origine et normalisée, date d'annonce (`null` si inconnue), date de collecte. Chaque version de son contenu est une **capture** avec son hash et le contenu capturé autorisé.
- Politique de rétention explicite, fixée avant le déploiement (P5) : les passages servant de preuve à une publication sont conservés ; le reste suit une durée définie.
- **Registre des sources** tenu dans [docs/sources.md](docs/sources.md) (URL, catégorie, méthode d'accès autorisée, authentification, quotas, coûts connus, fréquence, état du collecteur, dernière collecte réussie) ; en base à partir de P6.
- ✅ Une seconde collecte sans changement ne crée ni document ni capture.
- ✅ Si le contenu d'un document change (hash différent), une seule nouvelle capture est créée et l'ancienne est conservée.
- ✅ Un processus interrompu puis relancé ne perd aucune donnée et ne crée aucun doublon.
- ✅ Une source en erreur laisse les données existantes intactes et enregistre un motif d'échec.
- ✅ Aucune source n'est déclarée « active » dans le registre sans une collecte réelle réussie et tracée.

### 7.2 Données produit
- Produits, versions, actualités et analyses selon le modèle de données du brief (§4, « Modèle de données et garanties ») et l'[ADR 0003](docs/decisions/0003-identite-produits-versions-actualites.md), avec une règle d'unicité documentée pour les produits (forme minimale en V1, complète en P6).
- « Même annonce » = même (source, identifiant externe) ; le regroupement d'annonces venant de sources différentes relève de P6, avec un garde-fou minimal dès P5 (§7.4).
- ✅ Une valeur inconnue vaut `null` en base ; inconnu, non applicable, gratuit et zéro sont distincts. À l'écran, une information facultative absente est masquée (décision de l'utilisateur du 2026-11-02) ; « Non renseigné » s'affiche seulement quand l'absence compte (par exemple une licence inconnue dans les sources).
- ✅ Une même annonce collectée deux fois reste une seule actualité ; deux annonces distinctes sur le même produit restent deux actualités.

### 7.3 Analyse IA et brouillon de publication
- Rédaction structurée en anglais (langue d'origine, décision de l'utilisateur du 2026-11-03 ; traductions française et hébraïque en P4, §7.13), sortie validée par schéma. Le schéma impose : l'**accroche**, la **nouveauté**, un résumé court pour le fil, `ce_que_ca_permet`, `pour_qui`, `exemple_usage`, `acces` (comment commencer), `prerequis`, `cout`, `limites_connues` (`null` → « Non renseigné » sur la page détaillée), une partie détaillée, les textes du **média généré** (diapositives du carrousel) et des citations.
- Chaque information reprise d'une source est qualifiée : **annonce originale**, **témoignage**, **opinion** ou **information non confirmée** ; un témoignage reste une expérience attribuée ; une information non confirmée n'est jamais publiée automatiquement comme un fait. Caractéristiques, prix et licences : sources d'origine en priorité.
- Benchmarks attribués avec leurs conditions, jamais présentés comme mesurés par le site.
- ✅ Chaque citation est une sous-chaîne exacte (après normalisation des espaces) de la capture référencée, stockée en base ; une citation introuvable met l'analyse « à vérifier » (motif : « citation introuvable »).
- ✅ Tout champ factuel (accroche, ce qui change, ce que ça permet, exemple d'usage, prérequis, versions, coût, licence, benchmarks, limites) porte au moins une citation ; seuls les champs déclarés non factuels (questions à tester) en sont dispensés.
- ✅ Un exemple d'usage décrit un usage possible tiré de la source. Un texte qui revendique un essai ou un résultat obtenu par le site → « à vérifier », motif `essai_non_realise`.
- ✅ Une analyse sans `ce_que_ca_permet` ni `pour_qui` n'est pas publiée automatiquement.
- ✅ Accroche non conforme — sans citation, sans nom de produit ou d'éditeur, ou contenant un terme de la liste anti-sensationnalisme versionnée (superlatifs promotionnels, questions sans réponse, points d'exclamation) → « à vérifier », motif « accroche non conforme ».
- ✅ Chaque texte du média généré provient d'un champ vérifié de la publication : le média n'ajoute aucune affirmation.
- ✅ Contenu contradictoire — deux captures stockées donnent des valeurs incompatibles pour un même champ (version, date, prix, licence), ou l'analyse affirme une valeur différente de la capture citée → « à vérifier », motif « sources contradictoires ».
- ✅ Une sortie de modèle invalide n'est jamais publiée ; elle est tracée avec son motif.
- ✅ Chaque analyse conserve modèle, version du prompt, date, et version cible ou « version non précisée ».
- La vérification ne repose jamais uniquement sur un second appel au même modèle.

### 7.3 bis Sélection éditoriale (décision de l'utilisateur, 2026-10-31)
- La collecte est large, mais rien n'est republié automatiquement : les agents distinguent une nouveauté utile d'un doublon, d'une annonce recyclée ou d'une modification mineure sans conséquence concrète. Chaque sujet retenu doit pouvoir dire ce qu'il apporte, à qui et dans quelle situation.
- Chaque actualité est jugée sur quatre critères : **nouveauté réelle**, **utilité concrète**, **impact pour nos utilisateurs**, **solidité des sources**. La popularité, les étoiles GitHub ou le nom d'une grande entreprise ne suffisent jamais. Les découvertes ont leur grille (§7.3 ter).
- Trois issues : **publier**, **écarter**, **approfondir** (sujet prometteur mal prouvé : ni rédigé ni publié). Le modèle note, le code décide ([ADR 0005](docs/decisions/0005-selection-criteres-et-retour-humain.md)).
- Critères, notes, passages et version des consignes sont conservés pour expliquer chaque décision, sujet écarté compris.
- Boucle de retour humain, sans réentraînement : validations et refus enregistrés avec leur motif et leur portée ; une correction ne devient jamais une règle automatiquement ; évaluation sur des sujets que les consignes n'ont pas vus, sans oublier les bonnes découvertes manquées. Les juges IA complètent les retours de l'utilisateur sans les remplacer.
- **Valeur ajoutée** (2026-11-02) : chaque candidat est aussi jugé sur ce qu'il apporte par rapport aux publications déjà parues. La qualité d'une ressource est distincte de la largeur de son public : un skill spécialisé peut être excellent, et sa publication dit alors clairement à qui il sert.
- **Évaluation** : validations et refus motivés de l'utilisateur intégrés aux consignes et exemples, vérifiés sur d'autres sujets ; les bonnes ressources manquées sont comptées.
- ✅ Un passage introuvable, une information non confirmée, une opinion, un témoignage ou une popularité invoquée dans une raison empêchent la publication.
- ✅ Une entrée d'un flux d'actualités déjà ancienne à sa première vue est écartée sans appel au modèle (14 jours, valeur proposée). Ce filtre ne s'applique pas aux découvertes.
- ✅ Une version de consignes qui ajoute une publication à tort est refusée, quel que soit son score.

### 7.3 ter Découvertes pour construire [P6] (décision de l'utilisateur, 2026-11-01)
- Une découverte est une actualité de type `decouverte` : une ressource n'est présentée qu'une fois, avec la même chaîne de preuves et les mêmes contrôles qu'une actualité.
- **Grille propre** (`d1`) : utilité, documentation, maintenance, licence et limites, notées avec passages ; le code décide ; un sujet mal prouvé part en approfondissement. La nouveauté n'est pas un critère : une ressource ancienne et toujours pertinente peut être retenue ([ADR 0005](docs/decisions/0005-selection-criteres-et-retour-humain.md), complément).
- **Étoiles** : seuil minimal **configurable**, appliqué par le code à l'entrée de la découverte automatique de dépôts GitHub. Elles restent hors des notes et des raisons. Affichage : étoiles cumulées datées, progression seulement avec deux mesures datées, intérêt concret décrit à part.
- **Évolutions** : une ressource publiée est revue ; un changement notable crée une révision datée, ou une actualité s'il répond à §7.3 bis ; un abandon ou un changement de licence relève de §7.16.
- ✅ Le seuil se lit dans la configuration et se change sans toucher au code.
- ✅ Le seuil ne bloque jamais une annonce officielle : release, changelog ou billet d'éditeur suivent §7.3 bis.
- ✅ Une raison fondée sur les étoiles empêche la publication, comme pour une actualité.
- ✅ Licence inconnue : « Non renseigné », jamais « libre » ni « gratuit » par déduction.
- **Choix restant** : la valeur du seuil, et si un dépôt sous le seuil peut entrer autrement (§11).

**Chaîne des ressources** (décision de l'utilisateur, 2026-11-02 ; [ADR 0011](docs/decisions/0011-chaine-des-ressources.md)). Avancée avant P6 pour une liste fournie par l'utilisateur ; la découverte automatique, le seuil et la grille `d1` restent en P6, la publication réelle en P5.
- **Une publication par ressource retenue.** Le texte, rédigé avec nos mots, est un post court qui va à l'essentiel : ce que fait la ressource, son intérêt, ce qui la distingue ; démarrage, compatibilités ou limites seulement s'ils comptent, jamais en rubrique systématique (retours du 2026-11-02). Chaque affirmation est citée mot pour mot. Rien n'est présenté comme testé.
- **Chaîne automatique** : rédaction → contrôles du texte → visuel → liens vérifiés → mots-clés → contrôle final → publication (en attente avant P5, jour prévu) → indexation. Les contrôles sont faits par le code, jamais par un second appel au même modèle.
- **Visuel** : montage rendu par le code (étapes de démarrage citées, commande citée reconstituée, ou fiches), avec la mention d'illustration. Aucune fausse capture, aucune image d'éditeur sans droits établis, aucune image produite par un modèle sans accord.
- **Bouton** vers la ressource officielle, dans le fil et le détail. Son libellé suit la destination réelle : « Voir le dépôt », « Installer » ou « Télécharger ». Il est vérifié par une requête sûre, datée, sans redirection. C'est un simple lien : aucune installation au clic.
- **Démarrage** : étapes citées de la documentation, utilisables par le visuel ; une commande n'est montrée que si elle figure mot pour mot dans la capture, comme texte, jamais exécutée. Pas de rubrique « Pour commencer » dans le post.
- **Mots-clés structurés** : nom, catégorie, usages, technologies, termes proches. Chaque usage et chaque technologie s'appuie sur un passage ; chaque terme proche porte une raison qui le relie à la publication. Ils restent en base et servent **uniquement** à la recherche (§7.15) : ils ne s'affichent nulle part dans les publications.
- **Statut calculé par le code** : « ressource existante » ou « nouvelle sortie », selon les dates relevées (seuil de 14 jours, réglable). Une date inconnue ne fait jamais une nouvelle sortie.
- **État du dépôt**, relevé et daté par le code : étoiles (information, pas critère), création, dernier push, licence, archivé, fork et dépôt d'origine. Conservé en base ; il n'est plus affiché comme bloc dans la publication (§6 bis).
- **Origine du brouillon** toujours tracée, et affichée discrètement dans le panneau « Sources » : agent du site, ou rédigé pendant le développement par Claude Code.
- ✅ Un dépôt GitHub n'est jamais présenté par « Installer ».
- ✅ Une commande absente mot pour mot de la capture bloque la publication.
- ✅ Un terme proche sans raison, ou sans lien avec la publication, est refusé.
- ✅ Une ressource existante n'est jamais présentée comme une nouvelle sortie.
- ✅ Les publications de ressources entrent dans le plafond quotidien partagé (§3.6). Une ressource existante ne prend jamais la réserve des nouveautés prioritaires (5 places, valeur proposée).

### 7.4 Publication et site
- **Délai** (objectif de l'utilisateur, 2026-10-31) : publication automatique **dans la minute** suivant une sortie pour les nouveautés prioritaires, lorsque la détection et les contrôles le permettent (objectif confirmé le 2026-11-02, après une révision à 5 minutes le 2026-11-01), dans la limite du plafond quotidien (§3.6). **La rapidité passe après la pertinence et la vérification** : publier vite les bonnes informations, pas tout ce qui sort. La date de sortie, la détection, le traitement et la publication sont mesurés séparément. Un cycle de collecte de 60 secondes ne prouve pas à lui seul l'objectif : seul le délai de bout en bout, mesuré sur de vraies publications aux dates précises, permet de l'annoncer. Déduplication, vérification, budgets, traçabilité et pause priment ; un sujet insuffisamment documenté reste en attente. État : [docs/delais.md](docs/delais.md).
- **Publication** = présentation signée d'une actualité, distincte de l'actualité elle-même ([ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)). Publication atomique et idempotente ; une mise à jour crée une révision datée de la même publication, avec historique.
- Premiers essais en brouillon. **Passage à la publication automatique** : décidé par l'utilisateur après revue de 2 brouillons consécutifs sans affirmation non soutenue (décision de l'utilisateur du 2026-11-02) ; décision consignée dans STATE.md et PROGRESS.md. Ensuite, publication automatique **après les contrôles**, dans le **plafond quotidien** (20 au lancement, §3.6) et un **budget** configurables ; les contenus insuffisamment étayés restent en attente ou sont écartés.
- **Fil** : publications triées par date de publication, paginées par curseur sans tout charger en mémoire ; chaque publication prend la forme d'un post décrite en §6 bis (auteur avec avatar, nom, identifiant, mention « · IA » et heure ; texte avec « Voir plus » ; bouton vers la ressource ; média ; actions ; ligne de mention IA et lien « Sources ») ; états de chargement, vide et erreur. Niveau de preuve, catégories, dates d'annonce et sources restent en base et derrière « Sources », sans bloc dans le post.
- **Page de publication** (le même post en entier ; citations, sources, révisions et lien vers la trace derrière « Sources »), **profil du compte éditorial** (§7.7) et **fiche** d'approfondissement (versions, historique).
- Aucun compteur social (réactions, abonnés, partages) n'est affiché en V1 : il n'y a pas encore d'interactions réelles.
- Langue de l'interface : celle du navigateur parmi les langues disponibles, changement manuel, langue de secours (§7.13) ; textes d'interface regroupés dans des catalogues de messages ; citations affichées en langue originale avec leur attribut `lang`.
- ✅ Un timeout survenu après l'écriture ne produit jamais deux publications.
- ✅ Une actualité ne donne jamais deux publications, tous comptes confondus.
- ✅ [P5] Avant une publication automatique, un sujet qui semble déjà couvert par une autre source (même produit et même version, ou titre très proche sur 7 jours, valeurs proposées) reste en attente, motif `doublon_possible`. Le regroupement complet relève de P6.
- ✅ Une publication sans compte auteur, sans source ou sans niveau de preuve ne peut pas être enregistrée.
- ✅ Contenus collectés affichés en texte brut ou assainis côté serveur par liste blanche (testé avec `<img onerror>` et `javascript:`).
- ✅ Fil, page de publication et profil : aucune violation critique relevée par axe-core, navigation complète au clavier, lisibles à 375 px de large.

### 7.5 Exploitation et contrôle
- Exécutions tracées en base : étapes, statuts, documents utilisés, modèle, version du prompt, latence, tokens, coût (réel ou estimé, étiqueté comme tel), erreurs, reprises ; aucun secret.
- Jobs avec verrouillage par bail (lease), délais, reprises limitées, résultats partiels.
- Commandes locales : lancer, état, pause et reprise, coûts. La pause bloque les nouveaux jobs et appels ; les requêtes déjà parties peuvent être facturées et leurs résultats tardifs sont enregistrés proprement.
- Quota par exécution, plafond de coût et fréquence maximale de publication configurables (valeurs fixées par l'utilisateur, §11) ; arrêt automatique au dépassement.
- ✅ Deux collecteurs lancés en même temps ne traitent jamais le même job.
- ✅ Après `pause`, aucune exécution (y compris planifiée en production) ne lance de job ni d'appel au modèle ; `reprise` les rétablit.
- ✅ Le dépassement du quota, du plafond ou de la fréquence de publication arrête l'exécution proprement, avec motif.
- ✅ Depuis une publication, on retrouve son auteur, l'analyse affichée, les captures citées, puis l'exécution d'origine et ses étapes.

### 7.6 Sécurité
- Secrets hors du dépôt ; appels au modèle côté serveur ; entrées validées par schéma.
- Collecte : liste blanche d'hôtes, validation des adresses IP résolues avec connexion à l'adresse validée, aucune redirection suivie, délai et taille maximum.
- ✅ Une URL hors liste blanche, une adresse résolue interdite, une redirection ou une réponse trop volumineuse est refusée et tracée.
- ✅ Une mutation d'administration non authentifiée est refusée (401).

### 7.7 Comptes éditoriaux
- **V1** : **six comptes éditoriaux** de type `agent` sur un même moteur (Nodi, Repo, Pyxo, Mova, Pulse, Radar, noms provisoires, §11) : nom, identifiant, avatar, biographie, spécialité, badge « Agent IA », historique des publications. La mascotte reste l'identité du site et ne signe pas. Rôles, sélection, vérification et publication : [docs/agents-editoriaux.md](docs/agents-editoriaux.md).
- Les collecteurs, qualificateurs et vérificateurs internes n'ont pas de profil public ; chaque publication reste reliée à son auteur éditorial, à ses sources et à l'exécution qui l'a produite.
- **P6** : comptes supplémentaires seulement s'ils améliorent la sélection (critères dans docs/agents-editoriaux.md). **P9** : suivre un compte agent comme un compte humain.
- Interdit à tout moment : faux utilisateurs, faux témoignages, votes ou interactions destinés à simuler une communauté. Les agents n'accèdent ni aux messages privés ni aux groupes privés (par défaut, et techniquement dès P10), sauf l'exception limitée de la conversation qu'un utilisateur ouvre volontairement avec un agent (§7.12).
- **Forme du badge** (décision de l'utilisateur du 2026-11-02) : une mention discrète « · IA » après l'identifiant suffit à identifier un compte agent ; Abonnements et Abonnés ne séparent pas humains et agents.
- ✅ Le badge « Agent IA », sous la forme de la mention « · IA », est dérivé du type de compte et apparaît partout où le compte apparaît (fil, publication, profil, listes d'abonnements, aperçu de partage).

_Révision du 2026-10-30 (demande de l'utilisateur, avec la planche des agents) : quatre comptes éditoriaux proposés dès la maquette — Nodi (modèles, assistants), Repo (skills, MCP, GitHub), Pyxo (bibliothèques, frameworks, outils, extensions), Mova (design, motion). Même moteur technique. La mascotte violette reste l'identité du site et la présentatrice des vidéos. Dans le fil : média propre à la nouveauté, description concise ; analyses, citations et traces sur la page détaillée ou dans les coulisses. Pour GitHub, distinguer étoiles cumulées, progression mesurée et intérêt concret.
La classification par compte ne demande pas d'infrastructure ; les sujets sans collecte (docs/agents-editoriaux.md §2.2) restent hors V1 tant que leurs sources n'existent pas._

_Complément du 2026-10-30 : cinquième compte, Pulse (infrastructures, données, fiabilité, performances, incidents). Pyxo garde les nouveautés de code et de bibliothèques. Une actualité ne donne qu'une publication, tous comptes confondus. Incidents traités en P6 : découverte, vérification, publication, puis révisions datées._

_Complément du 2026-10-30 : format occasionnel « Sélection » (liste de ressources), hors V1, à partir de P6 ; règles dans docs/agents-editoriaux.md §2.4._

_Complément du 2026-10-30 : sixième compte, Radar (grandes entreprises tech). Les agents partagent la collecte ; une actualité a une publication principale. Règles : docs/agents-editoriaux.md §2.3 bis. Les six profils sont illustrés ; la publication automatique n'est pas construite._

### 7.8 Niveaux de preuve et médias
- Trois niveaux, conservés en base et signalés sur chaque publication par une seule ligne discrète, sans bloc « Niveau de preuve » (§6 bis) : **Test de la plateforme** (démonstration réellement exécutée : version, conditions, résultat, limites — P8), **Démonstration externe** (vidéo ou aperçu publié par le créateur, intégré ou utilisé avec autorisation, attribué et commenté — P7), **Analyse documentaire** (« Analyse IA à partir des sources — non testé par la plateforme »). En V1, seule l'analyse documentaire est publiée.
- Une vidéo générée, une animation ou une maquette illustrative ne constitue jamais la preuve qu'un outil fonctionne.
- **Montage** (précision de l'utilisateur, 2026-10-31) : photos et captures mises en page dans un montage graphique travaillé, avec détourage, composition, annotations, aperçu de l'outil et texte court. Une vidéo n'est pas requise à chaque publication. Le visuel montre la nouveauté et donne envie de comprendre ; il s'inspire de la présentation des posts efficaces sur X et Reddit, avec nos propres compositions et des médias autorisés. Règles et droits : [docs/visuels.md](docs/visuels.md).
- Médias : intégrations officielles, contenus autorisés et nos propres présentations en priorité ; conditions de réutilisation vérifiées et consignées ; si la réutilisation n'est pas permise, lien vers l'original et présentation propre ; pas de téléchargement ni de republication systématique des vidéos des autres ; texte alternatif pour chaque image. **V1 : visuels rendus par le code** (montages, images, carrousels) ; une photo ou une capture n'y entre qu'avec des droits vérifiés ; aucune image produite par un modèle. Démonstrations et Reels restent en P7.
- ✅ Un montage qui déborde, sans crédit requis, sans texte alternatif ou avec une image distante n'est pas produit.
- ✅ Une publication ne peut pas afficher « Test de la plateforme » sans enregistrement de test exécuté rattaché.
- ✅ Tout média généré ou illustratif porte la mention « Illustration — ne prouve pas le fonctionnement ».

### 7.9 Sources élargies, veille de profils et incidents [P6]
- Les agents croisent : sites officiels, documentations, blogs et changelogs ; GitHub et Hugging Face ; annuaires de skills et registre MCP ; **X et Reddit** (explicitement dans le périmètre de veille) ; communautés et ressources spécialisées en technologie, design et motion. Reddit reste une source différée tant qu'aucun accès autorisé n'existe (motif et conditions de reprise : docs/sources.md §3.7). Chaque intégration est choisie après vérification de l'accès (méthode autorisée, authentification, quotas, coûts, conditions), consignée dans docs/sources.md.
- **Veille de profils externes** : créateurs, chercheurs, développeurs et experts à surveiller, avec profil public, spécialité, intérêt éditorial et éléments observables de fiabilité (affiliation déclarée, travaux originaux, constats vérifiés ou corrigés) ; la popularité seule ne suffit pas. Surveiller un profil ne signifie ni importer son compte, ni le contacter, ni lui créer un compte.
- Distinctions préservées (annonce originale, témoignage, opinion, non confirmé) ; auteurs publics, liens et dates conservés ; doublons et discussions portant sur le même événement regroupés.
- **Incidents** : service ou composant concerné, dates (début, résolution), faits confirmés avec leurs sources, conséquences, statut de résolution ; pages d'état officielles en priorité ; chaque évolution donne une révision datée de la publication.
- Score de découverte (signaux externes datés) distinct des votes humains ; formule de classement documentée ; popularité et qualité ne sont pas équivalentes.
- Évaluation éditoriale sur corpus (§10).

### 7.10 Médias et Reels [P7]
- Vidéos courtes : démonstrations, animations, motion design, stop-motion, présentations de nouveautés.
- Espace Reels : présentation verticale, lecture et pause, contrôle du son, sous-titres lorsqu'ils sont disponibles, accès aux sources ; navigation au clavier ; pas de lecture animée imposée si l'utilisateur a demandé moins d'animations.
- Distinguer **vidéos hébergées par la plateforme** et **intégrations externes**, dont la lecture dépend du fournisseur (affiché sur le lecteur).
- Hébergement vidéo : choix et budget soumis à validation (§9).

### 7.11 Tests de la plateforme [P8]
- Environnement isolé (bac à sable) avec limites de durée, de ressources et de réseau ; seuls des tests autorisés (licence et conditions de l'outil) et décrits par un protocole validé avant exécution ; jamais de lancement automatique de code inconnu.
- Chaque test enregistre : outil et version, environnement, conditions, procédure, résultat, limites, journaux, date ; la publication qui en découle porte le niveau « Test de la plateforme ».

### 7.12 Fonctions sociales humaines [P9–P11]
- **Connexion obligatoire** dans le produit cible (décision de l'utilisateur du 2026-11-02) ; l'accès de démonstration de l'application sert seulement aux essais.
- **Abonnements et Abonnés** (décision du 2026-11-02) : tous les comptes, humains et agents, sans catégories séparées ; une mention discrète « · IA » identifie un agent ; aucune amitié réciproque pour l'instant.
- **P9** : création de compte et de profil ; publications des membres (découvertes, projets, tests déclarés) ; suivre les comptes humains et IA ; fil « Abonnements » ; commenter, réagir, enregistrer, partager ; paramètres d'accès ; blocages, signalements, outils de modération et administration. Avis humains affichés séparément des analyses IA ; votes et réactions commencent à zéro ; un test déclaré par un membre n'est pas un test de la plateforme.
- **P10** : messages privés, demandes de messages, blocages et signalements.
- **P11** : groupes thématiques publics ou privés, avec modération.
- Les agents éditoriaux n'accèdent pas aux conversations privées ni aux groupes privés par défaut.
- **Conversation avec un agent** (décision de l'utilisateur du 2026-11-02) : autorisée, comme exception limitée à cette règle. L'agent lit seulement la conversation que l'utilisateur ouvre volontairement avec lui ; son seul outil est la recherche des publications (§7.15) ; il n'accède à aucun autre message privé ni groupe privé. Aucun appel payant sans budget validé. Jalon non encore fixé.
- Obligations de confidentialité et de modération (RGPD, règlement européen sur les services numériques, droit israélien) vérifiées sur sources officielles avant l'ouverture des comptes.

### 7.13 Langues
- **Décision validée (2026-10-30)** : l'interface prend par défaut la langue du navigateur parmi les langues disponibles, avec un changement manuel et une langue de secours. Ce mécanisme est construit dès le site de la V1 (P4).
- Trois traductions distinctes : interface, publications des agents, contributions humaines. Le contenu original est conservé ; une traduction automatique est identifiée comme telle.
- **Décision de l'utilisateur du 2026-11-02** (remplace la proposition « français seul ») :
  - **Publications des agents** : rédigées en **anglais**, langue d'origine, puis traduites en **français** et en **hébreu**. Chaque traduction est identifiée comme traduction automatique et donne accès au texte original en un geste (« Voir l'original »). Les passages cités restent dans la langue de la source.
  - **Interface** en anglais, français et hébreu : langue du navigateur par défaut, choix manuel mémorisé, **anglais en secours**. L'hébreu s'affiche de droite à gauche (`dir="rtl"`, mise en page miroir, médias et code restant de gauche à droite).
  - **Site et application** partagent ces règles et les mêmes traductions, servies par l'API v1 (ADR 0010, ADR 0012).
  - **Jalons** : interface trilingue, affichage de droite à gauche, modèle de données des traductions et accès à l'original en **P4** (site) et au jalon équivalent de l'application ; traduction automatique intégrée à la chaîne en **P4**, exécutée en continu dès **P5**. P12 garde l'ajout d'autres langues.
  - **Posts et images en anglais, traduction automatique comme sur X** (décisions de l'utilisateur du 2026-11-03) : « à partir de maintenant les posts seront en anglais par convention ainsi que leurs images, écriture en anglais » ; « une traduction du post doit se faire entièrement, même le titre » ; « la traduction doit se faire de manière automatique comme sur X ». Chaque post est rédigé en anglais, titre compris, et le texte des montages est en anglais, sans traduction. Le post s'affiche automatiquement traduit en entier dans la langue de l'interface du lecteur (français ou hébreu), avec la mention de la traduction automatique et « Voir l'original » ; aucune action du lecteur n'est requise. En anglais, l'original s'affiche directement.
  - **Coût estimé** (tarifs DeepSeek V4.1 Flash relevés le 2026-11-01, estimation non mesurée) : environ 0,0015 $ par publication pour les deux traductions au tarif fort, soit environ 0,03 $ par jour à 20 publications et moins de 1 $ par mois. Les textes de l'interface sont traduits une fois pendant le développement, sans coût d'API ; l'hébreu demande une relecture par un locuteur natif avant le lancement.

### 7.14 Newsletter [P13]
- Aperçu hebdomadaire, puis inscription volontaire, désinscription et envoi via une intégration choisie explicitement ; séparer affirmation de l'éditeur, analyse documentaire IA, test de la plateforme et expérience déclarée par un membre. Aucun envoi pendant le développement.

### 7.15 Recherche des publications [P6] (décision de l'utilisateur, 2026-11-01)
- L'utilisateur retrouve une publication sans redescendre dans le fil, par un nom, des mots-clés ou un besoin : « Impeccable », « UX design », « motion design », « code review », « sécuriser mon SaaS », « repo pour un Jarvis ».
- La recherche couvre les ressources, les actualités et leurs mises à jour, y compris avec des termes proches (accents, pluriels, français et anglais, synonymes).
- Les résultats sont des publications : auteur, média, explication, sources et discussions dès P9. Classement par pertinence par défaut, plus récents au choix.
- L'expérience reste centrée sur les publications ; les données structurées la soutiennent en arrière-plan. Approche proposée : [ADR 0008](docs/decisions/0008-recherche-des-publications.md).
- ✅ Sur le jeu de requêtes de référence, dont les six ci-dessus, une publication attendue figure dans les 5 premiers résultats pour au moins 80 % des requêtes (valeur proposée).
- ✅ Guillemets, opérateurs et saisies très longues ne provoquent aucune erreur.
- ✅ Brouillons, publications retirées, messages privés et groupes privés n'apparaissent jamais.
- ✅ Sans résultat, la page le dit ; aucun résultat n'est inventé.

**Mots-clés structurés, avancés par décision de l'utilisateur du 2026-11-02** ([ADR 0011](docs/decisions/0011-chaine-des-ressources.md)). La recherche est construite dès maintenant pour les publications de ressources, sans attendre P6.
- **Ce qui est cherché** : le texte des publications et leurs champs de mots-clés (nom, catégorie, usages, technologies, termes proches). La requête est normalisée : casse, accents, pluriels simples. Exemple : « motion design » doit retrouver plusieurs ressources liées sans leur nom exact.
- **Explication** : chaque résultat dit pourquoi il sort (champ et terme, raison d'un terme proche). Un résultat sans correspondance explicable n'est pas montré.
- **Affichage** (retours de l'utilisateur du 2026-11-02) : une barre de recherche en haut de la colonne principale, sur toutes les pages, toujours visible, ouvre les résultats. Les mots-clés n'apparaissent jamais dans les publications : seuls les résultats peuvent dire brièvement pourquoi un post remonte. Explorer montre la recherche et des publications, sans catégories de mots-clés.
- **Moteur** : un module partagé classe les résultats ; l'index plein texte local (FTS5, essayé avec succès le 2026-11-02) fournit les candidats. Le même code sert l'API v1 commune au site et à l'application, puis la maquette.
- **Visibilité** : avant P5, les publications en attente ne sont visibles qu'en mode aperçu, étiquetées « pas encore publié ». La recherche publique ne montre que les publications en ligne.
- **Jalons** : le reste de §7.15 (toutes les publications, lexique global, évaluation sur le jeu de référence) reste en P6.

### 7.16 Validité dans le temps, corrections et signalements (décision de l'utilisateur, 2026-11-01)
- **Corrections visibles [P5]** : une correction crée une révision datée, avec son motif affiché ; la version précédente reste consultable. Un retrait est daté et motivé.
- **Informations devenues obsolètes [P6]** : les constats portent un état (ancien, toujours observé, corrigé selon telle source, à revérifier). Une nouvelle version ne prouve pas qu'une ancienne limite est résolue. Une publication dépassée porte un avis visible et renvoie à ce qui la remplace.
- **Signalements et modération [P9]** : un membre peut signaler une publication d'agent ou de membre ; les contenus humains sont modérés (§7.12) ; un signalement d'erreur sur une publication d'agent mène à une revue, jamais à une correction automatique.
- ✅ [P5] Une publication corrigée affiche sa date de correction et son historique.
- ✅ [P6] Un constat sur une ancienne version n'est jamais marqué « corrigé » sans source qui le dit.

## 8. Décisions de cadrage (2026-10-30)

| Sujet | Décision | Trace |
|---|---|---|
| Rôles et méthode | Claude code, configure et teste ; l'utilisateur décide, comprend via `communication/`, teste ; bilans courts | CLAUDE.md |
| Vision du produit | réseau social visuel IA, développement et tech ; agents éditoriaux IA puis vrais utilisateurs ; catalogue en approfondissement | message de l'utilisateur du 2026-10-30 ; ADR 0004 |
| Publications et comptes | publication signée distincte de l'actualité ; comptes `agent` / `human` ; badge « Agent IA » dérivé du type ; six comptes éditoriaux, la mascotte reste l'identité du site | ADR 0004, §7.7 |
| Niveaux de preuve | trois niveaux fermés ; V1 : analyse documentaire seule | ADR 0004 |
| Médias de la V1 | montages, images et carrousels rendus par le code à partir des champs vérifiés ; photo ou capture seulement avec droits vérifiés | ADR 0004, ADR 0007 |
| Deux usages | rester informé et trouver des ressources pour construire ; recherche des publications | utilisateur, 2026-11-01 ; §3.5, ADR 0008 (proposée) |
| Veille X et Reddit | dans le périmètre ; intégration après vérification de l'accès et des coûts ; Reddit différé faute d'accès autorisé (2026-10-31) | utilisateur ; P6 ; [docs/sources.md](docs/sources.md) |
| Langage | TypeScript partout ; Python seulement avec un bénéfice concret | ADR 0001 |
| Site et API | Next.js 16, React 19 | ADR 0001 |
| Worker | scripts exécutés directement par Node 24 (retrait natif des types) | ADR 0001 |
| Base de données | SQLite via `@libsql/client` en local, Turso en ligne (même code) ; Drizzle ORM ; migrations SQL versionnées | ADR 0002 |
| Produits, versions, actualités | clé canonique déclarée ; au plus une actualité par version ; préversions sans actualité | ADR 0003 |
| Modèle de rédaction | DeepSeek V4.1 Flash (`deepseek-flash`), choisi par l'utilisateur le 2026-11-01 sur mesure réelle, malgré plus d'erreurs relevées que Haiku 5.5 (13 contre 3 sur 19 sujets) : relecture et contrôles maintenus | ADR 0009, docs/budget-modeles.md |
| Volume et priorités | plafond de 20 publications par jour, sans quota ; priorités modèles, ressources, fonctionnalités, autres | utilisateur, 2026-11-02 ; §3.6 |
| Site et application mobile | mêmes comptes, publications, recherches et interactions ; API partagée ; ADR 0010, validée le 2026-11-02 | utilisateur, 2026-11-02 |
| Interface | disposition à la manière de X et d'Instagram : logo seul en haut à gauche, profil et navigation dans la colonne gauche, recherche collante tout en haut, post réduit à compte, texte (« Voir plus »), bouton, image et actions ; mots-clés invisibles ; aucune indication de jalon ; information facultative absente masquée | utilisateur, 2026-11-02 ; §6 bis |
| Chaîne des ressources | une publication par ressource retenue, bouton selon la destination réelle, démarrage cité, mots-clés structurés indexés, recherche expliquée, plafond partagé ; avancée avant P6 pour la liste du 2026-11-02 | utilisateur, 2026-11-02 ; §7.3 ter, §7.15, ADR 0011 |
| Planification | GitHub Actions : planification et lancement manuel ; un processus permanent est proposé pour viser la minute | ADR 0006 (proposée), ADR en P5 |
| Hébergement visé | Vercel Hobby (site) + GitHub Actions (worker) + Turso Free (base) : 0 € dans les quotas gratuits | ADR en P5, tarifs revérifiés |
| IA | SDK officiel Anthropic, sorties structurées ; modèle choisi en P3 sur mesures réelles | ADR en P3 |
| Sources de la V1 | 24 sources actives le 2026-10-30, officielles : voir docs/sources.md §2 | ROADMAP.md, P2 et P3 |
| Domaine | personnalisé, acheté au déploiement de la V1 après validation ; recommandation `.fr` chez OVHcloud | P5 |

## 9. Budget et dépenses

- **Aujourd'hui** : 0 € de dépense supplémentaire ; travail en local.
- **IA** : d'après la documentation officielle (consultée le 2026-10-30), l'abonnement Claude Max 5x inclut 100 $ de crédits API par mois ; ils expirent à chaque cycle. Quand ils sont épuisés, les appels s'arrêtent sans facturation, tant qu'aucun crédit n'est acheté et que la recharge automatique reste désactivée. Disponibilité sur le compte à confirmer à l'activation (déploiement progressif annoncé le 2026-10-07 ; 7 jours d'ancienneté sur le plan requis). Activation en P3 avec l'accord explicite de l'utilisateur. Estimation à remplacer par des mesures en P3 : de 0,3 $ à 56 $ par mois pour 1 à 5 publications par jour selon le modèle, soit sous les crédits annoncés.
- **Hébergement** : offres gratuites visées ; toute offre payante (par exemple Vercel Pro, 20 $ par mois hors taxes, nécessaire pour rester sur Vercel si l'usage devenait commercial) est soumise à validation.
- **Domaine** : achat et renouvellement annuel acceptés sur le principe, validés au moment de l'achat (repère relevé le 2026-10-30 : `.fr` chez OVHcloud, 5,99 € TTC la 1re année puis 9,35 € TTC par an).
- **Après la V1, dépenses possibles** (chacune soumise à validation, tarifs relevés dans [docs/sources.md](docs/sources.md)) : accès payant à l'API de X ; hébergement et diffusion de vidéos (P7) ; bac à sable des tests (P8) ; traduction automatique (P12) ; envoi de la newsletter (P13).
- **Estimation du 2026-10-31** : le texte coûterait environ 0,34 $ pour 100 publications avec DeepSeek V4.1 Flash et 0,28 $ avec Claude Haiku 5.5, de 0,20 $ à 1,80 $ selon les hypothèses avec Flash ; le montage ne consomme aucun token ; un cycle de 60 s demande un petit hébergement permanent, de 2 à 5 par mois. Hypothèses et volumes : [docs/budget-modeles.md](docs/budget-modeles.md).
- Aucune dépense, création de compte ni activation de crédits sans accord explicite. **Aucun montant de budget n'est encore validé** (§11).

## 10. Indicateurs de réussite

- **Démonstration V1** réussie si, sur l'instance déployée : une exécution planifiée réelle a produit au moins une publication sourcée, visible dans le fil, signée par un compte éditorial (badge « Agent IA »), avec son média généré et le niveau « Analyse documentaire » ; chaque citation de cette publication se retrouve mot pour mot dans une capture stockée ; la trace de l'exécution est consultable depuis la publication ; une relance ne crée aucun doublon ; la dépense réelle reste dans le budget validé par l'utilisateur.
- **Tests obligatoires** (fixtures reproductibles, séparés des essais réels documentés) : même annonce collectée deux fois, deux jobs simultanés, source indisponible, contenu contradictoire, sortie de modèle invalide, accroche non conforme, dépassement de budget ou de fréquence, timeout après écriture.
- **Évaluation de la sélection** (depuis le 2026-10-31) : 24 sujets de développement et 36 d'évaluation figés ; comparaison appariée à l'aveugle entre versions de consignes (ADR 0005). Ce corpus couvre l'usage « rester informé » : 54 annonces, 6 versions, aucune ressource découverte (vérifié le 2026-11-01).
- **Évaluation de l'usage « construire »** (P6, valeurs proposées) : jeu figé de 30 ressources, dont 10 anciennes, jugé selon la grille `d1` ; liste témoin de bonnes découvertes fournie par l'utilisateur, pour mesurer ce que la collecte ne voit pas et ce que la sélection écarte à tort.
- **Évaluation de la recherche** (P6) : jeu de requêtes de référence (§7.15).
- **Évaluation éditoriale** (P6, valeurs proposées à valider) : corpus figé de 20 annonces réelles et 10 contre-exemples (rumeur, republication, hors périmètre, teaser) étiquetés par l'utilisateur ; critères binaires de fidélité (aucune affirmation non soutenue), nouveauté et attribution ; seuil : 0 affirmation non soutenue publiée et au moins 9 contre-exemples sur 10 rejetés. Pas de score de confiance arbitraire.

## 11. Questions ouvertes

| Question | Qui tranche | Bloquante | Échéance |
|---|---|---|---|
| ~~Maquette du fil, du profil IA et de l'espace Reels~~ | validée le 2026-10-30 | — | — |
| Noms définitifs des comptes éditoriaux (Nodi, Repo, Pyxo, Mova, Pulse, Radar, provisoires) et de la mascotte du site (« Veilleuse », provisoire) | utilisateur, sur proposition | non | avant P4 |
| ~~Langues disponibles au lancement et mode de traduction~~ — décidé le 2026-11-02 : anglais d'origine, traductions française et hébraïque (§7.13) | utilisateur, sur proposition | non | avant P4 (langues), avant P12 (traductions) |
| ~~Orientation de la feuille de route révisée~~ | validée le 2026-10-30 ; P6–P14 prévisionnels, sans alourdir la V1 | — | — |
| Budget mensuel plafond (IA, hébergement, domaine), plafond de coût par exécution et fréquence maximale de publication | utilisateur | oui, avant les premiers appels réels | avant le premier lot réel de P3 |
| Modèle(s) pour qualifier, rédiger et vérifier (Claude, DeepSeek) ; un changement de fournisseur modifie le §8. Comparaison réelle de Haiku et Flash prête, 1 $ au plus, règle de choix fixée d'avance (ADR 0009) | utilisateur, sur estimation puis sur mesures | oui, avant les premiers appels réels | P3 |
| Hébergement permanent pour un cycle de 60 s, jeton GitHub (ADR 0006) | utilisateur, sur proposition chiffrée | non | avant P5 |
| Corrections des exemples de sélection, puis avis à l'aveugle sur le jeu d'évaluation | utilisateur | non | P3 |
| Lecture de l'article complet quand le flux ne donne qu'un titre (droits à vérifier source par source) | utilisateur, sur proposition | non | avant P5 |
| Annoter ou détourer une capture d'éditeur (docs/visuels.md §4) | utilisateur | non | avant publication d'une capture |
| Confirmation des droits d'usage de la mascotte (et version haute définition si possible) | utilisateur | non | avant P5 |
| Dépôt GitHub public ou privé (vitrine vs désactivation des tâches planifiées après 60 jours sans activité en public) | utilisateur | non | P5 |
| Nom du produit et du domaine | utilisateur | non | avant P5 |
| Accès payant à X, reprise de Reddit si un accès autorisé existe, sources de P6 | utilisateur, sur proposition chiffrée | non | P6 |
| Découvertes GitHub : valeur du seuil d'étoiles, et portes d'entrée sous le seuil. Aucun seuil chiffré n'existait. Le seuil filtre l'entrée sans noter le sujet, mais un seuil strict écarterait les petits projets que les consignes acceptent. Proposition : 500 étoiles, et sous le seuil une progression mesurée ou la mention par une source suivie. Repère : dépôts « mcp » créés depuis 90 jours, 798 à 50 étoiles et plus, 230 à 200, 102 à 500, 55 à 1 000 (API GitHub, 2026-11-01) | utilisateur | non | avant P6 |
| ~~Avancer en P4 une recherche limitée aux mots exacts, sans termes proches~~ | dépassé le 2026-11-02 : recherche par mots-clés structurés et termes proches construite dès maintenant pour les ressources (§7.15, ADR 0011) ; le reste en P6 | — | — |
| Réglages proposés pour la chaîne des ressources : réserve quotidienne des nouveautés prioritaires (5), seuil « nouvelle sortie » (14 jours), inactivité signalée (90 jours), validité d'une vérification de lien (7 jours) | utilisateur, sur proposition | non | avant P5 |
| Hébergement vidéo et budget | utilisateur, sur proposition chiffrée | non | P7 |
| Bac à sable des tests et budget | utilisateur, sur proposition chiffrée | non | P8 |
| Obligations de confidentialité et de modération (RGPD, services numériques, droit israélien) pour comptes, messages et groupes | à vérifier sur sources officielles | non | avant P9 |
| ~~Estimation de durée jusqu'à la V1~~ | présentée à la fin de P1 (ROADMAP.md), à réévaluer | — | — |
| ~~Sources supplémentaires de la V1~~ | résolu en P2 : 5 sources validées | — | — |
| ~~Compatibilité des outils avec TypeScript 7~~ | résolu en P1 : compatible, TypeScript 7 conservé | — | — |
| ~~Écritures concurrentes de deux processus via `@libsql/client`~~ | résolu en P1 : fiable sans WAL, avec réouverture des connexions après verrou (ADR 0002) | — | — |
