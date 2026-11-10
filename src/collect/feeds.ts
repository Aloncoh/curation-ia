// Source « flux RSS / Atom » officiel (ex. OpenAI News, GitHub Changelog).
// Les champs sont lus directement dans le XML (un seul décodage des entités, CDATA conservé tel quel) :
// les accesseurs « normalisés » de la bibliothèque décodent une seconde fois, ce qui transformerait un texte
// inerte (« &lt;img…&gt; ») en balise active et rendrait la capture infidèle à la source.
import { parseFeed } from '@rowanmanning/feed-parser';
import { SourceFormatError, type CollectedDocument } from './github-releases.ts';
import { cleanTitle, contentHash, decodeHtmlEntities, normalizeText, normalizeUrl } from './normalize.ts';

export interface FeedConfig {
  url: string;
  /** Nombre maximal d'entrées gardées, les plus récentes d'abord (certains flux contiennent tout leur historique). */
  maxItems: number;
  /** Hôtes autorisés pour le lien d'une entrée (https uniquement) : un lien ailleurs est refusé et compté. */
  linkHosts: string[];
  /**
   * Plan de site (sitemap.xml) au lieu d'un flux, pour un éditeur sans flux (Anthropic, 2026-11-10) : seules les pages
   * dont le chemin commence par un des préfixes sont gardées, les plus récemment modifiées d'abord.
   */
  plan?: { prefixes: string[] };
}

/**
 * Lit un plan de site : chaque page autorisée devient un document sans contenu (la page est capturée ensuite par
 * l'approfondissement). `lastmod` est une date de modification, pas de publication : elle est gardée en métadonnée et
 * la date d'annonce reste inconnue (null), lue plus tard dans la page.
 */
export function parseSitemap(body: string, config: Pick<FeedConfig, 'maxItems' | 'linkHosts'> & { plan: { prefixes: string[] } }): ParsedFeed {
  if (!/<urlset[\s>]/.test(body)) throw new SourceFormatError('Plan de site illisible (pas de <urlset>)');
  const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  if (entries.length > MAX_FEED_ENTRIES * 4) throw new SourceFormatError(`Plan de site trop long : ${entries.length} pages`);
  const rejected: Record<string, number> = {};
  const candidates: { url: string; externalId: string; lastmod: string | null }[] = [];
  const seen = new Set<string>();
  for (const [, bloc] of entries) {
    const loc = decodeHtmlEntities(/<loc>\s*([^<]+?)\s*<\/loc>/.exec(bloc ?? '')?.[1] ?? '');
    const link = checkLink(loc || null, config.linkHosts);
    if ('reason' in link) {
      rejected[link.reason] = (rejected[link.reason] ?? 0) + 1;
      continue;
    }
    const chemin = new URL(link.url).pathname;
    if (!config.plan.prefixes.some((p) => chemin.startsWith(p))) {
      rejected.hors_rubrique = (rejected.hors_rubrique ?? 0) + 1;
      continue;
    }
    const externalId = normalizeUrl(link.url);
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    const brut = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(bloc ?? '')?.[1];
    candidates.push({ url: link.url, externalId, lastmod: brut ? isoDate(new Date(brut)) : null });
  }
  if (candidates.length === 0) throw new SourceFormatError('Plan de site sans page exploitable');
  candidates.sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? ''));
  const documents = candidates.slice(0, config.maxItems).map(({ url, externalId, lastmod }): CollectedDocument => {
    // Titre provisoire tiré de l'adresse ; le titre de la page vient de sa capture.
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    const title = cleanTitle(slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())) || url;
    return {
      externalId,
      url,
      normalizedUrl: externalId,
      title,
      version: null,
      announcedAt: null,
      content: '',
      contentFormat: 'html',
      contentHash: contentHash({ title, version: null, content: '' }),
      metadata: { modifieLe: lastmod, plan: true },
    };
  });
  return { documents, rejected };
}

/** Au-delà, le flux est refusé avant analyse : le temps d'analyse de la bibliothèque croît plus vite que le nombre d'entrées. */
export const MAX_FEED_ENTRIES = 3_000;

export const FEED_HEADERS: Record<string, string> = {
  accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
};

export interface ParsedFeed {
  documents: CollectedDocument[];
  /** Entrées refusées, par motif (sans lien, lien hors domaine…). */
  rejected: Record<string, number>;
}

type FeedItem = ReturnType<typeof parseFeed>['items'][number];
type FeedElement = FeedItem['element'];

const text = (element: FeedElement | null | undefined): string => element?.textContent ?? '';

/**
 * Champ en texte brut (titre, catégorie) : les références d'entités restées dans le texte (CDATA, références
 * numériques que la bibliothèque ne décode pas) sont décodées une fois ; jamais interprété comme du HTML.
 */
const plainText = (raw: string): string => cleanTitle(decodeHtmlEntities(raw));

const escapeHtml = (raw: string): string => raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Lien brut d'une entrée : premier <link> non vide de l'espace de noms par défaut en RSS (jamais un atom:link) ;
 * <link rel="alternate"> (ou sans rel) en Atom, résolu contre xml:base.
 */
