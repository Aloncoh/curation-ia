// Publications de ressources pour la maquette (ADR 0011) : celles qui sont planifiées (`en_attente`, mode aperçu) ou
// publiées, lues dans les mêmes tables que l'API v1 de P4 (révision, bouton vérifié, planning, média, origine).
// Les mots-clés ne sont jamais affichés : ils ne vont que dans les documents de recherche (`recherche`).
// Les autres (à vérifier, rejetées) ne s'affichent pas : seuls leur nom et leurs motifs sont résumés.
import { existsSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';
import type { Client, Transaction } from '@libsql/client';
import { REGLAGES_PAR_DEFAUT } from '../control/settings.ts';
import { textesDePublication } from '../recherche/index.ts';
import type { DocumentRecherche } from '../recherche/moteur.ts';
import { ETIQUETTE_NON_PUBLIE } from '../recherche/rechercher.ts';
import { texteOrigine } from '../ressources/chaine.ts';
import { destinationDe, LIBELLE_DE } from '../ressources/controles.ts';
import { boutonAffichable, MENTION_COMMANDE, nomAccessible } from '../ressources/liens.ts';
import { motsClesDesRevisions } from '../ressources/mots-cles.ts';
import { jourParis } from '../ressources/planification.ts';
import type { EtatDepot, LibelleBouton } from '../ressources/schemas.ts';

interface Cite {
  texte: string;
  passages: string[];
}

export interface MaquetteRessource {
  post_id: number;
  revision_id: number;
  slug: string;
  nom: string;
  compte: string;
  statut: 'en_attente' | 'publie';
  /** « pas encore publié » pour une publication en attente (aperçu). */
  etiquette: string | null;
  planning: { jour: string | null; rang: number | null; etat: string; utilise_reserve: boolean; motif: string | null } | null;
  statut_sortie: 'ressource_existante' | 'nouvelle_sortie';
  badge: 'Ressource existante' | 'Nouvelle sortie';
  origine: { code: string; texte: string };
  mention: string;
  accroche: Cite;
  description: Cite;
  interet: Cite;
  exemple_usage: Cite;
  demarrage: { etapes: Cite[]; commande: string | null; mention_commande: string; passages: string[] };
  compatibilites: Cite[];
  limites: Cite[];
  licence_locale: Cite | null;
  /** Points distinctifs du post court (1 à 3), affichés à la suite de l'accroche, de la description et de l'intérêt. */
  reperes: Cite[];
  /** Bouton affiché seulement si la dernière vérification est verte et récente ; sinon null. */
  bouton: { libelle: LibelleBouton; url: string; aria_label: string; verifie_le: string; motif: string } | null;
  etat_depot: EtatDepot;
  visuel: { src: string; alt: string; gabarit: string; mention: string } | null;
  captures: { document: string; url: string | null; snapshot_id: number; capture_le: string; mode: string | null }[];
  decouverte_via: string;
  importe_le: string;
}

export interface RessourceNonPlanifiee {
  post_id: number;
  slug: string;
  nom: string;
  statut: string;
  motifs: { code: string; champ: string; detail?: string }[];
}

export interface DonneesRessources {
  ressources: MaquetteRessource[];
  ressources_non_planifiees: RessourceNonPlanifiee[];
  /** Documents de recherche (mode aperçu), classés dans le navigateur par le même code que `chercher`. */
  recherche: DocumentRecherche[];
}

type Lecteur = Client | Transaction;

async function validiteLien(executeur: Lecteur): Promise<number> {
  const r = await executeur.execute({ sql: 'select value from setting where key = ?', args: ['ressources.validite_lien_jours'] });
  const v = r.rows[0] ? Number(r.rows[0].value) : REGLAGES_PAR_DEFAUT['ressources.validite_lien_jours'];
  return Number.isInteger(v) && v >= 0 ? v : REGLAGES_PAR_DEFAUT['ressources.validite_lien_jours'];
}

/** L'URL d'un bouton stocké repasse-t-elle la règle d'écriture (`destinationDe`) avec le libellé attendu ? */
export function urlDeBoutonSure(b: { libelle: LibelleBouton; url: string }): boolean {
  // Le libellé « Télécharger » n'est enregistré qu'après le contrôle des fichiers joints : il autorise la forme « releases ».
  const d = destinationDe(b.url, { releasesAvecFichiers: b.libelle === 'Télécharger' });
  return d !== null && LIBELLE_DE[d] === b.libelle;
}

/** Lit les publications de ressources ; `generatedAt` date la validité des boutons. */
export async function ressourcesDeLaMaquette(executeur: Lecteur, generatedAt: string, ids?: readonly number[]): Promise<DonneesRessources> {
  if (ids && ids.length === 0) return { ressources: [], ressources_non_planifiees: [], recherche: [] };
  const r = await executeur.execute({ args: ids ? [...ids] : [], sql: `
    select p.id, p.status, p.account_id, p.published_at, d.origine, d.model, d.prompt_version, d.checks, d.created_at as importe_le,
      rv.id as revision_id, rv.content, pp.jour, pp.rang, pp.etat, pp.utilise_reserve, pp.motif
    from post p
    join news_item n on n.id = p.news_item_id and n.kind = 'decouverte'
    join post_draft d on d.news_item_id = p.news_item_id
    join post_revision rv on rv.post_id = p.id and rv.seq = (select max(seq) from post_revision x where x.post_id = p.id)
    left join publication_planifiee pp on pp.post_id = p.id${ids ? `\n    where p.id in (${ids.map(() => '?').join(', ')})` : ''}
    order by p.id` });
  const validite = await validiteLien(executeur);
  const maintenant = new Date(generatedAt);
  const visibles = r.rows.filter((row) => row.status === 'publie' || (row.status === 'en_attente' && row.etat !== null));
  const motsCles = await motsClesDesRevisions(executeur, visibles.map((row) => Number(row.revision_id)));

  const ressources: MaquetteRessource[] = [];
  const recherche: DocumentRecherche[] = [];
  const nonPlanifiees: RessourceNonPlanifiee[] = [];
  for (const row of r.rows) {
    const contenu = JSON.parse(String(row.content)) as Record<string, any>;
    const postId = Number(row.id);
    if (!visibles.includes(row)) {
      const checks = row.checks === null ? [] : (JSON.parse(String(row.checks)) as RessourceNonPlanifiee['motifs']);
      nonPlanifiees.push({
        post_id: postId,
        slug: String(contenu.slug),
        nom: String(contenu.mots_cles?.nom ?? contenu.slug),
        statut: String(row.status),
        motifs: checks.map((c) => ({ code: c.code, champ: c.champ, ...(c.detail ? { detail: c.detail } : {}) })),
      });
      continue;
    }
    const revisionId = Number(row.revision_id);
    const boutons = await executeur.execute({
      sql: 'select libelle, url, resultat, motif, verifie_le from post_bouton where post_id = ? and revision_id = ? order by verifie_le',
      args: [postId, revisionId],
    });
    const historique = boutons.rows.map((b) => ({ libelle: String(b.libelle) as LibelleBouton, url: String(b.url), resultat: String(b.resultat) as 'verifie' | 'echec', motif: String(b.motif ?? ''), verifie_le: String(b.verifie_le) }));
    // À la lecture aussi, une URL ne devient un bouton que si elle repasse le contrôle d'écriture (https, hôte attendu,
    // libellé cohérent) : une ligne écrite par un autre chemin ne s'afficherait pas telle quelle.
    const bouton = boutonAffichable(historique.filter(urlDeBoutonSure), maintenant, validite);
    const media = await executeur.execute({ sql: 'select alt_text, notice, content from media_asset where post_id = ? order by id desc limit 1', args: [postId] });
    const m = media.rows[0];
    const mc = m?.content ? (JSON.parse(String(m.content)) as { fichier?: string; gabarit?: string }) : null;
    // Chemin servi par la maquette : relatif au dossier maquette/, et seulement si le fichier existe.
    const rel = mc?.fichier ? relative('maquette', mc.fichier) : null;
    const servi = rel !== null && rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) && existsSync(mc!.fichier!);
    const visuel = m && servi ? { src: rel!.split(sep).join('/'), alt: String(m.alt_text), gabarit: String(mc!.gabarit), mention: String(m.notice) } : null;
    const ids = (contenu.captures as { document: string; snapshot_id: number; capture_le: string }[]).map((c) => c.snapshot_id);
    const caps = ids.length
      ? await executeur.execute({
          sql: `select c.id, d.url, r.mode from document_snapshot c join source_document d on d.id = c.document_id left join run r on r.id = c.run_id where c.id in (${ids.map(() => '?').join(', ')})`,
          args: ids,
        })
      : { rows: [] };
    const infos = new Map(caps.rows.map((c) => [Number(c.id), { url: c.url === null ? null : String(c.url), mode: c.mode === null ? null : String(c.mode) }]));
    const mots = (motsCles.get(revisionId) ?? []).map(({ champ, terme, raison, passage }) => ({ champ, terme, raison, passage }));
    const statut = row.status === 'publie' ? 'publie' : 'en_attente';
    // Jour civil Europe/Paris, comme le plafond : jamais la sous-chaîne UTC de `published_at`.
    const jour = statut === 'publie' && row.published_at ? jourParis(String(row.published_at)) : row.jour === null ? null : String(row.jour);
    ressources.push({
      post_id: postId,
      revision_id: revisionId,
      slug: String(contenu.slug),
      nom: String(contenu.mots_cles.nom),
      compte: String(row.account_id),
      statut,
      etiquette: statut === 'en_attente' ? ETIQUETTE_NON_PUBLIE : null,
      planning: row.etat === null ? null : { jour: row.jour === null ? null : String(row.jour), rang: row.rang === null ? null : Number(row.rang), etat: String(row.etat), utilise_reserve: Number(row.utilise_reserve) === 1, motif: row.motif === null ? null : String(row.motif) },
      statut_sortie: contenu.statut_sortie,
      badge: contenu.statut_sortie === 'nouvelle_sortie' ? 'Nouvelle sortie' : 'Ressource existante',
      origine: { code: String(row.origine), texte: texteOrigine(String(row.origine), String(row.model), String(row.prompt_version)) },
      mention: contenu.mention,
      accroche: contenu.accroche,
      description: contenu.description,
      interet: contenu.interet,
      exemple_usage: contenu.exemple_usage,
      demarrage: { ...contenu.demarrage, mention_commande: MENTION_COMMANDE },
      compatibilites: contenu.compatibilites,
      limites: contenu.limites,
      licence_locale: contenu.licence_locale,
      reperes: Array.isArray(contenu.reperes) ? contenu.reperes : [],
      bouton: bouton ? { libelle: bouton.libelle, url: bouton.url, aria_label: nomAccessible(bouton.libelle, contenu.etat_depot.full_name), verifie_le: bouton.verifie_le, motif: bouton.motif } : null,
      etat_depot: contenu.etat_depot,
      visuel,
      captures: (contenu.captures as { document: string; snapshot_id: number; capture_le: string }[]).map((c) => ({ ...c, url: infos.get(c.snapshot_id)?.url ?? null, mode: infos.get(c.snapshot_id)?.mode ?? null })),
      decouverte_via: contenu.decouverte_via,
      importe_le: String(row.importe_le),
    });
    recherche.push({ postId, revisionId, jour, motsCles: mots, textes: textesDePublication(contenu) });
  }
  // Ordre du fil : jour (Europe/Paris), rang du planning, puis publication.
  const cle = new Map(ressources.map((x, i) => [x.post_id, { jour: recherche[i]!.jour ?? '', rang: x.planning?.rang ?? 0 }]));
  const ordre = (a: number, b: number) => {
    const x = cle.get(a)!;
    const y = cle.get(b)!;
    return x.jour.localeCompare(y.jour) || x.rang - y.rang || a - b;
  };
  ressources.sort((a, b) => ordre(a.post_id, b.post_id));
  recherche.sort((a, b) => ordre(a.postId, b.postId));
  return { ressources, ressources_non_planifiees: nonPlanifiees, recherche };
}
