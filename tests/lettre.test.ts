// Lettre d'information comme signal (TLDR AI, 2026-11-16) : dernier numéro du flux, articles du numéro, collecte en deux
// lectures sans réseau, et source déclarée.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SourceFormatError } from '../src/collect/github-releases.ts';
import { dernierNumero, parseLettre } from '../src/collect/lettre.ts';
import { SOURCES } from '../src/sources.ts';
import { adapterFor, runCollect } from '../src/worker/collect.ts';
import { createTestDb, routeFetcher, type TestDb } from './helpers/db.ts';

const FLUX = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>TLDR AI</title><link>https://tldr.tech/ai</link>
<item><title>Numéro du 12</title><link>https://tldr.tech/ai/2026-11-12</link><pubDate>Thu, 12 Nov 2026 00:00:00 GMT</pubDate></item>
<item><title>Numéro du 13</title><link>https://tldr.tech/ai/2026-11-13</link><pubDate>Fri, 13 Nov 2026 00:00:00 GMT</pubDate></item>
</channel></rss>`;

const NUMERO = `<html><body>
<a href="https://sponsor.example.com/offre?utm_source=tldrai"><h3>Une offre (Sponsor)</h3></a><div>Texte du sponsor.</div>
<a class="x" href="https://blog.example.org/modele?utm_source=tldrai&amp;id=7" target="_blank"> <h3 class="t">Un mod&#232;le qu&#x27;on attendait (14 minute read)</h3></a><div>Résumé rédigé par la lettre, jamais repris.</div>
<a href="https://blog.example.org/modele?id=7&amp;utm_source=tldrai"><h3>Le même article</h3></a>
<a href="https://tldr.tech/ai/advertise"><h3>Advertise with us</h3></a>
<a href="http://pas-https.example.org/x"><h3>Lien refusé</h3></a>
<a href="https://outil.example.net/annonce"><h3>Un outil ouvert (3 minute read)</h3></a>
<a href="https://formulaire.example.com/x"><h3>Become a founding member of TLDR's AI community (2 minute form)</h3></a>
<a href="https://ailleurs.example.net/"><p>Pas un article</p></a>
</body></html>`;

const options = { nom: 'TLDR AI', numero: 'https://tldr.tech/ai/2026-11-13', paruLe: '2026-11-13T00:00:00.000Z', maxItems: 20, hotesLettre: ['tldr.tech'] };

describe('lettre d’information comme signal', () => {
  it('prend le numéro le plus récent du flux', () => {
    expect(dernierNumero(FLUX, { maxItems: 50, linkHosts: ['tldr.tech'] })).toEqual({ url: 'https://tldr.tech/ai/2026-11-13', paruLe: '2026-11-13T00:00:00.000Z' });
  });

  it('garde le lien et le titre des articles, sans suivi ni durée de lecture ; sponsor, lien interne, doublon et lien non valide comptés', () => {
    const { documents, rejected } = parseLettre(NUMERO, options);
    expect(documents.map((d) => [d.url, d.title])).toEqual([
      ['https://blog.example.org/modele?id=7', 'Un modèle qu\'on attendait'],
      ['https://outil.example.net/annonce', 'Un outil ouvert'],
    ]);
    expect(rejected).toEqual({ sponsorise: 1, doublon: 1, lien_interne: 1, sans_article_valide: 1, promotion: 1 });
    // Capture vide : rien ne vient du texte de la lettre ; le numéro et la lettre restent en métadonnées.
    expect(documents[0]).toMatchObject({ content: '', announcedAt: '2026-11-13T00:00:00.000Z', metadata: { signal: 'lettre', lettre: 'TLDR AI', numero: 'https://tldr.tech/ai/2026-11-13' } });
    expect(JSON.stringify(documents)).not.toContain('Résumé rédigé');
  });

  it('une page sans article reconnu est une erreur de format, jamais une liste vide silencieuse', () => {
    expect(() => parseLettre('<html><body><p>Autre mise en page</p></body></html>', options)).toThrow(SourceFormatError);
  });

  it('la source TLDR AI est déclarée comme signal attribué, sans compte imposé, avec une seconde lecture', () => {
    const def = SOURCES.find((s) => s.id === 'feed:tldr-ai')!;
    expect(def).toMatchObject({ kind: 'feed', allowedHosts: ['tldr.tech'], attribution: expect.stringContaining('TLDR AI') });
    expect(def.compte).toBeUndefined();
    const suite = adapterFor(def).suite!(FLUX);
    expect(suite.url).toBe('https://tldr.tech/ai/2026-11-13');
    expect(suite.parse(NUMERO).documents).toHaveLength(2);
  });
});

describe('lettre : collecte en deux lectures', () => {
  let t: TestDb;
  beforeEach(async () => { t = await createTestDb(); });
  afterEach(() => t.cleanup());

  it('lit le flux puis la page du dernier numéro, et enregistre les articles signalés', async () => {
    const def = SOURCES.find((s) => s.id === 'feed:tldr-ai')!;
    const fetcher = routeFetcher({ 'https://tldr.tech/api/rss/ai': FLUX, 'https://tldr.tech/ai/2026-11-13': NUMERO });
    const r = await runCollect({ database: t.database, fetcher, mode: 'live', workerId: 't', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions: [def] });
    expect(fetcher.calls).toEqual(['https://tldr.tech/api/rss/ai', 'https://tldr.tech/ai/2026-11-13']);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0]).toMatchObject({ status: 'succeeded', newDocuments: 2 });
  });
});
