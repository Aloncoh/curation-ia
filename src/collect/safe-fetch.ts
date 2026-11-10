// Récupération HTTP défensive (recommandations OWASP contre la SSRF) :
// liste blanche d'hôtes, HTTPS seulement avec certificat vérifié, adresses IP résolues vérifiées puis connexion
// épinglée à l'adresse validée, aucun proxy implicite, aucune redirection suivie, délai et taille maximum.
import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingHttpHeaders } from 'node:http';
import { request, type RequestOptions } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';

export interface FetchPolicy {
  allowedHosts: readonly string[];
  timeoutMs: number;
  maxBytes: number;
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface TransportRequest {
  url: URL;
  address: ResolvedAddress;
  headers: Record<string, string>;
  signal: AbortSignal;
  maxBytes: number;
}

export interface TransportResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;
export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

export type FetchErrorKind =
  | 'disallowed_url'
  | 'forbidden_address'
  | 'redirect'
  | 'too_large'
  | 'timeout'
  | 'http_status'
  | 'network';

export class SafeFetchError extends Error {
  readonly kind: FetchErrorKind;
  readonly status: number | undefined;
  /** En-tête `Retry-After` d'un 429 ou d'un 503, tel que reçu (registre d'accès, src/collect/acces.ts). */
  readonly retryAfter: string | undefined;
  /** En-tête `Location` d'une redirection refusée : jamais suivi ici ; l'appelant peut le revalider (src/collect/article-externe.ts). */
  readonly location: string | undefined;

  constructor(kind: FetchErrorKind, message: string, status?: number, retryAfter?: string, location?: string) {
    super(message);
    this.name = 'SafeFetchError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
    this.location = location;
  }
}

// Plages interdites : privées, locales, lien-local (dont l'adresse de métadonnées cloud 169.254.169.254),
// partagées, réservées, multicast, et plages IPv6 qui peuvent transporter une adresse IPv4
// (compatible ::/96, NAT64, 6to4, Teredo). Les adresses IPv4 encapsulées (::ffff:…) sont refusées à part :
// une règle ::ffff:0:0/96 dans la BlockList couvrirait aussi toutes les adresses IPv4.
const FORBIDDEN = new BlockList();
const IPV4_MAPPED = /^(::|(0{1,4}:){5})ffff:/i;
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  FORBIDDEN.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  FORBIDDEN.addSubnet(network, prefix, 'ipv6');
}

export function isForbiddenAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return FORBIDDEN.check(address, 'ipv4');
  if (family === 6) return IPV4_MAPPED.test(address) || FORBIDDEN.check(address, 'ipv6');
  return true;
}

export function assertAllowedUrl(url: URL, policy: FetchPolicy): void {
  if (url.protocol !== 'https:') {
    throw new SafeFetchError('disallowed_url', `Protocole refusé : ${url.protocol} (HTTPS uniquement)`);
  }
  if (url.username || url.password) {
    throw new SafeFetchError('disallowed_url', 'URL refusée : identifiants intégrés');
  }
  if (url.port !== '' && url.port !== '443') {
    throw new SafeFetchError('disallowed_url', `Port refusé : ${url.port}`);
  }
  if (!policy.allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new SafeFetchError('disallowed_url', `Hôte hors liste blanche : ${url.hostname}`);
  }
}

export const resolveAll: Resolver = async (hostname) => {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => ({ address: entry.address, family: entry.family === 6 ? 6 : 4 }));
};

/** Résolution DNS « épinglée » : la connexion utilise l'adresse déjà validée, sans seconde résolution (anti « DNS rebinding »). */
export function pinnedLookup(address: ResolvedAddress): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address: address.address, family: address.family }]);
    else callback(null, address.address, address.family);
  };
}

/** Options de la requête HTTPS réelle : certificat vérifié, pas d'agent partagé (donc pas de proxy implicite). */
export function buildRequestOptions(req: Omit<TransportRequest, 'maxBytes'>): RequestOptions {
  return {
    protocol: 'https:',
    hostname: req.url.hostname,
    port: 443,
    path: `${req.url.pathname}${req.url.search}`,
    method: 'GET',
    headers: req.headers,
    servername: req.url.hostname,
    rejectUnauthorized: true,
    agent: false,
    signal: req.signal,
    lookup: pinnedLookup(req.address),
  };
}

