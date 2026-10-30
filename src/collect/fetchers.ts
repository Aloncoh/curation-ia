// Deux façons d'obtenir la réponse d'une source : le réseau (mode réel) ou un fichier local (mode fixture).
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { safeGet, type FetchPolicy } from './safe-fetch.ts';

export interface FetchResult {
  status: number;
  body: string;
  bytes: number;
}

export type SourceFetcher = (url: string, headers: Record<string, string>, allowedHosts: readonly string[]) => Promise<FetchResult>;

export function createLiveFetcher(options: { timeoutMs: number; maxBytes: number; userAgent: string }): SourceFetcher {
  return async (url, headers, allowedHosts) => {
    const policy: FetchPolicy = { allowedHosts, timeoutMs: options.timeoutMs, maxBytes: options.maxBytes };
    const response = await safeGet(url, policy, { ...headers, 'user-agent': options.userAgent });
    return { status: response.status, body: response.body.toString('utf8'), bytes: response.body.length };
  };
}

/** Mode fixture : aucune requête réseau ; le fichier est clairement identifié dans les traces (mode « fixture »). */
export function createFixtureFetcher(path: string, delayMs = 0): SourceFetcher {
  return async () => {
    if (delayMs > 0) await sleep(delayMs);
    const body = await readFile(path, 'utf8');
    return { status: 200, body, bytes: Buffer.byteLength(body) };
  };
}
