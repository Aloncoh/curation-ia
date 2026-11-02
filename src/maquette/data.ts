// Données de la maquette (P2) : actualités réellement collectées, avec un court extrait en texte brut.
// Seules les actualités dont la capture vient d'une collecte réelle sont gardées ; les champs d'analyse
// (intérêt, limites, coût…) n'existent pas encore et restent absents : la maquette les masque.
// S'y ajoutent les exemples de publications (exemples.ts), rattachés à leur actualité réelle et dont chaque
// passage cité est recherché mot pour mot dans la dernière capture du document, qui doit venir d'une collecte réelle.
import type { Client, Transaction } from '@libsql/client';
import { decodeHtmlEntities } from '../collect/normalize.ts';
import type { DocumentRecherche } from '../recherche/moteur.ts';
import type { MaquetteRessource, RessourceNonPlanifiee } from './ressources.ts';
import { SOURCES } from '../sources.ts';
import {
  COMPTES,
  EXEMPLES,
  FICHE_INCIDENT,
  LIBELLES_DETAILS,
  PRESENTATRICE,
  PROJETS,
  REGISTRE_PULSE,
  REGISTRE_RADAR,
  SUJETS,
  type Attribution,
  type ChampCite,
  type DetailCite,
  type Diapositive,
  type ExemplePublication,
} from './exemples.ts';

export interface MaquetteNewsItem {
  id: number;
  kind: 'version' | 'annonce';
  title: string;
  announced_at: string | null;
  first_seen_at: string;
  product: { key: string; name: string; publisher: string; category: string | null; repository_url: string | null } | null;
  version: string | null;
  categories: string[];
  source: { id: string; name: string; url: string };
  /** Extrait en texte brut de la source (à afficher comme texte, jamais comme HTML). */
  excerpt: string | null;
  capture: { content_hash: string; captured_at: string; mode: string };
}

/** Passage cité, tel qu'écrit dans exemples.ts, et résultat de sa recherche dans la capture. */
export interface PassageVerifie {
  texte: string;
  trouve: boolean;
}

export interface ChampVerifie {
  texte: string;
  passages: PassageVerifie[];
}

/** Diapositive du média généré : le texte d'un champ de l'exemple, `null` si ce champ n'est pas renseigné. */
export interface DiapositiveResolue {
  champ: Diapositive;
  libelle: string;
  texte: string | null;
}

export interface MaquetteExemple {
  id: string;
  /** `a_verifier` dès qu'un contrôle échoue (motifs ci-dessous) : jamais présenté comme vérifié. */
  statut: 'verifie' | 'a_verifier';
  motifs: string[];
  actualite: Pick<MaquetteNewsItem, 'id' | 'kind' | 'title' | 'announced_at' | 'first_seen_at' | 'product' | 'version' | 'source'>;
  /** Capture dans laquelle les passages ont été cherchés : la dernière du document, issue d'une collecte réelle. */
  capture: { content_hash: string; captured_at: string; mode: 'live'; run_id: string; text_length: number };
  compte: ExemplePublication['compte'];
  media: ExemplePublication['media'];
  titre_media: string;
  description: ChampVerifie;
  visuel: Omit<ExemplePublication['visuel'], 'elements'> & { elements: ChampVerifie[] };
  accroche: ChampVerifie;
  nouveaute: ChampVerifie;
  ce_que_ca_permet: ChampVerifie | null;
  pour_qui: ChampVerifie | null;
  limites_connues: ChampVerifie | null;
  details: (ChampVerifie & { titre: string })[];
  attributions: (ChampVerifie & Pick<Attribution, 'type' | 'auteur'>)[];
  diapositives: DiapositiveResolue[];
  categories: string[];
  questions_a_tester: string[];
}

export interface ExempleIntrouvable {
  id: string;
  source_id: string;
  url: string;
  motif: string;
}

