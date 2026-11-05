// Modèles en tendance sur Hugging Face (P6, bloc 3) : un document par modèle public, popularité hors de la capture.
import { describe, expect, it } from 'vitest';
import { parseModelesTendance } from '../src/collect/huggingface.ts';
import { SOURCES } from '../src/sources.ts';
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
