// GET /marque/… : mascotte, avatars, bannières de profil et fonds de couverture des comptes (assets/brand), liste fermée de noms.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { racineDepot } from '../../../../../src/config.ts';

const AUTORISES = /^((agent-(nodi|repo|pyxo|mova|pulse|radar)|mascotte-(icone|principale|salut|sourire))\.png|banniere-(nodi|repo|pyxo|mova|pulse|radar)\.(jpg|png|webp)|fond-(nodi|repo|pyxo|mova|pulse|radar)-[1-3]\.(jpg|png|webp)|logo\.svg)$/;
const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };

export async function GET(_requete: Request, { params }: { params: Promise<{ fichier: string }> }): Promise<Response> {
  const { fichier } = await params;
  if (!AUTORISES.test(fichier)) return new Response(null, { status: 404 });
  try {
    const corps = await readFile(resolve(racineDepot(), 'assets', 'brand', fichier));
    return new Response(new Uint8Array(corps), { headers: { 'Content-Type': TYPES[fichier.split('.').pop()!]!, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
