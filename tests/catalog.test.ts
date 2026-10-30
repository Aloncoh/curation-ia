import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeVersion, releasesUrl } from '../src/collect/github-releases.ts';
import { SOURCES, type SourceDefinition } from '../src/sources.ts';
import { runCollect } from '../src/worker/collect.ts';
import { createTestDb, fixture, routeFetcher, scalar, type TestDb } from './helpers/db.ts';

type Release = { tag_name: string; prerelease: boolean; draft: boolean };

const FIXTURES: Record<string, string> = {
  'github-releases:anthropics/claude-code': 'github-releases-claude-code.json',
  'github-releases:openai/codex': 'github-releases-openai-codex.json',
  'github-releases:google-gemini/gemini-cli': 'github-releases-gemini-cli.json',
  'feed:openai-news': 'feed-openai-news.xml',
  'feed:github-changelog': 'feed-github-changelog.xml',
};
const urlOf = (def: SourceDefinition) => (def.kind === 'github_releases' ? releasesUrl(def.config) : def.config.url);
const source = (id: string) => SOURCES.find((def) => def.id === id)!;

/** Réponses réelles enregistrées, avec remplacements éventuels par source. */
function routes(overrides: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(SOURCES.map((def) => [urlOf(def), overrides[def.id] ?? fixture(FIXTURES[def.id]!)]));
}

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.cleanup());

const collect = (body: Record<string, string>, definitions: SourceDefinition[] = SOURCES) =>
  runCollect({
    database: t.database,
    fetcher: routeFetcher(body),
    mode: 'fixture',
    workerId: 'test-worker',
    leaseMs: 60_000,
    maxAttempts: 3,
    retryBackoffMs: 60_000,
    definitions,
  });

const githubIds = Object.keys(FIXTURES).filter((id) => id.startsWith('github-releases:'));
const releasesOf = (id: string) => JSON.parse(fixture(FIXTURES[id]!)) as Release[];

