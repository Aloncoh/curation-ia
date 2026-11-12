// Sources ajoutées le 2026-11-10 (demande de l'utilisateur : « élargis la couverture des six agents… pour chaque ajout,
// indique ce qu'il apporte et vérifie qu'il collecte réellement »). Chaque flux a été interrogé en réel le 2026-11-10
// (réponse 200 sans redirection, flux lisible par notre analyseur, dernière entrée de moins de 120 jours, robots.txt
// respecté) ; les versions GitHub et Hacker News sont vérifiées à la première collecte en ligne. Écartés le même jour,
// avec leur motif, dans docs/sources.md §3.12. Le compte suit le rôle de chaque agent ; un contenu externe est attribué.
import type { GithubReleasesSource, ProductRef, SourceDefinition } from './sources.ts';

type FabriqueReleases = (owner: string, repo: string, perPage: number, product: Omit<ProductRef, 'repositoryUrl'>, extra?: Partial<Pick<GithubReleasesSource, 'maxResponseBytes' | 'compte'>>) => GithubReleasesSource;

/** Construit la liste avec la fabrique de sources.ts (pas d'import circulaire de valeurs). */
export const sourcesElargies = (githubReleases: FabriqueReleases): SourceDefinition[] => [
  // Anthropic : annonces, recherche, lancements (aucun flux officiel) — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:anthropic-plan', kind: 'feed', name: 'Anthropic — plan du site officiel (news, research, engineering, pages de lancement)', config: { url: 'https://www.anthropic.com/sitemap.xml', maxItems: 15, linkHosts: ['www.anthropic.com'], plan: { prefixes: ['/news/', '/research/', '/engineering/', '/claude-'] } }, allowedHosts: ['www.anthropic.com'], fetchIntervalMinutes: 30, maxResponseBytes: 2 * 1024 * 1024, compte: 'nodi' },
  // Higgsfield : modèles vidéo et image intégrés, MCP pour Claude et ChatGPT — vérifié le 2026-11-11 : 305 entrées, dernière
  // il y a 1 j, /blog autorisé par robots.txt. Le blog mêle annonces et classements de référencement : seuls les titres
  // d'annonce sont gardés (« Introducing… », « … on Higgsfield: », « Meet… », « Now on… », MCP), sauf guides et classements.
  { id: 'feed:higgsfield-blog', kind: 'feed', name: 'Higgsfield — flux officiel du blog (annonces seulement)', config: { url: 'https://higgsfield.ai/blog/rss.xml', maxItems: 15, linkHosts: ['higgsfield.ai'], titres: '^(?!how to\\b|\\d|best\\b|top\\b).*(?:\\b(introducing|meet|announcing)\\b|\\bnow (live |available )?on higgsfield\\b|\\bon higgsfield( ai)?\\s*:|\\bhiggsfield mcp\\b)' }, allowedHosts: ['higgsfield.ai'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Ai2 : modèles ouverts OLMo, Tülu — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:ai2-blog', kind: 'feed', name: 'Ai2 — flux officiel', config: { url: 'https://allenai.org/rss.xml', maxItems: 20, linkHosts: ['allenai.org'] }, allowedHosts: ['allenai.org'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Google Research : publications et modèles — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:google-research', kind: 'feed', name: 'Google Research — flux officiel', config: { url: 'https://research.google/blog/rss/', maxItems: 20, linkHosts: ['research.google'] }, allowedHosts: ['research.google'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Amazon Science : modèles Nova, recherche — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:amazon-science', kind: 'feed', name: 'Amazon Science — flux officiel', config: { url: 'https://www.amazon.science/index.rss', maxItems: 20, linkHosts: ['www.amazon.science'] }, allowedHosts: ['www.amazon.science'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Together AI : modèles ouverts servis — vérifié le 2026-11-10 : 20 entrées, dernière il y a 6 j
  { id: 'feed:together-blog', kind: 'feed', name: 'Together AI — flux officiel', config: { url: 'https://www.together.ai/blog/rss.xml', maxItems: 20, linkHosts: ['www.together.ai'] }, allowedHosts: ['www.together.ai'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Google DeepMind : modèles Gemini, Veo, recherche — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:deepmind-blog', kind: 'feed', name: 'Google DeepMind — flux officiel', config: { url: 'https://deepmind.google/blog/rss.xml', maxItems: 20, linkHosts: ['deepmind.google'] }, allowedHosts: ['deepmind.google'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // NVIDIA Research — vérifié le 2026-11-10 : 10 entrées, dernière il y a 0 j
  { id: 'feed:nvidia-research', kind: 'feed', name: 'NVIDIA Research — flux officiel', config: { url: 'https://research.nvidia.com/rss.xml', maxItems: 20, linkHosts: ['research.nvidia.com'] }, allowedHosts: ['research.nvidia.com'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Ollama : modèles locaux — vérifié le 2026-11-10 : 20 entrées, dernière il y a 17 j
  { id: 'feed:ollama-blog', kind: 'feed', name: 'Ollama — flux officiel', config: { url: 'https://ollama.com/blog/rss.xml', maxItems: 20, linkHosts: ['ollama.com'] }, allowedHosts: ['ollama.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Catalogue Hugging Face de nvidia : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 5 j
  { id: 'huggingface:auteur-nvidia', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par nvidia (API publique)', config: { url: 'https://huggingface.co/api/models?author=nvidia&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de microsoft : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 11 j
  { id: 'huggingface:auteur-microsoft', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par microsoft (API publique)', config: { url: 'https://huggingface.co/api/models?author=microsoft&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de deepseek-ai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 24 j
  { id: 'huggingface:auteur-deepseek-ai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par deepseek-ai (API publique)', config: { url: 'https://huggingface.co/api/models?author=deepseek-ai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de Qwen : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 32 j
  { id: 'huggingface:auteur-qwen', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par Qwen (API publique)', config: { url: 'https://huggingface.co/api/models?author=Qwen&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de mistralai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 26 j
  { id: 'huggingface:auteur-mistralai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par mistralai (API publique)', config: { url: 'https://huggingface.co/api/models?author=mistralai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de CohereLabs : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 63 j
  { id: 'huggingface:auteur-coherelabs', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par CohereLabs (API publique)', config: { url: 'https://huggingface.co/api/models?author=CohereLabs&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de google : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 57 j
  { id: 'huggingface:auteur-google', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par google (API publique)', config: { url: 'https://huggingface.co/api/models?author=google&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de ibm-granite : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 12 j
  { id: 'huggingface:auteur-ibm-granite', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par ibm-granite (API publique)', config: { url: 'https://huggingface.co/api/models?author=ibm-granite&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de apple : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 50 j
  { id: 'huggingface:auteur-apple', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par apple (API publique)', config: { url: 'https://huggingface.co/api/models?author=apple&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de moonshotai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 8 j
  { id: 'huggingface:auteur-moonshotai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par moonshotai (API publique)', config: { url: 'https://huggingface.co/api/models?author=moonshotai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de MiniMaxAI : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 24 j
  { id: 'huggingface:auteur-minimaxai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par MiniMaxAI (API publique)', config: { url: 'https://huggingface.co/api/models?author=MiniMaxAI&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de baidu : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 15 j
  { id: 'huggingface:auteur-baidu', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par baidu (API publique)', config: { url: 'https://huggingface.co/api/models?author=baidu&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de zai-org : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 77 j
  { id: 'huggingface:auteur-zai-org', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par zai-org (API publique)', config: { url: 'https://huggingface.co/api/models?author=zai-org&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de allenai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 5 j
  { id: 'huggingface:auteur-allenai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par allenai (API publique)', config: { url: 'https://huggingface.co/api/models?author=allenai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de ByteDance-Seed : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 4 j
  { id: 'huggingface:auteur-bytedance-seed', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par ByteDance-Seed (API publique)', config: { url: 'https://huggingface.co/api/models?author=ByteDance-Seed&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de internlm : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 4 j
  { id: 'huggingface:auteur-internlm', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par internlm (API publique)', config: { url: 'https://huggingface.co/api/models?author=internlm&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de kyutai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 36 j
  { id: 'huggingface:auteur-kyutai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par kyutai (API publique)', config: { url: 'https://huggingface.co/api/models?author=kyutai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de black-forest-labs : modèles image, vidéo, voix — vérifié le 2026-11-10 : 10 entrées, dernière il y a 26 j
  { id: 'huggingface:auteur-black-forest-labs', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par black-forest-labs (API publique)', config: { url: 'https://huggingface.co/api/models?author=black-forest-labs&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Versions de modelcontextprotocol/typescript-sdk — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('modelcontextprotocol', 'typescript-sdk', 10, { key: 'modelcontextprotocol/typescript-sdk', name: 'typescript-sdk', publisher: 'modelcontextprotocol', category: null }, { compte: 'repo' }),
  // Versions de modelcontextprotocol/python-sdk — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('modelcontextprotocol', 'python-sdk', 10, { key: 'modelcontextprotocol/python-sdk', name: 'python-sdk', publisher: 'modelcontextprotocol', category: null }, { compte: 'repo' }),
  // Versions de modelcontextprotocol/inspector — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('modelcontextprotocol', 'inspector', 10, { key: 'modelcontextprotocol/inspector', name: 'inspector', publisher: 'modelcontextprotocol', category: null }, { compte: 'repo' }),
  // Versions de anthropics/claude-agent-sdk-python — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('anthropics', 'claude-agent-sdk-python', 10, { key: 'anthropics/claude-agent-sdk-python', name: 'claude-agent-sdk-python', publisher: 'anthropics', category: null }, { compte: 'repo' }),
  // Versions de anthropics/claude-agent-sdk-typescript — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('anthropics', 'claude-agent-sdk-typescript', 10, { key: 'anthropics/claude-agent-sdk-typescript', name: 'claude-agent-sdk-typescript', publisher: 'anthropics', category: null }, { compte: 'repo' }),
  // Versions de anthropics/anthropic-sdk-python — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('anthropics', 'anthropic-sdk-python', 10, { key: 'anthropics/anthropic-sdk-python', name: 'anthropic-sdk-python', publisher: 'anthropics', category: null }, { compte: 'pyxo' }),
  // Versions de openai/openai-agents-python — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('openai', 'openai-agents-python', 10, { key: 'openai/openai-agents-python', name: 'openai-agents-python', publisher: 'openai', category: null }, { compte: 'repo' }),
  // Versions de openai/openai-python — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('openai', 'openai-python', 10, { key: 'openai/openai-python', name: 'openai-python', publisher: 'openai', category: null }, { compte: 'pyxo' }),
  // Versions de github/github-mcp-server — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('github', 'github-mcp-server', 10, { key: 'github/github-mcp-server', name: 'github-mcp-server', publisher: 'github', category: null }, { compte: 'repo' }),
  // Versions de microsoft/playwright-mcp — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('microsoft', 'playwright-mcp', 10, { key: 'microsoft/playwright-mcp', name: 'playwright-mcp', publisher: 'microsoft', category: null }, { compte: 'repo' }),
  // Versions de upstash/context7 — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('upstash', 'context7', 10, { key: 'upstash/context7', name: 'context7', publisher: 'upstash', category: null }, { compte: 'repo' }),
  // Versions de ollama/ollama — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('ollama', 'ollama', 10, { key: 'ollama/ollama', name: 'ollama', publisher: 'ollama', category: null }, { compte: 'pyxo' }),
  // Versions de ggml-org/llama.cpp — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('ggml-org', 'llama.cpp', 10, { key: 'ggml-org/llama.cpp', name: 'llama.cpp', publisher: 'ggml-org', category: null }, { compte: 'pyxo' }),
  // Versions de vllm-project/vllm — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('vllm-project', 'vllm', 10, { key: 'vllm-project/vllm', name: 'vllm', publisher: 'vllm-project', category: null }, { compte: 'pulse' }),
  // Versions de huggingface/transformers — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('huggingface', 'transformers', 10, { key: 'huggingface/transformers', name: 'transformers', publisher: 'huggingface', category: null }, { compte: 'nodi' }),
  // Versions de langchain-ai/langchain — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('langchain-ai', 'langchain', 10, { key: 'langchain-ai/langchain', name: 'langchain', publisher: 'langchain-ai', category: null }, { compte: 'pyxo' }),
  // Versions de langchain-ai/langgraph — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('langchain-ai', 'langgraph', 10, { key: 'langchain-ai/langgraph', name: 'langgraph', publisher: 'langchain-ai', category: null }, { compte: 'pyxo' }),
  // Versions de run-llama/llama_index — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('run-llama', 'llama_index', 10, { key: 'run-llama/llama_index', name: 'llama_index', publisher: 'run-llama', category: null }, { compte: 'pyxo' }),
  // Versions de crewAIInc/crewAI — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('crewAIInc', 'crewAI', 10, { key: 'crewaiinc/crewai', name: 'crewAI', publisher: 'crewAIInc', category: null }, { compte: 'pyxo' }),
  // Versions de pydantic/pydantic-ai — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('pydantic', 'pydantic-ai', 10, { key: 'pydantic/pydantic-ai', name: 'pydantic-ai', publisher: 'pydantic', category: null }, { compte: 'pyxo' }),
  // Versions de microsoft/autogen — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('microsoft', 'autogen', 10, { key: 'microsoft/autogen', name: 'autogen', publisher: 'microsoft', category: null }, { compte: 'pyxo' }),
  // Versions de zed-industries/zed — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('zed-industries', 'zed', 10, { key: 'zed-industries/zed', name: 'zed', publisher: 'zed-industries', category: null }, { compte: 'pyxo' }),
  // Versions de cline/cline — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('cline', 'cline', 10, { key: 'cline/cline', name: 'cline', publisher: 'cline', category: null }, { compte: 'pyxo' }),
  // Versions de continuedev/continue — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('continuedev', 'continue', 10, { key: 'continuedev/continue', name: 'continue', publisher: 'continuedev', category: null }, { compte: 'pyxo' }),
  // Versions de Aider-AI/aider — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('Aider-AI', 'aider', 10, { key: 'aider-ai/aider', name: 'aider', publisher: 'Aider-AI', category: null }, { compte: 'pyxo' }),
  // Versions de sst/opencode — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('sst', 'opencode', 10, { key: 'sst/opencode', name: 'opencode', publisher: 'sst', category: null }, { compte: 'pyxo' }),
  // Versions de block/goose — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('block', 'goose', 10, { key: 'block/goose', name: 'goose', publisher: 'block', category: null }, { compte: 'pyxo' }),
  // Versions de astral-sh/uv — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('astral-sh', 'uv', 10, { key: 'astral-sh/uv', name: 'uv', publisher: 'astral-sh', category: null }, { compte: 'pyxo' }),
  // Versions de astral-sh/ruff — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('astral-sh', 'ruff', 10, { key: 'astral-sh/ruff', name: 'ruff', publisher: 'astral-sh', category: null }, { compte: 'pyxo' }),
  // Versions de oven-sh/bun — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('oven-sh', 'bun', 10, { key: 'oven-sh/bun', name: 'bun', publisher: 'oven-sh', category: null }, { compte: 'pyxo' }),
  // Versions de denoland/deno — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('denoland', 'deno', 10, { key: 'denoland/deno', name: 'deno', publisher: 'denoland', category: null }, { compte: 'pyxo' }),
  // Versions de microsoft/TypeScript — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('microsoft', 'TypeScript', 10, { key: 'microsoft/typescript', name: 'TypeScript', publisher: 'microsoft', category: null }, { compte: 'pyxo' }),
  // Versions de vercel/next.js — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('vercel', 'next.js', 10, { key: 'vercel/next.js', name: 'next.js', publisher: 'vercel', category: null }, { compte: 'pyxo' }),
  // Versions de vercel/ai — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('vercel', 'ai', 10, { key: 'vercel/ai', name: 'ai', publisher: 'vercel', category: null }, { compte: 'pyxo' }),
  // Versions de nodejs/node — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('nodejs', 'node', 10, { key: 'nodejs/node', name: 'node', publisher: 'nodejs', category: null }, { compte: 'pyxo' }),
  // Versions de n8n-io/n8n — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('n8n-io', 'n8n', 10, { key: 'n8n-io/n8n', name: 'n8n', publisher: 'n8n-io', category: null }, { compte: 'repo' }),
  // Versions de open-webui/open-webui — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('open-webui', 'open-webui', 10, { key: 'open-webui/open-webui', name: 'open-webui', publisher: 'open-webui', category: null }, { compte: 'pyxo' }),
  // Versions de browser-use/browser-use — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('browser-use', 'browser-use', 10, { key: 'browser-use/browser-use', name: 'browser-use', publisher: 'browser-use', category: null }, { compte: 'repo' }),
  // Versions de mrdoob/three.js — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('mrdoob', 'three.js', 10, { key: 'mrdoob/three.js', name: 'three.js', publisher: 'mrdoob', category: null }, { compte: 'mova' }),
  // Versions de remotion-dev/remotion — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('remotion-dev', 'remotion', 10, { key: 'remotion-dev/remotion', name: 'remotion', publisher: 'remotion-dev', category: null }, { compte: 'mova' }),
  // Versions de greensock/GSAP — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('greensock', 'GSAP', 10, { key: 'greensock/gsap', name: 'GSAP', publisher: 'greensock', category: null }, { compte: 'mova' }),
  // Versions de motiondivision/motion — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('motiondivision', 'motion', 10, { key: 'motiondivision/motion', name: 'motion', publisher: 'motiondivision', category: null }, { compte: 'mova' }),
  // Versions de comfyanonymous/ComfyUI — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('comfyanonymous', 'ComfyUI', 10, { key: 'comfyanonymous/comfyui', name: 'ComfyUI', publisher: 'comfyanonymous', category: null }, { compte: 'mova' }),
  // Versions de pmndrs/react-three-fiber — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('pmndrs', 'react-three-fiber', 10, { key: 'pmndrs/react-three-fiber', name: 'react-three-fiber', publisher: 'pmndrs', category: null }, { compte: 'mova' }),
  // Versions de BabylonJS/Babylon.js — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('BabylonJS', 'Babylon.js', 10, { key: 'babylonjs/babylon.js', name: 'Babylon.js', publisher: 'BabylonJS', category: null }, { compte: 'mova' }),
  // Versions de blender/blender — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('blender', 'blender', 10, { key: 'blender/blender', name: 'blender', publisher: 'blender', category: null }, { compte: 'mova' }),
  // Versions de godotengine/godot — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('godotengine', 'godot', 10, { key: 'godotengine/godot', name: 'godot', publisher: 'godotengine', category: null }, { compte: 'mova' }),
  // Versions de ray-project/ray — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('ray-project', 'ray', 10, { key: 'ray-project/ray', name: 'ray', publisher: 'ray-project', category: null }, { compte: 'pulse' }),
  // Versions de qdrant/qdrant — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('qdrant', 'qdrant', 10, { key: 'qdrant/qdrant', name: 'qdrant', publisher: 'qdrant', category: null }, { compte: 'pulse' }),
  // Versions de chroma-core/chroma — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('chroma-core', 'chroma', 10, { key: 'chroma-core/chroma', name: 'chroma', publisher: 'chroma-core', category: null }, { compte: 'pulse' }),
  // Versions de duckdb/duckdb — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('duckdb', 'duckdb', 10, { key: 'duckdb/duckdb', name: 'duckdb', publisher: 'duckdb', category: null }, { compte: 'pulse' }),
  // Versions de ClickHouse/ClickHouse — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('ClickHouse', 'ClickHouse', 10, { key: 'clickhouse/clickhouse', name: 'ClickHouse', publisher: 'ClickHouse', category: null }, { compte: 'pulse' }),
  // Versions de grafana/grafana — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('grafana', 'grafana', 10, { key: 'grafana/grafana', name: 'grafana', publisher: 'grafana', category: null }, { compte: 'pulse' }),
  // Versions de kubernetes/kubernetes — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('kubernetes', 'kubernetes', 10, { key: 'kubernetes/kubernetes', name: 'kubernetes', publisher: 'kubernetes', category: null }, { compte: 'pulse' }),
  // Versions de docker/compose — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('docker', 'compose', 10, { key: 'docker/compose', name: 'compose', publisher: 'docker', category: null }, { compte: 'pulse' }),
  // Versions de langfuse/langfuse — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('langfuse', 'langfuse', 10, { key: 'langfuse/langfuse', name: 'langfuse', publisher: 'langfuse', category: null }, { compte: 'pulse' }),
  // Versions de BerriAI/litellm — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('BerriAI', 'litellm', 10, { key: 'berriai/litellm', name: 'litellm', publisher: 'BerriAI', category: null }, { compte: 'pulse' }),
  // Versions de sgl-project/sglang — à vérifier à la première collecte en ligne (API GitHub, jeton d'Actions)
  githubReleases('sgl-project', 'sglang', 10, { key: 'sgl-project/sglang', name: 'sglang', publisher: 'sgl-project', category: null }, { compte: 'pulse' }),
  // Catalogue Hugging Face de stabilityai : modèles image, vidéo, voix — vérifié le 2026-11-10 : 10 entrées, dernière il y a 15 j
  { id: 'huggingface:auteur-stabilityai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par stabilityai (API publique)', config: { url: 'https://huggingface.co/api/models?author=stabilityai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Catalogue Hugging Face de Wan-AI : modèles image, vidéo, voix — vérifié le 2026-11-10 : 10 entrées, dernière il y a 96 j
  { id: 'huggingface:auteur-wan-ai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par Wan-AI (API publique)', config: { url: 'https://huggingface.co/api/models?author=Wan-AI&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Catalogue Hugging Face de Lightricks : modèles image, vidéo, voix — vérifié le 2026-11-10 : 10 entrées, dernière il y a 13 j
  { id: 'huggingface:auteur-lightricks', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par Lightricks (API publique)', config: { url: 'https://huggingface.co/api/models?author=Lightricks&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Catalogue Hugging Face de stepfun-ai : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 27 j
  { id: 'huggingface:auteur-stepfun-ai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par stepfun-ai (API publique)', config: { url: 'https://huggingface.co/api/models?author=stepfun-ai&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de tencent : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 3 j
  { id: 'huggingface:auteur-tencent', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par tencent (API publique)', config: { url: 'https://huggingface.co/api/models?author=tencent&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Catalogue Hugging Face de LiquidAI : nouveaux modèles publiés — vérifié le 2026-11-10 : 10 entrées, dernière il y a 14 j
  { id: 'huggingface:auteur-liquidai', kind: 'huggingface_models', name: 'Hugging Face — modèles publiés par LiquidAI (API publique)', config: { url: 'https://huggingface.co/api/models?author=LiquidAI&sort=createdAt&direction=-1&limit=10', maxItems: 10 }, allowedHosts: ['huggingface.co'], fetchIntervalMinutes: 360, compte: 'nodi' },
  // Node.js — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:nodejs-blog', kind: 'feed', name: 'Node.js — flux officiel', config: { url: 'https://nodejs.org/en/feed/blog.xml', maxItems: 20, linkHosts: ['nodejs.org'] }, allowedHosts: ['nodejs.org'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Deno — vérifié le 2026-11-10 : 20 entrées, dernière il y a 32 j
  { id: 'feed:deno-blog', kind: 'feed', name: 'Deno — flux officiel', config: { url: 'https://deno.com/feed', maxItems: 20, linkHosts: ['deno.com'] }, allowedHosts: ['deno.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // VS Code : notes de version, fonctions IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a -1 j
  { id: 'feed:vscode-updates', kind: 'feed', name: 'VS Code — flux officiel', config: { url: 'https://code.visualstudio.com/feed.xml', maxItems: 20, linkHosts: ['code.visualstudio.com'] }, allowedHosts: ['code.visualstudio.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Python — vérifié le 2026-11-10 : 20 entrées, dernière il y a 15 j
  { id: 'feed:python-insider', kind: 'feed', name: 'Python — flux officiel', config: { url: 'https://blog.python.org/feeds/posts/default', maxItems: 20, linkHosts: ['blog.python.org'] }, allowedHosts: ['blog.python.org'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Rust — vérifié le 2026-11-10 : 10 entrées, dernière il y a 7 j
  { id: 'feed:rust-blog', kind: 'feed', name: 'Rust — flux officiel', config: { url: 'https://blog.rust-lang.org/feed.xml', maxItems: 20, linkHosts: ['blog.rust-lang.org'] }, allowedHosts: ['blog.rust-lang.org'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Bun — vérifié le 2026-11-10 : 20 entrées, dernière il y a 19 j
  { id: 'feed:bun-blog', kind: 'feed', name: 'Bun — flux officiel', config: { url: 'https://bun.com/rss.xml', maxItems: 20, linkHosts: ['bun.com'] }, allowedHosts: ['bun.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Mozilla Hacks — vérifié le 2026-11-10 : 20 entrées, dernière il y a 78 j
  { id: 'feed:mozilla-hacks', kind: 'feed', name: 'Mozilla Hacks — flux officiel', config: { url: 'https://hacks.mozilla.org/feed/', maxItems: 20, linkHosts: ['hacks.mozilla.org'] }, allowedHosts: ['hacks.mozilla.org'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // JetBrains AI — vérifié le 2026-11-10 : 12 entrées, dernière il y a 5 j
  { id: 'feed:jetbrains-ai', kind: 'feed', name: 'JetBrains AI — flux officiel', config: { url: 'https://blog.jetbrains.com/ai/feed/', maxItems: 20, linkHosts: ['blog.jetbrains.com'] }, allowedHosts: ['blog.jetbrains.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // web.dev — vérifié le 2026-11-10 : 10 entrées, dernière il y a 39 j
  { id: 'feed:webdev', kind: 'feed', name: 'web.dev — flux officiel', config: { url: 'https://web.dev/static/blog/feed.xml', maxItems: 20, linkHosts: ['web.dev'] }, allowedHosts: ['web.dev'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Go — vérifié le 2026-11-10 : 10 entrées, dernière il y a 6 j
  { id: 'feed:go-blog', kind: 'feed', name: 'Go — flux officiel', config: { url: 'https://go.dev/blog/feed.atom', maxItems: 20, linkHosts: ['go.dev'] }, allowedHosts: ['go.dev'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Chrome for Developers — vérifié le 2026-11-10 : 10 entrées, dernière il y a 34 j
  { id: 'feed:chrome-dev', kind: 'feed', name: 'Chrome for Developers — flux officiel', config: { url: 'https://developer.chrome.com/static/blog/feed.xml', maxItems: 20, linkHosts: ['developer.chrome.com'] }, allowedHosts: ['developer.chrome.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // TypeScript — vérifié le 2026-11-10 : 10 entrées, dernière il y a 21 j
  { id: 'feed:typescript-blog', kind: 'feed', name: 'TypeScript — flux officiel', config: { url: 'https://devblogs.microsoft.com/typescript/feed/', maxItems: 20, linkHosts: ['devblogs.microsoft.com'] }, allowedHosts: ['devblogs.microsoft.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Vercel : blog et annonces — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:vercel-blog', kind: 'feed', name: 'Vercel — flux officiel', config: { url: 'https://vercel.com/atom', maxItems: 20, linkHosts: ['vercel.com'] }, allowedHosts: ['vercel.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Kotlin — vérifié le 2026-11-10 : 12 entrées, dernière il y a 4 j
  { id: 'feed:kotlin-blog', kind: 'feed', name: 'Kotlin — flux officiel', config: { url: 'https://blog.jetbrains.com/kotlin/feed/', maxItems: 20, linkHosts: ['blog.jetbrains.com'] }, allowedHosts: ['blog.jetbrains.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Swift — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:swift-blog', kind: 'feed', name: 'Swift — flux officiel', config: { url: 'https://www.swift.org/atom.xml', maxItems: 20, linkHosts: ['www.swift.org'] }, allowedHosts: ['www.swift.org'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Astro — vérifié le 2026-11-10 : 20 entrées, dernière il y a 10 j
  { id: 'feed:astro-blog', kind: 'feed', name: 'Astro — flux officiel', config: { url: 'https://astro.build/rss.xml', maxItems: 20, linkHosts: ['astro.build'] }, allowedHosts: ['astro.build'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // React — vérifié le 2026-11-10 : 20 entrées, dernière il y a 62 j
  { id: 'feed:react-blog', kind: 'feed', name: 'React — flux officiel', config: { url: 'https://react.dev/rss.xml', maxItems: 20, linkHosts: ['react.dev'] }, allowedHosts: ['react.dev'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Supabase — vérifié le 2026-11-10 : 20 entrées, dernière il y a 7 j
  { id: 'feed:supabase-blog', kind: 'feed', name: 'Supabase — flux officiel', config: { url: 'https://supabase.com/rss.xml', maxItems: 20, linkHosts: ['supabase.com'] }, allowedHosts: ['supabase.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Cloudflare : changelog développeurs — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:cloudflare-changelog', kind: 'feed', name: 'Cloudflare — flux officiel', config: { url: 'https://developers.cloudflare.com/changelog/rss/index.xml', maxItems: 20, linkHosts: ['developers.cloudflare.com'] }, allowedHosts: ['developers.cloudflare.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Zed : éditeur et agents — vérifié le 2026-11-10 : 20 entrées, dernière il y a 55 j
  { id: 'feed:zed-blog', kind: 'feed', name: 'Zed — flux officiel', config: { url: 'https://zed.dev/blog.rss', maxItems: 20, linkHosts: ['zed.dev'] }, allowedHosts: ['zed.dev'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Stack Overflow Blog — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:stackoverflow-blog', kind: 'feed', name: 'Stack Overflow Blog — contenu externe attribué', config: { url: 'https://stackoverflow.blog/feed/', maxItems: 20, linkHosts: ['stackoverflow.blog'] }, allowedHosts: ['stackoverflow.blog'], fetchIntervalMinutes: 360, attribution: 'Stack Overflow Blog', compte: 'pyxo' },
  // GitHub Blog, IA et ML — vérifié le 2026-11-10 : 10 entrées, dernière il y a 3 j
  { id: 'feed:github-blog-ai', kind: 'feed', name: 'GitHub Blog, IA et ML — flux officiel', config: { url: 'https://github.blog/ai-and-ml/feed/', maxItems: 20, linkHosts: ['github.blog'] }, allowedHosts: ['github.blog'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Docker — vérifié le 2026-11-10 : 10 entrées, dernière il y a 4 j
  { id: 'feed:docker-blog', kind: 'feed', name: 'Docker — flux officiel', config: { url: 'https://www.docker.com/feed/', maxItems: 20, linkHosts: ['www.docker.com'] }, allowedHosts: ['www.docker.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Simon Willison : essais pratiques des modèles — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:simonwillison', kind: 'feed', name: 'Simon Willison — contenu externe attribué', config: { url: 'https://simonwillison.net/atom/everything/', maxItems: 20, linkHosts: ['simonwillison.net'] }, allowedHosts: ['simonwillison.net'], fetchIntervalMinutes: 360, attribution: 'Simon Willison (blog personnel)', compte: 'pyxo' },
  // Svelte — vérifié le 2026-11-10 : 20 entrées, dernière il y a 40 j
  { id: 'feed:svelte-blog', kind: 'feed', name: 'Svelte — flux officiel', config: { url: 'https://svelte.dev/blog/rss.xml', maxItems: 20, linkHosts: ['svelte.dev'] }, allowedHosts: ['svelte.dev'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Don’t Worry About the Vase : revue hebdomadaire IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:thezvi', kind: 'feed', name: 'Don’t Worry About the Vase — contenu externe attribué', config: { url: 'https://thezvi.substack.com/feed', maxItems: 20, linkHosts: ['thezvi.substack.com'] }, allowedHosts: ['thezvi.substack.com'], fetchIntervalMinutes: 360, attribution: 'Zvi Mowshowitz (newsletter)', compte: 'nodi' },
  // Interconnects : modèles ouverts — vérifié le 2026-11-10 : 20 entrées, dernière il y a 6 j
  { id: 'feed:interconnects', kind: 'feed', name: 'Interconnects — contenu externe attribué', config: { url: 'https://www.interconnects.ai/feed', maxItems: 20, linkHosts: ['www.interconnects.ai'] }, allowedHosts: ['www.interconnects.ai'], fetchIntervalMinutes: 360, attribution: 'Interconnects (Nathan Lambert, newsletter)', compte: 'nodi' },
  // Spline : 3D web — vérifié le 2026-11-10 : 20 entrées, dernière il y a 7 j
  { id: 'feed:spline-blog', kind: 'feed', name: 'Spline — flux officiel', config: { url: 'https://spline.design/blog/rss.xml', maxItems: 20, linkHosts: ['spline.design'] }, allowedHosts: ['spline.design'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Godot — vérifié le 2026-11-10 : 15 entrées, dernière il y a 1 j
  { id: 'feed:godot-news', kind: 'feed', name: 'Godot — flux officiel', config: { url: 'https://godotengine.org/rss.xml', maxItems: 20, linkHosts: ['godotengine.org'] }, allowedHosts: ['godotengine.org'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Figma — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:figma-blog', kind: 'feed', name: 'Figma — flux officiel', config: { url: 'https://www.figma.com/blog/feed/atom.xml', maxItems: 20, linkHosts: ['www.figma.com'] }, allowedHosts: ['www.figma.com'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Blender Developers Blog — vérifié le 2026-11-10 : 10 entrées, dernière il y a 7 j
  { id: 'feed:blender-dev', kind: 'feed', name: 'Blender Developers Blog — flux officiel', config: { url: 'https://code.blender.org/feed/', maxItems: 20, linkHosts: ['code.blender.org'] }, allowedHosts: ['code.blender.org'], fetchIntervalMinutes: 360, compte: 'mova' },
  // CSS-Tricks — vérifié le 2026-11-10 : 15 entrées, dernière il y a 1 j
  { id: 'feed:css-tricks', kind: 'feed', name: 'CSS-Tricks — contenu externe attribué', config: { url: 'https://css-tricks.com/feed/', maxItems: 20, linkHosts: ['css-tricks.com'] }, allowedHosts: ['css-tricks.com'], fetchIntervalMinutes: 360, attribution: 'CSS-Tricks', compte: 'mova' },
  // Motionographer : motion design — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:motionographer', kind: 'feed', name: 'Motionographer — contenu externe attribué', config: { url: 'https://motionographer.com/feed/', maxItems: 20, linkHosts: ['motionographer.com'] }, allowedHosts: ['motionographer.com'], fetchIntervalMinutes: 360, attribution: 'Motionographer (presse spécialisée)', compte: 'mova' },
  // Grafana Labs — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:grafana-blog', kind: 'feed', name: 'Grafana Labs — flux officiel', config: { url: 'https://grafana.com/blog/index.xml', maxItems: 20, linkHosts: ['grafana.com'] }, allowedHosts: ['grafana.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // ClickHouse — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:clickhouse-blog', kind: 'feed', name: 'ClickHouse — flux officiel', config: { url: 'https://clickhouse.com/rss.xml', maxItems: 20, linkHosts: ['clickhouse.com'] }, allowedHosts: ['clickhouse.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Neon — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:neon-blog', kind: 'feed', name: 'Neon — flux officiel', config: { url: 'https://neon.com/blog/rss.xml', maxItems: 20, linkHosts: ['neon.com'] }, allowedHosts: ['neon.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // PostgreSQL — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:postgres-news', kind: 'feed', name: 'PostgreSQL — flux officiel', config: { url: 'https://www.postgresql.org/news.rss', maxItems: 20, linkHosts: ['www.postgresql.org'] }, allowedHosts: ['www.postgresql.org'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // CNCF — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:cncf-blog', kind: 'feed', name: 'CNCF — flux officiel', config: { url: 'https://www.cncf.io/feed/', maxItems: 20, linkHosts: ['www.cncf.io'] }, allowedHosts: ['www.cncf.io'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Kubernetes — vérifié le 2026-11-10 : 20 entrées, dernière il y a 12 j
  { id: 'feed:k8s-blog', kind: 'feed', name: 'Kubernetes — flux officiel', config: { url: 'https://kubernetes.io/feed.xml', maxItems: 20, linkHosts: ['kubernetes.io'] }, allowedHosts: ['kubernetes.io'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // HashiCorp — vérifié le 2026-11-10 : 20 entrées, dernière il y a 7 j
  { id: 'feed:hashicorp-blog', kind: 'feed', name: 'HashiCorp — flux officiel', config: { url: 'https://www.hashicorp.com/blog/feed.xml', maxItems: 20, linkHosts: ['www.hashicorp.com'] }, allowedHosts: ['www.hashicorp.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Redis — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:redis-blog', kind: 'feed', name: 'Redis — flux officiel', config: { url: 'https://redis.io/blog/feed/', maxItems: 20, linkHosts: ['redis.io'] }, allowedHosts: ['redis.io'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Replicate — vérifié le 2026-11-10 : 20 entrées, dernière il y a 7 j
  { id: 'feed:replicate-blog', kind: 'feed', name: 'Replicate — flux officiel', config: { url: 'https://replicate.com/blog/rss', maxItems: 20, linkHosts: ['replicate.com'] }, allowedHosts: ['replicate.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Fly.io — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:flyio-blog', kind: 'feed', name: 'Fly.io — flux officiel', config: { url: 'https://fly.io/blog/feed.xml', maxItems: 20, linkHosts: ['fly.io'] }, allowedHosts: ['fly.io'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // DuckDB — vérifié le 2026-11-10 : 10 entrées, dernière il y a 0 j
  { id: 'feed:duckdb-blog', kind: 'feed', name: 'DuckDB — flux officiel', config: { url: 'https://duckdb.org/feed.xml', maxItems: 20, linkHosts: ['duckdb.org'] }, allowedHosts: ['duckdb.org'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // AWS News Blog — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:aws-news-blog', kind: 'feed', name: 'AWS News Blog — flux officiel', config: { url: 'https://aws.amazon.com/blogs/aws/feed/', maxItems: 20, linkHosts: ['aws.amazon.com'] }, allowedHosts: ['aws.amazon.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Meta Engineering — vérifié le 2026-11-10 : 9 entrées, dernière il y a 1 j
  { id: 'feed:meta-engineering', kind: 'feed', name: 'Meta Engineering — flux officiel', config: { url: 'https://engineering.fb.com/feed/', maxItems: 20, linkHosts: ['engineering.fb.com'] }, allowedHosts: ['engineering.fb.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Slack Engineering — vérifié le 2026-11-10 : 8 entrées, dernière il y a 119 j
  { id: 'feed:slack-engineering', kind: 'feed', name: 'Slack Engineering — flux officiel', config: { url: 'https://slack.engineering/feed/', maxItems: 20, linkHosts: ['slack.engineering'] }, allowedHosts: ['slack.engineering'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Statut Cloudflare : incidents — vérifié le 2026-11-10 : 20 entrées, dernière il y a -8 j
  { id: 'feed:cloudflarestatus', kind: 'feed', name: 'Statut Cloudflare — flux officiel', config: { url: 'https://www.cloudflarestatus.com/history.rss', maxItems: 20, linkHosts: ['www.cloudflarestatus.com'] }, allowedHosts: ['www.cloudflarestatus.com'], fetchIntervalMinutes: 120, compte: 'pulse' },
  // Statut GitHub : incidents — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:githubstatus', kind: 'feed', name: 'Statut GitHub — flux officiel', config: { url: 'https://www.githubstatus.com/history.rss', maxItems: 20, linkHosts: ['www.githubstatus.com'] }, allowedHosts: ['www.githubstatus.com'], fetchIntervalMinutes: 120, compte: 'pulse' },
  // Statut Google Cloud : incidents — vérifié le 2026-11-10 : 1 entrées, dernière il y a 5 j
  { id: 'feed:gcloud-status', kind: 'feed', name: 'Statut Google Cloud — flux officiel', config: { url: 'https://status.cloud.google.com/en/feed.atom', maxItems: 20, linkHosts: ['status.cloud.google.com'] }, allowedHosts: ['status.cloud.google.com'], fetchIntervalMinutes: 120, compte: 'pulse' },
  // Statut Vercel : incidents — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:vercelstatus', kind: 'feed', name: 'Statut Vercel — flux officiel', config: { url: 'https://www.vercel-status.com/history.rss', maxItems: 20, linkHosts: ['www.vercel-status.com'] }, allowedHosts: ['www.vercel-status.com'], fetchIntervalMinutes: 120, compte: 'pulse' },
  // Dropbox Tech — vérifié le 2026-11-10 : 10 entrées, dernière il y a 5 j
  { id: 'feed:dropbox-tech', kind: 'feed', name: 'Dropbox Tech — flux officiel', config: { url: 'https://dropbox.tech/feed', maxItems: 20, linkHosts: ['dropbox.tech'] }, allowedHosts: ['dropbox.tech'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // PyTorch — vérifié le 2026-11-10 : 10 entrées, dernière il y a 5 j
  { id: 'feed:pytorch-blog', kind: 'feed', name: 'PyTorch — flux officiel', config: { url: 'https://pytorch.org/feed/', maxItems: 20, linkHosts: ['pytorch.org'] }, allowedHosts: ['pytorch.org'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // WebKit : CSS, animation, WebGPU — vérifié le 2026-11-10 : 10 entrées, dernière il y a 5 j
  { id: 'feed:webkit-blog', kind: 'feed', name: 'WebKit — flux officiel', config: { url: 'https://webkit.org/feed/', maxItems: 20, linkHosts: ['webkit.org'] }, allowedHosts: ['webkit.org'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Salesforce : agents en entreprise — vérifié le 2026-11-10 : 10 entrées, dernière il y a 4 j
  { id: 'feed:salesforce-news', kind: 'feed', name: 'Salesforce — flux officiel', config: { url: 'https://www.salesforce.com/news/feed/', maxItems: 20, linkHosts: ['www.salesforce.com'] }, allowedHosts: ['www.salesforce.com'], fetchIntervalMinutes: 360, compte: 'radar' },
  // Waymo — vérifié le 2026-11-10 : 20 entrées, dernière il y a 5 j
  { id: 'feed:waymo-blog', kind: 'feed', name: 'Waymo — flux officiel', config: { url: 'https://waymo.com/blog/rss.xml', maxItems: 20, linkHosts: ['waymo.com'] }, allowedHosts: ['waymo.com'], fetchIntervalMinutes: 360, compte: 'radar' },
  // Wired, IA — vérifié le 2026-11-10 : 10 entrées, dernière il y a 0 j
  { id: 'feed:wired-ai', kind: 'feed', name: 'Wired, IA — contenu externe attribué', config: { url: 'https://www.wired.com/feed/tag/ai/latest/rss', maxItems: 20, linkHosts: ['www.wired.com'] }, allowedHosts: ['www.wired.com'], fetchIntervalMinutes: 360, attribution: 'Wired', compte: 'radar' },
  // MIT Technology Review, IA — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:mittr-ai', kind: 'feed', name: 'MIT Technology Review, IA — contenu externe attribué', config: { url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', maxItems: 20, linkHosts: ['www.technologyreview.com'] }, allowedHosts: ['www.technologyreview.com'], fetchIntervalMinutes: 360, attribution: 'MIT Technology Review', compte: 'radar' },
  // The Robot Report — vérifié le 2026-11-10 : 15 entrées, dernière il y a 0 j
  { id: 'feed:robotreport', kind: 'feed', name: 'The Robot Report — contenu externe attribué', config: { url: 'https://www.therobotreport.com/feed/', maxItems: 20, linkHosts: ['www.therobotreport.com'] }, allowedHosts: ['www.therobotreport.com'], fetchIntervalMinutes: 360, attribution: 'The Robot Report (presse spécialisée)', compte: 'radar' },
  // SemiAnalysis : puces et centres de données — vérifié le 2026-11-10 : 20 entrées, dernière il y a 3 j
  { id: 'feed:semianalysis', kind: 'feed', name: 'SemiAnalysis — contenu externe attribué', config: { url: 'https://newsletter.semianalysis.com/feed', maxItems: 20, linkHosts: ['newsletter.semianalysis.com'] }, allowedHosts: ['newsletter.semianalysis.com'], fetchIntervalMinutes: 360, attribution: 'SemiAnalysis (newsletter)', compte: 'radar' },
  // TechCrunch, IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:techcrunch-ai', kind: 'feed', name: 'TechCrunch, IA — contenu externe attribué', config: { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', maxItems: 20, linkHosts: ['techcrunch.com'] }, allowedHosts: ['techcrunch.com'], fetchIntervalMinutes: 360, attribution: 'TechCrunch (rubrique IA)', compte: 'radar' },
  // Product Hunt : nouveaux produits — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:producthunt', kind: 'feed', name: 'Product Hunt — contenu externe attribué', config: { url: 'https://www.producthunt.com/feed', maxItems: 20, linkHosts: ['www.producthunt.com'] }, allowedHosts: ['www.producthunt.com'], fetchIntervalMinutes: 360, attribution: 'Product Hunt (lancements déclarés par leurs auteurs)', compte: 'repo' },
  // The Verge, IA — vérifié le 2026-11-10 : 10 entrées, dernière il y a 0 j
  { id: 'feed:verge-ai', kind: 'feed', name: 'The Verge, IA — contenu externe attribué', config: { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', maxItems: 20, linkHosts: ['www.theverge.com'] }, allowedHosts: ['www.theverge.com'], fetchIntervalMinutes: 360, attribution: 'The Verge (rubrique IA)', compte: 'radar' },
  // Ars Technica, IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:ars-ai', kind: 'feed', name: 'Ars Technica, IA — contenu externe attribué', config: { url: 'https://arstechnica.com/ai/feed/', maxItems: 20, linkHosts: ['arstechnica.com'] }, allowedHosts: ['arstechnica.com'], fetchIntervalMinutes: 360, attribution: 'Ars Technica', compte: 'radar' },
  // IEEE Spectrum, IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:ieee-ai', kind: 'feed', name: 'IEEE Spectrum, IA — contenu externe attribué', config: { url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss', maxItems: 20, linkHosts: ['spectrum.ieee.org'] }, allowedHosts: ['spectrum.ieee.org'], fetchIntervalMinutes: 360, attribution: 'IEEE Spectrum (presse spécialisée)', compte: 'radar' },
  // ServeTheHome : serveurs, accélérateurs — vérifié le 2026-11-10 : 6 entrées, dernière il y a 0 j
  { id: 'feed:servethehome', kind: 'feed', name: 'ServeTheHome — contenu externe attribué', config: { url: 'https://www.servethehome.com/feed/', maxItems: 20, linkHosts: ['www.servethehome.com'] }, allowedHosts: ['www.servethehome.com'], fetchIntervalMinutes: 360, attribution: 'ServeTheHome', compte: 'radar' },
  // IEEE Spectrum, robotique — vérifié le 2026-11-10 : 20 entrées, dernière il y a 1 j
  { id: 'feed:ieee-robotics', kind: 'feed', name: 'IEEE Spectrum, robotique — contenu externe attribué', config: { url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss', maxItems: 20, linkHosts: ['spectrum.ieee.org'] }, allowedHosts: ['spectrum.ieee.org'], fetchIntervalMinutes: 360, attribution: 'IEEE Spectrum (presse spécialisée)', compte: 'radar' },
  // Unreal Engine — vérifié le 2026-11-10 : 10 entrées, dernière il y a 6 j
  { id: 'feed:unreal-news', kind: 'feed', name: 'Unreal Engine — flux officiel', config: { url: 'https://www.unrealengine.com/rss?lang=en-US', maxItems: 20, linkHosts: ['www.unrealengine.com'] }, allowedHosts: ['www.unrealengine.com'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Google for Developers : API Gemini, outils — vérifié le 2026-11-10 : 20 entrées, dernière il y a None j
  { id: 'feed:google-developers', kind: 'feed', name: 'Google for Developers — flux officiel', config: { url: 'https://developers.googleblog.com/feeds/posts/default/', maxItems: 20, linkHosts: ['developers.googleblog.com'] }, allowedHosts: ['developers.googleblog.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Sourcegraph / Amp — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:sourcegraph-blog', kind: 'feed', name: 'Sourcegraph / Amp — flux officiel', config: { url: 'https://sourcegraph.com/blog/feed.rss', maxItems: 20, linkHosts: ['sourcegraph.com'] }, allowedHosts: ['sourcegraph.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Latent Space : entretiens IA — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:latent-space', kind: 'feed', name: 'Latent Space — contenu externe attribué', config: { url: 'https://latent.space/feed', maxItems: 20, linkHosts: ['latent.space'] }, allowedHosts: ['latent.space'], fetchIntervalMinutes: 360, attribution: 'Latent Space (newsletter)', compte: 'nodi' },
  // Spotify Engineering — vérifié le 2026-11-10 : 5 entrées, dernière il y a 1 j
  { id: 'feed:spotify-engineering', kind: 'feed', name: 'Spotify Engineering — flux officiel', config: { url: 'https://engineering.atspotify.com/feed', maxItems: 20, linkHosts: ['engineering.atspotify.com'] }, allowedHosts: ['engineering.atspotify.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Android Developers — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:android-dev', kind: 'feed', name: 'Android Developers — flux officiel', config: { url: 'https://developer.android.com/static/blog/atom.xml', maxItems: 20, linkHosts: ['developer.android.com'] }, allowedHosts: ['developer.android.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // dbt Labs — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:dbt-blog', kind: 'feed', name: 'dbt Labs — flux officiel', config: { url: 'https://www.getdbt.com/blog/feed.xml', maxItems: 20, linkHosts: ['www.getdbt.com'] }, allowedHosts: ['www.getdbt.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Arm — vérifié le 2026-11-10 : 6 entrées, dernière il y a 5 j
  { id: 'feed:arm-news', kind: 'feed', name: 'Arm — flux officiel', config: { url: 'https://newsroom.arm.com/feed', maxItems: 20, linkHosts: ['newsroom.arm.com'] }, allowedHosts: ['newsroom.arm.com'], fetchIntervalMinutes: 360, compte: 'radar' },
  // Replit : agent de code — vérifié le 2026-11-10 : 20 entrées, dernière il y a 13 j
  { id: 'feed:replit-blog', kind: 'feed', name: 'Replit — flux officiel', config: { url: 'https://replit.com/blog/feed.xml', maxItems: 20, linkHosts: ['replit.com'] }, allowedHosts: ['replit.com'], fetchIntervalMinutes: 360, compte: 'pyxo' },
  // Pinecone — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:pinecone-blog', kind: 'feed', name: 'Pinecone — flux officiel', config: { url: 'https://www.pinecone.io/rss/', maxItems: 20, linkHosts: ['www.pinecone.io'] }, allowedHosts: ['www.pinecone.io'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // BlenderNation : add-ons et actualité Blender — vérifié le 2026-11-10 : 10 entrées, dernière il y a 1 j
  { id: 'feed:blendernation', kind: 'feed', name: 'BlenderNation — contenu externe attribué', config: { url: 'https://feeds.feedburner.com/Blendernation', maxItems: 20, linkHosts: ['www.blendernation.com'] }, allowedHosts: ['feeds.feedburner.com', 'www.blendernation.com'], fetchIntervalMinutes: 360, attribution: 'BlenderNation (presse spécialisée)', compte: 'mova' },
  // Google Cloud Blog — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:gcloud-blog', kind: 'feed', name: 'Google Cloud Blog — flux officiel', config: { url: 'https://cloudblog.withgoogle.com/rss/', maxItems: 20, linkHosts: ['cloud.google.com'] }, allowedHosts: ['cloud.google.com', 'cloudblog.withgoogle.com'], fetchIntervalMinutes: 360, compte: 'pulse' },
  // Tom’s Hardware : puces, GPU — vérifié le 2026-11-10 : 20 entrées, dernière il y a 0 j
  { id: 'feed:tomshardware', kind: 'feed', name: 'Tom’s Hardware — contenu externe attribué', config: { url: 'https://www.tomshardware.com/feeds.xml', maxItems: 20, linkHosts: ['www.tomshardware.com'] }, allowedHosts: ['www.tomshardware.com'], fetchIntervalMinutes: 360, attribution: 'Tom’s Hardware', compte: 'radar' },
  // Smashing Magazine — vérifié le 2026-11-10 : 20 entrées, dernière il y a 4 j
  { id: 'feed:smashing', kind: 'feed', name: 'Smashing Magazine — contenu externe attribué', config: { url: 'https://www.smashingmagazine.com/feed/', maxItems: 20, linkHosts: ['smashingmagazine.com'] }, allowedHosts: ['smashingmagazine.com', 'www.smashingmagazine.com'], fetchIntervalMinutes: 360, attribution: 'Smashing Magazine', compte: 'mova' },
  // Stability AI : modèles image, vidéo, audio — vérifié le 2026-11-10 : 20 entrées, dernière il y a 77 j
  { id: 'feed:stability-news', kind: 'feed', name: 'Stability AI — flux officiel', config: { url: 'https://stability.ai/news-updates?format=rss', maxItems: 20, linkHosts: ['stability.ai'] }, allowedHosts: ['stability.ai'], fetchIntervalMinutes: 360, compte: 'mova' },
  // Show HN : projets présentés par leurs auteurs (au-delà de la page d'accueil), 30 points au moins — à vérifier à la première collecte en ligne
  { id: 'hackernews:show-hn-ia', kind: 'hackernews', name: 'Hacker News — Show HN récents sur l’IA (signal de découverte, API publique de recherche)', config: { url: 'https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=60', maxItems: 15, pointsMin: 30 }, allowedHosts: ['hn.algolia.com'], fetchIntervalMinutes: 60, attribution: 'un projet présenté par son auteur sur Hacker News (son dépôt ou son site fait foi)' },
  // Cybersécurité et cyberattaques (demande de l'utilisateur du 2026-11-12 : « ajoute des sources [qui] parle[nt] des
  // cyberattaques »). Chaque flux interrogé en réel le 2026-11-12 : réponse 200 sans redirection, lisible par notre
  // analyseur, robots.txt respecté (jokers compris). Pulse signe : incidents et exploitation. Tous sont des contenus
  // externes attribués : un avis d'éditeur de sécurité ou un article de presse n'est jamais une confirmation de la victime.
  // BleepingComputer — vérifié : 15 entrées, dernière il y a 0 j
  { id: 'feed:bleepingcomputer', kind: 'feed', name: 'BleepingComputer — contenu externe attribué', config: { url: 'https://www.bleepingcomputer.com/feed/', maxItems: 15, linkHosts: ['www.bleepingcomputer.com'] }, allowedHosts: ['www.bleepingcomputer.com'], fetchIntervalMinutes: 180, attribution: 'BleepingComputer', compte: 'pulse' },
  // The Hacker News (média de sécurité, sans lien avec Hacker News de Y Combinator) — vérifié : 50 entrées, dernière il y a 0 j
  { id: 'feed:thehackernews', kind: 'feed', name: 'The Hacker News (sécurité) — contenu externe attribué', config: { url: 'https://feeds.feedburner.com/TheHackersNews', maxItems: 15, linkHosts: ['thehackernews.com'] }, allowedHosts: ['feeds.feedburner.com', 'thehackernews.com'], fetchIntervalMinutes: 180, attribution: 'The Hacker News (média de cybersécurité)', compte: 'pulse' },
  // Krebs on Security — vérifié : 10 entrées, dernière il y a 1 j
  { id: 'feed:krebsonsecurity', kind: 'feed', name: 'Krebs on Security — contenu externe attribué', config: { url: 'https://krebsonsecurity.com/feed/', maxItems: 10, linkHosts: ['krebsonsecurity.com'] }, allowedHosts: ['krebsonsecurity.com'], fetchIntervalMinutes: 360, attribution: 'Brian Krebs (Krebs on Security)', compte: 'pulse' },
  // The Record (Recorded Future News) — vérifié : 5 entrées, dernière il y a 1 j ; robots.txt absent (404)
  { id: 'feed:therecord', kind: 'feed', name: 'The Record — contenu externe attribué', config: { url: 'https://therecord.media/feed', maxItems: 10, linkHosts: ['therecord.media'] }, allowedHosts: ['therecord.media'], fetchIntervalMinutes: 360, attribution: 'The Record (Recorded Future News)', compte: 'pulse' },
  // SecurityWeek — vérifié : 10 entrées, dernière il y a 0 j
  { id: 'feed:securityweek', kind: 'feed', name: 'SecurityWeek — contenu externe attribué', config: { url: 'https://www.securityweek.com/feed/', maxItems: 10, linkHosts: ['www.securityweek.com'] }, allowedHosts: ['www.securityweek.com'], fetchIntervalMinutes: 360, attribution: 'SecurityWeek', compte: 'pulse' },
  // Dark Reading — vérifié : 50 entrées, dernière il y a 0 j
  { id: 'feed:darkreading', kind: 'feed', name: 'Dark Reading — contenu externe attribué', config: { url: 'https://www.darkreading.com/rss.xml', maxItems: 15, linkHosts: ['www.darkreading.com'] }, allowedHosts: ['www.darkreading.com'], fetchIntervalMinutes: 360, attribution: 'Dark Reading', compte: 'pulse' },
  // CISA, avis de cybersécurité (agence américaine) — vérifié : 30 entrées, dernière il y a 2 j
  { id: 'feed:cisa-avis', kind: 'feed', name: 'CISA — avis de cybersécurité, contenu externe attribué', config: { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', maxItems: 15, linkHosts: ['www.cisa.gov'] }, allowedHosts: ['www.cisa.gov'], fetchIntervalMinutes: 360, attribution: 'la CISA (agence américaine de cybersécurité)', compte: 'pulse' },
  // Unit 42 (Palo Alto Networks) — vérifié : 15 entrées, dernière il y a 1 j
  { id: 'feed:unit42', kind: 'feed', name: 'Unit 42 (Palo Alto Networks) — contenu externe attribué', config: { url: 'https://unit42.paloaltonetworks.com/feed/', maxItems: 10, linkHosts: ['unit42.paloaltonetworks.com'] }, allowedHosts: ['unit42.paloaltonetworks.com'], fetchIntervalMinutes: 360, attribution: 'Unit 42 (Palo Alto Networks)', compte: 'pulse' },
  // Socket : attaques de la chaîne d'approvisionnement (paquets npm et PyPI piégés) — vérifié : 10 entrées, dernière il y a 3 j
  { id: 'feed:socket-blog', kind: 'feed', name: 'Socket — blog de recherche, contenu externe attribué', config: { url: 'https://socket.dev/api/blog/feed.atom', maxItems: 10, linkHosts: ['socket.dev'] }, allowedHosts: ['socket.dev'], fetchIntervalMinutes: 360, attribution: 'Socket (éditeur de sécurité)', compte: 'pulse' },
  // Wiz : vulnérabilités du cloud et de l'IA — vérifié : 50 entrées, dernière il y a 1 j
  { id: 'feed:wiz-blog', kind: 'feed', name: 'Wiz — blog, contenu externe attribué', config: { url: 'https://www.wiz.io/feed/rss.xml', maxItems: 10, linkHosts: ['www.wiz.io'] }, allowedHosts: ['www.wiz.io'], fetchIntervalMinutes: 360, attribution: 'Wiz (éditeur de sécurité)', compte: 'pulse' },
  // Google Project Zero — vérifié : 10 entrées, dernière il y a 16 j ; robots.txt absent (404)
  { id: 'feed:project-zero', kind: 'feed', name: 'Google Project Zero — contenu externe attribué', config: { url: 'https://projectzero.google/feed.xml', maxItems: 10, linkHosts: ['projectzero.google'] }, allowedHosts: ['projectzero.google'], fetchIntervalMinutes: 720, attribution: 'Google Project Zero', compte: 'pulse' },
  // Histoires récentes à 80 points, hors page d'accueil — à vérifier à la première collecte en ligne
  { id: 'hackernews:recentes-ia', kind: 'hackernews', name: 'Hacker News — histoires récentes sur l’IA, 80 points (signal de découverte, API publique de recherche)', config: { url: 'https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E80&hitsPerPage=60', maxItems: 15, pointsMin: 80 }, allowedHosts: ['hn.algolia.com'], fetchIntervalMinutes: 60, attribution: 'un article externe signalé sur Hacker News (son site d’origine fait foi, pas une annonce officielle)' },
];
