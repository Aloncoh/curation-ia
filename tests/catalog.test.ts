import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SourceFetcher } from '../src/collect/fetchers.ts';
import { normalizeVersion, releasesUrl } from '../src/collect/github-releases.ts';
import { SafeFetchError } from '../src/collect/safe-fetch.ts';
import { pendingMigrations } from '../src/db/client.ts';
import { readJournal } from '../src/db/migrate.ts';
import { SOURCES, type GithubReleasesSource, type SourceDefinition } from '../src/sources.ts';
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

const collectWith = (fetcher: SourceFetcher, definitions: SourceDefinition[] = SOURCES) =>
  runCollect({
    database: t.database,
    fetcher,
    mode: 'fixture',
    workerId: 'test-worker',
    leaseMs: 60_000,
    maxAttempts: 3,
    retryBackoffMs: 60_000,
    definitions,
  });
const collect = (body: Record<string, string>, definitions: SourceDefinition[] = SOURCES) => collectWith(routeFetcher(body), definitions);

/** État complet du catalogue et des documents, pour vérifier qu'un échec ne change rien. */
async function state(): Promise<string> {
  const result = await t.database.client.execute(`select
    (select count(*) from source_document) as documents,
    (select group_concat(content_hash, ',') from (select content_hash from document_snapshot order by id)) as snapshots,
    (select count(*) from product) as products,
    (select group_concat(version || ':' || is_prerelease, ',') from (select version, is_prerelease from product_version order by id)) as versions,
    (select group_concat(title || '@' || coalesce(announced_at, ''), ',') from (select title, announced_at from news_item order by id)) as items,
    (select count(*) from news_item_document) as links`);
  return JSON.stringify(result.rows[0]);
}

const githubIds = Object.keys(FIXTURES).filter((id) => id.startsWith('github-releases:'));
const releasesOf = (id: string) => JSON.parse(fixture(FIXTURES[id]!)) as Release[];

