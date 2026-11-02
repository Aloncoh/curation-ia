// Saisie des clés : uniquement des valeurs factices, jamais de réseau.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleValide, fusionnerCle } from '../src/control/cles.ts';

const SCRIPT = fileURLToPath(new URL('../src/cli/cles.ts', import.meta.url));
const ANTHROPIC = 'sk-ant-api03-factice-factice-factice';
const DEEPSEEK = 'sk-0123456789abcdef0123456789abcdef';

describe('format des clés', () => {
  it('reconnaît une clé de chaque fournisseur', () => {
    expect(cleValide('ANTHROPIC_API_KEY', ANTHROPIC)).toBe(true);
    expect(cleValide('DEEPSEEK_API_KEY', DEEPSEEK)).toBe(true);
  });
  it.each([
    ['ANTHROPIC_API_KEY', DEEPSEEK],
    ['DEEPSEEK_API_KEY', ANTHROPIC],
    ['ANTHROPIC_API_KEY', 'sk-ant-court'],
    ['DEEPSEEK_API_KEY', 'sk-avec des espaces dans la clé'],
    ['DEEPSEEK_API_KEY', 'trop-courte'],
  ] as const)('refuse pour %s : %s', (nom, valeur) => {
    expect(cleValide(nom, valeur)).toBe(false);
  });
});

describe('écriture dans le fichier', () => {
  it('remplace la ligne vide sans toucher aux autres', () => {
    const avant = '# note\nANTHROPIC_API_KEY=\nDEEPSEEK_API_KEY=\n# CURATION_MODELE=x\n';
    expect(fusionnerCle(avant, 'ANTHROPIC_API_KEY', ANTHROPIC)).toBe(`# note\nANTHROPIC_API_KEY=${ANTHROPIC}\nDEEPSEEK_API_KEY=\n# CURATION_MODELE=x\n`);
  });
  it('ajoute la clé si la ligne n’existe pas', () => {
    expect(fusionnerCle('', 'DEEPSEEK_API_KEY', DEEPSEEK)).toBe(`DEEPSEEK_API_KEY=${DEEPSEEK}\n`);
    expect(fusionnerCle('A=1', 'DEEPSEEK_API_KEY', DEEPSEEK)).toBe(`A=1\nDEEPSEEK_API_KEY=${DEEPSEEK}\n`);
  });
  it('ne confond pas une ligne en commentaire avec la clé', () => {
    expect(fusionnerCle('# ANTHROPIC_API_KEY=x\n', 'ANTHROPIC_API_KEY', ANTHROPIC)).toBe(`# ANTHROPIC_API_KEY=x\nANTHROPIC_API_KEY=${ANTHROPIC}\n`);
  });
});

describe('commande de saisie', () => {
  let dossier: string;
  const lancer = (entree: string) => spawnSync(process.execPath, [SCRIPT], { cwd: dossier, input: entree, encoding: 'utf8' });
  const fichier = () => join(dossier, '.env.local');
  beforeEach(() => { dossier = mkdtempSync(join(tmpdir(), 'curation-cles-')); });
  afterEach(() => rmSync(dossier, { recursive: true, force: true }));

  it('enregistre les deux clés, sans jamais les afficher, dans un fichier privé', () => {
    const r = lancer(`${ANTHROPIC}\n${DEEPSEEK}\n`);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).not.toContain(ANTHROPIC);
    expect(r.stdout + r.stderr).not.toContain(DEEPSEEK);
    const contenu = readFileSync(fichier(), 'utf8');
    expect(contenu).toContain(`ANTHROPIC_API_KEY=${ANTHROPIC}`);
    expect(contenu).toContain(`DEEPSEEK_API_KEY=${DEEPSEEK}`);
    expect(statSync(fichier()).mode & 0o777).toBe(0o600);
  });
  it('une entrée vide garde la valeur actuelle : une clé peut attendre', () => {
    writeFileSync(fichier(), `ANTHROPIC_API_KEY=${ANTHROPIC}\nDEEPSEEK_API_KEY=\n`);
    expect(lancer(`\n${DEEPSEEK}\n`).status).toBe(0);
    expect(readFileSync(fichier(), 'utf8')).toBe(`ANTHROPIC_API_KEY=${ANTHROPIC}\nDEEPSEEK_API_KEY=${DEEPSEEK}\n`);
  });
  it('une clé au mauvais format n’est pas écrite, et le message ne la répète pas', () => {
    const r = lancer(`${DEEPSEEK}\n\n`);
    expect(r.stdout + r.stderr).not.toContain(DEEPSEEK);
    expect(r.stdout).toContain('ne ressemble pas');
    expect(() => readFileSync(fichier(), 'utf8')).toThrow();
  });
  it('un fichier existant trop ouvert redevient privé', () => {
    writeFileSync(fichier(), 'ANTHROPIC_API_KEY=\n', { mode: 0o644 });
    lancer(`${ANTHROPIC}\n\n`);
    expect(statSync(fichier()).mode & 0o777).toBe(0o600);
  });
});
