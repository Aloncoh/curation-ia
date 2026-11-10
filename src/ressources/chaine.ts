// Chaîne d'import des brouillons de ressources (ADR 0011 §7) : contrôles du texte → visuel → liens vérifiés →
// mots-clés → contrôle final → publication `en_attente` avec un jour prévu → indexation, dans une même transaction.
// Aucun appel au modèle : les brouillons sont rédigés par Claude Code pendant le développement, et cela s'affiche.
// Un brouillon qui ne passe pas les contrôles n'est jamais forcé : il reste « rejeté » ou « à vérifier », avec ses motifs.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Client, Transaction } from '@libsql/client';
import type { Resolver, Transport } from '../collect/safe-fetch.ts';
import { synchroniserComptes, MENTION_ILLUSTRATION, NIVEAU_PREUVE_V1 } from '../analysis/publication.ts';
import { lireReglageEntier } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import type { Montage } from '../media/montage.ts';
import type { ResultatRendu } from '../media/rendu.ts';
import { desindexer, indexer } from '../recherche/index.ts';
import { prioriteEditoriale } from '../selection/consignes.ts';
import { capturesDeRessource, jsonTrie, type CaptureStockee } from './capture.ts';
import { controlerRessource, metadonneesDe, type Controle, type ResultatControles } from './controles.ts';
import { boutonAffichable, verifierBouton, type VerificationBouton } from './liens.ts';
import { DECOUVERTE_VIA, documentPrincipal, RESSOURCES, sourceIdDe, trouverRessource, type EntreeRessource } from './liste.ts';
import { enregistrerMotsCles, motsClesDe, type LigneMotCle } from './mots-cles.ts';
import {
  ecrirePlacement,
  jourParis,
  lireReglagesPlanning,
  occupationParJour,
  placer,
  prioritaire,
  rangDe,
  renumeroter,
  retirerDuPlanning,
  type APlacer,
  type Placement,
  type ReglagesPlanning,
} from './planification.ts';
import { BrouillonRessource, CONSIGNES_RESSOURCES, ContenuRessource, MENTION_IA } from './schemas.ts';
import { etatDepot, statutSortie } from './statut.ts';
import { composerMontageRessource, DOSSIER_VISUELS, produireVisuel, type IssueVisuel, type Rendeur } from './visuel.ts';

export const ORIGINE_DEVELOPPEMENT = 'claude_code_developpement';
export const ORIGINE_AGENT = 'agent_site';
export const MODELE_IMPORT = 'claude-code';
export const PROMPT_IMPORT = `ressources-${CONSIGNES_RESSOURCES}`;
export const RAISON_IMPORT = 'import ressources, aucun appel au modèle';

/** Motifs posés par la chaîne, pas par `verifier` : un nouvel import les recontrôle (rendu, lien, mots-clés). */
export const CODES_CHAINE = ['visuel_absent', 'lien_non_verifie', 'mots_cles_invalides'] as const;

export type NiveauControle = 'bloquant' | 'a_verifier';
export type ControleStocke = Controle & { niveau: NiveauControle };

export type Issue = 'planifiee' | 'reportee' | 'a_verifier' | 'rejetee' | 'inchangee';

export interface BilanFichier {
  fichier: string;
  slug: string | null;
  issue: Issue;
  /** Statut de la publication après l'import ; null si rien n'a pu être écrit (slug inconnu, JSON invalide…). */
  statut: 'en_attente' | 'a_verifier' | 'rejete' | null;
  postId: number | null;
  motifs: ControleStocke[];
  jour: string | null;
  rang: number | null;
  visuel: string | null;
}

export interface OptionsImport {
  database: Database;
  userAgent: string;
  fichiers: string[];
  liste?: readonly EntreeRessource[];
  dossierVisuels?: string;
  /** Rendeur des montages : Chrome local par défaut (src/media/rendu.ts) ; les tests en injectent un. */
  rendre?: Rendeur;
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
  /**
   * Brouillon rédigé par l'agent du site (découvertes, P6) : origine, modèle et version du prompt réels, et l'exécution
   * payante qui l'a produit. Absent : brouillon écrit pendant le développement par Claude Code.
   */
  redaction?: { modele: string; prompt: string; runId: string };
}

