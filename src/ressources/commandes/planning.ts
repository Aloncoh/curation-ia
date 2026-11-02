// npm run ressources -- planning [--plafond N] [--reserve N] [--recalculer]
// Affiche le planning : jours, places prises et restantes sous le plafond partagé, réserve des nouveautés prioritaires,
// et chaque publication avec son jour prévu ou son report. --plafond et --reserve écrivent les réglages et replacent,
// dans la même transaction, toutes les publications prévues ; --recalculer replace sans changer les réglages (jamais
// une publication déjà publiée). Aucun réseau.
import type { Client } from '@libsql/client';
import { getTableName } from 'drizzle-orm';
import { settings } from '../../db/schema.ts';
import { withBusyRetry } from '../../db/retry.ts';
import { jourParis, lireReglagesPlanning, replanifier, type ReglagesPlanning } from '../planification.ts';
import type { ContexteCommande } from './contexte.ts';

const LIBELLE_STATUT: Record<string, string> = { ressource_existante: 'ressource existante', nouvelle_sortie: 'nouvelle sortie', actualite: 'actualité' };

interface LignePlanning {
  postId: number;
  nom: string;
  jour: string | null;
  rang: number | null;
  statutSortie: string;
  reserve: boolean;
  etat: string;
  motif: string | null;
  statutPost: string;
}

export async function lirePlanning(client: Client): Promise<LignePlanning[]> {
  const r = await client.execute(`
    select pp.post_id, pp.jour, pp.rang, pp.statut_sortie, pp.utilise_reserve, pp.etat, pp.motif, p.status,
      (select rv.content from post_revision rv where rv.post_id = p.id order by rv.seq desc limit 1) as content
    from publication_planifiee pp join post p on p.id = pp.post_id
    order by pp.jour is null, pp.jour, pp.rang, pp.post_id`);
  return r.rows.map((row) => {
    const contenu = row.content === null ? {} : (JSON.parse(String(row.content)) as { slug?: string; mots_cles?: { nom?: string } });
    return {
      postId: Number(row.post_id),
      nom: contenu.mots_cles?.nom ?? contenu.slug ?? `publication ${row.post_id}`,
      jour: row.jour === null ? null : String(row.jour),
      rang: row.rang === null ? null : Number(row.rang),
      statutSortie: String(row.statut_sortie),
      reserve: Number(row.utilise_reserve) === 1,
      etat: String(row.etat),
      motif: row.motif === null ? null : String(row.motif),
      statutPost: String(row.status),
    };
  });
}

/** Publications publiées hors planification (P5) : elles comptent dans le plafond de leur jour. */
async function publieesHorsPlanning(client: Client): Promise<Map<string, number>> {
  const r = await client.execute(`select published_at from post p where p.status = 'publie' and p.published_at is not null
    and not exists (select 1 from publication_planifiee pp where pp.post_id = p.id)`);
  const parJour = new Map<string, number>();
  for (const row of r.rows) {
    const jour = jourParis(String(row.published_at));
    parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
  }
  return parJour;
}

