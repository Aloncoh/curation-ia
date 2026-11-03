# ADR-0013 : site Next.js en espaces de travail, API v1 dans `src/api`, traductions contrôlées par le code

**Statut :** acceptée (décision de réalisation de Claude, P4)
**Date :** 2026-11-03
**Décideurs :** Claude (architecture) ; l'utilisateur a fixé les principes dans les ADR 0010 et 0012

## Contexte

P4 doit livrer le site (fil, publication, profils, recherche), une API v1 partagée avec la future application (ADR 0010), l'interface en anglais, français et hébreu, et la traduction automatique des posts (ADR 0012). Le code de lecture existe déjà, écrit pour la maquette (`src/maquette/*.ts`, `src/recherche/`). Contraintes relevées le 2026-11-03 :

- Next.js 16.4.4 (publié le 2026-11-02, dernière version stable sur npm) et React 19.3.1 ; Turbopack par défaut.
- TypeScript 7.0.2, la version native du dépôt, n'expose plus l'API JavaScript dont `next build` se sert pour vérifier les types.
- Le code partagé importe ses fichiers avec l'extension `.ts`, exécutés directement par Node 24.

## Décision

1. **Espaces de travail npm** à la racine : `apps/web` (le site), `packages/contrat` (schémas Zod et types de l'API v1), `packages/textes` (catalogues en, fr, he et choix de la langue). Une seule installation, un seul `package-lock.json`.
2. **Les lectures de l'API vivent dans `src/api/v1`**, à côté du code qu'elles reprennent. Les routes `/api/v1/*` et les pages du site appellent les mêmes fonctions ; le site n'a aucune requête SQL propre. Chaque réponse est validée par le contrat avant l'envoi.
3. **Le site est lancé depuis la racine** (`npm run web:dev`, soit `next dev apps/web`) : la base `data/curation.db` et les montages de `maquette/medias` se lisent avec les mêmes chemins que les commandes. Les montages et les avatars sont servis par deux routes à liste fermée (`/medias/*`, `/marque/*`).
4. **Langue** : cookie `langue` (choix mémorisé, posé par une action serveur), puis `Accept-Language`, puis l'anglais. La langue est résolue côté serveur, donc la page arrive directement avec `lang` et `dir="rtl"` en hébreu, sans clignotement.
5. **Traductions** : table `post_traduction` (une ligne par révision et par langue : champs traduits, origine, modèle, version du prompt, appel tracé, statut, date). Étape `npm run traduire` : DeepSeek Flash, budget et `llm_call` (étape `traduction`) comme les brouillons. Le code contrôle chaque traduction : tous les champs présents, chiffres, versions, noms propres, code et adresses de l'original retrouvés tels quels, aucun nombre ajouté, de l'hébreu dans la version hébraïque. Une traduction en écart est gardée pour la trace, jamais servie.
6. **Types** : `next build` ne vérifie pas les types (`typescript.ignoreBuildErrors`) ; `npm run web:typecheck` (tsc 7 sur `apps/web`) les vérifie, avec `npm run typecheck` pour le reste.

## Options considérées

| Question | Option retenue | Écartée | Raison |
|---|---|---|---|
| Où placer l'API | `src/api/v1`, appelée par les routes | logique dans `apps/web` | les lectures de la maquette et la recherche restent au même endroit, testées sans Next.js |
| Langue mémorisée | cookie lu par le serveur | `localStorage` | rendu serveur dans la bonne langue et le bon sens dès le premier octet |
| Champs traduits | le texte affiché du post, titre compris | toute la révision | coût plus bas ; le texte des images, les passages cités et les noms restent d'origine |
| Contrôle des traductions | règles du code (invariants) | second appel au modèle | CLAUDE.md : une vérification ne repose jamais sur un second appel au même modèle |
| « Voir l'original » | bascule côté client, les deux textes servis ensemble | lien qui recharge la page | instantané, comme sur X, sans perdre la position dans le fil |

## Compromis

- Le contrôle des noms propres est une heuristique (majuscules, chiffres, code) : un mot courant capitalisé peut être exigé à tort, et un nom propre en début de phrase peut échapper au contrôle. Une erreur dans ce sens met la traduction en écart : l'original s'affiche, ce qui est sûr.
- Le site lancé depuis la racine dépend du dossier courant ; l'hébergement (P5) devra fournir la base Turso et les médias autrement.
- Le texte inscrit dans les montages et les carrousels reste en anglais (`lang="en"`) ; leur texte alternatif est traduit (complément ci-dessous).

## Conséquences

- La session mobile peut consommer `packages/contrat` et `packages/textes` (les fonctions de langue reprennent les siennes).
- P5 : traduction en continu dans la chaîne en ligne, base Turso, médias hébergés, vérification des types dans GitHub Actions.

## Complément du 2026-11-03 (fin de P4)

1. **Trois parties traduites, servies séparément** : le post, la fiche (clés `fiche.*`) et le texte alternatif d'une image (`media.alt`). Une partie n'est servie traduite que si tous ses champs sont traduits et qu'aucun n'est en écart. Un écart dans la fiche ne retire donc pas la traduction du post, et inversement. Les écarts sont enregistrés champ par champ (`post_traduction.ecarts`).
2. **Traduction par complément** : `npm run traduire` n'envoie au modèle que les champs absents d'une traduction existante, plus ceux en écart avec `--reprendre-ecarts`. Le contrôle porte ensuite sur l'ensemble fusionné.
3. **Fiche d'approfondissement** (`/p/:id/fiche`, `/api/v1/publications/:id/fiche`) :
   - sections rédigées de la révision courante ;
   - commande citée, gardée de gauche à droite, jamais traduite ;
   - licence d'une ressource, « Non renseigné » si elle est inconnue ;
   - état daté du dépôt ;
   - versions du produit suivi, par le lien `news_item_target` ou, à défaut, par le nom exact du produit ;
   - historique des révisions de la publication.
4. **Carrousels** : les diapositives stockées dans `media_asset` (forme `carrousel`) sont dessinées par le site. Elles défilent au doigt et par des boutons, et leur texte reste en anglais.
5. **Hébreu** : polices du système de l'appareil (`:lang(he)`), sans police hébraïque embarquée. C'est l'interprétation de la phrase de l'utilisateur du 2026-11-03 (« les écritures en hébreu en fonction du système ») ; elle remplace la proposition Rubik. Un bloc anglais ou français dans une page en hébreu garde la police du site.

**Limite constatée** : aucune des 32 publications planifiées n'est reliée à un produit suivi. Seuls Claude Code, Codex CLI et Gemini CLI ont des versions en base. La section « Versions du produit » est donc masquée pour toutes ; elle est testée sur une base fabriquée.
