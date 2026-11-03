// npm run brouillons:recontroler — relance les contrôles du code sur les brouillons « à vérifier ». Aucun appel au modèle.
import { recontroler } from '../analysis/recontrole.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  console.log(JSON.stringify(await recontroler(database)));
});
