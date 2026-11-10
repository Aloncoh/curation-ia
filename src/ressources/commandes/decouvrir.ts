// npm run ressources -- decouvrir [--jours N] [--max N] [--capturer]
// Découverte automatique (P6, bloc 2a ; decouverte.ts) : cherche sur GitHub des dépôts récents, au-dessus du seuil
// d'étoiles du réglage `decouverte.seuil_etoiles`, et liste les candidats. Avec --capturer, les capture dans la chaîne
// des ressources comme candidats (décision `approfondir`, motif `grille_d1_a_faire`) : rien n'est rédigé ni publié.
import { lireReglageEntier } from '../../control/settings.ts';
import { workerId } from '../../cli/shared.ts';
import { executerCapture } from '../capture.ts';
import { chercherPlan, JOURS_DEFAUT, MAX_CANDIDATS_PAR_COMPTE, MAX_CANDIDATS_REGISTRE, trierCandidats, versEntree } from '../decouverte.ts';
import { DEPOTS_CONTROLE } from '../controle-decouverte.ts';
import { chercherRegistreMcp } from '../registre-mcp.ts';
import { RESSOURCES, SOURCE_PREFIXE } from '../liste.ts';
import { SELECTIONS } from '../selection/liste.ts';
import type { ContexteCommande } from './contexte.ts';

