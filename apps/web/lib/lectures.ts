// Lectures du site, mises en cache (2026-11-20, docs/lectures-turso.md, correction E). Les pages et les routes /api/v1
// passent par ce module, jamais directement par src/api/v1 : sans cache, chaque visite — robots compris — relançait
// toutes les requêtes, et chaque page lisait deux fois les mêmes données (son titre, puis son contenu).
//
// Deux niveaux :
//  - `unstable_cache` (Next.js, documentation de la version installée lue le 2026-11-20) : le résultat est partagé entre
//    les visites pendant DUREE_CACHE_S secondes. Une nouveauté paraît donc sur le site avec ce retard au plus ;
//  - `cache` (React) : une même lecture demandée deux fois pendant le rendu d'une page n'est faite qu'une fois.
// La clé contient le mode de visibilité, la langue et les paramètres. Une erreur n'est jamais mise en cache.
import type { Langue } from '@curation/textes';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import * as api from '../../../src/api/v1/index.ts';
import type { Contexte, Mode } from '../../../src/api/v1/index.ts';
import { cleDe, dureeDepuis } from './cle-cache.ts';
import { base } from './serveur.ts';

export { limiteValide, RequeteInvalide } from '../../../src/api/v1/index.ts';

export const DUREE_CACHE_S = dureeDepuis(process.env);

type Lecture<A extends unknown[], R> = (ctx: Contexte, ...args: A) => Promise<R>;

function enCache<A extends unknown[], R>(nom: string, lire: Lecture<A, R>): Lecture<A, R> {
  if (DUREE_CACHE_S === 0) return lire;
  const partagee = unstable_cache(
    (mode: Mode, langue: Langue, args: string) => lire({ client: base(), mode, langue }, ...(JSON.parse(args) as A)),
    ['api-v1', nom],
    { revalidate: DUREE_CACHE_S },
  );
  const parRendu = cache((mode: Mode, langue: Langue, args: string) => partagee(mode, langue, args));
  return (ctx, ...args) => parRendu(ctx.mode, ctx.langue, cleDe(args));
}

export const fil = enCache('fil', api.fil);
export const comptes = enCache('comptes', api.comptes);
export const compte = enCache('compte', api.compte);
export const publication = enCache('publication', api.publication);
export const fiche = enCache('fiche', api.fiche);
export const recherche = enCache('recherche', api.recherche);
export const relevesRapides = enCache('relevesRapides', api.relevesRapides);
export const releveDuRepere = enCache('releveDuRepere', api.releveDuRepere);
