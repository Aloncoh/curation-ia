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
