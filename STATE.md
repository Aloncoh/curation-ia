# État du projet

_Mis à jour le 2026-10-30 : quatre comptes et fil visuel ajoutés à la maquette._

- **Phase** : **P2 terminé, maquette validée par l'utilisateur le 2026-10-30.** Prochain jalon : P3, plan à valider.
- **Dépôt** : travail de P2 commité sur la branche `p2-maquette-sociale`.
- **Tests** : 187 réussis, types OK. **Blocages** : aucun. **Dépenses** : 0 €. Aucun compte créé.

## Ce qui est prêt à montrer

- Maquette : `maquette/index.html` (configuration `maquette` de `.claude/launch.json`, puis `/maquette/index.html`) : fil, publication détaillée, profil `@veilleuse`, Reels, actualités collectées, fiche, états, langue ; ordinateur et téléphone, clair et sombre.
- 7 exemples + earshot (projet GitHub mesuré), comptes Nodi, Repo, Pyxo, Mova, Pulse (sans publication : aucun incident collecté), Radar ; filtre par auteur ; les 4 exemples d'origine : **50 passages sur 50** retrouvés mot pour mot (mots entiers) dans les captures réelles ; Reel d'exemple de 47,3 s (`maquette/medias/`).
- `docs/sources.md` : 5 sources actives, environ 90 candidates, 203 constats contre-vérifiés (166 confirmés, 35 corrigés, 2 invérifiables).
- Relecture adversariale (5 angles) : 28 constats confirmés, tous corrigés ; contre-relecture : 15 points mineurs de plus, tous traités (détail dans PROGRESS.md).

## Décisions de l'utilisateur (2026-10-30, à respecter)

- Orientation de la feuille de route révisée validée ; P6–P14 prévisionnels, sans alourdir la V1.
- Langue : celle du navigateur parmi les langues disponibles, choix manuel, langue de secours (construit en P4).
- Quatre comptes éditoriaux provisoires sur un même moteur ; « Veilleuse » : mascotte du site et présentatrice. Exemples toujours signalés comme tels.

## En attente de l'utilisateur

1. Validation du plan de P3.
2. Fusion de `p2-maquette-sociale` dans `main`.
3. Langues disponibles au lancement (proposition : français seul) et nom définitif du compte éditorial — avant P4.
4. Droits d'usage de la mascotte ; budget plafond et fréquence maximale de publication — avant P3.
5. Décisions sur les sources et médias (X, Reddit, sources aux conditions restrictives, hébergement vidéo, traduction, bacs à sable, points juridiques) : options chiffrées dans `docs/sources.md` §8.1 — avant P6/P7, pas maintenant.
6. Proposition : préciser SPEC §7.3 « sous-chaîne exacte » en « sous-chaîne exacte, bornée à des mots entiers » (déjà appliqué par le code, plus strict).

## Prochaine action

Soumettre puis exécuter le plan de P3 : aucun crédit API activé sans accord.

## Repères techniques

- Cache npm `~/.npm` d'un autre utilisateur → `npm install --cache <dossier temporaire>`.
- Le hook GateGuard refuse la première commande Bash et la première modification de chaque fichier par séance : donner les informations demandées puis relancer.
- Les agents d'un workflow de recherche peuvent utiliser le navigateur intégré : vérifier la maquette dans un onglet à soi (`tabs_create`) et toujours passer son `tabId`.
- `npm run maquette` sort en code 1 si un exemple est « à vérifier » ou introuvable ; `npm run maquette:reel` (macOS, ffmpeg dans `~/.local/bin`) ; les tests échouent si `maquette/donnees.js` ou la vidéo sont périmés.

## Reprise

```bash
cd "/Users/aloncohen/CURATION AI" && git log --oneline | head -3 && git status --short && npm test
```
