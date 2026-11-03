// Aperçus des pages d'accueil d'une sélection : captures d'écran prises en local par Chrome (playwright-core, canal
// « chrome »), sans connexion, sans cookie accepté ni clic, dans un contexte neuf par site. Seuls les sites dont la page
// a été capturée en texte (robots.txt lu et favorable) sont photographiés. L'image est rangée dans
// maquette/medias/montages/selections/apercus/ et tracée comme un document `apercu`, avec `droits_a_verifier` :
// les droits de publication de ces captures ne sont pas tranchés (STATE.md, montages). C'est un exemple de maquette.
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CollectedDocument } from '../../collect/github-releases.ts';
import { contentHash, normalizeUrl } from '../../collect/normalize.ts';
import { isForbiddenAddress, resolveAll, type Resolver } from '../../collect/safe-fetch.ts';
import { storeDocuments } from '../../collect/store.ts';
import type { Database } from '../../db/client.ts';
import { withBusyRetry } from '../../db/retry.ts';
import { runs } from '../../db/schema.ts';
import { finishRun, insertStep } from '../../jobs/runs.ts';
import { jsonTrie } from '../capture.ts';
import { capturesDeSelection } from './capture.ts';
import { sourceIdSite, type EntreeSelection, type SiteSelection } from './liste.ts';

export const DOSSIER_SELECTIONS = 'maquette/medias/montages/selections';
export const DOSSIER_APERCUS = `${DOSSIER_SELECTIONS}/apercus`;
export const FENETRE_APERCU = { largeur: 1440, hauteur: 900 };
/** Les droits de publication des captures de sites tiers ne sont pas tranchés : jamais publié tel quel. */
export const MOTIF_DROITS = "Captures d'écran de sites tiers : droits de publication non tranchés (STATE.md, point montages) ; exemple de maquette, jamais publié tel quel";

export type IssueApercu = { ok: true; statut: number; largeur: number; hauteur: number } | { ok: false; motif: string; detail: string };

/** Prend l'aperçu d'un site dans `fichier` (JPEG). Injecté dans les tests : aucun navigateur, aucun réseau. */
export type PreneurApercus = (sites: SiteSelection[], fichierDe: (s: SiteSelection) => string) => Promise<Map<string, IssueApercu>>;

export interface ContenuApercu {
  url: string;
  fichier: string;
  sha256: string;
  octets: number;
  largeur: number;
  hauteur: number;
  statut_http: number;
  navigateur: string;
  droits_a_verifier: true;
  motif_droits: string;
}

/** Refus d'un aperçu, enregistré comme capture : la dernière capture dit toujours l'état réel, jamais une image périmée. */
export interface RefusApercu {
  url: string;
  refuse: true;
  motif: string;
  detail: string;
}

const documentApercu = (s: SiteSelection, c: ContenuApercu | RefusApercu): CollectedDocument => {
  const content = jsonTrie(c);
  const title = `${s.nom} — aperçu de la page d'accueil`;
  return { externalId: 'apercu', url: s.url, normalizedUrl: normalizeUrl(s.url), title, version: null, announcedAt: null, content, contentFormat: 'json', contentHash: contentHash({ title, version: null, content }), metadata: { hote: s.hote } };
};

/** Requête qu'une page photographiée peut faire : HTTPS (ou data:/blob:), jamais vers une adresse locale ou privée écrite en clair. */
export function requeteApercuAdmise(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === 'data:' || u.protocol === 'blob:') return true;
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const hote = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hote === 'localhost' || hote.endsWith('.localhost') || hote.endsWith('.local') || hote.endsWith('.internal')) return false;
  return !/^[\d.]+$|:/.test(hote) || !isForbiddenAddress(hote);
}

/**
 * Preneur réel : Chrome local, sans tête. Avant chaque site, l'hôte est résolu et ses adresses vérifiées ; la navigation
 * vise l'URL canonique exacte et toute redirection (HTTP ou script) refuse l'aperçu. Aucun clic, aucun cookie accepté,
 * aucun téléchargement, aucun service worker, aucune permission ; le contexte est jeté après chaque site.
 */
