// Contexte commun des sous-commandes de `npm run ressources` : configuration et base ouverte par runCommand.
import type { AppConfig } from '../../config.ts';
import type { Database } from '../../db/client.ts';
import type { Resolver, Transport } from '../../collect/safe-fetch.ts';
import type { EntreeRessource } from '../liste.ts';

export interface ContexteCommande {
  config: AppConfig;
  database: Database;
  /** Dossier de travail des ressources (data/ressources par défaut). */
  dossier?: string;
  /** Liste des ressources ; celle de src/ressources/liste.ts par défaut (les tests en passent une autre). */
  liste?: readonly EntreeRessource[];
  /** Tests uniquement : transport et résolution injectés dans safeGet, aucun réseau. */
  transport?: Transport;
  resolve?: Resolver;
  horloge?: () => Date;
}

export const DOSSIER_RESSOURCES = 'data/ressources';
