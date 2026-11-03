// Contrôle d'une traduction par le code (ADR 0012, compromis) : chiffres, versions, noms propres, code et adresses de
// l'original doivent se retrouver tels quels dans la traduction, et aucun nombre ne doit apparaître. Ce contrôle ne
// remplace pas la vérification mot pour mot, qui porte toujours sur l'original anglais et ses captures.
import type { Champ } from './champs.ts';

export type CodeEcart = 'champ_manquant' | 'champ_en_trop' | 'texte_vide' | 'non_traduit' | 'invariant_absent' | 'nombre_ajoute' | 'langue_non_conforme';

export interface Ecart {
  cle: string;
  code: CodeEcart;
  detail?: string;
}

const URL = /https?:\/\/[^\s<>"'()]+/g;
const CODE = /`[^`\n]+`/g;
const NOMBRE = /\d+(?:[.,:]\d+)*/g;
const MOT = /[\p{L}\p{N}][\p{L}\p{N}+#._-]*[\p{L}\p{N}+#]|\p{L}/gu;

/** Mots capitalisés qui se traduisent normalement : mois, jours, pronom, sigle « AI » (IA en français). */
const TRADUISIBLES = new Set([
  'I', 'AI', 'OK', 'DMs', 'Europe', 'European', 'America', 'American', 'Asia', 'Africa', 'English', 'French', 'Hebrew',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

const sansPossessif = (mot: string) => mot.replace(/['’]s$/u, '');
// Début de phrase : après un point, un deux-points ou un point-virgule (« Étape 1 : In Claude Code… »), un saut de ligne, ou au tout début.
const finDePhrase = (avant: string) => avant.trim() === '' || /[.!?…:;·•\n]$/u.test(avant.replace(/[ \t]+$/u, ''));

function nombres(texte: string): string[] {
  return (texte.replace(URL, ' ').replace(CODE, ' ').match(NOMBRE) ?? []).map((n) => n.replace(/[.,:]+$/, ''));
}

/**
 * Chaînes à garder telles quelles : adresses, code entre accents graves, nombres et versions, noms propres (majuscule
 * intérieure comme GitHub ou vLLM, chiffre dans le mot, ou majuscule initiale hors début de phrase).
 */
export function invariants(texte: string): string[] {
  const trouves = new Set<string>();
  for (const u of texte.match(URL) ?? []) trouves.add(u.replace(/[.,;:]+$/, ''));
  for (const c of texte.match(CODE) ?? []) trouves.add(c.slice(1, -1));
  for (const n of nombres(texte)) trouves.add(n);
  const nettoye = texte.replace(URL, ' ').replace(CODE, ' ');
  const mots = [...nettoye.matchAll(MOT)].map((m, rang, tous) => ({
    // « HIPAA-enabled » → « HIPAA », « AI-generated » → « AI » : le mot courant après le trait d'union se traduit.
    mot: sansPossessif(m[0]).replace(/[._-]+$/, '').replace(/-\p{Ll}[\p{L}-]*$/u, ''),
    debut: finDePhrase(nettoye.slice(0, m.index)),
    suivant: tous[rang + 1]?.[0] ?? '',
  }));
  const enMilieu = new Set(mots.filter((x) => !x.debut && /^\p{Lu}/u.test(x.mot)).map((x) => x.mot));
  for (const { mot, debut, suivant } of mots) {
    if (mot.length < 2 || TRADUISIBLES.has(mot)) continue;
    const majusculeInterieure = /\p{Lu}/u.test(mot.slice(1));
    // « GPT-6 », « H100 », « v2.1 » : oui ; « 1-trillion-parameter », « 3-step » (nombre puis mot courant) : non.
    const avecChiffre = /\p{L}/u.test(mot) && /\d/.test(mot) && !/^\d[\d.,]*-\p{Ll}/u.test(mot);
    // En début de phrase, une majuscule ne dit rien : le mot n'est gardé que devant un numéro de version (« Widget 2.1 »,
    // pas « Rated 1-10 ») ou s'il porte aussi une majuscule en milieu de phrase ailleurs dans le texte.
    const majusculeInitiale = /^\p{Lu}/u.test(mot) && (!debut || /^v?\d+\.\d/.test(suivant) || enMilieu.has(mot));
    if (majusculeInterieure || avecChiffre || majusculeInitiale) trouves.add(mot);
  }
  return [...trouves];
}

/** Indices d'un texte déjà en français : lettres accentuées ou mots outils courants. */
export const dejaEnFrancais = (texte: string): boolean => /[éèêàçùôîœ]/iu.test(texte) || /\b(le|la|les|des|est|une|dans|pour|avec|qui)\b/iu.test(texte);

/** Écarts d'une traduction ; une liste vide signifie qu'elle peut être servie. */
export function controlerTraduction(original: readonly Champ[], traduits: Record<string, string>, langue: 'fr' | 'he'): Ecart[] {
  const ecarts: Ecart[] = [];
  const attendues = new Set(original.map((c) => c.cle));
  for (const cle of Object.keys(traduits)) if (!attendues.has(cle)) ecarts.push({ cle, code: 'champ_en_trop' });
  for (const champ of original) {
    const t = traduits[champ.cle];
    if (t === undefined) { ecarts.push({ cle: champ.cle, code: 'champ_manquant' }); continue; }
    if (t.trim() === '') { ecarts.push({ cle: champ.cle, code: 'texte_vide' }); continue; }
    // Un original déjà rédigé en français (défaut de données antérieur à l'anglais) peut rester identique en français.
    if (t.trim() === champ.texte.trim() && champ.texte.length > 40 && !(langue === 'fr' && dejaEnFrancais(champ.texte))) ecarts.push({ cle: champ.cle, code: 'non_traduit' });
    if (langue === 'he' && !/[֐-׿]/u.test(t)) ecarts.push({ cle: champ.cle, code: 'langue_non_conforme' });
    for (const inv of invariants(champ.texte)) if (!t.includes(inv)) ecarts.push({ cle: champ.cle, code: 'invariant_absent', detail: inv });
    const avant = new Set(nombres(champ.texte));
    for (const n of nombres(t)) if (!avant.has(n)) ecarts.push({ cle: champ.cle, code: 'nombre_ajoute', detail: n });
  }
  return ecarts;
}
