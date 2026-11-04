// Configuration du site (P4). Le site est lancé depuis la racine du dépôt (`npm run web:dev`) : la base locale
// (data/curation.db) et les montages (maquette/medias) s'y lisent avec les mêmes chemins que les commandes.
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const racine = fileURLToPath(new URL('../..', import.meta.url));

const config: NextConfig = {
  // Le code partagé (src/, packages/) est hors de apps/web.
  turbopack: { root: racine },
  outputFileTracingRoot: racine,
  // Fichiers lus à l'exécution hors de apps/web (Vercel) : montages rendus par le code et avatars des comptes.
  outputFileTracingIncludes: { '/**': ['../../maquette/medias/montages/**/*.{jpg,png,webp}', '../../assets/brand/*.{png,jpg,webp}'] },
  transpilePackages: ['@curation/contrat', '@curation/textes'],
  // Client SQLite natif et navigateur de capture : jamais empaquetés.
  serverExternalPackages: ['@libsql/client', 'libsql', 'playwright-core'],
  // TypeScript 7 n'expose plus l'API que Next.js utilise pendant `next build` : les types sont vérifiés par
  // `npm run web:typecheck` (tsc -p apps/web), lancé avec les tests.
  typescript: { ignoreBuildErrors: true },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:chemin*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
