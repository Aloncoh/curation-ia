// Copie de la base locale vers une base vide (P5, préparation de Turso), essayée entre deux fichiers temporaires.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fil, recherche } from '../src/api/v1/index.ts';
import { copierBase, tablesACopier } from '../src/db/copie.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';
import { ajouterActualite, ajouterTraduction, socle } from './helpers/publications.ts';

let source: TestDb;
let cible: TestDb;
beforeEach(async () => {
  source = await createTestDb();
  cible = await createTestDb();
  await socle(source.database.client);
  const { revisionId } = await ajouterActualite(source.database.client, 1);
  await ajouterActualite(source.database.client, 2);
  await ajouterTraduction(source.database.client, revisionId, 'fr', { accroche: 'a', description: 'b', ce_que_ca_permet: 'c' });
});
afterEach(() => {
  source.cleanup();
  cible.cleanup();
});

describe('copie vers une base vide', () => {
  it('ordonne les tables selon leurs clés étrangères', async () => {
    const ordre = await tablesACopier(source.database.client);
    expect(ordre.indexOf('account')).toBeLessThan(ordre.indexOf('post'));
    expect(ordre.indexOf('post')).toBeLessThan(ordre.indexOf('post_revision'));
    expect(ordre.indexOf('post_revision')).toBeLessThan(ordre.indexOf('post_traduction'));
    expect(ordre.some((t) => t.startsWith('recherche_publication') || t.startsWith('__drizzle'))).toBe(false);
  });

  it('copie publications, planning, traductions et index : l\'API lit la copie comme l\'original', async () => {
    const bilan = await copierBase(source.database.client, cible.database.client, { lot: 1 });
    expect(bilan.find((b) => b.table === 'post')).toEqual({ table: 'post', lignes: 2 });
    expect(bilan.find((b) => b.table === 'recherche_publication')).toEqual({ table: 'recherche_publication', lignes: 2 });
    const ctx = (client = cible.database.client) => ({ client, mode: 'apercu' as const, langue: 'fr' as const, maintenant: '2026-11-03T12:00:00.000Z' });
    expect(await fil(ctx())).toEqual(await fil(ctx(source.database.client)));
    expect((await recherche(ctx(), 'widget')).total).toBe(2);
    expect(await scalar(cible.database, 'select count(*) from publication_planifiee')).toBe(2);
  });

  it('refuse de copier vers une base qui a déjà des publications', async () => {
    await copierBase(source.database.client, cible.database.client);
    await expect(copierBase(source.database.client, cible.database.client)).rejects.toThrow(/déjà des publications/);
  });
});
