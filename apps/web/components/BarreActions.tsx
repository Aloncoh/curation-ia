'use client';
// Barre sous chaque post du réseau (2026-11-07, demande de l'utilisateur : « commentaires, like, partager directement en
// dessous du post ») : Commenter, J'aime, Partager. Aucun commentaire ni « J'aime » n'existe encore (pas de comptes) :
// les deux premiers le disent, sans compteur inventé ; Partager copie l'adresse du post (ou ouvre le partage du
// téléphone). Rien n'est enregistré.
import { useEffect, useState } from 'react';
import { Icone } from './Icone.tsx';

export interface LibellesBarre {
  actions: string;
  commenter: string;
  jaime: string;
  partager: string;
  lienCopie: string;
  aucunCommentaire: string;
  avecCompte: string;
}

export function BarreActions({ lien, titre, l }: { lien: string; titre: string; l: LibellesBarre }) {
  const [message, setMessage] = useState<string | null>(null);
  const [commentaires, setCommentaires] = useState(false);
  useEffect(() => {
    if (!message) return;
    const m = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(m);
  }, [message]);

  async function partager() {
    const adresse = new URL(lien, window.location.href).href;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: titre, url: adresse }); return; } catch { /* partage annulé : on copie */ }
    }
    try {
      await navigator.clipboard.writeText(adresse);
      setMessage(l.lienCopie);
    } catch {
      setMessage(adresse);
    }
  }

  return (
    <div className="barre-actions">
      <div className="ba-boutons" role="group" aria-label={l.actions}>
        <button type="button" aria-label={l.commenter} aria-expanded={commentaires} onClick={() => setCommentaires((x) => !x)}>
          <Icone nom="commenter" taille={18} /><span>{l.commenter}</span>
        </button>
        <button type="button" aria-label={l.jaime} onClick={() => setMessage(l.avecCompte)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /></svg>
          <span>{l.jaime}</span>
        </button>
        <button type="button" aria-label={l.partager} onClick={partager}>
          <Icone nom="partager" taille={18} /><span>{l.partager}</span>
        </button>
      </div>
      {commentaires && (
        <div className="ba-commentaires">
          <p>{l.aucunCommentaire}</p>
          <p className="discret">{l.avecCompte}</p>
        </div>
      )}
      <p className="ba-message" aria-live="polite">{message}</p>
    </div>
  );
}
