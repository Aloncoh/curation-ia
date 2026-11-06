// Recherche et Explorer (SPEC §7.15, §6 bis) : sans requête, la recherche et des publications en grille ; avec une
// requête, les publications trouvées, chacune avec la raison qui la fait remonter. Aucun résultat n'est inventé.
import type { Metadata } from 'next';
import { textesDe, type Textes } from '@curation/textes';
import type { ResultatRecherche } from '@curation/contrat';
import { fil, recherche, RequeteInvalide } from '../../../../src/api/v1/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { Couverture } from '../../components/Couverture.tsx';
import { CartePost } from '../../components/CartePost.tsx';
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
    // Un rendu par sujet (2026-11-06, demande de l'utilisateur : « trop de doublons ») : la couverture du sujet, son nom
    // et le nombre de posts, qui mène à la recherche de ce sujet ; une sélection sans sujet unique garde son image.
    const page = await fil(ctx, { limite: 50 });
    const sujets = new Map<string, { sujet: NonNullable<ReturnType<typeof sujetDe>>; p: (typeof page.publications)[number]; n: number }>();
    const autres: (typeof page.publications)[number][] = [];
    for (const p of page.publications) {
      const sujet = sujetDe(p);
      if (!sujet) { if (p.media?.type === 'image') autres.push(p); continue; }
      const deja = sujets.get(sujet.nom);
      if (deja) deja.n++;
      else sujets.set(sujet.nom, { sujet, p, n: 1 });
    }
    return (
      <Cadre langue={ctx.langue} rubrique="explorer">
        <h1 className="titre-page">{t.commun.explorer}</h1>
        <p className="intro-page">{t.recherche.exploreIntro}</p>
        <div className="grille-sujets">
          {[...sujets.values()].map(({ sujet, p, n }) => (
            <a key={sujet.nom} className="tuile-sujet" href={`/recherche?${new URLSearchParams({ q: sujet.nom })}`} data-compte={p.compte.id}>
              <Couverture sujet={sujet} graine={p.id} agent={{ nom: p.compte.nom, avatar: p.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={p.fond} />
              <span><b>{sujet.nom}</b><small>{t.vitrine.nPosts(n)}</small></span>
            </a>
          ))}
          {autres.map((p) => p.media?.type === 'image' && (
            <a key={p.id} className="tuile-sujet" href={`/p/${p.id}`} data-compte={p.compte.id}>
              <img src={p.media.src} alt={p.media.alt} loading="lazy" />
              <span><b>{p.compte.nom}</b><small>{t.vitrine.nPosts(1)}</small></span>
            </a>
          ))}
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
          {reponse.resultats.map((r) => <CartePost key={r.publication.id} p={r.publication} t={t} langue={ctx.langue} raison={raison(r, t)} />)}
        </>
      )}
    </Cadre>
  );
}
