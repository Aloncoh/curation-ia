// npm run resume — lève la pause.
import { setPaused } from '../control/settings.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  await setPaused(database, false, new Date().toISOString());
  console.log('Pause levée : les collectes peuvent reprendre.');
});
