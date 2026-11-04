'use client';
// Texte d'un post (SPEC §6 bis, §7.13) : le début, puis « Voir plus » qui déplie la suite sur place, et « Voir moins ».
// Traduit, il est affiché dans la langue de l'interface avec la mention « traduction automatique » et « Voir l'original »,
// comme sur X ; l'original garde sa langue et son sens d'écriture (lang="en", dir="ltr").
import { useState, type ReactNode } from 'react';
import type { Bloc, Langue } from '@curation/contrat';
import { hrefSur } from '../lib/format.ts';

export const APERCU = 280;

/** Début du texte : les blocs entiers qui tiennent, puis une coupe au mot si au moins 60 caractères restent. */
export function apercu(blocs: readonly Bloc[], limite = APERCU): { blocs: Bloc[]; tronque: boolean } {
  const garde: Bloc[] = [];
  let reste = limite;
  for (const b of blocs) {
    const longueur = b.type === 'element' ? b.nom.length + b.texte.length : b.texte.length;
    if (longueur <= reste) { garde.push(b); reste -= longueur; continue; }
    if (b.type !== 'element' && (garde.length === 0 || reste >= 60)) {
      const coupe = b.texte.slice(0, reste).replace(/[\s,;:.—–-]+\S*$/u, '').trimEnd();
      if (coupe) garde.push({ ...b, texte: `${coupe}…` });
    }
    return { blocs: garde, tronque: true };
  }
  return { blocs: garde, tronque: false };
}

/** Texte montré : l'original si la personne l'a demandé ou s'il n'existe pas de traduction ; sinon la traduction. */
export function texteAffiche(contenu: Bloc[], original: Bloc[] | null, montrerOriginal: boolean): Bloc[] {
  return montrerOriginal && original ? original : contenu;
}

export interface LibellesTexte {
  voirPlus: string;
  voirMoins: string;
  voirOriginal: string;
  voirTraduction: string;
  traductionAuto: string;
  nouvelOnglet: string;
  rubriqueUsage: string;
  rubriqueLimites: string;
  aucuneLimite: string;
}

/** Intitulé d'un bloc de ressource : le contexte d'usage et la première limite. */
function intitule(cle: string, libelles: LibellesTexte): string | null {
  if (cle === 'exemple_usage') return libelles.rubriqueUsage;
  if (cle === 'limites.0' || cle === 'limites.aucune') return libelles.rubriqueLimites;
  return null;
}

interface Props {
  contenu: Bloc[];
  original: Bloc[] | null;
  langue: Langue;
  langueOriginale: Langue;
  complet: boolean;
  libelles: LibellesTexte;
  /** Pour les tests et le rendu sans script : l'original montré d'emblée. */
  initialementOriginal?: boolean;
}

export function TexteDuPost({ contenu, original, langue, langueOriginale, complet, libelles, initialementOriginal = false }: Props) {
  const [montrerOriginal, setMontrerOriginal] = useState(initialementOriginal && original !== null);
  const [ouvert, setOuvert] = useState(false);
  const blocs = texteAffiche(contenu, original, montrerOriginal);
  const langueAffichee = montrerOriginal || original === null ? langueOriginale : langue;
  const besoin = !complet && apercu(blocs).tronque;
  const vue = complet || ouvert || !besoin ? { blocs, tronque: false } : apercu(blocs);

  const bouton = vue.tronque
    ? <button type="button" className="voir-plus" aria-expanded="false" onClick={() => setOuvert(true)}>{libelles.voirPlus}</button>
    : besoin && ouvert
      ? <button type="button" className="voir-plus" aria-expanded="true" onClick={() => setOuvert(false)}>{libelles.voirMoins}</button>
      : null;

  // Les paragraphes, puis les points (liste à puces) ou les ressources d'une sélection (liste numérotée).
  const groupes: { type: Bloc['type']; blocs: Bloc[] }[] = [];
  for (const b of vue.blocs) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.type === b.type && b.type !== 'paragraphe') dernier.blocs.push(b);
    else groupes.push({ type: b.type, blocs: [b] });
  }
  const fin = (i: number, j: number): ReactNode => (i === groupes.length - 1 && j === groupes[i]!.blocs.length - 1 && bouton ? <> {bouton}</> : null);
  const enfants = groupes.map((g, i) => {
    if (g.type === 'paragraphe') {
      const b = g.blocs[0]!;
      const titre = intitule(b.cle, libelles);
      // Le texte fixe « aucune limite » vient de l'interface, dans sa langue.
      const texte = b.cle === 'limites.aucune' ? libelles.aucuneLimite : b.texte;
      return <p key={b.cle}>{titre && <strong className="rubrique">{titre}</strong> }{texte}{fin(i, 0)}</p>;
    }
    if (g.type === 'point') return <ul key={g.blocs[0]!.cle} className="points">{g.blocs.map((b, j) => <li key={b.cle}>{b.texte}{fin(i, j)}</li>)}</ul>;
    return (
      <ol key={g.blocs[0]!.cle} className="sel-liste">
        {g.blocs.map((b, j) => b.type === 'element' && (
          <li key={b.cle}>
            {hrefSur(b.url)
              ? <a className="sel-nom" href={hrefSur(b.url)!} target="_blank" rel="noopener noreferrer" title={b.hote || undefined}><bdi>{b.nom}</bdi><span className="sr-only">{libelles.nouvelOnglet}</span></a>
              : <bdi className="sel-nom">{b.nom}</bdi>}
            {' — '}{b.texte}{fin(i, j)}
          </li>
        ))}
      </ol>
    );
  });

  return (
    <>
      <div className="post-texte" lang={langueAffichee} dir={langueAffichee === 'he' ? 'rtl' : 'ltr'}>{enfants}</div>
      {original && (
        <p className="traduction-note">
          <span>{libelles.traductionAuto}</span>
          {' · '}
          <button type="button" className="lien-discret" aria-pressed={montrerOriginal} onClick={() => setMontrerOriginal((x) => !x)}>
            {montrerOriginal ? libelles.voirTraduction : libelles.voirOriginal}
          </button>
        </p>
      )}
    </>
  );
}

/** Bascule entre un texte traduit et son original, rendus par le serveur (fiche d'approfondissement). */
export function BasculeOriginal({ traduit, original, libelles }: { traduit: ReactNode; original: ReactNode; libelles: Pick<LibellesTexte, 'traductionAuto' | 'voirOriginal' | 'voirTraduction'> }) {
  const [montrerOriginal, setMontrerOriginal] = useState(false);
  return (
    <>
      <p className="traduction-note">
        <span>{libelles.traductionAuto}</span>
        {' · '}
        <button type="button" className="lien-discret" aria-pressed={montrerOriginal} onClick={() => setMontrerOriginal((x) => !x)}>
          {montrerOriginal ? libelles.voirTraduction : libelles.voirOriginal}
        </button>
      </p>
      {montrerOriginal ? original : traduit}
    </>
  );
}
