import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  assertAllowedUrl,
  buildRequestOptions,
  isForbiddenAddress,
  pinnedLookup,
  readLimited,
  safeGet,
  SafeFetchError,
  type FetchPolicy,
  type Transport,
} from '../src/collect/safe-fetch.ts';

const POLICY: FetchPolicy = { allowedHosts: ['api.github.com'], timeoutMs: 1_000, maxBytes: 1_024 };
const URL_OK = 'https://api.github.com/repos/anthropics/claude-code/releases?per_page=5';
const publicAddress = async () => [{ address: '140.82.112.6', family: 4 as const }];
const respond = (status: number, body = '[]'): Transport => async () => ({ status, headers: {}, body: Buffer.from(body) });

async function failureKind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SafeFetchError) return error.kind;
    throw error;
  }
  throw new Error("l'appel aurait dû échouer");
}

describe('isForbiddenAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.5.4',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '0:0:0:0:0:ffff:7f00:1',
    '::127.0.0.1',
    '::a9fe:a9fe',
    '64:ff9b:1::a9fe:a9fe',
    '2002:7f00:1::',
    '2001:0:4136:e378:8000:63bf:3fff:fdd2',
    'fec0::1',
    'pas-une-ip',
  ])('refuse %s', (address) => {
    expect(isForbiddenAddress(address)).toBe(true);
  });

  it.each(['140.82.112.6', '8.8.8.8', '2606:4700:4700::1111'])('accepte l’adresse publique %s', (address) => {
    expect(isForbiddenAddress(address)).toBe(false);
  });
});

describe('assertAllowedUrl', () => {
  it.each([
    'http://api.github.com/repos/a/b/releases',
    'https://evil.example/repos/a/b/releases',
    'https://api.github.com:8443/repos/a/b/releases',
    'https://user:secret@api.github.com/repos/a/b/releases',
  ])('refuse %s', (url) => {
    expect(() => assertAllowedUrl(new URL(url), POLICY)).toThrow(SafeFetchError);
  });

  it('accepte un hôte de la liste blanche en HTTPS', () => {
    expect(() => assertAllowedUrl(new URL(URL_OK), POLICY)).not.toThrow();
  });
});

describe('safeGet', () => {
  it("se connecte à l'adresse validée et renvoie le corps", async () => {
    const seen: string[] = [];
    const transport: Transport = async (req) => {
      seen.push(`${req.address.address}|${req.url.hostname}|${req.headers['user-agent']}`);
      return { status: 200, headers: {}, body: Buffer.from('[]') };
    };
    const response = await safeGet(URL_OK, POLICY, { 'user-agent': 'test' }, { resolve: publicAddress, transport });
    expect(response.body.toString()).toBe('[]');
    expect(seen).toEqual(['140.82.112.6|api.github.com|test']);
  });

  it('refuse un hôte hors liste blanche sans aucune requête DNS ni réseau', async () => {
    let resolved = false;
    const resolve = async () => {
      resolved = true;
      return [];
    };
    expect(await failureKind(safeGet('https://example.org/x', POLICY, {}, { resolve, transport: respond(200) }))).toBe('disallowed_url');
    expect(resolved).toBe(false);
  });

  it('refuse si une adresse résolue est interne, sans se connecter', async () => {
    let connected = false;
    const transport: Transport = async () => {
      connected = true;
      return { status: 200, headers: {}, body: Buffer.from('[]') };
    };
    const resolve = async () => [
      { address: '140.82.112.6', family: 4 as const },
      { address: '10.0.0.1', family: 4 as const },
    ];
    expect(await failureKind(safeGet(URL_OK, POLICY, {}, { resolve, transport }))).toBe('forbidden_address');
    expect(connected).toBe(false);
  });

  it('refuse les redirections', async () => {
    expect(await failureKind(safeGet(URL_OK, POLICY, {}, { resolve: publicAddress, transport: respond(302) }))).toBe('redirect');
  });

  it('signale un statut HTTP en erreur', async () => {
    expect(await failureKind(safeGet(URL_OK, POLICY, {}, { resolve: publicAddress, transport: respond(500) }))).toBe('http_status');
  });

  it('abandonne après le délai maximum', async () => {
    const hanging: Transport = ({ signal }) =>
      new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const policy = { ...POLICY, timeoutMs: 30 };
    expect(await failureKind(safeGet(URL_OK, policy, {}, { resolve: publicAddress, transport: hanging }))).toBe('timeout');
  });

  it('le délai maximum couvre aussi une résolution DNS qui ne répond pas', async () => {
    const neverResolves = () => new Promise<never>(() => {});
    const started = Date.now();
    const policy = { ...POLICY, timeoutMs: 50 };
    expect(await failureKind(safeGet(URL_OK, policy, {}, { resolve: neverResolves, transport: respond(200) }))).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('classe une panne de résolution DNS ou de connexion comme erreur réseau', async () => {
    const failingResolve = async () => {
      throw new Error('ENOTFOUND');
    };
    expect(await failureKind(safeGet(URL_OK, POLICY, {}, { resolve: failingResolve }))).toBe('network');
    const failingTransport: Transport = async () => {
      throw new Error('ECONNRESET');
    };
    expect(await failureKind(safeGet(URL_OK, POLICY, {}, { resolve: publicAddress, transport: failingTransport }))).toBe('network');
  });
});

describe('transport HTTPS réel : options de connexion', () => {
  const request = {
    url: new URL(URL_OK),
    address: { address: '140.82.112.6', family: 4 as const },
    headers: { 'user-agent': 'test' },
    signal: new AbortController().signal,
  };

  it("épingle la connexion à l'adresse validée, vérifie le certificat et n'utilise ni agent partagé ni proxy", () => {
    const options = buildRequestOptions(request);
    expect(options).toMatchObject({
      protocol: 'https:',
      hostname: 'api.github.com',
      servername: 'api.github.com',
      port: 443,
      path: '/repos/anthropics/claude-code/releases?per_page=5',
      rejectUnauthorized: true,
      agent: false,
    });
    expect(typeof options.lookup).toBe('function');
  });

  it("la résolution épinglée renvoie toujours l'adresse validée, sans nouvelle requête DNS", async () => {
    const lookup = pinnedLookup(request.address);
    const single = await new Promise<unknown[]>((resolve) =>
      lookup('api.github.com', {}, (...args: unknown[]) => resolve(args)),
    );
    expect(single).toEqual([null, '140.82.112.6', 4]);
    const all = await new Promise<unknown[]>((resolve) =>
      lookup('api.github.com', { all: true }, (...args: unknown[]) => resolve(args)),
    );
    expect(all).toEqual([null, [{ address: '140.82.112.6', family: 4 }]]);
  });
});

describe('readLimited', () => {
  it('lit un corps dans la limite', async () => {
    const body = await readLimited(Readable.from([Buffer.from('abc'), Buffer.from('def')]), undefined, 10);
    expect(body.toString()).toBe('abcdef');
  });

  it('refuse un corps qui dépasse la taille maximale en cours de lecture', async () => {
    const stream = Readable.from([Buffer.alloc(600), Buffer.alloc(600)]);
    expect(await failureKind(readLimited(stream, undefined, 1_024))).toBe('too_large');
  });

  it('refuse immédiatement une taille annoncée trop grande', async () => {
    expect(await failureKind(readLimited(Readable.from([]), 5_000, 1_024))).toBe('too_large');
  });
});
