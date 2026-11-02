// Bouton vers la ressource officielle (ADR 0011 §6). Le libellé se déduit de la destination réelle ; le lien se vérifie
// par l'API GitHub, la méthode d'accès documentée, jamais en lisant les pages HTML de github.com (robots.txt).
// Une requête sûre (safeGet) : HTTPS, adresses vérifiées, aucune redirection, délai et taille maximum. Aucun jeton.
// Rien ne s'installe au clic : le bouton est un simple lien, la commande un texte.
import { GITHUB_API_HEADERS } from '../collect/github-releases.ts';
import { safeGet, SafeFetchError, type FetchPolicy, type Resolver, type Transport } from '../collect/safe-fetch.ts';
import { DELAI_MS, lireDepot, lireDossier, TAILLE_MAX, urlApiDepot, urlApiDossier, type MetadonneesDepot } from './capture.ts';
import { destinationDe, LIBELLE_DE, metadonneesDe, type CaptureRessource, type Destination } from './controles.ts';
import type { LibelleBouton } from './schemas.ts';

/** Seul l'API est interrogée pour vérifier un lien ; raw.githubusercontent.com ne dit rien d'une page de dépôt. */
export const HOTES_LIENS = ['api.github.com'] as const;
/** Une capture `depot` ou `dossier:` plus récente vaut vérification : aucune requête n'est relancée. */
export const FRAICHEUR_CAPTURE_HEURES = 24;
export const MENTION_COMMANDE = 'Commande citée de la documentation, non exécutée par la plateforme';

export type MotifEchec =
  | 'hote_inattendu'
  | 'verification_non_prevue'
  | 'depot_inconnu'
  | 'url_non_canonique'
  | 'redirection'
  | 'introuvable'
  | 'quota_epuise'
  | 'reponse_inattendue'
  | 'adresse_interdite'
  | 'delai_depasse'
  | 'trop_volumineux'
  | 'reseau';

/** Une vérification datée, telle qu'elle s'écrit dans `post_bouton` : une ligne par vérification, l'historique reste. */
export interface VerificationBouton {
  libelle: LibelleBouton;
  destination: Destination;
  url: string;
  hote: string;
  /** Adresse réellement interrogée (ou dont vient la capture qui tient lieu de vérification). */
  url_controle: string | null;
  statut_http: number | null;
  resultat: 'verifie' | 'echec';
  /** `capture_recente`, `reponse_api` ou le motif de l'échec. */
  motif: string;
  /** Capture qui prouve le lien, quand une capture récente a servi. */
  snapshot_id: number | null;
  verifie_le: string;
}

/** Échec sans destination connue : aucune ligne `post_bouton` ne peut l'enregistrer (contrainte de cohérence). */
export interface RefusBouton {
  url: string;
  resultat: 'refuse';
  motif: 'hote_inattendu';
  verifie_le: string;
}

/** Libellé déduit par le code de la destination réelle ; null pour une URL hors liste. Un dépôt n'est jamais « Installer ». */
export function libelleDe(url: string, o: { releasesAvecFichiers?: boolean } = {}): { destination: Destination; libelle: LibelleBouton } | null {
  const destination = destinationDe(url, o);
  return destination === null ? null : { destination, libelle: LIBELLE_DE[destination] };
}

/**
 * Cible API d'un lien GitHub : le dépôt (`GET /repos/{o}/{r}`) ou le dossier (`GET /repos/{o}/{r}/contents/<chemin>?ref=`).
 * Le dossier se lit à partir du dépôt canonique capturé, pour qu'une branche contenant « / » ne soit pas mal découpée.
 */
