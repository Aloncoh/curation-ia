// Sonde de détection (sans dépense) : `npm run sonde -- --minutes 90`. Lecture seule des sources, rien dans le catalogue.
// Quota GitHub sans jeton : 60 requêtes par heure pour tout le poste ; les trois dépôts sont donc espacés de 4 minutes.
import { safeGet } from '../collect/safe-fetch.ts';
import { lancerSonde, type Interrogateur } from '../mesure/sonde.ts';
import { selectSources, SOURCES } from '../sources.ts';
import { runCommand } from './shared.ts';

const option = (nom: string, defaut: number) => {
  const i = process.argv.indexOf(`--${nom}`);
  const valeur = i === -1 ? defaut : Number(process.argv[i + 1]);
  if (!Number.isFinite(valeur) || valeur <= 0) throw new Error(`--${nom} invalide.`);
  return valeur;
};

await runCommand(async ({ config, database }) => {
  const minutes = option('minutes', 60);
  const intervalleFlux = option('intervalle', 60) * 1000;
  const interroger: Interrogateur = (url, headers, allowedHosts, maxBytes) =>
    safeGet(url, { allowedHosts, timeoutMs: config.fetchTimeoutMs, maxBytes: maxBytes ?? config.maxResponseBytes }, { ...headers, 'user-agent': config.userAgent });
  const bilan = await lancerSonde({
    client: database.client,
    definitions: selectSources(config.onlySources, SOURCES),
    interroger,
    dureeMs: minutes * 60_000,
    intervalleMs: (d) => (d.kind === 'github_releases' ? 4 * 60_000 : intervalleFlux),
  });
  console.log(JSON.stringify(bilan));
});
