// Regroupement multi-sources (P6, bloc 1) : une même annonce vue par plusieurs sources (communiqué officiel, rubrique
// TechCrunch, rubrique The Verge…) devient une seule actualité. Le document arrivé après la renforce (rôle
// `supporting`) au lieu de créer une seconde actualité : un seul brouillon, une seule dépense, et ses passages
// restent citables par le brouillon (pipeline.autresCaptures).
//
// Règle, sans IA et volontairement prudente (un faux regroupement ferait disparaître un sujet ; un regroupement manqué
// est encore rattrapé à la publication par `doublon_possible`) :
// - même nature (annonce), autre source, vue pour la première fois dans les 3 jours ;
// - titres proches : au moins 3 mots significatifs en commun, et ces mots couvrent au moins 60 % du titre le plus court.
import { motsNormalises } from '../recherche/normaliser.ts';

export const JOURS_REGROUPEMENT = 3;
export const MOTS_COMMUNS_MIN = 3;
export const RECOUVREMENT_MIN = 0.6;

/** Mots génériques des titres de presse, sans valeur pour reconnaître un sujet (version 1, liste courte). */
const MOTS_GENERIQUES = new Set([
  'new', 'now', 'will', 'can', 'its', 'says', 'said', 'report', 'announce', 'announced', 'announces', 'launch', 'launches', 'launched',
  'unveil', 'unveils', 'unveiled', 'how', 'why', 'what', 'here', 'after', 'over', 'into', 'more', 'about', 'your', 'you', 'our',
  'nouveau', 'nouvelle', 'annonce', 'lance', 'plus', 'meet', 'latest', 'news', 'welcome',
  // Gabarits des communiqués financiers, communs à toutes les entreprises.
  'quarter', 'fiscal', 'financial', 'result', 'report', 'first', 'second', 'third', 'fourth', 'full', 'year', 'conference', 'call',
]);

/** Entreprises et marques suivies : deux titres qui en nomment de différentes ne parlent pas de la même annonce. */
const ENTREPRISES = new Set([
  'nvidia', 'amd', 'intel', 'apple', 'google', 'gemini', 'amazon', 'aw', 'microsoft', 'copilot', 'meta', 'facebook', 'samsung', 'shopify',
  'tesla', 'tsmc', 'qualcomm', 'broadcom', 'oracle', 'lg', 'openai', 'chatgpt', 'anthropic', 'claude', 'mistral', 'notion', 'figma',
  'spline', 'github', 'cursor', 'deepseek', 'huggingface', 'elevenlabs', 'suno', 'midjourney', 'blender', 'xai', 'grok',
]);

const entreprisesDe = (titre: string): string => [...new Set(motsNormalises(titre).filter((m) => ENTREPRISES.has(m)))].sort().join(',');

/** Mots significatifs d'un titre : normalisés, 3 caractères au moins, sans mots génériques. */
export function motsSignificatifs(titre: string): Set<string> {
  return new Set(motsNormalises(titre).filter((m) => m.length >= 3 && !MOTS_GENERIQUES.has(m)));
}

/** Les deux titres désignent-ils vraisemblablement la même annonce ? */
export function memeSujet(a: string, b: string): boolean {
  const x = motsSignificatifs(a);
  const y = motsSignificatifs(b);
  if (x.size === 0 || y.size === 0) return false;
  const ea = entreprisesDe(a);
  const eb = entreprisesDe(b);
  if (ea && eb && ea !== eb) return false;
  let communs = 0;
  for (const m of x) if (y.has(m)) communs++;
  return communs >= MOTS_COMMUNS_MIN && communs / Math.min(x.size, y.size) >= RECOUVREMENT_MIN;
}