export async function decouvrir(args: string[], ctx: ContexteCommande): Promise<number> {
  let jours = JOURS_DEFAUT;
  // Plan par agent (2026-11-10) : six agents, trois candidats au plus chacun par passage.
  let max = MAX_CANDIDATS_PAR_COMPTE * 6;
  let capturer = false;
  let controle = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--capturer') capturer = true;
    else if (a === '--controle') controle = true;
    else if (a === '--jours' || a === '--max') {
      const v = Number(args[++i]);
      if (!Number.isInteger(v) || v <= 0) throw new Error(`${a} attend un entier positif.`);
      if (a === '--jours') jours = v;
      else max = v;
    } else throw new Error(`Argument inconnu : ${a}. Usage : decouvrir [--jours N] [--max N] [--capturer] [--controle]`);
  }
  const { database } = ctx;
  const maintenant = (ctx.horloge?.() ?? new Date()).toISOString();
  const seuil = await lireReglageEntier(database.db, 'decouverte.seuil_etoiles');
  const depuis = new Date(Date.parse(maintenant) - jours * 86_400_000).toISOString().slice(0, 10);

  const { trouves, erreurs, illisibles, requetes } = await chercherPlan({ userAgent: ctx.config.userAgent, seuil, maintenant, ...(ctx.transport ? { transport: ctx.transport } : {}), ...(ctx.resolve ? { resolve: ctx.resolve } : {}) });
  const dejaCaptures = await database.client.execute({ sql: `select id from source where id like ?`, args: [`${SOURCE_PREFIXE}%`] });
  // Dépôts déjà présentés dans une sélection (liste de l'utilisateur) : connus aussi, pas redécouverts.
  const dansSelections = SELECTIONS.flatMap((x) => x.sites).filter((x) => x.hote === 'github.com').map((x) => new URL(x.url).pathname.split('/').filter(Boolean).slice(0, 2).join('/').toLowerCase());
  const connus = new Set([...RESSOURCES.map((e) => e.depot.toLowerCase()), ...dejaCaptures.rows.map((r) => String(r.id).slice(SOURCE_PREFIXE.length).toLowerCase()), ...dansSelections]);
  // Jeu de contrôle (--controle) : dépôts transmis par l'utilisateur, absents des requêtes ; on regarde seulement si la
  // recherche les ramène d'elle-même, avant de retirer les dépôts déjà connus.
  if (controle) {
    const vus = new Map(trouves.map((t) => [t.depot.full_name.toLowerCase(), t]));
    console.log(`Jeu de contrôle : ${DEPOTS_CONTROLE.filter((d) => vus.has(d.toLowerCase())).length}/${DEPOTS_CONTROLE.length} ramenés par la recherche.`);
    for (const d of DEPOTS_CONTROLE) {
      const t = vus.get(d.toLowerCase());
      console.log(`${t ? '✓' : '✗'} ${d}${t ? ` — requête « ${t.sujet} », agent ${t.compte}${connus.has(d.toLowerCase()) ? ' (déjà connu)' : ''}` : ''}`);
    }
  }
  const parSujet = trierCandidats(trouves, { seuil, connus, max, releveLe: maintenant, maxParCompte: MAX_CANDIDATS_PAR_COMPTE });
  // Registre officiel MCP (bloc 3) : même seuil et même tri, candidats comptés à part pour ne pas être évincés.
  const registre = await chercherRegistreMcp({ userAgent: ctx.config.userAgent, seuil, depuis: new Date(Date.parse(maintenant) - jours * 86_400_000).toISOString(), ...(ctx.transport ? { transport: ctx.transport } : {}), ...(ctx.resolve ? { resolve: ctx.resolve } : {}) });
  for (const c of parSujet.candidats) connus.add(c.depot.full_name.toLowerCase());
  const parRegistre = trierCandidats(registre.trouves, { seuil, connus, max: MAX_CANDIDATS_REGISTRE, releveLe: maintenant });
  const candidats = [...parSujet.candidats, ...parRegistre.candidats];
  const ecartes = [...parSujet.ecartes, ...parRegistre.ecartes];
  erreurs.push(...registre.erreurs);

  console.log(`Plan par agent : ${requetes} requêtes ; seuil des nouveaux : ${seuil} étoiles (réglage decouverte.seuil_etoiles), créés depuis le ${depuis} ; montants et établis : voir FENETRES.`);
  const parAgent = parSujet.candidats.reduce<Record<string, number>>((n, c) => ({ ...n, [c.compte ?? 'repo']: (n[c.compte ?? 'repo'] ?? 0) + 1 }), {});
  console.log(`Candidats par agent : ${Object.entries(parAgent).map(([a, n]) => `${a} ${n}`).join(', ') || 'aucun'}.`);
  console.log(`Registre officiel MCP : ${registre.serveurs} serveur(s) récent(s) avec un dépôt GitHub, ${registre.trouves.length} au-dessus du seuil.`);
  console.log(`Trouvés : ${trouves.length} ; candidats : ${candidats.length} ; écartés : ${ecartes.length}${illisibles ? ` ; entrées illisibles : ${illisibles}` : ''}.`);
  for (const e of erreurs) console.log(`✗ sujet ${e.sujet} : ${e.message}`);
  for (const c of candidats) console.log(`· ${c.depot.full_name} — ${c.depot.stargazers_count} étoiles au ${maintenant.slice(0, 10)}, créé le ${c.depot.created_at?.slice(0, 10) ?? 'Non renseigné'} (${c.compte ?? 'repo'}, requête ${c.sujet}) : ${c.depot.description ?? 'sans description'}`);
  const parMotif = ecartes.reduce<Record<string, number>>((n, e) => ({ ...n, [e.motif]: (n[e.motif] ?? 0) + 1 }), {});
  if (ecartes.length) console.log(`Écartés par motif : ${Object.entries(parMotif).map(([m, n]) => `${m} ${n}`).join(', ')}.`);

  // Code 1 seulement si toutes les recherches ont échoué ; un sujet en échec parmi d'autres est signalé, pas bloquant.
  if (!capturer || candidats.length === 0) return erreurs.length > 0 && trouves.length === 0 && registre.trouves.length === 0 ? 1 : 0;
  const bilan = await executerCapture({
    database,
    userAgent: ctx.config.userAgent,
    workerId: workerId(),
    entrees: candidats.map(versEntree),
    depuisHeures: 6,
    forcer: false,
    ...(ctx.transport ? { transport: ctx.transport, mode: 'fixture' as const } : {}),
    ...(ctx.resolve ? { resolve: ctx.resolve } : {}),
    ...(ctx.horloge ? { horloge: ctx.horloge } : {}),
  });
  for (const r of bilan.ressources) console.log(`→ ${r.slug} [${r.resultat}]${r.decision ? ` ${r.decision.decision} (${r.decision.motif})` : ''}${r.erreur ? ` : ${r.erreur}` : ''}`);
  // Un dépôt dont la capture échoue est signalé avec son motif ; l'étape n'échoue que si aucune capture n'a abouti
  // (2026-11-10 : un seul échec faisait échouer tout le cycle du 9 novembre).
  return bilan.ressources.length > 0 && bilan.ressources.every((r) => r.resultat === 'echec') ? 1 : 0;
}
