// Rendu du site (P4) sans navigateur : hébreu de droite à gauche avec identifiants, adresses et visuels de gauche à
// droite, « Voir l'original », contenus collectés rendus comme texte (`<img onerror>`, `javascript:`), chemins des médias.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Bloc, Publication } from '@curation/contrat';
import { textesDe } from '@curation/textes';
import { Post } from '../components/Post.tsx';
import { apercu, texteAffiche, TexteDuPost } from '../components/TexteDuPost.tsx';
import { cheminMedia } from '../lib/medias.ts';

const original: Bloc[] = [
  { type: 'paragraphe', cle: 'accroche', texte: 'Widget 2.1 cuts GPU latency by 40%' },
  { type: 'point', cle: 'reperes.0', texte: '40% lower latency' },
];
const traduit = (texte: string[]): Bloc[] => original.map((b, i) => ({ ...b, texte: texte[i]! }));

const publication = (o: Partial<Publication> = {}): Publication => ({
  id: 7,
  revision_id: 9,
  nature: 'ressource',
  compte: { id: 'repo', identifiant: 'repo', nom: 'Repo', type: 'agent', avatar: '/marque/agent-repo.png', bio: 'b', specialite: 's' },
  statut: 'en_attente',
  date: '2026-11-03',
  badge: 'ressource_existante',
  langue_originale: 'en',
  langue: 'he',
  traduction: { langue: 'he', origine: 'machine', modele: 'deepseek-flash', cree_le: '2026-11-03T10:00:00.000Z' },
  contenu: traduit(['Widget 2.1 מקצר את זמן התגובה ב-40%', 'זמן תגובה קצר ב-40%']),
  original,
  bouton: { type: 'depot', url: 'https://github.com/acme/widget', cible: 'github.com/acme/widget' },
  media: { type: 'image', src: '/medias/montages/ressources/widget.jpg', alt: 'Widget steps', largeur: 1080, hauteur: 1350, lang: 'en', credit: null },
  sources: { origine: 'claude_code_developpement', modele: null, documents: [{ titre: 'README', url: 'https://github.com/acme/widget', capture_le: '2026-11-02T10:00:00.000Z' }], passages: [{ texte: 'It cuts latency by 40%.', trouve: true }], verification: 'verifie' },
  ...o,
});

describe('hébreu de droite à gauche', () => {
  const html = renderToStaticMarkup(<Post p={publication()} t={textesDe('he')} langue="he" />);

  it('affiche le texte traduit en hébreu, de droite à gauche', () => {
    expect(html).toContain('<div class="post-texte" lang="he" dir="rtl">');
    expect(html).toContain('Widget 2.1 מקצר את זמן התגובה ב-40%');
    expect(html).toContain('תורגם אוטומטית מאנגלית');
    expect(html).toContain('הצגת המקור');
    expect(html).toContain('משאב קיים');
  });

  it('garde de gauche à droite l\'identifiant, l\'adresse du dépôt, le visuel et les passages cités', () => {
    expect(html).toContain('<bdi dir="ltr">@repo</bdi>');
    expect(html).toContain('<bdi dir="ltr">github.com/acme/widget</bdi>');
    expect(html).toContain('<figure class="post-media" dir="ltr" lang="en">');
    expect(html).toContain('<blockquote lang="en" dir="ltr">It cuts latency by 40%.</blockquote>');
  });

  it('passe la feuille de style en propriétés logiques (aucune marge, aucun retrait gauche ou droite)', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    expect(css).not.toMatch(/\b(margin|padding|border)-(left|right)\b/);
    expect(css).toMatch(/\.post-texte\[dir="rtl"\] \.points li::before \{ content: "←"; \}/);
  });
});

