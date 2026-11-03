// Montages des publications : une image fixe composée par le code, sans modèle. Chaque texte vient d'un champ vérifié ;
// le montage n'ajoute aucune affirmation (SPEC §7.3). Lumineux, nouveauté en gros titre, annotations en étiquettes cousues.
import { MENTION_ILLUSTRATION } from '../analysis/publication.ts';
import { COMPTES_MONTAGE, FEUILLE_DE_STYLE, FORMAT, type Compte } from './style.ts';

export const GABARITS = ['photo_titre', 'fenetre_annotee', 'detourage_titre', 'avant_apres', 'loupe', 'terminal_annote', 'fiches', 'etapes', 'selection'] as const;
export type Gabarit = (typeof GABARITS)[number];

export interface ImageMontage {
  /** Adresse `data:` : rien n'est chargé depuis le réseau au moment du rendu. */
  src: string;
  alt: string;
  /** Une image d'éditeur exige son crédit ; seule une image du projet s'en passe. */
  origine: 'projet' | 'editeur';
  credit: string | null;
}

/**
 * Position en pourcentage de la zone principale. (x, y) : le coin de l'étiquette ; `ancre` : le point montré, ou null quand
 * personne n'a repéré ce point sur l'image. Une étiquette sans fil n'affirme rien sur l'endroit qu'elle recouvre.
 */
export interface Etiquette {
  texte: string;
  x: number;
  y: number;
  ancre: { x: number; y: number } | null;
}

/** Aperçu d'un site dans le gabarit `selection` : capture locale de sa page d'accueil, avec le nom du site. */
export interface ApercuMontage {
  /**
   * Adresse `data:` : rien n'est chargé depuis le réseau au moment du rendu. null : aucun aperçu n'a pu être pris
   * (protection anti-robot, par exemple) ; la case garde le nom du site et dit « Aperçu indisponible », sans image de substitution.
   */
  src: string | null;
  nom: string;
  alt: string;
}

export interface Montage {
  id: string;
  gabarit: Gabarit;
  compte: Compte;
  titre: string;
  surtitre: string | null;
  image: ImageMontage | null;
  /** Seconde image du gabarit avant / après. */
  apres: ImageMontage | null;
  etiquettes: Etiquette[];
  /** Commande citée, ligne par ligne, pour le gabarit terminal. */
  lignes: string[];
  /** Étapes de démarrage citées, dans l'ordre, pour le gabarit `etapes` (ADR 0011 §4). */
  etapes: string[];
  /** Point agrandi du gabarit loupe, en pourcentage de l'image : il tombe au centre de la lentille. */
  loupe: { x: number; y: number; zoom: number } | null;
  /** Gabarit `selection` : 4 à 6 aperçus de sites, chacun avec son nom (complément de l'ADR 0011, 2026-11-02). */
  apercus?: ApercuMontage[];
  source: string;
  mention: string;
}

/** Mention inscrite sur l'image, en anglais comme tout le texte des montages (2026-11-03) ; la base garde la mention de référence. */
export const MENTION_IMAGE = 'Illustration — not proof that it works';

export const LONGUEUR_MAX_TITRE = 110;
export const LONGUEUR_MAX_ETIQUETTE = 64;
/** Une fiche occupe la largeur de la planche : elle accepte une phrase entière. */
export const LONGUEUR_MAX_FICHE = 96;
export const ETIQUETTES_MAX = 3;
/** Gabarit `etapes` : 2 à 4 cases, chacune une étape citée de la documentation. */
export const ETAPES_MIN = 2;
export const ETAPES_MAX = 4;
export const LONGUEUR_MAX_ETAPE = 80;
/** Surtitre fixe : les étapes viennent de la documentation, pas d'un essai de la plateforme. */
export const SURTITRE_ETAPES = 'Getting started, per the documentation';
/** Gabarit `selection` : une grille de 4 à 6 aperçus, chacun nommé. */
export const APERCUS_MIN = 4;
export const APERCUS_MAX = 6;
export const LONGUEUR_MAX_NOM_APERCU = 40;
/** Crédit obligatoire au pied d'un montage d'aperçus : les captures appartiennent aux sites cités. */
export const CREDIT_APERCUS = 'Screenshots of the cited sites, © their owners';
/** Case d'un site sans aperçu : son nom reste, aucune image ne le remplace. */
export const APERCU_INDISPONIBLE = 'Preview unavailable';

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plus le titre est court, plus il prend de place : la nouveauté se lit d'abord. */
export function tailleTitre(texte: string, gabarit?: Gabarit): number {
  const n = texte.length;
  const taille = n <= 22 ? 138 : n <= 40 ? 116 : n <= 64 ? 96 : 78;
  // Une capture a besoin de place : le titre lui en laisse. Quatre étapes aussi : un titre long y descend à 64 px.
  if (gabarit === 'etapes') return Math.min(taille, n > 64 ? 64 : 92);
  // Une grille d'aperçus occupe presque toute la planche : le titre tient sur deux lignes au plus.
  if (gabarit === 'selection') return Math.min(taille, n > 40 ? 64 : 80);
  return gabarit && ['fenetre_annotee', 'loupe', 'avant_apres'].includes(gabarit) ? Math.min(taille, 92) : taille;
}

