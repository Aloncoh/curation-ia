// Les six personnages animés et le logo du titre (accueil et fil, 2026-11-06). Animations : Vitrine.tsx ; styles :
// app/vitrine.css.
import type { CSSProperties } from 'react';
import type { Textes } from '@curation/textes';
import type { Personnage } from '../lib/personnages.ts';

type Style = CSSProperties & Record<`--${string}`, string | number>;

/** Un personnage : l'image détourée et ses yeux redessinés (voir lib/personnages.ts). */
export function Perso({ p, i, bouton = false }: { p: Personnage; i: number; bouton?: boolean }) {
  const style: Style = { '--ratio': p.ratio, '--d': `${(-i * 0.53).toFixed(2)}s`, '--cl': `${(3.6 + (i * 0.7) % 2.4).toFixed(2)}s` };
  const corps = (
    <>
      <span className="corps-img">
        <img src={`/personnages/${p.id}.webp`} alt="" width={Math.round(320 * p.ratio)} height={320} />
        {p.yeux.map(([x, y, l, h, c], k) => (
          <i key={k} className="oeil" style={{ left: `${x - l / 2}%`, top: `${y - h / 2}%`, width: `${l}%`, height: `${h}%`, '--clair': c, '--lueur': p.lueur } as Style} />
        ))}
      </span>
      <span className="nom-perso">{p.nom}</span>
    </>
  );
  return bouton
    ? <button type="button" className="perso" data-perso={p.id} aria-label={p.nom} style={style}>{corps}</button>
    : <span className="perso" data-perso={p.id} style={style}>{corps}</span>;
}

export function Logo({ t }: { t: Textes }) {
  return (
    <svg className="bonhomme" viewBox="0 0 120 120" role="img" aria-label={t.vitrine.mascotte}>
      <defs><clipPath id="visiere-logo"><rect x="27" y="37" width="66" height="46" rx="23" /></clipPath></defs>
      <g className="anneau" fill="none" strokeWidth="9" strokeLinecap="round">
        <path d="M66.09 10.37 A50 50 0 0 1 99.93 29.91" stroke="#1fa77a" />
        <path d="M106.03 40.46 A50 50 0 0 1 106.03 79.54" stroke="#e8732f" />
        <path d="M99.93 90.09 A50 50 0 0 1 66.09 109.63" stroke="#2f8fd8" />
        <path d="M53.91 109.63 A50 50 0 0 1 20.07 90.09" stroke="#9a5cf0" />
        <path d="M13.97 79.54 A50 50 0 0 1 13.97 40.46" stroke="#d99a12" />
        <path d="M20.07 29.91 A50 50 0 0 1 53.91 10.37" stroke="#12a6a0" />
      </g>
      <circle cx="60" cy="60" r="41" fill="#fff" />
      <g className="visage">
        <rect x="27" y="37" width="66" height="46" rx="23" fill="#1c1530" />
        <g clipPath="url(#visiere-logo)"><g className="yeux"><rect x="39" y="49" width="14" height="22" rx="7" fill="#9b7bff" /><rect x="67" y="49" width="14" height="22" rx="7" fill="#9b7bff" /></g></g>
      </g>
    </svg>
  );
}

