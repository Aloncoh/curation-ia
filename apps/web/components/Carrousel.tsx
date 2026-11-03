'use client';
// Carrousel d'une actualité (P4) : diapositives dessinées par le site à partir du média stocké, texte en anglais comme
// les montages (lang="en", de gauche à droite même dans une page en hébreu). Défilement au doigt (scroll-snap), boutons
// précédent et suivant, compteur ; les boutons et le compteur parlent la langue de l'interface.
import { useRef, useState } from 'react';
import { textesDe, type Langue } from '@curation/textes';

interface Props {
  compte: { id: string; identifiant: string; agent: boolean };
  titre: string;
  diapositives: { libelle: string; texte: string }[];
  /** Langue de l'interface : les libellés sont lus ici, une fonction ne pouvant pas venir du serveur. */
  langue: Langue;
}

export function Carrousel({ compte, titre, diapositives, langue }: Props) {
  const libelles = textesDe(langue).carrousel;
  const piste = useRef<HTMLDivElement>(null);
  const [rang, setRang] = useState(0);
  const total = diapositives.length;
  const aller = (n: number) => {
    const p = piste.current;
    const cible = Math.max(0, Math.min(total - 1, n));
    if (p) p.scrollTo({ left: cible * p.clientWidth, behavior: 'smooth' });
    setRang(cible);
  };
  return (
    <div className="post-media carrousel" data-compte={compte.id} dir="ltr" lang="en" role="region" aria-roledescription={libelles.nom} aria-label={`${libelles.nom} · ${titre}`}>
      <div
        ref={piste}
        className="carrousel-piste"
        tabIndex={0}
        onScroll={(e) => setRang(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
      >
        {diapositives.map((d, i) => (
          <div key={i} className="diapo carrousel-diapo" role="group" aria-roledescription="slide" aria-label={libelles.diapositive(i + 1, total)}>
            <span className="diapo-coin" aria-hidden="true">@{compte.identifiant}{compte.agent ? ' · AI' : ''}</span>
            <span className="carrousel-libelle">{d.libelle}</span>
            <span className="carrousel-texte">{d.texte}</span>
            <span className="carrousel-pied" aria-hidden="true"><span>{titre}</span><span>{i + 1}/{total}</span></span>
          </div>
        ))}
      </div>
      {total > 1 && (
        <div className="carrousel-commandes">
          <button type="button" className="carrousel-bouton" onClick={() => aller(rang - 1)} disabled={rang === 0} aria-label={libelles.precedente} title={libelles.precedente}>‹</button>
          <span className="carrousel-points" aria-live="polite">
            <span className="sr-only">{libelles.diapositive(rang + 1, total)}</span>
            {diapositives.map((_, i) => <i key={i} className={i === rang ? 'actif' : undefined} aria-hidden="true" />)}
          </span>
          <button type="button" className="carrousel-bouton" onClick={() => aller(rang + 1)} disabled={rang === total - 1} aria-label={libelles.suivante} title={libelles.suivante}>›</button>
        </div>
      )}
    </div>
  );
}
