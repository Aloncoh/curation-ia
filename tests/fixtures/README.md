# Fixtures

`github-releases-claude-code.json` : réponse **réelle** de `GET https://api.github.com/repos/anthropics/claude-code/releases?per_page=5`, capturée le 2026-10-30 à 00:22 UTC, réduite aux champs utilisés par le collecteur (`id`, `tag_name`, `name`, `html_url`, `body`, `draft`, `prerelease`, `created_at`, `published_at`). Réponse complète d'origine : `communication/linkedin/01-cadrage/preuves/brut/`.

Les tests l'utilisent pour être reproductibles sans réseau. Une collecte qui la lit (variable `CURATION_FIXTURE`) est tracée en mode « fixture » et ne doit jamais être présentée comme une collecte réelle.
