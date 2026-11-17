// Modèles en tendance sur Hugging Face (P6, bloc 3) : un document par modèle public, popularité hors de la capture.
import { describe, expect, it } from 'vitest';
import { parseModelesTendance, parsePapiersDuJour } from '../src/collect/huggingface.ts';
import { attributionDe, SOURCES } from '../src/sources.ts';
import { adapterFor } from '../src/worker/collect.ts';

const modele = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: 'x', id, likes: 819, trendingScore: 774, downloads: 11658, private: false,
  tags: ['transformers', 'text-generation', 'license:apache-2.0'], pipeline_tag: 'text-generation', library_name: 'transformers',
  createdAt: '2026-11-02T04:13:51.000Z', ...extra,
});

describe('Hugging Face, modèles en tendance', () => {
  it('un document par modèle public : adresse du modèle, date de création, tâche, bibliothèque et licence', () => {
    const { documents, rejected } = parseModelesTendance(JSON.stringify([modele('moonshotai/Kimi-K3.1-Pro'), modele('a/prive', { private: true }), { id: '../evil' }]), { maxItems: 20 });
    expect(rejected).toEqual({ illisible: 2 });
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      url: 'https://huggingface.co/moonshotai/Kimi-K3.1-Pro', title: 'moonshotai/Kimi-K3.1-Pro', announcedAt: '2026-11-02T04:13:51.000Z', contentFormat: 'text',
      metadata: { likes: 819, downloads: 11658, trendingScore: 774 },
    });
    expect(documents[0]!.content).toBe('Model moonshotai/Kimi-K3.1-Pro on Hugging Face.\nTask: text-generation.\nLibrary: transformers.\nLicense: apache-2.0.');
  });

  it('la popularité n’entre jamais dans la capture lue par le modèle', () => {
    const { documents } = parseModelesTendance(JSON.stringify([modele('a/b')]), { maxItems: 20 });
    expect(documents[0]!.content).not.toMatch(/819|774|11658|like|download|trend/i);
  });

  it('respecte le nombre maximal et refuse une réponse vide ou illisible', () => {
    expect(parseModelesTendance(JSON.stringify([modele('a/b'), modele('c/d'), modele('e/f')]), { maxItems: 2 }).documents).toHaveLength(2);
    expect(() => parseModelesTendance('[]', { maxItems: 2 })).toThrow('sans aucun modèle');
    expect(() => parseModelesTendance('<html>', { maxItems: 2 })).toThrow('illisible');
  });

  it('la source est déclarée pour Nodi, sur le seul hôte huggingface.co, et la collecte sait la lire', () => {
    const def = SOURCES.find((s) => s.id === 'huggingface:modeles-tendance')!;
    expect(def).toMatchObject({ kind: 'huggingface_models', compte: 'nodi', allowedHosts: ['huggingface.co'] });
    const adaptateur = adapterFor(def);
    expect(adaptateur.url).toBe('https://huggingface.co/api/models?sort=trendingScore&limit=20');
    expect(adaptateur.parse(JSON.stringify([modele('a/b')])).documents).toHaveLength(1);
  });
});

const papier = (id: string, votes: number, extra: Record<string, unknown> = {}) => ({
  publishedAt: '2026-11-12T19:00:00.000Z', title: `Titre ${id}`, summary: 'copie', numComments: 3,
  paper: {
    id, title: `Un agent  généraliste\n pour ${id}`, upvotes: votes, publishedAt: '2026-11-13T00:00:00.000Z',
    summary: 'We introduce an agent\nbuilt for long-horizon tasks.', ai_summary: 'Résumé automatique à ne jamais reprendre.', ...extra,
  },
});

describe('Hugging Face, papiers du jour', () => {
  it('garde les papiers au-dessus du seuil de votes, les plus votés d’abord ; la capture est le résumé des auteurs', () => {
    const corps = JSON.stringify([papier('2611.00001', 12), papier('2611.00002', 35), papier('2611.00003', 101), papier('2611.00003', 101), { paper: { id: '../evil', title: 'x' } }]);
    const { documents, rejected } = parsePapiersDuJour(corps, { maxItems: 10, votesMin: 20 });
    expect(rejected).toEqual({ sous_le_seuil: 1, doublon: 1, illisible: 1 });
    expect(documents.map((d) => d.url)).toEqual(['https://huggingface.co/papers/2611.00003', 'https://huggingface.co/papers/2611.00002']);
    expect(documents[0]).toMatchObject({
      title: 'Un agent généraliste pour 2611.00003', announcedAt: '2026-11-13T00:00:00.000Z', contentFormat: 'text',
      content: 'We introduce an agent built for long-horizon tasks.',
      metadata: { signal: 'papiers_hf', votes: 101, arxiv: 'https://arxiv.org/abs/2611.00003' },
    });
  });

  it('ni les votes ni le résumé automatique de Hugging Face n’entrent dans la capture', () => {
    const { documents } = parsePapiersDuJour(JSON.stringify([papier('2611.00003', 101)]), { maxItems: 10, votesMin: 20 });
    expect(documents[0]!.content).not.toMatch(/101|vote|automatique/i);
  });

  it('sans résumé, la capture reste courte ; nombre maximal respecté ; réponse vide ou illisible refusée', () => {
    const sans = parsePapiersDuJour(JSON.stringify([papier('2611.00004', 40, { summary: undefined })]), { maxItems: 10, votesMin: 20 });
    expect(sans.documents[0]!.content).toBe('Paper arXiv:2611.00004, listed on Hugging Face Papers.');
    expect(parsePapiersDuJour(JSON.stringify([papier('2611.00001', 30), papier('2611.00002', 40), papier('2611.00003', 50)]), { maxItems: 2, votesMin: 20 }).documents).toHaveLength(2);
    // Aucun papier au-dessus du seuil ce jour-là : une liste vide, pas une erreur.
    expect(parsePapiersDuJour(JSON.stringify([papier('2611.00001', 3)]), { maxItems: 2, votesMin: 20 }).documents).toEqual([]);
    expect(() => parsePapiersDuJour('[]', { maxItems: 2, votesMin: 20 })).toThrow('sans aucun papier');
    expect(() => parsePapiersDuJour('<html>', { maxItems: 2, votesMin: 20 })).toThrow('illisible');
    expect(() => parsePapiersDuJour(JSON.stringify([{ autre: 1 }]), { maxItems: 2, votesMin: 20 })).toThrow('sans papier lisible');
  });

  it('la source est déclarée comme contenu externe attribué aux auteurs, sans compte imposé, et la collecte sait la lire', () => {
    const def = SOURCES.find((s) => s.id === 'huggingface:papiers-du-jour')!;
    expect(def).toMatchObject({ kind: 'huggingface_models', allowedHosts: ['huggingface.co'], config: { papiers: { votesMin: 20 } } });
    expect(def.compte).toBeUndefined();
    expect(attributionDe(def)).toContain('auteurs');
    expect(attributionDe(SOURCES.find((s) => s.id === 'huggingface:modeles-tendance'))).toBeNull();
    const adaptateur = adapterFor(def);
    expect(adaptateur.url).toBe('https://huggingface.co/api/daily_papers?limit=50');
    expect(adaptateur.parse(JSON.stringify([papier('2611.00003', 101)])).documents).toHaveLength(1);
  });
});
