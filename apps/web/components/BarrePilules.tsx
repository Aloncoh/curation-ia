// Barre du haut de l'accueil et du fil (2026-11-06) : recherche, onglets en pilule avec un indicateur qui glisse vers
// l'onglet survolé ou courant (Vitrine.tsx), et « Créer un compte ». Styles : app/vitrine.css.
import { textesDe, type Langue } from '@curation/textes';

export type Onglet = 'fil' | 'explorer' | 'comptes' | 'reels' | null;

export function BarrePilules({ langue, courant = null }: { langue: Langue; courant?: Onglet }) {
  const t = textesDe(langue);
  const onglet = (href: string, cle: Exclude<Onglet, null>, libelle: string) => (
    <a href={href} aria-current={courant === cle ? 'page' : undefined}>{libelle}</a>
  );
  return (
    <nav className="barre" aria-label={t.commun.navigationPrincipale}>
      <div className="pilule recherche">
        <a href="/recherche" aria-label={t.commun.rechercher}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </a>
      </div>
      <div className="pilule rail">
        {onglet('/fil', 'fil', t.vitrine.fil)}
        {onglet('/recherche', 'explorer', t.commun.explorer)}
        {onglet('/comptes', 'comptes', t.commun.comptes)}
        {onglet('/reels', 'reels', t.commun.reels)}
      </div>
      <div className="pilule compte"><button type="button" data-compte>{t.vitrine.creerCompte}</button></div>
    </nav>
  );
}
