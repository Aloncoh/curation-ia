// Normalisation des URL, des dates et des contenus, et empreinte (hash) des contenus.
import { createHash } from 'node:crypto';

const TRACKING_PARAMS = /^(utm_[a-z0-9_]+|ref|ref_src|fbclid|gclid|mc_cid|mc_eid)$/i;

/** URL canonique : sans fragment, sans paramètres de suivi, paramètres triés, sans port par défaut ni « / » final. */
export function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  url.search = new URLSearchParams(kept).toString();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

/** Date ISO 8601 en UTC, ou null si absente ou illisible (jamais de date inventée). */
export function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Fins de ligne uniformes et espaces de fin retirés : une simple différence de mise en forme ne crée pas de capture.
 * Le caractère NUL est retiré : le pilote libSQL tronque un texte relu à cet endroit.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

// Entités HTML nommées courantes dans les flux réels ; les références numériques sont toutes décodées.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…',
  middot: '·', bull: '•', times: '×', copy: '©', reg: '®', trade: '™', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
};

/**
 * Décode une fois les références d'entités (nommées courantes et numériques). Réservé aux champs en texte brut
 * (titres, catégories, extraits) : le résultat ne doit jamais être interprété comme du HTML.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const value = code[1] === 'x' || code[1] === 'X' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

export const TITLE_MAX_LENGTH = 500;

/**
 * Titre sur une ligne, affichable sans risque d'usurpation : sans caractères de contrôle, marques de sens
 * d'écriture (U+202E, U+061C…) ni caractères de largeur nulle ; espaces regroupés, longueur plafonnée.
 */
export function cleanTitle(text: string): string {
  const cleaned = text
    .replace(/[\p{Cc}\p{Bidi_Control}\u200b-\u200d\u2060\ufeff]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH - 1)}…` : cleaned;
}

/** Empreinte SHA-256 du contenu d'un document : identifie le contenu, ne le remplace pas. */
export function contentHash(parts: { title: string; version: string | null; content: string }): string {
  const canonical = JSON.stringify([parts.title, parts.version ?? '', parts.content]);
  return createHash('sha256').update(canonical).digest('hex');
}
