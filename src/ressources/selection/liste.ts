// Sélections de ressources (décision de l'utilisateur du 2026-11-02, complément daté de l'ADR 0011) : une publication
// qui présente plusieurs sites, chacun avec son nom cliquable vers sa page officielle et une explication d'une ligne.
// La liste des sites vient de l'utilisateur ; elle tient lieu de sélection humaine, la capture décide de ce qui est retenu.
import type { CompteId } from '../../maquette/exemples.ts';

export interface SiteSelection {
  /** Identifiant court du site, stable : nom des fichiers d'aperçu et clé du brouillon. */
  slug: string;
  /** Nom affiché, qui sert aussi de libellé du lien. */
  nom: string;
  /**
   * Page d'accueil officielle, URL canonique finale. Aucune redirection n'est suivie : quand le domaine nu redirige
   * (vers www, par exemple), l'URL finale est vérifiée à la main et notée ici (`verifiee_a_la_main`).
   */
  url: string;
  /** Seul hôte autorisé pour ce site (liste blanche) : celui de `url`. */
  hote: string;
  /** Vérification manuelle de l'URL canonique, datée ; null si l'URL donnée répondait directement. */
  verifiee_a_la_main: string | null;
}

export type SujetSelection = 'design' | 'skills';

export interface EntreeSelection {
  slug: string;
  /** Nom de la sélection : premier mot-clé `nom`, titre dans la recherche et le planning. */
  nom: string;
  sujet: SujetSelection;
  compte: CompteId;
  decouverteVia: string;
  sites: SiteSelection[];
}

/** Compte signataire selon le sujet (décision du 2026-11-02 : la signature suit le sujet, pas le format). */
export const COMPTE_PAR_SUJET: Record<SujetSelection, CompteId> = { design: 'mova', skills: 'repo' };

/** Version de la liste, reprise dans `selection_decision.consignes_version`. */
export const VERSION_SELECTIONS = 'selections-2026-11-02';

const site = (slug: string, nom: string, url: string, verifiee_a_la_main: string | null = null): SiteSelection => ({ slug, nom, url, hote: new URL(url).hostname, verifiee_a_la_main });

export const SELECTIONS: readonly EntreeSelection[] = [
  {
    slug: 'selection-design-web',
    nom: 'Sélection design web',
    sujet: 'design',
    compte: COMPTE_PAR_SUJET.design,
    decouverteVia:
      "Liste de sites transmise par l'utilisateur le 2026-11-02, repérée dans un post X dont l'auteur n'est pas identifié (contenu externe attribué ; affirmations du post non reprises)",
    sites: [
      site('motionsites', 'Motion Sites', 'https://motionsites.ai/'),
      site('land-book', 'Land-book', 'https://land-book.com/'),
      site('recent-design', 'Recent Design', 'https://recent.design/'),
      site('landdding', 'Landdding', 'https://landdding.com/'),
      site(
        'fontinlogo',
        'Font in Logo',
        'https://www.fontinlogo.com/',
        "2026-11-02 : https://fontinlogo.com/ répond 301 vers https://www.fontinlogo.com/ (en-têtes lus à la main, redirection non suivie par la collecte)",
      ),
      site('godly', 'Godly', 'https://godly.website/'),
      site('60fps', '60fps', 'https://60fps.design/'),
    ],
  },
  {
    slug: 'selection-skills-croissance',
    nom: 'Sélection skills en forte croissance',
    sujet: 'skills',
    compte: COMPTE_PAR_SUJET.skills,
    decouverteVia:
      "Classement d'image transmis par l'utilisateur le 2026-11-04 (skillleaderboard.com, « Top 10 fastest-growing Claude skill repos », octobre 2026). Le site ne publie pas de page mensuelle : le 2026-11-04, son classement glissant sur 30 jours (données au 3 novembre 2026) contient les mêmes 10 dépôts dans un ordre voisin. Chiffres d'étoiles non repris dans le post.",
    sites: [
      site('mattpocock-skills', 'Matt Pocock Skills', 'https://github.com/mattpocock/skills'),
      site('security-audit-skill', 'Security Audit Skill', 'https://github.com/cloudflare/security-audit-skill'),
      site('ponytail', 'Ponytail', 'https://github.com/DietrichGebert/ponytail'),
      site('impeccable', 'Impeccable', 'https://github.com/pbakaus/impeccable'),
      site('anatomy', 'Anatomy', 'https://github.com/wheresryan22/anatomy'),
      site('diagram-design', 'Diagram Design', 'https://github.com/cathrynlavery/diagram-design'),
      site('graphify', 'Graphify', 'https://github.com/Graphify-Labs/graphify'),
      site('hallmark', 'Hallmark', 'https://github.com/Nutlope/hallmark'),
      site('taste-skill', 'Taste Skill', 'https://github.com/Leonxlnx/taste-skill'),
      site('superpowers', 'Superpowers', 'https://github.com/obra/superpowers'),
    ],
  },
  {
    slug: 'selection-references-design',
    nom: 'Sélection références design pour agents',
    sujet: 'design',
    compte: COMPTE_PAR_SUJET.design,
    decouverteVia:
      "Post X de @elbyron0 transmis par l'utilisateur le 2026-11-04 (https://x.com/elbyron0/status/2117740389314486339), liste de références à donner à un agent IA (contenu externe attribué ; affirmations du post non reprises)",
    sites: [
      site('mobbin', 'Mobbin', 'https://mobbin.com/'),
      site('designspells', 'Design Spells', 'https://designspells.com/'),
      site('recent-design', 'Recent Design', 'https://recent.design/'),
      site('brandguidelines', 'Brand Guidelines', 'https://www.brandguidelines.net/', "2026-11-04 : https://brandguidelines.net/ répond 308 vers https://www.brandguidelines.net/ (en-têtes lus à la main, redirection non suivie par la collecte)"),
      site('deck-gallery', 'Deck Gallery', 'https://www.deck.gallery/', "2026-11-04 : https://deck.gallery/ répond 301 vers https://www.deck.gallery/ (en-têtes lus à la main, redirection non suivie par la collecte)"),
    ],
  },
];

export const SOURCE_SITE_PREFIXE = 'site-ressource:';
export const KIND_SOURCE_SITE = 'site-ressource';
export const sourceIdSite = (hote: string): string => `${SOURCE_SITE_PREFIXE}${hote}`;

/** Source de la liste elle-même : la provenance de la sélection, capturée comme un document. */
export const KIND_SOURCE_LISTE = 'selection-ressources';
export const sourceIdListe = (slug: string): string => `selection-ressources:${slug}`;

export const trouverSelection = (slug: string, liste: readonly EntreeSelection[] = SELECTIONS): EntreeSelection | undefined => liste.find((s) => s.slug === slug);
