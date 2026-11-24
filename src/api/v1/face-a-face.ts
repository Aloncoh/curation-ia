// Face à face (demande de l'utilisateur, « Oui, construis-la ») : deux publications de nouveaux modèles lues côte à
// côte, d'après nos propres fiches. Rien n'est ajouté ni mesuré : chaque côté reprend ce que sa source dit (ce qui
// change, accès, coût, limites, résultats rapportés par un auteur nommé), et une ligne que la source ne renseigne pas
// reste vide (« Non renseigné »). Aucun verdict, aucun classement.
//
// Quels modèles sont rapprochés — une règle écrite ici, sans appel à un modèle : une publication visible dont la
// révision courante a la nature « nouveau_modele », avec le plus proche modèle annoncé avant elle, de la même famille
// (texte, audio, visuel), d'un autre éditeur et d'un autre nom, à 120 jours d'écart au plus. La famille et l'éditeur
// sont déduits (catégories, mots du titre, adresse de la source) : une déduction, pas une donnée vérifiée.
import type { Client } from '@libsql/client';
import type { CoteFaceAFace, FaceAFace, Langue, Publication, ResumeFaceAFace } from '../../../packages/contrat/src/index.ts';
import { champsDeLaFiche, partieServable } from '../../traduction/champs.ts';
import { sectionsDe } from './fiche.ts';
import { lienSur, lireTraductions, publicationsParIds, visibles, type Contexte, type Mode, type TraductionLue } from './publications.ts';

export type Famille = 'texte' | 'audio' | 'visuel';

export const ECART_MAX_JOURS = 120;
const JOUR_MS = 86_400_000;

const AUDIO = /\b(voice|speech|audio|text-to-speech|speech-to-text|tts|sound effects?|music)\b/i;

/** Famille d'un modèle : ses catégories d'abord, puis son nom et son accroche pour la voix ; à défaut, texte. */
export function familleDe(m: { categories: readonly string[]; produit: string; accroche: string }): Famille {
  if (m.categories.includes('audio et musique') || AUDIO.test(`${m.produit} ${m.accroche}`)) return 'audio';
  if (m.categories.includes('création visuelle')) return 'visuel';
  return 'texte';
}

/** Adresses différentes d'un même éditeur. */
const MEMES_EDITEURS: Record<string, string> = {
  'google.com': 'google', 'google.dev': 'google', 'deepmind.com': 'google',
  'claude.com': 'anthropic.com', 'claude.ai': 'anthropic.com', 'fb.com': 'meta.com', 'facebook.com': 'meta.com',
};
/** Hébergeurs partagés : l'éditeur est le compte, pas l'hôte. */
const HEBERGEURS = new Set(['github.com', 'gitlab.com', 'huggingface.co']);

/** Éditeur déduit de l'adresse de la source citée ; sans adresse lisible, la source elle-même. */
export function editeurDe(url: string | null, source: string): string {
  let u: URL;
  try {
    u = new URL(url ?? '');
  } catch {
    return `source:${source}`;
  }
  const hote = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!hote) return `source:${source}`;
  if (HEBERGEURS.has(hote)) {
    const compte = u.pathname.split('/').filter(Boolean)[0];
    return compte ? `${hote}/${compte.toLowerCase()}` : hote;
  }
  const parties = hote.split('.');
  // `.google` est le domaine de Google (blog.google, deepmind.google) : un seul éditeur.
  if (parties.at(-1) === 'google') return 'google';
  // Pages hébergées (acme.github.io) : le sous-domaine nomme l'éditeur.
  const base = parties.slice(hote.endsWith('.github.io') ? -3 : -2).join('.');
  return MEMES_EDITEURS[base] ?? base;
}

const nomSimple = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
/** Même produit, ou variante du même nom (« Clairic » et « Clairic-flash ») : pas un face à face. */
function memeProduit(a: string, b: string): boolean {
  const [x, y] = [nomSimple(a), nomSimple(b)];
  return x.startsWith(y) || y.startsWith(x);
}

interface Candidat {
  id: number;
  produit: string;
  famille: Famille;
  editeur: string;
  /** Date qui ordonne les modèles : celle de l'annonce, sinon celle où la source a été vue. */
  ms: number;
  annonceLe: string | null;
  url: string | null;
}

