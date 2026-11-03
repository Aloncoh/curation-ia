'use client';
// Actions d'un post (SPEC §6 bis) : « Afficher les commentaires » (aucun commentaire n'existe : état vide honnête) et
// partager, sans compteur ; puis la mention IA et le lien « Sources » qui déplie le panneau des sources.
import { useEffect, useState, type ReactNode } from 'react';
import { Icone } from './Icone.tsx';

export interface LibellesActions {
  actions: string;
  afficherCommentaires: string;
  masquerCommentaires: string;
  aucunCommentaire: string;
  commentairesFermes: string;
  partager: string;
  lienCopie: string;
  lienACopier: string;
  mentionIA: string;
  sources: string;
  masquerSources: string;
}

export function ActionsDuPost({ id, lien, libelles, sources }: { id: string; lien: string; libelles: LibellesActions; sources: ReactNode }) {
  const [commentaires, setCommentaires] = useState(false);
  const [panneau, setPanneau] = useState(false);
  const [partage, setPartage] = useState<'rien' | 'copie' | 'manuel'>('rien');
  const [adresse, setAdresse] = useState(lien);
  useEffect(() => {
    if (partage !== 'copie') return;
    const minuteur = setTimeout(() => setPartage('rien'), 2500);
    return () => clearTimeout(minuteur);
  }, [partage]);

  async function partager() {
    const complete = new URL(lien, window.location.href).href;
    setAdresse(complete);
    try {
      await navigator.clipboard.writeText(complete);
      setPartage('copie');
    } catch {
      setPartage('manuel');
    }
  }

  const libelleCommentaires = commentaires ? libelles.masquerCommentaires : libelles.afficherCommentaires;
  return (
    <>
      <div className="post-actions" role="group" aria-label={libelles.actions}>
        <button type="button" className="act-commenter" aria-expanded={commentaires} aria-controls={`${id}-commentaires`} aria-label={libelleCommentaires} title={libelleCommentaires} onClick={() => setCommentaires((x) => !x)}>
          <Icone nom="commenter" taille={19} />
        </button>
        <button type="button" className="act-partager" aria-label={libelles.partager} title={libelles.partager} onClick={partager}>
          <Icone nom="partager" taille={19} />
        </button>
      </div>
      {partage === 'manuel' && (
        <div className="lien-partage">
          <span>{libelles.lienACopier}</span>
          <input type="text" readOnly value={adresse} aria-label={libelles.lienACopier} dir="ltr" onFocus={(e) => e.currentTarget.select()} autoFocus />
        </div>
      )}
      <div className="commentaires" id={`${id}-commentaires`} hidden={!commentaires}>
        <p className="vide">{libelles.aucunCommentaire}</p>
        <p className="discret">{libelles.commentairesFermes}</p>
      </div>
      <p className="post-mention">
        {libelles.mentionIA}
        {' · '}
        <button type="button" className="lien-discret" aria-expanded={panneau} aria-controls={`${id}-sources`} onClick={() => setPanneau((x) => !x)}>
          {panneau ? libelles.masquerSources : libelles.sources}
        </button>
      </p>
      <div className="panneau" id={`${id}-sources`} hidden={!panneau}>{sources}</div>
      <p className={`toast${partage === 'copie' ? ' visible' : ''}`} role="status">{partage === 'copie' ? libelles.lienCopie : ''}</p>
    </>
  );
}
