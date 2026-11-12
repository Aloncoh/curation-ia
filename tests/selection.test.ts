import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { releasesUrl } from '../src/collect/github-releases.ts';
import { consignesActuelles, decisionDepuisNotes, deciderSelection, preselection, texteConsignes, VERSIONS_CONSIGNES, type AnalyseSelection, type Criteres } from '../src/selection/consignes.ts';
import { figerCorpus, sujetsDuCorpus, tirerCorpus } from '../src/selection/corpus.ts';
import { comparer, evaluer, testDuSigne, type Cas } from '../src/selection/evaluation.ts';
import { casPourJuge, correctionsARelire, decisionsDuSujet, enregistrerAvis, enregistrerJugements, expliquer, preparerJugement, SchemaAvis, veritesEvaluation, type Jugement } from '../src/selection/registre.ts';
import { runCollect } from '../src/worker/collect.ts';
import { CLAUDE_CODE, createTestDb, readFixture, routeFetcher, type TestDb } from './helpers/db.ts';

const notes = (n: number, u: number, i: number, s: number): Criteres => ({
  nouveaute_reelle: { note: n, raison: 'Une fonction nouvelle.' },
  utilite_concrete: { note: u, raison: 'Usage décrit.' },
  impact_utilisateurs: { note: i, raison: 'Concerne notre public.' },
  solidite_sources: { note: s, raison: 'Source d’origine.' },
});
const analyse = (changements: Partial<AnalyseSelection> = {}): AnalyseSelection => ({ criteres: notes(2, 2, 2, 2), passages: ['adds offline mode'], compte: 'pyxo', type_information: 'annonce_officielle', motif_rejet: null, ...changements });
const CAPTURE = ['Acme Tool 2.0', 'Acme Tool 2.0 adds offline mode for everyone.'];

describe('décision déduite des notes', () => {
  it.each([
    [2, 2, 2, 2, 'publier'],
    [2, 1, 1, 2, 'publier'],
    [1, 1, 2, 2, 'publier'],
    [1, 1, 1, 2, 'ecarter'],
    [2, 2, 2, 1, 'approfondir'],
    [2, 1, 1, 1, 'approfondir'],
    [2, 2, 2, 0, 'approfondir'],
    [1, 1, 1, 1, 'ecarter'],
    [0, 2, 2, 2, 'ecarter'],
    [2, 0, 2, 2, 'ecarter'],
    [2, 2, 0, 2, 'ecarter'],
  ])('notes %i %i %i %i → %s', (n, u, i, s, attendu) => {
    expect(decisionDepuisNotes(notes(n, u, i, s))).toBe(attendu);
  });
});

