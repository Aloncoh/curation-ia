import { describe, expect, it } from 'vitest';
import { coutChaine, coutMensuel, FLUX_MENSUEL_MINIMAL, HYPOTHESES, prixMoyen, TARIFS_ESTIMATION, verificateurDe, type Hypotheses } from '../src/analysis/estimation.ts';
import { TARIFS } from '../src/analysis/tarifs.ts';

const flash = TARIFS_ESTIMATION['deepseek-flash']!;
const base: Hypotheses = {
  nom: 'test', part_pleines: 0, part_cache: 0, prefixe_qualification: 1000, prefixe_redaction: 1000, document_qualification: 0, document_redaction: 0,
  sortie_qualification: 1000, sortie_redaction: 1000, raisonnement_qualification: 0, raisonnement_redaction: 0, taux_retenue: 0.5, taux_publiable: 0.5, taux_reprise: 0,
};

describe('prix moyen', () => {
  it('pondère heures creuses et heures pleines', () => {
    expect(prixMoyen(flash, 0)).toEqual(flash.creuses);
    expect(prixMoyen(flash, 1)).toEqual(flash.pleines);
    expect(prixMoyen(flash, 0.5).entree).toBeCloseTo(0.225);
  });
  it('les tarifs Anthropic de l’estimation sont ceux du budget réel', () => {
    for (const nom of ['claude-haiku-5-5', 'claude-sonnet-5-5']) {
      expect(TARIFS_ESTIMATION[nom]!.creuses.entree).toBe(TARIFS[nom]!.entree);
      expect(TARIFS_ESTIMATION[nom]!.creuses.sortie).toBe(TARIFS[nom]!.sortie);
    }
  });
});

describe('coût d’une chaîne', () => {
  it('calcul exact sur des tokens ronds', () => {
    const c = coutChaine(flash, base);
    expect(c.qualification).toBeCloseTo((1000 * 0.15 + 1000 * 0.6) / 1e6, 10);
    expect(c.redaction).toBeCloseTo(c.qualification, 10);
    expect(c.par_actualite).toBeCloseTo(c.qualification * 1.5, 10);
    expect(c.actualites_par_publication).toBe(4);
    expect(c.par_publication).toBeCloseTo(c.par_actualite * 4, 10);
  });
  it('le cache ne touche que le préfixe, jamais le document ni la sortie', () => {
    const sansCache = coutChaine(flash, { ...base, document_qualification: 500 });
    const avecCache = coutChaine(flash, { ...base, document_qualification: 500, part_cache: 1 });
    expect(sansCache.qualification - avecCache.qualification).toBeCloseTo(1000 * (0.15 - 0.003) / 1e6, 10);
  });
  it('le raisonnement se paie au tarif de sortie', () => {
    expect(coutChaine(flash, { ...base, raisonnement_redaction: 1000 }).redaction).toBeCloseTo((1000 * 0.15 + 2000 * 0.6) / 1e6, 10);
  });
  it('les reprises et la vérification s’ajoutent sans toucher aux autres postes', () => {
    const reprises = coutChaine(flash, { ...base, taux_reprise: 0.1 });
    expect(reprises.reprises).toBeCloseTo(0.1 * (reprises.qualification + 0.5 * reprises.redaction), 10);
    const avecVerification = coutChaine(flash, { ...base, taux_reprise: 0.1 }, { modele: flash, prefixe: 500, sortie: 100 });
    expect(avecVerification.reprises).toBeCloseTo(0.1 * (avecVerification.qualification + 0.5 * (avecVerification.redaction + avecVerification.verification)), 10);
    const verifiee = coutChaine(flash, base, { modele: flash, prefixe: 500, sortie: 100 });
    expect(verifiee.verification).toBeCloseTo((500 * 0.15 + 1000 * 0.15 + 100 * 0.6) / 1e6, 10);
    expect(coutChaine(flash, base).verification).toBe(0);
  });
  it('un sujet écarté coûte sa qualification à chaque publication', () => {
    expect(coutChaine(flash, { ...base, taux_retenue: 0.25 }).par_publication).toBeGreaterThan(coutChaine(flash, base).par_publication);
  });
});

describe('vérificateur', () => {
  it('n’est jamais le modèle qui a rédigé', () => {
    for (const nom of Object.keys(TARIFS_ESTIMATION)) expect(verificateurDe(nom).nom).not.toBe(TARIFS_ESTIMATION[nom]!.nom);
  });
});

describe('coût mensuel', () => {
  const c = coutChaine(flash, base);
  it('suit le nombre d’actualités à analyser', () => {
    expect(coutMensuel(c, 100)).toMatchObject({ publications: 100, actualites: 400 });
  });
  it('le flux collecté est analysé même si peu de sujets sont publiés', () => {
    expect(coutMensuel(c, 30, FLUX_MENSUEL_MINIMAL).actualites).toBe(FLUX_MENSUEL_MINIMAL);
  });
  it('au-delà des publications visées, un sujet retenu attend : seuls les brouillons utiles sont payés', () => {
    expect(coutMensuel(c, 30, FLUX_MENSUEL_MINIMAL).cout).toBeCloseTo(FLUX_MENSUEL_MINIMAL * c.qualification + 60 * c.redaction, 10);
  });
  it('sans plancher, le mois vaut le coût par publication', () => {
    expect(coutMensuel(c, 100).cout).toBeCloseTo(100 * c.par_publication, 10);
  });
});

describe('hypothèses', () => {
  it('sont ordonnées : bas, central, haut, pour chaque modèle', () => {
    expect(HYPOTHESES.map((h) => h.nom)).toEqual(['bas', 'central', 'haut']);
    for (const t of Object.values(TARIFS_ESTIMATION)) {
      const [bas, central, haut] = HYPOTHESES.map((h) => coutChaine(t, h).par_publication);
      expect(bas!).toBeLessThan(central!);
      expect(central!).toBeLessThan(haut!);
    }
  });
});