export function preneurChrome(o: { resolve?: Resolver; attenteMs?: number } = {}): PreneurApercus {
  return async (sites, fichierDe) => {
    const { chromium } = await import('playwright-core');
    const issues = new Map<string, IssueApercu>();
    const navigateur = await chromium.launch({ channel: process.env.CURATION_CHROME ?? 'chrome', headless: true });
    try {
      for (const s of sites) {
        const fichier = fichierDe(s);
        try {
          const adresses = await (o.resolve ?? resolveAll)(s.hote);
          const interdite = adresses.find((a) => isForbiddenAddress(a.address));
          if (adresses.length === 0 || interdite) {
            issues.set(s.slug, { ok: false, motif: 'adresse_interdite', detail: interdite?.address ?? 'aucune adresse' });
            continue;
          }
          const contexte = await navigateur.newContext({
            viewport: { width: FENETRE_APERCU.largeur, height: FENETRE_APERCU.hauteur },
            deviceScaleFactor: 1,
            acceptDownloads: false,
            serviceWorkers: 'block',
            permissions: [],
            locale: 'en-US',
            timezoneId: 'Europe/Paris',
          });
          try {
            const page = await contexte.newPage();
            let navigationRefusee: string | null = null;
            await page.route('**/*', (route) => {
              const req = route.request();
              const url = req.url();
              // Navigation de la page principale : seulement l'URL canonique ; tout autre cible = redirection refusée.
              if (req.isNavigationRequest() && req.frame() === page.mainFrame() && url !== s.url) {
                navigationRefusee = url;
                return route.abort();
              }
              return requeteApercuAdmise(url) ? route.continue() : route.abort();
            });
            page.on('popup', (p) => void p.close());
            const reponse = await page.goto(s.url, { waitUntil: 'load', timeout: 30_000 }).catch((e: unknown) => {
              if (navigationRefusee === null) throw e;
              return null;
            });
            // Une protection anti-robot (défi Cloudflare, par exemple) n'est jamais contournée : l'aperçu est refusé.
            if (reponse && reponse.headers()['cf-mitigated'] !== undefined) {
              issues.set(s.slug, { ok: false, motif: 'protection_anti_robot', detail: `HTTP ${reponse.status()}, cf-mitigated: ${reponse.headers()['cf-mitigated']}${reponse.request().redirectedFrom() ? ` après redirection ${reponse.request().redirectedFrom()!.url()}` : ''}` });
              continue;
            }
            if (navigationRefusee !== null || !reponse || reponse.request().redirectedFrom() !== null || page.url() !== s.url) {
              issues.set(s.slug, { ok: false, motif: 'redirection', detail: navigationRefusee ?? page.url() });
              continue;
            }
            if (reponse.status() !== 200) {
              issues.set(s.slug, { ok: false, motif: 'reponse_http', detail: `HTTP ${reponse.status()}` });
              continue;
            }
            // Laisse la page finir son premier affichage (polices, images, animations d'entrée), sans rien toucher.
            await page.waitForTimeout(o.attenteMs ?? 3_000);
            if (page.url() !== s.url) {
              issues.set(s.slug, { ok: false, motif: 'redirection', detail: page.url() });
              continue;
            }
            await page.screenshot({ path: fichier, type: 'jpeg', quality: 82, timeout: 20_000 });
            issues.set(s.slug, { ok: true, statut: reponse.status(), largeur: FENETRE_APERCU.largeur, hauteur: FENETRE_APERCU.hauteur });
          } finally {
            await contexte.close();
          }
        } catch (erreur) {
          rmSync(fichier, { force: true });
          issues.set(s.slug, { ok: false, motif: 'navigation_impossible', detail: erreur instanceof Error ? erreur.message.split('\n')[0]! : String(erreur) });
        }
      }
    } finally {
      await navigateur.close();
    }
    return issues;
  };
}

export interface BilanApercus {
  runId: string;
  code: 0 | 1;
  sites: { slug: string; resultat: 'pris' | 'refuse' | 'non_capture'; fichier: string | null; motif: string | null; detail: string | null }[];
}

