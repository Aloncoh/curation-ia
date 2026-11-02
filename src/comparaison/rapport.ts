// Bilan d'une comparaison. Seuls les appels réels comptent : une simulation ne valide jamais un modèle. Le code mesure le
// format, la latence, le coût et les écarts qu'il sait détecter ; la fidélité et la qualité demandent une lecture à l'aveugle.
import { createHash } from 'node:crypto';
import type { Client } from '@libsql/client';
import type { Brouillon } from '../analysis/schemas.ts';
import { centile } from '../mesure/delais.ts';
import { lotDeComparaison, type SujetLot } from './lot.ts';

/** Écarts qui peuvent signaler une information absente de la source. Ce sont des indices : seule une relecture prouve une invention. */
const ECARTS_FACTUELS = new Set(['citation_introuvable', 'nombre_absent_des_citations', 'soutien_nom_absent', 'sources_contradictoires', 'produit_introuvable', 'auteur_introuvable', 'essai_non_realise', 'gratuite_non_citee']);
const FACULTATIFS = ['ce_que_ca_permet', 'pour_qui', 'exemple_usage', 'acces', 'prerequis', 'cout', 'limites_connues'] as const;
const CHAMPS_LUS = [['nouveaute', 'Nouveauté'], ['ce_que_ca_permet', 'Ce que ça permet'], ['pour_qui', 'Pour qui'], ['exemple_usage', 'Exemple d’usage'], ['acces', 'Pour commencer'], ['prerequis', 'Prérequis'], ['cout', 'Coût'], ['limites_connues', 'Limites connues']] as const;

export interface Sortie {
  bras: string;
  modele: string;
  reglage: string;
  news_item_id: number;
  etape: string;
  statut: string;
  tentatives: number;
  contenu: string | null;
  controles: string | null;
  decision: string | null;
  duree_ms: number | null;
  tokens_entree: number | null;
  tokens_cache: number | null;
  tokens_sortie: number | null;
  tokens_raisonnement: number | null;
  cout_micro_usd: number;
}

export interface BilanBras {
  bras: string;
  modele: string;
  reglage: string;
  qualifications: number;
  qualifications_valides: number;
  redactions: number;
  redactions_valides: number;
  valides_du_premier_coup: number;
  json_invalides: number;
  schema_invalides: number;
  tronquees: number;
  refus: number;
  erreurs: number;
  passages: number;
  passages_introuvables: number;
  ecarts_factuels: number;
  autres_ecarts: number;
  brouillons_sans_ecart: number;
  /** Écarts factuels sur les sujets à texte court, là où l'invention est la plus probable. */
  ecarts_factuels_textes_courts: number;
  champs_par_texte_court: number | null;
  accords_juges: number;
  comparables_juges: number;
  latence_qualification_p50_s: number | null;
  latence_qualification_p90_s: number | null;
  latence_redaction_p50_s: number | null;
  latence_redaction_p90_s: number | null;
  tokens_entree: number;
  tokens_cache: number;
  tokens_sortie: number;
  tokens_raisonnement: number;
  cout_total_micro_usd: number;
  cout_qualification_micro_usd: number | null;
  cout_redaction_micro_usd: number | null;
}

const lireControles = (s: Sortie) => (s.controles === null ? [] : JSON.parse(s.controles) as { champ: string; code: string }[])
  // Une contradiction entre captures vient des sources, pas du modèle.
  .filter((c) => c.champ !== 'captures');
const secondes = (valeurs: number[], rang: number) => {
  const c = centile(valeurs, rang);
  return c === null ? null : c / 1000;
};
const moyenne = (valeurs: number[]) => (valeurs.length === 0 ? null : valeurs.reduce((a, b) => a + b, 0) / valeurs.length);
const nombrePassages = (b: Brouillon) => [b.accroche, b.description, b.nouveaute, ...FACULTATIFS.flatMap((c) => b[c] ?? []), ...b.details, ...b.reperes, ...b.attributions].reduce((t, c) => t + c.passages.length, 0);

