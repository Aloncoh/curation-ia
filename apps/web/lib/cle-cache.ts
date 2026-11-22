// Clé et durée du cache des lectures du site (lectures.ts). Sans dépendance à Next.js, pour être testées seules.

/** Durée de validité en secondes ; CURATION_SITE_CACHE_S la règle, 0 désactive le cache (essais, audits). */
export function dureeDepuis(env: NodeJS.ProcessEnv): number {
  const brut = env.CURATION_SITE_CACHE_S?.trim();
  if (!brut) return 60;
  const n = Number(brut);
  return Number.isInteger(n) && n >= 0 && n <= 3600 ? n : 60;
}

/** Paramètres en texte : clé du cache. Les `undefined` de fin sont retirés, pour garder les valeurs par défaut. */
export function cleDe(args: readonly unknown[]): string {
  let fin = args.length;
  while (fin > 0 && args[fin - 1] === undefined) fin--;
  return JSON.stringify(args.slice(0, fin));
}
