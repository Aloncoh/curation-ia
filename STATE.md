# État du projet

_Réécrit le 2026-11-05 (cap « réseau social vivant », SPEC §0). Seul l'état actuel figure ici ; relevés et notes datés : [docs/historique.md](docs/historique.md) ; journal des jalons : [PROGRESS.md](PROGRESS.md)._

## Cap

Réseau social vivant autour de l'IA, du développement et de la technologie : rapidité, pertinence du tri, angle éditorial utile, marque reconnaissable, communauté. Six agents (Nodi, Repo, Pyxo, Mova, Pulse, Radar), priorités inchangées. Volume et plafonds de dépense actuels conservés (voulus par l'utilisateur).

## Ce qui fonctionne réellement (vérifié le 2026-11-05)

- **Site** https://web-phi-nine-38.vercel.app (Vercel, projet `web`) sur la base **Turso `curation-ia`**, qui fait foi. 67 publications en ligne (Repo 30, Mova 13, Nodi 11, Pyxo 9, Pulse 2, Radar 2). Fil principal sans les versions déjà remplacées (vérifié sur les données en ligne).
- **Maquette en ligne** : `/maquette/accueil.html` et `/maquette/index.html`, copiées au build, non indexées. **Accueil refait le 2026-11-05 à la demande de l'utilisateur** : fond blanc, dégradé violet aux couleurs qui défilent, barre en pilules à indicateur glissant, curseur flèche, puis le titre « Curation [mascotte] AI » et six petits personnages plats, un par agent (silhouette et couleur propres : antenne de Nodi, oreilles de renard de Repo, aigrettes et bec de chouette de Pyxo, crête et queue spirale de Mova, piquants de Pulse, oreilles de Radar), dont les yeux glissent pour faire tourner la tête et qui se présentent tour à tour (demande du 2026-11-06 : la version three.js était « trop grosse, trop 3D » ; référence : personnage plat à deux yeux dans le titre), puis une fenêtre d'application façon messagerie (demande du 2026-11-06, qui remplace le bac des agents flottants, jugé « moche ») : les six agents à gauche avec le titre de leur dernier post publié, à droite la vraie capture de la page de ce post sur le site (`maquette/medias/tuto/`), ses étapes (source, citations, contrôles, publication) et un lien vers lui. Aucun texte rédigé sur la page (« ça fait trop ») ; titres repris tels que le site les affiche. Vérifié en local (bureau 1 366 px et mobile 375 px).
- **Chaîne automatique** (`chaine.yml`) : collecte, capture des pages, brouillons, contrôles avec élagage et relance, planification, traduction, publication sans relecture de ce qui passe tous les contrôles. Publications vues en ligne ce jour.
- **Recherche** (FTS5 + lexique `l1`) : 94 % sur le jeu `r1`. Avis de validité (version plus récente, source mise à jour) affiché.
- **Sources** : 102 en base, registre d'accès (six états, reprises espacées, aucune suppression), Hacker News en signal, EDGAR essayé en réel depuis le poste.
- **Tests** : 837 au vert.

## Construit, pas encore vérifié en ligne

- EDGAR dans la chaîne en ligne : attend le secret `CURATION_CONTACT_SEC`.
- Prompt `p3-22` (aucune définition, aucune formule promotionnelle) : en place, effet à constater sur les prochains posts.
- Trace durable de chaque cycle (`run` de type `cycle`) : en place, premier cycle tracé à venir.
- Rédaction des découvertes : coupée en ligne (pas assez fiable).

## Reste à développer

1. **Essai autonome** (P8 avancé) : un outil, protocole réduit, runner GitHub éphémère sans secret, conteneur sans réseau, trace consultable, relié au post initial. Demande une migration (table des essais).
2. **Parcours communauté** (P9 avancé) : compte → profil → contribution → commentaire ou proposition de correction avec preuves ; abonnements humains et agents. Attend le choix de la méthode de connexion.
3. **arXiv** (statut « prépublication non évaluée ») et rôles des sources dans le code (découverte, primaire, preuve de test).
4. **Hébergement du cycle** : le cron ne convient pas (ADR 0006, mise à jour du 2026-11-05).
5. **Visuels** : fonds trop petits (504 × 171 px) ; logos au premier plan à revoir selon les droits ([docs/droits.md](docs/droits.md)) ; le site « ne donne pas envie » (retour de l'utilisateur du 2026-11-05) : la direction retenue est celle du nouvel accueil de la maquette (blanc, violet, mascottes animées), à porter ensuite sur le site.
6. 3 à 5 contenus LinkedIn avec preuves dans `communication/`, après vérification du parcours réel découverte → contenu → recherche.

## Décisions applicables

- Publication automatique de ce qui passe tous les contrôles ; le reste demeure « à vérifier ».
- Budget DeepSeek autorisé : 4 $ au total (0,84 $ enregistré le 2026-11-05) ; plafonds en ligne 0,10 $ par cycle, 0,40 $ par jour, 3,95 $ au total ; prévenir avant d'approcher 4 $.
- Radar : big tech seulement quand le sujet touche l'IA (consignes `s5`). Presse et Hacker News toujours attribués, jamais confirmation primaire.
- Aucune source contournée (403, 429, robots.txt, Medium) ; une source bloquée est différée avec son motif.
- Migrations de la base en ligne : avec l'accord de l'utilisateur.

## En attente de l'utilisateur

1. **Méthode de connexion** des comptes (parcours communauté).
2. **Migration** de la table des essais, au moment de l'essai.
3. **Hébergement du cycle** : dépôt public, déclencheur externe ou processus permanent (ADR 0006).
4. **Domaine** : disponibles le 2026-11-05 chez Vercel : `curationai.app` (9,99 $ la 1re année, 15 $ ensuite), `curationai.dev` (9,99 $, puis 13 $), `curationia.com` (12,03 $), `curationai.co` (29,99 $, puis 24,80 $), `getcuration.ai` (160 $ pour 2 ans) ; `curationai.fr`, `curationai.social`, `curation-ia.com`, `curationai.xyz` disponibles, prix non obtenus ; pris : `curationai.com`, `curation-ai.com`, `curationai.io`, `curationai.net`, `curation.ai`.
5. **Droits** : mascotte, avatars, bannières, fonds ; logos au premier plan ([docs/droits.md](docs/droits.md) §4).
6. Secret GitHub `CURATION_CONTACT_SEC` ; fonds en haute définition ; jeu de recherche non vu ; liste témoin « construire » ; X, Reddit, LMArena ; hébreu relu par un locuteur natif.

## Repères techniques

- **Base en ligne depuis le poste** : lignes `DATABASE_*` de `.env.local` commentées ; commande : `env $(sed -n 's/^# \(DATABASE_[A-Z_]*=[^ ]*\)$/\1/p' .env.local) npm run -s <commande>`, sans guillemets autour de `$(…)`. Ne jamais afficher `.env.local`.
- Commandes : `etat`, `couts`, `delais [-- --depuis <date>]`, `lancer -- --confirmer`, `publier -- --confirmer`, `approfondir`, `brouillons:recontroler`, `brouillons:planifier`, `recherche:evaluer`, `sources:registre`, `maquette` (régénère `maquette/donnees.js`).
- Dépôt `git@github.com:Aloncoh/curation-ia.git` (privé), branche `p3-brouillons`, envoi par `git push origin HEAD:main` ; Vercel déploie `main`.
- GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- `npm run web:typecheck` (le build ne vérifie pas les types) ; `drizzle-kit generate` : une colonne qui disparaît et une qui apparaît se font en deux migrations.
- Worktree `.worktrees/mobile` : ne pas y écrire.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
