// Tarifs officiels en dollars par million de tokens, relevés le 2026-11-01 sur
// https://platform.claude.com/docs/en/about-claude/pricing et https://api-docs.deepseek.com/quick_start/pricing.
// À revérifier avant tout lot réel.
interface Prix {
  entree: number;
  sortie: number;
  /** Lecture du cache. Sans valeur, l'entrée reste au plein prix. */
  cache?: number;
  /** Écriture du cache. Sans valeur, l'entrée reste au plein prix. */
  cacheEcrit?: number;
}

/**
 * `auDelaDe` : au-dessus de ce nombre de tokens d'entrée, toute la requête est facturée à ces prix.
 * `pleines` : prix des heures pleines, voir `heurePleine`.
 */
export const TARIFS: Record<string, Prix & { auDelaDe?: Prix & { tokens: number }; pleines?: Prix }> = {
  'claude-opus-5-5': { entree: 4, sortie: 20 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
  'claude-haiku-5-5': { entree: 0.1, sortie: 0.5, cache: 0.01, cacheEcrit: 0.125, auDelaDe: { tokens: 100_000, entree: 0.5, sortie: 2.5, cache: 0.05, cacheEcrit: 0.625 } },
  'deepseek-flash': { entree: 0.15, sortie: 0.6, cache: 0.003, pleines: { entree: 0.3, sortie: 1.2, cache: 0.006 } },
};

/**
 * DeepSeek : 01–04 h et 06–10 h UTC, du lundi au vendredi. Les jours fériés chinois, en heures creuses, ne sont pas connus
 * ici : ces jours-là, le coût calculé est majoré, jamais minoré.
 */
export function heurePleine(quand: Date): boolean {
  const jour = quand.getUTCDay();
  const heure = quand.getUTCHours();
  return jour >= 1 && jour <= 5 && ((heure >= 1 && heure < 4) || (heure >= 6 && heure < 10));
}

export interface OptionsCout {
  /** Tokens d'entrée lus dans le cache, compris dans `entree`. */
  cache?: number;
  /** Tokens d'entrée écrits dans le cache, compris dans `entree`. */
  cacheEcrit?: number;
  /** Date de l'appel. Sans elle, un modèle à heures pleines est compté au prix fort. */
  quand?: string;
}

/** Coût en millionièmes de dollar : tokens × $/MTok, arrondi au supérieur. Un modèle sans tarif connu est refusé. */
export function coutMicroUsd(modele: string, entree: number, sortie: number, options: OptionsCout = {}): number {
  const tarif = TARIFS[modele];
  if (!tarif) throw new Error(`Tarif inconnu pour le modèle ${modele}.`);
  const { cache = 0, cacheEcrit = 0, quand } = options;
  const prix = tarif.auDelaDe && entree > tarif.auDelaDe.tokens ? tarif.auDelaDe
    : tarif.pleines && (quand === undefined || heurePleine(new Date(quand))) ? tarif.pleines
    : tarif;
  const plein = Math.max(0, entree - cache - cacheEcrit);
  return Math.ceil(plein * prix.entree + cache * (prix.cache ?? prix.entree) + cacheEcrit * (prix.cacheEcrit ?? prix.entree) + sortie * prix.sortie);
}
