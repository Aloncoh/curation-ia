// Registre de la sélection : décisions, avis humains et lecture de ce qui reste à trancher.
// Un avis reste un avis : le passage en règle se fait à la main, dans une nouvelle version des consignes.
import type { Client, InStatement } from '@libsql/client';
import { z } from 'zod';
import { CRITERES, DECISIONS, deciderSelection, passagesRetrouves, VERSIONS_CONSIGNES, type Decision } from './consignes.ts';
import type { SujetCorpus } from './corpus.ts';
import type { Cas } from './evaluation.ts';

const critere = z.object({ note: z.number().int().min(0).max(2), raison: z.string().min(1).max(240) }).strict();
export const SchemaCriteres = z.object({ nouveaute_reelle: critere, utilite_concrete: critere, impact_utilisateurs: critere, solidite_sources: critere }).strict();

export const SchemaJugement = z.object({
  id: z.number().int().positive(),
  criteres: SchemaCriteres,
  passages: z.array(z.string().min(1).max(300)).max(3),
  motif: z.string().min(1),
}).strict();
export type Jugement = z.infer<typeof SchemaJugement>;

export const SchemaAvis = z.object({
  id: z.number().int().positive(),
  decision: z.enum(DECISIONS),
  motif: z.string().trim().min(1).nullable(),
  portee: z.enum(['cas_particulier', 'a_confirmer', 'regle_proposee']).default('cas_particulier'),
  /** Décision montrée à l'humain. */
  decision_id: z.number().int().positive().nullable().default(null),
  /** À déclarer : un avis sans décision liée n'est pas forcément un avis à l'aveugle. */
  aveugle: z.boolean().default(false),
}).strict().refine((a) => !(a.aveugle && a.decision_id !== null), { message: 'Un avis lié à une décision montrée ne peut pas être à l\'aveugle.' });
export type Avis = z.infer<typeof SchemaAvis>;

/**
 * Un juge de développement passe par les mêmes garde-fous que le moteur, pour que l'évaluation mesure la même règle.
 * Un passage absent de la capture est retiré, signalé, et bloque la publication.
 */
export function preparerJugement(j: Jugement, sujet: SujetCorpus): { decision: Decision; motif: string; passages: string[]; ecartes: string[] } {
  const capture = [sujet.titre, sujet.texte];
  const passages = passagesRetrouves(j.passages, capture);
  const { decision, motif } = deciderSelection({ criteres: j.criteres, passages: j.passages, compte: 'juge', type_information: 'annonce_officielle', motif_rejet: null }, capture);
  return { decision, motif: motif === 'criteres_remplis' ? j.motif : `${motif} : ${j.motif}`, passages, ecartes: j.passages.filter((p) => !passages.includes(p)) };
}

export async function enregistrerJugements(client: Client, jugements: Jugement[], sujets: SujetCorpus[], o: { juge: string; version: string; origine: 'juge_developpement' | 'modele'; now: string }) {
  const parId = new Map(sujets.map((s) => [s.id, s]));
  const ecartes: { id: number; passages: string[] }[] = [];
  const ordres: InStatement[] = jugements.map((j) => {
    const sujet = parId.get(j.id);
    if (!sujet) throw new Error(`Sujet ${j.id} hors du corpus.`);
    const p = preparerJugement(j, sujet);
    if (p.ecartes.length > 0) ecartes.push({ id: j.id, passages: p.ecartes });
    return {
      sql: `insert into selection_decision (news_item_id, origine, juge, consignes_version, decision, criteres, motif, passages, snapshot_id, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(news_item_id, juge, consignes_version, snapshot_id, prompt_version) where remplacee_le is null do nothing`,
      args: [j.id, o.origine, o.juge, o.version, p.decision, JSON.stringify(j.criteres), p.motif, JSON.stringify(p.passages), sujet.snapshot_id, o.now],
    };
  });
  const resultats = await client.batch(ordres, 'write');
  const enregistres = resultats.reduce((total, r) => total + r.rowsAffected, 0);
  return { enregistres, ignores: ordres.length - enregistres, ecartes };
}

export async function enregistrerAvis(client: Client, avis: Avis[], now: string): Promise<number> {
  for (const a of avis.filter((x) => x.decision_id !== null)) {
    const r = await client.execute({ sql: `select news_item_id from selection_decision where id = ?`, args: [a.decision_id] });
    if (Number(r.rows[0]?.news_item_id) !== a.id) throw new Error(`La décision ${a.decision_id} ne porte pas sur le sujet ${a.id}.`);
  }
  await client.batch(avis.map((a) => ({
    sql: `insert into selection_avis (news_item_id, decision_id, aveugle, decision, motif, portee, created_at) values (?, ?, ?, ?, ?, ?, ?)`,
    args: [a.id, a.decision_id, a.aveugle ? 1 : 0, a.decision, a.motif, a.portee, now],
  })), 'write');
  return avis.length;
}

