// API v1 (ADR 0010, ADR 0012) sur une base temporaire : visibilité par mode, pagination par curseur, traduction servie
// avec l'original, vérification mot pour mot toujours portée par l'original, liens non https refusés (ADR 0003).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageFil, Publication } from '../packages/contrat/src/index.ts';
import { compte, comptes, fil, publication, recherche, RequeteInvalide, type Contexte } from '../src/api/v1/index.ts';
import { cibleCourte, lienSur } from '../src/api/v1/publications.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { ajouterActualite, ajouterTraduction, socle } from './helpers/publications.ts';

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
