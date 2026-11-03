// Contrôles déterministes d'une sélection (complément de l'ADR 0011, 2026-11-02). Aucun appel au modèle, jamais un
// second avis du même modèle : ils détectent des écarts, ils ne prouvent pas qu'une affirmation est vraie.
import { z } from 'zod';
import { ESSAI_REVENDIQUE, LONGUEUR_MAX_PASSAGE, moinsDeTroisMots, sensationnel, recopie, type Controle } from '../../analysis/controles.ts';
import { contientMotPourMot, nombresDe, normaliserEspaces } from '../../maquette/data.ts';
import { contientExpression, normaliser } from '../../recherche/normaliser.ts';
import { POPULARITE } from '../../selection/consignes.ts';
import type { ResultatControles } from '../controles.ts';
import { lirePage, type CapturesSelection } from './capture.ts';
import type { EntreeSelection } from './liste.ts';
import { BrouillonSelection, CONSIGNES_SELECTION, LONGUEUR_MAX_EXPLICATION } from './schemas.ts';

/**
 * Gratuité affirmée : « gratuit », « free », « sans frais »… Une telle affirmation n'est gardée que si les passages cités
 * de la même ressource la portent eux-mêmes (donc la capture de la page, mot pour mot).
 */
export const GRATUITE = /(?<![\p{L}\p{N}])(?:gratuit\w*|gratis|free|freebies?|sans frais|offerts?|offertes?|0\s?(?:€|\$|eur|usd))(?![\p{L}\p{N}])/iu;
/** Quantité affirmée avec un chiffre (« 800+ », « 1 000 polices ») : soumise à la même règle que tout nombre. */
export const NOMBRE = /\p{N}/u;

/** Parties citables d'une page capturée, séparées : un passage ne peut pas enjamber le titre et le texte. */
export function partiesDePage(c: Parameters<typeof lirePage>[0]): string[] {
  const p = lirePage(c);
  if (!p) return [];
  return [p.titre, p.description, ...p.texte.split('\n')].filter((x): x is string => Boolean(x)).map(normaliserEspaces).filter(Boolean);
}

/** Les passages soutiennent-ils la gratuité ? Il faut que l'un d'eux la dise. */
const gratuiteSoutenue = (passages: string[]) => passages.some((p) => GRATUITE.test(p));

type Cite = { texte: string; passages: string[] };

