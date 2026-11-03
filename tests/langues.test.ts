// Langues de l'interface (ADR 0012) : choix mémorisé, langue du navigateur, anglais en secours, sens d'écriture, et
// catalogues complets dans les trois langues.
import { describe, expect, it } from 'vitest';
import { CATALOGUES, codesAcceptLanguage, langueDepuisCode, resoudreLangue, sensDe } from '../packages/textes/src/index.ts';

describe('choix de la langue', () => {
  it('suit le choix mémorisé avant la langue du navigateur', () => {
    expect(resoudreLangue('he', ['fr-FR', 'en'])).toEqual({ langue: 'he', source: 'choix' });
    expect(resoudreLangue('fr', [])).toEqual({ langue: 'fr', source: 'choix' });
  });

  it('prend la première langue du navigateur disponible, poids compris', () => {
    expect(resoudreLangue(undefined, codesAcceptLanguage('de-DE,de;q=0.9,he-IL;q=0.8,fr;q=0.7'))).toEqual({ langue: 'he', source: 'navigateur' });
    expect(resoudreLangue(undefined, codesAcceptLanguage('en;q=0.5, fr-CA'))).toEqual({ langue: 'fr', source: 'navigateur' });
    expect(langueDepuisCode('iw')).toBe('he');
  });

  it('retombe sur l\'anglais : langue indisponible, en-tête absent, choix invalide, poids nul', () => {
    expect(resoudreLangue(undefined, codesAcceptLanguage('de-DE,ja;q=0.8'))).toEqual({ langue: 'en', source: 'secours' });
    expect(resoudreLangue(undefined, codesAcceptLanguage(null))).toEqual({ langue: 'en', source: 'secours' });
    expect(resoudreLangue('xx', codesAcceptLanguage('he;q=0, de'))).toEqual({ langue: 'en', source: 'secours' });
    expect(codesAcceptLanguage('*,fr;q=abc')).toEqual([]);
  });

  it('écrit l\'hébreu de droite à gauche, l\'anglais et le français de gauche à droite', () => {
    expect([sensDe('he'), sensDe('fr'), sensDe('en')]).toEqual(['rtl', 'ltr', 'ltr']);
  });
});

describe('catalogues', () => {
  const cles = (o: unknown, prefixe = ''): string[] =>
    o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => (typeof v === 'function' ? [`${prefixe}${k}()`] : cles(v, `${prefixe}${k}.`).length ? cles(v, `${prefixe}${k}.`) : [`${prefixe}${k}`])) : [];

  it('ont les mêmes clés dans les trois langues', () => {
    expect(cles(CATALOGUES.fr)).toEqual(cles(CATALOGUES.en));
    expect(cles(CATALOGUES.he)).toEqual(cles(CATALOGUES.en));
  });

  it('sont vraiment traduits et ne montrent aucun jalon', () => {
    expect(CATALOGUES.he.post.voirOriginal).toMatch(/[֐-׿]/u);
    expect(CATALOGUES.fr.post.voirOriginal).toBe('Voir l’original');
    expect(CATALOGUES.en.post.voirOriginal).toBe('Show original');
    expect(JSON.stringify(CATALOGUES)).not.toMatch(/\bP\d{1,2}\b/);
  });
});
