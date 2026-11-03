// Relecture humaine d'un lot : un document Markdown généré depuis la base, avec le coût réellement enregistré.
// Lecture seule, aucun appel au modèle. Un brouillon « contrôlé » reste à relire : ce statut ne garantit rien.
import type { Client } from '@libsql/client';
import { LIBELLE_CONTROLE, type Controle } from './controles.ts';
import type { Brouillon } from './schemas.ts';

const NON_RENSEIGNE = 'Non renseigné';
const CHAMPS = [['nouveaute', 'Nouveauté'], ['ce_que_ca_permet', 'Ce que ça permet'], ['pour_qui', 'Pour qui'], ['exemple_usage', 'Exemple d’usage'], ['acces', 'Pour commencer'], ['prerequis', 'Prérequis'], ['cout', 'Coût'], ['limites_connues', 'Limites connues']] as const;
const LIBELLES_STATUTS: Record<string, string> = {
  controle_automatique: LIBELLE_CONTROLE,
  a_verifier: 'À vérifier',
  rejete: 'Rejeté',
};

type Contenu = Brouillon & { date_annonce: string | null; nature: string | null; categories: string[]; produit: string | null; version_cible: string; niveau_preuve: string };

const dollars = (microUsd: number) => `${(microUsd / 1_000_000).toFixed(4)} $`;
const citations = (passages: string[]) => passages.map((p) => `  > ${p}`);
const champ = (libelle: string, valeur: { texte: string; passages: string[] } | null) =>
  valeur ? [`- **${libelle}** : ${valeur.texte}`, ...citations(valeur.passages)] : [`- **${libelle}** : ${NON_RENSEIGNE}`];

function brouillon(ligne: Record<string, unknown>, contenu: Contenu): string[] {
  const ecarts = JSON.parse(String(ligne.checks ?? '[]')) as Controle[];
  return [
    `## ${contenu.accroche.texte}`,
    '',
    `**${LIBELLES_STATUTS[String(ligne.status)] ?? String(ligne.status)}** · compte ${String(ligne.account)} · ${contenu.niveau_preuve} · coût ${dollars(Number(ligne.cout))}`,
    '',
    `- **Actualité** : ${String(ligne.title)}`,
    `- **Source** : ${String(ligne.url ?? NON_RENSEIGNE)} (capture ${String(ligne.snapshot_id)})`,
    `- **Date d'annonce** : ${contenu.date_annonce ?? NON_RENSEIGNE} · **Version** : ${contenu.version_cible} · **Produit** : ${contenu.produit ?? NON_RENSEIGNE}`,
    `- **Nature** : ${contenu.nature ?? NON_RENSEIGNE} · **Catégories** : ${contenu.categories.join(', ') || NON_RENSEIGNE} · **Type** : ${String(ligne.information_type)}`,
    `- **Modèle** : ${String(ligne.model)} · **Prompt** : ${String(ligne.prompt_version)}`,
    ...citations(contenu.accroche.passages),
    ...champ('Description', contenu.description),
    ...CHAMPS.flatMap(([cle, libelle]) => champ(libelle, contenu[cle])),
    ...contenu.details.flatMap((d) => champ(d.titre, d)),
    ...contenu.attributions.flatMap((a) => [...champ(`${a.type === 'benchmark' ? 'Benchmark' : 'Témoignage'}, ${a.auteur}`, a), ...(a.conditions ? champ('Conditions', a.conditions) : [])]),
    ...contenu.reperes.flatMap((r) => champ('Repère du visuel', r)),
    `- **Carrousel** : ${contenu.diapositives.join(', ')}`,
    `- **Questions à tester** : ${contenu.questions_a_tester.join(' ; ') || NON_RENSEIGNE}`,
    `- **Écarts** : ${ecarts.length === 0 ? 'aucun détecté' : ''}`,
    ...ecarts.map((e) => `  - ${e.champ} : ${e.code}${e.detail ? ` (${e.detail})` : ''}`),
    '',
  ];
}

