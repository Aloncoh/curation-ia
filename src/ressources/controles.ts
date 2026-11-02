// Contrôles déterministes d'un brouillon de ressource (ADR 0011 §3). Aucun appel au modèle, jamais un second avis du
// même modèle. Ils détectent des écarts ; ils ne prouvent pas qu'une affirmation est vraie.
import { z } from 'zod';
import {
  ATTRIBUTION,
  ESSAI_REVENDIQUE,
  LONGUEUR_MAX_PASSAGE,
  LONGUEUR_MAX_REPERE,
  moinsDeTroisMots,
  mots,
  nomsPropres,
  NUANCE_SOURCE,
  NUANCE_TEXTE,
  PERFORMANCE,
  recopie,
  sensationnel,
  type Controle,
} from '../analysis/controles.ts';
import { contientMotPourMot, nombresDe, normaliserEspaces } from '../maquette/data.ts';
import { LONGUEUR_MAX_ETAPE } from '../media/montage.ts';
import { contientExpression, motsNormalises, normaliser } from '../recherche/normaliser.ts';
import { POPULARITE } from '../selection/consignes.ts';
import { MetadonneesDepot, sansLicenceGlobale, texteDeFichier } from './capture.ts';
import type { EntreeRessource } from './liste.ts';
import { BrouillonRessource, CONSIGNES_RESSOURCES, type LibelleBouton } from './schemas.ts';

export type { Controle };

/** Capture stockée d'un document de la ressource (dernière capture de chaque document). */
export interface CaptureRessource {
  /** `external_id` : depot, fichier:<chemin>, dossier:<chemin>. */
  document: string;
  url: string;
  snapshotId: number;
  captureLe: string;
  contenu: string;
  format: string;
}

export interface ResultatControles {
  bloquants: Controle[];
  a_verifier: Controle[];
}

// --- Destination du bouton ----------------------------------------------------------------------------------------

export type Destination = 'depot' | 'installation' | 'telechargement';

export const LIBELLE_DE: Record<Destination, LibelleBouton> = { depot: 'Voir le dépôt', installation: 'Installer', telechargement: 'Télécharger' };

/** Pages d'installation des magasins d'extensions officiels, liste fermée. Vide dans ce lot. */
export const MAGASINS_EXTENSIONS: readonly string[] = [];

const SEGMENT = /^[A-Za-z0-9_.-]+$/;

/**
 * Destination d'une URL, déduite par le code. Un dépôt GitHub n'est jamais « Installer » ; des releases ne sont
 * « Télécharger » que si la capture montre des fichiers joints. Toute autre URL : null (hôte inattendu).
 */
export function destinationDe(url: string, o: { releasesAvecFichiers?: boolean } = {}): Destination | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port !== '' || u.search || u.hash) return null;
  if (MAGASINS_EXTENSIONS.includes(u.hostname)) return 'installation';
  if (u.hostname !== 'github.com') return null;
  const segments = u.pathname.replace(/\/+$/, '').split('/').slice(1);
  const [proprietaire, depot, type] = segments;
  if (!proprietaire || !depot || !SEGMENT.test(proprietaire) || !SEGMENT.test(depot)) return null;
  if (segments.length === 2) return 'depot';
  if (type === 'tree' && segments.length >= 4) return 'depot';
  if (type === 'releases' && o.releasesAvecFichiers) return 'telechargement';
  return null;
}

// --- Parties citables ----------------------------------------------------------------------------------------------

const estFichier = (c: CaptureRessource) => c.document.startsWith('fichier:');

