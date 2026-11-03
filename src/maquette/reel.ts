// Reel d'exemple de la maquette (P2) : une vidéo verticale « hébergée par la plateforme », générée par le code.
// Fonctions pures (testées sans ffmpeg) : choix des segments, mise en page du texte, sous-titres WebVTT.
// Chaque segment reprend tel quel le texte d'un champ vérifié de l'exemple : la vidéo n'ajoute aucune affirmation
// (SPEC §7.3) et porte la mention « Illustration — ne prouve pas le fonctionnement » (SPEC §7.8).
import { LIBELLES, type MaquetteExemple } from './data.ts';
import type { Diapositive } from './exemples.ts';

export interface SegmentReel {
  champ: Diapositive;
  libelle: string;
  texte: string;
}

export interface SousTitre {
  debut: number;
  fin: number;
  texte: string;
}

export const MENTION_ILLUSTRATION = 'Illustration — ne prouve pas le fonctionnement';
export const MENTION_ANALYSE = 'Analyse IA à partir des sources — non testé par la plateforme';
/** Mentions dessinées sur la vidéo, en anglais comme tout le texte des images (2026-11-03) ; le manifeste garde les mentions de référence. */
export const MENTIONS_DESSINEES = ['Illustration — not proof that it works', 'AI analysis from the sources — not tested by the platform'] as const;

/** Tous les textes dessinés dans la vidéo : la commande n'en dessine aucun autre, le manifeste les enregistre. */
export interface TextesDessines {
  entete: string;
  titre: string;
  mentions: string[];
  source: string;
  segments: { libelle: string; corps: string }[];
}

/** Date d'annonce affichée (heure de Paris), ou « date non renseignée ». */
export const dateAnnonceFr = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
    : 'date non renseignée';

/** Date d'annonce dessinée sur la vidéo, en anglais (heure de Paris). */
export const dateAnnonceEn = (iso: string | null): string =>
  iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : 'date not given';

export function textesDessines(exemple: MaquetteExemple, segments: SegmentReel[]): TextesDessines {
  return {
    entete: 'EXAMPLE — MOCKUP',
    titre: exemple.titre_media,
    mentions: [...MENTIONS_DESSINEES],
    source: `Synthetic voice — Source: ${exemple.actualite.source.name.split(' — ')[0]}, ${dateAnnonceEn(exemple.actualite.announced_at)}`,
    segments: segments.map((segment) => ({ libelle: segment.libelle, corps: segment.texte })),
  };
}

/** Texte dessiné sur l'image d'un segment (drawtext) : contenu, taille, couleur, alignement, position, fondu. */
export interface ElementDessine {
  nom: string;
  texte: string;
  taille: number;
  couleur: 'lueur' | 'lavande' | 'pied';
  x: 'gauche' | 'droite' | 'centre';
  y: number;
  interligne?: number;
  /** Retard du fondu d'apparition, en secondes. */
  apparition?: number;
}

/**
 * Plan de dessin du segment `i` (image 720 × 1280) : tous les textes de l'image, et rien d'autre. Chaque mention de
 * `textes.mentions` y figure par construction ; la commande ne fait qu'exécuter ce plan.
 */
