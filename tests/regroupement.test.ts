import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DUREE_MEMOIRE_MS, memoireRegroupement, type MemoireRegroupement } from '../src/catalog/link.ts';
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

  const APPLE = ["Apple's new smart home lineup includes a smart lock, thermostat, and video doorbells", 'The new Apple Home Collection includes a video doorbell, smart lock, and more'] as const;
  const etat = async () => (await t.database.client.execute(`select (select count(*) from news_item) n, (select group_concat(role, ',') from (select role from news_item_document order by role)) roles`)).rows[0];

  it('une collecte annulée ne laisse aucune actualité fantôme dans la mémoire du passage', async () => {
    const a = flux('a', 'techcrunch.com');
    const b = flux('b', 'www.theverge.com');
    const routes = { 'https://techcrunch.com/feed': rss(APPLE[0], 'https://techcrunch.com/apple-home'), 'https://www.theverge.com/feed': rss(APPLE[1], 'https://www.theverge.com/apple-home') };
    // La première transaction du passage crée son actualité puis échoue : la seconde source ne doit pas s'y rattacher.
    let transactions = 0;
    await runCollect({
      database: t.database, fetcher: routeFetcher(routes), mode: 'fixture', workerId: 'w', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions: [a, b],
      hooks: { insideStoreTransaction: async () => { if (++transactions === 1) throw new Error('arrêt simulé'); } },
    });
    expect(transactions).toBe(2);
    expect(await etat()).toMatchObject({ n: 1, roles: 'primary' });
  });

  it('la mémoire du passage est relue après son délai, pour voir ce qu’un autre passage a écrit', async () => {
    const a = flux('a', 'www.intc.com');
    const b = flux('b', 'techcrunch.com');
    const c = flux('c', 'www.theverge.com');
    const routes = {
      'https://www.intc.com/feed': rss('Intel Reports Third-Quarter 2026 Financial Results', 'https://www.intc.com/results'),
      'https://techcrunch.com/feed': rss(APPLE[0], 'https://techcrunch.com/apple-home'),
      'https://www.theverge.com/feed': rss(APPLE[1], 'https://www.theverge.com/apple-home'),
    };
    const debut = Date.parse('2026-11-05T10:00:00.000Z');
    const collecte = (definitions: FeedSource[], minute: number, regroupement?: MemoireRegroupement) =>
      runCollect({
        database: t.database, fetcher: routeFetcher(routes), mode: 'fixture', workerId: 'w', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions,
        clock: () => new Date(debut + minute * 60_000), ...(regroupement ? { regroupement } : {}),
      });
    const memoire = memoireRegroupement();
    await collecte([a], 0, memoire); // la mémoire est lue ici
    await collecte([b], 1); // un autre passage écrit l'annonce d'Apple
    await collecte([c], 1 + DUREE_MEMOIRE_MS / 60_000, memoire);
    expect(await etat()).toMatchObject({ n: 2, roles: 'primary,primary,supporting' });
  });
});
