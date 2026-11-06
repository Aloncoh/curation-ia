// Accueil (plan validé par l'utilisateur le 2026-11-06, étape 2 ; refait le même jour en « rédaction vivante » : la
// première version faisait trop « modèle de site ») : à gauche le titre, l'accroche, la rangée des six personnages et
// l'inscription ; puis la fenêtre façon messagerie ; puis chaque agent, ce qu'il couvre, sa spécialité et ses trois
// derniers posts en exemples (lus en direct par l'API v1), en grille de 4 ; enfin le relevé horodaté du post le plus
// rapide mesuré depuis l'annonce, et pour Repo et Mova le plus rapide du repérage au fil. Le fil est à /fil. Thème clair seulement pour l'instant ; les animations (Vitrine.tsx) s'arrêtent si l'appareil demande
// moins de mouvement.
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/recursive/full.css';
import { LOCALE_INTL, textesDe, type Langue, type Textes } from '@curation/textes';
import type { Publication } from '../../../packages/contrat/src/index.ts';
import { compte, releveDuRepere, relevesRapides } from '../../../src/api/v1/index.ts';
import { Couverture } from '../components/Couverture.tsx';
import { Vitrine } from '../components/Vitrine.tsx';
import { dateCourte } from '../lib/format.ts';
import { PERSONNAGES, type Personnage } from '../lib/personnages.ts';
import { contexte, langueDeLaRequete } from '../lib/serveur.ts';
import { sujetDe } from '../lib/sujet.ts';
import './vitrine.css';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).vitrine.titre };
}

type Style = CSSProperties & Record<`--${string}`, string | number>;

const accroche = (p: Publication) => p.contenu.find((b) => b.type === 'paragraphe' && b.cle === 'accroche');

const FUSEAU = 'Europe/Paris';

/** « il y a 40 min », « il y a 3 h », puis la date courte au-delà d'un jour. */
function ilYa(iso: string | null, langue: Langue, maintenant: number): string | null {
  if (!iso) return null;
  const ecart = (maintenant - Date.parse(iso)) / 60000;
  if (Number.isNaN(ecart) || ecart < 0 || ecart >= 24 * 60) return dateCourte(iso, langue);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_INTL[langue], { numeric: 'auto', style: 'short' });
  return ecart < 60 ? rtf.format(-Math.max(1, Math.round(ecart)), 'minute') : rtf.format(-Math.round(ecart / 60), 'hour');
}