export function bilanBras(sorties: Sortie[], textesCourts: Set<number>, juges: Map<number, string>): BilanBras {
  const premiere = sorties[0]!;
  const q = sorties.filter((s) => s.etape === 'qualification');
  const r = sorties.filter((s) => s.etape === 'redaction');
  const valides = r.filter((s) => s.statut === 'valide');
  const durees = (liste: Sortie[]) => liste.flatMap((s) => (s.duree_ms === null ? [] : [s.duree_ms]));
  const compte = (statut: string) => sorties.filter((s) => s.statut === statut).length;
  const somme = (cle: 'tokens_entree' | 'tokens_cache' | 'tokens_sortie' | 'tokens_raisonnement' | 'cout_micro_usd') => sorties.reduce((t, s) => t + (s[cle] ?? 0), 0);
  const factuels = (s: Sortie) => lireControles(s).filter((c) => ECARTS_FACTUELS.has(c.code)).length;
  const courts = valides.filter((s) => textesCourts.has(s.news_item_id));
  const comparables = q.filter((s) => s.decision !== null && juges.has(s.news_item_id));
  return {
    bras: premiere.bras,
    modele: premiere.modele,
    reglage: premiere.reglage,
    qualifications: q.length,
    qualifications_valides: q.filter((s) => s.statut === 'valide').length,
    redactions: r.length,
    redactions_valides: valides.length,
    valides_du_premier_coup: sorties.filter((s) => s.statut === 'valide' && s.tentatives === 1).length,
    json_invalides: compte('json_invalide'),
    schema_invalides: compte('schema_invalide'),
    tronquees: compte('tronquee'),
    refus: compte('refus'),
    erreurs: compte('erreur'),
    passages: valides.reduce((t, s) => t + nombrePassages(JSON.parse(s.contenu!) as Brouillon), 0),
    passages_introuvables: valides.reduce((t, s) => t + lireControles(s).filter((c) => c.code === 'citation_introuvable').length, 0),
    ecarts_factuels: valides.reduce((t, s) => t + factuels(s), 0),
    autres_ecarts: valides.reduce((t, s) => t + lireControles(s).filter((c) => !ECARTS_FACTUELS.has(c.code)).length, 0),
    brouillons_sans_ecart: valides.filter((s) => lireControles(s).length === 0).length,
    ecarts_factuels_textes_courts: courts.reduce((t, s) => t + factuels(s), 0),
    champs_par_texte_court: moyenne(courts.map((s) => {
      const b = JSON.parse(s.contenu!) as Brouillon;
      return FACULTATIFS.filter((c) => b[c] !== null).length;
    })),
    accords_juges: comparables.filter((s) => s.decision === juges.get(s.news_item_id)).length,
    comparables_juges: comparables.length,
    latence_qualification_p50_s: secondes(durees(q), 50),
    latence_qualification_p90_s: secondes(durees(q), 90),
    latence_redaction_p50_s: secondes(durees(r), 50),
    latence_redaction_p90_s: secondes(durees(r), 90),
    tokens_entree: somme('tokens_entree'),
    tokens_cache: somme('tokens_cache'),
    tokens_sortie: somme('tokens_sortie'),
    tokens_raisonnement: somme('tokens_raisonnement'),
    cout_total_micro_usd: somme('cout_micro_usd'),
    cout_qualification_micro_usd: moyenne(q.map((s) => s.cout_micro_usd)),
    cout_redaction_micro_usd: moyenne(r.map((s) => s.cout_micro_usd)),
  };
}

