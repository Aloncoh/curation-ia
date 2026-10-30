// npm run maquette — écrit maquette/donnees.js (données réelles de la base) pour la maquette statique de P2.
// Code de sortie 1 si un exemple n'a pas été retrouvé ou n'est pas entièrement vérifié : le fichier est quand même
// écrit, et la maquette affiche ces exemples « à vérifier » au lieu de les présenter comme vérifiés.
import { mkdir, writeFile } from 'node:fs/promises';
import { buildMaquetteData } from '../maquette/data.ts';
import { runCommand } from './shared.ts';

const OUTPUT = 'maquette/donnees.js';

await runCommand(async ({ database }) => {
  const data = await buildMaquetteData(database.client, new Date().toISOString());
  await mkdir('maquette', { recursive: true });
  await writeFile(OUTPUT, `// Généré par « npm run maquette » — ne pas modifier à la main.\nwindow.DONNEES_MAQUETTE = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  const aVerifier = data.exemples.filter((exemple) => exemple.statut === 'a_verifier');
  console.log(
    `Maquette : ${OUTPUT} (${data.news_items.length} actualité(s) issues de collectes réelles, ` +
      `${data.excluded_not_live} écartée(s) car non réelles, ${data.products.length} produit(s) ; ` +
      `${data.exemples.length - aVerifier.length} exemple(s) vérifié(s), ${aVerifier.length} à vérifier, ` +
      `${data.exemples_introuvables.length} introuvable(s))`,
  );
  for (const exemple of aVerifier) console.error(`À vérifier : ${exemple.id} (${exemple.motifs.join(', ')})`);
  for (const exemple of data.exemples_introuvables) console.error(`Introuvable : ${exemple.id} (${exemple.motif})`);
  return aVerifier.length > 0 || data.exemples_introuvables.length > 0 ? 1 : 0;
});
