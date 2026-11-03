// Import d'une sélection (complément de l'ADR 0011, 2026-11-02) : contrôles → visuel → liens vérifiés → mots-clés →
// planification → indexation, dans une transaction. Une sélection compte pour UNE publication dans le plafond quotidien
// partagé et suit la planification des ressources. Aucun appel au modèle : la sélection est rédigée par Claude Code
// pendant le développement, et cela s'affiche. Un brouillon qui ne passe pas les contrôles n'est jamais forcé.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Client, Transaction } from '@libsql/client';
import { MENTION_ILLUSTRATION, NIVEAU_PREUVE_V1, synchroniserComptes } from '../../analysis/publication.ts';
import { safeGet, SafeFetchError, type FetchPolicy, type Resolver, type Transport } from '../../collect/safe-fetch.ts';
import { lireReglageEntier } from '../../control/settings.ts';
import type { Database } from '../../db/client.ts';
import { withBusyRetry } from '../../db/retry.ts';
import type { ResultatRendu } from '../../media/rendu.ts';
import { desindexer, indexer } from '../../recherche/index.ts';
import { prioriteEditoriale } from '../../selection/consignes.ts';
import { jsonTrie } from '../capture.ts';
import { ORIGINE_DEVELOPPEMENT, MODELE_IMPORT, type ControleStocke, type BilanFichier } from '../chaine.ts';
import { FRAICHEUR_CAPTURE_HEURES } from '../liens.ts';
import { enregistrerMotsCles } from '../mots-cles.ts';
import { ecrirePlacement, jourParis, lireReglagesPlanning, occupationParJour, ordreDe, placer, prioritaire, rangDe, renumeroter, retirerDuPlanning, type APlacer, type Placement, type ReglagesPlanning } from '../planification.ts';
import { MENTION_IA } from '../schemas.ts';
import type { Rendeur } from '../visuel.ts';
import { MOTIF_DROITS, DOSSIER_SELECTIONS } from './apercus.ts';
import { capturesDeSelection, DELAI_PAGE_MS, TAILLE_MAX_PAGE, type CaptureSite, type CapturesSelection } from './capture.ts';
import { controlerSelection } from './controles.ts';
import { SELECTIONS, sourceIdListe, trouverSelection, type EntreeSelection, type SiteSelection } from './liste.ts';
import { BrouillonSelection, CONSIGNES_SELECTION, ContenuSelection, FORMAT_SELECTION, type LienVerifie } from './schemas.ts';
import { apercusDe, composerMontageSelection, motsClesSelection, type ApercuRetenu } from './visuel.ts';

export const PROMPT_SELECTION = `selection-${CONSIGNES_SELECTION}`;
export const RAISON_IMPORT_SELECTION = 'import sélection, aucun appel au modèle';
/** Motifs posés par la chaîne, pas par `verifier` : un nouvel import les recontrôle. */
export const CODES_CHAINE_SELECTION = ['visuel_absent', 'lien_non_verifie'] as const;

/** Le fichier JSON est-il une sélection ? (`"format": "selection"`) ; sinon c'est un brouillon de ressource. */
export function estSelection(fichier: string): boolean {
  try {
    const v = JSON.parse(readFileSync(fichier, 'utf8')) as { format?: unknown };
    return v !== null && typeof v === 'object' && v.format === FORMAT_SELECTION;
  } catch {
    return false;
  }
}

export interface OptionsImportSelection {
  database: Database;
  userAgent: string;
  fichiers: string[];
  selections?: readonly EntreeSelection[];
  dossierVisuels?: string;
  rendre?: Rendeur;
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
}

// --- Liens ------------------------------------------------------------------------------------------------------------

/**
 * Lien d'une ressource citée : l'URL canonique de la liste, sur l'hôte attendu. Une capture réelle (`live`) de cette
 * URL exacte, réussie sans redirection, de moins de 24 heures, tient lieu de vérification ; sinon une requête sûre
 * (safeGet, hôte seul autorisé, aucune redirection suivie) doit répondre 200.
 */
