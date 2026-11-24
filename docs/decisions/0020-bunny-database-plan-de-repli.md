# ADR-0020 : Bunny Database comme hébergeur de repli pour la base — préparation, sans bascule

**Statut :** proposée. La préparation est demandée par l'utilisateur le 2026-11-22 (« Prépare Bunny ») ; la bascule elle-même reste à décider, après un essai réel.
**Date :** 2026-11-22
**Décideurs :** l'utilisateur (compte, dépense, bascule), Claude (préparation, essais)

## Contexte

La base en ligne est chez Turso, sur l'offre gratuite. Depuis le 2026-11-19, son quota de lignes lues est épuisé : le site n'affiche plus rien et la chaîne est à l'arrêt ([docs/lectures-turso.md](../lectures-turso.md), [ADR 0019](0019-lectures-de-la-base.md)). L'utilisateur a refusé l'offre payante de Turso, puis demandé s'il existait autre chose.

Le code parle à la base par le client `@libsql/client` (version 0.18.0) et Drizzle, en dialecte SQLite. Tout hébergeur qui n'accepte pas ce client impose une réécriture : 30 tables, des requêtes SQL écrites à la main dans toute la chaîne, plus de 900 tests.

## Ce que la documentation de Bunny Database dit (lue le 2026-11-22 sur bunny.net)

- **Même client.** La page TypeScript installe `@libsql/client` ; l'adresse a la forme `libsql://[identifiant].lite.bunnydb.net`, le jeton passe par `authToken`. Deux types de jetons : « Full Access » et « Read Only ».
- **Préversion publique.** « While in public preview, Bunny Database is free. » et « Features and APIs may evolve during this period ». La date de fin de préversion n'est pas indiquée.
- **Prix annoncés ensuite.** Lectures : « $0.30 per billion rows » ; écritures : « $0.30 per million rows » ; stockage : « $0.10 per GB per active region (monthly) ». Aucune franchise gratuite n'est indiquée. La façon de compter une ligne lue n'est pas documentée.
- **Limites.** 1 Go par base et 50 bases par compte, « can be raised upon request ». Une transaction interactive verrouille les écritures « with a 5-second timeout ».
- **SQL refusé.** `CREATE TEMP TABLE`, `ATTACH DATABASE`, `VACUUM`, `ANALYZE`, les chaînes entre guillemets doubles, `ORDER BY` dans `group_concat()`, les fonctions de SQLite 3.46 et suivantes.
- **Réplication asynchrone.** « a read on a different connection… may not observe a recent write yet ». Trois modes à la création : automatique, région unique, manuel.
- **Import.** Aucun guide d'import ni de migration depuis Turso. L'outil en ligne de commande exécute un fichier SQL et sait exporter (`.dump`).
- **Non indiqué :** déclencheurs, index partiels, limites de débit, exigence d'une carte bancaire pour créer une base.

## Ce que notre code exige

Relevé dans le dépôt le 2026-11-22 :

- 11 transactions interactives d'écriture (`client.transaction('write')`), 10 transactions Drizzle, 9 lots (`batch`) ;
- une table de recherche plein texte FTS5 (`recherche_publication`) ;
- des index uniques partiels, des contraintes `CHECK`, des insertions `ON CONFLICT … WHERE` avec `RETURNING` ;
- aucun déclencheur, aucun `VACUUM`, `ATTACH` ni table temporaire ; SQLite local en version 3.45.1.

Rien, dans ce relevé, ne figure dans la liste de ce que Bunny refuse. Trois points restent à constater sur une vraie base, parce que la documentation ne les tranche pas : les index partiels, la durée d'une transaction de collecte face à la limite de 5 secondes, et la lecture après écriture d'une étape de la chaîne à la suivante.

## Décision

Préparer la bascule, sans la faire.