/** Dernier avis déclaré à l'aveugle de chaque sujet d'évaluation, donné avant que l'humain ait vu une décision du système. */
export async function veritesEvaluation(client: Client): Promise<Map<number, Decision>> {
  const r = await client.execute(
    `select a.news_item_id, a.decision from selection_avis a
     join selection_corpus c on c.news_item_id = a.news_item_id and c.jeu = 'evaluation'
     where a.id = (select max(x.id) from selection_avis x where x.news_item_id = a.news_item_id and x.aveugle = 1
                     and not exists (select 1 from selection_avis v where v.news_item_id = x.news_item_id and v.decision_id is not null and v.id < x.id))`,
  );
  return new Map(r.rows.map((l) => [Number(l.news_item_id), String(l.decision) as Decision]));
}

/** Décision d'un juge pour une version de consignes, confrontée aux avis humains. */
export async function casPourJuge(client: Client, juge: string, version: string, verites: Map<number, Decision>): Promise<Cas[]> {
  // Seule une décision prise sur la capture du corpus se compare à l'avis humain, donné sur ce même texte.
  const r = await client.execute({
    sql: `select d.news_item_id, d.decision from selection_decision d join selection_corpus c on c.news_item_id = d.news_item_id and c.snapshot_id = d.snapshot_id
          where d.juge = ? and d.consignes_version = ? and d.remplacee_le is null`,
    args: [juge, version],
  });
  return r.rows.flatMap((l) => {
    const humain = verites.get(Number(l.news_item_id));
    return humain ? [{ id: Number(l.news_item_id), decision: String(l.decision) as Decision, humain }] : [];
  });
}

/** Version de consignes qui cite cet avis comme origine d'une règle ou d'un exemple. */
const versionCitant = (avis: number) => VERSIONS_CONSIGNES.find((v) => v.changements.some((c) => c.avis.includes(avis)) || v.exemples.some((e) => e.avis === avis))?.version ?? null;

/**
 * Avis qui contredisent la décision montrée : matière à relire, pas règles à appliquer. Le jeu d'évaluation en est
 * exclu : il ne sert jamais à écrire les consignes.
 */
export async function correctionsARelire(client: Client) {
  const r = await client.execute(
    `select a.id, a.news_item_id, n.title, a.decision as humain, d.decision as systeme, a.motif, a.portee, d.consignes_version
     from selection_avis a join selection_decision d on d.id = a.decision_id join news_item n on n.id = a.news_item_id
     left join selection_corpus c on c.news_item_id = a.news_item_id
     where a.decision <> d.decision and c.jeu is not 'evaluation' order by a.portee desc, a.id`,
  );
  return r.rows.map((l) => ({
    avis: Number(l.id), sujet: Number(l.news_item_id), titre: String(l.title), systeme: String(l.systeme), humain: String(l.humain),
    motif: l.motif === null ? null : String(l.motif), portee: String(l.portee), consignes: String(l.consignes_version), regle_version: versionCitant(Number(l.id)),
  }));
}

/** Toutes les décisions d'un sujet, de la plus récente à la plus ancienne, avec ce qui les explique. */
export async function decisionsDuSujet(client: Client, id: number) {
  const r = await client.execute({
    sql: `select decision, motif, consignes_version, juge, criteres, passages, remplacee_le from selection_decision where news_item_id = ? order by remplacee_le is not null, id desc`,
    args: [id],
  });
  return r.rows.map((l) => ({
    remplacee: l.remplacee_le !== null,
    texte: expliquer({ decision: String(l.decision), motif: String(l.motif), consignes_version: String(l.consignes_version), juge: String(l.juge), criteres: l.criteres === null ? null : String(l.criteres), passages: String(l.passages) }),
  }));
}

/** Explication d'une décision : critères, notes, passages, version des consignes. */
export function expliquer(d: { decision: string; motif: string; consignes_version: string; juge: string; criteres: string | null; passages: string }): string {
  const criteres = d.criteres === null ? null : (JSON.parse(d.criteres) as Record<string, { note: number; raison: string }>);
  const passages = JSON.parse(d.passages) as string[];
  return [
    `${d.decision} (${d.motif}) · consignes ${d.consignes_version} · ${d.juge}`,
    ...(criteres ? CRITERES.map((c) => `- ${c} : ${criteres[c]!.note}/2 — ${criteres[c]!.raison}`) : []),
    ...passages.map((p) => `  > ${p}`),
  ].join('\n');
}