/** Décision majoritaire des juges de développement sur les consignes `s2` ; sans majorité, le sujet n'est pas comparé. */
async function majoriteDesJuges(client: Client): Promise<Map<number, string>> {
  const lignes = (await client.execute(`select news_item_id, decision, count(*) as n from selection_decision where origine = 'juge_developpement' and consignes_version = 's2' and remplacee_le is null group by 1, 2`)).rows;
  const parSujet = new Map<number, { decision: string; n: number }[]>();
  for (const l of lignes) parSujet.set(Number(l.news_item_id), [...(parSujet.get(Number(l.news_item_id)) ?? []), { decision: String(l.decision), n: Number(l.n) }]);
  return new Map([...parSujet].flatMap(([id, votes]) => {
    const tries = [...votes].sort((a, b) => b.n - a.n);
    return tries.length > 1 && tries[0]!.n === tries[1]!.n ? [] : [[id, tries[0]!.decision] as [number, string]];
  }));
}

async function sorties(client: Client): Promise<Sortie[]> {
  return (await client.execute(`select * from comparaison_sortie where origine = 'reel' order by id`)).rows as unknown as Sortie[];
}

const dollars = (micro: number | null) => (micro === null ? 'non mesuré' : `${(micro / 1_000_000).toFixed(5)} $`);
const s = (v: number | null) => (v === null ? 'non mesuré' : `${v.toFixed(1)} s`);
const part = (a: number, b: number) => (b === 0 ? 'non mesuré' : `${a} sur ${b}`);

export function tableauComparatif(bilans: BilanBras[]): string[] {
  const ligne = (libelle: string, valeur: (b: BilanBras) => string) => `| ${libelle} | ${bilans.map(valeur).join(' | ')} |`;
  return [
    `| Mesure | ${bilans.map((b) => `${b.bras} (\`${b.modele}\`)`).join(' | ')} |`,
    `|---|${bilans.map(() => '---').join('|')}|`,
    ligne('Réglage', (b) => b.reglage),
    ligne('Qualifications valides', (b) => part(b.qualifications_valides, b.qualifications)),
    ligne('Rédactions valides', (b) => part(b.redactions_valides, b.redactions)),
    ligne('Valides du premier coup', (b) => part(b.valides_du_premier_coup, b.qualifications + b.redactions)),
    ligne('JSON invalide', (b) => String(b.json_invalides)),
    ligne('Hors schéma', (b) => String(b.schema_invalides)),
    ligne('Tronquées, refus, erreurs', (b) => `${b.tronquees}, ${b.refus}, ${b.erreurs}`),
    ligne('Citations introuvables', (b) => part(b.passages_introuvables, b.passages)),
    ligne('Écarts factuels détectés', (b) => String(b.ecarts_factuels)),
    ligne('dont sur textes courts', (b) => String(b.ecarts_factuels_textes_courts)),
    ligne('Autres écarts', (b) => String(b.autres_ecarts)),
    ligne('Brouillons sans écart', (b) => part(b.brouillons_sans_ecart, b.redactions_valides)),
    ligne('Champs remplis par texte court, sur 7', (b) => (b.champs_par_texte_court === null ? 'non mesuré' : b.champs_par_texte_court.toFixed(1))),
    ligne('Accord avec la majorité des juges', (b) => part(b.accords_juges, b.comparables_juges)),
    ligne('Latence qualification, p50 / p90', (b) => `${s(b.latence_qualification_p50_s)} / ${s(b.latence_qualification_p90_s)}`),
    ligne('Latence rédaction, p50 / p90', (b) => `${s(b.latence_redaction_p50_s)} / ${s(b.latence_redaction_p90_s)}`),
    ligne('Tokens entrée, dont cache', (b) => `${b.tokens_entree}, ${b.tokens_cache}`),
    ligne('Tokens sortie, dont raisonnement', (b) => `${b.tokens_sortie}, ${b.tokens_raisonnement}`),
    ligne('Coût par qualification', (b) => dollars(b.cout_qualification_micro_usd)),
    ligne('Coût par rédaction', (b) => dollars(b.cout_redaction_micro_usd)),
    ligne('Coût total du lot', (b) => dollars(b.cout_total_micro_usd)),
  ];
}

export async function rapportComparaison(client: Client, genereLe: string): Promise<string> {
  const toutes = await sorties(client);
  if (toutes.length === 0) return `# Comparaison des modèles\n\nGénéré le ${genereLe}. **Aucun résultat réel.** Le lot n'a pas été lancé : aucun modèle n'est évalué.\n`;
  const lot = await lotDeComparaison(client);
  const textesCourts = new Set(lot.filter((l) => l.texte_court).map((l) => l.id));
  const juges = await majoriteDesJuges(client);
  const bilans = [...new Set(toutes.map((l) => l.bras))].map((bras) => bilanBras(toutes.filter((l) => l.bras === bras), textesCourts, juges));
  const total = (await client.execute(`select coalesce(sum(coalesce(actual_micro_usd, reserved_micro_usd)), 0) as total from llm_call`)).rows[0]!.total;
  return [
    '# Comparaison des modèles',
    '',
    `Généré le ${genereLe}. Appels réels uniquement. ${lot.length} sujets du jeu de développement, dont ${textesCourts.size} à texte court. Dépense totale enregistrée : ${dollars(Number(total))}, à rapprocher des soldes affichés par chaque fournisseur.`,
    '',
    ...tableauComparatif(bilans),
    '',
    'Les écarts factuels sont des indices relevés par le code, pas des inventions prouvées. Le coût est calculé à partir des tokens rendus par chaque API et des tarifs relevés le 2026-11-01. Les juges sont des agents Claude Code, pas des avis humains. La qualité rédactionnelle et la fidélité se lisent à l\'aveugle : `npm run comparaison -- aveugle`.',
    '',
  ].join('\n');
}

