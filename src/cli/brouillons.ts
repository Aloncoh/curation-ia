// Lot de brouillons (P3). Dépense réelle : refuse de démarrer sans clé, plafonds explicites et --confirmer.
// Une exécution = un lancement de cette commande. Aucune valeur par défaut : les plafonds sont décidés par l'utilisateur.
// runCommand charge .env.local avant ces contrôles, vérifie le schéma de la base et masque les secrets dans les erreurs.
import { modeleAnthropic } from '../analysis/modele.ts';
import { genererBrouillons } from '../analysis/pipeline.ts';
import { TARIFS } from '../analysis/tarifs.ts';
import { runCommand } from './shared.ts';

const usd = (nom: string) => {
  const v = Number(process.env[nom]);
  if (!process.env[nom] || !Number.isFinite(v) || v <= 0) throw new Error(`${nom} manquant ou invalide : plafond en dollars requis.`);
  return Math.floor(v * 1_000_000);
};

await runCommand(async ({ database }) => {
  if (!process.argv.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande engage une dépense réelle.'); return 1; }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('Refus : ANTHROPIC_API_KEY absente de l’environnement et de .env.local.'); return 1; }
  const nomModele = process.env.CURATION_MODELE ?? '';
  if (!TARIFS[nomModele]) { console.error('Refus : CURATION_MODELE absent ou sans tarif vérifié.'); return 1; }
  const maxItems = Number(process.env.CURATION_MAX_ACTUALITES);
  if (!Number.isInteger(maxItems) || maxItems < 1) { console.error('Refus : CURATION_MAX_ACTUALITES requis.'); return 1; }
  const r = await genererBrouillons({ database, modele: modeleAnthropic(), nomModele, maxItems, capRunMicroUsd: usd('CURATION_PLAFOND_EXECUTION_USD'), capTotalMicroUsd: usd('CURATION_PLAFOND_TOTAL_USD') });
  console.log(JSON.stringify(r));
  return r.statut === 'terminee' ? 0 : 1;
});
