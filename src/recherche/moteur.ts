// Classement et explication des résultats de recherche (ADR 0011 §5). Pur : n'importe que ./normaliser.ts, pour être
// repris sans ses types dans la maquette. Le site, l'application et la maquette classent ainsi avec le même code.
import { motsNormalises } from './normaliser.ts';

export type ChampMotCle = 'nom' | 'categorie' | 'usage' | 'technologie' | 'terme_proche';
export type ChampRecherche = ChampMotCle | 'texte';

/** Mot-clé enregistré d'une révision. `raison` est obligatoire pour un terme proche ; `passage` cite la source. */
export interface MotCleRecherche {
  champ: ChampMotCle;
  terme: string;
  raison: string | null;
  passage: string | null;
}

/** Document classable : une révision de publication, ses mots-clés et les parties de son texte. */
export interface DocumentRecherche {
  postId: number;
  revisionId: number;
  /** Jour publié ou prévu (YYYY-MM-DD), pour départager ; null s'il est inconnu. */
  jour: string | null;
  motsCles: MotCleRecherche[];
  /** Parties du texte de la publication (accroche, description…), chacune lue séparément pour l'extrait. */
  textes: string[];
}

/** Pourquoi un résultat remonte : le champ, le terme qui correspond, la raison et, s'il y en a un, un extrait. */
export interface Correspondance {
  champ: ChampRecherche;
  terme: string;
  raison: string;
  extrait: string | null;
}

export interface ResultatClasse {
  postId: number;
  revisionId: number;
  jour: string | null;
  nom: string | null;
  score: number;
  correspondances: Correspondance[];
}

/**
 * Poids proposés (ADR 0011 §5). Un terme proche ne compte que pour l'expression entière : un seul mot partagé avec un
 * terme proche ne suffit pas, pour éviter les associations trompeuses.
 */
export const POIDS: Record<ChampRecherche, { expression: number; mot: number }> = {
  nom: { expression: 100, mot: 30 },
  usage: { expression: 40, mot: 10 },
  technologie: { expression: 40, mot: 10 },
  categorie: { expression: 40, mot: 10 },
  terme_proche: { expression: 25, mot: 0 },
  texte: { expression: 8, mot: 2 },
};
/** Plafond de la part « par mot » du texte : un texte long ne l'emporte pas sur un mot-clé. */
export const PLAFOND_TEXTE_MOTS = 6;
/** Le dernier mot de la requête vaut aussi comme début de mot à partir de cette longueur. */
export const LONGUEUR_MIN_PREFIXE = 3;
const LONGUEUR_EXTRAIT = 200;

const LIEU: Record<ChampRecherche, string> = {
  nom: 'le nom',
  categorie: 'la catégorie',
  usage: 'un usage',
  technologie: 'une technologie',
  terme_proche: 'un terme proche',
  texte: 'le texte de la publication',
};

/** Requête préparée : mots normalisés et règle du préfixe. */
export interface RequetePreparee {
  mots: string[];
  prefixe: boolean;
}

export function preparerRequete(requete: string): RequetePreparee {
  const mots = motsNormalises(requete);
  const dernier = mots[mots.length - 1];
  return { mots, prefixe: dernier !== undefined && dernier.length >= LONGUEUR_MIN_PREFIXE };
}

interface Rapprochement {
  expression: boolean;
  /** Indices des mots de la requête trouvés. */
  couverts: Set<number>;
  /** Mots du texte qui complètent le préfixe, pour l'explication. */
  completes: string[];
}

function rapprocher(texte: string, q: RequetePreparee): Rapprochement {
  const mots = motsNormalises(texte);
  const n = q.mots.length;
  const completes: string[] = [];
  const egal = (mot: string, i: number) => {
    const attendu = q.mots[i]!;
    if (mot === attendu) return true;
    if (i === n - 1 && q.prefixe && mot.startsWith(attendu)) {
      completes.push(mot);
      return true;
    }
    return false;
  };
  const couverts = new Set<number>();
  for (let i = 0; i < n; i++) if (mots.some((m) => egal(m, i))) couverts.add(i);
  let expression = false;
  for (let debut = 0; !expression && debut + n <= mots.length; debut++) {
    let ok = true;
    for (let i = 0; ok && i < n; i++) ok = egal(mots[debut + i]!, i);
    expression = ok;
  }
  return { expression, couverts, completes: [...new Set(completes)] };
}

const raisonValide = (raison: string | null): raison is string => raison !== null && raison.trim().length > 0;

function extraitDe(texte: string): string {
  const t = texte.replace(/\s+/g, ' ').trim();
  return t.length <= LONGUEUR_EXTRAIT ? t : `${t.slice(0, LONGUEUR_EXTRAIT - 1).trimEnd()}…`;
}

