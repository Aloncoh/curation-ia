// Consignes de sélection, versionnées. Une version existante ne change jamais : une correction humaine devient une règle
// seulement dans une nouvelle version, qui cite les avis dont elle vient. Aucun chemin automatique n'existe.
import { moinsDeTroisMots } from '../analysis/controles.ts';
import { contientMotPourMot, normaliserEspaces } from '../maquette/data.ts';

export const CRITERES = ['nouveaute_reelle', 'utilite_concrete', 'impact_utilisateurs', 'solidite_sources'] as const;
export type Critere = (typeof CRITERES)[number];
export type NoteCritere = { note: number; raison: string };
export type Criteres = Record<Critere, NoteCritere>;

export const DECISIONS = ['publier', 'ecarter', 'approfondir'] as const;
export type Decision = (typeof DECISIONS)[number];

export interface ExempleConsigne {
  titre: string;
  decision: Decision;
  raison: string;
  /** Avis humain dont vient l'exemple : aucun exemple n'est inventé. */
  avis: number;
}

export interface VersionConsignes {
  version: string;
  date: string;
  texte: string;
  exemples: ExempleConsigne[];
  /** Ce qui a changé par rapport à la version précédente, et les avis qui l'ont motivé. */
  changements: { regle: string; avis: number[] }[];
}

const GRILLE = `Notre public : développeurs, étudiants et créateurs qui construisent avec l'IA, y compris des créateurs qui ne codent pas.

Note chaque critère de 0 à 2, à partir du seul document, comme s'il venait de sortir à la date de l'annonce.

nouveaute_reelle : ce qui change pour l'utilisateur.
- 2 : quelque chose qui n'existait pas devient disponible ou change à une date identifiable (modèle, fonction, prix, disponibilité).
- 1 : amélioration réelle mais incrémentale (extension à une plateforme, version de maintenance avec un apport identifiable).
- 0 : rien de nouveau pour l'utilisateur (étude de client, tutoriel, récapitulatif, comparatif, liste, portrait, événement, recrutement, partenariat sans effet concret, tribune).

utilite_concrete : ce qu'on peut en faire.
- 2 : on peut dire précisément ce que cela permet et comment y accéder dès maintenant.
- 1 : usage réel mais conditionnel ou décrit vaguement (préversion, offre entreprise, accès limité).
- 0 : aucun usage identifiable.

impact_utilisateurs : qui est concerné dans notre public.
- 2 : change la pratique d'une part notable de notre public.
- 1 : concerne un groupe restreint mais réel de notre public.
- 0 : ne concerne pas notre public (administration d'entreprise, finance, politique publique, recrutement).

solidite_sources : ce que le document prouve.
- 2 : source d'origine et texte assez complet pour citer ce qui change, avec ses conditions.
- 1 : source d'origine mais texte partiel (titre ou résumé seul), ou affirmation de l'éditeur sans détail vérifiable.
- 0 : rumeur, source indirecte ou informations contradictoires.

Ne comptent jamais dans une note : la popularité, les étoiles GitHub, la notoriété ou la taille de l'éditeur, le nombre d'utilisateurs annoncé, le ton promotionnel. Une annonce d'une grande entreprise sans nouveauté reste à 0 ; un petit projet avec une vraie nouveauté peut avoir 2.

Dans chaque critère, raison : une phrase factuelle de 20 mots au plus, en français. passages : un à trois extraits de 3 mots au moins et de 300 caractères au plus, copiés mot pour mot du titre ou du texte, qui soutiennent la note de nouveauté ou de solidité.`;

/**
 * Précisions tirées des désaccords entre trois juges sur le jeu de développement, avant tout avis humain. La proposition
 * d'exiger un lien avec l'IA n'a pas été retenue : SPEC §3.4 couvre aussi le design sans IA, et ce choix revient à l'utilisateur.
 */
const PRECISIONS_S2 = `Précisions :
- Note nouveauté, utilité et impact d'après ce que le document affirme, titre compris. Un texte bref ou partiel n'abaisse que la solidité.
- Le 2 en nouveauté exige un signe explicite d'ajout ou de changement ; une date seule ne suffit pas : sans ce signe, note 1. Le 0 est réservé aux genres listés, jamais au manque d'information.
- Première sortie d'un modèle ou d'un produit : 2. Élément déjà sorti, ajouté à un autre outil ou catalogue : 1. Sans indication contraire, ce qui est présenté comme nouveau vaut première sortie.
- Le 2 en utilité exige un usage et un point d'accès nommés (écran, commande, offre, procédure), même en une phrase. S'il en manque un : 1.`;