const etiquette = (id: number, bras: string) => createHash('sha256').update(`aveugle|${id}|${bras}`).digest('hex');
const texteChamp = (c: { texte: string } | null) => (c ? c.texte : 'Non renseigné');

/** Dossier de lecture à l'aveugle : le sort fixe, sujet par sujet, quelle version s'appelle A. La clé reste à part. */
export function dossierAveugle(lot: SujetLot[], redactions: Sortie[]) {
  const cle: Record<string, Record<string, string>> = {};
  const pages = lot.flatMap((sujet) => {
    const versions = redactions
      .filter((r) => r.news_item_id === sujet.id && r.etape === 'redaction' && r.statut === 'valide')
      .sort((a, b) => etiquette(sujet.id, a.bras).localeCompare(etiquette(sujet.id, b.bras)));
    if (versions.length < 2) return [];
    cle[String(sujet.id)] = Object.fromEntries(versions.map((v, i) => [String.fromCharCode(65 + i), v.bras]));
    return [
      `## Sujet ${sujet.id}`,
      '',
      `Source : ${sujet.source_nom} · ${sujet.url}`,
      '',
      `> ${sujet.titre}`,
      '>',
      ...sujet.texte.split('\n').map((l) => `> ${l}`),
      '',
      ...versions.flatMap((v, i) => {
        const b = JSON.parse(v.contenu!) as Brouillon;
        return [
          `### Version ${String.fromCharCode(65 + i)}`,
          '',
          `**${b.accroche.texte}**`,
          '',
          b.description.texte,
          '',
          ...CHAMPS_LUS.map(([champ, libelle]) => `- ${libelle} : ${texteChamp(b[champ])}`),
          ...b.details.map((d) => `- ${d.titre} : ${d.texte}`),
          '',
        ];
      }),
    ];
  });
  return { markdown: ['# Lecture à l\'aveugle', '', 'Noter chaque version sans chercher à deviner le modèle.', '', ...pages].join('\n'), cle };
}

export async function dossierDepuisLaBase(client: Client) {
  return dossierAveugle(await lotDeComparaison(client), await sorties(client));
}
