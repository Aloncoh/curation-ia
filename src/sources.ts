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

const githubReleases = (owner: string, repo: string, perPage: number, product: Omit<ProductRef, 'repositoryUrl'>): GithubReleasesSource => ({
  id: `github-releases:${owner}/${repo}`,
  kind: 'github_releases',
  name: `${product.name} — releases GitHub officielles`,
  config: { owner, repo, perPage },
  product: { ...product, repositoryUrl: `https://github.com/${owner}/${repo}` },
  allowedHosts: ['api.github.com'],
  fetchIntervalMinutes: 360,
});

export const SOURCES: SourceDefinition[] = [
  githubReleases('anthropics', 'claude-code', 10, {
    key: 'anthropic/claude-code',
    name: 'Claude Code',
    publisher: 'Anthropic',
    category: 'assistant de code',
  }),
  // Dépôts qui publient surtout des préversions : on remonte plus loin pour retrouver les versions stables.
  githubReleases('openai', 'codex', 20, { key: 'openai/codex', name: 'Codex CLI', publisher: 'OpenAI', category: 'assistant de code' }),
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
    config: { url: 'https://openai.com/news/rss.xml', maxItems: 20 },
    allowedHosts: ['openai.com'],
    fetchIntervalMinutes: 360,
  },
  {
    id: 'feed:github-changelog',
    kind: 'feed',
    name: 'GitHub Changelog — flux RSS officiel',
    config: { url: 'https://github.blog/changelog/feed/', maxItems: 20 },
    allowedHosts: ['github.blog'],
    fetchIntervalMinutes: 360,
  },
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
