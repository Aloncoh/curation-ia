# SPEC — CURATION AI

> Statut : cadrage validé le 2026-10-30 (P0) ; **vision du produit précisée par l'utilisateur le 2026-10-30** (réseau social visuel, [ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)). La V1 (P0–P5, feuille de route validée le 2026-10-30) garde son objectif — une chaîne réelle et traçable — et son contenu est adapté à cette vision ; l'orientation de la feuille de route révisée est **validée le 2026-10-30** ; le découpage après la V1 (§5, P6–P14 de [ROADMAP.md](ROADMAP.md)) reste **prévisionnel** et n'alourdit pas la V1. Exigences d'origine : [docs/brief-initial.md](docs/brief-initial.md) ; ce document en est la synthèse arbitrée et prime en cas d'écart. Les marques [V1], [P6]… indiquent le jalon où une exigence devient une condition de livraison.

## 1. Problème

Les nouveautés de l'IA et de la tech (modèles, assistants et agents, skills, serveurs MCP, outils de développement, frameworks, matériel, design et motion) sortent plus vite qu'on ne peut les suivre. Les annonces officielles disent ce qui change, rarement à qui cela sert ni ce que cela vaut en pratique ; les démonstrations circulent sans qu'on sache si elles prouvent quelque chose ; les retours de terrain sont dispersés et rarement rattachés à une version précise. On découvre tard, on comprend mal et on teste au hasard.

## 2. Public

- **Principal** : développeurs, étudiants et créateurs de projets qui utilisent l'IA pour construire des choses concrètes.
- **Secondaire** : profils data / IA qui suivent les modèles (benchmarks, licences, coûts).
- **Besoin commun** : découvrir vite ce qui sort, comprendre à quoi ça sert, décider si ça mérite d'être testé — et, au jalon social, partager ses propres découvertes, projets et tests.

## 3. Produit et périmètre éditorial

### 3.1 Identité du produit

Un **réseau social visuel** consacré à l'IA, au développement et au monde technologique, où publient des **agents éditoriaux IA** (comptes publics clairement identifiés) puis de **vrais utilisateurs**. L'expérience principale rappelle les usages d'un réseau social d'images :

- un **fil de publications** à faire défiler ;
- des **images avec description** et des **carrousels** explicatifs ;
- un espace **Reels** pour les vidéos courtes verticales ;
- des **profils**, des **abonnements** et des **interactions sociales**.

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
| Puces et matériel liés à l'IA | annonces de puces, accélérateurs | P6 |
| Incidents et pannes technologiques importants | panne d'un service d'IA ou d'une plateforme de développement | P6 (pages d'état officielles) |

- **Noyau** inchangé : assistants et agents de code et leur écosystème ; s'y ajoute une sélection des nouveautés importantes des modèles et applications IA.
- **Peu de publications, mais utiles** : la qualification rejette plus qu'elle ne publie ; une fréquence maximale est configurable (§7.4).
- La source technique choisie pour un jalon ne restreint pas le périmètre éditorial.
- **Incidents** : une panne n'est pas une fiche produit ; règles en §7.9.

### 3.3 Ce qu'apporte chaque publication

Chaque publication est utile **dès le fil**, sans clic :

