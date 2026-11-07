'use client';
// Recherche interactive (2026-11-07, demande de l'utilisateur : « quelque chose de plus interactif, comme des
// propositions ») : pendant la frappe, les publications qui correspondent s'affichent sous le champ (API v1, même moteur
// que la page de résultats), au clavier comme à la souris ; Entrée lance la recherche complète. Sous le champ, les sujets
// du moment en raccourcis. La requête n'est jamais enregistrée.
import { useEffect, useId, useState } from 'react';
import type { Langue, ReponseRecherche } from '@curation/contrat';

export interface LibellesRecherche {
  champ: string;
  indice: string;
  propositions: string;
  sujets: string;
  aucune: string;
  rechercher: string;
}

interface Proposition { id: number; titre: string; nom: string; avatar: string }

export function RechercheVivante({ requete, langue, sujets, l }: { requete: string; langue: Langue; sujets: string[]; l: LibellesRecherche }) {
  const [q, setQ] = useState(requete);
  const [propositions, setPropositions] = useState<Proposition[] | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const liste = useId();

  useEffect(() => {
    const texte = q.trim();
    if (texte.length < 2) { setPropositions(null); return; }
    const arret = new AbortController();
    const minuteur = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/recherche?${new URLSearchParams({ q: texte, limite: '6', langue })}`, { signal: arret.signal });
        if (!r.ok) { setPropositions([]); return; }
        const page = (await r.json()) as ReponseRecherche;
        setPropositions(page.resultats.map(({ publication: p }) => ({
          id: p.id,
          titre: p.contenu.find((b) => b.type === 'paragraphe' && b.cle === 'accroche')?.texte ?? p.compte.nom,
          nom: p.compte.nom,
          avatar: p.compte.avatar,
        })));
        setActif(-1);
      } catch { /* requête remplacée par la suivante */ }
    }, 180);
    return () => { clearTimeout(minuteur); arret.abort(); };
  }, [q, langue]);

  const visibles = ouvert && propositions !== null;
  return (
    <div className="recherche-vivante">
      <form action="/recherche" role="search" className="rv-champ" onSubmit={(e) => {
        const choisie = actif >= 0 ? propositions?.[actif] : undefined;
        if (visibles && choisie) { e.preventDefault(); window.location.href = `/p/${choisie.id}`; }
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          type="search" name="q" value={q} maxLength={200} autoComplete="off" autoFocus={!requete}
          placeholder={l.indice} aria-label={l.champ} role="combobox" aria-expanded={visibles} aria-controls={liste}
          aria-activedescendant={visibles && actif >= 0 ? `${liste}-${actif}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(e) => {
            const n = propositions?.length ?? 0;
            if (e.key === 'ArrowDown' && n) { e.preventDefault(); setOuvert(true); setActif((a) => (a + 1) % n); }
            else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setActif((a) => (a <= 0 ? n - 1 : a - 1)); }
            else if (e.key === 'Escape') setOuvert(false);
          }}
        />
        <button type="submit">{l.rechercher}</button>
      </form>
      {visibles && (
        <div className="rv-propositions">
          <p className="rv-titre">{l.propositions}</p>
          {propositions.length === 0 ? (
            <p className="rv-vide">{l.aucune}</p>
          ) : (
            <ul id={liste} role="listbox" aria-label={l.propositions}>
              {propositions.map((p, i) => (
                <li key={p.id} id={`${liste}-${i}`} role="option" aria-selected={i === actif}>
                  <a href={`/p/${p.id}`} onMouseEnter={() => setActif(i)}>
                    <img src={p.avatar} alt="" width={28} height={28} />
                    <span><b>{p.titre}</b><small>{p.nom}</small></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {sujets.length > 0 && (
        <nav className="rv-sujets" aria-label={l.sujets}>
          <span>{l.sujets}</span>
          {sujets.map((s) => <a key={s} href={`/recherche?${new URLSearchParams({ q: s })}`} aria-current={s === requete ? 'page' : undefined}>{s}</a>)}
        </nav>
      )}
    </div>
  );
}
