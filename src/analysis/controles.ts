// Contrôles déterministes d'un brouillon. Ils détectent des écarts ; ils ne prouvent pas qu'une affirmation est vraie.
// Le soutien et le contexte sont des heuristiques : un brouillon qui les passe reste « contrôlé automatiquement ».
import { contientMotPourMot, nombresDe, normaliserEspaces } from '../maquette/data.ts';
import type { Brouillon } from './schemas.ts';

export const LIBELLE_CONTROLE = 'Contrôlé automatiquement — citations retrouvées, exactitude non garantie';

export interface Controle {
  champ: string;
  code: string;
  detail?: string;
}

// Liste anti-sensationnalisme, version 1 (docs/agents-editoriaux.md §6).
const SENSATIONNEL = /révolutionnaire|incroyable|époustouflant|hallucinant|game changer|tout change|vous n'allez pas croire|ce que personne ne vous dit|\bchoc\b/i;
const NUANCE_SOURCE = /\b(?:not|never|only|except|unless|may|might|preview|beta|experimental|limited|deprecated|coming soon|planned)\b|n[’']t\b/i;
const NUANCE_TEXTE = /\b(?:ne|pas|jamais|seulement|uniquement|sauf|peut|peuvent|pourrait|préversion|bêta|expérimental|limité|limitée|bientôt|prévu|prévue|selon)\b|\bn['’]/i;
// Heuristiques : elles repèrent un passage hors sujet, elles ne prouvent pas que le coût ou l'accès annoncé est exact.
const INDICE_COUT = /[$€£]\s?\d|\d\s?(?:[$€£]|usd\b|eur\b|dollars?\b|euros?\b)|\bfree\b|\bgratuit\w*|\bno cost\b|\bpric\w*|\bcosts?\b|\bpaid\b|\bplans?\b|\btiers?\b|\bsubscri\w*|\bcredits?\b|\bbilling\b/i;
const GRATUITE = /\bfree\b|\bgratuit\w*|\bno cost\b|\bsans frais\b/i;
const INDICE_ACCES = /https?:\/\/|\b(?:available|access|download\w*|install\w*|sign[- ]?up|waitlist|rolling out|preview|beta|github|npm|pip|marketplace|disponible\w*|accès)\b/i;
const ATTRIBUTION = /\bselon\b|d['’]après|\baffirme\b|\brevendique\b|\bindique\b|\bannonce (?:que|une?|l[ea]s?|des|son|sa|ses)\b/i;
const SUPERLATIF = /\b(?:l[ea]s?|du|des) (?:plus|meilleur\w*)\b|\bmeilleur\w*|\bplus (?:rapide|puissant|précis|performant|fiable)\w*|\bfois plus\b|\b\d+\s*(?:%|fois)|\bleader\b|\bn°\s*1\b/i;
/** Types jamais publiables comme un fait : ils passent toujours en relecture. */
const TYPES_A_RELIRE = ['non_confirmee', 'opinion', 'temoignage'];
const MOTS_VIDES = new Set(['the', 'and', 'for', 'with', 'new', 'now', 'you', 'your', 'our', 'from', 'how', 'why', 'what', 'into', 'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'nos', 'vos']);
const mots = (texte: string) => (texte.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.+-]*/gu) ?? []).map((m) => m.replace(/\.+$/, ''));
/** Moins de trois mots, séparés par des espaces : un point, une version ou une adresse se retrouve partout et ne soutient rien. */
export const moinsDeTroisMots = (texte: string) => texte.trim().split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length < 3;
const numeroDeVersion = (mot: string) => /^v?\d[\d.]*$/.test(mot);
/** Noms propres : mot à majuscule, sauf en début de phrase. */
const nomsPropres = (texte: string) =>
  [...texte.matchAll(/(?<![.!?:]\s)(?<=\s)[A-Z][\p{L}\p{N}.+-]{2,}/gu)].map((m) => m[0].replace(/[.,]+$/, ''));

/** `produit` : nom issu du catalogue, connu sans le modèle ; le citer n'est pas exigé, mais l'accroche doit le nommer. */
export function controlerBrouillon(b: Brouillon, capture: string, titre: string, version: string | null, typeInformation?: string, produit?: string | null): Controle[] {
  const texte = normaliserEspaces(capture);
  const resultats: Controle[] = [];
  const nomsCatalogue = new Set(mots(produit ?? ''));
  const champs = Object.entries({
    accroche: b.accroche, description: b.description, nouveaute: b.nouveaute,
    ce_que_ca_permet: b.ce_que_ca_permet, pour_qui: b.pour_qui, acces: b.acces, cout: b.cout, limites_connues: b.limites_connues,
  }).filter((e): e is [string, Brouillon['accroche']] => e[1] !== null);
  for (const [champ, c] of champs) {
    if (c.passages.length === 0) resultats.push({ champ, code: 'champ_sans_citation' });
    const passages = c.passages.map(normaliserEspaces);
    for (const p of passages) if (!contientMotPourMot(texte, p)) resultats.push({ champ, code: 'citation_introuvable', detail: p });
    for (const p of passages) if (moinsDeTroisMots(p)) resultats.push({ champ, code: 'citation_trop_courte', detail: p });
    const cite = passages.join(' ');
    if (champ === 'cout' && !INDICE_COUT.test(cite)) resultats.push({ champ, code: 'cout_sans_indice' });
    if (champ === 'cout' && GRATUITE.test(c.texte) && !GRATUITE.test(cite)) resultats.push({ champ, code: 'gratuite_non_citee' });
    if (champ === 'acces' && !INDICE_ACCES.test(cite)) resultats.push({ champ, code: 'acces_sans_indice' });
    for (const n of nombresDe(c.texte)) if (n !== version && !nombresDe(cite).includes(n)) resultats.push({ champ, code: 'nombre_absent_des_citations', detail: n });
    // Soutien : un nom propre affirmé doit figurer dans les passages cités du champ.
    for (const nom of nomsPropres(c.texte)) if (!cite.includes(nom) && !nomsCatalogue.has(nom.toLowerCase())) resultats.push({ champ, code: 'soutien_nom_absent', detail: nom });
    // Contexte : une réserve dans le passage ou juste autour ne doit pas disparaître du texte français.
    for (const p of passages) {
      const i = texte.indexOf(p);
      const autour = i < 0 ? p : texte.slice(Math.max(0, i - 120), i + p.length + 120);
      if (NUANCE_SOURCE.test(autour) && !NUANCE_TEXTE.test(c.texte)) resultats.push({ champ, code: 'contexte_a_relire', detail: p });
    }
  }
  const a = b.accroche.texte;
  if (a.length > 110 || /[!?]/.test(a) || SENSATIONNEL.test(a)) resultats.push({ champ: 'accroche', code: 'accroche_non_conforme' });
  const motsAccroche = new Set(mots(a));
  // Un numéro de version ne nomme rien. Sans produit au catalogue, un mot significatif du titre reste une approximation.
  const nomme = produit
    ? mots(produit).every((m) => motsAccroche.has(m))
    : mots(titre).some((m) => m.length > 2 && !MOTS_VIDES.has(m) && !numeroDeVersion(m) && motsAccroche.has(m));
  if (!nomme) resultats.push({ champ: 'accroche', code: 'accroche_sans_produit' });
  if (!b.ce_que_ca_permet && !b.pour_qui) resultats.push({ champ: 'ce_que_ca_permet', code: 'interet_concret_absent' });
  // Une annonce commerciale reste attribuée à son auteur, jamais présentée comme une performance vérifiée.
  if (typeInformation === 'affirmation_commerciale') {
    if (!ATTRIBUTION.test(b.description.texte)) resultats.push({ champ: 'description', code: 'attribution_manquante' });
    for (const [champ, c] of champs) if (SUPERLATIF.test(c.texte) && !ATTRIBUTION.test(c.texte)) resultats.push({ champ, code: 'attribution_manquante' });
  }
  if (typeInformation && TYPES_A_RELIRE.includes(typeInformation)) resultats.push({ champ: 'type_information', code: 'type_a_relire', detail: typeInformation });
  return resultats;
}
