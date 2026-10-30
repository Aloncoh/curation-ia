// Ouverture de la base : un fichier SQLite en local, ou une base Turso distante avec le même code.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export type Db = LibSQLDatabase<typeof schema>;
/** Transaction Drizzle : même interface de requêtes que la base. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;

export interface Database {
  client: Client;
  db: Db;
  close(): void;
}

export function openDatabase(url: string, busyTimeoutMs: number): Database {
  if (url.startsWith('file:')) {
    const path = url.slice('file:'.length);
    if (path !== '' && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  }
  // `timeout` = attente maximale sur un verrou SQLite local, appliquée à chaque connexion du client.
  // Le mode de journalisation reste celui par défaut (pas de WAL) : voir docs/decisions/0002.
  const client = createClient({ url, timeout: busyTimeoutMs });
  const db = drizzle(client, { schema });
  return { client, db, close: () => client.close() };
}

/** Vrai si les migrations ont été appliquées (la table des sources existe). */
export async function isInitialized(client: Client): Promise<boolean> {
  const result = await client.execute("select name from sqlite_master where type = 'table' and name = 'source'");
  return result.rows.length > 0;
}
