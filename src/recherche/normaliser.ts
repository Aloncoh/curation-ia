// Normalisation partagée par les contrôles, l'index, la requête et la maquette (ADR 0011 §5).
// Aucune importation : ce fichier est repris tel quel, sans ses types, dans la maquette.

/** Mots qui gardent leur `s` final : noms propres et termes techniques, pas des pluriels. Liste courte, versionnée. */
const EXCEPTIONS_PLURIEL = new Set(['macos', 'ios', 'ipados', 'watchos', 'visionos', 'tvos', 'canvas', 'windows', 'news', 'kubernetes', 'postgres', 'express', 'atlas', 'pandas', 'analytics', 'series']);

/** Mots vides français et anglais retirés de l'index et de la requête. Version 1, volontairement courte. */
const MOTS_VIDES = new Set([
  // français
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou', 'en', 'au', 'aux', 'a', 'à', 'pour', 'par', 'sur', 'dans', 'avec', 'sans',
  'ce', 'ces', 'cet', 'cette', 'son', 'sa', 'ses', 'leur', 'leurs', 'qui', 'que', 'qu', 'est', 'sont', 'se', 's', 'c', 'n', 'j', 'm', 't', 'y',
  // anglais
  'the', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'from', 'is', 'are', 'be', 'it', 'its', 'this', 'that', 'as', 'at',
]);

/** Étapes 1 et 2 : NFKD sans diacritiques, ligatures dépliées, minuscules ; tout ce qui n'est ni lettre ni chiffre devient une espace. */
export function texteNormalise(texte: string): string {
  return texte
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Étape 3 : pluriels simples, appliqués de la même façon à l'index et à la requête. */
export function singulier(mot: string): string {
  if (EXCEPTIONS_PLURIEL.has(mot)) return mot;
  // Un « js » final nomme une bibliothèque (nextjs, threejs), jamais un pluriel.
  if (mot.length >= 4 && mot.endsWith('s') && !/(?:ss|us|is|js)$/.test(mot)) return mot.slice(0, -1);
  if (/(?:eu|au)x$/.test(mot)) return mot.slice(0, -1);
  return mot;
}

/** Mots normalisés, sans mots vides, dans l'ordre du texte. */
export function motsNormalises(texte: string): string[] {
  const brut = texteNormalise(texte);
  if (!brut) return [];
  return brut
    .split(' ')
    .filter((mot) => !MOTS_VIDES.has(mot))
    .map(singulier);
}

/** Forme normalisée d'un texte ou d'un terme : mots normalisés séparés par une espace. */
export const normaliser = (texte: string): string => motsNormalises(texte).join(' ');

/** Le texte normalisé contient-il l'expression normalisée, en mots entiers ? Une expression vide ne correspond à rien. */
export function contientExpression(texte: string, expression: string): boolean {
  const t = normaliser(texte);
  const e = normaliser(expression);
  return e !== '' && ` ${t} `.includes(` ${e} `);
}
