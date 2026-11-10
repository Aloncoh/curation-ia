// Vidéo de la source sous le post (2026-11-10) : détection dans une capture fabriquée, rattachement en base, lecture par
// l'API sans remplacer le montage. Aucune donnée réelle.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Publication } from '../packages/contrat/src/index.ts';
import { publication, type Contexte } from '../src/api/v1/index.ts';
import { adresseIntegration, fichierVideo, idYoutube, videoDeLaCapture } from '../src/media/video-source.ts';
import { associerVideos, lireVideos } from '../src/media/videos-posts.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { CAPTURE, NOW, ajouterActualite, socle } from './helpers/publications.ts';

const page = (corps: string) => ({ url: 'https://acme.example/blog/widget-2-1', titre: 'Widget 2.1', contenu: `<html><body><p>${CAPTURE}</p>${corps}</body></html>`, format: 'html' });

describe('détection de la vidéo dans une capture', () => {
  it('lit un lecteur YouTube intégré, avec son titre', () => {
    const v = videoDeLaCapture(page('<iframe title="Widget &amp; GPU demo" width="1200" src="https://www.youtube.com/embed/c52RdPtL_l8?feature=oembed"></iframe>'));
    expect(v).toEqual({ fournisseur: 'youtube', id: 'c52RdPtL_l8', titre: 'Widget & GPU demo' });
    expect(adresseIntegration(v!)).toBe('https://www.youtube-nocookie.com/embed/c52RdPtL_l8');
  });

  it('lit un lecteur Vimeo et une balise <video> de la page', () => {
    expect(videoDeLaCapture(page('<iframe src="https://player.vimeo.com/video/123456789?h=abc"></iframe>'))).toEqual({ fournisseur: 'vimeo', id: '123456789', titre: null });
    const f = videoDeLaCapture(page('<video controls preload="metadata"><source type="video/mp4" src="https://acme.example/uploads/demo.mp4?_=2" /></video>'));
    expect(f).toEqual({ fournisseur: 'fichier', fichier: 'https://acme.example/uploads/demo.mp4?_=2', titre: null });
  });

  it('retient la première vidéo et ignore les cadres qui ne sont pas des vidéos', () => {
    const v = videoDeLaCapture(page('<iframe src="https://forms.example/embed"></iframe><video src="/media/a.webm"></video><iframe src="https://www.youtube.com/embed/aaaaaaaaaaa"></iframe>'));
    expect(v).toEqual({ fournisseur: 'fichier', fichier: 'https://acme.example/media/a.webm', titre: null });
  });

  it('prend la source elle-même quand c’est une vidéo YouTube', () => {
    expect(videoDeLaCapture({ url: 'https://www.youtube.com/watch?v=Du3BIE48DKc', titre: 'Getting started', contenu: 'texte', format: 'text' })).toEqual({ fournisseur: 'youtube', id: 'Du3BIE48DKc', titre: 'Getting started' });
  });

  it('ignore les liens dans le texte, les formats non HTML et les adresses douteuses', () => {
    expect(videoDeLaCapture({ ...page(''), contenu: 'Watch the recording: https://youtu.be/Du3BIE48DKc', format: 'markdown' })).toBeNull();
    expect(videoDeLaCapture(page('<a href="https://www.youtube.com/watch?v=Du3BIE48DKc">video</a>'))).toBeNull();
    expect(fichierVideo('http://acme.example/a.mp4', 'https://acme.example/')).toBeNull();
    expect(fichierVideo('javascript:alert(1)//.mp4', 'https://acme.example/')).toBeNull();
    expect(fichierVideo('https://user:pw@acme.example/a.mp4', 'https://acme.example/')).toBeNull();
    expect(fichierVideo('https://acme.example/a.mp4.html', 'https://acme.example/')).toBeNull();
    expect(idYoutube('https://www.youtube.com/embed/court')).toBeNull();
    expect(idYoutube('https://evil.example/embed/c52RdPtL_l8')).toBeNull();
  });
});

describe('rattachement de la vidéo aux posts', () => {
  let t: TestDb;
  const ctx = (o: Partial<Contexte> = {}): Contexte => ({ client: t.database.client, mode: 'apercu', langue: 'en', maintenant: '2026-11-03T12:00:00.000Z', ...o });

  beforeEach(async () => {
    t = await createTestDb();
    await socle(t.database.client);
  });
  afterEach(() => t.cleanup());

  it('rattache la vidéo une seule fois, en aperçu n’écrit rien, et garde le montage comme média principal', async () => {
    const c = t.database.client;
    await c.execute({ sql: 'update document_snapshot set content = ? where id = 1', args: [`<p>${CAPTURE}</p><iframe title="Widget demo" src="https://www.youtube.com/embed/c52RdPtL_l8"></iframe>`] });
    const { postId } = await ajouterActualite(c, 1, { statut: 'publie' });
    const autre = await ajouterActualite(c, 2, { statut: 'publie' });
    await c.execute({ sql: `insert into news_item_document (news_item_id, document_id, role) values (1, 1, 'primary')` });
    await c.execute({ sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', 'Carrousel', 'Illustration — ne prouve pas le fonctionnement', ?, 'x')`, args: [postId, JSON.stringify({ forme: 'carrousel', diapositives: [{ champ: 'accroche', libelle: 'Headline', texte: 'Widget 2.1' }] })] });

    const apercu = await associerVideos(c, { maintenant: NOW, ecrire: false });
    expect([apercu.examines, apercu.trouves.length, apercu.ecrits]).toEqual([2, 1, 0]);
    expect((await lireVideos(c, [postId])).size).toBe(0);

    const reel = await associerVideos(c, { maintenant: NOW, ecrire: true });
    expect(reel.trouves).toEqual([{ post_id: postId, fournisseur: 'youtube', editeur: 'acme.example', titre: 'Widget demo', page: 'https://acme.example/blog/widget-2-1' }]);
    expect((await associerVideos(c, { maintenant: NOW, ecrire: true })).examines).toBe(1);

    const p = Publication.parse(await publication(ctx(), postId));
    expect(p.video).toEqual({ fournisseur: 'youtube', integration: 'https://www.youtube-nocookie.com/embed/c52RdPtL_l8', page: 'https://acme.example/blog/widget-2-1', editeur: 'acme.example', titre: 'Widget demo' });
    expect(p.media?.type).toBe('carrousel');
    expect((await publication(ctx(), autre.postId))!.video).toBeNull();
  });

  it('n’examine que les posts récents, sauf demande de tout l’historique', async () => {
    const c = t.database.client;
    await ajouterActualite(c, 1, { statut: 'publie' });
    const plusTard = '2026-11-10T08:00:00.000Z';
    expect((await associerVideos(c, { maintenant: plusTard, ecrire: false })).examines).toBe(0);
    expect((await associerVideos(c, { maintenant: plusTard, tous: true, ecrire: false })).examines).toBe(1);
  });

  it('écarte à la lecture un contenu dont l’adresse du lecteur n’est pas celle attendue', async () => {
    const c = t.database.client;
    const { postId } = await ajouterActualite(c, 1, { statut: 'publie' });
    const faux = { forme: 'video', fournisseur: 'youtube', integration: 'https://evil.example/embed/c52RdPtL_l8', page: 'https://acme.example/', editeur: 'acme.example', titre: null };
    await c.execute({ sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'external_embed', 'x', 'x', ?, 'x')`, args: [postId, JSON.stringify(faux)] });
    expect((await lireVideos(c, [postId])).size).toBe(0);
  });
});
