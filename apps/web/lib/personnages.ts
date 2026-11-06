// Les six personnages de l'accueil : rendus fournis par l'utilisateur, détourés depuis les planches (2026-11-06), yeux
// d'origine effacés. Les yeux sont redessinés à l'affichage (position et taille en % de l'image : x, y du centre,
// largeur, hauteur, teinte claire) pour pouvoir glisser et cligner. Images : public/personnages/<id>.webp.

export interface Personnage {
  id: 'nodi' | 'repo' | 'pyxo' | 'mova' | 'pulse' | 'radar';
  nom: string;
  /** Largeur / hauteur de l'image. */
  ratio: number;
  /** Couleur de la lueur des yeux. */
  lueur: string;
  /** Couleur de l'agent (anneau du logo, avatars). */
  couleur: string;
  yeux: [number, number, number, number, string][];
}

export const PERSONNAGES: Personnage[] = [
  { id: 'nodi', nom: 'Nodi', ratio: 0.8399, lueur: '#3ef0a8', couleur: '#1fa77a', yeux: [[42.14, 35.67, 13.38, 18.54, '#b2fdeb'], [74.75, 42.28, 12.37, 18.26, '#b6fcec']] },
  { id: 'repo', nom: 'Repo', ratio: 0.8427, lueur: '#4fd0ff', couleur: '#e8732f', yeux: [[38.29, 47.33, 13.29, 13.07, '#c0fcfd'], [65.66, 54.8, 12.97, 14.13, '#bdfbfc']] },
  { id: 'pyxo', nom: 'Pyxo', ratio: 0.8722, lueur: '#4fb0ff', couleur: '#2f8fd8', yeux: [[35.02, 36.79, 12.7, 16.19, '#9de6fd'], [65.15, 45.88, 13.03, 15.62, '#a8e8fc']] },
  { id: 'mova', nom: 'Mova', ratio: 1.1086, lueur: '#c39bff', couleur: '#9a5cf0', yeux: [[9.51, 48.08, 7.49, 17.57, '#f0cefc'], [33.14, 52.24, 10.37, 18.85, '#f1d2fd']] },
  { id: 'pulse', nom: 'Pulse', ratio: 1.0738, lueur: '#ffc847', couleur: '#d99a12', yeux: [[67.49, 53.61, 10.61, 18.62, '#feefa4'], [93.27, 58.11, 11.36, 22.15, '#fdeca2']] },
  { id: 'radar', nom: 'Radar', ratio: 1.152, lueur: '#40e8d8', couleur: '#12a6a0', yeux: [[50.9, 41.97, 9.45, 16.93, '#bcfdf5'], [73.61, 48.62, 6.9, 15.37, '#bbfdf5']] },
];
