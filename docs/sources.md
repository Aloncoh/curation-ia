# Registre des sources

> Statut au 2026-10-30 : **24 sources actives** (collecte réelle réussie et tracée), toutes officielles ; élargissement à l'écosystème créatif en §2 bis et §3.10. Toutes les autres sont **candidates** : rien n'y est collecté. Ce registre consigne l'état d'accès vérifié ; il ne décide rien (les choix à faire sont en §8). Références : SPEC §7.1 et §7.9 ; ROADMAP P2 (étape 7), P6 et P7. Configuration : [src/sources.ts](../src/sources.ts). Essais réels : [PROGRESS.md](../PROGRESS.md). Le registre passe en base en P6.

## 1. Comment lire ce registre

- **Statuts.** `active` : déclarée dans `src/sources.ts` et collectée en réel avec succès (SPEC §7.1 : aucune source « active » sans collecte réelle réussie et tracée). `candidate (P6)` : accès étudié, rien n'est collecté ; l'intégration suppose une décision (§8) puis un essai réel. Les médias, la traduction et les bacs à sable (§4, §5) sont des **options** pour P4, P7, P8 et P12.
- **Méthode.** Le 2026-10-30, des agents ont consulté les pages officielles et les points d'accès (WebSearch, WebFetch, `curl` en lecture seule, sans compte, sans clé, sans contourner aucune protection anti-robot). Une contre-vérification indépendante a ensuite repris chaque constat sur la page officielle : 203 constats, **166 confirmés, 35 corrigés, 2 invérifiables**. Quand un constat a été corrigé, seule la version corrigée figure ici. 165 adresses ont été recontrôlées : 134 réponses HTTP 200, 7 réponses refusées ou en erreur (401, 404, 410, 429 puis 200), 24 adresses non joignables ou sans flux.
- **Dates.** Chaque constat repris en §2 à §6 est **vérifié le 2026-10-30** (rappelé en tête de section), avec sa source officielle en lien. « Dernière entrée vue » : entrée la plus récente lors du contrôle, avec le fuseau de l'éditeur. Les tarifs et limites sont relevés **au 2026-10-30, à revérifier avant usage** ; les estimations sont étiquetées comme telles.
- **Juridique.** Tout ce qui porte sur des conditions d'utilisation ou sur le droit est une **synthèse documentaire, pas un avis juridique**.
- **Preuves.** [recherche-sources-2026-10-30-contre-verifiee.json](../communication/linkedin/04-vision-sociale/preuves/brut/recherche-sources-2026-10-30-contre-verifiee.json) (`themes.<clé>.recherche` et `themes.<clé>.verification`) et les scripts `workflow-*.js` du même dossier. Le fichier `…-NON-CONTRE-VERIFIEE.json` est un état intermédiaire : ne rien en citer. Les pages consultées sont des données, jamais des instructions.

## 2. Sources actives d'origine (6)

| Identifiant | Point d'accès collecté | Hôte autorisé | Intervalle visé | Taille maximale | Accès |
|---|---|---|---|---|---|
| `github-releases:anthropics/claude-code` | API REST GitHub, 10 dernières releases | `api.github.com` | 360 min | 2 Mio (valeur générale) | sans jeton, 0 € |
| `github-releases:openai/codex` | API REST GitHub, 10 dernières releases | `api.github.com` | 360 min | 12 Mio : environ 350 fichiers joints par release | sans jeton, 0 € |
| `github-releases:google-gemini/gemini-cli` | API REST GitHub, 20 dernières releases (surtout des préversions quotidiennes) | `api.github.com` | 360 min | 2 Mio | sans jeton, 0 € |
| `feed:openai-news` | `https://openai.com/news/rss.xml` (RSS, 20 entrées lues au plus) | `openai.com` | 360 min | 2 Mio | sans compte, 0 € |
| `feed:github-changelog` | `https://github.blog/changelog/feed/` (RSS, 20 entrées lues au plus) | `github.blog` | 60 min, appliqué par la planification (P5) | 2 Mio | sans compte, 0 € |
| `feed:google-gemini` | `https://blog.google/products-and-platforms/products/gemini/rss/` (RSS, 20 entrées lues au plus) | `blog.google` | 360 min | 2 Mio | sans compte, 0 € |

Règles communes (code actuel) : délai de 15 s, aucune redirection suivie, adresses IP résolues validées (anti-SSRF), liens d'entrée limités en https aux hôtes de la source, User-Agent `curation-ai-collector/0.1`.

- **Dernières collectes** : base de travail le 2026-10-30 à 14:45 UTC (§2 bis) ; essai des 24 sources sur une copie de la base le 2026-10-31 (24 réussites, sortie brute dans `communication/linkedin/05-ecosysteme-creatif/preuves/brut/`).
- **Essai réel de P2** : 2026-10-30 à 02:25 UTC, 5 sources réussies, 65 nouveaux documents (plus 5 documents de P1 rattachés), 44 actualités (14 versions, 30 annonces) ; seconde collecte : aucun nouveau document, 70 inchangés, aucun doublon (requêtes SQL). Réponse réelle de Codex CLI : 5 571 996 octets. [Preuves](../communication/linkedin/03-catalogue/preuves/brut/). Premier essai réel (Claude Code seul) : 2026-10-30 à 01:26 UTC. Collecte non planifiée avant P5.
- **GitHub** (vérifié le 2026-10-30) : sans jeton, 60 requêtes/h par adresse IP ; avec `GITHUB_TOKEN` dans GitHub Actions, 1 000/h par dépôt ; une réponse 304 n'échappe au quota que si la requête est authentifiée ([limites](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [bonnes pratiques](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)). Conditions d'utilisation : §3.1.
- **OpenAI News** (vérifié le 2026-10-30) : 1 337 entrées depuis 2015, environ 814 Ko, ni ETag ni Last-Modified (flux retéléchargé en entier) ; dernière entrée vue 2026-10-29T17:00:00Z ; la page `/news/` renvoie 403 à un client non navigateur, mais le flux répond. Les conditions d'utilisation d'OpenAI (version UE) n'ont pas pu être lues (§7.3).
- **GitHub Changelog** (vérifié le 2026-10-30) : 10 entrées seulement dans le flux ; dernière entrée vue 2026-10-29T17:14:38Z. Le projet a observé 9 publications en 25 minutes le 2026-10-28, d'où l'intervalle visé d'une heure.

## 2 bis. Sources ajoutées le 2026-10-30 (18 actives)

Collecte réelle du 2026-10-30 depuis le poste local : 18 sources réussies, 329 documents, puis seconde collecte sans doublon (preuve : la seconde passe ; Notion y fait sa première collecte, après correction de son hôte) ([preuve](../communication/linkedin/05-ecosysteme-creatif/preuves/brut/collecte-reelle-2026-10-30.txt)). Configuration : `src/sources.ts`, intervalle visé 360 min, 20 entrées au plus. Les conditions d'utilisation de ces flux n'ont pas toutes été lues : à vérifier avant la mise en ligne.

| Domaine | Compte probable | Sources |
|---|---|---|
| Modèles | Nodi | Mistral, Hugging Face Blog, Suno (notes de version), ElevenLabs, Midjourney |
| Outils et applications | Nodi, Pyxo | Cursor, Notion, Gemini Notebook |
| Création visuelle | Mova | Higgsfield, Comfy, Blender |
| Design | Mova | Figma (notes de version), Spline, Sketch |
| Agents et automatisations | Pyxo | n8n, Vapi |
| Connexions, conférences | Repo, Mova | Blog MCP, SIGGRAPH |

Limites : Higgsfield (0 texte sur 285 entrées), Hugging Face Blog et Notion ne donnent que des titres, comme 4 entrées sur 20 de Mistral. Relevé du 2026-10-31 sur 393 actualités : 64 sont sans texte et 2 de plus ont moins de trois mots ; ces 66 sont détectées, mais jamais envoyées au modèle tant que la page n'est pas lue. 192 ont moins de 200 caractères de texte. Notion : flux sur `www.notion.com`, liens sur `www.notion.so`.

**Reporté** : Google DeepMind répond en gzip même sans le demander. Le collecteur ne décompresse pas, et l'ajouter exige une limite contre les archives géantes.

## 2 ter. Registre d'accès, canaux de remplacement et sources différées (2026-11-05)

Demande de l'utilisateur du 2026-11-05 : aucun contournement, mais un traitement plus fin. Code : `src/collect/acces.ts` ; état courant : `npm run sources:registre` (lecture seule).

**États distingués** (colonne `source.acces_etat`). Un code HTTP seul ne permet pas de conclure aux conditions juridiques d'utilisation.

| État | Ce qui l'établit | Reprise |
|---|---|---|
| refus d'accès observé | 401, 403, 406, 451 reçus par notre client déclaré | tous les jours, puis plus rarement, une fois par semaine au plus |
| restriction contractuelle | **seulement** après lecture des conditions d'utilisation, notée à la main (`differee` dans `sources.ts`) | aucune collecte |
| erreur temporaire | 5xx, délai dépassé, erreur réseau | 15 min, puis le double à chaque échec, plafonné à 24 h |
| limitation de fréquence | 429 | `Retry-After` respecté s'il existe ; au moins 30 min, puis le double |
| page supprimée ou introuvable | 404, 410 | comme un refus |
| absence de flux exploitable | réponse lisible sans entrée | comme un refus |

Après huit échecs de suite, une tentative par semaine : **aucune source n'est supprimée ni abandonnée sur un incident**. Une source différée reste au registre (inactive) avec son état, son motif, sa date et son canal de remplacement.

**Canaux de remplacement trouvés le 2026-11-05** (pages et flux officiels, sans contournement) :
- Microsoft AI Blog (410) → Official Microsoft Blog et Azure Blog (200), en plus de Microsoft Source.
- Tesla (tesla.com : 403) → flux officiel des communiqués aux investisseurs `ir.tesla.com` (503 ce jour-là : erreur temporaire, repris par le registre), presse attribuée (TechCrunch, The Verge), EDGAR 8-K.
- TSMC, Qualcomm, Broadcom, Oracle (flux investisseurs ou blog : 403) → presse attribuée (rubriques TechCrunch) et EDGAR 8-K (sauf TSMC, émetteur étranger).
- LG Newsroom (aucune entrée) → The Verge et TechCrunch (presse attribuée).

**Presse seule accessible** : ses informations sont attribuées (« according to TechCrunch… ») et jamais présentées comme une confirmation primaire (consigne `p3-21`) ; une description qui n'attribue pas reste « à vérifier » (contrôle `attribution_externe_manquante`).

**Hacker News** (actif, signal de découverte) : histoires de la page d'accueil sur l'IA, 100 points au moins, lues par l'API publique de recherche `hn.algolia.com` (vers laquelle HN renvoie). Le signal (titre, points, discussion) reste en métadonnées ; l'article lié est récupéré à part : destination https sur un vrai nom de domaine, adresses IP résolues vérifiées (plages privées, locales et de métadonnées refusées), robots.txt lu d'abord (RFC 9309 ; inaccessible : rien n'est demandé), trois redirections au plus, chacune revalidée. Robots.txt n'est pas une lecture des conditions d'utilisation, que le code ne peut pas faire. Un article inaccessible ne donne aucun texte : rien n'est analysé.

**SEC EDGAR** (prêt, différé) : 8-K de 12 grandes entreprises, flux Atom officiels. La SEC exige un client déclaré avec une adresse de contact (403 sans elle) : variable `CURATION_CONTACT_SEC`, à fournir par l'utilisateur (local, secret GitHub). Numéros CIK à confirmer au premier relevé.

**Différées** (gardées au registre, non collectées) : Microsoft Research (403), TSMC (403), Qualcomm et Broadcom investisseurs (403), blog IA d'Oracle (403), LG Newsroom (aucune entrée), Uber Engineering (404), blog Snowflake (page d'erreur), LinkedIn Engineering (aucune entrée ; conditions non lues automatiquement), publications hébergées par Medium : Snowflake Builders, Netflix Tech Blog, Airbnb Engineering (500 pour notre client déclaré, 200 pour un navigateur : refus observé, non contourné). Reddit : aucun accès autorisé. X : accès officiel payant, tarif à vérifier avant décision de l'utilisateur.