export async function verifierLienSite(url: string, site: SiteSelection, page: CaptureSite | null, o: { userAgent: string; maintenant: Date; transport?: Transport; resolve?: Resolver }): Promise<LienVerifie> {
  const base = { url, hote: site.hote, statut_http: null, snapshot_id: null, verifie_le: o.maintenant.toISOString() };
  if (url !== site.url) return { ...base, resultat: 'echec', motif: 'url_non_canonique' };
  if (page && page.mode === 'live' && page.url === url) {
    const age = o.maintenant.getTime() - Date.parse(page.captureLe);
    if (age >= 0 && age <= FRAICHEUR_CAPTURE_HEURES * 3_600_000) return { ...base, resultat: 'verifie', motif: 'capture_recente', statut_http: 200, snapshot_id: page.snapshotId, verifie_le: page.captureLe };
  }
  const politique: FetchPolicy = { allowedHosts: [site.hote], timeoutMs: DELAI_PAGE_MS, maxBytes: TAILLE_MAX_PAGE };
  try {
    const r = await safeGet(url, politique, { 'user-agent': o.userAgent, accept: 'text/html,application/xhtml+xml' }, { ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) });
    if (r.status !== 200) return { ...base, resultat: 'echec', motif: 'reponse_inattendue', statut_http: r.status };
    return { ...base, resultat: 'verifie', motif: 'reponse_directe', statut_http: 200 };
  } catch (erreur) {
    const kind = erreur instanceof SafeFetchError ? erreur.kind : 'network';
    const statut = erreur instanceof SafeFetchError ? (erreur.status ?? null) : null;
    const motif = kind === 'redirect' ? 'redirection' : kind === 'forbidden_address' ? 'adresse_interdite' : kind === 'timeout' ? 'delai_depasse' : kind === 'too_large' ? 'trop_volumineux' : kind === 'disallowed_url' ? 'url_refusee' : statut !== null ? `http_${statut}` : 'reseau';
    return { ...base, resultat: 'echec', motif, statut_http: statut };
  }
}

/** Liens encore valides : tous vérifiés depuis moins de `validiteJours` (réglage `ressources.validite_lien_jours`). */
export const liensValides = (liens: LienVerifie[] | undefined, maintenant: Date, validiteJours: number): boolean =>
  Array.isArray(liens) && liens.length > 0 && liens.every((l) => l.resultat === 'verifie' && maintenant.getTime() - Date.parse(l.verifie_le) >= 0 && maintenant.getTime() - Date.parse(l.verifie_le) < validiteJours * 86_400_000);

// --- Import -----------------------------------------------------------------------------------------------------------

const stable = (v: unknown) => jsonTrie(v);
const sansLiens = (c: unknown) => {
  if (!c || typeof c !== 'object') return c;
  const { liens: _liens, ...reste } = c as Record<string, unknown>;
  return reste;
};
const sansChaine = (l: ControleStocke[]) => l.filter((c) => !(CODES_CHAINE_SELECTION as readonly string[]).includes(c.code));

/** Motif du dernier refus tracé pour un site (étapes `robots` et `page` des captures de sélection). */
async function motifDuSite(client: Client, site: SiteSelection): Promise<string> {
  const r = await client.execute({
    sql: `select s.name, s.status, s.detail from run_step s join run r on r.id = s.run_id
          where r.kind = 'selection_capture' and s.name in ('robots', 'page') and json_extract(s.detail, '$.site') = ? and json_extract(s.detail, '$.url') like ?
          order by s.started_at desc, s.id desc limit 1`,
    args: [site.slug, `https://${site.hote}/%`],
  });
  const row = r.rows[0];
  if (!row) return 'jamais_capture';
  const d = JSON.parse(String(row.detail)) as Record<string, unknown>;
  if (String(row.status) === 'succeeded' && row.name === 'page') return 'non_retenu';
  if (row.name === 'robots') return `robots: ${String(d.verdict)}${d.regle ? ` (${(d.regle as { type: string; motif: string }).type}: ${(d.regle as { motif: string }).motif})` : ''}`;
  const location = typeof d.location === 'string' ? ` vers ${d.location}` : '';
  return `${String(d.refus ?? 'refus')}${d.statut ? ` (HTTP ${String(d.statut)}${location})` : ''}`;
}

