# ADR-0009 : comparer Claude Haiku 5.5 et DeepSeek V4.1 Flash sur un lot réel

**Statut :** Proposée, lot réel attendu
**Date :** 2026-11-01
**Décideurs :** l'utilisateur (clés, paiements, fournisseur retenu) ; Claude (protocole, mise en œuvre)

## Contexte

Avant de valider Haiku pour P3, l'utilisateur veut comparer DeepSeek V4.1 Flash et Claude Haiku 5.5 sur un même petit lot réel, pour 1 $ au plus, tous modèles confondus, sans rien publier. Le moteur ne pouvait pas le faire : il n'appelle qu'Anthropic, chaque modèle n'aurait rédigé que ce qu'il retient, et tout s'écrivait dans `post_draft`.

**Relevé officiel du 2026-11-01**, en dollars par million de tokens :

| Modèle | Identifiant | Entrée | Lecture du cache | Écriture du cache | Sortie |
|---|---|---|---|---|---|
| Claude Haiku 5.5, jusqu'à 100 000 tokens d'entrée | `claude-haiku-5-5` | 0,10 | 0,01 | 0,125 | 0,50 |
| DeepSeek V4.1 Flash, heures creuses | `deepseek-flash` | 0,15 | 0,003 | automatique | 0,60 |
| DeepSeek V4.1 Flash, heures pleines | `deepseek-flash` | 0,30 | 0,006 | automatique | 1,20 |