const enPourcentage = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;

/** Défauts qui interdisent un montage : ils se contrôlent avant tout rendu. */
export function defautsMontage(m: Montage): string[] {
  const defauts: string[] = [];
  const avecImage = m.gabarit !== 'terminal_annote' && m.gabarit !== 'fiches' && m.gabarit !== 'etapes' && m.gabarit !== 'selection';
  if (!/^[a-z0-9-]+$/.test(m.id)) defauts.push('identifiant_invalide');
  if (!COMPTES_MONTAGE.includes(m.compte)) defauts.push('compte_inconnu');
  if (m.titre.trim().length === 0 || m.titre.length > LONGUEUR_MAX_TITRE) defauts.push('titre_hors_limites');
  if (m.etiquettes.length > ETIQUETTES_MAX) defauts.push('trop_d_etiquettes');
  const longueurMax = m.gabarit === 'fiches' ? LONGUEUR_MAX_FICHE : LONGUEUR_MAX_ETIQUETTE;
  if (m.etiquettes.some((e) => e.texte.trim().length === 0 || e.texte.length > longueurMax)) defauts.push('etiquette_hors_limites');
  if (m.etiquettes.some((e) => [e.x, e.y, e.ancre?.x ?? 0, e.ancre?.y ?? 0].some((v) => !enPourcentage(v)))) defauts.push('etiquette_hors_cadre');
  if (avecImage && !m.image) defauts.push('image_absente');
  if (m.gabarit === 'avant_apres' && !m.apres) defauts.push('seconde_image_absente');
  if (m.gabarit === 'loupe' && !m.loupe) defauts.push('loupe_absente');
  if (m.loupe && (!enPourcentage(m.loupe.x) || !enPourcentage(m.loupe.y) || !(m.loupe.zoom >= 1))) defauts.push('loupe_hors_cadre');
  if (m.gabarit === 'terminal_annote' && (m.lignes.length === 0 || m.lignes.some((l) => l.trim().length === 0))) defauts.push('commande_absente');
  if (m.gabarit === 'terminal_annote' && !/reconstitution|reconstructed/i.test(m.surtitre ?? '')) defauts.push('reconstitution_non_signalee');
  if (m.gabarit === 'fiches' && m.etiquettes.length === 0) defauts.push('reperes_absents');
  if (m.gabarit === 'etapes' && (m.etapes.length < ETAPES_MIN || m.etapes.length > ETAPES_MAX || m.etapes.some((e) => e.trim().length === 0 || e.length > LONGUEUR_MAX_ETAPE))) {
    defauts.push('etapes_hors_limites');
  }
  if (m.gabarit === 'etapes' && m.surtitre !== SURTITRE_ETAPES) defauts.push('etapes_non_attribuees');
  if (m.gabarit === 'selection') {
    const a = m.apercus ?? [];
    if (a.length < APERCUS_MIN || a.length > APERCUS_MAX) defauts.push('apercus_hors_limites');
    if (a.some((x) => x.nom.trim().length === 0 || x.nom.length > LONGUEUR_MAX_NOM_APERCU)) defauts.push('nom_apercu_hors_limites');
    if (a.some((x) => x.src !== null && !x.src.startsWith('data:image/'))) defauts.push('image_non_locale');
    if (a.every((x) => x.src === null)) defauts.push('apercus_absents');
    if (a.some((x) => x.alt.trim().length === 0)) defauts.push('texte_alternatif_absent');
    if (!m.source.includes(CREDIT_APERCUS)) defauts.push('credit_absent');
  } else if ((m.apercus ?? []).length > 0) defauts.push('apercus_hors_gabarit');
  for (const image of [m.image, m.apres]) {
    if (image && !image.src.startsWith('data:image/')) defauts.push('image_non_locale');
    if (image && image.alt.trim().length === 0) defauts.push('texte_alternatif_absent');
    if (image?.origine === 'editeur' && !image.credit?.trim()) defauts.push('credit_absent');
  }
  if (m.source.trim().length === 0) defauts.push('source_absente');
  if (m.mention !== MENTION_ILLUSTRATION) defauts.push('mention_non_conforme');
  return defauts;
}

