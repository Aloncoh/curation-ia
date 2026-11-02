# Budget des modèles

> Estimation du 2026-10-31. **Aucun appel payant n'a été fait** : ni DeepSeek, ni Anthropic. Tous les coûts ci-dessous sont des estimations à remplacer par le coût mesuré d'un premier lot. Recalcul : `npm run budget`, formules dans `src/analysis/estimation.ts`.

## 1. Tarifs vérifiés

Relevés le 2026-10-31 sur la [page officielle DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) et sur la [page officielle Anthropic](https://platform.claude.com/docs/en/about-claude/pricing). En dollars par million de tokens.

| Modèle | Entrée en cache | Entrée sans cache | Sortie | Contexte |
|---|---|---|---|---|
| `deepseek-flash` (V4.1-Flash-1017), heures creuses | 0,003 | 0,15 | 0,60 | 1 M |
| `deepseek-flash`, heures pleines | 0,006 | 0,30 | 1,20 | 1 M |
| `deepseek-v4-pro` (V4-Pro-0813), heures creuses | 0,022 | 0,66 | 1,98 | 1 M |
| `deepseek-v4-pro`, heures pleines | 0,044 | 1,32 | 3,96 | 1 M |
| `claude-haiku-5-5` | 0,01 (écriture 0,125) | 0,10 | 0,50 | 1 M |
| `claude-sonnet-5-5` | non retenu | 2,00 | 10,00 | — |

Heures pleines DeepSeek : 01–04 h et 06–10 h UTC, du lundi au vendredi, hors fériés chinois. DeepSeek se réserve le droit de changer ses prix ; aucune promotion sur les tokens n'était en cours à cette date.

**Revérifié le 2026-11-01** sur les mêmes pages : tarifs et identifiants inchangés. Le cache de Haiku est désormais activé par le moteur ; les estimations ci-dessous ne le comptent pas et restent donc majorées pour Haiku.

## 2. Hypothèses

**Mesuré sur nos textes** (découpage cl100k, approximation : DeepSeek n'offre aucun comptage par API) :

| Valeur | Tokens | Origine |
|---|---|---|
| Consignes et schéma de qualification | 1 681 | prompt et schéma réels |
| Consignes et schéma de rédaction | 1 308 | prompt et schéma réels |
| Document moyen à qualifier | 452 | corpus de 60 sujets |
| Document moyen retenu | 781 | 22 sujets retenus, maximum 5 059 |
| Sortie de qualification | 219 | 180 jugements réels, maximum 304 |
| Sortie de rédaction | 700 | 8 exemples (577 en moyenne) plus trois repères |

**Autres mesures** : 33 % de décisions « publier » (59 sur 180, juges de développement, avant tout avis humain) ; 14 % des sorties tombent en heures pleines (35 sur 253 dates précises depuis juillet) ; au moins 200 actualités par mois (198 datées des 30 derniers jours, flux tronqués : plancher).

**Supposé, à mesurer** :

| Hypothèse | Bas | Central | Haut |
|---|---|---|---|
| Part des consignes servie par le cache | 80 % | 50 % | 0 % |
| Raisonnement du modèle | coupé | coupé | 1 000 tokens par qualification, 2 000 par rédaction |
| Brouillons publiables sans reprise | 80 % | 60 % | 50 % |
| Appels à refaire | 3 % | 8 % | 15 % |
| Taille du document à qualifier | 452 | 452 | 2 000 (article complet) |
| Taille du document rédigé | 781 | 781 | 3 000 (article complet) |
| Sortie de rédaction | 700 | 700 | 1 250 |
| Heures pleines | 14 % | 14 % | 20,8 % (répartition uniforme) |

Une reprise est comptée comme facturée : DeepSeek ne publie pas la règle pour une génération interrompue. Le vérificateur est supposé lire 550 tokens de consignes et rendre 250 tokens ; il n'est pas écrit à ce jour, et c'est toujours un autre modèle que celui qui a rédigé.

## 3. Coût du texte

Une publication coûte plus cher qu'une actualité, parce qu'il faut payer aussi tout ce qui a été écarté. Hypothèse centrale : 5,05 actualités analysées pour une publication.

| Hypothèse centrale | Qualification | Rédaction | Actualité retenue, bout en bout | 1 publication | 100 publications | 100 avec vérification par un autre modèle |
|---|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | 0,00037 $ | 0,00073 $ | 0,00125 $ | 0,00335 $ | **0,34 $** | 0,39 $ (Haiku) |
| DeepSeek V4 Pro | 0,00149 $ | 0,00268 $ | 0,00476 $ | 0,013 $ | 1,29 $ | 1,35 $ (Haiku) |
| Claude Haiku 5.5 | 0,00032 $ | 0,00056 $ | 0,00099 $ | 0,00277 $ | **0,28 $** | 1,46 $ (Sonnet) |
| Claude Sonnet 5.5 | 0,00646 $ | 0,011 $ | 0,020 $ | 0,055 $ | 5,53 $ | 5,59 $ (Haiku) |

Pour 100 publications avec Flash : 0,20 $ en hypothèse basse, 1,80 $ en hypothèse haute.

**Ajout du 2026-11-01** : le brouillon gagne `exemple_usage` et `prerequis`, et le prompt s'allonge. Ces chiffres ne le comptent pas encore. En supposant 150 tokens de sortie et 110 de consignes en plus, l'hypothèse centrale monte de 5 à 6 % : 0,36 $ avec Flash, 0,29 $ avec Haiku. C'est une estimation, à remplacer par le coût mesuré du premier lot.

**Coût mensuel du texte** (plancher de 200 actualités analysées ; au-delà des publications visées, un sujet retenu attend et n'est pas rédigé) :

| Publications par mois | 30 | 90 | 300 | 900 |
|---|---|---|---|---|
| Flash, bas | 0,09 $ | 0,18 $ | 0,59 $ | 1,78 $ |
| **Flash, central** | **0,12 $** | **0,30 $** | **1,00 $** | **3,01 $** |
| Flash, haut | 0,57 $ | 1,62 $ | 5,41 $ | 16,22 $ |
| Pro, central | 0,47 $ | 1,16 $ | 3,88 $ | 11,64 $ |
| Haiku, central | 0,10 $ | 0,25 $ | 0,83 $ | 2,49 $ |
| Sonnet, central | 2,00 $ | 4,98 $ | 16,61 $ | 49,81 $ |

## 4. Coût du montage graphique

Zéro token : le montage est composé par le code. Mesures locales du 2026-10-31 sur 8 images 1080×1350, en JPEG, deux passes : 330 et 410 ms médians, 604 ms au maximum, 205 Ko en moyenne.

- **Stockage** : environ 21 Mo pour 100 publications à une image, 62 Mo à trois images (estimation d'après ce poids moyen). Hébergement à choisir en P4.
- **Détourage** : 219 à 404 ms avec Apple Vision, sur ce Mac seulement. Aucun outil libre et sûr pour Linux n'est retenu à ce jour (voir [visuels.md](visuels.md)).
- **Fil posé sur un point précis d'une capture** : demande un humain ou un modèle de vision, non chiffré ; la V1 s'en passe.

## 5. Coût de la collecte

Les requêtes sont gratuites. Le coût vient de ce qui les déclenche.

| Cycle | Moyen | Coût mensuel | Limite |
|---|---|---|---|
| 5 min au mieux | GitHub Actions, dépôt public | 0 € | retards et abandons possibles |
| 60 s | Fly.io, 256 Mo, régions US | 2,19 $ pour 30 jours | mémoire de notre processus non testée |
| 60 s | OVH VPS sans engagement | 4,49 € HT | administration d'un serveur |
| 60 s | Vercel Pro | 20 $ | au-delà du besoin |

Il faut aussi un jeton GitHub, gratuit, pour tenir 60 s sur les dépôts. Dans Turso gratuit, un cycle de 60 s dispose d'environ 11 500 lignes lues et 230 écrites, à partager avec le site ; tout dépassement bloque la base. Détail : [delais.md](delais.md).

## 6. Ce qu'implique DeepSeek

- **Données** : contrat avec Hangzhou DeepSeek, droit chinois, stockage en Chine. L'usage des entrées de l'API pour l'entraînement n'est pas tranché par les textes lus. Nous n'enverrions que des annonces publiques, jamais de données de membres.
- **Autorités** : décisions du Garante italien et de Berlin sur le service et l'application, sans mention de l'API. Aucune décision de la CNIL ni position israélienne trouvée, ce qui ne prouve pas leur absence. Ceci n'est pas un avis juridique.
- **Technique** : le raisonnement est activé par défaut et se coupe avec `reasoning.effort = none`. L'API Chat Completions n'a que `json_object` ; l'API Responses accepte `json_schema`, sans dire si le schéma est imposé ; le format Anthropic ne lit que `effort` dans `output_config`. Un adaptateur Responses existe depuis le 2026-11-01, testé sur réseau simulé seulement ([ADR 0009](decisions/0009-comparaison-des-modeles.md)). Aucun comptage de tokens par API : le budget se réserve sur une estimation locale majorée.
- **Disponibilité affichée** août–octobre 2026 : 99,47 % pour Flash, 99,74 % pour Pro ; 27 incidents API en 85 jours. Service fourni tel quel, sans engagement.
- **Compte** : prépayé. Minimum de recharge, devise d'un compte français ou israélien, TVA et éligibilité restent à lire une fois connecté.
- **Publication** : les conditions imposent de vérifier les sorties et de signaler leur origine IA, ce que nos règles font déjà.
- **Hébergeurs tiers du modèle ouvert** (ordre de grandeur, à revérifier) : Azure Europe 0,36 / 1,44 $, Scaleway Paris 0,60 / 1,80 €, Together 0,30 / 1,20 $.

## 7. Recommandation

Le texte pèse très peu : environ 5 $ par mois pour 300 publications, en hypothèse haute avec Flash, et 1 $ en hypothèse centrale. Le vrai choix porte sur l'hébergement du cycle et sur l'endroit où partent les données.

**Décision du 2026-11-01** : l'utilisateur accorde **1 $ en tout**, tous modèles confondus, pour comparer Haiku et Flash sur un même lot réel avant de choisir. Protocole : [ADR 0009](decisions/0009-comparaison-des-modeles.md). Lot : 21 sujets du jeu de développement, 42 appels par modèle. Estimation, sans cache et au tarif le plus haut (`npm run comparaison -- estimer`) : environ 0,02 $ pour Haiku et 0,05 $ pour Flash. Le pire cas théorique, 1,78 $, est coupé par le plafond. Aucun résultat réel à ce jour : il manque les clés et le compte DeepSeek.


**Résultat réel du 2026-11-01** (21 sujets, heures creuses) : dépense réelle 0,083 $ (Haiku 0,061 $, Flash 0,022 $). Valides du premier coup : Haiku 42/42, Flash 40/42. Latence de rédaction p50 : 14,8 s contre 5,8 s. Relecture à l'aveugle par un seul agent, sur 19 sujets : fidélité 4,6/5 contre 3,9/5, clarté 3,2/5 contre 3,7/5, éléments inventés ou erronés 3 contre 13. Recommandation : Haiku par défaut, décision de l'utilisateur attendue. Aucun des deux n'est publiable sans contrôle. Défaut trouvé : schéma `Brouillon` refusé par la grammaire d'Anthropic, désormais donné en consigne et validé par Zod (`imposerSchema`, sans test dédié).
