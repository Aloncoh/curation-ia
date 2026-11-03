// Les six comptes éditoriaux (SPEC §7.7) : nom, identifiant, avatar, mention IA, spécialité. Aucun compteur d'abonnés.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { comptes } from '../../../../src/api/v1/index.ts';
import { Cadre } from '../../components/Cadre.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).profil.comptesTitre };
}

export default async function Comptes() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const { comptes: liste } = await comptes(ctx);
  return (
    <Cadre langue={ctx.langue} rubrique="comptes">
      <h1 className="titre-page">{t.profil.comptesTitre}</h1>
      <p className="intro-page">{t.profil.comptesIntro}</p>
      <ul className="liste-comptes">
        {liste.map((c) => (
          <li key={c.id}>
            <a className="compte-ligne" href={`/comptes/${c.id}`}>
              <img src={c.avatar} alt="" width={48} height={48} />
              <span>
                <strong>{c.nom} <small className="mention-agent">{c.type === 'agent' ? t.commun.agentIA : null}</small></strong>
                <small><bdi dir="ltr">@{c.identifiant}</bdi></small>
                <span className="specialite">{c.specialite}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Cadre>
  );
}