function rawLink(element: FeedElement): string | null {
  const links = element.findElementsWithName('link');
  if (element.name === 'entry') {
    const alternate = links.find((link) => (link.getAttribute('rel') ?? 'alternate') === 'alternate');
    return alternate?.getAttributeAsUrl('href')?.trim() || null;
  }
  const own = links.filter((link) => typeof link.namespace === 'symbol');
  return own.map((link) => text(link).trim()).find(Boolean) ?? null;
}

/** Lien accepté (https, sans identifiants, sur un hôte autorisé de la source), ou motif de refus. */
function checkLink(raw: string | null, hosts: readonly string[]): { url: string } | { reason: string } {
  if (!raw) return { reason: 'sans_lien' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { reason: 'lien_illisible' };
  }
  if (url.protocol !== 'https:') return { reason: 'lien_non_https' };
  if (url.username || url.password) return { reason: 'lien_avec_identifiants' };
  if (!hosts.includes(url.hostname.toLowerCase())) return { reason: 'lien_hors_domaine' };
  return { url: url.toString() };
}

/**
 * Contenu stocké en HTML, fidèle à la source : content:encoded ou description (RSS, HTML par usage) ;
 * en Atom, content ou summary selon leur type — « html » tel quel, « text » (ou absent) et « xhtml » ramenés à
 * leur texte puis échappés, pour qu'un texte inerte ne devienne jamais une balise.
 */
function rawContent(item: FeedItem): string {
  const element = item.element;
  if (element.name === 'entry') {
    const content = element.findElementWithName('content');
    const node = text(content) ? content : element.findElementWithName('summary');
    // Flux YouTube : ni content ni summary, le texte de la vidéo est dans media:group/media:description (texte brut).
    if (!node) return escapeHtml(text(element.findElementWithName('group')?.findElementWithName('description') ?? null));
    return node.getAttribute('type') === 'html' ? text(node) : escapeHtml(text(node));
  }
  const encoded = element.findElementsWithName('encoded').find((candidate) => candidate.namespace === 'content');
  return text(encoded) || text(element.findElementWithName('description'));
}

/** Catégories propres à l'entrée (jamais celles du canal). */
function itemCategories(element: FeedElement): string[] {
  const labels = [...element.findElementsWithName('category'), ...element.findElementsWithName('subject')]
    .map((category) => plainText(category.getAttribute('label') ?? category.getAttribute('term') ?? text(category)))
    .filter(Boolean);
  return [...new Set(labels)];
}

function isoDate(date: Date | null | undefined): string | null {
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/**
 * Transforme un flux en documents. Identité d'une entrée : son lien normalisé (le « guid » du GitHub Changelog
 * diffère souvent du lien) ; une entrée sans lien https vers un hôte autorisé est refusée et comptée.
 * Le contenu reste une donnée, jamais une instruction.
 */
export function parseFeedItems(body: string, config: Pick<FeedConfig, 'maxItems' | 'linkHosts' | 'plan'>): ParsedFeed {
  if (config.plan) return parseSitemap(body, { ...config, plan: config.plan });
  const entries = body.match(/<(?:item|entry)[\s>/]/g)?.length ?? 0;
  if (entries > MAX_FEED_ENTRIES) throw new SourceFormatError(`Flux trop long : ${entries} entrées (maximum ${MAX_FEED_ENTRIES})`);

  let feed: ReturnType<typeof parseFeed>;
  try {
    feed = parseFeed(body);
  } catch {
    throw new SourceFormatError('Flux RSS/Atom illisible');
  }

  // Un flux officiel a toujours des entrées : zéro entrée signale plutôt une page d'erreur (à traiter comme une panne).
  if (feed.items.length === 0) throw new SourceFormatError('Flux sans aucune entrée');

  const rejected: Record<string, number> = {};
  const candidates: { item: FeedItem; url: string; externalId: string; announcedAt: string | null }[] = [];
  const seen = new Set<string>();
  for (const item of feed.items) {
    const link = checkLink(rawLink(item.element), config.linkHosts);
    if ('reason' in link) {
      rejected[link.reason] = (rejected[link.reason] ?? 0) + 1;
      continue;
    }
    const externalId = normalizeUrl(link.url);
    if (seen.has(externalId)) {
      rejected.doublon = (rejected.doublon ?? 0) + 1;
      continue;
    }
    seen.add(externalId);
    candidates.push({ item, url: link.url, externalId, announcedAt: isoDate(item.published) ?? isoDate(item.updated) });
  }
  if (candidates.length === 0) throw new SourceFormatError('Flux sans entrée exploitable (aucun lien autorisé)');

  // Les plus récentes d'abord ; les entrées sans date en dernier. Seules les entrées gardées sont lues en détail.
  candidates.sort((a, b) => (b.announcedAt ?? '').localeCompare(a.announcedAt ?? ''));
  const documents = candidates.slice(0, config.maxItems).map(({ item, url, externalId, announcedAt }): CollectedDocument => {
    const title = plainText(text(item.element.findElementWithName('title')));
    const content = normalizeText(rawContent(item));
    return {
      externalId,
      url,
      normalizedUrl: externalId,
      title,
      version: null,
      announcedAt,
      content,
      contentFormat: 'html',
      contentHash: contentHash({ title, version: null, content }),
      metadata: {
        guid: plainText(text(item.element.findElementWithName(item.element.name === 'entry' ? 'id' : 'guid'))) || null,
        categories: itemCategories(item.element),
        updatedAt: isoDate(item.updated),
      },
    };
  });
  return { documents, rejected };
}