## 3. Sources candidates (P6)

Statut de chaque ligne : **candidate (P6)**. Un code HTTP indique la réponse au contrôle du 2026-10-30. Les URL données sont les URL finales, puisque le collecteur ne suit aucune redirection.

### 3.1 Écosystème IA et développement (vérifié le 2026-10-30)

| Source | Point d'accès | Format | Dernière entrée vue | Authentification |
|---|---|---|---|---|
| Releases d'un dépôt GitHub | `https://github.com/{owner}/{repo}/releases.atom` (testé sur anthropics/anthropic-sdk-typescript) | Atom, 10 entrées | 2026-10-23T23:23:48Z (entrées non triées : prendre le maximum) | non ; limites non documentées |
| Recherche GitHub (approximation de « tendance ») | `https://api.github.com/search/repositories?q=topic:llm+created:>AAAA-MM-JJ&sort=stars` | JSON | sans objet | non (10 req/min) |
| anthropics/skills | `https://github.com/anthropics/skills/commits/main.atom` ; `https://raw.githubusercontent.com/anthropics/skills/main/.claude-plugin/marketplace.json` | Atom ; JSON | 2026-10-28T19:20:38Z | non |
| Places de marché de plugins Claude Code | `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json` (315 plugins) ; même chemin pour `claude-plugins-community` (2 283 plugins, 1,56 Mo) | JSON | sans objet | non |
| Hugging Face Hub | `https://huggingface.co/api/models?sort=trendingScore` (de même `/api/datasets`, `/api/spaces`) | JSON | classement | non |
| Hugging Face Daily Papers | `https://huggingface.co/api/daily_papers` | JSON | 2026-10-30T00:00:00Z | non ; pas de flux RSS officiel |
| Blog Hugging Face | `https://huggingface.co/blog/feed.xml` | RSS 2.0, 894 entrées, environ 264 Ko | 2026-10-29T13:37:07Z | non |
| Registre MCP officiel | `https://registry.modelcontextprotocol.io/v0.1/servers` | JSON paginé | 2026-10-30T05:49:56Z | non |
| Hacker News | `https://hacker-news.firebaseio.com/v0/topstories.json` ; `https://news.ycombinator.com/rss` | JSON ; RSS (30 items, sans score) | 2026-10-29T21:38:59Z ; 2026-10-30T02:33:04Z | non |
| HN Algolia et hnrss.org (tiers) | `https://hn.algolia.com/api/v1/search_by_date` ; `https://hnrss.org/newest?points=100` | JSON ; RSS | 2026-10-30T05:52:17Z ; 2026-10-29T21:48:35Z | non |
| Lobsters | `https://lobste.rs/t/ai.rss` ; `/rss`, `/hottest.json`, `/newest.json` | RSS ; JSON | 2026-10-29T05:00:04-05:00 (tag ai) | non |
| DEV | `https://dev.to/feed/tag/ai` ; `https://dev.to/api/articles?tag=ai` | RSS ; JSON | 2026-10-30T05:54:19Z (flux) | non |
| Product Hunt | `https://www.producthunt.com/feed` ; API `https://api.producthunt.com/v2/api/graphql` | Atom, 50 entrées ; GraphQL | 2026-10-28T22:31:15-07:00 ; API : 401 sans jeton | flux : non ; API : oui |
| Annuaires tiers | Smithery `https://api.smithery.ai/servers` : 200 sans clé ; Glama `https://glama.ai/api/mcp/v1/servers` : 401 ; PulseMCP v0.1 : 401, v0beta : 410 ; skills.sh `https://www.skills.sh/api/v1/skills` : 401 ; SkillsMP `https://skillsmp.com/api/v1/skills/search` : 200 ; mcp.so : 404 | JSON | sans objet | voir ci-dessous |

