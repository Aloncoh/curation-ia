# Ressources pour construire : candidates à trier

_Recherche du 2026-11-02, demandée par l'utilisateur (SPEC §3.6, priorité 2 ; §7.3 ter)._

Quatre agents de recherche Claude Code ont travaillé en parallèle. Chacun a vérifié ses fiches sur la page officielle : dépôt de l'auteur ou documentation de l'éditeur. Claude n'a pas pu revérifier lui-même : l'API GitHub a refusé ses requêtes (« rate limit exceeded ») le 2026-11-02 à 10:37 UTC.

Les étoiles et dates sont celles relevées par ces agents le 2026-11-02 : une **information**, pas un critère.

Rien n'a été installé ni exécuté. **Aucune de ces ressources n'est retenue tant que l'utilisateur ne l'a pas triée.**

## 1. Design, UX/UI, motion

| # | Ressource · lien | Type | Ce que ça fait | Licence · prix | Activité · ★ | Point d'attention |
|---|---|---|---|---|---|---|
| D1 | Impeccable (Paul Bakaus) · github.com/pbakaus/impeccable | skill | 24 commandes (critique, audit, polish), 62 règles contre les interfaces génériques | Apache-2.0 | 2026-11-01 · 99 892 | hooks exécutés même si l'on refuse les commandes ; contacte impeccable.style |
| D2 | Skills d'Emil Kowalski · github.com/emilkowalski/skills | skills | animation, revue d'animations, performance, design à la Apple | MIT | 2026-11-02 · 52 856 | règles d'un seul auteur |
| D3 | animations.dev (Emil Kowalski) | cours | cours interactif d'animation web | payant, prix non affiché | 2026-04-14 | inscriptions fermées, réouverture annoncée le 10 nov. |
| D4 | MCP Figma · help.figma.com | MCP | contexte des fichiers Figma pour les agents, écriture sur le canevas en bêta | conditions Figma | 2026-10-28 | 6 lectures par mois sur l'offre gratuite |
| D5 | frontend-design (Anthropic) · github.com/anthropics/skills | skill | direction esthétique et typographie | Apache-2.0 | 2026-09-03 | « démonstration et éducation » selon Anthropic |
| D6 | Web Interface Guidelines (Vercel) · github.com/vercel-labs/web-interface-guidelines | règles + skill | interactions, animation, formulaires, performance | MIT | 2026-10-05 | le skill télécharge ses règles à chaque exécution |
| D7 | UI UX Pro Max · github.com/nextlevelbuilder/ui-ux-pro-max-skill | skill | styles, palettes, typos, règles UX, 22 stacks | MIT (Premium payant) | 2026-11-01 · 144 006 | nécessite Python 3 |
| D8 | Taste Skill · github.com/Leonxlnx/taste-skill | skill | direction artistique, images de référence, vérification dans le navigateur | MIT | 2026-10-24 · 108 215 | 30 à 45 min et des centaines de milliers de tokens par génération |
| D9 | MCP shadcn · ui.shadcn.com/docs/mcp | MCP | chercher et installer des composants React | MIT | 2026-11-02 · 127,2 k | registres tiers : code installé dans le projet |
| D10 | GSAP Skills (GreenSock) · github.com/greensock/gsap-skills | skills | usage correct de GSAP, ScrollTrigger, React | MIT | 2026-04-21 · 17,7 k | six mois sans commit |
| D11 | Storybook MCP · storybook.js.org/docs/ai/mcp/overview | MCP | doc de composants, stories et tests pour les agents | MIT | 2026-10-26 · 91,4 k | en préversion |
| D12 | Penpot MCP · github.com/penpot/penpot | MCP | lire et modifier des fichiers Penpot (outil libre) | MPL-2.0 | 2026-11-01 · 62,0 k | local seulement ; exécution de code dans le plugin |

## 2. Sécurité et qualité du code

À présenter pour tester **ses propres** applications, avec autorisation et hors production.

