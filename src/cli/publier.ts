// npm run publier -- --confirmer : publie les publications dont le jour prévu est arrivé, dans le plafond quotidien
// (src/publication/publier.ts). Sans --confirmer, rien n'est écrit. Respecte la pause (npm run pause).
import { publierLesDues } from '../publication/publier.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  if (!process.argv.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande rend des publications visibles sur le site public.'); return 1; }
  console.log(JSON.stringify(await publierLesDues(database, new Date().toISOString()), null, 2));
  return 0;
});