/** Document complet : bilan et coût du lot, brouillons à relire, puis actualités sans brouillon. */
export async function relectureMarkdown(client: Client, genereLe: string): Promise<string> {
  const lignes = (await client.execute(
    `select d.*, n.title, doc.url,
            (select coalesce(sum(coalesce(l.actual_micro_usd, l.reserved_micro_usd)), 0) from llm_call l where l.news_item_id = d.news_item_id) as cout
     from post_draft d
     join news_item n on n.id = d.news_item_id
     join document_snapshot c on c.id = d.snapshot_id
     join source_document doc on doc.id = c.document_id
     -- Les découvertes ont leur propre format (ADR 0011) : elles se relisent avec npm run ressources.
     where n.kind not in ('decouverte', 'selection')
     order by case d.status when 'a_verifier' then 0 when 'controle_automatique' then 1 when 'rejete' then 2 else 3 end, d.id`,
  )).rows as unknown as Record<string, unknown>[];
  const appels = (await client.execute(
    `select count(*) as n, count(distinct news_item_id) as actualites, coalesce(sum(coalesce(actual_micro_usd, reserved_micro_usd)), 0) as total, coalesce(sum(actual_micro_usd), 0) as reel,
            coalesce(sum(input_tokens), 0) as entree, coalesce(sum(output_tokens), 0) as sortie from llm_call`,
  )).rows[0]!;
  const avecContenu = lignes.filter((l) => ['a_verifier', 'controle_automatique', 'rejete'].includes(String(l.status)));
  const compte = (statut: string) => lignes.filter((l) => l.status === statut).length;
  // Seules les actualités qui ont coûté un appel comptent : une entrée écartée par le code ne dit rien du coût d'un sujet analysé.
  const moyenne = Number(appels.actualites) === 0 ? null : Number(appels.total) / Number(appels.actualites);
  const autres = lignes.filter((l) => !avecContenu.includes(l));
  const notes = new Map((await client.execute(`select news_item_id, criteres from selection_decision where remplacee_le is null and criteres is not null and origine = 'modele'`)).rows
    .map((l) => [Number(l.news_item_id), Object.values(JSON.parse(String(l.criteres)) as Record<string, { note: number }>).map((c) => c.note).join('-')]));
  return [
    '# Brouillons à relire',
    '',
    `Généré le ${genereLe}. Rien n'est publié. Analyses IA à partir des sources, non testées par la plateforme.`,
    '',
    `- **Résultats** : ${lignes.length} actualité(s) ; ${compte('a_verifier')} à vérifier, ${compte('controle_automatique')} sans écart détecté, ${compte('rejete')} rejetée(s), ${compte('ecartee')} écartée(s), ${compte('a_approfondir')} à approfondir, ${compte('qualifiee')} qualifiée(s) en attente de rédaction, ${compte('sortie_invalide') + compte('sortie_tronquee') + compte('refus')} sans sortie exploitable.`,
    `- **Coût enregistré** : ${dollars(Number(appels.total))} sur ${Number(appels.n)} appel(s), dont ${dollars(Number(appels.reel))} facturés ; le reste est une réservation sans réponse, qui a pu être facturée.`,
    `- **Coût moyen par actualité** : ${moyenne === null ? NON_RENSEIGNE : dollars(moyenne)} · **Tokens** : ${Number(appels.entree)} en entrée, ${Number(appels.sortie)} en sortie.`,
    '',
    ...avecContenu.flatMap((l) => brouillon(l, JSON.parse(String(l.content)) as Contenu)),
    ...(autres.length > 0 ? ['## Actualités sans brouillon', '', ...autres.map((l) => {
      const n = notes.get(Number(l.news_item_id));
      return `- ${String(l.status)}${l.rejection_reason ? ` (${String(l.rejection_reason)})` : ''}${n ? ` · notes ${n}` : ''} : ${String(l.title)}`;
    }), ''] : []),
  ].join('\n');
}