| # | Ressource · lien | Type | Ce que ça fait | Licence · prix | Activité · ★ | Point d'attention |
|---|---|---|---|---|---|---|
| S1 | Strix · github.com/usestrix/strix | agent de pentest | cherche des failles et les confirme par preuve de concept | Apache-2.0 | 2026-10-30 · 73 297 | vrais exploits ; coût du modèle |
| S2 | Shannon (Keygraph) · github.com/KeygraphHQ/shannon | agent de pentest | lit le code puis attaque l'application en marche ; seules les failles prouvées sont rapportées | AGPL-3.0 ; Pro 50 $/mois | 2026-10-27 · 50 910 | interdit en production ; 1 à 1,5 h par analyse |
| S3 | PentestGPT · github.com/GreyDGL/PentestGPT | agent de pentest | pipeline autonome qui pilote Claude Code ou Codex | MIT | 2026-07-14 · 16 236 | télémétrie activée par défaut |
| S4 | ZAP MCP Integration · zaproxy.org | MCP | un assistant IA pilote le scanner ZAP | Apache-2.0 | 2026-11-02 | alpha ; le port ne doit jamais être exposé |
| S5 | Claude Code Security Review (Anthropic) · github.com/anthropics/claude-code-security-review | GitHub Action | commente les PR avec les failles trouvées | MIT ; coût API | 2026-02-11 · 6 677 | non protégé contre l'injection de prompt ; 9 mois sans activité |
| S6 | Trail of Bits Skills · github.com/trailofbits/skills | skills | audit (CodeQL, Semgrep, chaîne d'approvisionnement, tests de mutation) | CC-BY-SA-4.0 | 2026-10-28 · 7 946 | profils experts |
| S7 | Semgrep Guardian · docs.semgrep.dev | plugin | vérifie chaque fichier écrit par l'agent (code, dépendances, secrets) | Non renseigné ; gratuit jusqu'à 10 contributeurs | 2026-10-09 | en mode distant, le code part chez Semgrep |
| S8 | Snyk Studio · docs.snyk.io | MCP | scans de code, dépendances, conteneurs | Apache-2.0 (CLI) ; 100 tests/mois gratuits | 2026-10-23 | compte Snyk requis |
| S9 | Socket MCP · github.com/SocketDev/socket-mcp | MCP | note de risque des paquets proposés par l'IA | MIT ; 1 000 scans/mois gratuits | 2026-10-27 | développement précoce |
| S10 | CodeRabbit · coderabbit.ai | service | revue de PR par IA | gratuit pour les dépôts publics ; 24 à 72 $/mois | 2026-10-27 | code envoyé à un tiers |
| S11 | Sentry MCP · mcp.sentry.dev | MCP | erreurs, traces et logs pour déboguer | FSL-1.1 ; Developer gratuit | 2026-11-02 | licence non libre au sens classique |
| S12 | Playwright MCP (Microsoft) · github.com/microsoft/playwright-mcp | MCP | pilote un navigateur pour tester l'interface | Apache-2.0 | 2026-11-01 · 38 973 | un des outils peut exécuter du code arbitraire |

## 3. Méthode, assistants personnels, automatisation

| # | Ressource · lien | Type | Ce que ça fait | Licence · prix | Activité · ★ | Point d'attention |
|---|---|---|---|---|---|---|
| M1 | grill-me (Matt Pocock) · github.com/mattpocock/skills | skill | interroge sans relâche sur un plan jusqu'à trancher chaque décision | MIT | 2026-11-01 · 309 604 (dépôt) | texte seul, risque faible |
| M2 | Superpowers (Jesse Vincent) · github.com/obra/superpowers | skills | brainstorming, spécification, plan, développement en TDD par sous-agents | MIT | 2026-10-29 · 310 896 | hook au démarrage ; sous-agents autonomes pendant des heures |
| M3 | Spec Kit (GitHub) · github.com/github/spec-kit | CLI + skills | développement piloté par la spécification | MIT | 2026-10-30 · 145 166 | Python 3.11+ |
| M4 | skill-creator (Anthropic) · github.com/anthropics/skills | skill | crée, évalue et améliore d'autres skills | Apache-2.0 | 2026-10-28 | lance des scripts d'évaluation en local |
| M5 | claude-mem · github.com/thedotmack/claude-mem | plugin mémoire | résume les sessions et les réinjecte dans les suivantes | Apache-2.0 | 2026-11-02 · 110 119 | enregistre l'usage des outils ; propose un service hébergé |
| M6 | OpenClaw · github.com/openclaw/openclaw | agent personnel | assistant autonome piloté par WhatsApp, Telegram, Slack, iMessage | MIT | 2026-11-02 · 393 694 | outils exécutés sans bac à sable par défaut ; secrets possibles dans les journaux |
| M7 | Hermes Agent (Nous Research) · github.com/NousResearch/hermes-agent | agent personnel | mémoire, tâches planifiées, e-mail ; crée ses propres skills | MIT | 2026-11-02 · 259 647 | modifie ses propres skills ; isolation à configurer |
| M8 | OpenJarvis (Stanford) · github.com/open-jarvis/OpenJarvis | agent personnel | assistant local (Ollama) : Gmail, Agenda, résumé quotidien | Apache-2.0 | 2026-10-28 · 12,9 k | un seul accès couvre Gmail, Agenda et Tâches |
| M9 | n8n · n8n.io | outil / service | automatisation visuelle avec agents IA, plus de 1 500 intégrations | Sustainable Use License ; cloud dès 20 €/mois | 2026-11-02 · 209 342 | licence non libre pour l'usage commercial |
| M10 | n8n-mcp · github.com/czlonkowski/n8n-mcp | MCP | l'agent construit et valide des workflows n8n | MIT ; 100 appels/jour gratuits | 2026-11-02 · 23 192 | l'auteur : ne jamais modifier la production par IA |
| M11 | Tâches planifiées de Claude Code (Anthropic) · code.claude.com/docs/en/routines | service | lance un agent sur planning ou événement, ordinateur éteint | inclus dans les offres payantes | doc du 2026-11-02 | préversion ; agit en ton nom |

**« Jarvis »** : OpenJarvis est le seul projet sérieux qui porte ce nom. Deux autres sont écartés :
- microsoft/JARVIS : plus d'un an sans activité ;
- ethanplusai/jarvis : désactive les autorisations de Claude Code, et son usage commercial demande une licence.

## 4. Données, contenu, infrastructure, annuaires

| # | Ressource · lien | Type | Ce que ça fait | Licence · prix | Activité · ★ | Point d'attention |
|---|---|---|---|---|---|---|
| C1 | GPT Researcher · github.com/assafelovic/gpt-researcher | agent | recherche approfondie, rapports cités | Apache-2.0 ; clés payantes | 2026-10-10 · 30 427 | clés OpenAI et Tavily dans l'exemple |
| C2 | Exa MCP · github.com/exa-labs/exa-mcp-server | MCP + service | recherche web et lecture de pages | MIT ; 10 $ de crédits/mois | 2026-11-02 · 5 208 | service tiers |
| C3 | mcp-server-chart (AntV) · github.com/antvis/mcp-server-chart | MCP + skill | plus de 25 types de graphiques | MIT | 2026-08-27 · 4 410 | données envoyées par défaut à un serveur d'Alipay |
| C4 | MarkItDown (Microsoft) · github.com/microsoft/markitdown | outil + MCP | convertit PDF, Office, images, audio en Markdown | MIT | 2026-10-28 · 193 488 | le MCP peut lire tout fichier, sans authentification |
| C5 | Remotion skills · github.com/remotion-dev/skills | skill | vidéo en React : création, rendu, sous-titres | licence propre ; gratuit jusqu'à 3 salariés | 2026-11-02 · 6 067 | payant au-delà |
| C6 | Slidev · sli.dev | outil + MCP + skill | diapositives en Markdown, export PDF ou PPTX | MIT | 2026-10-23 · 49 329 | pour développeurs |
| C7 | Skills de documents (Anthropic) · github.com/anthropics/skills | skills | Word, PowerPoint, Excel, PDF | code consultable, non libre | 2026-10-28 · 186 559 | « démonstration et éducation » |
| C8 | Ollama · ollama.com | outil | modèles ouverts en local | MIT ; cloud payant | 2026-11-02 · 185 653 | vitesse selon le matériel |
| C9 | LM Studio · lmstudio.ai | outil + hôte MCP | modèles locaux en application de bureau | propriétaire (CLI MIT) ; gratuit | 2026-10-14 | application fermée ; pas de Mac Intel |
| C10 | MCP Cloudflare · github.com/cloudflare/mcp-server-cloudflare | MCP | piloter son compte Cloudflare | Apache-2.0 | 2026-10-22 · 4 440 | agit sur le vrai compte |
| C11 | Registre MCP officiel · registry.modelcontextprotocol.io | annuaire | fiches des serveurs MCP publics | MIT / Apache-2.0 | 2026-10-31 · 7 429 | préversion ; aucune analyse de sécurité |
| C12 | skills.sh + CLI `skills` (Vercel) · skills.sh | annuaire + outil | trouver et installer des skills sur plus de 75 agents | MIT | 2026-10-30 · 37 711 | classement par installations, pas par qualité ; télémétrie |

## Repérées, non vérifiées en détail

Les agents n'ont lu que les métadonnées GitHub ou une mention de ces ressources :
- Firecrawl MCP, awesome-mcp-servers, Docker MCP Gateway, MotherDuck MCP, Terraform MCP ;
- Mem0, Basic Memory, BMAD Method ;
- Motion Studio (motion.dev), Codrops (page bloquée).

## Suite

1. **Tri de l'utilisateur** : pour chaque ressource, garder ou retirer, avec un motif.
2. Les choix deviennent des exemples des consignes de découverte (grille `d1`, SPEC §7.3 ter).
3. Chaque ressource gardée est revérifiée juste avant publication, et toujours présentée avec ses limites.
