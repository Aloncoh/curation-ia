// Capture des ressources de la liste (ADR 0011 §1) : métadonnées par l'API GitHub, fichiers bruts par
// raw.githubusercontent.com. Toujours par safeGet : HTTPS, adresses vérifiées, aucune redirection, délai et taille maximum.
// Aucun jeton, aucune clé lue. Le contenu collecté est une donnée non fiable, jamais une instruction.
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Client } from '@libsql/client';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { GITHUB_API_HEADERS, SourceFormatError, type CollectedDocument } from '../collect/github-releases.ts';
import { contentHash, normalizeText, normalizeUrl } from '../collect/normalize.ts';
import { httpsTransport, safeGet, SafeFetchError, type FetchPolicy, type Resolver, type Transport } from '../collect/safe-fetch.ts';
import { storeDocuments, type StoreCounts } from '../collect/store.ts';
import type { Database, Executor } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { documentSnapshots, newsItemDocuments, newsItems, runs, selectionDecisions, sourceDocuments, sources } from '../db/schema.ts';
import { finishRun, insertStep } from '../jobs/runs.ts';
import { toPlainText } from '../maquette/data.ts';
import { moinsDeTroisMots } from '../analysis/controles.ts';
import { documentPrincipal, dossierDeSkill, RESSOURCES, sourceIdDe, VERSION_LISTE, type EntreeRessource } from './liste.ts';

/** Version des consignes des découvertes automatiques (decouverte.ts la reprend). */
export const VERSION_DECOUVERTE = 'decouverte-1';

export const HOTES_RESSOURCES = ['api.github.com', 'raw.githubusercontent.com'] as const;
export const KIND_SOURCE = 'github-ressource';
export const DELAI_MS = 15_000;
export const TAILLE_MAX = 2 * 1024 * 1024;
/** Licence propre à un skill, cherchée dans son dossier quand le dépôt n'a pas de licence globale. */
const FICHIERS_LICENCE = ['LICENSE.txt', 'LICENSE', 'LICENSE.md'];

const NOM_DEPOT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCHE = /^[A-Za-z0-9_.\/-]+$/;

// --- Métadonnées du dépôt -------------------------------------------------------------------------------------------

const ReponseDepot = z.object({
  full_name: z.string().regex(NOM_DEPOT),
  html_url: z.url({ protocol: /^https$/ }),
  description: z.string().nullable(),
  created_at: z.string().nullable(),
  pushed_at: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  archived: z.boolean(),
  fork: z.boolean(),
  parent: z.object({ full_name: z.string().regex(NOM_DEPOT), html_url: z.url({ protocol: /^https$/ }) }).optional(),
  license: z.object({ spdx_id: z.string().nullable() }).nullable(),
  default_branch: z.string().regex(BRANCHE),
  topics: z.array(z.string()).optional(),
  homepage: z.string().nullable().optional(),
});

/** Sous-ensemble stable stocké dans la capture `depot` (JSON trié). */
export const MetadonneesDepot = z
  .object({
    archived: z.boolean(),
    created_at: z.string().nullable(),
    default_branch: z.string().regex(BRANCHE),
    description: z.string().nullable(),
    fork: z.boolean(),
    full_name: z.string().regex(NOM_DEPOT),
    homepage: z.string().nullable(),
    html_url: z.string(),
    license: z.object({ spdx_id: z.string().nullable() }).strict().nullable(),
    parent: z.object({ full_name: z.string(), html_url: z.string() }).strict().nullable(),
    pushed_at: z.string().nullable(),
    stargazers_count: z.number().int(),
    topics: z.array(z.string()),
  })
  .strict();
export type MetadonneesDepot = z.infer<typeof MetadonneesDepot>;

