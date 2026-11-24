// Face à face (src/api/v1/face-a-face.ts) sur une base temporaire : quels modèles sont rapprochés, ce que chaque côté
// reprend de sa fiche, « Non renseigné » pour une ligne absente, et le refus de toute paire qui n'en est pas une.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FaceAFace, ReponseFacesAFace } from '../packages/contrat/src/index.ts';
import { faceAFace, facesAFace, type Contexte } from '../src/api/v1/index.ts';
import { editeurDe, familleDe } from '../src/api/v1/face-a-face.ts';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { ajouterActualite, ajouterTraduction, contenuActualite, socle } from './helpers/publications.ts';

let t: TestDb;
const ctx = (o: Partial<Contexte> = {}): Contexte => ({ client: t.database.client, mode: 'apercu', langue: 'en', maintenant: '2026-11-03T12:00:00.000Z', ...o });

const modele = (n: number, produit: string, extra: Record<string, unknown> = {}) => ({
  ...contenuActualite(n),
  nature: 'nouveau_modele',
  categories: ['modèles'],
  produit,
  version_cible: 'version non précisée',
  nouveaute: { texte: `${produit} is new.`, passages: [] },
  acces: { texte: `${produit} is in the API.`, passages: [] },
  ...extra,
});

/** Une publication de modèle, citée depuis sa propre page et annoncée à cette date. */
async function ajouterModele(n: number, produit: string, url: string, date: string, o: { statut?: 'en_attente' | 'publie'; contenu?: Record<string, unknown> } = {}) {
  const c = t.database.client;
  await c.execute({ sql: `insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (?, 's', ?, ?, ?, 't', 'x', 'x')`, args: [100 + n, `e${n}`, url, `u${n}`] });
  const ids = await ajouterActualite(c, n, { contenu: o.contenu ?? modele(n, produit), ...(o.statut ? { statut: o.statut } : {}) });
  await c.execute({ sql: 'update post_source set document_id = ? where revision_id = ?', args: [100 + n, ids.revisionId] });
  await c.execute({ sql: 'update news_item set announced_at = ? where id = ?', args: [date, n] });
  return ids;
}

beforeEach(async () => {
  t = await createTestDb();
  await socle(t.database.client);
});
afterEach(() => t.cleanup());

describe('famille et éditeur d’un modèle', () => {
  it('classe par catégorie, puis par le nom et l’accroche ; à défaut, texte', () => {
    expect(familleDe({ categories: ['modèles', 'audio et musique'], produit: 'Voxtral 3', accroche: 'x' })).toBe('audio');
    expect(familleDe({ categories: ['modèles'], produit: 'Eleven Realtime', accroche: 'One model ID that behaves like a finished voice agent.' })).toBe('audio');
    expect(familleDe({ categories: ['modèles', 'création visuelle'], produit: 'FastFrames', accroche: 'x' })).toBe('visuel');
    expect(familleDe({ categories: ['modèles', 'agents et automatisation'], produit: 'Gemini 4 Carbon', accroche: 'A model built for long-horizon agentic work' })).toBe('texte');
  });

  it('ramène les adresses d’un même éditeur à un seul nom', () => {
    expect(editeurDe('https://blog.google/innovation-and-ai/x/', 'feed:a')).toBe(editeurDe('https://deepmind.google/blog/y/', 'feed:b'));
    expect(editeurDe('https://www.mistral.ai/news/voxtral-3/', 'feed:mistral')).toBe('mistral.ai');
    expect(editeurDe('https://github.com/acme/model', 'x')).toBe('github.com/acme');
    expect(editeurDe('https://github.com/autre/model', 'x')).not.toBe(editeurDe('https://github.com/acme/model', 'x'));
    expect(editeurDe(null, 'feed:tldr-ai')).toBe('source:feed:tldr-ai');
  });
});

