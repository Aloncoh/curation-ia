/// <reference lib="dom" />
// Rendu des montages en images, par un navigateur local sans réseau. Le code contrôle la mise en page réelle : un texte
// qui déborde ou deux étiquettes qui se chevauchent refusent l'image au lieu de la publier abîmée.
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import { COMPTES } from '../maquette/exemples.ts';
import { defautsMontage, htmlMontage, type Montage } from './montage.ts';
import { FORMAT } from './style.ts';

const racine = (chemin: string) => fileURLToPath(new URL(`../../${chemin}`, import.meta.url));
const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

/** Image locale en adresse `data:` : le rendu ne dépend d'aucune ressource distante. */
export function imageLocale(chemin: string): string {
  const type = TYPES[chemin.split('.').pop()!.toLowerCase()];
  if (!type) throw new Error(`Format d'image non pris en charge : ${chemin}`);
  return `data:${type};base64,${readFileSync(racine(chemin)).toString('base64')}`;
}

const police = (famille: string, fichier: string, poids: string) =>
  `@font-face{font-family:'${famille}';src:url(data:font/woff2;base64,${readFileSync(racine(fichier)).toString('base64')}) format('woff2');font-weight:${poids};font-display:block}`;

const polices = () => [
  police('Recursive', 'node_modules/@fontsource-variable/recursive/files/recursive-latin-full-normal.woff2', '300 1000'),
  police('Atkinson', 'node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2', '200 800'),
].join('');

const DELAI_RENDU_MS = 15_000;
/** Hauteur minimale de la zone principale : en dessous, le titre a mangé le visuel. */
const HEROS_MIN = 420;
/** Une image détourée peut mordre sur le titre : c'est l'effet cherché, tant qu'elle ne cache pas une ligne. */
const CHEVAUCHEMENT_TITRE_MAX = 40;
/**
 * Pied : trois lignes au plus (24 px, interligne 1,2, marges comprises). La troisième sert au crédit d'un fork
 * (« Fork de <parent> », ADR 0011 §4) ; un contenu recouvert reste refusé par les contrôles de zone, qui partent du haut du pied.
 */
const PIED_HAUTEUR_MAX = 125;

export interface ControleMiseEnPage {
  hauteur_heros: number;
  titre_deborde: boolean;
  texte_deborde: boolean;
  etiquette_hors_cadre: boolean;
  etiquettes_chevauchees: boolean;
  etiquette_sur_commande: boolean;
  fiches_hors_zone: boolean;
  /** Gabarit `etapes` : une case ou une flèche sort de la zone entre le titre et le pied. */
  etapes_hors_zone: boolean;
  /** Le surtitre passe à la ligne : l'en-tête n'a plus sa hauteur d'une ligne. */
  surtitre_coupe: boolean;
  image_illisible: boolean;
  image_sur_titre: boolean;
  pied_deborde: boolean;
}

const mesurer = (page: Page): Promise<ControleMiseEnPage> =>
  page.evaluate(({ largeur, hauteur, limiteTitre, limitePied }) => {
    const boite = (selecteur: string) => document.querySelector(selecteur)!.getBoundingClientRect();
    const etiquettes = [...document.querySelectorAll('.etiquette, .carte figcaption')].map((e) => e.getBoundingClientRect());
    const commandes = [...document.querySelectorAll('.ligne')].map((l) => l.getBoundingClientRect());
    const pied = boite('.pied');
    const titre = document.querySelector<HTMLElement>('.titre')!;
    const basTitre = titre.getBoundingClientRect().bottom;
    const secants = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const textes = [...document.querySelectorAll<HTMLElement>('.etiquette, .fiche, .papier, .etape')];
    const fiches = [...document.querySelectorAll('.fiche')].map((f) => f.getBoundingClientRect());
    const etapes = [...document.querySelectorAll('.etape, .fleche')].map((f) => f.getBoundingClientRect());
    const surtitre = document.querySelector<HTMLElement>('.surtitre');
    const hors = (b: DOMRect) => b.left < 0 || b.right > largeur || b.top < basTitre || b.bottom > pied.top;
    const decoupe = document.querySelector('.decoupe')?.getBoundingClientRect();
    return {
      hauteur_heros: Math.round(boite('.heros').height),
      titre_deborde: titre.scrollWidth > titre.clientWidth + 1,
      texte_deborde: textes.some((t) => t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1),
      etiquette_hors_cadre: etiquettes.some((e) => e.left < 0 || e.right > largeur || e.top < 0 || e.bottom > pied.top),
      etiquettes_chevauchees: etiquettes.some((a, i) => etiquettes.slice(i + 1).some((b) => secants(a, b))),
      etiquette_sur_commande: etiquettes.some((e) => commandes.some((c) => secants(e, c))),
      fiches_hors_zone: fiches.some(hors),
      etapes_hors_zone: etapes.some(hors),
      surtitre_coupe: surtitre !== null && surtitre.getBoundingClientRect().height > parseFloat(getComputedStyle(surtitre).lineHeight) * 1.5,
      image_illisible: [...document.images].some((i) => i.naturalWidth === 0),
      image_sur_titre: decoupe !== undefined && basTitre - decoupe.top > limiteTitre,
      pied_deborde: pied.height > limitePied || pied.bottom > hauteur + 1,
    };
  }, { ...FORMAT, limiteTitre: CHEVAUCHEMENT_TITRE_MAX, limitePied: PIED_HAUTEUR_MAX });

