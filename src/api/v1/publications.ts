// Publications de l'API v1 (ADR 0010, ADR 0012) : le fil paginé par curseur, une publication, et leur forme commune
// (packages/contrat). Les lectures reprennent celles de la maquette (src/maquette/*.ts), limitées aux publications de
// la page. Mode `public` : seulement `publie` ; mode `apercu` (avant P5) : aussi `en_attente` planifiées.
// Tout texte vient de la base et reste une donnée : le site l'insère comme texte, jamais comme HTML, et seuls les liens
// https sûrs deviennent cliquables (ADR 0003).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Client } from '@libsql/client';
import { racineDepot } from '../../config.ts';
import { fondDe } from './fonds.ts';
import { lireValidite } from './validite.ts';
import type { Bloc, Bouton, Compte, Langue, Media, Publication, Sources } from '../../../packages/contrat/src/index.ts';
import { textesDe } from '../../../packages/textes/src/index.ts';
import { actualitesDeLaMaquette, type MaquetteActualite } from '../../maquette/actualites.ts';
import { ressourcesDeLaMaquette, type MaquetteRessource } from '../../maquette/ressources.ts';
import { selectionsDeLaMaquette, type MaquetteSelection } from '../../maquette/selections.ts';
import { RequeteInvalide } from '../../recherche/rechercher.ts';
import { avecAlias, champsDuPost, partieServable, type Champ, type Nature } from '../../traduction/champs.ts';

export type Mode = 'public' | 'apercu';

export interface Contexte {
  client: Client;
  mode: Mode;
  langue: Langue;
  /** Date de lecture : validité des boutons vérifiés. Par défaut, maintenant. */
  maintenant?: string;
}

export const TAILLE_PAGE = 20;
export const TAILLE_PAGE_MAX = 50;
/** Texte inscrit sur les montages de sélection : il fait partie de l'image, donc reste en anglais. */
const CREDIT_IMAGE = 'Screenshots of the cited sites, © their authors';

// ——— Liens : https seulement, sans identifiants ; le reste devient du texte. ———

export function lienSur(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

/** Adresse courte : hôte et deux premiers segments (github.com/mattpocock/skills). */
export function cibleCourte(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return `${u.hostname.replace(/^www\./, '')}${segments.length ? `/${segments.slice(0, 2).join('/')}` : ''}${segments.length > 2 ? '/…' : ''}`;
  } catch {
    return '';
  }
}

// ——— Curseur : clé de tri et identifiant de la dernière publication de la page. ———

function encoderCurseur(cle: string, id: number): string {
  return Buffer.from(JSON.stringify([cle, id])).toString('base64url');
}

export function decoderCurseur(curseur: string): { cle: string; id: number } {
  try {
    const [cle, id] = JSON.parse(Buffer.from(curseur, 'base64url').toString('utf8')) as unknown[];
    if (typeof cle === 'string' && cle.length <= 40 && Number.isInteger(id) && (id as number) > 0) return { cle, id: id as number };
  } catch {
    // curseur illisible : refusé ci-dessous
  }
  throw new RequeteInvalide('Curseur invalide.');
}

export function limiteValide(limite: unknown): number {
  if (limite === undefined || limite === null || limite === '') return TAILLE_PAGE;
  const n = Number(limite);
  if (!Number.isInteger(n) || n < 1 || n > TAILLE_PAGE_MAX) throw new RequeteInvalide(`La limite doit être un entier entre 1 et ${TAILLE_PAGE_MAX}.`);
  return n;
}

const visibles = (mode: Mode) => (mode === 'public' ? `p.status = 'publie'` : `(p.status = 'publie' or (p.status = 'en_attente' and pp.post_id is not null))`);

/**
 * Version dépassée (2026-11-05, « le site ne donne pas envie ») : le fil principal s'ouvrait sur Claude Code 2.1.309,
 * déjà remplacé par 2.1.318, suivi de ce dernier. Une publication de version est retirée du fil principal quand une
 * version stable plus récente du même produit est publiée ; elle reste sur le profil de l'agent, dans l'historique et
 * à son adresse, avec l'avis « remplacée par ». « Plus récente » : annoncée plus tard (date de la source, sinon
 * première vue), comme l'ordre des versions publiées par une même source.
 */
