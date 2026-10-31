// Valeurs comparables d'un texte : version, date, prix, licence. Extraction déterministe, sans modèle.
// Ce sont des heuristiques : elles repèrent une contradiction probable, elles ne prouvent pas qu'une valeur est exacte.

export interface Valeurs {
  versions: Set<string>;
  dates: Set<string>;
  prix: Set<string>;
  licences: Set<string>;
}

export interface Contradiction {
  type: keyof Valeurs;
  valeur: string;
}

const MOIS: Record<string, number> = {
  janvier: 1, january: 1, jan: 1, février: 2, fevrier: 2, february: 2, feb: 2, mars: 3, march: 3, mar: 3, avril: 4, april: 4, apr: 4,
  mai: 5, may: 5, juin: 6, june: 6, jun: 6, juillet: 7, july: 7, jul: 7, août: 8, aout: 8, august: 8, aug: 8,
  septembre: 9, september: 9, sept: 9, sep: 9, octobre: 10, october: 10, oct: 10, novembre: 11, november: 11, nov: 11,
  décembre: 12, decembre: 12, december: 12, dec: 12,
};
const NOMS_MOIS = Object.keys(MOIS).sort((a, b) => b.length - a.length).join('|');
const DATE_ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const DATE_JOUR_MOIS = new RegExp(`(?<![\\p{L}\\p{N}])(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(${NOMS_MOIS})(?![\\p{L}])\\.?(?:\\s+(\\d{4})(?!\\d))?`, 'giu');
const DATE_MOIS_JOUR = new RegExp(`(?<![\\p{L}\\p{N}])(${NOMS_MOIS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\p{L}\\d])(?:,?\\s+(\\d{4})(?!\\d))?`, 'giu');

const DEVISES: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', usd: 'USD', eur: 'EUR', gbp: 'GBP', dollar: 'USD', dollars: 'USD', euro: 'EUR', euros: 'EUR' };
// Groupes de milliers bornés, pour rester linéaire. L'espace ne sépare les milliers qu'avant la devise (« 1 000 € ») :
// après un symbole, « $20 100 » est un prix suivi d'un autre nombre, comme dans un tableau.
const DECIMALES = '(?:[.,]\\d{1,2})?';
const FIN_MONTANT = '(?![.,]?\\d)';
const PRIX_DEVISE_AVANT = new RegExp(`([$€£])\\s?(\\d{1,3}(?:[.,]\\d{3}){1,4}${DECIMALES}${FIN_MONTANT}|\\d+${DECIMALES}${FIN_MONTANT})`, 'gi');
const PRIX_DEVISE_APRES = new RegExp(`(?<![\\p{L}\\p{N}.,])(\\d{1,3}(?:[.,\\s]\\d{3}){1,4}${DECIMALES}|\\d+${DECIMALES})\\s?(\\$|€|£|usd|eur|gbp|dollars?|euros?)(?![\\p{L}])`, 'giu');

const LICENCE = /\b(MIT|Apache(?:[- ]License)?[- ](?:v(?:ersion )?)?2(?:\.0)?|(?:A|L)?GPL[- ]?v?[23](?:\.\d)?|BSD[- ][23](?:-Clause)?|MPL[- ]2(?:\.0)?|ISC|Unlicense|CC[- ]BY(?:-[A-Z]{2})*(?:[- ]\d\.\d)?)\b/g;
const VERSION = /(?<![\p{L}\p{N}.])v?\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}.])v\d+(?:\.\d+)?(?![\p{L}\p{N}])|(?<=\bversion\s)\d+(?:\.\d+)*/giu;

