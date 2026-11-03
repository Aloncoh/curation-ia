// Textes de l'interface et choix de la langue (ADR 0012), partagés par le site (P4) et l'application (P9 bis).
import { en, type Textes } from './en.ts';
import { fr } from './fr.ts';
import { he } from './he.ts';
import type { Langue } from './langues.ts';

export * from './langues.ts';
export type { Textes };

export const CATALOGUES: Record<Langue, Textes> = { en, fr, he };

export const textesDe = (langue: Langue): Textes => CATALOGUES[langue];
