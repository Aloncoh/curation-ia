// npm run ressources -- verifier <fichier.json>
// Contrôles déterministes d'un brouillon sur les dernières captures de sa ressource. Code 1 : défaut bloquant ou JSON invalide.
import { readFileSync } from 'node:fs';
import { lireReglageEntier } from '../../control/settings.ts';
import { capturesDeRessource } from '../capture.ts';
import { controlerRessource, metadonneesDe, type ResultatControles } from '../controles.ts';
import { trouverRessource } from '../liste.ts';
import { statutSortie } from '../statut.ts';
import type { ContexteCommande } from './contexte.ts';

export interface SortieVerifier extends ResultatControles {
  fichier: string;
  slug: string | null;
  consignes: string | null;
  statut_sortie_calcule: string | null;
  captures: { document: string; snapshot_id: number; capture_le: string }[];
  resultat: 'bloquant' | 'a_verifier' | 'conforme';
}

export async function verifierFichier(fichier: string, ctx: ContexteCommande): Promise<SortieVerifier> {
  let brut: unknown;
  try {
    brut = JSON.parse(readFileSync(fichier, 'utf8'));
  } catch (erreur) {
    const detail = erreur instanceof Error ? erreur.message : String(erreur);
    return { fichier, slug: null, consignes: null, statut_sortie_calcule: null, captures: [], bloquants: [{ champ: 'fichier', code: 'json_invalide', detail }], a_verifier: [], resultat: 'bloquant' };
  }
  const objet = brut && typeof brut === 'object' ? (brut as Record<string, unknown>) : {};
  const slug = typeof objet.slug === 'string' ? objet.slug : null;
  const consignes = typeof objet.consignes === 'string' ? objet.consignes : null;
  const entree = slug ? trouverRessource(slug, ctx.liste) : undefined;
  const captures = entree ? await capturesDeRessource(ctx.database.client, entree) : [];
  const m = metadonneesDe(captures);
  const depot = captures.find((c) => c.document === 'depot');
  const seuil = await lireReglageEntier(ctx.database.db, 'ressources.seuil_nouvelle_sortie_jours');
  const controles = controlerRessource(brut, captures, m, entree);
  return {
    fichier,
    slug,
    consignes,
    statut_sortie_calcule: m && depot ? statutSortie(m.created_at, depot.captureLe, seuil) : null,
    captures: captures.map((c) => ({ document: c.document, snapshot_id: c.snapshotId, capture_le: c.captureLe })),
    ...controles,
    resultat: controles.bloquants.length > 0 ? 'bloquant' : controles.a_verifier.length > 0 ? 'a_verifier' : 'conforme',
  };
}

export async function verifier(args: string[], ctx: ContexteCommande): Promise<number> {
  if (!args[0]) throw new Error('Usage : verifier <fichier.json>');
  const sortie = await verifierFichier(args[0], ctx);
  console.log(JSON.stringify(sortie, null, 2));
  return sortie.resultat === 'bloquant' ? 1 : 0;
}