export function planDessin(textes: TextesDessines, i: number): ElementDessine[] {
  const segment = textes.segments[i];
  if (!segment) throw new Error(`Segment ${i} absent`);
  const libelle = envelopper(segment.libelle, 34);
  const yCorps = 268 + libelle.length * 40 + 22;
  // Le corps s'arrête au-dessus de la mascotte (anneau en haut à 948 px, ±6 px d'oscillation).
  const corps = mettreEnPage(segment.corps, 920 - yCorps);
  const yMentions = 1162;
  return [
    { nom: 'entete', texte: textes.entete, taille: 24, couleur: 'lavande', x: 'gauche', y: 64 },
    { nom: 'compteur', texte: `${i + 1}/${textes.segments.length}`, taille: 24, couleur: 'pied', x: 'droite', y: 64 },
    { nom: 'titre', texte: textes.titre, taille: 68, couleur: 'lueur', x: 'gauche', y: 112 },
    { nom: 'libelle', texte: libelle.join('\n'), taille: 32, couleur: 'lavande', x: 'gauche', y: 268, interligne: 8, apparition: 0.1 },
    { nom: 'corps', texte: corps.lignes.join('\n'), taille: corps.taille, couleur: 'lueur', x: 'gauche', y: yCorps, interligne: corps.interligne, apparition: 0.3 },
    ...textes.mentions.map((mention, k): ElementDessine => ({
      nom: `mention${k}`,
      texte: mention,
      taille: k === 0 ? 24 : 19,
      couleur: 'lueur',
      x: 'centre',
      y: yMentions + 36 * k,
    })),
    { nom: 'source', texte: textes.source, taille: 19, couleur: 'pied', x: 'centre', y: yMentions + 36 * (textes.mentions.length - 1) + 30 },
  ];
}

/** Champs repris par le Reel de l'exemple Copilot Fusion, dans l'ordre. */
export const CHAMPS_DU_REEL: Diapositive[] = ['accroche', 'nouveaute', 'details:0', 'limites_connues'];

/** Segments du Reel : le texte exact de chaque champ demandé ; refuse un exemple non vérifié ou un champ vide. */
export function segmentsDuReel(exemple: MaquetteExemple, champs: Diapositive[] = CHAMPS_DU_REEL): SegmentReel[] {
  if (exemple.statut !== 'verifie') throw new Error(`Exemple ${exemple.id} « à vérifier » : pas de Reel (${exemple.motifs.join(', ')})`);
  return champs.map((champ) => {
    if (champ.startsWith('details:')) {
      const detail = exemple.details[Number(champ.slice('details:'.length))];
      if (!detail) throw new Error(`Champ absent de l'exemple ${exemple.id} : ${champ}`);
      return { champ, libelle: detail.titre, texte: detail.texte };
    }
    const cle = champ as keyof typeof LIBELLES;
    const valeur = exemple[cle];
    if (!valeur) throw new Error(`Champ non renseigné dans l'exemple ${exemple.id} : ${champ}`);
    return { champ, libelle: LIBELLES[cle], texte: valeur.texte };
  });
}

/**
 * Mots du texte, la ponctuation double française (; : ! ? ») restant collée au mot qui la précède et « au mot
 * qui le suit, pour qu'aucune ligne ne commence par « ; » ni ne finisse par « « ».
 */
export function mots(texte: string): string[] {
  const resultat: string[] = [];
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const precedent = resultat.at(-1);
    if (precedent !== undefined && (/^[;:!?»]/u.test(mot) || precedent === '«')) resultat[resultat.length - 1] = `${precedent} ${mot}`;
    else resultat.push(mot);
  }
  return resultat;
}

/** Retour à la ligne glouton à `largeur` caractères au plus ; un mot plus long reste seul sur sa ligne. */
export function envelopper(texte: string, largeur: number): string[] {
  const lignes: string[] = [];
  for (const mot of mots(texte)) {
    const courante = lignes.at(-1);
    if (courante !== undefined && courante.length + 1 + mot.length <= largeur) lignes[lignes.length - 1] = `${courante} ${mot}`;
    else lignes.push(mot);
  }
  return lignes;
}

/** Largeur utile du texte (720 px moins deux marges de 48 px). */
export const LARGEUR_TEXTE = 624;
/** Mesures approchées d'Arial Rounded Bold, relevées sur une image rendue : chasse moyenne et hauteur de ligne. */
const CHASSE = 0.56;
const HAUTEUR_LIGNE = 1.15;

