# Preuves — recherche vérifiée du cadrage (P0)

_Synthèse générée à partir des résultats bruts conservés dans [`brut/`](brut/). Détail fait par fait : [`faits-verifies.md`](faits-verifies.md)._

## Méthode

- Pour chaque sujet, un agent de recherche de Claude Code a relevé des faits avec leur URL, en privilégiant les sources officielles (pages de tarifs, documentations, centres d'aide).
- Un second agent, indépendant, a rouvert chaque source pour tenter de **réfuter** chaque fait : « confirmé » seulement si la page le dit ; « corrigé » avec la bonne valeur sinon ; « invérifiable » faute de source qui l'établit.
- La plupart des faits viennent de sources officielles. Exceptions : X1 et X2 sont des mesures et un test locaux (scripts dans [`brut/claimtest/`](brut/claimtest/)) ; dom-09 vient d'un site tiers ; L3 d'une page éditeur que l'agent a classée hors de la liste demandée (docs.turso.tech) ; gh-5 est une observation directe du flux Atom de GitHub, non documenté.
- Les 2 faits invérifiables : **dom-09** (tarifs Cloudflare relevés sur un site tiers) n'a pas été utilisé ; **S12** (sûreté de la réservation de jobs par deux processus sur SQLite) est une déduction de la documentation SQLite, retenue comme hypothèse de conception et **à vérifier par un test en P1**.

## Décompte

| Sujet | Faits relevés | Confirmés | Corrigés | Invérifiables |
|---|---|---|---|---|
| IA : crédits d'abonnement et tarifs API | 58 | 57 | 1 | 0 |
| Nom de domaine | 39 | 38 | 0 | 1 |
| Hébergement (stack TypeScript) | 57 | 57 | 0 | 0 |
| Hébergement (worker Python, planificateurs) | 52 | 50 | 2 | 0 |
| Couche de données (SQLite, PGlite, Postgres, Drizzle) | 44 | 42 | 1 | 1 |
| Plateforme (Node 24, TypeScript 7, Next.js 16, GitHub, SSRF, SDK) | 29 | 26 | 3 | 0 |
| **Total** | **279** | **270** | **7** | **2** |

En plus de ces 279 faits, les vérificateurs ont ajouté 62 faits manquants, avec leurs sources (listés dans `faits-verifies.md`).

## Vérification directe de la source de P1

Requête : `GET https://api.github.com/repos/anthropics/claude-code/releases?per_page=5`, sans authentification. Exécutée une première fois le 2026-10-29 à 23:55 UTC, puis à nouveau le 2026-10-30 à 00:22 UTC pour conserver la réponse brute. En-têtes et réponse : [`brut/`](brut/) (limite annoncée : 60 requêtes par heure).

| id | Version | Publiée le (UTC) |
|---|---|---|
| 425846009 | v2.1.312 | 2026-10-27T20:24:20Z |
| 424682562 | v2.1.311 | 2026-10-26T21:51:23Z |
| 422315867 | v2.1.310 | 2026-10-23T23:39:00Z |
| 421170674 | v2.1.309 | 2026-10-22T22:18:57Z |
| 420299398 | v2.1.308 | 2026-10-22T04:34:55Z |

## Sources consultées

### IA : crédits d'abonnement et tarifs API

- https://claude.com/pricing
- https://claude.com/programs/campus
- https://claude.com/programs/startups
- https://claude.com/resources/articles/were-expanding-the-claude-startups-program-to-help-founders-build
- https://code.claude.com/docs/en/agent-sdk/overview
- https://code.claude.com/docs/en/agent-sdk/quickstart
- https://code.claude.com/docs/en/authentication
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/legal-and-compliance
- https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/about-claude/pricing.md
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- https://platform.claude.com/docs/en/api/rate-limits
- https://platform.claude.com/docs/en/build-with-claude/batch-processing
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/build-with-claude/thinking
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/models/overview
- https://support.claude.com/en/articles/10366389-how-can-i-advance-my-claude-api-usage-to-tier-2
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan
- https://support.claude.com/en/articles/11199177-anthropic-s-ai-for-science-program
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans
- https://support.claude.com/en/articles/8325606-what-is-the-pro-plan
- https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage
- https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan
- https://www.anthropic.com/legal/aup
- https://www.anthropic.com/legal/consumer-terms
- https://www.anthropic.com/legal/credit-terms

### Nom de domaine

- https://developers.cloudflare.com/billing/understand/sales-tax/
- https://developers.cloudflare.com/changelog/product/registrar/
- https://developers.cloudflare.com/registrar/faq/
- https://developers.cloudflare.com/registrar/get-started/register-domain/
- https://developers.cloudflare.com/registrar/troubleshooting/
- https://docs.gandi.net/en/domain_names/common_operations/whois_privacy.html
- https://docs.gandi.net/fr/noms_domaine/operations_courantes/whois_prive.html
- https://docs.ovhcloud.com/en/guides/web-cloud/domains/api-domain-whois
- https://porkbun.com/products/domains
- https://porkbun.com/tld/ai
- https://porkbun.com/tld/fr
- https://www.afnic.fr/en/domain-names-and-support/faq-the-answers-to-your-questions/
- https://www.afnic.fr/wp-media/uploads/2026/07/afnic-charte-de-nommage-06-07-2026.pdf
- https://www.cloudflare.com/application-services/products/registrar/buy-ai-domains/
- https://www.cloudflare.com/products/registrar/
- https://www.cloudflare.com/tld-policies/
- https://www.gandi.net/fr/domain/tld
- https://www.gandi.net/fr/domain/tld/ai
- https://www.gandi.net/fr/domain/tld/app
- https://www.gandi.net/fr/domain/tld/com
- https://www.gandi.net/fr/domain/tld/dev
- https://www.gandi.net/fr/domain/tld/fr
- https://www.gandi.net/fr/domain/tld/io
- https://www.nic.ai/faq
- https://www.ovhcloud.com/fr/domains/options/dns-anycast/
- https://www.ovhcloud.com/fr/domains/tld/
- https://www.ovhcloud.com/fr/domains/tld/ai/
- https://www.ovhcloud.com/fr/domains/tld/app/
- https://www.ovhcloud.com/fr/domains/tld/com/
- https://www.ovhcloud.com/fr/domains/tld/dev/
- https://www.ovhcloud.com/fr/domains/tld/fr/
- https://www.ovhcloud.com/fr/domains/tld/io/
- https://www.registry.google/domains/app/
- https://www.registry.google/domains/dev/

Sources classées non officielles par l'agent :
- https://cfdomainpricing.com/

### Hébergement (stack TypeScript)

- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.netlify.com/build/functions/background-functions/
- https://docs.netlify.com/build/functions/configuration/
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- https://docs.turso.tech/cli/group/unarchive
- https://docs.turso.tech/help/usage-and-billing
- https://neon.com/docs/guides/scale-to-zero-guide
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/introduction/regions
- https://neon.com/pricing
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/manage-your-usage/compute
- https://supabase.com/pricing
- https://turso.tech/pricing
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/limits
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/plans/pro-plan
- https://www.netlify.com/legal/terms-of-use/
- https://www.netlify.com/pricing/

### Hébergement (worker Python, planificateurs)

- https://cloud.google.com/free/docs/free-cloud-features
- https://cloud.google.com/run/pricing
- https://cloud.google.com/scheduler/pricing
- https://developers.cloudflare.com/workers/platform/limits/
- https://docs.cloud.google.com/free/docs/free-cloud-features
- https://docs.cloud.google.com/run/docs/create-jobs
- https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules
- https://docs.fly.io/about/pricing
- https://docs.fly.io/blueprints/task-scheduling/
- https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
- https://docs.github.com/en/actions/reference/limits
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- https://docs.railway.com/reference/app-sleeping
- https://docs.railway.com/reference/cron-jobs
- https://docs.railway.com/reference/pricing/free-trial
- https://docs.railway.com/reference/pricing/plans
- https://fly.io/pricing/
- https://github.com/pricing
- https://help.pythonanywhere.com/pages/FreeAccountsFeatures/
- https://help.pythonanywhere.com/pages/ScheduledTasks/
- https://railway.com/pricing
- https://render.com/docs/cronjobs
- https://render.com/docs/free
- https://render.com/pricing
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://www.hetzner.com/cloud/
- https://www.hetzner.com/cloud/cost-optimized/
- https://www.hetzner.com/cloud/regular-performance/
- https://www.pythonanywhere.com/pricing/

### Couche de données (SQLite, PGlite, Postgres, Drizzle)

- https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- https://github.com/WiseLibs/better-sqlite3/releases
- https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/pg-core/query-builders/select.types.ts
- https://github.com/electric-sql/pglite
- https://github.com/electric-sql/pglite/issues/489
- https://github.com/tursodatabase/libsql-client-ts/blob/main/packages/libsql-client/README.md
- https://github.com/tursodatabase/libsql-client-ts/tree/main/examples/remote
- https://nodejs.org/docs/latest-v24.x/api/documentation.html
- https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- https://orm.drizzle.team/docs/column-types/sqlite
- https://orm.drizzle.team/docs/connect-neon
- https://orm.drizzle.team/docs/connect-node-sqlite
- https://orm.drizzle.team/docs/connect-pglite
- https://orm.drizzle.team/docs/connect-supabase
- https://orm.drizzle.team/docs/drizzle-config-file
- https://orm.drizzle.team/docs/drizzle-kit-generate
- https://orm.drizzle.team/docs/get-started-postgresql
- https://orm.drizzle.team/docs/get-started-sqlite
- https://orm.drizzle.team/docs/kit-overview
- https://orm.drizzle.team/docs/migrations
- https://orm.drizzle.team/docs/sql-schema-declaration
- https://orm.drizzle.team/docs/sqlite/transactions
- https://orm.drizzle.team/docs/upgrade-v1
- https://pglite.dev/docs/
- https://pglite.dev/docs/filesystems
- https://pglite.dev/docs/pglite-socket
- https://www.postgresql.org/docs/current/explicit-locking.html
- https://www.postgresql.org/docs/current/sql-select.html
- https://www.sqlite.org/c3ref/busy_handler.html
- https://www.sqlite.org/c3ref/busy_timeout.html
- https://www.sqlite.org/isolation.html
- https://www.sqlite.org/lang_returning.html
- https://www.sqlite.org/lang_transaction.html
- https://www.sqlite.org/wal.html
- https://www.sqlite.org/whentouse.html

Sources classées non officielles par l'agent :
- https://docs.turso.tech/sdk/ts/reference

### Plateforme (Node 24, TypeScript 7, Next.js 16, GitHub, SSRF, SDK)

- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
- https://docs.github.com/en/actions/reference/limits
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/rest/about-the-rest-api/api-versions
- https://docs.github.com/en/rest/activity/feeds
- https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
- https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies
- https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- https://github.com/anthropics/anthropic-sdk-typescript
- https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md
- https://github.com/azu/request-filtering-agent
- https://nextjs.org/blog/next-16-4
- https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli
- https://nextjs.org/docs/app/api-reference/config/typescript
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/docs/app/guides/self-hosting
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nodejs.org/dist/index.json
- https://nodejs.org/docs/latest-v24.x/api/cli.html
- https://nodejs.org/docs/latest-v24.x/api/typescript.html
- https://typescript-eslint.io/users/dependency-versions

Sources classées non officielles par l'agent :
- https://github.com/anthropics/claude-code/releases.atom
