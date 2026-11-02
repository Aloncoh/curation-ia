// Temps local de la chaîne, sans le temps du modèle : faux modèle instantané, sur une copie de la base. Aucun réseau, aucune dépense.
import { pathToFileURL } from 'node:url';
const R = process.cwd();
const imp = (p) => import(pathToFileURL(`${R}/${p}`).href);
const { openDatabase } = await imp('src/db/client.ts');
const { genererBrouillons } = await imp('src/analysis/pipeline.ts');
const { SYSTEME_QUALIFICATION } = await imp('src/analysis/prompts.ts');
const notes = { nouveaute_reelle: { note: 2, raison: 'x' }, utilite_concrete: { note: 2, raison: 'x' }, impact_utilisateurs: { note: 2, raison: 'x' }, solidite_sources: { note: 2, raison: 'x' } };
const passage = (u) => u.split('\n\n')[1].split(/\s+/).slice(0, 5).join(' ');
const modele = {
  compter: async () => 100,
  appeler: async (r) => {
    const p = passage(r.utilisateur);
    const cite = { texte: 'Une nouveauté, selon la source.', passages: [p] };
    const titre = /Titre : (.*)/.exec(r.utilisateur)?.[1] ?? 'Sujet';
    const texte = r.systeme === SYSTEME_QUALIFICATION
      ? { criteres: notes, passages: [p], motif_rejet: null, compte: 'nodi', nature: 'amelioration', categories: ['modèles'], produit: null, type_information: 'annonce_officielle' }
      : { accroche: { ...cite, texte: `${titre.slice(0, 60)} : une nouveauté` }, description: cite, nouveaute: cite, ce_que_ca_permet: cite, pour_qui: null, acces: null, cout: null, limites_connues: null, details: [], attributions: [], reperes: [{ texte: 'Nouveauté', passages: [p] }], diapositives: ['accroche', 'nouveaute'], questions_a_tester: [] };
    return { texte: JSON.stringify(texte), usage: { input: 100, output: 100 }, stop: 'end_turn' };
  },
};
const database = openDatabase(`file:${process.argv[2]}`, 5000);
const debut = performance.now();
const r = await genererBrouillons({ database, modele, nomModele: 'claude-haiku-5-5', maxItems: 100, capRunMicroUsd: 1e12, capTotalMicroUsd: 1e12 });
const ms = performance.now() - debut;
console.log(JSON.stringify({ date: new Date().toISOString(), actualites: 100, duree_totale_ms: Math.round(ms), par_actualite_ms: Math.round(ms / 100), bilan: { statut: r.statut, controlees: r.controlees, a_verifier: r.a_verifier, a_approfondir: r.a_approfondir, ecartees: r.ecartees, rejetees: r.rejetees } }));
database.close();
