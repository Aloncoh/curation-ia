// Couche de publication (ADR 0004) : compte signataire, publication, révision, sources et média généré.
// Phase de brouillons : rien n'atteint `publie` ici ; la publication automatique arrive en P5.
import type { Client, Transaction } from '@libsql/client';
import { COMPTES } from '../maquette/exemples.ts';
import type { DiapositiveResolue } from './controles.ts';

/** Seul niveau de preuve de la V1 (ADR 0004) : « Analyse IA à partir des sources — non testé par la plateforme ». */
export const NIVEAU_PREUVE_V1 = 'documentary_analysis';
export const MENTION_ILLUSTRATION = 'Illustration — ne prouve pas le fonctionnement';

const STATUTS_PUBLICATION: Record<string, string> = { controle_automatique: 'brouillon', a_verifier: 'a_verifier', rejete: 'rejete' };

export interface Publication {
  draftId: number;
  compte: string;
  newsItemId: number;
  statutBrouillon: string;
  contenu: Record<string, unknown>;
  documentId: number;
  snapshotId: number;
  diapositives: DiapositiveResolue[];
  now: string;
}

/** Comptes éditoriaux : leur définition reste celle de la maquette tant que les noms sont provisoires. */
export async function synchroniserComptes(client: Client, now: string): Promise<void> {
  await client.batch(
    COMPTES.map((c) => ({
      sql: `insert into account (id, handle, display_name, type, avatar, bio, specialty, provisional, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(id) do update set handle = excluded.handle, display_name = excluded.display_name, type = excluded.type, avatar = excluded.avatar,
              bio = excluded.bio, specialty = excluded.specialty, provisional = excluded.provisional`,
      args: [c.id, c.identifiant, c.nom, c.type, c.avatar, c.biographie, c.specialite, c.provisoire ? 1 : 0, now],
    })),
    'write',
  );
}

/** Crée la publication signée d'un brouillon, avec sa première révision, sa source et son média. Dans la transaction du brouillon. */
export async function creerPublication(tx: Transaction, p: Publication): Promise<void> {
  const statut = STATUTS_PUBLICATION[p.statutBrouillon];
  if (!statut) throw new Error(`Aucune publication pour le statut ${p.statutBrouillon}.`);
  const post = await tx.execute({
    sql: `insert into post (account_id, news_item_id, evidence_level, status, created_at) values (?, ?, ?, ?, ?) returning id`,
    args: [p.compte, p.newsItemId, NIVEAU_PREUVE_V1, statut, p.now],
  });
  const postId = Number(post.rows[0]!.id);
  const revision = await tx.execute({
    sql: `insert into post_revision (post_id, seq, draft_id, content, created_at) values (?, 1, ?, ?, ?) returning id`,
    args: [postId, p.draftId, JSON.stringify(p.contenu), p.now],
  });
  await tx.execute({
    sql: `insert into post_source (revision_id, document_id, snapshot_id) values (?, ?, ?)`,
    args: [Number(revision.rows[0]!.id), p.documentId, p.snapshotId],
  });
  // Un média rejeté n'est pas enregistré : le brouillon garde la trace du contrôle.
  if (statut === 'rejete') return;
  // Uniquement des champs du brouillon : le titre collecté n'est ni cité ni contrôlé, il n'entre pas dans le média.
  const alt = `Carrousel. ${p.diapositives.map((d) => `${d.libelle} : ${d.texte}`).join(' ')}`;
  await tx.execute({
    sql: `insert into media_asset (post_id, origin, alt_text, notice, content, created_at) values (?, 'generated', ?, ?, ?, ?)`,
    args: [postId, alt, MENTION_ILLUSTRATION, JSON.stringify({ forme: 'carrousel', diapositives: p.diapositives }), p.now],
  });
}
