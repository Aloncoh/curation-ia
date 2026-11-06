import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SafeFetchError, safeGet, type TransportResponse } from '../src/collect/safe-fetch.ts';
import { centile, precisionDate, rapportDelais, relevesMesurables } from '../src/mesure/delais.ts';
import { hubWebsub, lancerSonde, type Interrogateur } from '../src/mesure/sonde.ts';
import { SOURCES } from '../src/sources.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';

const FLUX = SOURCES.find((s) => s.id === 'feed:github-changelog')!;
const item = (n: number, date = 'Thu, 29 Oct 2026 17:14:38 GMT') => `<item><title>Entrée ${n}</title><link>https://github.blog/changelog/${n}</link><pubDate>${date}</pubDate><description>Texte</description></item>`;
const canal = (...items: string[]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><link>https://github.blog</link><description>d</description>${items.join('')}</channel></rss>`;
const reponse = (status: number, corps: string, headers: Record<string, string> = {}): TransportResponse => ({ status, headers, body: Buffer.from(corps) });

describe('précision des dates', () => {
  it.each([
    ['2026-10-29T17:14:38.000Z', 'seconde'],
    ['2026-10-29T17:14:00.000Z', 'minute'],
    ['2026-10-29T17:00:00.000Z', 'arrondie'],
    ['2026-10-29T13:15:00.000Z', 'arrondie'],
    ['2026-10-29T15:40:00.000Z', 'arrondie'],
    ['2026-10-29T00:00:00.000Z', 'jour'],
    [null, 'inconnue'],
    ['pas une date', 'inconnue'],
  ])('%s → %s', (iso, attendu) => {
    expect(precisionDate(iso)).toBe(attendu);
  });
});

describe('centiles', () => {
  it('rang le plus proche, sans valeur inventée', () => {
    expect(centile([], 50)).toBeNull();
    expect(centile([10], 90)).toBe(10);
    expect(centile([1, 2, 3, 4], 50)).toBe(2);
    expect(centile([4, 1, 3, 2], 100)).toBe(4);
    expect(centile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
  });
});

describe('hub WebSub', () => {
  it('lit le lien, quel que soit l’ordre des attributs', () => {
    expect(hubWebsub('<link rel="hub" href="https://hub.example/"/>')).toBe('https://hub.example/');
    expect(hubWebsub("<atom:link href='https://hub.example/' rel='hub' />")).toBe('https://hub.example/');
    expect(hubWebsub('<link rel="self" href="https://x.example/"/>')).toBeNull();
  });
});

describe('304 conditionnel', () => {
  const policy = { allowedHosts: ['example.com'], timeoutMs: 1000, maxBytes: 1000 };
  const deps = (status: number) => ({ resolve: async () => [{ address: '93.184.216.34', family: 4 as const }], transport: async () => reponse(status, '') });
  it('accepté seulement pour une requête conditionnelle', async () => {
    expect((await safeGet('https://example.com/f', policy, { 'if-none-match': '"a"' }, deps(304))).status).toBe(304);
    expect((await safeGet('https://example.com/f', policy, { 'if-modified-since': 'x' }, deps(304))).status).toBe(304);
    await expect(safeGet('https://example.com/f', policy, {}, deps(304))).rejects.toMatchObject({ kind: 'redirect' });
  });
  it('une redirection reste refusée, même conditionnelle', async () => {
    await expect(safeGet('https://example.com/f', policy, { 'if-none-match': '"a"' }, deps(301))).rejects.toMatchObject({ kind: 'redirect' });
  });
});

describe('sonde de détection', () => {
  let t: TestDb;
  beforeEach(async () => { t = await createTestDb(); });
  afterEach(() => t.cleanup());

  /** Horloge avancée à la main : chaque pas de la boucle dure une minute. */
  const scenario = (reponses: (TransportResponse | Error)[], o: { dureeMs?: number } = {}) => {
    let temps = Date.parse('2026-10-31T10:00:00.000Z');
    const entetes: Record<string, string>[] = [];
    const interroger: Interrogateur = async (_url, headers) => {
      entetes.push(headers);
      const r = reponses[Math.min(entetes.length - 1, reponses.length - 1)]!;
      if (r instanceof Error) throw r;
      return r;
    };
    const run = lancerSonde({
      client: t.database.client, definitions: [FLUX], interroger, dureeMs: o.dureeMs ?? reponses.length * 60_000, intervalleMs: () => 60_000,
      clock: () => new Date(temps), attente: async () => { temps += 60_000; },
    });
    return { run, entetes };
  };

  it('le premier passage sert de référence : aucune détection', async () => {
    const { run } = scenario([reponse(200, canal(item(1)))]);
    expect(await run).toMatchObject({ requetes: 1, detections: 0 });
    expect((await t.database.client.execute('select count(*) as n from detection_observee')).rows[0]!.n).toBe(0);
  });

  it('une entrée apparue ensuite est vue une fois, avec sa fenêtre et la précision de sa date', async () => {
    const { run } = scenario([reponse(200, canal(item(1))), reponse(200, canal(item(1), item(2))), reponse(200, canal(item(1), item(2)))]);
    expect(await run).toMatchObject({ requetes: 3, detections: 1 });
    const l = (await t.database.client.execute('select * from detection_observee')).rows;
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ title: 'Entrée 2', announced_at: '2026-10-29T17:14:38.000Z', precision: 'seconde', previous_check_at: '2026-10-31T10:00:00.000Z', first_seen_at: '2026-10-31T10:01:00.000Z' });
  });

  it('une entrée ancienne, au-delà de ce que garde la collecte, ne passe pas pour une détection', async () => {
    const anciennes = Array.from({ length: 25 }, (_, i) => item(i + 1));
    const redatee = item(25, 'Sat, 31 Oct 2026 10:00:37 GMT');
    const { run } = scenario([reponse(200, canal(...anciennes)), reponse(200, canal(...anciennes.slice(0, 24), redatee))]);
    expect(await run).toMatchObject({ detections: 0 });
  });

  it('une vérification ratée ne compte pas : la fenêtre repart de la dernière réussie', async () => {
    const { run } = scenario([reponse(200, canal(item(1))), new SafeFetchError('timeout', 'trop long'), reponse(200, 'pas du xml'), reponse(200, canal(item(1), item(2)))]);
    await run;
    expect((await t.database.client.execute('select previous_check_at from detection_observee')).rows[0]).toMatchObject({ previous_check_at: '2026-10-31T10:00:00.000Z' });
  });

  it('les validateurs d’un corps illisible ne sont pas retenus : aucun 304 ne masque la nouveauté', async () => {
    const { run, entetes } = scenario([reponse(200, canal(item(1)), { etag: '"v1"' }), reponse(200, 'page d’erreur', { etag: '"v2"' }), reponse(200, canal(item(1), item(2)), { etag: '"v3"' })]);
    expect(await run).toMatchObject({ detections: 1 });
    expect(entetes[2]).toMatchObject({ 'if-none-match': '"v1"' });
  });

  it('une écriture ratée perd une trace, pas la mesure', async () => {
    const client = t.database.client;
    const execute = client.execute.bind(client);
    let premiere = true;
    client.execute = (async (requete: Parameters<typeof execute>[0]) => {
      if (premiere) { premiere = false; throw new Error('disk I/O error'); }
      return execute(requete);
    }) as typeof client.execute;
    const { run } = scenario([reponse(200, canal(item(1))), reponse(200, canal(item(1)))]);
    expect(await run).toMatchObject({ requetes: 2, ecritures_perdues: 1 });
    client.execute = execute;
    expect((await client.execute('select count(*) as n from sonde_requete')).rows[0]!.n).toBe(1);
  });

  it('un refus de débit retient tout l’hôte et garde son statut HTTP', async () => {
    const a = SOURCES.find((s) => s.id === 'github-releases:anthropics/claude-code')!;
    const b = SOURCES.find((s) => s.id === 'github-releases:openai/codex')!;
    let temps = Date.parse('2026-10-31T10:00:00.000Z');
    const urls: string[] = [];
    await lancerSonde({
      client: t.database.client, definitions: [a, b], dureeMs: 5 * 60_000, intervalleMs: () => 60_000, clock: () => new Date(temps), attente: async () => { temps += 60_000; },
      interroger: async (url) => { urls.push(url); throw new SafeFetchError('http_status', 'HTTP 403', 403); },
    });
    expect(urls).toHaveLength(1);
    expect((await t.database.client.execute('select http_status from sonde_requete')).rows[0]).toMatchObject({ http_status: 403 });
  });

  it('renvoie les validateurs reçus et compte les 304, sans rien analyser', async () => {
    const { run, entetes } = scenario([reponse(200, canal(item(1)), { etag: '"v1"', 'last-modified': 'Thu, 29 Oct 2026 17:14:38 GMT' }), reponse(304, '')]);
    expect(await run).toMatchObject({ requetes: 2, reponses304: 1, erreurs: 0 });
    expect(entetes[1]).toMatchObject({ 'if-none-match': '"v1"', 'if-modified-since': 'Thu, 29 Oct 2026 17:14:38 GMT' });
    expect(entetes[0]).not.toHaveProperty('if-none-match');
  });

  it('trace les en-têtes utiles : cache, âge, WebSub', async () => {
    const corps = canal(item(1)).replace('<title>t</title>', '<title>t</title><atom:link xmlns:atom="http://www.w3.org/2005/Atom" rel="hub" href="https://hub.example/"/>');
    const { run } = scenario([reponse(200, corps, { 'cache-control': 'public, max-age=300', age: '120', etag: '"a"' })]);
    await run;
    expect((await t.database.client.execute('select * from sonde_requete')).rows[0]).toMatchObject({ cache_control: 'public, max-age=300', age_seconds: 120, has_etag: 1, websub_hub: 'https://hub.example/', http_status: 200, conditional: 0 });
  });

  it('une panne est tracée et n’arrête pas la sonde', async () => {
    const { run } = scenario([reponse(200, canal(item(1))), new SafeFetchError('timeout', 'trop long'), reponse(200, canal(item(1), item(2)))]);
    expect(await run).toMatchObject({ requetes: 3, erreurs: 1, detections: 1 });
    expect((await t.database.client.execute(`select error_kind from sonde_requete where error_kind is not null`)).rows[0]).toMatchObject({ error_kind: 'timeout' });
  });

  it('un flux illisible est tracé sans fausse détection', async () => {
    const { run } = scenario([reponse(200, canal(item(1))), reponse(200, 'pas du xml'), reponse(200, canal(item(1)))]);
    expect(await run).toMatchObject({ erreurs: 1, detections: 0 });
  });

  it('un refus de débit suspend la source au lieu d’insister', async () => {
    const { run, entetes } = scenario([new SafeFetchError('http_status', 'HTTP 429', 429), reponse(200, canal(item(1)))], { dureeMs: 5 * 60_000 });
    await run;
    expect(entetes).toHaveLength(1);
  });

  it('un quota presque épuisé attend sa remise à zéro', async () => {
    const remise = Math.floor(Date.parse('2026-10-31T10:30:00.000Z') / 1000);
    const { run, entetes } = scenario([reponse(200, canal(item(1)), { 'x-ratelimit-remaining': '1', 'x-ratelimit-reset': String(remise) })], { dureeMs: 5 * 60_000 });
    await run;
    expect(entetes).toHaveLength(1);
  });
});

