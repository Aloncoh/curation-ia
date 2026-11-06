// Délais mesurés, séparés par étape. Lecture seule. Ce qui n'a pas été mesuré reste « non mesuré », jamais une estimation.
import type { Client } from '@libsql/client';

export type PrecisionDate = 'seconde' | 'minute' | 'arrondie' | 'jour' | 'inconnue';

/**
 * Une source qui publie « 00:00:00 » donne un jour, pas un instant ; « 15:45:00 » peut être une heure arrondie au quart
 * d'heure ou à cinq minutes. Aucun délai à la minute ne se déduit de ces dates.
 */
export function precisionDate(iso: string | null): PrecisionDate {
  if (iso === null) return 'inconnue';
  const m = /T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!m) return 'inconnue';
  const [, heures, minutes, secondes] = m;
  if (heures === '00' && minutes === '00' && secondes === '00') return 'jour';
  if (secondes !== '00') return 'seconde';
  return Number(minutes) % 5 === 0 ? 'arrondie' : 'minute';
}

export const datePrecise = (p: PrecisionDate) => p === 'seconde' || p === 'minute';

/** Centile sur des valeurs déjà mesurées, par rang le plus proche. */
export function centile(valeurs: number[], rang: number): number | null {
  if (valeurs.length === 0) return null;
  const tries = [...valeurs].sort((a, b) => a - b);
  return tries[Math.min(tries.length - 1, Math.max(0, Math.ceil((rang / 100) * tries.length) - 1))]!;
}

export interface LigneSource {
  source: string;
  requetes: number;
  erreurs: number;
  reponses_304: number;
  conditionnelles: number;
  reponse_p50_ms: number | null;
  reponse_p90_ms: number | null;
  age_cache_max_s: number | null;
  cache_control: string | null;
  websub: string | null;
  validateur: boolean;
  precisions: Record<PrecisionDate, number>;
}

export interface Detection {
  source: string;
  titre: string;
  annonce: string | null;
  precision: PrecisionDate;
  vue_le: string;
  /** Entre la vérification précédente et la première vue : la sortie dans le flux a eu lieu dans cette fenêtre. */
  fenetre_s: number;
  /** Secondes entre la date de la source et la première vue ; null si la date ne permet pas de mesurer. */
  delai_detection_s: number | null;
  /** La source annonce une date postérieure à la première vue : date programmée ou fausse, jamais une preuve de rapidité. */
  date_future: boolean;
}

export interface Preparation {
  actualites: number;
  brouillons: number;
  attente_p50_s: number | null;
  qualification_p50_s: number | null;
  redaction_p50_s: number | null;
  redaction_n: number;
  preparation_p50_s: number | null;
  preparation_p90_s: number | null;
  publication_p50_s: number | null;
  publiees: number;
  /** Sortie annoncée → mise en ligne, sur les seules dates assez précises : le seul chiffre qui dit si la minute est tenue. */
  bout_en_bout_p50_s: number | null;
  bout_en_bout_p90_s: number | null;
  bout_en_bout_n: number;
  bout_en_bout_sous_60_s: number;
}

/** Statuts d'une actualité réellement rédigée : une actualité écartée ne dit rien du temps de préparation. */
const REDIGES = new Set(['a_verifier', 'controle_automatique', 'rejete']);

const secondes = (debut: string, fin: string) => (Date.parse(fin) - Date.parse(debut)) / 1000;

