// npm run maquette — écrit maquette/donnees.js (données réelles de la base) pour la maquette statique de P2, et
// maquette/recherche.js (moteur de recherche partagé, sans ses types : ADR 0011 §5).
// Code de sortie 1 si un exemple n'a pas été retrouvé ou n'est pas entièrement vérifié : le fichier est quand même
// écrit, et la maquette affiche ces exemples « à vérifier » au lieu de les présenter comme vérifiés.
import { mkdir, writeFile } from 'node:fs/promises';
import { buildMaquetteData } from '../maquette/data.ts';
import { scriptRecherche } from '../maquette/recherche.ts';
import { runCommand } from './shared.ts';

const OUTPUT = 'maquette/donnees.js';
const RECHERCHE = 'maquette/recherche.js';

await runCommand(async ({ database }) => {
  const data = await buildMaquetteData(database.client, new Date().toISOString());
  await mkdir('maquette', { recursive: true });
  await writeFile(OUTPUT, `// Généré par « npm run maquette » — ne pas modifier à la main.\nwindow.DONNEES_MAQUETTE = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  await writeFile(RECHERCHE, scriptRecherche(), 'utf8');
  const aVerifier = data.exemples.filter((exemple) => exemple.statut === 'a_verifier');
  console.log(
    `Maquette : ${OUTPUT} (${data.news_items.length} actualité(s) issues de collectes réelles, ` +
      `${data.excluded_not_live} écartée(s) car non réelles, ${data.products.length} produit(s) ; ` +
      `${data.exemples.length - aVerifier.length} exemple(s) vérifié(s), ${aVerifier.length} à vérifier, ` +
      `${data.exemples_introuvables.length} introuvable(s))`,
  );
  console.log(
    `Ressources : ${data.ressources.length} publication(s) planifiée(s) ou publiée(s) affichée(s), ` +
      `${data.ressources.filter((r) => r.bouton !== null).length} avec bouton vérifié, ${data.ressources.filter((r) => r.visuel !== null).length} avec visuel ; ` +
      `${data.ressources_non_planifiees.length} non planifiée(s) (à vérifier ou rejetée) ; recherche : ${RECHERCHE} (${data.recherche.length} document(s))`,
  );
  for (const r of data.ressources_non_planifiees) console.error(`Ressource non planifiée : ${r.slug} [${r.statut}] (${r.motifs.map((m) => m.code).join(', ')})`);
  for (const exemple of aVerifier) console.error(`À vérifier : ${exemple.id} (${exemple.motifs.join(', ')})`);
  for (const exemple of data.exemples_introuvables) console.error(`Introuvable : ${exemple.id} (${exemple.motif})`);
  return aVerifier.length > 0 || data.exemples_introuvables.length > 0 ? 1 : 0;
});
