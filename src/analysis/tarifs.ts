// Tarifs officiels en dollars par million de tokens, relevés le 2026-10-31 sur
// https://platform.claude.com/docs/en/about-claude/pricing. À revérifier avant tout lot réel.
interface Prix {
  entree: number;
  sortie: number;
}

/** `auDelaDe` : au-dessus de ce nombre de tokens d'entrée, toute la requête est facturée à ces prix. */
export const TARIFS: Record<string, Prix & { auDelaDe?: Prix & { tokens: number } }> = {
  'claude-opus-5-5': { entree: 4, sortie: 20 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
  'claude-haiku-5-5': { entree: 0.1, sortie: 0.5, auDelaDe: { tokens: 100_000, entree: 0.5, sortie: 2.5 } },
};

/** Coût en millionièmes de dollar : tokens × $/MTok, arrondi au supérieur. Un modèle sans tarif connu est refusé. */
export function coutMicroUsd(modele: string, entree: number, sortie: number): number {
  const tarif = TARIFS[modele];
  if (!tarif) throw new Error(`Tarif inconnu pour le modèle ${modele}.`);
  const prix = tarif.auDelaDe && entree > tarif.auDelaDe.tokens ? tarif.auDelaDe : tarif;
  return Math.ceil(entree * prix.entree + sortie * prix.sortie);
}
