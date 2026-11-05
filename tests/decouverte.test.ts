import { describe, expect, it } from 'vitest';
import { REGLAGES_PAR_DEFAUT } from '../src/control/settings.ts';
import { lireRecherche, trierCandidats, urlRecherche, versEntree, type DepotTrouve } from '../src/ressources/decouverte.ts';

const depot = (nom: string, etoiles: number, extra: Partial<DepotTrouve> = {}): DepotTrouve => ({
  full_name: nom, html_url: `https://github.com/${nom}`, description: null, stargazers_count: etoiles,
  created_at: '2026-10-20T00:00:00Z', pushed_at: '2026-11-04T00:00:00Z', archived: false, fork: false, ...extra,
});
const tri = (trouves: { depot: DepotTrouve; sujet: string }[], connus: string[] = [], max = 10) =>
  trierCandidats(trouves, { seuil: 100, connus: new Set(connus), max, releveLe: '2026-11-05T08:00:00.000Z' });

describe('découverte automatique de dépôts', () => {
  it('le seuil vaut 100 étoiles par défaut et se règle en base, sans toucher au code', () => {
    expect(REGLAGES_PAR_DEFAUT['decouverte.seuil_etoiles']).toBe(100);
    expect(decodeURIComponent(urlRecherche('mcp-server', 100, '2026-10-06'))).toContain('topic:mcp-server stars:>=100 created:>=2026-10-06');
  });

  it('le code revérifie le seuil et écarte archives, forks et dépôts déjà connus', () => {
    const { candidats, ecartes } = tri([
      { depot: depot('a/sous-seuil', 99), sujet: 's' },
      { depot: depot('a/archive', 500, { archived: true }), sujet: 's' },
      { depot: depot('a/fork', 500, { fork: true }), sujet: 's' },
      { depot: depot('a/Connu', 500), sujet: 's' },
      { depot: depot('a/bon', 100), sujet: 's' },
    ], ['a/connu']);
    expect(candidats.map((c) => c.depot.full_name)).toEqual(['a/bon']);
    expect(ecartes.map((e) => e.motif).sort()).toEqual(['archive', 'deja_connu', 'fork', 'sous_le_seuil']);
  });

  it('un dépôt trouvé par deux sujets ne compte qu’une fois ; les plus étoilés d’abord, dans la limite', () => {
    const { candidats } = tri([
      { depot: depot('a/x', 150), sujet: 'mcp-server' },
      { depot: depot('a/y', 900), sujet: 'mcp-server' },
      { depot: depot('a/x', 150), sujet: 'ai-agents' },
      { depot: depot('a/z', 300), sujet: 'ai-agents' },
    ], [], 2);
    expect(candidats.map((c) => c.depot.full_name)).toEqual(['a/y', 'a/z']);
  });

  it('une entrée illisible est comptée, jamais devinée', () => {
    const corps = JSON.stringify({ items: [depot('a/ok', 200), { full_name: 'pas un dépôt' }] });
    expect(lireRecherche(corps)).toMatchObject({ depots: [{ full_name: 'a/ok' }], illisibles: 1 });
  });

  it('un candidat entre dans la chaîne des ressources pour Repo, marqué comme découverte, étoiles datées et hors critère', () => {
    const e = versEntree({ depot: depot('Owner/My.Repo', 2400), sujet: 'claude-skills', releveLe: '2026-11-05T08:00:00.000Z' });
    expect(e).toMatchObject({ slug: 'gh-owner-my-repo', depot: 'Owner/My.Repo', chemins: ['README.md'], compte: 'repo', decouverteAuto: true });
    expect(e.decouverteVia).toContain('2400 étoiles relevées le 2026-11-05');
    expect(e.decouverteVia).toContain('pas un critère de qualité');
  });
});
