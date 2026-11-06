'use client';
// Suite du fil (SPEC §7.4) : la page suivante est demandée à l'API v1 par son curseur et ajoutée sous les posts déjà là.
import { useState } from 'react';
import type { Langue, PageFil, Publication } from '@curation/contrat';
import { textesDe } from '@curation/textes';
import { CartePost } from './CartePost.tsx';
import { Post } from './Post.tsx';

/** `carte` : les posts ajoutés prennent la carte de la fenêtre (fil, 2026-11-06) au lieu du post façon X. */
export function SuiteDuFil({ curseur, langue, compte = null, carte = false }: { curseur: string | null; langue: Langue; compte?: string | null; carte?: boolean }) {
  const t = textesDe(langue);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [suivant, setSuivant] = useState(curseur);
  const [etat, setEtat] = useState<'pret' | 'charge' | 'erreur'>('pret');

  async function charger() {
    if (!suivant) return;
    setEtat('charge');
    try {
      const parametres = new URLSearchParams({ curseur: suivant, langue });
      const reponse = await fetch(`${compte ? `/api/v1/comptes/${encodeURIComponent(compte)}` : '/api/v1/fil'}?${parametres}`);
      if (!reponse.ok) throw new Error(String(reponse.status));
      const page = (await reponse.json()) as PageFil;
      setPublications((x) => [...x, ...page.publications]);
      setSuivant(page.curseur_suivant);
      setEtat('pret');
    } catch {
      setEtat('erreur');
    }
  }

  return (
    <>
      {publications.map((p) => (carte ? <CartePost key={p.id} p={p} t={t} langue={langue} /> : <Post key={p.id} p={p} t={t} langue={langue} />))}
      {suivant ? (
        <div className="plus-bas">
          <button type="button" className="bouton-contour" onClick={charger} disabled={etat === 'charge'} aria-busy={etat === 'charge'}>{t.fil.suivant}</button>
        </div>
      ) : (
        <p className="fin-fil">{t.fil.fin}</p>
      )}
      {etat === 'erreur' && <p className="erreur-fil" role="alert">{t.fil.erreur}</p>}
    </>
  );
}
