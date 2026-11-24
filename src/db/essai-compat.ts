// Essai de compatibilité d'une base libSQL candidate (2026-11-22, ADR 0020). Avant de confier le projet à un autre
// hébergeur que Turso (Bunny Database…), on vérifie sur une base VIDE ce que la chaîne et le site exigent vraiment :
// les migrations du projet (index partiels, contraintes, table FTS5), les transactions interactives, les lots, la
// lecture après écriture depuis une autre connexion, et les délais. L'essai n'écrit que dans la base qu'on lui désigne ;
// il supprime ses tables `essai_*` et sa ligne de recherche en sortant. Il refuse une base qui contient des publications.
import { setTimeout as attendre } from 'node:timers/promises';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { redactSecrets } from '../config.ts';
import type { Database } from './client.ts';
import { runMigrations } from './migrate.ts';

export interface ResultatEssai {
  nom: string;
  ok: boolean;
  /** Un échec bloquant interdit la bascule ; un échec non bloquant demande une décision (réglage, contournement). */
  bloquant: boolean;
  detail: string;
  ms: number;
}

export interface OptionsEssai {
  /** Adresse et jeton de la base essayée, pour ouvrir une seconde connexion. */
  url: string;
  authToken: string | null;
  /** Durée pendant laquelle une transaction d'écriture reste ouverte : les hébergeurs la limitent. */
  attenteLongueMs?: number;
  /** Nombre de mesures par délai, et de lectures après écriture. */
  repetitions?: number;
}

/** Au-delà, une transaction de la taille d'une collecte dépasserait la limite annoncée par Bunny (5 secondes). */
export const TRANSACTION_MAX_MS = 5_000;

const mediane = (valeurs: number[]): number => [...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)] ?? 0;

