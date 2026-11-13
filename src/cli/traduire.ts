// Lot de traductions des publications (ADR 0012). Dépense réelle : refuse de démarrer sans clé, plafonds explicites et
// --confirmer. Modèle : celui de la rédaction (CURATION_MODELE), avec la clé de son fournisseur (fournisseur.ts) : DeepSeek
// V4.1 Flash jusqu'au 2026-11-13, Claude Haiku 5.5 ensuite si l'utilisateur y passe.
// Options : --langue=fr|he (les deux par défaut), --reprendre-ecarts (retraduit les traductions en écart),
// --recontroler (sans appel : réapplique les règles de contrôle aux traductions stockées).
import { fournisseur } from '../analysis/fournisseur.ts';
import { TARIFS } from '../analysis/tarifs.ts';
import { LANGUES_CIBLES, recontrolerTraductions, traduirePublications, type LangueCible } from '../traduction/traduire.ts';
import { runCommand } from './shared.ts';

const usd = (nom: string) => {
  const v = Number(process.env[nom]);
  if (!process.env[nom] || !Number.isFinite(v) || v <= 0) throw new Error(`${nom} manquant ou invalide : plafond en dollars requis.`);
  return Math.floor(v * 1_000_000);
};

await runCommand(async ({ database }) => {
  // Sans appel ni dépense : applique les règles de contrôle actuelles aux traductions déjà stockées.
  if (process.argv.includes('--recontroler')) {
    console.log(JSON.stringify(await recontrolerTraductions(database.client), null, 2));
    return 0;
  }
  if (!process.argv.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande engage une dépense réelle.'); return 1; }
  const nomModele = process.env.CURATION_MODELE ?? '';
  const f = fournisseur(nomModele);
  if (!TARIFS[nomModele] || !f) { console.error('Refus : CURATION_MODELE absent, sans tarif vérifié ou d’un fournisseur non pris en charge.'); return 1; }
  const cle = process.env[f.cle];
  if (!cle) { console.error(`Refus : ${f.cle} absente de l’environnement et de .env.local.`); return 1; }
  const maxTraductions = Number(process.env.CURATION_MAX_TRADUCTIONS);
  if (!Number.isInteger(maxTraductions) || maxTraductions < 1) { console.error('Refus : CURATION_MAX_TRADUCTIONS requis (publications × langues).'); return 1; }
  const option = process.argv.find((a) => a.startsWith('--langue='))?.slice('--langue='.length);
  const langues = option ? (option.split(',') as LangueCible[]) : LANGUES_CIBLES;
  if (langues.some((l) => !LANGUES_CIBLES.includes(l))) { console.error('Refus : --langue accepte fr, he ou fr,he.'); return 1; }
  const bilan = await traduirePublications({
    client: database.client, modele: f.client(cle), nomModele, langues, maxTraductions,
    capRunMicroUsd: usd('CURATION_PLAFOND_EXECUTION_USD'), capTotalMicroUsd: usd('CURATION_PLAFOND_TOTAL_USD'),
    estReprenable: f.reprenable, reprendreEcarts: process.argv.includes('--reprendre-ecarts'),
  });
  console.log(JSON.stringify(bilan, null, 2));
  return bilan.statut === 'terminee' ? 0 : 1;
});
