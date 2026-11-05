// npm run ressources -- rediger --confirmer
// Agent des découvertes (P6, bloc 2b ; agent-decouvertes.ts) : grille `d1` notée par le modèle, décision du code,
// rédaction des dépôts retenus, puis chaîne des ressources (contrôles, visuel, lien, mots-clés, planning). Dépense
// réelle : refuse de démarrer sans --confirmer, modèle, clé, nombre maximal et plafonds explicites.
import { fournisseur, usdEnv } from '../../analysis/fournisseur.ts';
import { TARIFS } from '../../analysis/tarifs.ts';
import { traiterDecouvertes } from '../agent-decouvertes.ts';
import type { ContexteCommande } from './contexte.ts';

export async function rediger(args: string[], ctx: ContexteCommande): Promise<number> {
  if (!args.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande engage une dépense réelle.'); return 1; }
  const nomModele = process.env.CURATION_MODELE ?? '';
  const f = fournisseur(nomModele);
  if (!TARIFS[nomModele] || !f) { console.error('Refus : CURATION_MODELE absent, sans tarif vérifié ou d’un fournisseur non pris en charge.'); return 1; }
  const cle = process.env[f.cle];
  if (!cle) { console.error(`Refus : ${f.cle} absente de l’environnement et de .env.local.`); return 1; }
  const maxItems = Number(process.env.CURATION_MAX_DECOUVERTES);
  if (!Number.isInteger(maxItems) || maxItems < 1) { console.error('Refus : CURATION_MAX_DECOUVERTES requis.'); return 1; }
  const bilan = await traiterDecouvertes({
    database: ctx.database, modele: f.client(cle), nomModele, maxItems, userAgent: ctx.config.userAgent, estReprenable: f.reprenable,
    capRunMicroUsd: usdEnv('CURATION_PLAFOND_EXECUTION_USD'), capTotalMicroUsd: usdEnv('CURATION_PLAFOND_TOTAL_USD'),
  });
  console.log(`Lot : ${bilan.statut}${bilan.motif ? ` (${bilan.motif})` : ''} ; ${bilan.evaluees} dépôt(s) noté(s).`);
  for (const d of bilan.decisions) console.log(`· ${d.slug} : ${d.decision} (${d.motif})`);
  for (const b of bilan.importees) console.log(`→ ${b.slug ?? b.fichier} : ${b.issue}${b.jour ? ` le ${b.jour}` : ''}${b.motifs.length ? ` — ${b.motifs.map((m) => m.code).join(', ')}` : ''}`);
  return bilan.statut === 'terminee' || bilan.statut === 'lot_en_cours' ? 0 : 1;
}
