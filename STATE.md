# État du projet

_Mis à jour le 2026-10-30._

- **Phase** : P1 (collecte fiable) **terminé**. Prochain jalon : P2 (produits, versions, autres sources officielles, maquette autour de la mascotte) — plan à présenter.
- **Dépôt** : git initialisé, **aucun commit encore** (en attente d'accord de l'utilisateur).
- **Base locale** : `data/curation.db` contient l'essai réel (5 releases de Claude Code, 2 exécutions « live »). Ne pas y lancer de collecte en mode fixture.
- **Blocages** : aucun.
- **Dépenses** : 0 €. Aucun compte créé. Crédits API Max 5x non activés (prévu en P3, avec accord).

## En attente de l'utilisateur

1. Fichier de la mascotte dans `assets/brand/` (et confirmation des droits d'usage) — avant P2.
2. Validation du plan de P2 — avant implémentation.
3. Budget plafond (IA, hébergement, domaine) et plafond de coût par exécution — avant P3.

## Dernière vérification (2026-10-30, 01:27 UTC)

- `npm run typecheck` : OK. `npm test` : 90 tests réussis.
- Essai réel : 5 documents réels, seconde collecte sans doublon, pause respectée.
- Poste : le cache npm `~/.npm` appartient à un autre utilisateur → installer avec `npm ci --cache .npm-cache` (ou corriger les droits soi-même).
- `npm audit` : 4 alertes « moderate » sur `esbuild` embarqué par `drizzle-kit` (outil de développement, non livré) ; laissées en l'état.

## Prochaine action

Plan de P2 et estimation jusqu'à la V1 présentés (ROADMAP.md) : attendre la validation de l'utilisateur, puis commencer par le premier commit git (étape 0 de P2).

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git status && npm test && npm run status
```

Puis suivre la procédure de reprise de CLAUDE.md.
