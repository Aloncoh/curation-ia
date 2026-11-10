// Visuel et mots-clés d'une sélection (complément de l'ADR 0011, 2026-11-02). Le montage est une grille des aperçus
// des sites présentés, chacun avec son nom, au crédit « Captures des sites cités, © leurs auteurs » et à la mention
// d'illustration habituelle. Aucun texte n'est ajouté aux captures ; aucune image n'est générée par un modèle.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { MENTION_ILLUSTRATION } from '../../analysis/publication.ts';
import { normaliserEspaces } from '../../maquette/data.ts';
import { APERCUS_MAX, CARTES_MAX, CREDIT_APERCUS, CREDIT_CARTES, type Montage } from '../../media/montage.ts';
import { normaliser } from '../../recherche/normaliser.ts';
import type { LigneMotCle } from '../mots-cles.ts';
import type { CapturesSelection } from './capture.ts';
import type { EntreeSelection } from './liste.ts';
import type { BrouillonSelection } from './schemas.ts';

export const SURTITRE_SELECTION = 'Selection';
export const SURTITRE_DOSSIER = 'Toolkit';

const JOUR_PARIS = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/Paris' });

export interface ApercuRetenu {
  site: string;
  nom: string;
  fichier: string;
  sha256: string;
  snapshot_id: number;
  capture_le: string;
}

/**
 * Aperçus des ressources de la sélection, dans l'ordre du brouillon. Un aperçu n'est retenu que si son image existe et
 * a toujours l'empreinte enregistrée à la capture. Un site sans aperçu (refusé par le navigateur, par exemple) est
 * simplement absent de la grille, et noté dans `absents` ; une image illisible ou modifiée est un défaut, jamais comblé.
 */
export function apercusDe(b: BrouillonSelection, captures: CapturesSelection): { retenus: ApercuRetenu[]; absents: string[]; defauts: string[] } {
  const retenus: ApercuRetenu[] = [];
  const absents: string[] = [];
  const defauts: string[] = [];
  for (const r of b.ressources) {
    const c = captures.sites.find((x) => x.site.slug === r.site)?.apercu ?? null;
    if (!c) {
      absents.push(r.site);
      continue;
    }
    let meta: { fichier?: unknown; sha256?: unknown; refuse?: unknown };
    try {
      meta = JSON.parse(c.contenu) as typeof meta;
    } catch {
      defauts.push(`apercu_illisible:${r.site}`);
      continue;
    }
    // Dernière tentative refusée (protection anti-robot…) : le site garde sa case, sans image.
    if (meta.refuse === true) {
      absents.push(r.site);
      continue;
    }
    if (typeof meta.fichier !== 'string' || typeof meta.sha256 !== 'string' || !existsSync(meta.fichier)) {
      defauts.push(`apercu_fichier_absent:${r.site}`);
      continue;
    }
    if (createHash('sha256').update(readFileSync(meta.fichier)).digest('hex') !== meta.sha256) {
      defauts.push(`apercu_modifie:${r.site}`);
      continue;
    }
    retenus.push({ site: r.site, nom: r.nom, fichier: meta.fichier, sha256: meta.sha256, snapshot_id: c.snapshotId, capture_le: c.captureLe });
  }
  return { retenus, absents, defauts };
}

/** Pied du montage : crédit des captures et jour de la plus récente (Europe/Paris), espaces insécables dans la date. */
export function piedSelection(apercus: ApercuRetenu[]): string {
  const dernier = apercus.map((a) => a.capture_le).sort().at(-1);
  const jour = dernier ? JOUR_PARIS.format(new Date(dernier)).replace(/ /g, ' ') : null;
  return jour ? `${CREDIT_APERCUS} · captured ${jour}` : CREDIT_APERCUS;
}

/**
 * Montage `selection` : titre = accroche, une case par ressource citée, dans l'ordre du texte, le nom du site sous chaque
 * aperçu. Un site sans aperçu garde sa case, marquée « Aperçu indisponible ». Au-delà de six ressources (sélection du
 * 2026-11-04, dix dépôts), la grille montre les six premières dans l'ordre du texte ; toutes restent dans le texte.
 */
