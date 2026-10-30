// npm run maquette — écrit maquette/donnees.js (données réelles de la base) pour la maquette statique de P2.
import { mkdir, writeFile } from 'node:fs/promises';
import { buildMaquetteData } from '../maquette/data.ts';
import { runCommand } from './shared.ts';

const OUTPUT = 'maquette/donnees.js';

await runCommand(async ({ database }) => {
  const data = await buildMaquetteData(database.client, new Date().toISOString());
  await mkdir('maquette', { recursive: true });
  await writeFile(OUTPUT, `// Généré par « npm run maquette » — ne pas modifier à la main.\nwindow.DONNEES_MAQUETTE = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  console.log(
    `Maquette : ${OUTPUT} (${data.news_items.length} actualité(s) issues de collectes réelles, ` +
      `${data.excluded_not_live} écartée(s) car non réelles, ${data.products.length} produit(s))`,
  );
});