export function controlerSelection(brut: unknown, captures: CapturesSelection | null, entree: EntreeSelection | undefined): ResultatControles {
  const bloquants: Controle[] = [];
  const a_verifier: Controle[] = [];
  const parse = BrouillonSelection.safeParse(brut);
  if (!parse.success) return { bloquants: [{ champ: 'brouillon', code: 'schema_invalide', detail: z.prettifyError(parse.error) }], a_verifier };
  const b = parse.data;
  if (!entree || entree.slug !== b.slug) return { bloquants: [{ champ: 'slug', code: 'selection_inconnue', detail: b.slug }], a_verifier };
  if (b.consignes !== CONSIGNES_SELECTION) return { bloquants: [{ champ: 'consignes', code: 'consignes_inconnues', detail: b.consignes }], a_verifier };
  if (!captures || !captures.liste) return { bloquants: [{ champ: 'captures', code: 'capture_absente', detail: entree.slug }], a_verifier };

  const vus = new Set<string>();
  const redige: [string, string][] = [['accroche', b.accroche.texte], ['mots_cles.nom', b.mots_cles.nom]];

  // Accroche : aucune citation exigée (elle annonce la sélection), mais rien qui ne soit soutenu : un nombre ne peut être
  // que celui des ressources listées ; la gratuité doit être soutenue pour chacune d'elles.
  const a = b.accroche.texte;
  for (const n of nombresDe(a)) if (n !== String(b.ressources.length)) bloquants.push({ champ: 'accroche', code: 'nombre_non_soutenu', detail: `${n} (la sélection compte ${b.ressources.length} ressources)` });
  if (GRATUITE.test(a) && !b.ressources.every((r) => gratuiteSoutenue(r.explication.passages))) bloquants.push({ champ: 'accroche', code: 'gratuite_non_prouvee', detail: 'la gratuité n’est pas citée pour chaque ressource' });
  if (a.length > 110 || a.includes('?') || sensationnel(a)) a_verifier.push({ champ: 'accroche', code: 'accroche_non_conforme' });
  if (b.accroche.passages.length > 0) a_verifier.push({ champ: 'accroche', code: 'accroche_citee', detail: 'l’accroche annonce la sélection : ses passages ne sont pas contrôlés, ils doivent rester vides' });

  for (const [i, r] of b.ressources.entries()) {
    const champ = `ressources:${i}`;
    const site = entree.sites.find((s) => s.slug === r.site);
    if (!site) {
      bloquants.push({ champ, code: 'site_inconnu', detail: r.site });
      continue;
    }
    if (vus.has(site.slug)) bloquants.push({ champ, code: 'site_en_double', detail: site.slug });
    vus.add(site.slug);
    const capture = captures.sites.find((x) => x.site.slug === site.slug);
    const parties = partiesDePage(capture?.page ?? null);
    if (parties.length === 0) {
      bloquants.push({ champ, code: 'site_non_capture', detail: `${site.url} : aucune capture lisible de la page ; présenter ce site exigerait une affirmation non soutenue` });
      continue;
    }

    // Lien : URL canonique de la liste, HTTPS, hôte attendu ; le libellé est le nom de la ressource.
    let u: URL | null = null;
    try {
      u = new URL(r.url);
    } catch {
      /* refusé plus bas */
    }
    if (!u || u.protocol !== 'https:' || u.username || u.password || u.port !== '' || u.hostname !== site.hote) bloquants.push({ champ: `${champ}.url`, code: 'lien_hote_inattendu', detail: r.url });
    else if (r.url !== site.url) bloquants.push({ champ: `${champ}.url`, code: 'lien_non_canonique', detail: `${r.url} au lieu de ${site.url}` });
    if (r.nom !== site.nom) bloquants.push({ champ: `${champ}.nom`, code: 'nom_incoherent', detail: `${r.nom} au lieu de ${site.nom}` });
    if (r.libelle_lien !== r.nom) bloquants.push({ champ: `${champ}.libelle_lien`, code: 'libelle_incoherent', detail: `${r.libelle_lien} ≠ ${r.nom}` });

    // Explication : citée mot pour mot dans la capture de cette page, et dans aucune autre.
    const verifierPassages = (ch: string, c: Cite | { texte: string; passages: string[] }, obligatoire: boolean) => {
      if (c.passages.length === 0 && obligatoire) bloquants.push({ champ: ch, code: 'champ_sans_citation' });
      let retrouves = 0;
      for (const brut of c.passages) {
        const p = normaliserEspaces(brut);
        if (parties.some((x) => contientMotPourMot(x, p))) retrouves++;
        else bloquants.push({ champ: ch, code: 'citation_introuvable', detail: p });
        if (moinsDeTroisMots(p)) bloquants.push({ champ: ch, code: 'citation_trop_courte', detail: p });
        if (p.length > LONGUEUR_MAX_PASSAGE) bloquants.push({ champ: ch, code: 'citation_trop_longue', detail: p.slice(0, 60) });
      }
      return retrouves;
    };
    const ex = r.explication;
    verifierPassages(`${champ}.explication`, ex, true);
    const cite = ex.passages.map(normaliserEspaces).join(' ');
    // Chiffres et gratuité : gardés seulement s'ils figurent dans les passages, donc dans la capture.
    for (const n of nombresDe(ex.texte)) if (!nombresDe(cite).includes(n)) bloquants.push({ champ: `${champ}.explication`, code: 'nombre_non_soutenu', detail: n });
    if (GRATUITE.test(ex.texte) && !gratuiteSoutenue(ex.passages)) bloquants.push({ champ: `${champ}.explication`, code: 'gratuite_non_prouvee', detail: ex.texte });
    if (ex.texte.length > LONGUEUR_MAX_EXPLICATION || /\n/.test(ex.texte)) a_verifier.push({ champ: `${champ}.explication`, code: 'explication_trop_longue', detail: `${ex.texte.length} caractères, ${LONGUEUR_MAX_EXPLICATION} au plus, une ligne` });
    if (recopie(ex.texte, parties.join(' '))) a_verifier.push({ champ: `${champ}.explication`, code: 'copie_de_la_source' });
    redige.push([`${champ}.explication`, ex.texte], [`${champ}.categorie`, r.categorie]);

    // Mots-clés du site : un usage cite la page ; une catégorie ne porte ni chiffre ni gratuité ; un terme proche dit pourquoi.
    for (const [j, us] of r.usages.entries()) {
      if (verifierPassages(`${champ}.usages:${j}`, us, false) === 0) bloquants.push({ champ: `${champ}.usages:${j}`, code: 'usage_sans_passage', detail: us.texte });
      redige.push([`${champ}.usages:${j}`, us.texte]);
    }
    for (const [ch, t] of [[`${champ}.categorie`, r.categorie], ...r.usages.map((us, j): [string, string] => [`${champ}.usages:${j}`, us.texte])] as [string, string][]) {
      if (NOMBRE.test(t) || GRATUITE.test(t)) bloquants.push({ champ: ch, code: 'mot_cle_affirmatif', detail: t });
    }
    const ancres = [r.nom, site.hote, r.categorie, ...r.usages.map((x) => x.texte)];
    for (const [j, t] of r.termes_proches.entries()) {
      const ch = `${champ}.termes_proches:${j}`;
      redige.push([ch, t.terme], [`${ch}.raison`, t.raison]);
      if (t.raison.trim().split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length < 4) bloquants.push({ champ: ch, code: 'terme_proche_sans_raison', detail: t.terme });
      else if (!ancres.some((x) => contientExpression(t.raison, x))) bloquants.push({ champ: ch, code: 'terme_proche_non_relie', detail: t.terme });
      if (NOMBRE.test(t.terme) || GRATUITE.test(t.terme)) bloquants.push({ champ: ch, code: 'mot_cle_affirmatif', detail: t.terme });
      if ([r.categorie, ...r.usages.map((x) => x.texte)].some((x) => normaliser(x) === normaliser(t.terme))) a_verifier.push({ champ: ch, code: 'terme_proche_redondant', detail: t.terme });
    }
  }

  // Termes proches de la sélection : reliés au nom, à la catégorie ou à un site.
  const ancresSelection = [b.mots_cles.nom, b.mots_cles.categorie, ...b.ressources.flatMap((r) => [r.nom, r.categorie, ...r.usages.map((x) => x.texte)])];
  for (const [j, t] of b.mots_cles.termes_proches.entries()) {
    const ch = `mots_cles.termes_proches:${j}`;
    redige.push([ch, t.terme], [`${ch}.raison`, t.raison]);
    if (t.raison.trim().split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length < 4) bloquants.push({ champ: ch, code: 'terme_proche_sans_raison', detail: t.terme });
    else if (!ancresSelection.some((x) => contientExpression(t.raison, x))) bloquants.push({ champ: ch, code: 'terme_proche_non_relie', detail: t.terme });
    if (NOMBRE.test(t.terme) || GRATUITE.test(t.terme)) bloquants.push({ champ: ch, code: 'mot_cle_affirmatif', detail: t.terme });
  }

  // Tout texte rédigé : aucun essai revendiqué, aucune popularité invoquée.
  for (const [champ, texte] of redige) {
    if (ESSAI_REVENDIQUE.test(texte)) bloquants.push({ champ, code: 'essai_non_realise' });
    if (POPULARITE.test(texte)) bloquants.push({ champ, code: 'popularite_invoquee' });
  }
  return { bloquants, a_verifier };
}
