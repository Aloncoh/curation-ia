// Audit d'accessibilité du site local (SPEC §7.4) : axe-core sur l'accueil, le fil, une publication, un profil et une recherche,
// dans les trois langues, à 375 px et à 1280 px de large, en thème clair et sombre. Le serveur doit tourner (`npm run web:dev`).
// Usage : node apps/web/scripts/audit-axe.ts [http://localhost:3000] ; sortie : JSON des violations par page.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:3000';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
// Publications prises dans le fil réel (en ligne, les identifiants diffèrent du local) : la première et sa fiche, plus
// une sélection si le fil en a une. Rubriques réservées aux comptes membres comprises (2026-11-04).
const fil = (await (await fetch(`${base}/api/v1/fil`)).json()) as { publications: { id: number; nature: string }[] };
const premiere = fil.publications[0]?.id;
const selection = fil.publications.find((p) => p.nature === 'selection')?.id;
const pages = ['/', '/fil', ...(premiere ? [`/p/${premiere}`, `/p/${premiere}/fiche`] : []), ...(selection ? [`/p/${selection}`] : []), '/comptes/mova', '/comptes', '/recherche?q=motion%20design', '/recherche', '/notifications', '/messages', '/reels', '/profil'];
const navigateur = await chromium.launch({ channel: process.env.CURATION_CHROME ?? 'chrome', headless: true });
const rapport: { langue: string; theme: string; largeur: number; page: string; violations: { id: string; impact: string | null; noeuds: number; exemple: string }[]; regles_passees: number }[] = [];
try {
  for (const langue of ['en', 'fr', 'he']) {
    for (const [largeur, theme] of [[375, 'light'], [1280, 'light'], [375, 'dark'], [1280, 'dark']] as const) {
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, colorScheme: theme });
      await contexte.addCookies([{ name: 'langue', value: langue, url: base }]);
      const onglet = await contexte.newPage();
      for (const page of pages) {
        await onglet.goto(base + page, { waitUntil: 'networkidle' });
        await onglet.addScriptTag({ content: axe });
        const resultat = await onglet.evaluate(async () => {
          // @ts-expect-error axe est injecté dans la page
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
          const violations = r.violations.map((v: { id: string; impact: string | null; nodes: { target: string[] }[] }) => ({ id: v.id, impact: v.impact, noeuds: v.nodes.length, exemple: String(v.nodes[0]?.target?.[0] ?? '') }));
          return { violations, regles_passees: r.passes.length as number };
        });
        rapport.push({ langue, theme, largeur, page, ...resultat });
      }
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
}
const critiques = rapport.flatMap((r) => r.violations.filter((v) => v.impact === 'critical').map((v) => ({ ...v, langue: r.langue, largeur: r.largeur, page: r.page })));
console.log(JSON.stringify({ base, pages_auditees: rapport.length, critiques: critiques.length, rapport }, null, 2));
process.exitCode = critiques.length ? 1 : 0;
