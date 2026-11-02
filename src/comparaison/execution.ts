// Comparaison de modèles sur un même lot. Chaque modèle qualifie et rédige tous les sujets, y compris ceux qu'il écarte :
// sinon les brouillons ne porteraient pas sur les mêmes textes. Prompts, schémas et contrôles sont ceux du moteur.
// Rien ne devient un brouillon ni une publication : tout reste dans `comparaison_sortie`.
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { BudgetInsuffisant, marquerErreur, reserver, solder, type Plafonds } from '../analysis/budget.ts';
import { controlerBrouillon } from '../analysis/controles.ts';
import { schemaSortie, type Modele, type RequeteModele } from '../analysis/modele.ts';
import { autresCaptures, DUREE_BAIL_MS, MAX_TENTATIVES, MAX_TOKENS } from '../analysis/pipeline.ts';
import { documentUtilisateur, PROMPT_VERSION, SYSTEME_QUALIFICATION, SYSTEME_REDACTION } from '../analysis/prompts.ts';
import { Brouillon, Qualification } from '../analysis/schemas.ts';
import { redactSecrets } from '../config.ts';
import { isPaused } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { deciderSelection } from '../selection/consignes.ts';
import { lotDeComparaison, type SujetLot } from './lot.ts';

/** Budget total accordé par l'utilisateur le 2026-11-01, tous modèles confondus. */
export const PLAFOND_COMPARAISON_MICRO_USD = 1_000_000;
/** Sorties inexploitables d'affilée pour un même modèle : au-delà, le lot s'arrête au lieu de payer une erreur de réglage. */
export const ARRET_APRES_ECHECS = 3;
const PAUSE_REPRISE_MS = 1_000;
const GRAINE_ORDRE = 'comparaison-2026-11-01';

export type Origine = 'reel' | 'simulation';
export type Statut = 'valide' | 'json_invalide' | 'schema_invalide' | 'tronquee' | 'refus' | 'erreur';
type Etape = keyof typeof MAX_TOKENS;

export interface Bras {
  id: string;
  modele: string;
  reglage: string;
  client: Modele;
  reprenable: (e: unknown) => boolean;
}

export interface OptionsComparaison {
  database: Database;
  bras: Bras[];
  origine: Origine;
  capMicroUsd: number;
  clock?: () => Date;
  attente?: (ms: number) => Promise<unknown>;
}

class ArretPause extends Error {}
class ArretFormat extends Error {}

interface Resultat<T> {
  statut: Statut;
  valeur: T | null;
  brut: string | null;
  tentatives: number;
  dureeMs: number | null;
  entree: number | null;
  cache: number | null;
  sortie: number | null;
  raisonnement: number | null;
  appels: number[];
  erreur: string | null;
}

/** L'ordre des modèles alterne selon une empreinte fixe : aucun ne bénéficie toujours d'un service moins chargé. */
const dansLOrdre = <T>(id: number, bras: T[]) => (createHash('sha256').update(`${GRAINE_ORDRE}|${id}`).digest()[0]! % 2 === 0 ? bras : [...bras].reverse());

