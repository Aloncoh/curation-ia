// Sonde de détection : interroge les sources à intervalle court pour mesurer ce qu'un cycle d'une minute obtiendrait.
// Rien n'entre dans le catalogue et aucun modèle n'est appelé. Le premier passage fixe la référence : une entrée déjà
// présente n'a pas été « détectée », seule une entrée apparue ensuite compte.
import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from '@libsql/client';
import { MAX_FEED_ENTRIES } from '../collect/feeds.ts';
import { SafeFetchError, type TransportResponse } from '../collect/safe-fetch.ts';
import { withBusyRetry } from '../db/retry.ts';
import type { SourceDefinition } from '../sources.ts';
import { adapterFor } from '../worker/collect.ts';
import { precisionDate } from './delais.ts';

export type Interrogateur = (url: string, headers: Record<string, string>, allowedHosts: readonly string[], maxBytes: number | undefined) => Promise<TransportResponse>;

export interface OptionsSonde {
  client: Client;
  definitions: SourceDefinition[];
  interroger: Interrogateur;
  dureeMs: number;
  intervalleMs: (definition: SourceDefinition) => number;
  /** Attente imposée après un refus de débit (403, 429). */
  retenueMs?: number;
  pasMs?: number;
  clock?: () => Date;
  attente?: (ms: number) => Promise<unknown>;
}

interface Etat {
  connus: Set<string> | null;
  etag: string | null;
  lastModified: string | null;
  prochaine: number;
  derniereVerification: string | null;
}

const entete = (r: TransportResponse, nom: string): string | null => {
  const valeur = r.headers[nom];
  return valeur === undefined ? null : Array.isArray(valeur) ? (valeur[0] ?? null) : valeur;
};
const entier = (texte: string | null): number | null => {
  const n = texte === null ? Number.NaN : Number(texte);
  return Number.isInteger(n) ? n : null;
};

/** Tout le flux, pas seulement les entrées que garde la collecte : sinon une entrée ancienne passerait pour nouvelle en remontant. */
const lectureComplete = (d: SourceDefinition): SourceDefinition => (d.kind === 'feed' ? { ...d, config: { ...d.config, maxItems: MAX_FEED_ENTRIES } } : d);

