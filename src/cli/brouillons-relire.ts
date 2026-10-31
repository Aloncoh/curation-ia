// npm run brouillons:relire — écrit exports/brouillons-a-relire.md : brouillons, écarts et coût enregistré. Aucun appel au modèle.
import { mkdir, writeFile } from 'node:fs/promises';
import { relectureMarkdown } from '../analysis/relecture.ts';
import { runCommand } from './shared.ts';

const OUTPUT = 'exports/brouillons-a-relire.md';

await runCommand(async ({ database }) => {
  const document = await relectureMarkdown(database.client, new Date().toISOString());
  await mkdir('exports', { recursive: true });
  await writeFile(OUTPUT, document, 'utf8');
  console.log(`Relecture écrite : ${OUTPUT}`);
});
