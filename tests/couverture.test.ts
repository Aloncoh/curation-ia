// Élargissement de la couverture (2026-11-10) : plan de site d'Anthropic, motif des sorties illisibles, jeton GitHub
// limité à api.github.com, plan de découverte par agent sans les noms du jeu de contrôle.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseFeedItems, parseSitemap } from '../src/collect/feeds.ts';
import { avecJetonGithub } from '../src/collect/safe-fetch.ts';
import { lireSortie } from '../src/analysis/pipeline.ts';
import { PLAN_DECOUVERTE, requetesDuPlan, trierCandidats, type DepotTrouve } from '../src/ressources/decouverte.ts';
import { DEPOTS_CONTROLE } from '../src/ressources/controle-decouverte.ts';
import { SOURCES } from '../src/sources.ts';

const PLAN = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://www.anthropic.com/claude-fable-and-mythos-5-2</loc><lastmod>2026-11-09T19:40:53.000Z</lastmod></url>
<url><loc>https://www.anthropic.com/legal/consumer-terms</loc><lastmod>2026-11-10T01:00:00.000Z</lastmod></url>
<url><loc>https://www.anthropic.com/research/provable-inference</loc><lastmod>2026-11-09T09:39:00.000Z</lastmod></url>
<url><loc>https://evil.example/news/x</loc><lastmod>2026-11-10T00:00:00.000Z</lastmod></url>
</urlset>`;

describe('plan de site (Anthropic, aucun flux officiel)', () => {
  const config = { maxItems: 10, linkHosts: ['www.anthropic.com'], plan: { prefixes: ['/news/', '/research/', '/claude-'] } };

  it('garde les rubriques autorisées, les plus récemment modifiées d’abord, sans inventer de date d’annonce', () => {
    const { documents, rejected } = parseSitemap(PLAN, config);
    expect(documents.map((d) => d.url)).toEqual(['https://www.anthropic.com/claude-fable-and-mythos-5-2', 'https://www.anthropic.com/research/provable-inference']);
    expect(documents[0]!.announcedAt).toBeNull();
    expect(documents[0]!.metadata).toMatchObject({ modifieLe: '2026-11-09T19:40:53.000Z' });
    expect(documents[0]!.title).toBe('Claude fable and mythos 5 2');
    expect(rejected).toMatchObject({ hors_rubrique: 1 });
    expect(Object.values(rejected).reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('passe par parseFeedItems quand la source déclare un plan', () => {
    expect(parseFeedItems(PLAN, config).documents).toHaveLength(2);
  });

  it('refuse une page qui n’est pas un plan de site', () => {
    expect(() => parseSitemap('<html></html>', config)).toThrow(/Plan de site illisible/);
  });

  it('la source Anthropic est déclarée, signée par Nodi', () => {
    const s = SOURCES.find((x) => x.id === 'feed:anthropic-plan');
    expect(s?.compte).toBe('nodi');
  });
});

describe('sortie illisible du modèle', () => {
  const schema = z.object({ titre: z.string(), etapes: z.array(z.string()) }).strict();

  it('donne un motif court et lisible au lieu de perdre la cause', () => {
    expect(lireSortie('{"titre":"x","etapes":["a"]}', schema)).toEqual({ ok: true, valeur: { titre: 'x', etapes: ['a'] } });
    const manque = lireSortie('{"titre":"x"}', schema);
    expect(manque.ok).toBe(false);
    if (!manque.ok) expect(manque.motif).toMatch(/^etapes : /);
    const json = lireSortie('{"titre":', schema);
    expect(!json.ok && json.motif.startsWith('JSON illisible')).toBe(true);
  });
});

describe('jeton GitHub d’Actions', () => {
  it('n’est envoyé qu’à api.github.com, en https, avec le transport réel', () => {
    const avant = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'jeton-de-test';
    try {
      expect(avecJetonGithub(new URL('https://api.github.com/repos/a/b'), {}, true)).toEqual({ authorization: 'Bearer jeton-de-test' });
      expect(avecJetonGithub(new URL('https://github.com/a/b'), {}, true)).toEqual({});
      expect(avecJetonGithub(new URL('https://api.github.com.evil.example/x'), {}, true)).toEqual({});
      expect(avecJetonGithub(new URL('https://api.github.com/repos/a/b'), {}, false)).toEqual({});
    } finally {
      if (avant === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = avant;
    }
  });
});

describe('plan de découverte par agent', () => {
  const requetes = requetesDuPlan(PLAN_DECOUVERTE, 100, '2026-11-10T08:00:00.000Z');

  it('couvre les six agents, avec les fenêtres nouveaux et montants', () => {
    expect(new Set(PLAN_DECOUVERTE.map((r) => r.compte))).toEqual(new Set(['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar']));
    const q = decodeURIComponent(requetes.find((r) => r.fenetre === 'montants')!.url);
    expect(q).toContain('stars:>=1000 created:>=2025-11-10 pushed:>=2026-10-27');
    expect(decodeURIComponent(requetes[0]!.url)).toContain('stars:>=100 created:>=2026-10-11');
  });

  it("n'injecte aucun nom du jeu de contrôle dans les requêtes", () => {
    const termes = PLAN_DECOUVERTE.map((r) => r.q.toLowerCase()).join(' ');
    for (const depot of DEPOTS_CONTROLE) {
      const [proprietaire, nom] = depot.toLowerCase().split('/');
      expect(termes).not.toContain(proprietaire!);
      // Les noms génériques (« skills ») sont des thèmes ; un nom propre au dépôt ne doit jamais apparaître.
      if (!['skills'].includes(nom!)) expect(termes).not.toContain(nom!);
    }
  });

  it('chaque agent garde sa part des candidats', () => {
    const depot = (n: string, etoiles: number): DepotTrouve => ({ full_name: n, html_url: `https://github.com/${n}`, description: null, stargazers_count: etoiles, created_at: null, pushed_at: null, archived: false, fork: false });
    const trouves = [
      ...['a/1', 'a/2', 'a/3', 'a/4'].map((n, i) => ({ depot: depot(n, 9_000 - i), sujet: 's', compte: 'repo' as const })),
      { depot: depot('m/1', 150), sujet: 's', compte: 'mova' as const },
    ];
    const { candidats } = trierCandidats(trouves, { seuil: 100, connus: new Set(), max: 10, releveLe: '2026-11-10T08:00:00.000Z', maxParCompte: 3 });
    expect(candidats.map((c) => c.depot.full_name)).toEqual(['a/1', 'a/2', 'a/3', 'm/1']);
    expect(candidats[3]!.compte).toBe('mova');
  });
});

