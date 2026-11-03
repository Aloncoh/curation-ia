// Champs traduits d'une publication (ADR 0012, décisions du 2026-11-03) : exactement le texte affiché du post, titre
// (l'accroche) compris. Restent dans leur langue : le texte des images, les noms des ressources, les passages cités et
// les adresses. Les mêmes clés servent à l'étape de traduction et à l'API v1.

export type Nature = 'actualite' | 'ressource' | 'selection';

export interface Champ {
  cle: string;
  texte: string;
}

const texte = (v: unknown): string | null => {
  if (!v || typeof v !== 'object') return null;
  const t = (v as { texte?: unknown }).texte;
  return typeof t === 'string' && t.trim() !== '' ? t : null;
};

/** Champs affichés du post, dans l'ordre d'affichage. `contenu` : la révision stockée ou l'objet lu par la maquette. */
export function champsDuPost(nature: Nature, contenu: Record<string, unknown>): Champ[] {
  const champs: Champ[] = [];
  const ajouter = (cle: string, v: unknown) => {
    const t = texte(v);
    if (t !== null) champs.push({ cle, texte: t });
  };
  ajouter('accroche', contenu.accroche);
  if (nature === 'actualite') {
    ajouter('description', contenu.description);
    ajouter('ce_que_ca_permet', contenu.ce_que_ca_permet);
  } else if (nature === 'ressource') {
    ajouter('description', contenu.description);
    ajouter('interet', contenu.interet);
    liste(contenu.reperes).forEach((r, i) => ajouter(`reperes.${i}`, r));
  } else {
    liste(contenu.ressources).forEach((r, i) => ajouter(`ressources.${i}.explication`, objet(r).explication));
  }
  return champs;
}

const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const objet = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const chaine = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : texte(v));

/**
 * Champs de la fiche d'approfondissement (SPEC §6), clés préfixées par `fiche.`, dans l'ordre d'affichage. Les noms
 * (auteur d'un benchmark, dépôt), les commandes et les passages cités restent d'origine.
 */
export function champsDeLaFiche(nature: Nature, contenu: Record<string, unknown>): Champ[] {
  const champs: Champ[] = [];
  const ajouter = (cle: string, v: unknown) => {
    const t = chaine(v);
    if (t !== null) champs.push({ cle: `fiche.${cle}`, texte: t });
  };
  if (nature === 'actualite') {
    for (const cle of ['nouveaute', 'pour_qui', 'exemple_usage', 'acces', 'prerequis', 'cout', 'limites_connues']) ajouter(cle, contenu[cle]);
    liste(contenu.details).forEach((d, i) => {
      ajouter(`details.${i}.titre`, objet(d).titre);
      ajouter(`details.${i}.texte`, objet(d).texte);
    });
    liste(contenu.attributions).forEach((a, i) => {
      ajouter(`attributions.${i}.texte`, objet(a).texte);
      ajouter(`attributions.${i}.conditions`, objet(a).conditions);
    });
    liste(contenu.questions_a_tester).forEach((q, i) => ajouter(`questions_a_tester.${i}`, q));
  } else if (nature === 'ressource') {
    ajouter('exemple_usage', contenu.exemple_usage);
    liste(objet(contenu.demarrage).etapes).forEach((e, i) => ajouter(`demarrage.etapes.${i}`, e));
    liste(contenu.compatibilites).forEach((c, i) => ajouter(`compatibilites.${i}`, c));
    liste(contenu.limites).forEach((l, i) => ajouter(`limites.${i}`, l));
    ajouter('licence_locale', contenu.licence_locale);
  }
  return champs;
}

/** Tout ce qui se traduit dans une révision : le post, puis la fiche. Le texte alternatif d'une image s'y ajoute (`media.alt`). */
export function champsTraduisibles(nature: Nature, contenu: Record<string, unknown>): Champ[] {
  return [...champsDuPost(nature, contenu), ...champsDeLaFiche(nature, contenu)];
}

export type Groupe = 'post' | 'fiche' | 'media';
export const groupeDe = (cle: string): Groupe => (cle.startsWith('fiche.') ? 'fiche' : cle === 'media.alt' ? 'media' : 'post');

/**
 * Une partie (post, fiche ou texte alternatif) n'est servie traduite que si chacun de ses champs est traduit et
 * qu'aucun n'a d'écart ; sinon cette partie s'affiche dans sa langue d'origine.
 */
export function partieServable(original: readonly Champ[], traduits: Record<string, string>, ecarts: ReadonlySet<string>): boolean {
  return original.length > 0 && original.every((c) => typeof traduits[c.cle] === 'string' && traduits[c.cle]!.trim() !== '' && !ecarts.has(c.cle));
}
