// Chaîne des ressources pour construire (ADR 0011). Sous-commandes :
//   npm run ressources -- capturer [slug] [--depuis <heures>] [--forcer]   capture par l'API GitHub, sans jeton
//   npm run ressources -- source <slug>                                    écrit data/ressources/captures/<slug>.md
//   npm run ressources -- verifier <fichier.json>                          contrôles déterministes d'un brouillon
//   npm run ressources -- chercher "<requête>" [--recents] [--json]         recherche en mode aperçu, correspondances expliquées
//   npm run ressources -- importer [fichier.json …]                          chaîne complète : contrôles, visuel, liens, mots-clés, planning, index
//   npm run ressources -- planning [--plafond N] [--reserve N] [--recalculer] jours prévus sous le plafond partagé
//   npm run ressources -- selection <capturer | apercus | source | verifier | importer> …  sélections de sites (ADR 0011, complément du 2026-11-02)
import { capturer } from '../ressources/commandes/capturer.ts';
import { chercher } from '../ressources/commandes/chercher.ts';
import type { ContexteCommande } from '../ressources/commandes/contexte.ts';
import { importer } from '../ressources/commandes/importer.ts';
import { planning } from '../ressources/commandes/planning.ts';
import { selection } from '../ressources/commandes/selection.ts';
import { source } from '../ressources/commandes/source.ts';
import { verifier } from '../ressources/commandes/verifier.ts';
import { runCommand } from './shared.ts';

const COMMANDES: Record<string, (args: string[], ctx: ContexteCommande) => Promise<number>> = { capturer, source, verifier, importer, chercher, planning, selection };

await runCommand(async ({ config, database }) => {
  const [nom, ...args] = process.argv.slice(2);
  const commande = nom ? COMMANDES[nom] : undefined;
  if (!commande) {
    console.error(`Usage : npm run ressources -- <${Object.keys(COMMANDES).join(' | ')}> …`);
    return 1;
  }
  return commande(args, { config, database });
});
