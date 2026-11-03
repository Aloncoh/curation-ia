// Index de recherche des publications (ADR 0011 §5) : une ligne FTS5 par publication, textes déjà normalisés.
// Appelé dans la transaction qui planifie ou publie ; une nouvelle révision remplace la ligne, un retrait la supprime.
import type { Transaction } from '@libsql/client';
import { motsClesDesRevisions } from '../ressources/mots-cles.ts';
import { normaliser } from './normaliser.ts';

/** Parties du contenu stocké qui forment le texte de la publication, dans l'ordre d'affichage. */
export function textesDePublication(contenu: unknown): string[] {
  const c = contenu && typeof contenu === 'object' ? (contenu as Record<string, unknown>) : {};
  const texte = (v: unknown): string[] => {
    if (v && typeof v === 'object' && typeof (v as { texte?: unknown }).texte === 'string') return [(v as { texte: string }).texte];
    return [];
  };
  const liste = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(texte) : []);
  const demarrage = c.demarrage && typeof c.demarrage === 'object' ? (c.demarrage as Record<string, unknown>) : {};
  return [
    ...texte(c.accroche),
    ...texte(c.description),
    ...texte(c.interet),
    ...texte(c.exemple_usage),
    ...liste(demarrage.etapes),
    ...liste(c.compatibilites),
    ...liste(c.limites),
    // Sélection (complément de l'ADR 0011, 2026-11-02) : chaque ressource citée, son nom et son explication d'une ligne.
    ...(Array.isArray(c.ressources)
      ? c.ressources.flatMap((r: unknown) => {
          const e = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return [typeof e.nom === 'string' ? e.nom : '', ...texte(e.explication)];
        })
      : []),
  ].filter((t) => t.trim().length > 0);
}

/** Retire la publication de l'index. */
export async function desindexer(tx: Transaction, postId: number): Promise<void> {
  await tx.execute({ sql: 'delete from recherche_publication where post_id = ?', args: [postId] });
}

/**
 * Indexe une révision. Seules les publications `publie`, ou `en_attente` avec une ligne de planification, sont indexées :
 * jamais `brouillon`, `a_verifier`, `rejete` ni `retire`. Hors de ces cas, la publication est désindexée. Rend vrai si
 * une ligne a été écrite.
 */
export async function indexer(tx: Transaction, postId: number, revisionId: number): Promise<boolean> {
  const r = await tx.execute({
    sql: `select p.status, rv.content, exists (select 1 from publication_planifiee pp where pp.post_id = p.id) as planifiee
          from post p join post_revision rv on rv.post_id = p.id and rv.id = ? where p.id = ?`,
    args: [revisionId, postId],
  });
  const ligne = r.rows[0];
  if (!ligne) throw new Error(`Révision ${revisionId} introuvable pour la publication ${postId}.`);
  const statut = String(ligne.status);
  const indexable = statut === 'publie' || (statut === 'en_attente' && Number(ligne.planifiee) === 1);
  await desindexer(tx, postId);
  if (!indexable) return false;

  const motsCles = (await motsClesDesRevisions(tx, [revisionId])).get(revisionId) ?? [];
  const contenu: unknown = JSON.parse(String(ligne.content));
  const termes = (champs: string[]) => motsCles.filter((m) => champs.includes(m.champ)).map((m) => m.termeNormalise).join(' ');
  await tx.execute({
    sql: 'insert into recherche_publication (post_id, revision_id, nom, mots_cles, texte) values (?, ?, ?, ?, ?)',
    args: [postId, revisionId, termes(['nom']), termes(['categorie', 'usage', 'technologie', 'terme_proche']), normaliser(textesDePublication(contenu).join(' \n '))],
  });
  return true;
}
