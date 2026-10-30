# CURATION AI

Moteur de curation participative de l'IA, en français : un fil alimenté automatiquement par une collecte sourcée, des analyses IA vérifiables, puis des contributions humaines. Périmètre : [SPEC.md](SPEC.md) · jalons : [ROADMAP.md](ROADMAP.md) · état : [STATE.md](STATE.md) · architecture : [docs/architecture.md](docs/architecture.md) · comprendre et présenter le projet : [communication/COMPRENDRE_LE_PROJET.md](communication/COMPRENDRE_LE_PROJET.md).

**État actuel (P2, en cours)** : collecte fiable de 5 sources officielles (releases GitHub de Claude Code, Codex CLI et Gemini CLI ; flux RSS d'OpenAI News et du GitHub Changelog), catalogue déterministe de produits, versions et actualités, export JSON et maquette statique du fil autour de la mascotte. Pas encore d'IA ni de site en ligne.

## Prérequis

- Node.js 24.12 ou plus récent (exécution directe des fichiers `.ts`).
- Aucun compte ni clé : l'API GitHub publique est utilisée sans authentification (60 requêtes par heure) ; les flux RSS sont publics.

## Installation

```bash
npm ci
npm run db:migrate
```

La base locale est créée dans `data/curation.db` (non versionnée). Variable optionnelle : `DATABASE_URL` (par défaut `file:data/curation.db`), à placer dans `.env.local` si besoin.

## Commandes

| Commande | Effet |
|---|---|
| `npm run db:migrate` | crée ou met à jour les tables |
| `npm run collect` | collecte les sources actives (mode réel) |
| `npm run status` | pause, volumes, sources, dernières exécutions |
| `npm run export` | écrit `exports/source-documents.json`, lisible |
| `npm run maquette` | écrit `maquette/donnees.js` à partir de la base (actualités issues de collectes réelles seulement) ; l'ouvrir ensuite dans un navigateur, par exemple via `python3 -m http.server 4173` puis `http://127.0.0.1:4173/maquette/` (méthode vérifiée) |
| `npm run pause` / `npm run resume` | bloque ou rétablit les nouveaux jobs |
| `npm test` | tests sur fixtures, sans réseau |
| `npm run typecheck` | vérification des types (TypeScript 7) |

**Restreindre la collecte** : `CURATION_ONLY_SOURCES=github-releases:anthropics/claude-code,feed:openai-news npm run collect` (identifiants dans `src/sources.ts`).

**Mode fixture** (démonstration hors ligne, tests) : `CURATION_FIXTURE=tests/fixtures/github-releases-claude-code.json CURATION_ONLY_SOURCES=github-releases:anthropics/claude-code npm run collect`. Une seule source est acceptée (le fichier serait sinon servi à toutes). Les exécutions sont tracées en mode « fixture », ne doivent jamais être présentées comme une collecte réelle, et la maquette les écarte.

Autres réglages (facultatifs) : `CURATION_LEASE_MS`, `CURATION_MAX_ATTEMPTS`, `CURATION_RETRY_BACKOFF_MS`, `CURATION_FETCH_TIMEOUT_MS`, `CURATION_MAX_RESPONSE_BYTES`, `CURATION_DB_BUSY_TIMEOUT_MS` (voir `src/config.ts`).

## Organisation

```
src/
  collect/     récupération sécurisée, releases GitHub, flux RSS/Atom, normalisation, enregistrement
  catalog/     rattachement aux produits, versions et actualités (ADR 0003)
  maquette/    données de la maquette statique
  jobs/        file de jobs à bail, traces d'exécution
  worker/      orchestration d'une collecte
  control/     pause
  db/          schéma, client, migrations, nouvelle tentative sur verrou
  export/      export JSON
  cli/         commandes npm
drizzle/       migrations SQL versionnées
maquette/      maquette statique du fil et de la page de détail (P2)
assets/brand/  mascotte fournie par l'utilisateur et ses variantes
tests/         tests Vitest et fixtures
docs/          architecture, décisions (ADR), skills
communication/ livrable de compréhension et de présentation
```

## Dépannage

Si `npm ci` échoue avec une erreur de droits sur `~/.npm`, le cache npm du poste appartient à un autre utilisateur. Contournement sans changer le système : `npm ci --cache .npm-cache` (dossier à supprimer ensuite).
