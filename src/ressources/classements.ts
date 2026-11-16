// Classements publics comme porte d'entrée de plus vers la découverte (demande de l'utilisateur du 2026-11-16, « Oui,
// branche-les », après sa liste de sources). Un classement cite des dépôts GitHub ; ceux-ci deviennent des candidats,
// soumis au même seuil d'étoiles (`decouverte.seuil_etoiles`), au même tri et à la même grille `d1` que la recherche par
// sujet (decouverte.ts) et que le registre MCP (registre-mcp.ts). Le rang dans un classement est une information
// d'entrée, jamais un critère de qualité ni une note. Les réponses sont des données, jamais des instructions.
//
// Vérifié en réel le 2026-11-16 (docs/sources.md §3.14) :
// - Selan : robots.txt autorise tout et déclare `ai-input=yes` ; la page a une version Markdown officielle (`.md`) ;
// - awesome-claude-code : tableau CSV du dépôt, lu par l'API GitHub (la page des commits est interdite par robots.txt).
// Une page de site tiers n'est lue qu'après son robots.txt, à chaque passage ; l'API GitHub suit les règles du reste de
// la découverte. Un classement illisible ou refusé est signalé, jamais deviné, et n'arrête pas les autres.
import { robotsDe } from '../collect/article-externe.ts';
import { GITHUB_API_HEADERS } from '../collect/github-releases.ts';
import { safeGet, type Resolver, type Transport } from '../collect/safe-fetch.ts';
import { DELAI_MS, TAILLE_MAX } from './capture.ts';
import { PREFIXE_CLASSEMENT, type DepotTrouve } from './decouverte.ts';
import { rechercherDepotsNommes } from './registre-mcp.ts';
import { accesSelonRobots } from './selection/robots.ts';

export interface Classement {
  id: string;
  /** Nom affiché dans la mention de provenance du post. */
  nom: string;
  url: string;
  accept: string;
  /** Dépôts cités, `propriétaire/dépôt`, dans l'ordre du classement ; liste vide si le format n'est pas reconnu. */
  lire: (corps: string) => string[];
}

/** Dépôts pris au plus par classement et par passage (en tête de liste) : borne le nombre de recherches GitHub. */
export const MAX_DEPOTS_PAR_CLASSEMENT = 25;

const NOM = '[A-Za-z0-9_.-]+';
/** Chemins de github.com qui ne sont pas des comptes. */
const HORS_COMPTES = new Set(['orgs', 'topics', 'sponsors', 'features', 'marketplace', 'apps', 'settings', 'collections', 'trending', 'about', 'login', 'search']);

const uniques = (noms: string[]): string[] => {
  const vus = new Set<string>();
  return noms.filter((n) => !vus.has(n.toLowerCase()) && Boolean(vus.add(n.toLowerCase())));
};

/** `propriétaire/dépôt` d'un lien GitHub https, même s'il pointe plus bas dans le dépôt ; null sinon. */
export function depotDuLien(lien: string): string | null {
  const m = new RegExp(`^https://github\\.com/(${NOM})/(${NOM}?)(?:\\.git)?(?:[/#?].*)?$`).exec(lien.trim());
  if (!m || HORS_COMPTES.has(m[1]!.toLowerCase()) || m[2] === '.' || m[2] === '..') return null;
  return `${m[1]}/${m[2]}`;
}

/** Selan, version Markdown : un titre `### [propriétaire/dépôt](https://selan.ai/top/claude-code-skills/…)` par rang. */
export function lireSelan(corps: string): string[] {
  const titre = new RegExp(`^\\s*###\\s+\\[(${NOM}/${NOM})\\]\\(https://selan\\.ai/top/claude-code-skills/[^)\\s]+\\)\\s*$`, 'gm');
  return uniques([...corps.matchAll(titre)].map((m) => m[1]!));
}

/** CSV (RFC 4180) : champs entre guillemets, guillemets doublés, virgules et sauts de ligne dans un champ. */
export function lireCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let cite = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]!;
    if (cite) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') cite = false;
      else champ += c;
    } else if (c === '"') cite = true;
    else if (c === ',') { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ);
      champ = '';
      if (ligne.length > 1 || ligne[0] !== '') lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length > 0) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

/**
 * awesome-claude-code, tableau des ressources : entrées actives et non périmées qui pointent vers GitHub, les plus
 * récemment ajoutées d'abord (`Date Added`, `AAAA-MM-JJ:HH-MM-SS` ; sans date : à la fin, dans l'ordre du fichier).
 */