1. **Un essai de compatibilité**, `npm run base:essai` (`src/db/essai-compat.ts`). Sur une base vide, il applique les migrations du projet, puis vérifie les index partiels, les contraintes, la recherche FTS5, les transactions interactives, les lots, une transaction gardée ouverte 6 secondes, la lecture après écriture depuis une autre connexion, et les délais. Il refuse la base du projet et toute base contenant des publications.
2. **La copie accepte une source distante** (`CURATION_SOURCE_AUTH_TOKEN` dans `npm run turso:copier`), pour copier un jour de Turso vers Bunny.
3. **La bascule n'a lieu que si** l'essai passe sur une vraie base Bunny, si les données de Turso peuvent être relues, et si l'utilisateur la décide.

## Options envisagées

| Option | Coût | Code à changer | Verdict |
|---|---|---|---|
| Rester sur Turso gratuit, lectures réduites (ADR 0019) | aucun | fait | solution de référence ; quota par mois calendaire |
| Turso payant | 4,99 $ par mois | aucun | refusé par l'utilisateur ; seule voie immédiate |
| **Bunny Database** | gratuit en préversion, puis à l'usage | aucun en principe, à prouver par l'essai | **repli retenu** |
| Serveur libSQL hébergé soi-même | location d'un serveur | aucun | plus cher que Turso payant, à administrer |
| Cloudflare D1 | gratuit, 5 millions de lignes lues par jour | à adapter | quota plus petit que celui de Turso |
| Postgres (Supabase, Neon) | gratuit, sans quota de lignes lues affiché | réécriture complète | écarté : plusieurs jours, risqué |

## Compromis

- **Une préversion.** Bunny peut changer ses interfaces et n'annonce pas la fin de la gratuité. Turso reste donc intact et rebranchable pendant toute la période d'essai.
- **Les écritures coûtent mille fois plus que les lectures**, à la ligne. Nos écritures mensuelles ne sont pas mesurées : à relever pendant l'essai avant toute décision.
- **Les données sont chez Turso.** Tant que ses lectures sont bloquées, on ne peut pas les copier. Basculer avant leur réouverture ferait repartir le site depuis la base locale, sans les posts publiés en ligne.
- **Limite de 5 secondes.** La collecte d'une source tient dans une seule transaction, d'une centaine de requêtes. Si l'essai la mesure au-delà, il faudra la découper avant de basculer.
- **Réplication.** Choisir le mode « région unique » à la création, pour qu'une étape de la chaîne relise toujours ce que la précédente a écrit.

## Marche à suivre

Ce que seul l'utilisateur fait (compte, clés, dépense) :

1. Créer un compte sur bunny.net.
2. Créer une base en mode **région unique**, proche de la région des fonctions Vercel du site.
3. Créer un jeton « Full Access ».
4. Dans `.env.local`, saisir `ESSAI_DATABASE_URL` (l'adresse `libsql://…lite.bunnydb.net`) et `ESSAI_DATABASE_AUTH_TOKEN`.

Ce que Claude fait ensuite :

5. Lancer `npm run base:essai -- --confirmer` et consigner la sortie brute.
6. Si l'essai passe et que Turso est de nouveau lisible : copier Turso vers Bunny avec `npm run turso:copier`, comparer les nombres de lignes table par table, puis essayer en local, branché sur Bunny, `npm run etat`, une collecte réelle de deux sources et le site.
7. Proposer la bascule : chaîne en pause, dernière copie, puis l'utilisateur remplace `DATABASE_URL` et `DATABASE_AUTH_TOKEN` chez Vercel, dans les secrets GitHub et dans `.env.local`.
8. Retour arrière : remettre les deux valeurs de Turso. La base Turso n'est ni vidée ni supprimée.

## Conséquences

- Le projet garde un seul dialecte et un seul client, quel que soit l'hébergeur.
- L'essai de compatibilité sert à tout hébergeur libSQL, pas seulement à Bunny.
- Rien n'est basculé : sans compte Bunny, la compatibilité réelle reste une hypothèse.

## Actions

1. [x] Essai de compatibilité, testé sur une base locale vide.
2. [x] Copie depuis une source distante.
3. [ ] Compte, base et jeton Bunny : l'utilisateur.
4. [ ] Essai réel sur Bunny, sortie brute consignée.
5. [ ] Copie de Turso vers Bunny, quand Turso est lisible.
6. [ ] Décision de bascule : l'utilisateur.
