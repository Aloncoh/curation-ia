// Fil (déplacé de / vers /fil le 2026-11-06 : l'accueil prend la racine) (SPEC §6, §7.4) : les publications, triées et paginées par curseur par l'API v1, en posts façon X.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { fil } from '../../../../src/api/v1/index.ts';
import { Cadre, Vide } from '../../components/Cadre.tsx';
import { Post } from '../../components/Post.tsx';
import { SuiteDuFil } from '../../components/SuiteDuFil.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).fil.titre };
}

export default async function Accueil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const page = await fil(ctx).catch((e: unknown) => {
    console.error('Fil :', e instanceof Error ? e.message : e);
    return null;
  });
  return (
    <Cadre langue={ctx.langue} rubrique="accueil">
      <h1 className="sr-only">{t.fil.titre}</h1>
      {page === null ? (
        <Vide titre={t.fil.erreur} />
      ) : page.publications.length === 0 ? (
        <Vide titre={t.fil.vide} texte={t.fil.videMessage} />
      ) : (
        <>
          {page.publications.map((p) => <Post key={p.id} p={p} t={t} langue={ctx.langue} />)}
          <SuiteDuFil curseur={page.curseur_suivant} langue={ctx.langue} />
        </>
      )}
    </Cadre>
  );
}
