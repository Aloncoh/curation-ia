// Statut de sortie et état du dépôt, calculés par le code à partir de la capture `depot` (ADR 0011 §2 et §3).
// Prudence voulue : une date inconnue ne fait jamais une nouvelle sortie ; pour un skill dans un dépôt, seule la date du
// dépôt est connue, plus ancienne que le skill, ce qui peut classer un vrai nouveau skill « ressource existante ».
import type { MetadonneesDepot } from './capture.ts';
import type { EtatDepot, StatutSortie } from './schemas.ts';

const JOUR_MS = 86_400_000;

/** `nouvelle_sortie` seulement si la création est connue et précède la capture de `seuilJours` au plus. */
export function statutSortie(creeLe: string | null, captureLe: string, seuilJours: number): StatutSortie {
  if (!creeLe) return 'ressource_existante';
  const cree = Date.parse(creeLe);
  const capture = Date.parse(captureLe);
  if (Number.isNaN(cree) || Number.isNaN(capture)) return 'ressource_existante';
  const ecart = capture - cree;
  return ecart >= 0 && ecart <= seuilJours * JOUR_MS ? 'nouvelle_sortie' : 'ressource_existante';
}

/** Bloc « État du dépôt », daté par la capture : étoiles « au <date> », une information et pas un critère. */
export function etatDepot(m: MetadonneesDepot, captureLe: string, inactiviteJours: number): EtatDepot {
  const push = m.pushed_at ? Date.parse(m.pushed_at) : Number.NaN;
  const joursSansPush = Number.isNaN(push) ? null : Math.max(0, Math.floor((Date.parse(captureLe) - push) / JOUR_MS));
  const licence = m.license?.spdx_id && m.license.spdx_id !== 'NOASSERTION' ? m.license.spdx_id : null;
  return {
    full_name: m.full_name,
    html_url: m.html_url,
    etoiles: m.stargazers_count,
    etoiles_au: captureLe,
    cree_le: m.created_at,
    dernier_push: m.pushed_at,
    jours_sans_push: joursSansPush,
    inactif: joursSansPush !== null && joursSansPush > inactiviteJours,
    licence,
    archive: m.archived,
    fork: m.fork,
    parent: m.parent,
    date_ajout_skill: null,
  };
}
