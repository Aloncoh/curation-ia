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

export type Rubrique = 'accueil' | 'explorer' | 'notifications' | 'messages' | 'reels' | 'comptes' | 'profil' | null;

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
            {lien('/notifications', 'notifications', t.commun.notifications, 'notifications')}
            {lien('/messages', 'messages', t.commun.messages, 'messages')}
            {lien('/reels', 'reels', t.commun.reels, 'reels')}
            {lien('/comptes', 'comptes', t.commun.comptes, 'comptes')}
            {lien('/profil', 'profil', t.commun.profil, 'profil')}
          </nav>
          <div className="cote-agents" aria-label={t.commun.comptesASuivre} role="group">
            {PERSONNAGES.map((p) => (
              <a key={p.id} href={`/comptes/${p.id}`} title={p.nom} style={{ '--c': p.couleur } as Style}>
                <img src={`/marque/agent-${p.id}.png`} alt={p.nom} width={34} height={34} />
              </a>
            ))}
          </div>
          <div className="fil-langue">
            <span>{t.commun.langue}</span>
            <ChoixLangue langue={langue} />
          </div>
        </aside>
        <div className="cadre-main">
          <header className="cadre-entete">
            <form className="champ" action="/recherche" role="search">
              <Icone nom="explorer" taille={16} />
              <input type="search" name="q" defaultValue={requete} maxLength={200} placeholder={t.recherche.indice} aria-label={t.commun.rechercherPublications} />
            </form>
            <button className="cadre-compte" type="button" data-compte>{t.vitrine.creerCompte}</button>
            <p className="info" aria-live="polite" />
          </header>
          <main className="contenu-page" id="contenu" tabIndex={-1}>{children}</main>
        </div>
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
