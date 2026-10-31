# État du projet

_Mis à jour le 2026-10-31 : Reddit en source différée ; veille élargie à l'écosystème IA et créatif, 24 sources actives._

- **Phase** : P2 fusionné dans `main`. **P3 en cours, pas terminé** sur `p3-brouillons` : collecte élargie réelle ; brouillons partiellement codés, testés sur faux modèle ; aucun appel réel.
- **Dépôt** : `main` à `e56db82` ; travail de P3 commité sur `p3-brouillons`, non fusionné et non poussé.
- **Tests** : voir `npm test`, types OK. **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## Ce qui fonctionne réellement (vérifié le 2026-10-31)

- **Collecte : oui, à la main.** Essai sur une copie de la base : 24 sources sur 24, 15 nouveaux documents, 14 nouvelles actualités. Aucune planification (P5). Base de travail : 393 actualités, arrêtée au 2026-10-30, dont 66 inexploitables (64 vides, 2 de moins de trois mots), qui ne partent pas au modèle. 24 sources au registre ; 25 lignes en base (`npm run status`), dont DeepMind, reportée, sans document.
- **Brouillons : non, jamais exécutés en réel.** Sur faux modèle : qualification, rédaction, contrôles, écriture en base, budget. `llm_run`, `llm_call` et `post_draft` sont vides ; pas de clé ; dialogue réel avec l'API jamais essayé.
- **Affichage : maquette statique locale.** Coulisses montre les actualités réelles ; le fil montre 8 exemples et le projet earshot, écrits pendant le développement ; aucun brouillon affiché ; site réel (P4) non commencé.

## Reste à faire dans P3

- **À coder sans dépense** : textes du carrousel, `details`, `categories`, contrôle « sources contradictoires », tables de publication de l'ADR 0004 (ou report décidé).
- **À fiabiliser avant le premier lot réel** : relance sans repayer la qualification et clôture des `llm_run` interrompus ; un seul lot à la fois et reprise sur base verrouillée ; réponse tronquée ou refusée distinguée ; reprise sur erreur de comptage ; second tarif de Haiku au-delà de 100 000 tokens.
- **Limite connue** : l'analyse ne repasse pas sur une actualité déjà traitée, même si sa source change.

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

1. Avant tout appel : confirmer modèle et plafonds, lire le solde de crédits (console Anthropic), saisir la clé soi-même. Tarifs revérifiés le 2026-10-30.
2. Kits presse autorisés ; droits à vérifier photo par photo avant mise en ligne.
3. Langues disponibles au lancement (proposition : français seul) et nom définitif du compte éditorial — avant P4.
4. Droits d'usage de la mascotte ; budget plafond et fréquence maximale de publication — avant le premier lot réel de P3.
5. Décisions sur les sources et médias (X, reprise de Reddit, sources aux conditions restrictives, hébergement vidéo, traduction, bacs à sable, points juridiques) : options chiffrées dans `docs/sources.md` §8.1 — avant P6/P7, pas maintenant.
6. Proposition : préciser SPEC §7.3 « sous-chaîne exacte » en « sous-chaîne exacte, bornée à des mots entiers » (déjà appliqué par le code, plus strict).

## Prochaine action

P3 : traiter « Reste à faire dans P3 », puis premier petit lot réel après la confirmation du point 1 ; aucun crédit API activé sans accord. Système de comptes demandé par l'utilisateur : reste en P9, plan inchangé pour l'instant. Règle visuelle : photos qui donnent envie, comme Radar/Google.

## Repères techniques

- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Les agents d'un workflow de recherche peuvent utiliser le navigateur intégré : vérifier la maquette dans un onglet à soi (`tabs_create`) et toujours passer son `tabId`.
- `npm run maquette` sort en code 1 si un exemple est « à vérifier » ou introuvable ; `npm run maquette:reel` (macOS, ffmpeg dans `~/.local/bin`) ; les tests échouent si `maquette/donnees.js` ou la vidéo sont périmés.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
