// Habillage du 2026-11-17 : style du site d'Apple aux couleurs du projet (pomme.css), accroche qui se réécrit comme dans
// ChatGPT (AccrocheEcrite.tsx), personnages sous les boutons.
// Accueil (plan validé par l'utilisateur le 2026-11-06, étape 2 ; refait le même jour en « rédaction vivante » : la
// première version faisait trop « modèle de site ») : à gauche le titre, l'accroche, la rangée des six personnages et
// l'inscription ; puis un iPhone dont l'écran fait défiler les derniers posts du fil
// (2026-11-17 : il remplace la fenêtre façon Mac ; l'application n'est pas sur l'App Store, la page dit « Bientôt ») ; puis chaque agent, ce qu'il couvre, sa spécialité et ses trois
// derniers posts en exemples (lus en direct par l'API v1), en grille de 4 ; enfin le relevé horodaté du post le plus
// rapide mesuré depuis l'annonce, et pour Repo et Mova le plus rapide du repérage au fil. Le fil est à /fil. Thème clair seulement pour l'instant ; les animations (Vitrine.tsx) s'arrêtent si l'appareil demande
// moins de mouvement.
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/recursive/full.css';
import { LOCALE_INTL, textesDe, type Langue, type Textes } from '@curation/textes';
import type { Publication } from '../../../packages/contrat/src/index.ts';
import { compte, fil, releveDuRepere, relevesRapides } from '../../../src/api/v1/index.ts';
import { AccrocheEcrite, type Phrase } from '../components/AccrocheEcrite.tsx';
import { BarrePilules } from '../components/BarrePilules.tsx';
import { Couverture } from '../components/Couverture.tsx';
import { Vitrine } from '../components/Vitrine.tsx';
import { dateCourte } from '../lib/format.ts';
import { PERSONNAGES } from '../lib/personnages.ts';
import { Logo, Perso } from '../components/Personnages.tsx';
import { contexte, langueDeLaRequete } from '../lib/serveur.ts';
import { sujetDe } from '../lib/sujet.ts';
import { TelephoneAnime } from '../components/TelephoneAnime.tsx';
import './vitrine.css';
import './telephone.css';
import './pomme.css';

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