/** Texte d'origine, affiché partout où la publication apparaît. */
export function texteOrigine(origine: string, modele: string | null = null, version: string | null = null): string {
  return origine === ORIGINE_DEVELOPPEMENT
    ? "Rédigé pendant le développement par Claude Code, assistant de programmation, pas par l'agent du site ; vérifié par les contrôles du code"
    : `Rédigé par l'agent du site (${modele ?? 'modèle non renseigné'}, ${version ?? 'version du prompt non renseignée'})`;
}

const stable = (v: unknown): string => jsonTrie(v);
const tous = (r: ResultatControles): ControleStocke[] => [
  ...r.bloquants.map((c): ControleStocke => ({ niveau: 'bloquant', ...c })),
  ...r.a_verifier.map((c): ControleStocke => ({ niveau: 'a_verifier', ...c })),
];
const sansChaine = (l: ControleStocke[]) => l.filter((c) => !(CODES_CHAINE as readonly string[]).includes(c.code));

interface Existant {
  postId: number;
  statut: string;
  revisionId: number | null;
  revisionSeq: number;
  contenu: unknown;
  draftStatut: string | null;
  checks: ControleStocke[];
  planifiee: boolean;
  media: string | null;
  boutons: Pick<VerificationBouton, 'resultat' | 'verifie_le'>[];
}

/** Un brouillon lu et contrôlé, avant le visuel et les liens. */
interface Prepare {
  fichier: string;
  slug: string | null;
  entree: EntreeRessource | undefined;
  brouillon: BrouillonRessource | null;
  captures: CaptureStockee[];
  newsItemId: number | null;
  snapshotPrincipal: number | null;
  controles: ControleStocke[];
  contenu: Record<string, unknown> | null;
  existant: Existant | null;
  draftExistant: { statut: string; checks: ControleStocke[] } | null;
  inchange: boolean;
  /** Rang dans la liste de l'utilisateur : ordre d'écriture et de planification. */
  ordre: number;
}

async function lireExistant(client: Client, newsItemId: number): Promise<{ existant: Existant | null; draft: { statut: string; checks: ControleStocke[] } | null }> {
  const d = await client.execute({ sql: 'select status, checks from post_draft where news_item_id = ?', args: [newsItemId] });
  const draft = d.rows[0] ? { statut: String(d.rows[0].status), checks: d.rows[0].checks === null ? [] : (JSON.parse(String(d.rows[0].checks)) as ControleStocke[]) } : null;
  const p = await client.execute({ sql: 'select id, status from post where news_item_id = ?', args: [newsItemId] });
  const post = p.rows[0];
  if (!post) return { existant: null, draft };
  const postId = Number(post.id);
  const rv = await client.execute({ sql: 'select id, seq, content from post_revision where post_id = ? order by seq desc limit 1', args: [postId] });
  const pp = await client.execute({ sql: 'select 1 from publication_planifiee where post_id = ?', args: [postId] });
  const media = await client.execute({ sql: `select content from media_asset where post_id = ? and origin <> 'external_embed' order by id desc limit 1`, args: [postId] });
  const boutons = await client.execute({ sql: 'select resultat, verifie_le from post_bouton where post_id = ?', args: [postId] });
  const fichierMedia = media.rows[0]?.content ? (JSON.parse(String(media.rows[0].content)) as { fichier?: unknown }).fichier : null;
  return {
    draft,
    existant: {
      postId,
      statut: String(post.status),
      revisionId: rv.rows[0] ? Number(rv.rows[0].id) : null,
      revisionSeq: rv.rows[0] ? Number(rv.rows[0].seq) : 0,
      contenu: rv.rows[0] ? JSON.parse(String(rv.rows[0].content)) : null,
      draftStatut: draft?.statut ?? null,
      checks: draft?.checks ?? [],
      planifiee: pp.rows.length > 0,
      media: typeof fichierMedia === 'string' ? fichierMedia : null,
      boutons: boutons.rows.map((b) => ({ resultat: String(b.resultat) as 'verifie' | 'echec', verifie_le: String(b.verifie_le) })),
    },
  };
}

