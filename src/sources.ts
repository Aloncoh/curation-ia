// Sources configurées dans le code (versionnées avec lui) et synchronisées vers la base.
import { sql } from 'drizzle-orm';
import type { FeedConfig } from './collect/feeds.ts';
import type { GithubReleasesConfig } from './collect/github-releases.ts';
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
}

export type SourceDefinition = GithubReleasesSource | FeedSource;

const githubReleases = (
  owner: string,
  repo: string,
  perPage: number,
  product: Omit<ProductRef, 'repositoryUrl'>,
  extra: Partial<Pick<GithubReleasesSource, 'maxResponseBytes'>> = {},
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