/**
 * Plus grande taille de corps (46 à 30 px) dont le texte tient en largeur et en hauteur ; `interligne` est
 * l'espace ajouté entre deux lignes (option line_spacing de drawtext).
 */
export function mettreEnPage(texte: string, hauteurDisponible: number): { taille: number; interligne: number; lignes: string[] } {
  for (const taille of [46, 42, 38, 34, 30]) {
    const interligne = Math.round(taille * 0.3);
    const lignes = envelopper(texte, Math.floor(LARGEUR_TEXTE / (CHASSE * taille)));
    const hauteur = (lignes.length - 1) * (HAUTEUR_LIGNE * taille + interligne) + HAUTEUR_LIGNE * taille;
    if (hauteur <= hauteurDisponible) return { taille, interligne, lignes };
  }
  throw new Error(`Texte trop long pour une diapositive du Reel (${texte.length} caractères)`);
}

/**
 * Découpe un texte en sous-titres d'au plus `maxCaracteres` (environ deux lignes de lecture), en coupant de préférence
 * après une ponctuation (. ; : ,) située dans la seconde moitié du morceau, sinon entre deux mots.
 */
export function decouperEnSousTitres(texte: string, maxCaracteres = 70): string[] {
  const morceaux: string[] = [];
  let courant: string[] = [];
  const longueur = (liste: string[]) => liste.join(' ').length;
  for (const mot of mots(texte)) {
    if (courant.length > 0 && longueur([...courant, mot]) > maxCaracteres) {
      let coupe = courant.length;
      for (let i = courant.length - 1; i > 0; i--) {
        if (/[.;:,]$/u.test(courant[i - 1]!) && longueur(courant.slice(0, i)) >= maxCaracteres / 2) {
          coupe = i;
          break;
        }
      }
      morceaux.push(courant.slice(0, coupe).join(' '));
      courant = courant.slice(coupe);
    }
    courant.push(mot);
  }
  if (courant.length > 0) morceaux.push(courant.join(' '));
  return morceaux;
}

/** Sous-titres d'un segment : durée de parole répartie au prorata du nombre de caractères de chaque morceau. */
export function minuterSousTitres(segments: { texte: string; debut: number; dureeParole: number }[]): SousTitre[] {
  const sousTitres: SousTitre[] = [];
  for (const segment of segments) {
    const morceaux = decouperEnSousTitres(segment.texte);
    const total = morceaux.reduce((somme, morceau) => somme + morceau.length, 0);
    let debut = segment.debut;
    for (const morceau of morceaux) {
      const fin = debut + (segment.dureeParole * morceau.length) / total;
      sousTitres.push({ debut: arrondir(debut), fin: arrondir(fin), texte: morceau });
      debut = fin;
    }
  }
  return sousTitres;
}

const arrondir = (secondes: number) => Math.round(secondes * 1000) / 1000;

/** Horodatage WebVTT : hh:mm:ss.mmm. */
export function horodatage(secondes: number): string {
  const millis = Math.round(secondes * 1000);
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(Math.floor(millis / 3_600_000))}:${pad(Math.floor(millis / 60_000) % 60)}:${pad(Math.floor(millis / 1000) % 60)}.${pad(millis % 1000, 3)}`;
}

/**
 * Fichier WebVTT (MDN : en-tête « WEBVTT », une ligne vide entre les blocs), lignes de 37 caractères au plus.
 * `reglages` : réglages de position ajoutés à chaque bloc (ex. « line:76% »), pour ne pas masquer les mentions du bas.
 */
export function versWebVTT(sousTitres: SousTitre[], reglages = ''): string {
  const suffixe = reglages ? ` ${reglages}` : '';
  const blocs = sousTitres.map(
    (st, i) => `${i + 1}\n${horodatage(st.debut)} --> ${horodatage(st.fin)}${suffixe}\n${envelopper(st.texte, 37).join('\n')}`,
  );
  return `WEBVTT\n\n${blocs.join('\n\n')}\n`;
}