export function cibleApi(url: string, m: MetadonneesDepot): { type: 'depot' } | { type: 'dossier'; chemin: string } | null {
  if (url === m.html_url) return { type: 'depot' };
  const prefixe = `${m.html_url}/tree/${m.default_branch}/`;
  if (!url.startsWith(prefixe)) return null;
  const chemin = url.slice(prefixe.length);
  // Forme canonique seulement : ni barre finale, ni segment vide, ni « . » ou « .. ».
  if (!chemin || chemin.split('/').some((s) => s === '' || s === '.' || s === '..')) return null;
  return { type: 'dossier', chemin };
}

/** Capture `depot` ou `dossier:` réussie, issue d'une collecte réelle et récente, dont l'adresse est exactement celle du bouton. */
function captureQuiVerifie(url: string, cible: NonNullable<ReturnType<typeof cibleApi>>, captures: CaptureLien[], maintenant: Date): CaptureLien | null {
  const document = cible.type === 'depot' ? 'depot' : `dossier:${cible.chemin}`;
  const c = captures.find((x) => x.document === document);
  // Origine inconnue ou fixture : seule une collecte réelle tient lieu de vérification.
  if (!c || c.mode !== 'live') return null;
  const age = maintenant.getTime() - Date.parse(c.captureLe);
  if (!(age >= 0 && age <= FRAICHEUR_CAPTURE_HEURES * 3_600_000)) return null;
  try {
    const html = (JSON.parse(c.contenu) as { html_url?: unknown }).html_url;
    return html === url && c.url === url ? c : null;
  } catch {
    return null;
  }
}

/** Capture stockée ; `mode` (live | fixture) vient de l'exécution qui l'a produite : seule une capture `live` vérifie un lien. */
export type CaptureLien = CaptureRessource & { mode?: string | null };

export interface OptionsVerification {
  captures: CaptureLien[];
  userAgent: string;
  horloge?: () => Date;
  transport?: Transport;
  resolve?: Resolver;
}

/**
 * Vérifie le bouton d'une publication. Verte seulement si la réponse est un 200 sans redirection et désigne exactement
 * l'URL du bouton : `html_url` pour un dépôt ; pour un dossier, dont la réponse est une liste sans adresse propre, une
 * liste non vide dont chaque entrée est dans ce dossier. Un dépôt renommé répond 301 : refusé, l'URL canonique s'impose.
 */