interface Existant {
  postId: number;
  statut: string;
  revisionId: number | null;
  revisionSeq: number;
  contenu: Record<string, unknown> | null;
  checks: ControleStocke[];
  draftStatut: string | null;
  planifiee: boolean;
  media: string | null;
}

async function lireExistant(client: Client, newsItemId: number): Promise<{ existant: Existant | null; draft: { statut: string; checks: ControleStocke[] } | null }> {
  const d = await client.execute({ sql: 'select status, checks from post_draft where news_item_id = ?', args: [newsItemId] });
  const draft = d.rows[0] ? { statut: String(d.rows[0].status), checks: d.rows[0].checks === null ? [] : (JSON.parse(String(d.rows[0].checks)) as ControleStocke[]) } : null;
  const p = await client.execute({ sql: 'select id, status from post where news_item_id = ?', args: [newsItemId] });
  if (!p.rows[0]) return { existant: null, draft };
  const postId = Number(p.rows[0].id);
  const rv = await client.execute({ sql: 'select id, seq, content from post_revision where post_id = ? order by seq desc limit 1', args: [postId] });
  const pp = await client.execute({ sql: 'select 1 from publication_planifiee where post_id = ?', args: [postId] });
  const media = await client.execute({ sql: 'select content from media_asset where post_id = ? order by id desc limit 1', args: [postId] });
  const fichier = media.rows[0]?.content ? (JSON.parse(String(media.rows[0].content)) as { fichier?: unknown }).fichier : null;
  return {
    draft,
    existant: {
      postId,
      statut: String(p.rows[0].status),
      revisionId: rv.rows[0] ? Number(rv.rows[0].id) : null,
      revisionSeq: rv.rows[0] ? Number(rv.rows[0].seq) : 0,
      contenu: rv.rows[0] ? (JSON.parse(String(rv.rows[0].content)) as Record<string, unknown>) : null,
      checks: draft?.checks ?? [],
      draftStatut: draft?.statut ?? null,
      planifiee: pp.rows.length > 0,
      media: typeof fichier === 'string' ? fichier : null,
    },
  };
}

async function transaction<T>(client: Client, f: (tx: Transaction) => Promise<T>): Promise<T> {
  return withBusyRetry(client, async () => {
    const tx = await client.transaction('write');
    try {
      const r = await f(tx);
      await tx.commit();
      return r;
    } finally {
      tx.close();
    }
  });
}

/** Documents cités par la révision : la liste, et pour chaque ressource sa page, son robots.txt et son aperçu. */
function documentsCites(b: BrouillonSelection | null, captures: CapturesSelection): (CaptureSite & { document: string })[] {
  const cites: (CaptureSite & { document: string })[] = captures.liste ? [{ ...captures.liste, document: 'liste' }] : [];
  for (const r of b?.ressources ?? []) {
    const x = captures.sites.find((s) => s.site.slug === r.site);
    for (const [nom, c] of [['page-accueil', x?.page], ['robots', x?.robots], ['apercu', x?.apercu]] as const) if (c) cites.push({ ...c, document: `${r.site}:${nom}` });
  }
  return cites;
}