const REMPLACEE = `select 1 from news_item_target t
    join product_version pv on pv.id = t.product_version_id and pv.is_prerelease = 0
    join news_item_target t2 on t2.product_id = t.product_id and t2.news_item_id <> t.news_item_id
    join product_version pv2 on pv2.id = t2.product_version_id and pv2.is_prerelease = 0
    join news_item n2 on n2.id = t2.news_item_id
    join post p2 on p2.news_item_id = t2.news_item_id and p2.status = 'publie'
    where t.news_item_id = p.news_item_id
      and coalesce(n2.announced_at, n2.first_seen_at) > coalesce(n.announced_at, n.first_seen_at)`;

/**
 * Identifiants d'une page du fil, sans charger le reste. Ordre : les publiées, de la plus récente à la plus ancienne,
 * puis (aperçu) les planifiées dans l'ordre du planning (jour Europe/Paris, rang), puis les reportées.
 */
export async function idsDuFil(client: Client, mode: Mode, o: { curseur?: string | null; limite?: number; compte?: string | null } = {}): Promise<{ ids: number[]; curseur_suivant: string | null }> {
  const limite = o.limite ?? TAILLE_PAGE;
  const apres = o.curseur ? decoderCurseur(o.curseur) : null;
  const r = await client.execute({
    sql: `select id, cle from (
            select p.id,
              case when p.status = 'publie' then '0' || printf('%012d', 99999999999 - cast(strftime('%s', p.published_at) as integer))
                   when pp.etat <> 'reportee' then '1' || pp.jour || printf('%05d', pp.rang)
                   else '2' end as cle
            from post p
            join news_item n on n.id = p.news_item_id and n.kind in ('annonce', 'version', 'decouverte', 'selection')
            left join publication_planifiee pp on pp.post_id = p.id
            where ${visibles(mode)} and (? is null or p.account_id = ?)
              and (? is not null or not exists (${REMPLACEE}))
          ) where ? is null or cle > ? or (cle = ? and id > ?)
          order by cle, id limit ?`,
    args: [o.compte ?? null, o.compte ?? null, o.compte ?? null, apres?.cle ?? null, apres?.cle ?? null, apres?.cle ?? null, apres?.id ?? null, limite + 1],
  });
  const lignes = r.rows.slice(0, limite);
  const dernier = lignes[lignes.length - 1];
  return { ids: lignes.map((x) => Number(x.id)), curseur_suivant: r.rows.length > limite && dernier ? encoderCurseur(String(dernier.cle), Number(dernier.id)) : null };
}

// ——— Comptes ———

export async function lireComptes(client: Client, langue: Langue): Promise<Map<string, Compte>> {
  const t = textesDe(langue);
  const r = await client.execute('select id, handle, display_name, type, avatar, bio, specialty from account order by id');
  return new Map(r.rows.map((row) => {
    const id = String(row.id);
    const traduit = t.comptes[id];
    return [id, {
      id,
      identifiant: String(row.handle),
      nom: String(row.display_name),
      type: row.type === 'human' ? 'human' : 'agent',
      avatar: `/marque/${String(row.avatar)}`,
      bio: traduit?.bio ?? String(row.bio),
      specialite: traduit?.specialite ?? String(row.specialty),
    } satisfies Compte];
  }));
}

// ——— Traductions ———

export interface TraductionLue {
  champs: Record<string, string>;
  /** Champs en écart : leur partie (post, fiche, texte alternatif) n'est pas servie traduite. */
  ecarts: Set<string>;
  origine: 'machine' | 'humaine';
  modele: string | null;
  cree_le: string;
}

export async function lireTraductions(client: Client, langue: Langue, revisions: number[]): Promise<Map<number, TraductionLue>> {
  if (langue === 'en' || revisions.length === 0) return new Map();
  const r = await client.execute({
    sql: `select revision_id, champs, statut, ecarts, origine, modele, created_at from post_traduction
          where langue = ? and revision_id in (${revisions.map(() => '?').join(', ')})`,
    args: [langue, ...revisions],
  });
  return new Map(r.rows.map((row) => {
    const champs = JSON.parse(String(row.champs)) as Record<string, string>;
    const liste = row.ecarts === null ? null : (JSON.parse(String(row.ecarts)) as { cle?: unknown }[]);
    // Un écart sans détail rend toute la traduction inutilisable.
    const ecarts = new Set(Array.isArray(liste) ? liste.map((e) => String(e.cle)) : row.statut === 'ecart' ? Object.keys(champs) : []);
    return [Number(row.revision_id), {
    champs,
    ecarts,
    origine: row.origine === 'humaine' ? 'humaine' : 'machine',
    modele: row.modele === null ? null : String(row.modele),
    cree_le: String(row.created_at),
  }];
  }));
}