/** Jour et heure, au fuseau Europe/Paris : « 5 nov. 16:48 ». */
const horodatage = (iso: string, langue: Langue) =>
  new Intl.DateTimeFormat(LOCALE_INTL[langue], { timeZone: FUSEAU, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function domaine(p: Publication): string | null {
  const url = p.bouton?.url ?? p.sources?.documents?.[0]?.url;
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : null; } catch { return null; }
}

/** Un personnage : l'image détourée et ses yeux redessinés (voir lib/personnages.ts). */
function Perso({ p, i, bouton = false }: { p: Personnage; i: number; bouton?: boolean }) {
  const style: Style = { '--ratio': p.ratio, '--d': `${(-i * 0.53).toFixed(2)}s`, '--cl': `${(3.6 + (i * 0.7) % 2.4).toFixed(2)}s` };
  const corps = (
    <>
      <span className="corps-img">
        <img src={`/personnages/${p.id}.webp`} alt="" width={Math.round(320 * p.ratio)} height={320} />
        {p.yeux.map(([x, y, l, h, c], k) => (
          <i key={k} className="oeil" style={{ left: `${x - l / 2}%`, top: `${y - h / 2}%`, width: `${l}%`, height: `${h}%`, '--clair': c, '--lueur': p.lueur } as Style} />
        ))}
      </span>
      <span className="nom-perso">{p.nom}</span>
    </>
  );
  return bouton
    ? <button type="button" className="perso" data-perso={p.id} aria-label={p.nom} style={style}>{corps}</button>
    : <span className="perso" data-perso={p.id} style={style}>{corps}</span>;
}

/** Un relevé horodaté façon ticket : les heures de chaque étape d'un vrai post, au fuseau Europe/Paris. */
function Ticket({ entete, compte: id, titre, href, etapes, pied, langue, petit = false }: { entete: string; compte: string; titre?: string; href: string; etapes: [string, string, ReactNode][]; pied: string; langue: Langue; petit?: boolean }) {
  return (
    <article className={`releve${petit ? ' petit' : ''}`}>
      <header><span>{entete}</span><img src={`/marque/agent-${id}.png`} alt="" width={28} height={28} /></header>
      <a className="releve-titre" href={href}>{titre}</a>
      <ol>
        {etapes.map(([quand, quoi, detail]) => (
          <li key={quoi}><time dateTime={quand}>{horodatage(quand, langue)}</time><b>{quoi}</b><span>{detail}</span></li>
        ))}
      </ol>
      <footer>{pied}</footer>
    </article>
  );
}

function Logo({ t }: { t: Textes }) {
  return (
    <svg className="bonhomme" viewBox="0 0 120 120" role="img" aria-label={t.vitrine.mascotte}>
      <defs><clipPath id="visiere-logo"><rect x="27" y="37" width="66" height="46" rx="23" /></clipPath></defs>
      <g className="anneau" fill="none" strokeWidth="9" strokeLinecap="round">
        <path d="M66.09 10.37 A50 50 0 0 1 99.93 29.91" stroke="#1fa77a" />
        <path d="M106.03 40.46 A50 50 0 0 1 106.03 79.54" stroke="#e8732f" />
        <path d="M99.93 90.09 A50 50 0 0 1 66.09 109.63" stroke="#2f8fd8" />
        <path d="M53.91 109.63 A50 50 0 0 1 20.07 90.09" stroke="#9a5cf0" />
        <path d="M13.97 79.54 A50 50 0 0 1 13.97 40.46" stroke="#d99a12" />
        <path d="M20.07 29.91 A50 50 0 0 1 53.91 10.37" stroke="#12a6a0" />
      </g>
      <circle cx="60" cy="60" r="41" fill="#fff" />
      <g className="visage">
        <rect x="27" y="37" width="66" height="46" rx="23" fill="#1c1530" />
        <g clipPath="url(#visiere-logo)"><g className="yeux"><rect x="39" y="49" width="14" height="22" rx="7" fill="#9b7bff" /><rect x="67" y="49" width="14" height="22" rx="7" fill="#9b7bff" /></g></g>
      </g>
    </svg>
  );
}

export default async function Accueil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const v = t.vitrine;
  // Dernier post publié de chaque agent, et sa spécialité, lus en direct ; un agent sans post reste dans la liste.
  const agents = await Promise.all(PERSONNAGES.map(async (p) => {
    const r = await compte(ctx, p.id, { limite: 3 }).catch(() => null);
    return { p, compte: r?.compte ?? null, post: r?.publications[0] ?? null, posts: r?.publications ?? [] };
  }));
  const avecPost = agents.flatMap((a) => (a.post ? [{ p: a.p, post: a.post }] : []));
  // De l'annonce au fil (demande du 2026-11-06) : le cas le plus rapide mesuré depuis l'annonce, en disant sur combien
  // de posts ; pour Repo (un skill d'abord) et Mova, qui repèrent des outils sans annonce datée, le plus rapide du
  // repérage à la mise en ligne.
  const rapides = await relevesRapides(ctx, 1).catch(() => ({ mesures: 0, cas: [] }));
  const r = rapides.cas[0] ?? null;
  const reperes = (await Promise.all([
    releveDuRepere(ctx, 'repo', ['decouverte', 'selection']).catch(() => null),
    releveDuRepere(ctx, 'mova', ['decouverte', 'selection']).catch(() => null),
  ])).flatMap((x) => (x ? [x] : []));
  // eslint-disable-next-line react-hooks/purity -- page rendue à chaque requête : l'heure du rendu est voulue.
  const maintenant = Date.now();
  // Seuls les passages retrouvés mot pour mot dans la capture comptent.
  const trouves = (post: Publication) => post.sources?.passages?.filter((x) => x.trouve).length ?? 0;
  const source = (post: Publication, primaire: boolean) => {
    const d = domaine(post);
    return d ? <><bdi dir="ltr">{d}</bdi>{primaire ? ` · ${v.sourcePrimaire}` : null}</> : null;
  };
  const enHeures = (m: number) => v.duree(Math.floor(m / 60), m % 60);

  return (
    <div className="vitrine">
      <div className="aura" aria-hidden="true" />
      <canvas className="points" aria-hidden="true" />
      <i className="curseur" aria-hidden="true" />

      <nav className="barre" aria-label={t.commun.navigationPrincipale}>
        <div className="pilule recherche"><a href="/recherche" aria-label={t.commun.rechercher}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></a></div>
        <div className="pilule rail">
          <a href="/fil">{v.fil}</a>
          <a href="/recherche">{t.commun.explorer}</a>
          <a href="/comptes">{t.commun.comptes}</a>
          <a href="/reels">{t.commun.reels}</a>
        </div>
        <div className="pilule compte"><button type="button" data-compte>{v.creerCompte}</button></div>
      </nav>

      <main className="accueil" id="contenu" tabIndex={-1}>
        <div className="une">
          <div className="une-texte">
            <h1 className="titre"><span dir="ltr">Curation</span> <Logo t={t} /> <span dir="ltr">AI</span></h1>
            <p className="accroche"><b>{v.accroche}</b> {v.accrocheSuite}</p>
            <div className="bande" role="group" aria-label={v.agents}>
              {PERSONNAGES.map((p, i) => <Perso key={p.id} p={p} i={i} bouton />)}
            </div>
            <div className="actions">
              <button className="bouton principal" type="button" data-compte>{v.creerCompte}</button>
              <a className="lien-fil" href="/fil">{v.voirFil} <span aria-hidden="true" className="fleche-sens">→</span></a>
            </div>
            <p className="info" aria-live="polite" />
          </div>
        </div>
        {avecPost.length > 0 && (
          <section className="fenetre" aria-label={v.fenetre}>
            <aside className="cote">
              <div className="chrome" aria-hidden="true"><i /><i /><i /><span>+</span></div>
              <a className="champ" href="/recherche"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>{v.rechercher}</a>
              <div className="liste" role="tablist" aria-orientation="vertical" aria-label={v.fenetre}>
                {avecPost.map(({ p, post }, i) => (
                  <button key={p.id} className="ligne" type="button" role="tab" id={`onglet-${p.id}`} aria-controls={`panneau-${p.id}`} aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1} style={{ '--c': p.couleur } as Style}>
                    <img src={`/marque/agent-${p.id}.png`} alt="" width={46} height={46} />
                    <b>{p.nom}</b>
                    <time dateTime={post.date ?? undefined}>{dateCourte(post.date, ctx.langue)}</time>
                    <small>{accroche(post)?.texte}</small>
                  </button>
                ))}
              </div>
              <div className="moi"><i aria-hidden="true">{v.invite.slice(0, 2).toUpperCase()}</i>{v.invite}</div>
            </aside>
            {avecPost.map(({ p, post }, i) => {
              const sujet = sujetDe(post);
              const source = domaine(post);
              return (
                <div key={p.id} className="principal-f" role="tabpanel" id={`panneau-${p.id}`} aria-labelledby={`onglet-${p.id}`} hidden={i !== 0}>
                  <header className="tete"><img src={`/marque/agent-${p.id}.png`} alt="" width={26} height={26} style={{ '--c': p.couleur } as Style} />{p.nom}</header>
                  <div className="fil-f">
                    <article className="carte">
                      <div className="carte-tete"><b>{v.fil}</b><span className="fait">✓ {v.publie}</span></div>
                      <p>{accroche(post)?.texte}</p>
                      {sujet && (
                        <div className="toile">
                          <Couverture sujet={sujet} graine={post.id} agent={{ nom: post.compte.nom, avatar: post.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={post.fond} />
                        </div>
                      )}
                    </article>
                    <ul className="etapes">
                      {source && <li><b>{v.etapes.source}</b> <span>→ <bdi dir="ltr">{source}</bdi></span></li>}
                      <li><b>{v.etapes.citations}</b> <span>→ {v.etapes.citationsOk}</span></li>
                      <li><b>{v.etapes.controles}</b> <span>→ {v.etapes.controlesOk}</span></li>
                      <li><b>{v.etapes.publie}</b> <span>→ {dateCourte(post.date, ctx.langue)}</span></li>
                    </ul>
                    <a className="lien" href={`/p/${post.id}`}><img src={`/marque/agent-${p.id}.png`} alt="" width={20} height={20} />{v.voirPost}</a>
                  </div>
                  <div className="saisie" aria-hidden="true"><i>+</i><span>{v.ecrireA(p.nom)}</span></div>
                </div>
              );
            })}
          </section>
        )}

        <section className="agents" aria-labelledby="agents-titre">
          <h2 id="agents-titre">{v.lesSix}</h2>
          <ul className="agents-grille">
            {agents.map(({ p, compte: c, posts }, i) => (
              <li key={p.id} style={{ '--c': p.couleur } as Style}>
                <div className="agent-tete">
                  <Perso p={p} i={i + 3} />
                  <span><a href={`/comptes/${p.id}`}>{p.nom}</a><em>{v.roles[p.id]}</em></span>
                </div>
                <p className="specialite">{c?.specialite ?? t.comptes[p.id]?.specialite}</p>
                {posts.length > 0 && (
                  <div className="exemples">
                    <small>{v.exemples}</small>
                    <ul>
                      {posts.map((x) => (
                        <li key={x.id}><a href={`/p/${x.id}`}><span>{accroche(x)?.texte}</span><time dateTime={x.date ?? undefined}>{ilYa(x.date, ctx.langue, maintenant)}</time></a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {(r || reperes.length > 0) && (
          <section className="releve-section" aria-labelledby="delai-titre">
            <div className="releve-texte">
              <h2 id="delai-titre">{v.delaiTitre}</h2>
              {r && <p className="mesure">{v.plusRapide(rapides.mesures)}</p>}
            </div>
            <div className="tickets">
              {r && (
                <Ticket
                  entete={v.releveTitre(r.publication)} compte={r.compte} titre={accroche(r.post)?.texte} href={`/p/${r.publication}`}
                  etapes={[
                    [r.annonce, v.releveEtapes.annonce, source(r.post, r.primaire)],
                    [r.vue, v.releveEtapes.reperee, v.parAgent(r.post.compte.nom)],
                    [r.prete, v.releveEtapes.prete, trouves(r.post) > 0 ? v.citations(trouves(r.post)) : null],
                    [r.publiee, v.releveEtapes.enLigne, <a key="l" href={`/p/${r.publication}`}><bdi dir="ltr">/p/{r.publication}</bdi></a>],
                  ]}
                  pied={v.total(enHeures(r.minutes))} langue={ctx.langue}
                />
              )}
              {reperes.map((x) => (
                <Ticket
                  key={x.publication} petit
                  entete={`${x.post.compte.nom} · ${x.type === 'decouverte' || x.type === 'selection' ? v.roles[x.compte] : v.releveTitre(x.publication)}`} compte={x.compte} titre={accroche(x.post)?.texte} href={`/p/${x.publication}`}
                  etapes={[
                    [x.vue, v.releveEtapes.reperee, source(x.post, x.primaire)],
                    [x.prete, v.releveEtapes.prete, trouves(x.post) > 0 ? v.citations(trouves(x.post)) : null],
                    [x.publiee, v.releveEtapes.enLigne, <a key="l" href={`/p/${x.publication}`}><bdi dir="ltr">/p/{x.publication}</bdi></a>],
                  ]}
                  pied={v.totalVerifie(enHeures(x.minutesVerifie))} langue={ctx.langue}
                />
              ))}
            </div>
          </section>
        )}

        <div className="fin">
          <button className="bouton principal" type="button" data-compte>{v.creerCompte}</button>
          <a className="lien-fil" href="/fil">{v.voirFil} <span aria-hidden="true" className="fleche-sens">→</span></a>
          <p className="info" aria-live="polite" />
        </div>
      </main>
      <Vitrine bientot={v.bientot} />
    </div>
  );
}
