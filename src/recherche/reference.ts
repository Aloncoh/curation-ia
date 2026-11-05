// Jeu de requêtes de référence de la recherche (SPEC §7.15, ADR 0008 ; P6 bloc 4, 2026-11-05). Chaque requête porte
// les publications attendues, par identifiant dans la base en ligne (Turso fait foi). Étiquetage fait par Claude Code
// pendant le développement, à partir des 70 publications en ligne le 2026-11-05 : c'est un jeu de développement, à faire
// relire par l'utilisateur avant d'en tirer une conclusion définitive. Les six premières requêtes sont celles de
// l'utilisateur (SPEC §7.15). Une requête sans publication attendue vérifie seulement qu'aucune erreur ne survient.

export interface RequeteReference {
  requete: string;
  /** Publications attendues ; une seule dans les 5 premiers résultats suffit. Vide : aucune publication pertinente en ligne. */
  attendus: number[];
  note?: string;
}

export const VERSION_REFERENCE = 'r1-2026-11-05';

export const REQUETES_REFERENCE: RequeteReference[] = [
  // Les six requêtes de l'utilisateur.
  { requete: 'Impeccable', attendus: [], note: 'aucune publication sur Impeccable en ligne le 2026-11-05' },
  { requete: 'UX design', attendus: [5, 1, 92, 25] },
  { requete: 'motion design', attendus: [86, 74, 105], note: 'pas de publication de motion design au sens strict ; animation et 3D les plus proches' },
  { requete: 'code review', attendus: [11, 18, 77] },
  { requete: 'sécuriser mon SaaS', attendus: [77, 98, 100, 97, 124] },
  { requete: 'repo pour un Jarvis', attendus: [88, 2, 104], note: 'assistant personnel : agent vocal, navigateur piloté par un agent, voix locale' },
  // Noms.
  { requete: 'Mistral', attendus: [82, 113] },
  { requete: 'Gemini', attendus: [84, 81, 90, 83] },
  { requete: 'Figma', attendus: [71, 87, 103] },
  { requete: 'Claude Code', attendus: [96, 102, 14, 20] },
  { requete: 'Copilot', attendus: [69, 77, 78, 99] },
  { requete: 'Obsidian', attendus: [8] },
  { requete: 'Xcode', attendus: [99] },
  { requete: 'Postgres', attendus: [126] },
  { requete: 'manga', attendus: [108] },
  { requete: 'MCP', attendus: [7, 74, 93, 131] },
  // Besoins, en français et en anglais.
  { requete: 'skills', attendus: [91, 12, 19, 4] },
  { requete: 'créer un skill', attendus: [19, 20] },
  { requete: 'mémoire pour mon agent', attendus: [14, 16] },
  { requete: 'tester mon application web', attendus: [6] },
  { requete: 'navigateur pour agent', attendus: [2] },
  { requete: 'serveur MCP', attendus: [7, 74] },
  { requete: 'Word Excel PowerPoint PDF', attendus: [4] },
  { requete: 'supprimer les tics d’écriture IA', attendus: [15, 17] },
  { requete: 'marketing SEO', attendus: [9] },
  { requete: 'recherche scientifique', attendus: [10, 114] },
  { requete: 'React performance', attendus: [3] },
  { requete: 'génération de musique', attendus: [85, 93] },
  { requete: 'vidéo IA', attendus: [105, 131] },
  { requete: 'synthèse vocale locale', attendus: [104] },
  { requete: 'lunettes XR', attendus: [116] },
  { requete: 'vulnérabilités CVE', attendus: [124] },
  { requete: 'planifier avant de coder', attendus: [11, 13, 16] },
  { requete: 'inspiration web design', attendus: [25, 92] },
  { requete: 'dépendances', attendus: [97] },
  { requete: 'faire des slides', attendus: [107, 4] },
];

/** Une requête est réussie si une publication attendue figure dans ses `rang` premiers résultats. */
export const RANG_REUSSITE = 5;
/** Seuil proposé par ADR 0008 : part des requêtes (avec publications attendues) réussies. */
export const SEUIL_REUSSITE = 0.8;
