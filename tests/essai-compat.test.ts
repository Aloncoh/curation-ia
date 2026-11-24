// Essai de compatibilité d'une base candidate (src/db/essai-compat.ts), exercé ici sur une base SQLite locale vide.
// L'essai réel sur un hébergeur (Bunny Database) se lance avec `npm run base:essai`, une fois le compte créé.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Database } from '../src/db/client.ts';
import { essayerBase } from '../src/db/essai-compat.ts';

let dossier: string;
let url: string;
let database: Database;
beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'curation-essai-'));
  url = `file:${join(dossier, 'essai.db')}`;
  database = openDatabase(url, 5_000);
});
afterEach(() => {
  database.close();
  rmSync(dossier, { recursive: true, force: true });
});

const lancer = () => essayerBase(database, { url, authToken: null, attenteLongueMs: 10, repetitions: 3 });

describe('essai de compatibilité d’une base candidate', () => {
  it('sur une base vide : tous les essais passent, et rien ne reste de l’essai', async () => {
    const resultats = await lancer();
    expect(resultats.filter((r) => !r.ok)).toEqual([]);
    expect(resultats.map((r) => r.nom)).toContain('recherche plein texte (FTS5)');
    expect(resultats.map((r) => r.nom)).toContain('transaction interactive (validée, puis annulée)');
    const restes = await database.client.execute(`select name from sqlite_master where name like 'essai_%'`);
    expect(restes.rows).toEqual([]);
    expect(Number((await database.client.execute(`select count(*) as n from recherche_publication`)).rows[0]!.n)).toBe(0);
    // Relançable : la base, déjà préparée et sans publication, est acceptée.
    expect((await lancer()).filter((r) => !r.ok)).toEqual([]);
  });

  it('refuse une base qui contient déjà des publications, sans rien y écrire', async () => {
    await database.client.execute(`create table post (id integer primary key)`);
    await database.client.execute(`insert into post default values`);
    const resultats = await lancer();
    expect(resultats.at(-1)).toMatchObject({ nom: 'base vide ou déjà préparée', ok: false, bloquant: true });
    const tables = await database.client.execute(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`);
    expect(tables.rows.map((r) => r.name)).toEqual(['post']);
  });
});
