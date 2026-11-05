// Pilotage de la chaîne (P5) : un cycle enchaîne collecte, approfondissement, brouillons, contrôles, planification,
// traduction et publication, chacune par sa propre commande (même code qu'à la main). Le cycle :
// - ne fait rien sans --confirmer, ni pendant la pause (vérifiée avant chaque étape) ;
// - ne collecte que les sources dues (intervalle propre à chaque source) et n'approfondit qu'une fois par heure ;
// - saute une étape payante si son modèle, sa clé ou ses plafonds manquent, au lieu d'appeler sans limite ;
// - continue après l'échec d'une étape, pour que la publication du jour ne dépende pas d'une source en panne ;
// - enregistre son bilan dans le réglage `chaine.dernier_cycle`, lu par `npm run etat`.
import type { Client } from '@libsql/client';
import { isPaused } from '../control/settings.ts';
import type { Database } from '../db/client.ts';
import { jourParis } from '../ressources/planification.ts';
import { SOURCES } from '../sources.ts';

export interface Etape {
  nom: 'collecte' | 'approfondissement' | 'brouillons' | 'controles' | 'planification' | 'decouverte' | 'redaction_decouvertes' | 'traduction' | 'publication';
  script: string;
  args: string[];
  /** Variables exigées : sans elles, l'étape est sautée (étapes payantes). */
  exige?: string[];
  /** Au plus une exécution par période, en minutes. */
  cadenceMinutes?: number;
  /** Appelle le modèle : soumise au plafond du jour (CURATION_PLAFOND_JOUR_USD) en plus des plafonds de la commande. */
  payante?: boolean;
}

export const ETAPES: readonly Etape[] = [
  { nom: 'collecte', script: 'src/cli/collect.ts', args: [] },
  { nom: 'approfondissement', script: 'src/cli/approfondir.ts', args: [], cadenceMinutes: 60 },
  { nom: 'brouillons', script: 'src/cli/brouillons.ts', args: ['--confirmer'], exige: ['CURATION_MODELE', 'DEEPSEEK_API_KEY', 'CURATION_MAX_ACTUALITES', 'CURATION_PLAFOND_EXECUTION_USD', 'CURATION_PLAFOND_TOTAL_USD', 'CURATION_PLAFOND_JOUR_USD'], payante: true },
  { nom: 'controles', script: 'src/cli/brouillons-recontroler.ts', args: [] },
  { nom: 'planification', script: 'src/cli/brouillons-planifier.ts', args: [] },
  // Découvertes (P6) : recherche GitHub toutes les 6 heures (plafond de l'API sans jeton), grille d1 et rédaction ensuite.
  { nom: 'decouverte', script: 'src/cli/ressources.ts', args: ['decouvrir', '--capturer'], cadenceMinutes: 360 },
  { nom: 'redaction_decouvertes', script: 'src/cli/ressources.ts', args: ['rediger', '--confirmer'], exige: ['CURATION_MODELE', 'DEEPSEEK_API_KEY', 'CURATION_MAX_DECOUVERTES', 'CURATION_PLAFOND_EXECUTION_USD', 'CURATION_PLAFOND_TOTAL_USD', 'CURATION_PLAFOND_JOUR_USD'], payante: true },
  { nom: 'traduction', script: 'src/cli/traduire.ts', args: ['--confirmer'], exige: ['CURATION_MODELE', 'DEEPSEEK_API_KEY', 'CURATION_MAX_TRADUCTIONS', 'CURATION_PLAFOND_EXECUTION_USD', 'CURATION_PLAFOND_TOTAL_USD', 'CURATION_PLAFOND_JOUR_USD'], payante: true },
  { nom: 'publication', script: 'src/cli/publier.ts', args: ['--confirmer'] },
];

/** Intervalle par défaut d'une source sans intervalle déclaré. */
export const INTERVALLE_DEFAUT_MINUTES = 60;
export const CLE_CYCLE = 'chaine.dernier_cycle';

export interface ResultatEtape {
  nom: Etape['nom'];
  statut: 'reussie' | 'echec' | 'sautee';
  motif: string | null;
  code: number | null;
  debut: string | null;
  duree_ms: number | null;
}

export interface BilanCycle {
  debut: string;
  fin: string;
  statut: 'termine' | 'pause' | 'refuse';
  sources_dues: string[];
  etapes: ResultatEtape[];
  /** Dernière exécution réelle de chaque étape, tous cycles confondus (cadences). */
  dernieres?: Record<string, string>;
}

