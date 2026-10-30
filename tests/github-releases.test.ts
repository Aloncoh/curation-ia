import { describe, expect, it } from 'vitest';
import { parseReleases, releasesUrl, SourceFormatError } from '../src/collect/github-releases.ts';
import { readFixture } from './helpers/db.ts';

describe('releasesUrl', () => {
  it("construit l'URL de l'API officielle", () => {
    expect(releasesUrl({ owner: 'anthropics', repo: 'claude-code', perPage: 5 })).toBe(
      'https://api.github.com/repos/anthropics/claude-code/releases?per_page=5',
    );
  });

  it('refuse un dépôt ou une pagination invalides', () => {
    expect(() => releasesUrl({ owner: '../x', repo: 'y', perPage: 5 })).toThrow();
    expect(() => releasesUrl({ owner: 'a', repo: 'b', perPage: 0 })).toThrow();
    expect(() => releasesUrl({ owner: 'a', repo: 'b', perPage: 101 })).toThrow();
  });
});

describe('parseReleases', () => {
  it('transforme les 5 releases réelles en documents avec provenance et dates', () => {
    const docs = parseReleases(readFixture());
    expect(docs).toHaveLength(5);
    const [first] = docs;
    expect(first).toMatchObject({
      externalId: '425846009',
      version: 'v2.1.312',
      url: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
      normalizedUrl: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
      announcedAt: '2026-10-27T20:24:20.000Z',
      contentFormat: 'markdown',
    });
    expect(first?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(docs.map((doc) => doc.externalId)).size).toBe(5);
  });

  it('garde null quand la date de publication est inconnue, et utilise le tag si le titre manque', () => {
    const body = JSON.stringify([
      {
        id: 1,
        tag_name: 'v0.0.1',
        name: null,
        html_url: 'https://github.com/o/r/releases/tag/v0.0.1',
        body: null,
        draft: false,
        prerelease: false,
        created_at: '2026-01-01T00:00:00Z',
        published_at: null,
      },
    ]);
    const [doc] = parseReleases(body);
    expect(doc?.announcedAt).toBeNull();
    expect(doc?.title).toBe('v0.0.1');
    expect(doc?.content).toBe('');
  });

  it('ignore les brouillons', () => {
    const releases = JSON.parse(readFixture()) as Array<Record<string, unknown>>;
    releases[0]!.draft = true;
    expect(parseReleases(JSON.stringify(releases))).toHaveLength(4);
  });

  it('refuse une réponse qui n’est pas du JSON', () => {
    expect(() => parseReleases('<html>erreur</html>')).toThrow(SourceFormatError);
  });

  it('refuse une réponse au format inattendu', () => {
    expect(() => parseReleases(JSON.stringify([{ tag_name: 'v1' }]))).toThrow(SourceFormatError);
    expect(() => parseReleases(JSON.stringify({ message: 'API rate limit exceeded' }))).toThrow(SourceFormatError);
  });
});
