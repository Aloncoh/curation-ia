// Maquette en ligne (demande de l'utilisateur du 2026-11-05, « déploie la maquette aussi »). Au build, les pages
// statiques de maquette/ sont copiées dans public/maquette/ et les visuels de marque dans public/assets/brand/, pour
// que leurs chemins relatifs (« ../assets/brand/… ») restent valables sous /maquette/. Les copies ne sont pas
// versionnées (.gitignore) : maquette/ reste la seule source. Les pages copiées portent « noindex » : c'est une
// maquette, pas le site.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const racine = join(web, '..', '..');
const cible = join(web, 'public', 'maquette');
const marque = join(web, 'public', 'assets', 'brand');

rmSync(cible, { recursive: true, force: true });
rmSync(marque, { recursive: true, force: true });
mkdirSync(cible, { recursive: true });
mkdirSync(marque, { recursive: true });

const NOINDEX = '<meta name="robots" content="noindex, nofollow">';
for (const nom of readdirSync(join(racine, 'maquette'))) {
  const source = join(racine, 'maquette', nom);
  if (nom.endsWith('.html')) {
    const html = readFileSync(source, 'utf8');
    writeFileSync(join(cible, nom), html.includes('name="robots"') ? html : html.replace(/<head>/i, `<head>\n${NOINDEX}`));
  } else {
    cpSync(source, join(cible, nom), { recursive: true });
  }
}
for (const nom of readdirSync(join(racine, 'assets', 'brand'))) {
  if (/\.(png|webp|svg|jpg)$/.test(nom)) cpSync(join(racine, 'assets', 'brand', nom), join(marque, nom));
}
// Polices de la maquette : lues dans node_modules en local, servies depuis maquette/polices/ en ligne.
const polices = join(cible, 'polices');
mkdirSync(polices, { recursive: true });
cpSync(join(racine, 'node_modules/@fontsource-variable/recursive/files/recursive-latin-full-normal.woff2'), join(polices, 'recursive.woff2'));
cpSync(join(racine, 'node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2'), join(polices, 'atkinson.woff2'));
console.log(`Maquette copiée dans ${cible}`);
