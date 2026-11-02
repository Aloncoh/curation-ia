// npm run ressources -- capturer [slug] [--depuis <heures>] [--forcer]
// Capture les ressources de la liste par l'API GitHub et raw.githubusercontent.com, sans jeton. Code 2 : plafond atteint.
import { lireReglageEntier } from '../../control/settings.ts';
import { workerId } from '../../cli/shared.ts';
import { capturesDeRessource, executerCapture } from '../capture.ts';
import { metadonneesDe } from '../controles.ts';
import { RESSOURCES, trouverRessource } from '../liste.ts';
import { etatDepot, statutSortie } from '../statut.ts';
import type { ContexteCommande } from './contexte.ts';

export async function capturer(args: string[], ctx: ContexteCommande): Promise<number> {
  let slug: string | null = null;
  let depuisHeures = 6;
  let forcer = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--forcer') forcer = true;
    else if (a === '--depuis') {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || v < 0) throw new Error('--depuis attend un nombre d’heures positif ou nul.');
      depuisHeures = v;
    } else if (!a.startsWith('--') && slug === null) slug = a;
    else throw new Error(`Argument inconnu : ${a}. Usage : capturer [slug] [--depuis <heures>] [--forcer]`);
  }
  const liste = ctx.liste ?? RESSOURCES;
  const entrees = slug === null ? liste : [trouverRessource(slug, liste)].filter((e) => e !== undefined);
  if (entrees.length === 0) throw new Error(`Ressource inconnue : ${slug}`);

  const { database } = ctx;
  const bilan = await executerCapture({
    database,
    userAgent: ctx.config.userAgent,
    workerId: workerId(),
    entrees,
    depuisHeures,
    forcer,
    ...(ctx.transport ? { transport: ctx.transport, mode: 'fixture' as const } : {}),
    ...(ctx.resolve ? { resolve: ctx.resolve } : {}),
    ...(ctx.horloge ? { horloge: ctx.horloge } : {}),
  });

  const seuil = await lireReglageEntier(database.db, 'ressources.seuil_nouvelle_sortie_jours');
  const inactivite = await lireReglageEntier(database.db, 'ressources.inactivite_jours');
  console.log(`Exécution ${bilan.runId} — plafond d'API restant : ${bilan.quota.restant ?? 'inconnu'}, réinitialisation : ${bilan.quota.reinitialisation ?? 'inconnue'}`);
  console.log(`Documents : ${bilan.compteurs.newDocuments} nouveaux, ${bilan.compteurs.changedDocuments} modifiés, ${bilan.compteurs.unchangedDocuments} inchangés ; actualités créées : ${bilan.compteurs.newNewsItems}`);
  for (const r of bilan.ressources) {
    const e = entrees.find((x) => x.slug === r.slug)!;
    const captures = await capturesDeRessource(database.client, e);
    const m = metadonneesDe(captures);
    const depot = captures.find((c) => c.document === 'depot');
    const etat = m && depot ? etatDepot(m, depot.captureLe, inactivite) : null;
    const statut = m && depot ? statutSortie(m.created_at, depot.captureLe, seuil) : null;
    const absents = r.documents.filter((d) => d.issue === 'absent').map((d) => d.document);
    console.log(
      [
        `· ${r.slug} [${r.resultat}]`,
        etat ? `${etat.etoiles} étoiles au ${etat.etoiles_au.slice(0, 10)}` : 'étoiles : Non renseigné',
        `dernier push ${etat?.dernier_push?.slice(0, 10) ?? 'Non renseigné'}${etat?.inactif ? ` (aucun push depuis ${etat.jours_sans_push} jours)` : ''}`,
        `licence ${etat?.licence ?? 'Non renseigné'}`,
        `statut ${statut ?? 'non calculé'}`,
        r.decision ? `décision ${r.decision.decision} (${r.decision.motif})` : null,
        etat?.fork ? `fork de ${etat.parent?.full_name ?? 'parent inconnu'}` : null,
        absents.length > 0 ? `absents : ${absents.join(', ')}` : null,
        r.erreur ? `erreur : ${r.erreur}` : null,
      ]
        .filter(Boolean)
        .join(' — '),
    );
  }
  if (bilan.quotaEpuise) console.error(`Plafond d'API GitHub atteint. Relancer après ${bilan.quota.reinitialisation ?? 'la réinitialisation (heure inconnue)'} : la relance reprend où elle s'est arrêtée.`);
  return bilan.code;
}
