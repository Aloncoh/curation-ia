// Couverture d'une publication (décision de l'utilisateur du 2026-11-05) : un fond aux couleurs du sujet, son logo en
// grand et son nom, et la signature de l'agent en petit dans un coin. Montage graphique dessiné par le site, sans image
// générée ni reprise sans droits ; les formes du fond varient d'un post à l'autre (graine = identifiant du post).
import type { Domaine, Sujet } from '../lib/sujet.ts';

interface Props {
  sujet: Sujet;
  graine: number;
  agent: { nom: string; avatar: string };
  /** `grand` : 16:9 dans le fil ; `vignette` : carré, à côté d'une annonce courte. */
  format: 'grand' | 'vignette';
  etiquette: string;
  /** Étiquette du domaine, traduite (« Skill », « Puces »…). */
  domaine: string;
}

/** Illustration du domaine, dessinée en grand et en filigrane (traits sur une grille de 24). */
const ILLUSTRATIONS: Record<Domaine, string[]> = {
  puces: ['M7 7h10v10H7z', 'M9.5 9.5h5v5h-5z', 'M9 3v4', 'M12 3v4', 'M15 3v4', 'M9 17v4', 'M12 17v4', 'M15 17v4', 'M3 9h4', 'M3 12h4', 'M3 15h4', 'M17 9h4', 'M17 12h4', 'M17 15h4'],
  modele: ['M12 2.5c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z', 'M19 15.5c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z'],
  code: ['M3 5h18v14H3z', 'M3 8.5h18', 'M7 12l3 2.5L7 17', 'M12.5 17h4.5'],
  design: ['M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.6-1.3-2.9 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z', 'M7.5 11.5h.01', 'M9.5 7.5h.01', 'M14.5 7.5h.01'],
  audio: ['M4 10v4', 'M7.5 7v10', 'M11 4v16', 'M14.5 8v8', 'M18 6v12', 'M21 10v4'],
  appareils: ['M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5z', 'M10.5 18.5h3'],
  cloud: ['M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5 4 4 0 0 1-.3 7.5z', 'M9 14h6', 'M12 11v6'],
  social: ['M4 5h12v8H9l-4 3.5V13H4z', 'M18 9h2v8h-1v3l-3.5-3H11'],
};

/** Générateur pseudo-aléatoire stable : la même publication garde la même composition. */
function aleatoire(graine: number) {
  let x = (graine * 2654435761) >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function Fond({ graine }: { graine: number }) {
  const r = aleatoire(graine);
  const motif = Math.floor(r() * 3);
  return (
    <svg className="couv-fond" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <circle cx={120 + r() * 30} cy={10 + r() * 20} r={38 + r() * 14} fill="currentColor" opacity=".16" />
      <circle cx={10 + r() * 25} cy={75 + r() * 15} r={26 + r() * 12} fill="currentColor" opacity=".12" />
      {motif === 0 && Array.from({ length: 5 }, (_, i) => <circle key={i} cx="128" cy="62" r={8 + i * 9} fill="none" stroke="currentColor" strokeWidth=".7" opacity={0.28 - i * 0.04} />)}
      {motif === 1 && Array.from({ length: 42 }, (_, i) => <circle key={i} cx={96 + (i % 7) * 9} cy={18 + Math.floor(i / 7) * 9} r=".9" fill="currentColor" opacity=".35" />)}
      {motif === 2 && Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${60 + i * 6} 95 Q ${110 + i * 4} ${40 - i * 3} 175 ${30 + i * 6}`} fill="none" stroke="currentColor" strokeWidth=".8" opacity={0.3 - i * 0.03} />)}
    </svg>
  );
}

function Logo({ sujet }: { sujet: Sujet }) {
  const l = sujet.logo;
  if (l.type === 'svg') return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={l.chemin} fill={sujet.couleur} /></svg>;
  if (l.type === 'image') return <img src={l.src} alt="" width={160} height={160} loading="lazy" />;
  return <span className="couv-monogramme" style={{ color: sujet.couleur }}>{l.lettres}</span>;
}

export function Couverture({ sujet, graine, agent, format, etiquette, domaine }: Props) {
  return (
    <figure className={`couverture couv-${format}`} dir="ltr" style={{ ['--sujet' as string]: sujet.couleur }} role="img" aria-label={etiquette}>
      <Fond graine={graine} />
      <svg className="couv-illustration" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {ILLUSTRATIONS[sujet.domaine].map((d, i) => <path key={i} d={d} />)}
      </svg>
      {format === 'grand' && <span className="couv-domaine">{domaine}</span>}
      <span className="couv-logo"><Logo sujet={sujet} /></span>
      {format === 'grand' && (
        <span className={`couv-titre${sujet.nom.length > 13 ? ' long' : ''}`}>
          <strong>{sujet.nom}</strong>
          {sujet.detail && <small>{sujet.detail}</small>}
        </span>
      )}
      <span className="couv-agent" aria-hidden="true"><img src={agent.avatar} alt="" width={28} height={28} /></span>
    </figure>
  );
}
