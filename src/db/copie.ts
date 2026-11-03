// Copie d'une base vers une autre (P5) : la base locale vers Turso, une fois, avant la première mise en ligne.
// Toutes les tables, dans l'ordre de leurs clés étrangères, avec leurs identifiants ; l'index FTS5 est recopié par ses
// colonnes. La cible doit être migrée et vide de publications : la copie ne remplace jamais des données en ligne.
import type { Client, InStatement } from '@libsql/client';

const INDEX_RECHERCHE = 'recherche_publication';

/** Tables ordinaires de la source, chaque table après celles qu'elle référence. */
export async function tablesACopier(source: Client): Promise<string[]> {
  const r = await source.execute(`select name, sql from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_\\_drizzle%' escape '\\' and name not like '${INDEX_RECHERCHE}%'`);
  const tables = r.rows.map((x) => String(x.name));
  const deps = new Map<string, Set<string>>();
  for (const t of tables) {
    const fk = await source.execute(`pragma foreign_key_list(${JSON.stringify(t)})`);
    deps.set(t, new Set(fk.rows.map((x) => String(x.table)).filter((d) => d !== t && tables.includes(d))));
  }
  const ordre: string[] = [];
  const restantes = new Set(tables);
  while (restantes.size) {
    const pretes = [...restantes].filter((t) => [...deps.get(t)!].every((d) => ordre.includes(d))).sort();
    if (pretes.length === 0) throw new Error(`Dépendances circulaires entre tables : ${[...restantes].join(', ')}`);
    for (const t of pretes) { ordre.push(t); restantes.delete(t); }
  }
  return ordre;
}

export interface BilanCopie {
  table: string;
  lignes: number;
}

export async function copierBase(source: Client, cible: Client, o: { lot?: number } = {}): Promise<BilanCopie[]> {
  const lot = o.lot ?? 100;
  const dejaEnLigne = await cible.execute('select count(*) as n from post');
  if (Number(dejaEnLigne.rows[0]!.n) > 0) throw new Error('La base cible contient déjà des publications : copie refusée, rien n\'est remplacé.');
  const bilan: BilanCopie[] = [];
  const copier = async (table: string, selection: string) => {
    const r = await source.execute(selection);
    const colonnes = r.columns;
    let n = 0;
    for (let i = 0; i < r.rows.length; i += lot) {
      const tranche = r.rows.slice(i, i + lot);
      const instructions: InStatement[] = tranche.map((row) => ({
        sql: `insert into ${JSON.stringify(table)} (${colonnes.map((c) => JSON.stringify(c)).join(', ')}) values (${colonnes.map(() => '?').join(', ')})`,
        args: colonnes.map((c) => row[c] ?? null),
      }));
      await cible.batch(instructions, 'write');
      n += tranche.length;
    }
    bilan.push({ table, lignes: n });
  };
  for (const table of await tablesACopier(source)) {
    // Les réglages créés par la migration (s'il y en a) sont remplacés par ceux de la source.
    if (table === 'setting') await cible.execute('delete from setting');
    await copier(table, `select * from ${JSON.stringify(table)}`);
  }
  await copier(INDEX_RECHERCHE, `select post_id, revision_id, nom, mots_cles, texte from ${INDEX_RECHERCHE}`);
  return bilan;
}
