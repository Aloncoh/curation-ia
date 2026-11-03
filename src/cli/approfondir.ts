// npm run approfondir — capture la page officielle des actualités dont le flux ne donne qu'une accroche. Aucun appel au modèle.
import { approfondir } from '../collect/approfondir.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ config, database }) => {
  const r = await approfondir(database, { now: () => new Date().toISOString(), timeoutMs: config.fetchTimeoutMs, maxBytes: config.maxResponseBytes, userAgent: config.userAgent });
  for (const x of r) console.log(`${x.newsItemId} ${x.statut}${x.motif ? ` (${x.motif})` : ''}${x.mots ? `, ${x.mots} mots` : ''} : ${x.url}`);
  console.log(`${r.filter((x) => x.statut === 'capturee').length} page(s) capturée(s) sur ${r.length}. Suite : npm run brouillons.`);
});
