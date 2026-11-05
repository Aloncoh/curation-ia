// Capture de la page des actualités dont le flux ne donne qu'un titre ou une accroche (2026-11-05). Aucun réseau :
// transport et résolveur injectés.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { approfondir } from '../src/collect/approfondir.ts';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

const MAINTENANT = '2026-11-05T12:00:00.000Z';
const SOURCE = 'feed:intel-press'; // hôte autorisé : www.intc.com
const PUBLIQUE: Resolver = async () => [{ address: '93.184.216.34', family: 4 }];
const ARTICLE = `<html><head><title>Intel</title></head><body><article><h1>Intel ships a new AI accelerator</h1>
<p>The accelerator runs large language models locally with lower power use, according to the announcement published today by Intel.</p>
<p>Developers can target it through the existing OpenVINO toolkit, and the first laptops that include it ship next quarter in three markets.</p>
<p>Intel says the part handles speech, image and text workloads, and that independent benchmarks will follow once partners receive samples.</p>
</article></body></html>`;

function faux(pages: Record<string, { status?: number; body: string }>): Transport & { appels: string[] } {
  const appels: string[] = [];
  const t: Transport = async (req) => {
    const url = req.url.toString();
    appels.push(url);
    const p = pages[url];
    if (!p) return { status: 404, headers: {}, body: Buffer.from('Not Found') };
    return { status: p.status ?? 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(p.body) };
  };
  return Object.assign(t, { appels });
}

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await t.database.client.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('${SOURCE}', 'feed', 'Intel', '{}', '["www.intc.com"]', 'x')`);
});
afterEach(() => t.cleanup());

/** Une actualité avec la capture du flux (`contenu`) et, si `brouillon`, son brouillon. */
async function actualite(id: number, o: { contenu: string; annonce?: string; brouillon?: [string, string | null] }) {
  const c = t.database.client;
  const url = `https://www.intc.com/news/${id}`;
  await c.execute({ sql: `insert into news_item (id, kind, title, announced_at, first_seen_at, status) values (?, 'annonce', ?, ?, ?, 'collected')`, args: [id, `Titre ${id}`, o.annonce ?? '2026-11-04T09:00:00.000Z', '2026-11-04T10:00:00.000Z'] });
  await c.execute({ sql: `insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (?, ?, ?, ?, ?, ?, 'x', 'x')`, args: [id, SOURCE, String(id), url, url, `Titre ${id}`] });
  await c.execute({ sql: `insert into news_item_document (news_item_id, document_id, role) values (?, ?, 'primary')`, args: [id, id] });
  await c.execute({ sql: `insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (?, ?, 1, 'h', ?, ?, 'text', 'x')`, args: [id, id, `Titre ${id}`, o.contenu] });
  if (o.brouillon) {
    await c.execute(`insert or ignore into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 1, 1, 1)`);
    await c.execute({ sql: `insert into post_draft (news_item_id, run_id, status, rejection_reason, snapshot_id, model, prompt_version, created_at) values (?, 'r', ?, ?, ?, 'm', 'p', 'x')`, args: [id, o.brouillon[0], o.brouillon[1], id] });
  }
  return url;
}

const lancer = (transport: Transport, max?: number) =>
  approfondir(t.database, { now: () => MAINTENANT, timeoutMs: 1000, maxBytes: 1_000_000, userAgent: 'test', ...(max ? { max } : {}), deps: { transport, resolve: PUBLIQUE } });

describe('approfondir : capture des pages', () => {
  it('capture la page d’une actualité récente au flux vide, avant toute analyse', async () => {
    const url = await actualite(1, { contenu: '' });
    const r = await lancer(faux({ [url]: { body: ARTICLE } }));
    expect(r).toMatchObject([{ newsItemId: 1, statut: 'capturee' }]);
    const capture = (await t.database.client.execute(`select seq, content from document_snapshot where document_id = 1 order by seq desc limit 1`)).rows[0]!;
    expect(capture.seq).toBe(2);
    expect(String(capture.content)).toContain('runs large language models locally');
  });

  it('laisse les actualités trop anciennes, déjà analysées ou au texte suffisant', async () => {
    await actualite(1, { contenu: '', annonce: '2026-10-01T00:00:00.000Z' });
    await actualite(2, { contenu: '', brouillon: ['ecartee', 'hors_perimetre'] });
    await actualite(3, { contenu: 'x'.repeat(500) });
    const transport = faux({});
    expect(await lancer(transport)).toEqual([]);
    expect(transport.appels).toEqual([]);
  });

  it('reprend toujours une actualité à approfondir, même ancienne, en premier', async () => {
    const recente = await actualite(1, { contenu: '' });
    const ancienne = await actualite(2, { contenu: 'Accroche.', annonce: '2026-10-01T00:00:00.000Z', brouillon: ['a_approfondir', 'preuve_partielle'] });
    const transport = faux({ [recente]: { body: ARTICLE }, [ancienne]: { body: ARTICLE } });
    expect((await lancer(transport, 1)).map((x) => x.newsItemId)).toEqual([2]);
  });

  it('une page refusée est tracée avec son adresse et n’est pas redemandée avant 24 heures', async () => {
    const url = await actualite(1, { contenu: '' });
    const transport = faux({ [url]: { status: 403, body: 'Forbidden' } });
    expect(await lancer(transport)).toMatchObject([{ statut: 'refusee' }]);
    const trace = (await t.database.client.execute(`select status, error_message from run where kind = 'approfondir'`)).rows[0]!;
    expect(trace.status).toBe('failed');
    expect(String(trace.error_message)).toMatch(new RegExp(`^${url} — `));
    expect(await lancer(transport)).toEqual([]);
    expect(transport.appels).toEqual([url]);
  });
});
