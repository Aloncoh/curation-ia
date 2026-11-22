// Cache des lectures du site (apps/web/lib/lectures.ts, clé et durée dans cle-cache.ts). Le cache lui-même vit dans Next.js ;
// son effet est constaté sur le serveur local (docs/lectures-turso.md, section 8), pas ici.
import { describe, expect, it } from 'vitest';
import { cleDe, dureeDepuis } from '../apps/web/lib/cle-cache.ts';

describe('cache des lectures du site', () => {
  it('la clé distingue les paramètres et ignore les valeurs absentes en fin de liste', () => {
    expect(cleDe([])).toBe('[]');
    expect(cleDe([undefined])).toBe('[]');
    expect(cleDe([{ curseur: null, limite: undefined }])).toBe('[{"curseur":null}]');
    expect(cleDe(['nodi', undefined])).toBe('["nodi"]');
    expect(cleDe([82])).not.toBe(cleDe([84]));
    expect(cleDe(['mistral', { tri: 'recents' }])).not.toBe(cleDe(['mistral', { tri: 'pertinence' }]));
  });

  it('durée : 60 secondes par défaut, réglable, 0 pour désactiver, valeur aberrante ignorée', () => {
    expect(dureeDepuis({})).toBe(60);
    expect(dureeDepuis({ CURATION_SITE_CACHE_S: '300' })).toBe(300);
    expect(dureeDepuis({ CURATION_SITE_CACHE_S: '0' })).toBe(0);
    expect(dureeDepuis({ CURATION_SITE_CACHE_S: '-5' })).toBe(60);
    expect(dureeDepuis({ CURATION_SITE_CACHE_S: 'abc' })).toBe(60);
    expect(dureeDepuis({ CURATION_SITE_CACHE_S: '99999' })).toBe(60);
  });
});
