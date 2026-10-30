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
| `engineering:architecture` | P0, P1 | consignes lues ; format des ADR 0001 et 0002 (ADR 0003 en P2 : même structure reprise de l'ADR 0002, skill non rechargé) |
| `claude-api` | P0 | chargé ; référence officielle des modèles et des tarifs |
| `engineering:testing-strategy` | P1 | consignes lues ; choix des tests du collecteur |
| `workflow-authoring` | P0, P1, P2 | chargé ; recherches et relectures par agents contre-vérifiés (P2 : relecture adversariale à 3 axes + complétude, puis contre-relecture des corrections) |
| `frontend-design` | P2 | chargé ; démarche de conception de la maquette (jetons tirés de la mascotte, élément signature, typographie, états) |

## Prévu, pas encore utilisé

| Skill | Étape prévue |
|---|---|
| `product-management:roadmap-update`, `product-management:sprint-planning` | mises à jour de ROADMAP.md si le découpage change |
| `engineering:documentation` | README et documents techniques à partir de P4 |
| `engineering:code-review`, `engineering:debug` | relectures et diagnostics ciblés |
| `engineering:deploy-checklist` | mise en ligne (P5) |
| `anthropic-skills:skill-creator`, `anthropic-skills:mcp-builder` | seulement si un besoin concret apparaît |
