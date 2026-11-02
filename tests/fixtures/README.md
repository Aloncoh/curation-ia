# Fixtures

`github-releases-claude-code.json` : réponse **réelle** de `GET https://api.github.com/repos/anthropics/claude-code/releases?per_page=5`, capturée le 2026-10-30 à 00:22 UTC, réduite aux champs utilisés par le collecteur (`id`, `tag_name`, `name`, `html_url`, `body`, `draft`, `prerelease`, `created_at`, `published_at`). Réponse complète d'origine : `communication/linkedin/01-cadrage/preuves/brut/`.

Ajoutées en P2, capturées le 2026-10-30 vers 01:32 UTC, mêmes principes :
- `github-releases-openai-codex.json` et `github-releases-gemini-cli.json` : `per_page=20`, mêmes champs (surtout des préversions) ;
- `feed-openai-news.xml` : flux RSS officiel d'OpenAI News réduit à ses 25 premières entrées (le flux complet en contient 1 337) ;
- `feed-github-changelog.xml` : flux RSS officiel du GitHub Changelog, complet (10 entrées).

Ajoutée en P3 : `feed-google-gemini.xml`, flux RSS officiel Google The Keyword, Gemini (`https://blog.google/products-and-platforms/products/gemini/rss/`), 20 entrées, résumés seulement ; capturée le 2026-10-30, heure exacte non conservée.

Limites connues de ces fixtures :
- la réduction aux champs utilisés retire les fichiers joints : la réponse réelle de Codex CLI pèse environ 550 Ko par release (≈ 350 fichiers joints), ce que la fixture ne montre pas — c'est l'essai réel du 2026-10-30 qui a révélé le dépassement de la limite de 2 Mio (d'où une limite propre à cette source) ;
- les tests servent la fixture Claude Code (`per_page=5`) à l'URL configurée (`per_page=10`) : la réponse est réelle, la taille de page ne correspond pas ;
- les réponses complètes et les en-têtes des fixtures de P2 n'ont pas été conservés ; ceux de l'essai réel de P2 le sont dans `communication/linkedin/03-catalogue/preuves/brut/`.

Les tests les utilisent pour être reproductibles sans réseau. Une collecte qui la lit (variable `CURATION_FIXTURE`) est tracée en mode « fixture » et ne doit jamais être présentée comme une collecte réelle.

Ajoutées pour la chaîne des ressources (ADR 0011), dans `ressources/` : **fabriquées pour les tests**, ce ne sont pas des réponses réelles. Le dépôt `exemple-org/demo-skills`, son fork `exemple-org/demo-fork`, leurs README, SKILL.md, licence, listes de dossiers et le brouillon `brouillon-demo-anim.json` sont inventés pour exercer la capture, les contrôles et les commandes sans réseau ni contenu de tiers. Les champs suivent la forme documentée de l'API GitHub (`GET /repos/{owner}/{repo}`, `GET /repos/{owner}/{repo}/contents/{path}`), avec quelques champs non utilisés pour vérifier qu'ils ne sont pas conservés.

Ajoutée pour la recherche (ADR 0011 §5), dans `recherche/publications.json` : **fabriquée pour les tests**. Sept publications de ressources inventées (`demo-anim`, `demo-courbes`, `demo-video`, `demo-tableur`, `demo-memoire`, une à vérifier, une en attente non planifiée), avec leurs textes et leurs mots-clés structurés, pour exercer l'index, le classement, l'explication des correspondances et les exclusions. Les passages cités sont inventés et ne renvoient à aucune capture réelle.
