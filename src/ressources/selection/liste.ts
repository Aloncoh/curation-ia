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

export type SujetSelection = 'design';

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
export const COMPTE_PAR_SUJET: Record<SujetSelection, CompteId> = { design: 'mova' };

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
];

export const SOURCE_SITE_PREFIXE = 'site-ressource:';
export const KIND_SOURCE_SITE = 'site-ressource';
export const sourceIdSite = (hote: string): string => `${SOURCE_SITE_PREFIXE}${hote}`;

/** Source de la liste elle-même : la provenance de la sélection, capturée comme un document. */
export const KIND_SOURCE_LISTE = 'selection-ressources';
export const sourceIdListe = (slug: string): string => `selection-ressources:${slug}`;

export const trouverSelection = (slug: string, liste: readonly EntreeSelection[] = SELECTIONS): EntreeSelection | undefined => liste.find((s) => s.slug === slug);