describe('catalogue : produits, versions, actualités', () => {
  it('collecte multi-sources : chaque produit, version et actualité créé une seule fois', async () => {
    const first = await collect(routes());
    expect(first.runs.map((run) => run.status)).toEqual(['succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded']);

    const expectedVersions = githubIds.reduce((sum, id) => sum + new Set(releasesOf(id).map((r) => normalizeVersion(r.tag_name))).size, 0);
    const expectedStable = githubIds.reduce((sum, id) => sum + releasesOf(id).filter((r) => !r.prerelease && !r.draft).length, 0);
    expect(await scalar(t.database, 'select count(*) from product')).toBe(3);
    expect(await scalar(t.database, 'select count(*) from product_version')).toBe(expectedVersions);
    expect(await scalar(t.database, "select count(*) from news_item where kind = 'version'")).toBe(expectedStable);
    expect(await scalar(t.database, "select count(*) from news_item where kind = 'annonce'")).toBe(30);

    // Chaque actualité a exactement un document principal ; chaque actualité « version » cible un produit et une version.
    expect(await scalar(t.database, "select count(*) from news_item n where (select count(*) from news_item_document d where d.news_item_id = n.id and d.role = 'primary') <> 1")).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item n where n.kind = 'version' and not exists (select 1 from news_item_target t where t.news_item_id = n.id and t.product_version_id is not null)")).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item n where n.kind = 'annonce' and exists (select 1 from news_item_target t where t.news_item_id = n.id)")).toBe(0);

    const second = await collect(routes());
    expect(second.runs.every((run) => run.newNewsItems === 0 && run.newDocuments === 0)).toBe(true);
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(expectedStable + 30);
    expect(await scalar(t.database, 'select count(*) from product_version')).toBe(expectedVersions);
  });

  it('deux annonces distinctes sur le même produit : deux actualités, un seul produit', async () => {
    await collect(routes(), [source('github-releases:anthropics/claude-code')]);
    expect(await scalar(t.database, 'select count(*) from product')).toBe(1);
    const titles = (await t.database.client.execute("select title from news_item order by announced_at desc")).rows.map((row) => row.title);
    expect(titles).toEqual(['Claude Code 2.1.312', 'Claude Code 2.1.311', 'Claude Code 2.1.310', 'Claude Code 2.1.309', 'Claude Code 2.1.308']);
  });

  it('préversion : version enregistrée sans actualité, puis actualité créée quand elle devient stable', async () => {
    const codex = source('github-releases:openai/codex');
    const releases = JSON.parse(fixture(FIXTURES[codex.id]!)) as Array<Release & Record<string, unknown>>;
    const alpha = releases.find((release) => release.prerelease)!;
    const version = normalizeVersion(alpha.tag_name);

    await collect(routes(), [codex]);
    const before = await t.database.client.execute({ sql: 'select is_prerelease from product_version where version = ?', args: [version] });
    expect(Number(before.rows[0]?.is_prerelease)).toBe(1);
    expect(await scalar(t.database, `select count(*) from news_item where title = 'Codex CLI ${version}'`)).toBe(0);

    alpha.prerelease = false;
    const summary = await collect({ ...routes(), [urlOf(codex)]: JSON.stringify(releases) }, [codex]);
    expect(summary.runs[0]?.newNewsItems).toBe(1);
    expect(await scalar(t.database, `select count(*) from news_item where title = 'Codex CLI ${version}'`)).toBe(1);
    const after = await t.database.client.execute({ sql: 'select is_prerelease from product_version where version = ?', args: [version] });
    expect(Number(after.rows[0]?.is_prerelease)).toBe(0);
  });

  it("entrée de flux republiée avec une nouvelle date : pas de nouvelle actualité, date d'origine conservée", async () => {
    const openai = source('feed:openai-news');
    await collect(routes(), [openai]);
    const link = 'https://openai.com/index/updated-model-spec';
    const republished = fixture(FIXTURES[openai.id]!).replace('Thu, 29 Oct 2026 17:00:00 GMT', 'Fri, 30 Oct 2026 09:00:00 GMT');

    const summary = await collect({ ...routes(), [urlOf(openai)]: republished }, [openai]);
    expect(summary.runs[0]).toMatchObject({ newDocuments: 0, newNewsItems: 0 });
    const doc = (await t.database.client.execute({ sql: 'select id, announced_at from source_document where external_id = ?', args: [link] })).rows[0];
    expect(doc?.announced_at).toBe('2026-10-30T09:00:00.000Z');
    const item = (
      await t.database.client.execute({
        sql: "select n.announced_at from news_item n join news_item_document d on d.news_item_id = n.id where d.document_id = ? and d.role = 'primary'",
        args: [Number(doc?.id)],
      })
    ).rows;
    expect(item).toHaveLength(1);
    expect(item[0]?.announced_at).toBe('2026-10-29T17:00:00.000Z');
  });

  it('guid modifié mais même lien : même document, aucune nouvelle actualité', async () => {
    const changelog = source('feed:github-changelog');
    await collect(routes(), [changelog]);
    const body = fixture(FIXTURES[changelog.id]!).replace(/<guid([^>]*)>([^<]*)<\/guid>/, '<guid$1>$2-republie</guid>');
    const summary = await collect({ ...routes(), [urlOf(changelog)]: body }, [changelog]);
    expect(summary.runs[0]).toMatchObject({ newDocuments: 0, newNewsItems: 0 });
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(10);
  });

  it('flux illisible : exécution échouée avec motif, catalogue et autres sources intacts', async () => {
    await collect(routes());
    const before = await scalar(t.database, 'select count(*) from news_item');
    const summary = await collect(routes({ 'feed:openai-news': '<html><body>Erreur 503</body></html>' }));
    const failed = summary.runs.filter((run) => run.status === 'failed');
    expect(failed.map((run) => [run.sourceId, run.errorKind])).toEqual([['feed:openai-news', 'invalid_response']]);
    expect(summary.runs.filter((run) => run.status === 'succeeded')).toHaveLength(4);
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(before);
  });
});

describe('normalizeVersion', () => {
  it.each([
    ['v2.1.314', '2.1.314'],
    ['rust-v0.166.0', '0.166.0'],
    ['rust-v0.166.0-alpha.6', '0.166.0-alpha.6'],
    ['v0.67.0-nightly.20261030.gb633c0703', '0.67.0-nightly.20261030.gb633c0703'],
    ['release-2026', 'release-2026'],
  ])('%s → %s', (tag, expected) => {
    expect(normalizeVersion(tag)).toBe(expected);
  });
});
