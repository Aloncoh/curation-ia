# SPEC — CURATION AI

> Statut : cadrage validé le 2026-10-30 (P0). Le découpage V1 / après V1 (§5 et marques [V1] du §7) est une **proposition en attente de validation** avec la feuille de route ([ROADMAP.md](ROADMAP.md)). Exigences détaillées d'origine : [docs/brief-initial.md](docs/brief-initial.md) ; ce document en est la synthèse arbitrée et prime en cas d'écart.

## 1. Problème

Les nouveautés IA utiles aux développeurs (assistants de code, agents, skills, serveurs MCP, modèles, fonctionnalités) sortent plus vite qu'on ne peut les suivre. Les annonces officielles disent ce qui change, rarement à qui cela sert ni ce que cela vaut en pratique ; les retours de terrain sont dispersés et rarement rattachés à une version précise. On découvre tard, on comprend mal et on teste au hasard.

## 2. Public

- **Principal** : développeurs, étudiants et créateurs de projets qui utilisent l'IA pour construire des choses concrètes.
- **Secondaire** : profils data / IA qui suivent les modèles (benchmarks, licences, coûts).
- **Besoin commun** : découvrir vite ce qui sort, comprendre à quoi ça sert, décider si ça mérite d'être testé.

## 3. Périmètre éditorial

