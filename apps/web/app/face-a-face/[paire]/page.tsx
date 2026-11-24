// Face à face (2026-11-24) : deux nouveaux modèles lus côte à côte, d'après la fiche de nos deux posts. Chaque colonne
// reprend ce que sa source dit, dans sa propre langue ; une ligne que la source ne renseigne pas affiche « Non
// renseigné ». Les résultats rapportés gardent leur auteur et leurs conditions. Aucun verdict, aucun classement.
// Adresse : /face-a-face/84-82, les deux identifiants de publication, le modèle le plus récent d'abord.
import type { Metadata } from 'next';
import type { CoteFaceAFace, ElementFiche } from '@curation/contrat';
import { sensDe, textesDe, type Textes } from '@curation/textes';
import { BarreRetour, Cadre, Vide } from '../../../components/Cadre.tsx';
import { Logo } from '../../../components/Couverture.tsx';
import { dateLongue } from '../../../lib/format.ts';
import { faceAFace } from '../../../lib/lectures.ts';
import { contexte } from '../../../lib/serveur.ts';
import { sujetDeLAdresse } from '../../../lib/sujet.ts';

type Parametres = { params: Promise<{ paire: string }> };
const LIGNES = ['nouveaute', 'acces', 'cout', 'limites_connues'] as const;

function identifiants(brut: string): [number, number] {
  const m = /^(\d{1,9})-(\d{1,9})$/.exec(brut);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

export async function generateMetadata({ params }: Parametres): Promise<Metadata> {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const f = await faceAFace(ctx, ...identifiants((await params).paire));
  return { title: f ? `${t.faceAFace.titre} · ${f.cotes[0].produit} · ${f.cotes[1].produit}` : t.faceAFace.introuvable };
}

/** Une case : le nom du modèle (visible quand les colonnes s'empilent), puis son texte ou « Non renseigné ». */
function Case({ c, elements, t, rapportes = false }: { c: CoteFaceAFace; elements: ElementFiche[] | null; t: Textes; rapportes?: boolean }) {
  return (
    <div className="face-case">
      <span className="face-qui"><bdi dir="ltr">{c.produit}</bdi></span>
      {!elements || elements.length === 0 ? (
        <p className="face-vide">{t.fiche.nonRenseigne}</p>
      ) : rapportes ? (
        <ul className="fiche-liste" lang={c.langue} dir={sensDe(c.langue)}>
          {elements.map((e) => (
            <li key={e.cle}>
              {e.texte}
              {e.titre && <span className="fiche-note">{t.fiche.benchmarkAttribue(e.titre)}</span>}
              {e.complement && <span className="fiche-note">{t.fiche.conditions} : {e.complement}</span>}
            </li>
          ))}
        </ul>
      ) : (
        elements.map((e) => <p key={e.cle} lang={c.langue} dir={sensDe(c.langue)}>{e.texte}</p>)
      )}
    </div>
  );
}

export default async function PageFaceAFace({ params }: Parametres) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const f = await faceAFace(ctx, ...identifiants((await params).paire));
  if (!f) {
    return (
      <Cadre langue={ctx.langue} rubrique={null}>
        <BarreRetour titre={t.faceAFace.titre} langue={ctx.langue} />
        <Vide titre={t.faceAFace.introuvable} texte={t.publication.introuvableMessage} />
      </Cadre>
    );
  }
  return (
    <Cadre langue={ctx.langue} rubrique={null}>
      <BarreRetour titre={t.faceAFace.titre} langue={ctx.langue} />
      <div className="face">
        <div className="face-rang face-tetes">
          {f.cotes.map((c) => {
            const p = c.publication;
            const sujet = sujetDeLAdresse(p.sources.documents.find((d) => d.url)?.url ?? null);
            const date = dateLongue(c.annonce_le, ctx.langue);
            return (
              <header key={p.id} className="face-tete">
                {sujet && <span className="face-logo" aria-hidden="true"><Logo sujet={sujet} /></span>}
                <h2><bdi dir="ltr">{c.produit}</bdi></h2>
                {sujet && <p className="face-editeur"><bdi dir="ltr">{sujet.nom}</bdi></p>}
                {date && <p className="fiche-note">{t.faceAFace.annonceLe(date)}</p>}
                <p className="face-signe">
                  <img src={p.compte.avatar} alt="" width={20} height={20} />
                  <a href={`/comptes/${p.compte.id}`}>{p.compte.nom}</a> {p.compte.type === 'agent' ? t.commun.marqueIA : null}
                </p>
                <p className="face-liens"><a href={`/p/${p.id}`}>{t.vitrine.voirPost}</a><a href={`/p/${p.id}/fiche`}>{t.fiche.titre}</a></p>
                {c.traduction && <p className="fiche-note">{t.post.traductionAuto(t.langues.nomsDans[p.langue_originale])}</p>}
              </header>
            );
          })}
        </div>
        {LIGNES.map((id) => (
          <section key={id} className="face-ligne">
            <h3>{t.fiche.sections[id]}</h3>
            <div className="face-rang">{f.cotes.map((c) => <Case key={c.publication.id} c={c} elements={c.lignes[id]} t={t} />)}</div>
          </section>
        ))}
        {f.cotes.some((c) => c.rapportes.length > 0) && (
          <section className="face-ligne">
            <h3>{t.faceAFace.rapportes}</h3>
            <div className="face-rang">{f.cotes.map((c) => <Case key={c.publication.id} c={c} elements={c.rapportes} t={t} rapportes />)}</div>
          </section>
        )}
        <p className="face-note">{t.faceAFace.note}</p>
        <p className="face-note">{t.post.mentionIA}</p>
      </div>
    </Cadre>
  );
}
