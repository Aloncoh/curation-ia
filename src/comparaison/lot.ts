// Lot de comparaison : le jeu de développement figé. Le jeu d'évaluation reste à l'aveugle pour les avis humains.
import type { Client } from '@libsql/client';
import { moinsDeTroisMots } from '../analysis/controles.ts';
import { sujetsDuCorpus, type SujetCorpus } from '../selection/corpus.ts';

/** Sous cette longueur, le document est un titre ou un résumé : c'est là qu'un modèle risque le plus d'inventer. */
export const LONGUEUR_TEXTE_COURT = 400;

export interface SujetLot extends SujetCorpus {
  titre_actualite: string;
  source_nom: string;
  produit: string | null;
  version: string | null;
  texte_court: boolean;
  /** Même filtre que le moteur : sous trois mots, aucun appel. */
  analysable: boolean;
}

export async function lotDeComparaison(client: Client): Promise<SujetLot[]> {
  const sujets = await sujetsDuCorpus(client, 'developpement');
  const lignes = (await client.execute(
    `select n.id, n.title, src.name as source_nom, pr.name as produit, v.version
     from selection_corpus sc
     join news_item n on n.id = sc.news_item_id
     join document_snapshot c on c.id = sc.snapshot_id
     join source_document d on d.id = c.document_id
     join source src on src.id = d.source_id
     left join news_item_target t on t.news_item_id = n.id
     left join product_version v on v.id = t.product_version_id
     left join product pr on pr.id = t.product_id
     where sc.jeu = 'developpement'`,
  )).rows;
  const details = new Map(lignes.map((l) => [Number(l.id), l]));
  return sujets.map((s) => {
    const d = details.get(s.id)!;
    return {
      ...s,
      titre_actualite: String(d.title),
      source_nom: String(d.source_nom),
      produit: d.produit === null ? null : String(d.produit),
      version: d.version === null ? null : String(d.version),
      texte_court: s.texte.length < LONGUEUR_TEXTE_COURT,
      analysable: !moinsDeTroisMots(s.texte),
    };
  });
}
