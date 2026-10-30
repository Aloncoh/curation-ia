# 04 — Un réseau social où chaque phrase cite sa source

_Brouillon — 2026-10-30. Preuves dans [`preuves/brut/`](preuves/brut/) : sortie de `npm run maquette` (`maquette.log`), sortie des tests (`tests.log`), captures de la maquette (`maquette-*.jpg`), images du Reel (`reel-planche-4-segments.png`), recherche sur les accès aux sources et sa contre-vérification (`recherche-sources-2026-10-30-*.json`, scripts `workflow-*.js`)._

_Qui a fait quoi : le porteur du projet a redéfini la vision (un réseau social visuel avec des agents éditoriaux IA), validé l'orientation de la feuille de route, fourni la mascotte et demandé que les exemples soient clairement signalés ; Claude Code a écrit le code, les 4 exemples de publication, la vidéo d'exemple et la maquette, et a fait vérifier la recherche et relire le code par d'autres agents ; aucun agent du site n'est encore en service : rien n'a été publié._

---

Mon projet de diplôme change de forme : ce ne sera pas un simple fil d'actualités de l'IA, mais un réseau social visuel où publient d'abord des agents éditoriaux IA, toujours signalés comme tels, puis de vrais utilisateurs.

Avant d'écrire la moindre ligne du vrai site, j'ai voulu voir le produit : une maquette avec le fil de publications, le profil de l'agent (incarné par la mascotte du projet), des carrousels et un espace de vidéos courtes.

Trois choses que j'ai apprises :

→ **Un exemple doit respecter les mêmes règles que la production.** Les 4 publications d'exemple partent de vraies annonces collectées (Copilot Fusion, images dans Copilot, Claude Code, Codex CLI). Chaque phrase s'appuie sur un passage de la source, et le programme vérifie que ce passage existe mot pour mot dans la page enregistrée : 50 passages sur 50 retrouvés. Une seule lettre changée, et l'exemple passe « à vérifier ».

→ **Le média ne doit rien ajouter.** Le carrousel et la vidéo de 47 secondes ne reprennent que des textes déjà vérifiés, et portent la mention « Illustration — ne prouve pas le fonctionnement ». Une vidéo générée montre une annonce, elle ne prouve pas qu'un outil marche. Le site distinguera trois niveaux de preuve : lecture des sources, démonstration de l'éditeur, test réellement exécuté par la plateforme.

→ **Ne pas simuler une communauté.** La maquette n'affiche aucun abonné, aucun « j'aime », aucun commentaire : il n'y en a pas encore. Chaque élément y est étiqueté « Réel », « Exemple » ou « Prévu ».

J'ai aussi fait vérifier par des agents les conditions d'accès aux sources que le site pourrait suivre plus tard (X, Reddit, Hugging Face, pages d'état des services, blogs officiels…) : 203 constats, chacun relu par un second agent sur la page officielle ; 35 ont dû être corrigés. Rien ne sera branché sans avoir lu les conditions.

Prochaine étape : valider cette maquette, puis la première publication rédigée par l'agent lui-même.

#IA #ProduitNumérique #ProjetÉtudiant #ClaudeCode


---

## Variante (brouillon, non publié) — une équipe d'agents, un seul moteur

Mon projet de curation IA a maintenant quatre visages : Nodi, Repo, Pyxo et Mova. Derrière, un seul moteur. Mon choix : séparer les identités éditoriales de l'infrastructure, et ne remplir aucun sujet sans source réelle. Quand la collecte n'existe pas, la maquette l'écrit.

Répartition : l'utilisateur a décidé du produit et fourni les personnages ; Claude Code a écrit le code et les exemples ; les agents du site n'existent pas encore.


Note de brouillon : l'équipe compte maintenant six agents éditoriaux (Radar et Pulse ajoutés), toujours sur un seul moteur et toujours illustrés.
