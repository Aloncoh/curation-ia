// Recherche des publications (ADR 0011 §5), partagée par la commande `chercher`, la maquette et, en P4, l'API v1 du site
// et de l'application. FTS5 donne les candidats ; le classement et l'explication se font dans le code (moteur.ts).
// Une requête n'est jamais enregistrée, ni avec ni sans l'identité de son auteur.
import { createHash } from 'node:crypto';
import type { Client } from '@libsql/client';
import { z } from 'zod';
import { motsClesDesRevisions } from '../ressources/mots-cles.ts';
import { jourParis } from '../ressources/planification.ts';
import { textesDePublication } from './index.ts';
import { classer, preparerRequete, type Correspondance, type DocumentRecherche, type Tri } from './moteur.ts';

export const TAILLE_PAGE = 20;
export const TAILLE_PAGE_MAX = 50;
/** Candidats lus au plus dans l'index pour une requête ; au-delà, le classement porte sur les premiers trouvés. */
export const CANDIDATS_MAX = 2000;
export const ETIQUETTE_NON_PUBLIE = 'pas encore publié';

/** public : seulement `publie` (API v1). apercu : `publie` et `en_attente` planifiées, étiquetées (commande, maquette). */
export type ModeRecherche = 'public' | 'apercu';

export const OptionsRecherche = z
  .object({
    tri: z.enum(['pertinence', 'recents']).default('pertinence'),
    curseur: z.string().max(200).nullable().default(null),
    mode: z.enum(['public', 'apercu']).default('public'),
    limite: z.number().int().min(1).max(TAILLE_PAGE_MAX).default(TAILLE_PAGE),
  })
  .strict();
export type OptionsRecherche = z.input<typeof OptionsRecherche>;

const Requete = z.string().min(1, 'La requête est vide.').max(200, 'La requête dépasse 200 caractères.');

/** Saisie refusée : requête hors limites, options invalides ou curseur qui ne correspond pas à la requête. */
export class RequeteInvalide extends Error {
  override name = 'RequeteInvalide';
}

export interface ResultatRecherche {
  post_id: number;
  revision_id: number;
  nom: string | null;
  score: number;
  jour: string | null;
  statut: 'publie' | 'en_attente';
  /** « pas encore publié » pour une publication en attente (mode aperçu seulement). */
  etiquette: string | null;
  correspondances: Correspondance[];
}

export interface ReponseRecherche {
  requete: string;
  requete_normalisee: string;
  mode: ModeRecherche;
  tri: Tri;
  /** Message lisible quand la réponse est vide pour une raison connue (requête vide après normalisation). */
  message: string | null;
  total: number;
  resultats: ResultatRecherche[];
  curseur_suivant: string | null;
}

const empreinte = (normalisee: string, tri: Tri, mode: ModeRecherche) => createHash('sha256').update(`${normalisee}\u0000${tri}\u0000${mode}`).digest('hex').slice(0, 16);

/** Curseur opaque : rang de départ et empreinte de la requête, qui doit concorder. */
function lireCurseur(curseur: string, attendu: string): number {
  try {
    const c = z.object({ r: z.number().int().min(0), e: z.string() }).strict().parse(JSON.parse(Buffer.from(curseur, 'base64url').toString('utf8')));
    if (c.e !== attendu) throw new Error('empreinte');
    return c.r;
  } catch {
    throw new RequeteInvalide('Curseur invalide ou issu d’une autre requête.');
  }
}
const ecrireCurseur = (rang: number, e: string) => Buffer.from(JSON.stringify({ r: rang, e })).toString('base64url');

/** Requête FTS5 construite par le code : mots normalisés entre guillemets, jamais la saisie brute. */
export function requeteFts(mots: string[], prefixe: boolean): string {
  return mots.map((m, i) => `"${m.replace(/"/g, '""')}"${prefixe && i === mots.length - 1 ? '*' : ''}`).join(' ');
}

export async function rechercher(client: Client, requete: unknown, options: OptionsRecherche = {}): Promise<ReponseRecherche> {
  const saisie = Requete.safeParse(requete);
  if (!saisie.success) throw new RequeteInvalide(saisie.error.issues[0]?.message ?? 'Requête invalide.');
  const o = OptionsRecherche.safeParse(options);
  if (!o.success) throw new RequeteInvalide(o.error.issues[0]?.message ?? 'Options invalides.');
  const { tri, mode, limite } = o.data;
  const q = preparerRequete(saisie.data);
  const normalisee = q.mots.join(' ');
  const e = empreinte(normalisee, tri, mode);
  const debut = o.data.curseur ? lireCurseur(o.data.curseur, e) : 0;
  const base = { requete: saisie.data, requete_normalisee: normalisee, mode, tri };
  if (q.mots.length === 0) {
    return { ...base, message: 'Aucun mot à chercher après normalisation (mots vides ou signes seulement).', total: 0, resultats: [], curseur_suivant: null };
  }

  const statuts = mode === 'public' ? `p.status = 'publie'` : `(p.status = 'publie' or (p.status = 'en_attente' and pp.post_id is not null))`;
  const candidats = await client.execute({
    sql: `with c as (select post_id, revision_id from recherche_publication where recherche_publication match ? limit ${CANDIDATS_MAX})
          select c.post_id, c.revision_id, p.status, rv.content, p.published_at, pp.jour
          from c join post p on p.id = c.post_id
          join post_revision rv on rv.id = c.revision_id and rv.post_id = p.id
          left join publication_planifiee pp on pp.post_id = p.id
          where ${statuts}`,
    args: [requeteFts(q.mots, q.prefixe)],
  });
  const revisions = candidats.rows.map((r) => Number(r.revision_id));
  const motsCles = await motsClesDesRevisions(client, revisions);
  const statutDe = new Map<number, 'publie' | 'en_attente'>();
  const documents: DocumentRecherche[] = candidats.rows.map((r) => {
    statutDe.set(Number(r.post_id), String(r.status) === 'publie' ? 'publie' : 'en_attente');
    return {
      postId: Number(r.post_id),
      revisionId: Number(r.revision_id),
      // Jour civil Europe/Paris, comme le plafond : jamais la sous-chaîne UTC de `published_at`.
      jour: r.published_at != null ? jourParis(String(r.published_at)) : r.jour == null ? null : String(r.jour),
      motsCles: motsCles.get(Number(r.revision_id)) ?? [],
      textes: textesDePublication(JSON.parse(String(r.content))),
    };
  });

  const classes = classer(saisie.data, documents, tri);
  const page = classes.slice(debut, debut + limite);
  const suivant = debut + limite < classes.length ? ecrireCurseur(debut + limite, e) : null;
  return {
    ...base,
    message: null,
    total: classes.length,
    resultats: page.map((r) => {
      const statut = statutDe.get(r.postId) ?? 'en_attente';
      return {
        post_id: r.postId,
        revision_id: r.revisionId,
        nom: r.nom,
        score: r.score,
        jour: r.jour,
        statut,
        etiquette: statut === 'en_attente' ? ETIQUETTE_NON_PUBLIE : null,
        correspondances: r.correspondances,
      };
    }),
    curseur_suivant: suivant,
  };
}