export interface MaquetteData {
  generated_at: string;
  note: string;
  /** Comptes éditoriaux proposés (noms provisoires) : aucun n'existe encore en base. */
  comptes: typeof COMPTES;
  presentatrice: typeof PRESENTATRICE;
  sujets: typeof SUJETS;
  fiche_incident: typeof FICHE_INCIDENT;
  registre_pulse: typeof REGISTRE_PULSE;
  registre_radar: typeof REGISTRE_RADAR;
  /** Projets GitHub mesurés ponctuellement ; `verifie` : tous les passages figurent dans leur capture. */
  projets: ((typeof PROJETS)[number] & { verifie: boolean })[];
  /** Exemples rédigés par Claude Code pour la maquette, pas par l'agent du site : ce ne sont pas des publications. */
  exemples: MaquetteExemple[];
  /** Exemples dont le document n'a pas (ou plus) de capture issue d'une collecte réelle : écartés de la maquette. */
  exemples_introuvables: ExempleIntrouvable[];
  sources: { id: string; name: string; kind: string; status: string; last_success_at: string | null; last_error: string | null }[];
  products: {
    key: string;
    name: string;
    publisher: string;
    category: string | null;
    repository_url: string | null;
    versions: { version: string; is_prerelease: boolean; released_at: string | null }[];
  }[];
  news_items: MaquetteNewsItem[];
  /** Actualités écartées parce que leur capture ne vient pas d'une collecte réelle (fixture, mode inconnu). */
  excluded_not_live: number;
  /** Publications de ressources planifiées (en attente, aperçu) ou publiées : rédigées par Claude Code pendant le développement (ADR 0011). */
  ressources: MaquetteRessource[];
  /** Publications de ressources non planifiées (à vérifier, rejetées) : nom et motifs seulement, jamais affichées comme publications. */
  ressources_non_planifiees: RessourceNonPlanifiee[];
  /** Documents de recherche (mode aperçu), classés dans le navigateur par maquette/recherche.js, le même code que `chercher`. */
  recherche: DocumentRecherche[];
}

/** Texte brut d'un contenu HTML ou Markdown : sans balises, titres, liens ni mise en forme. */
export function toPlainText(content: string, format: string): string {
  let text = content;
  if (format === 'html') {
    // Les balises de bloc séparent des mots ; les balises en ligne (<b>, <a>…) non.
    text = text
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/?(?:p|br|div|li|ul|ol|h[1-6]|tr|td|th|blockquote|pre|hr|section|article|figure|figcaption)\b[^<>]*>/gi, ' ')
      // `[^<>]` : une page faite de « < » sans « > » ne doit pas rendre ce retrait quadratique.
      .replace(/<[^<>]*>/g, '');
    text = decodeHtmlEntities(text);
  } else {
    text = text
      .split('\n')
      .filter((line) => !/^\s{0,3}#{1,6}\s/.test(line))
      .join('\n')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
      // Seuls les délimiteurs sont retirés : `code`, **gras**, _italique_, ~~barré~~ ; jamais un « _ » ou un « ~ »
      // à l'intérieur d'un mot (SNAKE_CASE, ~/.config…), pour que l'extrait reste fidèle au texte de la source.
      .replace(/`([^`\n]*)`/g, '$1')
      .replace(/(^|[\s(])(\*\*|__|\*|_|~~)(\S(?:[^\n]*?\S)?)\2(?=[\s).,;:!?]|$)/gm, '$1$3');
  }
  return text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extrait court, coupé sur un mot ; null si le contenu est vide. */
export function excerpt(content: string, format: string, maxLength = 240): string | null {
  const text = toPlainText(content, format);
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength)).replace(/[\s,;:.-]+$/, '')}…`;
}

const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

/** Espaces normalisés (SPEC §7.3) : toute suite d'espaces, tabulations ou retours à la ligne devient une espace. */
export const normaliserEspaces = (text: string): string => text.replace(/\s+/g, ' ').trim();

export const LIBELLES: Record<Exclude<Diapositive, `details:${number}`>, string> = {
  accroche: 'Accroche',
  nouveaute: 'Nouveauté',
  ce_que_ca_permet: 'Ce que ça permet',
  pour_qui: 'Pour qui',
  limites_connues: 'Limites connues',
};

const LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;
const CHIFFRE = /\p{N}/u;
const SEPARATEUR = /^[.,]$/;

