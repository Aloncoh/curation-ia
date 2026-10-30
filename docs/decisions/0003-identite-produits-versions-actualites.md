# ADR-0003 : identité des produits, des versions et des actualités

**Statut :** Acceptée
**Date :** 2026-10-30
**Décideurs :** Claude (règle d'unicité validée par l'utilisateur avec le plan de P2 ; traitement des préversions, identité des entrées de flux et cas limites décidés pendant l'implémentation et la relecture adversariale)

## Contexte

P2 rattache les documents collectés à des produits et à des versions, et transforme chaque annonce en « actualité » sans doublon. Toujours sans IA : le rattachement doit être déterministe et vérifiable.

Données réelles observées le 2026-10-30 (fixtures dans `tests/fixtures/`, essai réel dans PROGRESS.md) :

- Deux dépôts publient surtout des préversions : 17 des 20 dernières releases de Codex CLI (tags `rust-v0.166.0-alpha.6`…) et 18 des 20 dernières de Gemini CLI (une `nightly` presque chaque jour, des `preview`) ; les 5 releases de Claude Code relevées sont toutes stables.
- Les tags ne suivent pas tous le même format : `v2.1.312`, `rust-v0.166.0`, `v0.67.0-nightly.20261030.gb633c0703`.
- Dans le flux GitHub Changelog, le `guid` d'une entrée diffère de son lien pour 9 entrées sur 10 (par exemple une date différente dans l'adresse) ; dans le flux OpenAI News, ils sont égaux.
- Un flux d'annonces ne dit pas de quel produit il s'agit : il faudra une qualification (P3).