export function afficherPlanning(lignes: LignePlanning[], horsPlanning: Map<string, number>, r: ReglagesPlanning, aujourdhui: string): string {
  const sortie = [
    `Planning — plafond ${r.plafond} publications par jour, tous contenus confondus ; réserve ${r.reserve} pour les nouveautés prioritaires ; jour civil Europe/Paris (aujourd'hui ${aujourdhui}).`,
    'Rien n’est publié avant P5 : « en attente » = jour prévu, pas une publication.',
  ];
  const jours = [...new Set([...lignes.filter((l) => l.jour !== null).map((l) => l.jour!), ...horsPlanning.keys()])].sort();
  for (const jour of jours) {
    const du = lignes.filter((l) => l.jour === jour && l.etat !== 'reportee');
    const reserve = du.filter((l) => l.reserve).length;
    const autres = horsPlanning.get(jour) ?? 0;
    const normales = du.length - reserve + autres;
    const prises = normales + reserve;
    sortie.push(
      '',
      `${jour}${jour < aujourdhui ? ' (passé)' : ''} : ${prises} place(s) prise(s) sur ${r.plafond}, ${Math.max(0, r.plafond - prises)} restante(s) — ` +
        `hors réserve ${normales}/${r.plafond - r.reserve}, réserve ${reserve}/${r.reserve}${autres ? ` (dont ${autres} publiée(s) hors planning)` : ''}`,
    );
    for (const l of du) {
      sortie.push(
        `  ${l.rang}. ${l.nom} (publication ${l.postId}) — ${LIBELLE_STATUT[l.statutSortie] ?? l.statutSortie} — ${l.etat === 'publiee' ? 'publiée' : 'en attente, prévue'}` +
          `${l.reserve ? ' — sur la réserve' : ''}${l.motif ? ` — ${l.motif}` : ''}`,
      );
    }
  }
  const reportees = lignes.filter((l) => l.etat === 'reportee');
  if (reportees.length > 0) {
    sortie.push('', `Reportées faute de place (sujet retenu, en attente d'une place ; ce n'est pas un écart) : ${reportees.length}`);
    for (const l of reportees) sortie.push(`  · ${l.nom} (publication ${l.postId}) — ${LIBELLE_STATUT[l.statutSortie] ?? l.statutSortie} — ${l.motif ?? 'plafond_atteint'}`);
  }
  if (lignes.length === 0) sortie.push('', 'Aucune publication planifiée.');
  else sortie.push('', `Total : ${lignes.filter((l) => l.etat === 'prevue').length} prévue(s), ${reportees.length} reportée(s), ${lignes.filter((l) => l.etat === 'publiee').length} publiée(s).`);
  return sortie.join('\n');
}

const entier = (nom: string, v: string | undefined): number => {
  const n = Number(v);
  if (v === undefined || !Number.isInteger(n) || n < 0) throw new Error(`${nom} attend un entier positif ou nul.`);
  return n;
};

export async function planning(args: string[], ctx: ContexteCommande): Promise<number> {
  const { client, db } = ctx.database;
  const maintenant = (ctx.horloge ?? (() => new Date()))();
  const now = maintenant.toISOString();
  let plafond: number | null = null;
  let reserve: number | null = null;
  let recalculer = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--plafond') plafond = entier('--plafond', args[++i]);
    else if (a === '--reserve') reserve = entier('--reserve', args[++i]);
    else if (a === '--recalculer') recalculer = true;
    else throw new Error(`Argument inconnu : ${a}. Usage : planning [--plafond N] [--reserve N] [--recalculer]`);
  }

  // Un plafond ou une réserve modifiés replacent toutes les publications prévues, dans la même transaction que
  // l'écriture des réglages : aucun jour à venir ne reste au-dessus du nouveau plafond (SPEC §3.6).
  let nouveaux: ReglagesPlanning | null = null;
  if (plafond !== null || reserve !== null) {
    const actuels = await lireReglagesPlanning(db);
    const p = plafond ?? actuels.plafond;
    const r = reserve ?? actuels.reserve;
    if (r > p) {
      console.error(`Réserve (${r}) supérieure au plafond (${p}) : réglages inchangés.`);
      return 1;
    }
    nouveaux = { ...actuels, plafond: p, reserve: r };
  }

  if (nouveaux !== null || recalculer) {
    const reglagesCalcul = nouveaux ?? (await lireReglagesPlanning(db));
    const placees = await withBusyRetry(client, async () => {
      const tx = await client.transaction('write');
      try {
        for (const [cle, valeur] of [['publication.plafond_jour', plafond], ['publication.reserve_nouveautes_jour', reserve]] as const) {
          if (valeur === null) continue;
          await tx.execute({
            sql: `insert into ${getTableName(settings)} (key, value, updated_at) values (?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
            args: [cle, String(valeur), now],
          });
        }
        const r = await replanifier(tx, { aujourdhui: jourParis(maintenant), reglages: reglagesCalcul, now, tout: true });
        await tx.commit();
        return r;
      } finally {
        tx.close();
      }
    });
    for (const [cle, valeur] of [['publication.plafond_jour', plafond], ['publication.reserve_nouveautes_jour', reserve]] as const) if (valeur !== null) console.log(`Réglage ${cle} = ${valeur}.`);
    console.log(`Recalcul : ${placees.length} publication(s) replacée(s).`);
  }

  const reglages = await lireReglagesPlanning(db);
  console.log(afficherPlanning(await lirePlanning(client), await publieesHorsPlanning(client), reglages, jourParis(maintenant)));
  return 0;
}
