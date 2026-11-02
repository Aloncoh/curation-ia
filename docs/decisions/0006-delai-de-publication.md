# ADR-0006 : viser une publication dans la minute

> **Mise à jour du 2026-11-01** : objectif révisé à 5 minutes, puis **rétabli à la minute le 2026-11-02** pour les nouveautés prioritaires, dans le plafond de 20 publications par jour. Le présent ADR reste valable.

**Statut :** Proposée, décision de l'utilisateur attendue sur l'hébergement
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
