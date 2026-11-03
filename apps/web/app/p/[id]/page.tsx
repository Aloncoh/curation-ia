// Page de publication (SPEC §6 bis) : le même post en entier, sans encadré ni rubrique technique ; sources derrière
// « Sources ». Une publication non visible (brouillon, à vérifier, ou en attente en mode public) est introuvable.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { publication } from '../../../../../src/api/v1/index.ts';
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
  return (
    <Cadre langue={ctx.langue} rubrique={null}>
      <BarreRetour titre={t.publication.titre} langue={ctx.langue} />
      {p ? <Post p={p} t={t} langue={ctx.langue} complet /> : <Vide titre={t.publication.introuvable} texte={t.publication.introuvableMessage} />}
    </Cadre>
  );
}
