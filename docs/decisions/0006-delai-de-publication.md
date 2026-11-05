# ADR-0006 : viser une publication dans la minute

> **Décision de l'utilisateur du 2026-11-04** : le dépôt reste **privé**, le cycle passe **à une heure** (cron `7 * * * *`). Raison : en privé, GitHub Actions offre environ 2 000 minutes par mois ; un cycle estimé à 2,5 minutes (installation comprise, arrondie à la minute, estimation non mesurée) consommerait environ 21 000 minutes par mois toutes les 5 minutes, 3 600 toutes les 30 minutes et 1 800 toutes les heures. Si l'heure ne suffit pas, l'utilisateur passera le dépôt en public et le cycle à 5 minutes. La durée réelle d'un cycle sera mesurée au premier lancement.
>
> **Décision de l'utilisateur du 2026-11-03** : « Actions, 5 minutes ». Le cycle tourne sur **GitHub Actions, avec un cron toutes les 5 minutes**. Le processus permanent (point 3 ci-dessous) n'est pas retenu, et la proposition des deux rythmes (point 4) est remplacée par l'intervalle propre à chaque source, appliqué par `npm run lancer`.
>
> **Ce que ce choix change pour l'objectif d'une minute**, dit sans détour :
>
> - L'objectif d'une publication dans la minute n'est **pas atteignable** avec ce choix. 5 minutes est l'intervalle minimal d'un cron GitHub (documentation officielle, consultée le 2026-11-03).
> - **GitHub ne garantit pas l'heure de déclenchement d'un cron.** Les exécutions planifiées peuvent être retardées aux périodes chargées, surtout en début d'heure, et certaines peuvent être abandonnées ([événements déclencheurs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)). Le workflow tourne donc aux minutes 2, 7, …, 57, qui évitent le début d'heure.
> - Le délai attendu entre la détection d'une sortie et sa publication est donc d'**au moins 5 minutes, souvent davantage**, sans borne garantie. S'y ajoute l'intervalle de chaque source : 60 à 360 minutes pour les flux actuels, que la chaîne respecte pour ne pas surcharger les sites interrogés.
> - Aucun délai ne sera annoncé avant d'avoir été mesuré de bout en bout sur de vraies publications (`npm run delais`).
> - L'objectif reste inscrit (SPEC §7.4) : y revenir demanderait le processus permanent étudié plus bas, soit 2 à 5 $ par mois.
>
> **Construit le 2026-11-03, en local, sans rien déployer** :
>
> - workflow `.github/workflows/chaine.yml` : cron `2-59/5 * * * *` et lancement manuel. Un seul cycle à la fois (`concurrency`). Le workflow reste désactivé tant que la variable de dépôt `CHAINE_ACTIVE` ne vaut pas `oui`, et les secrets ne sont lus que depuis les secrets du dépôt ;
> - plafonds : 0,05 $ par exécution, un plafond par jour (`CURATION_PLAFOND_JOUR_USD`) et un plafond total, tous deux fixés par l'utilisateur. Sans eux, les étapes payantes sont sautées ;
> - `npm run lancer` enchaîne collecte, approfondissement (une fois par heure au plus), brouillons, contrôles, planification, traduction et publication.
>
> **Risque connu** : les releases GitHub sont lues sans jeton, ce qui limite à 60 requêtes par heure et par adresse IP. Sur des runners partagés, des refus sont possibles. Un jeton sera à ajouter si les cycles en relèvent.

> **Mise à jour du 2026-11-01** : objectif révisé à 5 minutes, puis **rétabli à la minute le 2026-11-02** pour les nouveautés prioritaires, dans le plafond de 20 publications par jour. Le présent ADR reste valable.

**Statut :** acceptée le 2026-11-03 — hébergement du cycle tranché par l'utilisateur : GitHub Actions, toutes les 5 minutes (voir la décision du 2026-11-03 ci-dessous)
**Date :** 2026-10-31
**Décideurs :** l'utilisateur (objectif, hébergement, dépense) ; Claude (mesures, proposition)

## Contexte

