// Hacker News comme source de découverte (demande de l'utilisateur du 2026-11-05). Deux temps séparés :
// 1. le signal, ici : les histoires de la page d'accueil de HN, lues par l'API publique de recherche (hn.algolia.com,
//    vers laquelle HN renvoie lui-même), filtrées sur l'IA et un seuil de points ; titre, points et discussion restent
//    des métadonnées datées, jamais du texte cité ni un critère de qualité ;
// 2. l'article lié, plus tard, par approfondir.ts et article-externe.ts : destination validée, robots.txt lu,
//    redirections revalidées. Tant que l'article n'est pas capturé, la capture reste vide : rien n'est analysé.
import { z } from 'zod';
import { SourceFormatError, type CollectedDocument } from './github-releases.ts';
import { contentHash, normalizeUrl } from './normalize.ts';

export interface HackerNewsConfig {
  url: string;
  maxItems: number;
  /** Seuil d'entrée sur les points HN : une porte, jamais une note. */
  pointsMin: number;
}

export const HACKERNEWS_HEADERS: Record<string, string> = { accept: 'application/json' };

/** Titres retenus : ceux qui parlent d'IA (liste courte, versionnée, à élargir). */
const IA = /\b(?:ai|a\.i\.|llms?|gpt[\w.-]*|claude|anthropic|openai|gemini|mistral|deepseek|qwen|llama|transformers?|agents?|agentic|mcp|rag|diffusion|inference|fine-?tun\w*|embeddings?|neural|machine learning|ml|copilot|cursor|hugging ?face|nvidia|gpus?|tpus?|vlm|multimodal)\b/i;

const Histoire = z.object({
  objectID: z.string().regex(/^\d+$/),
  title: z.string().min(1).max(300),
  url: z.string().nullable().optional(),
  points: z.number().int().nonnegative().nullable().optional(),
  num_comments: z.number().int().nonnegative().nullable().optional(),
  created_at: z.string().optional(),
});

/** Adresse d'article acceptable comme destination : https, nom de domaine réel ; ni adresse IP, ni hôte local. */
export function destinationValide(brute: string | null | undefined): URL | null {
  if (!brute) return null;
  let u: URL;
  try {
    u = new URL(brute);
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
  if (!h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || /(?:^|\.)(?:localhost|local|internal|lan|home|arpa)$/.test(h)) return null;
  // Une discussion HN n'est pas un article : les « Ask HN » sans lien restent hors de la chaîne.
  if (h === 'news.ycombinator.com') return null;
  return u;
}

export function parseHackerNews(body: string, config: Pick<HackerNewsConfig, 'maxItems' | 'pointsMin'>): { documents: CollectedDocument[]; rejected: Record<string, number> } {
  let brut: unknown;
  try {
    brut = JSON.parse(body);
  } catch {
    throw new SourceFormatError('Réponse Hacker News illisible (JSON)');
  }
  const hits = (brut as { hits?: unknown }).hits;
  if (!Array.isArray(hits) || hits.length === 0) throw new SourceFormatError('Réponse Hacker News sans aucune histoire');
  const rejected: Record<string, number> = {};
  const compter = (motif: string) => void (rejected[motif] = (rejected[motif] ?? 0) + 1);
  const documents: CollectedDocument[] = [];
  const vus = new Set<string>();
  for (const h of hits) {
    const x = Histoire.safeParse(h);
    if (!x.success) { compter('illisible'); continue; }
    if (!IA.test(x.data.title)) { compter('hors_ia'); continue; }
    if ((x.data.points ?? 0) < config.pointsMin) { compter('sous_le_seuil'); continue; }
    const article = destinationValide(x.data.url);
    if (!article) { compter('sans_article_valide'); continue; }
    const externalId = normalizeUrl(article.toString());
    if (vus.has(externalId)) { compter('doublon'); continue; }
    vus.add(externalId);
    if (documents.length >= config.maxItems) break;
    const title = x.data.title;
    // Capture vide : le titre HN est celui de la personne qui a partagé le lien, pas un texte de l'article.
    const content = '';
    documents.push({
      externalId,
      url: article.toString(),
      normalizedUrl: externalId,
      title,
      version: null,
      announcedAt: x.data.created_at && !Number.isNaN(Date.parse(x.data.created_at)) ? new Date(x.data.created_at).toISOString() : null,
      content,
      contentFormat: 'text',
      contentHash: contentHash({ title, version: null, content }),
      metadata: {
        signal: 'hacker_news',
        hn_id: x.data.objectID,
        hn_discussion: `https://news.ycombinator.com/item?id=${x.data.objectID}`,
        points: x.data.points ?? null,
        commentaires: x.data.num_comments ?? null,
      },
    });
  }
  return { documents, rejected };
}
