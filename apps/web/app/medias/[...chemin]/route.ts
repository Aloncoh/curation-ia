// GET /medias/… : montages rendus par le code (maquette/medias), servis tels quels ; chemin contrôlé par cheminMedia.
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { cheminMedia, TYPES_MEDIA } from '../../../lib/medias.ts';

export async function GET(_requete: Request, { params }: { params: Promise<{ chemin: string[] }> }): Promise<Response> {
  const fichier = cheminMedia((await params).chemin);
  if (!fichier) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(fichier)), {
      headers: { 'Content-Type': TYPES_MEDIA[extname(fichier).toLowerCase()]!, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
