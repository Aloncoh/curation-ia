// Fiche d'approfondissement de l'API v1 (SPEC §6) : les sections rédigées de la révision courante (traduites quand
// toute la fiche l'est sans écart, original à côté), la commande citée, la licence, l'état daté du dépôt, les versions
// du produit suivi et l'historique des révisions. La visibilité est celle de la publication (mode public ou aperçu).
import type { Client } from '@libsql/client';
import type { ElementFiche, Fiche, SectionFiche } from '../../../packages/contrat/src/index.ts';
import { champsDeLaFiche, partieServable, type Champ } from '../../traduction/champs.ts';
import { lienSur, lireTraductions, publicationParId, type Contexte } from './publications.ts';

type IdSection = SectionFiche['id'];

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const chaine = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

/**
 * Sections d'une fiche à partir de ses champs (`fiche.details.0.titre`…) et des textes à afficher pour chacun.
 * Un détail regroupe son titre et son texte ; un benchmark, son auteur (jamais traduit), son texte et ses conditions.
 */
export function sectionsDe(champs: readonly Champ[], textes: Record<string, string>, contenu: Record<string, unknown>): SectionFiche[] {
  const sections = new Map<IdSection, Map<string, ElementFiche>>();
  for (const c of champs) {
    const parties = c.cle.slice('fiche.'.length).split('.');
    const id = parties[0] as IdSection;
    const rang = parties.find((x) => /^\d+$/.test(x)) ?? '';
    const sous = parties[parties.length - 1];
    const elements = sections.get(id) ?? new Map<string, ElementFiche>();
    sections.set(id, elements);
    const e = elements.get(rang) ?? { cle: c.cle, titre: null, texte: '', complement: null };
    const valeur = textes[c.cle] ?? c.texte;
    if (id === 'details' && sous === 'titre') e.titre = valeur;
    else if (id === 'attributions' && sous === 'conditions') e.complement = valeur;
    else {
      e.texte = valeur;
      e.cle = c.cle;
    }
    if (id === 'attributions') e.titre = chaine(objet((contenu.attributions as unknown[] | undefined)?.[Number(rang)]).auteur);
    elements.set(rang, e);
  }
  return [...sections].map(([id, elements]) => ({ id, elements: [...elements.values()].filter((e) => e.texte.trim() !== '') })).filter((s) => s.elements.length > 0);
}

async function versionsDuProduit(client: Client, newsItemId: number, produit: string | null, versionCible: string | null): Promise<Fiche['versions']> {
  const lien = await client.execute({ sql: 'select product_id, product_version_id from news_item_target where news_item_id = ? limit 1', args: [newsItemId] });
  let produitId = lien.rows[0] ? Number(lien.rows[0].product_id) : null;
  const versionLiee = lien.rows[0]?.product_version_id ?? null;
  if (produitId === null && produit) {
    const parNom = await client.execute({ sql: 'select id from product where lower(name) = lower(?) limit 1', args: [produit] });
    produitId = parNom.rows[0] ? Number(parNom.rows[0].id) : null;
  }
  if (produitId === null) return [];
  const r = await client.execute({ sql: 'select id, version, is_prerelease, released_at from product_version where product_id = ? order by coalesce(released_at, created_at) desc, id desc limit 12', args: [produitId] });
  return r.rows.map((v) => ({
    version: String(v.version),
    prerelease: Number(v.is_prerelease) === 1,
    publiee_le: v.released_at === null ? null : String(v.released_at),
    courante: versionLiee !== null ? Number(versionLiee) === Number(v.id) : versionCible !== null && String(v.version).replace(/^v/, '') === versionCible.replace(/^v/, ''),
  }));
}

export async function ficheParId(ctx: Contexte, id: number): Promise<Fiche | null> {
  const publication = await publicationParId(ctx, id);
  if (!publication) return null;
  const r = await ctx.client.execute({
    sql: 'select rv.content, p.news_item_id from post_revision rv join post p on p.id = rv.post_id where rv.id = ?',
    args: [publication.revision_id],
  });
  const ligne = r.rows[0]!;
  const contenu = JSON.parse(String(ligne.content)) as Record<string, unknown>;
  const champs = champsDeLaFiche(publication.nature, contenu);
  const traduction = (await lireTraductions(ctx.client, ctx.langue, [publication.revision_id])).get(publication.revision_id);
  const traduite = ctx.langue !== 'en' && traduction !== undefined && partieServable(champs, traduction.champs, traduction.ecarts);
  const original = sectionsDe(champs, {}, contenu);
  const depot = objet(contenu.etat_depot);
  const revisions = await ctx.client.execute({ sql: 'select seq, created_at from post_revision where post_id = ? order by seq desc', args: [id] });
  const versionCible = chaine(contenu.version_cible);
  return {
    publication,
    langue: traduite ? ctx.langue : 'en',
    traduction: traduite ? { langue: ctx.langue, origine: traduction!.origine, modele: traduction!.modele, cree_le: traduction!.cree_le } : null,
    sections: traduite ? sectionsDe(champs, traduction!.champs, contenu) : original,
    original: traduite ? original : null,
    commande: publication.nature === 'ressource' ? chaine(objet(contenu.demarrage).commande) : null,
    // La licence compte pour une ressource : celle du dépôt, sinon la licence propre citée (section « Licence ») ; sans
    // l'une ni l'autre, « Non renseigné ». Ailleurs, elle ne s'applique pas.
    licence: publication.nature !== 'ressource' ? null : chaine(depot.licence) ? { valeur: chaine(depot.licence) } : champs.some((c) => c.cle === 'fiche.licence_locale') ? null : { valeur: null },
    depot: publication.nature === 'ressource' && chaine(depot.full_name)
      ? {
          nom: String(depot.full_name),
          url: lienSur(depot.html_url),
          etoiles: Number.isInteger(depot.etoiles) ? Number(depot.etoiles) : null,
          etoiles_au: chaine(depot.etoiles_au),
          cree_le: chaine(depot.cree_le),
          dernier_push: chaine(depot.dernier_push),
        }
      : null,
    versions: publication.nature === 'actualite' ? await versionsDuProduit(ctx.client, Number(ligne.news_item_id), chaine(contenu.produit), versionCible && /\d/.test(versionCible) ? versionCible : null) : [],
    revisions: revisions.rows.map((x, i) => ({ seq: Number(x.seq), cree_le: String(x.created_at), courante: i === 0 })),
  };
}