L'utilisateur vise une publication automatique dans la minute suivant une sortie, quand la source et les contrôles le permettent, sans annoncer de rapidité non démontrée. La pertinence et la vérification passent avant. La feuille de route prévoyait GitHub Actions, dont l'intervalle minimal est de 5 minutes, avec retards et abandons possibles ([page officielle](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).

Aucune de nos sources ne pousse ses nouveautés : 0 hub WebSub sur nos flux, aucun webhook possible sur un dépôt tiers. Il faut donc interroger. Mesures et limites : [docs/delais.md](../delais.md).

## Décision

Décidé et construit :

1. **Mesurer séparément** détection et préparation (`npm run sonde`, `npm run delais`). Une date imprécise ou postérieure à la vue ne produit aucun délai. Une valeur absente reste « non mesuré ».
2. **Requêtes conditionnelles** : `safeGet` accepte un 304, seulement en réponse à une requête conditionnelle.

Proposé, non construit :

3. **Un petit processus permanent** plutôt qu'une tâche planifiée, seul moyen de descendre sous 60 s avec un rythme maîtrisé. Fly.io à 2,19 $ pour 30 jours, ou OVH à 4,49 € HT par mois.
4. **Deux rythmes** : 60 s pour les sources favorables (texte complet, date précise, ETag utile, jeton GitHub), 15 minutes pour les autres. Ce choix allège la charge sur 20 hôtes tiers, dont aucun n'a fixé de fréquence acceptable.
5. **Lecture de l'article complet** pour les sources à titre seul, après lecture de leurs conditions. Sans elle, les annonces majeures restent en `approfondir`.

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| GitHub Actions seul | gratuit, déjà prévu | 5 minutes au mieux, retards non bornés | garder comme repli |
| Déclencheur externe chaque minute vers une fonction | gratuit | service tiers non garanti, combinaison non testée, durée limitée | non |
| Cloudflare Workers | gratuit à la minute | 10 ms de CPU, connexion à l'adresse validée non établie | non |
| Vercel Pro | intégré au site | 20 $ par mois | non |
| Processus permanent | cycle maîtrisé, sonde et rendu au même endroit | serveur à payer et à surveiller | **proposé** |

## Compromis

- Un cycle de 60 s ajoute 30 s en moyenne avant tout traitement : « dans la minute » reste une tendance, pas une garantie.
- Interroger chaque minute coûte de la bande passante, surtout sur 8 flux sans validateur, et sollicite des sites tiers. La sonde a reçu 277 Mo en 91 minutes.
- Une source ne publie pas toujours à la date qu'elle écrit : le délai perçu dépend aussi d'elle.

## Conséquences

- ROADMAP P5 change si cette option est retenue, ainsi que le budget mensuel (2 à 5 de plus).
- Un jeton GitHub sera nécessaire, créé par l'utilisateur.
- Avant d'annoncer un délai, il faudra plusieurs jours de sonde sur la machine retenue et un premier lot réel.

## Mise à jour du 2026-11-05 : le cron actuel ne convient pas (mesuré)

**Mesures** (cap « réseau social vivant », SPEC §0 ; `npm run delais`) :

- Cron `7 * * * *` de `chaine.yml`, actif depuis le 2026-11-04 : **6 exécutions planifiées en environ 25 h** sur la page Actions du dépôt (dont 3 sautées en 1 à 7 s), au lieu d'environ 25. Les cycles qui tournent durent 3 à 10 min.
- Nouveautés annoncées après le premier cycle en ligne (2026-11-04 18:52 UTC) : 41 actualités, 6 publiées, **4 mesurables** (date à la minute). Détection : médiane 2,5 h (90e centile 21 h). Traitement : médiane 58 s (90e centile 14 min). Disponibilité : médiane 11 min (90e centile 15,6 h). Bout en bout : médiane 3,5 h ; 1 sur 4 sous une heure. Effectif trop faible pour une promesse, mais l'ordre de grandeur est net : la détection, donc la fréquence des cycles, domine.
- Minutes GitHub Actions de novembre (page de facturation, 2026-11-05) : 0,83 $ brut, 0 $ facturé, dans les 2 000 minutes gratuites d'un compte GitHub Free pour un dépôt privé. Un cycle vraiment horaire de 6 à 10 min dépasserait ce quota (environ 4 300 à 7 200 min par mois).

**Décision** : le cron actuel ne suffit ni pour la rapidité ni pour la régularité. Chaque cycle est désormais tracé en base (`run` de type `cycle`, `run_step` par étape) pour suivre la cadence réelle. Le changement d'hébergement engage une dépense ou la visibilité du code : il est soumis à l'utilisateur. Options :

| Option | Effet attendu | Coût | Réserve |
|---|---|---|---|
| A. Dépôt public | minutes Actions gratuites sans quota ; cycle de détection court toutes les 15 min possible | 0 $ | le code devient lisible par tous (aucun secret n'y est, règle déjà appliquée) ; les déclenchements planifiés restent « au mieux » chez GitHub |
| B. Déclencheur externe fiable (par exemple Cloudflare Workers, déclencheurs planifiés de l'offre gratuite) qui lance `workflow_dispatch` | horaire tenu | 0 $ (offre gratuite, à revérifier) + minutes Actions | compte à créer, jeton GitHub à déposer par l'utilisateur ; quota de minutes inchangé |
| C. Petit processus permanent (option d'origine de cet ADR) | cycle de 60 s possible | environ 2 à 5 $ par mois (estimation du 2026-10-31, à revérifier) | compte et hébergement à créer |

Recommandation : A, puis séparer un cycle court de détection (collecte seule) du cycle complet ; C seulement si la minute devient un objectif mesuré.
