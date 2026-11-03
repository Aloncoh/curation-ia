// Lot de brouillons (P3). Dépense réelle : refuse de démarrer sans clé, plafonds explicites et --confirmer.
// Une exécution = un lancement de cette commande. Aucune valeur par défaut : les plafonds sont décidés par l'utilisateur.
// runCommand charge .env.local avant ces contrôles, vérifie le schéma de la base et masque les secrets dans les erreurs.
// Modèle retenu par l'utilisateur le 2026-11-01 : DeepSeek V4.1 Flash (ADR 0009) ; un modèle Claude reste accepté.
import { estReprenable, estReprenableDeepSeek, modeleAnthropic, modeleDeepSeek, type Modele } from '../analysis/modele.ts';
import { genererBrouillons } from '../analysis/pipeline.ts';
import { TARIFS } from '../analysis/tarifs.ts';
import { AGE_MAX_JOURS } from '../selection/consignes.ts';
import { runCommand } from './shared.ts';

const usd = (nom: string) => {
  const v = Number(process.env[nom]);
  if (!process.env[nom] || !Number.isFinite(v) || v <= 0) throw new Error(`${nom} manquant ou invalide : plafond en dollars requis.`);
  return Math.floor(v * 1_000_000);
};

/** Fournisseur déduit du nom du modèle : chacun a sa clé et sa règle de reprise. */
function fournisseur(nomModele: string): { cle: string; client: (cle: string) => Modele; reprenable: (e: unknown) => boolean } | null {
  if (nomModele.startsWith('claude-')) return { cle: 'ANTHROPIC_API_KEY', client: () => modeleAnthropic(), reprenable: estReprenable };
  // Sans raisonnement : le réglage mesuré lors de la comparaison réelle du 2026-11-01.
  if (nomModele.startsWith('deepseek-')) return { cle: 'DEEPSEEK_API_KEY', client: (cle) => modeleDeepSeek({ cle, raisonnement: 'none' }), reprenable: estReprenableDeepSeek };
  return null;
}

await runCommand(async ({ database }) => {
  if (!process.argv.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande engage une dépense réelle.'); return 1; }
  const nomModele = process.env.CURATION_MODELE ?? '';
  const f = fournisseur(nomModele);
  if (!TARIFS[nomModele] || !f) { console.error('Refus : CURATION_MODELE absent, sans tarif vérifié ou d’un fournisseur non pris en charge.'); return 1; }
  const cle = process.env[f.cle];
  if (!cle) { console.error(`Refus : ${f.cle} absente de l’environnement et de .env.local.`); return 1; }
  const maxItems = Number(process.env.CURATION_MAX_ACTUALITES);
  if (!Number.isInteger(maxItems) || maxItems < 1) { console.error('Refus : CURATION_MAX_ACTUALITES requis.'); return 1; }
  const r = await genererBrouillons({
    database, modele: f.client(cle), nomModele, maxItems, ageMaxJours: AGE_MAX_JOURS, estReprenable: f.reprenable,
    capRunMicroUsd: usd('CURATION_PLAFOND_EXECUTION_USD'), capTotalMicroUsd: usd('CURATION_PLAFOND_TOTAL_USD'),
  });
  console.log(JSON.stringify(r));
  return r.statut === 'terminee' ? 0 : 1;
});
