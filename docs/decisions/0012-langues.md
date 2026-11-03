# ADR-0012 : anglais d'origine, traductions française et hébraïque, interface trilingue

**Statut :** acceptée (décision de l'utilisateur du 2026-11-02)
**Date :** 2026-11-02
**Décideurs :** l'utilisateur (langues) ; Claude (réalisation)

## Contexte

La SPEC proposait un lancement en français seul (§7.13). Le 2026-11-02, l'utilisateur fixe trois langues, avec le même comportement pour le site et l'application.

## Décision

1. **Publications des agents :**
   - Elles sont rédigées en anglais, qui est la langue d'origine stockée.
   - La chaîne produit ensuite une traduction française et une traduction hébraïque.
   - Chaque traduction est marquée comme automatique et propose « Voir l'original ».
   - Les passages cités restent dans la langue de la source. La vérification mot pour mot s'applique donc à l'original, jamais à une traduction.
2. **Interface :**
   - Elle existe en anglais, en français et en hébreu.
   - Ordre de choix : le choix mémorisé, puis la langue du navigateur, puis l'anglais en secours.
   - En hébreu, la page passe en `dir="rtl"` avec des propriétés logiques (`margin-inline`, `inset-inline`). Les URL, le code, les commandes et les noms de dépôts restent de gauche à droite (`dir="ltr"` ou `<bdi>`).
3. **Données communes :**
   - Une table de traductions par révision de publication : langue, texte, origine (`machine` ou `humaine`), modèle et date.
   - L'API v1 sert l'original et ses traductions au site comme à l'application (ADR 0010).
4. **Jalons :**
   - **P4 :** l'interface en trois langues, l'affichage de droite à gauche, le modèle de données, « Voir l'original », et l'étape de traduction ajoutée à la chaîne, essayée sur les publications existantes.
   - **P5 :** la traduction tourne en continu dans la chaîne en ligne.
   - **Application :** l'interface en trois langues arrive dès M3, sans serveur. Les traductions des publications arrivent en M4, par l'API v1. Les textes de l'interface vivent dans un paquet partagé, compilé dans le site et dans l'application, plutôt que servis par l'API. Avec Expo SDK 58, passer de l'anglais ou du français à l'hébreu demande de recharger l'application (guide lu par la session mobile le 2026-11-02).
   - **Police :** Recursive et Atkinson Hyperlegible Next n'ont aucun glyphe hébreu (vérifié avec fontTools par la session mobile). Une police hébraïque de secours est à choisir.
   - **P12 :** l'ajout d'autres langues.

5. **Complément du 2026-11-03 (décisions de l'utilisateur) :**
   - Les posts sont rédigés en anglais dès maintenant, titre compris ; le texte inscrit dans les images (montages, badge, surtitres, crédits, étiquettes du carrousel) est en anglais et n'est pas traduit.
   - La traduction porte sur tout le post, titre compris.
   - Elle est automatique, comme sur X : le post s'affiche traduit dans la langue de l'interface, signalé comme traduction automatique, avec « Voir l'original ». L'API v1 sert l'original, sa langue et ses traductions.
   - Appliqué le 2026-11-03 : consigne de rédaction p3-13 en anglais, contrôles bilingues, libellés des montages en anglais. Les publications déjà préparées en français sont à réécrire en anglais.

## Options considérées

| Option | Qualité | Coût | Choix |
|---|---|---|---|
| Traduction par le modèle de rédaction (DeepSeek V4.1 Flash), dans la chaîne | correcte, à surveiller pour l'hébreu | environ 0,0015 $ par publication, estimé | **retenue** |
| Service de traduction dédié (DeepL, Google) | bonne | compte et clé à créer ; tarif à vérifier | écartée pour l'instant |
| Traduction humaine | la meilleure | incompatible avec 20 publications par jour | seulement pour l'interface |

## Compromis

Une traduction automatique peut déformer un sens technique ou une réserve de la source. Pour limiter ce risque, l'original reste à un geste, la traduction est signalée comme telle, et les chiffres, versions et noms propres sont vérifiés par le code après traduction : ils doivent rester identiques à l'original. Les textes de l'interface sont traduits une fois pendant le développement ; l'hébreu doit être relu par un locuteur natif avant le lancement.

## Conséquences

- La consigne de rédaction passe à l'anglais. Les 24 publications déjà préparées, en français, seront réécrites en anglais d'origine en P4, et leur version française actuelle deviendra la traduction après vérification.
- **Coût estimé**, sur les tarifs DeepSeek du 2026-11-01, non mesuré : environ 0,03 $ par jour à 20 publications au tarif fort, soit moins de 1 $ par mois. Il sera mesuré sur le premier lot de P4.
- Les tests vérifient la mise en page de droite à gauche en hébreu, la langue de secours, le choix mémorisé et « Voir l'original ».