/** Décision de l'utilisateur du 2026-11-02 (SPEC §3.6, §7.3 bis) : aucun avis humain encore importé. */
const PRECISIONS_S3 = `Précisions sur le public :
- Un public spécialisé mais réel (motion design, UX/UI, frontend, code review, automatisation) note 1 en impact, jamais 0 : la qualité d'une ressource ne dépend pas de la largeur de son public.
- Un événement, un hommage, un webinaire ou une levée de fonds sans changement utilisable reste à 0 en nouveauté.`;

/**
 * Décision de l'utilisateur du 2026-11-05 (« big tech liée à l'IA ») : Radar couvre les grandes entreprises quand le
 * sujet touche l'IA, et seulement alors. Constat qui l'a motivée : sur le premier cycle avec texte complet, tous les sujets
 * Radar (partenariat de livraison, résultats d'AMD, montre Fitbit) partaient « hors périmètre ».
 */
const PRECISIONS_S5 = `Précisions sur les grandes entreprises (Apple, NVIDIA, AMD, Intel, TSMC, Qualcomm, Broadcom, Google, Microsoft, Amazon, Meta, Samsung, LG, Oracle, Tesla, Shopify…) :
- Dans le périmètre seulement si le document relie explicitement le sujet à l'IA : puce ou accélérateur pour l'IA, centre de données ou capacité de calcul pour l'IA, résultats financiers dont le document détaille l'activité IA (ventes de puces IA, dépenses de calcul), produit qui intègre une fonction d'IA nommée, partenariat ou accord qui rend un service d'IA disponible, robotique ou conduite autonome. Sans ce lien écrit dans le document (livraison, sport, mécénat, montre, investissement local, nomination), impact 0.
- Impact 2 quand le sujet change la capacité de calcul, les puces disponibles ou le prix d'accès aux modèles dont dépend notre public ; sinon 1.
- Résultats financiers : nouveauté 1 (chiffres datés), utilité 1 (ce que les chiffres disent de l'offre ou de la demande de calcul pour l'IA), jamais 2. Le chiffre reste une affirmation de l'entreprise.`;

/**
 * Décision de l'utilisateur du 2026-11-12 (« Oui, toutes » à « Faut-il publier toutes les grosses cyberattaques, même
 * sans lien avec les outils IA ou dev ? »), prise le jour de l'ajout de 11 flux de sécurité (docs/sources.md §3.13).
 */
const PRECISIONS_S6 = `Précisions sur la sécurité (cyberattaques, fuites de données, failles exploitées) :
- Une cyberattaque majeure est dans le périmètre même sans lien avec l'IA ni avec le développement. Majeure : elle touche une grande organisation, un service public ou une infrastructure, un produit ou un service très répandu, les données d'un grand nombre de personnes, ou la chaîne d'approvisionnement logicielle (paquet, dépôt, extension piégés). Cette précision prime sur celle des grandes entreprises : une attaque contre l'une d'elles n'a pas besoin de lien avec l'IA.
- Impact : 2 si l'attaque touche des outils, services ou paquets utilisés par notre public (cloud, dépôts, gestionnaires de paquets, assistants d'IA, services en ligne courants), sinon 1. Un incident local ou de petite ampleur reste à 0.
- Nouveauté : 2 pour la première révélation datée d'une attaque, d'une fuite ou d'une faille exploitée ; 1 pour un suivi qui apporte un fait nouveau (correctif, ampleur, revendication) ; 0 pour un récapitulatif ou un conseil général. Une attaque n'est pas un « événement » au sens des genres à 0.
- Utilité : 2 si le document dit quoi faire (correctif ou version à installer, service à vérifier, indicateurs à rechercher) ; 1 s'il décrit seulement l'attaque.
- Solidité : 2 si le document nomme la victime ou le produit touché, la date et l'origine de l'information (déclaration de la victime, avis officiel, chercheurs nommés) ; 1 sinon. Une attribution à un groupe ou à un État que le document ne présente pas comme confirmée rend l'information non confirmée.`;

