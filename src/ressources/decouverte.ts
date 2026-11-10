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
 * automatisation, RAG, voix, image et vidéo générées, design et motion. Gardés pour la compatibilité ; le plan par agent
 * ci-dessous les remplace dans le cycle.
 */
export const SUJETS_DECOUVERTE = [
  'claude-skills', 'agent-skills', 'mcp-server', 'model-context-protocol', 'claude-code', 'ai-agents', 'llm', 'generative-ai',
  'ai-coding', 'ai-tools', 'rag', 'workflow-automation', 'voice-ai', 'text-to-image', 'text-to-video', 'design-systems', 'motion-design',
] as const;

export type CompteDecouverte = 'nodi' | 'repo' | 'pyxo' | 'mova' | 'pulse' | 'radar';

/**
 * Plan de découverte par agent (2026-11-10, demande de l'utilisateur : « une couverture large… par thèmes, usages et
 * fenêtres de dates »). Chaque requête est un thème ou un usage, jamais le nom d'un dépôt : la recherche par sujet GitHub
 * (`topic:`) manque les dépôts sans sujet déclaré (3 des 12 dépôts de contrôle transmis par l'utilisateur), d'où les
 * requêtes par mots dans le nom, la description et les sujets. Liste versionnée, ouverte.
 */
export interface RequeteDecouverte {
  compte: CompteDecouverte;
  /** Termes de la recherche GitHub, sans date ni seuil. */
  q: string;
  /** Fenêtre « établis » en plus (dépôts très suivis, plus anciens, encore actifs) : pour les usages où un outil ancien reste une découverte. */
  etablis?: boolean;
}
const mots = (compte: CompteDecouverte, termes: string, etablis = false): RequeteDecouverte => ({ compte, q: `${termes} in:name,description,topics`, ...(etablis ? { etablis } : {}) });
const sujet = (compte: CompteDecouverte, s: string): RequeteDecouverte => ({ compte, q: `topic:${s}` });
export const PLAN_DECOUVERTE: readonly RequeteDecouverte[] = [
  // Repo : skills, plugins, serveurs MCP, gabarits pour agents.
  sujet('repo', 'claude-skills'), sujet('repo', 'agent-skills'), sujet('repo', 'mcp-server'), sujet('repo', 'claude-code'),
  mots('repo', 'agent skill'), mots('repo', 'claude plugin'), mots('repo', 'mcp server', true), mots('repo', 'subagents'),
  // Mova : vidéo, motion, design, Blender, 3D web, son.
  mots('mova', 'video skill'), mots('mova', 'video agent'), mots('mova', 'motion graphics'), mots('mova', 'html video'),
  mots('mova', 'blender', true), mots('mova', 'threejs skill'), mots('mova', 'three.js agent'), mots('mova', 'webgpu'),
  mots('mova', 'shader skill'), mots('mova', 'comfyui', true), mots('mova', 'gsap'), mots('mova', 'storyboard'),
  mots('mova', '3d visualization'), mots('mova', 'svg animation'), mots('mova', 'music generation'), mots('mova', 'design skill'),
  sujet('mova', 'text-to-video'), sujet('mova', 'motion-design'), sujet('mova', 'generative-art'),
  // Pyxo : outils de développement assistés.
  sujet('pyxo', 'ai-coding'), mots('pyxo', 'coding agent'), mots('pyxo', 'cli agent'), mots('pyxo', 'code review agent'),
  sujet('pyxo', 'vscode-extension'), mots('pyxo', 'local llm'),
  // Nodi : modèles et inférence.
  mots('nodi', 'open weights model'), sujet('nodi', 'llm-inference'), mots('nodi', 'fine-tuning'), sujet('nodi', 'multimodal'),
  // Pulse : données, infrastructure, observabilité.
  sujet('pulse', 'vector-database'), mots('pulse', 'llm observability'), sujet('pulse', 'data-engineering'), mots('pulse', 'llm gateway'),
  // Radar : robotique et matériel.
  sujet('radar', 'robotics'), sujet('radar', 'humanoid-robot'), mots('radar', 'embodied ai'),
];

/** Fenêtres de dates : nouveaux (créés depuis 30 jours), montants (créés depuis un an, actifs depuis 14 jours, 1 000 étoiles). */
export const FENETRES = {
  nouveaux: { creesDepuisJours: 30, etoiles: null as number | null },
  montants: { creesDepuisJours: 365, actifsDepuisJours: 14, etoiles: 1_000 },
  etablis: { actifsDepuisJours: 14, etoiles: 10_000 },
} as const;

