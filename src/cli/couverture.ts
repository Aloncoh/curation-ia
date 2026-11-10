// npm run couverture : pour chaque agent, sources actives, dernière collecte réussie, candidats détectés sur 7 jours et
// publications en ligne sur 7 jours ; puis la file des découvertes et son alerte (2026-11-10). Aucune écriture.
import { couvertureParAgent, etatFileDecouvertes } from '../mesure/couverture.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  const maintenant = new Date().toISOString();
  console.log('Agent | sources | collectées < 24 h | en échec | dernière collecte | candidats 7 j | publiées 7 j');
  for (const l of await couvertureParAgent(database.client, maintenant)) {
    console.log(`${l.agent} | ${l.sources} | ${l.actives24h} | ${l.enEchec} | ${l.derniereCollecte ?? 'Non renseigné'} | ${l.candidats7j} | ${l.publiees7j}`);
  }
  const f = await etatFileDecouvertes(database.client, maintenant);
  console.log(`File des découvertes : ${f.enAttente} en attente, la plus ancienne vue le ${f.plusAncienne ?? 'Non renseigné'} ; ${f.grillesNoteesDepuis24h} grille(s) notée(s) depuis 24 h.`);
  if (f.alerte) console.log(f.alerte);
  return 0;
});
