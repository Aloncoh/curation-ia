import { describe, expect, it } from 'vitest';
import { composerMontage, defautsMontage, GABARITS, htmlMontage, LONGUEUR_MAX_ETIQUETTE, tailleTitre, texteAlternatif, type Montage } from '../src/media/montage.ts';
import { montagesDeBase, montagesDerives } from '../src/media/demonstrations.ts';
import { defautsMiseEnPage } from '../src/media/rendu.ts';

const IMAGE = { src: 'data:image/png;base64,AAAA', alt: 'Une capture', origine: 'editeur' as const, credit: 'Crédit' };
const montage = (m: Partial<Montage> = {}): Montage => ({
  id: 'x', gabarit: 'fenetre_annotee', compte: 'repo', titre: 'Acme ajoute un mode hors ligne', surtitre: null, image: IMAGE, apres: null, etiquettes: [], lignes: [], loupe: null,
  source: 'Source : acme.example', mention: 'Illustration — ne prouve pas le fonctionnement', ...m,
});
const html = (m: Montage) => htmlMontage(m, { avatar: 'data:image/png;base64,BBBB', polices: '', nomCompte: 'Repo' });
const etiquette = { texte: 'Nouveau bouton', x: 10, y: 10, ancre: { x: 50, y: 50 } };
const COMPLET: Record<(typeof GABARITS)[number], Partial<Montage>> = {
  photo_titre: {}, fenetre_annotee: {}, detourage_titre: {}, avant_apres: { apres: IMAGE }, loupe: { loupe: { x: 50, y: 50, zoom: 2 } }, terminal_annote: { image: null, lignes: ['acme run'], surtitre: 'Reconstitution de la commande citée' }, fiches: { image: null, etiquettes: [{ texte: 'Un repère', x: 4, y: 52, ancre: null }] },
};

describe('contrôle d’un montage avant rendu', () => {
  it.each(GABARITS)('gabarit %s complet : aucun défaut', (gabarit) => {
    expect(defautsMontage(montage({ gabarit, ...COMPLET[gabarit] }))).toEqual([]);
  });
  it('refuse un titre vide ou trop long', () => {
    expect(defautsMontage(montage({ titre: ' ' }))).toContain('titre_hors_limites');
    expect(defautsMontage(montage({ titre: 'x'.repeat(111) }))).toContain('titre_hors_limites');
  });
  it('refuse les étiquettes trop nombreuses, trop longues ou hors cadre', () => {
    expect(defautsMontage(montage({ etiquettes: [etiquette, etiquette, etiquette, etiquette] }))).toContain('trop_d_etiquettes');
    expect(defautsMontage(montage({ etiquettes: [{ ...etiquette, texte: 'x'.repeat(LONGUEUR_MAX_ETIQUETTE + 1) }] }))).toContain('etiquette_hors_limites');
    expect(defautsMontage(montage({ etiquettes: [{ ...etiquette, ancre: { x: 120, y: 50 } }] }))).toContain('etiquette_hors_cadre');
  });
  it('chaque gabarit exige ce qu’il montre', () => {
    expect(defautsMontage(montage({ image: null }))).toContain('image_absente');
    expect(defautsMontage(montage({ gabarit: 'avant_apres' }))).toContain('seconde_image_absente');
    expect(defautsMontage(montage({ gabarit: 'loupe' }))).toContain('loupe_absente');
    expect(defautsMontage(montage({ gabarit: 'terminal_annote', image: null }))).toContain('commande_absente');
    expect(defautsMontage(montage({ gabarit: 'terminal_annote', image: null, lignes: ['acme run'] }))).toContain('reconstitution_non_signalee');
  });
  it('une image distante ou sans texte alternatif est refusée', () => {
    expect(defautsMontage(montage({ image: { ...IMAGE, src: 'https://example.com/a.png' } }))).toContain('image_non_locale');
    expect(defautsMontage(montage({ image: { ...IMAGE, alt: '' } }))).toContain('texte_alternatif_absent');
  });
  it('sans source ni mention exacte, pas d’image', () => {
    expect(defautsMontage(montage({ source: '' }))).toContain('source_absente');
    expect(defautsMontage(montage({ mention: '.' }))).toContain('mention_non_conforme');
  });
  it('une image d’éditeur sans crédit est refusée ; une image du projet s’en passe', () => {
    expect(defautsMontage(montage({ image: { ...IMAGE, credit: null } }))).toContain('credit_absent');
    expect(defautsMontage(montage({ image: { ...IMAGE, credit: '   ' } }))).toContain('credit_absent');
    expect(defautsMontage(montage({ image: { ...IMAGE, origine: 'projet', credit: null } }))).toEqual([]);
    expect(defautsMontage(montage({ gabarit: 'avant_apres', apres: { ...IMAGE, credit: null } }))).toContain('credit_absent');
  });
  it('refuse un identifiant de fichier, un compte, une loupe ou une position invalides', () => {
    expect(defautsMontage(montage({ id: '../evasion' }))).toContain('identifiant_invalide');
    expect(defautsMontage(montage({ compte: 'inconnu' as Montage['compte'] }))).toContain('compte_inconnu');
    expect(defautsMontage(montage({ gabarit: 'loupe', loupe: { x: 500, y: 50, zoom: 2 } }))).toContain('loupe_hors_cadre');
    expect(defautsMontage(montage({ gabarit: 'loupe', loupe: { x: 50, y: 50, zoom: 0 } }))).toContain('loupe_hors_cadre');
    expect(defautsMontage(montage({ etiquettes: [{ ...etiquette, x: Number.NaN }] }))).toContain('etiquette_hors_cadre');
    expect(defautsMontage(montage({ gabarit: 'terminal_annote', image: null, lignes: ['  '] }))).toContain('commande_absente');
  });
});

