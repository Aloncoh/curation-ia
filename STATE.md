# État du projet

_Mis à jour le 2026-11-01 : projet harmonisé avec l'expérience cible ; corrections et budget attendus de l'utilisateur._

- **Phase** : P2 fusionné dans `main`. **P3 en cours, pas terminé** sur `p3-brouillons`, vérifié le 2026-11-01 : `post_draft`, `post`, `llm_run`, `llm_call` et `selection_avis` vides, collection `avis` de la page vide, aucune clé. Collecte réelle ; brouillons et publication non publiée testés sur faux modèle ; aucun appel réel.
- **Dépôt** : `main` à `e56db82` ; `p3-brouillons` à `1796885`, non fusionnée, non poussée (aucun dépôt distant). **Le travail depuis le 2026-10-31 soir n'est pas commité**, harmonisation comprise. Migrations 0005 à 0007 appliquées à la base locale ; sauvegarde avant 0006 dans le dossier temporaire de la session seulement.
- **Tests** : 557 au vert sur fixtures et faux modèle (`npm test`), types OK. Migration 0008 appliquée à la base locale. **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## Ce qui fonctionne réellement (vérifié le 2026-10-31)

- **Collecte : oui, à la main.** 24 sources sur 24 au dernier essai sur copie. Aucune planification (P5). Base de travail : 393 actualités, arrêtée au 2026-10-30, dont 66 inexploitables ; 57 % des actualités ont moins de 400 caractères de texte.
- **Sélection : oui, sans le moteur.** Quatre critères, décision calculée par le code (ADR 0005). Corpus figé : 24 sujets de développement, 36 d'évaluation. Trois juges Claude Code ont noté les 60 sujets selon les consignes `s2` : 20/24 et 28/36 unanimes. Aucun avis humain encore.
- **Délais : mesure partielle.** Sonde de 91 minutes : 1 920 requêtes, 0 erreur, 1 entrée nouvelle, **aucun délai de détection mesurable**. Chaîne locale : 7 ms. Montage : environ 0,4 s. Modèle et mise en ligne : non mesurés (docs/delais.md).
- **Budget : estimé, jamais mesuré.** 100 publications : 0,34 $ avec Flash, 0,28 $ avec Haiku, plus 5 à 6 % estimés pour les deux champs ajoutés le 2026-11-01 (docs/budget-modeles.md).
- **Montages : oui, en local.** 7 gabarits, 8 exemples, tous signalés comme tels (`npm run montage`, ADR 0007). Pas encore affichés dans la maquette.
- **Brouillons : non, jamais exécutés en réel.** `llm_run`, `llm_call`, `post_draft` et `post` sont vides ; pas de clé.
- **Affichage : maquette statique locale**, sans brouillon réel ; site réel (P4) non commencé.

## Harmonisation du 2026-11-01

Vision comparée au dépôt ; aucun jalon rouvert ; périmètre de la V1 inchangé. SPEC §3.1, §3.5, §7.3 ter, §7.15, §7.16 ; ROADMAP ; [ADR 0008](docs/decisions/0008-recherche-des-publications.md) (proposée) ; complément de l'ADR 0005.

- **Corrigé dans les documents** : six comptes au lieu d'un compte principal, public élargi, médias de la V1 (montages), maquette validée, langues de P12.
- **Corrigé dans le moteur, sans appel** : `exemple_usage`, `prerequis`, catégories sécurité et hébergement, contrôle `essai_non_realise` (prompt `p3-9`) ; délai de bout en bout dans `npm run delais`.
- **Contradictions résolues** : le filtre de 14 jours et la note de nouveauté ne s'appliquent pas aux découvertes ; le seuil d'étoiles agit à l'entrée, jamais dans une note.
- **Lacunes constatées** : le corpus ne couvre que l'usage « rester informé » (54 annonces, 6 versions, aucune ressource) ; aucun contrôle de doublon entre sources (garde-fou en P5) ; FTS5 non établi sur une base Turso hébergée (essai en P5).

## Reste à faire dans P3

- **Sans dépense** : importer les corrections, écrire les consignes `s3` (avis, public élargi), recueillir les avis à l'aveugle sur le jeu d'évaluation, comparer. Afficher les montages dans la maquette une fois validés.
- **Avec ton accord, ta clé et tes plafonds** : premier lot réel, réponse réelle de l'API, coût et latence mesurés, revue des brouillons. Évaluer le moteur sur le corpus demandera une commande dédiée.
- **Reporté** : les révisions datées (P5) ; la lecture de l'article complet pour les sources à titre seul, à proposer après lecture de leurs conditions.
- **Limites gardées volontairement** : un refus 400 de l'API ou une coupure en plein flux arrête le lot. Une image tronquée mais lisible par le navigateur n'est pas détectée. Le contrôle entre deux captures n'a encore aucun cas réel.

## Ce qui est prêt à montrer

