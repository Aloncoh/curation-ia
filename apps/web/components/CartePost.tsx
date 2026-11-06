// Un post du fil en carte (2026-11-06, demande de l'utilisateur : le fil reprend l'accueil) : la carte de la fenêtre de
// l'accueil. En-tête de l'agent et « ✓ Publié », titre, couverture encadrée, début du texte, les étapes (source,
// citations retrouvées mot pour mot, contrôles, publication), boutons en pilule « Voir le post » et vers la source,
// mention IA. Le texte complet, l'original et les sources détaillées restent sur la page du post.
// Contenu inséré comme texte par React, jamais comme HTML ; liens seulement en https contrôlé (ADR 0003).
import type { CSSProperties } from 'react';
import type { Langue, Publication } from '@curation/contrat';
import type { Textes } from '@curation/textes';
import { dateCourte, hrefSur } from '../lib/format.ts';
import { PERSONNAGES } from '../lib/personnages.ts';
import { sujetDe } from '../lib/sujet.ts';
import { Couverture } from './Couverture.tsx';

type Style = CSSProperties & Record<`--${string}`, string>;

const paragraphe = (p: Publication, cle: string) => p.contenu.find((b) => b.type === 'paragraphe' && b.cle === cle);

function domaine(url: string | null | undefined): string | null {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : null; } catch { return null; }
}

export function CartePost({ p, t, langue, raison = null }: { p: Publication; t: Textes; langue: Langue; raison?: string | null }) {
  const v = t.vitrine;
  const lien = `/p/${p.id}`;
  const titre = paragraphe(p, 'accroche');
  const texte = paragraphe(p, 'description');
  const sujet = sujetDe(p);
  const publie = p.statut === 'publie';
  const date = dateCourte(p.date, langue);
  const bouton = p.bouton && hrefSur(p.bouton.url) ? p.bouton : null;
  const source = domaine(bouton?.url ?? p.sources.documents[0]?.url);
  const trouves = p.sources.passages.filter((x) => x.trouve).length;
  const couleur = PERSONNAGES.find((x) => x.id === p.compte.id)?.couleur ?? '#7a4dff';
  return (
    <article className="carte-post" data-compte={p.compte.id} aria-label={t.post.publicationDe(p.compte.nom)} style={{ '--c': couleur } as Style}>
      {raison && <p className="cp-raison">{raison}</p>}
      <header className="cp-tete">
        <a className="cp-agent" href={`/comptes/${p.compte.id}`}>
          <img src={p.compte.avatar} alt="" width={30} height={30} />
          <b>{p.compte.nom}</b>
        </a>
        {date && <time dateTime={p.date ?? undefined}>{date}</time>}
        <span className={`fait${publie ? '' : ' prevu'}`}>{publie ? `✓ ${v.publie}` : `${t.post.prevueLe} ${date ?? ''}`}</span>
      </header>

      <a className="cp-titre" href={lien} lang={p.langue}>{titre?.texte}</a>
      {sujet && (
        <a className="toile" href={lien} tabIndex={-1} aria-hidden="true">
          <Couverture sujet={sujet} graine={p.id} agent={{ nom: p.compte.nom, avatar: p.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={p.fond} />
        </a>
      )}
      {texte && <p className="cp-texte" lang={p.langue}>{texte.texte}</p>}
      {p.traduction && <p className="cp-note">{t.post.traductionAuto(t.langues.nomsDans[p.langue_originale])}</p>}

      {/* Validité dans le temps (SPEC §7.16) : avis calculés par l'API, jamais une correction automatique. */}
      {p.validite.remplacee_par && (
        <p className="avis-validite" role="note">
          {t.post.remplaceePar(p.validite.remplacee_par.version)} <a href={`/p/${p.validite.remplacee_par.id}`}>{t.post.voirVersionRecente}</a>
        </p>
      )}
      {p.validite.source_mise_a_jour && (
        <p className="avis-validite" role="note">{t.post.sourceMiseAJour(dateCourte(p.validite.source_mise_a_jour, langue) ?? p.validite.source_mise_a_jour.slice(0, 10))}</p>
      )}

      <ul className="etapes">
        {source && <li><b>{v.etapes.source}</b> <span>→ <bdi dir="ltr">{source}</bdi></span></li>}
        {trouves > 0 && <li><b>{v.etapes.citations}</b> <span>→ {v.citations(trouves)}</span></li>}
        {publie && <li><b>{v.etapes.controles}</b> <span>→ {v.etapes.controlesOk}</span></li>}
        {publie && date && <li><b>{v.etapes.publie}</b> <span>→ {date}</span></li>}
      </ul>

      <div className="cp-actions">
        <a className="lien" href={lien}><img src={p.compte.avatar} alt="" width={20} height={20} />{v.voirPost}</a>
        {bouton && (
          <a className="lien" href={hrefSur(bouton.url)!} target="_blank" rel="noopener noreferrer">
            {t.post.boutons[bouton.type]} <span aria-hidden="true">↗</span><span className="sr-only">{t.commun.nouvelOnglet}</span>
          </a>
        )}
      </div>
      <p className="cp-mention">{t.post.mentionIA}</p>
    </article>
  );
}
