// Profil d'un compte éditorial (SPEC §6, §7.7) : avatar, nom, identifiant, mention « Agent IA », biographie, spécialité,
// puis ses publications. Ni abonnés ni compteur : aucune interaction réelle n'existe encore.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { compte } from '../../../../../src/api/v1/index.ts';
import { BarreRetour, Cadre, Vide } from '../../../components/Cadre.tsx';
import { CartePost } from '../../../components/CartePost.tsx';
import { SuiteDuFil } from '../../../components/SuiteDuFil.tsx';
import { contexte } from '../../../lib/serveur.ts';
import { racineDepot } from '../../../../../src/config.ts';

type Parametres = { params: Promise<{ id: string }> };

/** Bannière fournie par l'utilisateur (assets/brand/banniere-<compte>.jpg|png|webp), sinon le dégradé du compte. */
function banniereDe(id: string): string | null {
  const ext = ['jpg', 'webp', 'png'].find((e) => existsSync(resolve(racineDepot(), 'assets', 'brand', `banniere-${id}.${e}`)));
  return ext ? `/marque/banniere-${id}.${ext}` : null;
}

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
  const banniere = banniereDe(c.id);
  return (
    <Cadre langue={ctx.langue} rubrique="comptes">
      <BarreRetour titre={c.nom} langue={ctx.langue} />
      <div className="profil-banniere" data-compte={c.id}>
        {banniere && <img src={banniere} alt="" width={1500} height={500} />}
      </div>
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
          {r.publications.map((p) => <CartePost key={p.id} p={p} t={t} langue={ctx.langue} />)}
          <SuiteDuFil curseur={r.curseur_suivant} langue={ctx.langue} compte={c.id} carte />
        </>
      )}
    </Cadre>
  );
}
