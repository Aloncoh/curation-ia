// Recherche et Explorer (SPEC §7.15, §6 bis) : sans requête, la recherche et des publications en grille ; avec une
// requête, les publications trouvées, chacune avec la raison qui la fait remonter. Aucun résultat n'est inventé.
import type { Metadata } from 'next';
import { textesDe, type Textes } from '@curation/textes';
import type { ResultatRecherche } from '@curation/contrat';
import { fil, recherche, RequeteInvalide } from '../../../../src/api/v1/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { Couverture } from '../../components/Couverture.tsx';
import { Post } from '../../components/Post.tsx';
import { sujetDe } from '../../lib/sujet.ts';
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

  if (!q) {
    // Toutes les publications, chacune par sa couverture (fond de l'agent, logo et nom du sujet) ; une sélection, sans
    // sujet unique, par son image. Mise à jour du 2026-11-05 : l'Explorer ne montrait que les montages des ressources.
    const page = await fil(ctx, { limite: 40 });
    return (
      <Cadre langue={ctx.langue} rubrique="explorer">
        <h1 className="titre-page">{t.commun.explorer}</h1>
        <p className="intro-page">{t.recherche.exploreIntro}</p>
        <div className="grille grille-explorer">
          {page.publications.map((p) => {
            const sujet = sujetDe(p);
            const visuel = sujet
              ? <Couverture sujet={sujet} graine={p.id} agent={{ nom: p.compte.nom, avatar: p.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={p.fond} />
              : p.media?.type === 'image' ? <img src={p.media.src} alt="" loading="lazy" /> : null;
            return visuel && (
              <a key={p.id} className="tuile-explorer" href={`/p/${p.id}`} aria-label={t.post.publicationDe(p.compte.nom)} data-compte={p.compte.id}>
                {visuel}
              </a>
            );
          })}
        </div>
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
          {reponse.resultats.map((r) => <Post key={r.publication.id} p={r.publication} t={t} langue={ctx.langue} raison={raison(r, t)} />)}
        </>
      )}
    </Cadre>
  );
}
