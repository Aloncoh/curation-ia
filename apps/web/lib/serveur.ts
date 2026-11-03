// Accès serveur du site : la base (même URL que les commandes), le mode de visibilité et la langue de la requête.
// Le site ne lit la base que par l'API v1 (src/api/v1) : aucune requête SQL propre au site (ADR 0010).
import { createClient, type Client } from '@libsql/client';
import { COOKIE_LANGUE, codesAcceptLanguage, resoudreLangue, type Langue } from '@curation/textes';
import { cookies, headers } from 'next/headers';
import type { Contexte, Mode } from '../../../src/api/v1/index.ts';

let client: Client | null = null;

/** Base locale (`file:data/curation.db`, relatif à la racine du dépôt d'où le site est lancé) ou Turso en P5. */
export function base(): Client {
  client ??= createClient({ url: process.env.DATABASE_URL?.trim() || 'file:data/curation.db' });
  return client;
}

/**
 * `apercu` : publiées et planifiées (avant P5, rien n'est publié) ; `public` : publiées seulement. Par défaut, aperçu en
 * développement et public en production ; CURATION_SITE_MODE force l'un ou l'autre.
 */
export function modeDuSite(): Mode {
  const m = process.env.CURATION_SITE_MODE;
  if (m === 'public' || m === 'apercu') return m;
  return process.env.NODE_ENV === 'production' ? 'public' : 'apercu';
}

/** Langue de l'interface : choix mémorisé (cookie), puis langue du navigateur, puis anglais. */
export async function langueDeLaRequete(): Promise<Langue> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return resoudreLangue(c.get(COOKIE_LANGUE)?.value, codesAcceptLanguage(h.get('accept-language'))).langue;
}

export async function contexte(langue?: Langue): Promise<Contexte> {
  return { client: base(), mode: modeDuSite(), langue: langue ?? (await langueDeLaRequete()) };
}
