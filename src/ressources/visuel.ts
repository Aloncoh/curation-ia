// Visuel d'une publication de ressource (ADR 0011 §4) : un montage composé par le code, sans modèle ni image de tiers.
// Chaque texte vient d'un champ cité du brouillon ; le montage n'ajoute aucune affirmation et ne montre aucun essai.
import { MENTION_ILLUSTRATION } from '../analysis/publication.ts';
import { etiquettesSansAncre, SURTITRE_ETAPES, texteAlternatif, type Gabarit, type Montage } from '../media/montage.ts';
import type { ResultatRendu } from '../media/rendu.ts';
import type { MetadonneesDepot } from './capture.ts';
import type { EntreeRessource } from './liste.ts';
import type { BrouillonRessource } from './schemas.ts';

export const SURTITRE_COMMANDE = 'Reconstitution de la commande citée';
/** Dossier des visuels de ressources, servi par la maquette. */
export const DOSSIER_VISUELS = 'maquette/medias/montages/ressources';

const JOUR_PARIS = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });

/** Pied commun : dépôt canonique, jour de la capture (Europe/Paris) et, pour un fork, son parent. */
export function sourceDuVisuel(m: Pick<MetadonneesDepot, 'full_name' | 'fork' | 'parent'>, captureLe: string): string {
  // Espaces insécables : la date ne se coupe pas en fin de ligne du pied.
  const jour = JOUR_PARIS.format(new Date(captureLe)).replace(/ /g, '\u00a0');
  const fork = m.fork && m.parent ? ` · Fork de ${m.parent.full_name}` : '';
  return `Source : github.com/${m.full_name} · capturé le ${jour}${fork}`;
}

/**
 * Composition choisie par le code : au moins deux étapes citées donnent le gabarit `etapes` ; sinon une commande citée
 * donne `terminal_annote`, une ligne par commande ; sinon les repères deviennent des fiches. Les défauts (étape trop longue,
 * repère absent…) sont relevés par `defautsMontage`, jamais corrigés en silence.
 */
export function composerMontageRessource(
  b: Pick<BrouillonRessource, 'slug' | 'accroche' | 'demarrage' | 'reperes'>,
  entree: Pick<EntreeRessource, 'compte'>,
  m: Pick<MetadonneesDepot, 'full_name' | 'fork' | 'parent'>,
  captureLe: string,
): Montage {
  const commun = {
    id: b.slug,
    compte: entree.compte,
    titre: b.accroche.texte,
    image: null,
    apres: null,
    loupe: null,
    source: sourceDuVisuel(m, captureLe),
    mention: MENTION_ILLUSTRATION,
  };
  if (b.demarrage.etapes.length >= 2) {
    return { ...commun, gabarit: 'etapes', surtitre: SURTITRE_ETAPES, etapes: b.demarrage.etapes.map((e) => e.texte), lignes: [], etiquettes: [] };
  }
  if (b.demarrage.commande !== null) {
    // Une ligne par commande, chacune avec sa propre invite : fondre deux commandes en une seule changerait leur sens.
    // Seule une ligne terminée par « \ » (continuation du shell) se joint à la suivante.
    const lignes = b.demarrage.commande
      .split(/(?<!\\)\n/)
      .map((l) => l.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return { ...commun, gabarit: 'terminal_annote', surtitre: SURTITRE_COMMANDE, lignes, etapes: [], etiquettes: [] };
  }
  return { ...commun, gabarit: 'fiches', surtitre: null, etapes: [], lignes: [], etiquettes: etiquettesSansAncre(b.reperes.map((r) => r.texte)) };
}

/** Contenu de `media_asset` pour un montage rendu ; `alt_text` vient de `texteAlternatif`. */
export interface MediaRessource {
  content: { forme: 'montage'; gabarit: Gabarit; fichier: string; octets: number };
  alt_text: string;
}

export type IssueVisuel = { ok: true; media: MediaRessource } | { ok: false; motif: 'visuel_absent'; defauts: string[] };

export type Rendeur = (montages: Montage[], dossier: string) => Promise<ResultatRendu[]>;

/**
 * Rend le montage par le rendeur donné (Chrome local par défaut). Un rendu impossible ou refusé par un contrôle de mise en
 * page rend `visuel_absent` : la publication passe « à vérifier », sans planification.
 */
export async function produireVisuel(montage: Montage, o: { dossier?: string; rendre?: Rendeur } = {}): Promise<IssueVisuel> {
  const dossier = o.dossier ?? DOSSIER_VISUELS;
  let rendre = o.rendre;
  let resultats: ResultatRendu[];
  try {
    // Chargé à la demande : sans rendu, ce module n'a pas besoin du navigateur.
    rendre ??= (await import('../media/rendu.ts')).rendreMontages;
    resultats = await rendre([montage], dossier);
  } catch (erreur) {
    return { ok: false, motif: 'visuel_absent', defauts: [`rendu_impossible: ${erreur instanceof Error ? erreur.message : String(erreur)}`] };
  }
  const r = resultats.find((x) => x.id === montage.id);
  if (!r) return { ok: false, motif: 'visuel_absent', defauts: ['rendu_absent'] };
  if (r.defauts.length > 0 || r.fichier === null) return { ok: false, motif: 'visuel_absent', defauts: r.defauts.length > 0 ? r.defauts : ['fichier_absent'] };
  return {
    ok: true,
    media: { content: { forme: 'montage', gabarit: montage.gabarit, fichier: r.fichier, octets: r.octets }, alt_text: texteAlternatif(montage) },
  };
}
