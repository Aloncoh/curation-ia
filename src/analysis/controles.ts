// Contrôles déterministes d'un brouillon. Ils détectent des écarts ; ils ne prouvent pas qu'une affirmation est vraie.
// Le soutien, le contexte, les indices et les contradictions sont des heuristiques : un brouillon qui les passe reste « contrôlé automatiquement ».
import { contientMotPourMot, nombresDe, normaliserEspaces } from '../maquette/data.ts';
import type { Brouillon } from './schemas.ts';
import { capturesIncompatibles, contradictions, valeursDe } from './valeurs.ts';

export const LIBELLE_CONTROLE = 'Contrôlé automatiquement — citations retrouvées, exactitude non garantie';

/** Média impossible à construire : le brouillon est rejeté au lieu de rester à vérifier (docs/agents-editoriaux.md §6). */
export const CODES_BLOQUANTS = new Set(['media_non_conforme']);

export interface Controle {
  champ: string;
  code: string;
  detail?: string;
}

export interface ContexteControle {
  typeInformation?: string;
  /** Nom à retrouver dans l'accroche : celui du catalogue, sinon celui relevé à la qualification. */
  produit?: string | null;
  /** Le catalogue est connu sans le modèle : son nom n'a pas à figurer dans la capture. */
  produitCatalogue?: boolean;
  dateAnnonce?: string | null;
  autresCaptures?: string[];
}

export interface DiapositiveResolue {
  champ: string;
  libelle: string;
  texte: string;
}

