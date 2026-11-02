// Accès au modèle derrière une interface : les tests utilisent un faux modèle, sans réseau ni dépense.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const CLES_REFUSEES = new Set(['$schema', 'minLength', 'maxLength']);
const nettoyer = (noeud: unknown): unknown => {
  if (Array.isArray(noeud)) return noeud.map(nettoyer);
  if (noeud === null || typeof noeud !== 'object') return noeud;
  return Object.fromEntries(Object.entries(noeud).filter(([cle]) => !CLES_REFUSEES.has(cle)).map(([cle, valeur]) => [cle, nettoyer(valeur)]));
};

/**
 * Schéma envoyé à l'API, sans les contraintes qu'elle refuse : la validation Zod complète reste faite côté code.
 * `zodOutputFormat` du SDK n'est pas utilisé : il déplacerait aussi `enum` dans une description, donc les choix fermés ne seraient plus imposés.
 */
export const schemaSortie = (schema: z.ZodType) => nettoyer(z.toJSONSchema(schema)) as Record<string, unknown>;

export interface RequeteModele {
  modele: string;
  systeme: string;
  utilisateur: string;
  maxTokens: number;
  schema: Record<string, unknown>;
  /** false : schéma trop vaste pour la grammaire d'Anthropic (erreur 400) ; il est alors donné en consigne, et seul Zod le fait respecter. */
  imposerSchema?: boolean;
}

export interface ReponseModele {
  texte: string;
  /** `input` compte toute l'entrée, cache compris : `cache` et `cacheEcrit` en sont des parts. `raisonnement` détaille la sortie s'il est connu. */
  usage: { input: number; output: number; cache?: number; cacheEcrit?: number; raisonnement?: number };
  stop: string | null;
}

export interface Modele {
  /** Tokens d'entrée, comptés avant l'appel. */
  compter(requete: RequeteModele): Promise<number>;
  appeler(requete: RequeteModele): Promise<ReponseModele>;
}

export const estReprenable = (e: unknown) =>
  e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError ||
  // En flux, une surcharge arrive comme un événement d'erreur, sans statut HTTP.
  (e instanceof Anthropic.APIError && e.status === undefined && e.type === 'overloaded_error');

/** Reprises du SDK désactivées : chaque tentative doit passer par le budget. Pas de repli serveur vers un autre modèle : son coût échapperait au contrôle. */
export function modeleAnthropic(options: ConstructorParameters<typeof Anthropic>[0] = {}): Modele {
  const client = new Anthropic({ maxRetries: 0, ...options });
  // Les consignes ne changent pas d'un sujet à l'autre : seul le document varie, après le point de cache.
  const consignes = (r: RequeteModele): Anthropic.TextBlockParam[] => [{ type: 'text', text: r.imposerSchema === false ? `${r.systeme}\n\nRéponds uniquement par un objet JSON, sans bloc de code ni texte autour, conforme à ce schéma :\n${JSON.stringify(r.schema)}` : r.systeme, cache_control: { type: 'ephemeral' } }];
  const format = (r: RequeteModele) => (r.imposerSchema === false ? {} : { format: { type: 'json_schema' as const, schema: r.schema } });
  return {
    async compter(r) {
      const res = await client.messages.countTokens({
        model: r.modele,
        system: consignes(r),
        messages: [{ role: 'user', content: r.utilisateur }],
        ...(r.imposerSchema === false ? {} : { output_config: format(r) }),
      });
      return res.input_tokens;
    },
    async appeler(r) {
      // En flux : au-delà d'environ 21 000 tokens, le SDK refuse un appel sans flux avant même de l'envoyer.
      const res = await client.messages
        .stream({
          model: r.modele,
          max_tokens: r.maxTokens,
          system: consignes(r),
          messages: [{ role: 'user', content: r.utilisateur }],
          output_config: { effort: 'medium', ...format(r) },
        })
        .finalMessage();
      const texte = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      const cache = res.usage.cache_read_input_tokens ?? 0;
      const cacheEcrit = res.usage.cache_creation_input_tokens ?? 0;
      return { texte, usage: { input: res.usage.input_tokens + cache + cacheEcrit, output: res.usage.output_tokens, cache, cacheEcrit }, stop: res.stop_reason };
    },
  };
}

