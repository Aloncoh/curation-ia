// Rapport des délais mesurés : écrit exports/delais.md, sans réseau ni modèle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { rapportDelais } from '../mesure/delais.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  const rapport = await rapportDelais(database.client, new Date().toISOString());
  mkdirSync('exports', { recursive: true });
  writeFileSync('exports/delais.md', rapport);
  console.log(rapport);
});