export const VERSIONS_CONSIGNES: VersionConsignes[] = [
  { version: 's1', date: '2026-10-31', texte: GRILLE, exemples: [], changements: [] },
  {
    version: 's2',
    date: '2026-10-31',
    texte: `${GRILLE}\n\n${PRECISIONS_S2}`,
    exemples: [],
    changements: [{ regle: 'Quatre précisions pour réduire les désaccords entre juges sur le jeu de développement : aucun avis humain en jeu.', avis: [] }],
  },
  {
    version: 's3',
    date: '2026-11-02',
    texte: `${GRILLE}\n\n${PRECISIONS_S2}\n\n${PRECISIONS_S3}`,
    exemples: [],
    changements: [{ regle: 'Public spécialisé distinct de la qualité, et genres sans nouveauté précisés (décision de l’utilisateur du 2026-11-02) : aucun avis humain en jeu.', avis: [] }],
  },
  {
    version: 's4',
    date: '2026-11-03',
    texte: `${GRILLE}\n\n${PRECISIONS_S2}\n\n${PRECISIONS_S3}`,
    // Avis de l'utilisateur sur le premier lot réel (2026-11-02, « Les 3 sont OK ») : selection_avis 1 à 3.
    exemples: [
      { titre: 'pull_request_target blocked by default December 2', decision: 'publier', raison: 'Changement de comportement par défaut daté, qui touche les dépôts publics de notre public.', avis: 1 },
      { titre: 'Claude Code 2.1.314', decision: 'publier', raison: 'Version d’un assistant de code avec une nouvelle permission utilisable tout de suite.', avis: 2 },
      { titre: 'Webhook IP ranges added to the Meta API', decision: 'publier', raison: 'Changement d’infrastructure concret à appliquer par ceux qui filtrent les webhooks.', avis: 3 },
    ],
    changements: [{ regle: 'Premiers exemples relus par l’utilisateur : trois actualités publiées après relecture.', avis: [1, 2, 3] }],
  },
  {
    version: 's5',
    date: '2026-11-05',
    texte: `${GRILLE}\n\n${PRECISIONS_S2}\n\n${PRECISIONS_S3}\n\n${PRECISIONS_S5}`,
    exemples: [
      { titre: 'pull_request_target blocked by default December 2', decision: 'publier', raison: 'Changement de comportement par défaut daté, qui touche les dépôts publics de notre public.', avis: 1 },
      { titre: 'Claude Code 2.1.314', decision: 'publier', raison: 'Version d’un assistant de code avec une nouvelle permission utilisable tout de suite.', avis: 2 },
      { titre: 'Webhook IP ranges added to the Meta API', decision: 'publier', raison: 'Changement d’infrastructure concret à appliquer par ceux qui filtrent les webhooks.', avis: 3 },
    ],
    changements: [{ regle: 'Grandes entreprises dans le périmètre quand le sujet touche l’IA (décision de l’utilisateur du 2026-11-05, « big tech liée à l’IA ») : aucun avis humain en jeu.', avis: [] }],
  },
  {
    version: 's6',
    date: '2026-11-12',
    texte: `${GRILLE}\n\n${PRECISIONS_S2}\n\n${PRECISIONS_S3}\n\n${PRECISIONS_S5}\n\n${PRECISIONS_S6}`,
    exemples: [
      { titre: 'pull_request_target blocked by default December 2', decision: 'publier', raison: 'Changement de comportement par défaut daté, qui touche les dépôts publics de notre public.', avis: 1 },
      { titre: 'Claude Code 2.1.314', decision: 'publier', raison: 'Version d’un assistant de code avec une nouvelle permission utilisable tout de suite.', avis: 2 },
      { titre: 'Webhook IP ranges added to the Meta API', decision: 'publier', raison: 'Changement d’infrastructure concret à appliquer par ceux qui filtrent les webhooks.', avis: 3 },
    ],
    changements: [{ regle: 'Cyberattaques majeures dans le périmètre même sans lien avec l’IA ni le développement (décision de l’utilisateur du 2026-11-12, « Oui, toutes ») : aucun avis humain en jeu.', avis: [] }],
  },
];

/** Ordre de priorité éditoriale (SPEC §3.6) : 1 passe avant 4 quand le plafond quotidien oblige à choisir. Il ne change aucune note. */
export function prioriteEditoriale(nature: string | null, categories: readonly string[]): 1 | 2 | 3 | 4 {
  if (nature === 'nouveau_modele') return 1;
  if (nature === 'ressource' || categories.includes('MCP et skills')) return 2;
  if (nature === 'nouvel_outil' || nature === 'nouvelle_fonctionnalite' || nature === 'integration' || nature === 'modele_ajoute_a_une_plateforme') return 3;
  return 4;
}

export const consignesActuelles = (): VersionConsignes => VERSIONS_CONSIGNES.at(-1)!;

/** Texte complet envoyé au juge : la grille, puis les exemples relus par un humain, avec leur décision. */
export function texteConsignes(v: VersionConsignes): string {
  if (v.exemples.length === 0) return v.texte;
  return `${v.texte}\n\nExemples relus par un humain :\n${v.exemples.map((e) => `- « ${e.titre} » : ${e.decision}. ${e.raison}`).join('\n')}`;
}