- Maquette : `maquette/index.html` (configuration `maquette` de `.claude/launch.json`, puis `/maquette/index.html`) : fil, publication détaillée, profil `@veilleuse`, Reels, actualités collectées, fiche, états, langue ; ordinateur et téléphone, clair et sombre.
- 8 exemples + earshot (projet GitHub mesuré), comptes Nodi, Repo, Pyxo, Mova, Pulse (sans publication : aucun incident collecté), Radar ; filtre par auteur ; les 8 exemples : **108 passages sur 108** retrouvés mot pour mot (mots entiers) dans les captures réelles ; Reel d'exemple de 47,3 s (`maquette/medias/`).
- [Page de revue privée](https://claude.ai/artifact/6ywWE9bnPD9muroD9wq23K) : exemples à corriger, montages, budget, délais.
- `docs/sources.md` : 24 sources actives, registre des candidates, 203 constats contre-vérifiés (166 confirmés, 35 corrigés, 2 invérifiables).
- Relecture adversariale (5 angles) : 28 constats confirmés, tous corrigés ; contre-relecture : 15 points mineurs de plus, tous traités (détail dans PROGRESS.md).

## Décisions de l'utilisateur (2026-10-30, à respecter)

- Orientation de la feuille de route révisée validée ; P6–P14 prévisionnels, sans alourdir la V1.
- Langue : celle du navigateur parmi les langues disponibles, choix manuel, langue de secours (construit en P4).
- Six comptes éditoriaux provisoires sur un même moteur ; « Veilleuse » : mascotte du site et présentatrice. Exemples toujours signalés comme tels.
- **2026-10-31 : Reddit reste dans le périmètre, en source différée.** Demande d'accès non déposée ; il ne doit pas être exclu du cadrage. Motif et conditions de reprise : docs/sources.md §3.7.

## Ajustements du 2026-11-02

- Plafond de 20 publications par jour, sans quota ; priorités modèles, ressources, fonctionnalités, autres (SPEC §3.6). Consignes `s3`, prompt `p3-10`, `prioriteEditoriale` testée (558 tests). Application du plafond : P5.
- Objectif de la minute rétabli pour les nouveautés prioritaires (ADR 0006).
- Ressources pour construire : 47 candidates dans 4 domaines (docs/ressources-candidates.md), vérifiées par des agents sur les pages officielles, non triées.
- Mobile : ADR 0010 validée le 2026-11-02 (API partagée et site installable en P4, application Expo en P9 bis).

## Session mobile (2026-11-02)

Worktree `.worktrees/mobile` (exclu localement via `.git/info/exclude`), branche `mobile` partie de `1796885`, sans le travail non commité. Règles de partage dans `.worktrees/mobile/MOBILE.md`. La session mobile écrit seulement `apps/mobile/**` et `docs/mobile/**`. La session principale garde tout le reste, dont `packages/contrat/` (API v1) et la racine. Ports : 4173 maquette, 3000 site, 8081 Expo. Aucun compte ni dépense mobile sans accord. Ne pas écrire dans `.worktrees/`.

## En attente de l'utilisateur

1. **Corriger les 15 exemples** sur la page de revue (0 avis reçu au 2026-11-01). Les avis sont dans la collection `avis` de la page ; Claude les importe avec `npm run selection -- avis`.
2. **Modèle par défaut** : comparaison réelle faite (0,083 $, ADR 0009). DeepSeek Flash choisi par l'utilisateur le 2026-11-01, contre la recommandation Haiku, risque d'erreurs connu (13 contre 3). À faire : SPEC §8, et `npm run brouillons` qui refuse encore tout modèle non Claude. La première clé Anthropic exposée en conversation a été supprimée.
3. **Hébergement du cycle de 60 s** (objectif de la minute rétabli le 2026-11-02, ADR 0006) et jeton GitHub : à décider avant P5.
4. **Montages** : valider le style (ADR 0007), et décider si annoter ou détourer une capture d'éditeur est acceptable (docs/visuels.md §4).
5. Kits presse autorisés ; droits à vérifier photo par photo avant mise en ligne.
6. Langues disponibles au lancement (proposition : français seul) et nom définitif du compte éditorial — avant P4.
7. Droits d'usage de la mascotte ; fréquence maximale de publication — avant le premier lot réel de P3.
8. Décisions sur les sources et médias (X, reprise de Reddit, sources aux conditions restrictives, hébergement vidéo, traduction, bacs à sable, points juridiques) : `docs/sources.md` §8.1 — avant P6/P7.
9. Propositions : préciser SPEC §7.3 « sous-chaîne exacte » en « bornée à des mots entiers », et « les textes du média généré » en « les diapositives, désignées par nom de champ » (déjà appliqué par le code).
10. **Seuil d'étoiles** (avant P6) : valeur, et portes d'entrée sous le seuil. Proposition : 500, avec progression mesurée ou mention par une source suivie (SPEC §11).
13. **Trier les 47 ressources** sur https://claude.ai/artifact/YGeV9JfuPUGTajUTzF9Yxb (collections `tri` et `propositions`) ; liste source docs/ressources-candidates.md (garder ou retirer, avec motif).
12. **Mobile** (ADR 0010, validée) : comptes Apple (99 USD/an) et Google (25 USD) à décider avant P9 bis.
11. **Recherche** : la garder en P6, ou avancer en P4 une version limitée aux mots exacts (SPEC §11).

## Prochaine action

Importer les corrections dès qu'elles arrivent, écrire `s3`, puis préparer les avis à l'aveugle. Aucun appel payant hors de ce lot sans validation du fournisseur, de la clé et des plafonds. Règle visuelle : photos qui donnent envie, comme Radar/Google.

## Repères techniques

- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Les agents d'un workflow de recherche peuvent utiliser le navigateur intégré : vérifier la maquette dans un onglet à soi (`tabs_create`) et toujours passer son `tabId`.
- `drizzle-kit generate` s'arrête sur une question si une colonne disparaît en même temps qu'une autre apparaît : le faire en deux migrations.
- La sonde et les relectures utilisent `data/curation.db` : attendre la fin de la sonde avant une migration.
- `npm run maquette` sort en code 1 si un exemple est « à vérifier » ou introuvable ; `npm run maquette:reel` (macOS, ffmpeg dans `~/.local/bin`) ; les tests échouent si `maquette/donnees.js` ou la vidéo sont périmés.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
