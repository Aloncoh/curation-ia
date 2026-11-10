// Sources configurées dans le code (versionnées avec lui) et synchronisées vers la base.
import { sql } from 'drizzle-orm';
import type { FeedConfig } from './collect/feeds.ts';
import type { GithubReleasesConfig } from './collect/github-releases.ts';
import type { EtatAcces } from './collect/acces.ts';
import type { HackerNewsConfig } from './collect/hackernews.ts';
import type { HuggingFaceModelsConfig } from './collect/huggingface.ts';
import type { Database } from './db/client.ts';
import { withBusyRetry } from './db/retry.ts';
import { sources } from './db/schema.ts';
import { sourcesElargies } from './sources-elargies.ts';

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
  /**
   * Source gardée au registre mais non collectée (2026-11-05 : on ne supprime pas une source, on la diffère), avec l'état
   * constaté, le motif, la date et, s'il existe, le canal de remplacement. `restriction_contractuelle` seulement après
   * lecture des conditions d'utilisation.
   */
  differee?: { etat: EtatAcces; motif: string; depuis: string; alternative?: string };
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
  /** Client déclaré propre à la source (EDGAR exige un nom et une adresse de contact) ; le client général sinon. */
  userAgent?: string;
}

/** Modèles en tendance sur Hugging Face (API publique, P6 bloc 3) : porte d'entrée vers Nodi, page du modèle capturée ensuite. */
export interface HuggingFaceModelsSource extends BaseSource {
  kind: 'huggingface_models';
  config: HuggingFaceModelsConfig;
}

/** Hacker News (2026-11-05) : signal de découverte ; l'article lié est récupéré à part, destination validée (article-externe.ts). */
export interface HackerNewsSource extends BaseSource {
  kind: 'hackernews';
  config: HackerNewsConfig;
  /** Nom auquel la rédaction attribue chaque affirmation : l'article est un contenu externe, pas une annonce officielle. */
  attribution: string;
}