export async function comparerModeles(o: OptionsComparaison) {
  if (o.capMicroUsd > PLAFOND_COMPARAISON_MICRO_USD) throw new Error('Plafond supérieur au budget accordé de 1 $.');
  const client = o.database.client;
  const horloge = o.clock ?? (() => new Date());
  const now = () => horloge().toISOString();
  const attendre = o.attente ?? sleep;
  const ecrire = <T>(operation: () => Promise<T>) => withBusyRetry(client, operation);
  const finDeBail = () => new Date(horloge().getTime() + DUREE_BAIL_MS).toISOString();
  const runId = randomUUID();
  // Le plafond porte aussi sur le total : relancer le lot ne peut pas dépasser le budget accordé.
  const plafonds: Plafonds = { runId, capRunMicroUsd: o.capMicroUsd, capTotalMicroUsd: o.capMicroUsd };

  const actif = (await client.execute(`select id from llm_run where status = 'en_cours'`)).rows[0];
  if (actif) throw new Error(`Un lot est déjà en cours (${String(actif.id)}).`);
  await ecrire(() => client.execute({
    sql: `insert into llm_run (id, started_at, status, lease_expires_at, max_items, cap_run_micro_usd, cap_total_micro_usd) values (?, ?, 'en_cours', ?, ?, ?, ?)`,
    args: [runId, now(), finDeBail(), 0, o.capMicroUsd, o.capMicroUsd],
  }));

  async function appeler<T>(b: Bras, sujet: SujetLot, etape: Etape, systeme: string, utilisateur: string, schema: z.ZodType<T>): Promise<Resultat<T>> {
    let maxTokens = MAX_TOKENS[etape];
    const r: Resultat<T> = { statut: 'erreur', valeur: null, brut: null, tentatives: 0, dureeMs: null, entree: null, cache: null, sortie: null, raisonnement: null, appels: [], erreur: null };
    for (let attempt = 1; attempt <= MAX_TENTATIVES; attempt++) {
      if (await isPaused(o.database.db)) throw new ArretPause('pause active');
      await ecrire(() => client.execute({ sql: `update llm_run set lease_expires_at = ? where id = ? and status = 'en_cours'`, args: [finDeBail(), runId] }));
      const requete: RequeteModele = { modele: b.modele, systeme, utilisateur, maxTokens, schema: schemaSortie(schema), imposerSchema: schema !== (Brouillon as z.ZodType) };
      r.tentatives = attempt;
      let inputTokens: number;
      try {
        inputTokens = await b.client.compter(requete);
      } catch (e) {
        r.erreur = redactSecrets(e instanceof Error ? e.message : String(e));
        if (!b.reprenable(e) || attempt === MAX_TENTATIVES) return r;
        await attendre(PAUSE_REPRISE_MS * attempt);
        continue;
      }
      const id = await ecrire(() => reserver(client, plafonds, { newsItemId: sujet.id, stage: etape, attempt, model: b.modele, promptVersion: PROMPT_VERSION, inputTokens, maxTokens }, now()));
      r.appels.push(id);
      const debut = performance.now();
      try {
        const reponse = await b.client.appeler(requete);
        r.dureeMs = Math.round(performance.now() - debut);
        await ecrire(() => solder(client, id, b.modele, reponse.usage, reponse.stop, now()));
        r.brut = reponse.texte;
        r.entree = reponse.usage.input;
        r.cache = reponse.usage.cache ?? 0;
        r.sortie = reponse.usage.output;
        r.raisonnement = reponse.usage.raisonnement ?? null;
        if (reponse.stop === 'refusal') { r.statut = 'refus'; return r; }
        if (reponse.stop === 'max_tokens') {
          r.statut = 'tronquee';
          if (attempt === MAX_TENTATIVES) return r;
          maxTokens *= 2;
          continue;
        }
        let json: unknown;
        try {
          if (reponse.stop !== 'end_turn') throw new Error(`arrêt ${String(reponse.stop)}`);
          json = JSON.parse(reponse.texte);
        } catch {
          r.statut = 'json_invalide';
          return r;
        }
        const lu = schema.safeParse(json);
        if (!lu.success) { r.statut = 'schema_invalide'; return r; }
        r.statut = 'valide';
        r.valeur = lu.data;
        return r;
      } catch (e) {
        r.erreur = redactSecrets(e instanceof Error ? e.message : String(e));
        await ecrire(() => marquerErreur(client, id, r.erreur!, now()));
        r.statut = 'erreur';
        if (!b.reprenable(e) || attempt === MAX_TENTATIVES) return r;
        await attendre(PAUSE_REPRISE_MS * attempt);
      }
    }
    return r;
  }

  async function dejaFaite(b: Bras, sujet: SujetLot, etape: Etape) {
    const ligne = (await client.execute({
      sql: `select statut, contenu from comparaison_sortie where origine = ? and bras = ? and news_item_id = ? and etape = ? and snapshot_id = ? and prompt_version = ?`,
      args: [o.origine, b.id, sujet.id, etape, sujet.snapshot_id, PROMPT_VERSION],
    })).rows[0];
    return ligne && ligne.statut !== 'erreur' ? { contenu: ligne.contenu === null ? null : JSON.parse(String(ligne.contenu)) as unknown } : null;
  }

  async function enregistrer<T>(b: Bras, sujet: SujetLot, etape: Etape, r: Resultat<T>, suite: { controles?: unknown; decision?: string; motif?: string } = {}) {
    const marques = r.appels.map(() => '?').join(',');
    const cout = r.appels.length === 0 ? 0 : Number((await client.execute({ sql: `select coalesce(sum(coalesce(actual_micro_usd, reserved_micro_usd)), 0) as total from llm_call where id in (${marques})`, args: r.appels })).rows[0]!.total);
    await ecrire(() => client.execute({
      sql: `insert into comparaison_sortie (run_id, origine, bras, modele, reglage, news_item_id, snapshot_id, etape, prompt_version, statut, tentatives, brut, contenu, controles, decision, motif, duree_ms, tokens_entree, tokens_cache, tokens_sortie, tokens_raisonnement, cout_micro_usd, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(origine, bras, news_item_id, etape, snapshot_id, prompt_version) do update set
              run_id = excluded.run_id, statut = excluded.statut, tentatives = excluded.tentatives, brut = excluded.brut, contenu = excluded.contenu, controles = excluded.controles,
              decision = excluded.decision, motif = excluded.motif, duree_ms = excluded.duree_ms, tokens_entree = excluded.tokens_entree, tokens_cache = excluded.tokens_cache,
              tokens_sortie = excluded.tokens_sortie, tokens_raisonnement = excluded.tokens_raisonnement, cout_micro_usd = comparaison_sortie.cout_micro_usd + excluded.cout_micro_usd,
              created_at = excluded.created_at
            where comparaison_sortie.statut = 'erreur'`,
      args: [runId, o.origine, b.id, b.modele, b.reglage, sujet.id, sujet.snapshot_id, etape, PROMPT_VERSION, r.statut, r.tentatives, r.brut, r.valeur === null ? null : JSON.stringify(r.valeur),
        suite.controles === undefined ? null : JSON.stringify(suite.controles), suite.decision ?? null, suite.motif ?? r.erreur, r.dureeMs, r.entree, r.cache, r.sortie, r.raisonnement, cout, now()],
    }));
  }

  const echecs = new Map<string, number>();
  const suivre = (b: Bras, statut: Statut) => {
    const inexploitable = statut === 'json_invalide' || statut === 'schema_invalide' || statut === 'erreur';
    const n = inexploitable ? (echecs.get(b.id) ?? 0) + 1 : 0;
    echecs.set(b.id, n);
    if (n >= ARRET_APRES_ECHECS) throw new ArretFormat(`${b.id} : ${n} sorties inexploitables d'affilée, dernier statut ${statut}`);
  };

  async function traiter(b: Bras, sujet: SujetLot) {
    const doc = documentUtilisateur(sujet.titre, sujet.texte, sujet.produit, { source: sujet.source_nom, annonce: sujet.annonce_le });
    const capture = [sujet.titre, sujet.texte];
    let qualification: Qualification | null = null;
    const qualifie = await dejaFaite(b, sujet, 'qualification');
    if (qualifie) {
      qualification = qualifie.contenu as Qualification | null;
    } else {
      const r = await appeler(b, sujet, 'qualification', SYSTEME_QUALIFICATION, doc, Qualification);
      qualification = r.valeur;
      const choix = r.valeur ? deciderSelection(r.valeur, capture) : null;
      await enregistrer(b, sujet, 'qualification', r, choix ? { decision: choix.decision, motif: choix.motif } : {});
      suivre(b, r.statut);
    }
    if (await dejaFaite(b, sujet, 'redaction')) return;
    const r = await appeler(b, sujet, 'redaction', SYSTEME_REDACTION, doc, Brouillon);
    const controles = r.valeur
      ? controlerBrouillon(r.valeur, capture, sujet.titre_actualite, sujet.version, {
          typeInformation: qualification?.type_information,
          produit: sujet.produit ?? qualification?.produit,
          produitCatalogue: sujet.produit !== null,
          dateAnnonce: sujet.annonce_le,
          autresCaptures: await autresCaptures(client, sujet.id, sujet.snapshot_id),
        })
      : undefined;
    await enregistrer(b, sujet, 'redaction', r, { controles });
    suivre(b, r.statut);
  }

  let statut = 'terminee';
  let motif: string | null = null;
  const lot = await lotDeComparaison(client);
  const sujets = lot.filter((s) => s.analysable);
  try {
    for (const sujet of sujets) for (const b of dansLOrdre(sujet.id, o.bras)) await traiter(b, sujet);
  } catch (e) {
    statut = e instanceof BudgetInsuffisant ? 'arret_budget' : e instanceof ArretPause ? 'arret_pause' : e instanceof ArretFormat ? 'arret_format' : 'echec';
    motif = redactSecrets(e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  await ecrire(() => client.execute({ sql: `update llm_run set status = ?, reason = ?, finished_at = ?, lease_expires_at = null where id = ? and status = 'en_cours'`, args: [statut, motif, now(), runId] }));
  return { runId, statut, motif, sujets: sujets.length, ignores: lot.length - sujets.length };
}
