// API v1 (ADR 0010) : fonctions de lecture utilisées par les routes /api/v1 et par les pages du site, sans accès propre
// à la base côté site. Chaque réponse est validée par le contrat (packages/contrat) avant d'être servie.
import type { Client } from '@libsql/client';
import { Fiche, PageFil, ReponseCompte, ReponseComptes, ReponseRecherche, type Langue, type Publication } from '../../../packages/contrat/src/index.ts';
import { ficheParId } from './fiche.ts';
import { rechercher } from '../../recherche/rechercher.ts';
import { lireComptes, pageDuFil, publicationParId, publicationsParIds, type Contexte } from './publications.ts';
import { relevesMesurables, type Releve } from '../../mesure/delais.ts';

export { RequeteInvalide } from '../../recherche/rechercher.ts';
export { decoderCurseur, limiteValide, publicationParId, type Contexte, type Mode } from './publications.ts';

export async function fil(ctx: Contexte, o: { curseur?: string | null; limite?: number } = {}): Promise<PageFil> {
  return PageFil.parse(await pageDuFil(ctx, o));
}

export async function comptes(ctx: Contexte): Promise<ReponseComptes> {
  return ReponseComptes.parse({ langue: ctx.langue, comptes: [...(await lireComptes(ctx.client, ctx.langue)).values()] });
}

/** Un compte et sa page de publications ; null s'il n'existe pas. */
export async function compte(ctx: Contexte, id: string, o: { curseur?: string | null; limite?: number } = {}): Promise<ReponseCompte | null> {
  const c = (await lireComptes(ctx.client, ctx.langue)).get(id);
  if (!c) return null;
  const page = await pageDuFil(ctx, { ...o, compte: id });
  return ReponseCompte.parse({ langue: ctx.langue, compte: c, publications: page.publications, curseur_suivant: page.curseur_suivant });
}

export async function publication(ctx: Contexte, id: number) {
  return publicationParId(ctx, id);
}

/** Fiche d'approfondissement d'une publication visible ; null sinon. */
export async function fiche(ctx: Contexte, id: number): Promise<Fiche | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const f = await ficheParId(ctx, id);
  return f ? Fiche.parse(f) : null;
}

/** Recherche (ADR 0011 §5) : même moteur que la commande et la maquette ; les résultats sont des publications. */
export async function recherche(ctx: Contexte, requete: unknown, o: { tri?: 'pertinence' | 'recents'; curseur?: string | null; limite?: number } = {}): Promise<ReponseRecherche> {
  const r = await rechercher(ctx.client as Client, requete, { mode: ctx.mode, tri: o.tri ?? 'pertinence', curseur: o.curseur ?? null, ...(o.limite ? { limite: o.limite } : {}) });
  const publications = new Map((await publicationsParIds(ctx, r.resultats.map((x) => x.post_id))).map((p) => [p.id, p]));
  return ReponseRecherche.parse({
    langue: ctx.langue,
    requete: r.requete,
    tri: r.tri,
    total: r.total,
    resultats: r.resultats.flatMap((x) => {
      const p = publications.get(x.post_id);
      return p ? [{ publication: p, correspondances: x.correspondances.map((c) => ({ champ: c.champ, terme: c.terme, extrait: c.extrait })) }] : [];
    }),
    curseur_suivant: r.curseur_suivant,
  });
}

export type { Langue };

/** Les relevés les plus rapides (accueil, 2026-11-06), avec leur publication visible, et le nombre de posts mesurés. */
export async function relevesRapides(ctx: Contexte, n = 3): Promise<{ mesures: number; cas: (Releve & { post: Publication })[] }> {
  const tous = await relevesMesurables(ctx.client);
  const cas: (Releve & { post: Publication })[] = [];
  for (const r of tous) {
    if (cas.length >= n) break;
    const post = await publicationParId(ctx, r.publication);
    if (post) cas.push({ ...r, post });
  }
  return { mesures: tous.length, cas };
}
