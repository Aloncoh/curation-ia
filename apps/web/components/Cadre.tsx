// Le réseau social (refait le 2026-11-06, demandes de l'utilisateur : « home, explorer, notifications… tout la même
// page », « ça doit être un écran », sans fond blanc autour) : une application plein écran, sombre comme la fenêtre de
// l'accueil, avec ses particules et son curseur. À gauche le logo, la recherche, les rubriques, les six agents et la
// langue ; en haut la recherche et « Créer un compte » ; au centre le contenu de la page (couleurs sombres,
// app/vitrine.css). En hébreu, tout passe de droite à gauche.
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/recursive/full.css';
import { LANGUES, NOMS_LANGUES, sensDe, textesDe, type Langue } from '@curation/textes';
import { choisirLangue } from '../app/actions.ts';
import { PERSONNAGES } from '../lib/personnages.ts';
import { Icone, type NomIcone } from './Icone.tsx';
import { Logo } from './Personnages.tsx';
import { Vitrine } from './Vitrine.tsx';
import '../app/vitrine.css';

export type Rubrique = 'accueil' | 'explorer' | 'recherche' | 'notifications' | 'messages' | 'reels' | 'comptes' | 'profil' | 'reglages' | null;

type Style = CSSProperties & Record<`--${string}`, string>;

export function ChoixLangue({ langue }: { langue: Langue }) {
  const t = textesDe(langue);
  return (
    <form action={choisirLangue} className="choix-langue" aria-label={t.langues.choisir}>
      {LANGUES.map((l) => (
        <button key={l} type="submit" name="langue" value={l} aria-pressed={l === langue} lang={l} dir={sensDe(l)}>{NOMS_LANGUES[l]}</button>
      ))}
    </form>
  );
}

export async function Cadre({ langue, rubrique, requete = '', children }: { langue: Langue; rubrique: Rubrique; requete?: string; children: ReactNode }) {
  const t = textesDe(langue);
  const lien = (href: string, nom: NomIcone, libelle: string, cle: Rubrique) => (
    <a key={href} className="ligne" href={href} aria-current={rubrique === cle ? 'page' : undefined}>
      <span className="icone-rond"><Icone nom={nom} taille={20} /></span>
      <b>{libelle}</b>
    </a>
  );
  return (
    <div className="vitrine cadre-vivant">
      <canvas className="particules" aria-hidden="true" />
      <i className="curseur" aria-hidden="true" />
      <div className="cadre-app">
        <aside className="cote" aria-label={t.commun.navigation}>
          <a className="marque-app" href="/" aria-label={`${t.commun.nomSite}, ${t.vitrine.titre}`}>
            <Logo t={t} /><span dir="ltr">Curation AI</span>
          </a>
          <nav className="liste" aria-label={t.commun.navigationPrincipale}>
            {lien('/fil', 'accueil', t.vitrine.reseau, 'accueil')}
            {lien('/recherche', 'explorer', t.commun.rechercher, 'recherche')}
            {lien('/notifications', 'notifications', t.commun.notifications, 'notifications')}
            {lien('/messages', 'messages', t.commun.messages, 'messages')}
            {lien('/reels', 'reels', t.commun.reels, 'reels')}
            {lien('/profil', 'profil', t.commun.profil, 'profil')}
          </nav>
          <nav className="liste bas" aria-label={t.reglages.titre}>
            {lien('/reglages', 'reglages', t.reglages.titre, 'reglages')}
          </nav>
        </aside>
        <div className="cadre-main">
          <main className="contenu-page" id="contenu" tabIndex={-1}>{children}</main>
        </div>
        <aside className="colonne-droite" aria-label={t.commun.comptesASuivre}>
          <section className="encart-rejoindre">
            <h2>{t.vitrine.rejoindre}</h2>
            <p>{t.vitrine.rejoindreTexte}</p>
            <button className="cadre-compte" type="button" data-compte>{t.vitrine.creerCompte}</button>
            <p className="info" aria-live="polite" />
          </section>
          <section className="encart-agents">
            <h2>{t.vitrine.lesSix}</h2>
            <ul>
              {PERSONNAGES.map((p) => (
                <li key={p.id} style={{ '--c': p.couleur } as Style}>
                  <a href={`/comptes/${p.id}`}>
                    <img src={`/marque/agent-${p.id}.png`} alt="" width={40} height={40} />
                    <span><b>{p.nom}</b><small><bdi dir="ltr">@{p.id}</bdi> {t.commun.marqueIA}</small><small className="role">{t.vitrine.roles[p.id]}</small></span>
                  </a>
                  <button type="button" className="suivre-x" data-compte>{t.vitrine.suivre}</button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      <Vitrine bientot={t.vitrine.bientot} />
    </div>
  );
}

export function Vide({ titre, texte }: { titre: string; texte?: string | null }) {
  return (
    <div className="vide-page">
      <img src="/marque/mascotte-sourire.png" alt="" width={72} height={72} />
      <strong>{titre}</strong>
      {texte ? <p>{texte}</p> : null}
    </div>
  );
}

export function BarreRetour({ titre, langue }: { titre: string; langue: Langue }) {
  const t = textesDe(langue);
  return (
    <div className="barre-retour">
      <a href="/fil" aria-label={t.commun.retourAccueil}><Icone nom="retour" taille={20} className="icone-sens" /></a>
      <h1>{titre}</h1>
    </div>
  );
}
