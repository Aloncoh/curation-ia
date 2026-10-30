# 02 — Une collecte fiable, testée jusqu'à l'arrêt brutal

_Brouillon — 2026-10-30. Preuves dans [`preuves/brut/`](preuves/brut/) : journal de l'essai réel (`essai-reel.log`), vérifications SQL (`verifications-sql.txt`), extrait de l'export (`export-extrait.json`), sortie des 90 tests (`tests.log`)._

---

Mon projet de diplôme vient de franchir sa première étape technique : collecter, de façon fiable, les annonces officielles qui alimenteront le site.

Concrètement, le programme interroge l'API officielle de GitHub, récupère les dernières versions de Claude Code et les enregistre avec leur provenance : identifiant, date d'annonce, date de collecte, empreinte du texte. Pas encore d'IA : d'abord des données dont on connaît l'origine.

Ce qui m'a le plus appris, c'est la question « et si ça plante ? » :
→ relancer la collecte ne crée aucun doublon ;
→ un processus tué en pleine écriture ne laisse rien à moitié enregistré ;
→ deux collectes lancées en même temps ne traitent jamais le même travail (testé avec 300 tâches réparties entre deux processus) ;
→ une source en panne ne touche pas aux données déjà enregistrées.

Claude Code a écrit le code et 90 tests sous ma supervision, puis l'a fait relire par d'autres agents chargés d'y chercher des failles : 18 défauts réels trouvés et corrigés, dont un comportement inattendu du pilote de base de données après un verrou trop long.

Essai réel : 5 versions collectées, dont une publiée la nuit même. Seconde collecte : zéro doublon.

Prochaine étape : passer des documents bruts aux produits et à leurs versions.

#IA #DataEngineering #ProjetÉtudiant #ClaudeCode
