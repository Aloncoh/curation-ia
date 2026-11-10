// Publications de sélection pour la maquette (complément de l'ADR 0011, 2026-11-02) : celles qui sont planifiées
// (`en_attente`, aperçu) ou publiées, lues dans les mêmes tables que les ressources. Le texte vient avant le montage ;
// chaque ressource citée garde son nom cliquable vers sa page officielle, seulement si son lien est vérifié et récent.
// Les mots-clés ne sont jamais exposés : ils ne vont que dans les documents de recherche.
import { existsSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';
import type { Client, Transaction } from '@libsql/client';
import { cheminDepot } from '../config.ts';
import { REGLAGES_PAR_DEFAUT } from '../control/settings.ts';
import { textesDePublication } from '../recherche/index.ts';
import type { DocumentRecherche } from '../recherche/moteur.ts';
import { ETIQUETTE_NON_PUBLIE } from '../recherche/rechercher.ts';
import { texteOrigine } from '../ressources/chaine.ts';
import { motsClesDesRevisions } from '../ressources/mots-cles.ts';
import { jourParis } from '../ressources/planification.ts';
import { liensValides } from '../ressources/selection/chaine.ts';
import { SELECTIONS } from '../ressources/selection/liste.ts';
import { CREDIT_CAPTURES, type LienVerifie } from '../ressources/selection/schemas.ts';

interface Cite {
  texte: string;
  passages: string[];
}

export interface ElementMaquette {
  site: string;
  nom: string;
  /** Lien affiché (nom cliquable) seulement s'il est vérifié et récent ; sinon null, et le nom reste du texte. */
  url: string | null;
  libelle_lien: string;
  hote: string;
  /** Étape du dossier, tirée de la liste de la sélection ; null pour une liste simple. */
  etape: string | null;
  explication: Cite;
  lien: { resultat: string; motif: string; verifie_le: string } | null;
}

export interface MaquetteSelection {
  post_id: number;
  revision_id: number;
  slug: string;
  nature: 'selection';
  nom: string;
  compte: string;
  statut: 'en_attente' | 'publie';
  etiquette: string | null;
  planning: { jour: string | null; rang: number | null; etat: string; utilise_reserve: boolean; motif: string | null } | null;
  origine: { code: string; texte: string };
  mention: string;
  /** Texte, avant le montage : l'accroche, puis la liste. L'affichage replié (« Voir plus ») est géré par la page. */
  accroche: Cite;
  ressources: ElementMaquette[];
  visuel: { src: string; alt: string; gabarit: string; mention: string; credit: string; droits_a_verifier: boolean; motif_droits: string | null } | null;
  /** Sites de la liste non retenus, avec leur motif : pour les coulisses, jamais affichés comme ressources. */
  exclus: { site: string; nom: string; url: string; motif: string }[];
  captures: { document: string; snapshot_id: number; capture_le: string }[];
  decouverte_via: string;
  importe_le: string;
}

export interface SelectionNonPlanifiee {
  post_id: number;
  slug: string;
  nom: string;
  statut: string;
  motifs: { code: string; champ: string; detail?: string }[];
}

export interface DonneesSelections {
  selections: MaquetteSelection[];
  selections_non_planifiees: SelectionNonPlanifiee[];
  recherche: DocumentRecherche[];
}

type Lecteur = Client | Transaction;

async function validiteLien(executeur: Lecteur): Promise<number> {
  const r = await executeur.execute({ sql: 'select value from setting where key = ?', args: ['ressources.validite_lien_jours'] });
  const v = r.rows[0] ? Number(r.rows[0].value) : REGLAGES_PAR_DEFAUT['ressources.validite_lien_jours'];
  return Number.isInteger(v) && v >= 0 ? v : REGLAGES_PAR_DEFAUT['ressources.validite_lien_jours'];
}

/** Lien sûr d'un élément : HTTPS, sans identifiants ni port, sur l'hôte vérifié. */
function lienSur(url: unknown, hote: string): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password && u.port === '' && u.hostname === hote ? u.href : null;
  } catch {
    return null;
  }
}