interface Ecriture {
  newsItemId: number;
  entree: EntreeSelection;
  contenu: Record<string, unknown> | null;
  brouillon: BrouillonSelection | null;
  existant: Existant | null;
  statut: 'en_attente' | 'a_verifier' | 'rejete';
  motifs: ControleStocke[];
  cites: CaptureSite[];
  /** `absents` : ressources citées sans aperçu (navigateur refusé…), hors de la grille. */
  visuel: { fichier: string; octets: number; alt: string; apercus: ApercuRetenu[]; absents: string[] } | null;
}

async function ecrire(tx: Transaction, e: Ecriture, o: { runId: string; now: string; aujourdhui: string; reglages: ReglagesPlanning; snapshotListe: number }): Promise<{ postId: number | null; placement: Placement | null }> {
  const statutBrouillon = e.statut === 'en_attente' ? 'controle_automatique' : e.statut;
  const rejet = e.statut === 'rejete' ? e.motifs.filter((m) => m.niveau === 'bloquant').map((m) => m.code).join(', ') : null;
  const draft = await tx.execute({
    sql: `insert into post_draft (news_item_id, run_id, status, account, rejection_reason, information_type, snapshot_id, model, prompt_version, content, checks, origine, created_at)
          values (?, ?, ?, ?, ?, 'selection', ?, ?, ?, ?, ?, ?, ?)
          on conflict(news_item_id) do update set run_id = excluded.run_id, status = excluded.status, account = excluded.account,
            rejection_reason = excluded.rejection_reason, information_type = excluded.information_type, snapshot_id = excluded.snapshot_id,
            model = excluded.model, prompt_version = excluded.prompt_version, content = excluded.content, checks = excluded.checks,
            origine = excluded.origine, created_at = excluded.created_at
          returning id`,
    args: [e.newsItemId, o.runId, statutBrouillon, e.entree.compte, rejet, o.snapshotListe, MODELE_IMPORT, PROMPT_SELECTION, e.contenu === null ? null : JSON.stringify(e.contenu), JSON.stringify(e.motifs), ORIGINE_DEVELOPPEMENT, o.now],
  });
  const draftId = Number(draft.rows[0]!.id);
  if (e.contenu === null) {
    const ancien = e.existant?.postId ?? null;
    if (ancien !== null) {
      await tx.execute({ sql: `update post set status = 'rejete' where id = ?`, args: [ancien] });
      await retirerDuPlanning(tx, ancien);
      await desindexer(tx, ancien);
    }
    return { postId: ancien, placement: null };
  }
  let postId = e.existant?.postId ?? null;
  if (postId === null) {
    const p = await tx.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at) values (?, ?, ?, ?, ?) returning id`, args: [e.entree.compte, e.newsItemId, NIVEAU_PREUVE_V1, e.statut, o.now] });
    postId = Number(p.rows[0]!.id);
  } else await tx.execute({ sql: 'update post set status = ?, account_id = ? where id = ?', args: [e.statut, e.entree.compte, postId] });

  let revisionId = e.existant?.revisionId ?? null;
  if (revisionId === null || stable(e.existant?.contenu) !== stable(e.contenu)) {
    const rv = await tx.execute({ sql: 'insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, ?, ?, ?, ?) returning id', args: [postId, (e.existant?.revisionSeq ?? 0) + 1, draftId, JSON.stringify(e.contenu), o.now] });
    revisionId = Number(rv.rows[0]!.id);
    for (const c of e.cites) {
      await tx.execute({ sql: 'insert into post_source (revision_id, document_id, snapshot_id) values (?, ?, ?) on conflict do nothing', args: [revisionId, c.documentId, c.snapshotId] });
      await tx.execute({ sql: `insert into news_item_document (news_item_id, document_id, role) values (?, ?, 'supporting') on conflict do nothing`, args: [e.newsItemId, c.documentId] });
    }
  }
  const retirer = async () => {
    await retirerDuPlanning(tx, postId!);
    await desindexer(tx, postId!);
  };
  if (e.statut === 'rejete') {
    await retirer();
    return { postId, placement: null };
  }
  if (e.visuel) {
    await tx.execute({
      sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', ?, ?, ?, ?)`,
      args: [
        postId,
        e.visuel.alt,
        MENTION_ILLUSTRATION,
        JSON.stringify({ forme: 'montage', gabarit: 'selection', fichier: e.visuel.fichier, octets: e.visuel.octets, apercus: e.visuel.apercus.map(({ site, fichier, sha256, snapshot_id }) => ({ site, fichier, sha256, snapshot_id })), sans_apercu: e.visuel.absents, droits_a_verifier: true, motif_droits: MOTIF_DROITS }),
        o.now,
      ],
    });
  }
  await enregistrerMotsCles(tx, postId, revisionId, motsClesSelection(e.brouillon!), o.now);
  if (e.statut !== 'en_attente') {
    await retirer();
    return { postId, placement: null };
  }
  // Une sélection = une publication dans le plafond quotidien ; même ordre et mêmes règles que les ressources.
  const a: APlacer = { postId, priorite: prioriteEditoriale('ressource', [e.brouillon!.mots_cles.categorie]), statutSortie: 'ressource_existante', ordre: ordreDe(e.contenu) };
  const pp = await tx.execute({ sql: 'select jour, etat, utilise_reserve, motif, priorite, statut_sortie from publication_planifiee where post_id = ?', args: [postId] });
  const actuelle = pp.rows[0];
  const ancienJour = actuelle?.jour == null ? null : String(actuelle.jour);
  const reserve = Number(actuelle?.utilise_reserve) === 1;
  let placement: Placement;
  if (actuelle && actuelle.etat === 'prevue' && ancienJour !== null && ancienJour >= o.aujourdhui && Number(actuelle.priorite) === a.priorite && String(actuelle.statut_sortie) === a.statutSortie && (!reserve || prioritaire(a))) {
    placement = { postId, jour: ancienJour, rang: await rangDe(tx, postId), utiliseReserve: reserve, etat: 'prevue', motif: actuelle.motif === null ? null : String(actuelle.motif) };
  } else {
    const occ = await occupationParJour(tx, new Set([postId]));
    placement = placer([a], occ, o.aujourdhui, o.reglages)[0]!;
    await ecrirePlacement(tx, placement, a, o.now);
    await renumeroter(tx, [ancienJour, placement.jour]);
    if (placement.etat === 'prevue') placement = { ...placement, rang: await rangDe(tx, postId) };
  }
  await indexer(tx, postId, revisionId);
  return { postId, placement };
}

