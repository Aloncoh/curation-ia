// Dates affichées dans la langue de l'interface, au fuseau Europe/Paris (CLAUDE.md) ; une date inconnue donne null.
// Liens affichés : https seulement. Module pur, utilisé par les composants serveur et client.
import { LOCALE_INTL, type Langue } from '@curation/textes';

/** Lien sûr à l'affichage aussi : https seulement, sans identifiants ; sinon le texte reste du texte (ADR 0003). */
export function hrefSur(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

const FUSEAU = 'Europe/Paris';

const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);

export function dateCourte(iso: string | null, langue: Langue): string | null {
  if (!iso) return null;
  const d = enDate(iso);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(LOCALE_INTL[langue], { timeZone: FUSEAU, day: 'numeric', month: 'short' }).format(d);
}

export function dateLongue(iso: string | null, langue: Langue): string | null {
  if (!iso) return null;
  const d = enDate(iso);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(LOCALE_INTL[langue], { timeZone: FUSEAU, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
