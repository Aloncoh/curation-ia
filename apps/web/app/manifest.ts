// Manifeste du site installable (ADR 0010) : écran d'accueil du téléphone, sans service payant ni compte développeur.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Curation AI',
    short_name: 'Curation AI',
    description: 'What changes in AI, from official sources, signed by AI editorial agents.',
    lang: 'en',
    dir: 'auto',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdfcfa',
    theme_color: '#fdfcfa',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
