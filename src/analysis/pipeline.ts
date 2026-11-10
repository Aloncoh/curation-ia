// Qualification, attribution à un compte, brouillon, contrôles et publication non publiée. Rien ne part en ligne.
import { randomUUID } from 'node:crypto';
import { SOURCES } from '../sources.ts';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Client, Row } from '@libsql/client';
import { z } from 'zod';
import { redactSecrets } from '../config.ts';
import { isPaused } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { toPlainText } from '../maquette/data.ts';
import { BudgetInsuffisant, marquerErreur, reserver, solder, type Plafonds } from './budget.ts';
import { CODES_BLOQUANTS, controlerBrouillon, diapositivesDe, moinsDeTroisMots, type DiapositiveResolue } from './controles.ts';
import { estReprenable, schemaSortie, type Modele, type RequeteModele } from './modele.ts';
import { elaguer, revisionElaguee } from './elagage.ts';
import { documentUtilisateur, messageRevision, PROMPT_VERSION, SYSTEME_QUALIFICATION, SYSTEME_REDACTION } from './prompts.ts';
import { consignesActuelles, deciderSelection, passagesRetrouves, preselection, type Selection } from '../selection/consignes.ts';
import { creerPublication, NIVEAU_PREUVE_V1, synchroniserComptes } from './publication.ts';
import { Brouillon, Qualification } from './schemas.ts';

export const MAX_TENTATIVES = 2;
/** La réflexion du modèle compte dans ces plafonds ; une réponse tronquée repart une fois avec le double. */
export const MAX_TOKENS = { qualification: 4_000, redaction: 12_000, revision: 12_000, relance: 12_000 };
/** Brouillons « à vérifier » relancés au plus par lot (une seule relance par brouillon, payée sur le plafond du lot). */
export const MAX_RELANCES_PAR_LOT = 10;
/** Renouvelé pendant chaque appel : un bail expiré signifie que le processus a disparu ou s'est arrêté, par exemple en veille. */
export const DUREE_BAIL_MS = 15 * 60_000;
/** Une capture plus longue ne part pas au modèle : son coût bloquerait le lot et son contrôle serait trop lent. */
export const LONGUEUR_MAX_CAPTURE = 300_000;
const PAUSE_REPRISE_MS = 1_000;

class ArretPause extends Error {}
class BailPerdu extends Error {}
export class LotEnCours extends Error {}

type EchecSortie = 'sortie_invalide' | 'sortie_tronquee' | 'refus';
type Sortie<T> = { ok: true; valeur: T } | { ok: false; statut: EchecSortie };
const BILAN_ECHEC = { sortie_invalide: 'invalides', sortie_tronquee: 'tronquees', refus: 'refus' } as const;

/**
 * Lit la sortie JSON du modèle selon le schéma. Le motif d'un refus est court et lisible (chemin et message du premier
 * écart), sans recopier la sortie : il sert à repérer les erreurs récurrentes.
 */
