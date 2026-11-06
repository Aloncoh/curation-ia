// Recherche (SPEC §7.15) : les publications trouvées, chacune avec la raison qui la fait remonter ; sans requête, renvoi
// à l'accueil du réseau, qui porte aussi les sujets. Aucun résultat n'est inventé.
import type { Metadata } from 'next';
import { textesDe, type Textes } from '@curation/textes';
import type { ResultatRecherche } from '@curation/contrat';
import { redirect } from 'next/navigation';
import { recherche, RequeteInvalide } from '../../../../src/api/v1/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { CartePost } from '../../components/CartePost.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

type Parametres = { searchParams: Promise<{ q?: string | string[]; tri?: string | string[] }> };

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ searchParams }: Parametres): Promise<Metadata> {
  const t = textesDe(await langueDeLaRequete());
  const q = premier((await searchParams).q).trim();
  return { title: q ? `${q.slice(0, 60)} · ${t.recherche.titre}` : t.commun.explorer };
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

  // Sans requête, plus de page Explorer à part (2026-11-06, « Fil et Explorer sont des doublons ») : l'accueil du réseau
  // montre les sujets puis les posts.
  if (!q) redirect('/fil');

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
    <Cadre langue={ctx.langue} rubrique="explorer" requete={q}>
      <h1 className="titre-page">{t.recherche.titre}</h1>
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