/** JSON aux clés triées : deux réponses identiques donnent la même empreinte, donc pas de nouvelle capture. */
export function jsonTrie(valeur: unknown): string {
  const trier = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(trier);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, trier((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(trier(valeur), null, 2);
}

/** Lit la réponse de `GET /repos/{o}/{r}` ; refuse un autre dépôt que celui demandé (casse ignorée) ou une URL incohérente. */
export function lireDepot(corps: string, demande: string): MetadonneesDepot {
  let json: unknown;
  try {
    json = JSON.parse(corps);
  } catch {
    throw new SourceFormatError('Réponse JSON invalide');
  }
  const r = ReponseDepot.safeParse(json);
  if (!r.success) throw new SourceFormatError(`Réponse inattendue de l'API GitHub : ${z.prettifyError(r.error)}`);
  const d = r.data;
  if (d.full_name.toLowerCase() !== demande.toLowerCase()) throw new SourceFormatError(`Dépôt inattendu : ${d.full_name} au lieu de ${demande}`);
  if (d.html_url !== `https://github.com/${d.full_name}`) throw new SourceFormatError(`URL du dépôt incohérente : ${d.html_url}`);
  return {
    archived: d.archived,
    created_at: d.created_at,
    default_branch: d.default_branch,
    description: d.description,
    fork: d.fork,
    full_name: d.full_name,
    homepage: d.homepage ?? null,
    html_url: d.html_url,
    license: d.license ? { spdx_id: d.license.spdx_id } : null,
    parent: d.parent ? { full_name: d.parent.full_name, html_url: d.parent.html_url } : null,
    pushed_at: d.pushed_at,
    stargazers_count: d.stargazers_count,
    topics: [...(d.topics ?? [])].sort(),
  };
}

/** Le dépôt n'a pas de licence globale identifiée (absente, ou « NOASSERTION » : fichier présent mais non reconnu). */
export const sansLicenceGlobale = (m: MetadonneesDepot): boolean => !m.license?.spdx_id || m.license.spdx_id === 'NOASSERTION';

const encoderChemin = (chemin: string) => chemin.split('/').map(encodeURIComponent).join('/');

export const urlApiDepot = (depot: string) => {
  if (!NOM_DEPOT.test(depot)) throw new Error(`Dépôt GitHub invalide : ${depot}`);
  return `https://api.github.com/repos/${depot}`;
};
export const urlBrute = (m: MetadonneesDepot, chemin: string) => `https://raw.githubusercontent.com/${m.full_name}/${encoderChemin(m.default_branch)}/${encoderChemin(chemin)}`;
export const urlApiDossier = (m: MetadonneesDepot, chemin: string) =>
  `https://api.github.com/repos/${m.full_name}/contents/${encoderChemin(chemin)}?ref=${encodeURIComponent(m.default_branch)}`;
export const urlDossier = (m: MetadonneesDepot, chemin: string) => `${m.html_url}/tree/${m.default_branch}/${chemin}`;

// --- Documents --------------------------------------------------------------------------------------------------------

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

export const documentDepot = (m: MetadonneesDepot): CollectedDocument =>
  document('depot', m.html_url, m.full_name, jsonTrie(m), 'json', { api_url: urlApiDepot(m.full_name) });

export function documentFichier(m: MetadonneesDepot, chemin: string, corps: string): CollectedDocument {
  const format = /\.(md|markdown)$/i.test(chemin) ? 'markdown' : 'text';
  return document(`fichier:${chemin}`, `${m.html_url}/blob/${m.default_branch}/${chemin}`, `${m.full_name} — ${chemin}`, normalizeText(corps), format, {
    raw_url: urlBrute(m, chemin),
    chemin,
  });
}

export interface EntreeDossier {
  name: string;
  type: string;
  html_url: string | null;
}

const ReponseDossier = z.array(z.object({ name: z.string().min(1), type: z.string().min(1), html_url: z.string().nullable() }));

/** Liste d'un dossier (`GET /repos/{o}/{r}/contents/<chemin>`) : noms, types et adresses seulement, chacune dans ce dossier. */
export function lireDossier(corps: string, m: MetadonneesDepot, chemin: string): EntreeDossier[] {
  let json: unknown;
  try {
    json = JSON.parse(corps);
  } catch {
    throw new SourceFormatError('Réponse JSON invalide');
  }
  const r = ReponseDossier.safeParse(json);
  if (!r.success) throw new SourceFormatError(`Ce chemin n'est pas un dossier ou la réponse est inattendue : ${chemin}`);
  const prefixe = `${m.html_url}/`;
  const attendu = new RegExp(`^(?:blob|tree)/${m.default_branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  const entrees = r.data.map((e) => ({ name: e.name, type: e.type, html_url: e.html_url }));
  for (const e of entrees) {
    if (e.html_url === null) continue;
    const reste = e.html_url.startsWith(prefixe) ? e.html_url.slice(prefixe.length) : null;
    if (reste === null || !attendu.test(reste) || !reste.replace(attendu, '').startsWith(`${chemin}/`)) throw new SourceFormatError(`Entrée hors du dossier ${chemin} : ${e.html_url}`);
  }
  return entrees.sort((a, b) => a.name.localeCompare(b.name));
}

/** `html_url` du dossier : construite à partir du dépôt canonique, et cohérente avec celles des entrées (contrôlées ci-dessus). */
export const documentDossier = (m: MetadonneesDepot, chemin: string, entrees: EntreeDossier[]): CollectedDocument =>
  document(`dossier:${chemin}`, urlDossier(m, chemin), `${m.full_name} — ${chemin}/`, jsonTrie({ chemin, html_url: urlDossier(m, chemin), entrees }), 'json', {
    api_url: urlApiDossier(m, chemin),
  });

// --- Lecture réseau -----------------------------------------------------------------------------------------------

export type TypeRequete = 'api' | 'raw';

export interface TraceRequete {
  url: string;
  type: TypeRequete;
  statut: number | null;
  octets: number;
  debut: string;
  fin: string;
  quota: { restant: number | null; reinitialisation: string | null } | null;
  /** Fichier absent (404) : tracé comme absent, ce n'est pas une erreur de la ressource. */
  absent: boolean;
  refus: { kind: string; message: string } | null;
}

/** Plafond d'API atteint : la commande s'arrête proprement, la relance reprend (rien n'est contourné). */
export class QuotaEpuise extends Error {
  readonly reinitialisation: string | null;

  constructor(reinitialisation: string | null) {
    super(`Plafond de requêtes GitHub atteint${reinitialisation ? `, réinitialisation à ${reinitialisation}` : ''}`);
    this.name = 'QuotaEpuise';
    this.reinitialisation = reinitialisation;
  }
}

export class FichierAbsent extends Error {}

export interface OptionsLecteur {
  userAgent: string;
  timeoutMs?: number;
  maxBytes?: number;
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
}

export interface Lecteur {
  lire(url: string, type: TypeRequete): Promise<string>;
  /** `GET /rate_limit` : ne compte pas dans le plafond (documentation GitHub). */
  verifierQuota(): Promise<void>;
  quota(): { restant: number | null; reinitialisation: string | null };
}

const entete = (headers: IncomingHttpHeaders | null, nom: string): string | undefined => {
  const v = headers?.[nom];
  return Array.isArray(v) ? v[0] : v;
};
const dateReinit = (epoch: string | undefined): string | null => (epoch && /^\d+$/.test(epoch) ? new Date(Number(epoch) * 1000).toISOString() : null);

export function creerLecteur(o: OptionsLecteur, tracer: (t: TraceRequete) => Promise<void>): Lecteur {
  const horloge = o.horloge ?? (() => new Date());
  const politique: FetchPolicy = { allowedHosts: HOTES_RESSOURCES, timeoutMs: o.timeoutMs ?? DELAI_MS, maxBytes: o.maxBytes ?? TAILLE_MAX };
  const base = o.transport ?? httpsTransport;
  let restant: number | null = null;
  let reinitialisation: string | null = null;

  async function requete(url: string, type: TypeRequete): Promise<{ statut: number; corps: string; headers: IncomingHttpHeaders | null }> {
    const debut = horloge().toISOString();
    if (type === 'api' && restant === 0 && !url.endsWith('/rate_limit')) {
      await tracer({ url, type, statut: null, octets: 0, debut, fin: debut, quota: { restant, reinitialisation }, absent: false, refus: { kind: 'quota_epuise', message: 'Requête non envoyée : plafond atteint' } });
      throw new QuotaEpuise(reinitialisation);
    }
    let derniers: IncomingHttpHeaders | null = null;
    const transport: Transport = async (req) => {
      const reponse = await base(req);
      derniers = reponse.headers;
      return reponse;
    };
    const enTetes: Record<string, string> = type === 'api' ? { ...GITHUB_API_HEADERS, 'user-agent': o.userAgent } : { 'user-agent': o.userAgent };
    const noterQuota = () => {
      if (type !== 'api') return null;
      const r = entete(derniers, 'x-ratelimit-remaining');
      if (r !== undefined && /^\d+$/.test(r)) restant = Number(r);
      const reinit = dateReinit(entete(derniers, 'x-ratelimit-reset'));
      if (reinit) reinitialisation = reinit;
      return { restant, reinitialisation };
    };
    try {
      const reponse = await safeGet(url, politique, enTetes, { transport, ...(o.resolve ? { resolve: o.resolve } : {}) });
      const quota = noterQuota();
      await tracer({ url, type, statut: reponse.status, octets: reponse.body.length, debut, fin: horloge().toISOString(), quota, absent: false, refus: null });
      return { statut: reponse.status, corps: reponse.body.toString('utf8'), headers: derniers };
    } catch (erreur) {
      const quota = noterQuota();
      const fin = horloge().toISOString();
      const statut = erreur instanceof SafeFetchError ? (erreur.status ?? null) : null;
      const plafond = statut === 429 || (statut === 403 && entete(derniers, 'x-ratelimit-remaining') === '0');
      if (plafond) {
        restant = 0;
        await tracer({ url, type, statut, octets: 0, debut, fin, quota: { restant, reinitialisation }, absent: false, refus: { kind: 'quota_epuise', message: `HTTP ${statut}` } });
        throw new QuotaEpuise(reinitialisation);
      }
      if (statut === 404) {
        await tracer({ url, type, statut, octets: 0, debut, fin, quota, absent: true, refus: null });
        throw new FichierAbsent(url);
      }
      const kind = erreur instanceof SafeFetchError ? erreur.kind : 'internal';
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      await tracer({ url, type, statut, octets: 0, debut, fin, quota, absent: false, refus: { kind, message } });
      throw erreur;
    }
  }

  return {
    lire: async (url, type) => (await requete(url, type)).corps,
    async verifierQuota() {
      const { corps } = await requete('https://api.github.com/rate_limit', 'api');
      const r = z.object({ resources: z.object({ core: z.object({ remaining: z.number().int(), reset: z.number().int() }) }) }).safeParse(JSON.parse(corps));
      if (r.success) {
        restant = r.data.resources.core.remaining;
        reinitialisation = new Date(r.data.resources.core.reset * 1000).toISOString();
      }
    },
    quota: () => ({ restant, reinitialisation }),
  };
}

// --- Sources -------------------------------------------------------------------------------------------------------

/** Un enregistrement `source` par dépôt. Le statut reste `never` jusqu'à la première capture réussie. */
export async function synchroniserSourcesRessources(database: Database, entrees: readonly EntreeRessource[], now: string): Promise<void> {
  const parDepot = new Map<string, string[]>();
  for (const e of entrees) parDepot.set(e.depot, [...(parDepot.get(e.depot) ?? []), e.slug]);
  const decouvertes = new Map(entrees.filter((e) => e.decouverteAuto).map((e) => [e.depot, { slug: e.slug, nom: e.nom, decouverteVia: e.decouverteVia ?? null, compte: e.compte }]));
  await withBusyRetry(database.client, async () => {
    for (const [depot, slugs] of parDepot) {
      const valeurs = {
        kind: KIND_SOURCE,
        name: `${depot} — dépôt GitHub (ressources pour construire)`,
        // Une découverte automatique garde son entrée (nom, provenance) : la rédaction la reconstruit sans la liste du code.
        config: { depot, ressources: slugs, ...(decouvertes.get(depot) ? { decouverte: decouvertes.get(depot) } : {}) },
        allowedHosts: [...HOTES_RESSOURCES],
        fetchIntervalMinutes: null,
      };
      await database.db
        .insert(sources)
        .values({ id: sourceIdDe(depot), ...valeurs, active: true, createdAt: now })
        .onConflictDoUpdate({ target: sources.id, set: valeurs });
    }
  });
}

// --- Capture ---------------------------------------------------------------------------------------------------------

export type ResultatRessource = 'capturee' | 'recente' | 'echec' | 'non_traitee';

export interface BilanRessource {
  slug: string;
  depot: string;
  resultat: ResultatRessource;
  decision: { decision: 'publier' | 'ecarter' | 'approfondir'; motif: string } | null;
  documents: { document: string; issue: 'new' | 'unchanged' | 'changed' | 'absent' }[];
  erreur: string | null;
}

export interface BilanCapture {
  runId: string;
  code: 0 | 1 | 2;
  quota: { restant: number | null; reinitialisation: string | null };
  quotaEpuise: boolean;
  ressources: BilanRessource[];
  compteurs: StoreCounts & { newNewsItems: number };
}

export interface OptionsCapture {
  database: Database;
  userAgent: string;
  workerId: string;
  entrees?: readonly EntreeRessource[];
  /** Une capture plus récente que ce nombre d'heures est sautée, sauf avec `forcer`. */
  depuisHeures?: number;
  forcer?: boolean;
  mode?: 'live' | 'fixture';
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
}

/** Ressource capturée récemment : son dépôt et chacun de ses fichiers ont été vus depuis `seuil`. */
async function estRecente(client: Client, e: EntreeRessource, seuil: string): Promise<boolean> {
  const attendus = ['depot', ...e.chemins.map((c) => `fichier:${c}`)];
  const r = await client.execute({
    sql: `select d.external_id, d.last_seen_at,
            exists (select 1 from news_item_document nd where nd.document_id = d.id and nd.role = 'primary') as principal
          from source_document d where d.source_id = ? and d.external_id in (${attendus.map(() => '?').join(', ')})`,
    args: [sourceIdDe(e.depot), ...attendus],
  });
  const vus = new Map(r.rows.map((row) => [String(row.external_id), row]));
  const principal = vus.get(documentPrincipal(e));
  return attendus.every((id) => vus.has(id) && String(vus.get(id)!.last_seen_at) >= seuil) && Number(principal?.principal ?? 0) === 1;
}

/** Décision tracée par le code (liste fournie par l'utilisateur) ; une décision identique n'est pas réécrite. */
async function tracerDecision(
  tx: Executor,
  newsItemId: number,
  d: { decision: 'publier' | 'ecarter' | 'approfondir'; motif: string },
  snapshotId: number | null,
  now: string,
  version: string = VERSION_LISTE,
): Promise<void> {
  const actives = await tx
    .select({ id: selectionDecisions.id, decision: selectionDecisions.decision, motif: selectionDecisions.motif, snapshotId: selectionDecisions.snapshotId })
    .from(selectionDecisions)
    .where(and(eq(selectionDecisions.newsItemId, newsItemId), eq(selectionDecisions.juge, 'code'), eq(selectionDecisions.consignesVersion, version), isNull(selectionDecisions.remplaceeLe)));
  if (actives.some((a) => a.decision === d.decision && a.motif === d.motif && a.snapshotId === snapshotId)) return;
  for (const a of actives) await tx.update(selectionDecisions).set({ remplaceeLe: now }).where(eq(selectionDecisions.id, a.id));
  await tx.insert(selectionDecisions).values({
    newsItemId,
    origine: 'regles',
    juge: 'code',
    consignesVersion: version,
    decision: d.decision,
    criteres: null,
    motif: d.motif,
    passages: [],
    snapshotId,
    createdAt: now,
  });
}

/** Contenu citable d'une capture de fichier : texte brut, sans mise en forme. */
export const texteDeFichier = (contenu: string, format: string): string => (format === 'text' ? contenu.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim() : toPlainText(contenu, format));

export async function executerCapture(o: OptionsCapture): Promise<BilanCapture> {
  const { client, db } = o.database;
  const horloge = o.horloge ?? (() => new Date());
  const now = () => horloge().toISOString();
  const entrees = o.entrees ?? RESSOURCES;
  const runId = randomUUID();
  const ecrire = <T>(f: () => Promise<T>) => withBusyRetry(client, f);

  await synchroniserSourcesRessources(o.database, entrees, now());
  await ecrire(() =>
    db.insert(runs).values({ id: runId, kind: 'ressources_capture', jobId: null, sourceId: null, mode: o.mode ?? 'live', workerId: o.workerId, status: 'running', startedAt: now() }),
  );
  let seq = 0;
  const etape = (name: string, status: 'succeeded' | 'failed', debut: string, fin: string, detail: Record<string, unknown>) =>
    ecrire(() => insertStep(db, { runId, seq: ++seq, name, status, startedAt: debut, finishedAt: fin, detail }));
  const lecteur = creerLecteur({ userAgent: o.userAgent, transport: o.transport, resolve: o.resolve, horloge }, (t) =>
    etape('requete', t.refus ? 'failed' : 'succeeded', t.debut, t.fin, { url: t.url, type: t.type, statut: t.statut, octets: t.octets, quota: t.quota, absent: t.absent, refus: t.refus }),
  );

  const compteurs = { newDocuments: 0, unchangedDocuments: 0, changedDocuments: 0, newNewsItems: 0 };
  const bilans: BilanRessource[] = [];
  let quotaEpuise = false;
  // Une requête par dépôt et par fichier au plus dans une exécution : plusieurs ressources partagent un dépôt.
  const cache = new Map<string, Promise<string | null>>();
  const lireUneFois = (url: string, type: TypeRequete): Promise<string | null> => {
    if (!cache.has(url)) cache.set(url, lecteur.lire(url, type).catch((e: unknown) => (e instanceof FichierAbsent ? null : Promise.reject(e))));
    return cache.get(url)!;
  };

  try {
    await lecteur.verifierQuota();
  } catch (e) {
    if (e instanceof QuotaEpuise) quotaEpuise = true;
    // Un échec de cette lecture n'empêche rien : le plafond sera lu sur les réponses suivantes.
  }

  const seuil = new Date(horloge().getTime() - (o.depuisHeures ?? 6) * 3_600_000).toISOString();
  for (const e of entrees) {
    const bilan: BilanRessource = { slug: e.slug, depot: e.depot, resultat: 'non_traitee', decision: null, documents: [], erreur: null };
    bilans.push(bilan);
    if (quotaEpuise) continue;
    if (!o.forcer && (await estRecente(client, e, seuil))) {
      bilan.resultat = 'recente';
      continue;
    }
    const debut = now();
    try {
      const corpsDepot = await lireUneFois(urlApiDepot(e.depot), 'api');
      if (corpsDepot === null) {
        bilan.resultat = 'echec';
        bilan.erreur = 'dépôt introuvable (404)';
        bilan.decision = { decision: 'ecarter', motif: 'depot_introuvable' };
        await ecrire(() =>
          db.transaction(async (tx) => {
            const [principal] = await tx
              .select({ newsItemId: newsItemDocuments.newsItemId })
              .from(newsItemDocuments)
              .innerJoin(sourceDocuments, eq(sourceDocuments.id, newsItemDocuments.documentId))
              .where(and(eq(sourceDocuments.sourceId, sourceIdDe(e.depot)), eq(sourceDocuments.externalId, documentPrincipal(e)), eq(newsItemDocuments.role, 'primary')));
            if (principal) await tracerDecision(tx, principal.newsItemId, bilan.decision!, null, now());
            await tx.update(sources).set({ status: 'error', lastErrorAt: now(), lastError: bilan.erreur }).where(eq(sources.id, sourceIdDe(e.depot)));
          }),
        );
        await etape('ressource', 'failed', debut, now(), { slug: e.slug, erreur: bilan.erreur });
        continue;
      }
      const meta = lireDepot(corpsDepot, e.depot);
      const documents: CollectedDocument[] = [documentDepot(meta)];
      const absents: string[] = [];
      for (const chemin of e.chemins) {
        const corps = await lireUneFois(urlBrute(meta, chemin), 'raw');
        if (corps === null) absents.push(`fichier:${chemin}`);
        else documents.push(documentFichier(meta, chemin, corps));
        const dossier = dossierDeSkill(chemin);
        if (!dossier) continue;
        const corpsDossier = await lireUneFois(urlApiDossier(meta, dossier), 'api');
        if (corpsDossier === null) {
          absents.push(`dossier:${dossier}`);
          continue;
        }
        const liste = lireDossier(corpsDossier, meta, dossier);
        documents.push(documentDossier(meta, dossier, liste));
        if (!sansLicenceGlobale(meta)) continue;
        const licence = FICHIERS_LICENCE.map((nom) => liste.find((x) => x.type === 'file' && x.name === nom)).find(Boolean);
        if (!licence) continue;
        const cheminLicence = `${dossier}/${licence.name}`;
        const corpsLicence = await lireUneFois(urlBrute(meta, cheminLicence), 'raw');
        if (corpsLicence === null) absents.push(`fichier:${cheminLicence}`);
        else documents.push(documentFichier(meta, cheminLicence, corpsLicence));
      }
      // Un même fichier peut servir deux chemins d'une ressource : une seule capture.
      const uniques = [...new Map(documents.map((d) => [d.externalId, d])).values()];

      await ecrire(() =>
        db.transaction(async (tx) => {
          const capturee = now();
          const { counts, stored } = await storeDocuments(tx, sourceIdDe(e.depot), uniques, capturee, runId);
          compteurs.newDocuments += counts.newDocuments;
          compteurs.unchangedDocuments += counts.unchangedDocuments;
          compteurs.changedDocuments += counts.changedDocuments;
          bilan.documents = [...stored.map((s) => ({ document: s.doc.externalId, issue: s.outcome })), ...absents.map((document) => ({ document, issue: 'absent' as const }))];
          const idDe = new Map(stored.map((s) => [s.doc.externalId, s.documentId]));
          const principalId = idDe.get(documentPrincipal(e));

          // Actualité « découverte » : le document principal la désigne ; aucune table de ressources.
          let newsItemId: number | undefined;
          if (principalId !== undefined) {
            const [lien] = await tx
              .select({ newsItemId: newsItemDocuments.newsItemId })
              .from(newsItemDocuments)
              .where(and(eq(newsItemDocuments.documentId, principalId), eq(newsItemDocuments.role, 'primary')));
            newsItemId = lien?.newsItemId;
            if (newsItemId === undefined) {
              const [cree] = await tx
                .insert(newsItems)
                .values({ kind: 'decouverte', title: e.nom, announcedAt: null, firstSeenAt: capturee, status: 'collected', createdByRunId: runId })
                .returning({ id: newsItems.id });
              newsItemId = cree!.id;
              compteurs.newNewsItems++;
              await tx.insert(newsItemDocuments).values({ newsItemId, documentId: principalId, role: 'primary' });
            } else {
              await tx.update(newsItems).set({ title: e.nom }).where(eq(newsItems.id, newsItemId));
            }
            for (const documentId of idDe.values()) {
              if (documentId === principalId) continue;
              await tx.insert(newsItemDocuments).values({ newsItemId, documentId, role: 'supporting' }).onConflictDoNothing();
            }
          }

          // Décision du code : les étoiles n'y entrent jamais.
          const principal = stored.find((s) => s.documentId === principalId);
          let snapshotId: number | null = null;
          if (principalId !== undefined) {
            const [derniere] = await tx
              .select({ id: documentSnapshots.id })
              .from(documentSnapshots)
              .where(eq(documentSnapshots.documentId, principalId))
              .orderBy(desc(documentSnapshots.seq))
              .limit(1);
            snapshotId = derniere?.id ?? null;
          }
          const decision = meta.archived
            ? { decision: 'ecarter' as const, motif: 'depot_archive' }
            : !principal
              ? { decision: 'approfondir' as const, motif: 'chemin_principal_absent' }
              : moinsDeTroisMots(texteDeFichier(principal.doc.content, principal.doc.contentFormat))
                ? { decision: 'approfondir' as const, motif: 'capture_trop_courte' }
                : e.decouverteAuto
                  ? { decision: 'approfondir' as const, motif: 'grille_d1_a_faire' }
                  : { decision: 'publier' as const, motif: 'liste_utilisateur' };
          bilan.decision = decision;
          if (newsItemId !== undefined) await tracerDecision(tx, newsItemId, decision, snapshotId, capturee, e.decouverteAuto ? VERSION_DECOUVERTE : VERSION_LISTE);
          if (newsItemId === undefined) {
            bilan.resultat = 'echec';
            bilan.erreur = `chemin principal absent (${documentPrincipal(e)}) : aucune actualité créée`;
          } else bilan.resultat = 'capturee';
          await tx
            .update(sources)
            .set(bilan.resultat === 'capturee' ? { status: 'ok', lastSuccessAt: capturee } : { status: 'error', lastErrorAt: capturee, lastError: bilan.erreur })
            .where(eq(sources.id, sourceIdDe(e.depot)));
        }),
      );
      await etape('ressource', bilan.resultat === 'capturee' ? 'succeeded' : 'failed', debut, now(), { slug: e.slug, decision: bilan.decision, documents: bilan.documents, erreur: bilan.erreur });
    } catch (erreur) {
      if (erreur instanceof QuotaEpuise) {
        quotaEpuise = true;
        bilan.resultat = 'non_traitee';
        bilan.erreur = erreur.message;
        continue;
      }
      bilan.resultat = 'echec';
      bilan.erreur = erreur instanceof Error ? erreur.message : String(erreur);
      await ecrire(() => db.update(sources).set({ status: 'error', lastErrorAt: now(), lastError: bilan.erreur }).where(eq(sources.id, sourceIdDe(e.depot))));
      await etape('ressource', 'failed', debut, now(), { slug: e.slug, erreur: bilan.erreur });
    }
  }

  const quota = lecteur.quota();
  const echecs = bilans.filter((b) => b.resultat === 'echec').length;
  const code: 0 | 1 | 2 = quotaEpuise ? 2 : echecs > 0 ? 1 : 0;
  await ecrire(() =>
    finishRun(db, runId, {
      status: code === 0 ? 'succeeded' : 'failed',
      finishedAt: now(),
      newDocuments: compteurs.newDocuments,
      unchangedDocuments: compteurs.unchangedDocuments,
      changedDocuments: compteurs.changedDocuments,
      newNewsItems: compteurs.newNewsItems,
      errorKind: quotaEpuise ? 'quota_epuise' : echecs > 0 ? 'ressources_en_echec' : null,
      errorMessage: quotaEpuise ? new QuotaEpuise(quota.reinitialisation).message : echecs > 0 ? `${echecs} ressource(s) en échec` : null,
    }),
  );
  return { runId, code, quota, quotaEpuise, ressources: bilans, compteurs };
}

// --- Lecture des captures stockées ------------------------------------------------------------------------------------

export interface CaptureStockee {
  document: string;
  url: string;
  snapshotId: number;
  captureLe: string;
  contenu: string;
  format: string;
  hash: string;
  /** live | fixture : une capture de fixture n'est jamais présentée comme une collecte réelle. */
  mode: string | null;
}

/**
 * Dernière capture de chaque document de la ressource, dans l'ordre de la liste : le dépôt, puis chaque chemin suivi de
 * son dossier et de sa licence locale. Les documents d'autres ressources du même dépôt ne sont pas repris.
 */
export async function capturesDeRessource(client: Client, e: EntreeRessource): Promise<CaptureStockee[]> {
  const r = await client.execute({
    sql: `select d.external_id, d.url, c.id, c.captured_at, c.content, c.content_format, c.content_hash, r.mode
          from source_document d
          join document_snapshot c on c.document_id = d.id and c.seq = (select max(seq) from document_snapshot x where x.document_id = d.id)
          left join run r on r.id = c.run_id
          where d.source_id = ?`,
    args: [sourceIdDe(e.depot)],
  });
  const rang = new Map<string, number>([['depot', 0]]);
  e.chemins.forEach((chemin, i) => {
    rang.set(`fichier:${chemin}`, 1 + i * 10);
    const dossier = dossierDeSkill(chemin);
    if (!dossier) return;
    rang.set(`dossier:${dossier}`, 2 + i * 10);
    FICHIERS_LICENCE.forEach((nom, j) => rang.set(`fichier:${dossier}/${nom}`, 3 + i * 10 + j));
  });
  return r.rows
    .filter((row) => rang.has(String(row.external_id)))
    .map((row) => ({
      document: String(row.external_id),
      url: String(row.url),
      snapshotId: Number(row.id),
      captureLe: String(row.captured_at),
      contenu: String(row.content),
      format: String(row.content_format),
      hash: String(row.content_hash),
      mode: row.mode === null ? null : String(row.mode),
    }))
    .sort((a, b) => rang.get(a.document)! - rang.get(b.document)!);
}
