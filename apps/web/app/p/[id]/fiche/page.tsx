// Fiche d'approfondissement (SPEC §6) : ce qui change, accès, coût, limites, détails, benchmarks attribués, questions
// à tester, démarrage et commande citée, licence (« Non renseigné » si inconnue), dépôt daté, versions du produit et
// historique des révisions. Le texte rédigé est traduit comme le post, avec « Voir l'original ».
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { Fiche, SectionFiche } from '@curation/contrat';
import { LOCALE_INTL, sensDe, textesDe, type Langue, type Textes } from '@curation/textes';
import { fiche } from '../../../../../../src/api/v1/index.ts';
import { BarreRetour, Cadre, Vide } from '../../../../components/Cadre.tsx';
import { BasculeOriginal } from '../../../../components/TexteDuPost.tsx';
import { dateLongue, hrefSur } from '../../../../lib/format.ts';
import { contexte } from '../../../../lib/serveur.ts';

type Parametres = { params: Promise<{ id: string }> };
const identifiant = (brut: string) => (/^\d{1,9}$/.test(brut) ? Number(brut) : 0);
const LISTES = new Set<SectionFiche['id']>(['questions_a_tester', 'demarrage', 'compatibilites', 'limites', 'attributions', 'details']);

export async function generateMetadata({ params }: Parametres): Promise<Metadata> {
  const ctx = await contexte();
  const f = await fiche(ctx, identifiant((await params).id));
  const t = textesDe(ctx.langue);
  return { title: f ? `${t.fiche.titre} · ${f.publication.compte.nom}` : t.fiche.introuvable };
}

