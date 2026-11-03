// Publication réelle (P5, SPEC §7.4) : une publication `en_attente` dont le jour prévu est arrivé passe `publie`.
// - Atomique : un seul `update … where status = 'en_attente'` par publication, dans une transaction qui recompte aussi
//   le plafond du jour ; un cycle concurrent ou rejoué ne publie jamais deux fois (idempotent).
// - Plafond : 20 par jour civil Europe/Paris (réglage `publication.plafond_jour`), recompté dans chaque transaction.
// - Garde-fous : une actualité dont un passage cité n'est plus retrouvé mot pour mot reste en attente ; une actualité
//   qui semble déjà couverte (même produit et même version, ou titre très proche, sur 7 jours) passe `reportee` avec le
//   motif `doublon_possible` ; une actualité prévue depuis plus de 2 jours passe `reportee`, motif `obsolete`.
import type { Client } from '@libsql/client';
import { isPaused, lireReglageEntier } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { actualitesDeLaMaquette } from '../maquette/actualites.ts';
import { indexer } from '../recherche/index.ts';
import { normaliser } from '../recherche/normaliser.ts';
import { ajouterJours, jourParis } from '../ressources/planification.ts';

/** Valeurs proposées (SPEC §7.4) : fenêtre et seuil de similarité des titres, âge maximal d'une actualité prévue. */
export const JOURS_DOUBLON = 7;
export const SEUIL_TITRE = 0.8;
export const AGE_MAX_PREVUE_JOURS = 2;

const motsDuTitre = (titre: string): Set<string> => new Set(normaliser(titre).split(/\s+/).filter((m) => m.length >= 3));

/** Similarité de Jaccard entre les mots (normalisés, 3 lettres au moins) de deux titres. */
export function similariteTitres(a: string, b: string): number {
  const x = motsDuTitre(a);
  const y = motsDuTitre(b);
  if (x.size === 0 || y.size === 0) return 0;
  let communs = 0;
  for (const m of x) if (y.has(m)) communs++;
  return communs / (x.size + y.size - communs);
}

/** « produit@version » si la version contient un chiffre ; sinon null (une version inconnue ne prouve aucun doublon). */
export function cleProduit(contenu: Record<string, unknown>): string | null {
  const produit = typeof contenu.produit === 'string' ? normaliser(contenu.produit) : '';
  const version = typeof contenu.version_cible === 'string' && /\d/.test(contenu.version_cible) ? contenu.version_cible.replace(/^v/i, '').trim() : '';
  return produit && version ? `${produit}@${version}` : null;
}

interface Sujet {
  post_id: number;
  titre: string;
  cle: string | null;
}

/** Le sujet est-il déjà couvert par une publication récente ? Rend la raison, ou null. */
export function doublonDe(sujet: Sujet, recents: readonly Sujet[]): { avec: number; raison: 'meme_produit_version' | 'titre_proche' } | null {
  for (const r of recents) {
    if (r.post_id === sujet.post_id) continue;
    if (sujet.cle !== null && sujet.cle === r.cle) return { avec: r.post_id, raison: 'meme_produit_version' };
    if (similariteTitres(sujet.titre, r.titre) >= SEUIL_TITRE) return { avec: r.post_id, raison: 'titre_proche' };
  }
  return null;
}

export interface BilanPublication {
  jour: string;
  en_pause: boolean;
  plafond: number;
  deja_publiees: number;
  publiees: number[];
  doublons: { post_id: number; avec: number; raison: string }[];
  obsoletes: number[];
  a_verifier: number[];
  plafond_atteint: boolean;
}

const ACTUALITES = new Set(['annonce', 'version']);

async function publieesLeJour(client: Pick<Client, 'execute'>, jour: string, maintenant: string): Promise<number> {
  // Fenêtre large en UTC, puis jour civil Europe/Paris calculé par le code (jamais une sous-chaîne UTC).
  const r = await client.execute({ sql: `select published_at from post where status = 'publie' and published_at >= ?`, args: [new Date(Date.parse(maintenant) - 2 * 86_400_000).toISOString()] });
  return r.rows.filter((x) => jourParis(String(x.published_at)) === jour).length;
}

