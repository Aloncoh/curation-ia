import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memeSujet } from '../src/catalog/regroupement.ts';
import type { FeedSource } from '../src/sources.ts';
import { runCollect } from '../src/worker/collect.ts';
import { createTestDb, routeFetcher, type TestDb } from './helpers/db.ts';

describe('même sujet (titres réels du 2026-11-05)', () => {
  it('reconnaît une même annonce vue par deux journaux ou deux sources', () => {
    expect(memeSujet("Apple's new smart home lineup includes a smart lock, thermostat, and video doorbells", 'The new Apple Home Collection includes a video doorbell, smart lock, and more')).toBe(true);
    expect(memeSujet('Welcome FLUX.3 Image Klein in Diffusers', 'FLUX 3 Image Klein in ComfyUI: 5.6B Open Weights')).toBe(true);
  });

  it('ne confond pas deux entreprises qui publient le même gabarit de communiqué', () => {
    expect(memeSujet('AMD Reports Third Quarter 2026 Financial Results', 'Intel Reports Third-Quarter 2026 Financial Results')).toBe(false);
    expect(memeSujet('NVIDIA and Oracle Expand NVIDIA Vera Rubin to Multi-Gigawatt Scale', 'Google Cloud and NVIDIA Announce General Availability of NVIDIA Vera Rubin Infrastructure')).toBe(false);
    expect(memeSujet('The latest AI news we announced in September 2026', 'The latest AI news we announced in June 2026')).toBe(false);
  });
});

const rss = (titre: string, lien: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><item><title>${titre}</title><link>${lien}</link><pubDate>Wed, 04 Nov 2026 10:00:00 +0000</pubDate><description>Texte.</description></item></channel></rss>`;
const flux = (id: string, host: string): FeedSource => ({ id: `feed:${id}`, kind: 'feed', name: id, config: { url: `https://${host}/feed`, maxItems: 20, linkHosts: [host] }, allowedHosts: [host], fetchIntervalMinutes: 60 });

let t: TestDb;
beforeEach(async () => { t = await createTestDb(); });
afterEach(() => t.cleanup());

describe('regroupement à la collecte', () => {
  it("une même annonce sur deux sources donne une seule actualité, renforcée par le second document", async () => {
    const a = flux('a', 'techcrunch.com');
    const b = flux('b', 'www.theverge.com');
    const routes = {
      'https://techcrunch.com/feed': rss("Apple's new smart home lineup includes a smart lock, thermostat, and video doorbells", 'https://techcrunch.com/apple-home'),
      'https://www.theverge.com/feed': rss('The new Apple Home Collection includes a video doorbell, smart lock, and more', 'https://www.theverge.com/apple-home'),
    };
    const collecte = () => runCollect({ database: t.database, fetcher: routeFetcher(routes), mode: 'fixture', workerId: 'w', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions: [a, b] });
    await collecte();
    await collecte(); // une seconde collecte ne recrée rien
    const r = await t.database.client.execute(`select (select count(*) from news_item) n, (select group_concat(role, ',') from (select role from news_item_document order by role)) roles`);
    expect(r.rows[0]).toMatchObject({ n: 1, roles: 'primary,supporting' });
  });
});
