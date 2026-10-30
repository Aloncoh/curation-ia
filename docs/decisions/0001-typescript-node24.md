# ADR-0001 : TypeScript partout, scripts exécutés directement par Node 24

**Statut :** Acceptée
**Date :** 2026-10-30
**Décideurs :** l'utilisateur (option 1 choisie lors du cadrage), Claude (détails d'outillage)

## Contexte

Le produit comprend un worker (collecte, analyse, publication) et un site. L'utilisateur n'écrit pas de code et veut une architecture simple et maintenable ; le brief demandait de comparer une solution majoritairement TypeScript et une solution avec un worker Python, sans mélanger les langages sans besoin concret.

## Décision

- TypeScript pour tout le projet ; Python seulement si un bénéfice concret est démontré (nouvel ADR).
- Le worker est un ensemble de scripts `.ts` exécutés **directement** par Node 24 grâce au retrait natif des types (stable depuis Node 24.12) : pas d'étape de compilation. Contraintes : pas d'`enum`, pas de propriétés de paramètres, imports avec extension `.ts`, `import type` pour les types (`erasableSyntaxOnly`, `verbatimModuleSyntax`).
- Vérification des types par TypeScript 7.0.2 (`npm run typecheck`).
- Site prévu en Next.js 16 (P4).

## Options étudiées

### Option A : TypeScript partout (retenue)
| Dimension | Évaluation |
|---|---|
| Complexité | faible : un langage, un gestionnaire de paquets, des schémas partagés entre worker et site |
| Coût | nul |
| Déploiement | simple sur les plateformes JavaScript (Vercel) et GitHub Actions |
| Apprentissage | un seul écosystème à expliquer |

### Option B : site TypeScript + worker Python
| Dimension | Évaluation |
|---|---|
| Complexité | moyenne : deux langages, deux chaînes d'outils, schémas à dupliquer |
| Coût | nul |
| Déploiement | deux cibles |
| Apprentissage | Python plus familier pour un profil data, mais l'utilisateur ne code pas |

## Compromis

Python offre de bonnes bibliothèques data, mais aucune n'est nécessaire à la collecte par API ni aux appels au modèle (SDK officiel Anthropic disponible en TypeScript). Le gain ne compense pas la duplication.

## Conséquences

- Plus simple : un seul `package.json`, des types communs, des tests Vitest pour tout.
- Plus difficile : TypeScript 7 n'a pas encore d'API de programmation ; `typescript-eslint` ne le prend pas en charge (versions < 6.1) → pas de linter typé pour l'instant.
- À revoir : passage à TypeScript 7.1 (API annoncée) ; compatibilité Next.js 16 au moment de P4.
