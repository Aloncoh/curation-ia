// Sélections de ressources (complément de l'ADR 0011, 2026-11-02) : robots.txt, capture des pages de sites, schéma et
// contrôles, montage, import, planification, indexation et maquette. Aucun réseau (transport injecté), aucun navigateur
// (preneur d'aperçus et rendeur injectés), aucun modèle. Les pages sont synthétiques, écrites pour ces tests.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { loadConfig } from '../src/config.ts';
import { buildMaquetteData } from '../src/maquette/data.ts';
import type { Montage } from '../src/media/montage.ts';
import { defautsMontage } from '../src/media/montage.ts';
import type { ResultatRendu } from '../src/media/rendu.ts';
import { classer } from '../src/recherche/moteur.ts';
import { rechercher } from '../src/recherche/rechercher.ts';
import { importer } from '../src/ressources/commandes/importer.ts';
import { selection } from '../src/ressources/commandes/selection.ts';
import { verifier } from '../src/ressources/commandes/verifier.ts';
import { ecrirePlacement } from '../src/ressources/planification.ts';
import { requeteApercuAdmise, type IssueApercu, type PreneurApercus } from '../src/ressources/selection/apercus.ts';
import { capturesDeSelection } from '../src/ressources/selection/capture.ts';
import { controlerSelection } from '../src/ressources/selection/controles.ts';
import { extrairePage } from '../src/ressources/selection/html.ts';
import type { EntreeSelection } from '../src/ressources/selection/liste.ts';
import { SELECTIONS } from '../src/ressources/selection/liste.ts';
import { accesSelonRobots, jetonProduit, verdictRobots } from '../src/ressources/selection/robots.ts';
import { BrouillonSelection } from '../src/ressources/selection/schemas.ts';
import { createTestDb, scalar, type TestDb } from './helpers/db.ts';

const UA = 'curation-ai-collector/0.1 (tests)';

// --- robots.txt -------------------------------------------------------------------------------------------------------

describe('robots.txt (RFC 9309)', () => {
  const texte = [
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: *',
    'Content-Signal: search=yes,ai-train=no',
    'Disallow: /prive/',
    'Allow: /prive/public',
    'Disallow: /*.pdf$',
    'Disallow:',
  ].join('\n');

  it('choisit le groupe du jeton, sinon « * » ; la règle la plus longue l’emporte, « allow » à égalité', () => {
    expect(jetonProduit(UA)).toBe('curation-ai-collector');
    expect(verdictRobots(texte, UA, '/')).toMatchObject({ autorise: true, groupe: '*', regle: null, signaux: ['search=yes,ai-train=no'] });
    expect(verdictRobots(texte, UA, '/prive/x')).toMatchObject({ autorise: false, regle: { type: 'disallow', motif: '/prive/' } });
    expect(verdictRobots(texte, UA, '/prive/public/page')).toMatchObject({ autorise: true, regle: { type: 'allow', motif: '/prive/public' } });
    expect(verdictRobots(texte, UA, '/doc.pdf').autorise).toBe(false);
    expect(verdictRobots(texte, UA, '/doc.pdf?x=1').autorise).toBe(true);
    expect(verdictRobots(texte, 'GPTBot/1.0', '/').autorise).toBe(false);
    expect(verdictRobots('User-agent: *\nDisallow: /a\nAllow: /a', UA, '/a').autorise).toBe(true);
    expect(verdictRobots('', UA, '/x')).toMatchObject({ autorise: true, groupe: 'aucun' });
  });

  it('4xx : aucune restriction ; erreur serveur ou redirection : tout est interdit', () => {
    expect(accesSelonRobots({ etat: 'indisponible', statut: 404 }, UA, '/').autorise).toBe(true);
    expect(accesSelonRobots({ etat: 'inaccessible', motif: 'http_status', statut: 503 }, UA, '/')).toMatchObject({ autorise: false, motif: 'robots_inaccessible_http_status' });
    expect(accesSelonRobots({ etat: 'inaccessible', motif: 'redirect', statut: 301 }, UA, '/').autorise).toBe(false);
  });
});

