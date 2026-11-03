// npm run lancer -- --confirmer : un cycle complet de la chaîne (src/pilotage/pilotage.ts), chaque étape dans son
// propre processus, comme à la main. Utilisé par GitHub Actions toutes les 5 minutes (ADR 0006), jamais sans plafonds :
// une étape payante sans modèle, clé ou plafonds est sautée. Code 1 si une étape a échoué.
import { spawn } from 'node:child_process';
import { lancerCycle, type Etape } from '../pilotage/pilotage.ts';
import { runCommand } from './shared.ts';

/** Délai maximal d'une étape : au-delà, elle est arrêtée et comptée en échec. */
const DELAI_ETAPE_MS = 10 * 60_000;

function executer(etape: Etape, env: Record<string, string>): Promise<{ code: number | null }> {
  return new Promise((resolve, reject) => {
    const enfant = spawn(process.execPath, [etape.script, ...etape.args], { stdio: 'inherit', env: { ...process.env, ...env } });
    const minuteur = setTimeout(() => enfant.kill('SIGTERM'), DELAI_ETAPE_MS);
    enfant.on('error', (e) => { clearTimeout(minuteur); reject(e); });
    enfant.on('close', (code) => { clearTimeout(minuteur); resolve({ code }); });
  });
}

await runCommand(async ({ database }) => {
  const bilan = await lancerCycle({ database, executer, env: process.env, confirme: process.argv.includes('--confirmer') });
  if (bilan.statut === 'refuse') { console.error('Refus : ajouter --confirmer. Un cycle peut appeler le modèle (dans ses plafonds) et publier.'); return 1; }
  console.log(JSON.stringify({ ...bilan, dernieres: undefined }, null, 2));
  return bilan.etapes.some((e) => e.statut === 'echec') ? 1 : 0;
});
