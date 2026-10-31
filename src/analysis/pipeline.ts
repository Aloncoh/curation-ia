// Qualification, attribution à un compte, brouillon, contrôles. Aucune publication.
import { randomUUID } from 'node:crypto';
import type { Client } from '@libsql/client';
import { z } from 'zod';
import { redactSecrets } from '../config.ts';
import { isPaused } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { toPlainText } from '../maquette/data.ts';
import { BudgetInsuffisant, marquerErreur, reserver, solder, type Plafonds } from './budget.ts';
import { controlerBrouillon, moinsDeTroisMots } from './controles.ts';
import { estReprenable, schemaSortie, type Modele, type RequeteModele } from './modele.ts';
import { documentUtilisateur, PROMPT_VERSION, SYSTEME_QUALIFICATION, SYSTEME_REDACTION } from './prompts.ts';
import { Brouillon, Qualification } from './schemas.ts';

export const MAX_TENTATIVES = 2;
const MAX_TOKENS = { qualification: 2_000, redaction: 8_000 };

class ArretPause extends Error {}

export interface OptionsBrouillons {
  database: Database;
  modele: Modele;
  nomModele: string;
  maxItems: number;
  capRunMicroUsd: number;
  capTotalMicroUsd: number;
  clock?: () => Date;
  estReprenable?: (e: unknown) => boolean;
}

/**
 * Actualités sans résultat, dont la dernière capture vient d'une collecte réelle. Une capture de moins de trois mots
 * ne permet aucune citation : elle ne part pas au modèle et ne fige rien, l'actualité repassera avec une capture complète.
 */
async function aTraiter(client: Client, limite: number) {
  const r = await client.execute(
    `select n.id, n.title, n.announced_at, v.version, p.name as produit, c.id as snapshot_id, c.title as snapshot_title, c.content, c.content_format
          from news_item n
          join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
          join document_snapshot c on c.document_id = nd.document_id
            and c.seq = (select max(seq) from document_snapshot x where x.document_id = nd.document_id)
          join run r on r.id = c.run_id and r.mode = 'live'
          left join news_item_target t on t.news_item_id = n.id
          left join product_version v on v.id = t.product_version_id
          left join product p on p.id = t.product_id
          where not exists (select 1 from post_draft p where p.news_item_id = n.id)
          order by coalesce(n.announced_at, n.first_seen_at) desc, n.id desc`,
  );
  const avecTexte = r.rows.filter((row) => !moinsDeTroisMots(toPlainText(String(row.content), String(row.content_format))));
  return { lignes: avecTexte.slice(0, limite), sansTexte: r.rows.length - avecTexte.length };
}

export async function genererBrouillons(o: OptionsBrouillons) {
  const client = o.database.client;
  const now = () => (o.clock ?? (() => new Date()))().toISOString();
  const reprendre = o.estReprenable ?? estReprenable;
  const runId = randomUUID();
  const plafonds: Plafonds = { runId, capRunMicroUsd: o.capRunMicroUsd, capTotalMicroUsd: o.capTotalMicroUsd };
  await client.execute({
    sql: `insert into llm_run (id, started_at, status, max_items, cap_run_micro_usd, cap_total_micro_usd) values (?, ?, 'en_cours', ?, ?, ?)`,
    args: [runId, now(), o.maxItems, o.capRunMicroUsd, o.capTotalMicroUsd],
  });

  async function appeler<T>(newsItemId: number, stage: 'qualification' | 'redaction', systeme: string, utilisateur: string, schema: z.ZodType<T>): Promise<T | null> {
    const requete: RequeteModele = { modele: o.nomModele, systeme, utilisateur, maxTokens: MAX_TOKENS[stage], schema: schemaSortie(schema) };
    for (let attempt = 1; attempt <= MAX_TENTATIVES; attempt++) {
      if (await isPaused(o.database.db)) throw new ArretPause('pause active');
      const inputTokens = await o.modele.compter(requete);
      const id = await reserver(client, plafonds, { newsItemId, stage, attempt, model: o.nomModele, promptVersion: PROMPT_VERSION, inputTokens, maxTokens: requete.maxTokens }, now());
      try {
        const r = await o.modele.appeler(requete);
        await solder(client, id, o.nomModele, r.usage, r.stop, now());
        if (r.stop !== 'end_turn') return null;
        try {
          return schema.parse(JSON.parse(r.texte));
        } catch {
          return null;
        }
      } catch (e) {
        await marquerErreur(client, id, redactSecrets(e instanceof Error ? e.message : String(e)), now());
        if (!reprendre(e) || attempt === MAX_TENTATIVES) throw e;
      }
    }
    return null;
  }

  let statut = 'terminee';
  let motif: string | null = null;
  const bilan = { ecartees: 0, invalides: 0, a_verifier: 0, controlees: 0, sans_texte: 0 };
  try {
    const { lignes, sansTexte } = await aTraiter(client, o.maxItems);
    bilan.sans_texte = sansTexte;
    for (const row of lignes) {
      const id = Number(row.id);
      const titre = String(row.title);
      const titreCapture = String(row.snapshot_title);
      const produit = row.produit === null ? null : String(row.produit);
      const texte = toPlainText(String(row.content), String(row.content_format));
      // Le titre fait partie de la capture stockée : le modèle et le contrôle mot pour mot lisent le même texte.
      const capture = `${titreCapture} ${texte}`;
      const doc = documentUtilisateur(titreCapture, texte, produit);
      const enregistrer = (status: string, q: Qualification | null, content: unknown, checks: unknown) =>
        client.execute({
          sql: `insert into post_draft (news_item_id, run_id, status, account, rejection_reason, information_type, snapshot_id, model, prompt_version, content, checks, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, runId, status, q?.compte ?? null, q?.motif_rejet ?? null, q?.type_information ?? null, Number(row.snapshot_id), o.nomModele, PROMPT_VERSION,
            content ? JSON.stringify(content) : null, checks ? JSON.stringify(checks) : null, now()],
        });

      const q = await appeler(id, 'qualification', SYSTEME_QUALIFICATION, doc, Qualification);
      if (!q) { await enregistrer('sortie_invalide', null, null, null); bilan.invalides++; continue; }
      if (!q.retenue) { await enregistrer('ecartee', q, null, null); bilan.ecartees++; continue; }
      const b = await appeler(id, 'redaction', SYSTEME_REDACTION, doc, Brouillon);
      if (!b) { await enregistrer('sortie_invalide', q, null, null); bilan.invalides++; continue; }
      const controles = controlerBrouillon(b, capture, titre, row.version === null ? null : String(row.version), q.type_information, produit);
      const ok = controles.length === 0;
      // La date et le niveau de preuve viennent du code ; la nature vient de la qualification, sans contrôle déterministe. V1 : analyse documentaire seule.
      const contenu = { ...b, date_annonce: row.announced_at ?? null, nature: q.nature, niveau_preuve: 'analyse_documentaire' };
      await enregistrer(ok ? 'controle_automatique' : 'a_verifier', q, contenu, controles);
      if (ok) bilan.controlees++; else bilan.a_verifier++;
    }
  } catch (e) {
    if (e instanceof BudgetInsuffisant) statut = 'arret_budget';
    else if (e instanceof ArretPause) statut = 'arret_pause';
    else statut = 'echec';
    motif = redactSecrets(e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  await client.execute({ sql: `update llm_run set status = ?, reason = ?, finished_at = ? where id = ?`, args: [statut, motif, now(), runId] });
  return { runId, statut, motif, ...bilan };
}
