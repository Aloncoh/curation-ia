import { describe, expect, it } from 'vitest';
import { MAX_FEED_ENTRIES, parseFeedItems } from '../src/collect/feeds.ts';
import { SourceFormatError } from '../src/collect/github-releases.ts';
import { fixture } from './helpers/db.ts';
import { sourcesElargies } from '../src/sources-elargies.ts';

const rss = (items: string, channelExtra = '') =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Test</title><link>https://example.org</link>${channelExtra}${items}</channel></rss>`;
const config = { maxItems: 20, linkHosts: ['example.org'] };
const openai = { maxItems: 20, linkHosts: ['openai.com'] };

describe('parseFeedItems', () => {
  it('OpenAI News : garde les 20 entrées les plus récentes, identifiées par leur lien', () => {
    const { documents, rejected } = parseFeedItems(fixture('feed-openai-news.xml'), openai);
    expect(documents).toHaveLength(20);
    expect(rejected).toEqual({});
    expect(documents[0]).toMatchObject({
      externalId: 'https://openai.com/index/updated-model-spec',
      url: 'https://openai.com/index/updated-model-spec',
      title: 'An updated Model Spec for more capable and beneficial AI',
      announcedAt: '2026-10-29T17:00:00.000Z',
      version: null,
      contentFormat: 'html',
    });
    for (let i = 1; i < documents.length; i++) {
      expect((documents[i - 1]!.announcedAt ?? '') >= (documents[i]!.announcedAt ?? '')).toBe(true);
    }
  });

  it('GitHub Changelog : identité par le lien même quand le guid diffère, guid et catégories de l’entrée conservés', () => {
    const { documents } = parseFeedItems(fixture('feed-github-changelog.xml'), { maxItems: 20, linkHosts: ['github.blog'] });
    expect(documents).toHaveLength(10);
    const fusion = documents.find((doc) => doc.title.startsWith('Route and orchestrate models'));
    expect(fusion?.externalId).toMatch(/^https:\/\/github\.blog\/changelog\/2026-10-28-/);
    expect(String(fusion?.metadata.guid)).toMatch(/2026-11-26/);
    expect(fusion?.metadata.categories).toContain('copilot');
    expect(fusion?.content.length).toBeGreaterThan(0);
  });

  it('refuse et compte les entrées sans lien autorisé ; ignore les doublons ; met les entrées sans date en dernier', () => {
    const { documents, rejected } = parseFeedItems(
      rss(`
        <item><title>Sans date</title><link>https://example.org/c</link></item>
        <item><title>Lien douteux</title><link>javascript:alert(1)</link><guid isPermaLink="false">id-b</guid><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Guid seul</title><guid>data:text/html,x</guid><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Hors domaine</title><link>https://example.org@evil.example/x</link><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Autre hôte</title><link>https://evil.example/phish</link><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Non chiffré</title><link>http://example.org/d</link><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Récente</title><link>https://example.org/a?utm_source=rss</link><pubDate>Thu, 29 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>Doublon</title><link>https://example.org/a</link><pubDate>Thu, 29 Oct 2026 11:00:00 GMT</pubDate></item>`),
      config,
    );
    expect(documents.map((doc) => doc.externalId)).toEqual(['https://example.org/a', 'https://example.org/c']);
    expect(documents[1]?.announcedAt).toBeNull();
    expect(rejected).toEqual({ lien_non_https: 2, sans_lien: 1, lien_avec_identifiants: 1, lien_hors_domaine: 1, doublon: 1 });
  });

  it('entités décodées une seule fois : un texte inerte de la source ne devient jamais une balise', () => {
    const { documents } = parseFeedItems(
      rss(`<item>
        <title><![CDATA[Support for &lt;img&gt; tags]]></title>
        <link>https://example.org/e</link>
        <content:encoded><![CDATA[<p>Use <code>&lt;details&gt;</code> and <img alt="x&quot; onerror=&quot;alert(1)" src="y"></p>]]></content:encoded>
      </item>`),
      config,
    );
    // Le titre est du texte brut (affiché comme texte) ; le contenu HTML reste tel que publié.
    expect(documents[0]?.title).toBe('Support for <img> tags');
    expect(documents[0]?.content).toBe('<p>Use <code>&lt;details&gt;</code> and <img alt="x&quot; onerror=&quot;alert(1)" src="y"></p>');

    const escaped = parseFeedItems(
      rss('<item><title>t</title><link>https://example.org/f</link><description>&lt;p&gt;literal &amp;lt;iframe&amp;gt;&lt;/p&gt;</description></item>'),
      config,
    );
    expect(escaped.documents[0]?.content).toBe('<p>literal &lt;iframe&gt;</p>');
  });

  it('titres nettoyés : sans caractères de contrôle ni inversion de sens, longueur plafonnée', () => {
    const { documents } = parseFeedItems(
      rss(`<item><title>a&#x202E;gnp.exe&#x9;&#x61C;&#x200B;  b</title><link>https://example.org/g</link></item>
           <item><title>${'x'.repeat(2_000)}</title><link>https://example.org/h</link></item>`),
      config,
    );
    expect(documents.find((doc) => doc.externalId.endsWith('/g'))?.title).toBe('a gnp.exe b');
    expect(documents.find((doc) => doc.externalId.endsWith('/h'))?.title).toHaveLength(500);
  });

  it('catégories en texte brut : entités du CDATA décodées (fixture réelle du GitHub Changelog)', () => {
    const { documents } = parseFeedItems(fixture('feed-github-changelog.xml'), { maxItems: 20, linkHosts: ['github.blog'] });
    const webhook = documents.find((doc) => doc.title.startsWith('Webhook IP ranges'));
    expect(webhook?.metadata.categories).toEqual(['Improvement', 'ecosystem & accessibility']);
  });

  it('RSS : un atom:link placé avant <link> ne masque pas le lien de l’entrée', () => {
    const { documents } = parseFeedItems(
      rss('<item xmlns:atom="http://www.w3.org/2005/Atom"><title>t</title><atom:link rel="replies" href="https://example.org/r"/><link>https://example.org/a</link></item>'),
      config,
    );
    expect(documents.map((doc) => doc.externalId)).toEqual(['https://example.org/a']);
  });

  it('Atom : lien relatif résolu contre xml:base ; contenu « text » et « xhtml » échappé, « html » tel quel', () => {
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xml:base="https://example.org/"><title>t</title>
      <entry><title>html</title><link href="/posts/1"/><id>1</id><updated>2026-10-29T10:00:00Z</updated>
        <content type="html">&lt;p&gt;ok &amp;lt;b&amp;gt;&lt;/p&gt;</content></entry>
      <entry><title>texte</title><link rel="alternate" href="https://example.org/posts/2"/><id>2</id><updated>2026-10-28T10:00:00Z</updated>
        <summary>a &lt;script&gt;alert(1)&lt;/script&gt; b</summary></entry>
      <entry><title>xhtml</title><link href="https://example.org/posts/3"/><id>3</id><updated>2026-10-27T10:00:00Z</updated>
        <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Use &lt;img src=x onerror=alert(1)&gt; literally</p></div></content></entry>
    </feed>`;
    const { documents } = parseFeedItems(atom, config);
    expect(documents.map((doc) => doc.externalId)).toEqual(['https://example.org/posts/1', 'https://example.org/posts/2', 'https://example.org/posts/3']);
    expect(documents[0]?.content).toBe('<p>ok &lt;b&gt;</p>');
    expect(documents[1]?.content).toBe('a &lt;script&gt;alert(1)&lt;/script&gt; b');
    expect(documents[2]?.content).not.toMatch(/<img/);
    expect(documents[2]?.content).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('les catégories du canal ne sont jamais attribuées aux entrées', () => {
    const { documents } = parseFeedItems(rss('<item><title>t</title><link>https://example.org/i</link></item>', '<category>Canal</category>'), config);
    expect(documents[0]?.metadata.categories).toEqual([]);
  });

  it(`refuse un flux de plus de ${MAX_FEED_ENTRIES} entrées avant de l’analyser`, () => {
    const items = Array.from({ length: MAX_FEED_ENTRIES + 1 }, (_, i) => `<item><guid>${i}</guid></item>`).join('');
    const started = performance.now();
    expect(() => parseFeedItems(rss(items), config)).toThrow(/Flux trop long/);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('limite le nombre d’entrées gardées', () => {
    expect(parseFeedItems(fixture('feed-openai-news.xml'), { ...openai, maxItems: 3 }).documents).toHaveLength(3);
  });

  it('motif de titres : garde les annonces, refuse et compte les autres entrées (blog mixte, 2026-11-11)', () => {
    const item = (t: string, n: number) => `<item><title>${t}</title><link>https://example.org/b/${n}</link><pubDate>Mon, 0${n} Nov 2026 10:00:00 GMT</pubDate></item>`;
    const corps = rss(item('Seedream 5.5 on Higgsfield AI: Features', 1) + item('8 Best CapCut Alternatives', 2) + item('How to Edit Photos on Higgsfield: Guide', 3) + item('Introducing Ad Multiplier', 4));
    const r = parseFeedItems(corps, { ...config, titres: (sourcesElargies((() => ({})) as never).find((s) => s.id === 'feed:higgsfield-blog')!.config as { titres: string }).titres });
    expect(r.documents.map((d) => d.title)).toEqual(['Introducing Ad Multiplier', 'Seedream 5.5 on Higgsfield AI: Features']);
    expect(r.rejected).toEqual({ titre_hors_motif: 2 });
  });

  it.each([
    ['une page HTML', '<html><body>Erreur 503</body></html>'],
    ['du texte', 'pas un flux'],
    ['un flux sans entrée', rss('')],
    ['un flux sans lien autorisé', rss('<item><title>t</title><link>https://evil.example/x</link></item>')],
  ])('refuse %s', (_label, body) => {
    expect(() => parseFeedItems(body, config)).toThrow(SourceFormatError);
  });
});
