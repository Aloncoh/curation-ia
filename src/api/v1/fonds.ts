// Fonds de couverture fournis par l'utilisateur (2026-11-05) : trois par agent, avatar de l'agent déjà dessiné en bas à
// droite. Rangés dans assets/brand sous `fond-<agent>-<1|2|3>.<webp|jpg|png>` et servis par /marque. Un agent sans fonds
// garde la couverture dessinée par le code. Lecture côté serveur seulement (l'API v1), une fois par processus : le site
// et la future application reçoivent l'adresse du fond avec chaque publication.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { racineDepot } from '../../config.ts';

const AGENTS = ['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar'] as const;
const EXTENSIONS = ['webp', 'jpg', 'png'] as const;

let cache: Map<string, string[]> | null = null;

function fondsDisponibles(): Map<string, string[]> {
  if (cache) return cache;
  cache = new Map(
    AGENTS.map((agent) => [
      agent,
      [1, 2, 3].flatMap((n) => {
        const ext = EXTENSIONS.find((e) => existsSync(resolve(racineDepot(), 'assets', 'brand', `fond-${agent}-${n}.${e}`)));
        return ext ? [`/marque/fond-${agent}-${n}.${ext}`] : [];
      }),
    ]),
  );
  return cache;
}

/** Fond de la couverture d'un post : toujours le même pour un même post (graine), ou null si l'agent n'en a pas. */
export function fondDe(agent: string, graine: number): string | null {
  const fonds = fondsDisponibles().get(agent) ?? [];
  return fonds.length ? fonds[Math.abs(graine) % fonds.length]! : null;
}
