'use client';
// Animations et interactions de l'accueil (app/page.tsx), reprises de la maquette `maquette/accueil.html` : fond en
// petits points façon Antigravity (champDePoints), écran de l'iPhone qui défile seul, curseur flèche, indicateur de la barre calé sur l'onglet, barre pleine au défilement,
// personnages qui regardent, se présentent tour à tour et se déplacent, onglets de la fenêtre, boutons de compte (bientôt).
// Tout s'arrête si l'appareil demande moins de mouvement ; le curseur normal revient dès qu'on navigue au clavier.
import { useEffect, useRef } from 'react';

const hasard = Math.random;

type Ecouter = (cible: EventTarget, type: string, f: (e: never) => void, o?: AddEventListenerOptions) => void;

/** Couleurs des six agents (lib/personnages.ts), pour l'anneau autour du pointeur. */
const TEINTES = ['31, 167, 122', '232, 115, 47', '47, 143, 216', '154, 92, 240', '217, 154, 18', '18, 166, 160'];
const TOUR = Math.PI * 2;

// Fond en petits points façon Antigravity (demandes du 2026-11-17 : « animation en fond en petits points comme sur le
// site antigravity », puis « les points sont trop gros et ça doit être en mouvement un peu partout en continu ») :
// une grille irrégulière et serrée de points très fins, qui montent lentement en décrivant de petites boucles et
// reviennent par le bas. Des ondes naissent sans arrêt un peu partout : en s'élargissant, chacune colore les points
// qu'elle traverse à la couleur d'un agent. Autour du pointeur, un anneau les écarte et les allonge en petits traits
// aux six couleurs. Dans le réseau (fond sombre, classe cadre-vivant), l'ancien réglage est gardé : points violets,
// pâles et espacés, sans dérive ni ondes. Mouvement réduit : les points restent affichés, immobiles.
function champDePoints(racine: HTMLElement, ecouter: Ecouter, nettoyages: (() => void)[], calme: boolean) {
  const toile = racine.querySelector<HTMLCanvasElement>('.particules');
  const cx = toile?.getContext('2d');
  if (!toile || !cx) return;
  const sombre = racine.classList.contains('cadre-vivant');
  let L = 0, H = 0, pas = 32;
  let pts: { x: number; y: number; p: number; q: number; v: number; r: number }[] = [];
  const construire = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    L = innerWidth; H = innerHeight;
    toile.width = L * dpr; toile.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pas = sombre ? (L < 700 ? 40 : 46) : L < 700 ? 30 : 32;
    pts = [];
    for (let y = pas / 2; y < H + pas; y += pas) for (let x = pas / 2; x < L + pas; x += pas) {
      pts.push({ x: x + (hasard() - 0.5) * pas * 0.9, y: y + (hasard() - 0.5) * pas * 0.9, p: hasard() * 6.28, q: hasard() * 6.28, v: 8 + hasard() * 14, r: 4 + hasard() * 6 });
    }
  };
  construire();
  let mx = L * 0.5, my = H * 0.4, tx = mx, ty = my, actif = false, repos = 0;
  // Ondes : lieu et instant de naissance, couleur (rang d'un agent). Chacune vit 3,6 s.
  const VIE = 3800;
  const telephone = sombre ? null : racine.querySelector<HTMLElement>('.tel');
  let nees = 0;
  const ondes: { x: number; y: number; n: number; k: number }[] = [];
  let prochaine = 500;
  const dessiner = (t: number) => {
    if (!actif) { tx = L * 0.5 + Math.cos(t * 0.00021) * L * 0.3; ty = H * 0.42 + Math.sin(t * 0.00029) * H * 0.24; }
    if (calme) { mx = tx; my = ty; } else { mx += (tx - mx) * 0.09; my += (ty - my) * 0.09; }
    const R = (sombre ? (L < 700 ? 100 : 150) : L < 700 ? 90 : 180) + Math.sin(t * 0.0013) * 12;
    const sigma = sombre ? 72 : 74, S2 = 2 * sigma * sigma;
    if (!sombre && !calme) {
      if (t > prochaine) {
        // Une onde sur deux part de derrière l'iPhone quand il est à l'écran : il semble émettre.
        const b = nees++ % 2 === 0 ? telephone?.getBoundingClientRect() : undefined;
        const duTel = b && b.bottom > 0 && b.top < H ? b : null;
        ondes.push({ x: duTel ? duTel.left + duTel.width / 2 : hasard() * L, y: duTel ? duTel.top + duTel.height * (0.25 + hasard() * 0.5) : hasard() * H, n: t, k: Math.floor(hasard() * 6) });
        prochaine = t + 500 + hasard() * 700;
      }
      while (ondes.length > 0 && t - ondes[0]!.n > VIE) ondes.shift();
    }
    cx.clearRect(0, 0, L, H);
    cx.lineCap = 'round';
    cx.beginPath();
    cx.lineWidth = sombre ? 1.7 : 1.25;
    cx.strokeStyle = sombre ? 'rgba(122, 77, 255, .16)' : 'rgba(28, 21, 48, .5)';
    const proches: { x: number; y: number; ux: number; uy: number; w: number }[] = [];
    const colores: { x: number; y: number; k: number; w: number }[] = [];
    const haut = H + pas;
    for (const p of pts) {
      let bx: number, by: number;
      if (sombre) { bx = p.x + Math.sin(t * 0.0004 + p.p) * 5; by = p.y + Math.cos(t * 0.00034 + p.q) * 5; }
      else {
        // Dérive continue : le point monte (5 à 14 px par seconde) et tourne sur une petite boucle.
        const y0 = p.y - ((t * 0.001 * p.v) % haut);
        bx = p.x + Math.sin(t * 0.0009 + p.p) * p.r;
        by = (y0 < -pas / 2 ? y0 + haut : y0) + Math.cos(t * 0.0011 + p.q) * p.r;
      }
      const dx = bx - mx, dy = by - my, d = Math.hypot(dx, dy) || 1;
      const w = Math.exp(-((d - R) ** 2) / S2);
      if (w >= 0.06) { proches.push({ x: bx, y: by, ux: dx / d, uy: dy / d, w }); continue; }
      let fort = 0, k = 0, ox = 0, oy = 0;
      for (const o of ondes) {
        const age = (t - o.n) / VIE, ex = bx - o.x, ey = by - o.y, e = Math.hypot(ex, ey) || 1;
        const f = Math.exp(-((e - age * 640) ** 2) / 1700) * (1 - age);
        if (f > fort) { fort = f; k = o.k; ox = ex / e; oy = ey / e; }
      }
      if (fort > 0.08) { colores.push({ x: bx + ox * fort * 10, y: by + oy * fort * 10, k, w: fort }); continue; }
      cx.moveTo(bx, by); cx.lineTo(bx + 0.01, by);
    }
    cx.stroke();
    for (const c of colores) {
      cx.strokeStyle = `rgba(${TEINTES[c.k]}, ${(0.4 + c.w * 0.6).toFixed(2)})`;
      cx.lineWidth = 1.3 + c.w * 1.3;
      cx.beginPath(); cx.moveTo(c.x, c.y); cx.lineTo(c.x + 0.01, c.y); cx.stroke();
    }
    for (const { x: bx, y: by, ux, uy, w } of proches) {
      const ecart = sombre ? 22 : 18;
      const x = bx + ux * w * ecart, y = by + uy * w * ecart;
      const l = 1 + w * (sombre ? 3.8 : 2.4);
      if (sombre) {
        const teinte = 252 + Math.sin(Math.atan2(uy, ux) + t * 0.0006) * 48;
        cx.strokeStyle = `hsla(${teinte | 0}, 80%, 66%, ${(0.14 + w * 0.5).toFixed(2)})`;
        cx.lineWidth = 1.5 + w * 0.5;
      } else {
        const tour = (Math.atan2(uy, ux) + t * 0.00012) / TOUR;
        cx.strokeStyle = `rgba(${TEINTES[Math.floor((tour - Math.floor(tour)) * 6) % 6]}, ${((L < 700 ? 0.22 : 0.34) + w * (L < 700 ? 0.42 : 0.6)).toFixed(2)})`;
        cx.lineWidth = 1.15 + w * 0.65;
      }
      cx.beginPath(); cx.moveTo(x - ux * l, y - uy * l); cx.lineTo(x + ux * l, y + uy * l); cx.stroke();
    }
  };
  let dL = L, dH = H, image = 0;
  if (calme) {
    // Une image fixe, redessinée seulement si la fenêtre change de taille.
    ecouter(window, 'resize', () => { construire(); dessiner(0); });
    dessiner(0);
    return;
  }
  ecouter(window, 'resize', () => { if (innerWidth !== dL || Math.abs(innerHeight - dH) > 140) { construire(); dL = L; dH = H; } });
  ecouter(window, 'pointermove', (e: PointerEvent) => {
    tx = e.clientX; ty = e.clientY; actif = true;
    clearTimeout(repos);
    if (e.pointerType !== 'mouse') repos = window.setTimeout(() => { actif = false; }, 1800);
  }, { passive: true });
  ecouter(document, 'pointerleave', () => { actif = false; });
  const boucle = (t: number) => { dessiner(t); image = requestAnimationFrame(boucle); };
  image = requestAnimationFrame(boucle);
  nettoyages.push(() => cancelAnimationFrame(image));
}

