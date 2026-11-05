// API v1 (ADR 0010, ADR 0012) sur une base temporaire : visibilité par mode, pagination par curseur, traduction servie
// avec l'original, vérification mot pour mot toujours portée par l'original, liens non https refusés (ADR 0003).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageFil, Publication } from '../packages/contrat/src/index.ts';
import { compte, comptes, fiche as ficheApi, fil, publication, recherche, RequeteInvalide, type Contexte } from '../src/api/v1/index.ts';
import { cibleCourte, lienSur, pageDuFil } from '../src/api/v1/publications.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { ajouterActualite, ajouterTraduction, contenuActualite, socle } from './helpers/publications.ts';

let t: TestDb;
let ids: { postId: number; revisionId: number }[];
const ctx = (o: Partial<Contexte> = {}): Contexte => ({ client: t.database.client, mode: 'apercu', langue: 'en', maintenant: '2026-11-03T12:00:00.000Z', ...o });

beforeEach(async () => {
  t = await createTestDb();
  await socle(t.database.client);
  ids = [];
  for (const n of [1, 2, 3]) ids.push(await ajouterActualite(t.database.client, n, { jour: n === 3 ? '2026-11-04' : '2026-11-03' }));
});
afterEach(() => t.cleanup());

describe('visibilité et fil', () => {
  it('mode aperçu : les planifiées, dans l\'ordre du planning ; mode public : rien tant que rien n\'est publié', async () => {
    const page = PageFil.parse(await fil(ctx()));
    expect(page.publications.map((p) => p.id)).toEqual(ids.map((x) => x.postId));
    expect(page.publications[0]).toMatchObject({ statut: 'en_attente', date: '2026-11-03', nature: 'actualite', badge: 'actualite', langue: 'en', traduction: null, original: null });
    expect((await fil(ctx({ mode: 'public' }))).publications).toEqual([]);
    expect(await publication(ctx({ mode: 'public' }), ids[0]!.postId)).toBeNull();
  });

  it('publiées d\'abord, puis pagination par curseur sans doublon ni oubli', async () => {
    await ajouterActualite(t.database.client, 4, { statut: 'publie' });
    const premiere = await fil(ctx(), { limite: 2 });
    expect(premiere.publications.map((p) => p.statut)).toEqual(['publie', 'en_attente']);
    expect(premiere.curseur_suivant).not.toBeNull();
    const seconde = await fil(ctx(), { limite: 2, curseur: premiere.curseur_suivant });
    expect([...premiere.publications, ...seconde.publications].map((p) => p.id)).toEqual([4, ...ids.map((x) => x.postId)]);
    expect(seconde.curseur_suivant).toBeNull();
    await expect(fil(ctx(), { curseur: 'pas-un-curseur' })).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it('retire du fil principal une version dépassée par une version plus récente publiée, pas du profil', async () => {
    const c = t.database.client;
    const ancienne = await ajouterActualite(c, 5, { statut: 'publie' });
    const recente = await ajouterActualite(c, 6, { statut: 'publie' });
    await c.execute(`insert into product (id, key, name, publisher, created_at) values (1, 'acme/widget', 'Widget', 'Acme', 'x')`);
    for (const [v, post, d] of [['2.0', ancienne.postId, '2026-11-01T00:00:00.000Z'], ['2.1', recente.postId, '2026-11-02T00:00:00.000Z']] as const) {
      const r = await c.execute({ sql: `insert into product_version (product_id, version, is_prerelease, released_at, created_at) values (1, ?, 0, ?, 'x') returning id`, args: [v, d] });
      await c.execute({ sql: `insert into news_item_target (news_item_id, product_id, product_version_id) values ((select news_item_id from post where id = ?), 1, ?)`, args: [post, Number(r.rows[0]!.id)] });
      await c.execute({ sql: `update news_item set announced_at = ? where id = (select news_item_id from post where id = ?)`, args: [d, post] });
    }
    const principal = (await fil(ctx({ mode: 'public' }))).publications.map((p) => p.id);
    expect(principal).toContain(recente.postId);
    expect(principal).not.toContain(ancienne.postId);
    const compteId = String((await c.execute({ sql: 'select account_id from post where id = ?', args: [ancienne.postId] })).rows[0]!.account_id);
    expect((await pageDuFil(ctx({ mode: 'public' }), { compte: compteId })).publications.map((p) => p.id)).toContain(ancienne.postId);
  });

  it('présente les comptes dans la langue demandée, sans compteur', async () => {
    const c = await comptes(ctx({ langue: 'he' }));
    expect(c.comptes[0]).toMatchObject({ id: 'nodi', avatar: '/marque/agent-nodi.png' });
    expect(c.comptes[0]!.bio).toMatch(/[֐-׿]/u);
    expect(Object.keys(c.comptes[0]!)).not.toContain('abonnes');
    expect((await compte(ctx(), 'nodi'))!.publications).toHaveLength(3);
    expect(await compte(ctx(), 'inconnu')).toBeNull();
  });
});

describe('traductions servies', () => {
  const fr = { accroche: 'Widget 2.1 réduit la latence GPU de 40% (1)', description: 'Acme publie Widget 2.1, plus rapide sur GPU.', ce_que_ca_permet: 'Une inférence plus rapide sur le même matériel, avec une clé API.' };

  it('sert tout le post traduit, titre compris, avec l\'original anglais à côté', async () => {
    await ajouterTraduction(t.database.client, ids[0]!.revisionId, 'fr', fr);
    const p = Publication.parse(await publication(ctx({ langue: 'fr' }), ids[0]!.postId));
    expect(p.langue).toBe('fr');
    expect(p.traduction).toMatchObject({ langue: 'fr', origine: 'machine', modele: 'deepseek-flash' });
    expect(p.contenu.map((b) => b.texte)).toEqual([fr.accroche, fr.description, fr.ce_que_ca_permet]);
    expect(p.original!.map((b) => b.texte)[0]).toBe('Widget 2.1 cuts GPU latency by 40% (1)');
    // Le texte de l'image reste en anglais.
    expect(p.media).toMatchObject({ type: 'schema', titre: 'Widget 2.1', elements: ['40% lower latency'], lang: 'en' });
  });

  it('garde la vérification mot pour mot sur l\'original, quelle que soit la langue', async () => {
    await ajouterTraduction(t.database.client, ids[0]!.revisionId, 'fr', fr);
    const enAnglais = (await publication(ctx(), ids[0]!.postId))!;
    const enFrancais = (await publication(ctx({ langue: 'fr' }), ids[0]!.postId))!;
    expect(enFrancais.sources).toEqual(enAnglais.sources);
    expect(enFrancais.sources.verification).toBe('verifie');
    expect(enFrancais.sources.passages.every((x) => x.trouve)).toBe(true);
  });

  it('sert l\'original quand la traduction est en écart ou incomplète', async () => {
    await ajouterTraduction(t.database.client, ids[0]!.revisionId, 'he', { accroche: 'א', description: 'ב', ce_que_ca_permet: 'ג' }, 'ecart');
    await ajouterTraduction(t.database.client, ids[1]!.revisionId, 'he', { accroche: 'א' });
    const [a, b] = (await fil(ctx({ langue: 'he' }))).publications;
    expect([a!.langue, a!.traduction, b!.langue, b!.original]).toEqual(['en', null, 'en', null]);
  });
});

describe('contenus collectés et liens (ADR 0003)', () => {
  it('garde le titre collecté comme texte et refuse tout lien non https', async () => {
    await t.database.client.execute(`update news_item set title = '<img src=x onerror=alert(1)>' where id = 1`);
    await t.database.client.execute(`update source_document set url = 'javascript:alert(1)' where id = 1`);
    const p = (await publication(ctx(), ids[0]!.postId))!;
    expect(p.sources.documents[0]).toEqual({ titre: '<img src=x onerror=alert(1)>', url: null, capture_le: '2026-11-03T08:00:00.000Z' });
    expect(p.bouton).toBeNull();
    expect(lienSur('javascript:alert(1)')).toBeNull();
    expect(lienSur('http://acme.example')).toBeNull();
    expect(lienSur('https://user:pw@acme.example')).toBeNull();
    expect(lienSur('https://github.com/a/b')).toBe('https://github.com/a/b');
    expect(cibleCourte('https://www.github.com/a/b/tree/main')).toBe('github.com/a/b/…');
  });
});

describe('recherche', () => {
  it('rend des publications avec la raison, dans la langue demandée', async () => {
    await ajouterTraduction(t.database.client, ids[0]!.revisionId, 'fr', { accroche: 'Widget 2.1 (1)', description: 'D', ce_que_ca_permet: 'C' });
    const r = await recherche(ctx({ langue: 'fr' }), 'widget');
    expect(r.total).toBe(3);
    expect(r.resultats[0]!.correspondances.length).toBeGreaterThan(0);
    expect(r.resultats.find((x) => x.publication.id === ids[0]!.postId)!.publication.langue).toBe('fr');
    expect((await recherche(ctx({ mode: 'public' }), 'widget')).total).toBe(0);
    await expect(recherche(ctx(), '')).rejects.toBeInstanceOf(RequeteInvalide);
  });
});

describe('fiche, versions, carrousel (P4)', () => {
  const contenu = {
    ...contenuActualite(9),
    produit: 'Widget',
    version_cible: '2.1',
    nouveaute: { texte: 'Widget 2.1 adds a GPU mode.', passages: [] },
    details: [{ titre: 'How it works', texte: 'Kernels are fused.', passages: [] }],
    attributions: [{ type: 'benchmark', auteur: 'Acme Labs', texte: '40% lower latency on A100.', passages: [], conditions: { texte: 'Batch size 8.', passages: [] } }],
    questions_a_tester: ['Does it need CUDA 12?'],
  };
  const fiche = { 'fiche.nouveaute': 'Widget 2.1 ajoute un mode GPU.', 'fiche.details.0.titre': 'Fonctionnement', 'fiche.details.0.texte': 'Les noyaux sont fusionnés.', 'fiche.attributions.0.texte': 'Latence réduite de 40% sur A100.', 'fiche.attributions.0.conditions': 'Taille de lot 8.', 'fiche.questions_a_tester.0': 'Faut-il CUDA 12 ?' };

  it('sert la fiche traduite avec l\'original, les versions du produit suivi et les révisions', async () => {
    const c = t.database.client;
    const { postId, revisionId } = await ajouterActualite(c, 9, { contenu });
    await c.execute(`insert into product (id, key, name, publisher, created_at) values (1, 'acme/widget', 'Widget', 'Acme', 'x')`);
    for (const [v, d] of [['2.0', '2026-10-01'], ['2.1', '2026-11-02']] as const) await c.execute({ sql: `insert into product_version (product_id, version, is_prerelease, released_at, created_at) values (1, ?, 0, ?, 'x')`, args: [v, d] });
    await ajouterTraduction(c, revisionId, 'fr', { accroche: 'a', description: 'b', ce_que_ca_permet: 'c', ...fiche });
    const f = (await ficheApi(ctx({ langue: 'fr' }), postId))!;
    expect(f.langue).toBe('fr');
    expect(f.sections.map((s) => s.id)).toEqual(['nouveaute', 'details', 'attributions', 'questions_a_tester']);
    expect(f.sections[2]!.elements[0]).toEqual({ cle: 'fiche.attributions.0.texte', titre: 'Acme Labs', texte: 'Latence réduite de 40% sur A100.', complement: 'Taille de lot 8.' });
    expect(f.original![1]!.elements[0]).toMatchObject({ titre: 'How it works', texte: 'Kernels are fused.' });
    expect(f.versions).toEqual([{ version: '2.1', prerelease: false, publiee_le: '2026-11-02', courante: true }, { version: '2.0', prerelease: false, publiee_le: '2026-10-01', courante: false }]);
    expect(f.revisions).toEqual([{ seq: 1, cree_le: '2026-11-03T08:00:00.000Z', courante: true }]);
    expect(f.licence).toBeNull();
    // Une fiche en écart reste en anglais, sans empêcher le post traduit.
    await c.execute({ sql: `update post_traduction set statut = 'ecart', ecarts = ? where revision_id = ?`, args: [JSON.stringify([{ cle: 'fiche.nouveaute', code: 'invariant_absent' }]), revisionId] });
    const f2 = (await ficheApi(ctx({ langue: 'fr' }), postId))!;
    expect([f2.langue, f2.original, f2.publication.langue]).toEqual(['en', null, 'fr']);
    expect(await ficheApi(ctx({ mode: 'public' }), postId)).toBeNull();
  });

  it('sert un carrousel de diapositives, texte en anglais', async () => {
    const c = t.database.client;
    await c.execute({ sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', 'Carrousel', 'Illustration — ne prouve pas le fonctionnement', ?, 'x')`, args: [ids[0]!.postId, JSON.stringify({ forme: 'carrousel', diapositives: [{ champ: 'accroche', libelle: 'Headline', texte: 'Widget 2.1' }, { champ: 'nouveaute', libelle: 'What’s new', texte: 'GPU mode' }] })] });
    const p = (await publication(ctx({ langue: 'he' }), ids[0]!.postId))!;
    expect(p.media).toEqual({ type: 'carrousel', titre: 'Widget 2.1', diapositives: [{ libelle: 'Headline', texte: 'Widget 2.1' }, { libelle: 'What’s new', texte: 'GPU mode' }], lang: 'en' });
  });
});
