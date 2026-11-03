// npm run couts : coûts réels enregistrés dans `llm_call`, par modèle, par étape et par jour (Europe/Paris). Une
// réservation sans coût connu reste comptée. Les dépenses faites hors de la base (2026-11-03 : 0,0099 $ de traduction
// des ressources, voir STATE.md) n'y figurent pas. Aucune écriture.
import { coutsReels } from '../pilotage/pilotage.ts';
import { runCommand } from './shared.ts';

const usd = (micro: number) => `${(micro / 1_000_000).toFixed(4)} $`;

await runCommand(async ({ database }) => {
  const c = await coutsReels(database.client);
  console.log(`Total enregistré : ${usd(c.total_micro_usd)}`);
  console.log('Par modèle :');
  for (const m of c.par_modele) console.log(`  · ${m.modele} : ${usd(m.micro_usd)} (${m.appels} appel(s))`);
  console.log('Par étape :');
  for (const e of c.par_etape) console.log(`  · ${e.etape} : ${usd(e.micro_usd)} (${e.appels} appel(s))`);
  console.log('Par jour (14 derniers jours avec dépense) :');
  for (const j of c.par_jour) console.log(`  · ${j.jour} : ${usd(j.micro_usd)}`);
});
