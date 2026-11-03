// GET /api/v1/publications/:id?langue=he : une publication visible, original et traduction (packages/contrat).
import { Publication } from '@curation/contrat';
import { publication } from '../../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../../lib/api.ts';
import { contexte } from '../../../../../lib/serveur.ts';

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return repondre(async () => {
    const { id } = await params;
    if (!/^\d{1,9}$/.test(id)) return null;
    const p = await publication(await contexte(await langueDeLAppel(new URL(requete.url))), Number(id));
    return p ? Publication.parse(p) : null;
  });
}
