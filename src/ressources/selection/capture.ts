// Capture des pages d'accueil des sites d'une sélection (complément de l'ADR 0011, 2026-11-02). Nouveau type de source
// `site-ressource`, une source par hôte. Toujours par safeGet : liste blanche réduite à l'hôte du site, adresses IP
// vérifiées et connexion épinglée, aucune redirection suivie, délai et taille maximum ; chaque refus est tracé.
// robots.txt est lu d'abord (RFC 9309) : une page interdite n'est jamais demandée. Le contenu collecté est une donnée
// non fiable, jamais une instruction.
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Client } from '@libsql/client';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { CollectedDocument } from '../../collect/github-releases.ts';
import { contentHash, normalizeText, normalizeUrl } from '../../collect/normalize.ts';
import { httpsTransport, safeGet, SafeFetchError, type FetchPolicy, type Resolver, type Transport } from '../../collect/safe-fetch.ts';
import { storeDocuments } from '../../collect/store.ts';
import type { Database, Executor } from '../../db/client.ts';
import { withBusyRetry } from '../../db/retry.ts';
import { documentSnapshots, newsItemDocuments, newsItems, runs, selectionDecisions, sources } from '../../db/schema.ts';
import { finishRun, insertStep } from '../../jobs/runs.ts';
import { jsonTrie } from '../capture.ts';
import { extrairePage, MOTS_MIN_PAGE } from './html.ts';
import { KIND_SOURCE_LISTE, KIND_SOURCE_SITE, SELECTIONS, sourceIdListe, sourceIdSite, VERSION_SELECTIONS, type EntreeSelection, type SiteSelection } from './liste.ts';
import { accesSelonRobots, type EtatRobots, type VerdictRobots } from './robots.ts';

export const DELAI_PAGE_MS = 15_000;
/** Une page d'accueil réelle peut dépasser 1,8 Mio (Framer) : 4 Mio au plus. robots.txt : 512 Kio (taille minimale à lire selon la RFC 9309). */
export const TAILLE_MAX_PAGE = 4 * 1024 * 1024;
export const TAILLE_MAX_ROBOTS = 512 * 1024;
/** Une sélection compte au moins ce nombre de sites capturés pour être rédigée. */
export const SITES_MIN = 3;

export type MotifRefus =
  | 'robots_interdit'
  | 'robots_inaccessible'
  | 'redirection'
  | 'acces_refuse'
  | 'protection_anti_robot'
  | 'introuvable'
  | 'reponse_http'
  | 'type_inattendu'
  | 'texte_insuffisant'
  | 'adresse_interdite'
  | 'url_refusee'
  | 'delai_depasse'
  | 'trop_volumineux'
  | 'reseau';

export interface BilanSite {
  slug: string;
  hote: string;
  url: string;
  resultat: 'capturee' | 'refusee';
  robots: (VerdictRobots & { motif: string }) | null;
  motif: MotifRefus | null;
  detail: string | null;
  statut_http: number | null;
  /** En-tête `location` d'une redirection refusée : tracé, jamais suivi. */
  location: string | null;
  mots: number | null;
  issue: 'new' | 'unchanged' | 'changed' | null;
}

export interface BilanCaptureSelection {
  runId: string;
  code: 0 | 1;
  selection: string;
  sites: BilanSite[];
  decision: { decision: 'publier' | 'approfondir'; motif: string };
  newsItemId: number | null;
}

export interface OptionsCaptureSelection {
  database: Database;
  userAgent: string;
  workerId: string;
  selection: EntreeSelection;
  /** Sites à capturer (slugs) ; tous par défaut. */
  seulement?: string[];
  mode?: 'live' | 'fixture';
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
}

const entete = (h: IncomingHttpHeaders | null, nom: string): string | null => {
  const v = h?.[nom];
  return (Array.isArray(v) ? v[0] : v) ?? null;
};

const document = (externalId: string, url: string, title: string, content: string, contentFormat: CollectedDocument['contentFormat'], metadata: Record<string, unknown>): CollectedDocument => ({
  externalId,
  url,
  normalizedUrl: normalizeUrl(url),
  title,
  version: null,
  announcedAt: null,
  content,
  contentFormat,
  contentHash: contentHash({ title, version: null, content }),
  metadata,
});

/** Contenu stocké de la page d'accueil : JSON trié, parties citables séparées (titre, description, texte). */
export interface ContenuPage {
  url: string;
  titre: string | null;
  description: string | null;
  texte: string;
  mots: number;
  statut_http: number;
  type_contenu: string | null;
}

