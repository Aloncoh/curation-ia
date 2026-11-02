// Saisie guidée des clés : npm run cles. L'utilisateur colle chaque clé, rien ne s'affiche à l'écran et rien ne passe par la
// conversation. Laisser vide garde la valeur actuelle, pour pouvoir faire une clé maintenant et l'autre plus tard.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { CLES, cleValide, fusionnerCle, type NomCle } from '../control/cles.ts';

const FICHIER = '.env.local';
const ETAPES: { nom: NomCle; lien: string }[] = [
  { nom: 'ANTHROPIC_API_KEY', lien: 'https://platform.claude.com/settings/keys' },
  { nom: 'DEEPSEEK_API_KEY', lien: 'https://platform.deepseek.com/api_keys' },
];

const silence = new Writable({ write: (_morceau, _encodage, fini) => fini() });
const lecteur = createInterface({ input: process.stdin, output: silence, terminal: Boolean(process.stdin.isTTY) });
const lignes = lecteur[Symbol.asyncIterator]();

async function lire(): Promise<string> {
  const suivante = await lignes.next();
  return suivante.done ? '' : String(suivante.value).trim();
}

let contenu = existsSync(FICHIER) ? readFileSync(FICHIER, 'utf8') : '';
const enregistrer = () => {
  writeFileSync(FICHIER, contenu, { mode: 0o600 });
  chmodSync(FICHIER, 0o600);
};

console.log('Saisie des clés API. Ce que tu colles ne s’affiche pas : c’est normal.\n');
for (const [i, { nom, lien }] of ETAPES.entries()) {
  const { nom: fournisseur, attendu } = CLES[nom];
  console.log(`Étape ${i + 1} sur ${ETAPES.length} : clé ${fournisseur}`);
  console.log(`  Elle se crée ici : ${lien}`);
  for (;;) {
    console.log('  Colle la clé puis appuie sur Entrée (Entrée seule pour passer) :');
    const valeur = await lire();
    if (valeur === '') {
      console.log('  Passée, rien n’a changé.\n');
      break;
    }
    if (cleValide(nom, valeur)) {
      contenu = fusionnerCle(contenu, nom, valeur);
      enregistrer();
      console.log(`  Clé ${fournisseur} enregistrée dans ${FICHIER}.\n`);
      break;
    }
    console.log(`  Ceci ne ressemble pas à une clé ${fournisseur} (${attendu}). Rien n’a été enregistré.`);
    if (!process.stdin.isTTY) break;
  }
}
lecteur.close();
console.log('Terminé. Tu peux revenir dans la conversation et dire que c’est fait.');
