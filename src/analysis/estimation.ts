// Estimation du coût du texte, sans aucun appel au modèle. Tout ce qui sort d'ici est une estimation, à remplacer par le
// coût mesuré du premier lot réel. Les tarifs sont relevés sur les pages officielles, avec leur date.

export interface PrixTokens {
  /** Dollars par million de tokens. */
  cache: number;
  entree: number;
  sortie: number;
}

export interface TarifModele {
  nom: string;
  source: string;
  releve_le: string;
  creuses: PrixTokens;
  pleines: PrixTokens;
}

const DEEPSEEK = 'https://api-docs.deepseek.com/quick_start/pricing';
const ANTHROPIC = 'https://platform.claude.com/docs/en/about-claude/pricing';
/** Sans tarif de cache retenu : l'entrée reste au plein prix, ce qui majore l'estimation. */
const sansCache = (entree: number, sortie: number): PrixTokens => ({ cache: entree, entree, sortie });

export const TARIFS_ESTIMATION: Record<string, TarifModele> = {
  'deepseek-flash': { nom: 'DeepSeek V4.1 Flash', source: DEEPSEEK, releve_le: '2026-10-31', creuses: { cache: 0.003, entree: 0.15, sortie: 0.6 }, pleines: { cache: 0.006, entree: 0.3, sortie: 1.2 } },
  'deepseek-v4-pro': { nom: 'DeepSeek V4 Pro', source: DEEPSEEK, releve_le: '2026-10-31', creuses: { cache: 0.022, entree: 0.66, sortie: 1.98 }, pleines: { cache: 0.044, entree: 1.32, sortie: 3.96 } },
  'claude-haiku-5-5': { nom: 'Claude Haiku 5.5', source: ANTHROPIC, releve_le: '2026-10-31', creuses: sansCache(0.1, 0.5), pleines: sansCache(0.1, 0.5) },
  'claude-sonnet-5-5': { nom: 'Claude Sonnet 5.5', source: ANTHROPIC, releve_le: '2026-10-31', creuses: sansCache(2, 10), pleines: sansCache(2, 10) },
};

export const prixMoyen = (t: TarifModele, partPleines: number): PrixTokens => ({
  cache: t.creuses.cache * (1 - partPleines) + t.pleines.cache * partPleines,
  entree: t.creuses.entree * (1 - partPleines) + t.pleines.entree * partPleines,
  sortie: t.creuses.sortie * (1 - partPleines) + t.pleines.sortie * partPleines,
});

export interface Hypotheses {
  nom: string;
  /** Part des appels en heures pleines. */
  part_pleines: number;
  /** Part du préfixe stable (consignes et schéma) servie par le cache. */
  part_cache: number;
  /** Consignes et schéma, identiques d'un appel à l'autre. */
  prefixe_qualification: number;
  prefixe_redaction: number;
  document_qualification: number;
  /** Un sujet retenu a en général un texte plus long que la moyenne. */
  document_redaction: number;
  sortie_qualification: number;
  sortie_redaction: number;
  raisonnement_qualification: number;
  raisonnement_redaction: number;
  /** Part des actualités analysées qui partent en rédaction. */
  taux_retenue: number;
  /** Part des brouillons publiables sans nouvelle rédaction. */
  taux_publiable: number;
  /** Part des appels à refaire (réponse tronquée, invalide, panne). Comptés comme facturés : la règle de DeepSeek n'est pas publiée. */
  taux_reprise: number;
}

/**
 * Tailles mesurées le 2026-10-31 sur nos textes, découpés en cl100k (approximation : aucun outil de comptage DeepSeek
 * n'a été utilisé). Préfixes : consignes et schéma. Documents : corpus de 60 sujets et 22 sujets retenus. Sorties :
 * 180 jugements réels, et rédaction d'après les 8 exemples de la maquette, plus trois repères.
 */
const MESURES = { prefixe_qualification: 1681, prefixe_redaction: 1308, document_qualification: 452, document_redaction: 781, sortie_qualification: 219, sortie_redaction: 700 };

/** Part des décisions « publier » des juges sur le corpus (59 sur 180, à l'aveugle de tout avis humain). */
const RETENUE_MESUREE = 0.33;
/** Part mesurée des sorties collectées tombant en heures pleines : 35 sur 253 dates précises depuis juillet. */
const PLEINES_MESUREES = 0.14;

