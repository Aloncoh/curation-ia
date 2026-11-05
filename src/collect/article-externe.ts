// Récupération d'un article externe signalé (Hacker News, 2026-11-05), séparée du signal. Garde-fous, dans l'ordre :
// - destination validée (https, nom de domaine réel, ni IP ni hôte local : hackernews.ts) ;
// - toutes les adresses IP résolues vérifiées par safeGet (plages privées, locales, de métadonnées refusées) ;
// - robots.txt de l'hôte lu d'abord (RFC 9309) : une page interdite n'est jamais demandée ; robots.txt inaccessible :
//   rien n'est demandé ; ce n'est pas une lecture des conditions d'utilisation, que le code ne peut pas faire ;
// - redirections : jamais suivies par safeGet ; ici, trois au plus, chacune revalidée comme la première (destination,
//   robots.txt de son hôte) ;
// - délai et taille plafonnés. Un échec rend une raison, jamais un texte : rien n'est inventé.
import { accesSelonRobots, type EtatRobots } from '../ressources/selection/robots.ts';
import { destinationValide } from './hackernews.ts';
import { safeGet, SafeFetchError, type Resolver, type Transport } from './safe-fetch.ts';

export const REDIRECTIONS_MAX = 3;
const TAILLE_MAX_ROBOTS = 512 * 1024;

export type ResultatArticle = { ok: true; url: string; html: string } | { ok: false; motif: string };

interface Options {
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  deps?: { resolve?: Resolver; transport?: Transport };
}

async function robotsDe(hote: string, o: Options): Promise<EtatRobots> {
  try {
    const r = await safeGet(`https://${hote}/robots.txt`, { allowedHosts: [hote], timeoutMs: o.timeoutMs, maxBytes: TAILLE_MAX_ROBOTS }, { 'user-agent': o.userAgent, accept: 'text/plain' }, o.deps);
    return { etat: 'lu', texte: r.body.toString('utf8') };
  } catch (e) {
    // 4xx : pas de robots.txt, tout est permis (RFC 9309 §2.3.1.3) ; autre échec : inaccessible, rien n'est demandé.
    if (e instanceof SafeFetchError && e.kind === 'http_status' && e.status !== undefined && e.status >= 400 && e.status < 500) return { etat: 'indisponible', statut: e.status };
    return { etat: 'inaccessible', motif: e instanceof SafeFetchError ? e.kind : 'erreur', statut: e instanceof SafeFetchError ? (e.status ?? null) : null };
  }
}

export async function lireArticleExterne(adresse: string, o: Options): Promise<ResultatArticle> {
  let url = destinationValide(adresse);
  if (!url) return { ok: false, motif: 'destination_refusee' };
  for (let saut = 0; saut <= REDIRECTIONS_MAX; saut++) {
    const robots = accesSelonRobots(await robotsDe(url.hostname, o), o.userAgent, `${url.pathname}${url.search}`);
    if (!robots.autorise) return { ok: false, motif: `${robots.motif} (${url.hostname})` };
    try {
      const r = await safeGet(url.toString(), { allowedHosts: [url.hostname], timeoutMs: o.timeoutMs, maxBytes: o.maxBytes }, { 'user-agent': o.userAgent, accept: 'text/html' }, o.deps);
      return { ok: true, url: url.toString(), html: r.body.toString('utf8') };
    } catch (e) {
      if (e instanceof SafeFetchError && e.kind === 'redirect' && e.location) {
        let suivante: URL | null = null;
        try {
          suivante = destinationValide(new URL(e.location, url).toString());
        } catch {
          suivante = null;
        }
        if (!suivante) return { ok: false, motif: `redirection_refusee vers ${e.location.slice(0, 120)}` };
        url = suivante;
        continue;
      }
      return { ok: false, motif: e instanceof Error ? e.message.slice(0, 200) : String(e) };
    }
  }
  return { ok: false, motif: `plus_de_${REDIRECTIONS_MAX}_redirections` };
}