const DEEPSEEK_URL = 'https://api.deepseek.com/responses';
/** Au-delà, l'appel est compté en erreur : la réservation reste, car la requête a pu être facturée. */
const DELAI_DEEPSEEK_MS = 120_000;

/** Le statut suffit : le corps d'une réponse d'erreur peut reprendre la requête, il n'est pas conservé. */
export class ErreurDeepSeek extends Error {
  readonly status: number | null;
  constructor(status: number | null, message: string) {
    super(message);
    this.status = status;
  }
}

export const estReprenableDeepSeek = (e: unknown) => e instanceof ErreurDeepSeek && (e.status === null || e.status === 429 || e.status >= 500);

const ReponseDeepSeek = z.object({
  status: z.string(),
  incomplete_details: z.object({ reason: z.string().nullish() }).nullish(),
  output: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().nullish() })).nullish() })).nullish(),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    input_tokens_details: z.object({ cached_tokens: z.number().nullish() }).nullish(),
    output_tokens_details: z.object({ reasoning_tokens: z.number().nullish() }).nullish(),
  }),
});

/**
 * API Responses de DeepSeek : c'est la seule à accepter un schéma de sortie, sans dire s'il est imposé ; la validation Zod
 * reste donc faite par le code. Aucune reprise ici : chaque tentative doit passer par le budget.
 */
export function modeleDeepSeek(options: { cle: string; raisonnement: 'none' | 'low'; fetch?: typeof globalThis.fetch; delaiMs?: number }): Modele {
  const envoyer = options.fetch ?? globalThis.fetch;
  return {
    // DeepSeek n'offre aucun comptage. Deux caractères par token majorent nos textes : la réservation reste prudente.
    async compter(r) {
      return Math.ceil((r.systeme.length + r.utilisateur.length + JSON.stringify(r.schema).length) / 2);
    },
    async appeler(r) {
      let res: Response;
      try {
        res = await envoyer(DEEPSEEK_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${options.cle}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: r.modele,
            instructions: r.systeme,
            input: r.utilisateur,
            max_output_tokens: r.maxTokens,
            reasoning: { effort: options.raisonnement },
            text: { format: { type: 'json_schema', name: 'sortie', schema: r.schema } },
          }),
          signal: AbortSignal.timeout(options.delaiMs ?? DELAI_DEEPSEEK_MS),
        });
      } catch (e) {
        throw new ErreurDeepSeek(null, `DeepSeek injoignable : ${e instanceof Error ? e.name : 'erreur réseau'}`);
      }
      if (!res.ok) throw new ErreurDeepSeek(res.status, `DeepSeek a répondu ${res.status}`);
      const lu = ReponseDeepSeek.safeParse(await res.json().catch(() => null));
      if (!lu.success) throw new ErreurDeepSeek(res.status, 'réponse DeepSeek illisible');
      const { status, incomplete_details: details, output, usage } = lu.data;
      if (status === 'failed') throw new ErreurDeepSeek(res.status, 'génération DeepSeek en échec');
      const texte = (output ?? []).filter((o) => o.type === 'message').flatMap((o) => o.content ?? []).flatMap((c) => (c.type === 'output_text' && c.text ? [c.text] : [])).join('');
      const stop = status === 'completed' ? 'end_turn' : details?.reason === 'max_output_tokens' ? 'max_tokens' : details?.reason === 'content_filter' ? 'refusal' : status;
      return { texte, usage: { input: usage.input_tokens, output: usage.output_tokens, cache: usage.input_tokens_details?.cached_tokens ?? 0, raisonnement: usage.output_tokens_details?.reasoning_tokens ?? 0 }, stop };
    },
  };
}
