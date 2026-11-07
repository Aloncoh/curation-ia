// Réglages (plan validé le 2026-11-06, étape 7 ; demande du 2026-11-07 : « Réglages » remplace le choix de la langue dans
// le menu). Votre compte, Sécurité et Notifications attendent les comptes ; Système : langue (cookie), affichage
// (bientôt), animations, texte (préférences du navigateur) et cookies ; Centre d'aide : bientôt, texte dicté par
// l'utilisateur.
import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { Cadre, ChoixLangue } from '../../components/Cadre.tsx';
import { Preferences } from '../../components/Preferences.tsx';
import { contexte, langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).reglages.titre };
}

export default async function Reglages() {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  const r = t.reglages;
  const enAttente = (id: string, titre: string, texte: string) => (
    <section className="reglages-carte" aria-labelledby={`r-${id}`}>
      <h2 id={`r-${id}`}>{titre}</h2>
      <p>{texte}</p>
      <p className="reglage-note">{r.avecCompte}</p>
    </section>
  );
  return (
    <Cadre langue={ctx.langue} rubrique="reglages">
      <h1 className="titre-page">{r.titre}</h1>
      {enAttente('compte', r.compte, r.compteTexte)}
      {enAttente('securite', r.securite, r.securiteTexte)}
      {enAttente('notifications', r.notifications, r.notificationsTexte)}
      <section className="reglages-carte" aria-labelledby="r-systeme">
        <h2 id="r-systeme">{r.systeme}</h2>
        <div className="reglage">
          <span className="reglage-nom">{r.langue}</span>
          <ChoixLangue langue={ctx.langue} />
        </div>
        <div className="reglage">
          <span className="reglage-nom">{r.affichage}</span>
          <div className="choix-deux" role="group" aria-label={r.affichage}>
            <button type="button" disabled>{r.affichageOptions.systeme}</button>
            <button type="button" disabled>{r.affichageOptions.clair}</button>
            <button type="button" aria-pressed="true" disabled>{r.affichageOptions.sombre}</button>
          </div>
        </div>
        <p className="reglage-note">{r.affichageNote}</p>
        <Preferences l={{ animations: r.animations, normales: r.animationsOptions.normales, reduites: r.animationsOptions.reduites, texte: r.texte, normale: r.tailleOptions.normale, grande: r.tailleOptions.grande, policeLisible: r.policeLisible, note: r.preferencesNote }} />
        <div className="reglage reglage-bloc">
          <span className="reglage-nom">{r.cookies}</span>
          <p>{r.cookiesTexte}</p>
        </div>
      </section>
      <section className="reglages-carte" aria-labelledby="r-aide">
        <h2 id="r-aide">{r.aide}</h2>
        <p>{r.aideTexte}</p>
      </section>
    </Cadre>
  );
}
