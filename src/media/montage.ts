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

/**
 * Carte d'un dossier par étapes (2026-11-10, demande de l'utilisateur : « reprends le principe des cartes illustrées avec
 * notre propre identité ») : l'illustration est dessinée par nous (la mascotte de l'agent et un accessoire de l'étape),
 * jamais une image de tiers ; la carte porte l'étape, le nom de la ressource et son auteur, relevés sur le dépôt.
 */
export interface CarteMontage {
  etape: 'storyboard' | 'production' | 'animation' | 'effets' | 'son' | 'blender' | 'web3d' | 'images';
  nom: string;
  auteur: string;
}

/** Libellés d'étape inscrits sur l'image (en anglais, comme tout le texte des montages). */
export const LIBELLES_ETAPE: Record<CarteMontage['etape'], string> = {
  storyboard: 'Storyboard', production: 'Video', animation: 'Motion', effets: 'VFX', son: 'Sound', blender: 'Blender', web3d: '3D web', images: 'Images',
};
export const CARTES_MIN = 3;
export const CARTES_MAX = 12;
/** Pied d'un montage en cartes : d'où viennent les noms, et qui a dessiné. */
export const CREDIT_CARTES = 'Names and authors from each GitHub repository · illustrations: Curation AI';

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
  /** Gabarit `selection` en dossier par étapes : une carte par ressource, à la place des aperçus. */
  cartes?: CarteMontage[];
  /** Mascotte de l'agent (adresse `data:`), dessinée dans chaque carte. */
  mascotte?: string;
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
/** Gabarit `selection` : une grille de 3 à 6 aperçus, chacun nommé (3 depuis le 2026-11-04 : le minimum d’une sélection). */
export const APERCUS_MIN = 3;
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
  if (m.gabarit === 'selection' && (m.cartes ?? []).length > 0) {
    const c = m.cartes!;
    if (c.length < CARTES_MIN || c.length > CARTES_MAX) defauts.push('cartes_hors_limites');
    if (c.some((x) => x.nom.trim().length === 0 || x.nom.length > LONGUEUR_MAX_NOM_APERCU || x.auteur.trim().length === 0)) defauts.push('nom_carte_hors_limites');
    if (!m.mascotte?.startsWith('data:image/')) defauts.push('image_non_locale');
    if ((m.apercus ?? []).length > 0) defauts.push('apercus_et_cartes');
    if (!m.source.includes(CREDIT_CARTES)) defauts.push('credit_absent');
  } else if (m.gabarit === 'selection') {
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

/**
 * Accessoires dessinés de chaque étape, au trait d'encre (viewBox 0 0 200 120) ; deux ou trois variantes par étape, pour que deux
 * ressources voisines d'une même étape ne portent pas la même scène.
 */
const ACCESSOIRES: Record<CarteMontage['etape'], string[]> = {
  storyboard: [
    '<g class="acc"><rect x="62" y="40" width="96" height="58" rx="6" class="plein"/><path d="M62 40 l8 -22 h96 l-8 22 z" class="clair"/><path d="M84 18 l-8 22 M108 18 l-8 22 M132 18 l-8 22 M156 18 l-8 22"/><path d="M76 62 h68 M76 76 h48"/></g>',
    '<g class="acc"><rect x="54" y="20" width="56" height="40" rx="5" class="plein"/><rect x="118" y="20" width="56" height="40" rx="5" class="clair"/><rect x="54" y="68" width="56" height="40" rx="5" class="clair"/><rect x="118" y="68" width="56" height="40" rx="5" class="plein"/><path d="M64 50 l12 -14 l10 10 l8 -6 l10 10 M128 98 l14 -16 l14 16"/><circle cx="160" cy="34" r="5" class="encre"/></g>',
  ],
  production: [
    '<g class="acc"><rect x="58" y="28" width="104" height="70" rx="10" class="plein"/><path d="M58 40 h104 M58 86 h104"/><path d="M66 32 v4 M80 32 v4 M94 32 v4 M108 32 v4 M122 32 v4 M136 32 v4 M150 32 v4 M66 90 v4 M80 90 v4 M94 90 v4 M108 90 v4 M122 90 v4 M136 90 v4 M150 90 v4"/><path d="M100 52 l22 11 l-22 11 z" class="encre"/></g>',
    '<g class="acc"><rect x="62" y="44" width="76" height="52" rx="10" class="plein"/><path d="M138 60 l30 -16 v52 l-30 -16 z" class="clair"/><circle cx="82" cy="30" r="14" class="clair"/><circle cx="116" cy="30" r="14" class="clair"/><circle cx="100" cy="70" r="11" class="encre"/></g>',
    '<g class="acc"><rect x="54" y="20" width="120" height="64" rx="8" class="plein"/><path d="M100 104 h28 M114 84 v20"/><path d="M66 70 h96" class="trait"/><rect x="66" y="64" width="34" height="12" rx="3" class="clair"/><path d="M104 38 l16 9 l-16 9 z" class="encre"/></g>',
    '<g class="acc"><rect x="86" y="10" width="56" height="104" rx="12" class="plein"/><path d="M106 20 h16"/><path d="M104 50 l24 13 l-24 13 z" class="encre"/><path d="M152 30 l6 -6 M158 46 h10 M152 62 l6 6" class="trait"/></g>',
  ],
  animation: [
    '<g class="acc"><path d="M56 96 C 86 96, 92 28, 160 26" class="trait"/><circle cx="56" cy="96" r="9" class="plein"/><circle cx="160" cy="26" r="9" class="plein"/><circle cx="104" cy="58" r="7" class="clair"/><path d="M118 90 l18 0 M126 82 l0 16" /></g>',
    '<g class="acc"><path d="M52 104 h124"/><path d="M66 100 Q 90 20 114 100 Q 132 52 150 100 Q 160 76 170 100" stroke-dasharray="2 12" class="trait"/><circle cx="170" cy="88" r="12" class="plein"/><ellipse cx="170" cy="104" rx="14" ry="4" class="encre"/></g>',
  ],
  effets: [
    '<g class="acc"><path d="M108 18 l9 26 l27 4 l-21 16 l7 27 l-22 -15 l-22 15 l7 -27 l-21 -16 l27 -4 z" class="plein"/><path d="M60 40 l4 10 l10 2 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -2 z" class="clair"/><circle cx="160" cy="92" r="6" class="clair"/></g>',
    '<g class="acc"><circle cx="112" cy="62" r="40" class="plein"/><path d="M80 44 Q 112 30 140 52 M76 70 Q 110 56 148 76 M88 94 Q 114 84 138 96"/><circle cx="98" cy="48" r="8" class="clair"/><path d="M160 22 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 z" class="encre"/></g>',
  ],
  son: [
    '<g class="acc"><path d="M52 60 h10 M70 44 v32 M84 30 v60 M98 48 v24 M112 22 v76 M126 40 v40 M140 52 v16 M154 34 v52 M168 56 v8" class="trait"/></g>',
    '<g class="acc"><path d="M92 86 V30 l60 -12 v56"/><ellipse cx="80" cy="88" rx="14" ry="10" class="encre"/><ellipse cx="140" cy="76" rx="14" ry="10" class="encre"/><path d="M92 42 l60 -12" class="trait"/><path d="M60 40 q-8 10 0 20 M48 34 q-14 16 0 32"/></g>',
  ],
  blender: [
    '<g class="acc"><path d="M100 22 l46 24 v44 l-46 24 l-46 -24 v-44 z" class="plein"/><path d="M54 46 l46 24 l46 -24 M100 70 v44" /><circle cx="100" cy="70" r="7" class="encre"/></g>',
    '<g class="acc"><circle cx="104" cy="64" r="38" class="plein"/><circle cx="104" cy="64" r="20" class="clair"/><circle cx="104" cy="64" r="8" class="encre"/><path d="M70 40 l-22 -16 M64 66 h-28 M74 90 l-20 14"/></g>',
    '<g class="acc"><path d="M66 62 a40 40 0 0 1 74 -22" class="trait"/><path d="M140 22 v20 h-20"/><path d="M146 66 a40 40 0 0 1 -74 22" class="trait"/><path d="M72 106 v-20 h20"/><circle cx="106" cy="64" r="14" class="plein"/></g>',
  ],
  web3d: [
    '<g class="acc"><circle cx="104" cy="62" r="40" class="plein"/><ellipse cx="104" cy="62" rx="40" ry="14"/><ellipse cx="104" cy="62" rx="16" ry="40"/><path d="M64 62 h80"/></g>',
    '<g class="acc"><rect x="56" y="22" width="112" height="80" rx="10" class="plein"/><path d="M56 38 h112"/><circle cx="66" cy="30" r="3" class="encre"/><circle cx="76" cy="30" r="3" class="encre"/><path d="M112 50 l26 14 v24 l-26 14 l-26 -14 v-24 z" class="clair"/><path d="M86 64 l26 14 l26 -14 M112 78 v24"/></g>',
    '<g class="acc"><path d="M70 50 h72 a26 26 0 0 1 0 52 c-12 0 -16 -12 -36 -12 s-24 12 -36 12 a26 26 0 0 1 0 -52 z" class="plein"/><path d="M76 76 h20 M86 66 v20"/><circle cx="130" cy="70" r="5" class="encre"/><circle cx="144" cy="82" r="5" class="encre"/></g>',
  ],
  images: [
    '<g class="acc"><rect x="56" y="24" width="100" height="76" rx="8" class="plein"/><path d="M62 92 l30 -32 l22 22 l14 -12 l22 22" class="trait"/><circle cx="132" cy="44" r="9" class="clair"/></g>',
    '<g class="acc"><path d="M60 92 l52 -26 l52 26 l-52 26 z" class="plein"/><path d="M60 92 v-30 l52 -26 l52 26 v30 M112 66 v52" /><path d="M112 36 v30" /><rect x="96" y="12" width="32" height="22" rx="4" class="clair"/></g>',
  ],
};

/** Grille de cartes d'un dossier : scène dessinée (accessoire + mascotte), étape, nom, auteur. */
function cartesHtml(m: Montage): string {
  const c = m.cartes ?? [];
  const rang = new Map<string, number>();
  return `<ul class="heros cartes" data-nombre="${c.length}">${c
    .map((x, i) => {
      const n = rang.get(x.etape) ?? 0;
      rang.set(x.etape, n + 1);
      return { x, i, accessoire: ACCESSOIRES[x.etape][n % ACCESSOIRES[x.etape].length]! };
    })
    .map(({ x, i, accessoire }) => `<li class="carte-outil" data-etape="${x.etape}"><span class="scene"><svg viewBox="0 0 200 120" aria-hidden="true" style="transform:rotate(${i % 2 ? 2.5 : -2.5}deg)">${accessoire}</svg><img class="mascotte" src="${echapper(m.mascotte ?? '')}" alt=""></span><span class="infos"><span class="etape-outil">${echapper(LIBELLES_ETAPE[x.etape])}</span><span class="nom-outil">${echapper(x.nom)}</span><span class="auteur-outil">${echapper(x.auteur)}</span></span></li>`)
    .join('')}</ul>`;
}

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
      if ((m.cartes ?? []).length > 0) return cartesHtml(m);
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
<h1 class="titre" style="font-size:${(m.cartes ?? []).length > 6 ? Math.min(56, tailleTitre(m.titre, m.gabarit)) : tailleTitre(m.titre, m.gabarit)}px">${echapper(m.titre)}</h1>
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
    ...(m.gabarit === 'selection' ? (m.cartes ?? []).map((x) => `${LIBELLES_ETAPE[x.etape]} : ${x.nom}, par ${x.auteur}`) : []),
    ...(m.gabarit === 'photo_titre' ? [] : m.etiquettes.map((e) => e.texte)),
  ]
    .filter(Boolean)
    .join('. ');
