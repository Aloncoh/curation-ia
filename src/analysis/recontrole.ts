// Recontrôle des brouillons « à vérifier » après un changement des contrôles : mêmes entrées que la chaîne (capture
// citée, titre, produit, version, autres captures), aucun appel au modèle. Le contenu ne change pas, seuls l'écart
// détecté et le statut sont réécrits. Un brouillon devenu sans écart repasse `controle_automatique` (publication
// `brouillon`) : `brouillons:planifier` le place ensuite. Rien n'est publié.
import type { Database } from '../db/client.ts';
import { toPlainText } from '../maquette/data.ts';
import type { InStatement } from '@libsql/client';
import { CODES_BLOQUANTS, controlerBrouillon, diapositivesDe } from './controles.ts';
import { elaguer } from './elagage.ts';
import { autresCaptures } from './pipeline.ts';
import type { Brouillon } from './schemas.ts';

export interface BilanRecontrole {
  relus: number;
  sans_ecart: number;
  a_verifier: number;
  rejetes: number;
  /** Brouillons publiables une fois leurs champs secondaires en écart retirés (élagage). */
  elagues: number;
  /** Écarts restants, par code. */
  codes: Record<string, number>;
}

export async function recontroler(database: Database, o: { now: string } = { now: new Date().toISOString() }): Promise<BilanRecontrole> {
  const { client } = database;
  const r = await client.execute(`
    select d.id, d.news_item_id, d.snapshot_id, d.information_type, d.content, n.title, n.announced_at, v.version, pr.name as produit,
      c.title as snapshot_title, c.content as capture, c.content_format, s.name as source_nom
    from post_draft d
    join news_item n on n.id = d.news_item_id and n.kind in ('annonce', 'version')
    join document_snapshot c on c.id = d.snapshot_id
    join source_document doc on doc.id = c.document_id
    join source s on s.id = doc.source_id
    left join news_item_target t on t.news_item_id = n.id
    left join product_version v on v.id = t.product_version_id
    left join product pr on pr.id = t.product_id
    where d.status = 'a_verifier'
    order by d.id`);
  const bilan: BilanRecontrole = { relus: 0, sans_ecart: 0, a_verifier: 0, rejetes: 0, elagues: 0, codes: {} };
  for (const row of r.rows) {
    const contenu = JSON.parse(String(row.content)) as Brouillon & { produit: string | null };
    const produitCatalogue = row.produit !== null;
    const contexte = {
      typeInformation: row.information_type === null ? undefined : String(row.information_type),
      produit: produitCatalogue ? String(row.produit) : contenu.produit,
      produitCatalogue,
      dateAnnonce: row.announced_at === null ? null : String(row.announced_at),
      autresCaptures: await autresCaptures(client, Number(row.news_item_id), Number(row.snapshot_id)),
      source: String(row.source_nom),
    };
    const controler = (b: Brouillon) => controlerBrouillon(b, [String(row.snapshot_title), toPlainText(String(row.capture), String(row.content_format))], String(row.title), row.version === null ? null : String(row.version), contexte);
    const controles = controler(contenu);
    const bloquant = controles.find((c) => CODES_BLOQUANTS.has(c.code));
    // Écarts seulement sur des champs secondaires : on les retire ; publiable si la version élaguée passe tous les contrôles.
    const essai = bloquant ? null : elaguer(contenu, controles);
    const elague = essai && controler(essai.brouillon).length === 0 ? essai : null;
    const statut = bloquant ? 'rejete' : controles.length > 0 && !elague ? 'a_verifier' : 'controle_automatique';
    const statutPost = { rejete: 'rejete', a_verifier: 'a_verifier', controle_automatique: 'brouillon' }[statut];
    // Le brouillon garde la sortie du modèle et ses écarts, marqués retirés : on sait toujours ce qui a été enlevé.
    const ecarts = elague ? controles.map((c) => ({ ...c, retire: true })) : controles;
    await client.batch([
      { sql: `update post_draft set status = ?, checks = ?, rejection_reason = ? where id = ?`, args: [statut, JSON.stringify(ecarts), bloquant?.code ?? null, Number(row.id)] },
      // Seule une publication encore à vérifier change : une publication relue, planifiée ou publiée garde son statut.
      ...(elague ? await revisionElaguee(client, Number(row.news_item_id), Number(row.id), elague.brouillon, o.now) : []),
      { sql: `update post set status = ? where news_item_id = ? and status = 'a_verifier'`, args: [statutPost, Number(row.news_item_id)] },
    ], 'write');
    bilan.relus++;
    if (elague) bilan.elagues++;
    if (statut === 'rejete') bilan.rejetes++;
    else if (statut === 'a_verifier') bilan.a_verifier++;
    else bilan.sans_ecart++;
    for (const c of controles) bilan.codes[c.code] = (bilan.codes[c.code] ?? 0) + 1;
  }
  return bilan;
}

/**
 * Nouvelle révision de la publication encore à vérifier, avec le brouillon élagué (« une mise à jour ajoute une
 * révision ») : mêmes sources que la révision précédente, et carrousel refait avec les seuls champs gardés.
 */
async function revisionElaguee(client: Database['client'], newsItemId: number, draftId: number, b: Brouillon, now: string): Promise<InStatement[]> {
  const r = await client.execute({
    sql: `select p.id, rv.id as revision_id, rv.seq, rv.content from post p
          join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
          where p.news_item_id = ? and p.status = 'a_verifier'`,
    args: [newsItemId],
  });
  const p = r.rows[0];
  if (!p) return [];
  const postId = Number(p.id);
  const contenu = { ...(JSON.parse(String(p.content)) as Record<string, unknown>), ...b };
  const diapositives = diapositivesDe(b);
  return [
    { sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, ?, ?, ?, ?)`, args: [postId, Number(p.seq) + 1, draftId, JSON.stringify(contenu), now] },
    {
      sql: `insert into post_source (revision_id, document_id, snapshot_id)
            select (select id from post_revision where post_id = ? and seq = ?), document_id, snapshot_id from post_source where revision_id = ?`,
      args: [postId, Number(p.seq) + 1, Number(p.revision_id)],
    },
    {
      sql: `update media_asset set content = ?, alt_text = ? where post_id = ? and origin = 'generated'`,
      args: [JSON.stringify({ forme: 'carrousel', diapositives }), `Carrousel. ${diapositives.map((d) => `${d.libelle} : ${d.texte}`).join(' ')}`, postId],
    },
  ];
}