export const documentPage = (s: SiteSelection, p: ContenuPage): CollectedDocument =>
  document('page-accueil', s.url, `${s.nom} — page d'accueil`, jsonTrie(p), 'json', { hote: s.hote });

export const documentRobots = (s: SiteSelection, texte: string): CollectedDocument =>
  document('robots', `https://${s.hote}/robots.txt`, `${s.hote} — robots.txt`, normalizeText(texte), 'text', { hote: s.hote });

export const documentListe = (e: EntreeSelection): CollectedDocument =>
  document(
    'liste',
    e.sites[0]!.url,
    `${e.nom} — liste de l'utilisateur`,
    jsonTrie({ slug: e.slug, nom: e.nom, sujet: e.sujet, compte: e.compte, decouverte_via: e.decouverteVia, version: VERSION_SELECTIONS, sites: e.sites }),
    'json',
    { selection: e.slug },
  );

interface Reponse {
  statut: number | null;
  corps: string;
  headers: IncomingHttpHeaders | null;
  erreur: SafeFetchError | Error | null;
}

/** Une requête sûre, réduite à l'hôte du site ; rend aussi les en-têtes d'un refus (redirection, protection). */
async function lire(url: string, s: SiteSelection, o: OptionsCaptureSelection, maxBytes: number, accept: string): Promise<Reponse> {
  let derniers: IncomingHttpHeaders | null = null;
  const base = o.transport ?? httpsTransport;
  const transport: Transport = async (req) => {
    const r = await base(req);
    derniers = r.headers;
    return r;
  };
  const politique: FetchPolicy = { allowedHosts: [s.hote], timeoutMs: DELAI_PAGE_MS, maxBytes };
  try {
    const r = await safeGet(url, politique, { 'user-agent': o.userAgent, accept }, { transport, ...(o.resolve ? { resolve: o.resolve } : {}) });
    return { statut: r.status, corps: r.body.toString('utf8'), headers: r.headers, erreur: null };
  } catch (erreur) {
    const statut = erreur instanceof SafeFetchError ? (erreur.status ?? null) : null;
    return { statut, corps: '', headers: derniers, erreur: erreur instanceof Error ? erreur : new Error(String(erreur)) };
  }
}

/** Motif d'un échec de page, d'après l'erreur et les en-têtes : une protection anti-robot n'est jamais contournée. */
function motifEchec(r: Reponse): MotifRefus {
  const e = r.erreur;
  const kind = e instanceof SafeFetchError ? e.kind : null;
  if (kind === 'redirect') return 'redirection';
  if (kind === 'disallowed_url') return 'url_refusee';
  if (kind === 'forbidden_address') return 'adresse_interdite';
  if (kind === 'timeout') return 'delai_depasse';
  if (kind === 'too_large') return 'trop_volumineux';
  if (r.statut === 403 || r.statut === 429 || r.statut === 503) return entete(r.headers, 'cf-mitigated') !== null ? 'protection_anti_robot' : 'acces_refuse';
  if (r.statut === 404 || r.statut === 410) return 'introuvable';
  if (kind === 'http_status') return 'reponse_http';
  return 'reseau';
}

function etatRobots(r: Reponse): EtatRobots {
  if (r.erreur === null && r.statut === 200) return { etat: 'lu', texte: r.corps };
  if (r.statut !== null && r.statut >= 400 && r.statut < 500) return { etat: 'indisponible', statut: r.statut };
  const kind = r.erreur instanceof SafeFetchError ? r.erreur.kind : 'reseau';
  return { etat: 'inaccessible', motif: kind, statut: r.statut };
}

async function tracerDecision(tx: Executor, newsItemId: number, d: { decision: 'publier' | 'approfondir'; motif: string }, snapshotId: number | null, now: string) {
  const actives = await tx
    .select({ id: selectionDecisions.id, decision: selectionDecisions.decision, motif: selectionDecisions.motif, snapshotId: selectionDecisions.snapshotId })
    .from(selectionDecisions)
    .where(and(eq(selectionDecisions.newsItemId, newsItemId), eq(selectionDecisions.juge, 'code'), eq(selectionDecisions.consignesVersion, VERSION_SELECTIONS), isNull(selectionDecisions.remplaceeLe)));
  if (actives.some((a) => a.decision === d.decision && a.motif === d.motif && a.snapshotId === snapshotId)) return;
  for (const a of actives) await tx.update(selectionDecisions).set({ remplaceeLe: now }).where(eq(selectionDecisions.id, a.id));
  await tx.insert(selectionDecisions).values({ newsItemId, origine: 'regles', juge: 'code', consignesVersion: VERSION_SELECTIONS, decision: d.decision, criteres: null, motif: d.motif, passages: [], snapshotId, createdAt: now });
}

