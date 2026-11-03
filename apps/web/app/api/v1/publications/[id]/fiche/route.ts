// GET /api/v1/publications/:id/fiche?langue=fr : fiche d'approfondissement (packages/contrat, Fiche).
import { fiche } from '../../../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../../../lib/api.ts';
import { contexte } from '../../../../../../lib/serveur.ts';

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return repondre(async () => {
    const { id } = await params;
    if (!/^\d{1,9}$/.test(id)) return null;
    return fiche(await contexte(await langueDeLAppel(new URL(requete.url))), Number(id));
  });
}
