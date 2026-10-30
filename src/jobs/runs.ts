// Traces d'exécution : ce qui a été fait, quand, avec quel résultat. Jamais de secret.
import { and, eq } from 'drizzle-orm';
import type { Executor } from '../db/client.ts';
import { runSteps, runs } from '../db/schema.ts';

export type RunStatus = 'running' | 'succeeded' | 'failed' | 'interrupted';

export interface StepRecord {
  runId: string;
  seq: number;
  name: string;
  status: 'succeeded' | 'failed';
  startedAt: string;
  finishedAt: string;
  detail: Record<string, unknown>;
}

export async function insertRun(
  db: Executor,
  run: { id: string; kind: string; jobId: number; sourceId: string; mode: 'live' | 'fixture'; workerId: string; startedAt: string },
): Promise<void> {
  await db.insert(runs).values({ ...run, status: 'running' });
}

/** Marque « interrompues » les exécutions encore « running » d'un job (worker arrêté avant la fin). */
export async function interruptRunningRuns(db: Executor, jobId: number, now: string): Promise<void> {
  await db
    .update(runs)
    .set({
      status: 'interrupted',
      finishedAt: now,
      errorKind: 'interrupted',
      errorMessage: 'Exécution interrompue : le job a été repris avant la fin de cette exécution',
    })
    .where(and(eq(runs.jobId, jobId), eq(runs.status, 'running')));
}

export async function insertStep(db: Executor, step: StepRecord): Promise<void> {
  const durationMs = new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime();
  await db.insert(runSteps).values({ ...step, durationMs });
}

export async function finishRun(
  db: Executor,
  runId: string,
  patch: {
    status: Exclude<RunStatus, 'running'>;
    finishedAt: string;
    newDocuments?: number;
    unchangedDocuments?: number;
    changedDocuments?: number;
    newNewsItems?: number;
    errorKind?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db.update(runs).set(patch).where(eq(runs.id, runId));
}
