// GET /api/v1/comptes/:id?langue=fr&curseur=… : un compte et une page de ses publications.
import { compte, limiteValide } from '../../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../../lib/api.ts';
import { contexte } from '../../../../../lib/serveur.ts';

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return repondre(async () => {
    const { id } = await params;
    if (!/^[a-z0-9_-]{1,40}$/.test(id)) return null;
    const url = new URL(requete.url);
    return compte(await contexte(await langueDeLAppel(url)), id, { curseur: url.searchParams.get('curseur'), limite: limiteValide(url.searchParams.get('limite')) });
  });
}
