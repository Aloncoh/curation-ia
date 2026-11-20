# Ce qui consomme les lectures de la base (mesure du 2026-11-19)

**Pourquoi ce document.** Le 2026-11-19, Turso a bloqué toutes les lectures de la base en ligne : le quota de l'offre gratuite (500 millions de lignes lues par mois calendaire, turso.tech/pricing lu le 2026-11-19) a été atteint en moins de 19 jours. L'utilisateur a choisi d'attendre plutôt que de payer : le même quota doit tenir tout le mois suivant. Chez Turso, une ligne compte dès qu'une requête la parcourt, même si elle n'est pas renvoyée (docs.turso.tech/help/usage-and-billing).

**Conclusion.** La chaîne consomme beaucoup plus que le site. Quatre requêtes de la chaîne relisent toute une table pour chaque ligne d'une autre, ou toute la file à chaque cycle : leur coût grossit bien plus vite que la base. Trois d'entre elles datent du 2026-11-05 ; le passage de 91 à 281 sources, les 10 et 16 novembre, a fait grossir les tables et donc ce coût. Les corriger demande trois réécritures et un index.

**Mise à jour du 2026-11-19, même jour.** Les trois réécritures (A, B, D) sont faites et mesurées : section 7. La boucle de recapture est corrigée le 2026-11-20 (section 5). Restent les index (C) et le cache du site (E).

## 1. Méthode

- Base de mesure : la base locale `data/curation.db` (941 actualités, 1 099 documents, 1 318 captures, 223 brouillons, 619 appels au modèle, 346 exécutions, 68 posts). La base en ligne est inaccessible.
- Les requêtes viennent du vrai code : un traceur chargé avec `node --import` note chaque requête envoyée au client de base, sans modifier le projet. Tracés : les fonctions de l'API v1 appelées par chaque page, une collecte réelle de trois sources, l'étape de capture des pages, la commande `etat`. Les requêtes de file d'attente de la rédaction ont été extraites de `src/analysis/pipeline.ts`.
- Comptage : chaque requête est rejouée dans `sqlite3 -readonly` avec `.scanstats on`, qui donne les lignes réellement parcourues par chaque boucle du plan. La somme est proche de ce que Turso compte.
- **Limite.** Les tailles des tables en ligne ne sont pas lisibles. Les colonnes « en ligne » ci-dessous sont des **estimations**, calculées avec ces hypothèses : 15 000 actualités, 30 000 exécutions (`run`), 3 500 appels au modèle, 1 500 brouillons, 300 posts publiés, 60 posts « à vérifier ». L'ordre du classement est fiable ; les montants ne le sont pas.

## 2. Les plus gros consommateurs

| # | Requête | Mesuré en local | Pourquoi | Estimation en ligne | Fréquence |
|---|---|---|---|---|---|
| 1 | Choix des pages à capturer, `approfondir` (`src/collect/approfondir.ts:54`) | **313 469** lignes | pour chaque actualité (892), toute la table `run` (346) est relue pour savoir si la page a déjà été refusée | actualités × exécutions : des dizaines à des centaines de millions par passage | 1 fois par heure |
| 2 | Regroupement à la collecte, `src/catalog/link.ts:213-223` (ADR 0014) | **2 002** lignes par nouveau document, soit 80 080 pour 40 nouveaux | pour chaque nouveau document, tous les documents principaux sont relus, alors que seuls ceux des 3 derniers jours servent | environ 30 000 par nouveau document ; 500 à 1 650 nouveaux par jour (STATE.md), soit 15 à 50 millions par jour | à chaque collecte |
| 3 | Relances, `aRelancer` (`src/analysis/pipeline.ts:198`) | **13 826** lignes | pour chaque post « à vérifier » (22), toute la table `llm_call` (619) est relue | 60 × 3 500 ≈ 210 000 par cycle | à chaque cycle |
| 4 | File d'attente de la rédaction, `aTraiter` (`src/analysis/pipeline.ts:108`) | **10 623** lignes et 2 Mo de texte renvoyés | toutes les actualités sans résultat sont relues à chaque cycle (11 lignes par actualité), avec le texte complet de chaque capture, pour n'en traiter que 30 | 11 × 15 000 ≈ 165 000 par cycle, plus des dizaines de Mo transférés | à chaque cycle |
| 5 | Commande `delais` (`src/mesure/delais.ts:139`, `preparation`) | **399 773** lignes | pour chaque brouillon (223), `llm_call` est relue quatre fois | 1 500 × 3 500 × 4 ≈ 21 millions par lancement | à la main, depuis le poste |
| 6 | Commande `etat` | 2 175 lignes | deux parcours complets de `llm_call`, un de `selection_decision` | 10 000 à 15 000 | après chaque cycle |

Le workflow lance un cycle toutes les 15 minutes au plus (`chaine.yml`, 96 par jour si GitHub les exécute tous).

