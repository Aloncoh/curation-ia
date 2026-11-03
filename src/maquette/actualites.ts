// Publications d'actualités rédigées par l'agent du site (P3), relues par l'utilisateur, puis planifiées (`en_attente`,
// mode aperçu) ou publiées. Chaque passage est recherché à nouveau, mot pour mot, dans la capture citée : un passage
// introuvable fait passer la publication « à vérifier » au lieu de la présenter comme vérifiée.
import type { Client, Transaction } from '@libsql/client';
import type { DocumentRecherche } from '../recherche/moteur.ts';
import { ETIQUETTE_NON_PUBLIE } from '../recherche/rechercher.ts';
import { jourParis } from '../ressources/planification.ts';
import { contientMotPourMot, normaliserEspaces, toPlainText } from './data.ts';

interface Cite {
  texte: string;
  passages: string[];
}

export interface MaquetteActualite {
  post_id: number;
  revision_id: number;
  compte: string;
  statut: 'en_attente' | 'publie';
  etiquette: string | null;
  /** `a_verifier` dès qu'un passage ne se retrouve plus dans la capture. */
  verification: 'verifie' | 'a_verifier';
  passages_introuvables: string[];
  planning: { jour: string | null; rang: number | null; etat: string; utilise_reserve: boolean; priorite: number } | null;
  kind: 'version' | 'annonce';
  titre: string;
  /** Libellé du visuel : produit et version, s'ils sont connus. Il nomme, il n'affirme rien. */
  titre_media: string;
  date_annonce: string | null;
  categories: string[];
  accroche: Cite;
  description: Cite;
  nouveaute: Cite | null;
  ce_que_ca_permet: Cite | null;
  pour_qui: Cite | null;
  limites_connues: Cite | null;
  reperes: Cite[];
  source: { id: string; nom: string; url: string; capture_le: string };
  /** Modèle et version de prompt qui ont rédigé le brouillon. */
  redaction: { modele: string; prompt: string };
}

type Lecteur = Client | Transaction;

const cite = (v: unknown): Cite | null =>
  v && typeof v === 'object' && typeof (v as Cite).texte === 'string' && Array.isArray((v as Cite).passages) ? (v as Cite) : null;

export async function actualitesDeLaMaquette(executeur: Lecteur): Promise<{ actualites: MaquetteActualite[]; recherche: DocumentRecherche[] }> {
  const r = await executeur.execute(`
    select p.id, p.status, p.account_id, p.published_at, n.kind, n.title, rv.id as revision_id, rv.content,
      pp.jour, pp.rang, pp.etat, pp.utilise_reserve, pp.priorite, dr.model, dr.prompt_version,
      s.id as source_id, s.name as source_name, doc.url, c.title as capture_titre, c.content as capture, c.content_format, c.captured_at
    from post p
    join news_item n on n.id = p.news_item_id and n.kind in ('annonce', 'version')
    join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
    left join post_draft dr on dr.id = rv.draft_id
    join post_source ps on ps.revision_id = rv.id
    join document_snapshot c on c.id = ps.snapshot_id
    join source_document doc on doc.id = ps.document_id
    join source s on s.id = doc.source_id
    left join publication_planifiee pp on pp.post_id = p.id
    where p.status = 'publie' or (p.status = 'en_attente' and pp.post_id is not null)
    order by p.id`);
  const actualites: MaquetteActualite[] = [];
  const recherche: DocumentRecherche[] = [];
  for (const row of r.rows) {
    const contenu = JSON.parse(String(row.content)) as Record<string, unknown>;
    const accroche = cite(contenu.accroche);
    const description = cite(contenu.description);
    if (!accroche || !description) continue;
    const champs = {
      nouveaute: cite(contenu.nouveaute),
      ce_que_ca_permet: cite(contenu.ce_que_ca_permet),
      pour_qui: cite(contenu.pour_qui),
      limites_connues: cite(contenu.limites_connues),
    };
    const reperes = (Array.isArray(contenu.reperes) ? contenu.reperes : []).map(cite).filter((x): x is Cite => x !== null);
    const cites = [accroche, description, ...Object.values(champs), ...reperes].filter((x): x is Cite => x !== null);
    // Même texte que la vérification d'origine : le titre de la capture, puis son contenu en texte brut.
    const capture = normaliserEspaces(`${String(row.capture_titre ?? '')} ${toPlainText(String(row.capture), String(row.content_format))}`);
    const tous = cites.flatMap((x) => x.passages);
    const introuvables = tous.filter((p) => !contientMotPourMot(capture, normaliserEspaces(p)));
    const produit = typeof contenu.produit === 'string' ? contenu.produit : null;
    const version = typeof contenu.version_cible === 'string' && /\d/.test(contenu.version_cible) ? contenu.version_cible : null;
    const statut = row.status === 'publie' ? 'publie' : 'en_attente';
    const postId = Number(row.id);
    const revisionId = Number(row.revision_id);
    // Jour civil Europe/Paris, comme le plafond : jamais la sous-chaîne UTC de `published_at`.
    const jour = statut === 'publie' && row.published_at ? jourParis(String(row.published_at)) : row.jour === null ? null : String(row.jour);
    actualites.push({
      post_id: postId,
      revision_id: revisionId,
      compte: String(row.account_id),
      statut,
      etiquette: statut === 'en_attente' ? ETIQUETTE_NON_PUBLIE : null,
      verification: tous.length > 0 && introuvables.length === 0 ? 'verifie' : 'a_verifier',
      passages_introuvables: introuvables,
      planning: row.etat === null ? null : { jour, rang: row.rang === null ? null : Number(row.rang), etat: String(row.etat), utilise_reserve: Number(row.utilise_reserve) === 1, priorite: Number(row.priorite) },
      kind: row.kind === 'version' ? 'version' : 'annonce',
      titre: String(row.title),
      titre_media: [produit, version].filter(Boolean).join(' ') || String(row.title),
      date_annonce: typeof contenu.date_annonce === 'string' ? contenu.date_annonce : null,
      categories: Array.isArray(contenu.categories) ? contenu.categories.map(String) : [],
      accroche,
      description,
      ...champs,
      reperes,
      source: { id: String(row.source_id), nom: String(row.source_name), url: String(row.url), capture_le: String(row.captured_at) },
      redaction: { modele: String(row.model ?? ''), prompt: String(row.prompt_version ?? '') },
    });
    recherche.push({ postId, revisionId, jour, motsCles: [], textes: [String(row.title), ...cites.map((x) => x.texte)] });
  }
  return { actualites, recherche };
}
