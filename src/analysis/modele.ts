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
}

export interface ReponseModele {
  texte: string;
  usage: { input: number; output: number };
  stop: string | null;
}

export interface Modele {
  /** Tokens d'entrée, comptés avant l'appel. */
  compter(requete: RequeteModele): Promise<number>;
  appeler(requete: RequeteModele): Promise<ReponseModele>;
}

export const estReprenable = (e: unknown) =>
  e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError;

/** Reprises du SDK désactivées : chaque tentative doit passer par le budget. Pas de repli serveur vers un autre modèle : son coût échapperait au contrôle. */
export function modeleAnthropic(): Modele {
  const client = new Anthropic({ maxRetries: 0 });
  return {
    async compter(r) {
      const res = await client.messages.countTokens({
        model: r.modele,
        system: r.systeme,
        messages: [{ role: 'user', content: r.utilisateur }],
        output_config: { format: { type: 'json_schema', schema: r.schema } },
      });
      return res.input_tokens;
    },
    async appeler(r) {
      const res = await client.messages.create({
        model: r.modele,
        max_tokens: r.maxTokens,
        system: r.systeme,
        messages: [{ role: 'user', content: r.utilisateur }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: r.schema } },
      });
      const texte = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      return { texte, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens }, stop: res.stop_reason };
    },
  };
}