export function composerMontageSelection(b: BrouillonSelection, entree: Pick<EntreeSelection, 'compte'> & Partial<Pick<EntreeSelection, 'sites'>>, apercus: ApercuRetenu[]): Montage {
  // Dossier par étapes (2026-11-10) : des cartes dessinées par nous, une par ressource, au lieu des captures de pages.
  const etapes = new Map((entree.sites ?? []).filter((s) => s.etape).map((s) => [s.slug, s.etape!]));
  const mascotte = `maquette/medias/agents/${entree.compte}.webp`;
  if (etapes.size > 0 && b.ressources.every((r) => etapes.has(r.site)) && existsSync(mascotte)) {
    return {
      id: b.slug, gabarit: 'selection', compte: entree.compte, titre: b.accroche.texte, surtitre: SURTITRE_DOSSIER,
      image: null, apres: null, etiquettes: [], lignes: [], etapes: [], loupe: null,
      cartes: b.ressources.slice(0, CARTES_MAX).map((r) => ({ etape: etapes.get(r.site)!, nom: r.nom, auteur: new URL(r.url).pathname.split('/').filter(Boolean)[0] ?? r.nom })),
      mascotte: `data:image/webp;base64,${readFileSync(mascotte).toString('base64')}`,
      source: CREDIT_CARTES,
      mention: MENTION_ILLUSTRATION,
    };
  }
  const parSite = new Map(apercus.map((a) => [a.site, a]));
  return {
    id: b.slug,
    gabarit: 'selection',
    compte: entree.compte,
    titre: b.accroche.texte,
    surtitre: SURTITRE_SELECTION,
    image: null,
    apres: null,
    etiquettes: [],
    lignes: [],
    etapes: [],
    loupe: null,
    apercus: b.ressources.slice(0, APERCUS_MAX).map((r) => {
      const a = parSite.get(r.site);
      return a
        ? { src: `data:image/jpeg;base64,${readFileSync(a.fichier).toString('base64')}`, nom: r.nom, alt: `Page d’accueil de ${r.nom}, capture d’écran` }
        : { src: null, nom: r.nom, alt: `${r.nom} : aperçu indisponible` };
    }),
    source: piedSelection(apercus.filter((a) => b.ressources.slice(0, APERCUS_MAX).some((r) => r.site === a.site))),
    mention: MENTION_ILLUSTRATION,
  };
}

/**
 * Mots-clés d'une sélection : le nom de la sélection d'abord (il nomme le résultat de recherche), puis, pour chaque
 * ressource citée, son nom, sa catégorie, ses usages (avec leur passage) et ses termes proches (avec leur raison).
 * Un doublon (même champ, même forme normalisée) n'est gardé qu'une fois. Jamais affichés.
 */
export function motsClesSelection(b: BrouillonSelection): LigneMotCle[] {
  const lignes: LigneMotCle[] = [];
  const vus = new Set<string>();
  const ajouter = (champ: LigneMotCle['champ'], terme: string, raison: string | null, passage: string | null) => {
    const t = normaliserEspaces(terme);
    const termeNormalise = normaliser(t);
    const cle = `${champ}\u0000${termeNormalise}`;
    if (!termeNormalise || vus.has(cle)) return;
    vus.add(cle);
    lignes.push({ champ, terme: t, termeNormalise, raison: raison === null ? null : normaliserEspaces(raison), passage });
  };
  ajouter('nom', b.mots_cles.nom, null, null);
  ajouter('categorie', b.mots_cles.categorie, null, null);
  for (const r of b.ressources) {
    ajouter('nom', r.nom, null, null);
    ajouter('categorie', r.categorie, null, null);
    for (const u of r.usages) ajouter('usage', u.texte, null, u.passages.map(normaliserEspaces).find(Boolean) ?? null);
    for (const p of r.termes_proches) ajouter('terme_proche', p.terme, p.raison, null);
  }
  for (const p of b.mots_cles.termes_proches) ajouter('terme_proche', p.terme, p.raison, null);
  return lignes.filter((l) => l.champ !== 'usage' || l.passage !== null);
}
