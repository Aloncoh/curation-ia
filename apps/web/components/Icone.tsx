// Icônes au trait de la maquette (maquette/index.html), dessinées en SVG, toujours décoratives.
const ICONES = {
  accueil: ['M3.5 10.5L12 3.5l8.5 7', 'M5.5 9v11h4.5v-6h4v6h4.5V9'],
  explorer: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4.2-4.2'],
  comptes: ['M9 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z', 'M2.5 19.5c.7-3.3 3.3-5.3 6.5-5.3s5.8 2 6.5 5.3', 'M16 5.5a3 3 0 0 1 0 6', 'M17.5 14.5c2.2.6 3.6 2.4 4 5'],
  notifications: ['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20.5a2.2 2.2 0 0 0 4 0'],
  messages: ['M3.5 6h17v12h-17z', 'M3.5 6.5L12 13l8.5-6.5'],
  reels: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M10.5 9.5l4 2.5-4 2.5z'],
  profil: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6'],
  plus: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
  commenter: ['M4 5h16v11H10l-5 4v-4H4z'],
  partager: ['M12 15V3', 'M7.5 7.5L12 3l4.5 4.5', 'M5 13v7h14v-7'],
  lien: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  retour: ['M19 12H5', 'M11 6l-6 6 6 6'],
  reglages: ['M4 7h9', 'M17 7h3', 'M15 4.5v5', 'M4 17h3', 'M11 17h9', 'M9 14.5v5'],
  langue: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M3.5 12h17', 'M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z'],
} as const;

export type NomIcone = keyof typeof ICONES;

export function Icone({ nom, taille = 22, className }: { nom: NomIcone; taille?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONES[nom].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