function Sections({ sections, f, t, langue, ui }: { sections: SectionFiche[]; f: Fiche; t: Textes; langue: Langue; ui: Langue }) {
  const interface_ = { lang: ui, dir: sensDe(ui) };
  return (
    <div className="fiche-sections">
      {sections.map((s) => (
        <section key={s.id} className="fiche-section">
          {/* Titre dans la langue de l'interface ; contenu dans sa propre langue et son propre sens d'écriture. */}
          <h3>{t.fiche.sections[s.id]}</h3>
          <div lang={langue} dir={sensDe(langue)}>
          {!LISTES.has(s.id) ? (
            s.elements.map((e) => <p key={e.cle}>{e.texte}</p>)
          ) : s.id === 'details' ? (
            s.elements.map((e) => (
              <div key={e.cle} className="fiche-detail">
                {e.titre && <h4>{e.titre}</h4>}
                <p>{e.texte}</p>
              </div>
            ))
          ) : (
            <ul className={s.id === 'demarrage' ? 'fiche-etapes' : 'fiche-liste'}>
              {s.elements.map((e) => (
                <li key={e.cle}>
                  {e.texte}
                  {s.id === 'attributions' && e.titre && <span className="fiche-note" {...interface_}>{t.fiche.benchmarkAttribue(e.titre)}</span>}
                  {e.complement && <span className="fiche-note">{t.fiche.conditions} : {e.complement}</span>}
                </li>
              ))}
            </ul>
          )}
          {s.id === 'demarrage' && f.commande && (
            <>
              <pre className="fiche-commande" dir="ltr" lang="en" tabIndex={0}><code>{f.commande}</code></pre>
              <p className="fiche-note" {...interface_}>{t.fiche.mentionCommande}</p>
            </>
          )}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function PageFiche({ params }: Parametres) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const id = identifiant((await params).id);
  const f = await fiche(ctx, id);
  if (!f) {
    return (
      <Cadre langue={ctx.langue} rubrique={null}>
        <BarreRetour titre={t.fiche.titre} langue={ctx.langue} />
        <Vide titre={t.fiche.introuvable} texte={t.publication.introuvableMessage} />
      </Cadre>
    );
  }
  const p = f.publication;
  const nombre = new Intl.NumberFormat(LOCALE_INTL[ctx.langue]);
  const faits: ReactNode[] = [];
  if (f.licence) faits.push(<li key="licence"><strong>{t.fiche.licence}</strong> · {f.licence.valeur ? <bdi dir="ltr">{f.licence.valeur}</bdi> : t.fiche.nonRenseigne}</li>);
  if (f.depot) {
    const href = hrefSur(f.depot.url);
    const au = dateLongue(f.depot.etoiles_au, ctx.langue);
    faits.push(
      <li key="depot">
        <strong>{t.fiche.depot}</strong> · {href ? <a href={href} target="_blank" rel="noopener noreferrer"><bdi dir="ltr">{f.depot.nom}</bdi><span className="sr-only">{t.commun.nouvelOnglet}</span></a> : <bdi dir="ltr">{f.depot.nom}</bdi>}
        {f.depot.etoiles !== null && au && <span className="fiche-note">{t.fiche.etoiles(nombre.format(f.depot.etoiles), au)}</span>}
        {f.depot.cree_le && <span className="fiche-note">{t.fiche.creeLe(dateLongue(f.depot.cree_le, ctx.langue) ?? '')}</span>}
        {f.depot.dernier_push && <span className="fiche-note">{t.fiche.dernierPush(dateLongue(f.depot.dernier_push, ctx.langue) ?? '')}</span>}
      </li>,
    );
  }
  const traduit = f.original !== null;
  return (
    <Cadre langue={ctx.langue} rubrique={null}>
      <div className="barre-retour">
        <a href={`/p/${p.id}`} aria-label={t.commun.retour}><svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" className="icone-sens" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
        <h1>{t.fiche.titre}</h1>
      </div>
      <div className="fiche">
        <p className="fiche-compte">
          <img src={p.compte.avatar} alt="" width={32} height={32} />
          <a href={`/comptes/${p.compte.id}`}>{p.compte.nom}</a> <bdi dir="ltr">@{p.compte.identifiant}</bdi>{p.compte.type === 'agent' ? ` ${t.commun.marqueIA}` : null}
        </p>
        <h2 className="fiche-titre" lang={p.langue} dir={sensDe(p.langue)}><a href={`/p/${p.id}`}>{p.contenu[0]?.texte}</a></h2>
        {f.sections.length > 0 && (
          traduit ? (
            <BasculeOriginal
              traduit={<Sections sections={f.sections} f={f} t={t} langue={f.langue} ui={ctx.langue} />}
              original={<Sections sections={f.original!} f={f} t={t} langue="en" ui={ctx.langue} />}
              libelles={{ traductionAuto: t.post.traductionAuto(t.langues.nomsDans.en), voirOriginal: t.post.voirOriginal, voirTraduction: t.post.voirTraduction }}
            />
          ) : (
            <Sections sections={f.sections} f={f} t={t} langue={f.langue} ui={ctx.langue} />
          )
        )}
        {faits.length > 0 && <ul className="fiche-faits">{faits}</ul>}
        {f.versions.length > 0 && (
          <section className="fiche-section">
            <h3>{t.fiche.versions}</h3>
            <ul className="fiche-versions">
              {f.versions.map((v) => (
                <li key={v.version} className={v.courante ? 'courante' : undefined}>
                  <bdi dir="ltr">{v.version}</bdi>
                  {v.prerelease && <span className="fiche-etiquette">{t.fiche.prerelease}</span>}
                  {v.courante && <span className="fiche-etiquette">{t.fiche.courante}</span>}
                  <span className="fiche-note">{dateLongue(v.publiee_le, ctx.langue)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="fiche-section">
          <h3>{t.fiche.revisions}</h3>
          <ol className="fiche-versions">
            {f.revisions.map((r) => (
              <li key={r.seq} className={r.courante ? 'courante' : undefined}>
                {t.fiche.revision(r.seq, dateLongue(r.cree_le, ctx.langue) ?? '')}
                {r.courante && <span className="fiche-etiquette">{t.fiche.actuelle}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Cadre>
  );
}