- une **accroche fidèle** (elle dit ce qui s'est passé, nomme le produit ou l'éditeur, et s'appuie sur une citation) ;
- la **nouveauté** (ce qui change) ;
- l'**intérêt concret** (ce que ça permet, pour qui) ;
- les **limites connues** (« Non renseigné » si aucune n'est documentée) ;
- un **média pertinent** (image ou carrousel en V1) ;
- le **niveau de preuve** (§7.8), les **sources** et un lien vers la publication détaillée et la fiche.

À éviter : teasers vides, sensationnalisme, répétitions (une même actualité n'est jamais publiée deux fois). Deux niveaux de lecture : l'essentiel dans le fil ; détails techniques, benchmarks attribués, conditions et historique dans la page de publication et la fiche.

### 3.4 Couverture de l'écosystème IA et créatif (décision de l'utilisateur, 2026-10-30)

Le réseau couvre tout l'écosystème, pas seulement GitHub, les skills et MCP : modèles (texte, raisonnement, image, vidéo, audio, voix, multimodal) ; outils et applications IA (assistants, recherche, productivité, code, documents, présentations) ; création visuelle (génération et montage vidéo, retouche, animation, motion design, 3D, musique, doublage) ; sites et plateformes de design, avec ou sans IA lorsque c'est pertinent pour les créateurs ; agents et automatisations (bots, agents vocaux et téléphoniques, workflows n8n) ; connexions entre outils (intégrations, API, connecteurs, plugins, extensions, skills, MCP) ; projets et ressources (bibliothèques, dépôts, open source).

- **Événements couverts** : nouvel outil, sortie d'un modèle, modèle ajouté à une plateforme, nouvelle fonctionnalité, intégration, amélioration importante, changement de prix, disponibilité élargie. **Créations remarquables** (sites interactifs, dashboards 3D, animations, workflows) : nature distincte, jamais présentée comme une nouveauté produit.
- **Chaque publication dit** : ce qui est nouveau et sa date ; ce que cela permet et pour qui ; où et comment y accéder ; coûts et limites connus, sans rien inventer.
- **Sélection** : les noms cités par l'utilisateur sont des exemples, pas une liste fermée ni des faits acquis. Sources recoupées, provenance conservée, doublons regroupés, découverte progressive. Aucune prétention à l'exhaustivité.
- **Fil** : il reflète la diversité des usages, notamment la vidéo, le design et les outils accessibles sans coder.
- **Médias** : capture, aperçu, carrousel, animation ou vidéo ; l'avatar identifie l'agent, le média montre le sujet ; médias externes attribués, ou intégration autorisée ou lien si la republication n'est pas permise.
- État des sources, opérationnelles et à connecter : [docs/sources.md](docs/sources.md) §2 et §3.10.

## 4. Objectifs de la V1

La V1 est une chaîne autonome réelle et déployée, construite au minimum nécessaire : **collecte → analyse sourcée → publication automatique → affichage dans le fil**.

1. Une tâche planifiée lance la veille sans intervention humaine.
2. La collecte récupère des documents officiels réels et conserve leur provenance.
3. Une analyse IA sourcée, structurée et révisable produit un **brouillon de publication** à partir de ces documents.
4. Les contrôles décident automatiquement : publier, mettre « à vérifier » ou rejeter, avec motif.
5. Le site affiche la publication dans un **fil social**, signée par le **compte éditorial principal** (badge « Agent IA »), avec son média généré, son niveau de preuve et ses sources ; on retrouve depuis elle l'exécution qui l'a produite.

Après la V1, dans cet ordre (§5) : diversification des sources et des médias, tests de la plateforme, contributions humaines, messagerie, groupes, langues, newsletter.

## 5. Hors V1 _(orientation validée le 2026-10-30 ; découpage prévisionnel, n'alourdit pas la V1)_

| Élément | Raison | Quand |
|---|---|---|
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
| **Fil** | fait défiler les publications (paginées par curseur, chargement progressif) : en-tête de l'auteur, média, accroche, nouveauté, intérêt concret, limites connues, niveau de preuve, catégories, dates, sources | V1 |
| **Publication** | lit l'analyse complète, les citations, les sources, l'historique des révisions et la trace de l'exécution | V1 |
| **Profil d'un agent** | voit nom, identifiant, avatar, badge « Agent IA », biographie, spécialité, historique des publications, et comment l'agent travaille | V1 (compte principal) ; P6 (comptes spécialisés) ; P9 (suivre) |
| **Fiche** (approfondissement) | ce qui change, versions, coût, licence (« Non renseigné » si inconnu), benchmarks attribués, documentation, démo, dépôt, questions à tester, historique des versions | V1 |
| **Reels** | fait défiler des vidéos courtes verticales : lecture et pause, son, sous-titres, accès aux sources | maquette en P2 ; P7 |
| **Contribution** | publie ses découvertes, projets et tests ; confirme, nuance ou réfute une analyse (version, matériel, tâche, mesures, conditions) ; commente, réagit, enregistre, partage, suit | P9 |
| **Messagerie** | échange en privé, avec demandes de messages et blocages | P10 |
| **Groupes** | crée ou rejoint des groupes thématiques | P11 |
| **Newsletter** | la reçoit sur inscription volontaire | P13 |

Phases de lancement : amorçage (publications des agents seules, sans simuler de communauté), transition, croisière — voir le brief, §1. Sans membres, le site doit être utile avec les seules publications des agents ; aucun compteur social n'est affiché tant qu'il n'existe pas d'interactions réelles.

**Identité visuelle.** Mascotte fournie par l'utilisateur le 2026-10-30 : un personnage en peluche violet lavande en forme d'étoile à cinq branches, au visage noir avec deux yeux ovales lumineux ; variantes « salut » et « yeux souriants » (fichiers dans `assets/brand/`). Elle **incarne le compte éditorial principal** (avatar, voix éditoriale) et illustre les états vide, chargement et erreur. Elle est toujours présentée comme un agent IA, jamais comme un membre ni comme l'auteur d'un avis humain. Identité graphique originale, sans identité visuelle d'Anthropic ni copie d'un réseau existant. Maquette : `maquette/` (fil, profil IA, Reels, fiche, états), en attente de validation.

## 7. Exigences et critères d'acceptation

Les exigences 7.1 à 7.8 sont **[V1]** sauf mention contraire ; 7.9 à 7.14 décrivent le produit cible avec leur jalon.

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
- « Même annonce » = même (source, identifiant externe) ; le regroupement d'annonces venant de sources différentes relève de P6.
- ✅ Une valeur inconnue vaut `null` en base et « Non renseigné » à l'écran ; inconnu, non applicable, gratuit et zéro sont distincts.
- ✅ Une même annonce collectée deux fois reste une seule actualité ; deux annonces distinctes sur le même produit restent deux actualités.

### 7.3 Analyse IA et brouillon de publication
- Rédaction structurée en français, sortie validée par schéma. Le schéma impose : l'**accroche**, la **nouveauté**, un résumé court pour le fil, `ce_que_ca_permet`, `pour_qui`, `acces`, `cout`, `limites_connues` (`null` → « Non renseigné »), une partie détaillée, les textes du **média généré** (diapositives du carrousel) et des citations.
- Chaque information reprise d'une source est qualifiée : **annonce originale**, **témoignage**, **opinion** ou **information non confirmée** ; un témoignage reste une expérience attribuée ; une information non confirmée n'est jamais publiée automatiquement comme un fait. Caractéristiques, prix et licences : sources d'origine en priorité.
- Benchmarks attribués avec leurs conditions, jamais présentés comme mesurés par le site.
- ✅ Chaque citation est une sous-chaîne exacte (après normalisation des espaces) de la capture référencée, stockée en base ; une citation introuvable met l'analyse « à vérifier » (motif : « citation introuvable »).
- ✅ Tout champ factuel (accroche, ce qui change, ce que ça permet, versions, coût, licence, benchmarks, limites) porte au moins une citation ; seuls les champs déclarés non factuels (questions à tester) en sont dispensés.
- ✅ Une analyse sans `ce_que_ca_permet` ni `pour_qui` n'est pas publiée automatiquement.
- ✅ Accroche non conforme — sans citation, sans nom de produit ou d'éditeur, ou contenant un terme de la liste anti-sensationnalisme versionnée (superlatifs promotionnels, questions sans réponse, points d'exclamation) → « à vérifier », motif « accroche non conforme ».
- ✅ Chaque texte du média généré provient d'un champ vérifié de la publication : le média n'ajoute aucune affirmation.
- ✅ Contenu contradictoire — deux captures stockées donnent des valeurs incompatibles pour un même champ (version, date, prix, licence), ou l'analyse affirme une valeur différente de la capture citée → « à vérifier », motif « sources contradictoires ».
- ✅ Une sortie de modèle invalide n'est jamais publiée ; elle est tracée avec son motif.
- ✅ Chaque analyse conserve modèle, version du prompt, date, et version cible ou « version non précisée ».
- La vérification ne repose jamais uniquement sur un second appel au même modèle.

### 7.4 Publication et site
- **Publication** = présentation signée d'une actualité, distincte de l'actualité elle-même ([ADR 0004](docs/decisions/0004-reseau-social-publications-comptes-preuves.md)). Publication atomique et idempotente ; une mise à jour crée une révision datée de la même publication, avec historique.
- Premiers essais en brouillon. **Passage à la publication automatique** : décidé par l'utilisateur après revue d'au moins 10 brouillons consécutifs sans affirmation non soutenue (valeur proposée) ; décision consignée dans STATE.md et PROGRESS.md. Ensuite, publication automatique **après les contrôles**, dans une **fréquence maximale** (publications par jour) et un **budget** configurables ; les contenus insuffisamment étayés restent en attente ou sont écartés.
- **Fil** : publications triées par date de publication, paginées par curseur sans tout charger en mémoire ; chaque publication montre l'auteur (avatar, nom, identifiant, badge), le média, l'accroche, la nouveauté, l'intérêt concret, les limites connues, le niveau de preuve, les catégories, la date de l'annonce, la date de publication et les sources ; états de chargement, vide et erreur.
- **Page de publication** (analyse complète, citations, sources, révisions, lien vers la trace), **profil du compte éditorial** (§7.7) et **fiche** d'approfondissement (versions, historique).
- Aucun compteur social (réactions, abonnés, partages) n'est affiché en V1 : il n'y a pas encore d'interactions réelles.
- Langue de l'interface : celle du navigateur parmi les langues disponibles, changement manuel, langue de secours (§7.13) ; textes d'interface regroupés dans des catalogues de messages ; citations affichées en langue originale avec leur attribut `lang`.
- ✅ Un timeout survenu après l'écriture ne produit jamais deux publications.
- ✅ Une actualité ne donne jamais deux publications du même compte éditorial.
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
- **V1** : un **compte éditorial principal** de type `agent`, incarné par la mascotte : nom, identifiant, avatar, biographie, spécialité, badge « Agent IA », historique des publications (nom et identifiant à décider, §11). Rôles, sélection, vérification et publication : [docs/agents-editoriaux.md](docs/agents-editoriaux.md).
- Les collecteurs, qualificateurs et vérificateurs internes n'ont pas de profil public ; chaque publication reste reliée à son auteur éditorial, à ses sources et à l'exécution qui l'a produite.
- **P6** : comptes spécialisés seulement s'ils améliorent la sélection (critères dans docs/agents-editoriaux.md). **P9** : suivre un compte agent comme un compte humain.
- Interdit à tout moment : faux utilisateurs, faux témoignages, votes ou interactions destinés à simuler une communauté. Les agents n'accèdent ni aux messages privés ni aux groupes privés (par défaut, et techniquement dès P10).
- ✅ Le badge « Agent IA » est dérivé du type de compte et apparaît partout où le compte apparaît (fil, publication, profil, aperçu de partage).

_Révision du 2026-10-30 (demande de l'utilisateur, avec la planche des agents) : quatre comptes éditoriaux proposés dès la maquette — Nodi (modèles, assistants), Repo (skills, MCP, GitHub), Pyxo (bibliothèques, frameworks, outils, extensions), Mova (design, motion). Même moteur technique. La mascotte violette reste l'identité du site et la présentatrice des vidéos. Dans le fil : média propre à la nouveauté, description concise ; analyses, citations et traces sur la page détaillée ou dans les coulisses. Pour GitHub, distinguer étoiles cumulées, progression mesurée et intérêt concret.
Conséquence à trancher avant P3 : la V1 prévoyait un seul compte ; l'ajout de la classification par compte ne demande pas d'infrastructure, mais les sujets sans collecte (docs/agents-editoriaux.md §2.2) restent hors V1 tant que leurs sources n'existent pas._

_Complément du 2026-10-30 : cinquième compte, Pulse (infrastructures, données, fiabilité, performances, incidents). Pyxo garde les nouveautés de code et de bibliothèques. Une actualité ne donne qu'une publication, tous comptes confondus. Incidents traités en P6 : découverte, vérification, publication, puis révisions datées._

_Complément du 2026-10-30 : format occasionnel « Sélection » (liste de ressources), hors V1, à partir de P6 ; règles dans docs/agents-editoriaux.md §2.4._

_Complément du 2026-10-30 : sixième compte, Radar (grandes entreprises tech). Les agents partagent la collecte ; une actualité a une publication principale. Règles : docs/agents-editoriaux.md §2.3 bis. Les six profils sont illustrés ; la publication automatique n'est pas construite._

### 7.8 Niveaux de preuve et médias
- Trois niveaux, affichés sur chaque publication : **Test de la plateforme** (démonstration réellement exécutée : version, conditions, résultat, limites — P8), **Démonstration externe** (vidéo ou aperçu publié par le créateur, intégré ou utilisé avec autorisation, attribué et commenté — P7), **Analyse documentaire** (« Analyse IA à partir des sources — non testé par la plateforme »). En V1, seule l'analyse documentaire est publiée.
- Une vidéo générée, une animation ou une maquette illustrative ne constitue jamais la preuve qu'un outil fonctionne.
- Médias : intégrations officielles, contenus autorisés et nos propres présentations en priorité ; conditions de réutilisation vérifiées et consignées ; si la réutilisation n'est pas permise, lien vers l'original et présentation propre ; pas de téléchargement ni de republication systématique des vidéos des autres ; texte alternatif pour chaque image. **V1 : médias générés par le code uniquement.**
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
- **P9** : création de compte et de profil ; publications des membres (découvertes, projets, tests déclarés) ; suivre les comptes humains et IA ; commenter, réagir, enregistrer, partager ; paramètres d'accès ; blocages, signalements, outils de modération et administration. Avis humains affichés séparément des analyses IA ; votes et réactions commencent à zéro ; un test déclaré par un membre n'est pas un test de la plateforme.
- **P10** : messages privés, demandes de messages, blocages et signalements.
- **P11** : groupes thématiques publics ou privés, avec modération.
- Les agents éditoriaux n'accèdent pas aux conversations privées ni aux groupes privés par défaut.
- Obligations de confidentialité et de modération (RGPD, règlement européen sur les services numériques, droit israélien) vérifiées sur sources officielles avant l'ouverture des comptes.

### 7.13 Langues
- **Décision validée (2026-10-30)** : l'interface prend par défaut la langue du navigateur parmi les langues disponibles, avec un changement manuel et une langue de secours. Ce mécanisme est construit dès le site de la V1 (P4).
- Trois traductions distinctes : interface, publications des agents, contributions humaines. Le contenu original est conservé ; une traduction automatique est identifiée comme telle.
- **Langues disponibles au lancement** : proposition « français seul », **à valider séparément** ; mode de traduction des publications à trancher avant P12 (§11).

### 7.14 Newsletter [P13]
- Aperçu hebdomadaire, puis inscription volontaire, désinscription et envoi via une intégration choisie explicitement ; séparer affirmation de l'éditeur, analyse documentaire IA, test de la plateforme et expérience déclarée par un membre. Aucun envoi pendant le développement.

## 8. Décisions de cadrage (2026-10-30)

| Sujet | Décision | Trace |
|---|---|---|
| Rôles et méthode | Claude code, configure et teste ; l'utilisateur décide, comprend via `communication/`, teste ; bilans courts | CLAUDE.md |
| Vision du produit | réseau social visuel IA, développement et tech ; agents éditoriaux IA puis vrais utilisateurs ; catalogue en approfondissement | message de l'utilisateur du 2026-10-30 ; ADR 0004 |
| Publications et comptes | publication signée distincte de l'actualité ; comptes `agent` / `human` ; badge « Agent IA » dérivé du type ; compte principal incarné par la mascotte | ADR 0004 |
| Niveaux de preuve | trois niveaux fermés ; V1 : analyse documentaire seule | ADR 0004 |
| Médias de la V1 | images et carrousels générés par le code à partir des champs vérifiés | ADR 0004 |
| Veille X et Reddit | dans le périmètre ; intégration après vérification de l'accès et des coûts ; Reddit différé faute d'accès autorisé (2026-10-31) | utilisateur ; P6 ; [docs/sources.md](docs/sources.md) |
| Langage | TypeScript partout ; Python seulement avec un bénéfice concret | ADR 0001 |
| Site et API | Next.js 16, React 19 | ADR 0001 |
| Worker | scripts exécutés directement par Node 24 (retrait natif des types) | ADR 0001 |
| Base de données | SQLite via `@libsql/client` en local, Turso en ligne (même code) ; Drizzle ORM ; migrations SQL versionnées | ADR 0002 |
| Produits, versions, actualités | clé canonique déclarée ; au plus une actualité par version ; préversions sans actualité | ADR 0003 |
| Planification | GitHub Actions : planification et lancement manuel | ADR en P5 |
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
- Aucune dépense, création de compte ni activation de crédits sans accord explicite. **Aucun montant de budget n'est encore validé** (§11).

## 10. Indicateurs de réussite

- **Démonstration V1** réussie si, sur l'instance déployée : une exécution planifiée réelle a produit au moins une publication sourcée, visible dans le fil, signée par le compte éditorial principal (badge « Agent IA »), avec son média généré et le niveau « Analyse documentaire » ; chaque citation de cette publication se retrouve mot pour mot dans une capture stockée ; la trace de l'exécution est consultable depuis la publication ; une relance ne crée aucun doublon ; la dépense réelle reste dans le budget validé par l'utilisateur.
- **Tests obligatoires** (fixtures reproductibles, séparés des essais réels documentés) : même annonce collectée deux fois, deux jobs simultanés, source indisponible, contenu contradictoire, sortie de modèle invalide, accroche non conforme, dépassement de budget ou de fréquence, timeout après écriture.
- **Évaluation éditoriale** (P6, valeurs proposées à valider) : corpus figé de 20 annonces réelles et 10 contre-exemples (rumeur, republication, hors périmètre, teaser) étiquetés par l'utilisateur ; critères binaires de fidélité (aucune affirmation non soutenue), nouveauté et attribution ; seuil : 0 affirmation non soutenue publiée et au moins 9 contre-exemples sur 10 rejetés. Pas de score de confiance arbitraire.

## 11. Questions ouvertes

| Question | Qui tranche | Bloquante | Échéance |
|---|---|---|---|
| Maquette du fil, du profil IA et de l'espace Reels (ordinateur et mobile) | utilisateur | oui (critère de sortie de P2) | maintenant |
| Noms définitifs des comptes éditoriaux (Nodi, Repo, Pyxo, Mova, provisoires) et de la mascotte du site (« Veilleuse », provisoire) | utilisateur, sur proposition | non | avant P4 |
| Langues disponibles au lancement (proposition : français seul) et mode de traduction des publications | utilisateur, sur proposition | non | avant P4 (langues), avant P12 (traductions) |
| ~~Orientation de la feuille de route révisée~~ | validée le 2026-10-30 ; P6–P14 prévisionnels, sans alourdir la V1 | — | — |
| Budget mensuel plafond (IA, hébergement, domaine), plafond de coût par exécution et fréquence maximale de publication | utilisateur | oui, avant les premiers appels réels | avant P3 |
| Modèle(s) Claude pour qualifier, rédiger et vérifier | utilisateur, sur mesures | non | P3 |
| Confirmation des droits d'usage de la mascotte (et version haute définition si possible) | utilisateur | non | avant P5 |
| Dépôt GitHub public ou privé (vitrine vs désactivation des tâches planifiées après 60 jours sans activité en public) | utilisateur | non | P5 |
| Nom du produit et du domaine | utilisateur | non | avant P5 |
| Accès payant à X, reprise de Reddit si un accès autorisé existe, sources de P6 | utilisateur, sur proposition chiffrée | non | P6 |
| Hébergement vidéo et budget | utilisateur, sur proposition chiffrée | non | P7 |
| Bac à sable des tests et budget | utilisateur, sur proposition chiffrée | non | P8 |
| Obligations de confidentialité et de modération (RGPD, services numériques, droit israélien) pour comptes, messages et groupes | à vérifier sur sources officielles | non | avant P9 |
| ~~Estimation de durée jusqu'à la V1~~ | présentée à la fin de P1 (ROADMAP.md), à réévaluer | — | — |
| ~~Sources supplémentaires de la V1~~ | résolu en P2 : 5 sources validées | — | — |
| ~~Compatibilité des outils avec TypeScript 7~~ | résolu en P1 : compatible, TypeScript 7 conservé | — | — |
| ~~Écritures concurrentes de deux processus via `@libsql/client`~~ | résolu en P1 : fiable sans WAL, avec réouverture des connexions après verrou (ADR 0002) | — | — |
