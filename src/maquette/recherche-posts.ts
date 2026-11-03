// Documents de recherche des publications de la maquette qui ne viennent pas de la chaîne des ressources : les exemples
// d'actualités vérifiées et les projets (demande de l'utilisateur du 2026-11-02 : la recherche couvre toutes les
// publications affichées). Ressources et sélections gardent leurs documents lus en base (ressources.ts, selections.ts).
// Les mots-clés ne sont jamais affichés : ils ne servent qu'au classement, par le même moteur (src/recherche/moteur.ts).
import type { DocumentRecherche, MotCleRecherche } from '../recherche/moteur.ts';
import { jourParis } from '../ressources/planification.ts';
import type { MaquetteExemple } from './data.ts';
import type { PROJETS } from './exemples.ts';

/**
 * Identifiants de recherche des publications hors base : négatifs, pour ne jamais rencontrer un `post.id` réel
 * (toujours positif). Ils ne sortent pas de la maquette ; le site (API v1) ne lira que des publications en base.
 */
export const ID_EXEMPLE = (rang: number): number => -(1 + rang);
export const ID_PROJET = (rang: number): number => -(1001 + rang);

const mot = (champ: MotCleRecherche['champ'], terme: string | null | undefined): MotCleRecherche[] =>
  terme && terme.trim() ? [{ champ, terme: terme.trim(), raison: null, passage: null }] : [];

const sansDoublon = (mots: MotCleRecherche[]): MotCleRecherche[] => {
  const vus = new Set<string>();
  return mots.filter((m) => {
    const cle = `${m.champ}\u0000${m.terme.toLowerCase()}`;
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
};

const textes = (...parties: (string | null | undefined)[]): string[] => parties.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

/** Exemple d'actualité : nom du média et du produit, catégories, puis le texte affiché et le titre de l'actualité. */
export function documentExemple(ex: MaquetteExemple & { recherche_id: number }): DocumentRecherche {
  const a = ex.actualite;
  return {
    postId: ex.recherche_id,
    revisionId: 0,
    jour: a.announced_at ? jourParis(a.announced_at) : null,
    motsCles: sansDoublon([
      ...mot('nom', ex.titre_media),
      ...mot('nom', a.product?.name),
      ...ex.categories.flatMap((c) => mot('categorie', c)),
      ...mot('categorie', a.product?.category),
    ]),
    textes: textes(
      ex.accroche.texte,
      ex.description.texte,
      ex.nouveaute.texte,
      ex.ce_que_ca_permet?.texte,
      ex.pour_qui?.texte,
      ex.limites_connues?.texte,
      ...ex.details.map((d) => d.texte),
      ...ex.visuel.elements.map((e) => e.texte),
      a.title,
      a.product?.publisher,
    ),
  };
}

/** Projet GitHub : nom du dépôt, langage, puis l'accroche, l'intérêt et la description citée du dépôt. */
export function documentProjet(p: (typeof PROJETS)[number] & { recherche_id: number }): DocumentRecherche {
  const [, nomCourt] = p.depot.split('/');
  return {
    postId: p.recherche_id,
    revisionId: 0,
    jour: jourParis(p.mesure_le),
    motsCles: sansDoublon([...mot('nom', nomCourt), ...mot('nom', p.depot), ...mot('technologie', p.langage)]),
    textes: textes(p.accroche.texte, p.interet.texte, p.capture),
  };
}
