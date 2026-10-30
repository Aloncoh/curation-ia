// Source « flux RSS / Atom » officiel (ex. OpenAI News, GitHub Changelog).
import { parseFeed } from '@rowanmanning/feed-parser';
import { SourceFormatError, type CollectedDocument } from './github-releases.ts';
import { contentHash, normalizeText, normalizeUrl } from './normalize.ts';

export interface FeedConfig {
  url: string;
  /** Nombre maximal d'entrées gardées, les plus récentes d'abord (certains flux contiennent tout leur historique). */
  maxItems: number;
}

export const FEED_HEADERS: Record<string, string> = {
  accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
};

function httpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoDate(date: Date | null | undefined): string | null {
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/**
 * Transforme un flux en documents. Identité d'une entrée : son lien normalisé (plus stable que le « guid »,
 * qui change parfois pour une même entrée), sinon son guid. Le contenu reste une donnée, jamais une instruction.
 */
export function parseFeedItems(body: string, maxItems: number): CollectedDocument[] {
  let feed: ReturnType<typeof parseFeed>;
  try {
    feed = parseFeed(body);
  } catch {
    throw new SourceFormatError('Flux RSS/Atom illisible');
  }

  // Un flux officiel a toujours des entrées : zéro entrée signale plutôt une page d'erreur (à traiter comme une panne).
  if (feed.items.length === 0) throw new SourceFormatError('Flux sans aucune entrée');

  const documents: CollectedDocument[] = [];
  const seen = new Set<string>();
  for (const item of feed.items) {
    const link = httpUrl(item.url);
    const guid = item.id?.trim() || null;
    const externalId = link ? normalizeUrl(link) : guid;
    if (!externalId || seen.has(externalId)) continue;
    seen.add(externalId);

    const title = normalizeText(item.title ?? '');
    const content = normalizeText(item.content ?? item.description ?? '');
    documents.push({
      externalId,
      url: link ?? externalId,
      normalizedUrl: link ? normalizeUrl(link) : externalId,
      title,
      version: null,
      announcedAt: isoDate(item.published) ?? isoDate(item.updated),
      content,
      contentFormat: 'html',
      contentHash: contentHash({ title, version: null, content }),
      metadata: {
        guid,
        categories: item.categories.map((category) => category.label ?? category.term).filter(Boolean),
        updatedAt: isoDate(item.updated),
      },
    });
  }
  if (documents.length === 0) {
    throw new SourceFormatError('Flux sans entrée exploitable (ni lien ni identifiant)');
  }

  // Les plus récentes d'abord ; les entrées sans date en dernier.
  documents.sort((a, b) => (b.announcedAt ?? '').localeCompare(a.announcedAt ?? ''));
  return documents.slice(0, maxItems);
}
