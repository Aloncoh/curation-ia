// Style des montages. Le feutre et les coutures viennent de la mascotte en peluche : les annotations sont des étiquettes
// cousues, reliées par un fil à ce qu'elles montrent. Chaque compte a sa couleur vive ; jamais de fond sombre.
export const FORMAT = { largeur: 1080, hauteur: 1350 };

export const COMPTES_MONTAGE = ['nodi', 'repo', 'pyxo', 'mova', 'pulse', 'radar'] as const;
export type Compte = (typeof COMPTES_MONTAGE)[number];

const GRAIN = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .11 0 0 0 0 .1 0 0 0 0 .14 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23g)'/%3E%3C/svg%3E`;

export const FEUILLE_DE_STYLE = `
* { box-sizing: border-box; margin: 0; }
html, body { background: #fff; }
.planche { --encre: #1d1b23; --papier: #fffdf8; --marge: 64px; position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 50px var(--marge) 0; color: var(--encre); font-family: 'Atkinson', sans-serif;
  background: radial-gradient(1200px 860px at 8% -6%, rgba(255, 255, 255, .88), transparent 66%), var(--accent); }
.planche::after { content: ""; position: absolute; inset: 0; background: url("${GRAIN}"); opacity: .13; mix-blend-mode: multiply; pointer-events: none; z-index: 9; }
[data-compte="nodi"] { --accent: #7fe0bd; }
[data-compte="repo"] { --accent: #f7ab79; }
[data-compte="pyxo"] { --accent: #7cc4f5; }
[data-compte="mova"] { --accent: #c9a7f5; }
[data-compte="pulse"] { --accent: #f5c04e; }
[data-compte="radar"] { --accent: #6fe3dc; }
.tete { position: relative; z-index: 3; display: flex; align-items: center; gap: 16px; font: 700 34px/1 'Atkinson', sans-serif; }
.avatar { width: 74px; height: 74px; border-radius: 50%; box-shadow: 0 0 0 4px var(--papier); }
.badge { padding: 9px 16px 10px; border-radius: 999px; background: var(--encre); color: #faf2e0; font-size: 26px; }
.surtitre { margin-left: auto; font: 500 26px/1 'Recursive', monospace; font-variation-settings: 'MONO' 1, 'CASL' 0; }
.titre { position: relative; z-index: 2; margin-top: 30px; max-width: 952px; font-family: 'Recursive', sans-serif; font-weight: 880; font-variation-settings: 'CASL' 1, 'MONO' 0; letter-spacing: -.024em; line-height: .99; text-wrap: balance; }
.heros { position: relative; z-index: 3; flex: 1; min-height: 0; margin-top: 34px; }
.heros img { display: block; }
.fenetre { position: absolute; inset: 0 -130px -40px 0; padding: 14px 14px 0; border-radius: 26px 0 0 0; background: var(--papier); box-shadow: 0 34px 60px -24px rgba(29, 27, 35, .42); transform: rotate(-1.1deg); transform-origin: 0 0; overflow: hidden; }
.fenetre img { width: 100%; height: 100%; object-fit: cover; object-position: left top; border-radius: 14px 0 0 0; }
.photo { margin: 30px calc(var(--marge) * -1) 0; }
.photo img { width: 100%; height: 100%; object-fit: cover; }
.photo::before { content: ""; position: absolute; left: 34px; right: 34px; top: -16px; border-top: 5px dashed var(--encre); }
.detourage { margin-top: -86px; }
.disque { position: absolute; right: -90px; bottom: -180px; width: 880px; height: 880px; border-radius: 50%; background: rgba(255, 255, 255, .62); }
.decoupe { position: absolute; right: -30px; bottom: 56px; width: 96%; max-height: 112%; object-fit: contain; object-position: right bottom; filter: drop-shadow(0 30px 34px rgba(29, 27, 35, .34)); }
.carte { position: absolute; padding: 12px; border-radius: 22px; background: var(--papier); box-shadow: 0 30px 54px -24px rgba(29, 27, 35, .42); }
.carte img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
.carte.avant { left: 0; top: 0; width: 62%; height: 62%; transform: rotate(-2.2deg); filter: saturate(.72); }
.carte.apres { right: -70px; bottom: 140px; width: 74%; height: 60%; transform: rotate(1.4deg); }
.carte figcaption, .etiquette { position: absolute; padding: 19px 26px 21px; border-radius: 18px; background: var(--papier); font: 700 40px/1.12 'Atkinson', sans-serif; outline: 3px dashed var(--encre); outline-offset: -9px; box-shadow: 0 8px 18px -8px rgba(29, 27, 35, .5); }
.carte figcaption { left: -8px; top: -14px; }
.apres figcaption { left: auto; top: auto; right: 96px; bottom: -18px; background: var(--encre); color: #faf2e0; outline-color: #faf2e0; }
.heros > .etiquette { max-width: 560px; }
.etiquette { z-index: 5; transform: rotate(-.6deg); overflow-wrap: anywhere; }
.pile { position: absolute; z-index: 5; left: 0; right: 40px; bottom: 96px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
.pile .etiquette { position: static; max-width: 100%; }
.point { position: absolute; z-index: 4; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; background: var(--accent); border: 6px solid var(--encre); }
.fils { position: absolute; inset: 0; z-index: 4; width: 100%; height: 100%; overflow: visible; }
.fils line { stroke: var(--encre); stroke-width: 4.5; stroke-linecap: round; stroke-dasharray: 11 12; vector-effect: non-scaling-stroke; }
.lentille { position: absolute; z-index: 4; overflow: hidden; right: 6px; bottom: 96px; width: 450px; height: 450px; border-radius: 50%; background: var(--papier); border: 12px solid var(--papier); box-shadow: 0 0 0 4px var(--encre), 0 30px 50px -18px rgba(29, 27, 35, .55); }
.lentille img { position: absolute; left: 50%; top: 50%; max-width: none; }
.papier { position: absolute; inset: 0 -40px 92px 0; padding: 50px 46px; border-radius: 26px 0 0 26px; background: var(--papier); box-shadow: 0 34px 60px -24px rgba(29, 27, 35, .42); transform: rotate(-.9deg); font: 500 46px/1.5 'Recursive', monospace; font-variation-settings: 'MONO' 1, 'CASL' 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.fiches { display: flex; flex-direction: column; justify-content: center; gap: 30px; padding: 0 0 100px; list-style: none; }
.fiche { overflow-wrap: anywhere; padding: 38px 44px 40px; border-radius: 26px; background: var(--papier); font: 700 50px/1.14 'Atkinson', sans-serif; outline: 4px dashed var(--encre); outline-offset: -11px; box-shadow: 0 16px 30px -16px rgba(29, 27, 35, .5); }
.fiche:nth-child(odd) { transform: rotate(-.8deg); margin-right: 60px; }
.fiche:nth-child(even) { transform: rotate(.7deg); margin-left: 60px; }
.etapes { display: flex; flex-direction: column; justify-content: safe center; align-items: stretch; padding: 0 0 100px; list-style: none; }
.etape { display: flex; align-items: center; gap: 30px; overflow-wrap: anywhere; padding: 28px 40px 30px 30px; border-radius: 26px; background: var(--papier); font: 700 44px/1.14 'Atkinson', sans-serif; outline: 4px dashed var(--encre); outline-offset: -11px; box-shadow: 0 16px 30px -16px rgba(29, 27, 35, .5); }
.etape:nth-child(4n+1) { transform: rotate(-.7deg); margin-right: 50px; }
.etape:nth-child(4n+3) { transform: rotate(.6deg); margin-left: 50px; }
.etape .texte { flex: 1; min-width: 0; }
.numero { flex: none; display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; background: var(--accent); border: 5px solid var(--encre); font: 880 40px/1 'Recursive', sans-serif; font-variation-settings: 'CASL' 1, 'MONO' 0; }
.fleche { display: flex; justify-content: center; height: 58px; }
.fleche svg { height: 100%; overflow: visible; }
.fleche path { fill: none; stroke: var(--encre); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.fleche path:first-child { stroke-dasharray: 9 10; }
.etapes[data-nombre="4"] .etape { gap: 22px; padding: 18px 32px 20px 22px; font-size: 37px; }
.etapes[data-nombre="4"] .etape:nth-child(4n+1) { margin-right: 28px; }
.etapes[data-nombre="4"] .etape:nth-child(4n+3) { margin-left: 28px; }
.etapes[data-nombre="4"] .numero { width: 60px; height: 60px; border-width: 4px; font-size: 32px; }
.etapes[data-nombre="4"] .fleche { height: 40px; }
.ligne { display: block; }
.ligne b { padding: 0 10px; border-radius: 8px; background: var(--accent); font-weight: 800; }
.grille { display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 1fr; gap: 26px 28px; padding: 0 0 112px; list-style: none; }
.grille[data-nombre="5"] .apercu:last-child { grid-column: 1 / -1; justify-self: center; width: calc(50% - 14px); }
.apercu { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.apercu:nth-child(odd) { transform: rotate(-.6deg); }
.apercu:nth-child(even) { transform: rotate(.5deg); }
.apercu .cadre { flex: 1; min-height: 0; padding: 10px; border-radius: 20px; background: var(--papier); box-shadow: 0 22px 40px -22px rgba(29, 27, 35, .5); outline: 3px dashed var(--encre); outline-offset: -6px; overflow: hidden; }
.apercu .cadre img { width: 100%; height: 100%; object-fit: cover; object-position: center top; border-radius: 12px; }
.apercu .cadre.vide { display: grid; place-items: center; background: rgba(255, 253, 248, .55); box-shadow: none; }
.indisponible { font: 700 34px/1.1 'Atkinson', sans-serif; opacity: .7; }
.nom-site { align-self: flex-start; max-width: 100%; padding: 8px 20px 10px; border-radius: 999px; background: var(--encre); color: #faf2e0; font: 700 32px/1.1 'Atkinson', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: clip; }
/* Dossier par étapes (2026-11-10) : une carte de feutre cousue par ressource ; la scène est dessinée par nous (accessoire
   de l'étape au trait d'encre et mascotte de l'agent), jamais une image de tiers. */
.cartes { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 18px 20px; padding: 0 0 106px; list-style: none; }
.carte-outil { --scene: #f7ab79; display: flex; flex-direction: column; min-height: 0; padding: 9px; border-radius: 22px; background: var(--papier); outline: 3px dashed var(--encre); outline-offset: -5px; box-shadow: 0 18px 30px -18px rgba(29, 27, 35, .55); }
.carte-outil:nth-child(3n+1) { transform: rotate(-.7deg); }
.carte-outil:nth-child(3n) { transform: rotate(.6deg); }
.carte-outil[data-etape="storyboard"] { --scene: #f7ab79; }
.carte-outil[data-etape="production"] { --scene: #7cc4f5; }
.carte-outil[data-etape="animation"] { --scene: #7fe0bd; }
.carte-outil[data-etape="effets"] { --scene: #f5c04e; }
.carte-outil[data-etape="son"] { --scene: #6fe3dc; }
.carte-outil[data-etape="blender"] { --scene: #f7ab79; }
.carte-outil[data-etape="web3d"] { --scene: #7cc4f5; }
.carte-outil[data-etape="images"] { --scene: #f5c04e; }
.scene { position: relative; flex: 1; min-height: 0; border-radius: 15px; overflow: hidden; background: radial-gradient(120% 90% at 70% 0%, rgba(255, 255, 255, .7), transparent 60%), var(--scene); }
.scene svg { position: absolute; right: 2%; top: 7%; width: 70%; height: 86%; overflow: visible; }
.scene .acc * { fill: none; stroke: var(--encre); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.scene .acc .plein { fill: var(--papier); }
.scene .acc .clair { fill: rgba(255, 255, 255, .75); }
.scene .acc .encre { fill: var(--encre); }
.scene .acc .trait { stroke-width: 8; }
.mascotte { position: absolute; left: 10px; bottom: -6px; height: 70%; filter: drop-shadow(0 6px 6px rgba(29, 27, 35, .3)); }
.infos { display: flex; flex-direction: column; gap: 3px; padding: 9px 6px 3px; }
.etape-outil { display: flex; align-items: center; gap: 8px; font: 600 17px/1 'Recursive', monospace; font-variation-settings: 'MONO' 1, 'CASL' 0; letter-spacing: .08em; text-transform: uppercase; }
.etape-outil::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: var(--scene); box-shadow: 0 0 0 2.5px var(--encre); }
.nom-outil { font: 880 27px/1.02 'Recursive', sans-serif; font-variation-settings: 'CASL' 1, 'MONO' 0; letter-spacing: -.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.auteur-outil { font: 500 17px/1.1 'Recursive', monospace; font-variation-settings: 'MONO' 1, 'CASL' 0; color: rgba(29, 27, 35, .62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pied { position: absolute; z-index: 6; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; gap: 24px; padding: 16px var(--marge) 18px; background: var(--papier); font: 400 24px/1.2 'Atkinson', sans-serif; }
`;
