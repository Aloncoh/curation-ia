// npm run brouillons:planifier — planifie les actualités sans écart détecté (en attente, jamais publiées). Aucun appel au modèle.
import { planifierActualites } from '../analysis/planification-actualites.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  const r = await planifierActualites(database, new Date().toISOString());
  for (const { postId, placement } of r) console.log(`Publication ${postId} : ${placement.etat}${placement.jour ? ` le ${placement.jour}, rang ${placement.rang}` : ''}${placement.utiliseReserve ? ' (réserve des nouveautés)' : ''}`);
  console.log(`${r.length} actualité(s) planifiée(s). Rien n'est publié.`);
});
