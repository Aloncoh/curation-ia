// Agent des découvertes (P6, bloc 2b) : grille d1 notée par un faux modèle, décision du code, rédaction et import dans
// la chaîne des ressources. Aucun réseau (transport injecté), aucun navigateur (rendeur injecté), aucune dépense réelle.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Modele } from '../src/analysis/modele.ts';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import type { Montage } from '../src/media/montage.ts';
import { deciderD1, ecritureSansEspaces, entreeDe, sansTermesInvalides, SYSTEME_D1, traiterDecouvertes, type GrilleD1 } from '../src/ressources/agent-decouvertes.ts';
import { executerCapture } from '../src/ressources/capture.ts';
import type { EntreeRessource } from '../src/ressources/liste.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

const lire = (chemin: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${chemin}`, import.meta.url)), 'utf8');
const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const ROUTES: Record<string, string> = {
  [`${API}/rate_limit`]: JSON.stringify({ resources: { core: { limit: 60, remaining: 50, reset: 1_793_635_200 } } }),
  [`${API}/repos/exemple-org/demo-skills`]: lire('ressources/depot-demo-skills.json'),
  [`${RAW}/exemple-org/demo-skills/main/README.md`]: lire('ressources/readme-demo-skills.md'),
};
const transport: Transport = async (req) => {
  const body = ROUTES[req.url.toString()];
  return body === undefined ? { status: 404, headers: {}, body: Buffer.from('Not Found') } : { status: 200, headers: {}, body: Buffer.from(body) };
};
const PUBLIQUE: Resolver = async () => [{ address: '140.82.112.6', family: 4 }];
const HORLOGE = () => new Date('2026-11-02T12:00:00.000Z');
const DECOUVERTE: EntreeRessource = { slug: 'gh-exemple-org-demo-skills', nom: 'demo-skills', depot: 'exemple-org/demo-skills', chemins: ['README.md'], compte: 'repo', decouverteVia: 'Découverte automatique : test', decouverteAuto: true };

const GRILLE: GrilleD1 = {
  pour_construire: true,
  domaine: 'skills_mcp',
  utilite: { note: 'forte', raison: 'Adds animation skills to a coding agent.', passages: ['A collection of agent skills for web animation and motion design.'] },
  documentation: { note: 'complete', passages: ['Install a skill with the skills CLI:'] },
  limites: [{ texte: 'Not tested on Windows', passages: ['Not tested on Windows.'] }],
};
const BROUILLON = {
  slug: 'ignoré', consignes: 'r2',
  accroche: { texte: 'demo-skills adds agent skills for web animation and motion design', passages: ['A collection of agent skills for web animation and motion design.'] },
  description: { texte: 'Agent skills for web animation and motion design, installed one by one with the skills CLI.', passages: ['A collection of agent skills for web animation and motion design.', 'Install a skill with the skills CLI:'] },
  interet: { texte: 'The full toolkit ships every skill with examples and templates for designers and developers.', passages: ['The full toolkit ships every skill of the collection, with examples and templates for designers and developers alike.'] },
  exemple_usage: { texte: 'Add a skill to Claude Code or Cursor before animating a web page.', passages: ['Works with Claude Code and Cursor.', 'A collection of agent skills for web animation and motion design.'] },
  demarrage: { etapes: [{ texte: 'Install a skill with the skills CLI', passages: ['Install a skill with the skills CLI:'] }], commande: 'npx skills add exemple-org/demo-skills --skill anim', passages: ['Install a skill with the skills CLI:'] },
  compatibilites: [{ texte: 'Works with Claude Code and Cursor', passages: ['Works with Claude Code and Cursor.'] }],
  limites: [{ texte: 'Not tested on Windows', passages: ['Not tested on Windows.'] }],
  licence_locale: null,
  mots_cles: {
    nom: 'demo-skills', categorie: 'MCP et skills',
    usages: [{ texte: 'web animation', passages: ['agent skills for web animation and motion design'] }],
    technologies: [{ texte: 'Claude Code', passages: ['Works with Claude Code and Cursor.'] }],
    termes_proches: [{ terme: 'motion design', raison: 'demo-skills is a collection of skills for motion design' }],
  },
  bouton: { libelle: 'Voir le dépôt', url: 'https://github.com/exemple-org/demo-skills' },
  reperes: [{ texte: 'Each skill folder has its own license', passages: ['Each skill folder contains its own license file.'] }],
};

/** Faux modèle : la grille pour l'étape d1, le brouillon pour la rédaction ; compte ses appels. */
function fauxModele(grille: unknown = GRILLE): Modele & { appels: string[] } {
  const appels: string[] = [];
  return Object.assign({
    compter: async () => 1_000,
    appeler: async (r: { systeme: string }) => {
      const etape = r.systeme === SYSTEME_D1 ? 'grille' : 'redaction';
      appels.push(etape);
      return { texte: JSON.stringify(etape === 'grille' ? grille : BROUILLON), usage: { input: 1_000, output: 400 }, stop: 'end_turn' };
    },
  }, { appels });
}

let t: TestDb;
let dossier: string;
beforeEach(async () => {
  t = await createTestDb();
  dossier = mkdtempSync(join(tmpdir(), 'curation-decouvertes-'));
  await executerCapture({ database: t.database, userAgent: 'test', workerId: 'test', entrees: [DECOUVERTE], transport, resolve: PUBLIQUE, horloge: HORLOGE, mode: 'fixture' });
});
afterEach(() => {
  rmSync(dossier, { recursive: true, force: true });
  t.cleanup();
});

const lancer = (modele: Modele) =>
  traiterDecouvertes({
    database: t.database, modele, nomModele: 'deepseek-flash', maxItems: 3, capRunMicroUsd: 50_000, capTotalMicroUsd: 3_950_000, userAgent: 'test',
    estReprenable: () => false, horloge: HORLOGE, transport, resolve: PUBLIQUE, dossierVisuels: dossier,
    rendre: async (ms: Montage[], d: string) => ms.map((m) => { const fichier = join(d, `${m.id}.jpg`); writeFileSync(fichier, 'jpeg'); return { id: m.id, fichier, defauts: [], duree_ms: 1, octets: 4 }; }),
  });
const ligne = async (sql: string) => (await t.database.client.execute(sql)).rows[0];

describe('grille d1 : le code décide', () => {
  const texte = lire('ressources/readme-demo-skills.md');
  const actif = { archive: false, inactif: false };
  it('publier seulement avec une utilité citée mot pour mot, une documentation, une ressource pour construire', () => {
    expect(deciderD1(actif, GRILLE, texte)).toEqual({ decision: 'publier', motif: 'grille_d1' });
    expect(deciderD1({ archive: true, inactif: false }, GRILLE, texte).motif).toBe('depot_archive');
    expect(deciderD1({ archive: false, inactif: true }, null, texte).motif).toBe('depot_inactif');
    expect(deciderD1(actif, { ...GRILLE, pour_construire: false }, texte).motif).toBe('hors_construire');
    expect(deciderD1(actif, { ...GRILLE, domaine: 'autre' }, texte).motif).toBe('hors_sujet');
    expect(deciderD1(actif, { ...GRILLE, utilite: { ...GRILLE.utilite, note: 'faible' } }, texte).motif).toBe('utilite_faible');
    expect(deciderD1(actif, { ...GRILLE, documentation: { note: 'absente', passages: [] } }, texte).motif).toBe('documentation_absente');
    expect(deciderD1(actif, { ...GRILLE, utilite: { ...GRILLE.utilite, passages: ['An invented sentence about the tool.'] } }, texte)).toEqual({ decision: 'approfondir', motif: 'passage_introuvable' });
  });
  it('une raison fondée sur la popularité écarte le dépôt', () => {
    expect(deciderD1(actif, { ...GRILLE, utilite: { ...GRILLE.utilite, raison: 'Very popular, 5,000 stars in a week.' } }, texte).motif).toBe('raison_popularite');
  });
  it('un document en écriture sans espaces (chinois, japonais, coréen) est écarté avant tout appel', () => {
    expect(ecritureSansEspaces('让你的agent一键直出商业级产品宣传片：会作曲，能指着画面改。')).toBe(true);
    expect(ecritureSansEspaces(texte)).toBe(false);
    expect(deciderD1(actif, null, '让你的agent一键直出商业级产品宣传片').motif).toBe('langue_non_prise_en_charge');
  });
  it('un mot-clé qui est une phrase est retiré, le reste du brouillon est intact', () => {
    const b = sansTermesInvalides({ accroche: 'x', mots_cles: { usages: [{ texte: 'video editing' }, { texte: 'turn any long video into short clips automatically' }], technologies: [], termes_proches: [{ terme: 'b-roll' }] } }) as { accroche: string; mots_cles: { usages: { texte: string }[]; termes_proches: unknown[] } };
    expect(b.mots_cles.usages.map((u) => u.texte)).toEqual(['video editing']);
    expect(b.mots_cles.termes_proches).toHaveLength(1);
    expect(b.accroche).toBe('x');
  });
  it("l'entrée se reconstruit depuis la base, provenance comprise", () => {
    expect(entreeDe('github-ressource:Owner/Repo', 'Repo', JSON.stringify({ decouverte: { decouverteVia: 'via test' } }))).toMatchObject({ slug: 'gh-owner-repo', depot: 'Owner/Repo', compte: 'repo', decouverteVia: 'via test', decouverteAuto: true });
  });
});

describe('agent des découvertes', () => {
  it('note, décide, rédige et importe : publication de Repo, origine agent du site, chaque appel compté', async () => {
    const modele = fauxModele();
    const bilan = await lancer(modele);
    expect(bilan.statut).toBe('terminee');
    // Grille, rédaction, puis une révision seulement si les contrôles ont relevé des écarts.
    expect(modele.appels.slice(0, 2)).toEqual(['grille', 'redaction']);
    expect([2, 3]).toContain(modele.appels.length);
    expect(bilan.decisions).toEqual([{ slug: 'gh-exemple-org-demo-skills', decision: 'publier', motif: 'grille_d1' }]);
    expect(await ligne(`select decision, juge, origine from selection_decision where consignes_version = 'd1'`)).toMatchObject({ decision: 'publier', juge: 'modele', origine: 'modele' });
    expect(await ligne(`select origine, account, model from post_draft`)).toMatchObject({ origine: 'agent_site', account: 'repo', model: 'deepseek-flash' });
    expect(await ligne(`select count(*) as n, sum(actual_micro_usd > 0) as payes from llm_call`)).toMatchObject({ n: modele.appels.length, payes: modele.appels.length });
    // Le faux modèle rend le même brouillon à la révision : il reste inchangé, jamais publié sans contrôle.
    expect(['planifiee', 'a_verifier', 'inchangee']).toContain(bilan.importees[0]?.issue);
    // Un second passage ne repaie rien : la découverte a sa décision d1.
    expect((await lancer(fauxModele())).decisions).toEqual([]);
  });

  it('un dépôt hors sujet est écarté par le code après la grille, sans rédaction ni publication', async () => {
    const modele = fauxModele({ ...GRILLE, pour_construire: false });
    const bilan = await lancer(modele);
    expect(modele.appels).toEqual(['grille']);
    expect(bilan.decisions[0]).toMatchObject({ decision: 'ecarter', motif: 'hors_construire' });
    expect(await ligne(`select count(*) as n from post`)).toMatchObject({ n: 0 });
  });

  it('une grille illisible laisse la découverte à approfondir, jamais publiée', async () => {
    const bilan = await lancer(fauxModele({ pas: 'une grille' }));
    expect(bilan.decisions[0]).toMatchObject({ decision: 'approfondir', motif: 'grille_invalide' });
    expect(await ligne(`select count(*) as n from post`)).toMatchObject({ n: 0 });
  });
});
