// Réponses des routes /api/v1 : JSON validé par le contrat, erreurs normalisées (packages/contrat, `Erreur`).
// Langue : le paramètre `langue` s'il est valide, sinon celle de la requête (cookie, navigateur, anglais).
import { estLangue, type Langue } from '@curation/textes';
import { RequeteInvalide } from '../../../src/api/v1/index.ts';
import { langueDeLaRequete } from './serveur.ts';

export async function langueDeLAppel(url: URL): Promise<Langue> {
  const demandee = url.searchParams.get('langue');
  if (demandee !== null && !estLangue(demandee)) throw new RequeteInvalide('Langue inconnue : en, fr ou he.');
  return demandee ?? (await langueDeLaRequete());
}

const json = (corps: unknown, status = 200) =>
  Response.json(corps, { status, headers: { 'Cache-Control': 'no-store', 'Content-Language': typeof corps === 'object' && corps && 'langue' in corps ? String((corps as { langue: unknown }).langue) : 'en' } });

export async function repondre(calcul: () => Promise<unknown>): Promise<Response> {
  try {
    const corps = await calcul();
    if (corps === null) return json({ erreur: { code: 'introuvable', message: 'Ressource introuvable.' } }, 404);
    return json(corps);
  } catch (e) {
    if (e instanceof RequeteInvalide) return json({ erreur: { code: 'requete_invalide', message: e.message } }, 400);
    console.error('API v1 :', e instanceof Error ? e.message : e);
    return json({ erreur: { code: 'interne', message: 'Erreur interne.' } }, 500);
  }
}
