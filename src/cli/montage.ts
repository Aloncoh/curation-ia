// Rendu des montages de démonstration : `npm run montage`. Local, sans réseau ni modèle ; mesure le temps et le poids réels.
import { montagesDeBase, montagesDerives } from '../media/demonstrations.ts';
import { rendreMontages, type ResultatRendu } from '../media/rendu.ts';

const DOSSIER = 'maquette/medias/montages';
const afficher = (resultats: ResultatRendu[]) => resultats.forEach((r) => console.log(JSON.stringify(r)));

const base = await rendreMontages(montagesDeBase(), DOSSIER);
afficher(base);
// Les montages dérivés réutilisent ces images : ils n'ont pas de sens si l'une d'elles est refusée.
const refuse = base.some((r) => r.defauts.length > 0);
if (refuse) console.error('Montages dérivés non rendus : un montage de base est refusé.');
else {
  const derives = await rendreMontages(montagesDerives(), DOSSIER);
  afficher(derives);
  process.exitCode = derives.some((r) => r.defauts.length > 0) ? 1 : 0;
}
if (refuse) process.exitCode = 1;
