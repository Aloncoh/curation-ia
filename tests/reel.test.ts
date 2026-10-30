import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { verifierExemple, type MaquetteExemple } from '../src/maquette/data.ts';
import { EXEMPLES, type ExemplePublication } from '../src/maquette/exemples.ts';
import {
  CHAMPS_DU_REEL,
  decouperEnSousTitres,
  envelopper,
  horodatage,
  MENTION_ANALYSE,
  MENTION_ILLUSTRATION,
  mettreEnPage,
  minuterSousTitres,
  mots,
  planDessin,
  segmentsDuReel,
  textesDessines,
  versWebVTT,
} from '../src/maquette/reel.ts';

/** Exemple contrôlé contre une capture qui contient tous ses passages (la vraie capture est testée dans maquette.test.ts). */
function exempleVerifie(source: ExemplePublication, capture?: string): MaquetteExemple {
  const passages = [source.accroche, source.nouveaute, source.ce_que_ca_permet, source.pour_qui, source.limites_connues, ...source.details, ...source.attributions]
    .flatMap((champ) => champ?.passages ?? []);
  return {
    id: source.id,
    compte: source.compte,
    // Version de l'actualité : pour ces exemples, c'est le titre du média quand il est un numéro de version.
    ...verifierExemple(source, capture ?? passages.join(' '), /^\d+(?:\.\d+)+$/.test(source.titre_media) ? source.titre_media : null),
    actualite: {
      id: 1,
      kind: 'annonce',
      title: 'titre',
      announced_at: '2026-10-28T17:00:00.000Z',
      first_seen_at: '2026-10-30T00:00:00.000Z',
      product: null,
      version: null,
      source: { id: source.source_id, name: 'source', url: source.url },
    },
    capture: { content_hash: 'h', captured_at: '2026-10-30T00:00:00.000Z', mode: 'live', run_id: 'r', text_length: 1 },
    media: source.media,
    titre_media: source.titre_media,
    categories: source.categories,
    questions_a_tester: source.questions_a_tester,
  };
}

const FUSION = EXEMPLES.find((e) => e.id === 'exemple-copilot-fusion')!;

describe('segments du Reel', () => {
  it('reprennent mot pour mot les champs vérifiés de l’exemple, dans l’ordre demandé', () => {
    const segments = segmentsDuReel(exempleVerifie(FUSION));
    expect(segments.map((s) => s.champ)).toEqual(CHAMPS_DU_REEL);
    expect(segments.map((s) => s.texte)).toEqual([FUSION.accroche.texte, FUSION.nouveaute.texte, FUSION.details[0]!.texte, FUSION.limites_connues!.texte]);
    expect(segments.map((s) => s.libelle)).toEqual(['Accroche', 'Nouveauté', FUSION.details[0]!.titre, 'Limites connues']);
  });

  it('refusent un exemple « à vérifier » et un champ non renseigné', () => {
    expect(() => segmentsDuReel(exempleVerifie(FUSION, 'capture sans les passages'))).toThrow(/à vérifier/);
    const codex = EXEMPLES.find((e) => e.id === 'exemple-codex-cli-0-166-0')!;
    expect(() => segmentsDuReel(exempleVerifie(codex), ['accroche', 'pour_qui'])).toThrow(/non renseigné/);
    expect(() => segmentsDuReel(exempleVerifie(codex), ['details:5'])).toThrow(/absent/);
  });
});

