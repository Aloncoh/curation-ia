// Nouvelle tentative quand la base SQLite locale est verrouillée par un autre processus au-delà du délai d'attente.
import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from '@libsql/client';

export function isBusyError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string' && candidate.code.startsWith('SQLITE_BUSY')) return true;
    if (typeof candidate.message === 'string' && /database is locked|SQLITE_BUSY/i.test(candidate.message)) return true;
    current = candidate.cause;
  }
  return false;
}

/**
 * Après un SQLITE_BUSY, libSQL laisse l'instruction échouée active sur sa connexion : réessayer sur cette connexion
 * produirait des écritures jamais validées ou un COMMIT refusé. On rouvre donc les connexions du client avant chaque
 * nouvelle tentative. C'est sûr ici parce que le worker n'exécute qu'une opération à la fois sur son client.
 */
export async function withBusyRetry<T>(
  client: Client,
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 20;
  const baseDelayMs = options.baseDelayMs ?? 25;
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isBusyError(error) || attempt >= attempts) throw error;
      await client.reconnect();
      // Attente croissante avec une part aléatoire, pour que deux processus ne se gênent pas en boucle.
      await sleep(baseDelayMs * attempt + Math.random() * baseDelayMs);
    }
  }
}
