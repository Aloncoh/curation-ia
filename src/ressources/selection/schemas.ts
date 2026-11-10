// Brouillon d'une sélection de ressources (complément de l'ADR 0011, 2026-11-02) : fichier
// data/ressources/brouillons/<slug>.json, reconnu par `"format": "selection"`. Le rédacteur écrit l'accroche et une
// explication d'une ligne par site ; le code calcule tout ce qui est factuel (liens vérifiés, captures, compte, mention).
import { z } from 'zod';
import { CATEGORIES } from '../../analysis/schemas.ts';
import { MENTION_IA } from '../schemas.ts';

/** Version des consignes de rédaction d'une sélection. s1 : 2026-11-02. */
export const CONSIGNES_SELECTION = 's1';
export const FORMAT_SELECTION = 'selection';
/** Crédit des aperçus, au pied du montage. */
export const CREDIT_CAPTURES = 'Captures des sites cités, © leurs auteurs';
/** Une explication tient sur une ligne : un usage concret, sans définition ni remplissage. */
export const LONGUEUR_MAX_EXPLICATION = 150;
export const ELEMENTS_MIN = 3;
/** 12 depuis le 2026-11-10 : un dossier par étapes reprend une planche de référence de 12 outils. */
export const ELEMENTS_MAX = 12;

const cite = z.object({ texte: z.string().trim().min(1), passages: z.array(z.string()) }).strict();

/** Un terme de mot-clé : 1 à 4 mots, 40 caractères au plus (comme pour une ressource). */
const terme = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((t) => t.split(/\s+/).length <= 4, { message: 'Un terme compte 4 mots au plus.' });
const termeCite = z.object({ texte: terme, passages: z.array(z.string()) }).strict();
const termeProche = z.object({ terme, raison: z.string() }).strict();

export const ElementSelection = z
  .object({
    /** Slug du site dans la liste de la sélection (src/ressources/selection/liste.ts). */
    site: z.string().min(1),
    /** Nom affiché ; c'est aussi le libellé du lien. */
    nom: z.string().trim().min(1).max(40),
    /** URL officielle, vérifiée par le code sur l'hôte attendu. */
    url: z.string().min(1),
    /** Doit valoir exactement `nom` : le lien porte le nom de la ressource, rien d'autre. */
    libelle_lien: z.string().min(1),
    /** Une ligne, citée mot pour mot dans la capture de la page. */
    explication: cite,
    /** Classement propre au site (« typographie », « animations »…) : indexé, jamais affiché. */
    categorie: terme,
    usages: z.array(termeCite).min(1).max(4),
    termes_proches: z.array(termeProche).max(4),
  })
  .strict();
export type ElementSelection = z.infer<typeof ElementSelection>;

export const BrouillonSelection = z
  .object({
    format: z.literal(FORMAT_SELECTION),
    slug: z.string().min(1),
    consignes: z.string().min(1),
    /** Accroche courte qui annonce la sélection ; un nombre éventuel doit être celui des ressources listées. */
    accroche: cite,
    ressources: z.array(ElementSelection).min(ELEMENTS_MIN).max(ELEMENTS_MAX),
    mots_cles: z
      .object({
        nom: z.string().trim().min(1),
        categorie: z.enum(CATEGORIES),
        termes_proches: z.array(termeProche).max(6),
      })
      .strict(),
  })
  .strict();
export type BrouillonSelection = z.infer<typeof BrouillonSelection>;

/** Lien d'un élément, vérifié par le code : la capture réelle de la page tient lieu de vérification, ou une requête directe. */
export const LienVerifie = z
  .object({
    url: z.string(),
    hote: z.string(),
    resultat: z.enum(['verifie', 'echec']),
    /** capture_recente | reponse_directe | motif de l'échec */
    motif: z.string(),
    statut_http: z.number().int().nullable(),
    snapshot_id: z.number().int().nullable(),
    verifie_le: z.string(),
  })
  .strict();
export type LienVerifie = z.infer<typeof LienVerifie>;

/** Contenu ajouté par le code à l'import ; ces champs sont refusés dans le brouillon (objet strict). */
export const ContenuSelection = z
  .object({
    nature: z.literal('selection'),
    compte: z.string(),
    origine: z.enum(['agent_site', 'claude_code_developpement']),
    niveau_preuve: z.literal('documentary_analysis'),
    mention: z.literal(MENTION_IA),
    categories: z.array(z.enum(CATEGORIES)).length(1),
    statut_sortie: z.literal('ressource_existante'),
    decouverte_via: z.string(),
    captures: z.array(z.object({ document: z.string(), snapshot_id: z.number().int(), capture_le: z.string() }).strict()),
    /** Sites de la liste non retenus, avec leur motif (capture refusée, robots.txt…) : tracés, jamais affichés comme ressources. */
    exclus: z.array(z.object({ site: z.string(), nom: z.string(), url: z.string(), motif: z.string() }).strict()),
  })
  .strict();
export type ContenuSelection = z.infer<typeof ContenuSelection>;
