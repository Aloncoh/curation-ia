# État du projet

_Mis à jour le 2026-10-30 (P2 : tout est fait sauf la validation de la maquette)._

- **Phase** : P1 terminé. **P2 en cours** : code, tests, relectures, essai réel et maquette faits ; **reste la validation de la maquette par l'utilisateur** (critère de sortie), puis le commit.
- **Dépôt** : dernier commit `P2 (en cours)` (341eb3b) ; tout P2 est commité (`3a13b0f`).
- **Base locale** `data/curation.db` : migrations 0000–0002 appliquées ; essai réel de P2 (5 sources, 70 documents, 44 actualités). Copie d'avant migration dans le dossier temporaire de la séance (non conservée).
- **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## P2 — fait (détail dans PROGRESS.md)

- 5 sources réelles collectées sans doublon (seconde collecte : 0 nouveau) ; catalogue produits / versions / actualités ([ADR 0003](docs/decisions/0003-identite-produits-versions-actualites.md)).
- Deux relectures par agents, tous les constats traités ; **150 tests** réussis, types OK.
- Maquette : `maquette/index.html` (données : `npm run maquette`), autour de la mascotte (`assets/brand/`). Preuves et captures : `communication/linkedin/03-catalogue/preuves/brut/`.
- Documents à jour : README, docs/architecture.md, docs/skills.md, ROADMAP (critère P4 d'assainissement, intervalle des sources en P5), COMPRENDRE_LE_PROJET.md, brouillon LinkedIn 03.

## En attente de l'utilisateur

1. **Validation de la maquette** (fil, fiche détail, états ; téléphone et ordinateur) — ou liste de changements souhaités.
2. **Droits d'usage de la mascotte** (avant toute publication, P5) et, si possible, une version haute définition ou vectorielle.
3. Changements de maquette : l'utilisateur les donnera après la remise à zéro de la conversation.
4. Budget plafond (IA, hébergement, domaine) et plafond de coût par exécution — avant P3.

## Repères techniques

- Installation sur ce poste : le cache npm `~/.npm` appartient à un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard (plugin ECC) refuse la première création ou modification de chaque fichier : donner les informations demandées puis relancer.
- L'outil d'édition a converti des séquences `\u…` en caractères invisibles dans une expression régulière : préférer les classes Unicode (`\p{…}`) et vérifier l'absence de caractères de contrôle littéraux.
- Voir la maquette dans le navigateur intégré : configuration `maquette` de `.claude/launch.json` (serveur local 127.0.0.1:4173), puis `/maquette/index.html`. Dans un navigateur classique, ouvrir directement `maquette/index.html` devrait suffire (non vérifié : seul le navigateur intégré, via ce serveur local, a servi aux essais).
- `npm audit` : 4 alertes « moderate » sur `esbuild` embarqué par `drizzle-kit` (outil de développement, non livré).

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```

Puis suivre la procédure de reprise de CLAUDE.md : redemander la validation de la maquette (et le commit s'il n'a pas été fait) avant de préparer le plan de P3.
