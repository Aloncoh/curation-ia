// Lettre d'information comme signal de découverte (demande de l'utilisateur du 2026-11-16 : TLDR AI), sur le modèle de
// Hacker News (hackernews.ts). Deux lectures chez l'éditeur de la lettre, puis l'article à sa source :
// 1. le flux officiel donne le dernier numéro paru ;
// 2. la page de ce numéro liste des articles : seuls le lien et le titre de chacun sont gardés, comme signal. Le résumé
//    rédigé par la lettre n'est ni copié ni cité ; les entrées sponsorisées sont écartées ;
// 3. l'article lié est capturé plus tard par approfondir.ts et article-externe.ts (destination validée, robots.txt de
//    son hôte, redirections revalidées). Tant qu'il n'est pas capturé, la capture reste vide : rien n'est analysé.
// Vérifié en réel le 2026-11-16 : le robots.txt de tldr.tech autorise le flux et les numéros (docs/sources.md §3.14).
import { parseFeedItems, type FeedConfig, type ParsedFeed } from './feeds.ts';
import { SourceFormatError, type CollectedDocument } from './github-releases.ts';
import { destinationValide } from './hackernews.ts';
import { cleanTitle, contentHash, decodeHtmlEntities, normalizeUrl } from './normalize.ts';

/** Adresse et date du numéro le plus récent du flux. */
export function dernierNumero(corpsFlux: string, config: Pick<FeedConfig, 'maxItems' | 'linkHosts'>): { url: string; paruLe: string | null } {
  const { documents } = parseFeedItems(corpsFlux, config);
  const dernier = [...documents].sort((a, b) => (b.announcedAt ?? '').localeCompare(a.announcedAt ?? ''))[0];
  if (!dernier) throw new SourceFormatError('Lettre : aucun numéro dans le flux');
  return { url: dernier.url, paruLe: dernier.announcedAt };
}

/** Un article du numéro : un lien qui entoure un titre de niveau 3. */
const ARTICLE = /<a\b[^>]*\bhref="([^"]+)"[^>]*>\s*<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
const SPONSOR = /\(\s*sponsor\s*\)/i;
const DUREE = /\s*\(\s*\d+\s+minute\s+read\s*\)\s*$/i;
const FORMULAIRE = /\(\s*\d+\s+minute\s+form\s*\)/i;

export interface OptionsLettre {
  /** Nom de la lettre, gardé dans les métadonnées. */
  nom: string;
  /** Adresse et date du numéro lu. */
  numero: string;
  paruLe: string | null;
  maxItems: number;
  /** Hôtes de la lettre elle-même : un lien vers eux n'est pas un article signalé. */
  hotesLettre: readonly string[];
}

/** Articles signalés par un numéro : lien et titre seulement, capture vide. Une entrée refusée est comptée par motif. */
export function parseLettre(html: string, o: OptionsLettre): ParsedFeed {
  const rejected: Record<string, number> = {};
  const compter = (motif: string) => void (rejected[motif] = (rejected[motif] ?? 0) + 1);
  const documents: CollectedDocument[] = [];
  const vus = new Set<string>();
  let reconnus = 0;
  const propre = new RegExp(`\\b${(o.nom.trim().split(/\s+/)[0] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  for (const m of html.matchAll(ARTICLE)) {
    reconnus++;
    const brut = cleanTitle(decodeHtmlEntities(m[2]!.replace(/<[^>]+>/g, ' ')));
    if (SPONSOR.test(brut)) { compter('sponsorise'); continue; }
    // Annonce de la lettre pour elle-même (formulaire, ou son propre nom dans le titre) : pas un article signalé.
    if (FORMULAIRE.test(brut) || propre.test(brut)) { compter('promotion'); continue; }
    const article = destinationValide(decodeHtmlEntities(m[1]!));
    if (!article) { compter('sans_article_valide'); continue; }
    if (o.hotesLettre.includes(article.hostname.toLowerCase())) { compter('lien_interne'); continue; }
    const title = brut.replace(DUREE, '').trim();
    if (!title) { compter('sans_titre'); continue; }
    // Adresse sans paramètres de suivi (utm_source de la lettre) : c'est elle qui sert d'identifiant et de destination.
    const externalId = normalizeUrl(article.toString());
    if (vus.has(externalId)) { compter('doublon'); continue; }
    vus.add(externalId);
    if (documents.length >= o.maxItems) break;
    // Capture vide : le titre vient de la lettre, pas de l'article ; rien n'est cité avant la capture de l'article.
    const content = '';
    documents.push({
      externalId,
      url: externalId,
      normalizedUrl: externalId,
      title,
      version: null,
      announcedAt: o.paruLe,
      content,
      contentFormat: 'text',
      contentHash: contentHash({ title, version: null, content }),
      metadata: { signal: 'lettre', lettre: o.nom, numero: o.numero },
    });
  }
  if (reconnus === 0) throw new SourceFormatError('Lettre : aucun article reconnu dans le numéro');
  return { documents, rejected };
}