/** Requêtes GitHub d'un plan, avec leurs fenêtres. `seuil` : réglage `decouverte.seuil_etoiles` (fenêtre « nouveaux »). */
export function requetesDuPlan(plan: readonly RequeteDecouverte[], seuil: number, maintenant: string): { compte: CompteDecouverte; fenetre: keyof typeof FENETRES; url: string; libelle: string }[] {
  const jour = (j: number) => new Date(Date.parse(maintenant) - j * 86_400_000).toISOString().slice(0, 10);
  const url = (q: string) => `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100`;
  return plan.flatMap((r) => [
    { compte: r.compte, fenetre: 'nouveaux' as const, url: url(`${r.q} stars:>=${seuil} created:>=${jour(FENETRES.nouveaux.creesDepuisJours)} archived:false fork:false`), libelle: `${r.q} (nouveaux)` },
    { compte: r.compte, fenetre: 'montants' as const, url: url(`${r.q} stars:>=${FENETRES.montants.etoiles} created:>=${jour(FENETRES.montants.creesDepuisJours)} pushed:>=${jour(FENETRES.montants.actifsDepuisJours)} archived:false fork:false`), libelle: `${r.q} (montants)` },
    ...(r.etablis ? [{ compte: r.compte, fenetre: 'etablis' as const, url: url(`${r.q} stars:>=${FENETRES.etablis.etoiles} pushed:>=${jour(FENETRES.etablis.actifsDepuisJours)} archived:false fork:false`), libelle: `${r.q} (établis)` }] : []),
  ]);
}

/** Plafond de la recherche : 10 requêtes par minute sans jeton, 30 avec (documentation GitHub, 2026-11-10). */
export const PAUSE_RECHERCHE_MS = 6_500;
export const PAUSE_RECHERCHE_JETON_MS = 2_200;
export { VERSION_DECOUVERTE } from './capture.ts';
/** Fenêtre de création par défaut, et nombre maximal de candidats par passage (plafond de l'API sans jeton : 60 par heure). */
export const JOURS_DEFAUT = 30;
export const MAX_CANDIDATS_DEFAUT = 8;
/** Candidats au plus par agent et par passage, avec le plan par agent (la rédaction reste plafonnée à part). */
export const MAX_CANDIDATS_PAR_COMPTE = 3;
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
  /** Agent du thème qui l'a trouvé (Repo par défaut). */
  compte?: CompteDecouverte;
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
  trouves: readonly { depot: DepotTrouve; sujet: string; compte?: CompteDecouverte }[],
  o: { seuil: number; connus: ReadonlySet<string>; max: number; releveLe: string; maxParCompte?: number },
): { candidats: Candidat[]; ecartes: Ecarte[] } {
  const ecartes: Ecarte[] = [];
  const vus = new Map<string, Candidat>();
  for (const { depot, sujet, compte } of trouves) {
    const nom = depot.full_name.toLowerCase();
    if (vus.has(nom) || ecartes.some((e) => e.depot.toLowerCase() === nom)) continue;
    const motif = o.connus.has(nom) ? 'deja_connu' : depot.archived ? 'archive' : depot.fork ? 'fork' : depot.stargazers_count < o.seuil ? 'sous_le_seuil' : null;
    if (motif) ecartes.push({ depot: depot.full_name, motif });
    else vus.set(nom, { depot, sujet, releveLe: o.releveLe, ...(compte ? { compte } : {}) });
  }
  const candidats = [...vus.values()].sort((a, b) => b.depot.stargazers_count - a.depot.stargazers_count);
  if (o.maxParCompte === undefined) return { candidats: candidats.slice(0, o.max), ecartes };
  // Plan par agent : chaque agent garde sa part, pour qu'un thème très suivi n'évince pas les autres.
  const parCompte = new Map<string, number>();
  const gardes = candidats.filter((c) => {
    const n = parCompte.get(c.compte ?? 'repo') ?? 0;
    if (n >= o.maxParCompte!) return false;
    parCompte.set(c.compte ?? 'repo', n + 1);
    return true;
  });
  return { candidats: gardes.slice(0, o.max), ecartes };
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
    compte: c.compte ?? 'repo',
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

/**
 * Recherche du plan par agent (2026-11-10) : une requête par thème et par fenêtre, à la suite, avec la pause qui respecte
 * le plafond (plus courte avec le jeton d'Actions). Une requête en échec n'arrête pas les autres ; elle est comptée.
 */
export async function chercherPlan(o: Omit<OptionsRecherche, 'sujets' | 'depuis'> & { maintenant: string; plan?: readonly RequeteDecouverte[] }): Promise<{ trouves: { depot: DepotTrouve; sujet: string; compte: CompteDecouverte }[]; erreurs: { sujet: string; message: string }[]; illisibles: number; requetes: number }> {
  const trouves: { depot: DepotTrouve; sujet: string; compte: CompteDecouverte }[] = [];
  const erreurs: { sujet: string; message: string }[] = [];
  let illisibles = 0;
  const requetes = requetesDuPlan(o.plan ?? PLAN_DECOUVERTE, o.seuil, o.maintenant);
  const pause = process.env.GITHUB_TOKEN && !o.transport ? PAUSE_RECHERCHE_JETON_MS : PAUSE_RECHERCHE_MS;
  for (const [i, r] of requetes.entries()) {
    if (i > 0) await (o.attendre ?? ((ms: number) => new Promise((res) => setTimeout(res, ms))))(pause);
    try {
      const reponse = await safeGet(
        r.url,
        { allowedHosts: ['api.github.com'], timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX },
        { ...GITHUB_API_HEADERS, 'user-agent': o.userAgent },
        { ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) },
      );
      const lu = lireRecherche(reponse.body.toString('utf8'));
      illisibles += lu.illisibles;
      for (const depot of lu.depots) trouves.push({ depot, sujet: r.libelle, compte: r.compte });
    } catch (e) {
      erreurs.push({ sujet: r.libelle, message: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  return { trouves, erreurs, illisibles, requetes: requetes.length };
}