/** Prend les aperçus des sites capturés en texte, puis enregistre un document `apercu` par image prise. */
export async function prendreApercus(o: { database: Database; workerId: string; selection: EntreeSelection; preneur?: PreneurApercus; dossier?: string; mode?: 'live' | 'fixture'; horloge?: () => Date; navigateur?: string }): Promise<BilanApercus> {
  const { client, db } = o.database;
  const horloge = o.horloge ?? (() => new Date());
  const now = () => horloge().toISOString();
  const dossier = o.dossier ?? DOSSIER_APERCUS;
  mkdirSync(dossier, { recursive: true });
  const runId = randomUUID();
  const ecrire = <T>(f: () => Promise<T>) => withBusyRetry(client, f);
  await ecrire(() => db.insert(runs).values({ id: runId, kind: 'selection_apercus', jobId: null, sourceId: null, mode: o.mode ?? 'live', workerId: o.workerId, status: 'running', startedAt: now() }));
  const captures = await capturesDeSelection(client, o.selection);
  const bilan: BilanApercus['sites'] = [];
  const aPrendre = captures.sites.filter((x) => x.page !== null).map((x) => x.site);
  for (const x of captures.sites) if (x.page === null) bilan.push({ slug: x.site.slug, resultat: 'non_capture', fichier: null, motif: 'page_non_capturee', detail: 'aucune capture de la page : pas d’aperçu' });
  const fichierDe = (s: SiteSelection) => join(dossier, `${s.slug}.jpg`);
  const debut = now();
  const issues = aPrendre.length > 0 ? await (o.preneur ?? preneurChrome())(aPrendre, fichierDe) : new Map<string, IssueApercu>();
  let seq = 0;
  let nouveaux = 0;
  let inchanges = 0;
  let modifies = 0;
  for (const s of aPrendre) {
    const issue = issues.get(s.slug) ?? { ok: false, motif: 'apercu_absent', detail: 'aucun résultat du navigateur' };
    const fichier = fichierDe(s);
    if (!issue.ok) {
      rmSync(fichier, { force: true });
      const refus: RefusApercu = { url: s.url, refuse: true, motif: issue.motif, detail: issue.detail };
      await ecrire(() =>
        db.transaction(async (tx) => {
          const { counts } = await storeDocuments(tx, sourceIdSite(s.hote), [documentApercu(s, refus)], now(), runId);
          nouveaux += counts.newDocuments;
          inchanges += counts.unchangedDocuments;
          modifies += counts.changedDocuments;
        }),
      );
      bilan.push({ slug: s.slug, resultat: 'refuse', fichier: null, motif: issue.motif, detail: issue.detail });
      await ecrire(() => insertStep(db, { runId, seq: ++seq, name: 'apercu', status: 'failed', startedAt: debut, finishedAt: now(), detail: { site: s.slug, url: s.url, motif: issue.motif, detail: issue.detail } }));
      continue;
    }
    const octets = readFileSync(fichier);
    const contenu: ContenuApercu = {
      url: s.url,
      fichier,
      sha256: createHash('sha256').update(octets).digest('hex'),
      octets: statSync(fichier).size,
      largeur: issue.largeur,
      hauteur: issue.hauteur,
      statut_http: issue.statut,
      navigateur: o.navigateur ?? `chrome (playwright-core), sans tête, ${FENETRE_APERCU.largeur}×${FENETRE_APERCU.hauteur}`,
      droits_a_verifier: true,
      motif_droits: MOTIF_DROITS,
    };
    await ecrire(() =>
      db.transaction(async (tx) => {
        const { counts } = await storeDocuments(tx, sourceIdSite(s.hote), [documentApercu(s, contenu)], now(), runId);
        nouveaux += counts.newDocuments;
        inchanges += counts.unchangedDocuments;
        modifies += counts.changedDocuments;
      }),
    );
    bilan.push({ slug: s.slug, resultat: 'pris', fichier, motif: null, detail: null });
    await ecrire(() => insertStep(db, { runId, seq: ++seq, name: 'apercu', status: 'succeeded', startedAt: debut, finishedAt: now(), detail: { site: s.slug, url: s.url, fichier, sha256: contenu.sha256, octets: contenu.octets, droits_a_verifier: true } }));
  }
  const refus = bilan.filter((b) => b.resultat === 'refuse').length;
  await ecrire(() => finishRun(db, runId, { status: refus > 0 ? 'failed' : 'succeeded', finishedAt: now(), newDocuments: nouveaux, unchangedDocuments: inchanges, changedDocuments: modifies, errorKind: refus > 0 ? 'apercus_refuses' : null, errorMessage: refus > 0 ? `${refus} aperçu(s) refusé(s)` : null }));
  return { runId, code: refus > 0 ? 1 : 0, sites: bilan };
}
