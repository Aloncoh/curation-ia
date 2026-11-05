# ADR-0014 : regroupement multi-sources à la collecte, par les titres et sans IA

**Statut :** acceptée (décision de réalisation de Claude, P6, bloc 1 du plan validé le 2026-11-05)
**Date :** 2026-11-05
**Décideurs :** Claude ; l'utilisateur a validé le plan de P6 (« Oui, lance P6 »)

## Contexte

Depuis le 2026-11-05, Radar lit des communiqués officiels, plus des rubriques de presse par entreprise (TechCrunch, The Verge). Une même annonce peut donc arriver par plusieurs sources. Une seconde actualité coûte une seconde rédaction et peut produire un second post. Le seul garde-fou existant (`doublon_possible`, P5) agit à la publication, une fois la dépense faite, avec un seuil strict (Jaccard ≥ 0,8 sur les titres).

Le schéma prévoit déjà qu'un document renforce une actualité (`news_item_document.role = 'supporting'`), et le pipeline lit déjà ces captures secondaires (`autresCaptures`, contrôle `sources_contradictoires`).

## Décision

À la collecte, une annonce qui traite le même sujet qu'une annonce récente d'une **autre** source la renforce (rôle `supporting`) au lieu de créer une actualité. Règle (`src/catalog/regroupement.ts`) :

- annonces vues pour la première fois dans les 3 jours ;
- au moins 3 mots significatifs en commun (normalisés, sans mots vides ni mots génériques de presse ou de communiqué financier), couvrant au moins 60 % du titre le plus court ;
- si les deux titres nomment des entreprises de la liste suivie, ce doivent être les mêmes.

Les documents qui renforcent une actualité s'ajoutent aux sources affichées du post (API v1), sans passage cité.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| **Titres, règle déterministe** (retenue) | 0 €, testable, explicable | ne voit pas deux titres très différents sur le même sujet |
| Similarité par le modèle | comprend les reformulations | coût à chaque document, non vérifiable par le code, contraire au principe « pas de vérification par le seul modèle » |
| Plongements vectoriels | robuste aux reformulations | nouvelle dépendance (base vectorielle exclue sans besoin démontré) |

## Mesure avant décision (base locale, 754 annonces, 2026-11-05)

- Première règle (recouvrement seul) : 35 paires, dont 32 fausses : des communiqués financiers d'entreprises différentes (« AMD Reports Third Quarter… » et « Intel Reports Third-Quarter… »).
- Règle retenue : 3 paires, toutes justes. FLUX.3 Klein (Hugging Face et Comfy), le même article TechCrunch rangé sous TSMC et sous Broadcom, la gamme maison d'Apple (TechCrunch et The Verge).

## Conséquences

- Moins de rédactions en double ; un post peut montrer plusieurs sources pour une même annonce.
- Un regroupement manqué reste rattrapé à la publication par `doublon_possible`. Un faux regroupement ferait disparaître un sujet : d'où une règle prudente. La liste des entreprises et celle des mots génériques sont à tenir à jour.
- Pas de rattrapage des actualités déjà créées avant ce changement.
- Les citations restent vérifiées sur la capture principale seulement.