/** Lit, contrôle et calcule le contenu stocké d'un brouillon ; décide s'il est inchangé depuis le dernier import. */
async function preparer(fichier: string, o: OptionsImport, maintenant: Date, reglages: { seuil: number; inactivite: number; validite: number }): Promise<Prepare> {
  const client = o.database.client;
  let brut: unknown;
  let erreurJson: string | null = null;
  try {
    brut = JSON.parse(readFileSync(fichier, 'utf8'));
  } catch (erreur) {
    erreurJson = erreur instanceof Error ? erreur.message : String(erreur);
  }
  const vide: Prepare = { fichier, slug: null, entree: undefined, brouillon: null, captures: [], newsItemId: null, snapshotPrincipal: null, controles: [], contenu: null, existant: null, draftExistant: null, inchange: false, ordre: Number.MAX_SAFE_INTEGER };
  if (erreurJson !== null) return { ...vide, controles: [{ niveau: 'bloquant', champ: 'fichier', code: 'json_invalide', detail: erreurJson }] };

  const objet = brut && typeof brut === 'object' ? (brut as Record<string, unknown>) : {};
  const slug = typeof objet.slug === 'string' ? objet.slug : null;
  const liste = o.liste ?? RESSOURCES;
  const entree = slug ? trouverRessource(slug, liste) : undefined;
  const captures = entree ? await capturesDeRessource(client, entree) : [];
  const m = metadonneesDe(captures);
  const controles = tous(controlerRessource(brut, captures, m, entree));
  const base: Prepare = { ...vide, slug, entree, captures, controles, ordre: entree ? liste.indexOf(entree) : vide.ordre };
  if (!entree) return base;

  // Actualité « découverte » de la ressource : son document principal la désigne.
  const principal = captures.find((c) => c.document === documentPrincipal(entree)) ?? null;
  const ni = await client.execute({
    sql: `select nd.news_item_id from news_item_document nd join source_document d on d.id = nd.document_id
          where d.source_id = ? and d.external_id = ? and nd.role = 'primary'`,
    args: [sourceIdDe(entree.depot), documentPrincipal(entree)],
  });
  const newsItemId = ni.rows[0] ? Number(ni.rows[0].news_item_id) : null;
  if (newsItemId === null || principal === null) return base;
  const { existant, draft } = await lireExistant(client, newsItemId);

  const parse = BrouillonRessource.safeParse(brut);
  const depot = captures.find((c) => c.document === 'depot');
  let contenu: Record<string, unknown> | null = null;
  if (parse.success && m && depot) {
    const ajoute = ContenuRessource.parse({
      statut_sortie: statutSortie(m.created_at, depot.captureLe, reglages.seuil),
      etat_depot: etatDepot(m, depot.captureLe, reglages.inactivite),
      compte: entree.compte,
      origine: o.redaction ? ORIGINE_AGENT : ORIGINE_DEVELOPPEMENT,
      niveau_preuve: NIVEAU_PREUVE_V1,
      mention: MENTION_IA,
      captures: captures.map((c) => ({ document: c.document, snapshot_id: c.snapshotId, capture_le: c.captureLe })),
      categories: [parse.data.mots_cles.categorie],
      nature: 'ressource',
      decouverte_via: entree.decouverteVia ?? DECOUVERTE_VIA,
    });
    contenu = { ...parse.data, ...ajoute };
  }
  const prepare: Prepare = { ...base, brouillon: parse.success ? parse.data : null, newsItemId, snapshotPrincipal: principal.snapshotId, contenu, existant, draftExistant: draft };

  // Inchangé : même contenu, mêmes contrôles, et une issue qui ne dépend d'aucun contrôle de la chaîne à refaire.
  const memesControles = draft !== null && stable(sansChaine(draft.checks)) === stable(sansChaine(controles));
  const memeContenu = contenu === null ? existant === null : existant?.contenu != null && stable(existant.contenu) === stable(contenu);
  const bloque = controles.some((c) => c.niveau === 'bloquant');
  if (memesControles && memeContenu) {
    if (bloque) prepare.inchange = draft!.statut === 'rejete';
    else if (existant?.statut === 'a_verifier') prepare.inchange = sansChaine(existant.checks).length === existant.checks.length;
    else if (existant?.statut === 'en_attente') {
      const lien = boutonAffichable(existant.boutons, maintenant, reglages.validite);
      prepare.inchange = existant.planifiee && lien !== null && existant.media !== null && existsSync(existant.media);
    }
  }
  return prepare;
}