export function lireAwesomeClaudeCode(corps: string): string[] {
  const [entete, ...lignes] = lireCsv(corps);
  if (!entete) return [];
  const [lien, actif, ajout, perime] = ['Link', 'Active', 'Date Added', 'Stale'].map((n) => entete.indexOf(n));
  if (lien === undefined || actif === undefined || ajout === undefined || lien < 0 || actif < 0 || ajout < 0) return [];
  const entrees = lignes
    .filter((l) => l[actif] === 'TRUE' && (perime === undefined || perime < 0 || l[perime] !== 'TRUE'))
    .map((l, rang) => ({ depot: depotDuLien(l[lien] ?? ''), date: /^\d{4}-\d{2}-\d{2}/.test(l[ajout] ?? '') ? l[ajout]! : '', rang }))
    .filter((e): e is { depot: string; date: string; rang: number } => e.depot !== null);
  entrees.sort((a, b) => (a.date === b.date ? a.rang - b.rang : a.date > b.date ? -1 : 1));
  return uniques(entrees.map((e) => e.depot));
}

export const CLASSEMENTS: readonly Classement[] = [
  {
    id: 'selan',
    nom: 'Selan, skills Claude Code en tendance sur 7 jours',
    url: 'https://selan.ai/top/claude-code-skills/this-week.md',
    accept: 'text/markdown, text/plain',
    lire: lireSelan,
  },
  {
    id: 'awesome-claude-code',
    nom: 'awesome-claude-code, ajouts récents',
    url: 'https://api.github.com/repos/hesreallyhim/awesome-claude-code/contents/THE_RESOURCES_TABLE_NEW.csv',
    accept: 'application/vnd.github.raw+json',
    lire: lireAwesomeClaudeCode,
  },
];

export interface OptionsClassements {
  userAgent: string;
  seuil: number;
  classements?: readonly Classement[];
  maxParClassement?: number;
  /** Moment (ms depuis l'époque) après lequel plus aucune recherche GitHub n'est envoyée. */
  echeance?: number;
  transport?: Transport;
  resolve?: Resolver;
  attendre?: (ms: number) => Promise<void>;
}

/**
 * Lit chaque classement, puis cherche sur GitHub les dépôts cités au-dessus du seuil. Un dépôt cité par deux classements
 * garde la provenance du premier. Un classement refusé par robots.txt, en échec ou illisible est rendu dans `erreurs`.
 */
export async function chercherClassements(o: OptionsClassements): Promise<{ trouves: { depot: DepotTrouve; sujet: string }[]; classements: { id: string; cites: number }[]; erreurs: { sujet: string; message: string }[]; illisibles: number; reportees: number }> {
  const deps = { ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) };
  const erreurs: { sujet: string; message: string }[] = [];
  const bilan: { id: string; cites: number }[] = [];
  const origine = new Map<string, string>();
  for (const c of o.classements ?? CLASSEMENTS) {
    const sujet = `classement ${c.id}`;
    try {
      const url = new URL(c.url);
      const api = url.hostname === 'api.github.com';
      if (!api) {
        const acces = accesSelonRobots(await robotsDe(url.hostname, { userAgent: o.userAgent, timeoutMs: DELAI_MS, deps }), o.userAgent, `${url.pathname}${url.search}`);
        if (!acces.autorise) { erreurs.push({ sujet, message: `non lu : ${acces.motif}` }); continue; }
      }
      const r = await safeGet(c.url, { allowedHosts: [url.hostname], timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX }, { ...(api ? GITHUB_API_HEADERS : {}), accept: c.accept, 'user-agent': o.userAgent }, deps);
      const cites = c.lire(r.body.toString('utf8'));
      if (cites.length === 0) { erreurs.push({ sujet, message: 'aucun dépôt lu : format inattendu' }); continue; }
      bilan.push({ id: c.id, cites: cites.length });
      for (const d of cites.slice(0, o.maxParClassement ?? MAX_DEPOTS_PAR_CLASSEMENT)) if (!origine.has(d.toLowerCase())) origine.set(d.toLowerCase(), c.nom);
    } catch (e) {
      erreurs.push({ sujet, message: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  if (origine.size === 0) return { trouves: [], classements: bilan, erreurs, illisibles: 0, reportees: 0 };
  const recherche = await rechercherDepotsNommes([...origine.keys()], o, 'classements (recherche GitHub)', true);
  erreurs.push(...recherche.erreurs);
  const trouves = recherche.depots
    .filter((depot) => origine.has(depot.full_name.toLowerCase()))
    .map((depot) => ({ depot, sujet: `${PREFIXE_CLASSEMENT}${origine.get(depot.full_name.toLowerCase())!}` }));
  return { trouves, classements: bilan, erreurs, illisibles: recherche.illisibles, reportees: recherche.reportees };
}