describe('catalogue : produits, versions, actualités', () => {
  it('collecte multi-sources : chaque produit, version et actualité créé une seule fois', async () => {
    const first = await collect(routes());
    expect(first.runs.map((run) => run.status)).toEqual(['succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded']);

    // Valeurs relevées dans les fixtures réelles : 5 + 20 + 20 tags distincts, dont 5 + 3 + 2 stables.
    const expectedVersions = 45;
    const expectedStable = 10;
    expect(githubIds.reduce((sum, id) => sum + releasesOf(id).length, 0)).toBe(expectedVersions);
    expect(await scalar(t.database, 'select count(*) from product')).toBe(3);
    expect(await scalar(t.database, 'select count(*) from product_version')).toBe(expectedVersions);
    expect(await scalar(t.database, "select count(*) from news_item where kind = 'version'")).toBe(expectedStable);
    expect(await scalar(t.database, "select count(*) from news_item where kind = 'annonce'")).toBe(30);

    // Chaque actualité a exactement un document principal ; chaque actualité « version » cible un produit et une version.
    expect(await scalar(t.database, "select count(*) from news_item n where (select count(*) from news_item_document d where d.news_item_id = n.id and d.role = 'primary') <> 1")).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item n where n.kind = 'version' and not exists (select 1 from news_item_target t where t.news_item_id = n.id and t.product_version_id is not null)")).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item n where n.kind = 'annonce' and exists (select 1 from news_item_target t where t.news_item_id = n.id)")).toBe(0);

    // Chaque release réelle est rattachée à exactement une version, et chaque actualité « version » à la version de son document.
    expect(await scalar(t.database, "select count(*) from source_document d where d.source_id like 'github-releases:%' and (select count(*) from product_version v where v.source_document_id = d.id) <> 1")).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item n join news_item_document d on d.news_item_id = n.id and d.role = 'primary' join news_item_target t on t.news_item_id = n.id join product_version v on v.id = t.product_version_id where v.source_document_id <> d.document_id")).toBe(0);

    const second = await collect(routes());
    expect(second.runs.map((run) => run.status)).toEqual(Array(5).fill('succeeded'));
    expect(second.runs.map((run) => run.unchangedDocuments)).toEqual(first.runs.map((run) => run.newDocuments));
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
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 0, unchangedDocuments: 20, newNewsItems: 0 });
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
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 0, unchangedDocuments: 10, newNewsItems: 0 });
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(10);
  });

  it.each([
    ['page HTML à la place du flux', '<html><body>Erreur 503</body></html>', 'invalid_response'],
    ['flux sans entrée', '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>', 'invalid_response'],
    ['HTTP 503', new SafeFetchError('http_status', 'Réponse HTTP 503', 503), 'http_status'],
    ['délai dépassé', new SafeFetchError('timeout', 'Délai dépassé'), 'timeout'],
    ['redirection', new SafeFetchError('redirect', 'Redirection refusée', 301), 'redirect'],
    ['réponse trop volumineuse', new SafeFetchError('too_large', 'Réponse trop volumineuse'), 'too_large'],
  ] as const)('flux en panne (%s) : exécution échouée avec motif, données et catalogue intacts', async (_label, failure, kind) => {
    const openai = source('feed:openai-news');
    await collect(routes());
    const before = await state();
    const healthy = routeFetcher(routes());
    const fetcher: SourceFetcher = async (url, headers, hosts) => {
      if (url !== urlOf(openai)) return healthy(url, headers, hosts);
      if (typeof failure !== 'string') throw failure;
      return { status: 200, body: failure, bytes: Buffer.byteLength(failure) };
    };
    const summary = await collectWith(fetcher);
    const failed = summary.runs.filter((run) => run.status === 'failed');
    expect(failed.map((run) => [run.sourceId, run.errorKind])).toEqual([['feed:openai-news', kind]]);
    expect(summary.runs.filter((run) => run.status === 'succeeded')).toHaveLength(4);
    expect(await state()).toBe(before);
  });

  it('release recréée avec un nouvel identifiant (même tag) : une seule actualité, le nouveau document en source secondaire', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    await collect(routes(), [claude]);
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as Array<Record<string, unknown>>;
    const originalId = String(releases[1]!.id);
    releases[1]!.id = 999000001;

    const summary = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases) }, [claude]);
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 1, newNewsItems: 0 });
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(5);
    expect(await scalar(t.database, 'select count(*) from product_version')).toBe(5);
    const roles = await t.database.client.execute({
      sql: 'select s.external_id, d.role from news_item_document d join source_document s on s.id = d.document_id where s.external_id in (?, ?) order by d.role',
      args: [originalId, '999000001'],
    });
    expect(roles.rows.map((row) => [row.external_id, row.role])).toEqual([[originalId, 'primary'], ['999000001', 'supporting']]);
  });

  it('autre document au même numéro de version (préversion) : la version stable et son document ne sont pas écrasés', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as Array<Record<string, unknown>>;
    const stable = releases[0]!;
    releases.push({ ...stable, id: 999000002, tag_name: `sdk-${String(stable.tag_name)}`, prerelease: true });

    const summary = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases) }, [claude]);
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 6, newNewsItems: 5 });
    const version = await t.database.client.execute({
      sql: 'select v.is_prerelease, s.external_id from product_version v join source_document s on s.id = v.source_document_id where v.version = ?',
      args: [normalizeVersion(String(stable.tag_name))],
    });
    expect(version.rows.map((row) => [Number(row.is_prerelease), row.external_id])).toEqual([[0, String(stable.id)]]);
  });

  it('rattrapage : des documents déjà en base sans catalogue (base antérieure à la migration 0001) sont rattachés même absents de la réponse', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    await collect(routes(), [claude]);
    // État d'une base de P1 : documents et captures, aucun catalogue.
    await t.database.client.executeMultiple(
      'delete from news_item_target; delete from news_item_document; delete from news_item; delete from product_version; delete from product;',
    );
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as unknown[];

    const summary = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases.slice(0, 2)) }, [claude]);
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 0, unchangedDocuments: 2, newNewsItems: 5 });
    expect(await scalar(t.database, 'select count(*) from product_version')).toBe(5);
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(5);
    expect(await scalar(t.database, "select count(*) from news_item n join news_item_document d on d.news_item_id = n.id join source_document s on s.id = d.document_id where n.first_seen_at <> s.first_collected_at")).toBe(0);
    const detail = await t.database.client.execute({
      sql: "select json_extract(detail, '$.caughtUpDocuments') as n from run_step where run_id = ? and name = 'store'",
      args: [summary.runs[0]!.runId],
    });
    expect(Number(detail.rows[0]?.n)).toBe(3);

    const third = await collect(routes(), [claude]);
    expect(third.runs[0]).toMatchObject({ status: 'succeeded', newNewsItems: 0 });
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(5);
  });

  it("entrée d'abord sans date puis datée : la date inconnue de l'actualité est complétée, jamais une date connue", async () => {
    const changelog = source('feed:github-changelog');
    const undated = fixture(FIXTURES[changelog.id]!).replace('<pubDate>Thu, 29 Oct 2026 17:14:38 +0000</pubDate>', '');
    await collect({ ...routes(), [urlOf(changelog)]: undated }, [changelog]);
    expect(await scalar(t.database, 'select count(*) from news_item where announced_at is null')).toBe(1);

    await collect(routes(), [changelog]);
    expect(await scalar(t.database, 'select count(*) from news_item where announced_at is null')).toBe(0);
    expect(await scalar(t.database, "select count(*) from news_item where announced_at = '2026-10-29T17:14:38.000Z'")).toBe(1);
    expect(await scalar(t.database, 'select count(*) from news_item')).toBe(10);
  });

  it('toutes les entrées reçues sont nouvelles après une collecte réussie : trou possible signalé', async () => {
    const changelog = source('feed:github-changelog');
    const first = await collect(routes(), [changelog]);
    expect(first.runs[0]?.possibleGap).toBe(false);
    expect((await collect(routes(), [changelog])).runs[0]?.possibleGap).toBe(false);

    const renewed = fixture(FIXTURES[changelog.id]!).replace(/<link>https:\/\/github\.blog\/changelog\/([^<]+)<\/link>/g, '<link>https://github.blog/changelog/nouveau-$1</link>');
    const third = await collect({ ...routes(), [urlOf(changelog)]: renewed }, [changelog]);
    expect(third.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 10, possibleGap: true });
    const detail = await t.database.client.execute({
      sql: "select json_extract(detail, '$.possibleGap') as gap from run_step where run_id = ? and name = 'store'",
      args: [third.runs[0]!.runId],
    });
    expect(Number(detail.rows[0]?.gap)).toBe(1);
  });

  it('chaque source reçoit sa limite de taille (Codex CLI : 12 Mio, les autres : valeur générale)', async () => {
    const limits: Record<string, number | undefined> = {};
    const healthy = routeFetcher(routes());
    await collectWith(async (url, headers, hosts, options) => {
      limits[url] = options?.maxBytes;
      return healthy(url, headers, hosts);
    });
    expect(limits[urlOf(source('github-releases:openai/codex'))]).toBe(12 * 1024 * 1024);
    expect(Object.values(limits).filter((value) => value === undefined)).toHaveLength(4);
  });

  it('tag corrigé sur la même release : la version change de numéro, une seule version par document, titre mis à jour', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    await collect(routes(), [claude]);
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as Array<Record<string, unknown>>;
    releases[0]!.tag_name = 'v2.1.399';

    const summary = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases) }, [claude]);
    expect(summary.runs[0]).toMatchObject({ status: 'succeeded', newNewsItems: 0 });
    const versions = (await t.database.client.execute('select version from product_version order by version')).rows.map((row) => row.version);
    expect(versions).toEqual(['2.1.308', '2.1.309', '2.1.310', '2.1.311', '2.1.399']);
    expect(await scalar(t.database, "select count(*) from news_item where title = 'Claude Code 2.1.399'")).toBe(1);
    expect(await scalar(t.database, "select count(*) from news_item where title = 'Claude Code 2.1.312'")).toBe(0);
    expect(await scalar(t.database, 'select count(*) from source_document d where (select count(*) from product_version v where v.source_document_id = d.id) <> 1')).toBe(0);
  });

  it('seconde collecte juste après un échec : la source reportée est signalée, pas passée sous silence', async () => {
    const codex = source('github-releases:openai/codex');
    const healthy = routeFetcher(routes());
    const failing: SourceFetcher = async (url, headers, hosts) => {
      if (url === urlOf(codex)) throw new SafeFetchError('http_status', 'Réponse HTTP 503', 503);
      return healthy(url, headers, hosts);
    };
    const first = await collectWith(failing);
    expect(first.runs.find((run) => run.sourceId === codex.id)?.status).toBe('failed');

    const second = await collect(routes());
    expect(second.runs.map((run) => run.sourceId)).not.toContain(codex.id);
    expect(second.skipped).toEqual([
      expect.objectContaining({ sourceId: codex.id, reason: 'retry_scheduled', lastError: expect.stringContaining('503') }),
    ]);
  });

  it('base au schéma d’un jalon précédent : migrations en attente détectées', async () => {
    const journal = readJournal();
    expect(await pendingMigrations(t.database.client, journal)).toBe(0);
    const later = { entries: [...journal.entries, { when: journal.entries.at(-1)!.when + 1, tag: '9999_test' }] };
    expect(await pendingMigrations(t.database.client, later)).toBe(1);
  });

  it('préversion recréée en version stable avec un nouvel identifiant : la version passe stable, une seule actualité ; plus rien à rattraper ensuite', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as Array<Record<string, unknown>>;
    releases[0]!.prerelease = true;
    expect((await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases) }, [claude])).runs[0]?.newNewsItems).toBe(4);

    const recreated = releases.map((release, i) => (i === 0 ? { ...release, id: 999000077, prerelease: false } : release));
    const second = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(recreated) }, [claude]);
    expect(second.runs[0]).toMatchObject({ status: 'succeeded', newNewsItems: 1 });
    const version = await t.database.client.execute(
      "select v.is_prerelease, s.external_id from product_version v join source_document s on s.id = v.source_document_id where v.version = '2.1.312'",
    );
    expect(version.rows.map((row) => [Number(row.is_prerelease), row.external_id])).toEqual([[0, '999000077']]);
    expect(await scalar(t.database, "select count(*) from news_item where title = 'Claude Code 2.1.312'")).toBe(1);

    // L'ancienne préversion n'est plus rattachée à rien : elle n'est pas recomptée à chaque collecte.
    const third = await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(recreated) }, [claude]);
    const detail = await t.database.client.execute({
      sql: "select json_extract(detail, '$.caughtUpDocuments') as n from run_step where run_id = ? and name = 'store'",
      args: [third.runs[0]!.runId],
    });
    expect(Number(detail.rows[0]?.n)).toBe(0);
  });

  it('release stable repassée en préversion, puis date corrigée : la version suit son document, l’actualité est conservée', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    await collect(routes(), [claude]);
    const releases = JSON.parse(fixture(FIXTURES[claude.id]!)) as Array<Record<string, unknown>>;
    releases[0]!.prerelease = true;
    releases[0]!.published_at = '2026-10-28T08:00:00Z';
    await collect({ ...routes(), [urlOf(claude)]: JSON.stringify(releases) }, [claude]);
    const version = await t.database.client.execute("select is_prerelease, released_at from product_version where version = '2.1.312'");
    expect(version.rows.map((row) => [Number(row.is_prerelease), row.released_at])).toEqual([[1, '2026-10-28T08:00:00.000Z']]);
    expect(await scalar(t.database, "select count(*) from news_item where title = 'Claude Code 2.1.312'")).toBe(1);
  });

  it('réponse vide après une collecte réussie : pas de « trou possible »', async () => {
    const claude = source('github-releases:anthropics/claude-code');
    await collect(routes(), [claude]);
    const empty = await collect({ ...routes(), [urlOf(claude)]: '[]' }, [claude]);
    expect(empty.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 0, possibleGap: false });
  });

  it('collecte restreinte à une source : le job en attente d’une autre source n’est pas touché', async () => {
    const changelog = source('feed:github-changelog');
    const claude = source('github-releases:anthropics/claude-code');
    const start = Date.parse('2026-10-30T01:00:00.000Z');
    const at = (minutes: number) => () => new Date(start + minutes * 60_000);
    await runCollect({
      database: t.database,
      fetcher: async () => {
        throw new SafeFetchError('network', 'Réseau indisponible');
      },
      mode: 'live',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [changelog],
      clock: at(0),
    });
    const before = (await t.database.client.execute("select status, attempts from job where source_id = 'feed:github-changelog'")).rows[0];

    const summary = await runCollect({
      database: t.database,
      fetcher: routeFetcher(routes()),
      mode: 'fixture',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [claude],
      clock: at(5),
    });
    expect(summary.runs.map((run) => run.sourceId)).toEqual([claude.id]);
    const after = (await t.database.client.execute("select status, attempts from job where source_id = 'feed:github-changelog'")).rows[0];
    expect(after).toEqual(before);
    expect(await scalar(t.database, "select count(*) from run where source_id = 'feed:github-changelog' and mode = 'fixture'")).toBe(0);
  });

  it('produit renommé dans la configuration : la fiche produit suit la configuration', async () => {
    const claude = source('github-releases:anthropics/claude-code') as GithubReleasesSource;
    await collect(routes(), [claude]);
    const renamed: GithubReleasesSource = { ...claude, product: { ...claude.product, name: 'Claude Code CLI' } };
    await collect(routes(), [renamed]);
    const product = await t.database.client.execute('select name from product');
    expect(product.rows.map((row) => row.name)).toEqual(['Claude Code CLI']);
  });
});

describe('normalizeVersion', () => {
  it.each([
    ['v2.1.314', '2.1.314'],
    ['rust-v0.166.0', '0.166.0'],
    ['rust-v0.166.0-alpha.6', '0.166.0-alpha.6'],
    ['v0.67.0-nightly.20261030.gb633c0703', '0.67.0-nightly.20261030.gb633c0703'],
    ['release-2026', 'release-2026'],
    ['v1.2.3.4', '1.2.3.4'],
    ['release-1.2.3.4', '1.2.3.4'],
    ['v1.2.3-rc.1+build.5', '1.2.3-rc.1+build.5'],
    ['v1.2.3+build.5', '1.2.3+build.5'],
    ['1.2.3.4.5', '1.2.3.4.5'],
  ])('%s → %s', (tag, expected) => {
    expect(normalizeVersion(tag)).toBe(expected);
  });
});