const avecFil = (etiquettes: Etiquette[]) => etiquettes.filter((e) => e.ancre !== null);

const fils = (etiquettes: Etiquette[]) => `<svg class="fils" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${etiquettes
  .flatMap((e) => (e.ancre ? [`<line x1="${e.x}" y1="${e.y}" x2="${e.ancre.x}" y2="${e.ancre.y}" />`] : []))
  .join('')}</svg>`;

const etiquettesHtml = (etiquettes: Etiquette[]) => avecFil(etiquettes)
  .map((e) => `<span class="point" style="left:${e.ancre!.x}%;top:${e.ancre!.y}%"></span><span class="etiquette" style="left:${e.x}%;top:${e.y}%">${echapper(e.texte)}</span>`)
  .join('');

/** Sans point repéré, les étiquettes s'empilent : leur place ne dépend pas de la longueur des textes. */
const pile = (etiquettes: Etiquette[]) => {
  const libres = etiquettes.filter((e) => e.ancre === null);
  return libres.length === 0 ? '' : `<div class="pile">${libres.map((e) => `<span class="etiquette">${echapper(e.texte)}</span>`).join('')}</div>`;
};

const FLECHE = `<li class="fleche" aria-hidden="true"><svg viewBox="0 0 40 60"><path d="M20 4 V44" /><path d="M8 34 L20 50 L32 34" /></svg></li>`;

const img = (i: ImageMontage, classe = '') => `<img class="${classe}" src="${echapper(i.src)}" alt="${echapper(i.alt)}">`;

function heros(m: Montage): string {
  const annotations = m.etiquettes.length > 0 ? `${fils(m.etiquettes)}${etiquettesHtml(m.etiquettes)}${pile(m.etiquettes)}` : '';
  switch (m.gabarit) {
    case 'photo_titre':
      return `<div class="heros photo">${img(m.image!)}</div>`;
    case 'fenetre_annotee':
      return `<div class="heros"><div class="fenetre">${img(m.image!)}</div>${annotations}</div>`;
    case 'detourage_titre':
      return `<div class="heros detourage"><span class="disque"></span>${img(m.image!, 'decoupe')}${annotations}</div>`;
    case 'avant_apres':
      return `<div class="heros duo"><figure class="carte avant">${img(m.image!)}<figcaption>Avant</figcaption></figure><figure class="carte apres">${img(m.apres!)}<figcaption>Maintenant</figcaption></figure>${annotations}</div>`;
    case 'loupe': {
      const l = m.loupe!;
      // Le décalage est relatif à l'image agrandie : le point visé tombe au centre de la lentille, quel que soit son format.
      const agrandie = `<img src="${echapper(m.image!.src)}" alt="" style="width:${l.zoom * 100}%;transform:translate(-${l.x}%,-${l.y}%)">`;
      return `<div class="heros"><div class="fenetre">${img(m.image!)}</div><span class="lentille">${agrandie}</span>${annotations}</div>`;
    }
    case 'fiches':
      return `<ol class="heros fiches">${m.etiquettes.map((e) => `<li class="fiche">${echapper(e.texte)}</li>`).join('')}</ol>`;
    case 'etapes':
      // Une flèche entre deux cases ; elle ne porte aucun texte et n'est pas lue par un lecteur d'écran.
      return `<ol class="heros etapes" data-nombre="${m.etapes.length}">${m.etapes
        .map((e, i) => `${i > 0 ? FLECHE : ''}<li class="etape"><span class="numero" aria-hidden="true">${i + 1}</span><span class="texte">${echapper(e)}</span></li>`)
        .join('')}</ol>`;
    case 'selection': {
      // Grille d'aperçus : chaque capture garde son cadre et le nom du site, sans texte ajouté.
      const a = m.apercus ?? [];
      return `<ul class="heros grille" data-nombre="${a.length}">${a
        .map((x) => `<li class="apercu"><span class="cadre${x.src === null ? ' vide' : ''}">${x.src === null ? `<span class="indisponible">${echapper(APERCU_INDISPONIBLE)}</span>` : `<img src="${echapper(x.src)}" alt="${echapper(x.alt)}">`}</span><span class="nom-site">${echapper(x.nom)}</span></li>`)
        .join('')}</ul>`;
    }
    case 'terminal_annote':
      return `<div class="heros"><pre class="papier">${m.lignes.map((l) => `<span class="ligne"><b>$</b> ${echapper(l)}</span>`).join('\n')}</pre>${annotations}</div>`;
  }
}

