// GET /api/v1/comptes?langue=fr : les comptes éditoriaux, présentés dans la langue demandée.
import { comptes } from '../../../../../../src/api/v1/index.ts';
import { langueDeLAppel, repondre } from '../../../../lib/api.ts';
import { contexte } from '../../../../lib/serveur.ts';

export async function GET(requete: Request): Promise<Response> {
  return repondre(async () => comptes(await contexte(await langueDeLAppel(new URL(requete.url)))));
}
