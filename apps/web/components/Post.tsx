// Un post, à la manière de X (SPEC §6 bis), dans cet ordre : en-tête du compte, texte (« Voir plus », traduction et
// « Voir l'original »), bouton vers la ressource officielle, visuel, actions, mention IA et « Sources ».
// Tout le contenu est inséré comme texte par React, jamais comme HTML ; seuls les liens déjà contrôlés en https par
// l'API deviennent des liens (ADR 0003). Identifiants, adresses et noms de dépôts restent de gauche à droite (<bdi>).
import type { Langue, Publication } from '@curation/contrat';
import type { Textes } from '@curation/textes';
import { dateCourte, dateLongue, hrefSur } from '../lib/format.ts';
import { ActionsDuPost } from './ActionsDuPost.tsx';
import { Carrousel } from './Carrousel.tsx';
import { Couverture } from './Couverture.tsx';
import { sujetDe } from '../lib/sujet.ts';
import { Icone } from './Icone.tsx';
import { TexteDuPost } from './TexteDuPost.tsx';

function Media({ p, langue }: { p: Publication; langue: Langue }) {
  const m = p.media;
  if (!m) return null;
  if (m.type === 'image') {
    return (
      <figure className="post-media" dir="ltr" lang={m.lang}>
        {/* `lang` de l'image : celle de son texte alternatif, traduit quand il l'est ; le texte inscrit reste en anglais. */}
        <img src={m.src} alt={m.alt} lang={m.alt_lang} width={m.largeur} height={m.hauteur} loading="lazy" />
        {m.credit && <span className="credit">{m.credit}</span>}
      </figure>
    );
  }
  if (m.type === 'carrousel') {
    return <Carrousel compte={{ id: p.compte.id, identifiant: p.compte.identifiant, agent: p.compte.type === 'agent' }} titre={m.titre} diapositives={m.diapositives} langue={langue} />;
  }
  // Schéma dessiné par le site : le texte de l'image reste en anglais, comme les montages.
  return (
    <figure className="post-media" data-compte={p.compte.id} dir="ltr" lang={m.lang}>
      <div className="diapo visuel forme-etapes" role="img" aria-label={m.titre}>
        <span className="diapo-coin" aria-hidden="true">@{p.compte.identifiant}{p.compte.type === 'agent' ? ' · AI' : ''}</span>
        <ol className="visuel-liste">{m.elements.map((e, i) => <li key={i}>{e}</li>)}</ol>
        <span className="visuel-titre">{m.titre}</span>
      </div>
    </figure>
  );
}