async function parSource(client: Client): Promise<LigneSource[]> {
  const requetes = (await client.execute(
    `select source_id, duration_ms, http_status, conditional, age_seconds, cache_control, websub_hub, has_etag, has_last_modified, error_kind from sonde_requete order by id`,
  )).rows;
  const documents = (await client.execute(`select source_id, announced_at from source_document`)).rows;
  const ids = [...new Set(requetes.map((r) => String(r.source_id)))].sort();
  return ids.map((source) => {
    const lignes = requetes.filter((r) => String(r.source_id) === source);
    const reussies = lignes.filter((r) => r.error_kind === null);
    const ages = reussies.flatMap((r) => (r.age_seconds === null ? [] : [Number(r.age_seconds)]));
    const compte: Record<PrecisionDate, number> = { seconde: 0, minute: 0, arrondie: 0, jour: 0, inconnue: 0 };
    for (const d of documents.filter((r) => String(r.source_id) === source)) compte[precisionDate(d.announced_at === null ? null : String(d.announced_at))]++;
    const derniere = (cle: 'cache_control' | 'websub_hub') => {
      const valeur = reussies.findLast((r) => r[cle] !== null)?.[cle];
      return valeur === undefined || valeur === null ? null : String(valeur);
    };
    return {
      source,
      requetes: lignes.length,
      erreurs: lignes.length - reussies.length,
      reponses_304: lignes.filter((r) => Number(r.http_status) === 304).length,
      conditionnelles: lignes.filter((r) => Number(r.conditional) === 1).length,
      reponse_p50_ms: centile(reussies.map((r) => Number(r.duration_ms)), 50),
      reponse_p90_ms: centile(reussies.map((r) => Number(r.duration_ms)), 90),
      age_cache_max_s: ages.length === 0 ? null : Math.max(...ages),
      cache_control: derniere('cache_control'),
      websub: derniere('websub_hub'),
      validateur: lignes.some((r) => Number(r.has_etag) === 1 || Number(r.has_last_modified) === 1),
      precisions: compte,
    };
  });
}

async function detections(client: Client): Promise<Detection[]> {
  const lignes = (await client.execute(`select * from detection_observee order by first_seen_at`)).rows;
  return lignes.map((l) => {
    const annonce = l.announced_at === null ? null : String(l.announced_at);
    // Recalculée : la règle de précision peut avoir changé depuis l'enregistrement.
    const precision = precisionDate(annonce);
    const vue = String(l.first_seen_at);
    const ecart = annonce === null ? null : secondes(annonce, vue);
    return {
      source: String(l.source_id),
      titre: String(l.title),
      annonce,
      precision,
      vue_le: vue,
      fenetre_s: secondes(String(l.previous_check_at), vue),
      delai_detection_s: ecart !== null && ecart >= 0 && datePrecise(precision) ? ecart : null,
      date_future: ecart !== null && ecart < 0,
    };
  });
}

/** Préparation : de la première vue de l'actualité au brouillon enregistré. Publication : du brouillon à la mise en ligne. */
async function preparation(client: Client): Promise<Preparation> {
  const lignes = (await client.execute(
    `select n.first_seen_at, n.announced_at, d.status, d.created_at as brouillon, p.published_at,
            (select min(l.started_at) from llm_call l where l.news_item_id = n.id) as premier_appel,
            (select sum((julianday(l.finished_at) - julianday(l.started_at)) * 86400) from llm_call l where l.news_item_id = n.id and l.stage = 'qualification' and l.status = 'reussi') as qualification,
            (select sum((julianday(l.finished_at) - julianday(l.started_at)) * 86400) from llm_call l where l.news_item_id = n.id and l.stage = 'redaction' and l.status = 'reussi') as redaction
     from post_draft d join news_item n on n.id = d.news_item_id left join post p on p.news_item_id = n.id
     where exists (select 1 from llm_call l where l.news_item_id = n.id)`,
  )).rows;
  const valeurs = (cle: 'qualification' | 'redaction') => lignes.flatMap((l) => (l[cle] === null ? [] : [Number(l[cle])]));
  const attentes = lignes.flatMap((l) => (l.premier_appel === null ? [] : [secondes(String(l.first_seen_at), String(l.premier_appel))]));
  const rediges = lignes.filter((l) => REDIGES.has(String(l.status)));
  const prep = rediges.map((l) => secondes(String(l.first_seen_at), String(l.brouillon)));
  const publiees = lignes.filter((l) => l.published_at !== null);
  // Une date imprécise ou postérieure à la mise en ligne ne prouve aucune rapidité : elle sort de la mesure.
  const boutEnBout = publiees.flatMap((l) => {
    const annonce = l.announced_at === null ? null : String(l.announced_at);
    if (annonce === null || !datePrecise(precisionDate(annonce))) return [];
    const ecart = secondes(annonce, String(l.published_at));
    return ecart >= 0 ? [ecart] : [];
  });
  return {
    actualites: lignes.length,
    brouillons: rediges.length,
    attente_p50_s: centile(attentes, 50),
    qualification_p50_s: centile(valeurs('qualification'), 50),
    redaction_p50_s: centile(valeurs('redaction'), 50),
    redaction_n: valeurs('redaction').length,
    preparation_p50_s: centile(prep, 50),
    preparation_p90_s: centile(prep, 90),
    publication_p50_s: centile(publiees.map((l) => secondes(String(l.brouillon), String(l.published_at))), 50),
    publiees: publiees.length,
    bout_en_bout_p50_s: centile(boutEnBout, 50),
    bout_en_bout_p90_s: centile(boutEnBout, 90),
    bout_en_bout_n: boutEnBout.length,
    bout_en_bout_sous_60_s: boutEnBout.filter((v) => v <= 60).length,
  };
}