Risques à éviter : fusionner deux produits au nom proche (le modèle « Codex » et l'outil « Codex CLI »), créer une actualité par préversion nocturne, créer une seconde actualité quand une annonce est collectée deux fois, republiée avec une nouvelle date, ou recréée sur GitHub avec un nouvel identifiant.

## Décision

1. **Produit** = clé canonique `éditeur/identifiant` déclarée dans la configuration de la source (`src/sources.ts`, par exemple `openai/codex`). Jamais déduite d'un nom ; aucune fusion par ressemblance. Index unique sur `product.key`. Le nom, l'éditeur, la catégorie et le dépôt suivent la configuration à chaque collecte.
2. **Version** = (produit, numéro normalisé). Le numéro est le motif `x.y.z[.w][-préversion][+build]` en fin de tag, précédé du début du tag ou d'un séparateur (`rust-v0.166.0` → `0.166.0`, `v0.67.0-preview.0` → `0.67.0-preview.0`), le tag tel quel sinon. Le caractère « préversion » vient du champ `prerelease` de l'API GitHub, jamais du nom. Index unique sur (`product_id`, `version`). Une version est décrite par son document d'origine : celui-ci peut la mettre à jour (préversion devenue stable, date corrigée) ; un autre document au même numéro ne l'écrase pas, sauf pour la faire passer en version stable.
3. **Actualité** :
   - release stable → **au plus une** actualité de type « version » par version, rattachée au produit et à la version (`news_item_target`, index unique sur la version) ; un autre document de la même version (release supprimée puis recréée avec un nouvel identifiant) devient une source secondaire (`supporting`) de cette actualité ;
   - préversion → version enregistrée **sans actualité** ; si elle devient stable lors d'une collecte suivante, l'actualité est créée à ce moment-là ; une release stable repassée en préversion garde son actualité (historique), la version passe en préversion ;
   - entrée de flux → actualité de type « annonce », sans produit tant qu'elle n'est pas qualifiée (P3).
4. **Un document est la source principale d'au plus une actualité** (index unique partiel sur `news_item_document(document_id)` pour le rôle `primary`). Une annonce collectée deux fois, ou republiée avec une nouvelle date, ne crée pas de seconde actualité ; une date d'annonce connue n'est jamais remplacée, une date inconnue est complétée dès que la source la donne. Les changements de contenu restent visibles dans les captures du document.
5. **Identité d'une entrée de flux** = son lien normalisé. Le lien doit être en https, sans identifiants, sur un hôte déclaré pour la source (`linkHosts` : `openai.com`, `github.blog`) ; sinon l'entrée est refusée et le motif compté dans la trace de l'exécution. Le `guid` est conservé en métadonnée, jamais utilisé comme adresse.
6. **Atomicité et rattrapage** : le rattachement s'exécute dans la même transaction que l'enregistrement des documents et la fin de l'exécution. Il traite les documents de la réponse courante, puis les documents de la source encore rattachés à rien (par exemple collectés avant la migration 0001 et sortis depuis de la réponse) ; la date « vu pour la première fois » d'une actualité est celle de la première collecte de son document.

## Options étudiées

### Identité des produits

| Option | Évaluation |
|---|---|
| A. Clé canonique déclarée par la source (retenue) | déterministe, vérifiable, aucune fusion erronée ; un produit non déclaré reste inconnu |
| B. Rapprochement par nom (similarité de texte) | couvre plus de cas, mais fusionne des produits distincts au nom proche et dépend d'un seuil arbitraire |
| C. Identification par un modèle d'IA | hors de P2 (sans IA) ; coût ; une identification par modèle ne peut pas se vérifier seule (règle de CLAUDE.md) |

### Préversions

| Option | Évaluation |
|---|---|
| A. Version enregistrée sans actualité (retenue) | historique complet, fil lisible ; actualité créée quand la version devient stable |
| B. Une actualité par préversion | fil noyé (une `nightly` par jour pour Gemini CLI) |
| C. Ignorer les préversions | perte de l'historique des versions, utile pour qualifier les limites plus tard |

### Identité des entrées de flux

| Option | Évaluation |
|---|---|
| A. Lien normalisé, sur un hôte déclaré (retenue) | correspond à l'adresse publique ; reste stable quand le `guid` diffère ; un lien hors domaine n'est jamais présenté comme source officielle |
| B. `guid` | identifiant prévu par RSS, mais différent du lien sur le GitHub Changelog ; peut contenir n'importe quelle chaîne |
| C. Empreinte du contenu | une simple correction de texte créerait une nouvelle entrée |

## Compromis

- Les annonces des flux restent sans produit jusqu'à P3 ; un produit absent de la configuration n'existe pas pour le catalogue.
- Un changement d'adresse d'une entrée de flux (nouveau slug) crée une nouvelle actualité : accepté, à observer sur les collectes réelles. Le GitHub Changelog met une date dans ses adresses ; si une entrée est redatée, elle réapparaîtra comme nouvelle.
- Une entrée de flux sans date est classée après les entrées datées : si le flux dépasse `maxItems`, elle peut ne pas être gardée (aucun cas dans les flux réels relevés).
- Un dépôt transféré ou un changement de format des tags demande de mettre à jour la configuration à la main.
- La date d'une actualité ne suit pas les republications : c'est voulu (une republication n'est pas une nouvelle annonce), mais une correction de date par l'éditeur n'apparaît que dans les captures.

## Vérification

Tests sur fixtures réelles (`tests/catalog.test.ts`, `tests/feeds.test.ts`) : collecte multi-sources sans doublon, chaque release rattachée à exactement une version et chaque actualité « version » à la version de son document ; seconde collecte entièrement réussie, sans nouveauté ; deux annonces distinctes sur le même produit → deux actualités ; préversion sans actualité puis actualité quand elle devient stable ; release recréée avec un nouvel identifiant → une seule actualité, deux documents ; autre document au même numéro → version non écrasée ; rattrapage d'une base antérieure à la migration 0001 ; date inconnue complétée ; entrée de flux republiée avec une nouvelle date → pas de nouvelle actualité, date d'origine conservée ; flux en panne (HTML, flux vide, HTTP 503, délai, redirection, réponse trop volumineuse) → données et catalogue identiques ; liens refusés et comptés ; normalisation des tags réels. Les nouveaux tests ont été vérifiés en échec sur le code d'avant la relecture. Essai réel sur les 5 sources : consigné dans PROGRESS.md.

## Conséquences

- Plus simple : rattachement explicable ligne à ligne, sans seuil ni modèle ; doublons impossibles par construction (index uniques).
- Plus difficile : chaque nouveau produit suivi demande une ligne de configuration, et chaque flux la liste des hôtes de ses liens.
- **Contenus collectés** (`content_format` `html` ou `markdown`, titres) : données non fiables. Le site (P4) les affiche en texte brut ou après un assainissement côté serveur par liste blanche (balises, attributs, liens http/https seulement) — critère ajouté à P4 dans ROADMAP.md.
- À revoir en P3 : qualification des annonces (rattachement à des produits existants, création de produits avec validation) ; en P6 : sources sans flux (page d'actualités d'Anthropic).