describe('élagage d’un brouillon de ressource', async () => {
  const { elaguerRessource } = await import('../src/ressources/agent-decouvertes.ts');
  const cite = (t: string) => ({ texte: t, passages: ['1'] });
  const brouillon = { interet: cite('i'), limites: [cite('a'), cite('b')], compatibilites: [cite('c')], reperes: [cite('r')], demarrage: { etapes: [cite('e1'), cite('e2')], commande: null, passages: ['1'] } };

  it('retire une limite ou une étape signalée, le reste intact', () => {
    const e = elaguerRessource(brouillon, [{ champ: 'limites:1', code: 'copie_de_la_source' }, { champ: 'demarrage.etapes:1', code: 'etape_trop_longue' }, { champ: 'visuel', code: 'visuel_absent' }]);
    expect(e).toMatchObject({ limites: [cite('a')], demarrage: { etapes: [cite('e1')] }, interet: cite('i') });
    expect(brouillon.limites).toHaveLength(2);
  });

  it('refuse quand un champ principal est fautif ou qu’une liste tomberait sous son minimum', () => {
    expect(elaguerRessource(brouillon, [{ champ: 'interet', code: 'copie_de_la_source' }])).toBeNull();
    expect(elaguerRessource(brouillon, [{ champ: 'reperes:0', code: 'contexte_a_relire' }])).toBeNull();
    expect(elaguerRessource(brouillon, [{ champ: 'visuel', code: 'visuel_absent' }])).toBeNull();
  });
});
