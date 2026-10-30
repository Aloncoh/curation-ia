// Configuration lue depuis l'environnement, avec des valeurs par défaut prudentes.

export interface AppConfig {
  databaseUrl: string;
  /** Attente maximale quand un autre processus verrouille la base SQLite locale. */
  dbBusyTimeoutMs: number;
  /** Durée du bail : un job réservé par un worker qui ne répond plus redevient disponible après ce délai. */
  leaseMs: number;
  maxAttempts: number;
  /** Délai avant une nouvelle tentative après un échec, multiplié par le numéro de tentative. */
  retryBackoffMs: number;
  fetchTimeoutMs: number;
  maxResponseBytes: number;
  userAgent: string;
  /** Mode fixture : la source est lue dans ce fichier local au lieu du réseau (tests et démonstrations hors ligne). */
  fixturePath: string | null;
  fixtureDelayMs: number;
  /** Tests uniquement, et seulement en mode fixture : attente à l'intérieur de la transaction d'enregistrement. */
  testHoldInStoreMs: number;
  /** Restreint la collecte à ces sources (identifiants séparés par des virgules) ; toutes si absent. */
  onlySources: string[] | null;
}

function intFromEnv(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Variable ${name} invalide : entier supérieur ou égal à ${min} attendu, reçu « ${raw} ».`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fixturePath = env.CURATION_FIXTURE?.trim() || null;
  return {
    databaseUrl: env.DATABASE_URL?.trim() || 'file:data/curation.db',
    dbBusyTimeoutMs: intFromEnv(env, 'CURATION_DB_BUSY_TIMEOUT_MS', 5_000, 1),
    leaseMs: intFromEnv(env, 'CURATION_LEASE_MS', 5 * 60_000, 1),
    maxAttempts: intFromEnv(env, 'CURATION_MAX_ATTEMPTS', 3, 1),
    retryBackoffMs: intFromEnv(env, 'CURATION_RETRY_BACKOFF_MS', 60_000, 0),
    fetchTimeoutMs: intFromEnv(env, 'CURATION_FETCH_TIMEOUT_MS', 15_000, 1),
    maxResponseBytes: intFromEnv(env, 'CURATION_MAX_RESPONSE_BYTES', 2 * 1024 * 1024, 1),
    userAgent: 'curation-ai-collector/0.1 (projet étudiant ; collecte de releases publiques)',
    fixturePath,
    fixtureDelayMs: intFromEnv(env, 'CURATION_FIXTURE_DELAY_MS', 0, 0),
    testHoldInStoreMs: fixturePath ? intFromEnv(env, 'CURATION_TEST_HOLD_IN_STORE_MS', 0, 0) : 0,
    onlySources:
      env.CURATION_ONLY_SOURCES?.split(',')
        .map((id) => id.trim())
        .filter(Boolean) || null,
  };
}

/** Masque les secrets éventuels (jeton d'accès, identifiants dans une URL) avant tout affichage. */
export function redactSecrets(text: string): string {
  return text
    .replace(/(authToken=)[^&\s'"]+/gi, '$1***')
    .replace(/(\/\/)[^/\s:@'"]+:[^/\s@'"]+@/g, '$1***:***@')
    .replace(/(Bearer\s+)\S+/gi, '$1***');
}

/** Affiche une URL de base sans secret (pas de requête ni d'identifiants). */
export function describeDatabaseUrl(url: string): string {
  if (url.startsWith('file:')) return url;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '(URL de base illisible)';
  }
}