describe('mise en page du texte', () => {
  it('ponctuation double française jamais en début de ligne, guillemets collés à leur mot', () => {
    expect(mots('trois niveaux : Standard ; « Max » !')).toEqual(['trois', 'niveaux :', 'Standard ;', '« Max » !']);
    for (const ligne of envelopper(FUSION.details[0]!.texte, 20)) expect(ligne).not.toMatch(/^[;:!?»]/u);
  });

  it('les lignes respectent la largeur et redonnent le texte exact', () => {
    for (const largeur of [12, 25, 37]) {
      const lignes = envelopper(FUSION.nouveaute.texte, largeur);
      expect(lignes.join(' ')).toBe(FUSION.nouveaute.texte);
      for (const ligne of lignes) expect(ligne.length <= largeur || !ligne.includes(' ')).toBe(true);
    }
  });

  it('choisit la plus grande taille qui tient, réduit la taille pour un texte long, refuse un texte trop long', () => {
    expect(mettreEnPage(FUSION.accroche.texte, 560).taille).toBe(46);
    const long = mettreEnPage(FUSION.details[0]!.texte, 530);
    expect(long.taille).toBeLessThan(46);
    expect(long.lignes.join(' ')).toBe(FUSION.details[0]!.texte);
    expect(() => mettreEnPage('mot '.repeat(400), 300)).toThrow(/trop long/);
  });
});

describe('plan de dessin du Reel', () => {
  it('chaque image porte toutes les mentions, et seulement des textes venus de textesDessines', () => {
    const exemple = exempleVerifie(FUSION);
    const textes = textesDessines(exemple, segmentsDuReel(exemple));
    for (const [i, segment] of textes.segments.entries()) {
      const plan = planDessin(textes, i);
      const dessines = plan.map((e) => e.texte);
      for (const mention of [MENTION_ILLUSTRATION, MENTION_ANALYSE]) expect(dessines).toContain(mention);
      expect(plan.find((e) => e.nom === 'corps')!.texte.split('\n').join(' ')).toBe(segment.corps);
      expect(plan.find((e) => e.nom === 'libelle')!.texte.split('\n').join(' ')).toBe(segment.libelle);
      const autorises = new Set([textes.entete, textes.titre, textes.source, ...textes.mentions, `${i + 1}/${textes.segments.length}`]);
      for (const e of plan.filter((e) => e.nom !== 'corps' && e.nom !== 'libelle')) expect(autorises.has(e.texte)).toBe(true);
      // Les mentions et la source restent sous la mascotte, dans l'image.
      for (const e of plan.filter((e) => e.nom.startsWith('mention') || e.nom === 'source')) expect(e.y).toBeGreaterThan(1140);
      expect(Math.max(...plan.map((e) => e.y))).toBeLessThan(1260);
    }
  });
});

describe('sous-titres WebVTT', () => {
  it('découpage : morceaux courts, texte exact, coupe de préférence après une ponctuation', () => {
    const texte = FUSION.details[0]!.texte;
    const morceaux = decouperEnSousTitres(texte);
    expect(morceaux.join(' ')).toBe(texte);
    for (const morceau of morceaux) expect(morceau.length).toBeLessThanOrEqual(70);
    expect(morceaux.some((m) => /[;,]$/u.test(m))).toBe(true);
  });

  it('minutage contigu dans chaque segment, borné par la durée de parole', () => {
    const segments = [
      { texte: FUSION.accroche.texte, debut: 0, dureeParole: 5.3 },
      { texte: FUSION.details[0]!.texte, debut: 6.1, dureeParole: 13 },
    ];
    const sousTitres = minuterSousTitres(segments);
    for (const [i, st] of sousTitres.entries()) {
      expect(st.fin).toBeGreaterThan(st.debut);
      if (i > 0) expect(st.debut).toBeGreaterThanOrEqual(sousTitres[i - 1]!.fin);
    }
    expect(sousTitres[0]!.debut).toBe(0);
    expect(sousTitres.filter((st) => st.fin <= 5.3).at(-1)!.fin).toBeCloseTo(5.3, 3);
    expect(sousTitres.at(-1)!.fin).toBeCloseTo(19.1, 3);
  });

  it('format : en-tête WEBVTT, horodatages hh:mm:ss.mmm, lignes de 37 caractères au plus', () => {
    expect(horodatage(3723.4567)).toBe('01:02:03.457');
    const vtt = versWebVTT([{ debut: 0, fin: 2.5, texte: FUSION.accroche.texte }]);
    expect(vtt.startsWith('WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500\n')).toBe(true);
    for (const ligne of vtt.split('\n').slice(4)) expect(ligne.length).toBeLessThanOrEqual(37);
    expect(versWebVTT([{ debut: 0, fin: 1, texte: 'a' }], 'line:74%')).toContain('00:00:00.000 --> 00:00:01.000 line:74%\na');
  });
});

