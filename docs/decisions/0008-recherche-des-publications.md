# ADR-0008 : recherche des publications

**Statut :** Proposée, essai réel sur Turso attendu
**Date :** 2026-11-01
**Décideurs :** l'utilisateur (besoin, jalon) ; Claude (approche technique)

## Contexte

L'utilisateur veut retrouver une publication sans redescendre dans le fil, par un nom, des mots-clés ou un besoin : « Impeccable », « UX design », « motion design », « code review », « sécuriser mon SaaS », « repo pour un Jarvis ». La recherche couvre les ressources, les actualités et leurs mises à jour, y compris avec des termes proches. Les résultats restent des publications, avec auteur, média, explication, sources et discussions. Jusqu'ici, ni la SPEC ni la feuille de route n'en parlaient.

Contraintes : base SQLite via `@libsql/client`, Turso en ligne ; pas de base vectorielle sans besoin démontré ; aucune dépense sans accord ; toute saisie est validée.

**Essai local du 2026-11-01** (SQLite 3.45.1 par `@libsql/client`, base en mémoire) :

| Saisie | Résultat |
|---|---|
| `securite`, avec `unicode61 remove_diacritics 2` | trouve « Sécurité » : les accents sont ignorés |
| `interface` | ne trouve pas « interfaces » : il faut chercher par préfixe |
| `sécuriser` | ne trouve pas « sécurité » : un lexique ou une autre méthode est nécessaire |
| `mpecca`, avec le découpage `trigram` | trouve « Impeccable » |
| `foo"` | erreur SQL : une saisie brute ne doit jamais atteindre le moteur |

**Documentation Turso consultée le 2026-11-01 : le point reste ouvert.** Les pages ne sont pas datées et se contredisent. [SQLite Extensions](https://docs.turso.tech/features/sqlite-extensions) donne FTS5 comme toujours disponible. [Full-Text Search](https://docs.turso.tech/sql-reference/functions/fts), [Extensions](https://docs.turso.tech/sql-reference/extensions) et [COMPAT.md](https://github.com/tursodatabase/turso/blob/main/COMPAT.md) le disent non pris en charge par le moteur réécrit en Rust, remplacé par Turso FTS (Tantivy), dont la syntaxe `CREATE INDEX … USING fts` est [marquée expérimentale](https://docs.turso.tech/sql-reference/experimental-features.md). Aucune page ne dit ce qui s'applique à une base hébergée utilisée avec `@libsql/client`. Les colonnes et l'index vectoriels sont documentés sur [AI & Embeddings](https://docs.turso.tech/features/ai-and-embeddings), en contradiction avec [une autre page](https://docs.turso.tech/sql-reference/functions/vector.md). Leur état sur une base hébergée n'est pas établi non plus.

## Décision

1. **Jalon P6**, après les découvertes : la recherche demande un volume de publications et les ressources que P6 apporte. Le périmètre de la V1 ne change pas. Une recherche par mots exacts pourrait avancer en P4 si l'utilisateur le décide (SPEC §11).
2. **On cherche des publications**, pas des fiches. Seules les publications en ligne sont indexées, dans leur dernière révision. Champs : accroche, description, nouveauté, ce que ça permet, pour qui, exemple d'usage, prérequis, produit, catégories, nature, compte. Une mise à jour remonte vers sa publication.
3. **Trois couches, dans cet ordre, en s'arrêtant dès que l'évaluation est atteinte** :
   - index plein texte local, accents ignorés, recherche par préfixe ;
   - lexique versionné de termes proches, en français et en anglais, appliqué à la requête et relu (« sécuriser » → sécurité, security) ;
   - représentations vectorielles, seulement si l'évaluation prouve que les deux premières échouent, avec un nouvel ADR : modèle, coût et stockage y seront chiffrés.
4. **Une seule fonction d'accès** (`rechercher(requete, { tri, curseur })`) : le moteur pourra changer sans toucher au site.
5. **Deux tris** : pertinence par défaut, plus récents au choix.
6. **Saisie maîtrisée** : schéma, longueur maximale, termes échappés, jamais de syntaxe de recherche brute ; pagination par curseur.
7. **Rien de privé** : brouillons, publications retirées, messages privés et groupes privés ne sont jamais indexés. Une requête n'est pas enregistrée avec l'identité de son auteur.
8. **Évaluation** : jeu de requêtes de référence, dont les six de l'utilisateur, chacune avec les publications attendues. Critère proposé : une publication attendue dans les 5 premiers résultats pour au moins 80 % des requêtes.

## Options étudiées

| Option | Pour | Contre | Choix |
|---|---|---|---|
| `LIKE` sur les colonnes | aucun index | lent, sans pertinence, sans termes proches | non |
| FTS5 et lexique | 0 €, explicable, testable, déjà dans SQLite | disponibilité hébergée non établie, ne comprend pas un besoin formulé autrement | **proposé** |
| Turso FTS (Tantivy) | natif du moteur Rust, score BM25 | autre syntaxe, marquée expérimentale, essai local à faire | repli si FTS5 est absent |
| Vecteurs dans libSQL | comprend « repo pour un Jarvis » | modèle d'embedding à choisir et à payer, état hébergé non établi | seulement sur preuve |
| Service externe de recherche | prêt à l'emploi | compte, coût, dépendance, données hors de la base | non |
| Un modèle réécrit chaque requête | bon sur les besoins | coût à chaque recherche, latence, abus possibles | non |

## Compromis

- Le lexique demande de l'entretien et ne couvrira pas tout. « repo pour un Jarvis » peut rester hors de portée sans vecteurs : l'évaluation le dira.
- Le classement par pertinence reste celui du moteur. Il n'est pas un jugement de qualité.
- Reporter en P6 laisse la V1 sans recherche : avec peu de publications, le fil suffit encore.

## Conséquences

- Plus simple : pas de service nouveau, et la recherche profite des champs déjà vérifiés.
- Plus difficile : tenir l'index à jour à chaque révision ou retrait, et garder le même comportement en local et en ligne.
- À revoir : le choix du moteur après l'essai réel, le lexique après l'évaluation.

## Actions

1. [ ] P5 : à la création de la base Turso, créer un index FTS5 et l'interroger. Sinon, essayer Turso FTS, et noter le résultat ici.
2. [ ] P6 : construire `rechercher`, l'index et le lexique ; constituer le jeu de requêtes avec l'utilisateur.
3. [ ] P6 : mesurer, puis décider si une couche vectorielle est nécessaire.
