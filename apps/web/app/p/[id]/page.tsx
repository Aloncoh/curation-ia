// Page de publication (SPEC §6 bis) : le même post en entier, sans encadré ni rubrique technique ; sources derrière
// « Sources ». Une publication non visible (brouillon, à vérifier, ou en attente en mode public) est introuvable.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { facesAFace, publication } from '../../../lib/lectures.ts';
import { BarreRetour, Cadre, Vide } from '../../../components/Cadre.tsx';
import { Post } from '../../../components/Post.tsx';
import { contexte } from '../../../lib/serveur.ts';

type Parametres = { params: Promise<{ id: string }> };

const identifiant = (brut: string) => (/^\d{1,9}$/.test(brut) ? Number(brut) : 0);

export async function generateMetadata({ params }: Parametres): Promise<Metadata> {
  const ctx = await contexte();
  const p = await publication(ctx, identifiant((await params).id));
  const t = textesDe(ctx.langue);
  return { title: p ? `${p.compte.nom} · ${p.contenu[0]?.texte.slice(0, 80) ?? t.publication.titre}` : t.publication.introuvable };
}

export default async function PagePublication({ params }: Parametres) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const p = await publication(ctx, identifiant((await params).id));
  // Face à face (2026-11-24) : celui où ce post est le modèle le plus récent, sinon celui où il sert de point de comparaison.
  const faces = p ? (await facesAFace(ctx).catch(() => null))?.paires ?? [] : [];
  const face = p ? faces.find((x) => x.cotes[0].id === p.id) ?? faces.find((x) => x.cotes[1].id === p.id) : undefined;
  const autre = face?.cotes.find((c) => c.id !== p?.id);
  return (
    <Cadre langue={ctx.langue} rubrique={null}>
      <BarreRetour titre={t.publication.titre} langue={ctx.langue} />
      {p ? (
        <>
          <Post p={p} t={t} langue={ctx.langue} complet />
          <p className="lien-fiche"><a href={`/p/${p.id}/fiche`}>{t.fiche.lien}</a></p>
          {face && autre && <p className="lien-fiche"><a href={`/face-a-face/${face.paire}`}>{t.faceAFace.lien(autre.produit)}</a></p>}
        </>
      ) : <Vide titre={t.publication.introuvable} texte={t.publication.introuvableMessage} />}
    </Cadre>
  );
}