// --- Extraction HTML --------------------------------------------------------------------------------------------------

describe('texte brut d’une page', () => {
  it('garde titre, description et texte visible ; jamais le script, le style ni le contenu caché du head', () => {
    const p = extrairePage(`<!doctype html><html><head><title>Alpha &amp; co</title><meta name="description" content="Une &quot;galerie&quot; de pages."><style>.x{}</style><script>alert("non")</script></head>
      <body><nav>Menu</nav><h1>Bonjour</h1><p>Un texte <b>en ligne</b> ici.</p><noscript>Activez le script</noscript><svg><text>logo</text></svg><!-- note --></body></html>`);
    expect(p.titre).toBe('Alpha & co');
    expect(p.description).toBe('Une "galerie" de pages.');
    expect(p.texte).toBe('Menu\nBonjour\nUn texte en ligne ici.');
    expect(p.texte).not.toMatch(/alert|Activez|logo|note/);
  });
});

// --- Capture, contrôles et chaîne sur fixtures ------------------------------------------------------------------------

const site = (slug: string, nom: string, hote: string) => ({ slug, nom, url: `https://${hote}/`, hote, verifiee_a_la_main: null });
const SEL: EntreeSelection = {
  slug: 'selection-demo',
  nom: 'Sélection démo design',
  sujet: 'design',
  compte: 'mova',
  decouverteVia: 'Liste de test',
  sites: [
    site('alpha', 'Alpha Book', 'alpha.exemple'),
    site('zeta', 'Zeta Fonts', 'zeta.exemple'),
    site('eta', 'Eta Motion', 'eta.exemple'),
    site('theta', 'Theta Landing', 'theta.exemple'),
    site('beta', 'Beta', 'beta.exemple'),
    site('gamma', 'Gamma', 'gamma.exemple'),
    site('delta', 'Delta', 'delta.exemple'),
    site('epsilon', 'Epsilon', 'epsilon.exemple'),
  ],
};
const SELECTIONS_TEST = [SEL];

const page = (titre: string, description: string, lignes: string[]) =>
  `<!doctype html><html><head><title>${titre}</title><meta name="description" content="${description}"></head><body>${lignes.map((l) => `<p>${l}</p>`).join('')}${[1, 2, 3, 4].map((i) => `<p>Paragraphe ${i} de remplissage pour atteindre le seuil de lecture minimal.</p>`).join('')}</body></html>`;

type Route = { status?: number; body: string; headers?: Record<string, string> };
const HTML = { 'content-type': 'text/html; charset=utf-8' };
function routes(): Record<string, Route> {
  return {
    'https://alpha.exemple/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
    'https://alpha.exemple/': { headers: HTML, body: page('Alpha Book - landing page inspiration', 'Hand-picked landing page inspiration, updated daily.', ['Browse 800+ landing pages by industry and style.', 'Free plan with limited access to categories.']) },
    'https://zeta.exemple/robots.txt': { status: 404, body: 'Not Found' },
    'https://zeta.exemple/': { headers: HTML, body: page('Zeta Fonts', 'Find out what font is used in famous logos.', ['The closest font you can get for each logo.']) },
    'https://eta.exemple/robots.txt': { body: 'User-agent: *\nDisallow: /admin\n' },
    'https://eta.exemple/': { headers: HTML, body: page('Eta Motion - animation inspiration for mobile apps', 'A collection of mobile app animations and interactions.', ['Watch interaction details from iOS apps.']) },
    'https://theta.exemple/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
    'https://theta.exemple/': { headers: HTML, body: page('Theta Landing', 'Ready-to-use prompts to build landing pages.', ['Just copy, paste, and launch your page.']) },
    'https://beta.exemple/robots.txt': { body: 'User-agent: *\nDisallow: /\n' },
    'https://beta.exemple/': { headers: HTML, body: page('Beta', 'Ne doit jamais être lue.', ['Interdit par robots.txt']) },
    'https://gamma.exemple/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
    'https://gamma.exemple/': { status: 301, body: '', headers: { location: 'https://alpha.exemple/?ref=gamma' } },
    'https://delta.exemple/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
    'https://delta.exemple/': { status: 403, body: 'Un instant…', headers: { 'cf-mitigated': 'challenge', ...HTML } },
    'https://epsilon.exemple/robots.txt': { body: 'User-agent: *\nAllow: /\n' },
    'https://epsilon.exemple/': { headers: HTML, body: '<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>' },
  };
}
function faux(table: Record<string, Route>): Transport & { appels: string[] } {
  const appels: string[] = [];
  const t: Transport = async (req) => {
    const url = req.url.toString();
    appels.push(url);
    const r = table[url];
    if (!r) return { status: 404, headers: {}, body: Buffer.from('Not Found') };
    return { status: r.status ?? 200, headers: r.headers ?? {}, body: Buffer.from(r.body) };
  };
  return Object.assign(t, { appels });
}
const PUBLIQUE: Resolver = async () => [{ address: '93.184.216.34', family: 4 }];
const HORLOGE = () => new Date('2026-11-02T12:00:00.000Z');

