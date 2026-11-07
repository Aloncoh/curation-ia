// Recherche (SPEC §7.15), interactive depuis le 2026-11-07 : un champ qui propose des publications pendant la frappe et
// les sujets du moment en raccourcis (RechercheVivante.tsx) ; avec une requête, les publications trouvées, chacune avec
// la raison qui la fait remonter. Aucun résultat n'est inventé.
import type { Metadata } from 'next';
import { textesDe, type Textes } from '@curation/textes';
import type { ResultatRecherche } from '@curation/contrat';
import { fil, recherche, RequeteInvalide } from '../../../../src/api/v1/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { CartePost } from '../../components/CartePost.tsx';
import { RechercheVivante } from '../../components/RechercheVivante.tsx';
import { sujetDe } from '../../lib/sujet.ts';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

type Parametres = { searchParams: Promise<{ q?: string | string[]; tri?: string | string[] }> };

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ searchParams }: Parametres): Promise<Metadata> {
  const t = textesDe(await langueDeLaRequete());
  const q = premier((await searchParams).q).trim();
  return { title: q ? `${q.slice(0, 60)} · ${t.recherche.titre}` : t.commun.rechercher };
}

function raison(r: ResultatRecherche, t: Textes): string | null {
  const c = r.correspondances[0];
  if (!c) return null;
  return c.champ === 'terme_proche' ? t.recherche.termeProche : t.recherche.trouveDans(t.recherche.champs[c.champ]);
}

export default async function Recherche({ searchParams }: Parametres) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const sp = await searchParams;
  const q = premier(sp.q).trim().slice(0, 200);
  const tri = premier(sp.tri) === 'recents' ? 'recents' : 'pertinence';

  // Sujets du moment (les plus fréquents parmi les 50 derniers posts), proposés sous le champ.
  const compte = new Map<string, number>();
  for (const p of (await fil(ctx, { limite: 50 }).catch(() => null))?.publications ?? []) {
    const s = sujetDe(p);
    if (s) compte.set(s.nom, (compte.get(s.nom) ?? 0) + 1);
  }
  const sujets = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([nom]) => nom);
  const champ = (
    <RechercheVivante
      requete={q} langue={ctx.langue} sujets={sujets}
      l={{ champ: t.commun.rechercherPublications, indice: t.recherche.indice, propositions: t.vitrine.propositions, sujets: t.vitrine.sujetsPopulaires, aucune: t.vitrine.aucunePropositon, rechercher: t.commun.rechercher }}
    />
  );
  if (!q) {
    return (
      <Cadre langue={ctx.langue} rubrique="recherche">
        <h1 className="titre-page">{t.commun.rechercher}</h1>
        {champ}
      </Cadre>
    );
  }

  let reponse = null;
  let invalide = false;
  try {
    reponse = await recherche(ctx, q, { tri });
  } catch (e) {
    if (!(e instanceof RequeteInvalide)) throw e;
    invalide = true;
  }
  const lienTri = (valeur: 'pertinence' | 'recents', libelle: string) => (
    <a href={`/recherche?${new URLSearchParams({ q, tri: valeur })}`} aria-current={tri === valeur ? 'page' : undefined}>{libelle}</a>
  );
  return (
    <Cadre langue={ctx.langue} rubrique="recherche" requete={q}>
      <h1 className="titre-page">{t.recherche.titre}</h1>
      {champ}
      {invalide || !reponse ? (
        <Vide titre={t.recherche.invalide} />
      ) : reponse.resultats.length === 0 ? (
        <Vide titre={t.recherche.aucunResultat(q)} texte={t.recherche.aucunResultatMessage} />
      ) : (
        <>
          <nav className="onglets" aria-label={t.recherche.tri}>
            {lienTri('pertinence', t.recherche.pertinence)}
            {lienTri('recents', t.recherche.recents)}
          </nav>
          <p className="compte-resultats" role="status">{t.recherche.resultats(reponse.total)}</p>
          {reponse.resultats.map((r) => <CartePost key={r.publication.id} p={r.publication} t={t} langue={ctx.langue} raison={raison(r, t)} />)}
        </>
      )}
    </Cadre>
  );
}