describe('Reel versionné de la maquette (maquette/medias)', () => {
  // Garde-fou contre un média périmé : si exemples.ts change, relancer « npm run maquette:reel ».
  const medias = (nom: string) => new URL(`../maquette/medias/${nom}`, import.meta.url);
  const manifeste = JSON.parse(readFileSync(medias('reel-copilot-fusion.json'), 'utf8')) as {
    exemple_id: string;
    origine: string;
    mention: string;
    mention_analyse: string;
    niveau_de_preuve: string;
    source: { nom: string; date_annonce: string | null };
    empreintes_sha256: { video: string; sous_titres: string };
    textes_dessines: ReturnType<typeof textesDessines>;
    segments: { champ: string; texte: string; debut: number; fin: number }[];
  };
  const vtt = readFileSync(medias('reel-copilot-fusion.vtt'), 'utf8');
  const sha256 = (nom: string) => createHash('sha256').update(readFileSync(medias(nom))).digest('hex');

  it('reprend les textes actuels de l’exemple et porte les mentions obligatoires', () => {
    expect(manifeste).toMatchObject({
      exemple_id: FUSION.id,
      origine: 'generated',
      mention: MENTION_ILLUSTRATION,
      mention_analyse: MENTION_ANALYSE,
      niveau_de_preuve: 'documentary_analysis',
    });
    expect(manifeste.segments.map((s) => s.texte)).toEqual(segmentsDuReel(exempleVerifie(FUSION)).map((s) => s.texte));
  });

  it('les textes dessinés sont exactement ceux de textesDessines, et les fichiers sont ceux que décrit le manifeste', () => {
    const exemple = exempleVerifie(FUSION);
    const attendu = textesDessines(
      { ...exemple, actualite: { ...exemple.actualite, announced_at: manifeste.source.date_annonce, source: { ...exemple.actualite.source, name: manifeste.source.nom } } },
      segmentsDuReel(exemple),
    );
    expect(manifeste.textes_dessines).toEqual(attendu);
    expect(attendu.mentions).toEqual([MENTION_ILLUSTRATION, MENTION_ANALYSE]);
    expect(attendu.entete).toMatch(/EXEMPLE/);
    // Le .mp4 et le .vtt versionnés sont ceux qui ont été produits avec ces textes (sinon : npm run maquette:reel).
    expect(sha256('reel-copilot-fusion.mp4')).toBe(manifeste.empreintes_sha256.video);
    expect(sha256('reel-copilot-fusion.vtt')).toBe(manifeste.empreintes_sha256.sous_titres);
  });

  it('ses sous-titres redonnent exactement le texte de chaque segment, dans les bornes du segment', () => {
    const blocs = vtt
      .trim()
      .split('\n\n')
      .slice(1)
      .map((bloc) => {
        const [, temps, ...lignes] = bloc.split('\n');
        const [debut, fin] = temps!.split(' --> ').map((t) => {
          const [h, m, s] = t.split(' ')[0]!.split(':');
          return Number(h) * 3600 + Number(m) * 60 + Number(s);
        });
        return { debut: debut!, fin: fin!, texte: lignes.join(' ') };
      });
    for (const segment of manifeste.segments) {
      const dedans = blocs.filter((b) => b.debut >= segment.debut - 0.001 && b.fin <= segment.fin + 0.001);
      expect(dedans.map((b) => b.texte).join(' ')).toBe(segment.texte);
    }
  });
});
