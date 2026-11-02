# Délais de publication

> Mesures du 2026-10-31. **Aucun délai de bout en bout n'a été mesuré** : rien n'est publié, aucun modèle réel n'a été appelé et une seule nouvelle entrée a été vue. Objectif de l'utilisateur : publication automatique dans la minute suivant une sortie, quand la source et les contrôles le permettent, après la pertinence et la vérification. Recalcul : `npm run sonde`, puis `npm run delais`.

> **Quatre moments, mesurés séparément** (précisé le 2026-11-01) : la date de sortie donnée par la source, la détection, le traitement et la publication. Un cycle de collecte de 60 s ne prouve pas à lui seul que la minute est tenue. `npm run delais` calcule maintenant le délai de bout en bout, sortie annoncée → mise en ligne, sur les seules dates assez précises ; il reste « non mesuré » tant que rien n'est publié.

## 1. Où en est la mesure

| Étape | Durée | Statut |
|---|---|---|
| Attente de la prochaine vérification, cycle de 60 s | 0 à 60 s, 30 s en moyenne | calcul |
| Récupération d'une source | 45 à 832 ms en médiane selon le flux, 1 838 ms pour Codex | mesuré |
| Apparition dans le flux après la sortie | inconnue | non mesuré |
| Qualification et rédaction | de 7 à 35 s selon le modèle et le raisonnement | estimation, d'après des mesures tierces |
| Chaîne locale, contrôles compris | 7 ms par actualité | mesuré, faux modèle, 100 actualités |
| Montage | de 330 à 410 ms en médiane, 604 ms au maximum | mesuré, 8 images |
| Mise en ligne sur le site | inconnue | non mesuré, site absent |
| Bout en bout, sortie annoncée → mise en ligne | inconnue | non mesuré, 0 publication |

Avec un cycle de 60 s, l'addition va d'environ 8 s à plus de 95 s, hors délai de la source. **La minute reste possible sur les sources favorables, sans être garantie, et elle n'est pas démontrée.**

L'estimation du modèle vient d'Artificial Analysis, tiers non vérifié : 500 tokens en 7,18 s sur V4 Pro sans raisonnement, 16,65 s sur V4.1 Flash en mode max. Une publication demande environ 920 tokens de sortie en deux appels. Flash sans raisonnement chez DeepSeek et Haiku n'ont aucun chiffre lu ici.

## 2. Sonde de détection

Du 2026-10-31 à 20:29 UTC au 2026-10-31 à 22:00 UTC, depuis ce poste : 1 920 requêtes sur 24 sources, 0 erreur, 1 117 réponses 304, 277 Mo reçus. Flux interrogés chaque minute, dépôts GitHub toutes les 4 minutes pour tenir le quota sans jeton.

**Une seule entrée nouvelle** : une publication de Higgsfield, datée de 20:30 UTC la veille, vue dans le flux 24 h 10 min plus tard, dans une fenêtre de 60 s. Cet écart montre qu'une date de source n'est pas l'instant d'apparition, et sa date arrondie ne permet aucune mesure. Délai de détection : non mesuré, 0 cas mesurable. Un samedi soir ne dit rien d'un jour de sorties : il faut plusieurs jours de sonde sur une machine permanente.

Limites de la sonde : un flux Atom sans date de publication donne sa date de mise à jour, et un refus de débit impose une attente fixe de 15 minutes. La sonde de cette mesure gardait la référence sur les 20 dernières entrées. La version corrigée lit tout le flux. Cela ne change rien ici : l'entrée vue est datée de la veille et reste parmi les plus récentes de son flux.

## 3. Ce qui empêche la minute

Relevé sur la sonde, sur la base et sur les pages officielles lues le 2026-10-31.

| Sources | Limite | Effet |
|---|---|---|
| Hugging Face, Higgsfield, Notion | texte vide dans le flux (médiane 0) | rien à vérifier sans lire l'article : `approfondir` |
| OpenAI, Google Gemini, Gemini Notebook, Mistral, ElevenLabs, Figma, Spline, Suno, SIGGRAPH | titre ou résumé seul (médiane sous 300 caractères) | même effet, et ce sont souvent les annonces majeures |
| Cursor, Figma, Spline, Vapi, Notion, blog MCP, OpenAI, ElevenLabs, Google | date à la journée ou arrondie | délai impossible à mesurer depuis la source |
| GitHub Changelog | cache de 5 minutes annoncé, flux limité à 10 entrées | jusqu'à 5 minutes de retard possibles, trou possible en rafale |
| ElevenLabs, Higgsfield, Blender | cache annoncé de 45 minutes à 24 heures | copie ancienne possible, à vérifier en réel |
| Midjourney, n8n, Spline, Vapi | copies vues âgées de 12 à 59 heures | ne prouve aucun retard : le cache peut être purgé à la publication |
| OpenAI, Google, Gemini Notebook, ElevenLabs, Cursor, Notion, Higgsfield, Figma | ni ETag ni Last-Modified | flux entier retéléchargé à chaque cycle |
| Dépôts GitHub | 60 requêtes par heure sans jeton ; cache public de 60 s ; ETag qui change sans nouvelle sortie pour Claude Code et Codex (1 et 0 réponse 304 sur 22) ; Codex pèse jusqu'à 5,6 Mo | jeton obligatoire pour 60 s, et 120 s au pire avec le cache |
| Toutes | aucun hub WebSub sur nos flux, aucun webhook possible sur un dépôt tiers | seule l'interrogation répétée est possible |

**Sources les plus favorables à ce jour** (texte complet et date précise) : releases de Claude Code et de Gemini CLI, blog Comfy, Midjourney, n8n, Blender, sous réserve de leur cache. Codex a des dates précises, mais un texte médian de 23 caractères : ses préversions sont presque vides.

## 4. Options de cycle

Prix relevés le 2026-10-31. Détail et décision : [ADR 0006](decisions/0006-delai-de-publication.md).

| Moyen | Cycle réel | Coût | Réserve |
|---|---|---|---|
| GitHub Actions | 5 min au mieux | 0 € en dépôt public | retards et abandons possibles |
| Vercel Hobby | 1 fois par jour | 0 € | exclu |
| Vercel Pro | 1 min | 20 $ par mois | bien plus que le besoin |
| cron-job.org ou Google Cloud Scheduler | 1 min | 0 € | il faut une cible, non testé |
| Cloudflare Workers gratuit | 1 min | 0 € | 10 ms de CPU, notre contrôle anti-SSRF n'y tient pas |
| Processus permanent, Fly.io | sous 60 s possible | 2,19 $ pour 30 jours, régions US | mémoire de 256 Mo non testée |
| Processus permanent, OVH | sous 60 s possible | 4,49 € HT par mois | serveur à administrer |

Un cycle de 60 s sur Turso gratuit laisse environ 11 500 lignes lues et 230 écrites par cycle, à partager avec le site ; un dépassement bloque la base.

## 5. Ordre de priorité

La rapidité passe après la pertinence et la vérification. Un sujet n'est publié vite que si sa décision vaut `publier`, si ses contrôles ne signalent aucun écart, et si la fréquence et le budget le permettent. Tout le reste attend, sans limite de temps. Le passage à la publication automatique reste décidé par l'utilisateur (SPEC §7.4).