/**
 * Le passage figure-t-il mot pour mot dans le texte ? Sous-chaîne exacte, bornée à des mots entiers : une occurrence
 * qui commence ou finit au milieu d'un mot ne compte pas (« available » n'est pas trouvé dans « unavailable »,
 * « scored 6 » pas dans « scored 60 »), ni au milieu d'un nombre (« Opus 5 » pas dans « Opus 5.5 », « $1. » pas
 * dans « $1.50 »).
 */
export function contientMotPourMot(texte: string, passage: string): boolean {
  if (!passage) return false;
  const lie = (a: string | undefined, b: string | undefined) => a !== undefined && b !== undefined && LETTRE_OU_CHIFFRE.test(a) && LETTRE_OU_CHIFFRE.test(b);
  const chiffre = (c: string | undefined) => c !== undefined && CHIFFRE.test(c);
  const separateur = (c: string | undefined) => c !== undefined && SEPARATEUR.test(c);
  for (let i = texte.indexOf(passage); i !== -1; i = texte.indexOf(passage, i + 1)) {
    const fin = i + passage.length;
    const coupeAuDebut =
      lie(texte[i - 1], passage[0]) || (separateur(texte[i - 1]) && chiffre(texte[i - 2]) && chiffre(passage[0]));
    const coupeALaFin =
      lie(passage.at(-1), texte[fin]) ||
      (chiffre(passage.at(-1)) && separateur(texte[fin]) && chiffre(texte[fin + 1])) ||
      (separateur(passage.at(-1)) && chiffre(passage.at(-2)) && chiffre(texte[fin]));
    if (!coupeAuDebut && !coupeALaFin) return true;
  }
  return false;
}

/**
 * Nombres écrits en chiffres dans un texte (« 30 », « 2.1.312 », « 5,5 » ramené à « 5.5 » : virgule décimale française).
 * Les nombres écrits en lettres (« deux niveaux ») ne sont pas contrôlés : ils restent du ressort de la relecture.
 */
export const nombresDe = (texte: string): string[] => (texte.match(/\p{N}+(?:[.,]\p{N}+)*/gu) ?? []).map((n) => n.replace(/,(?=\p{N})/gu, '.'));

/**
 * Contrôle un exemple contre le texte brut de sa capture : chaque passage doit s'y trouver mot pour mot
 * (espaces normalisés, mots entiers), chaque champ factuel renseigné doit citer au moins un passage, chaque nombre
 * écrit en chiffres dans un texte doit figurer dans ses passages (ou être la version de l'actualité), chaque libellé de
 * détail doit appartenir à LIBELLES_DETAILS, et chaque diapositive doit reprendre
 * un champ existant de l'exemple (le média n'ajoute aucune affirmation).
 */