export async function publierLesDues(database: Database, maintenant: string): Promise<BilanPublication> {
  const { client } = database;
  const jour = jourParis(maintenant);
  const plafond = await lireReglageEntier(database.db, 'publication.plafond_jour');
  const bilan: BilanPublication = { jour, en_pause: false, plafond, deja_publiees: await publieesLeJour(client, jour, maintenant), publiees: [], doublons: [], obsoletes: [], a_verifier: [], plafond_atteint: false };
  if (await isPaused(database.db)) return { ...bilan, en_pause: true };

  const dues = await client.execute({
    sql: `select p.id, n.kind, n.title, rv.id as revision_id, rv.content, pp.jour
          from post p
          join news_item n on n.id = p.news_item_id
          join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
          join publication_planifiee pp on pp.post_id = p.id
          where p.status = 'en_attente' and pp.etat = 'prevue' and pp.jour <= ?
          order by pp.jour, pp.rang, p.id`,
    args: [jour],
  });
  const recents = await client.execute({
    sql: `select p.id, n.title, rv.content from post p join news_item n on n.id = p.news_item_id and n.kind in ('annonce', 'version')
          join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
          where p.status = 'publie' and p.published_at >= ?`,
    args: [new Date(Date.parse(maintenant) - JOURS_DOUBLON * 86_400_000).toISOString()],
  });
  const sujets: Sujet[] = recents.rows.map((r) => ({ post_id: Number(r.id), titre: String(r.title), cle: cleProduit(JSON.parse(String(r.content)) as Record<string, unknown>) }));
  const reporter = (postId: number, motif: string) =>
    client.execute({ sql: `update publication_planifiee set etat = 'reportee', motif = ?, updated_at = ? where post_id = ? and etat = 'prevue'`, args: [motif, maintenant, postId] });

  for (const row of dues.rows) {
    const postId = Number(row.id);
    const contenu = JSON.parse(String(row.content)) as Record<string, unknown>;
    const actualite = ACTUALITES.has(String(row.kind));
    if (actualite) {
      if (String(row.jour) < ajouterJours(jour, -AGE_MAX_PREVUE_JOURS)) {
        await reporter(postId, 'obsolete');
        bilan.obsoletes.push(postId);
        continue;
      }
      // La vérification mot pour mot est refaite sur l'original au moment de publier.
      const { actualites } = await actualitesDeLaMaquette(client, [postId]);
      if (actualites[0]?.verification !== 'verifie') {
        bilan.a_verifier.push(postId);
        continue;
      }
      const sujet: Sujet = { post_id: postId, titre: String(row.title), cle: cleProduit(contenu) };
      const doublon = doublonDe(sujet, sujets);
      if (doublon) {
        await reporter(postId, 'doublon_possible');
        bilan.doublons.push({ post_id: postId, ...doublon });
        continue;
      }
      sujets.push(sujet);
    }
    const tx = await client.transaction('write');
    try {
      if ((await publieesLeJour(tx, jour, maintenant)) >= plafond) {
        bilan.plafond_atteint = true;
        break;
      }
      const maj = await tx.execute({ sql: `update post set status = 'publie', published_at = ? where id = ? and status = 'en_attente'`, args: [maintenant, postId] });
      if (maj.rowsAffected !== 1) continue; // déjà publiée par un autre cycle : rien à refaire
      await tx.execute({ sql: `update publication_planifiee set etat = 'publiee', updated_at = ? where post_id = ?`, args: [maintenant, postId] });
      await indexer(tx, postId, Number(row.revision_id));
      await tx.commit();
      bilan.publiees.push(postId);
    } finally {
      tx.close();
    }
  }
  return bilan;
}
