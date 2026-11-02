// Script de recherche de la maquette (ADR 0011 §5) : normaliser.ts et moteur.ts, sans leurs types, dans une fonction
// qui expose `window.RECHERCHE`. Le site, l'application et la maquette classent ainsi avec le même code.
// `stripTypeScriptTypes` est expérimental dans Node 24 : un test de parité compare ce script au moteur.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const lire = (nom: string) => readFileSync(new URL(`../recherche/${nom}`, import.meta.url), 'utf8');

/** Seul import admis dans moteur.ts : celui de ./normaliser.ts, réécrit puisque les deux fichiers partagent la même portée. */
const IMPORT_NORMALISER = /^import \{[^}]*\} from '\.\/normaliser\.ts';[ \t]*$/m;

export function scriptRecherche(): string {
  const normaliser = stripTypeScriptTypes(lire('normaliser.ts'), { mode: 'strip' });
  const moteur = stripTypeScriptTypes(lire('moteur.ts'), { mode: 'strip' });
  if (/^\s*import\s/m.test(normaliser)) throw new Error('normaliser.ts ne doit rien importer : il est repris tel quel dans la maquette.');
  if (!IMPORT_NORMALISER.test(moteur)) throw new Error('moteur.ts : import de ./normaliser.ts introuvable ; le script de la maquette ne peut pas être généré.');
  const corps = moteur.replace(IMPORT_NORMALISER, '');
  if (/^\s*import\s/m.test(corps)) throw new Error('moteur.ts importe autre chose que ./normaliser.ts : il doit rester pur.');
  const sansExport = (code: string) => code.replace(/^export\s+/gm, '');
  return [
    '// Généré par « npm run maquette » à partir de src/recherche/normaliser.ts et src/recherche/moteur.ts — ne pas modifier à la main.',
    '(() => {',
    "'use strict';",
    sansExport(normaliser),
    sansExport(corps),
    'window.RECHERCHE = Object.freeze({ classer, preparerRequete, normaliser, motsNormalises, POIDS });',
    '})();',
    '',
  ].join('\n');
}
