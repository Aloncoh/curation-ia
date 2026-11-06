// Fil (SPEC §6, §7.4), refait le 2026-11-06 dans le style de l'accueil (demande de l'utilisateur : « aussi fluide ») :
// papier lilas, particules, barre en pilules, curseur flèche ; à gauche les six agents dans un panneau sombre façon
// fenêtre ; au centre les publications en cartes sombres, triées et paginées par curseur par l'API v1, qui montent en
// douceur à l'entrée dans l'écran. Les posts gardent tout leur contenu (texte, couverture, sources, avis de validité).
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import '@fontsource-variable/recursive/full.css';
import { textesDe } from '@curation/textes';
import { fil } from '../../../../src/api/v1/index.ts';
import { BarrePilules } from '../../components/BarrePilules.tsx';
import { ChoixLangue, Vide } from '../../components/Cadre.tsx';
import { Post } from '../../components/Post.tsx';
import { SuiteDuFil } from '../../components/SuiteDuFil.tsx';
import { Vitrine } from '../../components/Vitrine.tsx';
import { PERSONNAGES } from '../../lib/personnages.ts';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';
import '../vitrine.css';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).fil.titre };
}

type Style = CSSProperties & Record<`--${string}`, string | number>;

export default async function Fil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const v = t.vitrine;
  const page = await fil(ctx).catch((e: unknown) => {
    console.error('Fil :', e instanceof Error ? e.message : e);
    return null;
  });
  return (
    <div className="vitrine fil-vivant">
      <div className="aura" aria-hidden="true" />
      <canvas className="particules" aria-hidden="true" />
      <i className="curseur" aria-hidden="true" />
      <BarrePilules langue={ctx.langue} courant="fil" />

      <div className="fil-cadre">
        <aside className="fil-agents" aria-label={v.lesSix}>
          <div className="chrome" aria-hidden="true"><i /><i /><i /></div>
          <ul>
            {PERSONNAGES.map((p) => (
              <li key={p.id}>
                <a href={`/comptes/${p.id}`} style={{ '--c': p.couleur } as Style}>
                  <img src={`/marque/agent-${p.id}.png`} alt="" width={40} height={40} />
                  <b>{p.nom}</b>
                  <small>{v.roles[p.id]}</small>
                </a>
              </li>
            ))}
          </ul>
          <div className="fil-langue">
            <span>{t.commun.langue}</span>
            <ChoixLangue langue={ctx.langue} />
          </div>
          <p className="info" aria-live="polite" />
        </aside>

        <main className="fil-colonne" id="contenu" tabIndex={-1}>
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
        </main>
      </div>
      <Vitrine bientot={v.bientot} />
    </div>
  );
}