/** Dépense enregistrée le jour civil (Europe/Paris) de `maintenant`, réservations sans coût connu comprises. */
export async function depenseDuJour(client: Pick<Client, 'execute'>, maintenant: string): Promise<number> {
  const r = await client.execute({ sql: 'select started_at, coalesce(actual_micro_usd, reserved_micro_usd) as cout from llm_call where started_at >= ?', args: [new Date(Date.parse(maintenant) - 2 * 86_400_000).toISOString()] });
  const jour = jourParis(maintenant);
  return r.rows.filter((x) => jourParis(String(x.started_at)) === jour).reduce((n, x) => n + Number(x.cout), 0);
}

/** Sources à collecter maintenant : jamais réussies, ou dont le dernier succès dépasse leur intervalle. */
export async function sourcesDues(client: Pick<Client, 'execute'>, maintenant: string): Promise<string[]> {
  const r = await client.execute('select id, last_success_at, reessai_apres from source');
  const succes = new Map(r.rows.map((x) => [String(x.id), x.last_success_at === null ? null : String(x.last_success_at)]));
  // Registre d'accès (src/collect/acces.ts) : une source différée ou en attente de reprise n'est pas due.
  const reessai = new Map(r.rows.map((x) => [String(x.id), x.reessai_apres === null ? null : String(x.reessai_apres)]));
  return SOURCES.filter((s) => {
    if (s.differee) return false;
    const attente = reessai.get(s.id) ?? null;
    if (attente !== null && attente > maintenant) return false;
    const dernier = succes.get(s.id) ?? null;
    if (dernier === null) return true;
    return Date.parse(maintenant) - Date.parse(dernier) >= (s.fetchIntervalMinutes ?? INTERVALLE_DEFAUT_MINUTES) * 60_000;
  }).map((s) => s.id);
}

export async function lireCycle(client: Pick<Client, 'execute'>): Promise<BilanCycle | null> {
  const r = await client.execute({ sql: 'select value from setting where key = ?', args: [CLE_CYCLE] });
  return r.rows[0] ? (JSON.parse(String(r.rows[0].value)) as BilanCycle) : null;
}

async function ecrireCycle(client: Pick<Client, 'execute'>, bilan: BilanCycle): Promise<void> {
  await client.execute({
    sql: `insert into setting (key, value, updated_at) values (?, ?, ?) on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at`,
    args: [CLE_CYCLE, JSON.stringify(bilan), bilan.fin],
  });
}

export type Executeur = (etape: Etape, env: Record<string, string>) => Promise<{ code: number | null }>;

export interface OptionsCycle {
  database: Database;
  executer: Executeur;
  env: NodeJS.ProcessEnv;
  confirme: boolean;
  maintenant?: () => string;
}

export async function lancerCycle(o: OptionsCycle): Promise<BilanCycle> {
  const now = o.maintenant ?? (() => new Date().toISOString());
  const debut = now();
  const precedent = await lireCycle(o.database.client);
  const bilan: BilanCycle = { debut, fin: debut, statut: 'termine', sources_dues: [], etapes: [] };
  if (!o.confirme) return { ...bilan, statut: 'refuse' };
  if (await isPaused(o.database.db)) return { ...bilan, statut: 'pause' };
  bilan.sources_dues = await sourcesDues(o.database.client, debut);

  for (const etape of ETAPES) {
    const resultat = (statut: ResultatEtape['statut'], motif: string | null, code: number | null = null, depart: string | null = null, duree: number | null = null) =>
      bilan.etapes.push({ nom: etape.nom, statut, motif, code, debut: depart, duree_ms: duree });
    if (await isPaused(o.database.db)) {
      bilan.statut = 'pause';
      break;
    }
    const manquantes = (etape.exige ?? []).filter((v) => !o.env[v]?.trim());
    if (manquantes.length) { resultat('sautee', `variables absentes : ${manquantes.join(', ')}`); continue; }
    if (etape.nom === 'collecte' && bilan.sources_dues.length === 0) { resultat('sautee', 'aucune source due'); continue; }
    if (etape.payante) {
      const plafond = Math.floor(Number(o.env.CURATION_PLAFOND_JOUR_USD) * 1_000_000);
      const depense = await depenseDuJour(o.database.client, debut);
      if (!Number.isFinite(plafond) || plafond <= 0) { resultat('sautee', 'plafond du jour invalide'); continue; }
      if (depense >= plafond) { resultat('sautee', `plafond du jour atteint (${depense} µ$ sur ${plafond})`); continue; }
    }
    const derniere = precedent?.dernieres?.[etape.nom] ?? null;
    if (etape.cadenceMinutes && derniere && Date.parse(debut) - Date.parse(derniere) < etape.cadenceMinutes * 60_000) { resultat('sautee', `déjà faite à ${derniere}`); continue; }
    const depart = now();
    const env: Record<string, string> = etape.nom === 'collecte' ? { CURATION_ONLY_SOURCES: bilan.sources_dues.join(',') } : {};
    try {
      const { code } = await o.executer(etape, env);
      resultat(code === 0 ? 'reussie' : 'echec', code === 0 ? null : `code de sortie ${code}`, code, depart, Date.parse(now()) - Date.parse(depart));
    } catch (e) {
      resultat('echec', e instanceof Error ? e.message.slice(0, 200) : String(e), null, depart, Date.parse(now()) - Date.parse(depart));
    }
  }
  bilan.fin = now();
  // Garde la date de la dernière exécution réelle de chaque étape, pour les cadences.
  bilan.dernieres = { ...(precedent?.dernieres ?? {}) };
  for (const e of bilan.etapes) if (e.statut !== 'sautee' && e.debut) bilan.dernieres[e.nom] = e.debut;
  await ecrireCycle(o.database.client, bilan);
  return bilan;
}