/** Visuel, lien et mots-clés d'un brouillon contrôlé sans défaut bloquant. */
interface Chaine {
  visuel: IssueVisuel;
  lien: VerificationBouton | null;
  motsCles: LigneMotCle[];
  motifs: ControleStocke[];
}

async function poursuivre(p: Prepare, montage: Montage, rendus: ResultatRendu[] | Error, o: OptionsImport): Promise<Chaine> {
  const b = p.brouillon!;
  const motifs: ControleStocke[] = [];
  const visuel = await produireVisuel(montage, {
    dossier: o.dossierVisuels ?? DOSSIER_VISUELS,
    rendre: async () => {
      if (rendus instanceof Error) throw rendus;
      return rendus;
    },
  });
  if (!visuel.ok) motifs.push({ niveau: 'a_verifier', champ: 'visuel', code: 'visuel_absent', detail: visuel.defauts.join(', ') });

  const verification = await verifierBouton(b.bouton.url, {
    captures: p.captures,
    userAgent: o.userAgent,
    ...(o.horloge ? { horloge: o.horloge } : {}),
    ...(o.transport ? { transport: o.transport } : {}),
    ...(o.resolve ? { resolve: o.resolve } : {}),
  });
  // Un hôte inattendu est déjà bloquant au contrôle du texte ; ce cas ne laisse aucune ligne (contrainte de cohérence).
  const lien = verification.resultat === 'refuse' ? null : verification;
  if (lien === null || lien.resultat !== 'verifie') motifs.push({ niveau: 'a_verifier', champ: 'bouton', code: 'lien_non_verifie', detail: lien?.motif ?? 'hote_inattendu' });

  const { lignes, refus } = motsClesDe(b.mots_cles);
  if (refus.length > 0) motifs.push({ niveau: 'a_verifier', champ: 'mots_cles', code: 'mots_cles_invalides', detail: refus.map((r) => `${r.champ} « ${r.terme} » : ${r.code}`).join(' ; ') });
  return { visuel, lien, motsCles: refus.length > 0 ? [] : lignes, motifs };
}

async function documentsDe(tx: Transaction, entree: EntreeRessource): Promise<Map<string, number>> {
  const r = await tx.execute({ sql: 'select id, external_id from source_document where source_id = ?', args: [sourceIdDe(entree.depot)] });
  return new Map(r.rows.map((row) => [String(row.external_id), Number(row.id)]));
}

