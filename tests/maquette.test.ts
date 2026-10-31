import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { releasesUrl } from '../src/collect/github-releases.ts';
import { buildMaquetteData, contientMotPourMot, excerpt, toPlainText, verifierExemple, verifierProjet, type MaquetteData } from '../src/maquette/data.ts';
import { COMPTES, EXEMPLES, PROJETS, REGISTRE_PULSE, REGISTRE_RADAR, SUJETS, type ExemplePublication } from '../src/maquette/exemples.ts';
import { SOURCES, syncSources, type FeedSource, type GithubReleasesSource } from '../src/sources.ts';
import { runCollect } from '../src/worker/collect.ts';
import { CLAUDE_CODE, createTestDb, fixture, readFixture, routeFetcher, type TestDb } from './helpers/db.ts';

describe('extraits en texte brut', () => {
  it('HTML : balises et scripts retirés, entités décodées', () => {
    expect(toPlainText('<p>Fast &amp; <b>safe</b>&#8217;s</p><script>alert(1)</script><style>p{}</style>', 'html')).toBe('Fast & safe’s');
  });

  it('Markdown : titres, liens, images, listes et mise en forme retirés', () => {
    const md = "## What's changed\n\n- Added `--flag` to **run** ([#12](https://x.test/12))\n* ![logo](a.png) Fixed _bug_";
    expect(toPlainText(md, 'markdown')).toBe('Added --flag to run (#12) Fixed bug');
  });

  it('fidèle au texte : identifiants SNAKE_CASE, chemins ~/ et entités HTML courantes conservés', () => {
    expect(toPlainText('- Added `CLAUDE_CODE_RETRY` and read `~/.claude/settings.json` in **bold** and _it_', 'markdown')).toBe(
      'Added CLAUDE_CODE_RETRY and read ~/.claude/settings.json in bold and it',
    );
    expect(toPlainText('<p>We&rsquo;re here &mdash; really&hellip;</p>', 'html')).toBe('We’re here — really…');
  });

  it('coupe sur un mot avec des points de suspension ; null si vide', () => {
    expect(excerpt('un deux trois quatre', 'markdown', 12)).toBe('un deux…');
    expect(excerpt('court', 'markdown', 12)).toBe('court');
    expect(excerpt('<p> </p>', 'html')).toBeNull();
  });
});

describe('données de la maquette', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.cleanup());

  const collect = (mode: 'live' | 'fixture') =>
    runCollect({
      database: t.database,
      fetcher: routeFetcher({ [releasesUrl(CLAUDE_CODE.config)]: readFixture() }),
      mode,
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [CLAUDE_CODE],
    });

  it("n'affiche jamais une capture de fixture comme une collecte réelle", async () => {
    await collect('fixture');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items).toEqual([]);
    expect(data.excluded_not_live).toBe(5);
    // L'exemple Claude Code 2.1.312 a bien son actualité, mais aucune capture « live » : il n'est pas montré.
    expect(data.exemples).toEqual([]);
    expect(data.exemples_introuvables.find((e) => e.id === 'exemple-claude-code-2-1-312')?.motif).toBe(
      'dernière capture non issue d’une collecte réelle',
    );
  });

  it('collecte réelle puis relecture de fixture sur la même base : ni versions ni date de collecte venues de la fixture', async () => {
    const releases = JSON.parse(readFixture()) as unknown[];
    const url = releasesUrl(CLAUDE_CODE.config);
    const run = (mode: 'live' | 'fixture', body: string, at: string) =>
      runCollect({
        database: t.database,
        fetcher: routeFetcher({ [url]: body }),
        mode,
        workerId: 'test-worker',
        leaseMs: 60_000,
        maxAttempts: 3,
        retryBackoffMs: 60_000,
        definitions: [CLAUDE_CODE],
        clock: () => new Date(at),
      });
    await run('live', JSON.stringify(releases.slice(0, 2)), '2026-10-30T01:00:00.000Z');
    await run('fixture', readFixture(), '2026-10-30T02:00:00.000Z');

    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z');
    expect(data.news_items.map((item) => item.version)).toEqual(['2.1.312', '2.1.311']);
    expect(data.products[0]?.versions.map((version) => version.version)).toEqual(['2.1.312', '2.1.311']);
    expect(data.sources[0]).toMatchObject({ status: 'ok', last_success_at: '2026-10-30T01:00:00.000Z' });
  });

  it('une source retirée du registre garde sa ligne en base, mais n’est plus présentée', async () => {
    await collect('live');
    await syncSources(t.database, [{ ...CLAUDE_CODE, id: 'github-releases:exemple/retiree' }], '2026-10-30T00:00:00.000Z');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.sources.map((source) => source.id)).toEqual([CLAUDE_CODE.id]);
  });

  it('collecte réelle : actualités datées, rattachées à leur produit et à leur version, avec un extrait en texte brut', async () => {
    await collect('live');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items).toHaveLength(5);
    const dates = data.news_items.map((item) => item.announced_at!);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const item of data.news_items) {
      expect(item.kind).toBe('version');
      expect(item.product?.key).toBe('anthropic/claude-code');
      expect(item.title).toBe(`Claude Code ${item.version}`);
      expect(item.source.url).toMatch(/^https:\/\/github\.com\/anthropics\/claude-code\/releases\/tag\//);
      expect(item.capture.mode).toBe('live');
      expect(item.excerpt === null || !/[<>#`]/.test(item.excerpt)).toBe(true);
    }
    expect(data.products[0]?.versions).toHaveLength(5);
  });

  it("une annonce de flux n'a ni produit ni version", async () => {
    const feed = SOURCES.find((def) => def.id === 'feed:github-changelog')!;
    if (feed.kind !== 'feed') throw new Error('source inattendue');
    await runCollect({
      database: t.database,
      fetcher: routeFetcher({ [feed.config.url]: fixture('feed-github-changelog.xml') }),
      mode: 'live',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [feed],
    });
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.news_items.length).toBe(10);
    expect(data.news_items.every((item) => item.kind === 'annonce' && item.product === null && item.version === null)).toBe(true);
    expect(data.news_items.some((item) => item.categories.length > 0)).toBe(true);
  });
});