export async function selectionsDeLaMaquette(executeur: Lecteur, generatedAt: string, ids?: readonly number[]): Promise<DonneesSelections> {
  if (ids && ids.length === 0) return { selections: [], selections_non_planifiees: [], recherche: [] };
  const r = await executeur.execute({ args: ids ? [...ids] : [], sql: `
    select p.id, p.status, p.account_id, p.published_at, d.origine, d.model, d.prompt_version, d.checks, d.created_at as importe_le,
      rv.id as revision_id, rv.content, pp.jour, pp.rang, pp.etat, pp.utilise_reserve, pp.motif
    from post p
    join news_item n on n.id = p.news_item_id and n.kind = 'selection'
    join post_draft d on d.news_item_id = p.news_item_id
    join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
    left join publication_planifiee pp on pp.post_id = p.id${ids ? `\n    where p.id in (${ids.map(() => '?').join(', ')})` : ''}
    order by p.id` });
  const validite = await validiteLien(executeur);
  const maintenant = new Date(generatedAt);
  const visibles = r.rows.filter((row) => row.status === 'publie' || (row.status === 'en_attente' && row.etat !== null));
  const motsCles = await motsClesDesRevisions(executeur, visibles.map((row) => Number(row.revision_id)));
  const selections: MaquetteSelection[] = [];
  const nonPlanifiees: SelectionNonPlanifiee[] = [];
  const recherche: DocumentRecherche[] = [];
  for (const row of r.rows) {
    const contenu = JSON.parse(String(row.content)) as Record<string, any>;
    const postId = Number(row.id);
    if (!visibles.includes(row)) {
      const checks = row.checks === null ? [] : (JSON.parse(String(row.checks)) as SelectionNonPlanifiee['motifs']);
      nonPlanifiees.push({ post_id: postId, slug: String(contenu.slug), nom: String(contenu.mots_cles?.nom ?? contenu.slug), statut: String(row.status), motifs: checks.map((c) => ({ code: c.code, champ: c.champ, ...(c.detail ? { detail: c.detail } : {}) })) });
      continue;
    }
    const revisionId = Number(row.revision_id);
    const liens = (Array.isArray(contenu.liens) ? contenu.liens : []) as LienVerifie[];
    const elements: ElementMaquette[] = (contenu.ressources as Record<string, any>[]).map((x) => {
      const lien = liens.find((l) => l.url === x.url) ?? null;
      const hote = lien?.hote ?? '';
      const affichable = lien !== null && liensValides([lien], maintenant, validite) ? lienSur(x.url, hote) : null;
      const etape = SELECTIONS.find((s) => s.slug === String(contenu.slug))?.sites.find((s) => s.slug === String(x.site))?.etape ?? null;
      return { site: String(x.site), nom: String(x.nom), url: affichable, libelle_lien: String(x.libelle_lien), hote, etape, explication: x.explication, lien: lien ? { resultat: lien.resultat, motif: lien.motif, verifie_le: lien.verifie_le } : null };
    });
    const media = await executeur.execute({ sql: 'select alt_text, notice, content from media_asset where post_id = ? order by id desc limit 1', args: [postId] });
    const m = media.rows[0];
    const mc = m?.content ? (JSON.parse(String(m.content)) as { fichier?: string; gabarit?: string; droits_a_verifier?: boolean; motif_droits?: string }) : null;
    const rel = mc?.fichier ? relative('maquette', mc.fichier) : null;
    const servi = rel !== null && rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) && existsSync(cheminDepot(mc!.fichier!));
    const visuel = m && servi
      ? { src: rel!.split(sep).join('/'), alt: String(m.alt_text), gabarit: String(mc!.gabarit), mention: String(m.notice), credit: CREDIT_CAPTURES, droits_a_verifier: mc!.droits_a_verifier !== false, motif_droits: mc!.motif_droits ?? null }
      : null;
    const statut = row.status === 'publie' ? 'publie' : 'en_attente';
    const jour = statut === 'publie' && row.published_at ? jourParis(String(row.published_at)) : row.jour === null ? null : String(row.jour);
    selections.push({
      post_id: postId,
      revision_id: revisionId,
      slug: String(contenu.slug),
      nature: 'selection',
      nom: String(contenu.mots_cles.nom),
      compte: String(row.account_id),
      statut,
      etiquette: statut === 'en_attente' ? ETIQUETTE_NON_PUBLIE : null,
      planning: row.etat === null ? null : { jour: row.jour === null ? null : String(row.jour), rang: row.rang === null ? null : Number(row.rang), etat: String(row.etat), utilise_reserve: Number(row.utilise_reserve) === 1, motif: row.motif === null ? null : String(row.motif) },
      origine: { code: String(row.origine), texte: texteOrigine(String(row.origine), String(row.model), String(row.prompt_version)) },
      mention: contenu.mention,
      accroche: contenu.accroche,
      ressources: elements,
      visuel,
      exclus: Array.isArray(contenu.exclus) ? contenu.exclus : [],
      captures: contenu.captures,
      decouverte_via: contenu.decouverte_via,
      importe_le: String(row.importe_le),
    });
    const mots = (motsCles.get(revisionId) ?? []).map(({ champ, terme, raison, passage }) => ({ champ, terme, raison, passage }));
    recherche.push({ postId, revisionId, jour, motsCles: mots, textes: textesDePublication(contenu) });
  }
  return { selections, selections_non_planifiees: nonPlanifiees, recherche };
}
