// Comparaison de modèles sur le lot de développement. Sous-commandes :
//   npm run comparaison -- estimer                      taille du lot et coût maximal, sans aucun appel
//   npm run comparaison -- lancer --confirmer           appels réels, 1 $ au plus, tous modèles confondus
//   npm run comparaison -- rapport                      écrit exports/comparaison-modeles.md
//   npm run comparaison -- aveugle                      écrit le dossier de lecture et sa clé, à part
// `lancer` refuse de démarrer sans les deux clés : elles sont saisies par l'utilisateur dans .env.local.
import { mkdirSync, writeFileSync } from 'node:fs';
import { estReprenable, estReprenableDeepSeek, modeleAnthropic, modeleDeepSeek } from '../analysis/modele.ts';
import { MAX_TOKENS } from '../analysis/pipeline.ts';
import { SYSTEME_QUALIFICATION, SYSTEME_REDACTION } from '../analysis/prompts.ts';
import { coutMicroUsd } from '../analysis/tarifs.ts';
import { comparerModeles, PLAFOND_COMPARAISON_MICRO_USD, type Bras } from '../comparaison/execution.ts';
import { lotDeComparaison } from '../comparaison/lot.ts';
import { dossierDepuisLaBase, rapportComparaison } from '../comparaison/rapport.ts';
import { runCommand } from './shared.ts';

const MODELES = ['claude-haiku-5-5', 'deepseek-flash'];
/** Tokens typiques relevés dans docs/budget-modeles.md : estimation, à remplacer par la mesure. */
const SORTIE_TYPIQUE = { qualification: 219, redaction: 850 };
const dollars = (micro: number) => `${(micro / 1_000_000).toFixed(4)} $`;

function plafond(): number {
  const brut = process.env.CURATION_PLAFOND_COMPARAISON_USD;
  if (!brut) return PLAFOND_COMPARAISON_MICRO_USD;
  const v = Math.floor(Number(brut) * 1_000_000);
  if (!Number.isFinite(v) || v <= 0 || v > PLAFOND_COMPARAISON_MICRO_USD) throw new Error('CURATION_PLAFOND_COMPARAISON_USD invalide : 1 $ au plus.');
  return v;
}

await runCommand(async ({ database }) => {
  const { client } = database;
  const [commande] = process.argv.slice(2);
  const genereLe = new Date().toISOString();
  switch (commande) {
    case 'estimer': {
      const lot = await lotDeComparaison(client);
      const sujets = lot.filter((s) => s.analysable);
      const appels = [['qualification', SYSTEME_QUALIFICATION], ['redaction', SYSTEME_REDACTION]] as const;
      const entrees = sujets.flatMap((s) => appels.map(([etape, systeme]) => ({ etape, entree: Math.ceil((systeme.length + s.titre.length + s.texte.length) / 3) })));
      console.log(`Lot : ${lot.length} sujets du jeu de développement, ${sujets.length} analysés, ${lot.filter((s) => s.texte_court).length} à texte court. ${entrees.length} appels par modèle, hors reprises.`);
      let pire = 0;
      for (const modele of MODELES) {
        const typique = entrees.reduce((t, a) => t + coutMicroUsd(modele, a.entree, SORTIE_TYPIQUE[a.etape]), 0);
        // Reprises comprises : une réponse tronquée repart une fois avec le double de tokens.
        const maximum = entrees.reduce((t, a) => t + coutMicroUsd(modele, a.entree, MAX_TOKENS[a.etape]) + coutMicroUsd(modele, a.entree, MAX_TOKENS[a.etape] * 2), 0);
        pire += maximum;
        console.log(`${modele} : environ ${dollars(typique)} au tarif le plus haut (estimation, sans cache) ; pire cas ${dollars(maximum)}.`);
      }
      console.log(`Plafond appliqué : ${dollars(plafond())}, tous modèles confondus. Le lot s'arrête avant de le dépasser. Pire cas cumulé : ${dollars(pire)}.`);
      console.log('Aucun appel n’a été fait.');
      return 0;
    }
    case 'lancer': {
      if (!process.argv.includes('--confirmer')) { console.error('Refus : ajouter --confirmer. Cette commande engage une dépense réelle.'); return 1; }
      const cleDeepSeek = process.env.DEEPSEEK_API_KEY;
      if (!process.env.ANTHROPIC_API_KEY || !cleDeepSeek) { console.error('Refus : ANTHROPIC_API_KEY et DEEPSEEK_API_KEY sont requises dans .env.local.'); return 1; }
      const bras: Bras[] = [
        { id: 'haiku', modele: 'claude-haiku-5-5', reglage: 'effort medium, réflexion adaptative, cache des consignes', client: modeleAnthropic(), reprenable: estReprenable },
        { id: 'flash', modele: 'deepseek-flash', reglage: 'sans raisonnement, cache automatique', client: modeleDeepSeek({ cle: cleDeepSeek, raisonnement: 'none' }), reprenable: estReprenableDeepSeek },
      ];
      const r = await comparerModeles({ database, bras, origine: 'reel', capMicroUsd: plafond() });
      console.log(JSON.stringify(r));
      return r.statut === 'terminee' ? 0 : 1;
    }
    case 'rapport': {
      mkdirSync('exports', { recursive: true });
      const texte = await rapportComparaison(client, genereLe);
      writeFileSync('exports/comparaison-modeles.md', texte);
      console.log(texte);
      return 0;
    }
    case 'aveugle': {
      mkdirSync('exports', { recursive: true });
      const { markdown, cle } = await dossierDepuisLaBase(client);
      writeFileSync('exports/comparaison-aveugle.md', markdown);
      writeFileSync('exports/comparaison-cle.json', JSON.stringify(cle, null, 2));
      console.log(`Dossier écrit : exports/comparaison-aveugle.md, ${Object.keys(cle).length} sujets. Clé à part : exports/comparaison-cle.json.`);
      return 0;
    }
    default:
      throw new Error('Sous-commande attendue : estimer, lancer, rapport ou aveugle.');
  }
});
