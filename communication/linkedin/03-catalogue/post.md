# 03 — Cinq sources, un catalogue sans doublon, une mascotte

_Brouillon — 2026-10-30. Preuves dans [`preuves/brut/`](preuves/brut/) : journal de l'essai réel (`essai-reel.log`), vérifications SQL (`verifications-sql.txt`), extrait de l'export (`export-extrait.json`), sortie des tests (`tests.log`), captures de la maquette (`maquette-*.png`)._

_Qui a fait quoi : le porteur du projet a validé le plan du jalon, choisi les sources et fourni la mascotte ; Claude Code a écrit le code, les tests et la maquette, et a fait relire le code par d'autres agents ; aucun agent du site n'est encore en service (pas d'IA dans la chaîne à ce stade)._

---

Deuxième étape de mon projet de diplôme : passer d'une source à cinq, et de documents bruts à un vrai catalogue.

Le programme suit maintenant les versions de trois assistants de code (Claude Code, Codex CLI, Gemini CLI) et deux flux d'annonces officiels (OpenAI News, GitHub Changelog). Chaque document est rangé, sans IA, en produits, versions et actualités.

Trois choses que j'ai apprises :

→ **Le fil se noie vite.** Codex et Gemini publient surtout des versions d'essai (17 et 18 sur leurs 20 dernières). Elles restent dans l'historique, mais seules les versions stables deviennent des actualités.

→ **« Sans doublon » doit être garanti par la base, pas seulement par le code.** Une release supprimée puis recréée sur GitHub change d'identifiant : sans règle d'unicité sur la version, elle apparaissait deux fois dans le fil. Deux relectures par d'autres agents ont relevé plus de quarante défauts démontrés de ce genre (doublons, sécurité du lecteur de flux, accessibilité de la maquette) : tous corrigés et testés, ou documentés quand c'était une limite assumée. 150 tests au total.

→ **Les données de test peuvent mentir par omission.** Pour rester légères, les données de test ne gardaient que les champs utiles des réponses de GitHub. L'essai réel a montré que Codex joint environ 350 fichiers à chaque version : sa réponse dépassait la limite de taille prévue. Seul le vrai réseau l'a révélé.

Essai réel : 5 sources, 70 documents, 44 actualités (14 versions stables, 30 annonces). Seconde collecte : zéro doublon.

Et le site a maintenant un visage : une maquette du fil, construite autour de la mascotte du projet. Son visage sombre devient la tuile de chaque carte, où le numéro de version s'affiche comme ses yeux lumineux. Tant qu'aucune analyse n'existe, chaque carte le dit : « Collecté, pas encore analysé ».

Prochaine étape : la première analyse IA, où chaque affirmation devra citer sa source mot pour mot.

#IA #DataEngineering #ProjetÉtudiant #ClaudeCode
