'use client';
// Accroche de l'accueil qui se réécrit comme une réponse de ChatGPT (demande du 2026-11-17 : « l'écriture en haut je
// veux qu'elle se réécrit comme dans ChatGPT ») : un point rond bat, le texte arrive par petits paquets de lettres à
// vitesse irrégulière, le point disparaît, puis le texte s'efface et la phrase suivante s'écrit. D'abord l'accroche du
// site, puis chaque agent et ce qu'il couvre : l'agent dont on parle s'avance dans la rangée (évènement
// « accroche-agent », écouté par Vitrine.tsx). Aucun texte nouveau : ce sont ceux que le site affiche déjà.
// La phrase entière est toujours dans la page, sa suite seulement cachée : les retours à la ligne ne bougent donc pas
// pendant l'écriture. Mouvement réduit ou pas de script : la première phrase reste affichée, immobile.
import { useEffect, useRef } from 'react';

export interface Phrase { fort: string; suite: string; agent?: number }

export function AccrocheEcrite({ phrases }: { phrases: Phrase[] }) {
  const boite = useRef<HTMLParagraphElement>(null);
  const cle = JSON.stringify(phrases);

  useEffect(() => {
    const el = boite.current;
    const liste = JSON.parse(cle) as Phrase[];
    if (!el) return;
    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('mouvement-reduit');
    const ecrit = el.querySelector<HTMLElement>('.ecrit');
    const [fortVu, fortReste, suiteVu, suiteReste] = ['fv', 'fr', 'sv', 'sr'].map((r) => el.querySelector<HTMLElement>(`[data-r="${r}"]`));
    const point = el.querySelector<HTMLElement>('.point');
    if (calme || liste.length === 0 || !ecrit || !fortVu || !fortReste || !suiteVu || !suiteReste || !point) { el.classList.add('ecrit-pret'); return; }

    let vivant = true;
    const attentes = new Set<number>();
    const dormir = (ms: number) => new Promise<void>((r) => { const id = window.setTimeout(() => { attentes.delete(id); r(); }, ms); attentes.add(id); });
    const racine = el.closest('.vitrine');

    void (async () => {
      for (let n = 0; vivant; n++) {
        const p = liste[n % liste.length]!;
        const parties: [HTMLElement, HTMLElement, string][] = [[fortVu, fortReste, p.fort], [suiteVu, suiteReste, p.suite ? ` ${p.suite}` : '']];
        for (const [vu, reste, texte] of parties) { vu.textContent = ''; reste.textContent = texte; }
        fortVu.after(point);
        ecrit.classList.remove('ecrit-efface');
        ecrit.classList.add('ecrit-point');
        el.classList.add('ecrit-pret');
        racine?.dispatchEvent(new CustomEvent('accroche-agent', { detail: p.agent ?? -1 }));
        // Le point bat un instant avant la première lettre, comme une réponse qui se prépare.
        await dormir(n === 0 ? 450 : 380);
        for (const [vu, reste, texte] of parties) {
          vu.after(point);
          for (let i = 0; vivant && i < texte.length;) {
            i = Math.min(texte.length, i + 1 + Math.floor(Math.random() * 4));
            vu.textContent = texte.slice(0, i);
            reste.textContent = texte.slice(i);
            await dormir(18 + Math.random() * 34);
          }
        }
        if (!vivant) return;
        ecrit.classList.remove('ecrit-point');
        await dormir(p.agent === undefined ? 5200 : 2800);
        if (!vivant) return;
        ecrit.classList.add('ecrit-efface');
        await dormir(260);
      }
    })();

    return () => { vivant = false; attentes.forEach((id) => clearTimeout(id)); };
  }, [cle]);

  const premiere = phrases[0];
  if (!premiere) return null;
  return (
    <p className="accroche" ref={boite} data-accroche>
      <span className="sr">{premiere.fort} {premiere.suite}</span>
      {/* Une copie cachée de chaque phrase réserve la hauteur de la plus longue : rien ne saute sous le texte. */}
      {phrases.map((p, i) => <span key={i} className="fantome" aria-hidden="true"><b>{p.fort}</b> {p.suite}</span>)}
      <span className="ecrit" aria-hidden="true">
        <b data-r="fv">{premiere.fort}</b><b data-r="fr" className="a-venir" /><span data-r="sv">{premiere.suite ? ` ${premiere.suite}` : ''}</span><span data-r="sr" className="a-venir" /><i className="point" />
      </span>
    </p>
  );
}