- **GitHub** ([limites](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [recherche](https://docs.github.com/en/rest/search/search), [CGU](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), [usage acceptable](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)) : 60 req/h sans authentification, 5 000/h avec un jeton personnel, 1 000/h par dépôt avec `GITHUB_TOKEN` ; recherche : 30 req/min authentifiée, 10 sans, 1 000 résultats au plus, tris stars, forks, help-wanted-issues, updated. Aucune API « trending » : `github.com/trending` est une page HTML, à ne pas extraire. CGU en vigueur depuis le 2026-04-27 : suspension possible en cas d'usage abusif (section H). Politique d'usage acceptable : « any form of excessive automated bulk activity » interdite (§4), reproduction ou exploitation du Service interdite sans autorisation écrite (§6), recherche limitée aux informations publiques non personnelles et à des publications en accès ouvert (§7).
- **Hugging Face** ([client officiel](https://huggingface.co/docs/huggingface_hub/package_reference/hf_api), [limites](https://huggingface.co/docs/hub/rate-limits), [CGU](https://huggingface.co/terms-of-service)) : tris `trendingScore`, `likes`, `createdAt` ; le tri par date fait remonter des dépôts non modérés. Limites par fenêtre de 5 min (API / Resolvers / Pages) : anonyme, par IP, 500 / 3 000 / 100 ; compte gratuit 1 000 / 5 000 / 200 ; PRO 2 500 / 12 000 / 400. Le flux du blog est décompté en « Pages » (100 / 5 min en anonyme, en-tête observé). `/api/daily_papers` figure dans l'OpenAPI officielle, `/api/models` non (documenté seulement par le client). Les CGU (15 septembre 2022) ne disent rien du scraping ni de l'API ; la licence accordée en rendant un dépôt public ne vaut que « through our Services » : hors de Hugging Face, seule compte la licence du contenu.
- **Registre MCP** ([agrégateurs](https://modelcontextprotocol.io/registry/registry-aggregators), [CGU](https://modelcontextprotocol.io/registry/terms-of-service.md), [modération](https://modelcontextprotocol.io/registry/moderation-policy.md)) : en preview, changements cassants ou remise à zéro des données possibles ; API gelée en `/v0.1` (sans date de GA), `/v0` en développement (version 1.8.6). Lecture sans authentification ; pagination par curseur ; `limit` ≤ 100 (422 au-delà) ; `updated_since` ; `version=latest` pour n'avoir que la dernière version ; 2 244 entrées mises à jour depuis 2026-10-29T12:00Z (23 pages de 100). Consignes : sonder à intervalle espacé (par exemple une fois par heure), stocker localement, suivre le `status` (`deleted` signale en général spam, logiciel malveillant ou contenu illégal). Métadonnées sous CC0 1.0 ; modération minimale ; CGU (2025-09-02) : 18 ans minimum, ne pas suggérer d'affiliation.
- **Skills et plugins** ([anthropics/skills](https://github.com/anthropics/skills), [spécification](https://agentskills.io/specification), [places de marché](https://code.claude.com/docs/en/plugins/anthropic-marketplaces.md), [skills.sh](https://www.skills.sh/docs/api)) : anthropics/skills n'a pas de licence globale ; beaucoup de skills sont sous Apache 2.0, docx, pdf, pptx et xlsx sont seulement « source-available » ; usage annoncé « demonstration and educational purposes only » ; son `marketplace.json` liste 5 plugins. agentskills.io est une spécification (`name` ≤ 64 caractères, `description` ≤ 1 024), sans catalogue ni API. Les places de marché n'ont pas d'API (le catalogue est le fichier `marketplace.json`) et Anthropic ne vérifie pas les places de marché tierces. skills.sh : API documentée (vues all-time, trending, hot), jeton OIDC d'un projet Vercel, 600 req/min par couple (équipe, projet) ; inutilisable directement depuis GitHub Actions.
- **Annuaires tiers.** Smithery ([doc](https://smithery.ai/docs/api-reference/servers/list-all-servers.md)) : clé Bearer documentée mais réponse 200 sans clé ; `topK` plafonné à 500, donc impossible d'énumérer les 20 755 serveurs ; CGU introuvables (404). Glama ([CGU, §15](https://glama.ai/policies/terms-of-service)) : clé obligatoire, attribution avec lien sur chaque page, redistribution en masse et produit concurrent interdits, cache à supprimer sous 30 jours en fin de licence. PulseMCP ([doc](https://www.pulsemcp.com/api/docs/v0.1)) : v0beta arrêtée (410) ; v0.1 avec `X-API-Key` et `X-Tenant-ID` obtenues par e-mail ; 200/min, 5 000/h, 10 000/jour ; CGU non lues (403). SkillsMP : 50 req/jour et 10/min sans clé (en-têtes) ; documentation et CGU en 403. mcp.so : aucune API ni flux.
- **Communautés.** Hacker News ([API](https://github.com/HackerNews/API), [conditions Y Combinator](https://www.ycombinator.com/legal/)) : API Firebase sans limite de débit déclarée ; les conditions de Y Combinator interdisent robots, scraping et reproduction des contenus sans autorisation, sans clause propre à l'API ; le RSS répond 200 à `curl` mais 419 à un User-Agent de navigateur ; Algolia : 10 000 req/h par IP ([page](https://hn.algolia.com/api)). Lobsters ([About](https://lobste.rs/about), [robots.txt](https://lobste.rs/robots.txt)) : flux RSS publics documentés, JSON non documenté ; robots.txt : `Disallow: /` pour `User-agent: *` et `Content-Signal: ai-input=no, ai-train=no, search=yes`. DEV ([API Forem](https://developers.forem.com/api/v1), [CGU](https://dev.to/terms)) : lecture publique sans clé (`tag`, `top`, `per_page` de 1 à 1 000) ; le fil `latest` contient des contenus promotionnels ; licence limitée à une consultation « personnelle, non commerciale et transitoire », republication interdite. Product Hunt ([API](https://api.producthunt.com/v2/docs), [limites](https://api.producthunt.com/v2/docs/rate_limits/headers)) : jeton obligatoire (compte et application), 6 250 points de complexité et 450 requêtes par 15 min ; pas d'usage commercial par défaut ; CGU non lues (403) ; `/feed` a pour identifiant `tag:www.producthunt.com,2005:/feed` (pas de catégorie IA ; `?category=ai` semble ignoré, `?category=artificial-intelligence` a ses propres entrées).

### 3.2 Laboratoires et éditeurs d'IA (vérifié le 2026-10-30)

| Éditeur | Flux (URL finale) | Format | Dernière entrée vue | Remarque |
|---|---|---|---|---|
| Google DeepMind | `https://deepmind.google/blog/rss.xml` | RSS 2.0, 100 entrées | 2026-10-28T17:00:58Z | lien `self` vers example.com, à ignorer |
| Google Research | `https://research.google/blog/rss/` | RSS 2.0, 100 entrées | 2026-10-27T17:35:00Z | |
| Google (The Keyword), IA | `https://blog.google/innovation-and-ai/technology/ai/rss/` | RSS 2.0, 20 entrées | 2026-10-26T16:00:00Z | ancienne URL en 301 |
| Google (The Keyword), Gemini | `https://blog.google/products-and-platforms/products/gemini/rss/` | RSS 2.0, 20 entrées | 2026-10-29T16:15:00Z | ancienne URL en 301 |
| Google Developers Blog | `https://developers.googleblog.com/rss/` | RSS 2.0, 20 entrées | inconnue : aucun `pubDate` | `lastBuildDate` = heure de génération |
| Mistral AI | `https://mistral.ai/news/rss` | RSS 2.0 servi en `text/plain`, 93 entrées | 2026-10-29T12:00:07Z | |
| Microsoft Foundry Blog | `https://devblogs.microsoft.com/foundry/feed/` | RSS 2.0, 10 entrées | 2026-10-28T16:45:06Z | |
| Microsoft Source, IA | `https://news.microsoft.com/source/topics/ai/feed/` | RSS 2.0, 10 entrées | 2026-10-21T16:24:40Z | |
| Official Microsoft Blog | `https://blogs.microsoft.com/feed/` | RSS 2.0, 10 entrées | 2026-10-28T16:51:35Z | sujets d'entreprise variés |
| Azure Blog | `https://azure.microsoft.com/en-us/blog/feed/` | RSS 2.0, 10 entrées | 2026-10-26T16:00:00Z | |
| AWS, blog « Artificial Intelligence » | `https://aws.amazon.com/blogs/machine-learning/feed/` | RSS 2.0, 20 entrées, environ 599 Ko | 2026-10-29T20:16:40Z | 20 entrées couvrent 6 jours |
| Apple Machine Learning Research | `https://machinelearning.apple.com/rss.xml` | RSS 2.0, 10 entrées | 2026-10-26 (date seule) | |
| Engineering at Meta | `https://engineering.fb.com/feed/` | RSS 2.0, 9 entrées | 2026-10-29T16:00:12Z | ingénierie plutôt qu'annonces de modèles |
| Stability AI | `https://stability.ai/news-updates?format=rss` | RSS 2.0, 20 entrées | 2026-08-25T14:59:22Z | peu actif |

Sans flux exploitable :

- **Anthropic** : `https://www.anthropic.com/news/rss.xml` 404 (de même `/rss.xml`, `/feed`, `/feed.xml` ; `/engineering/rss.xml` redirige vers une 404) ; `https://claude.com/blog/rss.xml` 308 puis 404. Piste : `https://www.anthropic.com/sitemap.xml` (200 ; `lastmod` est une date de modification, pas de publication) ; robots.txt autorise tout ([robots.txt](https://www.anthropic.com/robots.txt)). Des flux tiers existent, non officiels.
- **Meta AI** : `https://ai.meta.com/blog/rss/` 404 ; le [robots.txt](https://ai.meta.com/robots.txt) d'ai.meta.com interdit la collecte automatisée sans permission écrite.
- **Microsoft AI Blog** : `https://blogs.microsoft.com/ai/feed/` 410 (« This site has been archived or suspended. ») ; `https://microsoft.ai/feed/` est valide mais vide.
- **xAI** : `https://x.ai/news`, `/rss.xml` et `/sitemap.xml` 403 (défi Cloudflare), `/news/rss.xml` 404 ; aucun contournement tenté.
- **Cohere** : `https://cohere.com/blog/rss.xml` redirige (307) vers la page HTML ; sitemap de 866 URL, dont 442 sous `/blog/`.

### 3.3 Langages, frameworks et infrastructure (vérifié le 2026-10-30)

| Projet | Flux (URL finale) | Format | Dernière entrée vue | Remarque |
|---|---|---|---|---|
| Node.js | `https://nodejs.org/en/feed/releases.xml` ; `/blog.xml` ; `/vulnerability.xml` | RSS 2.0 | 2026-10-29T19:52:29Z (releases, blog) ; 2026-10-21T22:00:00Z (vulnérabilités) | sans ETag |
| Python | `https://blog.python.org/rss.xml` ; `https://www.python.org/downloads/feed.rss` | RSS 2.0 | 2026-10-26 ; 2026-10-25T21:02:29Z | l'ancien flux Blogger est figé depuis le 2026-03-03 |
| Rust | `https://blog.rust-lang.org/feed.xml` ; `/inside-rust/feed.xml` | Atom, 10 entrées | 2026-10-26 ; 2026-10-27 | |
| TypeScript | `https://devblogs.microsoft.com/typescript/feed/` | RSS 2.0, 10 entrées | 2026-10-20T17:53:06Z | |
| Next.js | `https://nextjs.org/feed.xml` ; `https://github.com/vercel/next.js/releases.atom` | RSS 2.0 ; Atom | 2026-10-28T20:00:00Z ; 2026-10-29T23:44:27Z | les 10 releases visibles sont des canary (stable sur npm : 16.4.3) |
| React | `https://react.dev/rss.xml` | RSS 2.0, 24 entrées | 2026-09-09 | |
| Deno | `https://deno.com/feed` | Atom, 249 entrées | 2026-10-09T15:00:00Z | « Deno is joining Cloudflare » : URL à surveiller |
| Bun | `https://bun.com/rss.xml` | RSS 2.0, 181 entrées | 2026-10-22T00:58:24Z | |
| Vercel | `https://vercel.com/atom` | Atom, 2 102 entrées, environ 4,6 Mo | 2026-10-29T18:44:00Z | blog et changelog mêlés, sans `<published>` ; dépasse 2 Mio |
| Kubernetes | `https://kubernetes.io/feed.xml` | RSS 2.0, 50 entrées, environ 1,1 Mo | 2026-10-29T05:00:00Z | fuseaux -0800 (44), +0000 (5), +0800 (1) |
| Cloudflare | `https://blog.cloudflare.com/rss/` ; `https://developers.cloudflare.com/changelog/rss/index.xml` | RSS 2.0 | 2026-10-29T12:55:00Z ; 2026-10-29 | changelog d'environ 8,7 Mo (dépasse 2 Mio) ; lien d'autodécouverte `/changelog/index.xml` en 404 |
| endoflife.date | `https://endoflife.date/api/v1/products/nodejs/` | JSON (API v1, MIT) | `last_modified` 2026-10-29T00:09:07Z | agrégateur communautaire ; sa doc demande de suivre les 301 |

Constat utile à la stack (endoflife.date, [API](https://endoflife.date/docs/api/v1/openapi.yml)) : Node.js 26 est LTS depuis le 2026-10-28 ; Node 24 n'a plus de support actif depuis le 2026-10-20 et reçoit les correctifs de sécurité jusqu'au 2028-04-30.

### 3.4 Matériel (vérifié le 2026-10-30)

| Éditeur | Flux (URL finale) | Format | Dernière entrée vue | Remarque |
|---|---|---|---|---|
| NVIDIA Newsroom | `https://nvidianews.nvidia.com/releases.xml` (et `/rss.xml`) | RSS 2.0, 20 entrées | 2026-10-29T13:00:16Z | mêle communiqués et billets grand public (GFN) |
| NVIDIA Blog | `https://blogs.nvidia.com/feed/` | RSS 2.0, 18 entrées | 2026-10-29T16:00:35Z | |
| NVIDIA Technical Blog | `https://developer.nvidia.com/blog/feed` | Atom, 100 entrées, environ 771 Ko | 2026-10-29T15:00:00Z | dater par `<published>` |
| AMD Newsroom | `https://newsroom.amd.com/rss.xml` | RSS 2.0, 30 entrées | 2026-10-27 (date seule) | robots.txt permissif |
| AMD, relations investisseurs | `https://ir.amd.com/news-events/press-releases/rss` | RSS 2.0, 10 entrées | 2026-10-27T13:20:00Z | année sur deux chiffres |
| Intel, relations investisseurs | `https://www.intc.com/news-events/press-releases/rss` | RSS 2.0, 12 entrées | 2026-10-29T20:01:00Z | année sur deux chiffres ; surtout financier |
| Google Cloud (TPU) | `https://cloudblog.withgoogle.com/products/ai-machine-learning/rss/` (et `/rss/`, `/products/compute/rss/`, `/topics/systems/rss/`) | RSS 2.0, 20 entrées | 2026-10-27T16:00:00Z | aucun flux dédié aux TPU (404) : filtrage par mots-clés |
| Apple Newsroom | `https://www.apple.com/newsroom/rss-feed.rss` | Atom malgré l'extension `.rss` | 2026-10-28T17:09:28Z | `<updated>` seulement |

Sans flux exploitable : **Intel Newsroom** (`newsroom.intel.com` redirige via `corpredirect.intel.com` vers une page HTML sans flux, qui répond 200 ou 403 selon le client) ; **Cerebras** (`/blog/rss.xml` 404 ; sitemap de 467 URL) ; **Groq** (`/feed/` 308 puis 404 ; sitemap de 48 URL dont 36 datées du 2026-08-06, et incomplet : 2 des 15 liens de `/blog` n'y figurent pas).

### 3.5 Incidents : pages d'état officielles (vérifié le 2026-10-30)

| Fournisseur | Plateforme | Point d'accès | Dernier incident vu | Remarque |
|---|---|---|---|---|
| Claude | Atlassian Statuspage | `https://status.claude.com/api/v2/incidents.json` ; `/history.atom` | 2026-10-28T16:19:09Z → 20:05:18Z, minor (claude.ai, Claude Code, Claude Cowork) | `status.anthropic.com` redirige ici (301) |
| OpenAI | incident.io | `https://status.openai.com/api/v2/incidents.json` ; `/feed.rss` | 2026-10-27T15:02:15Z → 16:20:06Z, minor | champ `components` absent des incidents ; liens RSS à double barre oblique |
| GitHub | Atlassian Statuspage | `https://www.githubstatus.com/api/v2/incidents.json` ; `/history.atom` | 2026-10-29T10:19:55Z → 12:49:52Z, minor | la date RSS est celle de la résolution |
| Vercel | Atlassian Statuspage | `https://www.vercel-status.com/api/v2/incidents.json` ; `/history.atom` | 2026-10-23T16:31:02Z → 17:32:46Z, minor | `history.atom` contient aussi une maintenance |
| npm | Atlassian Statuspage | `https://status.npmjs.org/api/v2/incidents.json` ; `/history.atom` | 2026-10-26T05:54:32Z → 06:30:18Z, major | |
| Cloudflare | Atlassian Statuspage | `https://www.cloudflarestatus.com/api/v2/incidents.json` | 2026-10-30T02:41:48Z, résolu à 03:48:59Z, minor | RSS et Atom ne contiennent que des maintenances ; l'indicateur global suit les composants, pas les incidents |
| Google Cloud | propre | `https://status.cloud.google.com/incidents.json` (schéma publié) | 2026-10-20T06:00Z → 12:08Z, medium | 8 incidents seulement dans le fichier |
| AWS | propre | `https://status.aws.amazon.com/rss/all.rss` | 2026-10-30T01:28:38Z | `link` pointe toujours vers l'accueil : identifier par `guid` |
| Azure | propre | `https://rssfeed.azure.status.microsoft/en-us/status/feed/` | aucun item (flux des événements en cours) | un flux vide est normal |
| Hugging Face | Better Stack | `https://status.huggingface.co/index.json` ; `/feed.rss` | incident commencé le 2026-09-24T18:00:00Z ; maintenance du 2026-10-07 | adaptateur distinct de Statuspage |

- **Accès programmatique.** Les pages `/api` de GitHub, Claude, Vercel et npm documentent un accès programmatique pour les utilisateurs de la page ; celle de [Cloudflare](https://www.cloudflarestatus.com/api) demande d'utiliser l'API, de ne pas scraper les pages HTML et d'envoyer un User-Agent identifiable. Mais le [robots.txt](https://status.claude.com/robots.txt) de Claude, GitHub, Vercel et npm contient `Disallow: /api/` et `Disallow: /embed/` (`history.rss` et `history.atom` ne sont pas exclus) ; Cloudflare autorise tout. L'API widget d'incident.io ([doc](https://docs.incident.io/status-pages/api.md)) est publique, sans authentification, mise en cache 30 s.
- **Conditions.** Les conditions Statuspage d'Atlassian ne traitent pas de la lecture par des tiers ; aucune condition propre aux pages d'état d'OpenAI et d'Anthropic n'a été trouvée. Les [AWS Site Terms](https://aws.amazon.com/terms/) (2025-06-04) excluent l'usage commercial et l'usage de « data mining, robots, or similar data gathering and extraction tools » ; les [Microsoft Terms of Use](https://www.microsoft.com/en-us/legal/terms-of-use) (2022-02-07) limitent les services à un usage personnel et non commercial « sauf indication contraire » et interdisent de copier ou publier les informations.
- **Couverture.** Google Cloud ne publie que les incidents publics « larges et graves » ([doc](https://docs.cloud.google.com/service-health/docs/service-health-fallback), historique jusqu'à 5 ans) ; la page Azure ne couvre que trois scénarios d'impact large ([doc](https://learn.microsoft.com/en-us/azure/service-health/azure-status-overview)) : l'absence d'incident ne prouve pas l'absence de panne.

### 3.6 Design et motion (vérifié le 2026-10-30)

| Source | Flux (URL finale) | Format | Dernière entrée vue | Remarque |
|---|---|---|---|---|
| Figma, blog | `https://www.figma.com/blog/feed/atom.xml` (et `feed.json`) | Atom servi en `application/rss+xml`, 768 entrées | 2026-10-29T21:00:00Z | pas de `<published>` |
| Figma, notes de version | `https://www.figma.com/release-notes/feed/atom.xml` | Atom, 465 entrées | 2026-10-27 | dates au jour |
| Smashing Magazine | `https://www.smashingmagazine.com/feed/` | RSS, 40 items, environ 1,3 Mo | 2026-10-23T13:00:00Z | articles complets dans le flux |
| CSS-Tricks | `https://css-tricks.com/feed/` | RSS, 15 items | 2026-10-29T13:47:08Z | nouveau propriétaire annoncé le 2026-10-26 |
| web.dev | `https://web.dev/static/blog/feed.xml` | RSS, 10 items | 2026-10-02T07:00:00Z | |
| Chrome for Developers | `https://developer.chrome.com/static/blog/feed.xml` | RSS, 10 items | 2026-10-07T07:00:00Z | |
| Motion | `https://motion.dev/changelog/rss.xml` ; `https://github.com/motiondivision/motion/releases.atom` ; `https://motion.dev/magazine/rss.xml` | RSS ; Atom ; RSS | 2026-10-29 ; 2026-10-29T17:50:27Z ; 2026-10-14 | le changelog RSS omettait v14.7.2 |
| Blender | `https://www.blender.org/feed/` ; `https://code.blender.org/feed/` | RSS | 2026-10-13T14:35:20Z ; 2026-10-14T12:26:59Z | |
| Rive (versions) | `https://github.com/rive-app/rive-wasm/releases.atom` | Atom | 2026-10-29T04:21:44Z | blog sans flux (404) |
| LottieFiles (versions) | `https://github.com/LottieFiles/dotlottie-web/releases.atom` | Atom | 2026-10-06T07:35:59Z | blog sans flux (404) |
| Adobe Developer Blog | `https://blog.developer.adobe.com/rss.xml` | RSS, 120 items | 2026-10-14 | `blog.adobe.com/feed.xml`, annoncé dans la page, répond 404 |

Non joignables ou inutilisables : **Codrops** (`https://tympanus.net/codrops/feed/` 403, défi Cloudflare non contourné ; relais FeedBurner `https://feeds.feedburner.com/tympanus` joignable, mais de statut officiel inconnu et dont le dernier item date du 2026-09-14) ; **Framer** (aucun flux, 404) ; **Dribbble** (API v2 en 401 sans OAuth ; données limitées à l'utilisateur authentifié ; 60 req/min et 1 440/jour ; les [conditions](https://developer.dribbble.com/terms/) interdisent le stockage, le scraping et l'usage des données pour construire « A community or social network for designers ») ; **Behance** (`https://www.behance.net/dev` 404).

### 3.7 X et Reddit (vérifié le 2026-10-30 ; statut de Reddit revu le 2026-10-31)

**Statut de Reddit au 2026-10-31 : source différée, toujours dans le périmètre de veille (SPEC §7.9).** Reddit n'est ni connecté ni exclu.

- **Motif** : aucun accès autorisé n'est disponible aujourd'hui. L'API exige une approbation explicite ([Responsible Builder Policy](https://support.reddithelp.com/api/v2/help_center/en-us/articles/42728983564564.json)) ; aucune demande n'a été déposée ; le [Changelog officiel](https://support.reddithelp.com/api/v2/help_center/en-us/articles/54353370049684.json) indique pour le 2026-10-31 : « New requests for public API access will no longer be accepted ». Les RSS répondaient le 2026-10-30, mais aucun texte n'autorise leur collecte automatisée, robots.txt interdit tout et leur support s'arrête le 2026-11-13, sans remplacement hors modération : ils ne sont pas utilisés.
- **Incertitude** : la politique renvoie vers un ticket si le cas d'usage n'est pas couvert par Devvit. Son texte date du 2026-10-05 (`edited_at`) ; le Changelog du 2026-10-08 relaie une annonce antérieure. Aucune page lue ne dit si cette voie reste ouverte après le 2026-10-31. Le billet r/redditdev du 2026-09-30, qui donnerait le même calendrier, a été lu une seule fois, le 2026-10-30, dans un flux RSS (requête signalée comme écart au robots.txt, à ne pas refaire), sans contre-vérification : seules les dates du Changelog sont confirmées.
- **Conditions de reprise** : une autorisation écrite de Reddit ou une voie officielle permettant de lire depuis notre collecteur ; un usage de synthèse par IA accepté ; des règles de suppression compatibles avec nos captures (ADR à prévoir).
- **En attendant** : les embeds officiels restent une option pour une publication dont l'URL est connue, sans découverte automatique (§8.1, option B) ; leur maintien après mars 2027 reste à revérifier ; à décider en P6/P7.
- **Historique** : le 2026-10-31, l'utilisateur a refusé de déposer la demande d'accès proposée. Claude Code a pris ce refus pour un retrait du cadrage, sans que cela ait été demandé, puis a rétabli Reddit le jour même à la demande de l'utilisateur.

| Point d'accès | Contrôle | Remarque |
|---|---|---|
| `https://publish.x.com/oembed?url=…` | 200, sans authentification | rend un post dont l'URL est connue ; aucune découverte |
| `https://docs.x.com/changelog/rss.xml` | 200, RSS 2.0, dernière entrée 2026-10-29T20:15:39Z | suivi des changements de tarifs et de règles de l'API X |
| `https://www.reddit.com/r/LocalLLaMA/.rss` ; `/r/MachineLearning/.rss` | 200 depuis le poste local, Atom, 25 entrées ; dernières entrées 2026-10-30T05:58:01Z et 2026-10-29T22:51:57Z | `/r/LocalLLaMA/new/.rss` : 429 puis 200 ; environ 1 requête/min sans authentification (estimation sur 5 essais) |
| `https://old.reddit.com/r/LocalLLaMA/.rss` ; `https://www.reddit.com/r/LocalLLaMA/.json` | non joignables : 302 vers la connexion ; 403 | trafic sans OAuth bloqué |
| `https://www.reddit.com/oembed?url=…` | 200 | blockquote et script `embed.reddit.com/widgets.js` |
| `https://support.reddithelp.com/api/v2/help_center/en-us/articles/42728983564564.json` | 200 | lecture des politiques Reddit (les pages HTML renvoient 403) |

- **X, tarifs** ([pricing](https://docs.x.com/x-api/getting-started/pricing), [crédits](https://docs.x.com/x-api/getting-started/free-credits)) : modèle « pay-per-usage » à crédits prépayés, sans abonnement (lancé le 2026-02-06). Posts: Read 0,005 $, User: Read 0,010 $, List: Read 0,005 $, Like: Read 0,001 $, Counts: Recent 0,005 $ par requête ; Owned Reads 0,001 $ ; une ressource relue dans la même journée UTC n'est facturée qu'une fois ; plafond de dépense réglable ; Enterprise sur formulaire, prix non publié ; prix « subject to change ». Aucune offre gratuite : les crédits offerts (20 $, plus jusqu'à 50 $) ne sont accordés qu'après un premier achat avec une carte enregistrée (règle du 2026-10-13).
- **X, quotas** ([rate limits](https://docs.x.com/x-api/fundamentals/rate-limits)) : recherche récente sur 7 jours, 450 req/15 min par app, 10 à 100 résultats, requête de 512 caractères au plus ; recherche complète 1 req/s et 300/15 min ; `/2/users/:id/tweets` 10 000/15 min, 3 200 posts au plus ; `/2/lists/:id/tweets` 900/15 min ; plafond de 3 millions de lectures de posts par cycle mensuel ; retweets exclus de la recherche depuis le 2026-05-04.
- **X, compte et conditions** ([accès](https://docs.x.com/x-api/getting-started/getting-access), [Agreement](https://docs.x.com/developer-terms/agreement), [Policy](https://docs.x.com/developer-terms/policy), [usages restreints](https://docs.x.com/developer-terms/restricted-use-cases), [CGU](https://x.com/en/tos), [PPU Agreement](https://docs.x.com/developer-terms/ppu-agreement)) : compte X, inscription sur console.x.com, Developer Agreement (2026-04-27), téléphone vérifié, pays pris en charge ; établissement dans l'UE : contrat avec X Internet Unlimited Company (Dublin). Stockage permis si l'état du contenu sur X est suivi (suppression au plus tard 24 h après une demande) ; affichage du texte non modifié avec avatar, nom, @handle, horodatage et logo X ; œuvres dérivées interdites (A(d)), contenu X en iframe interdit (K) ; à des tiers, seuls des identifiants (1 500 000 Post IDs par entité destinataire sur 30 jours ; exception : 500 objets publics par personne et par jour par voie non automatisée ; d'autres pages officielles indiquent 50 000 objets hydratés par jour, elles se contredisent) ; entraînement ou affinage de modèles interdit (A(k)) ; scraping interdit (CGU en vigueur au 2026-10-09). Le pay-per-use vise les amateurs, prototypes et applications à nombre d'utilisateurs limité (III.L, III.M) ; au-delà, Enterprise ; contacter X au-delà de 10 millions d'impressions par jour.
- **X, embeds** ([embeds](https://docs.x.com/x-for-websites/embedded-posts/overview), [vie privée](https://docs.x.com/x-for-websites/privacy)) : endpoint oEmbed sans authentification ni limite annoncée ; rendu par `https://platform.x.com/widgets.js` (sans lui, seul le blockquote de repli s'affiche) ; la Developer Policy exige un avis, un consentement et des instructions d'opposition pour la collecte par X ; option `dnt`.
- **Reddit, accès** ([Responsible Builder Policy](https://support.reddithelp.com/api/v2/help_center/en-us/articles/42728983564564.json), [accès aux données](https://support.reddithelp.com/api/v2/help_center/en-us/articles/14945211791892.json), [Data API Wiki](https://support.reddithelp.com/api/v2/help_center/en-us/articles/16160319875092.json)) : approbation explicite exigée avant tout accès par l'API (politique modifiée le 2026-10-05) ; une seule demande par cas d'usage ; usage non commercial par formulaire de ticket, usage commercial sous contrat ; jeton OAuth et User-Agent unique obligatoires ; niveau gratuit : 100 requêtes/min par client OAuth (moyenne sur 10 min) ; depuis une IP d'hébergeur, OAuth ou connexion requis.
- **Reddit, conditions** ([Developer Terms](https://redditinc.com/policies/developer-terms), [Data API Terms](https://redditinc.com/policies/data-api-terms), [User Agreement](https://redditinc.com/policies/user-agreement), [robots.txt](https://www.reddit.com/robots.txt)) : usage commercial (publicité, abonnement, contenu Reddit sur un site monétisé) soumis à accord écrit ; entraînement de modèles interdit sans permission ; recherche académique uniquement via Reddit for Researchers ; contenu supprimé à effacer (purge recommandée sous 48 h) ; affichage sans autre modification que la mise en forme, œuvres dérivées interdites ; nom « [nom] for Reddit » seulement. Les conditions lues ne traitent pas de l'usage automatisé des flux RSS ; seul le Changelog les mentionne, pour annoncer la fin de leur support ; robots.txt : `User-agent: *` puis `Disallow: /`.
- **Reddit, fin de l'accès anonyme** ([lettre aux actionnaires, SEC](https://www.sec.gov/Archives/edgar/data/1713445/000171344526000114/exhibit992q326.htm)) : passage annoncé à une expérience « logged-in-only » ; tests complets au T4 2026 « in select markets outside the U.S. », version mondiale sans date. Le [Changelog officiel](https://support.reddithelp.com/api/v2/help_center/en-us/articles/54353370049684.json) annonce la fin du support des RSS le 13 novembre 2026, le refus des nouvelles demandes d'accès à l'API à la date du 31 octobre 2026, un retrait progressif dès le 12 janvier 2027 et la fin de l'accès public en mars 2027.
- **Reddit, embeds** ([Embeds Terms](https://redditinc.com/policies/embeds-terms)) : deux méthodes officielles (Partager > Embed, oEmbed) ; « we do not charge for reasonable use of Reddit Embeds » (article 14945211791892) ; embed ni modifié ni masqué, pas à côté de publicités, sans suggérer de partenariat ; le script remplace le blockquote par une iframe `embed.reddit.com`.

### 3.8 Registre de Pulse (infrastructure, données, incidents ; 2026-10-30)

Aucune nouvelle clé par personnage : tout passe par le même moteur. Rôles : voir [agents-editoriaux.md](agents-editoriaux.md) §2.3.

| Famille | Rôle | État | Suite |
|---|---|---|---|
| GitHub Changelog | vérification | **connectée** (P2) | routage des sujets d'exploitation |
| Releases GitHub (collecteur) | vérification | **partielle** : collecteur construit, aucun dépôt de base de données ou d'outil data | choisir les dépôts, ajout dans `src/sources.ts` |
| Pages de statut | vérification | à intégrer | adaptateurs §3.5, avec suivi des changements de statut |
| Post-mortems officiels | vérification | à intégrer | lister les emplacements par fournisseur |
| Blogs d'ingénierie | vérification | à intégrer | sélection et contrôle des flux |
| Issues GitHub | découverte | à intégrer | API publique, quotas à vérifier |
| Communautés Reddit | découverte | **différée** (2026-10-31) | aucun accès autorisé disponible ; motif et reprise §3.7 |
| Experts sur X | découverte | à intégrer | accès payant, §3.7 ; décision §8 ; veille de profils P6 |

### 3.9 Registre de Radar (grandes entreprises ; 2026-10-30)

| Famille | Rôle | État | Accès et coût |
|---|---|---|---|
| GitHub Changelog (Microsoft) | annonce officielle | **connectée** (P2) | flux public, gratuit |
| Google, Microsoft (blogs officiels) | annonce officielle | **partielle** : Google connecté, Microsoft candidate | flux contrôlés §3.2, gratuits |
| NVIDIA, Apple Newsroom | annonce officielle | candidate | flux contrôlés §3.4, gratuits |
| AWS | annonce officielle | candidate | flux IA contrôlé §3.2, gratuit ; espace presse Amazon non contrôlé |
| Meta | annonce officielle | candidate | blog d'ingénierie contrôlé ; `ai.meta.com` interdit la collecte automatisée sans permission (§3.2) |
| Tesla | annonce officielle | non contrôlée | aucun accès vérifié |
| Documentations, conférences, recherche | annonce officielle | à sélectionner | à vérifier source par source |
| Newsletters | contexte | à sélectionner | publiques ou avec autorisation |
| Médias spécialisés | contexte | à sélectionner | conditions et coûts à vérifier ; synthèse attribuée, sans copie |
| Experts sur X | contexte | candidate | §3.7 : X payant |
| Communautés Reddit | contexte | **différée** (2026-10-31) | aucun accès autorisé disponible ; motif et reprise §3.7 |

Seuls le GitHub Changelog et le flux Google Gemini sont collectés, par une commande lancée à la main ; rien n'est planifié.

### 3.10 Écosystème IA et créatif, à connecter (recherche du 2026-10-30)

Six domaines recherchés puis contre-vérifiés par 12 agents ; toutes les recommandations ont été revues au regard du code réel. [Résultat complet](../communication/linkedin/05-ecosysteme-creatif/preuves/brut/veille-sources-contre-verifiee-2026-10-30.json). Rien ici n'est collecté.

**Blocages techniques à lever (P6)**

- **Pages sans flux** : Perplexity, xAI, Grok, Claude, v0 demandent un adaptateur de page ou de Markdown ; Seedance et Kling un adaptateur de sitemap.
- **Changelogs à ancres** (Mintlify : Lovable, Devin, Bolt, Base44) : l'identité d'une entrée est son lien sans ancre, donc 1 document sur 15 survit. De plus, leur `pubDate` n'est pas la date de la nouveauté.
- **Liens hors domaine** : agrégateurs (Sidebar) ; Webflow (second hôte) ; Google Workspace (liens http).
- **Releases Atom de GitHub** : seulement `updated`, donc une release éditée paraît récente.
- **Contenu trop court pour citer** : shadcn, Webflow, Tailwind, Motionographer, Spline, ComfyUI : à compléter par la page liée.

**Conditions** : les newsletters hébergées sur Substack (Latent Space, Import AI, Ben's Bites) relèvent de conditions contre le crawl et le stockage ; les conditions de fal et d'Ollama sont restrictives ; `/c/*.rss` est interdit sur plusieurs forums Discourse ; `unity.com/blog/rss` est interdit par robots.txt.

**Faits vérifiés sur les exemples** (rien de publié) : Seedance 2.5 existe (billet officiel du 2026-07-31) ; 4K et 10 bits n'apparaissent que sur une page BytePlus, à attribuer ; Sora est retiré (API le 2026-09-24) ; Veo 3.1 en préversion arrêté dans l'API Gemini le 2026-10-22, remplacé par Gemini Omni ; n8n 3.0 est en bêta, la stable est 2.45.7 ; l'éditeur de Grok s'appelle SpaceXSI dans ses notes de version ; Higgsfield : annonces lues en titres seulement.

**Décision de l'utilisateur requise**

| Source | Accès |
|---|---|
| OpenRouter, catalogue des modèles | `https://openrouter.ai/api/v1/models?output_modalities=all` |
| OpenRouter, catalogue vidéo | `https://openrouter.ai/api/v1/videos/models` |
| Microsoft Copilot Blog | `https://www.microsoft.com/en-us/copilot/blog/feed/` |
| ChatGPT, notes de version | `https://help.openai.com/en/articles/6825453-chatgpt-release-notes` |
| CG Channel | `https://feeds.feedburner.com/cgchannel/nHpU` |
| Awwwards Sites of the Day | `https://www.awwwards.com/websites/sites_of_the_day/` |
| OpenRouter, catalogue de modèles (toutes modalités) | `https://openrouter.ai/api/v1/models?output_modalities=all&use_rss=true` |
| Awwwards, Sites of the Day | `https://feeds.feedburner.com/awwwards-sites-of-the-day` |
| Latent Space, Import AI, Ben's Bites | flux Substack |

**Compléments du 2026-11-01** : Supabase, Vercel et DeepSeek sont cités comme exemples à couvrir ; leurs flux et leurs conditions n'ont pas été vérifiés. Pour les découvertes (SPEC §7.3 ter), l'API de recherche GitHub est la piste retenue, avec jeton ; repère relevé sans jeton le 2026-11-01 : dépôts « mcp » créés depuis 90 jours, 798 à 50 étoiles et plus, 230 à 200, 102 à 500, 55 à 1 000.

**Candidates**

| Domaine | Source | Point d'accès | Méthode |
|---|---|---|---|
| agents | Blog Daily | `https://www.daily.co/blog/rss/` | rss |
| agents | Blog Manus | `https://manus.im/sitemap.xml` | sitemap |
| agents | Blog OpenClaw | `https://openclaw.ai/rss.xml` | rss |
| agents | Blog PolyAI | `https://poly.ai/blog/rss.xml` | rss |
| agents | Blog Zapier | `https://zapier.com/blog/feeds/latest/` | rss |
| agents | Changelog Bland | `https://www.bland.ai/sitemap-changelog.xml` | sitemap |
| agents | Changelog Deepgram | `https://developers.deepgram.com/changelog.rss` | rss |
| agents | Changelog Retell AI | `https://www.retellai.com/changelog` | page_html_seule |
| agents | Notes de version Make | `https://help.make.com/2026` | page_html_seule |
| agents | Releases CrewAI | `https://github.com/crewAIInc/crewAI/releases.atom` | atom |
| agents | Releases Dify | `https://github.com/langgenius/dify/releases.atom` | atom |
| agents | Releases LangGraph | `https://github.com/langchain-ai/langgraph/releases.atom` | atom |
| agents | Releases LiveKit Agents | `https://github.com/livekit/agents/releases.atom` | atom |
| agents | Releases Pipecat | `https://github.com/pipecat-ai/pipecat/releases.atom` | atom |
| agents | Releases n8n | `https://github.com/n8n-io/n8n/releases.atom` | atom |
| creation | Adobe Newsroom (sitemap) | `https://news.adobe.com/assets/sitemap.xml` | sitemap |
| creation | Blackmagic Design, mises à jour produits | `https://www.blackmagicdesign.com/rss` | rss |
| creation | Blog Adobe (sitemap) | `https://blog.adobe.com/en/sitemap.xml` | sitemap |
| creation | CapCut (sitemap et llms.txt) | `https://www.capcut.com/sitemap.xml` | sitemap |
| creation | Changelog Descript (Canny) | `https://descript.canny.io/changelog` | page_html_seule |
| creation | Changelog HeyGen | `https://developers.heygen.com/changelog/rss.xml` | rss |
| creation | Changelog Krea | `https://www.krea.ai/docs/changelog/rss.xml` | rss |
| creation | Changelog Magnific (ex-Freepik) | `https://docs.magnific.com/changelog/2026` | page_html_seule |
| creation | ComfyUI, releases GitHub | `https://github.com/Comfy-Org/ComfyUI/releases.atom` | atom |
| creation | Pika (sitemap et blog) | `https://pika.art/sitemap.xml` | sitemap |
| creation | Synthesia Updates | `https://www.synthesia.io/updates` | page_html_seule |
| creation | Topaz Labs (sitemap) | `https://www.topazlabs.com/sitemap.xml` | sitemap |
| design | 21st Changelog | `https://21st.dev/changelog` | page_html_seule |
| design | Canva Newsroom | `https://www.canva.com/newsroom/news/` | aucun_acces |
| design | CodePen Blog | `https://blog.codepen.io/feed/` | rss |
| design | FWA of the Day | `https://thefwa.com/rss/` | rss |
| design | Framer Updates | `https://www.framer.com/updates` | page_html_seule |
| design | GSAP Blog | `https://gsap.com/blog/rss.xml` | rss |
| design | Motionographer | `https://motionographer.com/feed/` | rss |
| design | Rive Blog | `https://rive.app/sitemap.xml` | sitemap |
| design | Sidebar | `https://sidebar.io/feed.xml` | rss |
| design | Tailwind CSS Blog | `https://tailwindcss.com/feeds/feed.xml` | rss |
| design | Three.js Releases | `https://github.com/mrdoob/three.js/releases.atom` | atom |
| design | Webflow Updates | `https://webflow.com/updates/rss.xml` | rss |
| design | minimal.gallery | `https://minimal.gallery/feed/` | rss |
| design | shadcn/ui Changelog | `https://ui.shadcn.com/rss.xml` | rss |
| modeles | Alibaba Model Studio, nouveaux modèles | `https://www.alibabacloud.com/help/en/model-studio/newly-released-models` | page_html_seule |
| modeles | Black Forest Labs, notes de version | `https://docs.bfl.ai/release-notes` | page_html_seule |
| modeles | ByteDance Seed, sitemap | `https://seed.bytedance.com/sitemap.xml` | sitemap |
| modeles | DeepSeek Change Log | `https://api-docs.deepseek.com/updates/` | page_html_seule |
| modeles | ElevenLabs Changelog | `https://elevenlabs.io/docs/changelog.rss` | rss |
| modeles | Gemini API, notes de version | `https://ai.google.dev/gemini-api/docs/changelog.md.txt` | page_html_seule |
| modeles | Luma, sitemap news | `https://lumalabs.ai/news/sitemap.xml` | sitemap |
| modeles | MiniMax, notes de version modèles | `https://platform.minimax.io/docs/release-notes/models` | page_html_seule |
| modeles | Ollama Blog | `https://ollama.com/blog/rss.xml` | rss |
| modeles | Replicate Changelog | `https://replicate.com/changelog/rss` | rss |
| modeles | Runway Changelog | `https://runway.com/changelog` | page_html_seule |
| modeles | Suno Blog | `https://suno.com/blog/rss.xml` | rss |
| modeles | Together AI Blog | `https://www.together.ai/blog/rss.xml` | rss |
| modeles | fal Blog | `https://blog.fal.ai/rss/` | rss |
| modeles | fal, catalogue des modèles | `https://api.fal.ai/v1/models` | json_sans_cle |
| modeles | xAI Release Notes | `https://docs.x.ai/developers/release-notes` | page_html_seule |
| outils | Bolt Release Notes | `https://support.bolt.new/release-notes` | page_html_seule |
| outils | Claude Platform, notes de version | `https://platform.claude.com/docs/en/release-notes/overview.md` | page_html_seule |
| outils | Claude, notes de version (grand public) | `https://support.claude.com/en/articles/12138966-release-notes` | page_html_seule |
| outils | Cline, versions | `https://github.com/cline/cline/releases.atom` | atom |
| outils | Devin Desktop (ex-Windsurf), changelog | `https://docs.devin.ai/desktop/changelog/rss.xml` | rss |
| outils | Gamma API, changelog | `https://developers.gamma.app/reference/changelog` | page_html_seule |
| outils | Gemini app, notes de version | `https://gemini.google/us/release-notes/?hl=en` | page_html_seule |
| outils | GitHub Changelog, label Copilot | `https://github.blog/changelog/label/copilot/feed/` | rss |
| outils | Google Antigravity Blog | `https://antigravity.google/blog/rss.xml` | rss |
| outils | Google Labs, blog | `https://blog.google/innovation-and-ai/models-and-research/google-labs/rss/` | rss |
| outils | Google Workspace Updates | `https://feeds.feedburner.com/GoogleAppsUpdates` | atom |
| outils | Google Workspace, The Keyword | `https://blog.google/products-and-platforms/products/workspace/rss/` | rss |
| outils | JetBrains AI Blog | `https://blog.jetbrains.com/ai/feed/` | rss |
| outils | Kagi Blog | `https://blog.kagi.com/rss.xml` | rss |
| outils | Linear Changelog | `https://linear.app/rss/changelog.xml` | rss |
| outils | Lovable Blog | `https://lovable.dev/blog/rss.xml` | rss |
| outils | Lovable Changelog | `https://docs.lovable.dev/changelog/rss.xml` | rss |
| outils | Manus Blog | `https://manus.im/blog` | page_html_seule |
| outils | Microsoft 365 Copilot, notes de version | `https://learn.microsoft.com/en-us/microsoft-365/copilot/release-notes` | page_html_seule |
| outils | OpenAI API, changelog | `https://developers.openai.com/api/docs/changelog.md` | page_html_seule |
| outils | Perplexity API, changelog | `https://docs.perplexity.ai/docs/resources/changelog` | page_html_seule |
| outils | Perplexity Changelog | `https://www.perplexity.ai/changelog` | page_html_seule |
| outils | Replit Blog | `https://replit.com/blog/feed.xml` | rss |
| outils | Replit Updates (changelog hebdomadaire) | `https://docs.replit.com/updates/2026/10/23/changelog` | page_html_seule |
| outils | Zed Blog | `https://zed.dev/blog.rss` | rss |
| outils | v0 Changelog | `https://v0.app/changelog` | page_html_seule |
| veille | Ben's Bites | `https://www.bensbites.com/feed` | rss |
| veille | Bluesky, flux par compte | `https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur/rss` | rss |
| veille | Comfy Registry | `https://api.comfy.org/nodes?limit=1` | json_sans_cle |
| veille | Hugging Face, modèles par tâche | `https://huggingface.co/api/models?pipeline_tag=text-to-speech&sort=trendingScore&limit=5` | json_sans_cle |
| veille | Import AI | `https://importai.substack.com/feed` | rss |
| veille | Latent Space (avec AINews) | `https://latent.space/feed` | rss |
| veille | NeurIPS Blog | `https://blog.neurips.cc/feed/` | rss |
| veille | Protocole A2A, versions | `https://github.com/a2aproject/A2A/releases.atom` | atom |
| veille | TLDR Design (et TLDR AI) | `https://tldr.tech/api/rss/design` | rss |
| veille | arXiv, graphisme (cs.GR) | `https://rss.arxiv.org/rss/cs.GR` | rss |
| veille | befores & afters | `https://beforesandafters.com/feed/` | rss |

## 4. Médias et intégrations (P7, P8)

### 4.1 Lecteurs intégrés (vérifié le 2026-10-30)

- **YouTube, lecteur** ([RMF](https://developers.google.com/youtube/terms/required-minimum-functionality), [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [IFrame API](https://developers.google.com/youtube/iframe_api_reference)) : viewport d'au moins 200 × 200 px (en 16:9, 480 × 270 recommandé) ; l'oEmbed d'un Short renvoie une iframe de 113 × 200 px, sous ce minimum. Aucun calque ni cadre devant le lecteur, aucune modification non décrite par l'API ; Developer Policies (2026-10-15) III.I.4 (liens du lecteur), III.I.6 (modifier ou bloquer le lecteur), III.I.7 (isoler l'audio ou la vidéo), III.I.9 (lecteur non affiché). Lecture automatique seulement si le lecteur est visible à plus de moitié, jamais deux lecteurs à la fois.
- **YouTube, données et consentement** ([nocookie](https://support.google.com/youtube/answer/171780), [CNIL, FAQ cookies, question 23](https://cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ)) : `youtube-nocookie.com` évite l'effet sur les recommandations et les publicités personnalisées, sans promettre l'absence de cookies. CNIL (page du 2026-04-29) : consentement préalable avant d'activer un contenu externe intégré, aucun traceur soumis à consentement avant. API Services Terms (2026-09-14) acceptées par le seul usage ; données d'API stockées à supprimer ou rafraîchir après 30 jours ; aucun droit de reproduire le contenu audiovisuel (§16.3).
- **YouTube Data API v3** ([quotas](https://developers.google.com/youtube/v3/determine_quota_cost), [sous-titres](https://developers.google.com/youtube/v3/docs/captions/download)) : 10 000 unités/jour, plus 100 `search.list` et 100 `videos.insert` par jour ; compte Google, projet Google Cloud et clé requis ; `captions.list` (50 unités, OAuth) ne renvoie pas le texte, `captions.download` (200 unités) exige le droit de modifier la vidéo : pas de sous-titres de vidéos tierces.
- **Flux RSS de chaîne** (`https://www.youtube.com/feeds/videos.xml?channel_id=…`) : non documenté et intermittent. Google for Developers : 200 (Atom, 15 entrées, dernière publiée le 2026-10-29T20:00:20+00:00), puis 404 à 06:20 UTC ; chaîne OpenAI : 404 à toutes les tentatives.
- **Shorts** : l'oEmbed officiel accepte `/shorts/ID` et renvoie une iframe `/embed/ID` ; aucune page officielle sur l'intégration des Shorts.
- **Vimeo** ([conditions](https://vimeo.com/terms), [cookies du lecteur](https://help.vimeo.com/hc/en-us/articles/26080940921361-Vimeo-Player-Cookies)) : les conditions (2024-07-08, §2) autorisent l'intégration du lecteur ; `https://vimeo.com/api/oembed.json` répond 200 sans clé pour deux vidéos publiques, 404 pour deux autres (cause non vérifiée) ; le §5.4 interdit téléchargement, reproduction, cadrage (« frame ») et œuvres dérivées ; le paramètre `dnt` empêche les nouveaux cookies, sauf ceux de sécurité.
- **oEmbed** ([spécification](https://oembed.com/), [fournisseurs](https://oembed.com/providers.json)) : pour le type « rich », la spécification recommande d'afficher le HTML reçu dans une iframe d'un autre domaine (XSS) ; le registre compte 393 fournisseurs (dont YouTube avec `/shorts*` et `/live*`, Vimeo, X, Reddit, Bluesky, Loom, CodePen, CodeSandbox, Figma) ; Instagram et Facebook passent par `graph.facebook.com`.

### 4.2 Réutilisation de contenus (vérifié le 2026-10-30 ; synthèse documentaire, pas un avis juridique)

- **Courte citation** (CPI, art. L122-5, 3° a, [Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037388886/)) : analyses et courtes citations justifiées par le caractère critique, polémique, pédagogique, scientifique ou d'information de l'œuvre qui les incorpore, avec le nom de l'auteur et la source.
- **Images** : la reproduction intégrale d'une œuvre, quel que soit son format, n'est pas une courte citation (Cass. ass. plén., 5 novembre 1993, n° 92-10.673, [Légifrance](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007031599/)) ; de même pour une photographie (1re civ., 17 décembre 1991, n° 89-22.035, [Légifrance](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007028102)). L'exception d'information (9°) exclut les œuvres photographiques ou d'illustration qui rendent elles-mêmes compte de l'information.
- **`og:image`** : [ogp.me](https://ogp.me/) ne contient aucune licence de réutilisation des images (sa seule licence porte sur la spécification).
- **Creative Commons** : CC BY 4.0, §3(a)(1) : conserver auteur, mention de copyright, licence, exclusion de garantie et lien, et signaler les modifications ([texte](https://creativecommons.org/licenses/by/4.0/legalcode.en)) ; CC BY-NC : usage qui ne vise pas principalement un avantage commercial ([texte](https://creativecommons.org/licenses/by-nc/4.0/legalcode.en)).

### 4.3 Hébergement et production vidéo (vérifié le 2026-10-30)

| Service | Sans frais | Au-delà | Compte et remarques |
|---|---|---|---|
| Vercel Blob (Hobby) | par mois : 1 Go stocké, 10 000 opérations simples, 2 000 avancées, 10 Go de transfert (quotas partagés) | jamais facturé : Blob devient inaccessible, attendre 30 jours ; Pro : 0,023 $/Go stocké, transfert à partir de 0,05 $/Go | adapté aux images légères, pas à la vidéo |
| Cloudflare R2 | par mois : 10 Go-mois, 1 M d'opérations A, 10 M d'opérations B | 0,015 $/Go-mois, 4,50 $ et 0,36 $ par million d'opérations A et B ; sortie gratuite | compte Cloudflare, abonnement R2, domaine personnalisé pour la production |
| Cloudflare Stream | aucun | 5 $/mois par tranche de 1 000 min stockées ; 1 $ pour 1 000 min livrées | |
| Bunny Stream | essai de 14 jours | stockage dès 0,01 $/Go, diffusion dès 0,005 $/Go, minimum 1 $/mois | |
| Mux | Free Plan : 10 vidéos stockées, 100 000 min de diffusion/mois, sans carte | 1080p : stockage 0,003 $ par minute et par mois, diffusion 0,001 $ par minute | |

- **Vercel Hobby** ([Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines), 2026-09-14) : par mois, 100 Go de Fast Data Transfer, 10 Go de Fast Origin Transfer, 1 M d'invocations, 4 h de CPU actif, 5 000 transformations d'images ; 4,5 Mo par requête ou réponse de fonction ; usage personnel non commercial (publicité et paiements sont commerciaux ; l'affiliation seulement si elle est l'objet principal ; les dons non) ; « Media hosting for hot-linking » et « Scrapers » sont rangés en « Never fair use ».
- **Production** : Remotion ([licence](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md), [rendu serveur](https://www.remotion.dev/docs/ssr)) est gratuit pour les individus, les structures lucratives de 3 salariés au plus et les associations ; « source-available » ; pas d'exemption pour un établissement d'enseignement sans accord écrit ; version 4.0.539 (2026-10-26) ; changement de licence annoncé en 5.0 ; rendu documenté dans GitHub Actions. Motion Canvas : MIT, dernière publication npm 3.18.0-alpha.0 le 2025-02-16. FFmpeg ([page légale](https://ffmpeg.org/legal.html)) : LGPL 2.1 ou ultérieure, GPL si des options GPL sont activées.
- **GitHub Actions** ([facturation](https://docs.github.com/en/billing/concepts/product-billing/github-actions)) : runners standards gratuits pour les dépôts publics ; GitHub Free : 500 Mo d'artefacts et 12 $ de calcul par mois ; 6 h par job.
- **Sous-titres** : élément `<track>` au format WebVTT, `srclang` obligatoire pour `subtitles`, même origine sauf attribut `crossorigin` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track)).

### 4.4 Bacs à sable pour les tests de la plateforme (P8, vérifié le 2026-10-30)

| Service | Sans frais | Payant | Isolation | Remarques |
|---|---|---|---|---|
| [Vercel Sandbox](https://vercel.com/docs/sandbox/pricing) | Hobby, par mois : 5 h de CPU actif, 420 Go-h, 5 000 créations, 20 Go de transfert, 10 simultanés, 45 min par session | Pro : 0,128 $/h de CPU actif, 0,0212 $/Go-h | microVM Firecracker | au-delà du quota, création suspendue sans facturation ; sortie réseau autorisée par défaut |
| [E2B](https://e2b.dev/pricing) | Hobby : « $100 one-time usage credit », sessions de 1 h, 20 simultanés, sans carte | Pro : 150 $/mois plus l'usage (0,000014 $/vCPU-s, 0,0000045 $/Gio-s) | microVM Firecracker | crédit non renouvelé |
| [Modal](https://modal.com/pricing) | Starter : 30 $ de crédits/mois | Team : 250 $/mois ; sandboxes 0,00003942 $/cœur-s, 0,00000667 $/Gio-s | gVisor ou microVM | carte bancaire non précisée |
| [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox/) | aucun | Workers Paid 5 $/mois (25 Gio-h, 375 vCPU-min, 200 Go-h de disque inclus), puis 0,000020 $/vCPU-s, 0,0000025 $/Gio-s | microVM | ordonnancement Durable Object « in public beta » |
| [GitHub Actions](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) | gratuit en dépôt public | — | VM éphémère | les conditions interdisent sur les runners hébergés toute activité sans rapport avec le logiciel du dépôt |

## 5. Langues et traduction (P4, P12 ; vérifié le 2026-10-30)

- **Next.js 16** ([guide i18n](https://nextjs.org/docs/app/guides/internationalization)) : routage par sous-chemin (`/fr/…`) ou par domaine sous `app/[lang]` ; `proxy.js` redirige les URL sans locale ; négociation de `Accept-Language` avec `negotiator` et `@formatjs/intl-localematcher` ; dictionnaires chargés côté serveur. Versions npm du jour : next 16.4.3, negotiator 1.1.0, @formatjs/intl-localematcher 0.9.0.
- **next-intl** ([npm](https://registry.npmjs.org/next-intl/latest), [détection](https://next-intl.dev/docs/routing/middleware)) : 4.14.9, publiée le 2026-10-02 ; peerDependencies `next` de `^12.0.0` à `^16.0.0` (compatibilité déclarée par l'éditeur, non testée) ; ordre de détection : préfixe d'URL, cookie, `accept-language` (algorithme « best fit »), `defaultLocale`.
- **Navigateurs** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages)) : Safari envoie moins de langues et Chrome une seule en navigation privée ; un sélecteur visible et un repli restent nécessaires.

| Service | Sans frais | Payant | Compte | Remarques |
|---|---|---|---|---|
| [DeepL API](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans) | Developer : crédit unique de 1 000 000 caractères, non renouvelé (Free et Pro ne sont plus souscriptibles) | [Growth](https://www.deepl.com/en/pro-api#api-pricing) : 32,50 $/mois en mensuel ou 26,00 $/mois en annuel, plus l'usage ; 1 M de caractères/mois inclus ; 27,50 $ par million supplémentaire ; plafond 50 M/mois (prix affichés en USD depuis Israël) | Developer sans carte | Developer n'a pas la garantie « No data training » |
| [Google Cloud Translation](https://cloud.google.com/translate/pricing) | 500 000 caractères/mois (NMT), sous forme d'un crédit de 10 $ | NMT 20,00 $ par million de caractères ; Translation LLM 10 $ par million en entrée et 10 $ en sortie | [facturation obligatoire](https://cloud.google.com/translate/docs/setup), même dans le quota | |
| [API Claude](https://platform.claude.com/docs/en/about-claude/pricing) | crédits API (activation en P3, avec accord) | par million de tokens, entrée/sortie : Haiku 5.5 0,10 $/0,50 $ (prompts jusqu'à 100 000 tokens ; 0,50 $/2,50 $ au-delà), Sonnet 5.5 2 $/10 $, Opus 5.5 4 $/20 $ ; API Batch −50 % | clé API | les modèles 4.7 et suivants produisent environ 30 % de tokens en plus pour un même texte |

**Estimation** (hypothèses : 1 000 mots ≈ 6 000 caractères ; côté Claude, environ 2 500 tokens en entrée et 2 100 en sortie ; non mesuré) : par article de 1 000 mots, Haiku 5.5 ≈ 0,0013 $ (≈ 0,0007 $ en Batch), Sonnet 5.5 ≈ 0,026 $, Opus 5.5 ≈ 0,05 $, Google NMT hors quota ≈ 0,12 $, DeepL Growth au-delà de l'inclus ≈ 0,165 $. Qualité de traduction non évaluée.

## 6. Cadre légal préliminaire (vérifié le 2026-10-30 ; synthèse documentaire, pas un avis juridique)

- **AI Act, art. 50** ([règlement (UE) 2024/1689](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1689)) : §4, 2e alinéa, les déployeurs qui publient des textes générés par IA pour informer le public sur des questions d'intérêt public l'indiquent, sauf usage pénal autorisé ou examen humain ou contrôle éditorial avec une personne qui assume la responsabilité éditoriale ; §5 : information claire au plus tard à la première exposition, accessible. §2 : marquage lisible par machine par les fournisseurs. §4, 1er alinéa : divulgation des hypertrucages, définis (art. 3 §60) comme images, sons ou vidéos ressemblant à des personnes, **objets**, lieux, **entités** ou événements existants.
- **AI Act, calendrier et interprétation** ([omnibus (UE) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/fra), [FAQ de la Commission](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)) : application générale le 2 août 2026 (art. 113) ; l'omnibus du 8 juillet 2026 laisse jusqu'au 2 décembre 2026 aux fournisseurs de systèmes mis sur le marché avant le 2 août 2026 pour le seul §2 ; l'étiquetage par le déployeur (§4) s'applique déjà. FAQ (2026-07-24) : l'examen humain est un examen délibéré du fond, une correction de forme ne suffit pas ; code de bonnes pratiques volontaire publié le 10 juin 2026.
- **DSA** ([règlement (UE) 2022/2065](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32022R2065)) : applicable depuis le 17 février 2024. Tout intermédiaire : points de contact (art. 11, 12), conditions générales décrivant la modération, y compris algorithmique (art. 14). Tout hébergeur, micro-entreprises comprises : notification des contenus illicites (art. 16), exposé des motifs (art. 17), signalement des infractions menaçant la vie ou la sécurité (art. 18). Micro et petites entreprises : section 3 non applicable sauf art. 24 §3 (art. 19), pas de rapport de transparence (art. 15 §2). Considérant 14 : la messagerie privée n'est pas une plateforme en ligne ; un groupe à admission automatique peut l'être.
- **RGPD (CNIL)** : base légale choisie avant tout traitement ([bases légales](https://www.cnil.fr/fr/les-bases-legales)) ; information à la collecte, ou sous un mois en collecte indirecte ([information](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence)) ; durées de conservation définies, base active puis archivage intermédiaire et archivage définitif, ces deux dernières phases n'étant pas systématiques ([durées](https://www.cnil.fr/fr/les-durees-de-conservation-des-donnees), page du 2 avril 2026) ; sous 15 ans, consentement conjoint d'un titulaire de l'autorité parentale pour un traitement fondé sur le consentement ([recommandation 4](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans)) ; consentement avant tout contenu tiers intégré (§4.1).
- **Israël** ([avis définitif de l'Autorité, 14 juillet 2026](https://www.gov.il/BlobFolder/legalinfo/amendment-13-26-07-26/he/media_06-07-26.pdf), [traduction non officielle de la loi](https://www.gov.il/BlobFolder/legalinfo/legislation/en/Protection-of-Privacy-Law57411981unofficialtranslatioup.pdf)) : l'amendement 13 et l'obligation de désigner un délégué à la protection des données sont en vigueur depuis le 14.8.25 ; enregistrement des bases limité à celles dont l'objet principal est de fournir des données à autrui (plus de 10 000 personnes) et aux organismes publics ; notification au-delà de 100 000 personnes pour des données de sensibilité particulière (art. 8A) ; délégué obligatoire notamment en cas de surveillance régulière et systématique à grande échelle (art. 17B1) ; notice à la collecte (art. 11 : caractère obligatoire ou non, finalité, responsable, destinataires, droits d'accès et de rectification).
- **Veille réglementaire** (candidates P6) : CNIL `https://www.cnil.fr/fr/rss.xml` (RSS, dernière entrée 2026-10-29T12:00:00Z) ; Commission européenne, Digital Strategy, `https://digital-strategy.ec.europa.eu/en/rss.xml` (RSS, dernière entrée 2026-10-29T08:12:20Z).

## 7. Non vérifié et à revérifier

### 7.1 Constats invérifiables (2)

- **Product Hunt, makers masqués dans l'API v2** : seulement des témoignages de développeurs (page Indie Hackers en 403, non lue) ; la documentation officielle n'en dit rien. À vérifier avec un vrai jeton lors d'un essai réel documenté.
- **RGPD et messages privés** : aucune page officielle de la CNIL sur la messagerie privée d'une plateforme n'a été consultée ; restent non vérifiés le régime de confidentialité des communications (directive 2002/58/CE), le secret des correspondances, l'accès des modérateurs et le traitement par des agents IA.

### 7.2 Points restés ouverts (sources tierces, pages illisibles, essais non faits)

- **X** : statut actuel des offres Basic et Pro (seul le changelog du 2026-02-06 les dit encore disponibles ; vérifiable seulement dans la console X) ; liste des pays pris en charge (France, Israël) ; usage de l'oEmbed pour récupérer le texte à analyser ; l'envoi d'un post X ou Reddit à l'API Anthropic pour une synthèse est-il une redistribution ou une œuvre dérivée (aucun texte ne le traite).
- **Reddit** : recevabilité d'un ticket après le 2026-10-31 (§3.7) ; critères et délai d'approbation ; date de fin de l'accès anonyme ; « old.reddit exige une connexion depuis juillet 2026 » (source tierce) ; données collectées par les embeds (politique de confidentialité en 403).
- **Anthropic** : les contenus envoyés par l'API peuvent-ils servir à l'entraînement ? À vérifier dans les conditions commerciales avant P3.
- **Écosystème** : limites de SkillsMP avec clé (500/jour et 30/min selon un extrait tiers) ; CGU de skills.sh (API publique limitée par IP) contre doc et test (jeton OIDC) ; accès sans clé à Smithery non garanti ; quota GitHub de 60/h déjà entamé sur les runners partagés (estimation) ; Lobsters : le robots.txt vise-t-il la lecture des flux par un pipeline IA ? ; DEV : affichage public de métadonnées.
- **Éditeurs** : existence d'un flux pour xAI et pour le newsroom Intel (blocages non contournés : à vérifier dans un navigateur) ; flux investisseurs de Cerebras (403) ; conditions de réutilisation des contenus de flux (Apple, NVIDIA, Google, AWS…) non vérifiées.
- **Incidents et design** : Codrops depuis un runner GitHub Actions, et statut du relais FeedBurner ; fermeture de l'API Behance (seulement des sources tierces) ; pourquoi `incidents.json` de Google Cloud ne contient que 8 incidents malgré 5 ans annoncés.
- **Médias** : lecture réelle d'un Short intégré dans un navigateur ; flux YouTube d'OpenAI en 404 (panne ou désactivation) ; statut du flux RSS YouTube au regard des API Services Terms ; page développeur oEmbed de Vimeo (JavaScript) non lue ; texte intégral de l'arrêt CJUE C-392/19 non lu (seulement un communiqué partiel et un résumé) ; aucune décision française trouvée sur les aperçus `og:image` ; Mux Free Plan (badge, résolution, durée) ; contenu de la licence Remotion 5.0 ; carte bancaire et domaine pour R2 ; oEmbed Instagram, Facebook et `publish.twitter.com` non testés ; droit d'auteur israélien non étudié.
- **Langues et légal** : prix DeepL en euros pour la France ; nombre de tokens par mot français (mesure en P3) ; qualité de traduction comparée ; les actualités tech relèvent-elles des « questions d'intérêt public » (art. 50 §4) ; date et contenu des lignes directrices de la Commission sur la transparence ; statut DSA d'un projet étudiant non monétisé (service « normalement fourni contre rémunération » ? micro-entreprise ?) ; applicabilité du droit israélien à un service exploité depuis la France et Israël ; âge minimum et vérification d'âge.

### 7.3 Signalés par la contre-vérification, à vérifier

Points relevés par les contre-vérificateurs en dehors des constats ; **non contre-vérifiés**, à ne pas présenter comme établis (liste complète : `themes.<clé>.verification.missed` du JSON de preuves).

- **X et Reddit** : affichage d'un post X sans embed : aucune action sociale tierce ne peut y être attachée (votes, commentaires) ; interdiction de créer « a substitute or similar service or product to the X Applications » (III.A(c)) et de monétiser un service déclaré non commercial (III.B) ; l'analyse du contenu n'est licite que « as explicitly approved by X » (II.A.1) ; CGU de X : dommages forfaitaires de 15 000 $ par million de posts consultés au-delà d'un million en 24 h ; X Developer PPU Agreement : téléphone vérifié, crédits non remboursables ; réponses programmatiques seulement si l'auteur a sollicité le compte (changelog du 2026-02-23) ; crédits gratuits encore « currently rolling out » ; Reddit : la fermeture vise aussi à protéger son « corpus of data », alors que sa Public Content Policy (2026-10-06) dit encore qu'aucun compte n'est nécessaire ; Data API Terms : facturation future possible (3.1), aucune conservation au-delà du cas d'usage approuvé (3.2).
- **Écosystème** : CGU du registre MCP (§2) mentionnant une connexion « via method(s) approved » et le droit californien ; Glama : demander une clé vaut acceptation des CGU, scraping du site interdit (§15.1, §15.6) ; Product Hunt demande une attribution avec lien et peut ajuster les limites ; skills.sh suppose un déploiement Vercel avec OIDC Federation, cache de 30 à 60 s (classement, recherche) et 5 min (détail) ; Lobsters exclut aussi nommément l'agent Brave.
- **Éditeurs** : conditions d'Apple (2009-11-20) interdisant robots et « page-scrape » ; conditions de NVIDIA (version du 15 juillet 2026) interdisant robots et scrapers, contenus à usage personnel et non commercial ; Meta Automated Data Collection Terms (2024-10-07) : permission écrite préalable (applicabilité à engineering.fb.com non vérifiée) ; Node.js passe à un cycle annuel à partir de Node 27 (Alpha depuis le 2026-10-29), Node 24 en maintenance jusqu'au 2028-04-30, Node 26 LTS jusqu'au 2029-04-30 ; conditions d'OpenAI (version UE) illisibles (403) ; pages 404 de x.ai intitulées « SpaceXSI » (changement de marque rapporté seulement par la presse).
- **Incidents** : Google Cloud recommande les champs marqués « Stable » de `incidents.json` plutôt que les noms affichés ; l'API widget d'incident.io ne montre que l'état en cours et répond 404 si le propriétaire ne l'a pas activée ; l'historique Azure ne garde des rapports que pour les problèmes larges depuis le 1er juin 2022 ; selon AWS, son flux RSS peut ne pas fournir toutes les données utiles ; conditions Atlassian déplacées (document global en vigueur le 1er octobre 2026) ; PDF « Behance Additional Terms » (2018) chiffré, non lu.
- **Médias** : miniature YouTube qui lance la lecture d'au moins 120 × 70 px ; lien vers les conditions YouTube et mention dans notre politique de confidentialité (III.A) ; vérification du statut « Made For Kids » (III.E.4.j) ; scraping des applications YouTube interdit (identifiants de chaîne par l'API ou saisis à la main) ; contradiction entre une façade avec miniature hébergée chez nous et l'interdiction de stocker des copies ; la fenêtre de consentement CNIL doit indiquer finalités, politique du fournisseur, conséquences d'un refus et retrait ; Vimeo : accès automatisé seulement par ses API, sous un « API License Addendum » non lu ; Meta oEmbed exige une App Review, et providers.json cite une version Graph périmée ; Vercel Hobby : attente de 30 jours après dépassement, erreur 402 au-delà de 5 000 transformations d'images ; R2 : domaine dans le même compte Cloudflare, `r2.dev` limité au développement ; GitHub Actions : workflows planifiés désactivés après 60 jours sans activité dans un dépôt public, exécutions retardées ou abandonnées aux heures chargées, 0,006 $/min sur Linux 2 cœurs ; Remotion : brevets de codecs non couverts, la licence 5.0 compterait les prestataires dans l'effectif ; FFmpeg : `libx264` fait passer sous GPL ; Mux Free Plan limité à la vidéo à la demande ; les lectures automatiques ne comptent pas dans les vues YouTube.
- **Langues et légal** : loi n° 2026-813 du 24 août 2026 sur les mineurs et les réseaux sociaux, dont l'article 1er (interdiction sous 15 ans) a été censuré (décision n° 2026-911 DC du 14 août 2026) ; omnibus IA : nouvelles interdictions (art. 5 §1, b bis et b ter) à partir du 2 décembre 2026 sur les images intimes non consenties et le matériel pédopornographique ; icônes officielles de l'UE pour étiqueter les contenus IA ; l'usage personnel et non professionnel d'un système d'IA exclut la qualité de déployeur ; GitHub Actions : intervalle minimal de 5 minutes ; DeepL : API payable par carte bancaire uniquement, Growth à 29,75 €/mois selon des données embarquées pour l'Allemagne ; Vercel Sandbox : instantanés persistants, 15 Go à vie sur Hobby ; directive (UE) 2018/1972, art. 2 point 5 (fonction « mineure accessoire ») à analyser pour la messagerie ; crédit Google Translation de 10 $ commun à Basic et Advanced, sans report.

## 8. Décisions à soumettre à l'utilisateur

Ce registre ne tranche rien. Montants au 2026-10-30, à revérifier avant usage ; budget actuel : 0 €.

### 8.1 Avant P6 et P7 (dépense, compte ou conditions juridiques)

1. **X.** A) API en paiement à l'usage : compte X, compte développeur, téléphone vérifié, carte et premier achat de crédits ; 0,005 $ par post lu ; **estimation non mesurée** : 50 comptes × 5 posts/jour × 30 jours ≈ 7 500 posts/mois ≈ 37,5 $/mois, hors lecture des profils ; contraintes : suppression sous 24 h sur demande, pas d'œuvre dérivée, cas d'usage déclaré, pas de redistribution du texte. B) 0 € sans compte : embeds de posts dont l'URL est connue (saisie éditoriale ou citation par une source), chargés après consentement, sans découverte automatique. C) Pas de X en P6. Scraping, RSS tiers et navigateur automatisé sont exclus par les conditions de X.
2. **Reddit (source différée depuis le 2026-10-31, §3.7).** A) Demande d'accès au Data API (gratuit, 100 req/min) : aucune déposée, recevabilité incertaine depuis le 2026-10-31 ; compte et demande déposés par l'utilisateur, approbation et délai incertains, usage non commercial, cas d'usage unique déclarant la synthèse IA, contenus supprimés à effacer (incompatible avec une capture conservée durablement : ADR à prévoir) ; accès provisoire, car la fin de l'accès public restant est annoncée pour mars 2027. B) Embeds seulement (0 €, sans compte ; maintien après mars 2027 à revérifier). C) RSS anonymes : option retirée (support arrêté le 2026-11-13, robots.txt, jamais utilisés).
3. **Sources à conditions restrictives** (inclure, limiter au titre et au lien sans analyse IA, demander un accord, ou écarter) : Lobsters (`ai-input=no`) ; DEV (licence de consultation personnelle) ; Hacker News (conditions de Y Combinator) ; API Product Hunt (compte, jeton, usage non commercial à confirmer) ; Glama (clé, clause « produit concurrent ») ; PulseMCP (clé par e-mail) ; Smithery et SkillsMP (CGU non lues) ; Dribbble (clause « réseau social pour designers ») ; ai.meta.com (collecte automatisée interdite sans permission) ; flux d'AWS et de Microsoft (conditions restrictives) ; xAI, newsroom Intel et Codrops (blocages anti-robot, saisie manuelle éventuelle).
4. **Hébergement vidéo (P7)** : Vercel Blob Hobby (0 €, images seulement) ; Cloudflare R2 (0 € jusqu'à 10 Go-mois, compte, abonnement et domaine personnalisé à acheter probablement, coût non vérifié) ; Mux Free Plan (0 €, 10 vidéos) ; Bunny Stream (minimum 1 $/mois) ; Cloudflare Stream (au moins 5 $/mois). Associés : licence Remotion (gratuite à titre individuel ; licence entreprise si le projet est porté par l'école ou une structure de plus de 3 personnes) ; dépôt public (GitHub Actions gratuit) ou privé (12 $ de calcul inclus par mois).
5. **Traduction (P12)** : DeepL Developer (0 €, crédit unique, textes non exclus de l'entraînement) ; DeepL Growth (26,00 à 32,50 $/mois) ; Google Cloud Translation (500 000 caractères/mois gratuits, compte de facturation obligatoire) ; Claude sur les crédits API (accord requis en P3 ; estimation ≈ 0,0013 $ par article avec Haiku 5.5).
6. **Bacs à sable (P8)** : Vercel Sandbox Hobby (0 €, quotas mensuels) ; E2B (crédit unique de 100 $, sans carte) ; Modal (30 $ de crédits/mois, carte non précisée) ; Cloudflare (5 $/mois au moins). GitHub Actions paraît exclu par ses conditions pour ce besoin (interprétation).
7. **Points juridiques** : âge minimum d'inscription (15 ans ? voir §6 et §7.3) ; avis d'un juriste ou du DPO de l'école avant P8 (conditions AWS et Microsoft, aperçus `og:image`, statut DSA, droit israélien) ; compatibilité de la collecte planifiée sur GitHub Actions avec les conditions de GitHub (activité « sans rapport avec le logiciel du dépôt » ou « partie d'une application serverless » ?) ; toute monétisation changerait la donne (Vercel Hobby, Reddit, Product Hunt, contenus CC BY-NC).

### 8.2 Points techniques à trancher en ADR (sans validation de l'utilisateur)

- Pages Statuspage : `history.atom` seul (non exclu par robots.txt) ou avec `/api/v2/incidents.json` à faible fréquence et User-Agent identifié ; libellé « incidents publics déclarés par le fournisseur ».
- Sources sans flux (Anthropic, Cohere, Cerebras, Groq, Framer, Adobe) : détection par sitemap, page HTML ou saisie manuelle ; date lue sur la page, `null` sinon.
- Flux de plus de 2 Mio (Vercel, changelog Cloudflare) : limite propre à la source (estimation : 8 à 10 Mio) ou abandon.
- Redirections : URL finales figées et alerte sur chaque nouvelle 301 (endoflife.date demande de les suivre).
- Dates et formats : `pubDate` absent, `updated` seul, années sur deux chiffres, dates au jour, format reconnu au contenu (`text/plain`, Atom servi en RSS), fixtures dédiées.
- GitHub : `GITHUB_TOKEN` et requêtes conditionnelles (ETag) dans le worker planifié.
- YouTube : façade de consentement sans miniature hébergée chez nous, en attendant de lever la contradiction signalée en §7.3.

### Note du 2026-10-30 : photos de presse pour Radar

Apple Newsroom : aucune condition d'usage éditorial sur la page d'annonce du MacBook Pro du 28 octobre 2026. Les [conditions générales](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html) demandent une autorisation écrite pour toute photo d'Apple. Faute de conditions claires, la photo n'est pas reprise (ADR 0004). Autres éditeurs non vérifiés.

| Éditeur (contrôle du 2026-10-30) | Photos de presse | Conclusion pour Radar |
|---|---|---|
| Google | [Press Corner](https://blog.google/press/), qui redirige vers [Image library](https://blog.google/image-library/) : publication autorisée avec le crédit « Source: Google. », pour les images de cette page. Contrôle du 2026-10-31 : `maquette/medias/google-campus.jpg` a la même empreinte SHA-256 (`0471dbcd…`) que le fichier `download_url` de l'entrée « Googleplex Campus » de cette page, `https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Wide-view-of-Google-campus.original.jpg` | utilisable pour ces images ; droits à revérifier avant toute mise en ligne |
| Microsoft | [Permissions](https://www.microsoft.com/en-us/legal/intellectualproperty/permissions/default) : usage éditorial réservé à la presse et aux analystes | à clarifier : le site est-il « presse » ? |
| NVIDIA | aucune condition de presse trouvée ; kits presse et Brand Guidelines non lus | non utilisable pour l'instant |
| Meta | conditions non lisibles (contenu tronqué) | non utilisable pour l'instant |
| Tesla | presskit et page légale en 403, non contournés | non utilisable |
| Apple | autorisation écrite demandée | non utilisable sans accord |

Ces lectures ne sont pas un avis juridique.
