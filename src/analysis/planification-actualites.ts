// Planification des actualités rédigées par l'agent du site (SPEC §7.4) : la relecture humaine des premiers brouillons
// est faite (2026-11-02, « Les 3 sont OK »), donc un brouillon sans écart détecté par le code (`controle_automatique`,
// publication `brouillon`) passe `en_attente` avec un jour prévu sous le plafond partagé. Un brouillon « à vérifier »
// reste hors du planning jusqu'à sa relecture. Rien n'est publié ici : la publication réelle arrive en P5.
import type { Database } from '../db/client.ts';
import { indexer } from '../recherche/index.ts';
import { ecrirePlacement, jourParis, lireReglagesPlanning, occupationParJour, placer, renumeroter, type APlacer, type Placement } from '../ressources/planification.ts';
import { prioriteEditoriale } from '../selection/consignes.ts';

export async function planifierActualites(database: Database, now: string): Promise<{ postId: number; placement: Placement }[]> {
  const reglages = await lireReglagesPlanning(database.db);
  const tx = await database.client.transaction('write');
  try {
    const r = await tx.execute(`
      select p.id, rv.id as revision_id, rv.content
      from post p
      join news_item n on n.id = p.news_item_id and n.kind in ('annonce', 'version')
      join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
      where p.status = 'brouillon' and not exists (select 1 from publication_planifiee pp where pp.post_id = p.id)
      order by p.id`);
    const resultats: { postId: number; placement: Placement }[] = [];
    for (const row of r.rows) {
      const contenu = JSON.parse(String(row.content)) as { nature?: string | null; categories?: string[] };
      const a: APlacer = { postId: Number(row.id), priorite: prioriteEditoriale(contenu.nature ?? null, contenu.categories ?? []), statutSortie: 'actualite', ordre: Number(row.id) };
      // Une place à la fois : chaque placement compte dans l'occupation du suivant.
      const placement = placer([a], await occupationParJour(tx), jourParis(now), reglages)[0]!;
      await tx.execute({ sql: `update post set status = 'en_attente' where id = ?`, args: [a.postId] });
      await ecrirePlacement(tx, placement, a, now);
      await renumeroter(tx, [placement.jour]);
      await indexer(tx, a.postId, Number(row.revision_id));
      resultats.push({ postId: a.postId, placement });
    }
    await tx.commit();
    return resultats;
  } finally {
    tx.close();
  }
}