/** Preneur d'aperçus de test : écrit un faux JPEG, sans navigateur ; `refuses` reçoivent un refus. */
const preneur = (refuses: string[] = []): PreneurApercus => async (sites, fichierDe) =>
  new Map(sites.map((s): [string, IssueApercu] => {
    if (refuses.includes(s.slug)) return [s.slug, { ok: false, motif: 'protection_anti_robot', detail: 'HTTP 403' }];
    writeFileSync(fichierDe(s), `jpeg-${s.slug}`);
    return [s.slug, { ok: true, statut: 200, largeur: 1440, hauteur: 900 }];
  }));

function rendeur(): ((m: Montage[], d: string) => Promise<ResultatRendu[]>) & { montages: Montage[] } {
  const montages: Montage[] = [];
  const f = async (ms: Montage[], dossier: string) => {
    montages.push(...ms);
    return ms.map((m) => {
      const defauts = defautsMontage(m);
      if (defauts.length > 0) return { id: m.id, fichier: null, defauts, duree_ms: 0, octets: 0 };
      const fichier = join(dossier, `${m.id}.jpg`);
      writeFileSync(fichier, 'jpeg');
      return { id: m.id, fichier, defauts: [], duree_ms: 1, octets: 4 };
    });
  };
  return Object.assign(f, { montages });
}

const BROUILLON = {
  format: 'selection',
  slug: 'selection-demo',
  consignes: 's1',
  accroche: { texte: '4 sites pour trouver l’inspiration en design web', passages: [] },
  ressources: [
    {
      site: 'alpha', nom: 'Alpha Book', url: 'https://alpha.exemple/', libelle_lien: 'Alpha Book',
      explication: { texte: 'Plus de 800 landing pages choisies à la main ; la formule gratuite limite l’accès aux catégories.', passages: ['Browse 800+ landing pages by industry and style.', 'Free plan with limited access to categories.', 'Hand-picked landing page inspiration, updated daily.'] },
      categorie: 'galerie de sites',
      usages: [{ texte: 'inspiration landing page', passages: ['Hand-picked landing page inspiration, updated daily.'] }],
      termes_proches: [{ terme: 'page d’atterrissage', raison: 'Équivalent français de landing page, objet de la galerie de sites' }],
    },
    {
      site: 'zeta', nom: 'Zeta Fonts', url: 'https://zeta.exemple/', libelle_lien: 'Zeta Fonts',
      explication: { texte: 'Retrouve la police d’un logo, ou la plus proche.', passages: ['Find out what font is used in famous logos.', 'The closest font you can get for each logo.'] },
      categorie: 'typographie',
      usages: [{ texte: 'polices de logos', passages: ['Find out what font is used in famous logos.'] }],
      termes_proches: [],
    },
    {
      site: 'eta', nom: 'Eta Motion', url: 'https://eta.exemple/', libelle_lien: 'Eta Motion',
      explication: { texte: 'Animations et interactions d’apps mobiles à parcourir.', passages: ['A collection of mobile app animations and interactions.'] },
      categorie: 'animation d’interface',
      usages: [{ texte: 'animations mobile', passages: ['Eta Motion - animation inspiration for mobile apps'] }],
      termes_proches: [{ terme: 'motion design', raison: 'Eta Motion rassemble des animations mobile, le motion design des interfaces' }],
    },
    {
      site: 'theta', nom: 'Theta Landing', url: 'https://theta.exemple/', libelle_lien: 'Theta Landing',
      explication: { texte: 'Des prompts prêts à copier pour monter une landing page.', passages: ['Ready-to-use prompts to build landing pages.', 'Just copy, paste, and launch your page.'] },
      categorie: 'prompts de design',
      usages: [{ texte: 'prompts de landing page', passages: ['Ready-to-use prompts to build landing pages.'] }],
      termes_proches: [],
    },
  ],
  mots_cles: { nom: 'Sélection démo design', categorie: 'design', termes_proches: [] },
};
const copie = <T>(v: T): T => structuredClone(v);

