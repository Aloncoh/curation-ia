// Langues de l'interface (ADR 0012) : anglais, français, hébreu. Ordre de choix : le choix mémorisé, puis la première
// langue du navigateur disponible ici, puis l'anglais en secours. Fonctions pures, reprises de la session mobile
// (apps/mobile/src/textes/langues.ts) et complétées pour l'en-tête Accept-Language du site.

export type Langue = 'en' | 'fr' | 'he';
export type Sens = 'ltr' | 'rtl';

export const LANGUES: readonly Langue[] = ['en', 'fr', 'he'];
export const LANGUE_DE_SECOURS: Langue = 'en';
/** Langue d'origine des publications des agents (décision de l'utilisateur du 2026-11-03). */
export const LANGUE_ORIGINALE: Langue = 'en';
/** Cookie du choix mémorisé : la langue seule, rien d'autre. */
export const COOKIE_LANGUE = 'langue';

/** Nom de chaque langue dans cette langue : on reconnaît la sienne quelle que soit l'interface. */
export const NOMS_LANGUES: Record<Langue, string> = { en: 'English', fr: 'Français', he: 'עברית' };

/** Formats de date : jour, mois, année dans les trois langues. */
export const LOCALE_INTL: Record<Langue, string> = { en: 'en-GB', fr: 'fr-FR', he: 'he-IL' };

export function estLangue(valeur: unknown): valeur is Langue {
  return typeof valeur === 'string' && (LANGUES as readonly string[]).includes(valeur);
}

export function sensDe(langue: Langue): Sens {
  return langue === 'he' ? 'rtl' : 'ltr';
}

/** « fr-FR » → fr ; « iw » (ancien code de l'hébreu) → he ; inconnu → null. */
export function langueDepuisCode(code: string | null | undefined): Langue | null {
  if (!code) return null;
  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  if (base === 'iw') return 'he';
  return estLangue(base) ? base : null;
}

/** Codes de l'en-tête Accept-Language, du préféré au moins préféré ; les entrées à q=0 ou mal formées sont ignorées. */
export function codesAcceptLanguage(entete: string | null | undefined): string[] {
  if (!entete) return [];
  return entete
    .slice(0, 500)
    .split(',')
    .map((partie, rang) => {
      const [code = '', ...params] = partie.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const poids = q === undefined ? 1 : Number(q.slice(2));
      return { code: code.trim(), poids: Number.isFinite(poids) ? poids : 0, rang };
    })
    .filter((x) => x.code !== '' && x.code !== '*' && x.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.rang - b.rang)
    .map((x) => x.code);
}

export type SourceLangue = 'choix' | 'navigateur' | 'secours';

/** Langue de l'interface : le choix mémorisé s'il est valide, sinon la première langue du navigateur disponible, sinon l'anglais. */
export function resoudreLangue(choix: unknown, codesNavigateur: readonly string[]): { langue: Langue; source: SourceLangue } {
  if (estLangue(choix)) return { langue: choix, source: 'choix' };
  for (const code of codesNavigateur) {
    const trouvee = langueDepuisCode(code);
    if (trouvee) return { langue: trouvee, source: 'navigateur' };
  }
  return { langue: LANGUE_DE_SECOURS, source: 'secours' };
}
