// GET /api/v1/recherche?q=motion+design&tri=pertinence&langue=fr : publications trouvées et raisons (SPEC §7.15).
// La requête n'est jamais enregistrée.
import { limiteValide, recherche, RequeteInvalide } from '../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../lib/api.ts';
import { contexte } from '../../../../lib/serveur.ts';

export async function GET(requete: Request): Promise<Response> {
  return repondre(async () => {
    const url = new URL(requete.url);
    const tri = url.searchParams.get('tri') ?? 'pertinence';
    if (tri !== 'pertinence' && tri !== 'recents') throw new RequeteInvalide('Tri inconnu : pertinence ou recents.');
    const limite = url.searchParams.has('limite') ? limiteValide(url.searchParams.get('limite')) : undefined;
    return recherche(await contexte(await langueDeLAppel(url)), url.searchParams.get('q') ?? '', { tri, curseur: url.searchParams.get('curseur'), ...(limite ? { limite } : {}) });
  });
}