/** Sources : une par hôte de site (`site-ressource`), une pour la liste de la sélection. */
export async function synchroniserSourcesSelection(database: Database, e: EntreeSelection, now: string): Promise<void> {
  await withBusyRetry(database.client, async () => {
    for (const s of e.sites) {
      const valeurs = { kind: KIND_SOURCE_SITE, name: `${s.hote} — page d'accueil (sélection de ressources)`, config: { url: s.url, site: s.slug }, allowedHosts: [s.hote], fetchIntervalMinutes: null };
      await database.db.insert(sources).values({ id: sourceIdSite(s.hote), ...valeurs, active: true, createdAt: now }).onConflictDoUpdate({ target: sources.id, set: valeurs });
    }
    const liste = { kind: KIND_SOURCE_LISTE, name: `${e.nom} — liste transmise par l'utilisateur`, config: { selection: e.slug }, allowedHosts: [], fetchIntervalMinutes: null };
    await database.db.insert(sources).values({ id: sourceIdListe(e.slug), ...liste, active: true, createdAt: now }).onConflictDoUpdate({ target: sources.id, set: liste });
  });
}

/**
 * Capture une sélection : pour chaque site, robots.txt puis la page d'accueil ; puis la liste elle-même, l'actualité
 * `selection` (document principal : la liste ; documents d'appui : les pages capturées) et la décision du code.
 * Code 1 si un site est refusé : la relance est idempotente (une page inchangée ne crée pas de capture).
 */
