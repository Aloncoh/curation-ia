// npm run videos -- [--confirmer] [--tous] : rattache aux posts la vidéo placée par l'éditeur dans leur source
// (src/media/videos-posts.ts). Sans --confirmer : liste ce qui serait rattaché, sans rien écrire. --tous : tout
// l'historique au lieu des posts des 3 derniers jours.
import { associerVideos } from '../media/videos-posts.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  const ecrire = process.argv.includes('--confirmer');
  const bilan = await associerVideos(database.client, { maintenant: new Date().toISOString(), tous: process.argv.includes('--tous'), ecrire });
  for (const t of bilan.trouves) console.log(`▶ post ${t.post_id} : ${t.fournisseur} · ${t.editeur}${t.titre ? ` · ${t.titre}` : ''}`);
  console.log(`${bilan.examines} post(s) examiné(s), ${bilan.trouves.length} vidéo(s) trouvée(s), ${bilan.ecrits} rattachée(s)${ecrire ? '' : ' (aperçu : ajouter --confirmer pour écrire)'}`);
  return 0;
});
