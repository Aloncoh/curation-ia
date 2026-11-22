# ADR-0019 : lire moins de lignes dans la chaîne, sans migration

**Statut :** acceptée (accord de l'utilisateur du 2026-11-19 : « Oui, corrige », pour les trois requêtes qui ne demandent aucune migration)
**Date :** 2026-11-19
**Décideurs :** l'utilisateur (accord, offre Turso), Claude (réalisation)

## Contexte

Le 2026-11-19, Turso a bloqué les lectures de la base en ligne : le quota de l'offre gratuite (500 millions de lignes lues par mois calendaire) a été atteint en moins de 19 jours. L'utilisateur a choisi d'attendre plutôt que de payer. La mesure sur la base locale ([docs/lectures-turso.md](../lectures-turso.md)) désigne la chaîne, pas le site : trois requêtes relisaient une table entière pour chaque ligne d'une autre, ou toute la file à chaque cycle.

Contrainte : une migration de la base en ligne demande l'accord de l'utilisateur, et la base est illisible. Seul le code peut changer pour l'instant.

## Décision

1. **Pages à capturer (`approfondir`).** Les pages refusées depuis moins de 24 heures sont lues une fois, puis écartées en mémoire, au lieu d'une sous-requête sur `run` par actualité. Le brouillon est lu avant les documents.
2. **Regroupement à la collecte (`link.ts`).** Les annonces des 3 derniers jours sont lues une fois par passage de collecte et gardées en mémoire. Les annonces créées pendant le passage y sont ajoutées **après validation de leur transaction**. La mémoire est relue en base au bout de 5 minutes.
3. **File de la rédaction (`pipeline.ts`).** La file ne lit plus les captures : elle donne l'ordre et l'état des actualités en attente. Le texte est lu ensuite pour le seul lot examiné ; pour les titres proposés au tri, seules la longueur et les captures courtes sont lues.

## Options envisagées

### Option A : réécrire les requêtes, sans toucher à la base (retenue)

| Dimension | Évaluation |
|---|---|
| Complexité | moyenne : une mémoire à tenir juste, une file en deux temps |
| Coût | aucun |
| Gain mesuré en local | pages à capturer : 313 469 → 2 660 lignes ; regroupement : 2 002 par document → 1 181 par passage ; file : 10 623 → 2 569 lignes, sans texte |
| Limite | la file et le regroupement parcourent encore `news_item` en entier |

### Option B : ajouter des index (`llm_call(news_item_id)`, `news_item(first_seen_at)`, `run(kind, status, started_at)`, `post_draft(status)`)

| Dimension | Évaluation |
|---|---|
| Complexité | faible |
| Coût | une migration de la base en ligne, donc un accord ; impossible tant que la base est bloquée |
| Gain | borne les parcours restants ; règle aussi les relances et la commande `delais` |

**Reportée**, pas écartée : elle complète l'option A.

### Option C : passer à l'offre payante sans rien corriger

Écartée par l'utilisateur (« Non, on attend »). Elle aurait aussi laissé grossir le même défaut.

## Compromis

- **Mémoire du regroupement.** Une annonce écrite par un autre processus pendant un passage n'est vue qu'au bout de 5 minutes au plus : deux actualités pourraient naître pour un même sujet au lieu d'une. Le risque est faible (la chaîne n'a qu'une collecte à la fois) et borné par le délai. Une transaction annulée ne laisse rien en mémoire : ses annonces n'y entrent qu'après validation.
- **File en deux temps.** Les compteurs « sans texte » et « trop longues » du bilan portent désormais sur les captures lues pour remplir le lot, plus sur toute la file. Le tri peut proposer un titre dont la capture longue n'a presque pas de mots ; le contrôle exact reste fait avant tout appel payant, comme avant.
- **Cache du site.** Une nouveauté paraît sur le site avec 60 secondes de retard au plus. La première vue d'une page coûte autant qu'avant ; seules les suivantes sont épargnées.
- **Pages refusées.** La comparaison d'adresse est exacte ; elle était approximative (`like`).

## Conséquences

- Le choix des pages à capturer et le regroupement ne grossissent plus comme le produit de deux tables.
- La file reste proportionnelle au nombre d'actualités : l'option B reste nécessaire pour la borner.
- À revoir à la réouverture de la base : le tableau d'usage Turso, seul à donner les montants réels.

## Actions

1. [x] Réécrire les trois requêtes, tests et mesure avant/après.
2. [ ] Index (option B) : accord de l'utilisateur, puis migration.
3. [x] Boucle de recapture (2026-11-20) : la collecte compare le contenu reçu à la dernière capture venue de la source, pas à la page lue par `approfondir` (docs/lectures-turso.md, section 5).
4. [x] Cache des lectures du site (2026-11-20) : 60 secondes par mode, langue et paramètres (`apps/web/lib/lectures.ts`) ; une nouveauté paraît avec ce retard au plus, réglable par `CURATION_SITE_CACHE_S`.
