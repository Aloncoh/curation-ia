// GET /api/v1/fil?langue=fr&curseur=…&limite=20 : une page du fil (packages/contrat, PageFil).
import { fil, limiteValide } from '../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../lib/api.ts';
import { contexte } from '../../../../lib/serveur.ts';

export async function GET(requete: Request): Promise<Response> {
  return repondre(async () => {
    const url = new URL(requete.url);
    const ctx = await contexte(await langueDeLAppel(url));
    return fil(ctx, { curseur: url.searchParams.get('curseur'), limite: limiteValide(url.searchParams.get('limite')) });
  });
}
