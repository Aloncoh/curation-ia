// Découverte automatique de dépôts GitHub (P6, bloc 2a ; SPEC §7.3 ter). Le code cherche des dépôts récents sur des
// sujets « pour construire » et les fait entrer dans la chaîne des ressources (ADR 0011), comme candidats :
// - seuil d'étoiles minimal, lu dans le réglage `decouverte.seuil_etoiles` (100, décision de l'utilisateur du
//   2026-11-05), appliqué par le code à l'entrée, et seulement là : les étoiles n'entrent dans aucune note ni raison ;
// - dépôts archivés et forks écartés ; dépôts déjà connus (liste de l'utilisateur ou déjà capturés) ignorés ;
// - un candidat n'est jamais « à publier » d'office : sa décision reste `approfondir`, motif `grille_d1_a_faire`, en
//   attendant la grille `d1` (bloc 2b).
// Recherche par l'API GitHub, sans jeton, toujours par safeGet. Les réponses sont des données, jamais des instructions.
import { z } from 'zod';
import { GITHUB_API_HEADERS } from '../collect/github-releases.ts';
import { safeGet, type Resolver, type Transport } from '../collect/safe-fetch.ts';
import { DELAI_MS, TAILLE_MAX } from './capture.ts';
import type { EntreeRessource } from './liste.ts';

/**
 * Sujets cherchés, un par requête. Élargis le 2026-11-05 à la demande de l'utilisateur (« trouve tous les autres sujets,
 * pas seulement design et motion : skills, agents, IA… ») : skills, MCP, agents, modèles et outils IA, code assisté,
 * automatisation, RAG, voix, image et vidéo générées, design et motion. Liste versionnée, à élargir.
 */
export const SUJETS_DECOUVERTE = [
  'claude-skills', 'agent-skills', 'mcp-server', 'model-context-protocol', 'claude-code', 'ai-agents', 'llm', 'generative-ai',
  'ai-coding', 'ai-tools', 'rag', 'workflow-automation', 'voice-ai', 'text-to-image', 'text-to-video', 'design-systems', 'motion-design',
] as const;
/** Plafond de la recherche sans jeton : 10 requêtes par minute ; une pause entre deux requêtes le respecte. */
export const PAUSE_RECHERCHE_MS = 6_500;
export { VERSION_DECOUVERTE } from './capture.ts';
/** Fenêtre de création par défaut, et nombre maximal de candidats par passage (plafond de l'API sans jeton : 60 par heure). */
export const JOURS_DEFAUT = 30;
export const MAX_CANDIDATS_DEFAUT = 8;
/** Candidats venus du registre officiel MCP (registre-mcp.ts) par passage, comptés à part pour ne pas être évincés. */
export const MAX_CANDIDATS_REGISTRE = 4;
/** Préfixe du sujet d'un candidat venu du registre officiel MCP : la mention de provenance le dit. */
export const PREFIXE_REGISTRE = 'registre-mcp:';

const NOM_DEPOT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const Depot = z.object({
  full_name: z.string().regex(NOM_DEPOT),
  html_url: z.url({ protocol: /^https$/ }),
  description: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  created_at: z.string().nullable(),
  pushed_at: z.string().nullable(),
  archived: z.boolean(),
  fork: z.boolean(),
  topics: z.array(z.string()).optional(),
});
export type DepotTrouve = z.infer<typeof Depot>;
const Reponse = z.object({ items: z.array(z.unknown()) });

