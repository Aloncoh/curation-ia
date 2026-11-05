// Hacker News (2026-11-05) : le signal séparé de l'article ; destinations validées, robots.txt lu, redirections
// revalidées, adresses privées refusées ; un article inaccessible ne donne aucun texte.
import { describe, expect, it } from 'vitest';
import { lireArticleExterne, REDIRECTIONS_MAX } from '../src/collect/article-externe.ts';
import { destinationValide, parseHackerNews } from '../src/collect/hackernews.ts';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { SOURCES } from '../src/sources.ts';
import { adapterFor } from '../src/worker/collect.ts';

const hit = (id: number, title: string, url: string | null, points = 250) => ({ objectID: String(id), title, url, points, num_comments: 80, created_at: '2026-11-05T10:00:00.000Z' });
const PUBLIQUE: Resolver = async () => [{ address: '93.184.216.34', family: 4 }];
const ARTICLE = '<html><body><article><p>An open model for code review ships today with weights on the hub.</p></article></body></html>';

function faux(routes: Record<string, { status?: number; body?: string; headers?: Record<string, string> }>): Transport & { appels: string[] } {
  const appels: string[] = [];
  const t: Transport = async (req) => {
    const url = req.url.toString();
    appels.push(url);
    const r = routes[url];
    if (!r) return { status: 404, headers: {}, body: Buffer.from('Not Found') };
    return { status: r.status ?? 200, headers: r.headers ?? {}, body: Buffer.from(r.body ?? '') };
  };
  return Object.assign(t, { appels });
}
const lire = (url: string, transport: Transport, resolve: Resolver = PUBLIQUE) => lireArticleExterne(url, { userAgent: 'curation-ai-collector/0.1', timeoutMs: 1000, maxBytes: 1_000_000, deps: { transport, resolve } });

describe('Hacker News : le signal', () => {
  it('garde les histoires sur l’IA, au-dessus du seuil, avec un article https ; la capture reste vide', () => {
    const corps = JSON.stringify({ hits: [
      hit(1, 'Show HN: An open LLM for code review', 'https://example.org/post'),
      hit(2, 'A history of typewriters', 'https://example.org/typewriters'),
      hit(3, 'Claude agents in production', 'https://example.org/agents', 40),
      hit(4, 'Ask HN: which AI tools do you use?', null),
      hit(5, 'GPT internals', 'http://example.org/insecure'),
      hit(6, 'AI on a local box', 'https://192.168.1.10/post'),
    ] });
    const { documents, rejected } = parseHackerNews(corps, { maxItems: 15, pointsMin: 100 });
    expect(documents.map((d) => d.url)).toEqual(['https://example.org/post']);
    expect(documents[0]).toMatchObject({ content: '', metadata: { signal: 'hacker_news', hn_discussion: 'https://news.ycombinator.com/item?id=1', points: 250 } });
    expect(rejected).toEqual({ hors_ia: 1, sous_le_seuil: 1, sans_article_valide: 3 });
  });

  it('refuse toute destination qui n’est pas un vrai domaine en https', () => {
    for (const u of ['http://a.com', 'https://localhost/x', 'https://10.0.0.1/x', 'https://[::1]/x', 'https://a.local/x', 'https://user:pw@a.com/x', 'https://a.com:8443/x', 'https://news.ycombinator.com/item?id=1', 'javascript:alert(1)'])
      expect(destinationValide(u), u).toBeNull();
    expect(destinationValide('https://blog.example.com/a?b=1')?.hostname).toBe('blog.example.com');
  });

  it('la source est déclarée sans compte imposé, avec une attribution, et la collecte sait la lire', () => {
    const def = SOURCES.find((s) => s.kind === 'hackernews')!;
    expect(def).toMatchObject({ allowedHosts: ['hn.algolia.com'], attribution: expect.stringContaining('Hacker News') });
    expect(def.compte).toBeUndefined();
    expect(adapterFor(def).parse(JSON.stringify({ hits: [hit(1, 'AI agents', 'https://example.org/p')] })).documents).toHaveLength(1);
  });
});

describe('Hacker News : l’article lié', () => {
  it('lit robots.txt puis l’article autorisé', async () => {
    const t = faux({ 'https://example.org/robots.txt': { body: 'User-agent: *\nAllow: /\n' }, 'https://example.org/post': { body: ARTICLE } });
    expect(await lire('https://example.org/post', t)).toMatchObject({ ok: true, url: 'https://example.org/post' });
    expect(t.appels).toEqual(['https://example.org/robots.txt', 'https://example.org/post']);
  });

  it('ne demande jamais une page interdite par robots.txt, ni une page quand robots.txt est inaccessible', async () => {
    const interdit = faux({ 'https://example.org/robots.txt': { body: 'User-agent: *\nDisallow: /post\n' }, 'https://example.org/post': { body: ARTICLE } });
    expect(await lire('https://example.org/post', interdit)).toMatchObject({ ok: false, motif: expect.stringContaining('robots_interdit') });
    expect(interdit.appels).toEqual(['https://example.org/robots.txt']);
    const panne = faux({ 'https://example.org/robots.txt': { status: 503 } });
    expect(await lire('https://example.org/post', panne)).toMatchObject({ ok: false, motif: expect.stringContaining('robots_inaccessible') });
  });

  it('suit une redirection revalidée, refuse une redirection vers http ou une adresse privée, et s’arrête après trois', async () => {
    const t = faux({
      'https://example.org/robots.txt': { status: 404 },
      'https://example.org/old': { status: 301, headers: { location: 'https://www.example.org/new' } },
      'https://www.example.org/robots.txt': { status: 404 },
      'https://www.example.org/new': { body: ARTICLE },
    });
    expect(await lire('https://example.org/old', t)).toMatchObject({ ok: true, url: 'https://www.example.org/new' });
    const versHttp = faux({ 'https://example.org/robots.txt': { status: 404 }, 'https://example.org/old': { status: 302, headers: { location: 'http://example.org/new' } } });
    expect(await lire('https://example.org/old', versHttp)).toMatchObject({ ok: false, motif: expect.stringContaining('redirection_refusee') });
    const boucle = faux({ 'https://example.org/robots.txt': { status: 404 }, 'https://example.org/a': { status: 302, headers: { location: '/a' } } });
    expect(await lire('https://example.org/a', boucle)).toMatchObject({ ok: false, motif: `plus_de_${REDIRECTIONS_MAX}_redirections` });
  });

  it('refuse un hôte qui se résout vers une adresse privée : aucune requête, aucun texte', async () => {
    const t = faux({});
    const r = await lire('https://intranet.example.org/post', t, async () => [{ address: '10.0.0.5', family: 4 }]);
    expect(r.ok).toBe(false);
    expect(t.appels).toEqual([]);
  });
});
