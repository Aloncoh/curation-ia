# Fixtures

`github-releases-claude-code.json` : réponse **réelle** de `GET https://api.github.com/repos/anthropics/claude-code/releases?per_page=5`, capturée le 2026-10-30 à 00:22 UTC, réduite aux champs utilisés par le collecteur (`id`, `tag_name`, `name`, `html_url`, `body`, `draft`, `prerelease`, `created_at`, `published_at`). Réponse complète d'origine : `communication/linkedin/01-cadrage/preuves/brut/`.

Ajoutées en P2, capturées le 2026-10-30 vers 01:32 UTC, mêmes principes :
- `github-releases-openai-codex.json` et `github-releases-gemini-cli.json` : `per_page=20`, mêmes champs (surtout des préversions) ;
- `feed-openai-news.xml` : flux RSS officiel d'OpenAI News réduit à ses 25 premières entrées (le flux complet en contient 1 337) ;
- `feed-github-changelog.xml` : flux RSS officiel du GitHub Changelog, complet (10 entrées).

Les tests les utilisent pour être reproductibles sans réseau. Une collecte qui la lit (variable `CURATION_FIXTURE`) est tracée en mode « fixture » et ne doit jamais être présentée comme une collecte réelle.
