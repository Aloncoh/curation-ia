// Sources configurées dans le code (versionnées avec lui) et synchronisées vers la base.
import { sql } from 'drizzle-orm';
import type { GithubReleasesConfig } from './collect/github-releases.ts';
import type { Database } from './db/client.ts';
import { withBusyRetry } from './db/retry.ts';
import { sources } from './db/schema.ts';

export interface SourceDefinition {
  id: string;
  kind: 'github_releases';
  name: string;
  config: GithubReleasesConfig;
  allowedHosts: string[];
  fetchIntervalMinutes: number | null;
}

export const SOURCES: SourceDefinition[] = [
  {
    id: 'github-releases:anthropics/claude-code',
    kind: 'github_releases',
    name: 'Claude Code — releases GitHub officielles',
    config: { owner: 'anthropics', repo: 'claude-code', perPage: 5 },
    allowedHosts: ['api.github.com'],
    fetchIntervalMinutes: 360,
  },
];

export async function syncSources(database: Database, definitions: SourceDefinition[], now: string): Promise<void> {
  await withBusyRetry(database.client, async () => {
    for (const def of definitions) {
      await database.db
        .insert(sources)
        .values({
          id: def.id,
          kind: def.kind,
          name: def.name,
          config: { ...def.config },
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