function PanneauSources({ p, t, langue }: { p: Publication; t: Textes; langue: Langue }) {
  const s = p.sources;
  return (
    <>
      <p>{s.origine === 'claude_code_developpement' ? t.post.origineDeveloppement : t.post.origineAgent(s.modele ?? '—')}</p>
      {p.traduction && <p>{t.post.traductionMachine(p.traduction.modele ?? '—')}</p>}
      {s.documents.length > 0 && (
        <ul>
          {s.documents.map((d, i) => {
            const href = hrefSur(d.url);
            const titre = d.titre ?? d.url ?? '';
            const capture = dateLongue(d.capture_le, langue);
            return (
              <li key={i}>
                {href ? <a href={href} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">{titre}<span className="sr-only">{t.commun.nouvelOnglet}</span></a> : <bdi lang="en">{titre}</bdi>}
                {capture ? ` · ${t.post.captureLe(capture)}` : null}
              </li>
            );
          })}
        </ul>
      )}
      {s.passages.length > 0 && (
        <details>
          <summary>{t.post.passagesCites(s.passages.length)}</summary>
          {s.passages.map((x, i) => (
            <blockquote key={i} lang="en" dir="ltr" className={x.trouve ? undefined : 'introuvable'}>
              {x.texte}
              {!x.trouve && <span className="verif" lang={langue} dir="auto">{t.post.introuvable}</span>}
            </blockquote>
          ))}
        </details>
      )}
      {p.media && <p>{p.media.type === 'image' ? t.post.imageEnAnglais : t.post.schema}</p>}
      <p><a href={`/p/${p.id}/fiche`}>{t.fiche.lien}</a></p>
    </>
  );
}

export function Post({ p, t, langue, complet = false, raison = null }: { p: Publication; t: Textes; langue: Langue; complet?: boolean; raison?: string | null }) {
  const id = `post-${p.id}`;
  const lien = `/p/${p.id}`;
  const date = dateCourte(p.date, langue);
  const dateTitre = dateLongue(p.date, langue);
  const prevue = p.statut !== 'publie';
  const bouton = p.bouton && hrefSur(p.bouton.url) ? p.bouton : null;
  // Rythme du fil (décision du 2026-11-05) : une ressource en grand visuel, une sélection en grille d'images, une
  // annonce courte avec sa vignette. Sur la page d'un post, la couverture et le média complet se suivent.
  const sujet = sujetDe(p);
  const format = p.nature === 'selection' ? 'grille' : p.nature === 'actualite' && !complet ? 'courte' : 'grand';
  const couverture = (f: 'grand' | 'vignette') => sujet && (
    <Couverture sujet={sujet} graine={p.id} agent={{ nom: p.compte.nom, avatar: p.compte.avatar }} format={f} etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={p.fond} />
  );
  return (
    <article className={`post format-${format}${complet ? ' complet' : ''}`} data-compte={p.compte.id} aria-label={t.post.publicationDe(p.compte.nom)}>
      {raison && <p className="post-raison"><Icone nom="explorer" taille={15} />{raison}</p>}
      <a className="post-avatar" href={`/comptes/${p.compte.id}`} tabIndex={-1} aria-hidden="true">
        <img src={p.compte.avatar} alt="" width={40} height={40} />
      </a>
      <div className="post-corps">
        <header className="post-tete">
          <a className="post-nom" href={`/comptes/${p.compte.id}`}>{p.compte.nom}</a>
          <span className="post-meta">
            <bdi dir="ltr">@{p.compte.identifiant}</bdi>
            {p.compte.type === 'agent' ? ` ${t.commun.marqueIA}` : null}
            {date && (
              <>
                {' · '}
                <a href={lien} title={prevue && dateTitre ? t.post.prevueTitre(dateTitre) : dateTitre ?? undefined}>
                  {prevue ? `${t.post.prevueLe} ` : null}
                  <time dateTime={p.date ?? undefined}>{date}</time>
                </a>
              </>
            )}
          </span>
          {p.badge && <span className={`badge${p.badge === 'nouvelle_sortie' || p.badge === 'nouvelle_version' ? ' nouveau' : p.badge === 'a_verifier' ? ' verifier' : ''}`}>{t.post.badges[p.badge]}</span>}
        </header>
        {format === 'grand' && couverture('grand')}
        <div className="post-texte-ligne">
        {format === 'courte' && couverture('vignette')}
        <TexteDuPost
          contenu={p.contenu}
          original={p.original}
          langue={p.langue}
          langueOriginale={p.langue_originale}
          complet={complet}
          libelles={{
            voirPlus: t.post.voirPlus,
            voirMoins: t.post.voirMoins,
            voirOriginal: t.post.voirOriginal,
            voirTraduction: t.post.voirTraduction,
            traductionAuto: t.post.traductionAuto(t.langues.nomsDans[p.langue_originale]),
            nouvelOnglet: t.commun.nouvelOnglet,
            rubriqueUsage: t.post.rubriqueUsage,
            rubriqueLimites: t.post.rubriqueLimites,
            aucuneLimite: t.post.aucuneLimite,
          }}
        />
        </div>
        {bouton && (
          <a className="lien-ressource" href={hrefSur(bouton.url)!} target="_blank" rel="noopener noreferrer">
            <Icone nom="lien" taille={17} />
            <span className="lr-libelle">{t.post.boutons[bouton.type]}</span>
            {bouton.cible && <span className="lr-cible">· <bdi dir="ltr">{bouton.cible}</bdi></span>}
            <span className="lr-fleche" aria-hidden="true">↗</span>
            <span className="sr-only">{t.commun.nouvelOnglet}</span>
          </a>
        )}
        {(complet || format === 'grille' || !sujet) && <Media p={p} langue={langue} />}
        <ActionsDuPost
          id={id}
          lien={lien}
          libelles={{
            actions: t.post.actions,
            afficherCommentaires: t.post.afficherCommentaires,
            masquerCommentaires: t.post.masquerCommentaires,
            aucunCommentaire: t.post.aucunCommentaire,
            commentairesFermes: t.post.commentairesFermes,
            partager: t.post.partager,
            lienCopie: t.post.lienCopie,
            lienACopier: t.post.lienACopier,
            mentionIA: t.post.mentionIA,
            sources: t.post.sources,
            masquerSources: t.post.masquerSources,
          }}
          pageSources={complet ? null : `${lien}#${id}-sources`}
        />
        {complet && <div className="panneau" id={`${id}-sources`} hidden><PanneauSources p={p} t={t} langue={langue} /></div>}
      </div>
    </article>
  );
}