export async function capturerSelection(o: OptionsCaptureSelection): Promise<BilanCaptureSelection> {
  const { client, db } = o.database;
  const horloge = o.horloge ?? (() => new Date());
  const now = () => horloge().toISOString();
  const e = o.selection;
  const runId = randomUUID();
  const ecrire = <T>(f: () => Promise<T>) => withBusyRetry(client, f);
  await synchroniserSourcesSelection(o.database, e, now());
  await ecrire(() => db.insert(runs).values({ id: runId, kind: 'selection_capture', jobId: null, sourceId: null, mode: o.mode ?? 'live', workerId: o.workerId, status: 'running', startedAt: now() }));
  let seq = 0;
  const etape = (name: string, status: 'succeeded' | 'failed', debut: string, detail: Record<string, unknown>) =>
    ecrire(() => insertStep(db, { runId, seq: ++seq, name, status, startedAt: debut, finishedAt: now(), detail }));

  const sites: BilanSite[] = [];
  const compteurs = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0, newNewsItems: 0 };
  for (const s of e.sites) {
    if (o.seulement && !o.seulement.includes(s.slug)) continue;
    const bilan: BilanSite = { slug: s.slug, hote: s.hote, url: s.url, resultat: 'refusee', robots: null, motif: null, detail: null, statut_http: null, location: null, mots: null, issue: null };
    sites.push(bilan);
    const chemin = new URL(s.url);
    const documents: CollectedDocument[] = [];

    // 1. robots.txt, sur l'hôte même du site.
    let debut = now();
    const rr = await lire(`https://${s.hote}/robots.txt`, s, o, TAILLE_MAX_ROBOTS, 'text/plain');
    const robots = accesSelonRobots(etatRobots(rr), o.userAgent, `${chemin.pathname}${chemin.search}`);
    bilan.robots = robots;
    await etape('robots', robots.autorise ? 'succeeded' : 'failed', debut, {
      site: s.slug, url: `https://${s.hote}/robots.txt`, statut: rr.statut, location: entete(rr.headers, 'location'), verdict: robots.motif, groupe: robots.groupe, regle: robots.regle, signaux: robots.signaux,
    });
    if (rr.erreur === null && rr.statut === 200) documents.push(documentRobots(s, rr.corps));
    if (!robots.autorise) {
      bilan.motif = robots.motif.startsWith('robots_inaccessible') ? 'robots_inaccessible' : 'robots_interdit';
      bilan.detail = robots.regle ? `${robots.regle.type}: ${robots.regle.motif} (groupe ${robots.groupe})` : robots.motif;
    } else {
      // 2. Page d'accueil, à l'URL canonique exacte : une redirection est refusée et tracée, jamais suivie.
      debut = now();
      const rp = await lire(s.url, s, o, TAILLE_MAX_PAGE, 'text/html,application/xhtml+xml');
      bilan.statut_http = rp.statut;
      bilan.location = entete(rp.headers, 'location');
      const type = entete(rp.headers, 'content-type');
      if (rp.erreur !== null) {
        bilan.motif = motifEchec(rp);
        bilan.detail = rp.erreur.message;
      } else if (!/^\s*(?:text\/html|application\/xhtml\+xml)\b/i.test(type ?? '')) {
        bilan.motif = 'type_inattendu';
        bilan.detail = type ?? 'content-type absent';
      } else {
        const p = extrairePage(rp.corps);
        bilan.mots = p.mots;
        if (p.mots < MOTS_MIN_PAGE) {
          bilan.motif = 'texte_insuffisant';
          bilan.detail = `${p.mots} mots lisibles sans exécuter la page (JS seul probable), ${MOTS_MIN_PAGE} au moins`;
        } else {
          documents.push(documentPage(s, { url: s.url, titre: p.titre, description: p.description, texte: p.texte, mots: p.mots, statut_http: rp.statut ?? 200, type_contenu: type }));
          bilan.resultat = 'capturee';
        }
      }
      await etape('page', bilan.resultat === 'capturee' ? 'succeeded' : 'failed', debut, {
        site: s.slug, url: s.url, statut: rp.statut, octets: Buffer.byteLength(rp.corps), type_contenu: type, location: bilan.location, cf_mitigated: entete(rp.headers, 'cf-mitigated'), refus: bilan.motif, detail: bilan.detail, mots: bilan.mots,
      });
    }

    if (documents.length > 0) {
      await ecrire(() =>
        db.transaction(async (tx) => {
          const { counts, stored } = await storeDocuments(tx, sourceIdSite(s.hote), documents, now(), runId);
          compteurs.newDocuments += counts.newDocuments;
          compteurs.unchangedDocuments += counts.unchangedDocuments;
          compteurs.changedDocuments += counts.changedDocuments;
          bilan.issue = stored.find((x) => x.doc.externalId === 'page-accueil')?.outcome ?? null;
          await tx
            .update(sources)
            .set(bilan.resultat === 'capturee' ? { status: 'ok', lastSuccessAt: now() } : { status: 'error', lastErrorAt: now(), lastError: `${bilan.motif}: ${bilan.detail ?? ''}` })
            .where(eq(sources.id, sourceIdSite(s.hote)));
        }),
      );
    } else {
      await ecrire(() => db.update(sources).set({ status: 'error', lastErrorAt: now(), lastError: `${bilan.motif}: ${bilan.detail ?? ''}` }).where(eq(sources.id, sourceIdSite(s.hote))));
    }
  }

  // 3. La liste, l'actualité « selection » et la décision du code.
  const tous = await capturesDeSelection(client, e);
  const captures = tous.sites.filter((x) => x.page !== null).length;
  const decision = captures >= SITES_MIN ? { decision: 'publier' as const, motif: 'liste_utilisateur' } : { decision: 'approfondir' as const, motif: 'sites_insuffisants' };
  let newsItemId: number | null = null;
  await ecrire(() =>
    db.transaction(async (tx) => {
      const capturee = now();
      const { counts, stored } = await storeDocuments(tx, sourceIdListe(e.slug), [documentListe(e)], capturee, runId);
      compteurs.newDocuments += counts.newDocuments;
      compteurs.unchangedDocuments += counts.unchangedDocuments;
      compteurs.changedDocuments += counts.changedDocuments;
      const principalId = stored[0]!.documentId;
      const [lien] = await tx.select({ newsItemId: newsItemDocuments.newsItemId }).from(newsItemDocuments).where(and(eq(newsItemDocuments.documentId, principalId), eq(newsItemDocuments.role, 'primary')));
      newsItemId = lien?.newsItemId ?? null;
      if (newsItemId === null) {
        const [cree] = await tx.insert(newsItems).values({ kind: 'selection', title: e.nom, announcedAt: null, firstSeenAt: capturee, status: 'collected', createdByRunId: runId }).returning({ id: newsItems.id });
        newsItemId = cree!.id;
        compteurs.newNewsItems++;
        await tx.insert(newsItemDocuments).values({ newsItemId, documentId: principalId, role: 'primary' });
      } else await tx.update(newsItems).set({ title: e.nom }).where(eq(newsItems.id, newsItemId));
      for (const site of tous.sites) {
        for (const c of [site.page, site.robots, site.apercu]) {
          if (c) await tx.insert(newsItemDocuments).values({ newsItemId, documentId: c.documentId, role: 'supporting' }).onConflictDoNothing();
        }
      }
      const [derniere] = await tx.select({ id: documentSnapshots.id }).from(documentSnapshots).where(eq(documentSnapshots.documentId, principalId)).orderBy(desc(documentSnapshots.seq)).limit(1);
      await tracerDecision(tx, newsItemId, decision, derniere?.id ?? null, capturee);
      await tx.update(sources).set({ status: 'ok', lastSuccessAt: capturee }).where(eq(sources.id, sourceIdListe(e.slug)));
    }),
  );
  await etape('selection', decision.decision === 'publier' ? 'succeeded' : 'failed', now(), { selection: e.slug, decision, sites_captures: captures });

  const refus = sites.filter((s) => s.resultat === 'refusee').length;
  const code: 0 | 1 = refus > 0 ? 1 : 0;
  await ecrire(() =>
    finishRun(db, runId, {
      status: code === 0 ? 'succeeded' : 'failed',
      finishedAt: now(),
      ...compteurs,
      errorKind: refus > 0 ? 'sites_refuses' : null,
      errorMessage: refus > 0 ? `${refus} site(s) refusé(s) : ${sites.filter((s) => s.resultat === 'refusee').map((s) => `${s.slug} (${s.motif})`).join(', ')}` : null,
    }),
  );
  return { runId, code, selection: e.slug, sites, decision, newsItemId };
}

