// Sélection, sans appel payant. Sous-commandes :
//   npm run selection -- corpus                 fige le corpus (une seule fois)
//   npm run selection -- dossier <jeu>          écrit exports/selection-<jeu>.json pour les juges
//   npm run selection -- jugements <fichier> <juge> <version>  enregistre les décisions d'un juge de développement
//   npm run selection -- avis <fichier>         enregistre des avis humains
//   npm run selection -- corrections            liste les corrections à relire
//   npm run selection -- expliquer <actualité>  dit pourquoi un sujet a été retenu ou non
//   npm run selection -- evaluer <juge>         compare les versions de consignes sur le jeu d'évaluation
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { VERSIONS_CONSIGNES } from '../selection/consignes.ts';
import { figerCorpus, sujetsDuCorpus } from '../selection/corpus.ts';
import { comparer, evaluer } from '../selection/evaluation.ts';
import { casPourJuge, correctionsARelire, decisionsDuSujet, enregistrerAvis, enregistrerJugements, SchemaAvis, SchemaJugement, veritesEvaluation } from '../selection/registre.ts';
import { runCommand } from './shared.ts';

const GRAINE = 'selection-2026-10-31';
const TAILLES = { developpement: 24, evaluation: 36 };
const pourcent = (v: number | null) => (v === null ? 'non mesuré' : `${Math.round(v * 100)} %`);

await runCommand(async ({ database }) => {
  const { client } = database;
  const [commande, ...args] = process.argv.slice(2);
  const now = new Date().toISOString();
  switch (commande) {
    case 'corpus': {
      const tirage = await figerCorpus(client, GRAINE, TAILLES, now);
      console.log(`Corpus figé : ${tirage.filter((t) => t.jeu === 'developpement').length} sujets de développement, ${tirage.filter((t) => t.jeu === 'evaluation').length} d'évaluation.`);
      return 0;
    }
    case 'dossier': {
      const jeu = z.enum(['developpement', 'evaluation']).parse(args[0]);
      mkdirSync('exports', { recursive: true });
      const fichier = `exports/selection-${jeu}.json`;
      writeFileSync(fichier, JSON.stringify(await sujetsDuCorpus(client, jeu), null, 2));
      console.log(`Dossier écrit : ${fichier}`);
      return 0;
    }
    case 'jugements': {
      const [fichier, juge, version] = args;
      if (!fichier || !juge || !VERSIONS_CONSIGNES.some((v) => v.version === version)) throw new Error('Usage : jugements <fichier> <juge> <version des consignes appliquée>');
      const jugements = z.array(SchemaJugement).parse(JSON.parse(readFileSync(fichier, 'utf8')));
      const r = await enregistrerJugements(client, jugements, await sujetsDuCorpus(client), { juge, version: version!, origine: 'juge_developpement', now });
      console.log(JSON.stringify(r));
      return 0;
    }
    case 'avis': {
      if (!args[0]) throw new Error('Usage : avis <fichier>');
      const avis = z.array(SchemaAvis).parse(JSON.parse(readFileSync(args[0], 'utf8')));
      console.log(`${await enregistrerAvis(client, avis, now)} avis enregistrés. Aucune règle n'a été créée.`);
      return 0;
    }
    case 'corrections': {
      console.log(JSON.stringify(await correctionsARelire(client), null, 2));
      return 0;
    }
    case 'expliquer': {
      const decisions = await decisionsDuSujet(client, Number(args[0]));
      if (decisions.length === 0) console.log('Aucune décision enregistrée pour ce sujet.');
      for (const d of decisions) console.log(`${d.remplacee ? '[remplacée] ' : ''}${d.texte}\n`);
      return 0;
    }
    case 'evaluer': {
      if (!args[0]) throw new Error('Usage : evaluer <juge>');
      const verites = await veritesEvaluation(client);
      console.log(`Avis humains à l'aveugle sur le jeu d'évaluation : ${verites.size} sur ${TAILLES.evaluation}.`);
      let precedent: Awaited<ReturnType<typeof casPourJuge>> | null = null;
      for (const { version } of VERSIONS_CONSIGNES) {
        const cas = await casPourJuge(client, args[0], version, verites);
        const b = evaluer(cas);
        console.log(`${version} : ${b.n} cas, accord ${pourcent(b.taux_accord)}, publiés à tort ${b.publies_a_tort}, manqués ${b.manques}, précision ${pourcent(b.precision_publier)}, rappel ${pourcent(b.rappel_publier)}`);
        if (precedent && precedent.length > 0 && cas.length > 0) {
          const c = comparer(precedent, cas);
          console.log(`  face à la version précédente, sur ${c.n} sujets communs : ${c.corriges.length} corrigés, ${c.degrades.length} dégradés, p = ${c.p.toFixed(3)}, verdict ${c.verdict}`);
        }
        precedent = cas;
      }
      return 0;
    }
    default:
      throw new Error('Sous-commande attendue : corpus, dossier, jugements, avis, corrections, expliquer ou evaluer.');
  }
});
