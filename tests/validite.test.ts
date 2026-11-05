// Validité dans le temps (SPEC §7.16 ; P6 bloc 5) : version plus récente publiée, source mise à jour après le post.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { comparerVersions, lireValidite } from '../src/api/v1/validite.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  const c = t.database.client;
  await c.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'github_releases', 'S', '{}', '[]', 'x')`);
  await c.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('pyxo', 'pyxo', 'Pyxo', 'agent', 'a', 'b', 's', 1, 'x')`);
  await c.execute(`insert into product (id, key, name, publisher, created_at) values (1, 'anthropic/claude-code', 'Claude Code', 'Anthropic', 'x')`);
  await c.execute(`insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 1, 1, 1)`);
});
afterEach(() => t.cleanup());

/** Une publication de version : document, capture, actualité, version, brouillon, post, révision et source citée. */
async function versionPubliee(id: number, version: string, o: { statut?: string; preversion?: boolean } = {}) {
  const c = t.database.client;
  await c.execute({ sql: `insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (?, 's', ?, ?, ?, ?, 'x', 'x')`, args: [id, `e${id}`, `https://x/${id}`, `https://x/${id}`, `v${version}`] });
  await c.execute({ sql: `insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (?, ?, 1, 'h', 't', 'c', 'text', '2026-11-01T10:00:00.000Z')`, args: [id, id] });
  await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, status) values (?, 'version', ?, 'x', 'collected')`, args: [id, `v${version}`] });
  await c.execute({ sql: `insert into product_version (id, product_id, version, is_prerelease, created_at) values (?, 1, ?, ?, 'x')`, args: [id, version, o.preversion ? 1 : 0] });
  await c.execute({ sql: `insert into news_item_target (news_item_id, product_id, product_version_id) values (?, 1, ?)`, args: [id, id] });
  const d = await c.execute({ sql: `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, created_at) values (?, 'r', 'controle_automatique', ?, 'm', 'p', 'x') returning id`, args: [id, id] });
  await c.execute({ sql: `insert into post (id, account_id, news_item_id, evidence_level, status, created_at, published_at) values (?, 'pyxo', ?, 'documentary_analysis', ?, 'x', '2026-11-03T08:00:00.000Z')`, args: [id, id, o.statut ?? 'publie'] });
  const rv = await c.execute({ sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, 1, ?, '{}', '2026-11-02T00:00:00.000Z') returning id`, args: [id, Number(d.rows[0]!.id)] });
  await c.execute({ sql: `insert into post_source (revision_id, document_id, snapshot_id) values (?, ?, ?)`, args: [Number(rv.rows[0]!.id), id, id] });
}

describe('validité dans le temps', () => {
  it('compare les versions par leurs nombres', () => {
    expect(comparerVersions('2.1.318', '2.1.317')).toBeGreaterThan(0);
    expect(comparerVersions('2.10.0', '2.9.9')).toBeGreaterThan(0);
    expect(comparerVersions('v2.1.0', '2.1')).toBe(0);
  });

  it('une version plus récente publiée remplace les anciennes ; la plus récente n’a pas d’avis', async () => {
    await versionPubliee(1, '2.1.316');
    await versionPubliee(2, '2.1.318');
    await versionPubliee(3, '2.1.317');
    const v = await lireValidite(t.database.client, [1, 2, 3]);
    expect(v.get(1)!.remplacee_par).toEqual({ id: 2, version: '2.1.318' });
    expect(v.get(3)!.remplacee_par).toEqual({ id: 2, version: '2.1.318' });
    expect(v.get(2)!.remplacee_par).toBeNull();
  });

  it('une préversion ou une version non publiée ne remplace rien', async () => {
    await versionPubliee(1, '2.1.316');
    await versionPubliee(2, '2.2.0-beta.1', { preversion: true });
    await versionPubliee(3, '2.1.400', { statut: 'en_attente' });
    expect((await lireValidite(t.database.client, [1])).get(1)!.remplacee_par).toBeNull();
  });

  it('une capture de la source plus récente que celle citée est signalée par sa date, sans rien corriger', async () => {
    await versionPubliee(1, '2.1.316');
    expect((await lireValidite(t.database.client, [1])).get(1)!.source_mise_a_jour).toBeNull();
    // Capture plus récente, mais antérieure à la mise en ligne (2026-11-03 08:00) : rien à signaler.
    await t.database.client.execute(`insert into document_snapshot (document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 2, 'h2', 't', 'Updated', 'text', '2026-11-02T12:00:00.000Z')`);
    expect((await lireValidite(t.database.client, [1])).get(1)!.source_mise_a_jour).toBeNull();
    await t.database.client.execute(`insert into document_snapshot (document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 3, 'h3', 't', 'Resolved', 'text', '2026-11-05T09:00:00.000Z')`);
    expect((await lireValidite(t.database.client, [1])).get(1)!.source_mise_a_jour).toBe('2026-11-05T09:00:00.000Z');
    expect(String((await t.database.client.execute(`select content from post_revision where post_id = 1`)).rows[0]!.content)).toBe('{}');
  });
});