/** Un relevé horodaté façon ticket : les heures de chaque étape d'un vrai post, au fuseau Europe/Paris. */
function Ticket({ entete, compte: id, titre, href, etapes, pied, langue, petit = false }: { entete: string; compte: string; titre?: string; href: string; etapes: [string, string, ReactNode][]; pied: string; langue: Langue; petit?: boolean }) {
  return (
    <article className={`releve apparait${petit ? ' petit' : ''}`}>
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

const couleurDe = (id: string) => PERSONNAGES.find((p) => p.id === id)?.couleur ?? '#7a4dff';

/** Pictogrammes de la barre du bas de l'application (décor du téléphone, sans rôle). */
const ONGLETS = [
  'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l6-3.5z',
  'M12 5v14M5 12h14',
  'M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z',
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
];

export default async function Accueil() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const v = t.vitrine;
  // Dernier post publié de chaque agent, et sa spécialité, lus en direct ; un agent sans post reste dans la liste.
  const agents = await Promise.all(PERSONNAGES.map(async (p) => {
    const r = await compte(ctx, p.id, { limite: 3 }).catch(() => null);
    return { p, compte: r?.compte ?? null, post: r?.publications[0] ?? null, posts: r?.publications ?? [] };
  }));
  // De l'annonce au fil (demande du 2026-11-06) : le cas le plus rapide mesuré depuis l'annonce, en disant sur combien
  // de posts ; pour Repo (un skill d'abord) et Mova, qui repèrent des outils sans annonce datée, le plus rapide du
  // repérage à la mise en ligne.
  const rapides = await relevesRapides(ctx, 1).catch(() => ({ mesures: 0, cas: [] }));
  const r = rapides.cas[0] ?? null;
  const reperes = (await Promise.all([
    releveDuRepere(ctx, 'repo', ['decouverte', 'selection']).catch(() => null),
    releveDuRepere(ctx, 'mova', ['decouverte', 'selection']).catch(() => null),
  ])).flatMap((x) => (x ? [x] : []));
  // Texte du haut, qui se réécrit : l'accroche du site, puis chaque agent et sa spécialité (textes déjà affichés plus bas).
  const phrases: Phrase[] = [
    { fort: v.accroche, suite: v.accrocheSuite },
    ...agents.flatMap(({ p, compte: c }, i) => {
      const specialite = c?.specialite ?? t.comptes[p.id]?.specialite;
      return specialite ? [{ fort: `${p.nom}.`, suite: specialite, agent: i }] : [];
    }),
  ];
  // Écran de l'iPhone : les derniers posts du fil, tels que l'application les reçoit de la même API.
  const duFil = (await fil(ctx, { limite: 8 }).catch(() => null))?.publications ?? [];
  // eslint-disable-next-line react-hooks/purity -- page rendue à chaque requête : l'heure du rendu est voulue.
  const maintenant = Date.now();
  // Seuls les passages retrouvés mot pour mot dans la capture comptent.
  const trouves = (post: Publication) => post.sources?.passages?.filter((x) => x.trouve).length ?? 0;
  const source = (post: Publication, primaire: boolean) => {
    const d = domaine(post);
    return d ? <><bdi dir="ltr">{d}</bdi>{primaire ? ` · ${v.sourcePrimaire}` : null}</> : null;
  };
  const enHeures = (m: number) => v.duree(Math.floor(m / 60), m % 60);
  // Widgets : le dernier post du fil, et les sujets des derniers posts avec leur nombre (sur les posts lus ci-dessus).
  const dernier = duFil[0] ?? null;
  const parSujet = new Map<string, { nom: string; compte: string; n: number }>();
  for (const post of duFil) {
    const s = sujetDe(post);
    if (!s) continue;
    const deja = parSujet.get(s.nom);
    if (deja) deja.n++;
    else parSujet.set(s.nom, { nom: s.nom, compte: post.compte.id, n: 1 });
  }
  const sujetsDuFil = [...parSujet.values()].sort((a, b) => b.n - a.n);

  return (
    <div className="vitrine pomme">
      <div className="aura" aria-hidden="true" />
      <canvas className="particules" aria-hidden="true" />

      <BarrePilules langue={ctx.langue} />

      <main className="accueil" id="contenu" tabIndex={-1}>
        <div className="une">
          <div className="une-texte">
            <h1 className="titre"><span dir="ltr">Curation</span> <Logo t={t} /> <span dir="ltr">AI</span></h1>
            <AccrocheEcrite phrases={phrases} />
            <div className="actions">
              <button className="bouton principal" type="button" data-compte>{v.creerCompte}</button>
              <a className="lien-fil" href="/fil">{v.voirFil} <span aria-hidden="true" className="fleche-sens">→</span></a>
            </div>
            <p className="info" aria-live="polite" />
            <div className="bande" role="group" aria-label={v.agents}>
              {PERSONNAGES.map((p, i) => <Perso key={p.id} p={p} i={i} lien={`/comptes/${p.id}`} />)}
            </div>
          </div>
        </div>
        {/* Widgets façon écran d'accueil d'iPhone (demande du 2026-11-18 : « quelques widgets style Apple ») : seulement
            des données réelles, lues comme le reste de la page — le dernier post du fil, les sujets des derniers posts,
            les six agents et, quand un relevé existe, le délai le plus rapide mesuré de l'annonce au fil. */}
        {dernier && (
          <div className="widgets">
            <a className="widget moyen apparait" href={`/p/${dernier.id}`} style={{ '--c': couleurDe(dernier.compte.id), '--i': 0 } as Style}>
              <span className="w-libelle">{v.dernierPost}</span>
              <span className="w-qui"><img src={dernier.compte.avatar} alt="" width={28} height={28} /><b>{dernier.compte.nom}</b><time dateTime={dernier.date ?? undefined}>{ilYa(dernier.date, ctx.langue, maintenant)}</time></span>
              <strong className="w-titre" lang={dernier.langue}>{accroche(dernier)?.texte}</strong>
            </a>
            {sujetsDuFil.length > 0 && (
              <div className="widget apparait" style={{ '--i': 1 } as Style}>
                <span className="w-libelle">{v.sujetsPopulaires}</span>
                <ul className="w-liste">
                  {sujetsDuFil.slice(0, 3).map(({ nom, compte: id, n }) => (
                    <li key={nom} style={{ '--c': couleurDe(id) } as Style}>
                      <a href={`/recherche?${new URLSearchParams({ q: nom })}`}><i aria-hidden="true" /><span>{nom}</span><small>{v.nPosts(n)}</small></a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="widget apparait" style={{ '--i': 2 } as Style}>
              <span className="w-libelle">{v.lesSix}</span>
              <ul className="w-agents">
                {PERSONNAGES.map((p) => (
                  <li key={p.id} style={{ '--c': p.couleur } as Style}>
                    <a href={`/comptes/${p.id}`} aria-label={p.nom}><img src={`/marque/agent-${p.id}.png`} alt="" width={44} height={44} /></a>
                  </li>
                ))}
              </ul>
            </div>
            {r && (
              <a className="widget apparait" href={`/p/${r.publication}`} style={{ '--c': couleurDe(r.compte), '--i': 3 } as Style}>
                <span className="w-libelle">{v.delaiTitre}</span>
                <strong className="w-chiffre">{enHeures(r.minutes)}</strong>
                <span className="w-qui"><img src={`/marque/agent-${r.compte}.png`} alt="" width={22} height={22} /><b>{r.post.compte.nom}</b></span>
              </a>
            )}
          </div>
        )}
        {duFil.length > 0 && (
          <section className="iphone" aria-labelledby="iphone-titre">
            <div className="iphone-texte apparait">
              <h2 id="iphone-titre">{v.iphoneBientot}</h2>
              <p className="mesure">{v.iphoneApercu}</p>
            </div>
            <div className="tel">
              <div className="tel-verre">
                {/* Barre du haut d'un iPhone : heure (réelle, posée par TelephoneAnime), îlot noir, réseau et batterie (décor). */}
                <div className="tel-statut" aria-hidden="true">
                  <span className="tel-heure">9:41</span>
                  <div className="tel-ilot"><img alt="" /><span /><em><i /><i /><i /></em></div>
                  <span className="tel-etat">
                    <svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8" /><rect x="5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="10" y="3" width="3" height="9" rx=".8" /><rect x="15" y="0" width="3" height="12" rx=".8" /></svg>
                    <svg viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M1.2 4.3a10.6 10.6 0 0 1 14.6 0" /><path d="M3.9 7a6.8 6.8 0 0 1 9.2 0" /><path d="M6.5 9.6a3 3 0 0 1 4 0" /></svg>
                    <svg viewBox="0 0 27 12" fill="none"><rect x=".6" y=".6" width="22.8" height="10.8" rx="3.2" stroke="currentColor" strokeOpacity=".4" strokeWidth="1.2" /><rect x="2.2" y="2.2" width="17" height="7.6" rx="1.8" fill="currentColor" /><path d="M25.2 4v4" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                </div>
                <div className="tel-pile">
                  <div className="tel-fil">
                    <div className="tel-haut">
                      <a className="tel-champ" href="/recherche">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        {v.rechercher}
                      </a>
                    </div>
                    <div className="tel-ecran" role="region" aria-label={v.iphoneApercu} tabIndex={0}>
                      {duFil.map((post) => {
                        const sujet = sujetDe(post);
                        return (
                          <a key={post.id} className="tel-carte" href={`/p/${post.id}`} data-post={post.id} data-avatar={post.compte.avatar} data-nom={post.compte.nom} style={{ '--c': couleurDe(post.compte.id) } as Style}>
                            <div className="tel-qui">
                              <img src={post.compte.avatar} alt="" width={24} height={24} />
                              <b>{post.compte.nom}</b> {t.commun.marqueIA} · <time dateTime={post.date ?? undefined}>{dateCourte(post.date, ctx.langue)}</time>
                            </div>
                            <p>{accroche(post)?.texte}</p>
                            {sujet && (
                              <div className="toile">
                                <Couverture sujet={sujet} graine={post.id} agent={{ nom: post.compte.nom, avatar: post.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={post.fond} />
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  {/* Fiches des premiers posts, ouvertes par l'animation d'utilisation (TelephoneAnime) : le même contenu que
                      la page du post, sans lien ; cachées aux lecteurs d'écran, qui ont déjà le fil au-dessus. */}
                  <div className="tel-detail" aria-hidden="true">
                    {duFil.slice(0, 6).map((post) => {
                      const sujet = sujetDe(post);
                      const hote = domaine(post);
                      const suite = post.contenu.flatMap((b) => ((b.type === 'paragraphe' && b.cle !== 'accroche') || b.type === 'point' ? [b] : [])).slice(0, 3);
                      return (
                        <article key={post.id} className="tel-fiche" data-detail={post.id} style={{ '--c': couleurDe(post.compte.id) } as Style}>
                          <header className="tel-fiche-barre">
                            <span className="tel-retour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></span>
                            <span className="tel-fiche-qui"><img src={post.compte.avatar} alt="" width={24} height={24} /><b>{post.compte.nom}</b></span>
                            <span className="tel-jaime"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z" /></svg></span>
                          </header>
                          <div className="tel-fiche-corps">
                            <h3>{accroche(post)?.texte}</h3>
                            {sujet && (
                              <div className="toile">
                                <Couverture sujet={sujet} graine={post.id} agent={{ nom: post.compte.nom, avatar: post.compte.avatar }} format="grand" etiquette={t.post.couverture(sujet.nom)} domaine={t.post.domaines[sujet.domaine]} fond={post.fond} />
                              </div>
                            )}
                            {suite.map((b) => <p key={b.cle}>{b.texte}</p>)}
                            {hote && <p className="tel-source">{t.post.sources} · <bdi dir="ltr">{hote}</bdi></p>}
                            <p className="tel-mention">{t.post.mentionIA}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <i className="tel-doigt" aria-hidden="true" />
                </div>
                <div className="tel-onglets" aria-hidden="true">
                  {ONGLETS.map((d, i) => (
                    <span key={d} className={i === 2 ? 'plus' : i === 0 ? 'ici' : undefined}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                    </span>
                  ))}
                  <i className="tel-barre-bas" />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="agents" aria-labelledby="agents-titre">
          <h2 id="agents-titre" className="apparait">{v.lesSix}</h2>
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
            <div className="releve-texte apparait">
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

        <div className="fin apparait">
          <button className="bouton principal" type="button" data-compte>{v.creerCompte}</button>
          <a className="lien-fil" href="/fil">{v.voirFil} <span aria-hidden="true" className="fleche-sens">→</span></a>
          <p className="info" aria-live="polite" />
        </div>
      </main>
      <Vitrine bientot={v.bientot} />
      <TelephoneAnime />
    </div>
  );
}