export function Vitrine({ bientot }: { bientot: string }) {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const racine = ancre.current?.closest<HTMLElement>('.vitrine');
    if (!racine) return;
    // Mouvement réduit : réglage de l'appareil, ou choix fait dans Réglages (classe posée sur <html> par app/layout.tsx).
    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('mouvement-reduit');
    const nettoyages: (() => void)[] = [];
    const ecouter = (cible: EventTarget, type: string, f: (e: never) => void, o?: AddEventListenerOptions) => {
      cible.addEventListener(type, f as EventListener, o);
      nettoyages.push(() => cible.removeEventListener(type, f as EventListener, o));
    };
    const minuteries = new Set<number>();
    const plusTard = (f: () => void, ms: number) => { const id = window.setTimeout(() => { minuteries.delete(id); f(); }, ms); minuteries.add(id); };

    // Comptes : pas encore de création de compte, on le dit à côté du bouton.
    racine.querySelectorAll<HTMLElement>('[data-compte]').forEach((b) => ecouter(b, 'click', () => {
      const zone = b.closest('.une-texte, .fin')?.querySelector('.info') ?? racine.querySelector('.une-texte .info, .encart-rejoindre .info, .info');
      if (zone) zone.textContent = bientot;
    }));

    // Barre : indicateur calé sur l'onglet survolé ou ayant le focus ; fond plein dès qu'on défile.
    const rail = racine.querySelector<HTMLElement>('.rail');
    const barre = racine.querySelector<HTMLElement>('.barre');
    if (rail) {
      const courant = rail.querySelector<HTMLElement>('[aria-current="page"]');
      const caler = (cible: HTMLElement | null) => {
        const a = cible ?? courant;
        rail.classList.toggle('montre', !!a);
        if (!a) return;
        rail.style.setProperty('--ix', `${a.offsetLeft}px`);
        rail.style.setProperty('--iw', `${a.offsetWidth}px`);
      };
      rail.querySelectorAll<HTMLElement>('a').forEach((a) => { ecouter(a, 'mouseenter', () => caler(a)); ecouter(a, 'focus', () => caler(a)); });
      ecouter(rail, 'mouseleave', () => caler(null));
      ecouter(rail, 'focusout', (e: FocusEvent) => { if (!rail.contains(e.relatedTarget as Node)) caler(null); });
      caler(null);
      document.fonts?.ready.then(() => caler(null));
      requestAnimationFrame(() => rail.classList.add('pret'));
    }
    const majBarre = () => barre?.classList.toggle('defilee', scrollY > 4);
    ecouter(window, 'scroll', majBarre, { passive: true });
    majBarre();

    // Fenêtre : onglets des agents (clic, flèches).
    const onglets = [...racine.querySelectorAll<HTMLElement>('.liste [role="tab"]')];
    const montrer = (i: number, focus = false) => {
      onglets.forEach((o, k) => {
        o.setAttribute('aria-selected', String(k === i));
        o.tabIndex = k === i ? 0 : -1;
        const p = document.getElementById(o.getAttribute('aria-controls') ?? '');
        if (p) p.hidden = k !== i;
      });
      if (focus) onglets[i]?.focus();
    };
    onglets.forEach((o, i) => {
      ecouter(o, 'click', () => montrer(i));
      ecouter(o, 'keydown', (e: KeyboardEvent) => {
        const pas = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
        if (pas) { e.preventDefault(); montrer((i + pas + onglets.length) % onglets.length, true); }
      });
    });

    // Personnages : regarder (-1 gauche, 1 droite), se présenter, se déplacer.
    const regarder = (el: HTMLElement, r: number) => el.style.setProperty('--r', String(r));
    const bande = [...racine.querySelectorAll<HTMLElement>('.bande .perso')];
    const cartes = [...racine.querySelectorAll<HTMLElement>('.agents-grille .perso')];
    let vedette = -1;
    const presenter = (i: number) => { bande.forEach((e, k) => e.classList.toggle('vedette', k === i)); vedette = i; if (bande[i]) regarder(bande[i], 0); };
    // Survol ou focus : l'agent se présente et la présentation automatique attend qu'on quitte la rangée.
    let enMain = false;
    bande.forEach((e, i) => {
      ecouter(e, 'mouseenter', () => { enMain = true; presenter(i); });
      ecouter(e, 'focus', () => { enMain = true; presenter(i); });
    });
    const rangee = racine.querySelector<HTMLElement>('.bande');
    if (rangee) {
      ecouter(rangee, 'mouseleave', () => { enMain = false; });
      ecouter(rangee, 'focusout', (e: FocusEvent) => { if (!rangee.contains(e.relatedTarget as Node)) enMain = false; });
    }

    // Entrée dans le réseau par un agent : le personnage cliqué devient la photo du profil (transition entre pages,
    // nom partagé avec .profil-photo dans globals.css). Le nom est retiré au retour arrière (page gardée en cache).
    const sansNom = () => racine.querySelectorAll<HTMLElement>('.vers-profil').forEach((x) => x.classList.remove('vers-profil'));
    racine.querySelectorAll<HTMLAnchorElement>('a[href^="/comptes/"]').forEach((a) => ecouter(a, 'click', (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      sansNom();
      const img = a.querySelector<HTMLElement>('.corps-img') ?? a.closest('li')?.querySelector<HTMLElement>('.corps-img');
      img?.classList.add('vers-profil');
    }));
    ecouter(window, 'pageshow', sansNom);

    // Apparition au défilement, une seule fois : les agents du bas et tout élément marqué « apparait ».
    const observateur = 'IntersectionObserver' in window && !calme
      ? new IntersectionObserver((entrees) => entrees.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('vue'); observateur?.unobserve(x.target); } }), { rootMargin: '0px 0px -10% 0px' })
      : null;
    racine.querySelectorAll('.agents-grille li, .apparait').forEach((a) => (observateur ? observateur.observe(a) : a.classList.add('vue')));
    if (observateur) nettoyages.push(() => observateur.disconnect());

    champDePoints(racine, ecouter, nettoyages, calme);

    const fin = () => { nettoyages.forEach((f) => f()); minuteries.forEach((id) => clearTimeout(id)); };
    if (calme) return fin;

    const regards = [-1, -0.5, 0, 0.5, 1];
    [...bande, ...cartes].forEach((e, i) => {
      const tourne = () => {
        if (bande.indexOf(e) !== vedette && !e.classList.contains('marche')) regarder(e, regards[Math.floor(hasard() * 5)] ?? 0);
        plusTard(tourne, 1400 + hasard() * 2400);
      };
      plusTard(tourne, 400 + i * 250);
    });
    bande.forEach((e, i) => {
      let pos = 0;
      const marcher = () => {
        const m = innerWidth < 860 ? 10 : 34;
        let cible = Math.round((hasard() * 2 - 1) * m);
        if (Math.abs(cible - pos) < m * 0.4) cible = pos > 0 ? -Math.round(m * 0.6) : Math.round(m * 0.6);
        const duree = Math.max(0.7, Math.abs(cible - pos) / 38);
        e.style.setProperty('--marche', `${duree.toFixed(2)}s`);
        e.style.setProperty('--mx', `${cible}px`);
        e.classList.add('marche');
        if (i !== vedette) regarder(e, cible > pos ? 1 : -1);
        pos = cible;
        plusTard(() => { e.classList.remove('marche'); if (i !== vedette) regarder(e, 0); }, duree * 1000);
        plusTard(marcher, duree * 1000 + 1800 + hasard() * 4200);
      };
      plusTard(marcher, 1200 + i * 700 + hasard() * 1500);
    });
    if (racine.querySelector('[data-accroche]')) {
      // L'accroche qui se réécrit (AccrocheEcrite.tsx) mène la présentation : l'agent dont elle parle s'avance ; -1 : aucun.
      ecouter(racine, 'accroche-agent', (e: CustomEvent<number>) => { if (!enMain) presenter(e.detail); });
    } else {
      let suivant = 0;
      const presentation = window.setInterval(() => { if (enMain) return; presenter(suivant); suivant = (suivant + 1) % bande.length; }, 2600);
      nettoyages.push(() => clearInterval(presentation));
      plusTard(() => presenter(0), 600);
    }
    const logo = racine.querySelector<SVGElement>('.bonhomme');
    const tourneLogo = () => {
      const r = [-1, 0, 1][Math.floor(hasard() * 3)] ?? 0;
      logo?.style.setProperty('--ox', `${r * 9}px`); logo?.style.setProperty('--vx', `${r * 3}px`); logo?.style.setProperty('--rot', `${r * 14}deg`);
      plusTard(tourneLogo, 1600 + hasard() * 1800);
    };
    plusTard(tourneLogo, 900);

    // Curseur flèche (souris seulement) ; le curseur normal revient dès qu'on utilise le clavier.
    const fleche = racine.querySelector<HTMLElement>('.curseur');
    if (fleche && matchMedia('(pointer: fine)').matches) {
      const html = document.documentElement;
      let lx = 0, ly = 0, deja = false;
      ecouter(window, 'pointermove', (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        html.classList.add('curseur-actif');
        const s = fleche.style;
        if (deja) { const dx = e.clientX - lx, dy = e.clientY - ly; if (Math.hypot(dx, dy) > 0.5) s.setProperty('--angle', `${Math.atan2(dy, dx).toFixed(3)}rad`); }
        s.setProperty('--x', `${e.clientX}px`); s.setProperty('--y', `${e.clientY}px`);
        s.setProperty('--echelle', (e.target as Element).closest('a, button') ? '1.35' : '1');
        fleche.classList.add('visible');
        lx = e.clientX; ly = e.clientY; deja = true;
      }, { passive: true });
      ecouter(window, 'keydown', () => { html.classList.remove('curseur-actif'); fleche.classList.remove('visible'); });
      ecouter(document, 'pointerleave', () => fleche.classList.remove('visible'));
      nettoyages.push(() => html.classList.remove('curseur-actif'));
    }

    // L'iPhone de l'accueil (redressement, séquence d'utilisation) est animé par TelephoneAnime.tsx.
    return fin;
  }, [bientot]);

  return <span ref={ancre} hidden />;
}
