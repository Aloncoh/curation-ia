// Source « releases GitHub » : API REST officielle, documentée et versionnée.
import { z } from 'zod';
import { contentHash, normalizeDate, normalizeText, normalizeUrl } from './normalize.ts';

export interface GithubReleasesConfig {
  owner: string;
  repo: string;
  perPage: number;
}

export interface CollectedDocument {
  externalId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  version: string | null;
  announcedAt: string | null;
  content: string;
  contentFormat: 'markdown' | 'html';
  contentHash: string;
  metadata: Record<string, unknown>;
}

export class SourceFormatError extends Error {
  readonly kind = 'invalid_response';

  constructor(message: string) {
    super(message);
    this.name = 'SourceFormatError';
  }
}

export const GITHUB_API_HEADERS: Record<string, string> = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
};

const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const SEMVER_AT_END = /(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

/** Numéro de version lisible à partir d'un tag (« rust-v0.166.0 » → « 0.166.0 ») ; le tag tel quel sinon. */
export function normalizeVersion(tag: string): string {
  return SEMVER_AT_END.exec(tag)?.[1] ?? tag;
}

export function releasesUrl(config: GithubReleasesConfig): string {
  if (!NAME_PATTERN.test(config.owner) || !NAME_PATTERN.test(config.repo)) {
    throw new Error(`Dépôt GitHub invalide : ${config.owner}/${config.repo}`);
  }
  if (!Number.isInteger(config.perPage) || config.perPage < 1 || config.perPage > 100) {
    throw new Error(`per_page invalide : ${config.perPage}`);
  }
  return `https://api.github.com/repos/${config.owner}/${config.repo}/releases?per_page=${config.perPage}`;
}

const releaseSchema = z.object({
  id: z.number().int().positive(),
  tag_name: z.string().min(1),
  name: z.string().nullable(),
  html_url: z.url({ protocol: /^https$/ }),
  body: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string(),
  published_at: z.string().nullable(),
});

const releasesSchema = z.array(releaseSchema);

/** Transforme la réponse de l'API en documents normalisés. Le contenu collecté reste une donnée, jamais une instruction. */
export function parseReleases(body: string): CollectedDocument[] {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new SourceFormatError('Réponse JSON invalide');
  }
  const parsed = releasesSchema.safeParse(json);
  if (!parsed.success) {
    throw new SourceFormatError(`Réponse inattendue de l'API GitHub : ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data
    .filter((release) => !release.draft)
    .map((release) => {
      const title = normalizeText(release.name || release.tag_name);
      const content = normalizeText(release.body ?? '');
      return {
        externalId: String(release.id),
        url: release.html_url,
        normalizedUrl: normalizeUrl(release.html_url),
        title,
        version: release.tag_name,
        announcedAt: normalizeDate(release.published_at),
        content,
        contentFormat: 'markdown' as const,
        contentHash: contentHash({ title, version: release.tag_name, content }),
        metadata: { prerelease: release.prerelease, createdAt: normalizeDate(release.created_at) },
      };
    });
}
