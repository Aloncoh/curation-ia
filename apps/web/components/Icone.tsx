// Icônes au trait de la maquette (maquette/index.html), dessinées en SVG, toujours décoratives.
const ICONES = {
  accueil: ['M3.5 10.5L12 3.5l8.5 7', 'M5.5 9v11h4.5v-6h4v6h4.5V9'],
  explorer: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4.2-4.2'],
  comptes: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6'],
  plus: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
  commenter: ['M4 5h16v11H10l-5 4v-4H4z'],
  partager: ['M12 15V3', 'M7.5 7.5L12 3l4.5 4.5', 'M5 13v7h14v-7'],
  lien: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  retour: ['M19 12H5', 'M11 6l-6 6 6 6'],
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
