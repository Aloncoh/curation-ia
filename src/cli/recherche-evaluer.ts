// npm run recherche:evaluer — évalue la recherche sur le jeu de requêtes de référence (SPEC §7.15, ADR 0008), en mode
// public, sur la base configurée (Turso fait foi). Lecture seule, aucun appel au modèle. Code 1 si le seuil n'est pas atteint.
import { RANG_REUSSITE, REQUETES_REFERENCE, SEUIL_REUSSITE, VERSION_REFERENCE } from '../recherche/reference.ts';
import { rechercher } from '../recherche/rechercher.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  let evaluees = 0;
  let reussies = 0;
  const echecs: string[] = [];
  for (const r of REQUETES_REFERENCE) {
    const reponse = await rechercher(database.client, r.requete, { mode: 'public', limite: RANG_REUSSITE });
    const premiers = reponse.resultats.map((x) => x.post_id);
    if (r.attendus.length === 0) {
      console.log(`· « ${r.requete} » : aucune publication attendue ; ${reponse.total} résultat(s), sans erreur.`);
      continue;
    }
    evaluees++;
    const trouve = r.attendus.find((id) => premiers.includes(id));
    if (trouve !== undefined) reussies++;
    else echecs.push(r.requete);
    console.log(`${trouve !== undefined ? '✓' : '✗'} « ${r.requete} » : ${premiers.length ? premiers.join(', ') : 'aucun résultat'} (attendus : ${r.attendus.join(', ')})`);
  }
  const taux = evaluees ? reussies / evaluees : 0;
  console.log(`\nJeu ${VERSION_REFERENCE} : ${reussies} sur ${evaluees} requêtes réussies (une publication attendue dans les ${RANG_REUSSITE} premiers), soit ${(taux * 100).toFixed(0)} % ; seuil ${(SEUIL_REUSSITE * 100).toFixed(0)} %.`);
  if (echecs.length) console.log(`Échecs : ${echecs.map((e) => `« ${e} »`).join(', ')}.`);
  if (taux < SEUIL_REUSSITE) process.exitCode = 1;
});
