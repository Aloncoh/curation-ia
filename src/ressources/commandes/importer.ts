// npm run ressources -- importer [fichier.json …]
// Applique la chaîne complète (ADR 0011 §7) aux brouillons de data/ressources/brouillons/ (ou aux fichiers donnés) :
// contrôles → visuel → liens vérifiés → mots-clés → publication `en_attente` planifiée → indexation. Réseau : liens
// seulement, quand aucune capture récente n'en tient lieu. Code 1 si un fichier est rejeté. Rien n'est forcé.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { importerBrouillons, type BilanFichier, type ControleStocke } from '../chaine.ts';
import { jourParis, lireReglagesPlanning, replanifier } from '../planification.ts';
import type { Rendeur } from '../visuel.ts';
import { DOSSIER_RESSOURCES, type ContexteCommande } from './contexte.ts';

const motif = (c: ControleStocke) => `${c.code} (${c.champ}${c.detail ? ` : ${c.detail.length > 90 ? `${c.detail.slice(0, 89)}…` : c.detail}` : ''})`;

export function afficherBilan(bilans: BilanFichier[]): string {
  const lignes: string[] = [];
  for (const b of bilans) {
    const nom = b.slug ?? b.fichier;
    if (b.issue === 'planifiee') lignes.push(`· ${nom} : planifiée le ${b.jour} (rang ${b.rang}), en attente, indexée — visuel ${b.visuel ?? 'Non renseigné'}`);
    else if (b.issue === 'reportee') lignes.push(`· ${nom} : en attente, reportée faute de place (plafond atteint sur l'horizon)`);
    else if (b.issue === 'inchangee') lignes.push(`· ${nom} : inchangée (${b.statut ?? 'aucune publication'}${b.jour ? `, prévue le ${b.jour}` : ''})`);
    else if (b.issue === 'a_verifier') lignes.push(`· ${nom} : à vérifier — non planifiée, non indexée : ${b.motifs.map(motif).join(' ; ')}`);
    else lignes.push(`· ${nom} : rejetée — ${b.motifs.filter((m) => m.niveau === 'bloquant').map(motif).join(' ; ')}`);
  }
  const n = (i: BilanFichier['issue']) => bilans.filter((b) => b.issue === i).length;
  lignes.push(
    '',
    `Bilan : ${n('planifiee')} conforme(s) planifiée(s), ${n('reportee')} reportée(s), ${n('a_verifier')} à vérifier, ${n('rejetee')} rejetée(s), ${n('inchangee')} inchangée(s).`,
  );
  return lignes.join('\n');
}

export async function importer(args: string[], ctx: ContexteCommande & { rendre?: Rendeur; dossierVisuels?: string }): Promise<number> {
  const dossier = join(ctx.dossier ?? DOSSIER_RESSOURCES, 'brouillons');
  let fichiers = args.filter((a) => !a.startsWith('--'));
  const inconnus = args.filter((a) => a.startsWith('--'));
  if (inconnus.length > 0) throw new Error(`Option inconnue : ${inconnus.join(', ')}. Usage : importer [fichier.json …]`);
  if (fichiers.length === 0) {
    try {
      fichiers = readdirSync(dossier).filter((f) => f.endsWith('.json')).sort().map((f) => join(dossier, f));
    } catch {
      fichiers = [];
    }
  }
  if (fichiers.length === 0) {
    console.log(`Aucun brouillon dans ${dossier}.`);
    return 0;
  }

  const { client, db } = ctx.database;
  const maintenant = (ctx.horloge ?? (() => new Date()))();
  // Avant P5, un jour passé sans publication reprogramme les publications prévues ; une publication reportée retente sa place.
  const reglages = await lireReglagesPlanning(db);
  const tx = await client.transaction('write');
  try {
    const replacees = await replanifier(tx, { aujourdhui: jourParis(maintenant), reglages, now: maintenant.toISOString() });
    await tx.commit();
    if (replacees.length > 0) console.log(`${replacees.length} publication(s) déjà planifiée(s) replacée(s) (jour passé ou report).`);
  } finally {
    tx.close();
  }

  const bilans = await importerBrouillons({
    database: ctx.database,
    userAgent: ctx.config.userAgent,
    fichiers,
    ...(ctx.liste ? { liste: ctx.liste } : {}),
    ...(ctx.rendre ? { rendre: ctx.rendre } : {}),
    ...(ctx.dossierVisuels ? { dossierVisuels: ctx.dossierVisuels } : {}),
    ...(ctx.transport ? { transport: ctx.transport } : {}),
    ...(ctx.resolve ? { resolve: ctx.resolve } : {}),
    ...(ctx.horloge ? { horloge: ctx.horloge } : {}),
  });
  console.log(afficherBilan(bilans));
  return bilans.some((b) => b.issue === 'rejetee' || (b.issue === 'inchangee' && b.statut === 'rejete')) ? 1 : 0;
}