describe('document du montage', () => {
  it.each(GABARITS)('gabarit %s : aucune ressource externe', (gabarit) => {
    const document = html(montage({ gabarit, ...COMPLET[gabarit], etiquettes: [etiquette] }));
    expect(document).not.toMatch(/(?:src|href)="https?:/);
    expect(document).not.toContain('<script');
    expect(document).toContain('Agent IA');
    expect(document).toContain('Illustration — ne prouve pas le fonctionnement');
  });
  it('un texte collecté reste du texte, jamais une balise', () => {
    const document = html(montage({ titre: '<img src=x onerror=alert(1)>', etiquettes: [{ ...etiquette, texte: '<script>alert(1)</script>' }], gabarit: 'terminal_annote', image: null, lignes: ['echo "<b>"'] }));
    expect(document).not.toContain('<img src=x');
    expect(document).not.toContain('<script>');
    expect(document).toContain('&lt;img src=x');
    expect(document).toContain('echo &quot;&lt;b&gt;&quot;');
  });
  it('une guillemet dans une adresse ou un texte alternatif ne sort pas de l’attribut', () => {
    const document = html(montage({ image: { ...IMAGE, alt: '" onload="alert(1)' } }));
    expect(document).not.toContain('" onload="');
  });
  it('les crédits d’images et la source figurent au pied, un même crédit une seule fois', () => {
    expect(html(montage())).toContain('Source : acme.example · Crédit');
    expect(html(montage({ gabarit: 'avant_apres', apres: IMAGE }))).toContain('<span>Source : acme.example · Crédit</span>');
  });
  it('le compte colore la planche, le gabarit décide de la composition', () => {
    const document = html(montage({ compte: 'pulse', gabarit: 'avant_apres', apres: IMAGE }));
    expect(document).toContain('data-compte="pulse"');
    expect(document).toContain('<figcaption>Maintenant</figcaption>');
  });
  it('plus le titre est court, plus il est grand', () => {
    expect(tailleTitre('Court')).toBeGreaterThan(tailleTitre('x'.repeat(30)));
    expect(tailleTitre('x'.repeat(30))).toBeGreaterThan(tailleTitre('x'.repeat(60)));
    expect(tailleTitre('x'.repeat(60))).toBeGreaterThan(tailleTitre('x'.repeat(100)));
  });
  it('le texte alternatif reprend le titre, l’image et les annotations', () => {
    expect(texteAlternatif(montage({ etiquettes: [etiquette] }))).toBe('Acme ajoute un mode hors ligne. Une capture. Nouveau bouton');
  });
  it('le texte alternatif décrit ce qui est rendu : seconde image comprise, étiquette non affichée exclue', () => {
    expect(texteAlternatif(montage({ gabarit: 'avant_apres', apres: { ...IMAGE, alt: 'Après' } }))).toContain('Après');
    expect(texteAlternatif(montage({ gabarit: 'photo_titre', etiquettes: [etiquette] }))).not.toContain('Nouveau bouton');
    expect(texteAlternatif(montage({ gabarit: 'terminal_annote', image: null, lignes: ['acme run'] }))).toContain('acme run');
  });
  it('des étiquettes sans point repéré s’empilent, sans fil ni position fixe', () => {
    const document = html(montage({ etiquettes: [{ texte: 'Sans fil', x: 0, y: 0, ancre: null }] }));
    expect(document).toContain('<div class="pile"><span class="etiquette">Sans fil</span></div>');
    expect(document).not.toContain('class="point"');
  });
});

describe('choix de la composition, sans modèle', () => {
  const contenu = { id: 'x', compte: 'nodi' as const, accroche: 'Acme ajoute un mode hors ligne', reperes: ['Hors ligne', 'Sur Linux'], date_annonce: '2026-10-29T17:14:38.000Z', source: 'Source : acme.example', mention: 'Illustration — ne prouve pas le fonctionnement' };
  it('sans image autorisée, les repères deviennent des fiches', () => {
    const m = composerMontage(contenu, null);
    expect(m).toMatchObject({ gabarit: 'fiches', image: null, surtitre: '29 octobre 2026' });
    expect(m.etiquettes.map((e) => e.texte)).toEqual(contenu.reperes);
    expect(defautsMontage(m)).toEqual([]);
  });
  it('une photo autorisée passe en grand, une capture garde ses repères sans fil', () => {
    expect(composerMontage(contenu, { image: IMAGE, genre: 'photo' })).toMatchObject({ gabarit: 'photo_titre', etiquettes: [] });
    const capture = composerMontage(contenu, { image: IMAGE, genre: 'capture' });
    expect(capture.gabarit).toBe('fenetre_annotee');
    expect(capture.etiquettes.every((e) => e.ancre === null)).toBe(true);
    expect(html(capture)).not.toContain('class="point"');
  });
  it('la date affichée est celle de Paris, pas celle d’UTC', () => {
    expect(composerMontage({ ...contenu, date_annonce: '2026-10-29T23:30:00.000Z' }, null).surtitre).toBe('30 octobre 2026');
  });
  it('sans repère ni image, rien n’est rendu', () => {
    expect(defautsMontage(composerMontage({ ...contenu, reperes: [] }, null))).toContain('reperes_absents');
  });
});

describe('montages de démonstration', () => {
  it('sont tous signalés comme exemples et passent les contrôles', () => {
    for (const m of [...montagesDeBase(), ...montagesDerives()]) {
      expect(m.source).toMatch(/^Exemple · /);
      expect(defautsMontage(m)).toEqual([]);
    }
  });
});

describe('contrôle de la mise en page rendue', () => {
  const correct = { hauteur_heros: 600, titre_deborde: false, texte_deborde: false, etiquette_hors_cadre: false, etiquettes_chevauchees: false, etiquette_sur_commande: false, fiches_hors_zone: false, image_illisible: false, image_sur_titre: false, pied_deborde: false };
  it('une mise en page correcte passe', () => {
    expect(defautsMiseEnPage(correct)).toEqual([]);
  });
  it.each([
    [{ hauteur_heros: 300 }, 'titre_trop_long'],
    [{ titre_deborde: true }, 'titre_deborde'],
    [{ texte_deborde: true }, 'texte_deborde'],
    [{ etiquette_sur_commande: true }, 'etiquette_sur_commande'],
    [{ fiches_hors_zone: true }, 'fiches_hors_zone'],
    [{ image_illisible: true }, 'image_illisible'],
    [{ image_sur_titre: true }, 'image_sur_titre'],
    [{ etiquette_hors_cadre: true }, 'etiquette_hors_cadre'],
    [{ etiquettes_chevauchees: true }, 'etiquettes_chevauchees'],
    [{ pied_deborde: true }, 'pied_deborde'],
  ])('%j → %s', (ecart, defaut) => {
    expect(defautsMiseEnPage({ ...correct, ...ecart })).toEqual([defaut]);
  });
});
