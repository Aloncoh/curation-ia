// npm run ressources -- decouvrir [--jours N] [--max N] [--capturer]
// Découverte automatique (P6, bloc 2a ; decouverte.ts) : cherche sur GitHub des dépôts récents, au-dessus du seuil
// d'étoiles du réglage `decouverte.seuil_etoiles`, et liste les candidats. Avec --capturer, les capture dans la chaîne
// des ressources comme candidats (décision `approfondir`, motif `grille_d1_a_faire`) : rien n'est rédigé ni publié.
import { lireReglageEntier } from '../../control/settings.ts';
import { workerId } from '../../cli/shared.ts';
import { executerCapture } from '../capture.ts';
import { chercherDepots, JOURS_DEFAUT, MAX_CANDIDATS_DEFAUT, trierCandidats, versEntree } from '../decouverte.ts';
import { RESSOURCES, SOURCE_PREFIXE } from '../liste.ts';
import type { ContexteCommande } from './contexte.ts';

export async function decouvrir(args: string[], ctx: ContexteCommande): Promise<number> {
  let jours = JOURS_DEFAUT;
  let max = MAX_CANDIDATS_DEFAUT;
  let capturer = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--capturer') capturer = true;
    else if (a === '--jours' || a === '--max') {
      const v = Number(args[++i]);
      if (!Number.isInteger(v) || v <= 0) throw new Error(`${a} attend un entier positif.`);
      if (a === '--jours') jours = v;
      else max = v;
    } else throw new Error(`Argument inconnu : ${a}. Usage : decouvrir [--jours N] [--max N] [--capturer]`);
  }
  const { database } = ctx;
  const maintenant = (ctx.horloge?.() ?? new Date()).toISOString();
  const seuil = await lireReglageEntier(database.db, 'decouverte.seuil_etoiles');
  const depuis = new Date(Date.parse(maintenant) - jours * 86_400_000).toISOString().slice(0, 10);

  const { trouves, erreurs, illisibles } = await chercherDepots({ userAgent: ctx.config.userAgent, seuil, depuis, ...(ctx.transport ? { transport: ctx.transport } : {}), ...(ctx.resolve ? { resolve: ctx.resolve } : {}) });
  const dejaCaptures = await database.client.execute({ sql: `select id from source where id like ?`, args: [`${SOURCE_PREFIXE}%`] });
  const connus = new Set([...RESSOURCES.map((e) => e.depot.toLowerCase()), ...dejaCaptures.rows.map((r) => String(r.id).slice(SOURCE_PREFIXE.length).toLowerCase())]);
  const { candidats, ecartes } = trierCandidats(trouves, { seuil, connus, max, releveLe: maintenant });

  console.log(`Seuil : ${seuil} étoiles (réglage decouverte.seuil_etoiles) ; dépôts créés depuis le ${depuis}.`);
  console.log(`Trouvés : ${trouves.length} ; candidats : ${candidats.length} ; écartés : ${ecartes.length}${illisibles ? ` ; entrées illisibles : ${illisibles}` : ''}.`);
  for (const e of erreurs) console.log(`✗ sujet ${e.sujet} : ${e.message}`);
  for (const c of candidats) console.log(`· ${c.depot.full_name} — ${c.depot.stargazers_count} étoiles au ${maintenant.slice(0, 10)}, créé le ${c.depot.created_at?.slice(0, 10) ?? 'Non renseigné'} (sujet ${c.sujet}) : ${c.depot.description ?? 'sans description'}`);
  const parMotif = ecartes.reduce<Record<string, number>>((n, e) => ({ ...n, [e.motif]: (n[e.motif] ?? 0) + 1 }), {});
  if (ecartes.length) console.log(`Écartés par motif : ${Object.entries(parMotif).map(([m, n]) => `${m} ${n}`).join(', ')}.`);

  // Code 1 seulement si toutes les recherches ont échoué ; un sujet en échec parmi d'autres est signalé, pas bloquant.
  if (!capturer || candidats.length === 0) return erreurs.length > 0 && trouves.length === 0 ? 1 : 0;
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
  return bilan.ressources.some((r) => r.resultat === 'echec') ? 1 : 0;
}