Une incohérence reste ouverte : avec ces hypothèses, la requête n° 1 dépasserait à elle seule le quota mensuel en un passage, alors que la base a tenu 18 jours. Soit les tables en ligne sont plus petites que supposé, soit cette étape échouait, soit Turso compte autrement. Le tableau d'usage de Turso (requêtes les plus coûteuses) trancherait ; seul l'utilisateur y a accès.

## 3. Les pages du site

Aucune page n'est mise en cache : chaque visite, robots compris, relance toutes les requêtes.

| Page | Requêtes par vue | Lignes parcourues (local, 68 posts) | Estimation en ligne (300 posts) |
|---|---|---|---|
| `/fil` | 42 | 4 789 | environ 8 000 |
| Accueil `/` | 87 | 2 335 | environ 17 000 |
| Recherche | 39 | 3 828 | environ 6 000 |
| `/api/v1/fil` (application mobile) | 21 | 1 782 | environ 3 500 |
| Profil d'un agent | 28 | 328 | environ 4 500 |
| Page d'un post | 24 | 102 | inchangé |
| Fiche d'un post | 34 | 116 | inchangé |

- La requête qui grossit est `idsDuFil` (`src/api/v1/publications.ts:104`) : elle parcourt tous les posts à chaque appel (environ 7,6 lignes par post). L'accueil l'appelle 7 fois, `/fil` 2 fois.
- Chaque page appelle deux fois les mêmes lectures : une pour son titre (`generateMetadata`), une pour son contenu.
- Il faudrait de l'ordre de 30 000 à 60 000 pages vues par mois pour épuiser le quota par le site seul : ce n'est pas la cause première, mais cela comptera une fois la chaîne corrigée.

## 4. Corrections, classées par gain

