// Validité dans le temps (SPEC §7.16 ; P6 bloc 5, 2026-11-05), calculée à la lecture, sans appel au modèle :
// - une publication de version est « remplacée » quand une version plus récente du même produit est publiée : avis
//   visible et lien vers la nouvelle. Ce n'est pas un constat de correction : une nouvelle version ne prouve pas qu'une
//   ancienne limite est résolue, et rien n'est marqué « corrigé » ;
// - la source d'une publication est « mise à jour » quand son document a, après la mise en ligne du post, une capture
//   plus récente que celle citée (incident passé de « en cours » à « résolu », annonce modifiée) : la date est affichée,
//   la publication n'est jamais corrigée automatiquement. Une capture antérieure à la mise en ligne ne compte pas.
import type { Client } from '@libsql/client';

export interface Validite {
  remplacee_par: { id: number; version: string } | null;
  source_mise_a_jour: string | null;
}

/** Compare deux numéros de version par leurs nombres (2.1.318 > 2.1.317 ; 2.10 > 2.9) ; 0 si égaux. */
export function comparerVersions(a: string, b: string): number {
  const na = (a.match(/\d+/g) ?? []).map(Number);
  const nb = (b.match(/\d+/g) ?? []).map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] ?? 0) - (nb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export async function lireValidite(client: Client, ids: readonly number[]): Promise<Map<number, Validite>> {
  const resultat = new Map<number, Validite>(ids.map((id) => [id, { remplacee_par: null, source_mise_a_jour: null }]));
  if (ids.length === 0) return resultat;
  const marques = ids.map(() => '?').join(', ');

  // Versions publiées des produits concernés : la plus récente remplace les autres. Les préversions ne remplacent rien.
  const v = await client.execute({
    sql: `select p.id, t.product_id, pv.version
          from post p
          join news_item_target t on t.news_item_id = p.news_item_id
          join product_version pv on pv.id = t.product_version_id and pv.is_prerelease = 0
          where p.status = 'publie' and t.product_id in (
            select t2.product_id from post p2 join news_item_target t2 on t2.news_item_id = p2.news_item_id where p2.id in (${marques}))`,
    args: [...ids],
  });
  const parProduit = new Map<number, { id: number; version: string }[]>();
  for (const r of v.rows) {
    const liste = parProduit.get(Number(r.product_id)) ?? [];
    liste.push({ id: Number(r.id), version: String(r.version) });
    parProduit.set(Number(r.product_id), liste);
  }
  for (const versions of parProduit.values()) {
    const plusRecente = versions.reduce((a, b) => (comparerVersions(b.version, a.version) > 0 ? b : a));
    for (const x of versions) {
      if (resultat.has(x.id) && x.id !== plusRecente.id && comparerVersions(plusRecente.version, x.version) > 0) {
        resultat.get(x.id)!.remplacee_par = { id: plusRecente.id, version: plusRecente.version };
      }
    }
  }

  // Capture la plus récente du document principal, comparée à celle que cite la dernière révision.
  const s = await client.execute({
    sql: `select p.id,
            (select max(c2.captured_at) from document_snapshot c2 where c2.document_id = c.document_id and c2.seq > c.seq
               and c2.captured_at > coalesce(p.published_at, rv.created_at)) as plus_recente
          from post p
          join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
          join post_source ps on ps.revision_id = rv.id
          join document_snapshot c on c.id = ps.snapshot_id
          where p.id in (${marques})`,
    args: [...ids],
  });
  for (const r of s.rows) {
    if (r.plus_recente === null) continue;
    const v2 = resultat.get(Number(r.id))!;
    const date = String(r.plus_recente);
    if (!v2.source_mise_a_jour || date > v2.source_mise_a_jour) v2.source_mise_a_jour = date;
  }
  return resultat;
}
