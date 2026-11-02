// Corpus de sélection : tirage reproductible, par source, décidé avant de lire les textes. Le jeu d'évaluation ne sert
// jamais à écrire les consignes : c'est ce qui permet de vérifier qu'elles progressent réellement.
import { createHash } from 'node:crypto';
import type { Client } from '@libsql/client';
import { toPlainText } from '../maquette/data.ts';

export interface Candidat {
  id: number;
  source: string;
}

export interface Tirage {
  id: number;
  jeu: 'developpement' | 'evaluation';
  strate: string;
}

const empreinte = (graine: string, valeur: string | number) => createHash('sha256').update(`${graine}|${valeur}`).digest('hex');

/** Chaque source donne à tour de rôle, dans un ordre fixé par la graine : aucune source ne domine, aucun sujet n'est choisi à la main. */
export function tirerCorpus(candidats: Candidat[], graine: string, tailles: { developpement: number; evaluation: number }): Tirage[] {
  const parSource = new Map<string, Candidat[]>();
  for (const c of candidats) parSource.set(c.source, [...(parSource.get(c.source) ?? []), c]);
  const files = [...parSource.entries()]
    .sort(([a], [b]) => empreinte(graine, a).localeCompare(empreinte(graine, b)))
    .map(([source, liste]) => ({ source, liste: [...liste].sort((a, b) => empreinte(graine, a.id).localeCompare(empreinte(graine, b.id))) }));
  const ordre: { c: Candidat; source: string }[] = [];
  for (let tour = 0; files.some((f) => f.liste.length > tour); tour++) {
    for (const f of files) if (f.liste[tour]) ordre.push({ c: f.liste[tour]!, source: f.source });
  }
  return ordre.slice(0, tailles.developpement + tailles.evaluation).map(({ c, source }, i) => ({ id: c.id, jeu: i < tailles.developpement ? 'developpement' : 'evaluation', strate: source }));
}

export interface SujetCorpus {
  id: number;
  jeu: string;
  source: string;
  genre: string;
  titre: string;
  annonce_le: string | null;
  url: string;
  snapshot_id: number;
  texte: string;
}

const CHAMPS_SUJET = `n.id, n.kind as genre, n.announced_at as annonce_le, d.source_id as source, d.url, s.id as snapshot_id, s.title as titre_capture, s.content, s.content_format`;
const JOINTURE_DOCUMENT = `from news_item n
  join news_item_document nd on nd.news_item_id = n.id and nd.role = 'primary'
  join source_document d on d.id = nd.document_id`;

/** Fige le corpus : un second tirage est refusé, sinon l'évaluation pourrait être refaite jusqu'à obtenir un bon score. */
export async function figerCorpus(client: Client, graine: string, tailles: { developpement: number; evaluation: number }, now: string): Promise<Tirage[]> {
  const existant = await client.execute(`select count(*) as n from selection_corpus`);
  if (Number(existant.rows[0]!.n) > 0) throw new Error("Corpus déjà figé : un nouveau tirage fausserait l'évaluation.");
  const lignes = (await client.execute(`select ${CHAMPS_SUJET} ${JOINTURE_DOCUMENT}
    join document_snapshot s on s.document_id = d.id and s.seq = (select max(seq) from document_snapshot x where x.document_id = d.id)`)).rows;
  const captures = new Map(lignes.map((l) => [Number(l.id), Number(l.snapshot_id)]));
  const tirage = tirerCorpus(lignes.map((l) => ({ id: Number(l.id), source: String(l.source) })), graine, tailles);
  await client.batch(tirage.map((t) => ({
    sql: `insert into selection_corpus (news_item_id, jeu, strate, snapshot_id, graine, created_at) values (?, ?, ?, ?, ?, ?)`,
    args: [t.id, t.jeu, t.strate, captures.get(t.id)!, graine, now],
  })), 'write');
  return tirage;
}

export async function sujetsDuCorpus(client: Client, jeu?: 'developpement' | 'evaluation'): Promise<SujetCorpus[]> {
  const r = await client.execute({
    sql: `select ${CHAMPS_SUJET}, sc.jeu ${JOINTURE_DOCUMENT}
          join selection_corpus sc on sc.news_item_id = n.id
          join document_snapshot s on s.id = sc.snapshot_id
          ${jeu ? 'where sc.jeu = ?' : ''} order by n.id`,
    args: jeu ? [jeu] : [],
  });
  return r.rows.map((l) => ({
    id: Number(l.id),
    jeu: String(l.jeu),
    source: String(l.source),
    genre: String(l.genre),
    titre: String(l.titre_capture),
    annonce_le: l.annonce_le === null ? null : String(l.annonce_le),
    url: String(l.url),
    snapshot_id: Number(l.snapshot_id),
    texte: toPlainText(String(l.content), String(l.content_format)),
  }));
}
