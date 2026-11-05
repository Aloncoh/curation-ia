// Registre d'accès des sources (demande de l'utilisateur du 2026-11-05) : chaque échec de collecte est classé, et la
// source est reprise plus tard, à intervalles espacés, sans jamais être supprimée ni contournée.
// - Un code HTTP seul ne permet pas de conclure aux conditions juridiques d'utilisation : un 403 est un « refus d'accès
//   observé », jamais une « restriction contractuelle ». Celle-ci ne vient que d'une lecture des conditions, notée à la
//   main dans sources.ts (`differee`).
// - 429 : `Retry-After` respecté quand il existe, et espacement croissant de toute façon.
// - 5xx, délai, réseau : reprises espacées (15 min, puis le double à chaque échec, plafonné à 24 h) ; au-delà de huit
//   échecs de suite, une tentative par semaine : la source n'est jamais abandonnée sur un incident.

export type EtatAcces =
  | 'ok'
  | 'refus_acces'
  | 'restriction_contractuelle'
  | 'erreur_temporaire'
  | 'limitation_frequence'
  | 'page_supprimee'
  | 'absence_de_flux';

export const LIBELLES_ACCES: Record<EtatAcces, string> = {
  ok: 'accessible',
  refus_acces: 'refus d’accès observé',
  restriction_contractuelle: 'restriction contractuelle (conditions lues)',
  erreur_temporaire: 'erreur temporaire',
  limitation_frequence: 'limitation de fréquence',
  page_supprimee: 'page supprimée ou introuvable',
  absence_de_flux: 'absence de flux exploitable',
};

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;
/** Au-delà, une seule tentative par semaine. */
export const ECHECS_AVANT_SONDE_HEBDOMADAIRE = 8;

/** Classe un échec de collecte d'après ce qui a été observé (type d'erreur, code HTTP), sans en déduire de droit. */
export function classerEchec(e: { kind: string; status?: number | undefined }): Exclude<EtatAcces, 'ok' | 'restriction_contractuelle'> {
  if (e.kind === 'invalid_response') return 'absence_de_flux';
  if (e.kind === 'http_status' && e.status !== undefined) {
    if (e.status === 429) return 'limitation_frequence';
    if (e.status === 401 || e.status === 403 || e.status === 406 || e.status === 451) return 'refus_acces';
    if (e.status === 404 || e.status === 410) return 'page_supprimee';
  }
  // 5xx, délai dépassé, erreur réseau, redirection refusée, réponse trop grande : rien de définitif.
  return 'erreur_temporaire';
}

/** Durée demandée par un en-tête `Retry-After` (secondes ou date HTTP), en millisecondes ; null s'il est absent ou illisible. */
export function lireRetryAfter(valeur: string | undefined, maintenant: number): number | null {
  if (!valeur) return null;
  const v = valeur.trim();
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const date = Date.parse(v);
  return Number.isNaN(date) ? null : Math.max(0, date - maintenant);
}

/** Date de la prochaine tentative après `echecs` échecs consécutifs (celui-ci compris). */
export function prochainEssai(etat: EtatAcces, echecs: number, maintenant: number, retryAfterMs: number | null = null): string {
  const n = Math.max(1, echecs);
  let delai: number;
  if (n > ECHECS_AVANT_SONDE_HEBDOMADAIRE) delai = 7 * JOUR;
  else if (etat === 'limitation_frequence') delai = Math.min(30 * MINUTE * 2 ** (n - 1), JOUR);
  else if (etat === 'erreur_temporaire') delai = Math.min(15 * MINUTE * 2 ** (n - 1), JOUR);
  // Refus, page disparue, flux vide : rien ne changera dans l'heure ; on revérifie chaque jour, puis plus rarement.
  else delai = Math.min(JOUR * 2 ** (n - 1), 7 * JOUR);
  if (retryAfterMs !== null) delai = Math.max(delai, Math.min(retryAfterMs, 7 * JOUR));
  return new Date(maintenant + delai).toISOString();
}
