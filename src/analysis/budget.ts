// Budget d'analyse. Exécution : un lancement de `npm run brouillons`. Avant chaque tentative, le coût maximal
// (entrée comptée + max_tokens, réflexion comprise) est réservé en transaction ; sans marge suffisante, aucun appel ne part.
// Tout compte : réussites, erreurs et reprises. Une tentative dont la facturation est inconnue garde sa réservation.
import type { Client } from '@libsql/client';
import { coutMicroUsd } from './tarifs.ts';

export class BudgetInsuffisant extends Error {}

export interface Plafonds {
  runId: string;
  capRunMicroUsd: number;
  capTotalMicroUsd: number;
}

export interface Tentative {
  newsItemId: number;
  stage: string;
  attempt: number;
  model: string;
  promptVersion: string;
  inputTokens: number;
  maxTokens: number;
}

const DEPENSE = 'coalesce(actual_micro_usd, reserved_micro_usd)';

export async function depense(client: Client, runId?: string): Promise<number> {
  const r = await client.execute({
    sql: `select coalesce(sum(${DEPENSE}), 0) as total from llm_call ${runId ? 'where run_id = ?' : ''}`,
    args: runId ? [runId] : [],
  });
  return Number(r.rows[0]!.total);
}

/** Réserve le coût maximal ; lève BudgetInsuffisant sans rien écrire si l'un des plafonds serait dépassé. */
export async function reserver(client: Client, plafonds: Plafonds, t: Tentative, now: string): Promise<number> {
  const maximum = coutMicroUsd(t.model, t.inputTokens, t.maxTokens);
  const tx = await client.transaction('write');
  try {
    const sum = async (where: string, args: string[]) =>
      Number((await tx.execute({ sql: `select coalesce(sum(${DEPENSE}), 0) as total from llm_call ${where}`, args })).rows[0]!.total);
    const execution = await sum('where run_id = ?', [plafonds.runId]);
    const total = await sum('', []);
    if (execution + maximum > plafonds.capRunMicroUsd) throw new BudgetInsuffisant(`plafond d'exécution : ${execution} + ${maximum} > ${plafonds.capRunMicroUsd} µ$`);
    if (total + maximum > plafonds.capTotalMicroUsd) throw new BudgetInsuffisant(`plafond total : ${total} + ${maximum} > ${plafonds.capTotalMicroUsd} µ$`);
    const insere = await tx.execute({
      sql: `insert into llm_call (run_id, news_item_id, stage, attempt, model, prompt_version, status, reserved_micro_usd, input_tokens, started_at)
            values (?, ?, ?, ?, ?, ?, 'reserve', ?, ?, ?) returning id`,
      args: [plafonds.runId, t.newsItemId, t.stage, t.attempt, t.model, t.promptVersion, maximum, t.inputTokens, now],
    });
    await tx.commit();
    return Number(insere.rows[0]!.id);
  } finally {
    tx.close();
  }
}

export async function solder(client: Client, id: number, model: string, usage: { input: number; output: number }, stop: string | null, now: string): Promise<void> {
  await client.execute({
    sql: `update llm_call set status = 'reussi', actual_micro_usd = ?, input_tokens = ?, output_tokens = ?, stop_reason = ?, finished_at = ? where id = ?`,
    args: [coutMicroUsd(model, usage.input, usage.output), usage.input, usage.output, stop, now, id],
  });
}

/** Erreur : la réservation reste comptée, car une requête partie peut avoir été facturée. */
export async function marquerErreur(client: Client, id: number, erreur: string, now: string): Promise<void> {
  await client.execute({ sql: `update llm_call set status = 'erreur', error = ?, finished_at = ? where id = ?`, args: [erreur.slice(0, 500), now, id] });
}