export function verifierExemple(
  exemple: ExemplePublication,
  texteCapture: string,
  version: string | null = null,
): Pick<MaquetteExemple, 'statut' | 'motifs' | 'description' | 'visuel' | 'accroche' | 'nouveaute' | 'ce_que_ca_permet' | 'pour_qui' | 'limites_connues' | 'details' | 'attributions' | 'diapositives'> {
  const capture = normaliserEspaces(texteCapture);
  const motifs = new Set<string>();
  const verifier = (champ: ChampCite): ChampVerifie => {
    if (champ.passages.length === 0) motifs.add('champ factuel sans citation');
    const passages = champ.passages.map((texte) => {
      const passage = normaliserEspaces(texte);
      const trouve = contientMotPourMot(capture, passage);
      if (!trouve) motifs.add('citation introuvable');
      return { texte, trouve };
    });
    const cite = champ.passages.join(' ');
    if (nombresDe(champ.texte).some((n) => n !== version && !nombresDe(cite).includes(n))) motifs.add('nombre absent des citations');
    return { texte: champ.texte, passages };
  };
  const optionnel = (champ: ChampCite | null) => (champ ? verifier(champ) : null);

  const description = verifier(exemple.description);
  const visuel = { ...exemple.visuel, elements: exemple.visuel.elements.map(verifier) };
  const champs = {
    accroche: verifier(exemple.accroche),
    nouveaute: verifier(exemple.nouveaute),
    ce_que_ca_permet: optionnel(exemple.ce_que_ca_permet),
    pour_qui: optionnel(exemple.pour_qui),
    limites_connues: optionnel(exemple.limites_connues),
  };
  const details = exemple.details.map((detail: DetailCite) => {
    if (!(LIBELLES_DETAILS as readonly string[]).includes(detail.titre)) motifs.add('libellé de détail non prévu');
    return { titre: detail.titre, ...verifier(detail) };
  });
  const attributions = exemple.attributions.map((attribution) => ({
    type: attribution.type,
    auteur: attribution.auteur,
    ...verifier(attribution),
  }));

  const diapositives = exemple.diapositives.map((champ): DiapositiveResolue => {
    if (champ.startsWith('details:')) {
      const detail = details[Number(champ.slice('details:'.length))];
      if (!detail) {
        motifs.add('diapositive sans champ correspondant');
        return { champ, libelle: champ, texte: null };
      }
      return { champ, libelle: detail.titre, texte: detail.texte };
    }
    const cle = champ as keyof typeof LIBELLES;
    return { champ, libelle: LIBELLES[cle], texte: champs[cle]?.texte ?? null };
  });

  return { statut: motifs.size === 0 ? 'verifie' : 'a_verifier', motifs: [...motifs], description, visuel, ...champs, details, attributions, diapositives };
}

/** Un projet n'est vérifié que si chaque passage figure mot pour mot dans sa capture. */
export function verifierProjet<T extends { capture: string; accroche: ChampCite; interet: ChampCite }>(projet: T): T & { verifie: boolean } {
  const passages = [...projet.accroche.passages, ...projet.interet.passages];
  return { ...projet, verifie: passages.length > 0 && passages.every((p) => contientMotPourMot(normaliserEspaces(projet.capture), normaliserEspaces(p))) };
}

/** Rattache chaque exemple à son actualité et à la dernière capture de son document (issue d'une collecte réelle, sinon l'exemple est écarté), puis le contrôle. */
async function exemplesDeLaMaquette(
  tx: Transaction,
  exemples: ExemplePublication[],
): Promise<{ exemples: MaquetteExemple[]; introuvables: ExempleIntrouvable[] }> {
  const trouves: MaquetteExemple[] = [];
  const introuvables: ExempleIntrouvable[] = [];
  for (const exemple of exemples) {
    const absent = (motif: string) => introuvables.push({ id: exemple.id, source_id: exemple.source_id, url: exemple.url, motif });
    const documents = await tx.execute({
      sql: `
        select n.id, n.kind, n.title, n.announced_at, n.first_seen_at, d.id as document_id, d.normalized_url as url,
               s.id as source_id, s.name as source_name,
               p.key as product_key, p.name as product_name, p.publisher, p.category, p.repository_url, v.version
        from source_document d
        join source s on s.id = d.source_id
        join news_item_document nd on nd.document_id = d.id and nd.role = 'primary'
        join news_item n on n.id = nd.news_item_id
        left join news_item_target t on t.news_item_id = n.id
        left join product p on p.id = t.product_id
        left join product_version v on v.id = t.product_version_id
        where d.source_id = ? and d.normalized_url = ?
        order by n.id desc limit 1`,
      args: [exemple.source_id, exemple.url],
    });
    const row = documents.rows[0];
    if (!row) {
      absent('actualité absente de la base');
      continue;
    }
    const snapshots = await tx.execute({
      sql: `
        select c.title, c.content, c.content_format, c.content_hash, c.captured_at, c.run_id, r.mode
        from document_snapshot c left join run r on r.id = c.run_id
        where c.document_id = ?
        order by c.seq desc limit 1`,
      args: [row.document_id ?? null],
    });
    // Même règle que le fil : la dernière capture du document, qui doit venir d'une collecte réelle. Une relecture
    // de fixture plus récente écarte l'exemple (comme elle écarte l'actualité du fil) au lieu de le laisser vérifié
    // contre un contenu plus ancien.
    const snapshot = snapshots.rows[0];
    if (!snapshot || snapshot.mode !== 'live') {
      absent('dernière capture non issue d’une collecte réelle');
      continue;
    }
    // Le titre fait partie de la capture stockée : certains flux ne donnent que lui.
    const texte = `${String(snapshot.title)} ${toPlainText(String(snapshot.content), String(snapshot.content_format))}`;
    const verification = verifierExemple(exemple, texte, str(row.version));
    // Le titre du média nomme l'actualité (titre, version ou produit) : il ne doit rien affirmer d'autre.
    const nomme = [row.title, row.version, row.product_name].some((t) => t != null && contientMotPourMot(String(t), exemple.titre_media));
    if (!nomme) {
      verification.motifs.push('titre du média absent de l’actualité');
      verification.statut = 'a_verifier';
    }
    if (exemple.visuel.original && !String(snapshot.content).includes(exemple.visuel.original.url)) {
      verification.motifs.push('média original absent de la capture');
      verification.statut = 'a_verifier';
    }
    trouves.push({
      id: exemple.id,
      compte: exemple.compte,
      ...verification,
      actualite: {
        id: Number(row.id),
        kind: row.kind === 'version' ? 'version' : 'annonce',
        title: String(row.title),
        announced_at: str(row.announced_at),
        first_seen_at: String(row.first_seen_at),
        product: row.product_key
          ? {
              key: String(row.product_key),
              name: String(row.product_name),
              publisher: String(row.publisher),
              category: str(row.category),
              repository_url: str(row.repository_url),
            }
          : null,
        version: str(row.version),
        source: { id: String(row.source_id), name: String(row.source_name), url: String(row.url) },
      },
      capture: {
        content_hash: String(snapshot.content_hash),
        captured_at: String(snapshot.captured_at),
        mode: 'live',
        run_id: String(snapshot.run_id),
        text_length: texte.length,
      },
      media: exemple.media,
      titre_media: exemple.titre_media,
      categories: exemple.categories,
      questions_a_tester: exemple.questions_a_tester,
    });
  }
  return { exemples: trouves, introuvables };
}