/** Écrit brouillon, publication, révision, sources, média, bouton, mots-clés, planning et index : une seule transaction. */
async function ecrire(
  tx: Transaction,
  p: Prepare,
  c: Chaine | null,
  statut: 'en_attente' | 'a_verifier' | 'rejete',
  motifs: ControleStocke[],
  o: { runId: string; now: string; aujourdhui: string; reglages: ReglagesPlanning; redaction?: OptionsImport['redaction'] },
): Promise<{ postId: number | null; placement: Placement | null }> {
  const entree = p.entree!;
  const statutBrouillon = statut === 'en_attente' ? 'controle_automatique' : statut;
  const rejet = statut === 'rejete' ? motifs.filter((m) => m.niveau === 'bloquant').map((m) => m.code).join(', ') : null;
  const draft = await tx.execute({
    sql: `insert into post_draft (news_item_id, run_id, status, account, rejection_reason, information_type, snapshot_id, model, prompt_version, content, checks, origine, created_at)
          values (?, ?, ?, ?, ?, 'ressource', ?, ?, ?, ?, ?, ?, ?)
          on conflict(news_item_id) do update set run_id = excluded.run_id, status = excluded.status, account = excluded.account,
            rejection_reason = excluded.rejection_reason, information_type = excluded.information_type, snapshot_id = excluded.snapshot_id,
            model = excluded.model, prompt_version = excluded.prompt_version, content = excluded.content, checks = excluded.checks,
            origine = excluded.origine, created_at = excluded.created_at
          returning id`,
    args: [p.newsItemId, o.runId, statutBrouillon, entree.compte, rejet, p.snapshotPrincipal, o.redaction?.modele ?? MODELE_IMPORT, o.redaction?.prompt ?? PROMPT_IMPORT, p.contenu === null ? null : JSON.stringify(p.contenu), JSON.stringify(motifs), o.redaction ? ORIGINE_AGENT : ORIGINE_DEVELOPPEMENT, o.now],
  });
  const draftId = Number(draft.rows[0]!.id);
  // Sans contenu valide (schéma refusé), seul le brouillon garde la trace du refus ; une publication antérieure est retirée du planning et de l'index.
  if (p.contenu === null) {
    const ancien = p.existant?.postId ?? null;
    if (ancien !== null) {
      await tx.execute({ sql: `update post set status = 'rejete' where id = ?`, args: [ancien] });
      await retirerDuPlanning(tx, ancien);
      await desindexer(tx, ancien);
    }
    return { postId: ancien, placement: null };
  }

  let postId = p.existant?.postId ?? null;
  if (postId === null) {
    const post = await tx.execute({
      sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at) values (?, ?, ?, ?, ?) returning id`,
      args: [entree.compte, p.newsItemId, NIVEAU_PREUVE_V1, statut, o.now],
    });
    postId = Number(post.rows[0]!.id);
  } else {
    await tx.execute({ sql: 'update post set status = ?, account_id = ? where id = ?', args: [statut, entree.compte, postId] });
  }

  // Une révision par contenu différent ; la précédente reste.
  let revisionId = p.existant?.revisionId ?? null;
  if (revisionId === null || stable(p.existant?.contenu) !== stable(p.contenu)) {
    const rv = await tx.execute({
      sql: 'insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, ?, ?, ?, ?) returning id',
      args: [postId, (p.existant?.revisionSeq ?? 0) + 1, draftId, JSON.stringify(p.contenu), o.now],
    });
    revisionId = Number(rv.rows[0]!.id);
    const documents = await documentsDe(tx, entree);
    for (const capture of p.captures) {
      const documentId = documents.get(capture.document);
      if (documentId === undefined) throw new Error(`Document introuvable pour la capture ${capture.snapshotId} (${capture.document}).`);
      await tx.execute({ sql: 'insert into post_source (revision_id, document_id, snapshot_id) values (?, ?, ?) on conflict do nothing', args: [revisionId, documentId, capture.snapshotId] });
    }
  }

  const retirer = async () => {
    await retirerDuPlanning(tx, postId!);
    await desindexer(tx, postId!);
  };
  if (statut === 'rejete' || c === null) {
    await retirer();
    return { postId, placement: null };
  }

  if (c.visuel.ok) {
    await tx.execute({
      sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', ?, ?, ?, ?)`,
      args: [postId, c.visuel.media.alt_text, MENTION_ILLUSTRATION, JSON.stringify(c.visuel.media.content), o.now],
    });
  }
  if (c.lien) {
    const l = c.lien;
    await tx.execute({
      sql: `insert into post_bouton (post_id, revision_id, libelle, destination, url, hote, url_controle, statut_http, resultat, motif, snapshot_id, verifie_le, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      // Sans requête (URL hors forme canonique…), l'adresse contrôlée est celle du bouton ; le motif le dit.
      args: [postId, revisionId, l.libelle, l.destination, l.url, l.hote, l.url_controle ?? l.url, l.statut_http, l.resultat, l.motif, l.snapshot_id, l.verifie_le, o.now],
    });
  }
  if (c.motsCles.length > 0) await enregistrerMotsCles(tx, postId, revisionId, c.motsCles, o.now);

  if (statut !== 'en_attente') {
    await retirer();
    return { postId, placement: null };
  }
  // Planification : une publication déjà prévue aujourd'hui ou plus tard garde son jour, tant que son statut de sortie
  // et sa priorité n'ont pas changé et que sa place reste admissible (la réserve aux seules nouveautés prioritaires) ;
  // sinon elle est replacée.
  const a: APlacer = {
    postId,
    priorite: prioriteEditoriale('ressource', [p.brouillon!.mots_cles.categorie]),
    statutSortie: (p.contenu as { statut_sortie: APlacer['statutSortie'] }).statut_sortie,
    ordre: p.ordre,
  };
  const pp = await tx.execute({ sql: 'select jour, etat, utilise_reserve, motif, priorite, statut_sortie from publication_planifiee where post_id = ?', args: [postId] });
  const actuelle = pp.rows[0];
  const ancienJour = actuelle?.jour == null ? null : String(actuelle.jour);
  const reserve = Number(actuelle?.utilise_reserve) === 1;
  let placement: Placement;
  if (
    actuelle &&
    actuelle.etat === 'prevue' &&
    ancienJour !== null &&
    ancienJour >= o.aujourdhui &&
    Number(actuelle.priorite) === a.priorite &&
    String(actuelle.statut_sortie) === a.statutSortie &&
    (!reserve || prioritaire(a))
  ) {
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

/**
 * Importe des brouillons : contrôles, visuel (un seul lancement du navigateur pour tout le lot), liens, mots-clés,
 * puis une transaction par brouillon, dans l'ordre de planification (priorité, nouveauté, ordre de la liste).
 * Idempotent : un brouillon dont le contenu, les captures et les contrôles n'ont pas changé ne crée rien.
 */
export async function importerBrouillons(o: OptionsImport): Promise<BilanFichier[]> {
  const { client, db } = o.database;
  const maintenant = (o.horloge ?? (() => new Date()))();
  const now = maintenant.toISOString();
  const aujourdhui = jourParis(maintenant);
  const reglages = {
    seuil: await lireReglageEntier(db, 'ressources.seuil_nouvelle_sortie_jours'),
    inactivite: await lireReglageEntier(db, 'ressources.inactivite_jours'),
    validite: await lireReglageEntier(db, 'ressources.validite_lien_jours'),
  };
  const planning = await lireReglagesPlanning(db);

  const prepares: Prepare[] = [];
  for (const f of o.fichiers) prepares.push(await preparer(f, o, maintenant, reglages));

  // Visuels : un seul rendu pour tous les brouillons qui avancent dans la chaîne.
  const avancent = prepares.filter((p) => !p.inchange && p.brouillon !== null && p.contenu !== null && !p.controles.some((c) => c.niveau === 'bloquant'));
  const montages = new Map<Prepare, Montage>();
  for (const p of avancent) {
    const m = metadonneesDe(p.captures)!;
    const depot = p.captures.find((c) => c.document === 'depot')!;
    montages.set(p, composerMontageRessource(p.brouillon!, p.entree!, m, depot.captureLe));
  }
  let rendus: ResultatRendu[] | Error = [];
  if (montages.size > 0) {
    try {
      rendus = await (o.rendre ?? (await import('../media/rendu.ts')).rendreMontages)([...montages.values()], o.dossierVisuels ?? DOSSIER_VISUELS);
    } catch (erreur) {
      rendus = erreur instanceof Error ? erreur : new Error(String(erreur));
    }
  }

  const aEcrire = prepares.filter((p) => !p.inchange && p.newsItemId !== null && p.entree !== undefined);
  let runId: string | null = null;
  if (aEcrire.length > 0 && o.redaction) {
    await synchroniserComptes(client, now);
    runId = o.redaction.runId;
  } else if (aEcrire.length > 0) {
    await synchroniserComptes(client, now);
    runId = randomUUID();
    await withBusyRetry(client, () =>
      client.execute({
        sql: `insert into llm_run (id, started_at, finished_at, status, lease_expires_at, max_items, cap_run_micro_usd, cap_total_micro_usd, reason) values (?, ?, ?, 'terminee', null, 0, 0, 0, ?)`,
        args: [runId, now, now, RAISON_IMPORT],
      }),
    );
  }

  const bilans = new Map<Prepare, BilanFichier>();
  // Ordre d'écriture = ordre de planification : la première ressource de la liste prend la première place.
  for (const p of [...prepares].sort((a, b) => a.ordre - b.ordre)) {
    const bilan: BilanFichier = { fichier: p.fichier, slug: p.slug, issue: 'rejetee', statut: null, postId: p.existant?.postId ?? null, motifs: p.controles, jour: null, rang: null, visuel: null };
    bilans.set(p, bilan);
    if (p.inchange) {
      bilan.issue = 'inchangee';
      bilan.statut = p.existant ? (p.existant.statut as BilanFichier['statut']) : 'rejete';
      bilan.motifs = p.existant?.checks ?? p.draftExistant?.checks ?? p.controles;
      bilan.visuel = p.existant?.media ?? null;
      if (p.existant) {
        const pp = await client.execute({ sql: 'select jour, rang from publication_planifiee where post_id = ?', args: [p.existant.postId] });
        bilan.jour = pp.rows[0]?.jour == null ? null : String(pp.rows[0].jour);
        bilan.rang = pp.rows[0]?.rang == null ? null : Number(pp.rows[0].rang);
      }
      continue;
    }
    if (!aEcrire.includes(p)) {
      // Slug inconnu, JSON invalide ou ressource jamais capturée : aucune ligne ne peut porter le refus.
      if (!p.controles.some((c) => c.niveau === 'bloquant')) p.controles.push({ niveau: 'bloquant', champ: 'captures', code: 'capture_absente', detail: p.entree?.depot ?? p.slug ?? p.fichier });
      bilan.motifs = p.controles;
      continue;
    }
    const bloque = p.controles.some((c) => c.niveau === 'bloquant') || p.contenu === null;
    const montage = montages.get(p);
    const c = !bloque && montage ? await poursuivre(p, montage, rendus, o) : null;
    const motifs = [...p.controles, ...(c?.motifs ?? [])];
    const statut = bloque ? 'rejete' : motifs.length > 0 ? 'a_verifier' : 'en_attente';
    const r = await transaction(client, (tx) => ecrire(tx, p, c, statut, motifs, { runId: runId!, now, aujourdhui, reglages: planning, ...(o.redaction ? { redaction: o.redaction } : {}) }));
    bilan.statut = p.contenu === null ? null : statut;
    bilan.postId = r.postId;
    bilan.motifs = motifs;
    bilan.visuel = c?.visuel.ok ? c.visuel.media.content.fichier : null;
    if (r.placement) {
      bilan.issue = r.placement.etat === 'prevue' ? 'planifiee' : 'reportee';
      bilan.jour = r.placement.jour;
      bilan.rang = r.placement.rang;
    } else bilan.issue = statut === 'rejete' ? 'rejetee' : 'a_verifier';
  }
  return prepares.map((p) => bilans.get(p)!);
}
