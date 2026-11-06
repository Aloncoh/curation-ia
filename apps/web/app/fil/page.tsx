// Accueil du réseau social (SPEC §6, §7.4) : les publications, triées et paginées par curseur par l'API v1, en cartes
// (CartePost) dans le cadre plein écran du réseau (Cadre.tsx). Le 2026-11-06, l'utilisateur a fait supprimer la page
// « fil » à part (titre, rangée d'agents, fenêtre posée sur le papier lilas) : « Voir le fil » mène ici, au vrai réseau.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { fil } from '../../../../src/api/v1/index.ts';
import { CartePost } from '../../components/CartePost.tsx';
import { Couverture } from '../../components/Couverture.tsx';
import { sujetDe, type Sujet } from '../../lib/sujet.ts';
import type { Publication } from '../../../../packages/contrat/src/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { SuiteDuFil } from '../../components/SuiteDuFil.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).vitrine.reseau };
}

export default async function Fil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const page = await fil(ctx).catch((e: unknown) => {
    console.error('Fil :', e instanceof Error ? e.message : e);
    return null;
  });
  // Les sujets (anciennement la page Explorer, fusionnée ici le 2026-11-06) : un rendu par sujet, avec le nombre de posts.
  const recents = await fil(ctx, { limite: 50 }).catch(() => null);
  const sujets = new Map<string, { sujet: Sujet; p: Publication; n: number }>();
  for (const p of recents?.publications ?? []) {
    const sujet = sujetDe(p);
    if (!sujet) continue;
    const deja = sujets.get(sujet.nom);
    if (deja) deja.n++;
    else sujets.set(sujet.nom, { sujet, p, n: 1 });
  }
  return (
    <Cadre langue={ctx.langue} rubrique="accueil">
      <h1 className="titre-page">{t.vitrine.reseau}</h1>
      {sujets.size > 0 && (
        <nav className="grille-sujets bande-sujets" aria-label={t.commun.explorer}>
          {[...sujets.values()].map(({ sujet, p, n }) => (
            <a key={sujet.nom} className="tuile-sujet" href={`/recherche?${new URLSearchParams({ q: sujet.nom })}`} data-compte={p.compte.id}>
              <Couverture sujet={sujet} graine={p.id} agent={{ nom: p.compte.nom, avatar: p.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={p.fond} />
              <span><b>{sujet.nom}</b><small>{t.vitrine.nPosts(n)}</small></span>
            </a>
          ))}
        </nav>
      )}
      {page === null ? (
        <Vide titre={t.fil.erreur} />
      ) : page.publications.length === 0 ? (
        <Vide titre={t.fil.vide} texte={t.fil.videMessage} />
      ) : (
        <>
          {page.publications.map((p) => <CartePost key={p.id} p={p} t={t} langue={ctx.langue} />)}
          <SuiteDuFil curseur={page.curseur_suivant} langue={ctx.langue} carte />
        </>
      )}
    </Cadre>
  );
}