| # | Correction | Supprime | Ce que ça demande |
|---|---|---|---|
| A | `approfondir` : lire une seule fois la liste des pages refusées dans la fenêtre, puis filtrer en mémoire, au lieu d'une sous-requête par actualité | n° 1, le plus gros | code seul ; un index `run(kind, status, started_at)` en plus éviterait de relire toute la table |
| B | Regroupement : charger une fois par collecte les titres des 3 derniers jours, les garder en mémoire, y ajouter les nouveaux | n° 2 | code seul ; un index `news_item(first_seen_at)` limiterait la lecture aux 3 jours (la table `news_item` n'a aucun index) |
| C | Index `llm_call(news_item_id)` | n° 3, n° 5, et les sous-requêtes de `aTraiter`, de la rédaction des découvertes et de la relecture | **une migration de la base en ligne : accord de l'utilisateur requis** |
| D | `aTraiter` : choisir d'abord les identifiants, sans le texte des captures, limités à ce qu'un lot peut examiner (600 titres pour le tri, 30 rédactions), puis lire le texte des seuls retenus | n° 4 et l'essentiel du volume transféré | code seul |
| E | Site : mettre en cache les lectures de l'API v1 (60 à 300 secondes, par langue et par paramètres) ; ne lire qu'une fois par page ; sur l'accueil, un seul appel au fil au lieu de sept | l'essentiel des lectures du site | code seul ; un post paraîtrait avec quelques minutes de retard au plus |
| F | Ne pas lancer `npm run delais` sur la base en ligne tant que C n'est pas fait | n° 5 | une habitude |

Ordre conseillé : A, B et D (code seul, sans toucher à la base), puis C dès que l'utilisateur accepte la migration, puis E.

## 5. Défaut trouvé en chemin : les pages lues par plan de site sont recapturées sans fin

Pour une source lue par son plan de site (`feed:anthropic-plan`, `feed:xai-plan`, et depuis le 2026-11-18 ByteDance Seed, Black Forest Labs et Runway), la collecte enregistre une capture vide, l'approfondissement lit la page, puis la collecte suivante voit « modifié » et enregistre de nouveau une capture vide, que l'approfondissement recapture. Constaté en local sur `bfl.ai/blog/flux-3` : captures n° 1 (vide), n° 2 (8 453 caractères), n° 3 (vide), n° 4 (8 453 caractères). Le mécanisme est le même pour toutes ces sources ; il n'a pas pu être constaté en ligne.

Effets : chaque page est redemandée à l'éditeur à chaque passage, deux écritures par page et par passage, le stockage grossit du texte de la page à chaque fois, et l'avis « la source a été mise à jour après ce post » peut s'afficher à tort. **Corrigé le 2026-11-20** (`src/collect/store.ts`). Le défaut était plus large que les plans de site : la collecte comparait le contenu reçu à la dernière capture, quelle qu'elle soit. Dès qu'une page avait été lue par `approfondir`, tout flux à accroche courte repassait donc pour « modifié ». Dans la base locale, au moins 7 sources étaient touchées (Black Forest Labs, Gemini, ElevenLabs, Figma, Suno, Mistral, NotebookLM). La collecte compare maintenant à la dernière capture venue de la source elle-même ; un flux réellement modifié donne toujours une nouvelle capture. Essai réel sur une copie de la base locale : Black Forest Labs, 10 documents inchangés, 0 modifié, deux collectes de suite. Les captures en double déjà écrites restent en base (historique conservé) ; l'avis « la source a été mise à jour après ce post » n'a pas été revérifié sur ces documents.

Observation voisine, non traitée : les flux de Sketch et de Blender changent de contenu d'un jour à l'autre (19 documents sur 20 « modifiés » pour Sketch à cet essai, 0 à la collecte suivante). Ce n'est pas la boucle : la source change vraiment son contenu. Cause non cherchée.

## 6. Non mesuré

- Les étapes `controles`, `planification`, `publication`, `decouverte`, `redaction_decouvertes`, `traduction` et `videos` : les tracer aurait modifié la base locale ou demandé un appel payant.
- Le tri des titres et la rédaction elle-même (appels payants) ; seules leurs requêtes de file d'attente sont mesurées.
- Les écritures : elles ne peuvent pas être rejouées en lecture seule.
- La fréquentation réelle du site et la part des robots.
- Tous les montants en ligne.

## 7. Corrections faites le 2026-11-19 (A, B, D)

Code seul, aucune migration ([ADR 0019](decisions/0019-lectures-de-la-base.md)). Mesuré sur la même base locale, avec la même méthode (requêtes rejouées en lecture seule, lignes parcourues par les boucles du plan).

| # | Requête | Avant | Après | Ce qui a changé |
|---|---|---|---|---|
| A | Choix des pages à capturer | 313 469 lignes par passage | **2 660** (347 + 2 313) | les pages refusées depuis moins de 24 heures sont lues une fois (347 lignes de `run`), puis écartées en mémoire ; le brouillon est lu avant les documents |
| B | Regroupement à la collecte | 2 002 lignes par nouveau document | **1 181 par passage** | les annonces des 3 derniers jours sont lues une fois par passage de collecte, gardées en mémoire, complétées par celles que le passage crée, et relues après 5 minutes |
| D | File d'attente de la rédaction | 10 623 lignes et 2 Mo de texte par cycle | **2 569** pour la file, sans aucun texte, puis 330 par lot de 30 et au plus 6 lignes par titre proposé au tri (600 titres au plus) | la file ne lit plus les captures ; le texte n'est lu que pour le lot examiné ; une capture trop longue n'est plus rapatriée |

- **Essai réel de B** sur une copie de la base locale : collecte de trois sources jamais vues (Cloudflare, Google Research, Vercel), 60 nouveaux documents, 59 actualités créées et 1 document regroupé. Une seule lecture de regroupement au lieu de 60 ; 1 995 lignes parcourues pour toute la collecte, contre environ 120 000 avec l'ancien code.
- **A et D** : mesurés en rejouant leurs requêtes, pas par un passage réel (capturer des pages solliciterait les éditeurs pour rien ; la rédaction est payante).
- Tests : 910 au vert le 2026-11-19 (51 fichiers ; 912 le 2026-11-20 avec la correction de la section 5), dont 5 nouveaux (page refusée qui ne prend pas la place d'une autre, capture vide en tête de file, capture vide non proposée au tri, collecte annulée sans actualité fantôme, mémoire relue après son délai).

**Ce que ces corrections ne règlent pas.**

- **D reste proportionnelle à la base.** Sans index, trouver les actualités en attente oblige à parcourir toute la table `news_item` à chaque cycle : environ 2,7 lignes par actualité au lieu de 11, soit trois à quatre fois moins, mais un coût qui grossit encore avec la base. Avec les hypothèses de la section 1 (15 000 actualités, 96 cycles par jour), cela resterait de l'ordre de 4 millions de lignes par jour : une **estimation**. Le borner demande un index (`news_item(first_seen_at)`, `post_draft(status)`) et une file limitée aux actualités récentes : une migration, donc l'accord de l'utilisateur.
- **B parcourt encore `news_item` une fois par passage** (jusqu'à une fois toutes les 5 minutes) ; le même index `news_item(first_seen_at)` le limiterait aux 3 derniers jours.
- **A parcourt encore `run` et `news_item` une fois par heure** ; un index `run(kind, status, started_at)` supprimerait le premier parcours.
- **Changements de comportement, voulus et limités** : le nombre de captures « sans texte » et « trop longues » du bilan compte désormais celles lues pour remplir le lot, plus celles de toute la file ; le tri des titres peut proposer un titre dont la capture, longue, n'a presque pas de mots (le lot l'écarte ensuite) ; une annonce écrite par un autre processus pendant un passage n'est vue par le regroupement qu'au bout de 5 minutes au plus.
- Non faits : C (index `llm_call(news_item_id)`), E (cache du site), F. La boucle de recapture de la section 5 est corrigée le 2026-11-20.