export async function verifierBouton(url: string, o: OptionsVerification): Promise<VerificationBouton | RefusBouton> {
  const maintenant = (o.horloge ?? (() => new Date()))();
  const verifie_le = maintenant.toISOString();
  const deduit = libelleDe(url);
  if (deduit === null) return { url, resultat: 'refuse', motif: 'hote_inattendu', verifie_le };
  const hote = new URL(url).hostname;
  const ligne = (r: Partial<VerificationBouton> & Pick<VerificationBouton, 'resultat' | 'motif'>): VerificationBouton => ({
    ...deduit,
    url,
    hote,
    url_controle: null,
    statut_http: null,
    snapshot_id: null,
    verifie_le,
    ...r,
  });
  // Liste des magasins vide, releases sans fichiers capturés : aucune méthode de vérification n'existe dans ce lot.
  if (deduit.destination !== 'depot') return ligne({ resultat: 'echec', motif: 'verification_non_prevue' });

  const m = metadonneesDe(o.captures);
  if (!m) return ligne({ resultat: 'echec', motif: 'depot_inconnu' });
  const cible = cibleApi(url, m);
  if (!cible) return ligne({ resultat: 'echec', motif: 'url_non_canonique' });
  const urlControle = cible.type === 'depot' ? urlApiDepot(m.full_name) : urlApiDossier(m, cible.chemin);

  const recente = captureQuiVerifie(url, cible, o.captures, maintenant);
  if (recente) return ligne({ resultat: 'verifie', motif: 'capture_recente', url_controle: urlControle, snapshot_id: recente.snapshotId });

  const politique: FetchPolicy = { allowedHosts: HOTES_LIENS, timeoutMs: DELAI_MS, maxBytes: TAILLE_MAX };
  let corps: string;
  let statut: number;
  try {
    const reponse = await safeGet(urlControle, politique, { ...GITHUB_API_HEADERS, 'user-agent': o.userAgent }, {
      ...(o.transport ? { transport: o.transport } : {}),
      ...(o.resolve ? { resolve: o.resolve } : {}),
    });
    corps = reponse.body.toString('utf8');
    statut = reponse.status;
  } catch (erreur) {
    const s = erreur instanceof SafeFetchError ? (erreur.status ?? null) : null;
    const kind = erreur instanceof SafeFetchError ? erreur.kind : null;
    const motif: MotifEchec =
      kind === 'redirect' ? 'redirection'
      : s === 404 ? 'introuvable'
      : s === 403 || s === 429 ? 'quota_epuise'
      : kind === 'forbidden_address' ? 'adresse_interdite'
      : kind === 'timeout' ? 'delai_depasse'
      : kind === 'too_large' ? 'trop_volumineux'
      : 'reseau';
    return ligne({ resultat: 'echec', motif, url_controle: urlControle, statut_http: s });
  }
  // safeGet n'accepte que 2xx ; seul un 200 porte le contenu attendu.
  if (statut !== 200) return ligne({ resultat: 'echec', motif: 'reponse_inattendue', url_controle: urlControle, statut_http: statut });
  try {
    if (cible.type === 'depot') {
      const lu = lireDepot(corps, m.full_name);
      if (lu.html_url !== url) return ligne({ resultat: 'echec', motif: 'url_non_canonique', url_controle: urlControle, statut_http: statut });
    } else if (lireDossier(corps, m, cible.chemin).length === 0) {
      return ligne({ resultat: 'echec', motif: 'reponse_inattendue', url_controle: urlControle, statut_http: statut });
    }
  } catch {
    return ligne({ resultat: 'echec', motif: 'reponse_inattendue', url_controle: urlControle, statut_http: statut });
  }
  return ligne({ resultat: 'verifie', motif: 'reponse_api', url_controle: urlControle, statut_http: statut });
}

/**
 * Bouton affichable d'après l'historique : la vérification la plus récente doit être verte et dater de moins de
 * `validiteJours` (réglage `ressources.validite_lien_jours`). Un échec plus récent retire le bouton.
 */
export function boutonAffichable<T extends Pick<VerificationBouton, 'resultat' | 'verifie_le'>>(historique: T[], maintenant: Date, validiteJours: number): T | null {
  const derniere = [...historique].sort((a, b) => b.verifie_le.localeCompare(a.verifie_le))[0];
  if (!derniere || derniere.resultat !== 'verifie') return null;
  const age = maintenant.getTime() - Date.parse(derniere.verifie_le);
  return age >= 0 && age < validiteJours * 86_400_000 ? derniere : null;
}

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Nom accessible : il dit où mène le lien et qu'il s'ouvre dans un nouvel onglet. */
export const nomAccessible = (libelle: LibelleBouton, fullName: string): string =>
  libelle === 'Voir le dépôt' ? `Voir le dépôt ${fullName} sur GitHub (nouvel onglet)` : `${libelle} ${fullName} (nouvel onglet)`;

/** Lien HTML du bouton : nouvel onglet, sans référent ni accès à la page d'origine, sans `download` ni script. */
export function htmlBouton(b: Pick<VerificationBouton, 'libelle' | 'url'>, fullName: string): string {
  return `<a class="bouton-ressource" href="${echapper(b.url)}" target="_blank" rel="noopener noreferrer" aria-label="${echapper(nomAccessible(b.libelle, fullName))}">${echapper(b.libelle)}</a>`;
}

/** Commande citée, affichée en texte avec sa mention : jamais un lien, jamais exécutée. */
export const htmlCommande = (commande: string): string =>
  `<figure class="commande-citee"><pre><code>${echapper(commande)}</code></pre><figcaption>${MENTION_COMMANDE}</figcaption></figure>`;
