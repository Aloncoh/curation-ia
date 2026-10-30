# ADR-0002 : SQLite via libSQL en local, Turso en ligne, sans WAL en local

**Statut :** Acceptée
**Date :** 2026-10-30
**Décideurs :** Claude (proposé lors du cadrage et validé avec la stack par l'utilisateur ; choix du mode de journalisation pris en P1)

## Contexte

Il faut une base relationnelle durable, utilisable sans installation (ni Docker, ni Homebrew, ni PostgreSQL sur le poste), gratuite au départ, accessible plus tard depuis un worker planifié (GitHub Actions) et un site (Vercel). P1 exige que deux collecteurs lancés en même temps ne traitent jamais le même job.

## Décision

- **SQLite** en fichier local (`data/curation.db`) via **`@libsql/client`**, et **Turso** en ligne (P5) avec le même code : seule l'URL change.
- **Drizzle ORM 0.45.4** (version stable) pour le schéma typé, et migrations SQL versionnées générées par drizzle-kit (`drizzle/`).
- **Pas de mode WAL en local** : le moteur SQLite embarqué par libSQL est en version **3.45.1** (mesuré le 2026-10-30 avec `select sqlite_version()`), dans la plage concernée par un bug rare de réinitialisation du WAL quand plusieurs connexions écrivent en même temps (3.7.0 à 3.51.2 selon sqlite.org/wal.html). La base reste dans le mode de journalisation par défaut (rollback journal), qui n'a pas ce défaut.
- **Concurrence** : attente sur verrou de 5 s sur chaque connexion (option `timeout` du client) et nouvelle tentative applicative sur `SQLITE_BUSY` ; réservation d'un job par une seule instruction `UPDATE … RETURNING` (qui vérifie aussi la pause) ; au plus un job actif par source grâce à un index unique partiel ; chaque changement d'état d'une exécution écrit dans une seule transaction.
- **Réouverture des connexions avant chaque nouvelle tentative** : constat de la relecture adversariale de P1, reproduit puis couvert par un test — après un `SQLITE_BUSY`, libSQL 0.5.29 laisse l'instruction échouée active sur sa connexion ; réessayer sur cette connexion produit des écritures jamais validées ou un `COMMIT` refusé. `client.reconnect()` avant la nouvelle tentative règle le problème (le worker n'exécute qu'une opération à la fois sur son client).

## Options étudiées

### Option A : SQLite/libSQL en local → Turso (retenue)
| Dimension | Évaluation |
|---|---|
| Complexité | faible : un fichier, aucun serveur, un seul dialecte SQL du local à la production |
| Coût | 0 € (Turso Free : 5 Go, relevé le 2026-10-30) |
| Concurrence | un seul écrivain à la fois, suffisant pour quelques collectes par jour |
| Inspection | fichier lisible avec n'importe quel outil SQLite |

### Option B : PostgreSQL en local → Neon
| Dimension | Évaluation |
|---|---|
| Complexité | moyenne : installation manuelle nécessaire sur ce poste |
| Coût | 0 € (Neon Free) |
| Concurrence | verrous par ligne (`FOR UPDATE SKIP LOCKED`) |
| Inspection | outil client à installer |

### Option C : PGlite (PostgreSQL embarqué)
Écartée : une seule connexion par dossier de données, donc impossible de tester deux collecteurs dans deux processus.

## Compromis

PostgreSQL est plus standard et offre des verrous par ligne, mais impose une installation ou un compte dès P1. Passer plus tard de SQLite à PostgreSQL demanderait de réécrire le schéma Drizzle (dialecte différent) et les requêtes spécifiques (réservation des jobs) : coût connu et accepté.

## Vérification (P1)

- Test « 300 jobs réservés par deux processus en parallèle » : aucun job réservé deux fois.
- Test « deux collecteurs lancés en même temps » : une seule exécution traite le job.
- Test « processus tué puis relancé » : ni perte ni doublon.
- Test « processus tué pendant l'enregistrement » : rien n'est à moitié écrit.
- Test « verrou tenu plus longtemps que le délai d'attente » : écriture validée et aucun verrou résiduel (échoue sans la réouverture des connexions).
- Ces tests ont réussi 5 fois de suite le 2026-10-30 (90 tests au total). La bascule prévue vers `better-sqlite3` n'a pas été nécessaire.

## Conséquences

- Plus simple : aucune installation, base portable, tests rapides sur bases temporaires.
- Plus difficile : un seul écrivain à la fois ; ne pas ouvrir la base en WAL avec un autre outil pendant une collecte.
- À revoir : version du moteur libSQL (si ≥ 3.51.3, le WAL redevient possible) ; comportement de Turso distant en P5 ; passage à Drizzle v1 quand il sera stable.
