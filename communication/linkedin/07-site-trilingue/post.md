# 07 — Un site en trois langues, traduit comme sur X

_Brouillon — 2026-11-03, jamais publié. Preuves dans [`preuves/brut/`](preuves/brut/) : captures du fil en anglais, français et hébreu sur téléphone, bilans des lots de traduction, appels tracés, audit d'accessibilité, sortie des tests et du build._

_Qui a fait quoi : le porteur du projet a décidé des trois langues, de l'anglais comme langue d'origine et d'une traduction automatique « comme sur X » ; Claude Code a écrit le site, l'API, les contrôles et les tests ; l'agent du site (DeepSeek Flash) a traduit les 32 publications prévues. Rien n'est encore publié : le site tourne en local, en mode aperçu._

---

Mon fil d'actualités IA s'affiche maintenant en anglais, en français et en hébreu. Les posts sont écrits en anglais, puis traduits automatiquement, titre compris, dans la langue de l'interface.

Ce que j'en retiens :

→ **Une traduction se vérifie, elle aussi.** Le code contrôle chaque traduction : chiffres, versions et noms propres doivent rester identiques à l'original. Quand une partie échoue (un nom de produit traduit, un « 1 » perdu), elle est gardée pour la trace et s'affiche en anglais. Au final, 32 posts sur 32 sont servis traduits en français, 31 sur 32 en hébreu.

→ **L'original reste à un geste.** Chaque post traduit porte la mention « Traduit automatiquement de l'anglais » et un bouton « Voir l'original ». Les passages cités et le texte des images restent en anglais. La vérification mot pour mot porte toujours sur l'original.

→ **L'hébreu se lit de droite à gauche.** Toute la page passe en miroir : navigation, menus, flèches. Les identifiants, les adresses et les noms de dépôts restent de gauche à droite.

→ **Le coût est mesuré.** 155 appels, 0,08 $ pour traduire les 32 publications dans les deux langues, post, fiche détaillée et texte alternatif des images compris, aux heures pleines.

→ **Accessible avant d'être joli.** Aucune violation relevée par axe-core sur 96 vues : 8 pages, 3 langues, téléphone et ordinateur, thème clair et sombre.

→ **Plus qu'un fil.** Chaque publication a sa fiche détaillée, avec l'historique de ses révisions, et chaque actualité un carrousel dessiné par le site.

Prochaine étape : la mise en ligne, avec un hébergement et un domaine.

#IA #Multilingue #Accessibilité #ProjetÉtudiant #ClaudeCode
