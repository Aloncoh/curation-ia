// npm run ressources -- chercher "<requête>" [--recents] [--limite N] [--curseur C] [--json]
// Recherche en mode aperçu : publications publiées et en attente planifiées, ces dernières étiquetées « pas encore publié ».
// Code 0, même sans résultat ; 1 si la saisie est invalide. Aucun réseau, aucune requête enregistrée.
import { rechercher, RequeteInvalide, type ReponseRecherche } from '../../recherche/rechercher.ts';
import type { ContexteCommande } from './contexte.ts';

const LIBELLES_CHAMP: Record<string, string> = { nom: 'nom', categorie: 'catégorie', usage: 'usage', technologie: 'technologie', terme_proche: 'terme proche', texte: 'texte' };

export function afficherReponse(r: ReponseRecherche): string {
  const lignes = [`Recherche « ${r.requete} » (normalisée : « ${r.requete_normalisee} »), mode ${r.mode}, tri ${r.tri} : ${r.total} résultat(s).`];
  if (r.message) lignes.push(r.message);
  for (const [i, x] of r.resultats.entries()) {
    const statut = x.etiquette ? ` — ${x.etiquette}` : '';
    lignes.push('', `${i + 1}. ${x.nom ?? `publication ${x.post_id}`} (publication ${x.post_id}, score ${x.score}, jour ${x.jour ?? 'Non renseigné'})${statut}`);
    for (const c of x.correspondances) {
      lignes.push(`   · ${LIBELLES_CHAMP[c.champ] ?? c.champ} « ${c.terme} » : ${c.raison}`);
      if (c.extrait) lignes.push(`     extrait : « ${c.extrait} »`);
    }
  }
  if (r.curseur_suivant) lignes.push('', `Page suivante : --curseur ${r.curseur_suivant}`);
  return lignes.join('\n');
}

export async function chercher(args: string[], ctx: ContexteCommande): Promise<number> {
  const mots: string[] = [];
  let tri: 'pertinence' | 'recents' = 'pertinence';
  let curseur: string | null = null;
  let limite: number | undefined;
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--recents') tri = 'recents';
    else if (a === '--json') json = true;
    else if (a === '--curseur') curseur = args[++i] ?? '';
    else if (a === '--limite') limite = Number(args[++i]);
    else mots.push(a);
  }
  try {
    const reponse = await rechercher(ctx.database.client, mots.join(' '), { mode: 'apercu', tri, curseur, ...(limite === undefined ? {} : { limite }) });
    console.log(json ? JSON.stringify(reponse, null, 2) : afficherReponse(reponse));
    return 0;
  } catch (erreur) {
    if (!(erreur instanceof RequeteInvalide)) throw erreur;
    console.error(`Saisie invalide : ${erreur.message}`);
    console.error('Usage : npm run ressources -- chercher "<requête>" [--recents] [--limite N] [--curseur C] [--json]');
    return 1;
  }
}
