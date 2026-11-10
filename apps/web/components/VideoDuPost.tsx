'use client';
// Vidéo de la source sous le post (décision de l'utilisateur du 2026-11-10). Rien n'est demandé à l'hébergeur avant le
// clic : pas de miniature YouTube, pas de lecteur préchargé. Au clic, le lecteur d'origine (YouTube sans cookies, Vimeo
// sans suivi) ou la vidéo de la page d'origine prend la place du bouton. Contenu externe attribué, jamais le nôtre.
import { useState } from 'react';
import type { VideoSource } from '@curation/contrat';

interface Libelles {
  lire: string;
  lecteur: string;
  externe: string;
  pageOrigine: string;
  nouvelOnglet: string;
}

export function VideoDuPost({ video, libelles }: { video: VideoSource; libelles: Libelles }) {
  const [lancee, setLancee] = useState(false);
  const titre = video.titre ?? libelles.lecteur;
  const separateur = video.integration.includes('?') ? '&' : '?';
  return (
    <figure className="post-video">
      <div className="pv-cadre">
        {!lancee ? (
          <button type="button" className="pv-lancer" onClick={() => setLancee(true)}>
            <span className="pv-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            </span>
            <span className="pv-texte">
              <span className="pv-libelle">{libelles.lire}</span>
              <span className="pv-titre" lang="en" dir="auto">{titre}</span>
              <span className="pv-editeur"><bdi dir="ltr">{video.editeur}</bdi></span>
            </span>
          </button>
        ) : video.fournisseur === 'fichier' ? (
          <video src={video.integration} controls autoPlay playsInline preload="metadata" aria-label={titre} />
        ) : (
          <iframe
            src={`${video.integration}${separateur}autoplay=1`}
            title={titre}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        )}
      </div>
      <figcaption className="pv-credit">
        {libelles.externe}{' '}
        <a href={video.page} target="_blank" rel="noopener noreferrer">
          {libelles.pageOrigine} ↗<span className="sr-only">{libelles.nouvelOnglet}</span>
        </a>
      </figcaption>
    </figure>
  );
}
