# ADR-0005 : sélection par critères notés et retour humain

**Statut :** Acceptée
**Date :** 2026-10-31
**Décideurs :** l'utilisateur (critères, boucle de retour, pas de réentraînement) ; Claude (mise en œuvre)

## Contexte

La qualification de P3 répondait par `retenue` vrai ou faux, sans dire pourquoi. L'utilisateur demande de juger chaque sujet sur sa nouveauté réelle, son utilité concrète, son impact pour nos utilisateurs et la solidité de ses sources. La popularité, les étoiles GitHub ou le nom d'une grande entreprise ne suffisent pas. Il veut corriger des exemples, garder les motifs, vérifier sur d'autres exemples que la sélection progresse, et pouvoir expliquer chaque décision. La pertinence passe avant la vitesse. Pas de réentraînement à ce stade.

Sur les 393 actualités de la base, 57 % ont moins de 400 caractères de texte : beaucoup de sujets importants arrivent avec un simple titre.

## Décision

1. **Le modèle note, le code décide.** Quatre critères notés de 0 à 2, avec une raison et des passages cités. `publier`, `ecarter` ou `approfondir` se calcule dans `decisionDepuisNotes`, pour que le modèle ne puisse pas retenir un sujet que ses propres notes écartent.
2. **`approfondir`** est l'état des sujets prometteurs mal prouvés. Rien n'est rédigé et rien n'avance vers la publication.
3. **Les doutes descendent, ils ne remontent jamais** : passage introuvable, type non confirmé, opinion ou témoignage, motif de rejet donné malgré de bonnes notes, popularité invoquée dans une raison, compte absent font passer le sujet en `approfondir`. Ces garde-fous s'appliquent aussi à une qualification reprise et aux juges de développement.
4. **Consignes versionnées** dans `src/selection/consignes.ts`. Une version ne change jamais. Chaque résultat garde sa version.
5. **Une correction reste un avis.** `selection_avis` garde la décision humaine, le motif et sa portée (`cas_particulier` par défaut, `a_confirmer`, `regle_proposee`). Aucun code ne transforme un avis en règle : il faut une nouvelle version, relue, qui cite les avis dont elle vient. Une version existante ne change jamais : une empreinte de son texte est figée par un test.
6. **Deux jeux figés** par tirage reproductible, source par source : 24 sujets de développement et 36 d'évaluation, chacun avec sa capture. Le second ne sert jamais à écrire les consignes : ses corrections sortent de la matière à relire. Un nouveau tirage est refusé.
7. **Une version n'est dite meilleure que sur preuve** : comparaison appariée sur les mêmes sujets, avec des avis déclarés à l'aveugle, test du signe exact. Une version qui crée une publication à tort sur un sujet est refusée quel que soit son score, même si une autre disparaît.
8. **Filtre sans modèle** : une entrée de plus de 14 jours à sa première vue vient de l'historique d'un flux, elle est écartée sans appel (valeur proposée).

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| Décision directe du modèle | simple | incohérences entre notes et décision, explication fragile | non |
| Score pondéré à seuil | continu | fausse précision, seuil difficile à expliquer | non |
| Notes et règle écrite | explicable, testable | frontières discrètes | **oui** |
| Réentraînement ou réglage fin | potentiel à long terme | coûteux, trop peu d'exemples | exclu par l'utilisateur |
| Toute correction devient une règle | rapide | surapprentissage sur un cas | exclu par l'utilisateur |

## Compromis

- Notes grossières : un point fait basculer un sujet. Les trois juges de développement se partagent sur 3 à 8 sujets selon le jeu.
- Sur 60 sujets, seul un écart important se distingue du hasard : une amélioration réelle mais faible restera « non démontrée ».
- Les juges de développement sont des agents Claude Code, pas le moteur du site. Leur accord prouve une stabilité, pas une justesse.

## Conséquences

- `post_draft` gagne le statut `a_approfondir` ; `selection_decision` conserve critères et passages de chaque sujet, retenu ou non. Une requalification ajoute une ligne et marque l'ancienne comme remplacée : un humain a pu la voir.
- `npm run selection -- expliquer <actualité>` dit pourquoi un sujet a été retenu ou non.
- La rédaction n'est plus payée pour un sujet douteux.
- La qualification coûte environ 200 tokens de sortie, mesurés sur 180 jugements.
- Un sujet à approfondir repasse dès qu'une nouvelle capture arrive. Reste à construire la lecture de l'article complet : sans elle, un sujet à titre seul ne quitte pas `approfondir`.
- Le corpus reprend tous les sujets, alors que le moteur laisse de côté les textes de moins de trois mots (8 sujets sur 60) et, pour un sujet réel, les entrées anciennes à leur première vue. Évaluer le moteur lui-même sur ce corpus demandera une commande dédiée après validation du budget.

## Complément du 2026-11-01

L'utilisateur distingue deux usages : rester informé et trouver des ressources pour construire (SPEC §3.5). Cette décision reste valable pour le premier. Pour le second, elle ne s'applique pas telle quelle :

- **Filtre de 14 jours** : il vise les entrées d'un flux d'actualités. Il ne s'applique pas aux découvertes, qui peuvent être anciennes et toujours pertinentes.
- **Critère de nouveauté** : une ressource ancienne aurait 0 et serait écartée. Les découvertes auront leur grille, `d1`, en P6 : utilité, documentation, maintenance, licence, limites. Le code continue de décider, et les consignes `s1` et `s2` ne changent pas.
- **Étoiles** : la règle tient. Elles ne comptent jamais dans une note, et une raison qui s'y appuie bloque la publication. Le seuil configurable demandé par l'utilisateur agit avant, à l'entrée de la découverte automatique de dépôts, et ne s'applique pas à une annonce officielle.
- **Évaluation** : le corpus figé ne couvre que le premier usage. Vérifié le 2026-11-01 : 54 annonces, 6 versions, aucune ressource découverte. Un jeu « construire » sera figé en P6, et une liste témoin de bonnes découvertes mesurera ce que la collecte et la sélection manquent.
