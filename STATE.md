# État du projet

_Mis à jour le 2026-10-31 : code de P3 écrit et testé sur faux modèle ; Reddit en source différée ; 24 sources actives._

- **Phase** : P2 fusionné dans `main`. **P3 en cours, pas terminé** sur `p3-brouillons` : collecte élargie réelle ; brouillons et publication non publiée codés, testés sur faux modèle ; aucun appel réel.
- **Dépôt** : `main` à `e56db82` ; `p3-brouillons` non fusionnée et non poussée (aucun dépôt distant configuré), tout est commité. Migration 0004 appliquée à la base locale.
- **Tests** : 346 au vert sur fixtures et faux modèle (`npm test`), types OK. **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## Ce qui fonctionne réellement (vérifié le 2026-10-31)

- **Collecte : oui, à la main.** Essai sur une copie de la base : 24 sources sur 24, 15 nouveaux documents, 14 nouvelles actualités. Aucune planification (P5). Base de travail : 393 actualités, arrêtée au 2026-10-30, dont 66 inexploitables (64 vides, 2 de moins de trois mots), qui ne partent pas au modèle. 24 sources au registre ; 25 lignes en base (`npm run status`), dont DeepMind, reportée, sans document.
- **Brouillons : non, jamais exécutés en réel.** Sur faux modèle : qualification, rédaction, contrôles, reprises, publication non publiée. Essai sur une copie de la base : 327 actualités réelles traversent la chaîne, avec un texte artificiel, 66 sont laissées de côté. `llm_run`, `llm_call`, `post_draft` et `post` sont vides ; pas de clé ; dialogue réel avec l'API jamais essayé.
- **Affichage : maquette statique locale.** Coulisses montre les actualités réelles ; le fil montre 8 exemples et le projet earshot, écrits pendant le développement ; aucun brouillon affiché ; site réel (P4) non commencé.

## Reste à faire dans P3

- **Sans dépense** : plus rien de prévu ; `npm run brouillons:relire` est prêt pour le premier lot.
- **Avec ton accord, ta clé et tes plafonds** : premier lot réel, réponse réelle de l'API, coût mesuré, revue des brouillons.
- **Reporté à la publication réelle** : l'analyse ne repasse pas sur une actualité déjà traitée, même si sa source change ; les révisions datées arrivent avec P5.
- **Limites gardées volontairement** : un refus 400 de l'API arrête le lot, pour ne pas marquer tout un lot invalide si le schéma est refusé ; il faudra alors lire le motif avant de relancer. Une coupure réseau en plein flux arrête aussi le lot. Le contrôle entre deux captures n'a encore aucun cas réel : aucune actualité n'a d'autre capture dans la base de travail.

## Ce qui est prêt à montrer

- Maquette : `maquette/index.html` (configuration `maquette` de `.claude/launch.json`, puis `/maquette/index.html`) : fil, publication détaillée, profil `@veilleuse`, Reels, actualités collectées, fiche, états, langue ; ordinateur et téléphone, clair et sombre.
- 8 exemples + earshot (projet GitHub mesuré), comptes Nodi, Repo, Pyxo, Mova, Pulse (sans publication : aucun incident collecté), Radar ; filtre par auteur ; les 8 exemples : **108 passages sur 108** retrouvés mot pour mot (mots entiers) dans les captures réelles ; Reel d'exemple de 47,3 s (`maquette/medias/`).
- `docs/sources.md` : 24 sources actives, registre des candidates, 203 constats contre-vérifiés (166 confirmés, 35 corrigés, 2 invérifiables).
- Relecture adversariale (5 angles) : 28 constats confirmés, tous corrigés ; contre-relecture : 15 points mineurs de plus, tous traités (détail dans PROGRESS.md).

## Décisions de l'utilisateur (2026-10-30, à respecter)

- Orientation de la feuille de route révisée validée ; P6–P14 prévisionnels, sans alourdir la V1.
- Langue : celle du navigateur parmi les langues disponibles, choix manuel, langue de secours (construit en P4).
- Six comptes éditoriaux provisoires sur un même moteur ; « Veilleuse » : mascotte du site et présentatrice. Exemples toujours signalés comme tels.
- **2026-10-31 : Reddit reste dans le périmètre, en source différée.** Demande d'accès non déposée ; il ne doit pas être exclu du cadrage. Motif et conditions de reprise : docs/sources.md §3.7.

## En attente de l'utilisateur

1. Avant tout appel : confirmer modèle et plafonds, lire le solde de crédits (console Anthropic), saisir la clé soi-même. Tarifs revérifiés le 2026-10-31. Plafond par actualité (Sonnet 5.5, estimation pour 3 000 tokens d'entrée, sans reprise) : 0,17 $ ; le coût réel sera inférieur et reste à mesurer.
2. Kits presse autorisés ; droits à vérifier photo par photo avant mise en ligne.
3. Langues disponibles au lancement (proposition : français seul) et nom définitif du compte éditorial — avant P4.
4. Droits d'usage de la mascotte ; budget plafond et fréquence maximale de publication — avant le premier lot réel de P3.
5. Décisions sur les sources et médias (X, reprise de Reddit, sources aux conditions restrictives, hébergement vidéo, traduction, bacs à sable, points juridiques) : options chiffrées dans `docs/sources.md` §8.1 — avant P6/P7, pas maintenant.
6. Proposition : préciser SPEC §7.3 « sous-chaîne exacte » en « sous-chaîne exacte, bornée à des mots entiers » (déjà appliqué par le code, plus strict).
7. Proposition : préciser SPEC §7.3 « les textes du média généré » en « les diapositives, désignées par nom de champ, le texte étant repris par le code » (déjà appliqué, plus strict : le modèle ne rédige aucun texte de média).

## Prochaine action

P3 : premier petit lot réel après la confirmation du point 1, puis `npm run brouillons:relire` ; aucun crédit API activé sans accord. Système de comptes demandé par l'utilisateur : reste en P9, plan inchangé pour l'instant. Règle visuelle : photos qui donnent envie, comme Radar/Google.

## Repères techniques

- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Les agents d'un workflow de recherche peuvent utiliser le navigateur intégré : vérifier la maquette dans un onglet à soi (`tabs_create`) et toujours passer son `tabId`.
- `npm run maquette` sort en code 1 si un exemple est « à vérifier » ou introuvable ; `npm run maquette:reel` (macOS, ffmpeg dans `~/.local/bin`) ; les tests échouent si `maquette/donnees.js` ou la vidéo sont périmés.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