describe('« Voir l\'original »', () => {
  const libelles = { voirPlus: 'Voir plus', voirMoins: 'Voir moins', voirOriginal: 'Voir l’original', voirTraduction: 'Voir la traduction', traductionAuto: 'Traduit automatiquement de l’anglais', nouvelOnglet: ' (nouvel onglet)' };
  const fr = traduit(['Widget 2.1 réduit la latence GPU de 40%', 'Latence réduite de 40%']);

  it('montre la traduction, signalée, avec « Voir l\'original »', () => {
    const html = renderToStaticMarkup(<TexteDuPost contenu={fr} original={original} langue="fr" langueOriginale="en" complet libelles={libelles} />);
    expect(html).toContain('<div class="post-texte" lang="fr" dir="ltr"><p>Widget 2.1 réduit la latence GPU de 40%</p>');
    expect(html).toContain('Traduit automatiquement de l’anglais');
    expect(html).toContain('aria-pressed="false">Voir l’original</button>');
  });

  it('montre l\'original anglais et propose de revenir à la traduction', () => {
    const html = renderToStaticMarkup(<TexteDuPost contenu={fr} original={original} langue="fr" langueOriginale="en" complet libelles={libelles} initialementOriginal />);
    expect(html).toContain('<div class="post-texte" lang="en" dir="ltr"><p>Widget 2.1 cuts GPU latency by 40%</p>');
    expect(html).toContain('aria-pressed="true">Voir la traduction</button>');
    expect(texteAffiche(fr, original, true)).toBe(original);
    expect(texteAffiche(fr, null, true)).toBe(fr);
  });

  it('n\'ajoute ni mention ni bouton à un post lu dans sa langue d\'origine', () => {
    const html = renderToStaticMarkup(<TexteDuPost contenu={original} original={null} langue="en" langueOriginale="en" complet libelles={libelles} />);
    expect(html).not.toContain('traduction-note');
  });

  it('coupe un texte long au mot, puis « Voir plus »', () => {
    const long: Bloc[] = [{ type: 'paragraphe', cle: 'accroche', texte: 'mot '.repeat(120).trim() }];
    const vue = apercu(long);
    expect(vue.tronque).toBe(true);
    expect(vue.blocs[0]!.texte.endsWith('mot…')).toBe(true);
    expect(renderToStaticMarkup(<TexteDuPost contenu={long} original={null} langue="en" langueOriginale="en" complet={false} libelles={libelles} />)).toContain('aria-expanded="false">Voir plus</button>');
  });
});

describe('contenus collectés : texte brut, liens https seulement (ADR 0003)', () => {
  const piege = '<img src=x onerror=alert(1)>';
  const p = publication({
    langue: 'en', traduction: null, original: null,
    contenu: [{ type: 'paragraphe', cle: 'accroche', texte: piege }, { type: 'element', cle: 'ressources.0.explication', nom: piege, url: 'javascript:alert(2)', hote: 'x', texte: 'ok' }],
    bouton: { type: 'depot', url: 'javascript:alert(3)', cible: piege },
    sources: { origine: 'agent_site', modele: piege, documents: [{ titre: piege, url: 'javascript:alert(4)', capture_le: null }], passages: [{ texte: piege, trouve: false }], verification: 'a_verifier' },
  });
  const html = renderToStaticMarkup(<Post p={p} t={textesDe('fr')} langue="fr" />);

  it('échappe `<img onerror>` partout où il apparaît', () => {
    expect(html).not.toContain('<img src=x');
    expect(html).not.toMatch(/onerror=(?!alert\(1\)&gt;)/);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('ne rend aucun lien `javascript:`', () => {
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toContain('Voir le dépôt');
  });
});

describe('médias servis', () => {
  const racine = '/depot/maquette/medias';
  it('accepte une image sous le dossier des médias et refuse tout le reste', () => {
    expect(cheminMedia(['montages', 'ressources', 'widget.jpg'], racine)).toBe('/depot/maquette/medias/montages/ressources/widget.jpg');
    for (const segments of [['..', 'data', 'curation.db'], ['montages', '..', '..', '.env.local'], ['.env.local'], ['donnees.js'], ['a%2e%2e', 'x.jpg'], []]) expect(cheminMedia(segments, racine)).toBeNull();
  });
});
