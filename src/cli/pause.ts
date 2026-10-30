// npm run pause — bloque les nouveaux jobs. Une requête déjà partie va jusqu'au bout et son résultat est enregistré.
import { setPaused } from '../control/settings.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  await setPaused(database, true, new Date().toISOString());
  console.log('Pause activée : aucun nouveau job ne sera lancé (reprendre avec : npm run resume).');
});