describe('paires', () => {
  beforeEach(async () => {
    await ajouterModele(1, 'Mistral Large 4', 'https://mistral.ai/news/mistral-large-4/', '2026-10-29T12:00:00.000Z');
    await ajouterModele(2, 'Gemini 4 Carbon', 'https://blog.google/gemini-4-carbon/', '2026-10-28T17:00:00.000Z');
    await ajouterModele(3, 'Voxtral 3', 'https://mistral.ai/news/voxtral-3/', '2026-10-20T12:00:00.000Z', { contenu: modele(3, 'Voxtral 3', { categories: ['modèles', 'audio et musique'] }) });
    await ajouterModele(4, 'Mistral Small 4', 'https://mistral.ai/news/mistral-small-4/', '2026-10-27T12:00:00.000Z');
    await ajouterModele(5, 'Orion 2', 'https://orion.example/orion-2', '2026-05-01T12:00:00.000Z');
    // Une nouveauté qui n'est pas un modèle, et une variante du même produit : jamais rapprochées.
    await ajouterModele(6, 'Widget', 'https://acme.example/widget', '2026-10-28T12:00:00.000Z', { contenu: { ...modele(6, 'Widget'), nature: 'nouvelle_fonctionnalite' } });
    await ajouterModele(7, 'Gemini 4 Carbon Flash', 'https://deepmind.google/carbon-flash/', '2026-10-26T12:00:00.000Z');
  });

  it('rapproche chaque modèle du plus proche modèle antérieur de même famille, d’un autre éditeur, à 120 jours au plus', async () => {
    const r = ReponseFacesAFace.parse(await facesAFace(ctx()));
    // 1 → 2 (Google, la veille). 2 → 4 (Mistral ; 7 est du même éditeur). 4 → 7 (Google). 7 → rien : 5 est à 178 jours.
    expect(r.paires.map((p) => p.paire)).toEqual(['1-2', '2-4', '4-7']);
    expect(r.paires[0]!.cotes).toEqual([
      { id: 1, produit: 'Mistral Large 4', url: 'https://mistral.ai/news/mistral-large-4/' },
      { id: 2, produit: 'Gemini 4 Carbon', url: 'https://blog.google/gemini-4-carbon/' },
    ]);
  });

  it('ne rapproche que des publications visibles', async () => {
    expect((await facesAFace(ctx({ mode: 'public' }))).paires).toEqual([]);
    expect(await faceAFace(ctx({ mode: 'public' }), 1, 2)).toBeNull();
  });

  it('refuse une paire à l’envers, de familles différentes, d’un même éditeur, trop éloignée ou inconnue', async () => {
    expect(await faceAFace(ctx(), 2, 1)).toBeNull();
    expect(await faceAFace(ctx(), 1, 3)).toBeNull();
    expect(await faceAFace(ctx(), 1, 4)).toBeNull();
    expect(await faceAFace(ctx(), 1, 5)).toBeNull();
    expect(await faceAFace(ctx(), 1, 6)).toBeNull();
    expect(await faceAFace(ctx(), 1, 1)).toBeNull();
    expect(await faceAFace(ctx(), 1, 999)).toBeNull();
    expect(await faceAFace(ctx(), 2, 7)).toBeNull();
  });
});

describe('contenu d’un face à face', () => {
  const carbon = modele(2, 'Gemini 4 Carbon', {
    cout: { texte: 'Two dollars per million input tokens.', passages: [] },
    limites_connues: { texte: 'Not generally available yet.', passages: [] },
    attributions: [{ type: 'benchmark', auteur: 'Google DeepMind', texte: '88.2% on SEC-bench Pro.', passages: [], conditions: { texte: 'Evaluated without guardrails.', passages: [] } }],
  });

  it('reprend la fiche de chaque post, écrit null pour une ligne absente et attribue chaque résultat à son auteur', async () => {
    await ajouterModele(1, 'Mistral Large 4', 'https://mistral.ai/news/mistral-large-4/', '2026-10-29T12:00:00.000Z');
    await ajouterModele(2, 'Gemini 4 Carbon', 'https://blog.google/gemini-4-carbon/', '2026-10-28T17:00:00.000Z', { contenu: carbon });
    const f = FaceAFace.parse(await faceAFace(ctx(), 1, 2));
    expect(f.paire).toBe('1-2');
    const [a, b] = f.cotes;
    expect([a.produit, a.publication.id, a.annonce_le, a.langue]).toEqual(['Mistral Large 4', 1, '2026-10-29T12:00:00.000Z', 'en']);
    expect(a.lignes.nouveaute!.map((e) => e.texte)).toEqual(['Mistral Large 4 is new.']);
    expect(a.lignes.acces!.map((e) => e.texte)).toEqual(['Mistral Large 4 is in the API.']);
    expect([a.lignes.cout, a.lignes.limites_connues, a.rapportes]).toEqual([null, null, []]);
    expect(b.lignes.cout!.map((e) => e.texte)).toEqual(['Two dollars per million input tokens.']);
    expect(b.lignes.limites_connues!.map((e) => e.texte)).toEqual(['Not generally available yet.']);
    expect(b.rapportes).toEqual([{ cle: 'fiche.attributions.0.texte', titre: 'Google DeepMind', texte: '88.2% on SEC-bench Pro.', complement: 'Evaluated without guardrails.' }]);
  });

  it('sert chaque côté dans sa langue : traduit si toute sa fiche l’est, sinon l’original', async () => {
    const un = await ajouterModele(1, 'Mistral Large 4', 'https://mistral.ai/news/mistral-large-4/', '2026-10-29T12:00:00.000Z');
    await ajouterModele(2, 'Gemini 4 Carbon', 'https://blog.google/gemini-4-carbon/', '2026-10-28T17:00:00.000Z', { contenu: carbon });
    await ajouterTraduction(t.database.client, un.revisionId, 'fr', { accroche: 'a', description: 'b', ce_que_ca_permet: 'c', 'fiche.nouveaute': 'Mistral Large 4 est nouveau.', 'fiche.acces': 'Mistral Large 4 est dans l’API.' });
    const [a, b] = (await faceAFace(ctx({ langue: 'fr' }), 1, 2))!.cotes;
    expect([a.langue, a.traduction?.langue, a.lignes.nouveaute![0]!.texte]).toEqual(['fr', 'fr', 'Mistral Large 4 est nouveau.']);
    expect([b.langue, b.traduction, b.lignes.cout![0]!.texte]).toEqual(['en', null, 'Two dollars per million input tokens.']);
  });
});