export const defautsMiseEnPage = (c: ControleMiseEnPage): string[] => [
  ...(c.hauteur_heros < HEROS_MIN ? ['titre_trop_long'] : []),
  ...(c.titre_deborde ? ['titre_deborde'] : []),
  ...(c.texte_deborde ? ['texte_deborde'] : []),
  ...(c.etiquette_hors_cadre ? ['etiquette_hors_cadre'] : []),
  ...(c.etiquettes_chevauchees ? ['etiquettes_chevauchees'] : []),
  ...(c.etiquette_sur_commande ? ['etiquette_sur_commande'] : []),
  ...(c.fiches_hors_zone ? ['fiches_hors_zone'] : []),
  ...(c.etapes_hors_zone ? ['etapes_hors_zone'] : []),
  ...(c.surtitre_coupe ? ['surtitre_coupe'] : []),
  ...(c.image_illisible ? ['image_illisible'] : []),
  ...(c.image_sur_titre ? ['image_sur_titre'] : []),
  ...(c.pied_deborde ? ['pied_deborde'] : []),
];

export interface ResultatRendu {
  id: string;
  fichier: string | null;
  defauts: string[];
  duree_ms: number;
  octets: number;
}

/** Aucun appel réseau : `route` refuse tout. Un montage refusé retire l'image d'une exécution précédente, devenue fausse. */
export async function rendreMontages(montages: Montage[], dossier: string): Promise<ResultatRendu[]> {
  mkdirSync(dossier, { recursive: true });
  const navigateur = await chromium.launch({ channel: process.env.CURATION_CHROME ?? 'chrome', headless: true });
  const contexte = await navigateur.newContext({ viewport: { width: FORMAT.largeur, height: FORMAT.hauteur }, deviceScaleFactor: 1, javaScriptEnabled: true });
  const page = await contexte.newPage();
  await page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));
  const styles = polices();
  const resultats: ResultatRendu[] = [];
  try {
    for (const m of montages) {
      const defauts = defautsMontage(m);
      const fichier = join(dossier, `${m.id}.jpg`);
      if (defauts.length > 0) {
        // Un identifiant invalide ne désigne aucun fichier sûr à retirer.
        if (!defauts.includes('identifiant_invalide')) rmSync(fichier, { force: true });
        resultats.push({ id: m.id, fichier: null, defauts, duree_ms: 0, octets: 0 });
        continue;
      }
      const compte = COMPTES.find((c) => c.id === m.compte)!;
      const debut = performance.now();
      // Une image qui bloque le rendu refuse ce montage seul : le lot continue.
      try {
        await page.setContent(htmlMontage(m, { avatar: imageLocale(`assets/brand/${compte.avatar}`), polices: styles, nomCompte: compte.nom }), { waitUntil: 'domcontentloaded', timeout: DELAI_RENDU_MS });
        await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => undefined))]));
        const miseEnPage = defautsMiseEnPage(await mesurer(page));
        if (miseEnPage.length > 0) {
          rmSync(fichier, { force: true });
          resultats.push({ id: m.id, fichier: null, defauts: miseEnPage, duree_ms: Math.round(performance.now() - debut), octets: 0 });
          continue;
        }
        await page.screenshot({ path: fichier, type: 'jpeg', quality: 86, timeout: DELAI_RENDU_MS });
      } catch {
        rmSync(fichier, { force: true });
        resultats.push({ id: m.id, fichier: null, defauts: ['rendu_impossible'], duree_ms: Math.round(performance.now() - debut), octets: 0 });
        continue;
      }
      resultats.push({ id: m.id, fichier, defauts: [], duree_ms: Math.round(performance.now() - debut), octets: statSync(fichier).size });
    }
  } finally {
    await navigateur.close();
  }
  return resultats;
}