const ms = (v: number | null) => (v === null ? 'non mesuré' : `${Math.round(v)} ms`);
const s = (v: number | null) => (v === null ? 'non mesuré' : `${v.toFixed(1)} s`);

/** Rapport lisible. Chaque ligne donne son effectif : une médiane sur trois cas n'est pas une promesse. */
/** Relevé horodaté d'un post réel, pour l'accueil (2026-11-06) : annonce, repérage, post prêt, mise en ligne. */
export interface Releve {
  publication: number;
  compte: string;
  annonce: string;
  vue: string;
  prete: string;
  publiee: string;
  /** De l'annonce à la mise en ligne. */
  minutes: number;
}

/**
 * Les posts publiés dont toutes les heures sont connues et cohérentes, du plus rapide au plus lent : annonce datée à la
 * minute ou à la seconde (une heure ronde ou une date au jour ne permet pas de mesurer), puis repérage, post prêt et
 * mise en ligne dans cet ordre. L'accueil montre les plus rapides, en disant sur combien de posts mesurés.
 */
export async function relevesMesurables(client: Client): Promise<Releve[]> {
  const lignes = (await client.execute(
    `select p.id, p.account_id, n.announced_at, n.first_seen_at, p.created_at, p.published_at
       from post p join news_item n on n.id = p.news_item_id
      where p.status = 'publie' and p.published_at is not null and n.announced_at is not null`,
  )).rows;
  const releves: Releve[] = [];
  for (const l of lignes) {
    const [annonce, vue, prete, publiee] = [l.announced_at, l.first_seen_at, l.created_at, l.published_at].map(String) as [string, string, string, string];
    if (!datePrecise(precisionDate(annonce))) continue;
    const t = [annonce, vue, prete, publiee].map((d) => Date.parse(d));
    if (t.some(Number.isNaN) || t.some((x, i) => i > 0 && x < t[i - 1]!)) continue;
    releves.push({ publication: Number(l.id), compte: String(l.account_id), annonce, vue, prete, publiee, minutes: Math.round((t[3]! - t[0]!) / 60000) });
  }
  return releves.sort((a, b) => a.minutes - b.minutes || b.publication - a.publication);
}

export interface LatenceDeploiement {
  depuis: string | null;
  annoncees: number;
  publiees: number;
  mesurables: number;
  detection: { p50: number | null; p90: number | null };
  traitement: { p50: number | null; p90: number | null };
  disponibilite: { p50: number | null; p90: number | null };
  bout_en_bout: { p50: number | null; p90: number | null };
  sous_une_heure: number;
  cycles_github: { n: number; ecart_p50_s: number | null; ecart_max_s: number | null };
}

/**
 * Latence des nouveautés sorties après la mise en ligne de la chaîne (demande de l'utilisateur du 2026-11-05).
 * Trois segments séparés, sur les seules publications dont la source donne une date à la minute :
 * détection (annonce → première vue), traitement (première vue → post prêt), disponibilité (post prêt → en ligne).
 * Point de départ : le premier cycle exécuté par GitHub Actions (worker « runner… »), sauf date donnée.
 */
