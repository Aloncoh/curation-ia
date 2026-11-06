'use client';
// Animations et interactions de l'accueil (app/page.tsx), reprises de la maquette `maquette/accueil.html` : champ de
// particules autour du pointeur, curseur flèche, indicateur de la barre calé sur l'onglet, barre pleine au défilement,
// personnages qui regardent, se présentent tour à tour et se déplacent, onglets de la fenêtre, boutons de compte (bientôt).
// Tout s'arrête si l'appareil demande moins de mouvement ; le curseur normal revient dès qu'on navigue au clavier.
import { useEffect, useRef } from 'react';

const hasard = Math.random;

export function Vitrine({ bientot }: { bientot: string }) {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const racine = ancre.current?.closest<HTMLElement>('.vitrine');
    if (!racine) return;
    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nettoyages: (() => void)[] = [];
    const ecouter = (cible: EventTarget, type: string, f: (e: never) => void, o?: AddEventListenerOptions) => {
      cible.addEventListener(type, f as EventListener, o);
      nettoyages.push(() => cible.removeEventListener(type, f as EventListener, o));
    };
    const minuteries = new Set<number>();
    const plusTard = (f: () => void, ms: number) => { const id = window.setTimeout(() => { minuteries.delete(id); f(); }, ms); minuteries.add(id); };

    // Comptes : pas encore de création de compte, on le dit à côté du bouton.
    racine.querySelectorAll<HTMLElement>('[data-compte]').forEach((b) => ecouter(b, 'click', () => {
      const zone = b.closest('.une-texte, .fin, .fil-agents')?.querySelector('.info') ?? racine.querySelector('.une-texte .info, .info');
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
    bande.forEach((e, i) => { ecouter(e, 'click', () => presenter(i)); ecouter(e, 'mouseenter', () => presenter(i)); });

    // Agents du bas qui apparaissent au défilement.
    const observateur = 'IntersectionObserver' in window && !calme
      ? new IntersectionObserver((entrees) => entrees.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('vue'); observateur?.unobserve(x.target); } }), { rootMargin: '0px 0px -10% 0px' })
      : null;
    racine.querySelectorAll('.agents-grille li').forEach((a) => (observateur ? observateur.observe(a) : a.classList.add('vue')));
    if (observateur) nettoyages.push(() => observateur.disconnect());

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
    let suivant = 0;
    const presentation = window.setInterval(() => { presenter(suivant); suivant = (suivant + 1) % bande.length; }, 2600);
    nettoyages.push(() => clearInterval(presentation));
    plusTard(() => presenter(0), 600);
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

    // Champ de particules façon Antigravity : grille irrégulière de petits traits pâles ; autour du pointeur, un anneau
    // les écarte, les allonge et les oriente vers l'extérieur. Sans souris, l'anneau se promène seul.
    const toile = racine.querySelector<HTMLCanvasElement>('.particules');
    const cx = toile?.getContext('2d');
    if (toile && cx) {
      let L = 0, H = 0;
      let pts: { x: number; y: number; p: number; q: number }[] = [];
      const construire = () => {
        const dpr = Math.min(2, devicePixelRatio || 1);
        L = innerWidth; H = innerHeight;
        toile.width = L * dpr; toile.height = H * dpr;
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pas = L < 700 ? 40 : 46;
        pts = [];
        for (let y = pas / 2; y < H + pas; y += pas) for (let x = pas / 2; x < L + pas; x += pas) {
          pts.push({ x: x + (hasard() - 0.5) * pas * 0.9, y: y + (hasard() - 0.5) * pas * 0.9, p: hasard() * 6.28, q: hasard() * 6.28 });
        }
      };
      construire();
      let dL = L, dH = H;
      ecouter(window, 'resize', () => { if (innerWidth !== dL || Math.abs(innerHeight - dH) > 140) { construire(); dL = L; dH = H; } });
      let mx = L * 0.5, my = H * 0.4, tx = mx, ty = my, actif = false, repos = 0;
      ecouter(window, 'pointermove', (e: PointerEvent) => {
        tx = e.clientX; ty = e.clientY; actif = true;
        clearTimeout(repos);
        if (e.pointerType !== 'mouse') repos = window.setTimeout(() => { actif = false; }, 1800);
      }, { passive: true });
      ecouter(document, 'pointerleave', () => { actif = false; });
      let image = 0;
      const dessiner = (t: number) => {
        if (!actif) { tx = L * 0.5 + Math.cos(t * 0.00021) * L * 0.3; ty = H * 0.42 + Math.sin(t * 0.00029) * H * 0.24; }
        mx += (tx - mx) * 0.09; my += (ty - my) * 0.09;
        const R = (L < 700 ? 100 : 150) + Math.sin(t * 0.0013) * 12;
        const S2 = 2 * 72 * 72;
        cx.clearRect(0, 0, L, H);
        cx.lineCap = 'round';
        cx.beginPath();
        cx.lineWidth = 1.7;
        cx.strokeStyle = 'rgba(122, 77, 255, .16)';
        const proches: { x: number; y: number; ux: number; uy: number; w: number }[] = [];
        for (const p of pts) {
          const bx = p.x + Math.sin(t * 0.0004 + p.p) * 5, by = p.y + Math.cos(t * 0.00034 + p.q) * 5;
          const dx = bx - mx, dy = by - my, d = Math.hypot(dx, dy) || 1;
          const w = Math.exp(-((d - R) ** 2) / S2);
          if (w < 0.06) { cx.moveTo(bx, by); cx.lineTo(bx + 0.01, by); continue; }
          proches.push({ x: bx, y: by, ux: dx / d, uy: dy / d, w });
        }
        cx.stroke();
        for (const { x: bx, y: by, ux, uy, w } of proches) {
          const x = bx + ux * w * 22, y = by + uy * w * 22;
          const l = 1 + w * 3.8;
          const teinte = 252 + Math.sin(Math.atan2(uy, ux) + t * 0.0006) * 48;
          cx.strokeStyle = `hsla(${teinte | 0}, 80%, 66%, ${(0.14 + w * 0.5).toFixed(2)})`;
          cx.lineWidth = 1.5 + w * 0.5;
          cx.beginPath(); cx.moveTo(x - ux * l, y - uy * l); cx.lineTo(x + ux * l, y + uy * l); cx.stroke();
        }
      };
      const boucle = (t: number) => { dessiner(t); image = requestAnimationFrame(boucle); };
      image = requestAnimationFrame(boucle);
      nettoyages.push(() => cancelAnimationFrame(image));
    }

    return fin;
  }, [bientot]);

  return <span ref={ancre} hidden />;
}
