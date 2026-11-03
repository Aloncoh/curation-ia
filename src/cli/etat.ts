// npm run etat : vue d'ensemble de la chaîne — pause, publications du jour sous le plafond, file d'attente, reportées
// par motif (doublon_possible, obsolete, plafond_atteint…), dernier cycle et dépense enregistrée. Aucune écriture.
import { describeDatabaseUrl } from '../config.ts';
import { lireReglageEntier } from '../control/settings.ts';
import { etatDeLaChaine } from '../pilotage/pilotage.ts';
import { runCommand } from './shared.ts';

const usd = (micro: number) => `${(micro / 1_000_000).toFixed(4)} $`;

await runCommand(async ({ config, database }) => {
  const e = await etatDeLaChaine(database, new Date().toISOString(), await lireReglageEntier(database.db, 'publication.plafond_jour'));
  console.log(`Base : ${describeDatabaseUrl(config.databaseUrl)}`);
  console.log(`Pause : ${e.pause ? 'OUI — aucun cycle ne collecte, ne rédige ni ne publie' : 'non'}`);
  console.log(`Aujourd'hui (${e.jour}, Europe/Paris) : ${e.publiees_aujourdhui} publiée(s) sur un plafond de ${e.plafond_jour}`);
  console.log(`En attente et prévues : ${e.en_attente}`);
  console.log(`Reportées : ${e.reportees.map((r) => `${r.motif ?? 'sans motif'} ${r.n}`).join(', ') || 'aucune'}`);
  const c = e.dernier_cycle;
  console.log(c ? `Dernier cycle : ${c.debut} → ${c.fin} (${c.statut}) — ${c.etapes.map((x) => `${x.nom} ${x.statut}${x.motif ? ` (${x.motif})` : ''}`).join(' ; ')}` : 'Dernier cycle : aucun');
  console.log(`Dépense enregistrée (tous modèles) : ${usd(e.depense_micro_usd)} — détail : npm run couts`);
});
