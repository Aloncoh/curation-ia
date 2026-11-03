// Actualités fabriquées pour les tests de l'API v1 et de la traduction (aucune donnée réelle) : une capture, puis des
// publications planifiées dont chaque passage cité se retrouve mot pour mot dans la capture.
import type { Client } from '@libsql/client';
import { indexer } from '../../src/recherche/index.ts';

export const CAPTURE = 'Acme ships Widget 2.1 today. It cuts latency by 40% on GPU workloads. Requires an API key.';
export const NOW = '2026-11-03T08:00:00.000Z';

export const contenuActualite = (n: number) => ({
  accroche: { texte: `Widget 2.1 cuts GPU latency by 40% (${n})`, passages: ['It cuts latency by 40% on GPU workloads.'] },
  description: { texte: 'Acme ships Widget 2.1 with lower latency for GPU workloads.', passages: ['Acme ships Widget 2.1 today.'] },
  ce_que_ca_permet: { texte: 'Faster inference on the same hardware, with an API key.', passages: ['Requires an API key.'] },
  reperes: [{ texte: '40% lower latency', passages: ['It cuts latency by 40% on GPU workloads.'] }],
  produit: 'Widget',
  version_cible: '2.1',
});

export async function socle(c: Client): Promise<void> {
  await c.execute(`insert into source (id, kind, name, config, allowed_hosts, created_at) values ('s', 'feed', 'Acme blog', '{}', '[]', 'x')`);
  await c.execute(`insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values ('nodi', 'nodi', 'Nodi', 'agent', 'agent-nodi.png', 'bio', 'spécialité', 1, 'x')`);
  await c.execute(`insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values ('r', 'x', 'terminee', 0, 0, 0)`);
  await c.execute(`insert into source_document (id, source_id, external_id, url, normalized_url, title, first_collected_at, last_seen_at) values (1, 's', 'e', 'https://acme.example/blog/widget-2-1', 'u', 't', 'x', 'x')`);
  await c.execute({ sql: `insert into document_snapshot (id, document_id, seq, content_hash, title, content, content_format, captured_at) values (1, 1, 1, 'h', 'Widget 2.1', ?, 'html', ?)`, args: [CAPTURE, NOW] });
}

/** Une actualité planifiée (ou publiée), indexée pour la recherche. Rend son post_id et son revision_id. */
export async function ajouterActualite(c: Client, n: number, o: { jour?: string; statut?: 'en_attente' | 'publie'; titre?: string; contenu?: Record<string, unknown> } = {}): Promise<{ postId: number; revisionId: number }> {
  await c.execute({ sql: `insert into news_item (id, kind, title, first_seen_at, status) values (?, 'annonce', ?, ?, 'collected')`, args: [n, o.titre ?? `Widget 2.1 (${n})`, NOW] });
  const draft = await c.execute({ sql: `insert into post_draft (news_item_id, run_id, status, snapshot_id, model, prompt_version, origine, created_at) values (?, 'r', 'a_verifier', 1, 'deepseek-flash', 'p3-15', 'agent_site', ?) returning id`, args: [n, NOW] });
  const statut = o.statut ?? 'en_attente';
  const post = await c.execute({ sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at, published_at) values ('nodi', ?, 'documentary_analysis', ?, ?, ?) returning id`, args: [n, statut, NOW, statut === 'publie' ? NOW : null] });
  const postId = Number(post.rows[0]!.id);
  const rv = await c.execute({ sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, 1, ?, ?, ?) returning id`, args: [postId, Number(draft.rows[0]!.id), JSON.stringify(o.contenu ?? contenuActualite(n)), NOW] });
  const revisionId = Number(rv.rows[0]!.id);
  await c.execute({ sql: 'insert into post_source (revision_id, document_id, snapshot_id) values (?, 1, 1)', args: [revisionId] });
  await c.execute({
    sql: `insert into publication_planifiee (post_id, jour, rang, priorite, statut_sortie, utilise_reserve, etat, created_at, updated_at) values (?, ?, ?, 1, 'actualite', 0, ?, ?, ?)`,
    args: [postId, o.jour ?? '2026-11-03', n, statut === 'publie' ? 'publiee' : 'prevue', NOW, NOW],
  });
  const tx = await c.transaction('write');
  try {
    await indexer(tx, postId, revisionId);
    await tx.commit();
  } finally {
    tx.close();
  }
  return { postId, revisionId };
}

export async function ajouterTraduction(c: Client, revisionId: number, langue: 'fr' | 'he', champs: Record<string, string>, statut: 'valide' | 'ecart' = 'valide'): Promise<void> {
  await c.execute({
    sql: `insert into post_traduction (revision_id, langue, champs, origine, modele, prompt_version, statut, created_at) values (?, ?, ?, 'machine', 'deepseek-flash', 't1', ?, ?)`,
    args: [revisionId, langue, JSON.stringify(champs), statut, NOW],
  });
}