let t: TestDb;
let dossier: string;
let sortie: string[];
const ctx = (o: { table?: Record<string, Route>; refuses?: string[]; horloge?: () => Date; rendre?: ReturnType<typeof rendeur> } = {}) => ({
  config: loadConfig({}),
  database: t.database,
  dossier,
  selections: SELECTIONS_TEST,
  transport: faux(o.table ?? routes()),
  resolve: PUBLIQUE,
  horloge: o.horloge ?? HORLOGE,
  preneur: preneur(o.refuses ?? []),
  dossierApercus: dossier,
  rendre: o.rendre ?? rendeur(),
  dossierVisuels: dossier,
});
const brouillon = (contenu: unknown = BROUILLON, nom = 'selection-demo.json') => {
  const f = join(dossier, nom);
  writeFileSync(f, JSON.stringify(contenu));
  return f;
};
const ligne = async (sql: string) => (await t.database.client.execute(sql)).rows[0];

beforeEach(async () => {
  t = await createTestDb();
  dossier = mkdtempSync(join(tmpdir(), 'curation-selection-'));
  sortie = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void sortie.push(a.join(' ')));
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dossier, { recursive: true, force: true });
  t.cleanup();
});

describe('capture des pages de sites (site-ressource)', () => {
  it('robots.txt d’abord ; page interdite jamais demandée ; redirection, protection anti-robot et page « JS seul » refusées et tracées', async () => {
    const transport = faux(routes());
    const code = await selection(['capturer', 'selection-demo'], { ...ctx(), transport });
    expect(code).toBe(1);
    const texte = sortie.join('\n');
    expect(texte).toMatch(/alpha https:\/\/alpha\.exemple\/ — robots robots_autorise .* page capturée/);
    expect(texte).toMatch(/zeta .* robots robots_indisponible_404 — page capturée/);
    expect(texte).toMatch(/beta .* robots robots_interdit \[disallow: \/, groupe \*\] — refusée : robots_interdit/);
    expect(texte).toMatch(/gamma .* refusée : redirection \(HTTP 301 vers https:\/\/alpha\.exemple\/\?ref=gamma\)/);
    expect(texte).toMatch(/delta .* refusée : protection_anti_robot \(HTTP 403\)/);
    expect(texte).toMatch(/epsilon .* refusée : texte_insuffisant/);
    // La page interdite par robots.txt n'a jamais été demandée ; la redirection n'a pas été suivie.
    expect(transport.appels).not.toContain('https://beta.exemple/');
    expect(transport.appels.filter((u) => u.includes('ref=gamma'))).toEqual([]);
    // Traces : une étape par lecture, refus compris, avec la règle de robots.txt.
    const robots = await ligne(`select status, detail from run_step where name = 'robots' and json_extract(detail, '$.site') = 'beta'`);
    expect(robots!.status).toBe('failed');
    expect(JSON.parse(String(robots!.detail))).toMatchObject({ verdict: 'robots_interdit', regle: { type: 'disallow', motif: '/' } });
    expect(await scalar(t.database, `select count(*) from source where kind = 'site-ressource'`)).toBe(8);
    expect(await ligne(`select kind, title from news_item`)).toMatchObject({ kind: 'selection', title: 'Sélection démo design' });
    expect(await ligne(`select decision, motif from selection_decision`)).toMatchObject({ decision: 'publier', motif: 'liste_utilisateur' });
    // Aperçus : seuls les sites capturés en texte, chacun tracé « droits à vérifier ».
    const captures = await capturesDeSelection(t.database.client, SEL);
    expect(captures.sites.filter((s) => s.page !== null).map((s) => s.site.slug)).toEqual(['alpha', 'zeta', 'eta', 'theta']);
    expect(captures.sites.filter((s) => s.apercu !== null)).toHaveLength(4);
    expect(JSON.parse(captures.sites[0]!.apercu!.contenu)).toMatchObject({ droits_a_verifier: true, url: 'https://alpha.exemple/' });
    expect(JSON.parse(captures.sites[0]!.page!.contenu)).toMatchObject({ titre: 'Alpha Book - landing page inspiration', url: 'https://alpha.exemple/' });
  });

  it('les requêtes d’un aperçu : HTTPS seulement, jamais une adresse locale ou privée écrite en clair', () => {
    expect(requeteApercuAdmise('https://cdn.exemple/a.js')).toBe(true);
    expect(requeteApercuAdmise('data:image/png;base64,AAAA')).toBe(true);
    for (const u of ['http://cdn.exemple/a.js', 'https://127.0.0.1/x', 'https://localhost/x', 'https://[::1]/x', 'https://169.254.169.254/latest', 'file:///etc/passwd', 'https://u:p@cdn.exemple/']) expect(requeteApercuAdmise(u)).toBe(false);
  });
});

