// Accueil du réseau social (SPEC §6, §7.4) : les publications, triées et paginées par curseur par l'API v1, en cartes
// (CartePost) dans le cadre plein écran du réseau (Cadre.tsx). Le 2026-11-06, l'utilisateur a fait supprimer la page
// « fil » à part (titre, rangée d'agents, fenêtre posée sur le papier lilas) : « Voir le fil » mène ici, au vrai réseau.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { fil } from '../../../../src/api/v1/index.ts';
import { CartePost } from '../../components/CartePost.tsx';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { SuiteDuFil } from '../../components/SuiteDuFil.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).commun.accueil };
}

export default async function Fil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const page = await fil(ctx).catch((e: unknown) => {
    console.error('Fil :', e instanceof Error ? e.message : e);
    return null;
  });
  return (
    <Cadre langue={ctx.langue} rubrique="accueil">
      <h1 className="titre-page">{t.commun.accueil}</h1>
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
