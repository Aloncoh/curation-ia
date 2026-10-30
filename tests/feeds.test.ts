import { describe, expect, it } from 'vitest';
import { parseFeedItems } from '../src/collect/feeds.ts';
import { SourceFormatError } from '../src/collect/github-releases.ts';
import { fixture } from './helpers/db.ts';

const rss = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><link>https://example.org</link>${items}</channel></rss>`;

describe('parseFeedItems', () => {
  it('OpenAI News : garde les 20 entrées les plus récentes, identifiées par leur lien', () => {
    const docs = parseFeedItems(fixture('feed-openai-news.xml'), 20);
    expect(docs).toHaveLength(20);
    expect(docs[0]).toMatchObject({
      externalId: 'https://openai.com/index/updated-model-spec',
      url: 'https://openai.com/index/updated-model-spec',
      title: 'An updated Model Spec for more capable and beneficial AI',
      announcedAt: '2026-10-29T17:00:00.000Z',
      version: null,
      contentFormat: 'html',
    });
    for (let i = 1; i < docs.length; i++) {
      expect((docs[i - 1]!.announcedAt ?? '') >= (docs[i]!.announcedAt ?? '')).toBe(true);
    }
  });

  it('GitHub Changelog : identité par le lien même quand le guid diffère, guid et catégories conservés', () => {
    const docs = parseFeedItems(fixture('feed-github-changelog.xml'), 20);
    expect(docs).toHaveLength(10);
    const fusion = docs.find((doc) => doc.title.startsWith('Route and orchestrate models'));
    expect(fusion?.externalId).toMatch(/^https:\/\/github\.blog\/changelog\/2026-10-28-/);
    expect(String(fusion?.metadata.guid)).toMatch(/2026-11-26/);
    expect(fusion?.metadata.categories).toContain('copilot');
    expect(fusion?.content.length).toBeGreaterThan(0);
  });

  it('ignore les liens non web et les doublons ; utilise le guid sans lien ; met les entrées sans date en dernier', () => {
    const docs = parseFeedItems(
      rss(`
        <item><title>Sans date</title><link>https://example.org/c</link></item>
        <item><title>Lien douteux</title><link>javascript:alert(1)</link><guid isPermaLink="false">id-b</guid><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Récente</title><link>https://example.org/a?utm_source=rss</link><pubDate>Thu, 29 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Doublon</title><link>https://example.org/a</link><pubDate>Thu, 29 Oct 2026 11:00:00 GMT</pubDate></item>`),
      20,
    );
    expect(docs.map((doc) => doc.externalId)).toEqual(['https://example.org/a', 'id-b', 'https://example.org/c']);
    expect(docs[2]?.announcedAt).toBeNull();
  });

  it('limite le nombre d’entrées gardées', () => {
    expect(parseFeedItems(fixture('feed-openai-news.xml'), 3)).toHaveLength(3);
  });

  it.each([
    ['une page HTML', '<html><body>Erreur 503</body></html>'],
    ['du texte', 'pas un flux'],
    ['un flux sans entrée', rss('')],
  ])('refuse %s', (_label, body) => {
    expect(() => parseFeedItems(body, 20)).toThrow(SourceFormatError);
  });
});