describe('schéma et contrôles d’une sélection', () => {
  beforeEach(async () => {
    await selection(['capturer', 'selection-demo', '--sans-apercus'], ctx());
    sortie = [];
  });
  const controler = async (b: unknown) => controlerSelection(b, await capturesDeSelection(t.database.client, SEL), SEL);
  const codes = async (b: unknown) => (await controler(b)).bloquants.map((c) => c.code);

  it('conforme : citations mot pour mot, liens canoniques, libellés = noms, chiffres et gratuité soutenus', async () => {
    expect(BrouillonSelection.safeParse(BROUILLON).success).toBe(true);
    expect(await controler(BROUILLON)).toEqual({ bloquants: [], a_verifier: [] });
  });

  it('refuse un champ calculé par le code, un format ou une sélection inconnus', async () => {
    expect(await codes({ ...copie(BROUILLON), mention: 'x' })).toEqual(['schema_invalide']);
    expect(await codes({ ...copie(BROUILLON), slug: 'autre' })).toEqual(['selection_inconnue']);
    expect(await codes({ ...copie(BROUILLON), consignes: 's0' })).toEqual(['consignes_inconnues']);
  });

  it('chiffres et gratuité absents de la capture : refusés', async () => {
    const b = copie(BROUILLON);
    b.ressources[1]!.explication.texte = 'Plus de 1 000 polices gratuites, retrouvées dans les logos.';
    expect(await codes(b)).toEqual(expect.arrayContaining(['nombre_non_soutenu', 'gratuite_non_prouvee']));
    const c = copie(BROUILLON);
    c.accroche.texte = '7 sites gratuits pour le design web';
    expect(await codes(c)).toEqual(expect.arrayContaining(['nombre_non_soutenu', 'gratuite_non_prouvee']));
    const d = copie(BROUILLON);
    d.ressources[1]!.categorie = 'polices gratuites';
    expect(await codes(d)).toContain('mot_cle_affirmatif');
  });

  it('une citation venue d’un autre site, ou absente, est refusée', async () => {
    const b = copie(BROUILLON);
    b.ressources[1]!.explication.passages = ['Ready-to-use prompts to build landing pages.'];
    expect(await codes(b)).toContain('citation_introuvable');
  });

  it('lien : hôte attendu, URL canonique exacte, libellé = nom ; site non capturé ou inconnu refusés', async () => {
    const etat = (f: (b: typeof BROUILLON) => void) => {
      const b = copie(BROUILLON);
      f(b);
      return codes(b);
    };
    expect(await etat((b) => (b.ressources[0]!.url = 'http://alpha.exemple/'))).toContain('lien_hote_inattendu');
    expect(await etat((b) => (b.ressources[0]!.url = 'https://www.alpha.exemple/'))).toContain('lien_hote_inattendu');
    expect(await etat((b) => (b.ressources[0]!.url = 'https://alpha.exemple/fr'))).toContain('lien_non_canonique');
    expect(await etat((b) => (b.ressources[0]!.libelle_lien = 'Voir le site'))).toContain('libelle_incoherent');
    expect(await etat((b) => (b.ressources[0]!.nom = 'Alpha'))).toContain('nom_incoherent');
    expect(await etat((b) => (b.ressources[0]!.site = 'beta'))).toContain('site_non_capture');
    expect(await etat((b) => (b.ressources[0]!.site = 'inconnu'))).toContain('site_inconnu');
    expect(await etat((b) => (b.ressources[1]!.site = 'alpha'))).toContain('site_en_double');
  });

  it('aucun essai revendiqué, aucune popularité invoquée ; un terme proche dit pourquoi il est relié', async () => {
    const b = copie(BROUILLON);
    b.ressources[2]!.explication.texte = 'Nous avons testé ces animations : les plus populaires des apps mobiles.';
    expect(await codes(b)).toEqual(expect.arrayContaining(['essai_non_realise', 'popularite_invoquee']));
    const c = copie(BROUILLON);
    c.ressources[2]!.termes_proches = [{ terme: 'vidéo', raison: 'parce que' }, { terme: 'cinéma', raison: 'Un sujet voisin sans aucun ancrage dans la page' }];
    expect(await codes(c)).toEqual(expect.arrayContaining(['terme_proche_sans_raison', 'terme_proche_non_relie']));
  });

  it('`verifier` reconnaît une sélection et sort en 1 sur un défaut bloquant', async () => {
    expect(await verifier([brouillon()], ctx())).toBe(0);
    expect(JSON.parse(sortie.join('\n'))).toMatchObject({ format: 'selection', resultat: 'conforme' });
    const b = copie(BROUILLON);
    b.ressources[0]!.url = 'https://alpha.exemple/fr';
    sortie = [];
    expect(await verifier([brouillon(b, 'casse.json')], ctx())).toBe(1);
  });
});

