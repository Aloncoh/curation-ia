# Skills : disponibilité et usage

> Les skills servent à **développer** le projet ; ce ne sont pas les agents exécutés par le site. Inventaire vérifié le 2026-10-30.

## Disponibilité

Les 15 skills vus dans la galerie claude.ai (Customize > Skills) sont synchronisés sur le poste (`~/.claude/skills/synced/…` et `~/.claude/plugins/synced/…`, plugins `product-management` et `engineering`) et chargés dans les sessions Claude Code avec un nom préfixé. Aucun skill n'est défini dans le dépôt.

Également installés localement : les plugins `ecc` (dont le hook GateGuard), `ui-ux-pro-max`, `chrome-devtools-mcp`, `watch`, et une trentaine de skills de design dans `~/.claude/skills`.

Doublons à éviter : trois skills de relecture de code (`engineering:code-review`, `ecc:code-review`, `/code-review` intégré) ; deux pour l'architecture (`engineering:architecture`, `ecc:architecture-decision-records`). Par défaut, les versions de la galerie.

## Usage réel

| Skill | Étape | Usage |
|---|---|---|
| `product-management:write-spec` | P0 | consignes lues ; structure des questions de cadrage et de SPEC.md |
| `engineering:system-design` | P0 | consignes lues ; structure de la synthèse d'architecture |
| `engineering:architecture` | P0, P1, P3 | consignes lues ; format des ADR 0001 et 0002 (ADR 0003 en P2 : même structure reprise de l'ADR 0002, skill non rechargé) ; rechargé le 2026-11-01 pour l'ADR 0008 |
| `claude-api` | P0, P3 | chargé ; référence officielle des modèles et des tarifs ; rechargé le 2026-11-01 pour la comparaison de modèles (identifiants, cache, sorties structurées) |
| `engineering:testing-strategy` | P1 | consignes lues ; choix des tests du collecteur |
| `workflow-authoring` | P0, P1, P2 | chargé ; recherches et relectures par agents contre-vérifiés (P2 : relecture adversariale à 3 axes + complétude, puis contre-relecture des corrections ; reprise du 2026-10-30 : contre-vérification des 6 thèmes de recherche sur les sources, relecture adversariale à 5 angles de la maquette sociale) |
| `artifact-capabilities` | P3 | chargé ; page de revue où l'utilisateur corrige les exemples de sélection |
| `frontend-design` | P2, P3 | chargé lors de la première maquette, puis pour les gabarits de montage ; élément signature : étiquettes cousues reliées par un fil ; démarche de conception (jetons tirés de la mascotte, élément signature, typographie, états). Non rechargé pour la maquette sociale : mêmes jetons et mêmes principes repris |

## Prévu, pas encore utilisé

| Skill | Étape prévue |
|---|---|
| `product-management:roadmap-update`, `product-management:sprint-planning` | mises à jour de ROADMAP.md si le découpage change |
| `engineering:documentation` | README et documents techniques à partir de P4 |
| `engineering:code-review`, `engineering:debug` | relectures et diagnostics ciblés |
| `engineering:deploy-checklist` | mise en ligne (P5) |
| `anthropic-skills:skill-creator`, `anthropic-skills:mcp-builder` | seulement si un besoin concret apparaît |
