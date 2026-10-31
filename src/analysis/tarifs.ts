// Tarifs officiels en dollars par million de tokens, relevés le 2026-10-30 sur
// https://platform.claude.com/docs/en/about-claude/pricing. À revérifier avant tout lot réel.
export const TARIFS: Record<string, { entree: number; sortie: number }> = {
  'claude-opus-5-5': { entree: 4, sortie: 20 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
  'claude-haiku-5-5': { entree: 0.1, sortie: 0.5 },
};

/** Coût en millionièmes de dollar : tokens × $/MTok, arrondi au supérieur. Un modèle sans tarif connu est refusé. */
export function coutMicroUsd(modele: string, entree: number, sortie: number): number {
  const tarif = TARIFS[modele];
  if (!tarif) throw new Error(`Tarif inconnu pour le modèle ${modele}.`);
  return Math.ceil(entree * tarif.entree + sortie * tarif.sortie);
}