export function lireSortie<T>(texte: string, schema: z.ZodType<T>): { ok: true; valeur: T } | { ok: false; motif: string } {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch (e) {
    return { ok: false, motif: `JSON illisible (${e instanceof Error ? e.message.slice(0, 80) : 'erreur'})` };
  }
  const r = schema.safeParse(brut);
  if (r.success) return { ok: true, valeur: r.data };
  const ecarts = r.error.issues.slice(0, 3).map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`.slice(0, 90));
  return { ok: false, motif: `${ecarts.join(' ; ')}${r.error.issues.length > 3 ? ` (+${r.error.issues.length - 3})` : ''}` };
}

/** Agent final : celui imposé par la source, sauf la sortie d'un modèle d'IA (Nodi), qui reste à Nodi même chez Radar. */
export function compteRetenu<C extends string>(impose: C | null, propose: C): C {
  if (!impose || (impose === 'radar' && propose === 'nodi')) return propose;
  return impose;
}

export interface OptionsBrouillons {
  database: Database;
  modele: Modele;
  nomModele: string;
  maxItems: number;
  /** Seulement ces sources (identifiants du registre) ; toutes sinon. */
  sources?: readonly string[];
  capRunMicroUsd: number;
  capTotalMicroUsd: number;
  /** Au-delà de cet âge à la première vue, l'entrée vient de l'historique d'un flux : écartée sans appel. Sans valeur, aucun filtre. */
  ageMaxJours?: number;
  clock?: () => Date;
  estReprenable?: (e: unknown) => boolean;
  attente?: (ms: number) => Promise<unknown>;
  dureeBailMs?: number;
}

/**
 * Actualités sans résultat définitif, dont la dernière capture vient d'une collecte réelle, en commençant par celles
 * déjà qualifiées et payées. Un sujet à approfondir repasse quand une nouvelle capture arrive. Une capture de moins de trois mots ne permet aucune citation, une capture trop longue
 * coûterait trop cher : elles ne partent pas au modèle et ne figent rien, l'actualité repassera avec une autre capture.
 */
async function aTraiter(client: Client, limite: number, sources?: readonly string[]) {
  const r = await client.execute(
    `select n.id, n.title, n.announced_at, n.first_seen_at, v.version, pr.name as produit,
            c.id as snapshot_id, c.document_id, c.title as snapshot_title, c.content, c.content_format, src.id as source_id, src.name as source_nom,
            d.status as etat, d.snapshot_id as snapshot_qualifie, d.prompt_version as prompt_qualifie, d.model as modele_qualifie, d.content as qualification
          from news_item n
          join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
          join document_snapshot c on c.document_id = nd.document_id
            and c.seq = (select max(seq) from document_snapshot x where x.document_id = nd.document_id)
          join run r on r.id = c.run_id and r.mode = 'live'
          join source_document doc on doc.id = nd.document_id
          join source src on src.id = doc.source_id
          left join news_item_target t on t.news_item_id = n.id
          left join product_version v on v.id = t.product_version_id
          left join product pr on pr.id = t.product_id
          left join post_draft d on d.news_item_id = n.id
          -- Une découverte (liste de ressources, ADR 0011) n'est jamais qualifiée avec la grille des actualités.
          where n.kind not in ('decouverte', 'selection') and (d.id is null or d.status = 'qualifiee' or (d.status = 'a_approfondir' and d.snapshot_id <> c.id)
            -- Sortie illisible récente sans motif noté (avant le 2026-11-10) : reprise une fois, avec le nouvel essai.
            or (d.status = 'sortie_invalide' and d.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                and not exists (select 1 from llm_call l where l.news_item_id = n.id and l.error like 'sortie illisible%')))
          -- Grosses annonces d'abord (2026-11-10) : un sujet repris par plusieurs sources passe avant un sujet isolé.
          order by d.id is not null desc,
            (select count(*) from news_item_document x where x.news_item_id = n.id) > 1 desc,
            coalesce(n.announced_at, n.first_seen_at) desc, n.id desc`,
  );
  const lignesSource = sources?.length ? r.rows.filter((row) => sources.includes(String(row.source_id))) : r.rows;
  const tailleAdmise = lignesSource.filter((row) => String(row.content).length + String(row.snapshot_title).length <= LONGUEUR_MAX_CAPTURE);
  const avecTexte = tailleAdmise.filter((row) => !moinsDeTroisMots(toPlainText(String(row.content), String(row.content_format))));
  return { lignes: avecTexte.slice(0, limite), sansTexte: tailleAdmise.length - avecTexte.length, tropLongues: lignesSource.length - tailleAdmise.length };
}

/** Une qualification payée se réutilise tant que la capture, le prompt et le modèle sont les mêmes. */
function qualificationReprise(row: Row, nomModele: string): Qualification | null {
  if (row.etat !== 'qualifiee' || row.snapshot_qualifie !== row.snapshot_id || row.prompt_qualifie !== PROMPT_VERSION || row.modele_qualifie !== nomModele) return null;
  const r = Qualification.safeParse((JSON.parse(String(row.qualification)) as { qualification?: unknown }).qualification);
  return r.success ? r.data : null;
}

/** Autres captures réelles de l'actualité : anciennes versions du document et documents secondaires. */
export async function autresCaptures(client: Client, newsItemId: number, snapshotId: number): Promise<string[]> {
  const r = await client.execute({
    sql: `select c.title, c.content, c.content_format
          from document_snapshot c
          join news_item_document nd on nd.document_id = c.document_id
          join run r on r.id = c.run_id and r.mode = 'live'
          where nd.news_item_id = ? and c.id <> ?`,
    args: [newsItemId, snapshotId],
  });
  return r.rows.map((row) => `${String(row.title)} ${toPlainText(String(row.content), String(row.content_format))}`);
}

/**
 * Une seule exécution à la fois. Une exécution dont le bail a expiré est close en `interrompue` : ses appels sans réponse
 * gardent leur réservation, car ils ont pu être facturés.
 */
async function ouvrirExecution(client: Client, o: OptionsBrouillons, runId: string, now: string, bail: string): Promise<void> {
  const tx = await client.transaction('write');
  try {
    const actif = (await tx.execute(`select id, lease_expires_at from llm_run where status = 'en_cours'`)).rows[0];
    if (actif) {
      if (actif.lease_expires_at !== null && String(actif.lease_expires_at) > now) throw new LotEnCours(`Un lot est déjà en cours (${String(actif.id)}, bail jusqu'à ${String(actif.lease_expires_at)}).`);
      await tx.execute({ sql: `update llm_run set status = 'interrompue', reason = 'bail expiré', finished_at = ?, lease_expires_at = null where id = ?`, args: [now, String(actif.id)] });
      await tx.execute({ sql: `update llm_call set status = 'erreur', error = 'exécution interrompue, facturation inconnue', finished_at = ? where run_id = ? and status = 'reserve'`, args: [now, String(actif.id)] });
    }
    await tx.execute({
      sql: `insert into llm_run (id, started_at, status, lease_expires_at, max_items, cap_run_micro_usd, cap_total_micro_usd) values (?, ?, 'en_cours', ?, ?, ?, ?)`,
      args: [runId, now, bail, o.maxItems, o.capRunMicroUsd, o.capTotalMicroUsd],
    });
    await tx.commit();
  } finally {
    tx.close();
  }
}

