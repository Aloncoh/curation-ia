# État du projet

_Nettoyé le 2026-11-05 à la demande de l'utilisateur : seul l'état actuel reste ici. L'historique détaillé est dans PROGRESS.md, et la version complète précédente de ce fichier dans git (`git show 9e83d6b:STATE.md`)._

## En bref

- **Site en ligne** : https://web-phi-nine-38.vercel.app (Vercel, projet `web`, racine `apps/web`). Base **Turso `curation-ia`** (aws-eu-west-1) : elle fait foi ; la base locale `data/curation.db` ne reflète pas les publications.
- **Chaîne automatique** : GitHub Actions (`.github/workflows/chaine.yml`), cron `7 * * * *`, active (`CHAINE_ACTIVE` = `oui`). Collecte, approfondissement (capture des pages), brouillons, contrôles avec élagage, relance, planification, découverte (toutes les 6 heures), traduction, publication. **Elle publie seule**, sans relecture, ce qui passe tous les contrôles (SPEC, décision du 2026-11-05).
- **Jalons** : P0 à P2 réalisés ; P3 ouvert (critères d'évaluation non atteints) ; P4 réalisé ; P5 en ligne, reste à clore (délai de bout en bout mesuré sur des publications nées en ligne, domaine, démonstration) ; **P6 en cours**, blocs 1 à 5 réalisés.
- **Dépôt** : `git@github.com:Aloncoh/curation-ia.git`, privé ; travail sur `p3-brouillons`, envoyé par `git push origin HEAD:main`. Tests : 824 au vert (2026-11-05).

## Publications en ligne (relevé du 2026-11-05, base Turso)

| Compte | Rôle | Publiées | À vérifier |
|---|---|---|---|
| Repo | GitHub, open source, skills, MCP | 30 | 0 |
| Mova | création, design, vidéo, 3D, musique | 12 | 1 |
| Nodi | modèles et assistants IA | 9 | 7 |
| Pyxo | outils de code, bibliothèques, agents | 6 | 7 |
| Pulse | exploitation, fiabilité, données, incidents | 2 | 11 |
| Radar | big tech liée à l'IA (décision du 2026-11-05) | 1 | 0 |

102 sources en base. 25 publications le 2026-11-05 sur un plafond de 50 par jour.

## Budget (DeepSeek Flash)

- Autorisé par l'utilisateur : **4 $ au total**. Dépensé et enregistré : **0,789 $** (dont 0,259 $ le 2026-11-05), plus 0,0099 $ de traduction de ressources du 2026-11-03 hors base.
- Plafonds de la chaîne en ligne (relevés le 2026-11-05 avec l'accord de l'utilisateur) : 0,10 $ par cycle, 0,40 $ par jour, 3,95 $ au total. Rythme observé : 0,25 à 0,40 $ par jour ; prévenir l'utilisateur avant d'approcher des 4 $.

## Fait récemment (2026-11-05)

- **Publication automatique** : élagage des champs secondaires en écart, puis relance par le modèle (10 brouillons par lot, une fois chacun), gardée seulement si tous les contrôles passent. Le reste demeure « à vérifier ».
- **Radar** : sources big tech (officielles et presse attribuée : TechCrunch, The Verge) ; consignes `s5`, big tech seulement quand le sujet touche l'IA ; premier post publié (XREAL AURA, relu par l'utilisateur).
- **Pulse** : six sources officielles (Cloudflare, Databricks, AWS ML, GitHub Engineering, états de Claude et d'OpenAI).
- **Couvertures** : 18 fonds de l'utilisateur, vrais logos en couleur (svgl, simple-icons), flèches façon miniature YouTube.
- **P6** : bloc 3, registre officiel MCP (Repo) et modèles en tendance de Hugging Face (Nodi) ; bloc 4, recherche évaluée de 54 % à 94 % (jeu `r1`), sans couche vectorielle (ADR 0008) ; bloc 5, avis de validité (version plus récente publiée, source mise à jour après le post), poussé, **déploiement Vercel à confirmer**.

## En attente de l'utilisateur

1. **Régénérer le jeton Turso** : il a été affiché par erreur dans la trace d'une commande le 2026-11-05 (ni fichier ni git). Après régénération : mettre à jour `.env.local` (lignes commentées), le secret GitHub `TURSO_AUTH_TOKEN` et la variable Vercel `DATABASE_AUTH_TOKEN`.
2. **Recherche** : relire le jeu `r1` (`src/recherche/reference.ts`) et donner un second jeu de requêtes non vu (le lexique a été réglé sur `r1`).
3. **Usage « construire »** : liste témoin de bonnes découvertes (SPEC §10).
4. **Domaine** du site (décision et dépense) ; démonstration V1.
5. **Sources** : X, Reddit, conditions restrictives (`docs/sources.md` §8.1) ; Tesla sans flux officiel (403, non contourné) ; flux des chaînes YouTube officielles à réessayer (404 le 2026-11-05).
6. **Couvertures** : originaux des 18 fonds en haute définition, s'ils existent (même nom de fichier, aucun code à changer).
7. **Avant le lancement public** : hébreu de l'interface relu par un locuteur natif ; interprétation « police du système » pour l'hébreu à confirmer ; droits d'usage de la mascotte ; style des montages (ADR 0007).
8. **Plus tard** : comptes développeur mobile (Apple 99 USD/an, Google 25 USD) avant P9 bis ; tri des 47 ressources candidates (https://claude.ai/artifact/YGeV9JfuPUGTajUTzF9Yxb) ; corrections des 15 exemples de la page de revue (évaluation de P3).

## Points de vigilance

- **Cron GitHub irrégulier** : aucun cycle de 03:28 à 12:14 UTC le 2026-11-05. Un cycle peut être lancé à la main (`npm run lancer -- --confirmer` avec les variables Turso et les plafonds), sans chevauchement grâce au bail.
- **Brouillons bloqués** : écarts sur un champ principal (réserve de la source absente, accroche non conforme, chiffre de performance non attribué) ; Pulse en a 11.
- **Découvertes** : la rédaction automatique des dépôts découverts reste coupée en ligne (`CURATION_MAX_DECOUVERTES` absente) tant qu'elle n'est pas assez fiable.
- **Flux sans texte** (Intel, AMD, Notion, Higgsfield…) : leur page est capturée avant l'analyse, 30 par passage ; openai.com refuse la collecte (403), non contourné.

## Prochaine action

P6, suite : état des constats (ancien, toujours observé, corrigé selon telle source, à revérifier), incidents révisés par une nouvelle analyse, X et veille de profils, score de découverte. À proposer à l'utilisateur avant de commencer. Confirmer d'abord le déploiement du bloc 5 sur Vercel.

## Repères techniques

- **Base en ligne depuis le poste** : les lignes `DATABASE_URL` et `DATABASE_AUTH_TOKEN` de `.env.local` restent **commentées**. Pour une commande voulue sur Turso : `env $(sed -n 's/^# \(DATABASE_[A-Z_]*=[^ ]*\)$/\1/p' .env.local) npm run -s <commande>`, telle quelle, sans guillemets autour de `$(…)` (sinon le shell affiche les valeurs). Ne jamais afficher `.env.local`.
- Commandes utiles : `etat`, `couts`, `lancer -- --confirmer`, `publier -- --confirmer`, `approfondir`, `brouillons:recontroler`, `brouillons:planifier`, `recherche:evaluer`, `recherche:reindexer -- --confirmer`, `ressources -- decouvrir [--capturer]`.
- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Site : `npm run web:dev` (configuration `site` de `.claude/launch.json`) ; `npm run web:typecheck` (`next build` ne vérifie pas les types). Un module `'use client'` n'exporte que des composants.
- `npm run maquette` régénère `maquette/donnees.js` et `maquette/recherche.js` ; les tests échouent s'ils sont périmés (parité du moteur de recherche).
- `drizzle-kit generate` s'arrête sur une question si une colonne disparaît en même temps qu'une autre apparaît : le faire en deux migrations.
- Worktree `.worktrees/mobile` (branche `mobile`, session mobile) : ne pas y écrire.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
