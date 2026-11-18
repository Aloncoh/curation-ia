# ADR-0018 : plus de place aux modèles, et des comparatifs rapportés, jamais mesurés par le site

**Statut :** acceptée (demande de l'utilisateur du 2026-11-18 : « parler beaucoup plus des nouveaux modèles », « amélioration dans la rédaction », « faire même des posts modèles vs autres modèles »)
**Date :** 2026-11-18
**Décideurs :** l'utilisateur (ligne éditoriale), Claude (réalisation)

## Contexte

Depuis le 2026-11-17, le tri des titres et l'ordre des priorités mettent déjà les modèles en premier (SPEC §3.6). Trois manques restaient.

- **Rédaction.** Une seule consigne servait à tous les sujets et parlait d'« outil ». Pour un modèle, le lecteur attend la version, des capacités chiffrées, l'accès et le prix ; les comparaisons faites par l'éditeur devaient rester des attributions.
- **Comparatifs.** Ils étaient écartés à trois endroits : la grille notait 0 en nouveauté tout « comparatif », le tri des titres disait de ne pas en retenir, et aucune nature ne les désignait.
- **Sources.** Plusieurs éditeurs de modèles image et vidéo n'avaient aucune source officielle : ByteDance Seed (Seedance, Seedream), Black Forest Labs (FLUX), Runway.

Une contrainte ne bouge pas : le site ne teste rien lui-même. Un benchmark est attribué à son auteur avec ses conditions, jamais présenté comme mesuré par le site (règles produit).

## Décision

1. **Rédaction selon la nature** (`systemeRedaction`, `src/analysis/prompts.ts`, version `p3-23`). La consigne commune reste identique et vient en premier. Un complément s'ajoute pour une sortie de modèle (`nouveau_modele`, `modele_ajoute_a_une_plateforme`) et un autre pour un comparatif.
2. **Comparatifs de modèles admis quand ils rapportent des résultats mesurés** (consignes `s7`, tri `tri-4`, nature `comparatif_de_modeles`). Un comparatif sans mesure (avis, liste des « meilleurs », guide d'achat) reste écarté. Le comparatif d'un éditeur sur son propre modèle est une affirmation commerciale ; celui d'un tiers, un résultat indépendant.
3. **Contrôles propres au comparatif** (`controlerBrouillon`, contexte `comparatif`). La description attribue ; aucun jugement ni classement entre modèles sans auteur (`verdict_sans_auteur`) ; au moins un résultat mesuré repris avec son auteur et ses conditions (`comparatif_sans_resultat`, `benchmark_sans_conditions`). Un seul écart laisse le post « à vérifier » : il n'est pas publié seul.
4. **Trois sources officielles par plan de site** : ByteDance Seed, Black Forest Labs, Runway (docs/sources.md §3.16). Le lecteur de plan sait lire la version anglaise que le plan déclare, sans suivre de redirection.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| **Relayer les comparatifs mesurés par d'autres, attribués** (retenue) | respecte « benchmarks attribués » ; réutilise le moteur, les citations mot pour mot et les contrôles ; aucune migration | dépend de ce que publient les sources ; les grands classements (Artificial Analysis, LMArena) sont différés |
| Fiche « face à face » construite par le code à partir de deux posts déjà publiés (accès, prix, limites, affirmations de chaque éditeur) | 0 $ par fiche, chaque cellule déjà citée | nouveau format de publication, appariement des modèles par famille à définir : décision de l'utilisateur, non construite |
| Comparatif rédigé par le modèle à partir de plusieurs captures | texte plus riche | le moteur cite un seul document ; risque de jugement sans auteur ; coût par post |
| Tests réalisés par le site | vraie valeur ajoutée | hors V1 (P8), dépense et protocole à décider |

## Compromis

- Un comparatif n'est publié seul que si tout est attribué et cité : beaucoup resteront « à vérifier ». C'est voulu.
- La liste de mots qui signale un jugement (`VERDICT`) est large : un faux positif coûte une relecture, pas une erreur publiée.
- Changer la version du prompt fait repayer les qualifications en attente de rédaction (état `qualifiee`, quelques-unes au plus).

## Conséquences

- À mesurer après quelques cycles en ligne : la part de Nodi dans les posts publiés (15 % du 2026-11-10 au 2026-11-17), le nombre de comparatifs retenus, publiés et « à vérifier ».
- Non vérifié en réel : la qualité des textes produits par les nouveaux compléments (aucun appel payant lancé depuis le poste).
- À décider par l'utilisateur : la fiche « face à face » ; une clé Artificial Analysis pour les classements.
