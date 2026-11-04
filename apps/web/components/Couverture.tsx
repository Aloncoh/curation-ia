// Couverture d'une publication (décision de l'utilisateur du 2026-11-05) : un fond aux couleurs du sujet, son logo en
// grand et son nom, et la signature de l'agent en petit dans un coin. Montage graphique dessiné par le site, sans image
// générée ni reprise sans droits ; les formes du fond varient d'un post à l'autre (graine = identifiant du post).
import type { Sujet } from '../lib/sujet.ts';

interface Props {
  sujet: Sujet;
  graine: number;
  agent: { nom: string; avatar: string };
  /** `grand` : 16:9 dans le fil ; `vignette` : carré, à côté d'une annonce courte. */
  format: 'grand' | 'vignette';
  etiquette: string;
}

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

export function Couverture({ sujet, graine, agent, format, etiquette }: Props) {
  return (
    <figure className={`couverture couv-${format}`} dir="ltr" style={{ ['--sujet' as string]: sujet.couleur }} role="img" aria-label={etiquette}>
      <Fond graine={graine} />
      <span className="couv-logo"><Logo sujet={sujet} /></span>
      {format === 'grand' && (
        <span className="couv-titre">
          <strong>{sujet.nom}</strong>
          {sujet.detail && <small>{sujet.detail}</small>}
        </span>
      )}
      <span className="couv-agent" aria-hidden="true"><img src={agent.avatar} alt="" width={28} height={28} /></span>
    </figure>
  );
}
