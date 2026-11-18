'use client';
// iPhone de l'accueil (app/page.tsx, styles : app/telephone.css) : une vraie séquence d'utilisation, jouée en boucle
// (demande du 2026-11-18 : « j'aimerais une vraie animation d'utilisation avec la barre noire au-dessus de l'iPhone »).
// Un doigt (pastille translucide) fait défiler le fil d'un geste, la liste continue sur son élan ; il touche un post,
// la fiche glisse depuis le bord comme sur iOS et l'îlot noir du haut s'élargit avec l'agent ; il fait défiler la
// fiche, touche le cœur, revient en arrière, et passe au post suivant. Tout le contenu est celui des vrais posts.
// La séquence attend quand le téléphone sort de l'écran, quand l'onglet est caché ou quand la souris est dessus.
// L'heure de la barre du haut est l'heure réelle. À l'arrivée dans l'écran, le téléphone couché se redresse.
// Mouvement réduit : seule l'heure est mise à jour, l'écran se fait défiler à la main.
import { useEffect, useRef } from 'react';

const borne = (x: number) => Math.min(1, Math.max(0, x));

export function TelephoneAnime() {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const racine = ancre.current?.closest<HTMLElement>('.vitrine');
    const tel = racine?.querySelector<HTMLElement>('.tel');
    const section = tel?.closest<HTMLElement>('.iphone');
    if (!tel || !section) return;
    const nettoyages: (() => void)[] = [];
    const fin = () => nettoyages.forEach((f) => f());

    // Barre du haut : l'heure réelle, comme sur un téléphone.
    const heure = tel.querySelector<HTMLElement>('.tel-heure');
    const majHeure = () => { const d = new Date(); if (heure) heure.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
    majHeure();
    const horloge = window.setInterval(majHeure, 20000);
    nettoyages.push(() => clearInterval(horloge));

    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('mouvement-reduit');
    if (calme) return fin;

    // À l'arrivée dans l'écran : couché en arrière et un peu plus petit, il se redresse à mesure qu'on descend (lié au
    // défilement, sans durée propre). La position se lit sur la section, que rien ne transforme.
    let prevu = 0;
    const redresser = () => {
      prevu = 0;
      const k = borne((innerHeight - section.getBoundingClientRect().top) / (innerHeight * 0.8));
      const e = 1 - (1 - k) ** 3;
      tel.style.transform = e >= 1 ? '' : `perspective(1400px) translateY(${((1 - e) * 46).toFixed(1)}px) rotateX(${((1 - e) * 24).toFixed(2)}deg) scale(${(0.86 + 0.14 * e).toFixed(3)})`;
    };
    const demander = () => { if (!prevu) prevu = requestAnimationFrame(redresser); };
    addEventListener('scroll', demander, { passive: true });
    addEventListener('resize', demander);
    redresser();
    nettoyages.push(() => { removeEventListener('scroll', demander); removeEventListener('resize', demander); cancelAnimationFrame(prevu); tel.style.transform = ''; });

    const pile = tel.querySelector<HTMLElement>('.tel-pile');
    const ecran = tel.querySelector<HTMLElement>('.tel-ecran');
    const detail = tel.querySelector<HTMLElement>('.tel-detail');
    const doigt = tel.querySelector<HTMLElement>('.tel-doigt');
    const ilot = tel.querySelector<HTMLElement>('.tel-ilot');
    const cartes = ecran ? [...ecran.querySelectorAll<HTMLElement>('.tel-carte')] : [];
    if (!pile || !ecran || !detail || !doigt || !ilot || cartes.length < 2) return fin;

    ecran.classList.add('joue');
    let vivant = true, retenu = false, image = 0;
    const attentes = new Set<number>();
    const pause = (ms: number) => new Promise<void>((r) => { const id = window.setTimeout(() => { attentes.delete(id); r(); }, ms); attentes.add(id); });
    const visible = () => { const b = tel.getBoundingClientRect(); return !document.hidden && b.bottom > innerHeight * 0.25 && b.top < innerHeight * 0.75; };
    /** Attend, puis reste en attente tant que le téléphone n'est pas regardé ou que la souris est dessus. */
    const dormir = async (ms: number) => { await pause(ms); while (vivant && (retenu || !visible())) await pause(300); };
    /** Fait avancer `f` de 0 à 1 sur `duree` millisecondes, une image à la fois. */
    const anime = (duree: number, f: (k: number) => void) => new Promise<void>((r) => {
      const t0 = performance.now();
      const pas = (t: number) => { if (!vivant) { r(); return; } const k = borne((t - t0) / duree); f(k); if (k < 1) image = requestAnimationFrame(pas); else r(); };
      image = requestAnimationFrame(pas);
    });
    const surTel = (e: PointerEvent) => { if (e.pointerType === 'mouse') retenu = true; };
    const horsTel = () => { retenu = false; };
    tel.addEventListener('pointerenter', surTel);
    tel.addEventListener('pointerleave', horsTel);

    // Le doigt : position dans la pile (en pixels de la pile, même quand le téléphone est encore incliné).
    const poser = (x: number, y: number, taille: number, opacite: number) => { doigt.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${taille.toFixed(3)})`; doigt.style.opacity = opacite.toFixed(2); };
    const dans = (el: HTMLElement, fx: number, fy: number, plafond = Infinity): [number, number] => {
      const p = pile.getBoundingClientRect(), c = el.getBoundingClientRect(), f = p.width / pile.offsetWidth || 1;
      return [(c.left + c.width * fx - p.left) / f, (c.top + Math.min(c.height * fy, plafond * f) - p.top) / f];
    };

    /** Un geste de défilement : le doigt se pose, entraîne la liste en accélérant, la lâche, et elle finit sur son élan. */
    const glisser = async (liste: HTMLElement, distance: number) => {
      const de = liste.scrollTop, d = Math.min(liste.scrollHeight - liste.clientHeight, de + distance) - de;
      if (d < 6) return;
      const [x, y] = dans(liste, 0.64, 0.74), tire = d * 0.62, reste = d - tire;
      await anime(150, (k) => poser(x, y, 1.3 - 0.45 * k, k));
      await anime(360, (k) => { liste.scrollTop = de + tire * k * k; poser(x, y - tire * k * k, 0.85, 1); });
      // Même vitesse au lâcher : 2·tire/360 = 3·reste/durée.
      await anime(Math.max(240, (540 * reste) / tire), (k) => { liste.scrollTop = de + tire + reste * (1 - (1 - k) ** 3); poser(x, y - tire - 12 * k, 0.85 + 0.4 * k, 1 - borne(k * 3)); });
    };
    /** Un toucher : le doigt se pose, la cible s'enfonce, l'action part au relâchement. */
    const toucher = async (cible: HTMLElement, action: () => void) => {
      const [x, y] = dans(cible, 0.5, 0.5, 90);
      await anime(170, (k) => poser(x, y, 1.3 - 0.45 * k, k));
      cible.classList.add('presse');
      await pause(120);
      cible.classList.remove('presse');
      action();
      await anime(200, (k) => poser(x, y, 0.85 + 0.4 * k, 1 - k));
    };

    void (async () => {
      await dormir(1200);
      for (let rang = 1; vivant; rang++) {
        // Après quelques posts, retour en haut du fil d'un seul mouvement.
        if (rang >= Math.min(cartes.length, 6)) {
          const de = ecran.scrollTop;
          await anime(700, (k) => { ecran.scrollTop = de * (1 - k) ** 3; });
          rang = 0;
          await dormir(1100);
        }
        const carte = cartes[rang]!;
        await glisser(ecran, Math.max(0, carte.offsetTop - 10) - ecran.scrollTop);
        await dormir(1000);
        const fiche = detail.querySelector<HTMLElement>(`[data-detail="${carte.dataset.post}"]`);
        if (!fiche || !vivant) continue;
        const corps = fiche.querySelector<HTMLElement>('.tel-fiche-corps');
        const coeur = fiche.querySelector<HTMLElement>('.tel-jaime');
        const retour = fiche.querySelector<HTMLElement>('.tel-retour');
        await toucher(carte, () => {
          detail.querySelectorAll('.tel-fiche.actif').forEach((x) => x.classList.remove('actif'));
          fiche.classList.add('actif');
          if (corps) corps.scrollTop = 0;
          coeur?.classList.remove('aime');
          detail.classList.add('ouvert');
          pile.classList.add('detail');
          // L'îlot du haut s'élargit avec l'agent du post ouvert.
          const img = ilot.querySelector('img'), nom = ilot.querySelector('span');
          if (img && carte.dataset.avatar) img.src = carte.dataset.avatar;
          if (nom) nom.textContent = carte.dataset.nom ?? '';
          ilot.style.setProperty('--c', carte.style.getPropertyValue('--c'));
          ilot.classList.add('actif');
        });
        await dormir(1500);
        if (corps) { await glisser(corps, 170); await dormir(1200); }
        if (coeur) { await toucher(coeur, () => coeur.classList.add('aime')); await dormir(1200); }
        if (retour) await toucher(retour, () => { detail.classList.remove('ouvert'); pile.classList.remove('detail'); ilot.classList.remove('actif'); });
        await dormir(1300);
      }
    })();

    nettoyages.push(() => {
      vivant = false;
      attentes.forEach((id) => clearTimeout(id));
      cancelAnimationFrame(image);
      tel.removeEventListener('pointerenter', surTel);
      tel.removeEventListener('pointerleave', horsTel);
      ecran.classList.remove('joue');
      detail.classList.remove('ouvert'); pile.classList.remove('detail'); ilot.classList.remove('actif');
      doigt.style.opacity = '0';
    });
    return fin;
  }, []);

  return <span ref={ancre} hidden />;
}
