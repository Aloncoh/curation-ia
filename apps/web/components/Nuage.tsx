'use client';
// Nuage de particules de la page de découverte (app/page.tsx, 2026-11-17, adaptation du modèle « Vesper » demandée par
// l'utilisateur, aux couleurs du site) : quelques milliers de points aux six couleurs des agents, dessinés sur le papier.
// Ils forment d'abord l'anneau du logo, s'ouvrent en spirale à six bras au niveau des agents, puis se rangent autour
// du téléphone. La forme suit les éléments `[data-forme]` de la page et change selon le défilement ; le pointeur écarte
// les points proches. Le même script fait défiler l'écran du téléphone pendant que sa section reste fixée.
// Mouvement réduit (appareil ou Réglages) : une image fixe, redessinée au défilement, et un téléphone qu'on fait
// défiler soi-même.
import { useEffect, useRef } from 'react';

type Forme = 'anneau' | 'spirale' | 'telephone';
interface Cadre { x: number; y: number; l: number; h: number }

// Nodi, Repo, Pyxo, Mova, Pulse, Radar : l'ordre des arcs du logo (lib/personnages.ts).
const COULEURS = ['31, 167, 122', '232, 115, 47', '47, 143, 216', '154, 92, 240', '217, 154, 18', '18, 166, 160'];
const ALPHAS = [0.4, 0.68, 0.94];
const TAILLES = [1.3, 1.8, 2.4];
const TAU = Math.PI * 2;
const FOCALE = 2200;
const borne = (x: number) => Math.min(1, Math.max(0, x));
const lisse = (a: number, b: number, x: number) => { const t = borne((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function Nuage() {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const racine = ancre.current?.closest<HTMLElement>('.vitrine');
    const toile = racine?.querySelector<HTMLCanvasElement>('canvas.nuage');
    const cx = toile?.getContext('2d');
    if (!racine || !toile || !cx) return;
    const reperes = [...racine.querySelectorAll<HTMLElement>('[data-forme]')];
    if (reperes.length === 0) return;
    const formes = reperes.map((e) => e.dataset.forme as Forme);
    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('mouvement-reduit');
    const nettoyages: (() => void)[] = [];
    const ecouter = (cible: EventTarget, type: string, f: (e: never) => void, o?: AddEventListenerOptions) => {
      cible.addEventListener(type, f as EventListener, o);
      nettoyages.push(() => cible.removeEventListener(type, f as EventListener, o));
    };

    // Téléphone : tant que sa section reste fixée, descendre la page fait défiler son écran.
    const section = racine.querySelector<HTMLElement>('.d-iphone');
    const ecran = section?.querySelector<HTMLElement>('.tel-ecran');
    if (section && ecran && !calme) {
      section.classList.add('pilote');
      const suivre = () => {
        const b = section.getBoundingClientRect();
        const course = b.height - innerHeight;
        ecran.scrollTop = (course > 0 ? borne(-b.top / course) : 0) * (ecran.scrollHeight - ecran.clientHeight);
      };
      ecouter(window, 'scroll', suivre, { passive: true });
      ecouter(window, 'resize', suivre);
      suivre();
      nettoyages.push(() => section.classList.remove('pilote'));
    }

    // Les points : A place le point le long de la forme (et fixe sa couleur, par sixième), B, C et E le dispersent,
    // D décale son départ pendant un changement de forme.
    const N = innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4 ? 3000 : 8400;
    const A = new Float32Array(N), B = new Float32Array(N), C = new Float32Array(N), D = new Float32Array(N), E = new Float32Array(N);
    for (let i = 0; i < N; i++) { A[i] = (i + Math.random()) / N; B[i] = Math.random(); C[i] = Math.random(); D[i] = Math.random(); E[i] = Math.random(); }
    const sx = new Float32Array(N), sy = new Float32Array(N), plan = new Uint8Array(N);
    const p = new Float32Array(3), q = new Float32Array(3);

    let L = 0, H = 0;
    const tailler = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      L = innerWidth; H = innerHeight;
      toile.width = L * dpr; toile.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    tailler();

    let px = -9999, py = -9999, vx = 0, vy = 0, cibleX = 0, cibleY = 0;
    ecouter(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX; py = e.clientY; cibleX = (px / L) * 2 - 1; cibleY = (py / H) * 2 - 1;
    }, { passive: true });
    ecouter(document, 'pointerleave', () => { px = py = -9999; cibleX = cibleY = 0; });

    /** Place le point `i` de la forme dans `o` : x et y dans la fenêtre, z en profondeur (positif : plus loin). */
    const poser = (forme: Forme, i: number, t: number, r: Cadre, o: Float32Array) => {
      const a = A[i]!, b = B[i]!, c = C[i]!, e = E[i]!;
      let x = 0, y = 0, z = 0, bx = 0, by = 0;
      if (forme === 'anneau') {
        // Un tore bosselé, face à nous : l'anneau du logo, ses six arcs de couleur, qui tourne lentement.
        const R = Math.min(r.l, r.h) / 2;
        const th = TAU * a - Math.PI / 2 + t * 0.00011, ph = TAU * b;
        const grand = R * (0.72 + 0.03 * Math.sin(3 * th + t * 0.0007) + 0.018 * Math.sin(5 * th - t * 0.0005));
        const petit = R * (0.2 + 0.05 * Math.sin(2 * th + t * 0.0006) + 0.03 * Math.sin(4 * ph + t * 0.0008)) * (0.8 + 0.2 * c);
        const d = grand + petit * Math.cos(ph);
        x = d * Math.cos(th); y = d * Math.sin(th); z = petit * Math.sin(ph);
        bx = 0.4 + vy * 0.18; by = vx * 0.22;
      } else if (forme === 'spirale') {
        // Un disque couché : six bras, un par agent, et un cœur dense.
        const R = Math.min(r.l / 2, r.h / 0.96);
        if (b < 0.1) {
          const rr = R * 0.1 * Math.cbrt(c), u = TAU * e, v = Math.acos(2 * (b * 10) - 1);
          x = rr * Math.sin(v) * Math.cos(u); y = rr * Math.cos(v) * 0.7; z = rr * Math.sin(v) * Math.sin(u);
        } else {
          const rho = 0.08 + 0.92 * Math.pow((b - 0.1) / 0.9, 0.75);
          const angle = (Math.floor(a * 6) * TAU) / 6 + rho * 3.4 + (c - 0.5) * 0.85 * (1 - 0.55 * rho) - t * 0.00016;
          x = R * rho * Math.cos(angle); z = R * rho * Math.sin(angle); y = (e - 0.5) * R * 0.09 * (1 - rho);
        }
        // Disque dans le plan horizontal, relevé de 0,43 rad : il se voit en ellipse, 0,42 fois plus haute que large.
        bx = 0.43 + vy * 0.06; by = vx * 0.1;
      } else {
        // Le contour d'un téléphone : les points courent le long du bord et s'en écartent en halo.
        const m = 14, dl = r.l / 2 + m, dh = r.h / 2 + m, rc = Math.min(dl, r.l * 0.17 + m);
        const droitH = 2 * (dl - rc), droitV = 2 * (dh - rc), arc = (Math.PI / 2) * rc;
        let s = ((a + t * 0.000012) % 1) * (2 * droitH + 2 * droitV + 4 * arc), nx = 0, ny = 0, an = 0;
        if (s < droitH) { x = -dl + rc + s; y = -dh; ny = -1; }
        else if ((s -= droitH) < arc) { an = -Math.PI / 2 + s / rc; nx = Math.cos(an); ny = Math.sin(an); x = dl - rc + rc * nx; y = -dh + rc + rc * ny; }
        else if ((s -= arc) < droitV) { x = dl; y = -dh + rc + s; nx = 1; }
        else if ((s -= droitV) < arc) { an = s / rc; nx = Math.cos(an); ny = Math.sin(an); x = dl - rc + rc * nx; y = dh - rc + rc * ny; }
        else if ((s -= arc) < droitH) { x = dl - rc - s; y = dh; ny = 1; }
        else if ((s -= droitH) < arc) { an = Math.PI / 2 + s / rc; nx = Math.cos(an); ny = Math.sin(an); x = -dl + rc + rc * nx; y = dh - rc + rc * ny; }
        else if ((s -= arc) < droitV) { x = -dl; y = dh - rc - s; nx = -1; }
        else { an = Math.PI + (s - droitV) / rc; nx = Math.cos(an); ny = Math.sin(an); x = -dl + rc + rc * nx; y = -dh + rc + rc * ny; }
        const ecart = Math.pow(c, 2.2) * 54 + Math.sin(t * 0.0012 + e * TAU) * 3;
        x += nx * ecart; y += ny * ecart; z = (b - 0.5) * 40;
      }
      if (bx !== 0 || by !== 0) {
        const cb = Math.cos(bx), sb = Math.sin(bx), y1 = y * cb - z * sb, z1 = y * sb + z * cb;
        const cg = Math.cos(by), sg = Math.sin(by);
        y = y1; z = z1 * cg - x * sg; x = x * cg + z1 * sg;
      }
      o[0] = r.x + x; o[1] = r.y + y; o[2] = z;
    };

    const depart = performance.now();
    const dessiner = (t: number) => {
      vx += (cibleX - vx) * 0.05; vy += (cibleY - vy) * 0.05;
      const cadres: Cadre[] = reperes.map((el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.width, h: b.height }; });
      // Entre deux repères : la forme du dessus jusqu'au tiers du trajet, celle du dessous après les quatre cinquièmes.
      const milieu = H * 0.5;
      const j = cadres.findIndex((c) => c.y > milieu);
      const iB = j === -1 ? cadres.length - 1 : j, iA = j <= 0 ? iB : j - 1;
      const cA = cadres[iA]!, cB = cadres[iB]!, fA = formes[iA]!, fB = formes[iB]!;
      const T = iA === iB ? 0 : lisse(0.28, 0.82, (milieu - cA.y) / (cB.y - cA.y));
      const centreX = cA.x + (cB.x - cA.x) * T, centreY = cA.y + (cB.y - cA.y) * T;
      const remous = Math.min(L, H) * 0.09;
      const entree = calme ? 9 : (t - depart) / 1400;

      for (let i = 0; i < N; i++) {
        poser(fA, i, t, cA, p);
        let x = p[0]!, y = p[1]!, z = p[2]!;
        if (T > 0) {
          poser(fB, i, t, cB, q);
          const ti = lisse(0, 1, T * 1.5 - D[i]! * 0.5), rem = Math.sin(Math.PI * ti) * remous;
          x += (q[0]! - x) * ti + Math.cos(TAU * C[i]! + t * 0.0009) * rem;
          y += (q[1]! - y) * ti + Math.sin(TAU * E[i]! + t * 0.0011) * rem;
          z += (q[2]! - z) * ti;
        }
        // À l'ouverture, les points arrivent de tout autour et se rassemblent.
        const gi = lisse(0, 1, entree - D[i]! * 0.35);
        if (gi < 1) {
          const ox = centreX + Math.cos(TAU * C[i]!) * L * 0.75, oy = centreY + Math.sin(TAU * C[i]!) * H * 0.75;
          x = ox + (x - ox) * gi; y = oy + (y - oy) * gi;
        }
        const pr = FOCALE / (FOCALE + z);
        x = centreX + (x - centreX) * pr; y = centreY + (y - centreY) * pr;
        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
        if (d2 < 12100) { const d = Math.sqrt(d2) || 1, f = (1 - d / 110) ** 2 * 46; x += (dx / d) * f; y += (dy / d) * f; }
        sx[i] = x; sy[i] = y;
        plan[i] = y < -6 || y > H + 6 || x < -6 || x > L + 6 ? 3 : z < -34 ? 2 : z > 34 ? 0 : 1;
      }

      cx.clearRect(0, 0, L, H);
      for (let k = 0; k < 6; k++) {
        const debut = Math.floor((k * N) / 6), fin = Math.floor(((k + 1) * N) / 6);
        for (let n = 0; n < 3; n++) {
          const taille = TAILLES[n]!;
          cx.fillStyle = `rgba(${COULEURS[k]}, ${ALPHAS[n]})`;
          cx.beginPath();
          for (let i = debut; i < fin; i++) if (plan[i] === n) cx.rect(sx[i]!, sy[i]!, taille, taille);
          cx.fill();
        }
      }
    };

    let image = 0;
    if (calme) {
      // Image fixe : redessinée seulement quand la page bouge, pour rester sous les bons éléments.
      const unefois = () => { cancelAnimationFrame(image); image = requestAnimationFrame(() => dessiner(0)); };
      ecouter(window, 'scroll', unefois, { passive: true });
      ecouter(window, 'resize', () => { tailler(); unefois(); });
      unefois();
    } else {
      let dL = L, dH = H;
      ecouter(window, 'resize', () => { if (innerWidth !== dL || Math.abs(innerHeight - dH) > 140) { tailler(); dL = L; dH = H; } });
      const boucle = (t: number) => { dessiner(t); image = requestAnimationFrame(boucle); };
      image = requestAnimationFrame(boucle);
    }
    nettoyages.push(() => cancelAnimationFrame(image));
    return () => nettoyages.forEach((f) => f());
  }, []);

  return <span ref={ancre} hidden />;
}