// ——— Forme commune ———

const uniques = (passages: { texte: string; trouve: boolean }[]) => {
  const vus = new Set<string>();
  return passages.filter((p) => p.texte && !vus.has(p.texte) && vus.add(p.texte));
};

const blocsDe = (nature: Nature, item: Record<string, unknown>, elements: MaquetteSelection['ressources'] = []): Bloc[] =>
  champsDuPost(nature, item).map((c: Champ): Bloc => {
    const element = /^ressources\.(\d+)\.explication$/.exec(c.cle);
    if (element) {
      const e = elements[Number(element[1])]!;
      return { type: 'element', cle: c.cle, nom: e.nom, url: lienSur(e.url), hote: e.hote, texte: c.texte };
    }
    return { type: c.cle.startsWith('reperes.') ? 'point' : 'paragraphe', cle: c.cle, texte: c.texte };
  });

/** Applique la traduction si elle couvre tous les champs du post sans écart ; sinon l'original est servi tel quel. */
export function servirDansLaLangue(blocs: Bloc[], langue: Langue, traduction: TraductionLue | undefined): Pick<Publication, 'langue' | 'traduction' | 'contenu' | 'original'> {
  const champs: Champ[] = blocs.map((b) => ({ cle: b.cle, texte: b.texte }));
  const traduits = traduction ? avecAlias(traduction.champs) : {};
  if (langue === 'en' || !traduction || !partieServable(champs, traduits, traduction.ecarts)) return { langue: 'en', traduction: null, contenu: blocs, original: null };
  return {
    langue,
    traduction: { langue, origine: traduction.origine, modele: traduction.modele, cree_le: traduction.cree_le },
    contenu: blocs.map((b) => ({ ...b, texte: traduits[b.cle]! })),
    original: blocs,
  };
}

const TYPE_BOUTON: Record<string, Bouton['type']> = { 'Voir le dépôt': 'depot', Installer: 'installation', Télécharger: 'telechargement' };

function depuisActualite(a: MaquetteActualite): Omit<Publication, 'compte' | 'langue' | 'traduction' | 'contenu' | 'original' | 'fond' | 'validite'> & { blocs: Bloc[] } {
  const passages = [a.accroche, a.description, a.ce_que_ca_permet, ...a.reperes]
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .flatMap((c) => c.passages.map((texte) => ({ texte, trouve: !a.passages_introuvables.includes(texte) })));
  const url = lienSur(a.source.url);
  return {
    id: a.post_id,
    revision_id: a.revision_id,
    nature: 'actualite',
    statut: a.statut,
    date: a.planning?.jour ?? null,
    badge: a.verification !== 'verifie' ? 'a_verifier' : a.kind === 'version' ? 'nouvelle_version' : 'actualite',
    langue_originale: 'en',
    blocs: blocsDe('actualite', a as unknown as Record<string, unknown>),
    bouton: url ? { type: 'source', url, cible: cibleCourte(url) } : null,
    media: { type: 'schema', titre: a.titre_media, elements: (a.reperes.length ? a.reperes : [a.accroche]).map((x) => x.texte), lang: 'en' },
    sources: {
      origine: 'agent_site',
      modele: a.redaction.modele || null,
      documents: [{ titre: a.titre, url, capture_le: a.source.capture_le }],
      passages: uniques(passages),
      verification: a.verification,
    } satisfies Sources,
  };
}

/**
 * Le montage existe-t-il sur ce serveur ? Un montage rendu ailleurs (un cycle GitHub Actions, P6) n'arrive pas avec le
 * site : sans lui, la publication garde sa couverture au lieu d'une image cassée.
 */
function visuelPresent(src: string): boolean {
  return existsSync(resolve(racineDepot(), 'maquette', src));
}

