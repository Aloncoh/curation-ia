// Fournisseur du modèle déduit de son nom : chacun a sa clé et sa règle de reprise. Partagé par les commandes payantes.
import { estReprenable, estReprenableDeepSeek, modeleAnthropic, modeleDeepSeek, type Modele } from './modele.ts';

export function fournisseur(nomModele: string): { cle: string; client: (cle: string) => Modele; reprenable: (e: unknown) => boolean } | null {
  if (nomModele.startsWith('claude-')) return { cle: 'ANTHROPIC_API_KEY', client: () => modeleAnthropic(), reprenable: estReprenable };
  // Sans raisonnement : le réglage mesuré lors de la comparaison réelle du 2026-11-01.
  if (nomModele.startsWith('deepseek-')) return { cle: 'DEEPSEEK_API_KEY', client: (cle) => modeleDeepSeek({ cle, raisonnement: 'none' }), reprenable: estReprenableDeepSeek };
  return null;
}

/** Plafond en dollars lu dans l'environnement, en microdollars ; aucune valeur par défaut. */
export function usdEnv(nom: string): number {
  const v = Number(process.env[nom]);
  if (!process.env[nom] || !Number.isFinite(v) || v <= 0) throw new Error(`${nom} manquant ou invalide : plafond en dollars requis.`);
  return Math.floor(v * 1_000_000);
}
