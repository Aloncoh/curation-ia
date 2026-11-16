// Registre d'accès des sources (2026-11-05) : classement de l'observé, Retry-After, reprises espacées, jamais d'abandon.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classerEchec, ECHECS_AVANT_SONDE_HEBDOMADAIRE, lireRetryAfter, prochainEssai } from '../src/collect/acces.ts';
import { SOURCES, syncDifferees, syncSources, type SourceDefinition } from '../src/sources.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

const T = Date.parse('2026-11-05T12:00:00.000Z');
const dans = (iso: string) => (Date.parse(iso) - T) / 60_000;

describe('registre d’accès', () => {
  it('classe ce qui est observé, sans jamais en déduire une restriction contractuelle', () => {
    expect(classerEchec({ kind: 'http_status', status: 403 })).toBe('refus_acces');
    expect(classerEchec({ kind: 'http_status', status: 406 })).toBe('refus_acces');
    expect(classerEchec({ kind: 'http_status', status: 429 })).toBe('limitation_frequence');
    expect(classerEchec({ kind: 'http_status', status: 410 })).toBe('page_supprimee');
    expect(classerEchec({ kind: 'http_status', status: 404 })).toBe('page_supprimee');
    expect(classerEchec({ kind: 'http_status', status: 500 })).toBe('erreur_temporaire');
    expect(classerEchec({ kind: 'timeout' })).toBe('erreur_temporaire');
    expect(classerEchec({ kind: 'invalid_response' })).toBe('absence_de_flux');
  });

  it('lit Retry-After en secondes ou en date HTTP', () => {
    expect(lireRetryAfter('120', T)).toBe(120_000);
    expect(lireRetryAfter('Thu, 05 Nov 2026 13:00:00 GMT', T)).toBe(3_600_000);
    expect(lireRetryAfter(undefined, T)).toBeNull();
    expect(lireRetryAfter('plus tard', T)).toBeNull();
  });

  it('espace les reprises, respecte Retry-After et passe à une sonde hebdomadaire sans jamais abandonner', () => {
    expect(dans(prochainEssai('erreur_temporaire', 1, T))).toBe(15);
    expect(dans(prochainEssai('erreur_temporaire', 3, T))).toBe(60);
    expect(dans(prochainEssai('erreur_temporaire', 8, T))).toBe(24 * 60);
    expect(dans(prochainEssai('limitation_frequence', 1, T, 2 * 3_600_000))).toBe(120);
    expect(dans(prochainEssai('limitation_frequence', 1, T, 60_000))).toBe(30);
    expect(dans(prochainEssai('refus_acces', 1, T))).toBe(24 * 60);
    expect(dans(prochainEssai('erreur_temporaire', ECHECS_AVANT_SONDE_HEBDOMADAIRE + 1, T))).toBe(7 * 24 * 60);
  });

  it('une source différée reste au registre avec son état, son motif et sa date', () => {
    const differees = SOURCES.filter((s) => s.differee);
    expect(differees.length).toBeGreaterThan(0);
    for (const s of differees) {
      expect(s.differee!.motif.length).toBeGreaterThan(10);
      expect(s.differee!.depuis).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('la chaîne YouTube AI Search est différée : son flux est interdit par le robots.txt de YouTube (décision du 2026-11-16)', () => {
    const s = SOURCES.find((x) => x.id === 'feed:youtube-ai-search')!;
    expect(s.differee).toMatchObject({ etat: 'refus_acces', depuis: '2026-11-16', motif: expect.stringContaining('robots.txt') });
    expect(s.differee!.alternative).toContain('YouTube Data API');
  });
});

describe('registre : sources différées', () => {
  let t: TestDb;
  beforeEach(async () => { t = await createTestDb(); });
  afterEach(() => t.cleanup());

  it('une source différée est écrite au registre sans passer par la collecte, et seulement quand quelque chose a changé', async () => {
    const differees = SOURCES.filter((s) => s.differee);
    // Avant d'être différée, la chaîne AI Search était au registre, active.
    const { differee: _avant, ...active } = SOURCES.find((s) => s.id === 'feed:youtube-ai-search')!;
    await syncSources(t.database, [active as SourceDefinition], '2026-11-04T10:00:00.000Z');
    const lire = async () => (await t.database.client.execute(`select active, acces_etat, acces_detail from source where id = 'feed:youtube-ai-search'`)).rows[0]!;
    expect(Number((await lire()).active)).toBe(1);

    expect(await syncDifferees(t.database, '2026-11-17T00:00:00.000Z')).toBe(differees.length);
    expect(await lire()).toMatchObject({ active: 0, acces_etat: 'refus_acces', acces_detail: expect.stringContaining('robots.txt') });
    const inactives = await t.database.client.execute('select count(*) as n from source where active = 0');
    expect(Number(inactives.rows[0]!.n)).toBe(differees.length);
    // Second passage : rien n'a changé, rien n'est écrit.
    expect(await syncDifferees(t.database, '2026-11-17T01:00:00.000Z')).toBe(0);
  });
});
