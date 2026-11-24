// npm run base:essai — essai de compatibilité d'une base candidate (Bunny Database…) avant toute bascule (ADR 0020).
// Cible : ESSAI_DATABASE_URL et ESSAI_DATABASE_AUTH_TOKEN, saisis par l'utilisateur dans `.env.local`. Jamais la base du
// projet (DATABASE_URL) : la commande la refuse. Sans --confirmer, elle dit seulement ce qu'elle ferait.
import { describeDatabaseUrl, redactSecrets } from '../config.ts';
import { openDatabase } from '../db/client.ts';
import { essayerBase } from '../db/essai-compat.ts';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const url = process.env.ESSAI_DATABASE_URL?.trim();
const authToken = process.env.ESSAI_DATABASE_AUTH_TOKEN?.trim() || null;
const projet = process.env.DATABASE_URL?.trim() || 'file:data/curation.db';

if (!url) {
  console.error("ESSAI_DATABASE_URL manquant : indiquer dans .env.local l'adresse de la base à essayer, et son jeton dans ESSAI_DATABASE_AUTH_TOKEN.");
  process.exitCode = 1;
} else if (url === projet) {
  console.error("Refus : ESSAI_DATABASE_URL désigne la base du projet. L'essai ne tourne que sur une base vide, à part.");
  process.exitCode = 1;
} else if (!process.argv.includes('--confirmer')) {
  console.log(`Base à essayer : ${describeDatabaseUrl(url)}`);
  console.log('Aperçu seulement. Avec --confirmer : migrations du projet sur cette base, qui doit être vide, puis essais dans des tables essai_*, supprimées en sortant.');
} else {
  const database = openDatabase(url, 5_000, authToken);
  try {
    console.log(`Essai de compatibilité : ${describeDatabaseUrl(url)}`);
    const resultats = await essayerBase(database, { url, authToken });
    for (const r of resultats) console.log(`${r.ok ? 'OK       ' : r.bloquant ? 'ÉCHEC    ' : 'ATTENTION'} ${r.nom} (${r.ms} ms) — ${r.detail}`);
    const echecs = resultats.filter((r) => !r.ok && r.bloquant).length;
    const attentions = resultats.filter((r) => !r.ok && !r.bloquant).length;
    if (echecs > 0) console.log(`Bilan : ${echecs} échec(s) bloquant(s), bascule impossible en l'état.`);
    else if (attentions > 0) console.log(`Bilan : aucun échec bloquant, ${attentions} point(s) d'attention à trancher.`);
    else console.log('Bilan : tous les essais passent.');
    process.exitCode = echecs > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Erreur : ${redactSecrets(error instanceof Error ? error.message : String(error))}`);
    process.exitCode = 1;
  } finally {
    database.close();
  }
}
