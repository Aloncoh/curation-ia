// Rattache à un post la vidéo trouvée dans ses sources (src/media/video-source.ts), comme média `external_embed` : le
// montage du post reste son média principal (`generated`), la vidéo s'affiche en dessous. Une seule vidéo par post, jamais
// remplacée automatiquement. Les posts récents (3 jours) sont examinés à chaque cycle ; `tous` reprend tout l'historique.
import type { Client } from '@libsql/client';
import { adresseIntegration, videoDesCaptures, type CaptureVideo, type VideoTrouvee } from './video-source.ts';

export const NOTICE_VIDEO = 'Vidéo de la source — contenu externe, non produit par la plateforme';
export const JOURS_RECENTS = 3;

export interface ContenuVideo {
  forme: 'video';
  fournisseur: VideoTrouvee['fournisseur'];
  id: string | null;
  fichier: string | null;
  integration: string;
  titre: string | null;
  page: string;
  editeur: string;
  document_id: number;
  snapshot_id: number;
}

export interface BilanVideos {
  examines: number;
  trouves: { post_id: number; fournisseur: string; editeur: string; titre: string | null; page: string }[];
  ecrits: number;
}

const editeurDe = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

export function contenuVideo(video: VideoTrouvee, capture: CaptureVideo & { document_id: number; snapshot_id: number }): ContenuVideo {
  return {
    forme: 'video',
    fournisseur: video.fournisseur,
    id: video.fournisseur === 'fichier' ? null : video.id,
    fichier: video.fournisseur === 'fichier' ? video.fichier : null,
    integration: adresseIntegration(video),
    titre: video.titre,
    page: capture.url,
    editeur: editeurDe(capture.url),
    document_id: capture.document_id,
    snapshot_id: capture.snapshot_id,
  };
}

export async function associerVideos(client: Client, o: { maintenant: string; tous?: boolean; ecrire: boolean }): Promise<BilanVideos> {
  const depuis = new Date(Date.parse(o.maintenant) - JOURS_RECENTS * 86_400_000).toISOString();
  const posts = await client.execute({
    sql: `select p.id from post p
          where p.status in ('publie', 'en_attente')
            and not exists (select 1 from media_asset m where m.post_id = p.id and m.origin = 'external_embed')
            ${o.tous ? '' : 'and p.created_at >= ?'}
          order by p.id`,
    args: o.tous ? [] : [depuis],
  });
  const bilan: BilanVideos = { examines: posts.rows.length, trouves: [], ecrits: 0 };
  for (const row of posts.rows) {
    const postId = Number(row.id);
    // Seules les captures qui peuvent contenir une vidéo sont lues (le contenu d'une page pèse jusqu'à plusieurs centaines de Ko).
    const r = await client.execute({
      sql: `select d.id as document_id, d.url, d.title, s.id as snapshot_id, s.content, s.content_format
            from post p
            join news_item_document nd on nd.news_item_id = p.news_item_id
            join source_document d on d.id = nd.document_id
            join document_snapshot s on s.document_id = d.id
              and s.seq = (select max(x.seq) from document_snapshot x where x.document_id = d.id)
            where p.id = ? and d.url like 'https://%'
              and (d.url like '%youtube.com/watch%' or d.url like '%youtu.be/%'
                   or (s.content_format = 'html' and (s.content like '%<iframe%' or s.content like '%<video%')))
            order by case nd.role when 'primary' then 0 else 1 end, d.id`,
      args: [postId],
    });
    const captures = r.rows.map((x) => ({
      url: String(x.url),
      titre: x.title === null ? null : String(x.title),
      contenu: x.content === null ? '' : String(x.content),
      format: String(x.content_format),
      document_id: Number(x.document_id),
      snapshot_id: Number(x.snapshot_id),
    }));
    const trouve = videoDesCaptures(captures);
    if (!trouve) continue;
    const capture = trouve.capture as (typeof captures)[number];
    const contenu = contenuVideo(trouve.video, capture);
    bilan.trouves.push({ post_id: postId, fournisseur: contenu.fournisseur, editeur: contenu.editeur, titre: contenu.titre, page: contenu.page });
    if (!o.ecrire) continue;
    await client.execute({
      sql: `insert into media_asset (post_id, origin, alt_text, notice, license, attribution, content, created_at)
            select ?, 'external_embed', ?, ?, null, ?, ?, ?
            where not exists (select 1 from media_asset where post_id = ? and origin = 'external_embed')`,
      args: [postId, contenu.titre ?? `Video from ${contenu.editeur}`, NOTICE_VIDEO, contenu.editeur, JSON.stringify(contenu), o.maintenant, postId],
    });
    bilan.ecrits++;
  }
  return bilan;
}

/** Vidéos des posts demandés, lues pour l'API : contenu validé à nouveau (adresse https du lecteur attendu). */
export async function lireVideos(client: Client, ids: readonly number[]): Promise<Map<number, ContenuVideo>> {
  const videos = new Map<number, ContenuVideo>();
  if (ids.length === 0) return videos;
  const r = await client.execute({
    sql: `select post_id, content from media_asset where origin = 'external_embed' and post_id in (${ids.map(() => '?').join(', ')}) order by id`,
    args: [...ids],
  });
  for (const row of r.rows) {
    if (videos.has(Number(row.post_id)) || row.content === null) continue;
    let c: Partial<ContenuVideo>;
    try {
      c = JSON.parse(String(row.content)) as Partial<ContenuVideo>;
    } catch {
      continue;
    }
    if (c.forme !== 'video' || typeof c.integration !== 'string' || typeof c.page !== 'string' || typeof c.editeur !== 'string') continue;
    const attendu =
      c.fournisseur === 'youtube' ? /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/
      : c.fournisseur === 'vimeo' ? /^https:\/\/player\.vimeo\.com\/video\/\d{3,12}\?dnt=1$/
      : c.fournisseur === 'fichier' ? /^https:\/\/[^\s"'<>]+$/
      : null;
    if (!attendu || !attendu.test(c.integration) || !/^https:\/\//.test(c.page)) continue;
    videos.set(Number(row.post_id), c as ContenuVideo);
  }
  return videos;
}