function categoriesOf(metadata: unknown): string[] {
  if (typeof metadata !== 'string') return [];
  try {
    const parsed = JSON.parse(metadata) as { categories?: unknown };
    return Array.isArray(parsed.categories) ? parsed.categories.filter((c): c is string => typeof c === 'string').slice(0, 4) : [];
  } catch {
    return [];
  }
}

export async function buildMaquetteData(
  client: Client,
  generatedAt: string,
  exemples: ExemplePublication[] = EXEMPLES,
): Promise<MaquetteData> {
  const tx = await client.transaction('read');
  try {
    const items = await tx.execute(`
      select n.id, n.kind, n.title, n.announced_at, n.first_seen_at,
             d.normalized_url as url, d.metadata, s.id as source_id, s.name as source_name,
             p.key as product_key, p.name as product_name, p.publisher, p.category, p.repository_url,
             v.version,
             snap.content, snap.content_format, snap.content_hash, snap.captured_at, r.mode
      from news_item n
      join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
      join source_document d on d.id = nd.document_id
      join source s on s.id = d.source_id
      join document_snapshot snap on snap.document_id = d.id
        and snap.seq = (select max(seq) from document_snapshot x where x.document_id = d.id)
      left join run r on r.id = snap.run_id
      left join news_item_target t on t.news_item_id = n.id
      left join product p on p.id = t.product_id
      left join product_version v on v.id = t.product_version_id
      -- Les découvertes de ressources (ADR 0011) ne sont pas des annonces : elles s'affichent comme publications de ressources.
      where n.kind <> 'decouverte'
      order by coalesce(n.announced_at, n.first_seen_at) desc, n.id desc`);
    // État des sources d'après les seules exécutions réelles (une relecture de fixture n'est pas une collecte).
    const sourceRows = await tx.execute(`
      select s.id, s.name, s.kind,
             (select max(r.finished_at) from run r where r.source_id = s.id and r.mode = 'live' and r.status = 'succeeded') as last_success_at,
             (select r.status from run r where r.source_id = s.id and r.mode = 'live' and r.status in ('succeeded', 'failed')
               order by r.finished_at desc limit 1) as last_status,
             (select r.error_message from run r where r.source_id = s.id and r.mode = 'live' and r.status in ('succeeded', 'failed')
               order by r.finished_at desc limit 1) as last_error
      from source s order by s.id`);
    // Versions connues par une collecte réelle seulement : leur document d'origine a au moins une capture « live ».
    const versionRows = await tx.execute(`
      select v.product_id, v.version, v.is_prerelease, v.released_at from product_version v
      where exists (select 1 from document_snapshot c join run r on r.id = c.run_id
                    where c.document_id = v.source_document_id and r.mode = 'live')
      order by v.released_at desc, v.id desc`);
    const productRows = await tx.execute('select id, key, name, publisher, category, repository_url from product order by name');

    const newsItems: MaquetteNewsItem[] = [];
    let excluded = 0;
    for (const row of items.rows) {
      if (row.mode !== 'live') {
        excluded++;
        continue;
      }
      newsItems.push({
        id: Number(row.id),
        kind: row.kind === 'version' ? 'version' : 'annonce',
        title: String(row.title),
        announced_at: str(row.announced_at),
        first_seen_at: String(row.first_seen_at),
        product: row.product_key
          ? {
              key: String(row.product_key),
              name: String(row.product_name),
              publisher: String(row.publisher),
              category: str(row.category),
              repository_url: str(row.repository_url),
            }
          : null,
        version: str(row.version),
        categories: categoriesOf(row.metadata),
        source: { id: String(row.source_id), name: String(row.source_name), url: String(row.url) },
        excerpt: excerpt(String(row.content), String(row.content_format)),
        capture: { content_hash: String(row.content_hash), captured_at: String(row.captured_at), mode: String(row.mode) },
      });
    }
    const exemplesVerifies = await exemplesDeLaMaquette(tx, exemples);
    // Chargé à la demande : ce module dépend de la chaîne des ressources, qui dépend elle-même de ce fichier.
    const { ressourcesDeLaMaquette } = await import('./ressources.ts');
    const ressources = await ressourcesDeLaMaquette(tx, generatedAt);

    return {
      generated_at: generatedAt,
      note:
        'Actualités réellement collectées depuis des sources officielles, pas encore analysées ; les extraits sont des citations courtes de la source, attribuées et liées. ' +
        "Les exemples de publications sont rédigés par Claude Code pour la maquette, pas par l'agent du site : chaque passage cité est recherché mot pour mot dans la capture réelle.",
      comptes: COMPTES,
      presentatrice: PRESENTATRICE,
      sujets: SUJETS,
      fiche_incident: FICHE_INCIDENT,
      registre_pulse: REGISTRE_PULSE,
      registre_radar: REGISTRE_RADAR,
      projets: PROJETS.map(verifierProjet),
      exemples: exemplesVerifies.exemples,
      exemples_introuvables: exemplesVerifies.introuvables,
      // Une source retirée du registre garde sa ligne en base (historique), mais n'est plus présentée comme suivie.
      sources: sourceRows.rows.filter((row) => SOURCES.some((def) => def.id === row.id)).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind),
        status: row.last_status === 'succeeded' ? 'ok' : row.last_status === 'failed' ? 'error' : 'never',
        last_success_at: str(row.last_success_at),
        last_error: row.last_status === 'failed' ? str(row.last_error) : null,
      })),
      products: productRows.rows
        .filter((product) => versionRows.rows.some((version) => version.product_id === product.id))
        .map((product) => ({
          key: String(product.key),
          name: String(product.name),
          publisher: String(product.publisher),
          category: str(product.category),
          repository_url: str(product.repository_url),
          versions: versionRows.rows
            .filter((version) => version.product_id === product.id)
            .map((version) => ({
              version: String(version.version),
              is_prerelease: Number(version.is_prerelease) === 1,
              released_at: str(version.released_at),
            })),
        })),
      news_items: newsItems,
      excluded_not_live: excluded,
      ...ressources,
    };
  } finally {
    tx.close();
  }
}