function depuisRessource(r: MaquetteRessource): ReturnType<typeof depuisActualite> {
  const passages = [r.accroche, r.description, r.interet, ...r.reperes].filter(Boolean).flatMap((c) => c.passages.map((texte) => ({ texte, trouve: true })));
  const url = r.bouton ? lienSur(r.bouton.url) : null;
  const type = r.bouton ? TYPE_BOUTON[r.bouton.libelle] : undefined;
  const media: Media | null = r.visuel && visuelPresent(r.visuel.src) ? { type: 'image', src: `/${r.visuel.src}`, alt: r.visuel.alt, alt_lang: 'en', largeur: 1080, hauteur: 1350, lang: 'en', credit: null } : null;
  return {
    id: r.post_id,
    revision_id: r.revision_id,
    nature: 'ressource',
    statut: r.statut,
    date: r.planning?.jour ?? null,
    badge: r.statut_sortie,
    langue_originale: 'en',
    blocs: blocsDe('ressource', r as unknown as Record<string, unknown>),
    bouton: url && type ? { type, url, cible: cibleCourte(r.etat_depot?.html_url ?? url) } : null,
    media,
    sources: {
      origine: r.origine.code === 'claude_code_developpement' ? 'claude_code_developpement' : 'agent_site',
      modele: null,
      documents: r.captures.map((c) => ({ titre: c.document, url: lienSur(c.url), capture_le: c.capture_le })),
      passages: uniques(passages),
      verification: 'verifie',
    },
  };
}

function depuisSelection(x: MaquetteSelection): ReturnType<typeof depuisActualite> {
  const passages = [x.accroche, ...x.ressources.map((r) => r.explication)].filter(Boolean).flatMap((c) => c.passages.map((texte) => ({ texte, trouve: true })));
  return {
    id: x.post_id,
    revision_id: x.revision_id,
    nature: 'selection',
    statut: x.statut,
    date: x.planning?.jour ?? null,
    badge: 'selection',
    langue_originale: 'en',
    blocs: blocsDe('selection', x as unknown as Record<string, unknown>, x.ressources),
    bouton: null,
    media: x.visuel ? { type: 'image', src: `/${x.visuel.src}`, alt: x.visuel.alt, alt_lang: 'en', largeur: 1080, hauteur: 1350, lang: 'en', credit: CREDIT_IMAGE } : null,
    sources: {
      origine: x.origine.code === 'claude_code_developpement' ? 'claude_code_developpement' : 'agent_site',
      modele: null,
      documents: x.captures.map((c) => ({ titre: c.document, url: null, capture_le: c.capture_le })),
      passages: uniques(passages),
      verification: 'verifie',
    },
  };
}

/** Diapositives des carrousels d'actualités (dernier média de chaque publication), texte en anglais. */
async function lireCarrousels(client: Client, ids: number[]): Promise<Map<number, { libelle: string; texte: string }[]>> {
  if (ids.length === 0) return new Map();
  const r = await client.execute({
    sql: `select post_id, content from media_asset where id in (select max(id) from media_asset where post_id in (${ids.map(() => '?').join(', ')}) group by post_id)`,
    args: ids,
  });
  const carrousels = new Map<number, { libelle: string; texte: string }[]>();
  for (const row of r.rows) {
    const c = row.content === null ? null : (JSON.parse(String(row.content)) as { forme?: string; diapositives?: { libelle?: unknown; texte?: unknown }[] });
    const diapositives = (c?.forme === 'carrousel' && Array.isArray(c.diapositives) ? c.diapositives : [])
      .filter((d) => typeof d.libelle === 'string' && typeof d.texte === 'string' && d.texte.trim() !== '')
      .map((d) => ({ libelle: String(d.libelle), texte: String(d.texte) }));
    if (diapositives.length) carrousels.set(Number(row.post_id), diapositives);
  }
  return carrousels;
}

/**
 * Documents qui renforcent l'actualité d'une publication (P6, regroupement multi-sources) : la même annonce vue par
 * une autre source. Montrés dans les sources du post, après le document cité ; ils ne portent aucun passage cité.
 */
