// GET /marque/… : mascotte et avatars des comptes (assets/brand), liste fermée de noms.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const AUTORISES = /^(agent-(nodi|repo|pyxo|mova|pulse|radar)|mascotte-(icone|principale|salut|sourire))\.png$/;

export async function GET(_requete: Request, { params }: { params: Promise<{ fichier: string }> }): Promise<Response> {
  const { fichier } = await params;
  if (!AUTORISES.test(fichier)) return new Response(null, { status: 404 });
  try {
    const corps = await readFile(resolve(process.cwd(), 'assets', 'brand', fichier));
    return new Response(new Uint8Array(corps), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