export interface Etat {
  pause: boolean;
  jour: string;
  plafond_jour: number;
  publiees_aujourdhui: number;
  en_attente: number;
  reportees: { motif: string | null; n: number }[];
  dernier_cycle: BilanCycle | null;
  depense_micro_usd: number;
}

/** Vue d'ensemble de la chaîne, pour `npm run etat`. */
export async function etatDeLaChaine(database: Database, maintenant: string, plafond: number): Promise<Etat> {
  const c = database.client;
  const jour = jourParis(maintenant);
  const publiees = await c.execute({ sql: `select published_at from post where status = 'publie' and published_at >= ?`, args: [new Date(Date.parse(maintenant) - 2 * 86_400_000).toISOString()] });
  const attente = await c.execute(`select count(*) as n from post p join publication_planifiee pp on pp.post_id = p.id where p.status = 'en_attente' and pp.etat = 'prevue'`);
  const reportees = await c.execute(`select pp.motif, count(*) as n from post p join publication_planifiee pp on pp.post_id = p.id where p.status = 'en_attente' and pp.etat = 'reportee' group by pp.motif order by n desc`);
  const depense = await c.execute('select coalesce(sum(coalesce(actual_micro_usd, reserved_micro_usd)), 0) as total from llm_call');
  return {
    pause: await isPaused(database.db),
    jour,
    plafond_jour: plafond,
    publiees_aujourdhui: publiees.rows.filter((x) => jourParis(String(x.published_at)) === jour).length,
    en_attente: Number(attente.rows[0]!.n),
    reportees: reportees.rows.map((x) => ({ motif: x.motif === null ? null : String(x.motif), n: Number(x.n) })),
    dernier_cycle: await lireCycle(c),
    depense_micro_usd: Number(depense.rows[0]!.total),
  };
}

export interface Couts {
  total_micro_usd: number;
  par_modele: { modele: string; appels: number; micro_usd: number }[];
  par_etape: { etape: string; appels: number; micro_usd: number }[];
  par_jour: { jour: string; micro_usd: number }[];
}

/** Coûts réels enregistrés (une réservation sans coût connu reste comptée), pour `npm run couts`. */
export async function coutsReels(client: Pick<Client, 'execute'>, jours = 14): Promise<Couts> {
  const DEPENSE = 'coalesce(actual_micro_usd, reserved_micro_usd)';
  const parModele = await client.execute(`select model, count(*) as n, sum(${DEPENSE}) as total from llm_call group by model order by total desc`);
  const parEtape = await client.execute(`select stage, count(*) as n, sum(${DEPENSE}) as total from llm_call group by stage order by total desc`);
  const lignes = await client.execute(`select started_at, ${DEPENSE} as cout from llm_call order by started_at desc`);
  const parJour = new Map<string, number>();
  for (const l of lignes.rows) {
    const j = jourParis(String(l.started_at));
    parJour.set(j, (parJour.get(j) ?? 0) + Number(l.cout));
  }
  return {
    total_micro_usd: parModele.rows.reduce((n, x) => n + Number(x.total), 0),
    par_modele: parModele.rows.map((x) => ({ modele: String(x.model), appels: Number(x.n), micro_usd: Number(x.total) })),
    par_etape: parEtape.rows.map((x) => ({ etape: String(x.stage), appels: Number(x.n), micro_usd: Number(x.total) })),
    par_jour: [...parJour].sort(([a], [b]) => b.localeCompare(a)).slice(0, jours).map(([jour, micro_usd]) => ({ jour, micro_usd })),
  };
}
