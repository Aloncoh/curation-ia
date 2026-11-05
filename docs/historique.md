# Historique du projet

_Créé le 2026-11-05 à la demande de l'utilisateur : STATE.md ne garde que l'état actuel. Ce fichier rassemble les relevés et notes datés qui n'y ont plus leur place. Le journal des jalons et des vérifications reste dans [PROGRESS.md](../PROGRESS.md) ; les versions précédentes de chaque fichier restent dans git._

## 1. STATE.md au 2026-11-05, avant le pivot « réseau social vivant »

Relevés de ce jour-là, conservés tels quels (ils ne décrivent plus forcément l'état actuel).

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

1. **Secret GitHub `CURATION_CONTACT_SEC`** (valeur : l'adresse de contact fournie le 2026-11-05) à ajouter dans les secrets du dépôt, pour que la chaîne en ligne collecte EDGAR ; elle est déjà dans `.env.local`.
2. **Recherche** : relire le jeu `r1` (`src/recherche/reference.ts`) et donner un second jeu de requêtes non vu (le lexique a été réglé sur `r1`).
3. **Usage « construire »** : liste témoin de bonnes découvertes (SPEC §10).
4. **Domaine** du site (décision et dépense) ; démonstration V1.
5. **Sources** : X, Reddit, conditions restrictives (`docs/sources.md` §8.1) ; Tesla sans flux officiel (403, non contourné) ; flux des chaînes YouTube officielles à réessayer (404 le 2026-11-05).
6. **Couvertures** : originaux des 18 fonds en haute définition, s'ils existent (même nom de fichier, aucun code à changer).
7. **Avant le lancement public** : hébreu de l'interface relu par un locuteur natif ; interprétation « police du système » pour l'hébreu à confirmer ; droits d'usage de la mascotte ; style des montages (ADR 0007).
8. **Plus tard** : comptes développeur mobile (Apple 99 USD/an, Google 25 USD) avant P9 bis ; tri des 47 ressources candidates (https://claude.ai/artifact/YGeV9JfuPUGTajUTzF9Yxb) ; corrections des 15 exemples de la page de revue (évaluation de P3).

## Points de vigilance

- **Jeton Turso** : affiché par erreur dans la trace d'une commande le 2026-11-05 ; remplacé par l'utilisateur le même jour (`.env.local`, secret GitHub, variable Vercel) et l'ancien révoqué. Vérifié après révocation : le site en ligne et l'accès local répondent.
- **Registre d'accès des sources (2026-11-05, demande de l'utilisateur)** : six états distingués, reprises espacées (`Retry-After` respecté), aucune source supprimée ; Hacker News actif comme signal, article lié récupéré avec destination validée, robots.txt et redirections revalidées ; EDGAR prêt ; presse toujours attribuée (`p3-21`, contrôle `attribution_externe_manquante`) ; canaux de remplacement Microsoft et Tesla. Détail : `docs/sources.md` §2 ter, `npm run sources:registre`. Migration `0012` appliquée sur Turso le 2026-11-05 avec l'accord de l'utilisateur, code envoyé. EDGAR essayé en réel avec le client déclaré : 20 rapports 8-K pour NVIDIA et 20 pour Microsoft ; les 12 CIK confirmés sur sec.gov (noms des entreprises). Le même jour : 7 planifiées et 7 publiées après la reprise de la chaîne.
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

## 2. Notes de mise à jour de la ROADMAP (2026-10-30 → 2026-11-03)

> **Mise à jour du 2026-11-03 — P4 réalisé en local** ([ADR 0013](decisions/0013-site-api-traductions.md)). Site Next.js 16 (`apps/web`), API v1 (`src/api/v1`, contrat `packages/contrat`), interface en anglais, français et hébreu (`packages/textes`, hébreu en police système), traductions contrôlées par le code (post, fiche, texte alternatif), fiche d'approfondissement, historique des versions et des révisions, carrousels. Critères de sortie remplis (détail dans PROGRESS.md). Hors critères, à faire avant le lancement : relecture de l'hébreu par un locuteur natif. Aucun jalon validé n'est rouvert. Plan proposé de P5 plus bas.

> **Mise à jour du 2026-11-02 — volume, priorités, clarté, mobile** (SPEC §3.6, §7.3 bis, §7.4, §8). Plafond initial de 20 publications par jour, sans quota, remplaçant la limite « N par jour » proposée à 3. Priorités : modèles, ressources pour construire, fonctionnalités importantes, autres actualités à fort impact. Objectif de la minute rétabli pour les nouveautés prioritaires. Fait en P3 sans dépense : consignes `s3`, prompt `p3-10` (clarté dès les premières lignes), fonction de priorité testée. **P5** applique le plafond, la réserve de la journée, les regroupements et le refus de reporter une actualité obsolète. Mobile : ADR 0010, validée le 2026-11-02. Aucun jalon validé n'est rouvert ; impact sur le calendrier de P3 : nul.

> **Mise à jour du 2026-11-02 — chaîne des ressources** ([ADR 0011](decisions/0011-chaine-des-ressources.md), SPEC §7.3 ter, §7.15).
>
> - **Demande de l'utilisateur** : préparer dès maintenant une publication par ressource d'une liste de 20 skills et dépôts : texte, visuel, bouton vers la ressource officielle, démarrage cité, mots-clés structurés, recherche expliquée.
> - **Avancé avant P6, pour cette liste seulement**, en quatre lots (SOCLE, VISUEL-LIENS, RECHERCHE, CHAINE) et une migration (0009). La rédaction se fait pendant le développement par Claude Code, sans appel payant, et son origine est affichée.
> - **Inchangé** : la publication réelle reste en P5 (en attente avec jour prévu, dans le plafond partagé de 20 par jour) ; la découverte automatique, le seuil d'étoiles et la grille `d1` restent en P6. Aucun jalon n'est rouvert ; critères de sortie de P3 inchangés.
> - **Impact** : aucune dépense ; environ 2 à 3 séances de plus (estimation), sur le calendrier de P3 à P5 ; quatre réglages proposés à confirmer (SPEC §11).

> **Mise à jour du 2026-11-01 — harmonisation avec l'expérience cible** (SPEC §3.1, §3.5, §7.3 ter, §7.15, §7.16). Vérifié ce jour : P3 reste **en cours**, 0 brouillon réel, 0 appel au modèle, 0 avis humain. Aucun jalon terminé n'est rouvert et le périmètre de la V1 ne change pas. P3 complète le contrat de rédaction (exemple d'usage, prérequis). P5 ajoute un garde-fou contre les doublons entre sources, les corrections visibles et la mesure de bout en bout. P6 reçoit les découvertes, la recherche et le suivi des informations obsolètes. P9 reçoit le fil « Abonnements ». Impact : aucune dépense engagée ; P6 s'allonge et sera découpé à son plan ; le texte coûterait 5 à 6 % de plus (estimation).

> **Mise à jour du 2026-10-31** : P3 reste **en cours**. La collecte des 24 sources fonctionne en réel ; la génération de brouillons, testée sur faux modèle, n'a jamais appelé le vrai modèle (aucun brouillon réel, critères de sortie non atteints) ; l'affichage reste une maquette statique locale. Le code sans dépense est écrit, tables de publication comprises (migration 0004) ; restent le premier lot réel, le coût mesuré et la revue des brouillons. Détail : STATE.md. Reddit reste dans le périmètre comme source différée, faute d'accès autorisé (docs/sources.md §3.7).

> **Mise à jour du 2026-10-31 (demandes de l'utilisateur)** : P3 ajoute la sélection par critères et la boucle de retour humain (ADR 0005), le chiffrage des modèles (docs/budget-modeles.md), la mesure des délais (docs/delais.md) et les montages graphiques (ADR 0007). Tout cela est fait sans dépense ; l'évaluation attend les corrections de l'utilisateur. P5 vise désormais une publication dans la minute quand la source et les contrôles le permettent : GitHub Actions ne suffit pas pour cela (ADR 0006, décision de l'utilisateur attendue). Impact : calendrier de P5 à revoir selon l'hébergement choisi ; dépense estimée à 1 $ par mois pour le texte à 300 publications, 5 $ en hypothèse haute, plus 2 à 5 par mois d'hébergement.

> **Mise à jour du 2026-10-30 — écosystème IA et créatif** (SPEC §3.4) : P3 passe de 6 à 24 sources actives et ajoute à chaque brouillon l'accès, le coût, la nature de l'actualité, la date et le niveau de preuve. P2 n'est pas repris. Sources sans flux simple (Perplexity, Grok, Seedance, Kling, Runway…) : adaptateurs en P6. Publication automatique inchangée (P5). Impact : aucune dépense ; le lot réel de P3 attend les compléments listés dans STATE.md, puis l'accord de l'utilisateur et sa clé.

## 3. Plans de jalons passés

## P5 — plan _(validé le 2026-11-03 avec le choix « Actions, 5 minutes » ; préparé en local, rien n'est déployé)_

**Préparé le 2026-11-03** (ADR 0006 mise à jour) : workflows `chaine.yml` et `verifications.yml`, `npm run lancer`, `etat`, `couts`, `publier` et `turso:copier`, connexion Turso par variables, site prêt pour Vercel. La publication est atomique et idempotente, avec `doublon_possible` et `obsolete`. **Reste, et c'est à l'utilisateur de le créer, dans l'ordre :**

1. **Compte Vercel** (offre Hobby, gratuite) : importer le dépôt GitHub (étape 3), avec le dossier racine `apps/web`. `apps/web/vercel.json` fixe l'installation à la racine, le build Next.js et la région `cdg1` (Paris).
2. **Compte Turso** :
   - créer une base nommée `curation-ai`, à l'emplacement `aws-eu-west-1` (Dublin). C'est l'emplacement européen documenté par Turso au 2026-11-03 ; Paris n'y figure pas. À revérifier au moment de la création ;
   - créer un jeton pour la chaîne et, si Turso le propose, un jeton en lecture seule pour le site.
3. **Dépôt GitHub privé**, par exemple `curation-ai`, sans le dossier `.worktrees/`.
4. **Secrets et variables**, saisis par l'utilisateur lui-même, jamais en conversation :
   - secrets du dépôt GitHub (Settings → Secrets and variables → Actions → Secrets) : `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEEPSEEK_API_KEY` ;
   - variables du dépôt GitHub (même page, onglet Variables) : `CURATION_PLAFOND_JOUR_USD` (proposé : `0.20`), `CURATION_PLAFOND_TOTAL_USD` (proposé : `3.95`, le budget DeepSeek autorisé moins une marge pour les dépenses non enregistrées en base, environ 0,02 $), puis `CHAINE_ACTIVE` = `oui` en dernier, quand tout est prêt : c'est l'interrupteur de la chaîne ;
   - variables d'environnement Vercel (projet → Settings → Environment Variables) : `DATABASE_URL`, `DATABASE_AUTH_TOKEN` ;
   - dans `.env.local`, pour la copie initiale : `DATABASE_URL`, `DATABASE_AUTH_TOKEN`.
5. **Domaine** : acheté chez le registraire de son choix, puis ajouté au projet Vercel (la dépense est la sienne).

Ensuite, avec son accord : `npm run turso:copier` (aperçu), puis `npm run turso:copier -- --confirmer` (migrations et copie), le premier envoi du code, un cycle lancé à la main (`workflow_dispatch`), la vérification en ligne, et seulement alors `CHAINE_ACTIVE` = `oui`.

**Plan d'origine :**

1. **Ce que l'utilisateur crée et saisit lui-même** : un compte Vercel pour le site, un compte Turso pour la base, un dépôt GitHub privé pour le code et les Actions, et un domaine. Les clés sont saisies dans leurs réglages, jamais dans le code. L'hébergement du cycle de 60 s est à trancher (ADR 0006) : GitHub Actions, avec un cycle d'au moins 5 minutes, ou un petit processus permanent.
2. **Base en ligne** : migrations 0001 à 0011 sur Turso, copie des publications planifiées, essai de FTS5 sur la base réelle (ADR 0008). Les montages sont servis par le site en ligne, sans passer par `maquette/medias`.
3. **Chaîne planifiée** : collecte, puis approfondissement, brouillons, contrôles, traduction et publication. Chaque appel au modèle garde ses plafonds. Le passage de « en attente » à « publiée » est atomique et idempotent, dans le plafond de 20 par jour. Une publication semblant déjà couverte attend avec le motif `doublon_possible` ; les corrections donnent des révisions datées.
4. **Pilotage** : commandes lancer, état, pause et coûts ; délai mesuré de bout en bout sur de vraies publications.
5. **Sortie** : démonstration de la V1 (SPEC §10). Le site public n'affiche que des publications publiées et traduites, l'audit axe-core est repassé en ligne, et aucune dépense n'est engagée sans l'accord de l'utilisateur.

## P3 — ce qu'il reste _(au 2026-11-01)_

- **Sans dépense, à partir de tes retours** : importer les corrections (0 avis reçu à ce jour), écrire les consignes `s3` (avis, public élargi), recueillir les avis à l'aveugle sur le jeu d'évaluation, comparer `s2` et `s3`, afficher les montages dans la maquette une fois validés.
- **Comparaison de modèles** (ADR 0009, demandée le 2026-11-01) : `npm run comparaison` est prêt et testé sur simulation. Il attend deux clés, le compte DeepSeek et ton accord sur l'envoi d'annonces publiques à DeepSeek. Budget accordé : 1 $ en tout.
- **Après le choix du fournisseur, avec sa clé et ses plafonds** : premier lot réel du moteur, coût et latence mesurés, revue des brouillons.
- Critères de sortie inchangés.


## Estimation jusqu'à la V1 _(présentée le 2026-10-30 à la fin de P1, réévaluée le même jour après la précision de la vision)_

Environ **7 à 11 séances de travail** de 2 à 4 heures pour finir P2 et faire P3 à P5 (P2 : la maquette révisée, ½–1 ; P3 : 2–3 ; P4 : 2–3 ; P5 : 1–2), soit **3 à 5 semaines** à raison de 2 ou 3 séances par semaine. L'écart avec l'estimation précédente (6 à 9 séances) vient du modèle de publication signée (comptes, publications, médias générés) et du fil social. Hypothèses : validations rapides des plans ; comptes (Vercel, Turso, Claude Console) créés par l'utilisateur quand ils sont demandés ; crédits API Max disponibles en P3 ; pas de blocage par une source. Estimation, pas engagement : réévaluée à la fin de chaque jalon. Les jalons après la V1 seront estimés quand leur découpage sera validé.

---

> **Mise à jour du 2026-10-30** : six comptes éditoriaux proposés (Nodi, Repo, Pyxo, Mova, Pulse, Radar) sur un même moteur. P3 ajoute le routage vers un compte principal ; P6 connecte les registres de Pulse et de Radar et le format « Sélection ». Impact : pas de nouvelle infrastructure, P6 s'allonge selon le nombre de sources retenues.

## P2 — Produits, versions, sources et maquette _(réalisé le 2026-10-30, maquette validée par l'utilisateur ; résultats dans PROGRESS.md)_

État des critères de sortie au 2026-10-30 : tests verts (178, dont le contrôle mot pour mot des citations des exemples) ✅ ; essai réel sur les 5 sources, seconde collecte sans doublon ✅ ; chaque release réelle rattachée à exactement une version (vérifié par requête SQL) ✅ ; registre des sources ([docs/sources.md](sources.md)) ✅ ; maquette validée par l'utilisateur ✅. Écarts par rapport au plan : Codex CLI limité à 10 releases avec une limite de taille propre (≈ 350 fichiers joints par release) ; mode fixture restreint à une seule source ; migration 0002 (index d'intégrité du catalogue).

**Changement du 2026-10-30 (vision sociale).** La première maquette (fil de cartes d'actualité et fiche) est remplacée, avant validation, par une maquette du **fil de publications**, du **profil de l'agent éditorial** et de l'**espace Reels**, avec la fiche en approfondissement et les états. Les données réellement collectées, les **exemples rédigés pour la maquette** et les **fonctions prévues** y sont identifiés comme tels. Les exemples de publication ne reprennent que ce que disent les captures réelles, avec des citations contrôlées mot pour mot par un test.

**Résultat attendu.** Les documents collectés sont rattachés à des produits et à des versions identifiés ; plusieurs sources officielles sont collectées ; chaque annonce devient une « actualité » sans doublon ; une maquette du produit social est construite autour de la mascotte. Toujours sans IA dans le pipeline.

**Étapes**

0. Premier commit git de l'état P0–P1.
1. **Sources supplémentaires**, avec le même collecteur sécurisé :
   - releases GitHub officielles de `openai/codex` et `google-gemini/gemini-cli` (flux vérifiés le 2026-10-30) ;
   - un flux d'annonces de modèles et d'applications : OpenAI News (RSS officiel) et GitHub Changelog (RSS officiel, dont Copilot) — Anthropic ne publie pas de flux : lecture ciblée de sa page d'actualités reportée à P6, après vérification des droits.
2. **Lecteur de flux RSS / Atom** (`@rowanmanning/feed-parser`), mêmes garanties que l'API GitHub (liste blanche, taille, délai, validation).
3. **Modèle produit** : tables `product`, `product_version`, `news_item`, et liens actualité ↔ documents et actualité ↔ produits / versions ([ADR 0003](decisions/0003-identite-produits-versions-actualites.md)).
4. **Création des actualités** : une release stable → une actualité de type « version » ; une entrée de flux → une actualité de type « annonce », non rattachée à un produit tant qu'elle n'est pas qualifiée (P3).
5. **Tests** : même annonce collectée deux fois → une seule actualité ; deux annonces distinctes sur le même produit → deux actualités ; entrée de flux republiée avec une nouvelle date → pas de nouvel événement ; source RSS en panne ou mal formée → données intactes.
6. **Maquette** (révisée le 2026-10-30) : fil de publications, profil de l'agent éditorial, espace Reels, fiche d'approfondissement et états, sur téléphone et ordinateur ; données réelles, exemples et fonctions prévues identifiés ; présentée pour validation avant P3.
7. **Communication** : COMPRENDRE_LE_PROJET.md, brouillons LinkedIn, STATE et PROGRESS ; registre des sources ([docs/sources.md](sources.md)) et rôles des agents ([docs/agents-editoriaux.md](agents-editoriaux.md)).

**Critères de sortie** : tests verts (dont les scénarios de l'étape 5 et le contrôle des citations des exemples) ; essai réel sur toutes les sources validées, seconde collecte sans doublon ; chaque release réelle rattachée à exactement une version de produit ; maquette validée par l'utilisateur.

**Hors P2** : analyse IA, qualification, publications réelles (P3), site réel (P4), planification et mise en ligne (P5).

**Coût** : 0 €.

---

## P1 — Collecte fiable d'une source officielle _(réalisé le 2026-10-30 — résultats dans PROGRESS.md)_

Tous les critères de sortie ci-dessous sont atteints : 90 tests réussis, essai réel sur l'API GitHub (5 documents, seconde collecte sans doublon), preuves dans `communication/linkedin/02-collecte/preuves/`. Écarts par rapport au plan : réservation et changements d'état rendus atomiques et réouverture des connexions libSQL après verrou, à la suite de la relecture adversariale ; `better-sqlite3` non nécessaire ; TypeScript 7 conservé.

**Résultat attendu.** La commande de collecte récupère les 5 dernières releases réelles du dépôt officiel `anthropics/claude-code` via l'API REST GitHub, les stocke durablement avec leur provenance et leurs dates, et un export JSON lisible les montre. Relancer ne crée aucun doublon ; une panne de source ou une interruption n'abîme rien. Sans interface ni IA.

**Étapes**

1. **Initialisation** : `git init`, `.gitignore` (dont `.env.local` et la base locale), `package.json` (Node 24), configuration TypeScript compatible avec l'exécution directe par Node ; dépendances : `@libsql/client`, `drizzle-orm`, `drizzle-kit`, `zod`, `vitest`, `typescript` (7, repli 6 si un outil ne suit pas). Documents : README.md, PROGRESS.md, docs/architecture.md, ADR 0001 (TypeScript), ADR 0002 (SQLite / libSQL), docs/skills.md.
2. **Schéma et première migration** : `source`, `source_document` (unique sur source + identifiant externe), `document_snapshot` (unique sur document + hash), `job` (statut, bail, tentatives, clé d'idempotence unique), `run` et `run_step` (traces), `setting` (pause).
3. **Collecteur GitHub Releases** : liste blanche `api.github.com` ; validation de l'adresse IP résolue ; aucune redirection suivie ; délai et taille maximum ; en-têtes User-Agent et version d'API ; réponse validée par schéma ; URL et dates normalisées (UTC) ; hash SHA-256 du contenu ; classement de chaque release en « nouveau », « inchangé » ou « nouvelle capture ».
4. **Jobs et exécutions** : réservation par une instruction SQL unique avec attente et nouvelle tentative si la base est verrouillée ; bail de durée limitée, reprise d'un bail expiré ; 3 tentatives au plus ; chaque exécution tracée (statut, compteurs, motif d'échec).
5. **Commandes** : `npm run collect`, `npm run status`, `npm run export`, `npm run pause`, `npm run resume`, `npm run db:migrate`.
6. **Tests sur fixtures (sans réseau)** : première collecte ; seconde collecte sans changement ; release modifiée → une seule nouvelle capture ; erreur HTTP 500, délai dépassé, JSON invalide, redirection, réponse trop volumineuse, hôte non autorisé, adresse IP interdite → exécution « échouée » avec motif, données intactes ; deux processus réels sur le même fichier → un seul prend le job (sinon bascule documentée vers `better-sqlite3`) ; processus tué en pleine collecte puis relancé → aucun doublon ; pause → aucun job pris.
7. **Essai réel documenté** : collecte des 5 releases, seconde collecte, redémarrage ; sorties brutes conservées dans `communication/linkedin/02-collecte/preuves/brut/` ; résultat consigné dans PROGRESS.md.
8. **Communication** : section « Collecte » de COMPRENDRE_LE_PROJET.md passée en « réalisé » ; brouillon LinkedIn 02 ; STATE.md à jour.

**Critères de sortie**

- `npm test` réussit sur tous les scénarios de l'étape 6.
- 5 documents réels de l'API GitHub stockés avec : source, identifiant externe (id de release), version (tag), URL d'origine et normalisée, date d'annonce (`published_at`), date de collecte, hash et contenu.
- Export JSON lisible produit.
- Seconde collecte réelle : 0 nouveau document, 0 nouvelle capture ; aucune ligne en double (vérifié par requête SQL).
- Redémarrage après interruption : ni perte ni doublon.
- Erreur de source simulée : exécution marquée échouée avec motif, données inchangées.
- Aucun secret dans le dépôt ; aucun appel réseau hors `api.github.com`.
- Si le réseau est indisponible : fixture explicitement marquée « fixture », essai réel reporté, sans annoncer 5 documents récupérés.

**Hors P1** : interface, IA, autres sources, identité produit, planification GitHub Actions, déploiement.

**Coût** : 0 €. Aucun compte requis (API GitHub publique, sans authentification, 60 requêtes par heure).

**Décisions techniques prises en cours de route** (signalées dans le bilan, ADR si structurantes) : version de TypeScript ; pilote SQLite si le test de concurrence échoue ; règles exactes de normalisation des URL.

