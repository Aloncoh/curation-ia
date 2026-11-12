# ADR-0015 : tri des titres par le modèle avant la sélection

**Statut :** acceptée (proposition de Claude, validée par l'utilisateur le 2026-11-12 : « Oui, prépare-le »)
**Date :** 2026-11-12
**Décideurs :** l'utilisateur (dépense et principe), Claude (réalisation)

## Contexte

Depuis l'élargissement des sources, 500 à 1 650 actualités sont collectées par jour, mais un lot de brouillons n'en examine que 30, ce qui fait 70 à 120 par jour. L'ordre de la file met en tête les sujets déjà qualifiés, puis ceux repris par plusieurs sources, puis les plus récents. Le 2026-11-12, 2 203 actualités collectées depuis le 8 n'avaient jamais été examinées. Un gros sujet couvert par plusieurs articles séparés, comme l'affaire d'espionnage chez NVIDIA (7 articles), n'était pas reconnu : le regroupement à la collecte (ADR 0014) est volontairement prudent. Un regroupement des titres sans modèle a été essayé sur ces 2 203 titres réels. Il donnait surtout des groupes de mots banals (« open source », « coding agent ») : il a été abandonné.

## Décision

Quand la file dépasse la taille du lot, un seul appel au modèle trie les titres avant la sélection (`src/analysis/tri.ts`, étape `tri` dans `genererBrouillons`).

**Titres envoyés**
- Ce sont les nouveaux titres jamais examinés, qui ne sont ni anciens à la détection ni vus depuis plus de 3 jours.
- Ils partent dans l'ordre habituel de la file, 600 au plus.
- Une ligne par titre : numéro | source | date de première vue | titre. Les titres sont traités comme des données non fiables : ils sont neutralisés, mis sur une seule ligne et coupés à 160 caractères.

**Ce que rend le modèle**
- Au plus n sujets distincts, n étant le nombre de places du lot.
- Un titre par fait, de préférence celui de l'éditeur concerné.

**Nouvel ordre de la file**
- D'abord les sujets déjà connus, puis les titres retenus, puis le reste dans l'ordre habituel.
- Un numéro hors liste ou répété est ignoré.

**Ce que le tri ne fait pas**
- Il ne publie ni n'écarte rien.
- Chaque sujet retenu passe ensuite par la qualification, les citations mot pour mot et les contrôles du code, comme avant.

**En cas d'échec**
- Une sortie illisible, tronquée ou refusée, ou un budget insuffisant, ramène à l'ordre habituel. L'échec est noté dans le bilan du lot (`tri_echec`).
- Les autres erreurs (solde épuisé, pause, bail perdu) arrêtent le lot comme avant.

**Activation et traçabilité**
- La commande `npm run brouillons` active le tri ; `CURATION_TRI=0` le coupe. Le code ne l'active jamais par défaut.
- L'appel est tracé dans `llm_call` (étape `tri`, version `tri-1`), réservé et soldé sous les mêmes plafonds que les autres appels. Faute de colonne libre, sans migration, `news_item_id` porte le premier titre envoyé.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| **Tri par le modèle, un appel par lot** (retenue) | comprend les reformulations, voit le lot entier, coût faible et plafonné | jugement du modèle non vérifiable par le code ; sans effet sur la publication, il ne change que l'ordre d'examen |
| Regroupement des titres par le code | 0 $, déterministe | essayé sur 2 203 titres réels : groupes de mots banals, inutilisable |
| Plus d'actualités par lot | aucune nouvelle logique | coût proportionnel au flot, sans garantie que les gros sujets passent |
| Plongements vectoriels | robuste | nouvelle dépendance exclue sans besoin démontré |

## Compromis

- La popularité ne note pas la qualité. Pour l'ordre d'examen seulement, un fait repris par plusieurs titres passe avant un fait isolé : les notes de qualification ne changent pas.
- Fenêtre de 3 jours : un sujet plus ancien jamais examiné reste dans la file habituelle, sans passer en tête.

## Conséquences

- Coût estimé (non mesuré, le solde DeepSeek étant épuisé le 2026-11-12) : voir `docs/budget-modeles.md` §3.
- À mesurer au premier lot réel : le coût de l'appel, la part des titres retenus effectivement publiés, et si l'affaire NVIDIA ou une annonce de même ampleur passe en tête.
- À revoir si le flot dépasse 600 titres en 3 jours de façon durable : il faudra plusieurs appels, ou un tri préalable par source.