describe('importer une sélection : visuel, liens, mots-clés, planification, indexation', () => {
  beforeEach(async () => {
    await selection(['capturer', 'selection-demo'], ctx());
    sortie = [];
  });

  it('conforme : UNE publication en attente, planifiée, indexée ; compte du sujet (design → Mova) ; montage en grille', async () => {
    const r = rendeur();
    expect(await importer([brouillon()], ctx({ rendre: r }))).toBe(0);
    expect(sortie.join('\n')).toMatch(/selection-demo : planifiée le 2026-11-02 \(rang 1\), en attente, indexée/);
    expect(await scalar(t.database, 'select count(*) from post')).toBe(1);
    expect(await ligne('select status, account_id, evidence_level from post')).toMatchObject({ status: 'en_attente', account_id: 'mova', evidence_level: 'documentary_analysis' });
    expect(await ligne('select origine, model, prompt_version, information_type from post_draft')).toMatchObject({ origine: 'claude_code_developpement', model: 'claude-code', prompt_version: 'selection-s1', information_type: 'selection' });
    expect(await scalar(t.database, 'select count(*) from llm_call')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from publication_planifiee')).toBe(1);
    expect(await ligne('select priorite, statut_sortie, utilise_reserve from publication_planifiee')).toMatchObject({ priorite: 2, statut_sortie: 'ressource_existante', utilise_reserve: 0 });
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(1);
    expect(r.montages[0]).toMatchObject({ gabarit: 'selection', compte: 'mova', titre: BROUILLON.accroche.texte });
    expect(r.montages[0]!.apercus!.map((a) => a.nom)).toEqual(['Alpha Book', 'Zeta Fonts', 'Eta Motion', 'Theta Landing']);
    expect(r.montages[0]!.source).toContain('Screenshots of the cited sites, © their owners');
    const media = JSON.parse(String((await ligne('select content, notice from media_asset'))!.content));
    expect(media).toMatchObject({ gabarit: 'selection', droits_a_verifier: true });
    const contenu = JSON.parse(String((await ligne('select content from post_revision'))!.content));
    expect(contenu).toMatchObject({ nature: 'selection', mention: 'Analyse IA à partir des sources — non testé par la plateforme', compte: 'mova' });
    // Captures de fixture : elles ne tiennent pas lieu de vérification ; chaque lien est vérifié par une requête sûre.
    expect(contenu.liens.map((l: { resultat: string; motif: string }) => `${l.resultat}:${l.motif}`)).toEqual(Array(4).fill('verifie:reponse_directe'));
    expect(contenu.exclus.map((x: { site: string; motif: string }) => `${x.site} ${x.motif}`)).toEqual([
      'beta robots: robots_interdit (disallow: /)',
      'gamma redirection (HTTP 301 vers https://alpha.exemple/?ref=gamma)',
      'delta protection_anti_robot (HTTP 403)',
      'epsilon texte_insuffisant (HTTP 200)',
    ]);
  });

  it('indexation : chaque ressource citée retrouve le post, par son nom, son usage ou sa catégorie, avec l’explication', async () => {
    await importer([brouillon()], ctx());
    for (const [q, champ] of [['alpha-book', 'nom'], ['inspiration landing page', 'usage'], ['animations mobile', 'usage'], ['polices', 'usage'], ['typographie', 'categorie'], ['motion design', 'terme_proche']] as const) {
      const res = await rechercher(t.database.client, q, { mode: 'apercu' });
      expect(res.resultats[0], q).toMatchObject({ nom: 'Sélection démo design', etiquette: 'pas encore publié' });
      expect(res.resultats[0]!.correspondances.map((c) => c.champ), q).toContain(champ);
    }
    expect((await rechercher(t.database.client, 'alpha-book', { mode: 'public' })).total).toBe(0);
  });

  it('plafond partagé : une sélection compte pour une place ; jour plein → jour suivant', async () => {
    // Le 2 novembre est plein (20 publications d'autres contenus, hors planning de ce test).
    const { client } = t.database;
    await client.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('x', 'x', 'x', 'agent', 'x', 'x', 'x', 1, '2026-11-01')`);
    await client.execute(`insert into news_item (kind, title, first_seen_at, status) values ('annonce', 'x', '2026-11-01', 'collected')`);
    const tx = await client.transaction('write');
    for (let i = 0; i < 20; i++) {
      const n = await tx.execute(`insert into news_item (kind, title, first_seen_at, status) values ('annonce', 'n${i}', '2026-11-01', 'collected') returning id`);
      const p = await tx.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at) values ('x', ?, 'documentary_analysis', 'en_attente', '2026-11-01') returning id`, args: [Number(n.rows[0]!.id)] });
      await ecrirePlacement(tx, { postId: Number(p.rows[0]!.id), jour: '2026-11-02', rang: null, utiliseReserve: i >= 15, etat: 'prevue', motif: null }, { priorite: 3, statutSortie: 'actualite' }, '2026-11-01');
    }
    await tx.commit();
    tx.close();
    expect(await importer([brouillon()], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/selection-demo : planifiée le 2026-11-03 \(rang 1\)/);
    expect(await scalar(t.database, `select count(*) from publication_planifiee where jour = '2026-11-02'`)).toBe(20);
  });

  it('idempotent ; un aperçu refusé garde sa case « Aperçu indisponible » ; un défaut bloquant rejette sans rien planifier', async () => {
    const f = brouillon();
    await importer([f], ctx());
    const compter = () => Promise.all(['post', 'post_revision', 'media_asset', 'post_mot_cle', 'publication_planifiee', 'recherche_publication'].map((x) => scalar(t.database, `select count(*) from ${x}`)));
    const avant = await compter();
    sortie = [];
    expect(await importer([f], ctx())).toBe(0);
    expect(sortie.join('\n')).toMatch(/selection-demo : inchangée \(en_attente, prévue le 2026-11-02\)/);
    expect(await compter()).toEqual(avant);

    // Nouvel aperçu refusé pour Zeta : sa case reste, sans image de substitution.
    await selection(['apercus', 'selection-demo'], ctx({ refuses: ['zeta'] }));
    const r = rendeur();
    rmSync(join(dossier, 'selection-demo.jpg'));
    await importer([f], ctx({ rendre: r }));
    expect(r.montages[0]!.apercus!.find((a) => a.nom === 'Zeta Fonts')).toMatchObject({ src: null });

    const mauvais = copie(BROUILLON);
    mauvais.ressources[0]!.explication.texte = 'Plus de 900 landing pages choisies à la main.';
    sortie = [];
    expect(await importer([brouillon(mauvais)], ctx())).toBe(1);
    expect(sortie.join('\n')).toMatch(/selection-demo : rejetée — nombre_non_soutenu/);
    expect(await ligne('select status from post')).toMatchObject({ status: 'rejete' });
    expect(await scalar(t.database, 'select count(*) from publication_planifiee')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(0);
  });

  it('lien non vérifié (redirection) : « à vérifier », ni planifiée ni indexée', async () => {
    const table = routes();
    table['https://zeta.exemple/'] = { status: 301, body: '', headers: { location: 'https://www.zeta.exemple/' } };
    expect(await importer([brouillon()], ctx({ table }))).toBe(0);
    expect(sortie.join('\n')).toMatch(/selection-demo : à vérifier — non planifiée, non indexée : lien_non_verifie \(ressources:1\.url : https:\/\/zeta\.exemple\/ : redirection\)/);
    expect(await scalar(t.database, 'select count(*) from publication_planifiee')).toBe(0);
    expect(await scalar(t.database, 'select count(*) from recherche_publication')).toBe(0);
  });

  it('maquette : la sélection apparaît avec sa liste, ses liens et son montage, sans mot-clé ; la recherche du navigateur la trouve', async () => {
    await importer([brouillon()], ctx());
    const d = await buildMaquetteData(t.database.client, '2026-11-02T13:00:00.000Z', []);
    expect(d.selections).toHaveLength(1);
    const s = d.selections[0]!;
    expect(s).not.toHaveProperty('mots_cles');
    expect(s.ressources.map((r) => [r.nom, r.url, r.libelle_lien])).toEqual([
      ['Alpha Book', 'https://alpha.exemple/', 'Alpha Book'],
      ['Zeta Fonts', 'https://zeta.exemple/', 'Zeta Fonts'],
      ['Eta Motion', 'https://eta.exemple/', 'Eta Motion'],
      ['Theta Landing', 'https://theta.exemple/', 'Theta Landing'],
    ]);
    expect(s.accroche.texte).toBe(BROUILLON.accroche.texte);
    expect(s.visuel).toBeNull(); // le faux montage est hors de maquette/ : non servi
    expect(d.news_items.some((n) => n.title === 'Sélection démo design')).toBe(false);
    expect(classer('inspiration landing page', d.recherche).map((x) => x.nom)).toEqual(['Sélection démo design']);
    // Huit jours plus tard, les liens ne sont plus affichés : leur vérification a expiré.
    const tard = await buildMaquetteData(t.database.client, '2026-11-10T13:00:00.000Z', []);
    expect(tard.selections[0]!.ressources.every((r) => r.url === null)).toBe(true);
  });
});

describe('première sélection réelle (liste de l’utilisateur)', () => {
  it('7 sites, compte Mova, URL canoniques en HTTPS ; fontinlogo vérifiée à la main vers www', () => {
    const s = SELECTIONS.find((x) => x.slug === 'selection-design-web')!;
    expect(s.compte).toBe('mova');
    expect(s.sites.map((x) => x.hote)).toEqual(['motionsites.ai', 'land-book.com', 'recent.design', 'landdding.com', 'www.fontinlogo.com', 'godly.website', '60fps.design']);
    expect(s.sites.every((x) => x.url === `https://${x.hote}/`)).toBe(true);
    expect(s.sites.find((x) => x.slug === 'fontinlogo')!.verifiee_a_la_main).toMatch(/301/);
  });
});
