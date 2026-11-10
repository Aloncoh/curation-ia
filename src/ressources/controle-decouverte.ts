// Jeu de contrôle de la découverte (2026-11-10, demande de l'utilisateur : « utilise mes 12 dépôts comme jeu de contrôle,
// sans injecter leurs noms dans les requêtes du test automatique »). Ces noms ne servent qu'à mesurer, après coup, si la
// recherche par thèmes les ramène d'elle-même ; ils ne figurent dans aucune requête (vérifié par un test).
export const DEPOTS_CONTROLE: readonly string[] = [
  'heygen-com/hyperframes',
  'remotion-dev/skills',
  // Transmis comme calesthio/OpenMontage ; renommé OpenMontageInc/OpenMontage (API GitHub, 301, relevé le 2026-11-10).
  'OpenMontageInc/OpenMontage',
  'greensock/gsap-skills',
  'Vincentwei1021/video-shotcraft',
  'Tejashmakwana/motionmaxxing',
  'ahujasid/mcp-for-blender',
  'arjun988/blender-skills',
  'achimala/dream-loop',
  'majidmanzarpour/threejs-game-skills',
  'wheresryan22/anatomy',
  'viettranx/3dviz-pro-max',
];