/** Publications visibles de nouveaux modèles ; `seulement` : ces identifiants, sans parcourir toutes les publications. */
async function lireCandidats(client: Client, mode: Mode, seulement: readonly number[] | null): Promise<Candidat[]> {
  const r = await client.execute({
    sql: `select p.id, json_extract(rv.content, '$.produit') as produit, json_extract(rv.content, '$.categories') as categories,
            json_extract(rv.content, '$.accroche.texte') as accroche, n.announced_at, n.first_seen_at, d.url, d.source_id
          from post p
          join news_item n on n.id = p.news_item_id and n.kind in ('annonce', 'version')
          join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
          left join publication_planifiee pp on pp.post_id = p.id
          left join post_source ps on ps.revision_id = rv.id
          left join source_document d on d.id = ps.document_id
          where ${visibles(mode)} and json_extract(rv.content, '$.nature') = 'nouveau_modele'${seulement ? ` and p.id in (${seulement.map(() => '?').join(', ')})` : ''}
          order by p.id, ps.id`,
    args: seulement ? [...seulement] : [],
  });
  const candidats = new Map<number, Candidat>();
  for (const row of r.rows) {
    const id = Number(row.id);
    // Une révision qui cite plusieurs documents donne plusieurs lignes : le premier document cité fait foi.
    if (candidats.has(id) || typeof row.produit !== 'string' || row.produit.trim() === '') continue;
    const ms = Date.parse(String(row.announced_at ?? row.first_seen_at));
    if (Number.isNaN(ms)) continue;
    let categories: unknown = [];
    try {
      categories = JSON.parse(String(row.categories ?? '[]'));
    } catch {
      // catégories illisibles : le nom et l'accroche décident seuls
    }
    const url = row.url === null ? null : String(row.url);
    candidats.set(id, {
      id,
      produit: row.produit.trim(),
      famille: familleDe({ categories: Array.isArray(categories) ? categories.map(String) : [], produit: row.produit, accroche: typeof row.accroche === 'string' ? row.accroche : '' }),
      editeur: editeurDe(url, String(row.source_id ?? '')),
      ms,
      annonceLe: row.announced_at === null ? null : String(row.announced_at),
      url: lienSur(url),
    });
  }
  return [...candidats.values()];
}

const avant = (a: Candidat, b: Candidat) => a.ms < b.ms || (a.ms === b.ms && a.id < b.id);

/** `ancien` peut-il faire face à `recent` ? */
function rapprochables(recent: Candidat, ancien: Candidat): boolean {
  return (
    avant(ancien, recent) &&
    recent.famille === ancien.famille &&
    recent.editeur !== ancien.editeur &&
    !memeProduit(recent.produit, ancien.produit) &&
    recent.ms - ancien.ms <= ECART_MAX_JOURS * JOUR_MS
  );
}

/** Les face à face visibles, du modèle le plus récent au plus ancien : au plus un par modèle, avec son plus proche prédécesseur. */
export async function pairesVisibles(ctx: Contexte): Promise<ResumeFaceAFace[]> {
  const candidats = (await lireCandidats(ctx.client, ctx.mode, null)).sort((a, b) => (avant(a, b) ? 1 : -1));
  const paires: ResumeFaceAFace[] = [];
  candidats.forEach((recent, i) => {
    const ancien = candidats.slice(i + 1).find((c) => rapprochables(recent, c));
    if (ancien) paires.push({ paire: `${recent.id}-${ancien.id}`, cotes: [{ id: recent.id, produit: recent.produit, url: recent.url }, { id: ancien.id, produit: ancien.produit, url: ancien.url }] });
  });
  return paires;
}

function cote(langue: Langue, publication: Publication, c: Candidat, contenu: Record<string, unknown>, traduction: TraductionLue | undefined): CoteFaceAFace {
  const champs = champsDeLaFiche('actualite', contenu);
  // Même règle que la fiche : traduite seulement si chacun de ses champs l'est, sans écart.
  const traduite = langue !== 'en' && traduction !== undefined && partieServable(champs, traduction.champs, traduction.ecarts);
  const sections = new Map(sectionsDe(champs, traduite ? traduction.champs : {}, contenu).map((s) => [s.id, s.elements]));
  return {
    publication,
    produit: c.produit,
    annonce_le: c.annonceLe,
    langue: traduite ? langue : 'en',
    traduction: traduite ? { langue, origine: traduction.origine, modele: traduction.modele, cree_le: traduction.cree_le } : null,
    lignes: {
      nouveaute: sections.get('nouveaute') ?? null,
      acces: sections.get('acces') ?? null,
      cout: sections.get('cout') ?? null,
      limites_connues: sections.get('limites_connues') ?? null,
    },
    rapportes: sections.get('attributions') ?? [],
  };
}

/**
 * Le face à face de deux publications, la plus récente d'abord ; null si l'une n'est pas visible ou si elles ne sont pas
 * rapprochables (ordre inverse, familles différentes, même éditeur, même produit, plus de 120 jours d'écart).
 */
export async function faceAFaceParIds(ctx: Contexte, a: number, b: number): Promise<FaceAFace | null> {
  if (![a, b].every((x) => Number.isInteger(x) && x > 0) || a === b) return null;
  const candidats = await lireCandidats(ctx.client, ctx.mode, [a, b]);
  const recent = candidats.find((c) => c.id === a);
  const ancien = candidats.find((c) => c.id === b);
  if (!recent || !ancien || !rapprochables(recent, ancien)) return null;
  const publications = await publicationsParIds(ctx, [a, b]);
  if (publications.length !== 2 || publications.some((p) => p.nature !== 'actualite')) return null;
  const revisions = publications.map((p) => p.revision_id);
  const [contenus, traductions] = await Promise.all([
    ctx.client.execute({ sql: 'select id, content from post_revision where id in (?, ?)', args: revisions }),
    lireTraductions(ctx.client, ctx.langue, revisions),
  ]);
  const parRevision = new Map(contenus.rows.map((r) => [Number(r.id), JSON.parse(String(r.content)) as Record<string, unknown>]));
  const [un, deux] = publications.map((p, i) => cote(ctx.langue, p, i === 0 ? recent : ancien, parRevision.get(p.revision_id) ?? {}, traductions.get(p.revision_id)));
  return { paire: `${a}-${b}`, cotes: [un!, deux!] };
}