describe('exemples de publications de la maquette', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.cleanup());

  const source = <T extends GithubReleasesSource | FeedSource>(id: string) => SOURCES.find((def) => def.id === id) as T;
  const codex = source<GithubReleasesSource>('github-releases:openai/codex');
  const changelog = source<FeedSource>('feed:github-changelog');
  const google = source<FeedSource>('feed:google-gemini');

  /** Collecte « live » servie par les fixtures réelles des trois sources citées par les exemples. */
  const collectLive = () =>
    runCollect({
      database: t.database,
      fetcher: routeFetcher({
        [releasesUrl(CLAUDE_CODE.config)]: readFixture(),
        [releasesUrl(codex.config)]: fixture('github-releases-openai-codex.json'),
        [changelog.config.url]: fixture('feed-github-changelog.xml'),
        [google.config.url]: fixture('feed-google-gemini.xml'),
      }),
      mode: 'live',
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [CLAUDE_CODE, codex, changelog, google],
    });

  it('tous les exemples sont rattachés à leur actualité réelle et toutes leurs citations sont retrouvées mot pour mot', async () => {
    await collectLive();
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z');
    expect(data.exemples_introuvables).toEqual([]);
    expect(data.exemples.map((e) => e.id)).toEqual(EXEMPLES.map((e) => e.id));
    for (const exemple of data.exemples) {
      const original = EXEMPLES.find((e) => e.id === exemple.id)!;
      expect(exemple.motifs).toEqual([]);
      expect(exemple.statut).toBe('verifie');
      expect(exemple.actualite.source).toMatchObject({ id: original.source_id, url: original.url });
      expect(data.news_items.some((item) => item.id === exemple.actualite.id)).toBe(true);
      expect(exemple.capture).toMatchObject({ mode: 'live' });
      expect(exemple.capture.run_id).toMatch(/\S/);
      expect(exemple.capture.text_length).toBeGreaterThan(100);
      const champs = [exemple.accroche, exemple.nouveaute, exemple.ce_que_ca_permet, exemple.pour_qui, exemple.limites_connues];
      const passages = [...champs, ...exemple.details, ...exemple.attributions].flatMap((champ) => champ?.passages ?? []);
      expect(passages.length).toBeGreaterThan(0);
      expect(passages.every((passage) => passage.trouve)).toBe(true);
      // Le média n'ajoute aucune affirmation : chaque diapositive est le texte exact du champ qu'elle nomme dans
      // exemples.ts (ou « Non renseigné » si ce champ est vide), et ce champ est entièrement vérifié.
      for (const diapositive of exemple.diapositives) {
        const cle = diapositive.champ;
        const source = cle.startsWith('details:') ? original.details[Number(cle.slice(8))] : original[cle as 'accroche'];
        const verifie = cle.startsWith('details:') ? exemple.details[Number(cle.slice(8))] : exemple[cle as 'accroche'];
        expect(diapositive.texte).toBe(source ? source.texte : null);
        if (verifie) expect(verifie.passages.every((p) => p.trouve)).toBe(true);
      }
      // Le titre du média nomme l'actualité ; les titres des détails ne sont que des libellés (aucun nombre).
      const nomme = [exemple.actualite.title, exemple.actualite.version, exemple.actualite.product?.name].filter(Boolean).join(' | ');
      expect(nomme).toContain(exemple.titre_media);
      for (const detail of original.details) {
        expect(detail.titre).not.toMatch(/\p{N}/u);
        expect(detail.titre.length).toBeLessThanOrEqual(45);
      }
    }
    const claudeCode = data.exemples.find((e) => e.id === 'exemple-claude-code-2-1-312')!;
    expect(claudeCode.actualite).toMatchObject({ kind: 'version', version: '2.1.312', title: 'Claude Code 2.1.312' });
    expect(claudeCode.diapositives.find((d) => d.champ === 'limites_connues')).toEqual({
      champ: 'limites_connues',
      libelle: 'Limites connues',
      texte: null,
    });
    const fusion = data.exemples.find((e) => e.id === 'exemple-copilot-fusion')!;
    expect(fusion.actualite).toMatchObject({ kind: 'annonce', product: null, version: null });
    expect(fusion.attributions.map((a) => a.type)).toEqual(['benchmark', 'temoignage']);
  });

  it('un passage absent de la capture met l’exemple « à vérifier » sans masquer les autres passages', async () => {
    await collectLive();
    const [premier] = EXEMPLES;
    const faux: ExemplePublication = {
      ...premier!,
      accroche: { ...premier!.accroche, passages: [...premier!.accroche.passages, 'Copilot Fusion is free for everyone.'] },
    };
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z', [faux]);
    expect(data.exemples).toHaveLength(1);
    expect(data.exemples[0]).toMatchObject({ statut: 'a_verifier', motifs: ['citation introuvable'] });
    expect(data.exemples[0]!.accroche.passages.map((p) => p.trouve)).toEqual([...premier!.accroche.passages.map(() => true), false]);
    expect(data.exemples[0]!.nouveaute.passages.every((p) => p.trouve)).toBe(true);
  });

  /** Collecte « live » du seul GitHub Changelog, avec un corps donné et une horloge fixe. */
  const collecteChangelog = (corps: string, mode: 'live' | 'fixture', a: string) =>
    runCollect({
      database: t.database,
      fetcher: routeFetcher({ [changelog.config.url]: corps }),
      mode,
      workerId: 'test-worker',
      leaseMs: 60_000,
      maxAttempts: 3,
      retryBackoffMs: 60_000,
      definitions: [changelog],
      clock: () => new Date(a),
    });
  const FUSION = EXEMPLES.find((e) => e.id === 'exemple-copilot-fusion')!;
  const flux = () => fixture('feed-github-changelog.xml');
  // Passage de l'accroche retiré de l'entrée Copilot Fusion (résumé et contenu complet).
  const sansPassage = () => {
    const corps = flux().replaceAll('GitHub Copilot Fusion is generally available.', 'GitHub Copilot Fusion is now in preview.');
    expect(corps).not.toBe(flux());
    return corps;
  };

  it('deux collectes réelles : la plus récente fait foi (passage retiré → « à vérifier » ; date de la nouvelle capture)', async () => {
    await collecteChangelog(flux(), 'live', '2026-10-30T01:00:00.000Z');
    await collecteChangelog(sansPassage(), 'live', '2026-10-30T02:00:00.000Z');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z', [FUSION]);
    expect(data.exemples[0]).toMatchObject({ statut: 'a_verifier', motifs: ['citation introuvable'] });
    expect(data.exemples[0]!.capture.captured_at).toBe('2026-10-30T02:00:00.000Z');
  });

  it('cas inverse : un passage présent seulement dans la capture la plus récente est retrouvé', async () => {
    await collecteChangelog(sansPassage(), 'live', '2026-10-30T01:00:00.000Z');
    await collecteChangelog(flux(), 'live', '2026-10-30T02:00:00.000Z');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z', [FUSION]);
    expect(data.exemples[0]).toMatchObject({ statut: 'verifie', motifs: [] });
  });

  it('collecte réelle puis relecture de fixture modifiée : l’exemple est écarté comme l’actualité du fil', async () => {
    await collecteChangelog(flux(), 'live', '2026-10-30T01:00:00.000Z');
    await collecteChangelog(sansPassage(), 'fixture', '2026-10-30T02:00:00.000Z');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z', [FUSION]);
    expect(data.exemples).toEqual([]);
    expect(data.exemples_introuvables[0]?.motif).toBe('dernière capture non issue d’une collecte réelle');
    expect(data.news_items.some((item) => item.source.url === FUSION.url)).toBe(false);
  });

  it('un titre de média qui ne nomme pas l’actualité met l’exemple « à vérifier »', async () => {
    await collecteChangelog(flux(), 'live', '2026-10-30T01:00:00.000Z');
    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z', [{ ...FUSION, titre_media: 'Fusion 2' }]);
    expect(data.exemples[0]).toMatchObject({ statut: 'a_verifier' });
    expect(data.exemples[0]!.motifs).toContain('titre du média absent de l’actualité');
  });

  it('un média original absent de la capture met l’exemple « à vérifier »', async () => {
    await collecteChangelog(flux(), 'live', '2026-10-30T01:00:00.000Z');
    const faux = { ...FUSION, visuel: { ...FUSION.visuel, original: { url: 'https://example.test/image.png', libelle: 'Original' } } };
    const data = await buildMaquetteData(t.database.client, '2026-10-30T03:00:00.000Z', [faux]);
    expect(data.exemples[0]!.motifs).toContain('média original absent de la capture');
  });

  it('un exemple dont le document n’a jamais été collecté est signalé introuvable, pas affiché', async () => {
    await collectLive();
    const inconnu: ExemplePublication = { ...EXEMPLES[0]!, id: 'exemple-inconnu', url: 'https://github.blog/changelog/2026-10-28-inexistant' };
    const data = await buildMaquetteData(t.database.client, '2026-10-30T00:00:00.000Z', [inconnu]);
    expect(data.exemples).toEqual([]);
    expect(data.exemples_introuvables).toEqual([
      { id: 'exemple-inconnu', source_id: 'feed:github-changelog', url: inconnu.url, motif: 'actualité absente de la base' },
    ]);
  });
});

