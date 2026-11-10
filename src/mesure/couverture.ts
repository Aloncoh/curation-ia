// Couverture par agent et santé de la file des découvertes (2026-11-10, demande de l'utilisateur : « pour chaque agent,
// donne les sources réellement actives, la dernière collecte réussie, les candidats détectés et le nombre arrivé jusqu'au
// fil… Une collecte qui tourne alors que sa file vieillit doit déclencher une alerte »). Lecture seule.
import type { Client } from '@libsql/client';
import { SOURCES } from '../sources.ts';

export const AGENTS = ['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar'] as const;
/** Une découverte en attente plus vieille que ce délai, sans grille notée depuis 24 h, déclenche l'alerte. */
export const AGE_ALERTE_FILE_HEURES = 48;

export interface LigneAgent {
  agent: string;
  sources: number;
  /** Sources dont la dernière collecte réussie date de moins de 24 h. */
  actives24h: number;
  enEchec: number;
  derniereCollecte: string | null;
  /** Documents nouveaux collectés sur 7 jours par ses sources (candidats détectés). */
  candidats7j: number;
  /** Publications en ligne signées par l'agent sur 7 jours. */
  publiees7j: number;
}

export interface EtatFile {
  enAttente: number;
  plusAncienne: string | null;
  grillesNoteesDepuis24h: number;
  alerte: string | null;
}

/** Agent d'une source : celui imposé par sa définition, celui de la découverte, Repo pour un dépôt, sinon « modèle ». */
function agentDe(id: string, config: string | null): string {
  const def = SOURCES.find((s) => s.id === id);
  if (def) return def.compte ?? 'choisi par le modèle';
  if (id.startsWith('github-ressource:')) {
    try {
      return (JSON.parse(config ?? '{}') as { decouverte?: { compte?: string } }).decouverte?.compte ?? 'repo';
    } catch {
      return 'repo';
    }
  }
  if (id.startsWith('site-ressource:') || id.startsWith('selection-ressources:')) return 'mova';
  return 'choisi par le modèle';
}

export async function couvertureParAgent(client: Pick<Client, 'execute'>, maintenant: string): Promise<LigneAgent[]> {
  const jour = new Date(Date.parse(maintenant) - 86_400_000).toISOString();
  const semaine = new Date(Date.parse(maintenant) - 7 * 86_400_000).toISOString();
  const sources = await client.execute(`select id, config, status, last_success_at from source where active = 1`);
  const docs = await client.execute({ sql: `select source_id, count(*) n from source_document where first_collected_at > ? group by source_id`, args: [semaine] });
  const posts = await client.execute({ sql: `select account_id, count(*) n from post where status = 'publie' and published_at > ? group by account_id`, args: [semaine] });
  const nDocs = new Map(docs.rows.map((r) => [String(r.source_id), Number(r.n)]));
  const lignes = new Map<string, LigneAgent>();
  const ligne = (a: string) => lignes.get(a) ?? lignes.set(a, { agent: a, sources: 0, actives24h: 0, enEchec: 0, derniereCollecte: null, candidats7j: 0, publiees7j: 0 }).get(a)!;
  for (const r of sources.rows) {
    const l = ligne(agentDe(String(r.id), r.config === null ? null : String(r.config)));
    l.sources++;
    const succes = r.last_success_at === null ? null : String(r.last_success_at);
    if (succes && succes > jour) l.actives24h++;
    if (String(r.status) === 'failed' || String(r.status) === 'error') l.enEchec++;
    if (succes && (!l.derniereCollecte || succes > l.derniereCollecte)) l.derniereCollecte = succes;
    l.candidats7j += nDocs.get(String(r.id)) ?? 0;
  }
  for (const r of posts.rows) ligne(String(r.account_id)).publiees7j += Number(r.n);
  const ordre = (a: string) => { const i = (AGENTS as readonly string[]).indexOf(a); return i < 0 ? 99 : i; };
  return [...lignes.values()].sort((a, b) => ordre(a.agent) - ordre(b.agent));
}

/** File des découvertes : en attente de la grille, âge de la plus ancienne, et alerte si elle vieillit sans traitement. */
export async function etatFileDecouvertes(client: Pick<Client, 'execute'>, maintenant: string): Promise<EtatFile> {
  const r = await client.execute(`
    select count(*) n, min(n.first_seen_at) plus_ancienne
    from news_item n
    join selection_decision x on x.news_item_id = n.id and x.remplacee_le is null
    where n.kind = 'decouverte' and x.decision = 'approfondir' and x.motif = 'grille_d1_a_faire'`);
  const jour = new Date(Date.parse(maintenant) - 86_400_000).toISOString();
  const g = await client.execute({ sql: `select count(*) n from llm_call where stage = 'decouverte_grille' and started_at > ?`, args: [jour] });
  const enAttente = Number(r.rows[0]?.n ?? 0);
  const plusAncienne = r.rows[0]?.plus_ancienne == null ? null : String(r.rows[0].plus_ancienne);
  const grillesNoteesDepuis24h = Number(g.rows[0]?.n ?? 0);
  const ageHeures = plusAncienne ? (Date.parse(maintenant) - Date.parse(plusAncienne)) / 3_600_000 : 0;
  const alerte = enAttente > 0 && ageHeures > AGE_ALERTE_FILE_HEURES && grillesNoteesDepuis24h === 0
    ? `ALERTE : ${enAttente} découverte(s) en attente, la plus ancienne depuis ${Math.round(ageHeures)} h, aucune notée depuis 24 h (rédaction coupée ou en échec ?)`
    : null;
  return { enAttente, plusAncienne, grillesNoteesDepuis24h, alerte };
}
