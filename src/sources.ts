// Sources configurées dans le code (versionnées avec lui) et synchronisées vers la base.
import { sql } from 'drizzle-orm';
import type { FeedConfig } from './collect/feeds.ts';
import type { GithubReleasesConfig } from './collect/github-releases.ts';
import type { HuggingFaceModelsConfig } from './collect/huggingface.ts';
import type { Database } from './db/client.ts';
import { withBusyRetry } from './db/retry.ts';
import { sources } from './db/schema.ts';

/** Produit déclaré par une source : sa clé canonique est son identité stable. */
export interface ProductRef {
  key: string;
  name: string;
  publisher: string;
  category: string | null;
  repositoryUrl: string | null;
}

interface BaseSource {
  id: string;
  name: string;
  /**
   * Agent qui signe tout ce que publie cette source, quel que soit le compte proposé par le modèle : Radar pour les
   * grandes entreprises (décision de l'utilisateur du 2026-11-05), Nodi pour les vidéos d'AI Search.
   */
  compte?: 'nodi' | 'repo' | 'pyxo' | 'mova' | 'pulse' | 'radar';
  allowedHosts: string[];
  fetchIntervalMinutes: number | null;
  /** Taille maximale de la réponse pour cette source ; la valeur générale (CURATION_MAX_RESPONSE_BYTES) sinon. */
  maxResponseBytes?: number;
}

export interface GithubReleasesSource extends BaseSource {
  kind: 'github_releases';
  config: GithubReleasesConfig;
  product: ProductRef;
}

export interface FeedSource extends BaseSource {
  kind: 'feed';
  config: FeedConfig;
  /**
   * Source externe (chaîne d'un créateur, pas un éditeur) : nom auquel la rédaction attribue chaque affirmation.
   * Absent pour un flux officiel.
   */
  attribution?: string;
}

/** Modèles en tendance sur Hugging Face (API publique, P6 bloc 3) : porte d'entrée vers Nodi, page du modèle capturée ensuite. */
export interface HuggingFaceModelsSource extends BaseSource {
  kind: 'huggingface_models';
  config: HuggingFaceModelsConfig;
}

export type SourceDefinition = GithubReleasesSource | FeedSource | HuggingFaceModelsSource;

const githubReleases = (
  owner: string,
  repo: string,
  perPage: number,
  product: Omit<ProductRef, 'repositoryUrl'>,
  extra: Partial<Pick<GithubReleasesSource, 'maxResponseBytes' | 'compte'>> = {},
): GithubReleasesSource => ({
  id: `github-releases:${owner}/${repo}`,
  kind: 'github_releases',
  name: `${product.name} — releases GitHub officielles`,
  config: { owner, repo, perPage },
  product: { ...product, repositoryUrl: `https://github.com/${owner}/${repo}` },
  allowedHosts: ['api.github.com'],
  fetchIntervalMinutes: 360,
  ...extra,
});

const flux = (id: string, name: string, url: string, host: string): FeedSource => ({
  id: `feed:${id}`,
  kind: 'feed',
  name,
  config: { url, maxItems: 20, linkHosts: [host] },
  allowedHosts: [host],
  fetchIntervalMinutes: 360,
});

