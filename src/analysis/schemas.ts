// Sorties attendues du modèle : toute sortie non conforme est tracée, jamais utilisée.
import { z } from 'zod';

const cite = z.object({ texte: z.string().min(1), passages: z.array(z.string()) }).strict();

export const COMPTES_IDS = ['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar'] as const;

/** Ce que l'actualité est : une création réalisée avec un outil n'est jamais une nouveauté produit. */
export const NATURES = ['nouvel_outil', 'nouveau_modele', 'nouvelle_fonctionnalite', 'modele_ajoute_a_une_plateforme', 'integration', 'amelioration', 'changement_de_prix', 'disponibilite_elargie', 'creation_realisee', 'ressource', 'incident'] as const;

/** Liste fermée, pour qu'une catégorie nouvelle soit relue avant d'être utilisée. */
export const CATEGORIES = ['modèles', 'assistant de code', 'outil de développement', 'agents et automatisation', 'MCP et skills', 'création visuelle', 'audio et musique', 'design', 'projet GitHub', 'langages et infrastructures', 'hébergement et solutions locales', 'matériel', 'grandes entreprises', 'incident', 'sécurité'] as const;

/** Titres d'un détail : ils nomment le sujet sans rien affirmer, ils ne sont donc pas cités. */
export const TITRES_DETAILS = ['Aussi dans cette version', 'Fonctionnement', 'Compatibilité', 'Conditions', 'Migration', 'Sécurité', 'Administration'] as const;

/** Une diapositive désigne un champ du brouillon : le média n'écrit aucun texte nouveau (SPEC §7.3). */
export const DIAPOSITIVES = ['accroche', 'nouveaute', 'ce_que_ca_permet', 'pour_qui', 'exemple_usage', 'acces', 'prerequis', 'cout', 'limites_connues', 'details:0', 'details:1', 'details:2'] as const;

const critere = z.object({ note: z.literal([0, 1, 2]), raison: z.string().min(1) }).strict();

/** Le modèle note ; la décision publier, écarter ou approfondir se déduit des notes, dans le code (src/selection/consignes.ts). */
export const Qualification = z
  .object({
    criteres: z.object({ nouveaute_reelle: critere, utilite_concrete: critere, impact_utilisateurs: critere, solidite_sources: critere }).strict(),
    /** Extraits qui soutiennent les notes, contrôlés mot pour mot avant toute publication. */
    passages: z.array(z.string()),
    motif_rejet: z
      .enum(['hors_perimetre', 'republication', 'preversion', 'non_confirmee', 'source_insuffisante', 'sans_interet_concret', 'contenu_promotionnel_sans_nouveaute'])
      .nullable(),
    compte: z.enum(COMPTES_IDS).nullable(),
    // null quand aucune valeur ne convient : une nature forcée serait une information inventée.
    nature: z.enum(NATURES).nullable(),
    categories: z.array(z.enum(CATEGORIES)),
    /** Nom écrit dans le document, contrôlé mot pour mot ; le catalogue passe avant lui quand il connaît le produit. */
    produit: z.string().min(1).nullable(),
    type_information: z.enum(['annonce_officielle', 'affirmation_commerciale', 'resultat_independant', 'temoignage', 'opinion', 'non_confirmee']),
  })
  .strict();
export type Qualification = z.infer<typeof Qualification>;

export const Brouillon = z
  .object({
    accroche: cite,
    description: cite,
    nouveaute: cite,
    ce_que_ca_permet: cite.nullable(),
    pour_qui: cite.nullable(),
    /** Usage possible, tiré de ce que décrit le document ; jamais un essai réalisé. Reste null si le sujet n'en donne pas la matière. */
    exemple_usage: cite.nullable(),
    acces: cite.nullable(),
    /** Ce qu'il faut avoir avant de commencer : compte, outil, version, matériel. */
    prerequis: cite.nullable(),
    cout: cite.nullable(),
    limites_connues: cite.nullable(),
    details: z.array(z.object({ titre: z.enum(TITRES_DETAILS), texte: z.string().min(1), passages: z.array(z.string()) }).strict()),
    /** Benchmark ou témoignage rapporté par la source : toujours attribué, jamais présenté comme mesuré ou vécu par le site. */
    attributions: z.array(z.object({ type: z.enum(['benchmark', 'temoignage']), auteur: z.string().min(1), texte: z.string().min(1), passages: z.array(z.string()), conditions: cite.nullable() }).strict()),
    /** Repères courts et cités, repris tels quels par les annotations du visuel. */
    reperes: z.array(cite),
    diapositives: z.array(z.enum(DIAPOSITIVES)),
    questions_a_tester: z.array(z.string()),
  })
  .strict();
export type Brouillon = z.infer<typeof Brouillon>;