export async function essayerBase(database: Database, o: OptionsEssai): Promise<ResultatEssai[]> {
  const { client, db } = database;
  const repetitions = o.repetitions ?? 20;
  const resultats: ResultatEssai[] = [];
  const essai = async (nom: string, bloquant: boolean, f: () => Promise<string>): Promise<boolean> => {
    const debut = performance.now();
    try {
      const detail = await f();
      resultats.push({ nom, ok: true, bloquant, detail, ms: Math.round(performance.now() - debut) });
      return true;
    } catch (e) {
      const detail = redactSecrets(e instanceof Error ? e.message : String(e)).slice(0, 300);
      resultats.push({ nom, ok: false, bloquant, detail, ms: Math.round(performance.now() - debut) });
      return false;
    }
  };
  const nombre = async (requete: string): Promise<number> => Number((await client.execute(requete)).rows[0]?.n ?? 0);

  await essai('connexion', true, async () => `SQLite ${String((await client.execute('select sqlite_version() as v')).rows[0]!.v)}`);
  if (!resultats[0]!.ok) return resultats;

  const libre = await essai('base vide ou déjà préparée', true, async () => {
    const tables = (await client.execute(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`)).rows.map((r) => String(r.name));
    if (tables.includes('post') && (await nombre('select count(*) as n from post')) > 0) throw new Error('la base contient déjà des publications : essai refusé');
    return tables.length === 0 ? 'base vide' : `${tables.length} table(s) déjà présentes, aucune publication`;
  });
  if (!libre) return resultats;

  try {
    const migree = await essai('migrations du projet', true, async () => {
      await runMigrations(database);
      return `${await nombre(`select count(*) as n from sqlite_master where type = 'table' and name not like 'sqlite_%'`)} tables`;
    });

    await client.execute('drop table if exists essai_decision');
    await client.execute('drop table if exists essai_compteur');
    await essai('index partiel, insertion ciblée et RETURNING', true, async () => {
      await client.execute(`create table essai_decision (id integer primary key autoincrement, k text not null, remplacee_le text, note integer not null check (note between 0 and 2))`);
      await client.execute(`create unique index essai_decision_uq on essai_decision (k) where remplacee_le is null`);
      const inserer = `insert into essai_decision (k, note) values ('a', 1) on conflict(k) where remplacee_le is null do nothing returning id`;
      const premiere = await client.execute(inserer);
      const seconde = await client.execute(inserer);
      if (premiere.rows.length !== 1 || seconde.rows.length !== 0) throw new Error(`insertions renvoyées : ${premiere.rows.length} puis ${seconde.rows.length}, attendu 1 puis 0`);
      return 'doublon ignoré, identifiant renvoyé';
    });

    await essai('contrainte CHECK appliquée', true, async () => {
      const acceptee = await client.execute(`insert into essai_decision (k, note) values ('hors-borne', 5)`).then(() => true, () => false);
      if (acceptee) throw new Error('une valeur hors borne a été acceptée');
      return 'valeur hors borne refusée';
    });

    await essai('dates et JSON', true, async () => {
      const r = (await client.execute(`select strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days') as d, json_extract('{"a":{"b":2}}', '$.a.b') as j`)).rows[0]!;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(r.d)) || Number(r.j) !== 2) throw new Error(`reçu ${String(r.d)} et ${String(r.j)}`);
      return String(r.d);
    });

    if (migree) {
      await essai('recherche plein texte (FTS5)', true, async () => {
        await client.execute(`delete from recherche_publication where post_id = -1`);
        await client.execute(`insert into recherche_publication (post_id, revision_id, nom, mots_cles, texte) values (-1, -1, 'essai', 'essai', 'essaicompat mistral large')`);
        try {
          const trouve = await client.execute({ sql: `select post_id from recherche_publication where recherche_publication match ?`, args: ['essaicompat'] });
          if (trouve.rows.length !== 1) throw new Error(`${trouve.rows.length} résultat(s), attendu 1`);
          return 'un texte indexé puis retrouvé';
        } finally {
          await client.execute(`delete from recherche_publication where post_id = -1`);
        }
      });
    }

    await essai('sous-requête corrélée et jointure ordonnée', true, async () => {
      const r = await client.execute(`select d.id, (select count(*) from essai_decision x where x.k = d.k) as n
        from essai_decision d cross join essai_decision e on e.id = d.id
        where not exists (select 1 from essai_decision y where y.k = 'absent') order by d.id`);
      if (r.rows.length !== 1 || Number(r.rows[0]!.n) !== 1) throw new Error(`${r.rows.length} ligne(s)`);
      return 'résultat attendu';
    });

    await essai('transaction interactive (validée, puis annulée)', true, async () => {
      const tx = await client.transaction('write');
      try {
        await tx.execute(`insert into essai_decision (k, note) values ('tx', 1)`);
        const vue = await tx.execute(`select count(*) as n from essai_decision where k = 'tx'`);
        if (Number(vue.rows[0]!.n) !== 1) throw new Error('la transaction ne voit pas sa propre écriture');
        await tx.commit();
      } finally {
        tx.close();
      }
      const annulee = await client.transaction('write');
      try {
        await annulee.execute(`insert into essai_decision (k, note) values ('annulee', 1)`);
        await annulee.rollback();
      } finally {
        annulee.close();
      }
      const [gardee, perdue] = [await nombre(`select count(*) as n from essai_decision where k = 'tx'`), await nombre(`select count(*) as n from essai_decision where k = 'annulee'`)];
      if (gardee !== 1 || perdue !== 0) throw new Error(`validée : ${gardee}, annulée : ${perdue}`);
      return 'écriture validée gardée, écriture annulée absente';
    });

    await essai('lot atomique', true, async () => {
      const refuse = await client.batch([`insert into essai_decision (k, note) values ('lot-refuse', 1)`, `insert into essai_decision (k, note) values ('lot-refuse-2', 5)`], 'write').then(() => false, () => true);
      if (!refuse || (await nombre(`select count(*) as n from essai_decision where k like 'lot-refuse%'`)) !== 0) throw new Error('un lot en échec a laissé des lignes');
      await client.batch([`insert into essai_decision (k, note) values ('lot-1', 1)`, `insert into essai_decision (k, note) values ('lot-2', 2)`], 'write');
      if ((await nombre(`select count(*) as n from essai_decision where k like 'lot-_'`)) !== 2) throw new Error('lot valide incomplet');
      return 'lot en échec entièrement annulé, lot valide écrit';
    });

    await essai('transaction Drizzle', true, async () => {
      const vu = await db.transaction(async (tx) => {
        await tx.run(sql`insert into essai_decision (k, note) values ('drizzle', 1)`);
        return tx.all<{ n: number }>(sql`select count(*) as n from essai_decision where k = 'drizzle'`);
      });
      if (Number(vu[0]?.n) !== 1) throw new Error('écriture non vue dans la transaction');
      return 'écriture et lecture dans la même transaction';
    });

    const attente = o.attenteLongueMs ?? 6_000;
    await essai(`transaction d'écriture gardée ouverte ${attente} ms`, false, async () => {
      const tx = await client.transaction('write');
      try {
        await tx.execute(`insert into essai_decision (k, note) values ('longue-1', 1)`);
        await attendre(attente);
        await tx.execute(`insert into essai_decision (k, note) values ('longue-2', 1)`);
        await tx.commit();
      } finally {
        tx.close();
      }
      return 'validée après l’attente';
    });

    await essai('lecture après écriture, depuis une autre connexion', false, async () => {
      await client.execute(`create table essai_compteur (id integer primary key, v integer not null)`);
      await client.execute(`insert into essai_compteur (id, v) values (1, -1)`);
      let enRetard = 0;
      for (let i = 0; i < repetitions; i++) {
        await client.execute({ sql: `update essai_compteur set v = ? where id = 1`, args: [i] });
        const autre = createClient({ url: o.url, ...(o.authToken ? { authToken: o.authToken } : {}) });
        try {
          if (Number((await autre.execute(`select v from essai_compteur where id = 1`)).rows[0]?.v) !== i) enRetard++;
        } finally {
          autre.close();
        }
      }
      if (enRetard > 0) throw new Error(`${enRetard} lecture(s) en retard sur ${repetitions} : une étape de la chaîne pourrait ne pas voir ce que la précédente vient d'écrire`);
      return `${repetitions} lectures à jour sur ${repetitions}`;
    });

    await essai('délais', false, async () => {
      const lectures: number[] = [];
      const ecritures: number[] = [];
      for (let i = 0; i < repetitions; i++) {
        let debut = performance.now();
        await client.execute('select 1');
        lectures.push(performance.now() - debut);
        debut = performance.now();
        await client.execute({ sql: `update essai_compteur set v = ? where id = 1`, args: [1000 + i] });
        ecritures.push(performance.now() - debut);
      }
      // Forme d'une collecte : une transaction d'une centaine de requêtes, lectures et écritures alternées.
      const debut = performance.now();
      const tx = await client.transaction('write');
      try {
        for (let i = 0; i < 60; i++) {
          await tx.execute({ sql: `select count(*) as n from essai_decision where k = ?`, args: [`collecte-${i}`] });
          await tx.execute({ sql: `insert into essai_decision (k, note) values (?, 1)`, args: [`collecte-${i}`] });
        }
        await tx.commit();
      } finally {
        tx.close();
      }
      const transaction = Math.round(performance.now() - debut);
      const mesure = `lecture simple : ${Math.round(mediane(lectures))} ms ; écriture simple : ${Math.round(mediane(ecritures))} ms ; transaction de 120 requêtes : ${transaction} ms`;
      if (transaction > TRANSACTION_MAX_MS) throw new Error(`${mesure} — au-delà de ${TRANSACTION_MAX_MS} ms, la collecte d'une source risquerait d'être coupée`);
      return mesure;
    });
  } finally {
    await client.execute('drop table if exists essai_decision').catch(() => {});
    await client.execute('drop table if exists essai_compteur').catch(() => {});
  }
  return resultats;
}