const date = (annee: string | undefined, mois: number, jour: number) => {
  const mmjj = `${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
  return annee ? `${annee}-${mmjj}` : mmjj;
};

/** « 1,000 » et « 1 000 » sont des milliers ; « 1,50 » est une décimale. */
function montant(brut: string): string {
  const compact = brut.replace(/\s/g, '');
  // « 0.125 » est une décimale : un groupe de milliers ne suit jamais un zéro seul.
  const sansMilliers = !/^0[.,]/.test(compact) && /[.,]\d{3}(?:[.,]|$)/.test(compact) ? compact.replace(/[.,](?=\d{3}(?:[.,]|$))/g, '') : compact;
  return String(Number(sansMilliers.replace(',', '.')));
}

const licence = (brut: string) => brut.toUpperCase().replace(/LICENSE|VERSION|CLAUSE/g, '').replace(/[\s-]/g, '').replace(/V(?=\d)/, '').replace(/\.0$/, '');

export function valeursDe(texte: string): Valeurs {
  const dates = new Set<string>();
  for (const [, annee, mois, jour] of texte.matchAll(DATE_ISO)) dates.add(date(annee, Number(mois), Number(jour)));
  for (const [, jour, mois, annee] of texte.matchAll(DATE_JOUR_MOIS)) dates.add(date(annee, MOIS[mois!.toLowerCase()]!, Number(jour)));
  for (const [, mois, jour, annee] of texte.matchAll(DATE_MOIS_JOUR)) dates.add(date(annee, MOIS[mois!.toLowerCase()]!, Number(jour)));
  const prix = new Set<string>();
  for (const [, devise, valeur] of texte.matchAll(PRIX_DEVISE_AVANT)) prix.add(`${DEVISES[devise!]}:${montant(valeur!)}`);
  for (const [, valeur, devise] of texte.matchAll(PRIX_DEVISE_APRES)) prix.add(`${DEVISES[devise!.toLowerCase()]}:${montant(valeur!)}`);
  return {
    versions: new Set((texte.match(VERSION) ?? []).map((v) => v.replace(/^v/i, ''))),
    dates,
    prix,
    licences: new Set((texte.match(LICENCE) ?? []).map(licence)),
  };
}

/** « v2 », « 2.0 » et « 2.0.0-beta.1 » désignent la même version de base. */
const versionDeBase = (version: string) => version.replace(/-.*$/, '').replace(/(?:\.0)+$/, '');
const memeDate = (a: string, b: string) => a.slice(-5) === b.slice(-5) && (a.length === 5 || b.length === 5 || a === b);

/** L'analyse affirme une valeur alors que la capture en donne une autre, de même nature. Sans valeur de ce type dans la capture, rien n'est comparable. */
export function contradictions(affirme: Valeurs, source: Valeurs, version: string | null): Contradiction[] {
  const resultat: Contradiction[] = [];
  const versionsSource = new Set([...source.versions, ...(version ? [version] : [])].map(versionDeBase));
  for (const valeur of affirme.versions) if (source.versions.size > 0 && !versionsSource.has(versionDeBase(valeur))) resultat.push({ type: 'versions', valeur });
  for (const valeur of affirme.prix) if (source.prix.size > 0 && !source.prix.has(valeur)) resultat.push({ type: 'prix', valeur });
  for (const valeur of affirme.licences) if (source.licences.size > 0 && !source.licences.has(valeur)) resultat.push({ type: 'licences', valeur });
  for (const valeur of affirme.dates) if (source.dates.size > 0 && ![...source.dates].some((d) => memeDate(d, valeur))) resultat.push({ type: 'dates', valeur });
  return resultat;
}

/** Deux captures donnent chacune une seule valeur d'un même type, et elles diffèrent. Plusieurs valeurs dans une capture ne sont pas comparables. */
export function capturesIncompatibles(captures: string[]): Contradiction[] {
  const valeurs = captures.map(valeursDe);
  const resultat: Contradiction[] = [];
  for (const type of ['versions', 'dates', 'prix', 'licences'] as const) {
    const uniques = valeurs.filter((v) => v[type].size === 1).map((v) => [...v[type]][0]!);
    const distinctes = new Set(type === 'dates' ? uniques.map((d) => d.slice(-5)) : uniques);
    if (distinctes.size > 1) resultat.push({ type, valeur: [...distinctes].join(' ≠ ') });
  }
  return resultat;
}
