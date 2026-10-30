// Lance un script Node dans un processus séparé, comme le ferait un vrai lancement de commande.
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export function startNode(script: string, args: string[], env: Record<string, string>): { child: ChildProcess; done: Promise<ProcessResult> } {
  const child = spawn(process.execPath, [script, ...args], { cwd: PROJECT_ROOT, env: { ...process.env, ...env } });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
  const done = new Promise<ProcessResult>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  return { child, done };
}

export const startCollect = (env: Record<string, string>) => startNode('src/cli/collect.ts', [], env);
