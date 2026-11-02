// Planification des publications sous le plafond quotidien partagé (SPEC §3.6, ADR 0011 §6). Rien n'atteint `publie`
// avant P5 : une publication conforme passe `en_attente` avec un jour prévu (jour civil Europe/Paris). Le plafond compte
// tous les contenus ; une ressource existante n'occupe jamais la réserve des nouveautés prioritaires.
import type { Client, Transaction } from '@libsql/client';
import type { Executor } from '../db/client.ts';
import { lireReglageEntier } from '../control/settings.ts';
import { RESSOURCES } from './liste.ts';

/** Au-delà de cet horizon, une publication sans place passe `reportee` (motif `plafond_atteint`). */
export const HORIZON_JOURS = 60;

export type StatutPlanning = 'ressource_existante' | 'nouvelle_sortie' | 'actualite';
export type Priorite = 1 | 2 | 3 | 4;

export interface ReglagesPlanning {
  plafond: number;
  reserve: number;
  horizon: number;
}

export async function lireReglagesPlanning(db: Executor): Promise<ReglagesPlanning> {
  const plafond = await lireReglageEntier(db, 'publication.plafond_jour');
  const reserve = await lireReglageEntier(db, 'publication.reserve_nouveautes_jour');
  if (reserve > plafond) throw new Error(`Réserve des nouveautés (${reserve}) supérieure au plafond quotidien (${plafond}).`);
  return { plafond, reserve, horizon: HORIZON_JOURS };
}

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Jour civil Europe/Paris d'un instant : la frontière du plafond. */
export const jourParis = (instant: Date | string): string => FORMAT_JOUR.format(typeof instant === 'string' ? new Date(instant) : instant);

