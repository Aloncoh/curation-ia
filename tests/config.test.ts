import { describe, expect, it } from 'vitest';
import { describeDatabaseUrl, loadConfig, redactSecrets } from '../src/config.ts';

describe('configuration', () => {
  it('valeurs par défaut prudentes', () => {
    expect(loadConfig({})).toMatchObject({
      databaseUrl: 'file:data/curation.db',
      maxAttempts: 3,
      leaseMs: 300_000,
      fixturePath: null,
      testHoldInStoreMs: 0,
    });
  });

  it('refuse zéro tentative, un bail nul ou une valeur non entière', () => {
    expect(() => loadConfig({ CURATION_MAX_ATTEMPTS: '0' })).toThrow();
    expect(() => loadConfig({ CURATION_LEASE_MS: '0' })).toThrow();
    expect(() => loadConfig({ CURATION_FETCH_TIMEOUT_MS: '1.5' })).toThrow();
  });

  it("ignore le point d'arrêt de test hors mode fixture", () => {
    expect(loadConfig({ CURATION_TEST_HOLD_IN_STORE_MS: '5000' }).testHoldInStoreMs).toBe(0);
    expect(loadConfig({ CURATION_FIXTURE: 'f.json', CURATION_TEST_HOLD_IN_STORE_MS: '5000' }).testHoldInStoreMs).toBe(5000);
  });

  it("supprime les espaces autour de l'URL de base", () => {
    expect(loadConfig({ DATABASE_URL: '  file:data/autre.db ' }).databaseUrl).toBe('file:data/autre.db');
  });
});

describe('protection des secrets', () => {
  it('masque un jeton ou des identifiants dans un message d’erreur', () => {
    const message = redactSecrets("URL_INVALID: The URL ' libsql://my-db.turso.io?authToken=eyJSECRETTOKEN' is not in a valid format");
    expect(message).not.toContain('eyJSECRETTOKEN');
    expect(message).toContain('authToken=***');
    expect(redactSecrets('https://user:motdepasse@example.org/x')).not.toContain('motdepasse');
    expect(redactSecrets('Authorization: Bearer abc.def')).not.toContain('abc.def');
    expect(redactSecrets('clé sk-ant-api03-abcdef')).not.toContain('abcdef');
    expect(redactSecrets('clé sk-0123456789abcdef refusée')).toBe('clé *** refusée');
    expect(redactSecrets('plan risk-management-2026')).toBe('plan risk-management-2026');
  });

  it("décrit l'URL de base sans jeton", () => {
    expect(describeDatabaseUrl('libsql://db.turso.io?authToken=abc')).toBe('libsql://db.turso.io');
    expect(describeDatabaseUrl('file:data/curation.db')).toBe('file:data/curation.db');
  });
});