export const HYPOTHESES: Hypotheses[] = [
  { nom: 'bas', ...MESURES, part_pleines: PLEINES_MESUREES, part_cache: 0.8, raisonnement_qualification: 0, raisonnement_redaction: 0, taux_retenue: RETENUE_MESUREE, taux_publiable: 0.8, taux_reprise: 0.03 },
  { nom: 'central', ...MESURES, part_pleines: PLEINES_MESUREES, part_cache: 0.5, raisonnement_qualification: 0, raisonnement_redaction: 0, taux_retenue: RETENUE_MESUREE, taux_publiable: 0.6, taux_reprise: 0.08 },
  // Raisonnement activé, article complet lu dès la qualification, aucun cache, heures réparties uniformément (35 h sur 168).
  { nom: 'haut', ...MESURES, part_pleines: 35 / 168, part_cache: 0, document_qualification: 2000, document_redaction: 3000, sortie_redaction: 1250, raisonnement_qualification: 1000, raisonnement_redaction: 2000, taux_retenue: RETENUE_MESUREE, taux_publiable: 0.5, taux_reprise: 0.15 },
];

/** Vérificateur facultatif : un autre modèle relit le brouillon. Il ne remplace jamais les contrôles du code. */
export interface Verification {
  modele: TarifModele;
  prefixe: number;
  sortie: number;
}

/** Tailles supposées : aucun vérificateur par modèle n'est écrit à ce jour. */
export const VERIFICATION_TYPE = { prefixe: 550, sortie: 250 };

/** Le vérificateur est toujours un autre modèle : la vérification ne repose jamais sur le modèle qui a rédigé. */
export const verificateurDe = (modele: string): TarifModele => TARIFS_ESTIMATION[modele === 'claude-haiku-5-5' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5']!;

/** Plancher mesuré : 198 actualités datées des 30 derniers jours, alors que les flux ne gardent que leurs dernières entrées. */
export const FLUX_MENSUEL_MINIMAL = 200;
export const VOLUMES_MENSUELS = [30, 90, 300, 900];

/** Coût d'un appel en dollars. */
function coutAppel(p: PrixTokens, partCache: number, prefixe: number, document: number, sortie: number): number {
  const enCache = prefixe * partCache;
  return (enCache * p.cache + (prefixe - enCache + document) * p.entree + sortie * p.sortie) / 1_000_000;
}

export interface CoutChaine {
  qualification: number;
  redaction: number;
  verification: number;
  reprises: number;
  /** Ce que coûte une analyse, reprises comprises. */
  analyse: number;
  /** Ce que coûte un brouillon rédigé, vérification et reprises comprises. */
  brouillon: number;
  /** Une actualité analysée, en moyenne, retenue ou non. */
  par_actualite: number;
  /** Une actualité retenue et rédigée de bout en bout. */
  par_actualite_retenue: number;
  /** Une publication, en comptant tout ce qui a été écarté ou raté pour l'obtenir. */
  par_publication: number;
  actualites_par_publication: number;
  brouillons_par_publication: number;
}

export function coutChaine(modele: TarifModele, h: Hypotheses, verification: Verification | null = null): CoutChaine {
  const p = prixMoyen(modele, h.part_pleines);
  const qualification = coutAppel(p, h.part_cache, h.prefixe_qualification, h.document_qualification, h.sortie_qualification + h.raisonnement_qualification);
  const redaction = coutAppel(p, h.part_cache, h.prefixe_redaction, h.document_redaction, h.sortie_redaction + h.raisonnement_redaction);
  // Le vérificateur relit le document et le brouillon, qui entre alors comme texte.
  const v = verification ? coutAppel(prixMoyen(verification.modele, h.part_pleines), h.part_cache, verification.prefixe, h.document_redaction + h.sortie_redaction, verification.sortie) : 0;
  const majoration = 1 + h.taux_reprise;
  const analyse = qualification * majoration;
  const brouillon = (redaction + v) * majoration;
  const parActualite = analyse + h.taux_retenue * brouillon;
  const actualites = 1 / (h.taux_retenue * h.taux_publiable);
  // Une actualité retenue a le texte d'un sujet retenu, dès sa qualification : c'est le même document qui part aux deux appels.
  const qualificationRetenue = coutAppel(p, h.part_cache, h.prefixe_qualification, Math.max(h.document_qualification, h.document_redaction), h.sortie_qualification + h.raisonnement_qualification);
  return {
    qualification, redaction, verification: v,
    reprises: parActualite - (qualification + h.taux_retenue * (redaction + v)),
    analyse, brouillon,
    par_actualite: parActualite,
    par_actualite_retenue: qualificationRetenue * majoration + brouillon,
    par_publication: parActualite * actualites,
    actualites_par_publication: actualites,
    brouillons_par_publication: 1 / h.taux_publiable,
  };
}

export interface LigneMensuelle {
  publications: number;
  actualites: number;
  cout: number;
}

/**
 * Coût mensuel du texte. `flux` : actualités collectées par mois, toutes analysées même si peu sont publiées. Au-delà des
 * publications visées, un sujet retenu attend : seuls les brouillons nécessaires sont rédigés.
 */
export function coutMensuel(c: CoutChaine, publications: number, flux = 0): LigneMensuelle {
  const actualites = Math.max(Math.ceil(publications * c.actualites_par_publication), flux);
  return { publications, actualites, cout: actualites * c.analyse + publications * c.brouillons_par_publication * c.brouillon };
}