export async function latenceApresDeploiement(client: Client, depuis?: string): Promise<LatenceDeploiement> {
  const debut = depuis ?? ((await client.execute(`select min(started_at) as d from run where worker_id like 'runner%' or worker_id like 'github:%'`)).rows[0]?.d as string | null) ?? null;
  const vide = { p50: null, p90: null };
  if (!debut) return { depuis: null, annoncees: 0, publiees: 0, mesurables: 0, detection: vide, traitement: vide, disponibilite: vide, bout_en_bout: vide, sous_une_heure: 0, cycles_github: { n: 0, ecart_p50_s: null, ecart_max_s: null } };
  const annoncees = Number((await client.execute({ sql: `select count(*) as n from news_item where announced_at >= ?`, args: [debut] })).rows[0]!.n);
  const lignes = (await client.execute({
    sql: `select n.announced_at, n.first_seen_at, p.created_at as pret, p.published_at
          from post p join news_item n on n.id = p.news_item_id
          where p.status = 'publie' and n.announced_at >= ?`,
    args: [debut],
  })).rows;
  const mesurables = lignes.filter((l) => datePrecise(precisionDate(String(l.announced_at))) && secondes(String(l.announced_at), String(l.first_seen_at)) >= 0);
  const serie = (f: (l: (typeof lignes)[number]) => number) => {
    const v = mesurables.map(f).filter((x) => x >= 0);
    return { p50: centile(v, 50), p90: centile(v, 90) };
  };
  const bout = mesurables.map((l) => secondes(String(l.announced_at), String(l.published_at)));
  // Cadence réelle des cycles GitHub : écarts entre deux cycles tracés (run kind « cycle », origine github:…).
  const cycles = (await client.execute({ sql: `select started_at from run where kind = 'cycle' and worker_id like 'github:%' and started_at >= ? order by started_at`, args: [debut] })).rows.map((r) => String(r.started_at));
  const ecarts = cycles.slice(1).map((d, i) => secondes(cycles[i]!, d));
  return {
    depuis: debut,
    annoncees,
    publiees: lignes.length,
    mesurables: mesurables.length,
    detection: serie((l) => secondes(String(l.announced_at), String(l.first_seen_at))),
    traitement: serie((l) => secondes(String(l.first_seen_at), String(l.pret))),
    disponibilite: serie((l) => secondes(String(l.pret), String(l.published_at))),
    bout_en_bout: { p50: centile(bout, 50), p90: centile(bout, 90) },
    sous_une_heure: bout.filter((v) => v <= 3600).length,
    cycles_github: { n: cycles.length, ecart_p50_s: centile(ecarts, 50), ecart_max_s: ecarts.length ? Math.max(...ecarts) : null },
  };
}

const duree = (v: number | null) => (v === null ? 'non mesuré' : v < 120 ? `${Math.round(v)} s` : v < 7200 ? `${Math.round(v / 60)} min` : `${(v / 3600).toFixed(1)} h`);

