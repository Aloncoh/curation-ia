// Mots-clés structurés d'une publication de ressource (ADR 0011 §1 et §5) : ils servent à retrouver et à classer, jamais
// à décorer. Un usage ou une technologie garde le passage qui le soutient ; un terme proche garde la raison qui le relie.
import type { Client, Transaction } from '@libsql/client';
import { normaliserEspaces } from '../maquette/data.ts';
import type { ChampMotCle, MotCleRecherche } from '../recherche/moteur.ts';
import { normaliser } from '../recherche/normaliser.ts';
import type { BrouillonRessource } from './schemas.ts';

export const CHAMPS_MOT_CLE: readonly ChampMotCle[] = ['nom', 'categorie', 'usage', 'technologie', 'terme_proche'];

/** Une raison de terme proche compte au moins ce nombre de mots, comme dans les contrôles (§3). */
export const MOTS_MIN_RAISON = 4;

export interface LigneMotCle extends MotCleRecherche {
  termeNormalise: string;
}

export interface RefusMotCle {
  champ: ChampMotCle;
  terme: string;
  code: 'terme_vide' | 'terme_proche_sans_raison' | 'usage_sans_passage' | 'technologie_sans_passage';
}

/** Mots porteurs d'une raison : ceux qui contiennent au moins une lettre ou un chiffre. */
export const raisonSuffisante = (raison: string | null | undefined): boolean =>
  (raison ?? '').trim().split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length >= MOTS_MIN_RAISON;

/**
 * Lignes `post_mot_cle` d'un brouillon, normalisées. Un terme vide après normalisation, un terme proche sans raison
 * suffisante, un usage ou une technologie sans passage sont refusés, jamais enregistrés. Un doublon (même champ, même
 * forme normalisée) n'est gardé qu'une fois.
 */
export function motsClesDe(mc: BrouillonRessource['mots_cles']): { lignes: LigneMotCle[]; refus: RefusMotCle[] } {
  const lignes: LigneMotCle[] = [];
  const refus: RefusMotCle[] = [];
  const vus = new Set<string>();
  const ajouter = (champ: ChampMotCle, terme: string, raison: string | null, passages: string[] | null) => {
    const t = normaliserEspaces(terme);
    const termeNormalise = normaliser(t);
    if (!termeNormalise) return refus.push({ champ, terme: t, code: 'terme_vide' });
    if (champ === 'terme_proche' && !raisonSuffisante(raison)) return refus.push({ champ, terme: t, code: 'terme_proche_sans_raison' });
    const passage = passages ? (passages.map(normaliserEspaces).find(Boolean) ?? null) : null;
    if (passages && !passage) return refus.push({ champ, terme: t, code: champ === 'usage' ? 'usage_sans_passage' : 'technologie_sans_passage' });
    const cle = `${champ}\u0000${termeNormalise}`;
    if (vus.has(cle)) return;
    vus.add(cle);
    lignes.push({ champ, terme: t, termeNormalise, raison: raison === null ? null : normaliserEspaces(raison), passage });
  };
  ajouter('nom', mc.nom, null, null);
  ajouter('categorie', mc.categorie, null, null);
  for (const u of mc.usages) ajouter('usage', u.texte, null, u.passages);
  for (const x of mc.technologies) ajouter('technologie', x.texte, null, x.passages);
  for (const p of mc.termes_proches) ajouter('terme_proche', p.terme, p.raison, null);
  return { lignes, refus };
}

/**
 * Enregistre les mots-clés d'une révision, dans la transaction de la publication. Refuse tout le lot si une ligne
 * enfreint les règles (la base les contrôle aussi : `post_mot_cle_raison_ck`, `post_mot_cle_passage_ck`).
 */
export async function enregistrerMotsCles(tx: Transaction, postId: number, revisionId: number, lignes: LigneMotCle[], now: string): Promise<number> {
  for (const l of lignes) {
    if (!CHAMPS_MOT_CLE.includes(l.champ)) throw new Error(`Champ de mot-clé inconnu : ${l.champ}`);
    if (l.termeNormalise !== normaliser(l.terme) || !l.termeNormalise) throw new Error(`Terme mal normalisé : ${l.terme}`);
    if (l.champ === 'terme_proche' && !raisonSuffisante(l.raison)) throw new Error(`Terme proche sans raison : ${l.terme}`);
    if ((l.champ === 'usage' || l.champ === 'technologie') && !l.passage?.trim()) throw new Error(`Mot-clé sans passage : ${l.terme}`);
  }
  await tx.execute({ sql: 'delete from post_mot_cle where revision_id = ?', args: [revisionId] });
  for (const l of lignes) {
    await tx.execute({
      sql: `insert into post_mot_cle (post_id, revision_id, champ, terme, terme_normalise, raison, passage, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [postId, revisionId, l.champ, l.terme, l.termeNormalise, l.raison, l.passage, now],
    });
  }
  return lignes.length;
}

/** Mots-clés de plusieurs révisions, dans l'ordre d'enregistrement. */
export async function motsClesDesRevisions(executeur: Client | Transaction, revisionIds: number[]): Promise<Map<number, LigneMotCle[]>> {
  const parRevision = new Map<number, LigneMotCle[]>(revisionIds.map((id) => [id, []]));
  if (revisionIds.length === 0) return parRevision;
  const r = await executeur.execute({
    sql: `select revision_id, champ, terme, terme_normalise, raison, passage from post_mot_cle where revision_id in (${revisionIds.map(() => '?').join(', ')}) order by id`,
    args: revisionIds,
  });
  for (const row of r.rows) {
    parRevision.get(Number(row.revision_id))?.push({
      champ: String(row.champ) as ChampMotCle,
      terme: String(row.terme),
      termeNormalise: String(row.terme_normalise),
      raison: row.raison === null ? null : String(row.raison),
      passage: row.passage === null ? null : String(row.passage),
    });
  }
  return parRevision;
}
