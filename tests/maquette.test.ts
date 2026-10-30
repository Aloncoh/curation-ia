import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { releasesUrl } from '../src/collect/github-releases.ts';
import { buildMaquetteData, excerpt, toPlainText } from '../src/maquette/data.ts';
import { SOURCES } from '../src/sources.ts';
import { runCollect } from '../src/worker/collect.ts';
import { CLAUDE_CODE, createTestDb, fixture, readFixture, routeFetcher, type TestDb } from './helpers/db.ts';

describe('extraits en texte brut', () => {
  it('HTML : balises et scripts retirés, entités décodées', () => {
    expect(toPlainText('<p>Fast &amp; <b>safe</b>&#8217;s</p><script>alert(1)</script><style>p{}</style>', 'html')).toBe('Fast & safe’s');
  });

  it('Markdown : titres, liens, images, listes et mise en forme retirés', () => {
    const md = "## What's changed\n\n- Added `--flag` to **run** ([#12](https://x.test/12))\n* ![logo](a.png) Fixed _bug_";
    expect(toPlainText(md, 'markdown')).toBe('Added --flag to run (#12) Fixed bug');
  });

  it('fidèle au texte : identifiants SNAKE_CASE, chemins ~/ et entités HTML courantes conservés', () => {
    expect(toPlainText('- Added `CLAUDE_CODE_RETRY` and read `~/.claude/settings.json` in **bold** and _it_', 'markdown')).toBe(
      'Added CLAUDE_CODE_RETRY and read ~/.claude/settings.json in bold and it',
    );
    expect(toPlainText('<p>We&rsquo;re here &mdash; really&hellip;</p>', 'html')).toBe('We’re here — really…');
  });

  it('coupe sur un mot avec des points de suspension ; null si vide', () => {
    expect(excerpt('un deux trois quatre', 'markdown', 12)).toBe('un deux…');
    expect(excerpt('court', 'markdown', 12)).toBe('court');
    expect(excerpt('<p> </p>', 'html')).toBeNull();
  });
});

describe('données de la maquette', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.cleanup());

  const collect = (mode: 'live' | 'fixture') =>
    runCollect({
      database: t.database,
      fetcher: routeFetcher({ [releasesUrl(CLAUDE_CODE.config)]: readFixture() }),
      mode,
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [CLAUDE_CODE],
    });

  it("n'affiche jamais une capture de fixture comme une collecte réelle", async () => {
    await collect('fixture');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items).toEqual([]);
    expect(data.excluded_not_live).toBe(5);
  });

  it('collecte réelle puis relecture de fixture sur la même base : ni versions ni date de collecte venues de la fixture', async () => {
    const releases = JSON.parse(readFixture()) as unknown[];
    const url = releasesUrl(CLAUDE_CODE.config);
    const run = (mode: 'live' | 'fixture', body: string, at: string) =>
      runCollect({
        database: t.database,
        fetcher: routeFetcher({ [url]: body }),
        mode,
        workerId: 'test-worker',
        leaseMs: 60_000,
        maxAttempts: 3,
        retryBackoffMs: 60_000,
        definitions: [CLAUDE_CODE],
        clock: () => new Date(at),
      });
    await run('live', JSON.stringify(releases.slice(0, 2)), '2026-10-30T01:00:00.000Z');
    await run('fixture', readFixture(), '2026-10-30T02:00:00.000Z');

    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z');
    expect(data.news_items.map((item) => item.version)).toEqual(['2.1.312', '2.1.311']);
    expect(data.products[0]?.versions.map((version) => version.version)).toEqual(['2.1.312', '2.1.311']);
    expect(data.sources[0]).toMatchObject({ status: 'ok', last_success_at: '2026-10-30T01:00:00.000Z' });
  });

  it('collecte réelle : actualités datées, rattachées à leur produit et à leur version, avec un extrait en texte brut', async () => {
    await collect('live');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items).toHaveLength(5);
    const dates = data.news_items.map((item) => item.announced_at!);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const item of data.news_items) {
      expect(item.kind).toBe('version');
      expect(item.product?.key).toBe('anthropic/claude-code');
      expect(item.title).toBe(`Claude Code ${item.version}`);
      expect(item.source.url).toMatch(/^https:\/\/github\.com\/anthropics\/claude-code\/releases\/tag\//);
      expect(item.capture.mode).toBe('live');
      expect(item.excerpt === null || !/[<>#`]/.test(item.excerpt)).toBe(true);
    }
    expect(data.products[0]?.versions).toHaveLength(5);
  });

  it("une annonce de flux n'a ni produit ni version", async () => {
    const feed = SOURCES.find((def) => def.id === 'feed:github-changelog')!;
    if (feed.kind !== 'feed') throw new Error('source inattendue');
    await runCollect({
      database: t.database,
      fetcher: routeFetcher({ [feed.config.url]: fixture('feed-github-changelog.xml') }),
      mode: 'live',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [feed],
    });
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items.length).toBe(10);
    expect(data.news_items.every((item) => item.kind === 'annonce' && item.product === null && item.version === null)).toBe(true);
    expect(data.news_items.some((item) => item.categories.length > 0)).toBe(true);
  });
});