export type SourceDefinition = GithubReleasesSource | FeedSource | HuggingFaceModelsSource | HackerNewsSource;

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
  // GitHub (aucune release publiée : Flink suivi par PyPI). Les flux hébergés par Medium sont gardés au registre, différés.
  ...([
    ['snowflake-builders', 'Snowflake Builders Blog (publication Medium officielle) — flux RSS', 'https://medium.com/feed/snowflake', 'medium.com'],
    ['netflix-tech', 'Netflix Tech Blog — flux RSS officiel (hébergé par Medium)', 'https://netflixtechblog.com/feed', 'netflixtechblog.com'],
    ['airbnb-engineering', 'Airbnb Engineering (publication Medium officielle) — flux RSS', 'https://medium.com/feed/airbnb-engineering', 'medium.com'],
  ] as const).map(([id, nom, url, hote]): FeedSource => ({
    ...flux(id, nom, url, hote),
    compte: 'pulse',
    differee: { etat: 'refus_acces', motif: 'HTTP 500 pour notre client déclaré, 200 pour un navigateur (relevé le 2026-11-05) : refus observé, non contourné', depuis: '2026-11-05' },
  })),
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
  // Canaux de remplacement trouvés le 2026-11-05 (demande de l'utilisateur : chercher une adresse officielle, une API ou un
  // autre canal autorisé, sans contourner) : le blog IA de Microsoft a disparu (410) ; le blog principal et le blog
  // Azure répondent (200). Tesla : flux officiel des communiqués aux investisseurs, 503 ce jour-là (erreur temporaire,
  // reprise espacée par le registre d'accès).
  { ...flux('microsoft-blog', 'Official Microsoft Blog — flux RSS officiel', 'https://blogs.microsoft.com/feed/', 'blogs.microsoft.com'), compte: 'radar' },
  { ...flux('azure-blog', 'Microsoft Azure Blog — flux RSS officiel', 'https://azure.microsoft.com/en-us/blog/feed/', 'azure.microsoft.com'), compte: 'radar' },
  { ...flux('tesla-ir', 'Tesla, communiqués aux investisseurs — flux RSS officiel', 'https://ir.tesla.com/rss/news-releases.xml', 'ir.tesla.com'), compte: 'radar' },
  // SEC EDGAR (demande de l'utilisateur du 2026-11-05) : rapports 8-K des grandes entreprises, flux Atom officiels. La SEC
  // exige un client déclaré avec une adresse de contact (403 sans elle) : variable CURATION_CONTACT_SEC, fournie par
  // l'utilisateur ; sans elle, les sources restent différées. Les 12 numéros CIK ont été confirmés sur sec.gov le
  // 2026-11-05 (nom de l'entreprise dans le flux).
  ...([
    ['nvidia', 'NVIDIA', '0001045810'], ['microsoft', 'Microsoft', '0000789019'], ['apple', 'Apple', '0000320193'], ['alphabet', 'Alphabet', '0001652044'],
    ['amazon', 'Amazon', '0001018724'], ['meta', 'Meta', '0001326801'], ['amd', 'AMD', '0000002488'], ['intel', 'Intel', '0000050863'],
    ['tesla', 'Tesla', '0001318605'], ['oracle', 'Oracle', '0001341439'], ['qualcomm', 'Qualcomm', '0000804328'], ['broadcom', 'Broadcom', '0001730168'],
  ] as const).map(([id, nom, cik]): FeedSource => {
    const contact = process.env.CURATION_CONTACT_SEC?.trim();
    return {
      ...flux(`sec-${id}`, `SEC EDGAR, rapports 8-K de ${nom} — flux Atom officiel`, `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K&dateb=&owner=include&count=20&output=atom`, 'www.sec.gov'),
      compte: 'radar',
      fetchIntervalMinutes: 360,
      ...(contact
        ? { userAgent: `CURATION-AI ${contact}` }
        : { differee: { etat: 'refus_acces' as const, motif: 'La SEC exige un client déclaré avec une adresse de contact (403 sans elle) : CURATION_CONTACT_SEC absente', depuis: '2026-11-05' } }),
    };
  }),
  // Gardées au registre, non collectées (relevés du 2026-11-05) : état observé, motif et canal de remplacement.
  ...([
    ['microsoft-ai-blog', 'Microsoft AI Blog', 'https://blogs.microsoft.com/ai/feed/', 'blogs.microsoft.com', 'page_supprimee', 'HTTP 410 : flux supprimé par l’éditeur', 'feed:microsoft-blog, feed:microsoft-source'],
    ['microsoft-research', 'Microsoft Research', 'https://www.microsoft.com/en-us/research/feed/', 'www.microsoft.com', 'refus_acces', 'HTTP 403 pour notre client déclaré', 'feed:microsoft-blog'],
    ['tsmc-pr', 'TSMC, communiqués', 'https://pr.tsmc.com/english/rss', 'pr.tsmc.com', 'refus_acces', 'HTTP 403 pour notre client déclaré', 'feed:techcrunch-tsmc (presse attribuée)'],
    ['qualcomm-ir', 'Qualcomm, communiqués aux investisseurs', 'https://investor.qualcomm.com/rss/news-releases.xml', 'investor.qualcomm.com', 'refus_acces', 'HTTP 403 pour notre client déclaré', 'feed:techcrunch-qualcomm (presse attribuée) ; EDGAR 8-K'],
    ['broadcom-ir', 'Broadcom, communiqués aux investisseurs', 'https://investors.broadcom.com/rss/news-releases.xml', 'investors.broadcom.com', 'refus_acces', 'HTTP 403 pour notre client déclaré', 'feed:techcrunch-broadcom (presse attribuée) ; EDGAR 8-K'],
    ['oracle-ai-blog', 'Oracle, blog IA et science des données', 'https://blogs.oracle.com/ai-and-datascience/rss', 'blogs.oracle.com', 'refus_acces', 'HTTP 403 pour notre client déclaré', 'feed:techcrunch-oracle (presse attribuée) ; EDGAR 8-K'],
    ['lg-newsroom', 'LG Newsroom', 'https://lgnewsroom.com/feed/', 'lgnewsroom.com', 'absence_de_flux', 'HTTP 200 mais aucune entrée (www.lgnewsroom.com redirige ici)', 'feed:verge-lg, feed:techcrunch-lg (presse attribuée)'],
    ['uber-engineering', 'Uber Engineering', 'https://www.uber.com/blog/engineering/rss/', 'www.uber.com', 'page_supprimee', 'HTTP 404 (406 la veille)', 'aucun trouvé'],
    ['snowflake-blog', 'Snowflake Blog', 'https://www.snowflake.com/en/blog/rss.xml', 'www.snowflake.com', 'page_supprimee', 'redirection vers une page 404 ; /feed/ répond 403', 'feed:snowflake-builders (différé lui aussi)'],
    ['linkedin-engineering', 'LinkedIn Engineering', 'https://www.linkedin.com/blog/engineering/feed', 'www.linkedin.com', 'absence_de_flux', 'HTTP 200 sans aucune entrée ; conditions d’utilisation non lues automatiquement (page rendue côté client)', 'posts transmis à la main par l’utilisateur'],
  ] as const).map(([id, nom, url, hote, etat, motif, alternative]): FeedSource => ({
    ...flux(id, `${nom} — gardé au registre, non collecté`, url, hote),
    differee: { etat, motif, depuis: '2026-11-05', alternative },
  })),
  // Hacker News (demande de l'utilisateur du 2026-11-05) : histoires de la page d'accueil qui parlent d'IA, à 100 points
  // au moins, lues par l'API de recherche publique (200 le 2026-11-05). Pas de compte imposé : le modèle choisit selon le
  // sujet de l'article. L'article lié est capturé à part (approfondissement), jamais deviné.
  {
    id: 'hackernews:accueil-ia',
    kind: 'hackernews',
    name: 'Hacker News — page d’accueil, histoires sur l’IA (signal de découverte, API publique de recherche)',
    config: { url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=60', maxItems: 15, pointsMin: 100 },
    allowedHosts: ['hn.algolia.com'],
    fetchIntervalMinutes: 60,
    attribution: 'un article externe signalé sur Hacker News (son site d’origine fait foi, pas une annonce officielle)',
  },
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
  // Élargissement du 2026-11-10 (six agents, flux vérifiés en réel) : src/sources-elargies.ts.
  ...sourcesElargies(githubReleases),
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
      // Une source différée reste au registre, inactive, avec son état et son motif ; elle n'est jamais supprimée.
      const differee = def.differee ? { active: false, accesEtat: def.differee.etat, accesDetail: def.differee.motif } : { active: true };
      await database.db
        .insert(sources)
        .values({
          id: def.id,
          kind: def.kind,
          name: def.name,
          config,
          allowedHosts: def.allowedHosts,
          fetchIntervalMinutes: def.fetchIntervalMinutes,
          ...differee,
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
            ...differee,
          },
        });
    }
  });
}

export function findDefinition(id: string, definitions: SourceDefinition[] = SOURCES): SourceDefinition | undefined {
  return definitions.find((def) => def.id === id);
}
