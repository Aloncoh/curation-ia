# ADR-0007 : montages graphiques rendus par le code

**Statut :** Proposée, à valider sur le rendu des exemples
**Date :** 2026-10-31
**Décideurs :** l'utilisateur (intention visuelle) ; Claude (moteur de rendu)

## Contexte

L'utilisateur veut des visuels travaillés : photos et captures mises en page, détourage, composition, annotations, aperçu de l'outil et texte court, sans vidéo systématique. La V1 impose des médias générés par le code, sans texte nouveau, et une photo ou une capture seulement si ses droits sont vérifiés.

## Décision

1. **Sept gabarits**, dont deux sans média d'éditeur, en HTML et CSS, rendus en image fixe 1080 × 1350 par Chromium piloté avec `playwright-core`. Détail : [docs/visuels.md](../visuels.md).
2. **Le choix de la composition est du code** (`composerMontage`) : image autorisée si elle existe, sinon fiches tirées des repères cités. Aucun modèle, aucun jeton.
3. **Nouveau champ `reperes`** dans le brouillon : trois textes courts et cités, contrôlés comme les autres champs, repris par les annotations. Un premier lot payant n'aura pas à être refait pour le visuel.
4. **Contrôle de la mise en page réelle** après rendu : texte qui déborde, étiquettes qui se chevauchent, fiches hors zone, image illisible ou détourage posé sur le titre refusent l'image, et retirent celle d'une exécution précédente.
5. **Rendu fermé** : polices et images embarquées, toute requête réseau bloquée.

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| Satori et resvg | léger, sans navigateur | CSS partiel, police variable figée à son instance par défaut, resvg-js stable de 2024 sans WEBP | non |
| Chromium avec Playwright | tout le CSS, mêmes polices variables que le site | environ 281 Mo sur le serveur | **oui** |
| Modèle d'image | visuel riche | coût, visuels trompeurs, exclu par SPEC §5 | non |
| Canva ou Figma par API | outils riches | compte, dépendance, texte hors contrôle | non |

## Compromis

Chromium pèse sur le serveur de rendu et rend le service moins léger. La fidélité typographique et la composition libre valent ce poids, tant que le rendu reste dans le processus permanent ou dans une tâche planifiée.

## Conséquences

- Dépendances ajoutées : `playwright-core`, Recursive et Atkinson Hyperlegible Next en local (OFL).
- Mesuré le 2026-10-31 sur 8 images, deux passes : 330 et 410 ms médians, 604 ms au maximum, 205 Ko en JPEG.
- Une capture d'éditeur n'est utilisée qu'après lecture de ses conditions. Le gabarit `fiches` reste le cas par défaut.
