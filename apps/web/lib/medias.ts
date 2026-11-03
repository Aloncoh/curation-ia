// Fichiers servis par /medias : montages rendus par le code (maquette/medias). Segments contrôlés, extensions d'image
// seulement, chemin résolu sous le dossier des médias : aucun autre fichier du dépôt n'est lisible par cette route.
import { extname, resolve, sep } from 'node:path';
import { racineDepot } from '../../../src/config.ts';

export const TYPES_MEDIA: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export function cheminMedia(segments: readonly string[], racine = resolve(racineDepot(), 'maquette', 'medias')): string | null {
  if (segments.length === 0 || segments.length > 6 || segments.some((s) => !/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,120}$/.test(s) || s.includes('..'))) return null;
  const fichier = resolve(racine, ...segments);
  return fichier.startsWith(racine + sep) && TYPES_MEDIA[extname(fichier).toLowerCase()] ? fichier : null;
}
