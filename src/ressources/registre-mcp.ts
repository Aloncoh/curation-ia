// Registre officiel des serveurs MCP (P6, bloc 3 ; accord de l'utilisateur du 2026-11-05) : porte d'entrée de plus vers
// la chaîne des découvertes. Les serveurs publiés ou mis à jour récemment qui déclarent un dépôt GitHub deviennent des
// candidats, soumis au même seuil d'étoiles (`decouverte.seuil_etoiles`) et au même tri que la recherche par sujet
// (decouverte.ts) ; ils vont à Repo, avec la même grille `d1`. Présence au registre et étoiles : des informations
// d'entrée, jamais des critères de qualité. API publique, sans jeton, toujours par safeGet ; réponses = données.
import { z } from 'zod';
import { GITHUB_API_HEADERS } from '../collect/github-releases.ts';
import { safeGet, type Resolver, type Transport } from '../collect/safe-fetch.ts';
import { DELAI_MS, TAILLE_MAX } from './capture.ts';
import { lireRecherche, PAUSE_RECHERCHE_MS, PREFIXE_REGISTRE, type DepotTrouve } from './decouverte.ts';

export const URL_REGISTRE_MCP = 'https://registry.modelcontextprotocol.io/v0/servers';
/** Pages de 100 serveurs lues au plus par passage. */
export const PAGES_MAX_REGISTRE = 5;
/** Longueur maximale d'une requête de recherche GitHub (limite documentée : 256 caractères). */
const LONGUEUR_MAX_REQUETE = 256;

const Serveur = z.object({
  server: z.object({ name: z.string().min(1).max(200), repository: z.object({ url: z.string() }).partial().optional() }),
});
const Page = z.object({ servers: z.array(z.unknown()), metadata: z.object({ nextCursor: z.string().optional() }).partial().optional() });

/** `propriétaire/dépôt` d'une adresse GitHub https, sans `.git` ni sous-dossier ; null sinon. */
export function depotGithub(url: string | undefined): string | null {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url ?? '');
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Une page du registre : serveurs avec un dépôt GitHub, curseur suivant, entrées illisibles comptées (jamais devinées). */
export function lireRegistre(corps: string): { serveurs: { nom: string; depot: string }[]; suivant: string | null; illisibles: number } {
  const page = Page.parse(JSON.parse(corps));
  const serveurs: { nom: string; depot: string }[] = [];
  let illisibles = 0;
  for (const brut of page.servers) {
    const s = Serveur.safeParse(brut);
    if (!s.success) { illisibles++; continue; }
    const depot = depotGithub(s.data.server.repository?.url);
    // Le dépôt du registre lui-même est cité par des serveurs qui n'ont pas de dépôt propre : ce n'est pas le leur.
    if (depot && depot.toLowerCase() !== 'modelcontextprotocol/registry') serveurs.push({ nom: s.data.server.name, depot });
  }
  return { serveurs, suivant: page.metadata?.nextCursor ?? null, illisibles };
}

/** Requêtes de recherche groupant plusieurs `repo:` sous la longueur maximale, avec le seuil d'étoiles. */
export function requetesDepots(depots: readonly string[], seuil: number): string[] {
  const fin = ` stars:>=${seuil}`;
  const requetes: string[] = [];
  let courante: string[] = [];
  for (const d of depots) {
    const essai = [...courante, `repo:${d}`].join(' ') + fin;
    if (courante.length > 0 && essai.length > LONGUEUR_MAX_REQUETE) {
      requetes.push(courante.join(' ') + fin);
      courante = [];
    }
    courante.push(`repo:${d}`);
  }
  if (courante.length) requetes.push(courante.join(' ') + fin);
  return requetes;
}

export interface OptionsRegistre {
  userAgent: string;
  seuil: number;
  /** Date ISO : serveurs publiés ou mis à jour depuis. */
  depuis: string;
  pagesMax?: number;
  transport?: Transport;
  resolve?: Resolver;
  attendre?: (ms: number) => Promise<void>;
}

/**
 * Serveurs récents du registre (dernière version de chacun), puis recherche GitHub de leurs dépôts au-dessus du seuil.
 * Une page ou une requête en échec n'arrête pas les autres ; chaque erreur est rendue.
 */
export async function chercherRegistreMcp(o: OptionsRegistre): Promise<{ trouves: { depot: DepotTrouve; sujet: string }[]; serveurs: number; erreurs: { sujet: string; message: string }[]; illisibles: number }> {
  const deps = { ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) };
  const attendre = o.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const erreurs: { sujet: string; message: string }[] = [];
  let illisibles = 0;
  const nomParDepot = new Map<string, string>();
  let curseur: string | null = null;
  for (let page = 0; page < (o.pagesMax ?? PAGES_MAX_REGISTRE); page++) {
    const url = `${URL_REGISTRE_MCP}?version=latest&limit=100&updated_since=${encodeURIComponent(o.depuis)}${curseur ? `&cursor=${encodeURIComponent(curseur)}` : ''}`;
    try {
      const r = await safeGet(url, { allowedHosts: ['registry.modelcontextprotocol.io'], timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX }, { accept: 'application/json', 'user-agent': o.userAgent }, deps);
      const lu = lireRegistre(r.body.toString('utf8'));
      illisibles += lu.illisibles;
      for (const s of lu.serveurs) if (!nomParDepot.has(s.depot.toLowerCase())) nomParDepot.set(s.depot.toLowerCase(), s.nom);
      curseur = lu.suivant;
    } catch (e) {
      erreurs.push({ sujet: 'registre-mcp', message: e instanceof Error ? e.message.slice(0, 200) : String(e) });
      break;
    }
    if (!curseur) break;
  }
  const trouves: { depot: DepotTrouve; sujet: string }[] = [];
  for (const [i, q] of requetesDepots([...nomParDepot.keys()], o.seuil).entries()) {
    if (i > 0) await attendre(PAUSE_RECHERCHE_MS);
    try {
      const r = await safeGet(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100`,
        { allowedHosts: ['api.github.com'], timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX },
        { ...GITHUB_API_HEADERS, 'user-agent': o.userAgent },
        deps,
      );
      const lu = lireRecherche(r.body.toString('utf8'));
      illisibles += lu.illisibles;
      for (const depot of lu.depots) trouves.push({ depot, sujet: `${PREFIXE_REGISTRE}${nomParDepot.get(depot.full_name.toLowerCase()) ?? depot.full_name}` });
    } catch (e) {
      erreurs.push({ sujet: 'registre-mcp (recherche GitHub)', message: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  return { trouves, serveurs: nomParDepot.size, erreurs, illisibles };
}
