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
export function champsTraduisibles(nature: Nature, contenu: Record<string, unknown>): Champ[] {
  const champs: Champ[] = [];
  const ajouter = (cle: string, v: unknown) => {
    const t = texte(v);
    if (t !== null) champs.push({ cle, texte: t });
  };
  const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  ajouter('accroche', contenu.accroche);
  if (nature === 'actualite') {
    ajouter('description', contenu.description);
    ajouter('ce_que_ca_permet', contenu.ce_que_ca_permet);
  } else if (nature === 'ressource') {
    ajouter('description', contenu.description);
    ajouter('interet', contenu.interet);
    liste(contenu.reperes).forEach((r, i) => ajouter(`reperes.${i}`, r));
  } else {
    liste(contenu.ressources).forEach((r, i) => ajouter(`ressources.${i}.explication`, r && typeof r === 'object' ? (r as Record<string, unknown>).explication : null));
  }
  return champs;
}

/** Les champs traduits couvrent-ils exactement les champs de l'original ? Sinon la traduction n'est pas servie. */
export function memesCles(original: readonly Champ[], traduits: Record<string, string>): boolean {
  const cles = Object.keys(traduits);
  return cles.length === original.length && original.every((c) => typeof traduits[c.cle] === 'string' && traduits[c.cle]!.trim() !== '');
}
