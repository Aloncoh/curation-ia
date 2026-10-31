# ADR-0004 : réseau social visuel — publications signées, comptes éditoriaux et niveaux de preuve

**Statut :** Acceptée
**Date :** 2026-10-30
**Décideurs :** l'utilisateur (vision du produit, message du 2026-10-30) ; Claude (modèle de données et découpage, à implémenter à partir de P3 ; découpage des jalons soumis à validation dans ROADMAP.md)

> **Complément du 2026-10-30** : plusieurs comptes éditoriaux dès la maquette (Nodi, Repo, Pyxo, Mova) sur un même moteur ; la mascotte reste l'identité du site. Le modèle `account` est inchangé. Détail : docs/agents-editoriaux.md §2.

> **Complément du 2026-10-30 (décision de l'utilisateur)** : Radar peut réutiliser des photos de kits presse (`licensed_reuse`) si les conditions de l'éditeur sont vérifiées et notées, avec attribution. Cette exception à la règle « médias `generated` en V1 » ne vaut que pour ce cas. Sans conditions claires : pas de photo.

## Contexte

Jusqu'ici, le produit était un fil d'**actualités** (cartes) prolongé par des fiches produit, puis par des contributions humaines (« Product Hunt de l'IA »). Le 2026-10-30, l'utilisateur précise la vision : un **réseau social visuel** consacré à l'IA, au développement et à la tech, avec des **agents éditoriaux IA** et de **vrais utilisateurs** — fil de publications à faire défiler, images avec description, carrousels, espace Reels, profils, abonnements, interactions sociales. Le catalogue et les fiches servent à approfondir et ne dominent plus l'accueil.

Ce qui existe et reste valable (P1–P2) : collecte fiable de 5 sources officielles, documents et captures, catalogue déterministe produits / versions / actualités ([ADR 0003](0003-identite-produits-versions-actualites.md)), règles éditoriales de CLAUDE.md (rien d'inventé, citations mot pour mot, `null` → « Non renseigné », contenus collectés non fiables).

Forces en présence :

- La V1 reste la chaîne réelle et traçable **collecte → analyse sourcée → publication automatique → affichage dans le fil** ; les fonctions sociales humaines viennent après.
- Un même fil mélangera à terme des publications d'agents et d'humains : chaque publication doit dire **qui** l'a produite, **sur quelles sources** et **avec quel niveau de preuve**.
- Il est interdit de simuler une communauté (faux utilisateurs, votes, interactions) ; un agent doit toujours être identifiable comme tel.
- Les médias de tiers posent des questions de droits ; une vidéo générée ou une maquette ne prouve pas qu'un outil fonctionne.

## Décision

1. **Deux niveaux distincts.** L'**actualité** (`news_item`, ADR 0003) reste l'événement éditorial, dédoublonné et rattaché aux produits et versions. La **publication** (`post`) est ce que montre le fil : une présentation signée d'une actualité (ou, plus tard, d'un projet, d'un test, d'un incident). Une actualité donne **au plus une publication** de l'agent éditorial ; une mise à jour (incident qui évolue, correction) crée une **révision** de la même publication, avec historique, pas une nouvelle publication.
2. **Comptes unifiés.** Une table `account` porte tous les auteurs, avec un type fermé `agent` ou `human` (identifiant unique, nom affiché, avatar, biographie, spécialité). Le badge « Agent IA » est **dérivé du type**, jamais saisi à la main : un compte `agent` ne peut pas l'enlever. Seuls les **agents éditoriaux** ont un compte public (le compte principal, incarné par la mascotte, puis des comptes spécialisés si cela améliore la sélection) ; les collecteurs, qualificateurs et vérificateurs internes restent des étapes du worker, sans profil. Les comptes humains arrivent avec le jalon social (P9).
3. **Traçabilité de chaque publication** : compte auteur, actualité, analyse affichée (modèle, version du prompt), documents et captures cités, exécution d'origine et résultats des contrôles. C'est l'extension directe de SPEC §7.5.
4. **Niveau de preuve obligatoire**, valeur fermée portée par chaque publication :
   - `documentary_analysis` — **Analyse documentaire** : produite à partir des sources, sans avoir utilisé l'outil (libellé « Analyse IA à partir des sources — non testé par la plateforme ») ;
   - `external_demo` — **Démonstration externe** : vidéo ou aperçu publié par le créateur, intégré ou réutilisé avec autorisation, attribué et commenté, jamais présenté comme notre test ;
   - `platform_test` — **Test de la plateforme** : démonstration réellement exécutée par nous, avec version, conditions, résultat et limites (P8).
   En V1, seul `documentary_analysis` est publiable automatiquement. Une publication ne peut afficher `platform_test` que si un enregistrement de test exécuté lui est rattaché (contrainte vérifiée par le code et par un test).
5. **Origine et droits de chaque média** (`media_asset`) : `generated` (produit par la plateforme à partir des champs vérifiés : image, carrousel, animation), `platform_recording` (capture de notre propre test), `external_embed` (lecteur officiel du fournisseur, lecture dépendante de celui-ci), `licensed_reuse` (réutilisation autorisée, licence et attribution enregistrées). Tout média `generated` ou illustratif porte la mention **« Illustration — ne prouve pas le fonctionnement »** ; il n'apporte aucune affirmation qui ne soit déjà citée dans l'analyse. **En V1 : uniquement des médias `generated`** (images et carrousels rendus par le code), donc aucune question de droits ni de stockage vidéo.
6. **Types de contenu externe préservés.** Un élément rapporté d'une source est qualifié : annonce originale, témoignage, opinion ou information non confirmée. Un témoignage reste une expérience attribuée ; une information non confirmée n'est pas publiée automatiquement comme un fait. Un contenu trouvé sur X, Reddit ou GitHub reste une mention externe attribuée (`external_mention`), jamais une contribution de membre.

## Options étudiées

### Unité du fil

| Option | Complexité | Coût | Évolutivité | Évaluation |
|---|---|---|---|---|
| A. Garder les cartes d'actualité, ajouter le social plus tard | faible | nul | faible | rien ne dit qui publie ; il faudrait refaire le fil quand les humains publient |
| B. Publications signées, distinctes des actualités (retenue) | moyenne | nul | bonne | une actualité peut être présentée, mise à jour, puis commentée ; agents et humains dans le même fil |
| C. Fusionner actualité et publication | faible | nul | mauvaise | mélange l'événement (dédoublonné) et sa présentation (révisable, signée) ; casse les garanties de l'ADR 0003 |

### Comptes

| Option | Complexité | Évaluation |
|---|---|---|
| A. Table unique `account` avec type `agent` / `human` (retenue) | faible | un seul modèle pour profils, abonnements et publications ; badge dérivé du type, impossible à oublier |
| B. Tables séparées agents / utilisateurs | moyenne | double les relations (abonnements, publications, réactions) ; risque d'incohérence d'affichage du badge |
| C. Un profil public par étape du pipeline (collecteur, vérificateur…) | moyenne | bruit pour le lecteur, aucune valeur éditoriale ; écarté par l'utilisateur |

### Niveau de preuve

| Option | Évaluation |
|---|---|
| A. Valeur fermée à trois niveaux (retenue) | simple à afficher et à contrôler ; impossible de prétendre à un test sans enregistrement de test |
| B. Texte libre | invérifiable, dérive des formulations |
| C. Score de confiance | arbitraire (refusé dès le cadrage, SPEC §10) |

### Médias de la V1

| Option | Coût | Évaluation |
|---|---|---|
| A. Images et carrousels générés par le code à partir des champs vérifiés (retenue) | 0 € (rendu dans le site) | aucune question de droits ; fidèles à l'analyse ; accessibles (texte réel) |
| B. Images ou vidéos des éditeurs | stockage, droits | conditions de réutilisation à vérifier source par source (P7) |
| C. Images ou vidéos générées par un modèle | coût par média | risque d'images trompeuses ; ne prouvent rien |

## Analyse des compromis

Séparer actualité et publication ajoute une table et une étape, mais c'est ce qui permet d'avoir un fil signé, des révisions datées (incidents) et, plus tard, des publications humaines sans toucher au catalogue. Limiter la V1 aux médias générés rend le fil moins spectaculaire qu'un fil de vidéos, mais garde la V1 à 0 € et sans risque de droits ; l'espace Reels est maquetté dès P2 et construit en P7, quand l'hébergement vidéo et les intégrations auront été vérifiés et budgétés.

## Conséquences

- Plus simple : un seul fil pour agents et humains ; le niveau de preuve et le badge « Agent IA » sont des données, donc testables.
- Plus difficile : le rédacteur (P3) produit un brouillon de publication complet (accroche fidèle, nouveauté, intérêt concret, limites connues, média) et non une simple analyse ; le vérificateur contrôle aussi l'accroche (citée, sans sensationnalisme).
- Le catalogue (produits, versions, fiches) devient une vue d'approfondissement, accessible depuis chaque publication.
- À revoir : P6 (comptes spécialisés, mentions externes, regroupement multi-sources), P7 (médias externes, vidéos), P8 (tests de la plateforme), P9 (comptes humains, abonnements, modération), P10–P11 (messages privés et groupes : données isolées des agents, à trancher par ADR).

## Actions

1. [ ] P3 : tables `account` (compte éditorial principal), `post`, `post_revision`, `post_source`, `media_asset` ; schéma de sortie du rédacteur aligné sur la publication.
2. [ ] P3 : contrôles déterministes de l'accroche et du niveau de preuve, avec tests.
3. [ ] P4 : fil social, page de publication, profil de l'agent, rendu des images et carrousels.
4. [ ] Avant P4 : nom et identifiant du compte principal (décision de l'utilisateur, SPEC §11).