/** Document complet d'un montage, sans aucune ressource externe. `avatar` : image `data:` du compte. */
export function htmlMontage(m: Montage, options: { avatar: string; polices: string; nomCompte: string }): string {
  const credits = [...new Set([m.image?.credit, m.apres?.credit].filter((c): c is string => Boolean(c)))];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${options.polices}${FEUILLE_DE_STYLE}</style></head>
<body><main class="planche" data-compte="${m.compte}" data-gabarit="${m.gabarit}" style="width:${FORMAT.largeur}px;height:${FORMAT.hauteur}px">
<header class="tete"><img class="avatar" src="${echapper(options.avatar)}" alt=""><span class="compte">${echapper(options.nomCompte)}</span><span class="badge">AI agent</span>${m.surtitre ? `<span class="surtitre">${echapper(m.surtitre)}</span>` : ''}</header>
<h1 class="titre" style="font-size:${tailleTitre(m.titre, m.gabarit)}px">${echapper(m.titre)}</h1>
${heros(m)}
<footer class="pied"><span>${echapper([m.source, ...credits].join(' · '))}</span><span>${echapper(m.mention === MENTION_ILLUSTRATION ? MENTION_IMAGE : m.mention)}</span></footer>
</main></body></html>`;
}

/** Repères cités, posés sur la capture sans fil : le code ne sait pas où se trouve chaque élément dans l'image. */
export const etiquettesSansAncre = (reperes: string[]): Etiquette[] => reperes.map((texte) => ({ texte, x: 0, y: 0, ancre: null }));

const JOUR_PARIS = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/Paris' });

export interface ContenuMontage {
  id: string;
  compte: Compte;
  accroche: string;
  reperes: string[];
  date_annonce: string | null;
  source: string;
  mention: string;
}

/**
 * Choisit la composition sans modèle : une image dont le droit d'usage est vérifié passe en grand, sinon les repères
 * cités deviennent des fiches. Aucun média n'est jamais inventé pour remplir la place.
 */
export function composerMontage(c: ContenuMontage, media: { image: ImageMontage; genre: 'photo' | 'capture' } | null): Montage {
  const commun = { id: c.id, compte: c.compte, titre: c.accroche, surtitre: c.date_annonce ? JOUR_PARIS.format(new Date(c.date_annonce)) : null, apres: null, lignes: [], etapes: [], loupe: null, source: c.source, mention: c.mention };
  if (media?.genre === 'photo') return { ...commun, gabarit: 'photo_titre', image: media.image, etiquettes: [] };
  if (media) return { ...commun, gabarit: 'fenetre_annotee', image: media.image, etiquettes: etiquettesSansAncre(c.reperes) };
  return { ...commun, gabarit: 'fiches', image: null, etiquettes: etiquettesSansAncre(c.reperes) };
}

/** Texte alternatif du média : il dit ce que montre l'image, annotations comprises. */
export const texteAlternatif = (m: Montage) =>
  [
    m.titre,
    m.image?.alt,
    m.gabarit === 'avant_apres' ? m.apres?.alt : null,
    ...m.lignes,
    ...(m.gabarit === 'etapes' ? m.etapes.map((e, i) => `Étape ${i + 1} : ${e}`) : []),
    ...(m.gabarit === 'selection' ? (m.apercus ?? []).map((x) => x.alt) : []),
    ...(m.gabarit === 'photo_titre' ? [] : m.etiquettes.map((e) => e.texte)),
  ]
    .filter(Boolean)
    .join('. ');