/**
 * La décision se déduit des notes, par le code : le modèle ne peut pas retenir un sujet que ses propres notes écartent.
 * Un sujet n'est publiable que si ses sources le prouvent ; un sujet prometteur mal prouvé part en approfondissement.
 */
export function decisionDepuisNotes(c: Criteres): Decision {
  const nouveaute = c.nouveaute_reelle.note;
  const utilite = c.utilite_concrete.note;
  const impact = c.impact_utilisateurs.note;
  const solidite = c.solidite_sources.note;
  const interet = nouveaute + utilite + impact;
  if (nouveaute === 0 || utilite === 0 || impact === 0) return 'ecarter';
  if (interet < 4) return 'ecarter';
  return solidite === 2 ? 'publier' : 'approfondir';
}

// Heuristique volontairement large : un faux positif coûte une relecture, un faux négatif laisse passer la popularité.
export const POPULARITE = /(?<![\p{L}\p{N}])(?:populaires?|popularité|popular|étoiles?|stars?|tendances?|trending|viral\w*|géant|grande entreprise|grand éditeur|renommée?|notoriété|leader|très utilisée?s?|largement utilisée?s?|widely used|nombre d'utilisateurs|utilisée? par \d[\d\s,.]*(?:millions?|milliards?)?|\d[\d\s,.]*(?:millions?|milliards?) d['’]utilisateurs)(?![\p{L}\p{N}])/iu;

export interface Selection {
  decision: Decision;
  motif: string;
}

export interface AnalyseSelection {
  criteres: Criteres;
  passages: string[];
  compte: string | null;
  type_information: string;
  motif_rejet: string | null;
}

const TYPES_DOUTEUX = new Set(['non_confirmee', 'opinion', 'temoignage']);

const LONGUEUR_MAX_PASSAGE = 300;

/** Passages réellement utilisables : retrouvés mot pour mot, sans enjamber titre et texte, de 3 mots à 300 caractères. */
export function passagesRetrouves(passages: string[], capture: string[]): string[] {
  const parties = capture.map(normaliserEspaces);
  return passages.filter((p) => {
    const passage = normaliserEspaces(p);
    return !moinsDeTroisMots(passage) && passage.length <= LONGUEUR_MAX_PASSAGE && parties.some((c) => contientMotPourMot(c, passage));
  });
}

/**
 * Applique les garde-fous à une analyse de sélection. Dans le doute, rien n'est publié : la décision descend en
 * `approfondir`, avec son motif, et ne remonte jamais. `capture` : titre et texte séparés, comme pour les citations.
 */
export function deciderSelection(a: AnalyseSelection, capture: string[]): Selection {
  const decision = decisionDepuisNotes(a.criteres);
  if (decision === 'ecarter') return { decision, motif: a.motif_rejet ?? 'sans_interet_concret' };
  if (a.passages.length === 0 || passagesRetrouves(a.passages, capture).length !== a.passages.length) return { decision: 'approfondir', motif: 'passage_introuvable' };
  if (TYPES_DOUTEUX.has(a.type_information)) return { decision: 'approfondir', motif: 'information_non_confirmee' };
  // Un doute exprimé par le modèle l'emporte sur ses notes.
  if (a.motif_rejet !== null) return { decision: 'approfondir', motif: a.motif_rejet };
  if (decision === 'approfondir') return { decision, motif: a.criteres.solidite_sources.note === 0 ? 'source_insuffisante' : 'preuve_partielle' };
  if (CRITERES.some((c) => POPULARITE.test(a.criteres[c].raison))) return { decision: 'approfondir', motif: 'popularite_dans_la_justification' };
  if (a.compte === null) return { decision: 'approfondir', motif: 'compte_absent' };
  return { decision, motif: 'criteres_remplis' };
}

/** Âge maximal à la première vue : au-delà, l'entrée vient de l'historique d'un flux, pas d'une sortie. Valeur proposée. */
export const AGE_MAX_JOURS = 14;

/** Décision du code, sans appel au modèle ; null si le sujet doit être analysé. */
export function preselection(s: { annonceLe: string | null; vuLe: string }, ageMaxJours: number = AGE_MAX_JOURS): Selection | null {
  if (s.annonceLe !== null && Date.parse(s.vuLe) - Date.parse(s.annonceLe) > ageMaxJours * 86_400_000) return { decision: 'ecarter', motif: 'ancienne_a_la_detection' };
  return null;
}