- **Noyau** : assistants et agents de code et leur écosystème (skills, MCP, templates, extensions).
- **Dès le lancement** : une sélection des nouveautés importantes des modèles et applications IA (artifacts, projets, fonctionnalités utiles pour créer ou travailler).
- **Ensuite** : versions de langages, incidents documentés, tutoriels et événements indépendants (une panne n'est pas une fiche produit).
- **Filtre commun** : chaque publication dit ce que la nouveauté permet concrètement, pour qui, et ses limites connues.
- **Peu de publications, mais approfondies** : la qualification rejette plus qu'elle ne publie.
- **Deux niveaux de lecture** : un résumé clair dans le fil ; détails techniques, benchmarks attribués et conditions de test dans la page de détail.
- La source technique choisie pour un jalon ne restreint pas le périmètre éditorial.

## 4. Objectifs de la V1

La V1 est une chaîne autonome réelle et déployée, construite au minimum nécessaire :

1. Une tâche planifiée lance la veille sans intervention humaine.
2. La collecte récupère des documents officiels réels et conserve leur provenance.
3. Une analyse IA sourcée, structurée et révisable est produite à partir de ces documents.
4. Les contrôles décident automatiquement : publier, mettre « à vérifier » ou rejeter, avec motif.
5. Le site affiche la publication et l'on retrouve l'exécution qui l'a produite.

Après la V1, dans cet ordre : tests avec de vrais utilisateurs et fonctions participatives, puis newsletter.

## 5. Hors V1 _(proposition à valider)_

| Élément | Raison | Quand |
|---|---|---|
| Regroupement de documents venant de sources de types différents, agent éventuel | des sources sans recoupement suffisent à démontrer la chaîne | P6 |
| Évaluation sur un corpus d'annonces et de contre-exemples | remplacée en V1 par la revue de brouillons avant publication automatique (§7.4) | P6 |
| Interface d'administration | les commandes locales suffisent en V1 | P7 |
| Score de découverte et formule de classement documentée | en V1, le fil est trié par date de publication | P7 |
| Comptes, votes, commentaires, favoris, retours de test | accès, modération et anti-abus à définir avant ouverture | P8 |
| Newsletter (inscription, envoi) | dépend des contributions ; aperçu d'abord, aucun envoi pendant le développement | P9 |
| Images générées ou récupérées | droits et coût ; cartes typographiques générées par le code | si besoin concret |
| Base vectorielle, file dédiée, multi-agents, second langage | aucun besoin démontré | seulement sur ADR |

## 6. Parcours visiteur (cible)

1. **Découverte** [V1] : fil de cartes paginé par curseur, chargement progressif. Chaque carte : titre, visuel ou carte typographique, description, intérêt concret, catégories, date de l'annonce, date de publication, sources, et le badge « Analyse IA à partir des sources — non testé par la plateforme ».
2. **Investigation** [V1] : page de détail — ce qui change, ce que ça permet, pour qui, limites connues, versions, coût, licence, benchmarks contextualisés et attribués, documentation, démo, dépôt, questions à tester, historique des versions.
3. **Contribution** (P8) : confirmer, nuancer ou réfuter avec version, matériel, tâche, mesures et conditions ; avis humains affichés séparément de l'analyse IA.
4. **Rétention** (P9) : newsletter sur inscription volontaire.

Phases de lancement : amorçage (analyses IA seules, sans simuler de communauté), transition, croisière — voir le brief, §1.

**Identité visuelle.** Mascotte fournie par l'utilisateur le 2026-10-30 : un personnage en peluche violet lavande en forme d'étoile à cinq branches, au visage noir avec deux yeux ovales lumineux ; variantes « salut » et « yeux souriants ». Usage prévu, à préciser en P2 : identité du site et états vide, chargement et erreur. Elle n'est jamais présentée comme un membre ni comme un avis humain. Pas d'identité visuelle d'Anthropic.

## 7. Exigences et critères d'acceptation

Toutes les exigences ci-dessous sont **[V1]** sauf mention contraire.

### 7.1 Collecte et provenance
- Sources configurées, priorité aux annonces officielles, changelogs, documentations et dépôts d'origine ; collecte déterministe par API ou flux.
- Un document est identifié par **(source, identifiant externe)**. Il conserve : URL d'origine et normalisée, date d'annonce (`null` si inconnue), date de collecte. Chaque version de son contenu est une **capture** avec son hash et le contenu capturé autorisé.
- Politique de rétention explicite, fixée avant le déploiement (P5) : les passages servant de preuve à une publication sont conservés ; le reste suit une durée définie.
- ✅ Une seconde collecte sans changement ne crée ni document ni capture.
- ✅ Si le contenu d'un document change (hash différent), une seule nouvelle capture est créée et l'ancienne est conservée.
- ✅ Un processus interrompu puis relancé ne perd aucune donnée et ne crée aucun doublon.
- ✅ Une source en erreur laisse les données existantes intactes et enregistre un motif d'échec.

### 7.2 Données produit
- Produits, versions, actualités et analyses selon le modèle de données du brief (§4, « Modèle de données et garanties »), avec une règle d'unicité documentée pour les produits (forme minimale en V1, complète en P6).
- « Même annonce » = même (source, identifiant externe) ; le regroupement d'annonces venant de sources différentes relève de P6.
- ✅ Une valeur inconnue vaut `null` en base et « Non renseigné » à l'écran ; inconnu, non applicable, gratuit et zéro sont distincts.
- ✅ Une même annonce collectée deux fois reste une seule actualité ; deux annonces distinctes sur le même produit restent deux actualités.

### 7.3 Analyse IA
- Rédaction structurée en français, sortie validée par schéma. Le schéma impose : un résumé court pour le fil, `ce_que_ca_permet`, `pour_qui`, `limites_connues` (`null` → « Non renseigné »), une partie détaillée, et des citations.
- Benchmarks attribués avec leurs conditions, jamais présentés comme mesurés par le site.
- ✅ Chaque citation est une sous-chaîne exacte (après normalisation des espaces) de la capture référencée, stockée en base ; une citation introuvable met l'analyse « à vérifier » (motif : « citation introuvable »).
- ✅ Tout champ factuel (ce qui change, ce que ça permet, versions, coût, licence, benchmarks, limites) porte au moins une citation ; seuls les champs déclarés non factuels (questions à tester) en sont dispensés.
- ✅ Une analyse sans `ce_que_ca_permet` ni `pour_qui` n'est pas publiée automatiquement.
- ✅ Contenu contradictoire — deux captures stockées donnent des valeurs incompatibles pour un même champ (version, date, prix, licence), ou l'analyse affirme une valeur différente de la capture citée → « à vérifier », motif « sources contradictoires ».
- ✅ Une sortie de modèle invalide n'est jamais publiée ; elle est tracée avec son motif.
- ✅ Chaque analyse conserve modèle, version du prompt, date, et version cible ou « version non précisée ».
- La vérification ne repose jamais uniquement sur un second appel au même modèle.

### 7.4 Publication et site
- Publication atomique et idempotente.
- Premiers essais en brouillon. **Passage à la publication automatique** : décidé par l'utilisateur après revue d'au moins 10 brouillons consécutifs sans affirmation non soutenue (valeur proposée) ; décision consignée dans STATE.md et PROGRESS.md.
- Site en français ; fil trié par date de publication, paginé par curseur sans tout charger en mémoire ; états de chargement, vide et erreur ; sources visibles ; chaque carte ouvre une page de détail.
- ✅ Un timeout survenu après l'écriture ne produit jamais deux publications.
- ✅ Fil et page de détail : aucune violation critique relevée par axe-core, navigation complète au clavier, lisibles à 375 px de large.

### 7.5 Exploitation et contrôle
- Exécutions tracées en base : étapes, statuts, documents utilisés, modèle, version du prompt, latence, tokens, coût (réel ou estimé, étiqueté comme tel), erreurs, reprises ; aucun secret.
- Jobs avec verrouillage par bail (lease), délais, reprises limitées, résultats partiels.
- Commandes locales : lancer, état, pause et reprise, coûts. La pause bloque les nouveaux jobs et appels ; les requêtes déjà parties peuvent être facturées et leurs résultats tardifs sont enregistrés proprement.
- Quota par exécution et plafond de coût configurables (valeurs fixées par l'utilisateur, §11) ; arrêt automatique au dépassement.
- ✅ Deux collecteurs lancés en même temps ne traitent jamais le même job.
- ✅ Après `pause`, aucune exécution (y compris planifiée en production) ne lance de job ni d'appel au modèle ; `reprise` les rétablit.
- ✅ Le dépassement du quota ou du plafond arrête l'exécution proprement, avec motif.
- ✅ Depuis une publication, on retrouve l'analyse affichée, puis l'exécution d'origine et ses étapes.

### 7.6 Sécurité
- Secrets hors du dépôt ; appels au modèle côté serveur ; entrées validées par schéma.
- Collecte : liste blanche d'hôtes, validation des adresses IP résolues avec connexion à l'adresse validée, aucune redirection suivie, délai et taille maximum.
- ✅ Une URL hors liste blanche, une adresse résolue interdite, une redirection ou une réponse trop volumineuse est refusée et tracée.
- ✅ Une mutation d'administration non authentifiée est refusée (401).

## 8. Décisions de cadrage (2026-10-30)

| Sujet | Décision | Trace |
|---|---|---|
| Rôles et méthode | Claude code, configure et teste ; l'utilisateur décide, comprend via `communication/`, teste ; bilans courts | CLAUDE.md |
| Langage | TypeScript partout ; Python seulement avec un bénéfice concret | ADR 0001 (début P1) |
| Site et API | Next.js 16, React 19 | ADR 0001 |
| Worker | scripts exécutés directement par Node 24 (retrait natif des types) | ADR 0001 |
| Base de données | SQLite via `@libsql/client` en local, Turso en ligne (même code) ; Drizzle ORM ; migrations SQL versionnées | ADR 0002 (début P1) |
| Planification | GitHub Actions : planification et lancement manuel | ADR en P5 |
| Hébergement visé | Vercel Hobby (site) + GitHub Actions (worker) + Turso Free (base) : 0 € dans les quotas gratuits | ADR en P5, tarifs revérifiés |
| IA | SDK officiel Anthropic, sorties structurées ; modèle choisi en P3 sur mesures réelles | ADR en P3 |
| Source de P1 | API REST GitHub « List releases » du dépôt `anthropics/claude-code` | ROADMAP.md, P1 |
| Domaine | personnalisé, acheté au déploiement de la V1 après validation ; recommandation `.fr` chez OVHcloud | P5 |

## 9. Budget et dépenses

- **Aujourd'hui** : 0 € de dépense supplémentaire ; travail en local.
- **IA** : d'après la documentation officielle (consultée le 2026-10-30), l'abonnement Claude Max 5x inclut 100 $ de crédits API par mois ; ils expirent à chaque cycle. Quand ils sont épuisés, les appels s'arrêtent sans facturation, tant qu'aucun crédit n'est acheté et que la recharge automatique reste désactivée. Disponibilité sur le compte à confirmer à l'activation (déploiement progressif annoncé le 2026-10-07 ; 7 jours d'ancienneté sur le plan requis). Activation en P3 avec l'accord explicite de l'utilisateur. Estimation à remplacer par des mesures en P3 : de 0,3 $ à 56 $ par mois pour 1 à 5 publications par jour selon le modèle, soit sous les crédits annoncés.
- **Hébergement** : offres gratuites visées ; toute offre payante (par exemple Vercel Pro, 20 $ par mois hors taxes, nécessaire pour rester sur Vercel si l'usage devenait commercial) est soumise à validation.
- **Domaine** : achat et renouvellement annuel acceptés sur le principe, validés au moment de l'achat (repère relevé le 2026-10-30 : `.fr` chez OVHcloud, 5,99 € TTC la 1re année puis 9,35 € TTC par an).
- Aucune dépense, création de compte ni activation de crédits sans accord explicite. **Aucun montant de budget n'est encore validé** (§11).

## 10. Indicateurs de réussite

- **Démonstration V1** réussie si, sur l'instance déployée : une exécution planifiée réelle a produit au moins une publication sourcée ; chaque citation de cette publication se retrouve mot pour mot dans une capture stockée ; la trace de l'exécution est consultable depuis la publication ; une relance ne crée aucun doublon ; la dépense réelle reste dans le budget validé par l'utilisateur.
- **Tests obligatoires** (fixtures reproductibles, séparés des essais réels documentés) : même annonce collectée deux fois, deux jobs simultanés, source indisponible, contenu contradictoire, sortie de modèle invalide, dépassement de budget, timeout après écriture.
- **Évaluation éditoriale** (P6, valeurs proposées à valider) : corpus figé de 20 annonces réelles et 10 contre-exemples (rumeur, republication, hors périmètre) étiquetés par l'utilisateur ; critères binaires de fidélité (aucune affirmation non soutenue), nouveauté et attribution ; seuil : 0 affirmation non soutenue publiée et au moins 9 contre-exemples sur 10 rejetés. Pas de score de confiance arbitraire.

## 11. Questions ouvertes

| Question | Qui tranche | Bloquante | Échéance |
|---|---|---|---|
| Découpage V1 / après V1 et feuille de route (ROADMAP.md) | utilisateur | oui, pour P2 et suivants | maintenant |
| Budget mensuel plafond (IA, hébergement, domaine) et plafond de coût par exécution | utilisateur | oui, avant les premiers appels réels | avant P3 |
| Modèle(s) Claude pour qualifier, rédiger et vérifier | utilisateur, sur mesures | non | P3 |
| Sources supplémentaires de la V1 (autres dépôts officiels, flux d'annonces de modèles et d'applications) | utilisateur, sur proposition | non | P2 |
| Estimation de durée jusqu'à la V1, avec hypothèses | Claude, présentée à l'utilisateur | non | fin de P1 |
| Fichier source de la mascotte (dans `assets/brand/`) et confirmation des droits d'usage | utilisateur | non | avant P2 |
| Dépôt GitHub public ou privé (vitrine vs désactivation des tâches planifiées après 60 jours sans activité en public) | utilisateur | non | P5 |
| Nom du produit et du domaine | utilisateur | non | avant le déploiement de la V1 (P5) |
| Obligations de confidentialité (RGPD ; droit israélien) pour les comptes et la newsletter | à vérifier sur sources officielles | non | avant P8 |
| ~~Compatibilité des outils avec TypeScript 7~~ | résolu en P1 : compatible, TypeScript 7 conservé | — | — |
| ~~Écritures concurrentes de deux processus via `@libsql/client`~~ | résolu en P1 : fiable sans WAL, avec réouverture des connexions après verrou (ADR 0002) | — | — |
