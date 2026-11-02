// Évaluation de la sélection sur des avis humains donnés à l'aveugle. Le pire défaut est un sujet publié à tort : il est
// compté à part, et une version qui en ajoute est refusée quel que soit son score global.
import { DECISIONS, type Decision } from './consignes.ts';

export interface Cas {
  id: number;
  decision: Decision;
  humain: Decision;
}

export interface Bilan {
  n: number;
  accords: number;
  taux_accord: number | null;
  /** Le système publie, l'humain aurait écarté ou approfondi. */
  publies_a_tort: number;
  /** L'humain publierait, le système écarte : l'approfondissement n'est pas compté, il ne perd pas le sujet. */
  manques: number;
  precision_publier: number | null;
  rappel_publier: number | null;
  matrice: Record<Decision, Record<Decision, number>>;
}

const taux = (partie: number, tout: number) => (tout === 0 ? null : partie / tout);

export function evaluer(cas: Cas[]): Bilan {
  const matrice = Object.fromEntries(DECISIONS.map((d) => [d, Object.fromEntries(DECISIONS.map((h) => [h, 0]))])) as Bilan['matrice'];
  for (const c of cas) matrice[c.decision][c.humain]++;
  const accords = cas.filter((c) => c.decision === c.humain).length;
  const publies = cas.filter((c) => c.decision === 'publier');
  const humainsPublies = cas.filter((c) => c.humain === 'publier');
  const justes = publies.filter((c) => c.humain === 'publier').length;
  return {
    n: cas.length,
    accords,
    taux_accord: taux(accords, cas.length),
    publies_a_tort: publies.length - justes,
    manques: humainsPublies.filter((c) => c.decision === 'ecarter').length,
    precision_publier: taux(justes, publies.length),
    rappel_publier: taux(justes, humainsPublies.length),
    matrice,
  };
}

/** Test du signe bilatéral exact : probabilité d'un tel déséquilibre si les deux versions se valaient. */
export function testDuSigne(corriges: number, degrades: number): number {
  const n = corriges + degrades;
  if (n === 0) return 1;
  const k = Math.min(corriges, degrades);
  let somme = 0;
  let combinaison = 1;
  for (let i = 0; i <= k; i++) {
    somme += combinaison;
    combinaison = (combinaison * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * somme) / 2 ** n);
}

export type Verdict = 'amelioration_demontree' | 'amelioration_non_demontree' | 'pas_de_changement' | 'degradation' | 'refusee_publie_a_tort';

export interface Comparaison {
  n: number;
  corriges: number[];
  degrades: number[];
  p: number;
  verdict: Verdict;
}

export const SEUIL_P = 0.05;

/** Comparaison appariée sur les mêmes sujets. Sans ces conditions, une nouvelle version n'est pas déclarée meilleure. */
export function comparer(avant: Cas[], apres: Cas[]): Comparaison {
  const anciens = new Map(avant.map((c) => [c.id, c]));
  const paires = apres.flatMap((c) => {
    const a = anciens.get(c.id);
    return a ? [{ a, b: c }] : [];
  });
  const corriges = paires.filter(({ a, b }) => a.decision !== a.humain && b.decision === b.humain).map(({ b }) => b.id);
  const degrades = paires.filter(({ a, b }) => a.decision === a.humain && b.decision !== b.humain).map(({ b }) => b.id);
  const p = testDuSigne(corriges.length, degrades.length);
  // Sujet par sujet, appariés ou non : une publication à tort nouvelle ne se rachète pas par une autre qui disparaît.
  const nouveauxTorts = apres.filter((b) => b.decision === 'publier' && b.humain !== 'publier' && anciens.get(b.id)?.decision !== 'publier');
  let verdict: Verdict;
  if (nouveauxTorts.length > 0) verdict = 'refusee_publie_a_tort';
  else if (corriges.length === 0 && degrades.length === 0) verdict = 'pas_de_changement';
  else if (degrades.length >= corriges.length) verdict = 'degradation';
  else verdict = p < SEUIL_P ? 'amelioration_demontree' : 'amelioration_non_demontree';
  return { n: paires.length, corriges, degrades, p, verdict };
}
