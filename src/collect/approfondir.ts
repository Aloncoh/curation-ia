// Approfondir (2026-11-03) : un flux qui ne donne qu'une phrase (GPT-6.1 Terra, Gemini 4 Carbon) ne suffit pas à citer
// une nouveauté. Pour une actualité « à approfondir » ou écartée faute de source, on capture la page officielle de
// l'article, sur un hôte autorisé de sa source, avec les mêmes protections que la collecte (liste blanche, IP validée,
// aucune redirection, délai et taille plafonnés). Chaque refus est tracé dans `run`. La nouvelle capture relance la
// qualification par `npm run brouillons` ; aucun appel au modèle ici.
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/client.ts';
import { extrairePage, MOTS_MIN_PAGE } from '../ressources/selection/html.ts';
import { AGE_MAX_JOURS } from '../selection/consignes.ts';
import { SOURCES } from '../sources.ts';
import { contentHash } from './normalize.ts';
import { safeGet, SafeFetchError, type Resolver, type Transport } from './safe-fetch.ts';

/** En dessous, la capture du flux n'est qu'une accroche : la page de l'article vaut d'être lue. */
export const TEXTE_MIN_CAPTURE = 400;

export interface ResultatApprofondir {
  newsItemId: number;
  url: string;
  statut: 'capturee' | 'refusee' | 'trop_courte';
  motif: string | null;
  mots: number;
}

/** Pages capturées au plus par passage : la chaîne repasse toutes les heures, inutile de solliciter un site d'un coup. */
export const MAX_PAGES_PAR_PASSAGE = 30;
/** Une page refusée (403, délai…) n'est pas redemandée avant ce délai. */
export const REESSAI_APRES_HEURES = 24;

export async function approfondir(
  database: Database,
  o: { now: () => string; timeoutMs: number; maxBytes: number; userAgent: string; ageMaxJours?: number; max?: number; deps?: { resolve?: Resolver; transport?: Transport } },
): Promise<ResultatApprofondir[]> {
  const { client } = database;
  const maintenant = Date.parse(o.now());
  const depuis = new Date(maintenant - (o.ageMaxJours ?? AGE_MAX_JOURS) * 86_400_000).toISOString();
  const reessai = new Date(maintenant - REESSAI_APRES_HEURES * 3_600_000).toISOString();
  // Deux cas (demande de l'utilisateur du 2026-11-05, « capture les pages ») : une actualité déjà jugée « à approfondir »,
  // et, avant toute analyse, une actualité récente dont le flux ne donne qu'un titre ou une accroche (Intel, AMD, Hugging
  // Face, Higgsfield, Notion, résumés de TechCrunch ou d'Apple) : sans page, elle ne serait jamais analysée.
  const r = await client.execute({
    sql: `
    select n.id, doc.id as document_id, doc.url, doc.source_id, c.title, c.content, c.seq
    from news_item n
    join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
    join source_document doc on doc.id = nd.document_id
    join document_snapshot c on c.document_id = doc.id and c.seq = (select max(seq) from document_snapshot x where x.document_id = doc.id)
    left join post_draft d on d.news_item_id = n.id
    where n.kind in ('annonce', 'version')
      and (d.status = 'a_approfondir' or (d.status = 'ecartee' and d.rejection_reason = 'source_insuffisante')
           or (d.id is null and coalesce(n.announced_at, n.first_seen_at) >= ?))
      and length(c.content) < ${TEXTE_MIN_CAPTURE}
      and not exists (select 1 from run x where x.kind = 'approfondir' and x.status = 'failed' and x.started_at >= ? and x.error_message like doc.url || ' — %')
    order by d.id is not null desc, coalesce(n.announced_at, n.first_seen_at) desc, n.id desc
    limit ?`,
    args: [depuis, reessai, o.max ?? MAX_PAGES_PAR_PASSAGE],
  });
  const resultats: ResultatApprofondir[] = [];
  for (const row of r.rows) {
    const newsItemId = Number(row.id);
    const url = String(row.url);
    const source = SOURCES.find((s) => s.id === row.source_id);
    const runId = randomUUID();
    const debut = o.now();
    const tracer = async (statut: 'succeeded' | 'failed', erreur: { kind: string; message: string } | null) =>
      client.execute({
        sql: `insert into run (id, kind, source_id, mode, worker_id, status, started_at, finished_at, error_kind, error_message) values (?, 'approfondir', ?, 'live', 'approfondir', ?, ?, ?, ?, ?)`,
        // L'adresse en tête du message : une page refusée n'est pas redemandée avant REESSAI_APRES_HEURES.
        args: [runId, String(row.source_id), statut, debut, o.now(), erreur?.kind ?? null, erreur ? `${url} — ${erreur.message}` : null],
      });
    if (!source) {
      await tracer('failed', { kind: 'source_inconnue', message: 'source absente du registre' });
      resultats.push({ newsItemId, url, statut: 'refusee', motif: 'source absente du registre', mots: 0 });
      continue;
    }
    let html: string;
    try {
      const reponse = await safeGet(url, { allowedHosts: source.allowedHosts, timeoutMs: o.timeoutMs, maxBytes: o.maxBytes }, { 'user-agent': o.userAgent, accept: 'text/html' }, o.deps);
      html = reponse.body.toString('utf8');
    } catch (e) {
      const motif = e instanceof Error ? e.message : String(e);
      await tracer('failed', { kind: e instanceof SafeFetchError ? e.kind : 'erreur', message: motif.slice(0, 300) });
      resultats.push({ newsItemId, url, statut: 'refusee', motif, mots: 0 });
      continue;
    }
    const page = extrairePage(html);
    if (page.mots < MOTS_MIN_PAGE) {
      await tracer('failed', { kind: 'page_trop_courte', message: `${page.mots} mots : la page ne livre presque rien sans son script` });
      resultats.push({ newsItemId, url, statut: 'trop_courte', motif: `${page.mots} mots`, mots: page.mots });
      continue;
    }
    // Le titre du flux reste celui de la capture : le contrôle mot pour mot lit le titre puis le texte de l'article.
    const titre = String(row.title);
    const contenu = page.texte;
    await tracer('succeeded', null);
    await client.batch([
      {
        sql: `insert into document_snapshot (document_id, seq, content_hash, title, content, content_format, captured_at, run_id) values (?, ?, ?, ?, ?, 'text', ?, ?)`,
        args: [Number(row.document_id), Number(row.seq) + 1, contentHash({ title: titre, version: null, content: contenu }), titre, contenu, o.now(), runId],
      },
      // Une actualité écartée faute de source redevient « à approfondir » : la chaîne la requalifie sur la nouvelle capture.
      { sql: `update post_draft set status = 'a_approfondir' where news_item_id = ? and status = 'ecartee' and rejection_reason = 'source_insuffisante'`, args: [newsItemId] },
    ], 'write');
    resultats.push({ newsItemId, url, statut: 'capturee', motif: null, mots: page.mots });
  }
  return resultats;
}