describe('comptes, médias et projets', () => {
  it('chaque compte a son profil complet et le badge dérive du type', () => {
    expect(COMPTES.map((c) => c.id)).toEqual(['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar']);
    for (const c of COMPTES) {
      expect(c).toMatchObject({ type: 'agent', provisoire: true });
      for (const champ of [c.nom, c.identifiant, c.biographie, c.specialite, c.avatar]) expect(champ).toMatch(/\S/);
    }
  });

  it('Pulse n’a aucune publication tant qu’aucun incident n’est collecté ; une découverte n’est jamais une preuve', () => {
    expect([...EXEMPLES, ...PROJETS].some((e) => (e.compte as string) === 'pulse')).toBe(false);
    for (const nom of ['Pages de statut', 'Post-mortems officiels']) expect(REGISTRE_PULSE.find((s) => s.famille === nom)?.role).toBe('vérification');
    for (const nom of ['Issues GitHub', 'Communautés Reddit', 'Experts sur X']) expect(REGISTRE_PULSE.find((s) => s.famille === nom)?.role).toBe('découverte');
  });

  it('Reddit reste au registre comme source différée, motif affiché, sans être présenté comme connecté', () => {
    const lignes = [...REGISTRE_PULSE, ...REGISTRE_RADAR].filter((s) => s.famille.includes('Reddit'));
    expect(lignes).toHaveLength(2);
    for (const ligne of lignes) expect(ligne).toMatchObject({ etat: 'differe', note: expect.stringContaining('aucun accès autorisé') });
    expect(readFileSync('maquette/index.html', 'utf8')).toContain("differe: ['neutre', 'Différée']");
  });

  it('le bandeau date les données par la dernière collecte, pas par la génération de la page', () => {
    const page = readFileSync('maquette/index.html', 'utf8');
    expect(page).toContain('dernière collecte le ${quand(derniereCollecte)}');
    expect(page).not.toContain('données relevées');
  });

  it('Radar publie avec une photo créditée ; seule une source connectée est présentée comme telle', () => {
    expect(EXEMPLES.filter((e) => e.compte === 'radar').map((e) => e.visuel.photo?.credit)).toEqual(['Source: Google.']);
    expect(REGISTRE_RADAR.filter((s) => s.etat === 'connecte').map((s) => s.famille)).toEqual(['GitHub Changelog (Microsoft)']);
  });

  it('une même actualité n’a qu’une publication', () => {
    const urls = EXEMPLES.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('chaque publication est signée par un compte existant', () => {
    const ids: string[] = COMPTES.map((c) => c.id);
    const auteurs = [...EXEMPLES, ...PROJETS].map((e) => e.compte);
    expect(auteurs.every((a) => ids.includes(a))).toBe(true);
  });

  it('un élément de média sans citation retrouvée met l’exemple « à vérifier »', () => {
    const ex = EXEMPLES[2]!;
    const faux = { ...ex, visuel: { ...ex.visuel, elements: [{ texte: 'codex magic', passages: ['codex magic'] }] } };
    expect(verifierExemple(faux, 'rien').motifs).toContain('citation introuvable');
  });

  it('projet GitHub : étoiles datées, progression inconnue à null, passages retrouvés', () => {
    for (const p of PROJETS) {
      expect(verifierProjet(p).verifie).toBe(true);
      expect(p.progression_etoiles).toBeNull();
      expect(p.mesure_le).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    expect(verifierProjet({ ...PROJETS[0]!, capture: 'autre' }).verifie).toBe(false);
  });

  it('les sujets sans collecte sont signalés, sans exemple inventé', () => {
    const aConstruire = SUJETS.filter((s) => s.etat === 'a_construire').map((s) => s.sujet);
    expect(aConstruire).toEqual(expect.arrayContaining(['Extensions Chrome', 'Matériel et robotique', 'Incidents importants']));
  });
});

describe('contrôle d’un exemple', () => {
  const base: ExemplePublication = {
    ...EXEMPLES[2]!,
    description: { texte: 'Description', passages: ['Added codex doctor --network-only'] },
    visuel: { forme: 'terminal', legende: 'Reconstitution de la commande citée', elements: [] },
    accroche: { texte: 'Accroche', passages: ['Added codex doctor --network-only'] },
    nouveaute: { texte: 'Nouveauté', passages: ['for focused configuration,\n  connectivity'] },
    ce_que_ca_permet: null,
    pour_qui: null,
    limites_connues: null,
    details: [],
    attributions: [],
    diapositives: ['accroche'],
  };
  const capture = 'Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.';

  it('espaces normalisés des deux côtés ; aucune autre tolérance (casse, ponctuation)', () => {
    expect(verifierExemple(base, capture).statut).toBe('verifie');
    const casse = { ...base, accroche: { texte: 'Accroche', passages: ['added codex doctor --network-only'] } };
    expect(verifierExemple(casse, capture)).toMatchObject({ statut: 'a_verifier', motifs: ['citation introuvable'] });
  });

  it('champ factuel sans citation et diapositive sans champ correspondant → « à vérifier »', () => {
    const sansCitation = { ...base, nouveaute: { texte: 'Nouveauté', passages: [] } };
    expect(verifierExemple(sansCitation, capture).motifs).toEqual(['champ factuel sans citation']);
    const diapositive = { ...base, diapositives: ['accroche', 'details:3'] as ExemplePublication['diapositives'] };
    const resultat = verifierExemple(diapositive, capture);
    expect(resultat.motifs).toEqual(['diapositive sans champ correspondant']);
    expect(resultat.diapositives[1]).toEqual({ champ: 'details:3', libelle: 'details:3', texte: null });
  });

  it('mots entiers : une occurrence coupée au milieu d’un mot ne compte pas', () => {
    expect(contientMotPourMot('Fusion Max scored 60, within two points', 'Fusion Max scored 6')).toBe(false);
    expect(contientMotPourMot('Copilot Fusion is unavailable on all Copilot plans', 'available on all Copilot plans')).toBe(false);
    expect(contientMotPourMot('unavailable here; available on all Copilot plans', 'available on all Copilot plans')).toBe(true);
    expect(contientMotPourMot('Fusion Max scored 60, within two points', 'scored 60,')).toBe(true);
    expect(contientMotPourMot('a (#12) b', '(#12)')).toBe(true);
  });

  it('nombres : une occurrence coupée à un séparateur décimal ne compte pas', () => {
    expect(contientMotPourMot('Claude Code with Opus 5.5 Max', 'Claude Code with Opus 5')).toBe(false);
    expect(contientMotPourMot('to GPT-6.1 Terra', 'GPT-6')).toBe(false);
    expect(contientMotPourMot('it costs $1.50 per task', 'costs $1.')).toBe(false);
    expect(contientMotPourMot('within 2.5 points of', '5 points of')).toBe(false);
    expect(contientMotPourMot('Version 2.1. Next', 'Version 2.1.')).toBe(true);
    expect(contientMotPourMot('scored 60, within', 'scored 60,')).toBe(true);
  });

  it('ponctuation exacte ; seuls les espaces (y compris insécables et tabulations) sont normalisés', () => {
    const avec = (passage: string, texte = capture) => verifierExemple({ ...base, accroche: { texte: 'Accroche', passages: [passage] } }, texte).statut;
    expect(avec('Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics')).toBe('verifie');
    expect(avec('diagnostics.. ')).toBe('a_verifier');
    expect(avec('Added codex doctor —network-only')).toBe('a_verifier');
    expect(avec('Added\u00a0codex\tdoctor')).toBe('verifie');
    expect(avec('There’s no need', "There's no need to switch")).toBe('a_verifier');
    expect(avec('“to send now”', 'clicking the "to send now" hint')).toBe('a_verifier');
  });

  it('chaque nombre d’un texte figure dans ses citations, sauf la version de l’actualité', () => {
    const texte = (t: string) => ({ ...base, nouveaute: { texte: t, passages: ['for focused configuration,\n  connectivity'] } });
    expect(verifierExemple(texte('Diagnostic de la configuration en 3 étapes.'), capture).motifs).toEqual(['nombre absent des citations']);
    expect(verifierExemple(texte('Version 0.166.0 : diagnostic de la configuration.'), capture, '0.166.0').statut).toBe('verifie');
    // Virgule décimale française : « 5,5 » correspond à « 5.5 » de la source.
    const opus = { ...base, nouveaute: { texte: 'Comparé à Opus 5,5 Max.', passages: ['Opus 5.5 Max'] } };
    expect(verifierExemple(opus, `${capture} It scored 60 against Opus 5.5 Max.`).statut).toBe('verifie');
  });

  it('un libellé de détail hors de la liste fermée met l’exemple « à vérifier »', () => {
    const detail = { titre: 'Deux fois moins cher', texte: 'Diagnostic.', passages: ['Added codex doctor --network-only'] };
    const resultat = verifierExemple({ ...base, details: [detail as never] }, capture);
    expect(resultat.motifs).toEqual(['libellé de détail non prévu']);
  });

  it('un passage vide n’est jamais considéré comme trouvé', () => {
    const vide = { ...base, accroche: { texte: 'Accroche', passages: ['   '] } };
    expect(verifierExemple(vide, capture).motifs).toEqual(['citation introuvable']);
  });
});

describe('maquette/donnees.js versionné', () => {
  // Garde-fou contre des données de maquette périmées : si exemples.ts change, relancer « npm run maquette ».
  const code = readFileSync(new URL('../maquette/donnees.js', import.meta.url), 'utf8');
  const fenetre: { DONNEES_MAQUETTE?: MaquetteData } = {};
  new Function('window', code)(fenetre);
  const donnees = fenetre.DONNEES_MAQUETTE!;
  // Champs d'un exemple (source ou généré) ramenés à leurs textes et passages, pour les comparer.
  type Champ = { texte: string; passages: (string | { texte: string })[] } | null;
  const textes = (e: { accroche: Champ; nouveaute: Champ; ce_que_ca_permet: Champ; pour_qui: Champ; limites_connues: Champ; details: Champ[]; attributions: Champ[] }) =>
    [e.accroche, e.nouveaute, e.ce_que_ca_permet, e.pour_qui, e.limites_connues, ...e.details, ...e.attributions].map((c) =>
      c ? { texte: c.texte, passages: c.passages.map((p) => (typeof p === 'string' ? p : p.texte)) } : null,
    );

  it('contient les exemples actuels, tous vérifiés, avec leurs textes, passages, diapositives et titres', () => {
    expect(donnees.exemples_introuvables).toEqual([]);
    expect(donnees.exemples.map((e) => e.id).sort()).toEqual(EXEMPLES.map((e) => e.id).sort());
    for (const original of EXEMPLES) {
      const genere = donnees.exemples.find((e) => e.id === original.id)!;
      expect(genere.statut).toBe('verifie');
      expect(genere.titre_media).toBe(original.titre_media);
      expect(genere.diapositives.map((d) => d.champ)).toEqual(original.diapositives);
      expect(genere.details.map((d) => d.titre)).toEqual(original.details.map((d) => d.titre));
      expect(textes(genere)).toEqual(textes(original));
    }
  });
});
