// Données de la maquette (P2) : actualités réellement collectées, avec un court extrait en texte brut.
// Seules les actualités dont la capture vient d'une collecte réelle sont gardées ; les champs d'analyse
// (intérêt, limites, coût…) n'existent pas encore et restent absents : la maquette affiche « Non renseigné ».
import type { Client } from '@libsql/client';
import { decodeHtmlEntities } from '../collect/normalize.ts';

export interface MaquetteNewsItem {
  id: number;
  kind: 'version' | 'annonce';
  title: string;
  announced_at: string | null;
  first_seen_at: string;
  product: { key: string; name: string; publisher: string; category: string | null; repository_url: string | null } | null;
  version: string | null;
  categories: string[];
  source: { id: string; name: string; url: string };
  /** Extrait en texte brut de la source (à afficher comme texte, jamais comme HTML). */
  excerpt: string | null;
  capture: { content_hash: string; captured_at: string; mode: string };
}

export interface MaquetteData {
  generated_at: string;
  note: string;
  sources: { id: string; name: string; kind: string; status: string; last_success_at: string | null; last_error: string | null }[];
  products: {
    key: string;
    name: string;
    publisher: string;
    category: string | null;
    repository_url: string | null;
    versions: { version: string; is_prerelease: boolean; released_at: string | null }[];
  }[];
  news_items: MaquetteNewsItem[];
  /** Actualités écartées parce que leur capture ne vient pas d'une collecte réelle (fixture, mode inconnu). */
  excluded_not_live: number;
}

/** Texte brut d'un contenu HTML ou Markdown : sans balises, titres, liens ni mise en forme. */
export function toPlainText(content: string, format: string): string {
  let text = content;
  if (format === 'html') {
    // Les balises de bloc séparent des mots ; les balises en ligne (<b>, <a>…) non.
    text = text
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/?(?:p|br|div|li|ul|ol|h[1-6]|tr|td|th|blockquote|pre|hr|section|article|figure|figcaption)\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '');
    text = decodeHtmlEntities(text);
  } else {
    text = text
      .split('\n')
      .filter((line) => !/^\s{0,3}#{1,6}\s/.test(line))
      .join('\n')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
      // Seuls les délimiteurs sont retirés : `code`, **gras**, _italique_, ~~barré~~ ; jamais un « _ » ou un « ~ »
      // à l'intérieur d'un mot (SNAKE_CASE, ~/.config…), pour que l'extrait reste fidèle au texte de la source.
      .replace(/`([^`\n]*)`/g, '$1')
      .replace(/(^|[\s(])(\*\*|__|\*|_|~~)(\S(?:[^\n]*?\S)?)\2(?=[\s).,;:!?]|$)/gm, '$1$3');
  }
  return text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extrait court, coupé sur un mot ; null si le contenu est vide. */
export function excerpt(content: string, format: string, maxLength = 240): string | null {
  const text = toPlainText(content, format);
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength)).replace(/[\s,;:.-]+$/, '')}…`;
}

const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

function categoriesOf(metadata: unknown): string[] {
  if (typeof metadata !== 'string') return [];
  try {
    const parsed = JSON.parse(metadata) as { categories?: unknown };
    return Array.isArray(parsed.categories) ? parsed.categories.filter((c): c is string => typeof c === 'string').slice(0, 4) : [];
  } catch {
    return [];
  }
}

export async function buildMaquetteData(client: Client, generatedAt: string): Promise<MaquetteData> {
  const tx = await client.transaction('read');
  try {
    const items = await tx.execute(`
      select n.id, n.kind, n.title, n.announced_at, n.first_seen_at,
             d.normalized_url as url, d.metadata, s.id as source_id, s.name as source_name,
             p.key as product_key, p.name as product_name, p.publisher, p.category, p.repository_url,
             v.version,
             snap.content, snap.content_format, snap.content_hash, snap.captured_at, r.mode
      from news_item n
      join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
      join source_document d on d.id = nd.document_id
      join source s on s.id = d.source_id
      join document_snapshot snap on snap.document_id = d.id
        and snap.seq = (select max(seq) from document_snapshot x where x.document_id = d.id)
      left join run r on r.id = snap.run_id
      left join news_item_target t on t.news_item_id = n.id
      left join product p on p.id = t.product_id
      left join product_version v on v.id = t.product_version_id
      order by coalesce(n.announced_at, n.first_seen_at) desc, n.id desc`);
    // État des sources d'après les seules exécutions réelles (une relecture de fixture n'est pas une collecte).
    const sourceRows = await tx.execute(`
      select s.id, s.name, s.kind,
             (select max(r.finished_at) from run r where r.source_id = s.id and r.mode = 'live' and r.status = 'succeeded') as last_success_at,
             (select r.status from run r where r.source_id = s.id and r.mode = 'live' and r.status in ('succeeded', 'failed')
               order by r.finished_at desc limit 1) as last_status,
             (select r.error_message from run r where r.source_id = s.id and r.mode = 'live' and r.status in ('succeeded', 'failed')
               order by r.finished_at desc limit 1) as last_error
      from source s order by s.id`);
    // Versions connues par une collecte réelle seulement : leur document d'origine a au moins une capture « live ».
    const versionRows = await tx.execute(`
      select v.product_id, v.version, v.is_prerelease, v.released_at from product_version v
      where exists (select 1 from document_snapshot c join run r on r.id = c.run_id
                    where c.document_id = v.source_document_id and r.mode = 'live')
      order by v.released_at desc, v.id desc`);
    const productRows = await tx.execute('select id, key, name, publisher, category, repository_url from product order by name');

    const newsItems: MaquetteNewsItem[] = [];
    let excluded = 0;
    for (const row of items.rows) {
      if (row.mode !== 'live') {
        excluded++;
        continue;
      }
      newsItems.push({
        id: Number(row.id),
        kind: row.kind === 'version' ? 'version' : 'annonce',
        title: String(row.title),
        announced_at: str(row.announced_at),
        first_seen_at: String(row.first_seen_at),
        product: row.product_key
          ? {
              key: String(row.product_key),
              name: String(row.product_name),
              publisher: String(row.publisher),
              category: str(row.category),
              repository_url: str(row.repository_url),
            }
          : null,
        version: str(row.version),
        categories: categoriesOf(row.metadata),
        source: { id: String(row.source_id), name: String(row.source_name), url: String(row.url) },
        excerpt: excerpt(String(row.content), String(row.content_format)),
        capture: { content_hash: String(row.content_hash), captured_at: String(row.captured_at), mode: String(row.mode) },
      });
    }

    return {
      generated_at: generatedAt,
      note: 'Données réellement collectées depuis des sources officielles, pas encore analysées. Les extraits sont des citations courtes de la source, attribuées et liées.',
      sources: sourceRows.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind),
        status: row.last_status === 'succeeded' ? 'ok' : row.last_status === 'failed' ? 'error' : 'never',
        last_success_at: str(row.last_success_at),
        last_error: row.last_status === 'failed' ? str(row.last_error) : null,
      })),
      products: productRows.rows
        .filter((product) => versionRows.rows.some((version) => version.product_id === product.id))
        .map((product) => ({
          key: String(product.key),
          name: String(product.name),
          publisher: String(product.publisher),
          category: str(product.category),
          repository_url: str(product.repository_url),
          versions: versionRows.rows
            .filter((version) => version.product_id === product.id)
            .map((version) => ({
              version: String(version.version),
              is_prerelease: Number(version.is_prerelease) === 1,
              released_at: str(version.released_at),
            })),
        })),
      news_items: newsItems,
      excluded_not_live: excluded,
    };
  } finally {
    tx.close();
  }
}