describe('rapport des délais', () => {
  let t: TestDb;
  beforeEach(async () => { t = await createTestDb(); });
  afterEach(() => t.cleanup());

  it('sans mesure, il dit « non mesuré » et n’annonce aucun chiffre', async () => {
    const r = await rapportDelais(t.database.client, '2026-10-31T00:00:00.000Z');
    expect(r).toContain('Délai de détection médian : non mesuré');
    expect(r).toContain("Préparation médiane d'un brouillon : non mesuré");
    expect(r).toContain('Actualités passées par un modèle réel : 0');
  });

  it('une date à la journée ne donne aucun délai, et les effectifs sont affichés', async () => {
    const c = t.database.client;
    await c.execute(`insert into detection_observee (source_id, external_id, title, announced_at, precision, first_seen_at, previous_check_at) values
      ('a', '1', 'Précise', '2026-10-31T10:00:30.000Z', 'seconde', '2026-10-31T10:01:00.000Z', '2026-10-31T10:00:00.000Z'),
      ('a', '2', 'Journée', '2026-10-31T00:00:00.000Z', 'jour', '2026-10-31T11:00:00.000Z', '2026-10-31T10:59:00.000Z')`);
    const r = await rapportDelais(c, '2026-10-31T00:00:00.000Z');
    expect(r).toContain('Nouvelles entrées vues pendant la sonde : 2, dont 1 avec une date assez précise');
    expect(r).toContain('Délai de détection médian : 30.0 s');
    expect(r).toContain('sous 60 s : 1 sur 1');
  });

  it('une date postérieure à la première vue n’est jamais une preuve de rapidité', async () => {
    const c = t.database.client;
    await c.execute(`insert into detection_observee (source_id, external_id, title, announced_at, precision, first_seen_at, previous_check_at) values
      ('a', '1', 'Future', '2026-10-31T12:00:30.000Z', 'seconde', '2026-10-31T10:01:00.000Z', '2026-10-31T10:00:00.000Z')`);
    const r = await rapportDelais(c, 'x');
    expect(r).toContain('Délai de détection médian : non mesuré');
    expect(r).toContain('sous 60 s : 0 sur 0');
    expect(r).toContain('Dates postérieures à la première vue, écartées de la mesure : 1.');
  });

  it('une heure arrondie enregistrée avant la nouvelle règle ne compte plus comme mesurable', async () => {
    const c = t.database.client;
    await c.execute(`insert into detection_observee (source_id, external_id, title, announced_at, precision, first_seen_at, previous_check_at) values
      ('a', '1', 'Arrondie', '2026-10-31T10:00:00.000Z', 'minute', '2026-10-31T10:00:30.000Z', '2026-10-31T10:00:00.000Z')`);
    expect(await rapportDelais(c, 'x')).toContain('dont 0 avec une date assez précise');
  });

  it('la préparation ne compte que les brouillons rédigés, pas les sujets écartés', async () => {
    const c = t.database.client;
    await c.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'feed', 'S', '{}', '[]', 'x')`);
    await c.execute(`insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 3, 1, 1)`);
    await c.execute(`insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (1, 's', 'e', 'u', 'u', 't', 'x', 'x')`);
    await c.execute(`insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 1, 1, 'h', 't', 'c', 'html', 'x')`);
    for (const [id, status, fin] of [[1, 'ecartee', '2026-10-31T10:00:08.000Z'], [2, 'ecartee', '2026-10-31T10:00:09.000Z'], [3, 'controle_automatique', '2026-10-31T10:03:00.000Z']] as const) {
      await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, status) values (?, 'annonce', 't', '2026-10-31T10:00:00.000Z', 'collected')`, args: [id] });
      await c.execute({ sql: `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, created_at) values (?, 'r', ?, 1, 'm', 'p', ?)`, args: [id, status, fin] });
      await c.execute({ sql: `insert into llm_call (run_id, news_item_id, stage, attempt, model, prompt_version, status, reserved_micro_usd, started_at, finished_at) values ('r', ?, 'qualification', 1, 'm', 'p', 'reussi', 1, '2026-10-31T10:00:00.000Z', ?)`, args: [id, fin] });
    }
    const r = await rapportDelais(c, 'x');
    expect(r).toContain('Actualités passées par un modèle réel : 3. Brouillons rédigés : 1.');
    expect(r).toContain("Préparation médiane d'un brouillon : 180.0 s");
  });

  it('le bout en bout ne retient que les vraies mises en ligne aux dates précises', async () => {
    const c = t.database.client;
    await c.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'feed', 'S', '{}', '[]', 'x')`);
    await c.execute(`insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 4, 1, 1)`);
    await c.execute(`insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (1, 's', 'e', 'u', 'u', 't', 'x', 'x')`);
    await c.execute(`insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 1, 1, 'h', 't', 'c', 'html', 'x')`);
    await c.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('nodi', 'nodi', 'Nodi', 'agent', 'a', 'b', 's', 1, 'x')`);
    const cas = [
      [1, '2026-10-31T10:00:07.000Z', '2026-10-31T10:00:52.000Z'], // 45 s
      [2, '2026-10-31T10:00:07.000Z', '2026-10-31T10:02:07.000Z'], // 120 s
      [3, '2026-10-31T00:00:00.000Z', '2026-10-31T00:00:30.000Z'], // date à la journée
      [4, '2026-10-31T12:00:07.000Z', '2026-10-31T10:00:00.000Z'], // date postérieure à la mise en ligne
    ] as const;
    for (const [id, annonce, enLigne] of cas) {
      await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, announced_at, status) values (?, 'annonce', 't', ?, ?, 'collected')`, args: [id, annonce, annonce] });
      await c.execute({ sql: `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, created_at) values (?, 'r', 'controle_automatique', 1, 'm', 'p', ?)`, args: [id, enLigne] });
      await c.execute({ sql: `insert into llm_call (run_id, news_item_id, stage, attempt, model, prompt_version, status, reserved_micro_usd, started_at, finished_at) values ('r', ?, 'redaction', 1, 'm', 'p', 'reussi', 1, ?, ?)`, args: [id, annonce, enLigne] });
      await c.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at, published_at) values ('nodi', ?, 'documentary_analysis', 'publie', ?, ?)`, args: [id, enLigne, enLigne] });
    }
    const r = await rapportDelais(c, 'x');
    expect(r).toContain('Publications mesurables : 2 sur 4');
    expect(r).toContain('Médiane : 45.0 s · 90e centile : 120.0 s · sous 60 s : 1 sur 2.');
  });

  it('relevés de l’accueil : posts aux heures précises et dans l’ordre, du plus rapide au plus lent', async () => {
    const c = t.database.client;
    await c.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('nodi', 'nodi', 'Nodi', 'agent', 'a', 'b', 's', 1, 'x')`);
    const cas = [
      // id, annonce, vue, prête, en ligne
      [1, '2026-11-05T15:48:50.000Z', '2026-11-05T18:50:26.000Z', '2026-11-05T18:58:49.000Z', '2026-11-05T20:47:20.000Z'], // 4 h 58 min 30 s, arrondi à 299 min
      [2, '2026-11-05T17:00:00.000Z', '2026-11-05T17:10:00.000Z', '2026-11-05T17:12:00.000Z', '2026-11-05T17:20:00.000Z'], // heure ronde : écarté
      [3, '2026-11-05T19:30:12.000Z', '2026-11-05T18:50:00.000Z', '2026-11-05T19:00:00.000Z', '2026-11-06T02:00:00.000Z'], // annonce après le repérage : écarté
      [4, '2026-11-05T10:00:40.000Z', '2026-11-05T10:20:00.000Z', '2026-11-05T10:26:00.000Z', '2026-11-05T10:40:40.000Z'], // 40 min
    ] as const;
    for (const [id, annonce, vue, prete, enLigne] of cas) {
      await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, announced_at, status) values (?, 'annonce', 't', ?, ?, 'collected')`, args: [id, vue, annonce] });
      await c.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at, published_at) values ('nodi', ?, 'documentary_analysis', 'publie', ?, ?)`, args: [id, prete, enLigne] });
    }
    const r = await relevesMesurables(c);
    expect(r.map((x) => [x.publication, x.minutes])).toEqual([[4, 40], [1, 299]]);
    expect(r[0]).toMatchObject({ compte: 'nodi', annonce: cas[3][1], vue: cas[3][2], prete: cas[3][3], publiee: cas[3][4] });
  });

  it('relevés de l’accueil : rien sans post aux heures précises', async () => {
    expect(await relevesMesurables(t.database.client)).toEqual([]);
  });

  it('sans publication, le bout en bout reste non mesuré', async () => {
    const r = await rapportDelais(t.database.client, 'x');
    expect(r).toContain('Publications mesurables : 0 sur 0');
    expect(r).toContain('Médiane : non mesuré · 90e centile : non mesuré · sous 60 s : 0 sur 0.');
  });

  it('résume ce que chaque source permet', async () => {
    const c = t.database.client;
    await c.execute(`insert into sonde_requete (source_id, started_at, duration_ms, http_status, conditional, has_etag, cache_control, age_seconds) values
      ('s', '2026-10-31T10:00:00.000Z', 100, 200, 0, 1, 'max-age=60', 40), ('s', '2026-10-31T10:01:00.000Z', 300, 304, 1, 0, null, null)`);
    expect(await rapportDelais(c, 'x')).toContain('| s | 2 | 0 | 1/1 | 100 ms | 300 ms | 40 s | max-age=60 | oui | non | 0/0 |');
  });
});
