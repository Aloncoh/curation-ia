// Brouillon d'une publication de ressource (ADR 0011 §2) : fichier data/ressources/brouillons/<slug>.json.
// Le rédacteur écrit les textes et propose ; le code calcule tout ce qui est factuel (statut, état du dépôt, origine, mention).
import { z } from 'zod';
import { CATEGORIES } from '../analysis/schemas.ts';

/**
 * Version des consignes de rédaction. r2 (2026-11-02) : ligne éditoriale complétée par l'utilisateur — post court qui va
 * à l'essentiel, repères distincts des paragraphes, aucune formule d'ouverture figée, limite dite seulement si elle compte
 * pour décider (docs/agents-editoriaux.md §5). Un brouillon d'une autre version est bloqué (`consignes_inconnues`)
 * jusqu'à sa réécriture.
 */
export const CONSIGNES_RESSOURCES = 'r2';
export const MENTION_IA = 'Analyse IA à partir des sources — non testé par la plateforme';
export const LIBELLES_BOUTON = ['Voir le dépôt', 'Installer', 'Télécharger'] as const;
export type LibelleBouton = (typeof LIBELLES_BOUTON)[number];

const cite = z.object({ texte: z.string().trim().min(1), passages: z.array(z.string()) }).strict();

/** Un terme de mot-clé : 1 à 4 mots, 40 caractères au plus. */
const terme = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((t) => t.split(/\s+/).length <= 4, { message: 'Un terme compte 4 mots au plus.' });

const termeCite = z.object({ texte: terme, passages: z.array(z.string()) }).strict();

export const BrouillonRessource = z
  .object({
    slug: z.string().min(1),
    consignes: z.string().min(1),
    accroche: cite,
    description: cite,
    interet: cite,
    /** Un usage possible décrit par la source, jamais un essai réalisé. */
    exemple_usage: cite,
    demarrage: z
      .object({
        etapes: z.array(cite).min(1).max(4),
        /** Admise seulement si elle figure mot pour mot dans la capture brute. Affichée comme texte, jamais exécutée. */
        commande: z.string().trim().min(1).nullable(),
        passages: z.array(z.string()).min(1),
      })
      .strict(),
    compatibilites: z.array(cite),
    limites: z.array(cite),
    /** Licence propre au skill, quand le dépôt n'a pas de licence globale. */
    licence_locale: cite.nullable(),
    mots_cles: z
      .object({
        nom: z.string().trim().min(1),
        categorie: z.enum(CATEGORIES),
        usages: z.array(termeCite).min(1).max(6),
        technologies: z.array(termeCite).max(6),
        termes_proches: z.array(z.object({ terme, raison: z.string() }).strict()).max(8),
      })
      .strict(),
    /** Proposé par le rédacteur ; le code recalcule la destination et vérifie le libellé. */
    bouton: z.object({ libelle: z.enum(LIBELLES_BOUTON), url: z.string().min(1) }).strict(),
    reperes: z.array(cite).min(1).max(3),
  })
  .strict();
export type BrouillonRessource = z.infer<typeof BrouillonRessource>;

export const STATUTS_SORTIE = ['ressource_existante', 'nouvelle_sortie'] as const;
export type StatutSortie = (typeof STATUTS_SORTIE)[number];

/** État du dépôt, affiché par le code et daté ; les étoiles sont une information, jamais un critère. */
export const EtatDepot = z
  .object({
    full_name: z.string(),
    html_url: z.string(),
    etoiles: z.number().int().nullable(),
    etoiles_au: z.string(),
    cree_le: z.string().nullable(),
    dernier_push: z.string().nullable(),
    jours_sans_push: z.number().int().nullable(),
    inactif: z.boolean(),
    /** Identifiant SPDX donné par l'API ; null = « Non renseigné ». */
    licence: z.string().nullable(),
    archive: z.boolean(),
    fork: z.boolean(),
    parent: z.object({ full_name: z.string(), html_url: z.string() }).strict().nullable(),
    /** Pour un skill dans un dépôt : seule la date du dépôt est connue. */
    date_ajout_skill: z.null(),
  })
  .strict();
export type EtatDepot = z.infer<typeof EtatDepot>;

/** Contenu ajouté par le code à l'import ; ces champs sont refusés dans le brouillon (objet strict). */
export const ContenuRessource = z
  .object({
    statut_sortie: z.enum(STATUTS_SORTIE),
    etat_depot: EtatDepot,
    compte: z.string(),
    origine: z.enum(['agent_site', 'claude_code_developpement']),
    niveau_preuve: z.literal('documentary_analysis'),
    mention: z.literal(MENTION_IA),
    captures: z.array(z.object({ document: z.string(), snapshot_id: z.number().int(), capture_le: z.string() }).strict()),
    categories: z.array(z.enum(CATEGORIES)).length(1),
    nature: z.literal('ressource'),
    decouverte_via: z.string(),
  })
  .strict();
export type ContenuRessource = z.infer<typeof ContenuRessource>;
