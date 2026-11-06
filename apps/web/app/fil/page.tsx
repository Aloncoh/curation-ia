// Fil (SPEC §6, §7.4), refait le 2026-11-06 sur le modèle de l'accueil (demande de l'utilisateur : « le fil comme
// l'accueil ») : barre en pilules, particules, curseur ; en haut le titre et la rangée des six personnages ; puis la
// fenêtre de l'accueil en grand : à gauche « Tous » et les six agents (filtre du fil, `?agent=`), au centre les
// publications en cartes de la fenêtre, triées et paginées par curseur par l'API v1, et la barre « Écrire à » en bas.
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/recursive/full.css';
import { textesDe } from '@curation/textes';
import { compte, fil } from '../../../../src/api/v1/index.ts';
import { BarrePilules } from '../../components/BarrePilules.tsx';
import { CartePost } from '../../components/CartePost.tsx';
import { ChoixLangue, Vide } from '../../components/Cadre.tsx';
import { Logo, Perso } from '../../components/Personnages.tsx';
import { SuiteDuFil } from '../../components/SuiteDuFil.tsx';
import { Vitrine } from '../../components/Vitrine.tsx';
import { PERSONNAGES } from '../../lib/personnages.ts';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';
import '../vitrine.css';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).vitrine.fil };
}

type Style = CSSProperties & Record<`--${string}`, string | number>;

export default async function Fil({ searchParams }: { searchParams: Promise<{ agent?: string | string[] }> }) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const v = t.vitrine;
  const demande = (await searchParams).agent;
  const agent = PERSONNAGES.find((p) => p.id === (Array.isArray(demande) ? demande[0] : demande)) ?? null;
  const page = await (agent
    ? compte(ctx, agent.id).then((r) => (r ? { publications: r.publications, curseur_suivant: r.curseur_suivant } : null))
    : fil(ctx)
  ).catch((e: unknown) => {
    console.error('Fil :', e instanceof Error ? e.message : e);
    return null;
  });
  const lienAgent = (id: string | null, contenu: ReactNode, actif: boolean, couleur?: string) => (
    <a key={id ?? 'tous'} className="ligne" href={id ? `/fil?agent=${id}` : '/fil'} aria-current={actif ? 'page' : undefined} style={couleur ? ({ '--c': couleur } as Style) : undefined}>{contenu}</a>
  );

  return (
    <div className="vitrine fil-vivant">
      <div className="aura" aria-hidden="true" />
      <canvas className="particules" aria-hidden="true" />
      <i className="curseur" aria-hidden="true" />
      <BarrePilules langue={ctx.langue} courant="fil" />

      <main className="accueil" id="contenu" tabIndex={-1}>
        <div className="une fil-une">
          <p className="titre" aria-hidden="true"><span dir="ltr">Curation</span> <Logo t={t} /> <span dir="ltr">AI</span></p>
          <div className="bande" role="group" aria-label={v.agents}>
            {PERSONNAGES.map((p, i) => <Perso key={p.id} p={p} i={i} bouton />)}
          </div>
        </div>

        <section className="fenetre fil-fenetre" aria-labelledby="fil-titre">
          <aside className="cote">
            <div className="chrome" aria-hidden="true"><i /><i /><i /></div>
            <a className="champ" href="/recherche"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>{v.rechercher}</a>
            <nav className="liste" aria-label={v.lesSix}>
              {lienAgent(null, <><span className="tous" aria-hidden="true">★</span><b>{v.fil}</b><small>{v.lesSix}</small></>, !agent)}
              {PERSONNAGES.map((p) => lienAgent(p.id, <><img src={`/marque/agent-${p.id}.png`} alt="" width={46} height={46} /><b>{p.nom}</b><small>{v.roles[p.id]}</small></>, agent?.id === p.id, p.couleur))}
            </nav>
            <div className="fil-langue">
              <span>{t.commun.langue}</span>
              <ChoixLangue langue={ctx.langue} />
            </div>
            <p className="info" aria-live="polite" />
          </aside>

          <div className="principal-f">
            <header className="tete">
              {agent ? <img src={`/marque/agent-${agent.id}.png`} alt="" width={26} height={26} style={{ '--c': agent.couleur } as Style} /> : null}
              <h1 id="fil-titre">{agent ? agent.nom : v.fil}</h1>
            </header>
            <div className="fil-f">
              {page === null ? (
                <Vide titre={t.fil.erreur} />
              ) : page.publications.length === 0 ? (
                <Vide titre={t.fil.vide} texte={t.fil.videMessage} />
              ) : (
                <>
                  {page.publications.map((p) => <CartePost key={p.id} p={p} t={t} langue={ctx.langue} />)}
                  <SuiteDuFil curseur={page.curseur_suivant} langue={ctx.langue} compte={agent?.id ?? null} carte />
                </>
              )}
            </div>
            <div className="saisie" aria-hidden="true"><i>+</i><span>{agent ? v.ecrireA(agent.nom) : v.ecrire}</span></div>
          </div>
        </section>
      </main>
      <Vitrine bientot={v.bientot} />
    </div>
  );
}