async function lireRenforts(client: Client, ids: number[]): Promise<Map<number, Sources['documents']>> {
  if (ids.length === 0) return new Map();
  const r = await client.execute({
    sql: `select p.id as post_id, s.name as source, d.title, d.url, d.first_collected_at
          from post p
          join news_item_document nd on nd.news_item_id = p.news_item_id and nd.role = 'supporting'
          join source_document d on d.id = nd.document_id
          join source s on s.id = d.source_id
          where p.id in (${ids.map(() => '?').join(', ')})
          order by d.first_collected_at, d.id`,
    args: ids,
  });
  const renforts = new Map<number, Sources['documents']>();
  for (const row of r.rows) {
    const liste = renforts.get(Number(row.post_id)) ?? [];
    liste.push({ titre: String(row.title), url: lienSur(String(row.url)), capture_le: row.first_collected_at === null ? null : String(row.first_collected_at) });
    renforts.set(Number(row.post_id), liste);
  }
  return renforts;
}

/** Publications de ces identifiants, dans cet ordre, dans la langue demandée. Les absentes (non visibles) sont omises. */
export async function publicationsParIds(ctx: Contexte, ids: readonly number[]): Promise<Publication[]> {
  if (ids.length === 0) return [];
  const maintenant = ctx.maintenant ?? new Date().toISOString();
  // Le mode public ne lit jamais une publication en attente, même demandée par son identifiant.
  const autorises = ctx.mode === 'public'
    ? new Set((await ctx.client.execute({ sql: `select id from post where status = 'publie' and id in (${ids.map(() => '?').join(', ')})`, args: [...ids] })).rows.map((r) => Number(r.id)))
    : new Set(ids);
  const liste = ids.filter((id) => autorises.has(id));
  if (liste.length === 0) return [];
  // Lectures indépendantes lancées ensemble : en ligne, chaque aller-retour vers la base compte (2026-11-05). Les
  // carrousels sont demandés pour toute la liste : seuls ceux des actualités existent.
  const [{ actualites }, { ressources }, { selections }, comptes, carrousels, renforts, validites] = await Promise.all([
    actualitesDeLaMaquette(ctx.client, liste),
    ressourcesDeLaMaquette(ctx.client, maintenant, liste),
    selectionsDeLaMaquette(ctx.client, maintenant, liste),
    lireComptes(ctx.client, ctx.langue),
    lireCarrousels(ctx.client, liste),
    lireRenforts(ctx.client, liste),
    lireValidite(ctx.client, liste),
  ]);
  const items = new Map<number, { item: ReturnType<typeof depuisActualite>; compte: string }>();
  for (const a of actualites) {
    const item = depuisActualite(a);
    const c = carrousels.get(a.post_id);
    if (c) item.media = { type: 'carrousel', titre: a.titre_media, diapositives: c, lang: 'en' };
    const r = renforts.get(a.post_id);
    if (r && item.sources) item.sources = { ...item.sources, documents: [...item.sources.documents, ...r] };
    items.set(a.post_id, { item, compte: a.compte });
  }
  for (const r of ressources) items.set(r.post_id, { item: depuisRessource(r), compte: r.compte });
  for (const x of selections) items.set(x.post_id, { item: depuisSelection(x), compte: x.compte });
  const traductions = await lireTraductions(ctx.client, ctx.langue, [...items.values()].map((x) => x.item.revision_id));
  const publications: Publication[] = [];
  for (const id of liste) {
    const trouve = items.get(id);
    const compte = trouve ? comptes.get(trouve.compte) : undefined;
    if (!trouve || !compte) continue;
    const { blocs, ...reste } = trouve.item;
    const traduction = traductions.get(reste.revision_id);
    // Texte alternatif : traduit s'il l'est sans écart ; le texte inscrit dans l'image reste en anglais (`lang`).
    const alt = traduction?.champs['media.alt'];
    const media = reste.media?.type === 'image' && alt && !traduction!.ecarts.has('media.alt') ? { ...reste.media, alt, alt_lang: ctx.langue } : reste.media;
    const validite = validites.get(id) ?? { remplacee_par: null, source_mise_a_jour: null };
    publications.push({ ...reste, media, compte, fond: fondDe(compte.id, reste.id), validite, ...servirDansLaLangue(blocs, ctx.langue, traduction) });
  }
  return publications;
}

export async function pageDuFil(ctx: Contexte, o: { curseur?: string | null; limite?: number; compte?: string | null } = {}) {
  const { ids, curseur_suivant } = await idsDuFil(ctx.client, ctx.mode, o);
  return { langue: ctx.langue, publications: await publicationsParIds(ctx, ids), curseur_suivant };
}

export async function publicationParId(ctx: Contexte, id: number): Promise<Publication | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  return (await publicationsParIds(ctx, [id]))[0] ?? null;
}
