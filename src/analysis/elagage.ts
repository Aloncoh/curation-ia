// Élagage (décision de l'utilisateur du 2026-11-05 : « du moment où c'est déployé, ça doit être automatique ») : un
// brouillon « à vérifier » dont tous les écarts portent sur des champs secondaires perd ces champs, puis repasse les
// contrôles. Rien n'est réécrit ni ajouté : on retire, comme la consigne de rédaction le demande déjà (« mieux vaut un
// champ de moins qu'un champ mal cité »). L'accroche, la description, la nouveauté et les limites connues ne sont jamais
// retirées : un écart sur l'un d'eux, ou un écart global (produit, captures, type d'information), laisse le brouillon à
// vérifier. Retirer une limite gommerait une réserve de la source.
import type { Controle } from './controles.ts';
import type { Brouillon } from './schemas.ts';

/** Champs simples qu'on peut retirer sans que le post perde son sujet ni une réserve. */
const CHAMPS_RETIRABLES = ['ce_que_ca_permet', 'pour_qui', 'exemple_usage', 'acces', 'prerequis', 'cout'] as const;
/** Listes dont on peut retirer un élément (`details:1`, `reperes:0`, `attributions:2`). */
const LISTES_RETIRABLES = ['details', 'attributions', 'reperes'] as const;

type ChampRetirable = (typeof CHAMPS_RETIRABLES)[number];
type ListeRetirable = (typeof LISTES_RETIRABLES)[number];

function cible(champ: string): { champ: ChampRetirable } | { liste: ListeRetirable; index: number } | null {
  if ((CHAMPS_RETIRABLES as readonly string[]).includes(champ)) return { champ: champ as ChampRetirable };
  const m = /^(details|attributions|reperes):(\d+)$/.exec(champ);
  return m ? { liste: m[1] as ListeRetirable, index: Number(m[2]) } : null;
}

/**
 * Brouillon sans les champs en écart, et la liste de ce qui a été retiré ; null si un écart touche un champ qu'on ne
 * retire pas. Les diapositives qui reprenaient un champ retiré disparaissent ; celles des détails gardés suivent leur
 * nouvelle position. Le résultat doit repasser les contrôles : il peut manquer de diapositives ou de repères.
 */
export function elaguer(b: Brouillon, controles: readonly Controle[]): { brouillon: Brouillon; retires: string[] } | null {
  if (controles.length === 0) return null;
  const champs = new Set<ChampRetirable>();
  const indices: Record<ListeRetirable, Set<number>> = { details: new Set(), attributions: new Set(), reperes: new Set() };
  for (const c of controles) {
    const t = cible(c.champ);
    if (!t) return null;
    if ('champ' in t) champs.add(t.champ);
    else indices[t.liste].add(t.index);
  }
  const garder = <T>(liste: readonly T[], retires: Set<number>) => liste.filter((_, i) => !retires.has(i));
  // Nouvelle position de chaque détail gardé, pour les diapositives `details:N`.
  const position = new Map<number, number>();
  b.details.forEach((_, i) => { if (!indices.details.has(i)) position.set(i, position.size); });
  const diapositives = b.diapositives.flatMap((d): Brouillon['diapositives'] => {
    if (d.startsWith('details:')) {
      const p = position.get(Number(d.slice('details:'.length)));
      return p === undefined ? [] : [`details:${p}` as Brouillon['diapositives'][number]];
    }
    return champs.has(d as ChampRetirable) ? [] : [d];
  });
  const brouillon: Brouillon = {
    ...b,
    ...Object.fromEntries([...champs].map((c) => [c, null])),
    details: garder(b.details, indices.details),
    attributions: garder(b.attributions, indices.attributions),
    reperes: garder(b.reperes, indices.reperes),
    diapositives,
  };
  const retires = [...champs, ...LISTES_RETIRABLES.flatMap((l) => [...indices[l]].sort((x, y) => x - y).map((i) => `${l}:${i}`))];
  return { brouillon, retires };
}
