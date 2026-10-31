// Sorties attendues du modèle : toute sortie non conforme est tracée, jamais utilisée.
import { z } from 'zod';

const cite = z.object({ texte: z.string().min(1), passages: z.array(z.string()) }).strict();

export const COMPTES_IDS = ['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar'] as const;

/** Ce que l'actualité est : une création réalisée avec un outil n'est jamais une nouveauté produit. */
export const NATURES = ['nouvel_outil', 'nouveau_modele', 'nouvelle_fonctionnalite', 'modele_ajoute_a_une_plateforme', 'integration', 'amelioration', 'changement_de_prix', 'disponibilite_elargie', 'creation_realisee', 'ressource', 'incident'] as const;

export const Qualification = z
  .object({
    retenue: z.boolean(),
    motif_rejet: z
      .enum(['hors_perimetre', 'republication', 'preversion', 'non_confirmee', 'source_insuffisante', 'sans_interet_concret', 'contenu_promotionnel_sans_nouveaute'])
      .nullable(),
    compte: z.enum(COMPTES_IDS).nullable(),
    // null quand aucune valeur ne convient : une nature forcée serait une information inventée.
    nature: z.enum(NATURES).nullable(),
    type_information: z.enum(['annonce_officielle', 'affirmation_commerciale', 'resultat_independant', 'temoignage', 'opinion', 'non_confirmee']),
  })
  .strict()
  .superRefine((q, ctx) => {
    // Écartée : un motif et aucun compte. Retenue : un compte et aucun motif.
    const coherente = q.retenue ? q.compte !== null && q.motif_rejet === null : q.compte === null && q.motif_rejet !== null;
    if (!coherente) ctx.addIssue({ code: 'custom', message: 'retenue, compte et motif_rejet incohérents' });
  });
export type Qualification = z.infer<typeof Qualification>;

export const Brouillon = z
  .object({
    accroche: cite,
    description: cite,
    nouveaute: cite,
    ce_que_ca_permet: cite.nullable(),
    pour_qui: cite.nullable(),
    acces: cite.nullable(),
    cout: cite.nullable(),
    limites_connues: cite.nullable(),
    questions_a_tester: z.array(z.string()),
  })
  .strict();
export type Brouillon = z.infer<typeof Brouillon>;
