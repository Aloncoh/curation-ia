import { describe, expect, it } from 'vitest';
import { compteRetenu } from '../src/analysis/pipeline.ts';
import { SOURCES } from '../src/sources.ts';

describe('agent imposé par la source', () => {
  it("Radar garde les annonces des grandes entreprises, sauf la sortie d'un modèle, qui reste à Nodi", () => {
    expect(compteRetenu('radar', 'pyxo')).toBe('radar');
    expect(compteRetenu('radar', 'nodi')).toBe('nodi');
    expect(compteRetenu('nodi', 'repo')).toBe('nodi');
    expect(compteRetenu(null, 'mova')).toBe('mova');
  });

  it('les flux des grandes entreprises sont signés par Radar', () => {
    const radar = SOURCES.filter((s) => s.compte === 'radar').map((s) => s.id);
    for (const id of ['google-blog', 'samsung-newsroom', 'intel-press', 'shopify-press', 'nvidia-newsroom', 'apple-newsroom', 'amazon-news', 'microsoft-source', 'amd-press', 'meta-newsroom', 'techcrunch-tesla', 'techcrunch-tsmc', 'techcrunch-qualcomm', 'techcrunch-broadcom', 'techcrunch-oracle', 'techcrunch-lg', 'verge-tesla', 'verge-lg'])
      expect(radar).toContain(`feed:${id}`);
  });
});
