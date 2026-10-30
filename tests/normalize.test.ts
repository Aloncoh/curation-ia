import { describe, expect, it } from 'vitest';
import { contentHash, normalizeDate, normalizeText, normalizeUrl } from '../src/collect/normalize.ts';

describe('normalizeUrl', () => {
  it('retire fragment, paramètres de suivi, port par défaut et « / » final, et trie les paramètres', () => {
    expect(normalizeUrl('https://GitHub.com:443/anthropics/claude-code/releases/tag/v2.1.312/?utm_source=x&b=2&a=1#notes')).toBe(
      'https://github.com/anthropics/claude-code/releases/tag/v2.1.312?a=1&b=2',
    );
  });

  it('laisse intacte une URL déjà canonique', () => {
    const url = 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312';
    expect(normalizeUrl(url)).toBe(url);
  });
});

describe('normalizeDate', () => {
  it('convertit en ISO 8601 UTC', () => {
    expect(normalizeDate('2026-10-27T20:24:20Z')).toBe('2026-10-27T20:24:20.000Z');
    expect(normalizeDate('2026-10-27T22:24:20+02:00')).toBe('2026-10-27T20:24:20.000Z');
  });

  it("renvoie null plutôt que d'inventer une date", () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('pas une date')).toBeNull();
  });
});

describe('normalizeText et contentHash', () => {
  it('uniformise fins de ligne et espaces de fin', () => {
    expect(normalizeText('  ligne 1  \r\nligne 2\t\r\n\n')).toBe('ligne 1\nligne 2');
  });

  it('donne la même empreinte pour le même contenu et une autre pour un contenu modifié', () => {
    const base = { title: 'v2.1.312', version: 'v2.1.312', content: 'Notes' };
    expect(contentHash(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(contentHash({ ...base })).toBe(contentHash(base));
    expect(contentHash({ ...base, content: 'Notes modifiées' })).not.toBe(contentHash(base));
  });
});
