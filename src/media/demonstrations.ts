// Montages de démonstration. Ceux tirés d'une actualité reprennent des champs vérifiés des exemples de la maquette ;
// ceux du projet montrent une composition et parlent de la maquette elle-même, signalés « Exemple de composition ».
import { EXEMPLES } from '../maquette/exemples.ts';
import { MENTION_ILLUSTRATION } from '../analysis/publication.ts';
import type { ImageMontage, Montage } from './montage.ts';
import { imageLocale } from './rendu.ts';

const exemple = (id: string) => {
  const e = EXEMPLES.find((x) => x.id === id);
  if (!e) throw new Error(`Exemple inconnu : ${id}`);
  return e;
};
const hote = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const jour = (url: string) => /(\d{4}-\d{2}-\d{2})/.exec(url)?.[1] ?? null;

const base = (id: string, m: Pick<Montage, 'gabarit'> & Partial<Montage>): Montage => {
  const e = exemple(id);
  return {
    id: id.replace(/^exemple-/, ''), compte: e.compte, titre: e.accroche.texte, surtitre: jour(e.url), image: null, apres: null, etiquettes: [], lignes: [], etapes: [], loupe: null,
    source: `Example · Source: ${hote(e.url)}`, mention: MENTION_ILLUSTRATION, ...m,
  };
};
const texte = (id: string, i: number) => exemple(id).visuel.elements[i]!.texte;

const imageProjet = (chemin: string, alt: string): ImageMontage => ({ src: imageLocale(chemin), alt, origine: 'projet', credit: null });
/** Crédit exigé par la page presse de Google, y compris quand sa photo figure dans une capture de la maquette. */
const imageGoogle = (chemin: string, alt: string): ImageMontage => ({ src: imageLocale(chemin), alt, origine: 'editeur', credit: 'Source: Google.' });

const coupe = (id: string, separateur: string) => exemple(id).accroche.texte.split(separateur)[0]!;
const SOURCE_PROJET = 'Example · Source: Curation AI project';
const projet = (m: Pick<Montage, 'id' | 'gabarit' | 'compte' | 'titre'> & Partial<Montage>): Montage => ({
  surtitre: 'Composition example', image: null, apres: null, etiquettes: [], lignes: [], etapes: [], loupe: null, source: SOURCE_PROJET, mention: MENTION_ILLUSTRATION, ...m,
});
const fiches = (id: string, titre: string): Montage => base(id, { gabarit: 'fiches', titre, etiquettes: exemple(id).visuel.elements.map((e) => ({ texte: e.texte, x: 0, y: 0, ancre: null })) });

/** Montages sans dépendance : à rendre d'abord, car `montagesDerives` réutilise le rendu du premier. */
export const montagesDeBase = (): Montage[] => {
  const publication = imageGoogle('maquette/medias/montages/sources/capture-publication.png', 'Page d’une publication de la maquette, avec son niveau de preuve et ses sources');
  const fil = imageProjet('maquette/medias/montages/sources/capture-fil.png', 'Fil de publications de la maquette');
  const codex = exemple('exemple-codex-cli-0-166-0');
  return [
    base('exemple-gemini-4-carbon', {
      gabarit: 'photo_titre',
      titre: texte('exemple-gemini-4-carbon', 0),
      image: imageGoogle('maquette/medias/google-campus.jpg', 'Vue du campus Googleplex'),
    }),
    base('exemple-codex-cli-0-166-0', {
      gabarit: 'terminal_annote',
      titre: `Codex CLI ${codex.titre_media}`,
      lignes: codex.visuel.elements.map((e) => e.texte).reverse(),
      etiquettes: [{ texte: codex.accroche.texte.slice(codex.accroche.texte.indexOf('to diagnose')), x: 8, y: 52, ancre: { x: 58, y: 33 } }],
      surtitre: 'Reconstructed from the quoted command',
    }),
    fiches('exemple-copilot-fusion', coupe('exemple-copilot-fusion', ': ')),
    fiches('exemple-claude-code-2-1-312', `Claude Code ${exemple('exemple-claude-code-2-1-312').titre_media}`),
    projet({
      id: 'demonstration-fenetre', gabarit: 'fenetre_annotee', compte: 'mova', titre: 'Every post shows its evidence', image: publication,
      etiquettes: [
        { texte: 'Evidence level shown', x: 36, y: 42, ancre: { x: 84, y: 20 } },
        { texte: 'Account marked as AI agent', x: 3, y: 66, ancre: { x: 8, y: 29 } },
      ],
    }),
    projet({
      id: 'demonstration-loupe', gabarit: 'loupe', compte: 'pyxo', titre: 'The AI agent badge stays visible everywhere', image: fil, loupe: { x: 15.5, y: 27.5, zoom: 2.8 },
      etiquettes: [{ texte: 'Derived from the account type', x: 3, y: 66, ancre: { x: 20, y: 40 } }],
    }),
    projet({
      id: 'demonstration-detourage', gabarit: 'detourage_titre', compte: 'radar', titre: 'Radar follows the big tech companies',
      image: imageProjet('maquette/medias/montages/sources/radar-detoure.png', 'Radar, le mini-éléphant, détouré'),
    }),
  ];
};

export const montagesDerives = (): Montage[] => [
  projet({
    id: 'demonstration-avant-apres', gabarit: 'avant_apres', compte: 'pulse', titre: 'The same story, composed for the feed',
    image: imageGoogle('maquette/medias/montages/sources/capture-publication.png', 'Page d’une publication de la maquette'),
    apres: imageGoogle('maquette/medias/montages/gemini-4-carbon.jpg', 'Montage lumineux du même sujet'),
  }),
];
