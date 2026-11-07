'use client';
// Préférences d'affichage de la page Réglages (2026-11-07) : animations réduites, grande taille de texte, police facile à
// lire. Gardées dans ce navigateur seulement (localStorage), appliquées par des classes sur <html> ; app/layout.tsx les
// pose avant l'affichage pour éviter un saut. Rien n'est envoyé au serveur.
import { useEffect, useState } from 'react';

type Cle = 'curation-animations' | 'curation-taille' | 'curation-police';
const CLASSE: Record<Cle, [string, string]> = {
  'curation-animations': ['reduites', 'mouvement-reduit'],
  'curation-taille': ['grande', 'texte-grand'],
  'curation-police': ['lisible', 'police-lisible'],
};

function lire(cle: Cle): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}

function ecrire(cle: Cle, valeur: string | null) {
  try { if (valeur) localStorage.setItem(cle, valeur); else localStorage.removeItem(cle); } catch { /* stockage indisponible */ }
  document.documentElement.classList.toggle(CLASSE[cle][1], valeur === CLASSE[cle][0]);
}

export interface LibellesPreferences {
  animations: string;
  normales: string;
  reduites: string;
  texte: string;
  normale: string;
  grande: string;
  policeLisible: string;
  note: string;
}

export function Preferences({ l }: { l: LibellesPreferences }) {
  const [etat, setEtat] = useState<Record<Cle, string | null>>({ 'curation-animations': null, 'curation-taille': null, 'curation-police': null });
  useEffect(() => {
    setEtat({ 'curation-animations': lire('curation-animations'), 'curation-taille': lire('curation-taille'), 'curation-police': lire('curation-police') });
  }, []);
  const choisir = (cle: Cle, valeur: string | null) => { ecrire(cle, valeur); setEtat((e) => ({ ...e, [cle]: valeur })); };
  const deux = (cle: Cle, titre: string, a: string, b: string) => (
    <div className="reglage">
      <span className="reglage-nom">{titre}</span>
      <div className="choix-deux" role="group" aria-label={titre}>
        <button type="button" aria-pressed={etat[cle] !== CLASSE[cle][0]} onClick={() => choisir(cle, null)}>{a}</button>
        <button type="button" aria-pressed={etat[cle] === CLASSE[cle][0]} onClick={() => choisir(cle, CLASSE[cle][0])}>{b}</button>
      </div>
    </div>
  );
  return (
    <>
      {deux('curation-animations', l.animations, l.normales, l.reduites)}
      {deux('curation-taille', l.texte, l.normale, l.grande)}
      <label className="reglage reglage-case">
        <span className="reglage-nom">{l.policeLisible}</span>
        <input type="checkbox" checked={etat['curation-police'] === 'lisible'} onChange={(e) => choisir('curation-police', e.target.checked ? 'lisible' : null)} />
      </label>
      <p className="reglage-note">{l.note}</p>
    </>
  );
}
