// Interrupteur de pause : bloque la réservation de nouveaux jobs (une requête déjà partie n'est pas annulée).
import { eq } from 'drizzle-orm';
import type { Database, Executor } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { settings } from '../db/schema.ts';

export const PAUSED_KEY = 'paused';

export async function isPaused(db: Executor): Promise<boolean> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, PAUSED_KEY));
  return row?.value === 'true';
}

export async function setPaused(database: Database, paused: boolean, now: string): Promise<void> {
  await withBusyRetry(database.client, () =>
    database.db
      .insert(settings)
      .values({ key: PAUSED_KEY, value: String(paused), updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(paused), updatedAt: now } }),
  );
}

/** Réglages entiers de la chaîne des ressources (ADR 0011) : valeurs par défaut du code, modifiables en base sans toucher au code. */
export const REGLAGES_PAR_DEFAUT = {
  'publication.plafond_jour': 20,
  'publication.reserve_nouveautes_jour': 5,
  'ressources.seuil_nouvelle_sortie_jours': 14,
  'ressources.inactivite_jours': 90,
  'ressources.validite_lien_jours': 7,
} as const;
export type CleReglage = keyof typeof REGLAGES_PAR_DEFAUT;

/** Lit un réglage entier positif ou nul ; la valeur par défaut si la ligne manque. Une valeur illisible est une erreur, jamais ignorée. */
export async function lireReglageEntier(db: Executor, cle: CleReglage): Promise<number> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, cle));
  if (!row) return REGLAGES_PAR_DEFAUT[cle];
  const valeur = Number(row.value);
  if (!Number.isInteger(valeur) || valeur < 0) throw new Error(`Réglage ${cle} invalide : entier positif ou nul attendu, reçu « ${row.value} ».`);
  return valeur;
}
