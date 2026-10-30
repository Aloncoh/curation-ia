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

/** Fins de ligne uniformes et espaces de fin retirés : une simple différence de mise en forme ne crée pas de capture. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/** Empreinte SHA-256 du contenu d'un document : identifie le contenu, ne le remplace pas. */
export function contentHash(parts: { title: string; version: string | null; content: string }): string {
  const canonical = JSON.stringify([parts.title, parts.version ?? '', parts.content]);
  return createHash('sha256').update(canonical).digest('hex');
}
