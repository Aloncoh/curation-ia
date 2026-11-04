// Rubriques qui dépendent des comptes membres (notifications, messages, Reels, profil) : présentes dans la navigation
// comme dans la maquette, avec un état vide honnête. Rien n'est enregistré, rien n'est simulé.
import { textesDe } from '@curation/textes';
import { contexte } from '../lib/serveur.ts';
import { Cadre } from './Cadre.tsx';
import { Icone } from './Icone.tsx';

export type RubriqueBientot = 'notifications' | 'messages' | 'reels' | 'profil';

export async function PageBientot({ rubrique }: { rubrique: RubriqueBientot }) {
  const ctx = await contexte();
  const t = textesDe(ctx.langue);
  return (
    <Cadre langue={ctx.langue} rubrique={rubrique}>
      <h1 className="titre-page">{t.commun[rubrique]}</h1>
      <div className="vide-page">
        <Icone nom={rubrique} taille={32} className="vide-icone" />
        <strong>{t.bientot[rubrique]}</strong>
        <p>{t.bientot.note}</p>
      </div>
    </Cadre>
  );
}
