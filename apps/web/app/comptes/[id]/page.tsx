// Profil d'un compte éditorial (SPEC §6, §7.7) : avatar, nom, identifiant, mention « Agent IA », biographie, spécialité,
// puis ses publications. Ni abonnés ni compteur : aucune interaction réelle n'existe encore.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { compte } from '../../../../../src/api/v1/index.ts';
import { BarreRetour, Cadre, Vide } from '../../../components/Cadre.tsx';
import { Post } from '../../../components/Post.tsx';
import { SuiteDuFil } from '../../../components/SuiteDuFil.tsx';
import { contexte } from '../../../lib/serveur.ts';

type Parametres = { params: Promise<{ id: string }> };

const valide = (id: string) => (/^[a-z0-9_-]{1,40}$/.test(id) ? id : '');

export async function generateMetadata({ params }: Parametres): Promise<Metadata> {
  const ctx = await contexte();
  const r = await compte(ctx, valide((await params).id), { limite: 1 });
  return { title: r ? r.compte.nom : textesDe(ctx.langue).profil.introuvable };
}

export default async function Profil({ params }: Parametres) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const r = await compte(ctx, valide((await params).id));
  if (!r) {
    return (
      <Cadre langue={ctx.langue} rubrique="comptes">
        <BarreRetour titre={t.profil.introuvable} langue={ctx.langue} />
        <Vide titre={t.profil.introuvable} />
      </Cadre>
    );
  }
  const c = r.compte;
  return (
    <Cadre langue={ctx.langue} rubrique="comptes">
      <BarreRetour titre={c.nom} langue={ctx.langue} />
      <div className="profil-banniere" data-compte={c.id} />
      <div className="profil-haut">
        <img className="profil-photo" src={c.avatar} alt="" width={104} height={104} />
      </div>
      <div className="profil-infos">
        <h2 className="profil-nom">{c.nom}</h2>
        <p className="profil-id"><bdi dir="ltr">@{c.identifiant}</bdi>{c.type === 'agent' ? <span className="mention-agent"> · {t.commun.agentIA}</span> : null}</p>
        <p className="bio">{c.bio}</p>
        <p className="specialite">{c.specialite}</p>
      </div>
      <h3 className="onglet-seul">{t.profil.publications}</h3>
      {r.publications.length === 0 ? (
        <Vide titre={t.profil.aucunePublication} />
      ) : (
        <>
          {r.publications.map((p) => <Post key={p.id} p={p} t={t} langue={ctx.langue} />)}
          <SuiteDuFil curseur={r.curseur_suivant} langue={ctx.langue} compte={c.id} />
        </>
      )}
    </Cadre>
  );
}
