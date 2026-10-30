# CURATION AI

Moteur de curation participative de l'IA, en français : un fil alimenté automatiquement par une collecte sourcée, des analyses IA vérifiables, puis des contributions humaines. Périmètre : [SPEC.md](SPEC.md) · jalons : [ROADMAP.md](ROADMAP.md) · état : [STATE.md](STATE.md) · architecture : [docs/architecture.md](docs/architecture.md) · comprendre et présenter le projet : [communication/COMPRENDRE_LE_PROJET.md](communication/COMPRENDRE_LE_PROJET.md).

**État actuel (P1)** : collecte fiable d'une source officielle (releases GitHub de Claude Code), stockage durable avec provenance, export JSON. Pas encore d'interface ni d'IA.

## Prérequis

- Node.js 24.12 ou plus récent (exécution directe des fichiers `.ts`).
- Aucun compte ni clé : l'API GitHub publique est utilisée sans authentification (60 requêtes par heure).

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
| `npm run pause` / `npm run resume` | bloque ou rétablit les nouveaux jobs |
| `npm test` | tests sur fixtures, sans réseau |
| `npm run typecheck` | vérification des types (TypeScript 7) |

**Mode fixture** (démonstration hors ligne, tests) : `CURATION_FIXTURE=tests/fixtures/github-releases-claude-code.json npm run collect`. Les exécutions sont alors tracées en mode « fixture » et ne doivent jamais être présentées comme une collecte réelle.

Autres réglages (facultatifs) : `CURATION_LEASE_MS`, `CURATION_MAX_ATTEMPTS`, `CURATION_RETRY_BACKOFF_MS`, `CURATION_FETCH_TIMEOUT_MS`, `CURATION_MAX_RESPONSE_BYTES`, `CURATION_DB_BUSY_TIMEOUT_MS` (voir `src/config.ts`).

## Organisation

```
src/
  collect/     récupération sécurisée, source GitHub, normalisation, enregistrement
  jobs/        file de jobs à bail, traces d'exécution
  worker/      orchestration d'une collecte
  control/     pause
  db/          schéma, client, migrations, nouvelle tentative sur verrou
  export/      export JSON
  cli/         commandes npm
drizzle/       migrations SQL versionnées
tests/         tests Vitest et fixtures
docs/          architecture, décisions (ADR), skills
communication/ livrable de compréhension et de présentation
```

## Dépannage

Si `npm ci` échoue avec une erreur de droits sur `~/.npm`, le cache npm du poste appartient à un autre utilisateur. Contournement sans changer le système : `npm ci --cache .npm-cache` (dossier à supprimer ensuite).