/** Métadonnées du dépôt d'après sa capture ; null si absente ou illisible. */
export function metadonneesDe(captures: CaptureRessource[]): MetadonneesDepot | null {
  const depot = captures.find((c) => c.document === 'depot');
  if (!depot) return null;
  try {
    const r = MetadonneesDepot.safeParse(JSON.parse(depot.contenu));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Parties séparées, pour qu'un passage ne puisse pas enjamber deux documents : texte de chaque fichier, description, sujets. */
export function partiesCitables(captures: CaptureRessource[], m: MetadonneesDepot | null): string[] {
  const parties = captures.filter(estFichier).map((c) => normaliserEspaces(texteDeFichier(c.contenu, c.format)));
  if (m?.description) parties.push(normaliserEspaces(m.description));
  if (m && m.topics.length > 0) parties.push(m.topics.join(' '));
  return parties.filter(Boolean);
}

/** Contenu brut (Markdown, espaces normalisés) : une commande se contrôle ici, car le texte brut perd des signes utiles. */
export const partiesBrutes = (captures: CaptureRessource[]): string[] => captures.filter(estFichier).map((c) => normaliserEspaces(c.contenu));

// --- Contrôles -----------------------------------------------------------------------------------------------------

const COMMANDE_RISQUEE = /\|\s*(?:sh|bash|zsh)\b|\bsudo\s|\brm\s+-rf\b|\bcurl\b[^|]*\|/i;

/**
 * Consignes r2 : aucune formule d'ouverture figée, reprise d'un post à l'autre (« Ce qui le distingue : … » ouvrait 13 des
 * 21 brouillons r1). Cherchée en début de phrase.
 */
export const FORMULE_FIGEE = /(?:^|[.:;]\s+)ce qui (?:le |la |les |l['’]\s?)?(?:distingue|démarque|rend unique)/iu;

/**
 * Consignes r2 : un repère apporte un point distinct des paragraphes affichés (accroche, description, intérêt). Il est
 * jugé redondant quand au moins cette part de ses mots significatifs (normalisés, hors nom de la ressource) y figure déjà.
 */
export const PART_REPERE_REDONDANT = 0.7;

/** Mots significatifs d'un texte : normalisés, sans mots vides, d'au moins trois caractères. */
const motsSignificatifs = (texte: string, exclus: Set<string>) => [...new Set(motsNormalises(texte).filter((x) => x.length >= 3 && !exclus.has(x)))];

/** Le repère redit-il les paragraphes ? Au moins deux mots significatifs, dont la part fixée figure déjà dans le post. */
export function repereRedondant(repere: string, paragraphes: string[], nom: string[]): boolean {
  const exclus = new Set(nom.flatMap((n) => motsNormalises(n)));
  const mr = motsSignificatifs(repere, exclus);
  if (mr.length < 2) return false;
  const post = new Set(paragraphes.flatMap((p) => motsNormalises(p)));
  return mr.filter((x) => post.has(x)).length / mr.length >= PART_REPERE_REDONDANT;
}

type Cite = { texte: string; passages: string[] };

export function controlerRessource(brut: unknown, captures: CaptureRessource[], metadonnees: MetadonneesDepot | null, entree: EntreeRessource | undefined): ResultatControles {
  const bloquants: Controle[] = [];
  const a_verifier: Controle[] = [];
  const parse = BrouillonRessource.safeParse(brut);
  if (!parse.success) return { bloquants: [{ champ: 'brouillon', code: 'schema_invalide', detail: z.prettifyError(parse.error) }], a_verifier };
  const b = parse.data;
  if (!entree || entree.slug !== b.slug) return { bloquants: [{ champ: 'slug', code: 'slug_inconnu', detail: b.slug }], a_verifier };
  if (b.consignes !== CONSIGNES_RESSOURCES) return { bloquants: [{ champ: 'consignes', code: 'consignes_inconnues', detail: b.consignes }], a_verifier };
  const m = metadonnees;
  if (!m || !captures.some(estFichier)) return { bloquants: [{ champ: 'captures', code: 'capture_absente', detail: entree.depot }], a_verifier };

  const parties = partiesCitables(captures, m);
  const brutes = partiesBrutes(captures);
  const texteSource = parties.join(' ');
  const trouve = (passage: string) => parties.some((p) => contientMotPourMot(p, passage));

  // Textes rédigés, chacun avec ses passages.
  const prose: [string, Cite][] = [
    ['accroche', b.accroche],
    ['description', b.description],
    ['interet', b.interet],
    ['exemple_usage', b.exemple_usage],
    ...b.demarrage.etapes.map((c, i): [string, Cite] => [`demarrage.etapes:${i}`, c]),
    ...b.compatibilites.map((c, i): [string, Cite] => [`compatibilites:${i}`, c]),
    ...b.limites.map((c, i): [string, Cite] => [`limites:${i}`, c]),
    ...(b.licence_locale ? [['licence_locale', b.licence_locale] as [string, Cite]] : []),
    ...b.reperes.map((c, i): [string, Cite] => [`reperes:${i}`, c]),
  ];
  const technologies = b.mots_cles.technologies.map((c, i): [string, Cite] => [`mots_cles.technologies:${i}`, c]);

  const passagesValides = (champ: string, passages: string[], sansCitation: string | null) => {
    if (passages.length === 0 && sansCitation) bloquants.push({ champ, code: sansCitation });
    let retrouves = 0;
    for (const brut of passages) {
      const p = normaliserEspaces(brut);
      if (trouve(p)) retrouves++;
      else bloquants.push({ champ, code: 'citation_introuvable', detail: p });
      if (moinsDeTroisMots(p)) bloquants.push({ champ, code: 'citation_trop_courte', detail: p });
      if (p.length > LONGUEUR_MAX_PASSAGE) bloquants.push({ champ, code: 'citation_trop_longue', detail: p.slice(0, 60) });
    }
    return retrouves;
  };
  for (const [champ, c] of [...prose, ...technologies]) passagesValides(champ, c.passages, 'champ_sans_citation');
  passagesValides('demarrage', b.demarrage.passages, 'champ_sans_citation');
  for (const [i, u] of b.mots_cles.usages.entries()) {
    if (passagesValides(`mots_cles.usages:${i}`, u.passages, null) === 0) bloquants.push({ champ: `mots_cles.usages:${i}`, code: 'usage_sans_passage', detail: u.texte });
  }

  // Commande : mot pour mot dans le contenu brut, sinon rien ne s'affiche.
  const commande = b.demarrage.commande;
  if (commande !== null) {
    const c = normaliserEspaces(commande);
    if (!brutes.some((p) => contientMotPourMot(p, c))) bloquants.push({ champ: 'demarrage.commande', code: 'commande_introuvable', detail: c });
    if (COMMANDE_RISQUEE.test(c)) a_verifier.push({ champ: 'demarrage.commande', code: 'commande_risquee', detail: c });
  }

  // Tout texte rédigé, mots-clés compris : aucun essai revendiqué, aucune popularité invoquée.
  const redige: [string, string][] = [
    ...prose.map(([champ, c]): [string, string] => [champ, c.texte]),
    ['mots_cles.nom', b.mots_cles.nom],
    ...b.mots_cles.usages.map((u, i): [string, string] => [`mots_cles.usages:${i}`, u.texte]),
    ...technologies.map(([champ, c]): [string, string] => [champ, c.texte]),
    ...b.mots_cles.termes_proches.flatMap((t, i): [string, string][] => [[`mots_cles.termes_proches:${i}`, t.terme], [`mots_cles.termes_proches:${i}.raison`, t.raison]]),
  ];
  for (const [champ, texte] of redige) {
    if (ESSAI_REVENDIQUE.test(texte)) bloquants.push({ champ, code: 'essai_non_realise' });
    if (POPULARITE.test(texte)) bloquants.push({ champ, code: 'popularite_invoquee' });
  }

  // Bouton : destination et libellé déduits par le code, URL canonique tirée des captures.
  const destination = destinationDe(b.bouton.url);
  if (destination === null) bloquants.push({ champ: 'bouton.url', code: 'bouton_hote_inattendu', detail: b.bouton.url });
  else {
    if (LIBELLE_DE[destination] !== b.bouton.libelle) bloquants.push({ champ: 'bouton.libelle', code: 'bouton_libelle_incoherent', detail: `${b.bouton.libelle} → ${LIBELLE_DE[destination]}` });
    const canoniques = new Set([m.html_url, ...captures.filter((c) => c.document.startsWith('dossier:')).map((c) => c.url)]);
    if (!canoniques.has(b.bouton.url)) bloquants.push({ champ: 'bouton.url', code: 'bouton_url_non_canonique', detail: b.bouton.url });
  }

  const egal = (a: string, x: string) => a.trim().toLowerCase() === x.trim().toLowerCase();
  if (!egal(b.mots_cles.nom, entree.nom) && !egal(b.mots_cles.nom, m.full_name)) bloquants.push({ champ: 'mots_cles.nom', code: 'nom_incoherent', detail: b.mots_cles.nom });

  // Mots-clés : une technologie se retrouve dans les captures ; un terme proche dit pourquoi il est relié.
  const sourceNormalisee = [...parties, ...brutes].join(' ');
  for (const [champ, c] of technologies) if (!contientExpression(sourceNormalisee, c.texte)) bloquants.push({ champ, code: 'technologie_introuvable', detail: c.texte });
  const usages = b.mots_cles.usages.map((u) => u.texte);
  const techs = b.mots_cles.technologies.map((t) => t.texte);
  const ancres = [b.mots_cles.nom, entree.nom, entree.depot.split('/')[1]!, b.mots_cles.categorie, ...usages, ...techs];
  for (const [i, t] of b.mots_cles.termes_proches.entries()) {
    const champ = `mots_cles.termes_proches:${i}`;
    if (t.raison.trim().split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length < 4) bloquants.push({ champ, code: 'terme_proche_sans_raison', detail: t.terme });
    else if (!ancres.some((a) => contientExpression(t.raison, a))) bloquants.push({ champ, code: 'terme_proche_non_relie', detail: t.terme });
    if (/^\p{Lu}/u.test(t.terme.trim()) && !contientExpression(sourceNormalisee, t.terme)) bloquants.push({ champ, code: 'terme_proche_nom_absent', detail: t.terme });
    if ([...usages, ...techs].some((x) => normaliser(x) === normaliser(t.terme))) a_verifier.push({ champ, code: 'terme_proche_redondant', detail: t.terme });
  }

  if (m.fork && !m.parent) bloquants.push({ champ: 'etat_depot', code: 'fork_sans_parent', detail: m.full_name });

  // À vérifier : contrôles repris de l'existant, à comportement constant.
  const a = b.accroche.texte;
  const nommes = [entree.nom, b.mots_cles.nom, entree.depot.split('/')[1]!, entree.slug.replace(/-/g, ' ')];
  if (a.length > 110 || a.includes('?') || sensationnel(a)) a_verifier.push({ champ: 'accroche', code: 'accroche_non_conforme' });
  if (!nommes.some((n) => contientExpression(a, n))) a_verifier.push({ champ: 'accroche', code: 'accroche_non_conforme', detail: 'ressource non nommée' });
  const nomsConnus = new Set([...nommes, m.full_name].flatMap((n) => mots(n.replace(/\//g, ' '))));
  for (const [champ, c] of prose) {
    const passages = c.passages.map(normaliserEspaces);
    const cite = passages.join(' ');
    if (recopie(c.texte, texteSource)) a_verifier.push({ champ, code: 'copie_de_la_source' });
    for (const n of nombresDe(c.texte)) if (!nombresDe(cite).includes(n)) a_verifier.push({ champ, code: 'nombre_absent_des_citations', detail: n });
    for (const nom of nomsPropres(c.texte)) if (!cite.includes(nom) && !nomsConnus.has(nom.toLowerCase())) a_verifier.push({ champ, code: 'soutien_nom_absent', detail: nom });
    for (const p of passages) {
      // Le contexte se lit dans le document où le passage figure : une réserve d'un autre fichier ne le concerne pas.
      const partie = parties.find((x) => contientMotPourMot(x, p)) ?? texteSource;
      const i = partie.indexOf(p);
      const autour = i < 0 ? p : partie.slice(Math.max(0, i - 120), i + p.length + 120);
      if (NUANCE_SOURCE.test(autour) && !NUANCE_TEXTE.test(c.texte)) a_verifier.push({ champ, code: 'contexte_a_relire', detail: p });
    }
    if (PERFORMANCE.test(c.texte) && !ATTRIBUTION.test(c.texte)) a_verifier.push({ champ, code: 'benchmark_non_attribue' });
  }
  // Consignes r2 : pas d'ouverture figée ; des repères qui ajoutent un point au lieu de redire le post.
  const paragraphes: [string, string][] = [['accroche', b.accroche.texte], ['description', b.description.texte], ['interet', b.interet.texte]];
  for (const [champ, texte] of paragraphes) if (FORMULE_FIGEE.test(texte)) a_verifier.push({ champ, code: 'formule_figee', detail: texte.slice(0, 40) });
  for (const [i, r] of b.reperes.entries()) {
    if (r.texte.length > LONGUEUR_MAX_REPERE) a_verifier.push({ champ: `reperes:${i}`, code: 'repere_trop_long' });
    if (sensationnel(r.texte)) a_verifier.push({ champ: `reperes:${i}`, code: 'diapositive_sensationnelle' });
    if (repereRedondant(r.texte, paragraphes.map(([, t]) => t), nommes)) a_verifier.push({ champ: `reperes:${i}`, code: 'repere_redondant', detail: r.texte });
  }
  for (const [i, e] of b.demarrage.etapes.entries()) if (sensationnel(e.texte)) a_verifier.push({ champ: `demarrage.etapes:${i}`, code: 'diapositive_sensationnelle' });
  // Deux étapes ou plus deviennent le visuel `etapes` (src/ressources/visuel.ts) : chacune doit tenir dans sa case.
  // Signalé ici, avant l'import, plutôt qu'au rendu (`visuel_absent`).
  if (b.demarrage.etapes.length >= 2) {
    for (const [i, e] of b.demarrage.etapes.entries()) {
      if (e.texte.length > LONGUEUR_MAX_ETAPE) a_verifier.push({ champ: `demarrage.etapes:${i}`, code: 'etape_trop_longue', detail: `${e.texte.length} caractères, ${LONGUEUR_MAX_ETAPE} au plus` });
    }
  }

  const licenceCapturee = captures.some((c) => /^fichier:.+\/LICENSE(?:\.txt|\.md)?$/.test(c.document));
  if (sansLicenceGlobale(m) && licenceCapturee && b.licence_locale === null) a_verifier.push({ champ: 'licence_locale', code: 'licence_locale_absente' });

  if (m.fork) {
    const proprietaire = m.parent?.full_name.split('/')[0]?.toLowerCase() ?? null;
    const textes = [b.description.texte, ...b.limites.map((l) => l.texte)].map((t) => t.toLowerCase());
    if (!textes.some((t) => /(?<![\p{L}\p{N}])fork(?![\p{L}\p{N}])/u.test(t) || (proprietaire !== null && t.includes(proprietaire)))) a_verifier.push({ champ: 'description', code: 'fork_non_mentionne' });
  }
  return { bloquants, a_verifier };
}
