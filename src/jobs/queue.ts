// File de jobs dans une table : réservation par bail (lease), reprises limitées, aucun double traitement.
import type { Client } from '@libsql/client';
import { and, eq } from 'drizzle-orm';
import type { Executor } from '../db/client.ts';
import { withBusyRetry } from '../db/retry.ts';
import { jobs } from '../db/schema.ts';

export interface ClaimedJob {
  id: number;
  sourceId: string;
  attempts: number;
  maxAttempts: number;
}

export const addMs = (iso: string, ms: number) => new Date(new Date(iso).getTime() + ms).toISOString();

/** Ajoute un job de collecte par source, sauf si un job actif existe déjà (index unique partiel). */
export async function enqueueCollectJobs(client: Client, sourceIds: string[], now: string, maxAttempts: number): Promise<number> {
  let created = 0;
  for (const sourceId of sourceIds) {
    const result = await withBusyRetry(client, () =>
      client.execute({
        sql: `insert into job (kind, source_id, status, attempts, max_attempts, available_at, created_at, updated_at)
              values ('collect', ?, 'pending', 0, ?, ?, ?, ?)
              on conflict do nothing`,
        args: [sourceId, maxAttempts, now, now, now],
      }),
    );
    created += result.rowsAffected;
  }
  return created;
}

/**
 * Remet en ordre les jobs abandonnés : exécutions d'un job au bail expiré marquées « interrompues »,
 * jobs ayant épuisé leurs tentatives passés en échec (pour qu'aucune ligne ne bloque une source).
 */
export async function recoverExpiredLeases(client: Client, now: string): Promise<void> {
  await withBusyRetry(client, () =>
    client.batch(
      [
        {
          sql: `update run set status = 'interrupted', finished_at = ?, error_kind = 'interrupted',
                  error_message = 'Exécution interrompue : bail expiré avant la fin'
                where status = 'running'
                  and job_id in (select id from job where status = 'leased' and lease_until < ?)`,
          args: [now, now],
        },
        {
          sql: `update job set status = 'failed', lease_owner = null, lease_until = null, updated_at = ?,
                  last_error = coalesce(last_error, 'Tentatives épuisées')
                where attempts >= max_attempts
                  and (status = 'pending' or (status = 'leased' and lease_until < ?))`,
          args: [now, now],
        },
      ],
      'write',
    ),
  );
}

/**
 * Réserve le prochain job disponible en une seule instruction SQL : deux workers ne peuvent pas obtenir le même,
 * et aucun job n'est réservé si la pause est active au même instant.
 */
export async function claimNextJob(client: Client, workerId: string, now: string, leaseMs: number): Promise<ClaimedJob | null> {
  const available = `kind = 'collect' and attempts < max_attempts
    and ((status = 'pending' and available_at <= :now) or (status = 'leased' and lease_until < :now))`;
  const notPaused = `not exists (select 1 from setting where key = 'paused' and value = 'true')`;
  const result = await withBusyRetry(client, () =>
    client.execute({
      sql: `update job
            set status = 'leased', lease_owner = :owner, lease_until = :leaseUntil,
                attempts = attempts + 1, updated_at = :now
            where id = (select id from job where ${available} order by id limit 1)
              and ${available}
              and ${notPaused}
            returning id, source_id, attempts, max_attempts`,
      args: { owner: workerId, leaseUntil: addMs(now, leaseMs), now },
    }),
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    sourceId: String(row.source_id),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
  };
}

const ownedBy = (jobId: number, workerId: string) =>
  and(eq(jobs.id, jobId), eq(jobs.leaseOwner, workerId), eq(jobs.status, 'leased'));

/** Termine un job ; renvoie false si le bail a été perdu (job repris par un autre worker ou clos par la récupération). */
export async function completeJob(db: Executor, jobId: number, workerId: string, now: string): Promise<boolean> {
  const updated = await db
    .update(jobs)
    .set({ status: 'succeeded', leaseOwner: null, leaseUntil: null, lastError: null, updatedAt: now })
    .where(ownedBy(jobId, workerId))
    .returning({ id: jobs.id });
  return updated.length === 1;
}

/** Échec : nouvelle tentative plus tard si possible, sinon échec définitif. */
export async function failJob(
  db: Executor,
  job: ClaimedJob,
  workerId: string,
  error: string,
  now: string,
  backoffMs: number,
): Promise<'retry' | 'failed' | 'lease_lost'> {
  const exhausted = job.attempts >= job.maxAttempts;
  const updated = await db
    .update(jobs)
    .set({
      status: exhausted ? 'failed' : 'pending',
      availableAt: addMs(now, backoffMs * job.attempts),
      leaseOwner: null,
      leaseUntil: null,
      lastError: error,
      updatedAt: now,
    })
    .where(ownedBy(job.id, workerId))
    .returning({ id: jobs.id });
  if (updated.length !== 1) return 'lease_lost';
  return exhausted ? 'failed' : 'retry';
}

/** Rattache l'exécution au job, seulement si le bail appartient toujours à ce worker. */
export async function attachRun(db: Executor, jobId: number, workerId: string, runId: string): Promise<boolean> {
  const updated = await db.update(jobs).set({ runId }).where(ownedBy(jobId, workerId)).returning({ id: jobs.id });
  return updated.length === 1;
}