describe('garde-fous de la sélection', () => {
  it('un sujet solide et utile est retenu', () => {
    expect(deciderSelection(analyse(), CAPTURE)).toEqual({ decision: 'publier', motif: 'criteres_remplis' });
  });
  it('un passage absent, ou aucun passage, descend en approfondissement', () => {
    expect(deciderSelection(analyse({ passages: ['adds online mode'] }), CAPTURE).motif).toBe('passage_introuvable');
    expect(deciderSelection(analyse({ passages: [] }), CAPTURE).motif).toBe('passage_introuvable');
  });
  it('un passage ne peut pas enjamber le titre et le texte', () => {
    expect(deciderSelection(analyse({ passages: ['Acme Tool 2.0 Acme Tool 2.0'] }), CAPTURE).decision).toBe('approfondir');
  });
  it.each(['non_confirmee', 'opinion', 'temoignage'])('type %s : jamais publié', (type_information) => {
    expect(deciderSelection(analyse({ type_information }), CAPTURE)).toEqual({ decision: 'approfondir', motif: 'information_non_confirmee' });
  });
  it('la popularité dans une justification bloque la publication', () => {
    const criteres = notes(2, 2, 2, 2);
    for (const raison of ['Projet très populaire sur GitHub.', 'Beaucoup d’étoiles.', 'Annonce d’un géant du secteur.', 'Le leader du marché.', 'Utilisé par 200 millions de personnes.', 'Popular tool among developers.', 'Trending on GitHub.', 'Largement utilisé.', '3 millions d’utilisateurs.']) {
      expect(deciderSelection(analyse({ criteres: { ...criteres, impact_utilisateurs: { note: 2, raison } } }), CAPTURE)).toEqual({ decision: 'approfondir', motif: 'popularite_dans_la_justification' });
    }
  });
  it('un mot voisin ne déclenche pas le garde-fou de popularité', () => {
    const criteres = notes(2, 2, 2, 2);
    expect(deciderSelection(analyse({ criteres: { ...criteres, impact_utilisateurs: { note: 2, raison: 'Utile aux startups et aux étudiants.' } } }), CAPTURE).decision).toBe('publier');
  });
  it('un doute exprimé par le modèle bloque, même avec de bonnes notes', () => {
    expect(deciderSelection(analyse({ motif_rejet: 'non_confirmee' }), CAPTURE)).toEqual({ decision: 'approfondir', motif: 'non_confirmee' });
  });
  it('un passage trop court ou trop long ne soutient rien', () => {
    expect(deciderSelection(analyse({ passages: ['for'] }), CAPTURE).motif).toBe('passage_introuvable');
    expect(deciderSelection(analyse({ passages: [' '] }), CAPTURE).motif).toBe('passage_introuvable');
    expect(deciderSelection(analyse({ passages: [`${'mot '.repeat(80)}`] }), [`${'mot '.repeat(80)}`]).motif).toBe('passage_introuvable');
  });
  it('les espaces de la capture ne font pas échouer une citation exacte', () => {
    expect(deciderSelection(analyse({ passages: ['adds offline mode'] }), ['Acme Tool 2.0', 'Acme adds\n  offline   mode']).decision).toBe('publier');
  });
  it('sans compte, rien ne part en rédaction', () => {
    expect(deciderSelection(analyse({ compte: null }), CAPTURE)).toEqual({ decision: 'approfondir', motif: 'compte_absent' });
  });
  it('des preuves partielles laissent le sujet à approfondir, avec un motif distinct d’une source absente', () => {
    expect(deciderSelection(analyse({ criteres: notes(2, 2, 2, 1) }), CAPTURE).motif).toBe('preuve_partielle');
    expect(deciderSelection(analyse({ criteres: notes(2, 2, 2, 0) }), CAPTURE).motif).toBe('source_insuffisante');
  });
  it('un sujet écarté garde le motif du modèle, ou un motif par défaut', () => {
    expect(deciderSelection(analyse({ criteres: notes(0, 2, 2, 2), motif_rejet: 'republication' }), CAPTURE)).toEqual({ decision: 'ecarter', motif: 'republication' });
    expect(deciderSelection(analyse({ criteres: notes(0, 2, 2, 2) }), CAPTURE).motif).toBe('sans_interet_concret');
  });
  it('rien ne fait remonter un sujet : une décision ne devient jamais publier sans ses notes', () => {
    expect(deciderSelection(analyse({ criteres: notes(1, 1, 1, 2) }), CAPTURE).decision).toBe('ecarter');
  });
});

describe('présélection par le code', () => {
  it('écarte une entrée ancienne à la première vue, sans appel', () => {
    expect(preselection({ annonceLe: '2026-01-01T00:00:00.000Z', vuLe: '2026-10-30T00:00:00.000Z' })).toEqual({ decision: 'ecarter', motif: 'ancienne_a_la_detection' });
  });
  it('laisse passer une entrée récente, à la limite comprise, et une date inconnue', () => {
    expect(preselection({ annonceLe: '2026-10-16T00:00:00.000Z', vuLe: '2026-10-30T00:00:00.000Z' })).toBeNull();
    expect(preselection({ annonceLe: null, vuLe: '2026-10-30T00:00:00.000Z' })).toBeNull();
  });
});