// Liste anti-sensationnalisme, version 1 (docs/agents-editoriaux.md §6).
const SENSATIONNEL = /révolutionnaire|incroyable|époustouflant|hallucinant|game changer|tout change|vous n['’]allez pas croire|ce que personne ne vous dit|\bchoc\b/i;
const SIGLES = new Set(['API', 'MCP', 'SDK', 'CLI', 'IA', 'AI', 'GPU', 'CPU', 'LLM', 'GPT', 'RAG', 'SQL', 'RSS', 'HTTP', 'JSON', 'URL', 'UI', 'UX', '3D', 'PDF', 'DOCX', 'XLSX', 'CSV', 'HTML', 'CSS', 'PNG', 'JPG', 'SVG', 'MP3', 'MP4']);
const NUANCE_SOURCE = /\b(?:not|never|only|except|unless|may|might|preview|beta|experimental|limited|deprecated|coming soon|planned)\b|n[’']t\b/i;
// Bornes Unicode : `\b` ignore les lettres accentuées, « limité » n'y serait jamais reconnu.
const NUANCE_TEXTE = /(?<![\p{L}\p{N}])(?:(?:ne|pas|jamais|seulement|uniquement|sauf|peut|peuvent|pourrait|sans|préversion|bêta|expérimentale?s?|expérimentaux|limitée?s?|restreinte?s?|indisponibles?|bientôt|prévue?s?|selon)(?![\p{L}\p{N}])|n['’])/iu;
// Heuristiques : elles repèrent un passage hors sujet, elles ne prouvent pas que le coût ou l'accès annoncé est exact.
const INDICE_COUT = /[$€£]\s?\d|\d\s?(?:[$€£]|usd\b|eur\b|dollars?\b|euros?\b)|\bfree\b|\bgratuit\w*|\bno cost\b|\bpric\w*|\bcosts?\b|\bpaid\b|\bplans?\b|\btiers?\b|\bsubscri\w*|\bcredits?\b|\bbilling\b/i;
const GRATUITE = /\bfree\b|\bgratuit\w*|\bno cost\b|\bsans frais\b/i;
const INDICE_ACCES = /https?:\/\/|\b(?:available|access|download\w*|install\w*|sign[- ]?up|waitlist|rolling out|preview|beta|github|npm|pip|marketplace|disponible\w*|accès)\b/i;
const ATTRIBUTION = /\bselon\b|d['’]après|\baffirme\b|\brevendique\b|\bindique\b|\bannonce (?:que|une?|l[ea]s?|des|son|sa|ses)\b/i;
// Un pourcentage seul peut être une remise ou une part d'écran : seule une comparaison compte comme une performance.
const PERFORMANCE = /\bbenchmarks?\b|\bscores?\b|\bfois plus\b|\d\s*%\s*(?:de\s+)?(?:plus|moins|mieux)\b|\d\s*x\s+plus\b/i;
const SUPERLATIF = /\b(?:l[ea]s?|du|des) (?:plus|meilleur\w*)\b|\bmeilleur\w*|\bplus (?:rapide|puissant|précis|performant|fiable)\w*|\bfois plus\b|\b\d+\s*(?:%|fois)|\bleader\b|\bn°\s*1\b/i;
/** Types jamais publiables comme un fait : ils passent toujours en relecture. */
const TYPES_A_RELIRE = ['non_confirmee', 'opinion', 'temoignage'];
/** Au-delà, un passage cesse d'être une citation et devient une reprise de la source. */
const LONGUEUR_MAX_PASSAGE = 300;
/** Autant de mots consécutifs repris de la capture dans un texte rédigé : une copie, pas une synthèse. */
const MOTS_DE_COPIE = 8;
const MOTS_VIDES = new Set(['the', 'and', 'for', 'with', 'new', 'now', 'you', 'your', 'our', 'from', 'how', 'why', 'what', 'into', 'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'nos', 'vos']);
const LIBELLES_CHAMPS = { accroche: 'Accroche', nouveaute: 'Nouveauté', ce_que_ca_permet: 'Ce que ça permet', pour_qui: 'Pour qui', acces: 'Accès', cout: 'Coût', limites_connues: 'Limites connues' } as const;

const mots = (texte: string) => (texte.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.+-]*/gu) ?? []).map((m) => m.replace(/\.+$/, ''));
/** Moins de trois mots, séparés par des espaces : un point, une version ou une adresse se retrouve partout et ne soutient rien. */
export const moinsDeTroisMots = (texte: string) => texte.trim().split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length < 3;
const numeroDeVersion = (mot: string) => /^v?\d[\d.]*$/.test(mot);
/** Noms propres : mot à majuscule, sauf en début de phrase. */
const nomsPropres = (texte: string) =>
  [...texte.matchAll(/(?<![.!?:]\s)(?<=\s)[A-Z][\p{L}\p{N}.+-]{2,}/gu)].map((m) => m[0].replace(/[.,]+$/, ''));

function recopie(texte: string, capture: string): boolean {
  const suite = normaliserEspaces(texte).toLowerCase().split(' ');
  const source = capture.toLowerCase();
  for (let i = 0; i + MOTS_DE_COPIE <= suite.length; i++) if (source.includes(suite.slice(i, i + MOTS_DE_COPIE).join(' '))) return true;
  return false;
}

/** Trois mots ou plus en majuscules d'affilée, hors sigles connus. */
function crie(texte: string): boolean {
  let suite = 0;
  for (const brut of texte.split(/\s+/)) {
    const mot = brut.replace(/[^\p{L}\p{N}]/gu, '');
    const majuscules = mot.length > 1 && /\p{L}/u.test(mot) && mot === mot.toUpperCase() && !SIGLES.has(mot);
    suite = majuscules ? suite + 1 : 0;
    if (suite >= 3) return true;
  }
  return false;
}
const sensationnel = (texte: string) => SENSATIONNEL.test(texte) || texte.includes('!') || crie(texte);

function resoudre(b: Brouillon, champ: Brouillon['diapositives'][number]): DiapositiveResolue | null {
  if (champ.startsWith('details:')) {
    const detail = b.details[Number(champ.slice('details:'.length))];
    return detail ? { champ, libelle: detail.titre, texte: detail.texte } : null;
  }
  const cle = champ as keyof typeof LIBELLES_CHAMPS;
  const valeur = b[cle];
  return valeur ? { champ, libelle: LIBELLES_CHAMPS[cle], texte: valeur.texte } : null;
}

/** Diapositives du média généré : chacune reprend un champ renseigné, jamais un texte nouveau. */
export const diapositivesDe = (b: Brouillon): DiapositiveResolue[] => b.diapositives.flatMap((champ) => resoudre(b, champ) ?? []);

/** `capture` : titre et texte séparés, pour qu'une citation ne puisse pas enjamber les deux. */
export function controlerBrouillon(b: Brouillon, capture: string | string[], titre: string, version: string | null, contexte: ContexteControle = {}): Controle[] {
  const { typeInformation, produit, produitCatalogue, dateAnnonce, autresCaptures = [] } = contexte;
  const parties = [capture].flat().map(normaliserEspaces);
  const texte = parties.join(' ');
  const trouve = (passage: string) => parties.some((partie) => contientMotPourMot(partie, passage));
  const resultats: Controle[] = [];
  const produitValide = Boolean(produit) && (produitCatalogue || trouve(normaliserEspaces(produit!)));
  if (produit && !produitValide) resultats.push({ champ: 'produit', code: 'produit_introuvable', detail: produit });
  const nomsConnus = new Set(produitValide ? mots(produit!) : []);
  const source = valeursDe(texte);
  if (dateAnnonce) source.dates.add(dateAnnonce.slice(0, 10));
  const champs: [string, { texte: string; passages: string[] }][] = [
    ...Object.entries({
      accroche: b.accroche, description: b.description, nouveaute: b.nouveaute,
      ce_que_ca_permet: b.ce_que_ca_permet, pour_qui: b.pour_qui, acces: b.acces, cout: b.cout, limites_connues: b.limites_connues,
    }).filter((e): e is [string, Brouillon['accroche']] => e[1] !== null),
    ...b.details.map((d, i): [string, Brouillon['accroche']] => [`details:${i}`, d]),
    ...b.attributions.map((a, i): [string, Brouillon['accroche']] => [`attributions:${i}`, a]),
    ...b.attributions.flatMap((a, i): [string, Brouillon['accroche']][] => (a.conditions ? [[`attributions:${i}:conditions`, a.conditions]] : [])),
  ];
  for (const [champ, c] of champs) {
    if (c.passages.length === 0) resultats.push({ champ, code: 'champ_sans_citation' });
    const passages = c.passages.map(normaliserEspaces);
    for (const p of passages) if (!trouve(p)) resultats.push({ champ, code: 'citation_introuvable', detail: p });
    for (const p of passages) if (moinsDeTroisMots(p)) resultats.push({ champ, code: 'citation_trop_courte', detail: p });
    for (const p of passages) if (p.length > LONGUEUR_MAX_PASSAGE) resultats.push({ champ, code: 'citation_trop_longue', detail: p.slice(0, 60) });
    if (recopie(c.texte, texte)) resultats.push({ champ, code: 'copie_de_la_source' });
    if (!champ.startsWith('attributions:') && PERFORMANCE.test(c.texte) && !ATTRIBUTION.test(c.texte)) resultats.push({ champ, code: 'benchmark_non_attribue' });
    const cite = passages.join(' ');
    if (champ === 'cout' && !INDICE_COUT.test(cite)) resultats.push({ champ, code: 'cout_sans_indice' });
    if (champ === 'cout' && GRATUITE.test(c.texte) && !GRATUITE.test(cite)) resultats.push({ champ, code: 'gratuite_non_citee' });
    if (champ === 'acces' && !INDICE_ACCES.test(cite)) resultats.push({ champ, code: 'acces_sans_indice' });
    for (const n of nombresDe(c.texte)) if (n !== version && !nombresDe(cite).includes(n)) resultats.push({ champ, code: 'nombre_absent_des_citations', detail: n });
    // Soutien : un nom propre affirmé doit figurer dans les passages cités du champ.
    for (const nom of nomsPropres(c.texte)) if (!cite.includes(nom) && !nomsConnus.has(nom.toLowerCase())) resultats.push({ champ, code: 'soutien_nom_absent', detail: nom });
    // Contexte : une réserve dans le passage ou juste autour ne doit pas disparaître du texte français.
    for (const p of passages) {
      const i = texte.indexOf(p);
      const autour = i < 0 ? p : texte.slice(Math.max(0, i - 120), i + p.length + 120);
      if (NUANCE_SOURCE.test(autour) && !NUANCE_TEXTE.test(c.texte)) resultats.push({ champ, code: 'contexte_a_relire', detail: p });
    }
    for (const x of contradictions(valeursDe(c.texte), source, version)) resultats.push({ champ, code: 'sources_contradictoires', detail: `${x.type} : ${x.valeur}` });
  }
  for (const x of capturesIncompatibles([texte, ...autresCaptures])) resultats.push({ champ: 'captures', code: 'sources_contradictoires', detail: `${x.type} : ${x.valeur}` });
  for (const [i, a] of b.attributions.entries()) {
    if (!trouve(normaliserEspaces(a.auteur))) resultats.push({ champ: `attributions:${i}`, code: 'auteur_introuvable', detail: a.auteur });
    if (a.type === 'benchmark' && !a.conditions) resultats.push({ champ: `attributions:${i}`, code: 'benchmark_sans_conditions' });
  }
  const a = b.accroche.texte;
  if (a.length > 110 || a.includes('?') || sensationnel(a)) resultats.push({ champ: 'accroche', code: 'accroche_non_conforme' });
  const motsAccroche = new Set(mots(a));
  // Un numéro de version ne nomme rien. Sans produit connu, un mot significatif du titre reste une approximation.
  const nomme = produit
    ? mots(produit).every((m) => motsAccroche.has(m))
    : mots(titre).some((m) => m.length > 2 && !MOTS_VIDES.has(m) && !numeroDeVersion(m) && motsAccroche.has(m));
  if (!nomme) resultats.push({ champ: 'accroche', code: 'accroche_non_conforme', detail: 'produit ou éditeur non nommé' });
  if (b.accroche.passages.length === 0) resultats.push({ champ: 'accroche', code: 'accroche_non_conforme', detail: 'sans citation' });
  if (!b.ce_que_ca_permet && !b.pour_qui) resultats.push({ champ: 'ce_que_ca_permet', code: 'interet_concret_absent' });
  // Le média ne doit rien ajouter : chaque diapositive reprend un champ renseigné, une seule fois.
  const diapositives = diapositivesDe(b);
  const compte = b.diapositives.length;
  if (compte < 2 || compte > 5 || diapositives.length !== compte || new Set(b.diapositives).size !== compte) resultats.push({ champ: 'diapositives', code: 'media_non_conforme' });
  // L'accroche a déjà son propre contrôle : un terme interdit la laisse à vérifier, il ne rejette pas le brouillon.
  for (const d of diapositives) if (d.champ !== 'accroche' && sensationnel(d.texte)) resultats.push({ champ: d.champ, code: 'diapositive_sensationnelle' });
  // Une annonce commerciale reste attribuée à son auteur, jamais présentée comme une performance vérifiée.
  if (typeInformation === 'affirmation_commerciale') {
    if (!ATTRIBUTION.test(b.description.texte)) resultats.push({ champ: 'description', code: 'attribution_manquante' });
    for (const [champ, c] of champs) if (SUPERLATIF.test(c.texte) && !ATTRIBUTION.test(c.texte)) resultats.push({ champ, code: 'attribution_manquante' });
  }
  if (typeInformation && TYPES_A_RELIRE.includes(typeInformation)) resultats.push({ champ: 'type_information', code: 'type_a_relire', detail: typeInformation });
  return resultats;
}
