# ADR-0016 : faire tourner la chaîne sur Claude Haiku 5.5, payé par les crédits API de l'abonnement Max

**Statut :** Acceptée par l'utilisateur, en attente de sa clé
**Date :** 2026-11-13
**Décideurs :** l'utilisateur (fournisseur, crédits, clé, plafonds) ; Claude (mise en œuvre)

## Contexte

- Depuis le 2026-11-11 à 18:31 UTC, DeepSeek répond 402 (solde épuisé) : plus aucun brouillon, aucune découverte rédigée ni aucune traduction.
- L'abonnement Claude Max de l'utilisateur comprend 100 $ de crédits API Claude par mois. Ils n'ont jamais été réclamés et expirent à la fin de chaque cycle de facturation. Ils se réclament en reliant une organisation Claude Console dans claude.ai, Settings > Billing, sans carte, et couvrent l'API Claude. Sources : documentation officielle, lue le 2026-11-12.
- L'utilisateur a répondu « Oui, prépare-le » à « Je prépare le passage de la chaîne sur Claude ? ».
- **Tarifs officiels revérifiés le 2026-11-13** ([pricing](https://platform.claude.com/docs/en/about-claude/pricing), page du modèle Haiku 5.5), en $ par million de tokens, identiques à `tarifs.ts` :

  | Haiku 5.5 (`claude-haiku-5-5`) | Entrée | Lecture du cache | Écriture du cache (5 min) | Sortie |
  |---|---|---|---|---|
  | Jusqu'à 100 000 tokens d'entrée | 0,10 | 0,01 | 0,125 | 0,50 |
  | Au-delà | 0,50 | 0,05 | 0,625 | 2,50 |

  Le modèle a une réflexion adaptative et accepte le paramètre d'effort. Mise en cache possible dès 512 tokens.
- Mesures réelles déjà faites (ADR 0009, 2026-11-01, 21 sujets) :
  - Haiku : 42 sorties valides du premier coup sur 42, 3 éléments inventés ou erronés sur 19 sujets ;
  - Flash : 40 sur 42, et 13 éléments inventés ou erronés ;
  - coût réel par rédaction : 0,0043 $ avec Haiku contre 0,0014 $ avec Flash (base de production, 2026-11-13).

## Décision

1. `CURATION_MODELE=claude-haiku-5-5` dans `chaine.yml`, avec le secret `ANTHROPIC_API_KEY`. Haiku garde les réglages mesurés le 2026-11-01 : effort `medium`, réflexion adaptative, consignes en cache.
2. Les étapes payantes (brouillons, rédaction des découvertes, traduction) n'exigent plus `DEEPSEEK_API_KEY`. Elles exigent la clé du fournisseur du modèle choisi (`CLE_DU_MODELE` dans `pilotage.ts`, résolue par `fournisseur.ts`).
3. La traduction passe aussi par `fournisseur.ts` : elle n'est plus réservée à DeepSeek.
4. Un solde épuisé est reconnu pour les deux fournisseurs. Pour Claude, l'API répond 400 avec « credit balance is too low » ; ce libellé n'a pas été relevé sur une réponse réelle.
5. Retour à DeepSeek : une ligne (`CURATION_MODELE: deepseek-flash`), après rechargement du compte.

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| Recharger DeepSeek | aucun changement, coût le plus bas | dépense supplémentaire ; plus d'éléments inventés mesurés | non |
| Haiku 5.5 sur les crédits Max | déjà payé, meilleure fidélité mesurée, aucun adaptateur | environ 3 fois le coût par rédaction, plus lent (14,8 s contre 5,8 s) | **oui** |
| Modèle local (Ollama) sur le Mac | gratuit à l'appel | Mac allumé en permanence, plus lent, citations mot pour mot moins fiables | non |
| Sonnet 5.5 | meilleure qualité attendue | 20 fois le prix de Haiku | non |

## Compromis

- **Plafonds.** Les plafonds actuels comptent des dollars, quel que soit le payeur : 0,10 $ par cycle, 0,40 $ par jour et 4 $ au total. Environ 2,36 $ sont déjà dépensés depuis le début. Au coût de Haiku, il en reste pour quelques jours, puis les étapes payantes sont sautées avec le motif « plafond total ». Relever les plafonds est une décision de l'utilisateur.
- **Coût estimé.** À volume égal, environ 14 $ par mois, contre environ 5 $ avec Flash. C'est une estimation tirée des dépenses réelles du 1er au 12 novembre et du rapport de coût mesuré sur 21 sujets, non mesurée sur un mois.
- **Étapes jamais essayées avec Haiku :** la traduction, la grille et la rédaction des découvertes, et le tri des titres. La réflexion compte dans `max_tokens` : une limite basse peut se faire tronquer (grille des découvertes à 2 000 tokens, traductions courtes à partir de 1 000). Une sortie tronquée est comptée en erreur, sans rien publier ; le premier cycle réel le dira.
- Les annonces publiques ne partent plus chez DeepSeek, mais chez Anthropic.

## Conséquences

- Plus rien à recharger chez DeepSeek tant que Claude est utilisé.
- SPEC §8 change : le modèle de rédaction est Haiku 5.5.
- Le bilan de la chaîne dit « variables absentes : ANTHROPIC_API_KEY » tant que la clé manque.

## Actions

1. [ ] L'utilisateur : réclamer les crédits (claude.ai > Settings > Billing, relier une organisation Console), créer une clé dans la Console, l'ajouter comme secret `ANTHROPIC_API_KEY` du dépôt GitHub, et dans `.env.local` avec `npm run cles`.
2. [ ] L'utilisateur : décider des nouveaux plafonds (variable de dépôt `CURATION_PLAFOND_TOTAL_USD`, et les plafonds par cycle et par jour de `chaine.yml`).
3. [ ] Claude : lire le premier cycle réel (brouillons, tri, traduction, découvertes), les troncatures et le coût par étape.