// --- Lecture des captures stockées --------------------------------------------------------------------------------------

export interface CaptureSite {
  documentId: number;
  snapshotId: number;
  url: string;
  captureLe: string;
  contenu: string;
  format: string;
  hash: string;
  /** live | fixture : une capture de fixture n'est jamais présentée comme une collecte réelle. */
  mode: string | null;
}

export interface CapturesSelection {
  liste: CaptureSite | null;
  sites: { site: SiteSelection; page: CaptureSite | null; robots: CaptureSite | null; apercu: CaptureSite | null }[];
}

async function dernieres(client: Client, sourceId: string): Promise<Map<string, CaptureSite>> {
  const r = await client.execute({
    sql: `select d.id as document_id, d.external_id, d.url, c.id, c.captured_at, c.content, c.content_format, c.content_hash, r.mode
          from source_document d
          join document_snapshot c on c.document_id = d.id and c.seq = (select max(seq) from document_snapshot x where x.document_id = d.id)
          left join run r on r.id = c.run_id
          where d.source_id = ?`,
    args: [sourceId],
  });
  return new Map(
    r.rows.map((row) => [
      String(row.external_id),
      { documentId: Number(row.document_id), snapshotId: Number(row.id), url: String(row.url), captureLe: String(row.captured_at), contenu: String(row.content), format: String(row.content_format), hash: String(row.content_hash), mode: row.mode === null ? null : String(row.mode) },
    ]),
  );
}

/** Dernière capture de chaque document d'une sélection. Une page dont l'URL n'est plus celle de la liste n'est pas reprise. */
export async function capturesDeSelection(client: Client, e: EntreeSelection): Promise<CapturesSelection> {
  const liste = (await dernieres(client, sourceIdListe(e.slug))).get('liste') ?? null;
  const sites: CapturesSelection['sites'] = [];
  for (const s of e.sites) {
    const d = await dernieres(client, sourceIdSite(s.hote));
    const page = d.get('page-accueil') ?? null;
    const apercu = d.get('apercu') ?? null;
    sites.push({ site: s, page: page && page.url === s.url ? page : null, robots: d.get('robots') ?? null, apercu: apercu && apercu.url === s.url ? apercu : null });
  }
  return { liste, sites };
}

/** Contenu de page stocké, lu sans confiance : null si illisible. */
export function lirePage(c: CaptureSite | null): ContenuPage | null {
  if (!c) return null;
  try {
    const v = JSON.parse(c.contenu) as Partial<ContenuPage>;
    if (typeof v.url !== 'string' || typeof v.texte !== 'string') return null;
    return { url: v.url, titre: typeof v.titre === 'string' ? v.titre : null, description: typeof v.description === 'string' ? v.description : null, texte: v.texte, mots: Number(v.mots ?? 0), statut_http: Number(v.statut_http ?? 0), type_contenu: typeof v.type_contenu === 'string' ? v.type_contenu : null };
  } catch {
    return null;
  }
}

export const selectionParDefaut = (slug: string) => SELECTIONS.find((s) => s.slug === slug);