export async function rapportDelais(client: Client, genereLe: string, depuis?: string): Promise<string> {
  const sources = await parSource(client);
  const vues = await detections(client);
  const prep = await preparation(client);
  const lat = await latenceApresDeploiement(client, depuis);
  const mesurables = vues.flatMap((d) => (d.delai_detection_s === null ? [] : [d.delai_detection_s]));
  const sousLaMinute = mesurables.filter((v) => v <= 60).length;
  const futures = vues.filter((d) => d.date_future).length;
  return [
    '# Délais mesurés',
    '',
    `Généré le ${genereLe}. Sortie, détection, traitement et publication sont mesurés séparément. Une valeur absente reste « non mesuré ».`,
    '',
    '## Détection (sortie annoncée → première vue)',
    '',
    `- Requêtes de sonde : ${sources.reduce((t, l) => t + l.requetes, 0)} sur ${sources.length} sources.`,
    `- Nouvelles entrées vues pendant la sonde : ${vues.length}, dont ${mesurables.length} avec une date assez précise pour mesurer.`,
    `- Délai de détection médian : ${s(centile(mesurables, 50))} · 90e centile : ${s(centile(mesurables, 90))} · sous 60 s : ${sousLaMinute} sur ${mesurables.length}.`,
    `- Dates postérieures à la première vue, écartées de la mesure : ${futures}.`,
    '- Fenêtre : temps entre deux vérifications réussies ; l\'entrée est apparue dans le flux pendant cette fenêtre. Délai : écart avec la date écrite par la source, qui peut précéder de loin son apparition.',
    '',
    ...(vues.length === 0 ? [] : [
      '| Source | Entrée | Annonce | Précision | Vue le | Fenêtre | Délai |',
      '|---|---|---|---|---|---|---|',
      ...vues.map((d) => `| ${d.source} | ${d.titre.replaceAll('|', '/').slice(0, 60)} | ${d.annonce ?? 'Non renseigné'} | ${d.precision} | ${d.vue_le} | ${s(d.fenetre_s)} | ${s(d.delai_detection_s)} |`),
      '',
    ]),
    '## Ce que chaque source permet',
    '',
    '| Source | Requêtes | Erreurs | 304 | Réponse p50 | p90 | Âge de cache max | Cache-Control | Validateur | WebSub | Dates à la minute |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...sources.map((l) => {
      const total = Object.values(l.precisions).reduce((a, b) => a + b, 0);
      const fines = l.precisions.seconde + l.precisions.minute;
      return `| ${l.source} | ${l.requetes} | ${l.erreurs} | ${l.reponses_304}/${l.conditionnelles} | ${ms(l.reponse_p50_ms)} | ${ms(l.reponse_p90_ms)} | ${l.age_cache_max_s === null ? 'absent' : `${l.age_cache_max_s} s`} | ${l.cache_control ?? 'absent'} | ${l.validateur ? 'oui' : 'non'} | ${l.websub ?? 'non'} | ${fines}/${total} |`;
    }),
    '',
    '## Préparation et publication (première vue → brouillon → mise en ligne)',
    '',
    `- Actualités passées par un modèle réel : ${prep.actualites}. Brouillons rédigés : ${prep.brouillons}. Publiées : ${prep.publiees}.`,
    `- Attente avant le premier appel : ${s(prep.attente_p50_s)} · qualification : ${s(prep.qualification_p50_s)} · rédaction : ${s(prep.redaction_p50_s)} (n = ${prep.redaction_n}).`,
    `- Préparation médiane d'un brouillon : ${s(prep.preparation_p50_s)} · 90e centile : ${s(prep.preparation_p90_s)} (n = ${prep.brouillons}) · publication : ${s(prep.publication_p50_s)} (n = ${prep.publiees}).`,
    '',
    '## Bout en bout (sortie annoncée → mise en ligne)',
    '',
    `- Publications mesurables : ${prep.bout_en_bout_n} sur ${prep.publiees}, celles dont la source donne une date assez précise.`,
    `- Médiane : ${s(prep.bout_en_bout_p50_s)} · 90e centile : ${s(prep.bout_en_bout_p90_s)} · sous 60 s : ${prep.bout_en_bout_sous_60_s} sur ${prep.bout_en_bout_n}.`,
    '- Seul ce chiffre, mesuré sur de vraies publications, dit si la minute est tenue : un cycle de collecte de 60 s ne le prouve pas.',
    '',
    '## Nouveautés sorties après la mise en ligne de la chaîne',
    '',
    lat.depuis === null ? '- Aucun cycle en ligne trouvé : non mesuré.' : `- Depuis ${lat.depuis} : ${lat.annoncees} actualité(s) annoncée(s), ${lat.publiees} publiée(s), ${lat.mesurables} avec une date à la minute.`,
    `- Détection (annonce → première vue) : médiane ${duree(lat.detection.p50)} · 90e centile ${duree(lat.detection.p90)}.`,
    `- Traitement (première vue → post prêt) : médiane ${duree(lat.traitement.p50)} · 90e centile ${duree(lat.traitement.p90)}.`,
    `- Disponibilité (post prêt → en ligne) : médiane ${duree(lat.disponibilite.p50)} · 90e centile ${duree(lat.disponibilite.p90)}.`,
    `- Bout en bout : médiane ${duree(lat.bout_en_bout.p50)} · 90e centile ${duree(lat.bout_en_bout.p90)} · sous une heure : ${lat.sous_une_heure} sur ${lat.mesurables}.`,
    `- Cycles GitHub tracés : ${lat.cycles_github.n} · écart médian ${duree(lat.cycles_github.ecart_p50_s)} · plus long ${duree(lat.cycles_github.ecart_max_s)} (trace durable depuis le 2026-11-05).`,
    '',
  ].join('\n');
}