function expliquer(champ: ChampRecherche, requete: string, r: Rapprochement, q: RequetePreparee): string {
  const complement = r.completes.length > 0 ? ` (« ${q.mots[q.mots.length - 1]} » complète « ${r.completes.join(' », « ')} »)` : '';
  if (r.expression) return q.mots.length > 1 ? `Expression « ${requete} » trouvée dans ${LIEU[champ]}${complement}.` : `Mot « ${requete} » trouvé dans ${LIEU[champ]}${complement}.`;
  const mots = [...r.couverts].sort((a, b) => a - b).map((i) => q.mots[i]);
  return `${mots.length > 1 ? 'Mots' : 'Mot'} « ${mots.join(' », « ')} » ${mots.length > 1 ? 'trouvés' : 'trouvé'} dans ${LIEU[champ]}${complement}.`;
}

/** Classe un document ; null s'il ne couvre pas tous les mots de la requête ou si rien ne s'explique. */
function classerDocument(doc: DocumentRecherche, q: RequetePreparee): ResultatClasse | null {
  const requete = q.mots.join(' ');
  const couverts = new Set<number>();
  const meilleurParChamp = new Map<ChampRecherche, number>();
  const correspondances: (Correspondance & { poids: number })[] = [];
  const garder = (champ: ChampRecherche, poids: number) => meilleurParChamp.set(champ, Math.max(meilleurParChamp.get(champ) ?? 0, poids));

  for (const mc of doc.motsCles) {
    // Un terme proche sans raison n'explique rien : il est ignoré, jamais affiché.
    if (mc.champ === 'terme_proche' && !raisonValide(mc.raison)) continue;
    const r = rapprocher(mc.terme, q);
    const poids = r.expression ? POIDS[mc.champ].expression : r.couverts.size * POIDS[mc.champ].mot;
    if (poids === 0) continue;
    for (const i of r.couverts) couverts.add(i);
    garder(mc.champ, poids);
    const raison = mc.champ === 'terme_proche' ? mc.raison!.trim() : expliquer(mc.champ, requete, r, q);
    correspondances.push({ champ: mc.champ, terme: mc.terme, raison, extrait: mc.passage ? extraitDe(mc.passage) : null, poids });
  }

  // Texte de la publication : l'expression se cherche partie par partie, pour ne pas enjamber deux parties.
  const parties = doc.textes.filter((t) => t.trim().length > 0);
  const avecExpression = parties.find((t) => rapprocher(t, q).expression);
  const toutLeTexte = rapprocher(parties.join(' \n '), q);
  if (avecExpression !== undefined || toutLeTexte.couverts.size > 0) {
    const poids = avecExpression !== undefined ? POIDS.texte.expression : Math.min(toutLeTexte.couverts.size * POIDS.texte.mot, PLAFOND_TEXTE_MOTS);
    for (const i of toutLeTexte.couverts) couverts.add(i);
    garder('texte', poids);
    const partie = avecExpression ?? parties.find((t) => rapprocher(t, q).couverts.size > 0)!;
    const r = avecExpression !== undefined ? rapprocher(avecExpression, q) : toutLeTexte;
    correspondances.push({ champ: 'texte', terme: requete, raison: expliquer('texte', requete, r, q), extrait: extraitDe(partie), poids });
  }

  if (couverts.size < q.mots.length || correspondances.length === 0) return null;
  correspondances.sort((a, b) => b.poids - a.poids);
  const score = [...meilleurParChamp.values()].reduce((s, p) => s + p, 0);
  const nom = doc.motsCles.find((m) => m.champ === 'nom')?.terme ?? null;
  return {
    postId: doc.postId,
    revisionId: doc.revisionId,
    jour: doc.jour,
    nom,
    score,
    correspondances: correspondances.map(({ poids: _poids, ...c }) => c),
  };
}

/** Jour le plus récent d'abord, jour inconnu en dernier. */
const parJour = (a: ResultatClasse, b: ResultatClasse): number => {
  if (a.jour === b.jour) return 0;
  if (a.jour === null) return 1;
  if (b.jour === null) return -1;
  return a.jour < b.jour ? 1 : -1;
};

export type Tri = 'pertinence' | 'recents';

/**
 * Classe et explique. Chaque mot de la requête doit être couvert par au moins un champ (ET logique) ; le score
 * additionne le meilleur poids de chaque champ, si bien que répéter un mot-clé n'augmente pas le score.
 */
export function classer(requete: string, documents: DocumentRecherche[], tri: Tri = 'pertinence'): ResultatClasse[] {
  const q = preparerRequete(requete);
  if (q.mots.length === 0) return [];
  const resultats = documents.map((d) => classerDocument(d, q)).filter((r): r is ResultatClasse => r !== null);
  // Départage final par `postId`, pour un ordre stable d'une page à l'autre.
  const ordre = tri === 'recents' ? (a: ResultatClasse, b: ResultatClasse) => parJour(a, b) || b.score - a.score : (a: ResultatClasse, b: ResultatClasse) => b.score - a.score || parJour(a, b);
  return resultats.sort((a, b) => ordre(a, b) || a.postId - b.postId);
}
