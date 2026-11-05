// Modèles en tendance sur Hugging Face (P6, bloc 3 ; accord de l'utilisateur du 2026-11-05) : l'API publique
// `api/models?sort=trendingScore` sert de porte d'entrée vers Nodi. La tendance, les « likes » et les téléchargements
// restent dans les métadonnées : ils ne sont jamais écrits dans la capture que lit le modèle (la popularité n'est pas
// un critère, consignes de sélection). La capture ne dit que ce que l'API déclare (tâche, bibliothèque, licence, date) ;
// trop courte pour être citée, elle déclenche la capture de la page du modèle (approfondir.ts) avant toute analyse.
import { z } from 'zod';
import { SourceFormatError, type CollectedDocument } from './github-releases.ts';
import { contentHash, normalizeUrl } from './normalize.ts';

export interface HuggingFaceModelsConfig {
  url: string;
  maxItems: number;
}

export const HUGGINGFACE_HEADERS: Record<string, string> = { accept: 'application/json' };

const ID_MODELE = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const Modele = z.object({
  id: z.string().regex(ID_MODELE).max(200),
  createdAt: z.string().optional(),
  pipeline_tag: z.string().max(80).optional(),
  library_name: z.string().max(80).optional(),
  tags: z.array(z.string()).optional(),
  private: z.boolean().optional(),
  likes: z.number().optional(),
  downloads: z.number().optional(),
  trendingScore: z.number().optional(),
});

const isoDate = (v: string | undefined): string | null => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** Réponse de l'API : un document par modèle public, dans l'ordre de la tendance ; une entrée illisible est comptée. */
export function parseModelesTendance(body: string, config: Pick<HuggingFaceModelsConfig, 'maxItems'>): { documents: CollectedDocument[]; rejected: Record<string, number> } {
  let brut: unknown;
  try {
    brut = JSON.parse(body);
  } catch {
    throw new SourceFormatError('Réponse Hugging Face illisible (JSON)');
  }
  if (!Array.isArray(brut) || brut.length === 0) throw new SourceFormatError('Réponse Hugging Face sans aucun modèle');
  const rejected: Record<string, number> = {};
  const documents: CollectedDocument[] = [];
  for (const entree of brut) {
    const m = Modele.safeParse(entree);
    if (!m.success || m.data.private) { rejected.illisible = (rejected.illisible ?? 0) + 1; continue; }
    if (documents.length >= config.maxItems) break;
    const url = `https://huggingface.co/${m.data.id}`;
    const licence = m.data.tags?.find((t) => t.startsWith('license:'))?.slice('license:'.length) ?? null;
    const lignes = [
      `Model ${m.data.id} on Hugging Face.`,
      m.data.pipeline_tag ? `Task: ${m.data.pipeline_tag}.` : null,
      m.data.library_name ? `Library: ${m.data.library_name}.` : null,
      licence ? `License: ${licence}.` : null,
    ].filter((x): x is string => x !== null);
    const title = m.data.id;
    const content = lignes.join('\n');
    documents.push({
      externalId: normalizeUrl(url),
      url,
      normalizedUrl: normalizeUrl(url),
      title,
      version: null,
      announcedAt: isoDate(m.data.createdAt),
      content,
      contentFormat: 'text',
      contentHash: contentHash({ title, version: null, content }),
      // Relevés de popularité : information datée, jamais un critère ni un texte cité.
      metadata: { likes: m.data.likes ?? null, downloads: m.data.downloads ?? null, trendingScore: m.data.trendingScore ?? null },
    });
  }
  if (documents.length === 0) throw new SourceFormatError('Réponse Hugging Face sans modèle exploitable');
  return { documents, rejected };
}
