# ADR-0010 : un serveur partagé, un site installable d'abord, une application native ensuite

**Statut :** acceptée par l'utilisateur le 2026-11-02
**Date :** 2026-11-02
**Décideurs :** l'utilisateur (dépenses de comptes développeur, calendrier) ; Claude (architecture)

## Contexte

L'utilisateur veut un site et une application Android/iPhone partageant les mêmes comptes, publications, recherches et interactions (demande du 2026-11-02 ; l'objectif n'était écrit dans aucun document du dépôt). Aujourd'hui : collecte, sélection et brouillons en scripts Node ; maquette statique ; site Next.js prévu en P4 ; comptes humains en P9.

Exigences relevées dans les documentations officielles le 2026-11-02 (une partie par extraits de recherche, à relire avant toute inscription) :

- **Apple** : programme développeur à 99 USD par an ; TestFlight, avec jusqu'à 10 000 testeurs externes après une revue bêta ; SDK iOS 26 exigé. Plusieurs règles de l'App Review comptent ici :
  - 4.2 refuse un site simplement emballé et les simples agrégateurs de contenu ;
  - 1.2 exige, pour le contenu généré par les utilisateurs ou par IA, un filtrage, le signalement, le blocage et un contact publié ;
  - 5.1.1(v) impose la suppression du compte depuis l'application ;
  - 5.1.2(i) exige le consentement avant tout partage de données personnelles avec une IA tierce ;
  - 4.8 impose une connexion équivalente si une connexion sociale est proposée.
  ([guidelines](https://developer.apple.com/app-store/review/guidelines/), [exigences](https://developer.apple.com/news/upcoming-requirements/))
- **Google Play** : frais d'inscription de 25 USD, payés une fois, et vérification d'identité. Pour un compte personnel, un test fermé avec au moins 12 testeurs pendant 14 jours est exigé avant la mise en production. Android 16 (API 36) est la cible imposée. La politique sur le contenu des utilisateurs exige modération, signalement et blocage, et le contenu IA doit pouvoir être signalé. ([test](https://support.google.com/googleplay/android-developer/answer/14151465), [cible](https://developer.android.com/google/play/requirements/target-sdk), [UGC](https://support.google.com/googleplay/android-developer/answer/9876937))
- **Site installable (PWA)** : sur iOS 16.4 et plus, l'installation sur l'écran d'accueil et les notifications Web sont possibles sans compte développeur. Sur Android, une Trusted Web Activity permet aussi de publier sur Play. ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [TWA](https://developer.chrome.com/docs/android/trusted-web-activity))
- **Expo** : SDK 58 avec React Native 0.88, et un guide officiel pour les monorepos. EAS compile les applications iOS dans le cloud, sans Mac, avec 15 compilations gratuites par plateforme et par mois. ([SDK 58](https://expo.dev/changelog/sdk-58), [tarifs](https://expo.dev/pricing))

## Décision

1. **P4 : serveur partagé dès le site.** Toutes les lectures et toutes les futures mutations passent par une API JSON versionnée (`/api/v1`), validée par des schémas Zod partagés. Le site Next.js utilise les mêmes fonctions, sans accès direct propre à la base. Le site est **installable** : manifeste, icônes, mise en page pour téléphone, sans service payant.
2. **Application native après P9**, sous un nouveau jalon **P9 bis**. Elle sera développée avec Expo et React Native, dans un monorepo qui partage les types, les schémas et le client de l'API. Elle n'aura de sens qu'avec des comptes, des interactions et la modération, que demandent Apple et Google. Une application qui se contenterait d'afficher le fil serait exposée au refus 4.2.
3. **Aucune inscription chez Apple ou Google** sans l'accord de l'utilisateur : 99 USD par an et 25 USD une fois, à décider avant P9 bis.

## Options considérées

| Option | Expérience | Réutilisation | Maintenance | Coût |
|---|---|---|---|---|
| A. Site installable seul | correcte ; notifications iOS limitées à l'écran d'accueil | totale | une seule base | 0 € |
| B. Expo / React Native dès P4 | native | API et types partagés ; écrans à refaire | deux interfaces | 124 USD la première année, plus EAS si le gratuit ne suffit pas |
| C. Site emballé (Capacitor ou TWA) | proche du site | totale | faible | mêmes frais ; risque de refus 4.2 sur iOS |
| **Retenue : A en P4, puis B en P9 bis** | progressive | API commune dès P4 | deuxième interface seulement quand elle est utile | 0 € jusqu'à P9 bis |

## Compromis

Le site installable ne pourra pas proposer certaines fonctions natives : notifications fiables sans installation, partage système. En échange, la V1 n'est pas retardée et ne coûte rien. Choisir Expo plutôt qu'une deuxième interface Next.js impose de refaire les écrans, mais évite l'application « site emballé ».

## Conséquences

- P4 gagne une contrainte d'architecture : l'API versionnée et le manifeste. Ce n'est pas une fonction supplémentaire.
- Les obligations des magasins sont déjà prévues en P9 et P10 : suppression du compte, signalement, blocage, modération. Il faut aussi le consentement avant d'envoyer des données personnelles à un modèle d'IA (P9).
- À revérifier avant P9 bis : les tarifs, le SDK exigé, les règles et les obligations propres à la France et à Israël.
