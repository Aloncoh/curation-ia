// Registre officiel MCP (P6, bloc 3) : lecture des pages, dépôts GitHub, requêtes groupées sous la longueur maximale,
// et parcours complet sans réseau (transport et résolveur injectés).
import { describe, expect, it } from 'vitest';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { versEntree } from '../src/ressources/decouverte.ts';
import { chercherRegistreMcp, depotGithub, lireRegistre, requetesDepots } from '../src/ressources/registre-mcp.ts';

const serveur = (name: string, url?: string) => ({ server: { name, description: 'd', version: '1.0.0', ...(url ? { repository: { url, source: 'github' } } : {}) }, _meta: {} });
const depot = (nom: string, etoiles: number) => ({
  full_name: nom, html_url: `https://github.com/${nom}`, description: null, stargazers_count: etoiles,
  created_at: '2026-10-20T00:00:00Z', pushed_at: '2026-11-04T00:00:00Z', archived: false, fork: false,
});

describe('registre officiel MCP', () => {
  it('extrait propriétaire/dépôt d’une adresse GitHub https, rien d’autre', () => {
    expect(depotGithub('https://github.com/ApogeeGIT/apogee-mcp')).toBe('ApogeeGIT/apogee-mcp');
    expect(depotGithub('https://github.com/a/b.git')).toBe('a/b');
    expect(depotGithub('http://github.com/a/b')).toBeNull();
    expect(depotGithub('https://gitlab.com/a/b')).toBeNull();
    expect(depotGithub('https://github.com/a/b/tree/main/x')).toBeNull();
    expect(depotGithub(undefined)).toBeNull();
  });

  it('garde les serveurs avec un dépôt propre, compte les entrées illisibles, rend le curseur', () => {
    const corps = JSON.stringify({
      servers: [serveur('ex.a/mcp', 'https://github.com/a/mcp'), serveur('ex.b/mcp'), serveur('ex.c/mcp', 'https://github.com/modelcontextprotocol/registry'), { pas: 'un serveur' }],
      metadata: { nextCursor: 'ex.c/mcp:1.0.0', count: 4 },
    });
    expect(lireRegistre(corps)).toEqual({ serveurs: [{ nom: 'ex.a/mcp', depot: 'a/mcp' }], suivant: 'ex.c/mcp:1.0.0', illisibles: 1 });
  });

  it('groupe les dépôts en requêtes de 256 caractères au plus, chacune avec le seuil', () => {
    const depots = Array.from({ length: 40 }, (_, i) => `proprietaire-${i}/depot-mcp-${i}`);
    const requetes = requetesDepots(depots, 100);
    expect(requetes.length).toBeGreaterThan(1);
    for (const q of requetes) {
      expect(q.length).toBeLessThanOrEqual(256);
      expect(q.endsWith(' stars:>=100')).toBe(true);
    }
    expect(requetes.join(' ').match(/repo:/g)).toHaveLength(40);
  });

  it('parcourt les pages puis cherche les dépôts au-dessus du seuil ; la provenance le dit, sans en faire un critère', async () => {
    const appels: string[] = [];
    const transport: Transport = async (req) => {
      const url = req.url.toString();
      appels.push(url);
      if (url.startsWith('https://registry.modelcontextprotocol.io/') && !url.includes('cursor=')) {
        return { status: 200, headers: {}, body: Buffer.from(JSON.stringify({ servers: [serveur('io.x/alpha', 'https://github.com/x/alpha')], metadata: { nextCursor: 'io.x/alpha:1' } })) };
      }
      if (url.startsWith('https://registry.modelcontextprotocol.io/')) {
        return { status: 200, headers: {}, body: Buffer.from(JSON.stringify({ servers: [serveur('io.y/beta', 'https://github.com/y/beta')], metadata: {} })) };
      }
      return { status: 200, headers: {}, body: Buffer.from(JSON.stringify({ items: [depot('x/alpha', 340)] })) };
    };
    const resolve: Resolver = async () => [{ address: '93.184.216.34', family: 4 }];
    const r = await chercherRegistreMcp({ userAgent: 'test', seuil: 100, depuis: '2026-10-06T00:00:00.000Z', transport, resolve, attendre: async () => {} });
    expect(r.serveurs).toBe(2);
    expect(r.erreurs).toEqual([]);
    expect(r.trouves).toEqual([{ depot: depot('x/alpha', 340), sujet: 'registre-mcp:io.x/alpha' }]);
    expect(appels.filter((u) => u.includes('registry.modelcontextprotocol.io')).every((u) => u.includes('version=latest') && u.includes('updated_since='))).toBe(true);
    const recherche = decodeURIComponent(appels.find((u) => u.startsWith('https://api.github.com/'))!);
    expect(recherche).toContain('repo:x/alpha repo:y/beta stars:>=100');
    const entree = versEntree({ ...r.trouves[0]!, releveLe: '2026-11-05T12:00:00.000Z' });
    expect(entree).toMatchObject({ depot: 'x/alpha', compte: 'repo', decouverteAuto: true });
    expect(entree.decouverteVia).toContain('registre officiel MCP (serveur « io.x/alpha »)');
    expect(entree.decouverteVia).toContain('pas un critère de qualité');
  });
});