/** Brouillons « à vérifier » encore jamais relancés, dont la publication attend toujours : les plus récents d'abord. */
async function aRelancer(client: Client, limite: number) {
  const r = await client.execute({
    sql: `select d.id, d.news_item_id, d.snapshot_id, d.information_type, d.content, n.title, n.announced_at, v.version, pr.name as produit,
            c.title as snapshot_title, c.content as capture, c.content_format, s.name as source_nom
          from post_draft d
          join post p on p.news_item_id = d.news_item_id and p.status = 'a_verifier'
          join news_item n on n.id = d.news_item_id and n.kind in ('annonce', 'version')
          join document_snapshot c on c.id = d.snapshot_id
          join source_document doc on doc.id = c.document_id
          join source s on s.id = doc.source_id
          left join news_item_target t on t.news_item_id = n.id
          left join product_version v on v.id = t.product_version_id
          left join product pr on pr.id = t.product_id
          where d.status = 'a_verifier' and d.content is not null
            and not exists (select 1 from llm_call x where x.news_item_id = d.news_item_id and x.stage = 'relance')
          order by d.created_at desc, d.id desc
          limit ?`,
    args: [limite],
  });
  return r.rows;
}

export async function genererBrouillons(o: OptionsBrouillons) {
  const client = o.database.client;
  const horloge = o.clock ?? (() => new Date());
  const now = () => horloge().toISOString();
  const dureeBail = o.dureeBailMs ?? DUREE_BAIL_MS;
  const finDeBail = () => new Date(horloge().getTime() + dureeBail).toISOString();
  const reprendre = o.estReprenable ?? estReprenable;
  const attendre = o.attente ?? sleep;
  // Une seule opération à la fois sur ce client : condition de withBusyRetry.
  const ecrire = <T>(operation: () => Promise<T>) => withBusyRetry(client, operation);
  const runId = randomUUID();
  const plafonds: Plafonds = { runId, capRunMicroUsd: o.capRunMicroUsd, capTotalMicroUsd: o.capTotalMicroUsd };
  await ecrire(() => synchroniserComptes(client, now()));
  await ecrire(() => ouvrirExecution(client, o, runId, now(), finDeBail()));

  /** Un lot clos par un autre pendant son absence s'arrête : il ne doit ni payer ni écrire. */
  const renouvelerBail = async () => {
    const r = await ecrire(() => client.execute({ sql: `update llm_run set lease_expires_at = ? where id = ? and status = 'en_cours'`, args: [finDeBail(), runId] }));
    if (r.rowsAffected === 0) throw new BailPerdu('bail perdu : exécution close par un autre lot');
  };

  /**
   * Pendant l'attente du modèle, seul ce battement utilise le client : il garde le bail d'un processus vivant.
   * Après un échec, la connexion est rouverte : libSQL la laisserait inutilisable pour les écritures suivantes (voir withBusyRetry).
   */
  async function appelSousBail(requete: RequeteModele) {
    const battement = setInterval(() => void client.execute({ sql: `update llm_run set lease_expires_at = ? where id = ? and status = 'en_cours'`, args: [finDeBail(), runId] }).catch(() => client.reconnect()).catch(() => {}), dureeBail / 3);
    try {
      return await o.modele.appeler(requete);
    } finally {
      clearInterval(battement);
    }
  }

  async function appeler<T>(newsItemId: number, stage: keyof typeof MAX_TOKENS, systeme: string, utilisateur: string, schema: z.ZodType<T>): Promise<Sortie<T>> {
    let maxTokens = MAX_TOKENS[stage];
    for (let attempt = 1; attempt <= MAX_TENTATIVES; attempt++) {
      if (await isPaused(o.database.db)) throw new ArretPause('pause active');
      await renouvelerBail();
      const requete: RequeteModele = { modele: o.nomModele, systeme, utilisateur, maxTokens, schema: schemaSortie(schema), imposerSchema: schema !== (Brouillon as z.ZodType) };
      let inputTokens: number;
      try {
        inputTokens = await o.modele.compter(requete);
      } catch (e) {
        if (!reprendre(e) || attempt === MAX_TENTATIVES) throw e;
        await attendre(PAUSE_REPRISE_MS * attempt);
        continue;
      }
      await renouvelerBail();
      let id: number;
      try {
        id = await ecrire(() => reserver(client, plafonds, { newsItemId, stage, attempt, model: o.nomModele, promptVersion: PROMPT_VERSION, inputTokens, maxTokens }, now()));
      } catch (e) {
        // Le premier essai tronqué est payé : sans marge pour le second, le résultat devient définitif, sinon chaque relance le repaierait.
        if (e instanceof BudgetInsuffisant && maxTokens > MAX_TOKENS[stage]) return { ok: false, statut: 'sortie_tronquee' };
        throw e;
      }
      try {
        const r = await appelSousBail(requete);
        await ecrire(() => solder(client, id, o.nomModele, r.usage, r.stop, now()));
        if (r.stop === 'refusal') return { ok: false, statut: 'refus' };
        if (r.stop === 'max_tokens') {
          if (attempt === MAX_TENTATIVES) return { ok: false, statut: 'sortie_tronquee' };
          maxTokens *= 2;
          continue;
        }
        if (r.stop !== 'end_turn') return { ok: false, statut: 'sortie_invalide' };
        const lu = lireSortie(r.texte, schema);
        if (lu.ok) return { ok: true, valeur: lu.valeur };
        // Sortie illisible (2026-11-10 : 21 brouillons perdus en 3 jours, dont l'annonce de Claude Fable 5.2, sans motif
        // gardé) : le motif est noté sur l'appel, puis la même demande est refaite une fois, réservée au budget comme la première.
        await ecrire(() => client.execute({ sql: 'update llm_call set error = ? where id = ?', args: [`sortie illisible : ${lu.motif}`.slice(0, 300), id] }));
        // Seules la qualification et la rédaction sont redemandées : sans elles, le sujet est perdu ; une révision ou une
        // relance ratée laisse le brouillon tel quel.
        if (attempt === MAX_TENTATIVES || (stage !== 'qualification' && stage !== 'redaction')) return { ok: false, statut: 'sortie_invalide' };
      } catch (e) {
        await ecrire(() => marquerErreur(client, id, redactSecrets(e instanceof Error ? e.message : String(e)), now()));
        if (!reprendre(e) || attempt === MAX_TENTATIVES) throw e;
        await attendre(PAUSE_REPRISE_MS * attempt);
      }
    }
    return { ok: false, statut: 'sortie_invalide' };
  }

  let statut = 'terminee';
  let motif: string | null = null;
  const bilan = { relances: 0, relances_publiables: 0, revisions_gardees: 0, ecartees: 0, anciennes: 0, a_approfondir: 0, invalides: 0, tronquees: 0, refus: 0, rejetees: 0, a_verifier: 0, controlees: 0, sans_texte: 0, trop_longues: 0, qualifications_reprises: 0 };
  try {
    // Relance (décision de l'utilisateur du 2026-11-05) : avant les nouveaux sujets, quelques brouillons restés « à
    // vérifier » reçoivent une seconde révision guidée par leurs écarts. Elle n'est gardée que si elle passe tous les
    // contrôles, au besoin après élagage des champs secondaires ; sinon rien ne change. Un brouillon n'est relancé qu'une fois.
    for (const row of await aRelancer(client, MAX_RELANCES_PAR_LOT)) {
      const newsItemId = Number(row.news_item_id);
      const { date_annonce, nature, categories, produit: produitBrouillon, version_cible, niveau_preuve, ...reste } = JSON.parse(String(row.content)) as Record<string, unknown>;
      const lu = Brouillon.safeParse(reste);
      if (!lu.success) continue;
      const titreCapture = String(row.snapshot_title);
      const texte = toPlainText(String(row.capture), String(row.content_format));
      const produitCatalogue = row.produit === null ? null : String(row.produit);
      const version = row.version === null ? null : String(row.version);
      const def = SOURCES.find((x) => x.name === String(row.source_nom));
      const attribution = def?.kind === 'feed' || def?.kind === 'hackernews' ? (def.attribution ?? null) : null;
      const doc = documentUtilisateur(titreCapture, texte, produitCatalogue, { source: String(row.source_nom), annonce: row.announced_at === null ? null : String(row.announced_at), attribution });
      const contexteControle = {
        typeInformation: row.information_type === null ? undefined : String(row.information_type),
        produit: produitCatalogue ?? (produitBrouillon as string | null),
        produitCatalogue: produitCatalogue !== null,
        dateAnnonce: row.announced_at === null ? null : String(row.announced_at),
        autresCaptures: await autresCaptures(client, newsItemId, Number(row.snapshot_id)),
        source: String(row.source_nom),
        externe: attribution,
      };
      const controler = (x: Brouillon) => controlerBrouillon(x, [titreCapture, texte], String(row.title), version, contexteControle);
      const controles = controler(lu.data);
      if (controles.length === 0 || controles.some((c) => CODES_BLOQUANTS.has(c.code))) continue;
      bilan.relances++;
      const relance = await appeler(newsItemId, 'relance', SYSTEME_REDACTION, messageRevision(doc, lu.data, controles), Brouillon);
      if (!relance.ok) continue;
      const apres = controler(relance.valeur);
      const elague = apres.length > 0 ? elaguer(relance.valeur, apres) : null;
      const final = apres.length === 0 ? relance.valeur : elague && controler(elague.brouillon).length === 0 ? elague.brouillon : null;
      if (!final) {
        // Relance non gardée : ses écarts restants sont notés sur l'appel, pour savoir ce qui bloque encore.
        const restants = [...new Set(apres.map((c) => `${c.champ}:${c.code}`))].join(', ');
        await ecrire(() => client.execute({
          sql: `update llm_call set error = ? where id = (select max(id) from llm_call where run_id = ? and news_item_id = ? and stage = 'relance')`,
          args: [`relance non gardée, écarts restants : ${restants}`.slice(0, 500), runId, newsItemId],
        }));
        continue;
      }
      const contenu = { ...final, date_annonce, nature, categories, produit: produitBrouillon, version_cible, niveau_preuve };
      // La relance réussie remplace le contenu du brouillon ; les écarts de la version précédente restent, marqués retirés.
      const ecarts = [...controles, ...(elague && apres.length > 0 ? apres : [])].map((c) => ({ ...c, retire: true }));
      const revision = await revisionElaguee(client, newsItemId, Number(row.id), final, now());
      await ecrire(() => client.batch([
        { sql: `update post_draft set status = 'controle_automatique', content = ?, checks = ?, rejection_reason = null where id = ? and status = 'a_verifier'`, args: [JSON.stringify(contenu), JSON.stringify(ecarts), Number(row.id)] },
        ...revision,
        { sql: `update post set status = 'brouillon' where news_item_id = ? and status = 'a_verifier'`, args: [newsItemId] },
      ], 'write'));
      bilan.relances_publiables++;
    }
    const { lignes, sansTexte, tropLongues } = await aTraiter(client, o.maxItems, o.sources);
    bilan.sans_texte = sansTexte;
    bilan.trop_longues = tropLongues;
    for (const row of lignes) {
      const id = Number(row.id);
      const titre = String(row.title);
      const titreCapture = String(row.snapshot_title);
      const produit = row.produit === null ? null : String(row.produit);
      const version = row.version === null ? null : String(row.version);
      const texte = toPlainText(String(row.content), String(row.content_format));
      const annonce = row.announced_at === null ? null : String(row.announced_at);
      const def = SOURCES.find((x) => x.name === String(row.source_nom));
      const attribution = def?.kind === 'feed' || def?.kind === 'hackernews' ? (def.attribution ?? null) : null;
      const compteImpose = def?.compte ?? null;
      const doc = documentUtilisateur(titreCapture, texte, produit, { source: String(row.source_nom), annonce, attribution });
      const enregistrer = (status: string, q: Qualification | null, content: unknown, checks: unknown, motifRejet: string | null, diapositives?: DiapositiveResolue[], selection?: Selection) =>
        ecrire(async () => {
          const tx = await client.transaction('write');
          try {
            const actif = await tx.execute({ sql: `select 1 from llm_run where id = ? and status = 'en_cours'`, args: [runId] });
            if (actif.rows.length === 0) throw new BailPerdu('bail perdu : résultat non enregistré');
            const draft = await tx.execute({
              sql: `insert into post_draft (news_item_id, run_id, status, account, rejection_reason, information_type, snapshot_id, model, prompt_version, content, checks, created_at)
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(news_item_id) do update set run_id = excluded.run_id, status = excluded.status, account = excluded.account, rejection_reason = excluded.rejection_reason,
                      information_type = excluded.information_type, snapshot_id = excluded.snapshot_id, model = excluded.model, prompt_version = excluded.prompt_version,
                      content = excluded.content, checks = excluded.checks, created_at = excluded.created_at
                    where post_draft.status in ('qualifiee', 'a_approfondir')
                    returning id`,
              args: [id, runId, status, q?.compte ?? null, motifRejet, q?.type_information ?? null, Number(row.snapshot_id), o.nomModele, PROMPT_VERSION,
                content ? JSON.stringify(content) : null, checks ? JSON.stringify(checks) : null, now()],
            });
            if (draft.rows.length === 0) throw new Error(`résultat déjà définitif pour l'actualité ${id}`);
            // La décision, ses critères et ses passages restent consultables, que le sujet soit retenu ou non.
            if (selection) {
              const juge = q ? o.nomModele : 'code';
              const version = consignesActuelles().version;
              const criteres = q ? JSON.stringify(q.criteres) : null;
              // Les anciennes lignes restent : un humain a pu les voir. Elles ne comptent simplement plus. Seule une ligne identique est gardée.
              await tx.execute({
                sql: `update selection_decision set remplacee_le = ? where news_item_id = ? and origine in ('modele', 'regles') and remplacee_le is null
                        and not (juge = ? and consignes_version = ? and snapshot_id = ? and prompt_version = ? and decision = ? and motif = ? and criteres is ?)`,
                args: [now(), id, juge, version, Number(row.snapshot_id), PROMPT_VERSION, selection.decision, selection.motif, criteres],
              });
              await tx.execute({
                sql: `insert into selection_decision (news_item_id, origine, juge, consignes_version, prompt_version, decision, criteres, motif, passages, snapshot_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      on conflict(news_item_id, juge, consignes_version, snapshot_id, prompt_version) where remplacee_le is null do nothing`,
                args: [id, q ? 'modele' : 'regles', juge, version, PROMPT_VERSION, selection.decision, criteres, selection.motif, JSON.stringify(q ? passagesRetrouves(q.passages, [titreCapture, texte]) : []), Number(row.snapshot_id), now()],
              });
            }
            if (diapositives) {
              await creerPublication(tx, {
                draftId: Number(draft.rows[0]!.id), compte: q!.compte!, newsItemId: id, statutBrouillon: status, contenu: content as Record<string, unknown>,
                documentId: Number(row.document_id), snapshotId: Number(row.snapshot_id), diapositives, now: now(),
              });
            }
            await tx.commit();
          } finally {
            tx.close();
          }
        });

      let q = qualificationReprise(row, o.nomModele);
      const reprise = q !== null;
      if (q) {
        bilan.qualifications_reprises++;
      } else {
        const ancienne = o.ageMaxJours === undefined ? null : preselection({ annonceLe: annonce, vuLe: String(row.first_seen_at) }, o.ageMaxJours);
        if (ancienne) { await enregistrer('ecartee', null, null, null, ancienne.motif, undefined, ancienne); bilan.anciennes++; continue; }
        const qualification = await appeler(id, 'qualification', SYSTEME_QUALIFICATION, doc, Qualification);
        if (!qualification.ok) {
          // Un sujet à approfondir le reste, sur la capture essayée : la suivante le fera repasser.
          if (row.etat === 'a_approfondir') await enregistrer('a_approfondir', null, JSON.parse(String(row.qualification)), null, qualification.statut);
          else await enregistrer(qualification.statut, null, null, null, null);
          // La décision précédente ne décrit plus l'état du sujet.
          await ecrire(() => client.execute({ sql: `update selection_decision set remplacee_le = ? where news_item_id = ? and origine in ('modele', 'regles') and remplacee_le is null`, args: [now(), id] }));
          bilan[BILAN_ECHEC[qualification.statut]]++;
          continue;
        }
        q = qualification.valeur;
      }
      // Agent imposé par la source (sources.ts) : Radar pour les grandes entreprises, Nodi pour AI Search. Seule exception :
      // la sortie d'un modèle d'IA reste à Nodi, même publiée par une grande entreprise (chacun sa spécialité).
      if (q.compte !== null) q = { ...q, compte: compteRetenu(compteImpose, q.compte) };
      // Recalculée aussi pour une qualification reprise : un garde-fou durci depuis s'applique sans rien repayer.
      const choix = deciderSelection(q, [titreCapture, texte]);
      if (choix.decision === 'ecarter') { await enregistrer('ecartee', q, null, null, choix.motif, undefined, choix); bilan.ecartees++; continue; }
      // Un sujet à approfondir n'est pas rédigé : aucune dépense de plus, et rien de douteux n'avance vers la publication.
      if (choix.decision === 'approfondir') { await enregistrer('a_approfondir', q, { qualification: q }, null, choix.motif, undefined, choix); bilan.a_approfondir++; continue; }
      // Payée, donc conservée avant la rédaction : une interruption ne la fera pas repayer.
      if (!reprise) await enregistrer('qualifiee', q, { qualification: q }, null, null, undefined, choix);
      const redaction = await appeler(id, 'redaction', SYSTEME_REDACTION, doc, Brouillon);
      if (!redaction.ok) { await enregistrer(redaction.statut, q, null, null, null); bilan[BILAN_ECHEC[redaction.statut]]++; continue; }
      // Le titre fait partie de la capture stockée : le modèle et le contrôle mot pour mot lisent le même texte.
      const contexteControle = {
        typeInformation: q.type_information,
        produit: produit ?? q.produit,
        produitCatalogue: produit !== null,
        dateAnnonce: row.announced_at === null ? null : String(row.announced_at),
        autresCaptures: await autresCaptures(client, id, Number(row.snapshot_id)),
        source: String(row.source_nom),
        externe: attribution,
      };
      const controler = (x: Brouillon) => controlerBrouillon(x, [titreCapture, texte], titre, version, contexteControle);
      let b = redaction.valeur;
      let controles = controler(b);
      // Autocorrection (2026-11-03) : une seule reprise, guidée par les écarts du code. Elle n'est gardée que si elle en
      // compte moins ; un échec de la reprise laisse le premier brouillon tel quel.
      if (controles.length > 0 && !controles.some((c) => CODES_BLOQUANTS.has(c.code))) {
        const revision = await appeler(id, 'revision', SYSTEME_REDACTION, messageRevision(doc, b, controles), Brouillon);
        if (revision.ok) {
          const apres = controler(revision.valeur);
          if (apres.length < controles.length && !apres.some((c) => CODES_BLOQUANTS.has(c.code))) { b = revision.valeur; controles = apres; bilan.revisions_gardees++; }
        }
      }
      const bloquant = controles.find((c) => CODES_BLOQUANTS.has(c.code));
      const statutBrouillon = bloquant ? 'rejete' : controles.length > 0 ? 'a_verifier' : 'controle_automatique';
      // La date, la version et le niveau de preuve viennent du code ; nature et catégories viennent de la qualification, sans contrôle déterministe. V1 : analyse documentaire seule.
      const contenu = {
        ...b, date_annonce: row.announced_at ?? null, nature: q.nature, categories: q.categories, produit: produit ?? q.produit,
        version_cible: version ?? 'version non précisée', niveau_preuve: NIVEAU_PREUVE_V1,
      };
      await enregistrer(statutBrouillon, q, contenu, controles, bloquant?.code ?? null, diapositivesDe(b));
      if (bloquant) bilan.rejetees++;
      else if (controles.length > 0) bilan.a_verifier++;
      else bilan.controlees++;
    }
  } catch (e) {
    if (e instanceof BudgetInsuffisant) statut = 'arret_budget';
    else if (e instanceof ArretPause) statut = 'arret_pause';
    else if (e instanceof BailPerdu) statut = 'interrompue';
    else statut = 'echec';
    motif = redactSecrets(e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  await ecrire(() => client.execute({ sql: `update llm_run set status = ?, reason = ?, finished_at = ?, lease_expires_at = null where id = ? and status = 'en_cours'`, args: [statut, motif, now(), runId] }));
  return { runId, statut, motif, ...bilan };
}
