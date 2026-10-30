# État du projet

_Mis à jour le 2026-10-30 (P2 en cours, avant remise à zéro de la conversation)._

- **Phase** : P1 terminé. **P2 en cours** (plan validé par l'utilisateur le 2026-10-30, voir ROADMAP.md).
- **Dépôt** : commits `P0–P1` puis `P2 (en cours)`. Base locale `data/curation.db` : essai réel de P1 (5 releases Claude Code), migration 0001 **pas encore appliquée** sur cette base.
- **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## P2 — fait

- Sources configurées (`src/sources.ts`) : releases GitHub de Claude Code (10), Codex CLI (20), Gemini CLI (20) ; flux RSS OpenAI News et GitHub Changelog (20 entrées max chacun). Vérifiées en réel le 2026-10-30 (HTTP 200, sans redirection).
- Lecteur de flux (`src/collect/feeds.ts`, `@rowanmanning/feed-parser` 2.1.5) : identité d'une entrée = lien normalisé (le guid du GitHub Changelog diffère parfois du lien), entrées les plus récentes, flux vide ou illisible = panne.
- Catalogue (`src/catalog/link.ts`, migration `drizzle/0001_catalog.sql`) : tables `product`, `product_version`, `news_item`, `news_item_document`, `news_item_target`. Règles : produit = clé canonique déclarée par la source ; version = (produit, numéro normalisé) ; release stable → actualité « version » ; préversion → version sans actualité (actualité créée si elle devient stable) ; entrée de flux → actualité « annonce » sans produit ; un document = source principale d'au plus une actualité ; une republication ne change pas la date de l'actualité.
- `CURATION_ONLY_SOURCES` (liste d'identifiants) pour restreindre la collecte ; statut et export enrichis (produits, versions, actualités).
- Fixtures réelles ajoutées (`tests/fixtures/`), tests `feeds.test.ts` et `catalog.test.ts` : **108 tests réussis**, vérification des types OK.

## P2 — reste à faire (dans cet ordre)

1. ADR 0003 : identité des produits, versions et actualités (règles ci-dessus, préversions sans actualité, identité des entrées de flux par le lien).
2. Relecture adversariale du code P2 (workflow : correction/concurrence, sécurité du lecteur de flux, tests face aux critères), puis corrections.
3. Essai réel sur les 5 sources : `npm run db:migrate`, `npm run collect` ×2 (seconde sans doublon), `npm run export`, `npm run status` ; preuves dans `communication/linkedin/03-catalogue/preuves/brut/` (contenus réduits à un extrait).
4. Maquette du fil et de la page de détail autour de la mascotte — **le fichier de la mascotte n'est pas encore dans `assets/brand/`** : le redemander à l'utilisateur.
5. Documents : docs/architecture.md (catalogue), README (sources, `CURATION_ONLY_SOURCES`), COMPRENDRE_LE_PROJET.md (produits, versions, actualités), brouillon LinkedIn 03, PROGRESS.md, ROADMAP.md (P2 réalisé), puis commit.

## En attente de l'utilisateur

1. Fichier de la mascotte dans `assets/brand/` (et confirmation des droits d'usage) — pour la maquette de P2.
2. Budget plafond (IA, hébergement, domaine) et plafond de coût par exécution — avant P3.

## Repères techniques

- Installation sur ce poste : le cache npm `~/.npm` appartient à un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard (plugin ECC) refuse la première tentative de création de chaque fichier : donner les informations demandées puis relancer.
- `npm audit` : 4 alertes « moderate » sur `esbuild` embarqué par `drizzle-kit` (outil de développement, non livré).

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```

Puis suivre la procédure de reprise de CLAUDE.md et reprendre « P2 — reste à faire », étape 1.
