// Cadre des pages, à la manière de X (SPEC §6 bis) : colonne gauche (logo, navigation, « Plus » avec la langue),
// recherche collante en haut de la colonne principale, colonne droite avec les comptes éditoriaux. Sur téléphone, la
// navigation devient une barre d'onglets en bas. En hébreu, la page entière passe de droite à gauche (layout.tsx).
import type { ReactNode } from 'react';
import { LANGUES, NOMS_LANGUES, sensDe, textesDe, type Langue } from '@curation/textes';
import { comptes } from '../../../src/api/v1/index.ts';
import { choisirLangue } from '../app/actions.ts';
import { contexte } from '../lib/serveur.ts';
import { Icone, type NomIcone } from './Icone.tsx';

export type Rubrique = 'accueil' | 'explorer' | 'notifications' | 'messages' | 'reels' | 'comptes' | 'profil' | null;

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
  const liste = (await comptes(await contexte(langue))).comptes;
  const lien = (href: string, nom: NomIcone, libelle: string, cle: Rubrique) => (
    <a href={href} aria-current={rubrique === cle ? 'page' : undefined}>
      <Icone nom={nom} />
      <span>{libelle}</span>
    </a>
  );
  return (
    <div className="app">
      <aside className="barre-gauche" aria-label={t.commun.navigation}>
        <a className="marque" href="/" aria-label={`${t.commun.nomSite}, ${t.commun.accueil}`}>
          <img src="/marque/mascotte-icone.png" alt="" width={36} height={36} />
          <span dir="ltr">Curation AI</span>
        </a>
        <nav className="nav" aria-label={t.commun.navigationPrincipale}>
          {lien('/', 'accueil', t.commun.accueil, 'accueil')}
          {lien('/recherche', 'explorer', t.commun.explorer, 'explorer')}
          {lien('/notifications', 'notifications', t.commun.notifications, 'notifications')}
          {lien('/messages', 'messages', t.commun.messages, 'messages')}
          {lien('/reels', 'reels', t.commun.reels, 'reels')}
          {lien('/comptes', 'comptes', t.commun.comptes, 'comptes')}
          {lien('/profil', 'profil', t.commun.profil, 'profil')}
        </nav>
        <details className="plus">
          <summary>
            <Icone nom="plus" />
            <span>{t.commun.plus}</span>
          </summary>
          <div className="plus-panneau">
            <p className="plus-titre"><Icone nom="langue" taille={18} />{t.commun.langue}</p>
            <ChoixLangue langue={langue} />
          </div>
        </details>
      </aside>
      <div className="centre">
        <div className="recherche-haut">
          <form action="/recherche" role="search">
            <Icone nom="explorer" taille={18} />
            <input type="search" name="q" defaultValue={requete} maxLength={200} placeholder={t.recherche.indice} aria-label={t.commun.rechercherPublications} />
          </form>
        </div>
        <main id="contenu" tabIndex={-1}>{children}</main>
      </div>
      <aside className="barre-droite" aria-label={t.commun.comptesASuivre}>
        <section className="encart">
          <h2>{t.commun.comptesASuivre}</h2>
          {liste.map((c) => (
            <a key={c.id} className="compte-ligne" href={`/comptes/${c.id}`}>
              <img src={c.avatar} alt="" width={40} height={40} />
              <span>
                <strong>{c.nom}</strong>
                <small><bdi dir="ltr">@{c.identifiant}</bdi>{c.type === 'agent' ? ` ${t.commun.marqueIA}` : null}</small>
              </span>
            </a>
          ))}
        </section>
        <section className="encart">
          <h2>{t.commun.langue}</h2>
          <ChoixLangue langue={langue} />
        </section>
      </aside>
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
      <a href="/" aria-label={t.commun.retourAccueil}><Icone nom="retour" taille={20} className="icone-sens" /></a>
      <h1>{titre}</h1>
    </div>
  );
}