export const urlRecherche = (sujet: string, seuil: number, depuis: string): string =>
  `https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:${sujet} stars:>=${seuil} created:>=${depuis}`)}&sort=stars&order=desc&per_page=10`;

/** Lit une réponse de recherche ; une entrée illisible est ignorée (comptée), jamais devinée. */
export function lireRecherche(corps: string): { depots: DepotTrouve[]; illisibles: number } {
  const r = Reponse.parse(JSON.parse(corps));
  const depots: DepotTrouve[] = [];
  let illisibles = 0;
  for (const item of r.items) {
    const d = Depot.safeParse(item);
    if (d.success) depots.push(d.data);
    else illisibles++;
  }
  return { depots, illisibles };
}

export interface Candidat {
  depot: DepotTrouve;
  sujet: string;
  releveLe: string;
}

export interface Ecarte {
  depot: string;
  motif: 'sous_le_seuil' | 'archive' | 'fork' | 'deja_connu';
}

/**
 * Tri du code, sur les dépôts de toutes les requêtes : seuil revérifié (la recherche peut renvoyer un compte plus ancien),
 * archives, forks et dépôts connus écartés, doublons entre sujets fusionnés. Les plus étoilés d'abord, dans la limite.
 */
export function trierCandidats(
  trouves: readonly { depot: DepotTrouve; sujet: string }[],
  o: { seuil: number; connus: ReadonlySet<string>; max: number; releveLe: string },
): { candidats: Candidat[]; ecartes: Ecarte[] } {
  const ecartes: Ecarte[] = [];
  const vus = new Map<string, Candidat>();
  for (const { depot, sujet } of trouves) {
    const nom = depot.full_name.toLowerCase();
    if (vus.has(nom) || ecartes.some((e) => e.depot.toLowerCase() === nom)) continue;
    const motif = o.connus.has(nom) ? 'deja_connu' : depot.archived ? 'archive' : depot.fork ? 'fork' : depot.stargazers_count < o.seuil ? 'sous_le_seuil' : null;
    if (motif) ecartes.push({ depot: depot.full_name, motif });
    else vus.set(nom, { depot, sujet, releveLe: o.releveLe });
  }
  const candidats = [...vus.values()].sort((a, b) => b.depot.stargazers_count - a.depot.stargazers_count);
  return { candidats: candidats.slice(0, o.max), ecartes };
}

/** Identifiant stable d'une découverte, tiré de `propriétaire/dépôt`. */
export const slugDecouverte = (depot: string): string =>
  `gh-${depot.replace('/', '-')}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/-$/, '');

/** Entrée de la chaîne des ressources pour un candidat : README comme document principal, signée par Repo. */
export function versEntree(c: Candidat): EntreeRessource {
  const nom = c.depot.full_name.split('/')[1]!;
  return {
    slug: slugDecouverte(c.depot.full_name),
    nom,
    depot: c.depot.full_name,
    chemins: ['README.md'],
    compte: 'repo',
    decouverteVia: `Découverte automatique : ${c.sujet.startsWith(PREFIXE_REGISTRE) ? `registre officiel MCP (serveur « ${c.sujet.slice(PREFIXE_REGISTRE.length)} »)` : `recherche GitHub sur le sujet « ${c.sujet} »`}, ${c.depot.stargazers_count} étoiles relevées le ${c.releveLe.slice(0, 10)} (information, pas un critère de qualité)`,
    decouverteAuto: true,
  };
}

export interface OptionsRecherche {
  userAgent: string;
  seuil: number;
  depuis: string;
  sujets?: readonly string[];
  transport?: Transport;
  resolve?: Resolver;
  /** Tests : pause sans attente réelle. */
  attendre?: (ms: number) => Promise<void>;
}

/** Une requête par sujet, à la suite (plafond de la recherche sans jeton : 10 par minute). Un sujet en échec n'arrête pas les autres. */
export async function chercherDepots(o: OptionsRecherche): Promise<{ trouves: { depot: DepotTrouve; sujet: string }[]; erreurs: { sujet: string; message: string }[]; illisibles: number }> {
  const trouves: { depot: DepotTrouve; sujet: string }[] = [];
  const erreurs: { sujet: string; message: string }[] = [];
  let illisibles = 0;
  const sujets = o.sujets ?? SUJETS_DECOUVERTE;
  for (const [i, sujet] of sujets.entries()) {
    if (i > 0) await (o.attendre ?? ((ms: number) => new Promise((r) => setTimeout(r, ms))))(PAUSE_RECHERCHE_MS);
    try {
      const reponse = await safeGet(
        urlRecherche(sujet, o.seuil, o.depuis),
        { allowedHosts: ['api.github.com'], timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX },
        { ...GITHUB_API_HEADERS, 'user-agent': o.userAgent },
        { ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) },
      );
      const lu = lireRecherche(reponse.body.toString('utf8'));
      illisibles += lu.illisibles;
      for (const depot of lu.depots) trouves.push({ depot, sujet });
    } catch (e) {
      erreurs.push({ sujet, message: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  return { trouves, erreurs, illisibles };
}