/** Hub WebSub annoncé par le flux (link rel="hub"), quel que soit l'ordre des attributs. */
export function hubWebsub(corps: string): string | null {
  for (const balise of corps.match(/<(?:atom:)?link\b[^>]*>/gi) ?? []) {
    if (!/\brel=["']hub["']/i.test(balise)) continue;
    const adresse = /\bhref=["']([^"']+)["']/i.exec(balise);
    if (adresse) return adresse[1]!;
  }
  return null;
}

export async function lancerSonde(o: OptionsSonde) {
  const horloge = o.clock ?? (() => new Date());
  const attendre = o.attente ?? sleep;
  const pas = o.pasMs ?? 1_000;
  const retenue = o.retenueMs ?? 15 * 60_000;
  const fin = horloge().getTime() + o.dureeMs;
  const etats = new Map<string, Etat>(o.definitions.map((d) => [d.id, { connus: null, etag: null, lastModified: null, prochaine: 0, derniereVerification: null }]));
  const bilan = { requetes: 0, reponses304: 0, erreurs: 0, detections: 0, ecritures_perdues: 0 };

  /** Le quota GitHub est commun à tous les dépôts : un refus ou un quota épuisé retient tout l'hôte. */
  const retenirHote = (definition: SourceDefinition, jusqua: number) => {
    for (const d of o.definitions) if (d.allowedHosts[0] === definition.allowedHosts[0]) etats.get(d.id)!.prochaine = Math.max(etats.get(d.id)!.prochaine, jusqua);
  };

  /** Une écriture ratée perd une trace, pas la mesure : la sonde continue et le bilan le dit. */
  async function ecrire(sql: string, args: (string | number | null)[]): Promise<boolean> {
    try {
      await withBusyRetry(o.client, () => o.client.execute({ sql, args }));
      return true;
    } catch {
      bilan.ecritures_perdues++;
      return false;
    }
  }

  async function sonder(definition: SourceDefinition, etat: Etat): Promise<void> {
    const adaptateur = adapterFor(lectureComplete(definition));
    const conditionnelle = etat.etag !== null || etat.lastModified !== null;
    const entetes: Record<string, string> = { ...adaptateur.headers };
    if (etat.etag) entetes['if-none-match'] = etat.etag;
    if (etat.lastModified) entetes['if-modified-since'] = etat.lastModified;
    const debut = horloge();
    let reponse: TransportResponse | null = null;
    let statut: number | null = null;
    let erreur: string | null = null;
    try {
      reponse = await o.interroger(adaptateur.url, entetes, definition.allowedHosts, definition.maxResponseBytes);
      statut = reponse.status;
    } catch (e) {
      erreur = e instanceof SafeFetchError ? e.kind : 'interne';
      statut = e instanceof SafeFetchError ? (e.status ?? null) : null;
      if (statut === 403 || statut === 429) retenirHote(definition, horloge().getTime() + retenue);
    }
    const duree = horloge().getTime() - debut.getTime();
    const finVerification = horloge().toISOString();
    let nouvelles = 0;
    let hub: string | null = null;
    if (reponse && reponse.status !== 304) {
      const corps = reponse.body.toString('utf8');
      hub = hubWebsub(corps);
      try {
        const { documents } = adaptateur.parse(corps);
        // Les validateurs ne s'adoptent qu'après lecture : un 304 ne doit jamais masquer un corps resté illisible.
        etat.etag = entete(reponse, 'etag');
        etat.lastModified = entete(reponse, 'last-modified');
        if (etat.connus === null) {
          etat.connus = new Set(documents.map((d) => d.externalId));
        } else {
          for (const d of documents.filter((doc) => !etat.connus!.has(doc.externalId))) {
            etat.connus.add(d.externalId);
            nouvelles++;
            bilan.detections++;
            await ecrire(
              `insert into detection_observee (source_id, external_id, title, announced_at, precision, first_seen_at, previous_check_at) values (?, ?, ?, ?, ?, ?, ?)
               on conflict(source_id, external_id) do nothing`,
              [definition.id, d.externalId, d.title, d.announcedAt, precisionDate(d.announcedAt), finVerification, etat.derniereVerification ?? debut.toISOString()],
            );
          }
        }
      } catch {
        erreur = 'format';
      }
    }
    bilan.requetes++;
    if (reponse?.status === 304) bilan.reponses304++;
    if (erreur) bilan.erreurs++;
    // Une vérification ratée n'a rien vérifié : la fenêtre de détection repart de la dernière réussie.
    else etat.derniereVerification = finVerification;
    await ecrire(
      `insert into sonde_requete (source_id, started_at, duration_ms, http_status, bytes, conditional, has_etag, has_last_modified, cache_control, age_seconds, rate_remaining, websub_hub, new_entries, error_kind)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        definition.id, debut.toISOString(), duree, statut, reponse?.body.length ?? 0, conditionnelle ? 1 : 0,
        reponse && entete(reponse, 'etag') ? 1 : 0, reponse && entete(reponse, 'last-modified') ? 1 : 0, reponse ? entete(reponse, 'cache-control') : null,
        reponse ? entier(entete(reponse, 'age')) : null, reponse ? entier(entete(reponse, 'x-ratelimit-remaining')) : null, hub, nouvelles, erreur,
      ],
    );
    // Quota presque épuisé : l'hôte attend sa remise à zéro au lieu d'être refusé.
    const restant = reponse ? entier(entete(reponse, 'x-ratelimit-remaining')) : null;
    const remise = reponse ? entier(entete(reponse, 'x-ratelimit-reset')) : null;
    if (restant !== null && restant <= 2 && remise !== null) retenirHote(definition, remise * 1000);
  }

  while (horloge().getTime() < fin) {
    for (const definition of o.definitions) {
      const etat = etats.get(definition.id)!;
      const maintenant = horloge().getTime();
      if (maintenant >= fin) break;
      if (maintenant < etat.prochaine) continue;
      etat.prochaine = maintenant + o.intervalleMs(definition);
      await sonder(definition, etat);
    }
    await attendre(pas);
  }
  return bilan;
}