/** Lit un corps de réponse en s'arrêtant dès que la taille maximale est dépassée. */
export function readLimited(stream: Readable, declaredLength: number | undefined, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (declaredLength !== undefined && declaredLength > maxBytes) {
      stream.destroy();
      reject(new SafeFetchError('too_large', `Réponse trop volumineuse : ${declaredLength} octets annoncés (max ${maxBytes})`));
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        stream.destroy();
        reject(new SafeFetchError('too_large', `Réponse trop volumineuse : plus de ${maxBytes} octets`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** Transport réel : HTTPS vers l'adresse déjà validée. */
export const httpsTransport: Transport = (req) =>
  new Promise((resolve, reject) => {
    const outgoing = request(buildRequestOptions(req), (response) => {
      const declared = response.headers['content-length'];
      const length = declared === undefined ? undefined : Number(declared);
      readLimited(response, Number.isFinite(length) ? length : undefined, req.maxBytes)
        .then((body) => resolve({ status: response.statusCode ?? 0, headers: response.headers, body }))
        .catch(reject);
    });
    outgoing.on('error', reject);
    outgoing.end();
  });

/** Fait échouer une promesse dès que le signal est annulé (la résolution DNS n'a pas de délai propre). */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    promise.then(resolve, reject);
  });
}

/**
 * Jeton intégré de GitHub Actions (`GITHUB_TOKEN`, fourni par GitHub à chaque exécution, aucun secret à créer) : ajouté
 * seulement pour `api.github.com` en https, et seulement avec le transport réel. Limites vérifiées le 2026-11-10 dans la
 * documentation officielle : 1 000 requêtes par heure et par dépôt (60 sans jeton), recherche 30 par minute (10 sans).
 */
export function avecJetonGithub(url: URL, headers: Record<string, string>, reel: boolean): Record<string, string> {
  const jeton = process.env.GITHUB_TOKEN;
  if (!reel || !jeton || url.protocol !== 'https:' || url.hostname !== 'api.github.com' || headers.authorization) return headers;
  return { ...headers, authorization: `Bearer ${jeton}` };
}

export async function safeGet(
  rawUrl: string,
  policy: FetchPolicy,
  headers: Record<string, string>,
  deps: { resolve?: Resolver; transport?: Transport } = {},
): Promise<TransportResponse> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError('disallowed_url', 'URL invalide');
  }
  assertAllowedUrl(url, policy);

  // Le délai maximum couvre la résolution DNS et la requête.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
  const timeoutError = () => new SafeFetchError('timeout', `Délai dépassé (${policy.timeoutMs} ms) pour ${url.host}`);
  try {
    let addresses: ResolvedAddress[];
    try {
      addresses = await abortable((deps.resolve ?? resolveAll)(url.hostname), controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw timeoutError();
      throw new SafeFetchError('network', `Résolution DNS impossible pour ${url.hostname} : ${(error as Error).message}`);
    }
    const first = addresses[0];
    if (!first) throw new SafeFetchError('network', `Aucune adresse pour ${url.hostname}`);
    const forbidden = addresses.find((entry) => isForbiddenAddress(entry.address));
    if (forbidden) {
      throw new SafeFetchError('forbidden_address', `Adresse interdite pour ${url.hostname} : ${forbidden.address}`);
    }

    let response: TransportResponse;
    try {
      response = await (deps.transport ?? httpsTransport)({
        url,
        address: first,
        headers: avecJetonGithub(url, headers, deps.transport === undefined),
        signal: controller.signal,
        maxBytes: policy.maxBytes,
      });
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      if (controller.signal.aborted) throw timeoutError();
      throw new SafeFetchError('network', `Erreur réseau vers ${url.host} : ${(error as Error).message}`);
    }

    // Un 304 n'est pas une redirection : il répond à une requête conditionnelle et n'emmène nulle part.
    if (response.status === 304 && (headers['if-none-match'] !== undefined || headers['if-modified-since'] !== undefined)) return response;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      throw new SafeFetchError('redirect', `Redirection refusée (HTTP ${response.status})`, response.status, undefined, Array.isArray(location) ? location[0] : location);
    }
    if (response.status < 200 || response.status >= 300) {
      const retryAfter = response.headers['retry-after'];
      throw new SafeFetchError('http_status', `Réponse HTTP ${response.status}`, response.status, Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}
