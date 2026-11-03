// Lecture de robots.txt (RFC 9309) avant toute capture d'une page de site. Pur, sans réseau : la requête passe par
// safeGet dans capture.ts. Une page interdite n'est jamais capturée, et le refus est tracé avec la règle qui l'impose.
// Le contenu de robots.txt est une donnée non fiable : il n'est qu'interprété selon la norme, jamais exécuté.

export interface RegleRobots {
  type: 'allow' | 'disallow';
  motif: string;
}

export interface GroupeRobots {
  agents: string[];
  regles: RegleRobots[];
  /** Lignes `Content-Signal` (extension non normalisée, publiée par Cloudflare) : relevées et tracées, sans effet sur l'accès. */
  signaux: string[];
}

export interface VerdictRobots {
  autorise: boolean;
  /** Groupe appliqué : le jeton du collecteur, `*`, ou aucun (tout est permis). */
  groupe: string;
  /** Règle décisive ; null quand aucune règle ne s'applique (permis par défaut). */
  regle: RegleRobots | null;
  signaux: string[];
}

/** Découpe robots.txt en groupes : lignes `user-agent` consécutives, puis leurs règles. */
export function lireRobots(texte: string): GroupeRobots[] {
  const groupes: GroupeRobots[] = [];
  let courant: GroupeRobots | null = null;
  let dansAgents = false;
  for (const brute of texte.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const ligne = brute.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(ligne);
    if (!m) continue;
    const cle = m[1]!.toLowerCase();
    const valeur = m[2]!.trim();
    if (cle === 'user-agent') {
      if (!courant || !dansAgents) {
        courant = { agents: [], regles: [], signaux: [] };
        groupes.push(courant);
      }
      courant.agents.push(valeur.toLowerCase());
      dansAgents = true;
      continue;
    }
    if (!courant) continue;
    dansAgents = false;
    if (cle === 'allow' || cle === 'disallow') {
      // « Disallow: » vide ne désigne aucun chemin : il n'interdit rien.
      if (valeur !== '') courant.regles.push({ type: cle, motif: valeur });
    } else if (cle === 'content-signal') courant.signaux.push(valeur);
  }
  return groupes;
}

/** Jeton produit d'un user-agent HTTP : la partie avant « / » ou un espace, en minuscules (RFC 9309 §2.2.1). */
export const jetonProduit = (userAgent: string): string => (userAgent.trim().split(/[\/\s]/)[0] ?? '').toLowerCase();

const echapperRegex = (t: string) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Motif de règle → expression : `*` remplace toute suite de caractères, `$` final ancre la fin du chemin. */
function motifVersRegex(motif: string): RegExp {
  const ancre = motif.endsWith('$');
  const corps = (ancre ? motif.slice(0, -1) : motif).split('*').map(echapperRegex).join('.*');
  return new RegExp(`^${corps}${ancre ? '$' : ''}`);
}

/** Forme comparable d'un chemin : les octets percent-encodés passent en majuscules, comme le demande la norme. */
const normaliserChemin = (chemin: string) => chemin.replace(/%[0-9a-f]{2}/gi, (x) => x.toUpperCase());

/**
 * Le chemin est-il permis pour ce jeton ? Groupes du jeton s'il en existe, sinon `*`, sinon tout est permis. La règle
 * au motif le plus long l'emporte ; à longueur égale, `allow` l'emporte (RFC 9309 §2.2.2).
 */
export function verdictRobots(texte: string, userAgent: string, chemin: string): VerdictRobots {
  const groupes = lireRobots(texte);
  const jeton = jetonProduit(userAgent);
  let choisis = groupes.filter((g) => jeton !== '' && g.agents.includes(jeton));
  let groupe = jeton;
  if (choisis.length === 0) {
    choisis = groupes.filter((g) => g.agents.includes('*'));
    groupe = choisis.length > 0 ? '*' : 'aucun';
  }
  const regles = choisis.flatMap((g) => g.regles);
  const signaux = choisis.flatMap((g) => g.signaux);
  const cible = normaliserChemin(chemin || '/');
  let meilleure: RegleRobots | null = null;
  for (const r of regles) {
    if (!motifVersRegex(normaliserChemin(r.motif)).test(cible)) continue;
    if (!meilleure || r.motif.length > meilleure.motif.length || (r.motif.length === meilleure.motif.length && r.type === 'allow')) meilleure = r;
  }
  return { autorise: meilleure === null || meilleure.type === 'allow', groupe, regle: meilleure, signaux };
}

/**
 * Accès à robots.txt selon la réponse (RFC 9309 §2.3.1) : 200, lire les règles ; 4xx, « indisponible », aucune
 * restriction ; erreur serveur ou réseau, « inaccessible », tout est interdit. Une redirection n'est pas suivie
 * (règle de la collecte) : le fichier est tenu pour inaccessible, donc tout est interdit, par prudence.
 */
export type EtatRobots = { etat: 'lu'; texte: string } | { etat: 'indisponible'; statut: number } | { etat: 'inaccessible'; motif: string; statut: number | null };

export function accesSelonRobots(r: EtatRobots, userAgent: string, chemin: string): VerdictRobots & { motif: string } {
  if (r.etat === 'indisponible') return { autorise: true, groupe: 'aucun', regle: null, signaux: [], motif: `robots_indisponible_${r.statut}` };
  if (r.etat === 'inaccessible') return { autorise: false, groupe: 'aucun', regle: null, signaux: [], motif: `robots_inaccessible_${r.motif}` };
  const v = verdictRobots(r.texte, userAgent, chemin);
  return { ...v, motif: v.autorise ? 'robots_autorise' : 'robots_interdit' };
}