Heures pleines DeepSeek : 01–04 h et 06–10 h UTC, du lundi au vendredi, hors fériés chinois. Sources : [Anthropic, tarifs](https://platform.claude.com/docs/en/about-claude/pricing), [Anthropic, modèles](https://platform.claude.com/docs/en/about-claude/models/overview), [DeepSeek, tarifs](https://api-docs.deepseek.com/quick_start/pricing), [DeepSeek, API Responses](https://api-docs.deepseek.com/api/create-response).

Non établi par les pages lues : si DeepSeek impose le schéma de sortie, et si `output_tokens` comprend les tokens de raisonnement. La route `/responses` répond 401 sans clé, ce qui ne prouve pas son fonctionnement. Le premier appel réel le dira.

## Décision

1. **Lot** : les 24 sujets du jeu de développement, tous issus de collectes réelles, moins 3 sans texte exploitable, comme dans le moteur. Le jeu d'évaluation reste à l'aveugle pour les avis humains.
2. **Mêmes entrées** : mêmes documents, prompts, schémas et contrôles que le moteur. L'ordre des modèles alterne selon une empreinte fixe.
3. **Rédaction forcée** : chaque modèle rédige tous les sujets, même ceux qu'il écarte. Sinon les brouillons ne seraient pas comparables, et on ne verrait pas ce qu'il invente sur un texte pauvre.
4. **Isolation** : les sorties restent dans `comparaison_sortie`, reliée à `llm_run` et `llm_call`. Aucun brouillon, aucune publication, aucune décision de sélection.
5. **Réglages** : ceux qu'on utiliserait en production. Haiku : effort `medium`, réflexion adaptative, consignes en cache. Flash : `reasoning.effort = none`, cache automatique. Un essai de Flash avec raisonnement reste possible si le résultat le justifie.
6. **Format** : API Responses de DeepSeek avec `text.format` en `json_schema`, seule voie documentée pour un schéma. Le schéma Zod reste le juge pour les deux modèles. Trois sorties inexploitables d'affilée arrêtent le lot, pour ne pas payer une erreur de réglage.
7. **Budget** : réservation avant chaque appel, coût réel ensuite, plafond de 1 $ sur l'ensemble de `llm_call`, relances comprises. La commande refuse un plafond plus haut.
8. **Mesures du code** : validité du JSON et du schéma, citations introuvables, écarts factuels, accord avec les trois juges, latence, tokens, coût.
9. **Lecture à l'aveugle** : qualité et fidélité se jugent sur des versions A et B sans nom de modèle, relues par des agents d'abord, puis par l'utilisateur sur un échantillon. Les trois restent étiquetés séparément.
10. **Simulation** : les tests écrivent `origine = simulation`. Le rapport les ignore : sans appel réel, il dit qu'aucun modèle n'est évalué.
11. **Règle de choix, fixée avant les résultats** (proposée, à valider par l'utilisateur) :
    - éliminatoire : une information inventée confirmée à la relecture, dans un champ qui passerait les contrôles, ou moins de 90 % de sorties valides du premier coup ;
    - puis, dans l'ordre : fidélité, qualité d'explication, format, latence, coût ;
    - le coût ne départage qu'à qualité équivalente : l'écart attendu se compte en centimes pour 100 publications ;
    - à résultats proches, l'écart est déclaré non démontré, et le fournisseur déjà prévu par SPEC §8 reste le choix par défaut.
12. **Second modèle** : aucun n'est testé d'emblée. Claude Sonnet 5.5 ou DeepSeek V4 Pro ne seront essayés que sur les sujets où le modèle retenu échoue, si le budget le permet.

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| Lancer le moteur pour chaque modèle | aucun code | sujets différents, écriture dans les brouillons | non |
| Utiliser le jeu d'évaluation | plus de sujets | brise l'aveugle des avis humains | non |
| Une copie de la base par modèle | isolation simple | plafond commun non garanti | non |
| Table dédiée et mêmes prompts | comparable, isolée, plafond commun | un module de plus | **oui** |
| Format Anthropic de DeepSeek | adaptateur réutilisé | seul `effort` est lu dans `output_config` : aucun schéma demandé | non |
| Chat Completions en `json_object` | ancienne et documentée | aucun schéma, contenu blanc possible | repli |

## Compromis

- Sur 21 sujets, seul un écart net se distingue du hasard. Le tableau donnera des effectifs, pas une garantie.
- Haiku réfléchit et Flash non : c'est un choix de production, pas une égalité de moyens.
- Le coût est calculé à partir des tokens rendus par chaque API. Il reste à rapprocher des soldes affichés par les fournisseurs.
- Les juges de référence et les relecteurs sont des agents Claude Code, donc de la famille d'un des deux modèles. L'aveugle réduit ce biais sans l'annuler, d'où l'échantillon humain.

## Conséquences

- `modeleAnthropic` place les consignes en cache, ce qui profite aussi au moteur.
- Nouvelle table et migration 0008, appliquée à la base locale.
- `redactSecrets` masque aussi les clés au format `sk-`, hors de tout mot.
- Un adaptateur DeepSeek existe, mais le moteur refuse tout modèle non Claude tant que SPEC §8 ne change pas.

## Actions

1. [ ] L'utilisateur : ouvrir les comptes, payer si nécessaire, saisir les clés dans `.env.local`, accepter ou non l'envoi d'annonces publiques à DeepSeek.
2. [ ] Claude : lancer `npm run comparaison -- lancer --confirmer`, un jour et une heure notés.
3. [ ] Claude : lire le rapport, faire relire à l'aveugle, préparer l'échantillon humain.
4. [ ] L'utilisateur : décider du fournisseur. SPEC §8 change si DeepSeek est retenu.


**Résultat réel du 2026-11-01** (21 sujets, heures creuses) : dépense réelle 0,083 $ (Haiku 0,061 $, Flash 0,022 $). Valides du premier coup : Haiku 42/42, Flash 40/42. Latence de rédaction p50 : 14,8 s contre 5,8 s. Relecture à l'aveugle par un seul agent, sur 19 sujets : fidélité 4,6/5 contre 3,9/5, clarté 3,2/5 contre 3,7/5, éléments inventés ou erronés 3 contre 13. Recommandation : Haiku par défaut, décision de l'utilisateur attendue. Aucun des deux n'est publiable sans contrôle. Défaut trouvé : schéma `Brouillon` refusé par la grammaire d'Anthropic, désormais donné en consigne et validé par Zod (`imposerSchema`, sans test dédié).