export const SOURCES: SourceDefinition[] = [
  githubReleases('anthropics', 'claude-code', 10, {
    key: 'anthropic/claude-code',
    name: 'Claude Code',
    publisher: 'Anthropic',
    category: 'assistant de code',
  }),
  // Codex CLI joint environ 350 fichiers à chaque release : 10 releases pèsent environ 6,8 Mo (mesuré le 2026-10-30),
  // d'où une limite propre à cette source (12 Mio) au lieu de remonter plus loin.
  githubReleases(
    'openai',
    'codex',
    10,
    { key: 'openai/codex', name: 'Codex CLI', publisher: 'OpenAI', category: 'assistant de code' },
    { maxResponseBytes: 12 * 1024 * 1024 },
  ),
  // Dépôt qui publie surtout des préversions (une « nightly » presque chaque jour) : on remonte plus loin pour retrouver les versions stables.
  githubReleases('google-gemini', 'gemini-cli', 20, {
    key: 'google/gemini-cli',
    name: 'Gemini CLI',
    publisher: 'Google',
    category: 'assistant de code',
  }),
  {
    id: 'feed:openai-news',
    kind: 'feed',
    name: 'OpenAI News — flux RSS officiel',
    config: { url: 'https://openai.com/news/rss.xml', maxItems: 20, linkHosts: ['openai.com'] },
    allowedHosts: ['openai.com'],
    fetchIntervalMinutes: 360,
  },
  {
    id: 'feed:google-gemini',
    kind: 'feed',
    name: 'Google The Keyword, Gemini — flux RSS officiel',
    config: { url: 'https://blog.google/products-and-platforms/products/gemini/rss/', maxItems: 20, linkHosts: ['blog.google'] },
    allowedHosts: ['blog.google'],
    fetchIntervalMinutes: 360,
  },
  {
    id: 'feed:github-changelog',
    kind: 'feed',
    name: 'GitHub Changelog — flux RSS officiel',
    config: { url: 'https://github.blog/changelog/feed/', maxItems: 20, linkHosts: ['github.blog'] },
    allowedHosts: ['github.blog'],
    // Le flux ne garde que ses 10 dernières entrées (9 publiées en 25 minutes le 2026-10-28) : intervalle visé d'une heure,
    // appliqué par la planification (P5) ; d'ici là, le signal « trou possible » de l'exécution est la seule protection.
    fetchIntervalMinutes: 60,
  },
  // Élargissement du 2026-10-30 : flux officiels contre-vérifiés, voir docs/sources.md §3.10.
  // Demande de l'utilisateur du 2026-11-04 : la chaîne YouTube AI Search devient une source de rédaction au même niveau
  // que les releases GitHub (un sujet par vidéo). Contenu externe : chaque post l'attribue à la chaîne, jamais comme
  // annonce officielle. Flux Atom public de la chaîne (200 le 2026-11-04 ; 404 le 2026-11-03), 15 dernières vidéos.
  {
    id: 'feed:youtube-ai-search',
    kind: 'feed',
    name: 'AI Search (YouTube, @theAIsearch) — vidéos de la chaîne, contenu externe attribué',
    config: { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIgnGlGkVRhd4qNFcEwLL4A', maxItems: 15, linkHosts: ['www.youtube.com'] },
    allowedHosts: ['www.youtube.com'],
    fetchIntervalMinutes: 60,
    attribution: 'AI Search (YouTube)',
    compte: 'nodi',
  },
  // Grandes entreprises, signées par Radar (décision de l'utilisateur du 2026-11-05 : NVIDIA, Microsoft, Apple, Amazon et
  // Tesla obligatoires, liste ouverte). Flux officiels vérifiés le 2026-11-05 (200, 4 à 20 entrées). Tesla : aucun flux
  // public et site refusé (403) le 2026-11-05 : différé, non contourné. Microsoft : blogs.microsoft.com refuse (403),
  // « Source », le site d'actualités officiel, répond.
  { ...flux('nvidia-newsroom', 'NVIDIA Newsroom — flux RSS officiel', 'https://nvidianews.nvidia.com/releases.xml', 'nvidianews.nvidia.com'), compte: 'radar' },
  { ...flux('nvidia-blog', 'NVIDIA Blog — flux RSS officiel', 'https://blogs.nvidia.com/feed/', 'blogs.nvidia.com'), compte: 'radar' },
  { ...flux('microsoft-source', 'Microsoft Source — flux RSS officiel', 'https://news.microsoft.com/source/feed/', 'news.microsoft.com'), compte: 'radar' },
  { ...flux('apple-newsroom', 'Apple Newsroom — flux RSS officiel', 'https://www.apple.com/newsroom/rss-feed.rss', 'www.apple.com'), compte: 'radar' },
  { ...flux('amazon-news', 'About Amazon — flux RSS officiel', 'https://www.aboutamazon.com/rss/feed.rss', 'www.aboutamazon.com'), compte: 'radar' },
  { ...flux('amd-press', 'AMD, communiqués — flux RSS officiel', 'https://ir.amd.com/news-events/press-releases/rss', 'ir.amd.com'), compte: 'radar' },
  { ...flux('meta-newsroom', 'Meta Newsroom — flux RSS officiel', 'https://about.fb.com/feed/', 'about.fb.com'), compte: 'radar' },
  // Liste élargie par l'utilisateur le 2026-11-05 (Google, Intel, Samsung, Shopify, LG, TSMC, Qualcomm, Broadcom, Oracle,
  // Tesla, Meta et le métavers). Flux vérifiés le même jour : Google, Samsung et Intel (communiqués) répondent ; Shopify
  // publie ses communiqués par Newsfile, son diffuseur, faute de flux sur shopify.com. Différés, non contournés : TSMC,
  // Qualcomm, Broadcom, Oracle et Tesla (403 ou aucun flux public) ; LG, dont le flux renvoie vers un site sans rapport.
  // Pour les entreprises sans flux officiel lisible, demande de l'utilisateur du 2026-11-05 (« les sections tech des
  // journaux ») : les rubriques par entreprise de TechCrunch et de The Verge, vérifiées le même jour (200, 10 à 20
  // articles chacune). Ce sont des articles de presse : contenu externe attribué au journal, jamais présenté comme
  // une annonce officielle. Les chaînes YouTube officielles ont été trouvées, mais leurs flux répondaient 404 ce jour-là.
  ...([
    ['tesla', 'Tesla'], ['tsmc', 'TSMC'], ['qualcomm', 'Qualcomm'], ['broadcom', 'Broadcom'], ['oracle', 'Oracle'], ['lg', 'LG'],
  ] as const).map(([tag, nom]): FeedSource => ({
    ...flux(`techcrunch-${tag}`, `TechCrunch, rubrique ${nom} — article de presse, contenu externe attribué`, `https://techcrunch.com/tag/${tag}/feed/`, 'techcrunch.com'),
    fetchIntervalMinutes: 120, attribution: `TechCrunch (rubrique ${nom})`, compte: 'radar',
  })),
  ...([['tesla', 'Tesla'], ['lg', 'LG']] as const).map(([tag, nom]): FeedSource => ({
    ...flux(`verge-${tag}`, `The Verge, rubrique ${nom} — article de presse, contenu externe attribué`, `https://www.theverge.com/rss/${tag}/index.xml`, 'www.theverge.com'),
    fetchIntervalMinutes: 120, attribution: `The Verge (rubrique ${nom})`, compte: 'radar',
  })),
  { ...flux('google-blog', 'Google Blog — flux RSS officiel', 'https://blog.google/rss/', 'blog.google'), compte: 'radar' },
  { ...flux('samsung-newsroom', 'Samsung Global Newsroom — flux RSS officiel', 'https://news.samsung.com/global/feed', 'news.samsung.com'), compte: 'radar' },
  { ...flux('intel-press', 'Intel, communiqués — flux RSS officiel', 'https://www.intc.com/news-events/press-releases/rss', 'www.intc.com'), compte: 'radar' },
  // Les entrées du flux Newsfile pointent vers www.newsfilecorp.com : les deux hôtes sont autorisés.
  (() => { const f = flux('shopify-press', 'Shopify, communiqués (Newsfile) — flux RSS officiel', 'https://feeds.newsfilecorp.com/company/4130', 'feeds.newsfilecorp.com');
    return { ...f, allowedHosts: [...f.allowedHosts, 'www.newsfilecorp.com'], config: { ...f.config, linkHosts: ['www.newsfilecorp.com'] }, compte: 'radar' as const }; })(),
  // Pulse (demande de l'utilisateur du 2026-11-05, « ajoute des posts pour Pulse ») : exploitation, fiabilité,
  // performances et données des services d'IA. Flux relevés le 2026-11-05 (200, entrées du jour ou de la veille).
  { ...flux('cloudflare-blog', 'Cloudflare Blog — flux RSS officiel', 'https://blog.cloudflare.com/rss/', 'blog.cloudflare.com'), compte: 'pulse' },
  { ...flux('databricks-blog', 'Databricks Blog — flux officiel', 'https://www.databricks.com/feed', 'www.databricks.com'), compte: 'pulse' },
  { ...flux('aws-ml-blog', 'AWS Machine Learning Blog — flux RSS officiel', 'https://aws.amazon.com/blogs/machine-learning/feed/', 'aws.amazon.com'), compte: 'pulse' },
  { ...flux('github-engineering', 'GitHub Blog, Engineering — flux RSS officiel', 'https://github.blog/engineering/feed/', 'github.blog'), compte: 'pulse' },
  // Pages d'état officielles : incidents et maintenances des API d'IA (incident daté, attribué à l'éditeur).
  { ...flux('claude-status', 'Claude Status — historique des incidents, flux RSS officiel', 'https://status.claude.com/history.rss', 'status.claude.com'), fetchIntervalMinutes: 60, compte: 'pulse' },
  { ...flux('openai-status', 'OpenAI Status — historique des incidents, flux RSS officiel', 'https://status.openai.com/history.rss', 'status.openai.com'), fetchIntervalMinutes: 60, compte: 'pulse' },
  // Radar et Pulse élargis (demande de l'utilisateur du 2026-11-05, « augmente les posts de Radar et Pulse ») ; chaque
  // flux relevé le 2026-11-05 (200, entrées datées de la semaine). Écartés le même jour, avec leur motif : blog IA de
  // Microsoft (410), Microsoft Research (403), Snowflake (page d'erreur, 403), Uber Engineering (406), LinkedIn
  // Engineering (aucune entrée ; collecte interdite par ses conditions), SEC EDGAR (403 : la SEC exige que chaque client
  // se déclare avec une adresse de contact ; décision de l'utilisateur), Hacker News (liens vers n'importe quel site,
  // incompatible avec la liste blanche par source : signal à reprendre dans le score de découverte), Kafka et Flink sur
  // GitHub (aucune release publiée : Flink suivi par PyPI), et les flux hébergés par Medium (Snowflake Builders,
  // Netflix Tech Blog, Airbnb Engineering) : 500 pour notre client déclaré, 200 seulement pour un navigateur ; non
  // contourné, différé.
  { ...flux('nvidia-developer', 'NVIDIA Developer Blog — flux RSS officiel', 'https://developer.nvidia.com/blog/feed', 'developer.nvidia.com'), compte: 'radar' },
  { ...flux('aws-whats-new', "AWS What's New — flux RSS officiel", 'https://aws.amazon.com/about-aws/whats-new/recent/feed/', 'aws.amazon.com'), compte: 'radar' },
  { ...flux('apple-ml-research', 'Apple Machine Learning Research — flux RSS officiel', 'https://machinelearning.apple.com/rss.xml', 'machinelearning.apple.com'), compte: 'radar' },
  { ...flux('confluent-blog', 'Confluent Blog — flux RSS officiel', 'https://www.confluent.io/rss.xml', 'www.confluent.io'), compte: 'pulse' },
  ...([['pyspark', 'PySpark (Apache Spark)'], ['dbt-core', 'dbt Core'], ['polars', 'Polars'], ['duckdb', 'DuckDB'], ['apache-flink', 'PyFlink (Apache Flink)']] as const).map(([paquet, nom]): FeedSource => ({
    ...flux(`pypi-${paquet}`, `${nom} — versions publiées sur PyPI, flux RSS officiel`, `https://pypi.org/rss/project/${paquet}/releases.xml`, 'pypi.org'),
    compte: 'pulse',
  })),
  githubReleases('apache', 'airflow', 10, { key: 'apache/airflow', name: 'Apache Airflow', publisher: 'Apache Software Foundation', category: 'pipelines de données' }, { compte: 'pulse' }),
  githubReleases('apache', 'iceberg', 10, { key: 'apache/iceberg', name: 'Apache Iceberg', publisher: 'Apache Software Foundation', category: 'pipelines de données' }, { compte: 'pulse' }),
  githubReleases('mlflow', 'mlflow', 10, { key: 'mlflow/mlflow', name: 'MLflow', publisher: 'MLflow', category: 'MLOps' }, { compte: 'pulse' }),
  // Hugging Face (P6, bloc 3 ; accord de l'utilisateur du 2026-11-05) : les 20 modèles en tendance, signés par Nodi.
  // API publique relevée le 2026-11-05 (200). Les modèles trop anciens sont écartés par l'âge maximal de l'analyse.
  {
    id: 'huggingface:modeles-tendance',
    kind: 'huggingface_models',
    name: 'Hugging Face — modèles en tendance (API publique)',
    config: { url: 'https://huggingface.co/api/models?sort=trendingScore&limit=20', maxItems: 20 },
    allowedHosts: ['huggingface.co'],
    fetchIntervalMinutes: 360,
    compte: 'nodi',
  },
  flux('mistral', 'Mistral AI — flux RSS officiel', 'https://mistral.ai/news/rss', 'mistral.ai'),
  flux('huggingface-blog', 'Hugging Face Blog — flux RSS officiel', 'https://huggingface.co/blog/feed.xml', 'huggingface.co'),
  flux('elevenlabs', 'ElevenLabs Blog — flux RSS officiel', 'https://elevenlabs.io/blog/rss.xml', 'elevenlabs.io'),
  flux('suno-release-notes', 'Suno, notes de version — flux RSS officiel', 'https://suno.com/release-notes/rss.xml', 'suno.com'),
  flux('midjourney', 'Midjourney Updates — flux RSS officiel', 'https://updates.midjourney.com/rss/', 'updates.midjourney.com'),
  flux('cursor', 'Cursor Changelog — flux RSS officiel', 'https://cursor.com/changelog/rss.xml', 'cursor.com'),
  // Le flux est servi par notion.com, ses liens pointent vers notion.so.
  { ...flux('notion', "Notion What's New — flux RSS officiel", 'https://www.notion.com/releases/rss.xml', 'www.notion.so'), allowedHosts: ['www.notion.com'] },
  flux('gemini-notebook', 'Gemini Notebook — flux RSS officiel', 'https://blog.google/innovation-and-ai/products/gemini-notebook/rss/', 'blog.google'),
  flux('higgsfield', 'Higgsfield Blog — flux RSS officiel', 'https://higgsfield.ai/blog/rss.xml', 'higgsfield.ai'),
  flux('comfy', 'Blog Comfy — flux RSS officiel', 'https://blog.comfy.org/feed', 'blog.comfy.org'),
  flux('blender', 'Blender — flux RSS officiel', 'https://www.blender.org/feed/', 'www.blender.org'),
  flux('figma-release-notes', 'Figma, notes de version — flux Atom officiel', 'https://www.figma.com/release-notes/feed/atom.xml', 'www.figma.com'),
  flux('spline', 'Spline Changelog — flux RSS officiel', 'https://spline.design/changelog/rss.xml', 'spline.design'),
  flux('sketch', 'Sketch Changelog — flux Atom officiel', 'https://www.sketch.com/changelog/feed.xml', 'www.sketch.com'),
  flux('n8n', 'Blog n8n — flux RSS officiel', 'https://blog.n8n.io/rss/', 'blog.n8n.io'),
  flux('vapi', "Vapi, What's New — flux RSS officiel", 'https://docs.vapi.ai/whats-new.rss', 'docs.vapi.ai'),
  flux('mcp-blog', 'Blog MCP — flux RSS officiel', 'https://blog.modelcontextprotocol.io/index.xml', 'blog.modelcontextprotocol.io'),
  flux('siggraph', 'SIGGRAPH Blog — flux RSS officiel', 'https://blog.siggraph.org/feed/', 'blog.siggraph.org'),
];

/** Restreint les sources à une liste d'identifiants (variable CURATION_ONLY_SOURCES) ; toutes sinon. */
export function selectSources(onlyIds: string[] | null, definitions: SourceDefinition[] = SOURCES): SourceDefinition[] {
  if (!onlyIds || onlyIds.length === 0) return definitions;
  const unknown = onlyIds.filter((id) => !definitions.some((def) => def.id === id));
  if (unknown.length > 0) throw new Error(`Source(s) inconnue(s) : ${unknown.join(', ')}`);
  return definitions.filter((def) => onlyIds.includes(def.id));
}

export async function syncSources(database: Database, definitions: SourceDefinition[], now: string): Promise<void> {
  await withBusyRetry(database.client, async () => {
    for (const def of definitions) {
      const config = def.kind === 'github_releases' ? { ...def.config, product: def.product } : { ...def.config };
      await database.db
        .insert(sources)
        .values({
          id: def.id,
          kind: def.kind,
          name: def.name,
          config,
          allowedHosts: def.allowedHosts,
          fetchIntervalMinutes: def.fetchIntervalMinutes,
          active: true,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: sources.id,
          set: {
            kind: def.kind,
            name: def.name,
            config: sql`excluded.config`,
            allowedHosts: sql`excluded.allowed_hosts`,
            fetchIntervalMinutes: def.fetchIntervalMinutes,
          },
        });
    }
  });
}

export function findDefinition(id: string, definitions: SourceDefinition[] = SOURCES): SourceDefinition | undefined {
  return definitions.find((def) => def.id === id);
}