/** Importe des sélections, une transaction par fichier. Idempotent : rien ne change sans contenu, capture ou contrôle nouveau. */
export async function importerSelections(o: OptionsImportSelection): Promise<BilanFichier[]> {
  const { client, db } = o.database;
  const maintenant = (o.horloge ?? (() => new Date()))();
  const now = maintenant.toISOString();
  const aujourdhui = jourParis(maintenant);
  const validite = await lireReglageEntier(db, 'ressources.validite_lien_jours');
  const planning = await lireReglagesPlanning(db);
  const bilans: BilanFichier[] = [];
  let runId: string | null = null;
  const run = async () => {
    if (runId) return runId;
    await synchroniserComptes(client, now);
    runId = randomUUID();
    await withBusyRetry(client, () =>
      client.execute({ sql: `insert into llm_run (id, started_at, finished_at, status, lease_expires_at, max_items, cap_run_micro_usd, cap_total_micro_usd, reason) values (?, ?, ?, 'terminee', null, 0, 0, 0, ?)`, args: [runId, now, now, RAISON_IMPORT_SELECTION] }),
    );
    return runId;
  };

  for (const fichier of o.fichiers) {
    const bilan: BilanFichier = { fichier, slug: null, issue: 'rejetee', statut: null, postId: null, motifs: [], jour: null, rang: null, visuel: null };
    bilans.push(bilan);
    let brut: unknown;
    try {
      brut = JSON.parse(readFileSync(fichier, 'utf8'));
    } catch (erreur) {
      bilan.motifs = [{ niveau: 'bloquant', champ: 'fichier', code: 'json_invalide', detail: erreur instanceof Error ? erreur.message : String(erreur) }];
      continue;
    }
    const slug = brut && typeof brut === 'object' && typeof (brut as { slug?: unknown }).slug === 'string' ? String((brut as { slug: string }).slug) : null;
    bilan.slug = slug;
    const entree = slug ? trouverSelection(slug, o.selections ?? SELECTIONS) : undefined;
    const captures = entree ? await capturesDeSelection(client, entree) : null;
    const r = controlerSelection(brut, captures, entree);
    const controles: ControleStocke[] = [...r.bloquants.map((c): ControleStocke => ({ niveau: 'bloquant', ...c })), ...r.a_verifier.map((c): ControleStocke => ({ niveau: 'a_verifier', ...c }))];
    bilan.motifs = controles;
    if (!entree || !captures?.liste) continue;
    const ni = await client.execute({
      sql: `select nd.news_item_id from news_item_document nd join source_document d on d.id = nd.document_id where d.source_id = ? and d.external_id = 'liste' and nd.role = 'primary'`,
      args: [sourceIdListe(entree.slug)],
    });
    const newsItemId = ni.rows[0] ? Number(ni.rows[0].news_item_id) : null;
    if (newsItemId === null) {
      bilan.motifs = [...controles, { niveau: 'bloquant', champ: 'captures', code: 'capture_absente', detail: 'aucune actualité de sélection : lancer d’abord la capture' }];
      continue;
    }
    const { existant, draft } = await lireExistant(client, newsItemId);
    bilan.postId = existant?.postId ?? null;
    const parse = BrouillonSelection.safeParse(brut);
    const b = parse.success ? parse.data : null;
    const bloque = controles.some((c) => c.niveau === 'bloquant');

    // Contenu stocké : le brouillon et ce que le code ajoute (mention, origine, captures, sites non retenus).
    let contenu: Record<string, unknown> | null = null;
    const cites = documentsCites(b, captures);
    if (b) {
      const retenus = new Set(b.ressources.map((x) => x.site));
      const exclus = [];
      for (const s of entree.sites) if (!retenus.has(s.slug)) exclus.push({ site: s.slug, nom: s.nom, url: s.url, motif: await motifDuSite(client, s) });
      const ajoute = ContenuSelection.parse({
        nature: 'selection',
        compte: entree.compte,
        origine: ORIGINE_DEVELOPPEMENT,
        niveau_preuve: NIVEAU_PREUVE_V1,
        mention: MENTION_IA,
        categories: [b.mots_cles.categorie],
        statut_sortie: 'ressource_existante',
        decouverte_via: entree.decouverteVia,
        captures: cites.map((c) => ({ document: c.document, snapshot_id: c.snapshotId, capture_le: c.captureLe })),
        exclus,
      });
      contenu = { ...b, ...ajoute };
    }

    // Inchangé : même contenu (hors liens), mêmes contrôles, liens encore valides, visuel présent, publication planifiée.
    const memesControles = draft !== null && stable(sansChaine(draft.checks)) === stable(sansChaine(controles));
    const memeContenu = contenu !== null && existant?.contenu != null && stable(sansLiens(existant.contenu)) === stable(contenu);
    if (memesControles && (memeContenu || (contenu === null && existant === null))) {
      const inchange = bloque
        ? draft!.statut === 'rejete'
        : existant?.statut === 'en_attente' && existant.planifiee && existant.media !== null && existsSync(existant.media) && liensValides(existant.contenu?.liens as LienVerifie[] | undefined, maintenant, validite);
      if (inchange) {
        bilan.issue = 'inchangee';
        bilan.statut = (existant?.statut as BilanFichier['statut']) ?? 'rejete';
        bilan.motifs = existant?.checks ?? draft!.checks;
        bilan.visuel = existant?.media ?? null;
        if (existant) {
          const pp = await client.execute({ sql: 'select jour, rang from publication_planifiee where post_id = ?', args: [existant.postId] });
          bilan.jour = pp.rows[0]?.jour == null ? null : String(pp.rows[0].jour);
          bilan.rang = pp.rows[0]?.rang == null ? null : Number(pp.rows[0].rang);
        }
        continue;
      }
    }

    const motifs = [...controles];
    let visuel: Ecriture['visuel'] = null;
    if (!bloque && b && contenu) {
      // Visuel : la grille des aperçus des sites présentés ; un aperçu manquant ou modifié n'est jamais remplacé.
      const { retenus, absents, defauts } = apercusDe(b, captures);
      if (defauts.length > 0) motifs.push({ niveau: 'a_verifier', champ: 'visuel', code: 'visuel_absent', detail: defauts.join(', ') });
      else {
        const montage = composerMontageSelection(b, entree, retenus);
        let rendus: ResultatRendu[];
        try {
          rendus = await (o.rendre ?? (await import('../../media/rendu.ts')).rendreMontages)([montage], o.dossierVisuels ?? DOSSIER_SELECTIONS);
        } catch (erreur) {
          rendus = [{ id: montage.id, fichier: null, defauts: [`rendu_impossible: ${erreur instanceof Error ? erreur.message : String(erreur)}`], duree_ms: 0, octets: 0 }];
        }
        const rendu = rendus.find((x) => x.id === montage.id);
        if (!rendu || rendu.fichier === null || rendu.defauts.length > 0) motifs.push({ niveau: 'a_verifier', champ: 'visuel', code: 'visuel_absent', detail: (rendu?.defauts ?? ['rendu_absent']).join(', ') });
        else {
          const { texteAlternatif } = await import('../../media/montage.ts');
          visuel = { fichier: rendu.fichier, octets: rendu.octets, alt: texteAlternatif(montage), apercus: retenus, absents };
        }
      }
      // Liens : un par ressource citée, vérifiés sur l'hôte attendu, sans redirection.
      const liens: LienVerifie[] = [];
      for (const x of b.ressources) {
        const s = entree.sites.find((y) => y.slug === x.site)!;
        const page = captures.sites.find((y) => y.site.slug === x.site)?.page ?? null;
        const l = await verifierLienSite(x.url, s, page, { userAgent: o.userAgent, maintenant, ...(o.transport ? { transport: o.transport } : {}), ...(o.resolve ? { resolve: o.resolve } : {}) });
        liens.push(l);
        if (l.resultat !== 'verifie') motifs.push({ niveau: 'a_verifier', champ: `ressources:${b.ressources.indexOf(x)}.url`, code: 'lien_non_verifie', detail: `${x.url} : ${l.motif}` });
      }
      contenu = { ...contenu, liens };
    }
    const statut: Ecriture['statut'] = bloque || contenu === null ? 'rejete' : motifs.length > 0 ? 'a_verifier' : 'en_attente';
    const id = await run();
    const snapshotListe = captures.liste.snapshotId;
    const resultat = await transaction(client, (tx) => ecrire(tx, { newsItemId, entree, contenu, brouillon: b, existant, statut, motifs, cites, visuel }, { runId: id, now, aujourdhui, reglages: planning, snapshotListe }));
    bilan.statut = contenu === null ? null : statut;
    bilan.postId = resultat.postId;
    bilan.motifs = motifs;
    bilan.visuel = visuel?.fichier ?? null;
    if (resultat.placement) {
      bilan.issue = resultat.placement.etat === 'prevue' ? 'planifiee' : 'reportee';
      bilan.jour = resultat.placement.jour;
      bilan.rang = resultat.placement.rang;
    } else bilan.issue = statut === 'rejete' ? 'rejetee' : 'a_verifier';
  }
  return bilans;
}