describe('consignes versionnées', () => {
  it('les interdits de popularité figurent dans le texte envoyé au juge', () => {
    const texte = texteConsignes(consignesActuelles());
    expect(texte).toContain('la popularité');
    expect(texte).toContain('étoiles GitHub');
    expect(texte).toContain('notoriété');
  });
  it('une version existante ne change jamais : toute retouche doit créer une nouvelle version', () => {
    const empreintes = Object.fromEntries(VERSIONS_CONSIGNES.map((v) => [v.version, createHash('sha256').update(texteConsignes(v)).digest('hex').slice(0, 16)]));
    expect(empreintes).toEqual({ s1: '1a811916118e515c', s2: '567eb930e5f8a74f', s3: '2c448805d17fbcd3', s4: '1b96fae7f0e4ffee', s5: 'ed40f92af2ed970e', s6: '111a3825d75f4456' });
  });
  it('s6 (décision du 2026-11-12, « Oui, toutes ») : une cyberattaque majeure entre dans le périmètre sans lien avec l’IA', () => {
    const texte = texteConsignes(consignesActuelles());
    expect(texte).toContain("Une cyberattaque majeure est dans le périmètre même sans lien avec l'IA ni avec le développement.");
    expect(texte).toContain('Un incident local ou de petite ampleur reste à 0.');
    // Première révélation (2), sans conseil pratique (1), hors des outils de notre public (1), source nommée (2) : publiable.
    expect(decisionDepuisNotes(notes(2, 1, 1, 2))).toBe('publier');
    expect(decisionDepuisNotes(notes(2, 1, 0, 2))).toBe('ecarter');
  });
  it('s5 (décision du 2026-11-05) : la big tech entre dans le périmètre seulement liée à l’IA', () => {
    const texte = texteConsignes(consignesActuelles());
    expect(consignesActuelles().version).toBe('s6');
    expect(texte).toContain("Dans le périmètre seulement si le document relie explicitement le sujet à l'IA");
    expect(texte).toContain('Sans ce lien écrit dans le document (livraison, sport, mécénat, montre, investissement local, nomination), impact 0.');
    expect(texte).toContain('Le chiffre reste une affirmation de l\'entreprise.');
  });
  it('les versions sont uniques et datées', () => {
    expect(new Set(VERSIONS_CONSIGNES.map((v) => v.version)).size).toBe(VERSIONS_CONSIGNES.length);
    for (const v of VERSIONS_CONSIGNES) expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('un exemple ajouté cite toujours l’avis humain dont il vient', () => {
    for (const v of VERSIONS_CONSIGNES) for (const e of v.exemples) expect(e.avis).toBeGreaterThan(0);
  });
  it('les exemples relus s’ajoutent au texte envoyé au juge', () => {
    const v = { ...consignesActuelles(), exemples: [{ titre: 'Sujet', decision: 'ecarter' as const, raison: 'Pas de nouveauté.', avis: 1 }] };
    expect(texteConsignes(v)).toContain('« Sujet » : ecarter. Pas de nouveauté.');
  });
});

describe('tirage du corpus', () => {
  const candidats = ['a', 'b', 'c'].flatMap((source, s) => Array.from({ length: 10 }, (_, i) => ({ id: s * 100 + i + 1, source })));
  it('est reproductible et dépend de la graine', () => {
    const tailles = { developpement: 3, evaluation: 6 };
    expect(tirerCorpus(candidats, 'g', tailles)).toEqual(tirerCorpus(candidats, 'g', tailles));
    expect(tirerCorpus(candidats, 'g', tailles)).not.toEqual(tirerCorpus(candidats, 'autre', tailles));
  });
  it('les deux jeux sont disjoints et chaque source donne à tour de rôle', () => {
    const t = tirerCorpus(candidats, 'g', { developpement: 3, evaluation: 6 });
    expect(new Set(t.map((x) => x.id)).size).toBe(9);
    expect(new Set(t.filter((x) => x.jeu === 'developpement').map((x) => x.strate)).size).toBe(3);
    for (const source of ['a', 'b', 'c']) expect(t.filter((x) => x.strate === source)).toHaveLength(3);
  });
  it('une source trop petite ne bloque pas le tirage', () => {
    expect(tirerCorpus([{ id: 1, source: 'a' }, { id: 2, source: 'b' }, { id: 3, source: 'b' }], 'g', { developpement: 2, evaluation: 5 })).toHaveLength(3);
  });
});

describe('évaluation', () => {
  const cas = (id: number, decision: Cas['decision'], humain: Cas['humain']): Cas => ({ id, decision, humain });
  it('compte à part les publications à tort et les sujets manqués', () => {
    const b = evaluer([cas(1, 'publier', 'publier'), cas(2, 'publier', 'ecarter'), cas(3, 'ecarter', 'publier'), cas(4, 'approfondir', 'publier'), cas(5, 'ecarter', 'ecarter')]);
    expect(b).toMatchObject({ n: 5, accords: 2, taux_accord: 0.4, publies_a_tort: 1, manques: 1, precision_publier: 0.5 });
    expect(b.rappel_publier).toBeCloseTo(1 / 3);
    expect(b.matrice.publier.ecarter).toBe(1);
  });
  it('sans cas, rien n’est annoncé', () => {
    expect(evaluer([])).toMatchObject({ n: 0, taux_accord: null, precision_publier: null, rappel_publier: null });
  });
  it('test du signe : valeurs exactes', () => {
    expect(testDuSigne(0, 0)).toBe(1);
    expect(testDuSigne(5, 0)).toBeCloseTo(0.0625);
    expect(testDuSigne(6, 0)).toBeCloseTo(0.03125);
    expect(testDuSigne(5, 5)).toBe(1);
  });
  const base = Array.from({ length: 8 }, (_, i) => cas(i + 1, 'ecarter', 'publier'));
  it('une amélioration n’est déclarée démontrée que si elle dépasse le hasard', () => {
    const six = base.map((c, i) => (i < 6 ? { ...c, decision: 'publier' as const } : c));
    expect(comparer(base, six)).toMatchObject({ verdict: 'amelioration_demontree', corriges: [1, 2, 3, 4, 5, 6], degrades: [] });
    const deux = base.map((c, i) => (i < 2 ? { ...c, decision: 'publier' as const } : c));
    expect(comparer(base, deux).verdict).toBe('amelioration_non_demontree');
  });
  it('une version qui ajoute une publication à tort est refusée, même si son score monte', () => {
    const avant = [...base, cas(9, 'ecarter', 'ecarter')];
    const apres = [...base.map((c) => ({ ...c, decision: 'publier' as const })), cas(9, 'publier', 'ecarter')];
    expect(comparer(avant, apres).verdict).toBe('refusee_publie_a_tort');
  });
  it('une publication à tort nouvelle ne se rachète pas par une autre qui disparaît', () => {
    const avant = [cas(1, 'publier', 'ecarter'), cas(2, 'ecarter', 'ecarter'), ...Array.from({ length: 7 }, (_, i) => cas(i + 3, 'ecarter', 'publier'))];
    const apres = [cas(1, 'ecarter', 'ecarter'), cas(2, 'publier', 'ecarter'), ...Array.from({ length: 7 }, (_, i) => cas(i + 3, 'publier', 'publier'))];
    expect(comparer(avant, apres).verdict).toBe('refusee_publie_a_tort');
  });
  it('une publication à tort sur un sujet que la version précédente n’avait pas jugé compte aussi', () => {
    expect(comparer(base, [...base.map((c) => ({ ...c, decision: 'publier' as const })), cas(9, 'publier', 'ecarter')]).verdict).toBe('refusee_publie_a_tort');
  });
  it('aucun changement, ou autant de pertes que de gains, n’est pas un progrès', () => {
    expect(comparer(base, base).verdict).toBe('pas_de_changement');
    const a = [cas(1, 'publier', 'publier'), cas(2, 'ecarter', 'publier')];
    const b = [cas(1, 'ecarter', 'publier'), cas(2, 'publier', 'publier')];
    expect(comparer(a, b).verdict).toBe('degradation');
  });
  it('seuls les sujets communs aux deux versions sont comparés', () => {
    expect(comparer([cas(1, 'ecarter', 'publier')], [cas(2, 'publier', 'publier')])).toMatchObject({ n: 0, verdict: 'pas_de_changement' });
  });
});

describe('registre de la sélection', () => {
  let t: TestDb;
  const now = '2026-10-31T00:00:00.000Z';
  beforeEach(async () => {
    t = await createTestDb();
    await runCollect({ database: t.database, fetcher: routeFetcher({ [releasesUrl(CLAUDE_CODE.config)]: readFixture() }), mode: 'live', workerId: 't', leaseMs: 60_000, maxAttempts: 3, retryBackoffMs: 60_000, definitions: [CLAUDE_CODE] });
  });
  afterEach(() => t.cleanup());

  const jugement = (id: number, n: number, passages: string[]): Jugement => ({ id, criteres: notes(n, 2, 2, 2) as Jugement['criteres'], passages, motif: 'Une raison.' });

  it('un corpus figé ne peut pas être retiré', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    await expect(figerCorpus(t.database.client, 'h', { developpement: 2, evaluation: 2 }, now)).rejects.toThrow('Corpus déjà figé');
    expect((await sujetsDuCorpus(t.database.client)).length).toBe(4);
    expect((await sujetsDuCorpus(t.database.client, 'evaluation')).every((s) => s.jeu === 'evaluation')).toBe(true);
  });

  it('la décision d’un juge vient de ses notes et un passage absent de la capture est retiré', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client);
    const extrait = sujet!.texte.split(/\s+/).slice(0, 4).join(' ');
    expect(preparerJugement(jugement(sujet!.id, 2, [extrait]), sujet!)).toMatchObject({ decision: 'publier', motif: 'Une raison.', passages: [extrait], ecartes: [] });
    expect(preparerJugement(jugement(sujet!.id, 2, [extrait, 'phrase absente de la capture ici']), sujet!)).toMatchObject({ decision: 'approfondir', motif: 'passage_introuvable : Une raison.', passages: [extrait], ecartes: ['phrase absente de la capture ici'] });
    const r = await enregistrerJugements(t.database.client, [jugement(sujet!.id, 0, [extrait, 'phrase absente de la capture ici'])], [sujet!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    expect(r.ecartes).toEqual([{ id: sujet!.id, passages: ['phrase absente de la capture ici'] }]);
    const ligne = (await t.database.client.execute(`select decision, passages from selection_decision`)).rows[0]!;
    expect(ligne.decision).toBe('ecarter');
    expect(JSON.parse(String(ligne.passages))).toEqual([extrait]);
  });

  it('un jugement hors du corpus est refusé', async () => {
    await expect(enregistrerJugements(t.database.client, [jugement(999, 2, [])], [], { juge: 'j', version: 's1', origine: 'juge_developpement', now })).rejects.toThrow('hors du corpus');
  });

  it('une correction reste un avis : portée par défaut, aucune règle créée', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const sujets = await sujetsDuCorpus(t.database.client, 'developpement');
    const passage = sujets[0]!.texte.split(/\s+/).slice(0, 4).join(' ');
    await enregistrerJugements(t.database.client, [jugement(sujets[0]!.id, 2, [passage])], sujets, { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    const decision = (await t.database.client.execute(`select id from selection_decision`)).rows[0]!;
    await enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: sujets[0]!.id, decision: 'ecarter', motif: 'Trop niche.', decision_id: Number(decision.id) })], now);
    // Enregistrer un avis ne crée aucune règle : seule une version des consignes qui cite son numéro en fait une
    // (les numéros des avis réels, cités par s4, peuvent coïncider avec ceux de la base de test).
    const regle = VERSIONS_CONSIGNES.find((v) => v.changements.some((c) => c.avis.includes(1)))?.version ?? null;
    expect(await correctionsARelire(t.database.client)).toEqual([expect.objectContaining({ systeme: 'publier', humain: 'ecarter', motif: 'Trop niche.', portee: 'cas_particulier', regle_version: regle })]);
  });

  it('un avis confirmant la décision n’est pas une correction', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const sujets = await sujetsDuCorpus(t.database.client, 'developpement');
    const passage = sujets[0]!.texte.split(/\s+/).slice(0, 4).join(' ');
    await enregistrerJugements(t.database.client, [jugement(sujets[0]!.id, 2, [passage])], sujets, { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    const decision = (await t.database.client.execute(`select id from selection_decision`)).rows[0]!;
    await enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: sujets[0]!.id, decision: 'publier', motif: null, decision_id: Number(decision.id) })], now);
    expect(await correctionsARelire(t.database.client)).toEqual([]);
  });

  it('seul un avis déclaré à l’aveugle, donné avant d’avoir vu une décision, compte comme vérité', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [dev] = await sujetsDuCorpus(t.database.client, 'developpement');
    const [evalue, autre] = await sujetsDuCorpus(t.database.client, 'evaluation');
    const passage = (s: { texte: string }) => s.texte.split(/\s+/).slice(0, 4).join(' ');
    await enregistrerJugements(t.database.client, [jugement(evalue!.id, 2, [passage(evalue!)]), jugement(autre!.id, 2, [passage(autre!)])], [evalue!, autre!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    const decisions = (await t.database.client.execute(`select id, news_item_id from selection_decision`)).rows;
    const vue = Number(decisions.find((d) => Number(d.news_item_id) === autre!.id)!.id);
    await enregistrerAvis(t.database.client, [
      SchemaAvis.parse({ id: dev!.id, decision: 'publier', motif: null, aveugle: true }),
      SchemaAvis.parse({ id: evalue!.id, decision: 'ecarter', motif: null, aveugle: true }),
      SchemaAvis.parse({ id: evalue!.id, decision: 'publier', motif: null, aveugle: true }),
      SchemaAvis.parse({ id: autre!.id, decision: 'ecarter', motif: 'vu la décision', decision_id: vue }),
      SchemaAvis.parse({ id: autre!.id, decision: 'publier', motif: null, aveugle: true }),
      SchemaAvis.parse({ id: autre!.id, decision: 'approfondir', motif: null }),
    ], now);
    const verites = await veritesEvaluation(t.database.client);
    expect([...verites.entries()]).toEqual([[evalue!.id, 'publier']]);
    expect(await casPourJuge(t.database.client, 'j', 's1', verites)).toEqual([{ id: evalue!.id, decision: 'publier', humain: 'publier' }]);
  });

  it('un avis lié à une décision montrée ne peut pas se déclarer à l’aveugle', () => {
    expect(SchemaAvis.safeParse({ id: 1, decision: 'publier', motif: null, decision_id: 2, aveugle: true }).success).toBe(false);
  });

  it('une décision remplacée ne compte plus dans l’évaluation', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client, 'evaluation');
    await enregistrerJugements(t.database.client, [jugement(sujet!.id, 2, [])], [sujet!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    await enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: sujet!.id, decision: 'publier', motif: null, aveugle: true })], now);
    await t.database.client.execute(`update selection_decision set remplacee_le = 'x'`);
    expect(await casPourJuge(t.database.client, 'j', 's1', await veritesEvaluation(t.database.client))).toEqual([]);
  });

  it('une correction sur le jeu d’évaluation n’alimente pas les consignes', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client, 'evaluation');
    await enregistrerJugements(t.database.client, [jugement(sujet!.id, 0, [])], [sujet!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    const decision = Number((await t.database.client.execute(`select id from selection_decision`)).rows[0]!.id);
    await enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: sujet!.id, decision: 'publier', motif: 'Vu.', decision_id: decision })], now);
    expect(await correctionsARelire(t.database.client)).toEqual([]);
  });

  it('un avis ne peut pas pointer vers la décision d’un autre sujet', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [a, b] = await sujetsDuCorpus(t.database.client, 'developpement');
    await enregistrerJugements(t.database.client, [jugement(a!.id, 2, [])], [a!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    const decision = Number((await t.database.client.execute(`select id from selection_decision`)).rows[0]!.id);
    await expect(enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: b!.id, decision: 'publier', motif: null, decision_id: decision })], now)).rejects.toThrow('ne porte pas sur le sujet');
  });

  it('recharger un fichier de jugements est sans effet, et le bilan le dit', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client);
    const o = { juge: 'j', version: 's1', origine: 'juge_developpement' as const, now };
    expect(await enregistrerJugements(t.database.client, [jugement(sujet!.id, 2, [])], [sujet!], o)).toMatchObject({ enregistres: 1, ignores: 0 });
    expect(await enregistrerJugements(t.database.client, [jugement(sujet!.id, 0, [])], [sujet!], o)).toMatchObject({ enregistres: 0, ignores: 1 });
  });

  it('le corpus garde sa capture : une nouvelle collecte ne change pas le texte jugé', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [avant] = await sujetsDuCorpus(t.database.client);
    const ligne = (await t.database.client.execute({ sql: `select * from document_snapshot where id = ?`, args: [avant!.snapshot_id] })).rows[0]!;
    await t.database.client.execute({ sql: `insert into document_snapshot (document_id, seq, content_hash, title, content, content_format, captured_at, run_id) values (?, ?, 'autre', 'Autre titre', 'Tout autre texte', ?, ?, ?)`, args: [Number(ligne.document_id), Number(ligne.seq) + 1, String(ligne.content_format), String(ligne.captured_at), String(ligne.run_id)] });
    const [apres] = await sujetsDuCorpus(t.database.client);
    expect(apres).toEqual(avant);
  });

  it('une décision prise sur une autre capture que celle du corpus n’est pas comparée à l’avis humain', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client, 'evaluation');
    await enregistrerAvis(t.database.client, [SchemaAvis.parse({ id: sujet!.id, decision: 'ecarter', motif: null, aveugle: true })], now);
    await enregistrerJugements(t.database.client, [jugement(sujet!.id, 0, [])], [sujet!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    await t.database.client.execute(`update selection_corpus set snapshot_id = 1 where snapshot_id <> 1`);
    await t.database.client.execute({ sql: `update selection_decision set snapshot_id = ?`, args: [sujet!.snapshot_id === 1 ? 2 : sujet!.snapshot_id] });
    expect(await casPourJuge(t.database.client, 'j', 's1', await veritesEvaluation(t.database.client))).toEqual([]);
  });

  it('on peut relire pourquoi un sujet a été retenu, ancienne décision comprise', async () => {
    await figerCorpus(t.database.client, 'g', { developpement: 2, evaluation: 2 }, now);
    const [sujet] = await sujetsDuCorpus(t.database.client);
    await enregistrerJugements(t.database.client, [jugement(sujet!.id, 0, [])], [sujet!], { juge: 'j', version: 's1', origine: 'juge_developpement', now });
    await t.database.client.execute(`update selection_decision set remplacee_le = 'x'`);
    expect(await decisionsDuSujet(t.database.client, sujet!.id)).toEqual([{ remplacee: true, texte: expect.stringContaining('ecarter') }]);
  });

  it('une décision s’explique : notes, raisons, passages, version', () => {
    const texte = expliquer({ decision: 'publier', motif: 'criteres_remplis', consignes_version: 's1', juge: 'j', criteres: JSON.stringify(notes(2, 1, 2, 2)), passages: JSON.stringify(['adds offline mode']) });
    expect(texte).toContain('publier (criteres_remplis) · consignes s1 · j');
    expect(texte).toContain('utilite_concrete : 1/2 — Usage décrit.');
    expect(texte).toContain('> adds offline mode');
    expect(expliquer({ decision: 'ecarter', motif: 'ancienne_a_la_detection', consignes_version: 's1', juge: 'code', criteres: null, passages: '[]' })).toBe('ecarter (ancienne_a_la_detection) · consignes s1 · code');
  });
});

describe('priorité éditoriale (SPEC §3.6)', () => {
  it('classe modèles, ressources, fonctionnalités puis le reste, sans toucher aux notes', async () => {
    const { prioriteEditoriale } = await import('../src/selection/consignes.ts');
    expect(prioriteEditoriale('nouveau_modele', [])).toBe(1);
    expect(prioriteEditoriale('ressource', [])).toBe(2);
    expect(prioriteEditoriale('amelioration', ['MCP et skills'])).toBe(2);
    expect(prioriteEditoriale('nouvelle_fonctionnalite', [])).toBe(3);
    expect(prioriteEditoriale('incident', ['sécurité'])).toBe(4);
    expect(prioriteEditoriale(null, [])).toBe(4);
  });
});