/** Jour civil décalé de `n` jours (calcul sur la date seule, sans heure d'été). */
export function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Publication à placer. `ordre` : rang dans la liste des ressources (ordre de l'utilisateur). */
export interface APlacer {
  postId: number;
  priorite: Priorite;
  statutSortie: StatutPlanning;
  ordre: number;
}

/** Places déjà prises un jour donné : `normales` (hors réserve, contenus non planifiés compris) et `reserve`. */
export interface Occupation {
  normales: number;
  reserve: number;
}

export interface Placement {
  postId: number;
  jour: string | null;
  rang: number | null;
  utiliseReserve: boolean;
  etat: 'prevue' | 'reportee';
  motif: string | null;
}

/** Nouveautés prioritaires : elles seules peuvent occuper la réserve (actualités de priorité 1 à 3, nouvelles sorties). */
export const prioritaire = (p: Pick<APlacer, 'priorite' | 'statutSortie'>): boolean => p.statutSortie === 'nouvelle_sortie' || (p.statutSortie === 'actualite' && p.priorite <= 3);

const RANG_STATUT: Record<StatutPlanning, number> = { nouvelle_sortie: 0, actualite: 1, ressource_existante: 2 };

/** Ordre de planification : priorité éditoriale, nouvelle sortie avant ressource existante, ordre de la liste, puis `post_id`. */
export const comparerAPlacer = (a: APlacer, b: APlacer): number =>
  a.priorite - b.priorite || RANG_STATUT[a.statutSortie] - RANG_STATUT[b.statutSortie] || a.ordre - b.ordre || a.postId - b.postId;

/**
 * Place les publications, dans l'ordre, au premier jour qui a de la place à partir d'`aujourdhui`. Pure : `occupation`
 * est copiée. Le plafond n'est jamais dépassé ; une nouveauté prioritaire prend d'abord la réserve, puis une place normale.
 */
export function placer(items: APlacer[], occupation: ReadonlyMap<string, Occupation>, aujourdhui: string, r: ReglagesPlanning, motif: string | null = null): Placement[] {
  if (r.reserve > r.plafond) throw new Error('Réserve supérieure au plafond.');
  const occ = new Map([...occupation].map(([jour, o]) => [jour, { ...o }]));
  const normalesMax = r.plafond - r.reserve;
  const resultats: Placement[] = [];
  for (const p of [...items].sort(comparerAPlacer)) {
    let place: Placement | null = null;
    for (let i = 0; i < r.horizon && !place; i++) {
      const jour = ajouterJours(aujourdhui, i);
      const o = occ.get(jour) ?? { normales: 0, reserve: 0 };
      if (o.normales + o.reserve >= r.plafond) continue;
      let reserve: boolean | null = null;
      if (prioritaire(p) && o.reserve < r.reserve) reserve = true;
      else if (o.normales < normalesMax) reserve = false;
      if (reserve === null) continue;
      if (reserve) o.reserve++;
      else o.normales++;
      occ.set(jour, o);
      place = { postId: p.postId, jour, rang: o.normales + o.reserve, utiliseReserve: reserve, etat: 'prevue', motif };
    }
    resultats.push(place ?? { postId: p.postId, jour: null, rang: null, utiliseReserve: false, etat: 'reportee', motif: 'plafond_atteint' });
  }
  return resultats;
}

type Lecteur = Client | Transaction;

/**
 * Places prises par jour, tous contenus confondus : publications prévues ou publiées de la planification, et
 * publications `publie` sans ligne de planification (jour de leur publication). `exclure` : publications en cours de placement.
 */
export async function occupationParJour(executeur: Lecteur, exclure: ReadonlySet<number> = new Set()): Promise<Map<string, Occupation>> {
  const occ = new Map<string, Occupation>();
  const ajouter = (jour: string, reserve: boolean) => {
    const o = occ.get(jour) ?? { normales: 0, reserve: 0 };
    if (reserve) o.reserve++;
    else o.normales++;
    occ.set(jour, o);
  };
  const pp = await executeur.execute(`select post_id, jour, utilise_reserve from publication_planifiee where etat in ('prevue', 'publiee') and jour is not null`);
  for (const row of pp.rows) if (!exclure.has(Number(row.post_id))) ajouter(String(row.jour), Number(row.utilise_reserve) === 1);
  const publiees = await executeur.execute(`select p.id, p.published_at from post p where p.status = 'publie' and p.published_at is not null
    and not exists (select 1 from publication_planifiee pp where pp.post_id = p.id)`);
  for (const row of publiees.rows) if (!exclure.has(Number(row.id))) ajouter(jourParis(String(row.published_at)), false);
  return occ;
}

/**
 * Écrit un placement (une ligne par publication, mise à jour sur place). Le rang écrit est provisoire : le premier libre
 * du jour (max + 1), jamais un rang déjà pris ; `renumeroter` fixe ensuite l'ordre définitif du jour.
 */
export async function ecrirePlacement(tx: Transaction, p: Placement, a: Pick<APlacer, 'priorite' | 'statutSortie'>, now: string): Promise<void> {
  let rang: number | null = null;
  if (p.etat !== 'reportee' && p.jour !== null) {
    const r = await tx.execute({
      sql: `select coalesce(max(rang), 0) + 1 as rang from publication_planifiee where jour = ? and etat <> 'reportee' and post_id <> ?`,
      args: [p.jour, p.postId],
    });
    rang = Number(r.rows[0]!.rang);
  }
  await tx.execute({
    sql: `insert into publication_planifiee (post_id, jour, rang, priorite, statut_sortie, utilise_reserve, etat, motif, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict(post_id) do update set jour = excluded.jour, rang = excluded.rang, priorite = excluded.priorite, statut_sortie = excluded.statut_sortie,
            utilise_reserve = excluded.utilise_reserve, etat = excluded.etat, motif = excluded.motif, updated_at = excluded.updated_at`,
    args: [p.postId, p.jour, rang, a.priorite, a.statutSortie, p.utiliseReserve ? 1 : 0, p.etat, p.motif, now, now],
  });
}

/**
 * Renumérote les rangs des jours donnés, de 1 à n, dans l'ordre de planification (`comparerAPlacer`) : une publication
 * retirée ou replacée ne laisse ni trou ni doublon. Deux passes, pour ne jamais heurter l'index unique (jour, rang).
 */
export async function renumeroter(tx: Transaction, jours: Iterable<string | null>): Promise<void> {
  for (const jour of new Set([...jours].filter((j): j is string => j !== null))) {
    const r = await tx.execute({
      sql: `select pp.post_id, pp.priorite, pp.statut_sortie,
              (select rv.content from post_revision rv where rv.post_id = pp.post_id order by rv.seq desc limit 1) as content
            from publication_planifiee pp where pp.jour = ? and pp.etat <> 'reportee'`,
      args: [jour],
    });
    const items: APlacer[] = r.rows.map((row) => ({
      postId: Number(row.post_id),
      priorite: Number(row.priorite) as Priorite,
      statutSortie: String(row.statut_sortie) as StatutPlanning,
      ordre: ordreDe(row.content === null ? null : JSON.parse(String(row.content))),
    }));
    items.sort(comparerAPlacer);
    // Première passe : rangs négatifs provisoires, hors de toute valeur définitive.
    for (const [i, it] of items.entries()) await tx.execute({ sql: 'update publication_planifiee set rang = ? where post_id = ?', args: [-(i + 1), it.postId] });
    for (const [i, it] of items.entries()) await tx.execute({ sql: 'update publication_planifiee set rang = ? where post_id = ?', args: [i + 1, it.postId] });
  }
}

/** Retire une publication du planning, puis renumérote son ancien jour. */
export async function retirerDuPlanning(tx: Transaction, postId: number): Promise<void> {
  const r = await tx.execute({ sql: 'delete from publication_planifiee where post_id = ? returning jour', args: [postId] });
  await renumeroter(tx, r.rows.map((row) => (row.jour === null ? null : String(row.jour))));
}

/** Rang actuel d'une publication (après renumérotation) ; null si elle n'est pas prévue. */
export async function rangDe(tx: Lecteur, postId: number): Promise<number | null> {
  const r = await tx.execute({ sql: 'select rang from publication_planifiee where post_id = ?', args: [postId] });
  return r.rows[0]?.rang == null ? null : Number(r.rows[0].rang);
}

/** Rang d'une ressource dans la liste de l'utilisateur, d'après le slug du contenu stocké ; une autre publication passe après. */
export function ordreDe(contenu: unknown): number {
  const slug = contenu && typeof contenu === 'object' ? (contenu as { slug?: unknown }).slug : undefined;
  const i = typeof slug === 'string' ? RESSOURCES.findIndex((e) => e.slug === slug) : -1;
  return i < 0 ? RESSOURCES.length : i;
}

/**
 * Replace, dans la transaction, les publications qui doivent l'être : celles qui attendent faute de place, celles
 * prévues un jour déjà passé (avant P5, motif `reprogrammee_avant_p5`) et, avec `tout`, toutes les publications prévues.
 * Une publication déjà publiée ne bouge jamais.
 */
export async function replanifier(tx: Transaction, o: { aujourdhui: string; reglages: ReglagesPlanning; now: string; tout?: boolean }): Promise<Placement[]> {
  const r = await tx.execute({
    sql: `select pp.post_id, pp.jour as ancien_jour, pp.priorite, pp.statut_sortie, pp.etat,
            (select rv.content from post_revision rv where rv.post_id = pp.post_id order by rv.seq desc limit 1) as content
          from publication_planifiee pp join post p on p.id = pp.post_id
          where p.status = 'en_attente' and (pp.etat = 'reportee' or (pp.etat = 'prevue' and (? or pp.jour < ?)))`,
    args: [o.tout ? 1 : 0, o.aujourdhui],
  });
  if (r.rows.length === 0) return [];
  const passes = new Set(r.rows.filter((row) => row.etat === 'prevue' && String(row.ancien_jour) < o.aujourdhui).map((row) => Number(row.post_id)));
  const anciensJours = r.rows.map((row) => (row.ancien_jour === null ? null : String(row.ancien_jour)));
  const items: APlacer[] = r.rows.map((row) => ({
    postId: Number(row.post_id),
    priorite: Number(row.priorite) as Priorite,
    statutSortie: String(row.statut_sortie) as StatutPlanning,
    ordre: ordreDe(row.content === null ? null : JSON.parse(String(row.content))),
  }));
  const occ = await occupationParJour(tx, new Set(items.map((i) => i.postId)));
  const placements = placer(items, occ, o.aujourdhui, o.reglages).map((p) => (p.etat === 'prevue' && passes.has(p.postId) ? { ...p, motif: 'reprogrammee_avant_p5' } : p));
  for (const p of placements) await ecrirePlacement(tx, p, items.find((i) => i.postId === p.postId)!, o.now);
  await renumeroter(tx, [...anciensJours, ...placements.map((p) => p.jour)]);
  const ranges: Placement[] = [];
  for (const p of placements) ranges.push(p.etat === 'prevue' ? { ...p, rang: await rangDe(tx, p.postId) } : p);
  return ranges;
}
