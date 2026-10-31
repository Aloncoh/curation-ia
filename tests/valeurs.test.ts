import { describe, expect, it } from 'vitest';
import { capturesIncompatibles, contradictions, valeursDe } from '../src/analysis/valeurs.ts';

const liste = (ensemble: Set<string>) => [...ensemble].sort();

describe('valeurs extraites d’un texte', () => {
  it('versions : forme à trois nombres, préfixe v ou mot « version »', () => {
    expect(liste(valeursDe('Release v2.1.312, then 1.0.0-beta.1, v3 and version 4.2').versions)).toEqual(['1.0.0-beta.1', '2.1.312', '3', '4.2']);
    expect(liste(valeursDe('Claude Opus 5.5 and 3.14').versions)).toEqual([]);
  });
  it('dates : français, anglais et ISO, avec ou sans année', () => {
    expect(liste(valeursDe('le 1er novembre 2026 et le 30 octobre').dates)).toEqual(['10-30', '2026-11-01']);
    expect(liste(valeursDe('On October 30, 2026, then Nov 2 and 2026-12-24').dates)).toEqual(['11-02', '2026-10-30', '2026-12-24']);
  });
  it('prix : devise avant ou après, milliers et décimales', () => {
    expect(liste(valeursDe('$10, 1,50 €, 1,000 dollars, £5 and 20 usd').prix)).toEqual(['EUR:1.5', 'GBP:5', 'USD:10', 'USD:1000', 'USD:20']);
  });
  it('prix : un nombre voisin, comme dans un tableau, ne s’y soude pas', () => {
    expect(liste(valeursDe('Pro $20 100').prix)).toEqual(['USD:20']);
    expect(liste(valeursDe('$10 20 users').prix)).toEqual(['USD:10']);
    expect(liste(valeursDe('1 000 € par an').prix)).toEqual(['EUR:1000']);
    expect(liste(valeursDe('$1.2.3').prix)).toEqual([]);
  });
  it('prix : trois décimales après un zéro ne sont pas des milliers', () => {
    expect(liste(valeursDe('$0.125 per request').prix)).toEqual(['USD:0.125']);
    expect(liste(valeursDe('$1,250 per year').prix)).toEqual(['USD:1250']);
  });
  it('version : le point final d’une phrase n’en fait pas partie', () => {
    expect(liste(valeursDe('Disponible en version 0.65.0-preview.0.').versions)).toEqual(['0.65.0-preview.0']);
  });
  it('un nombre seul n’est ni un prix ni une date', () => {
    const v = valeursDe('Now 30 percent faster on 12 platforms');
    expect([v.prix.size, v.dates.size, v.versions.size, v.licences.size]).toEqual([0, 0, 0, 0]);
  });
  it('licences : formes courantes ramenées à une seule écriture', () => {
    expect(liste(valeursDe('MIT, Apache 2.0, Apache-2.0, Apache License 2.0, GPL-3.0, BSD-3-Clause').licences)).toEqual(['APACHE2', 'BSD3', 'GPL3', 'MIT']);
    expect(liste(valeursDe('BSD-3 and BSD 3').licences)).toEqual(['BSD3']);
    expect(liste(valeursDe('a limited permit from mit').licences)).toEqual([]);
  });
});

describe('contradictions entre une analyse et sa capture', () => {
  const entre = (affirme: string, source: string, version: string | null = null) => contradictions(valeursDe(affirme), valeursDe(source), version).map((c) => `${c.type}:${c.valeur}`);
  it('prix : la devise compte, et une valeur identique passe', () => {
    expect(entre('10 € par mois', 'costs $10 per month')).toEqual(['prix:EUR:10']);
    expect(entre('10 dollars par mois', 'costs $10 per month')).toEqual([]);
  });
  it('licence, date et version différentes de la capture', () => {
    expect(entre('licence MIT', 'Licensed under Apache-2.0')).toEqual(['licences:MIT']);
    expect(entre('le 30 octobre', 'Published October 29, 2026')).toEqual(['dates:10-30']);
    expect(entre('le 30 octobre 2025', 'Published October 30, 2026')).toEqual(['dates:2025-10-30']);
    expect(entre('version 2.1.312', 'Fixes in 2.1.311')).toEqual(['versions:2.1.312']);
  });
  it('deux écritures de la même version de base ne se contredisent pas', () => {
    expect(entre('version 2', 'Released v2.0')).toEqual([]);
    expect(entre('v2.0', 'Released 2.0.0')).toEqual([]);
    expect(entre('version 0.66.0', 'Release 0.66.0-nightly.20261030')).toEqual([]);
    expect(entre('version 0.67.0', 'Release 0.66.0-nightly.20261030')).toEqual(['versions:0.67.0']);
  });
  it('la version du catalogue n’est jamais une contradiction', () => {
    expect(entre('version 2.1.312', 'Fixes in 2.1.311', '2.1.312')).toEqual([]);
  });
  it('sans valeur de ce type dans la capture, rien n’est comparable', () => {
    expect(entre('10 € et licence MIT, le 30 octobre, version 1.2.3', 'Nothing to compare here')).toEqual([]);
  });
  it('une date sans année correspond à la même date avec année', () => {
    expect(entre('le 30 octobre', 'Published October 30, 2026')).toEqual([]);
  });
});

describe('contradictions entre captures stockées', () => {
  it('deux captures à valeur unique et différente', () => {
    expect(capturesIncompatibles(['Price: $10 per month', 'Price: $20 per month'])).toEqual([{ type: 'prix', valeur: 'USD:10 ≠ USD:20' }]);
    expect(capturesIncompatibles(['Under MIT', 'Under Apache-2.0'])).toEqual([{ type: 'licences', valeur: 'MIT ≠ APACHE2' }]);
    expect(capturesIncompatibles(['Released v1.2.3', 'Released v1.2.4'])).toEqual([{ type: 'versions', valeur: '1.2.3 ≠ 1.2.4' }]);
    expect(capturesIncompatibles(['October 29, 2026', 'October 30, 2026'])).toEqual([{ type: 'dates', valeur: '10-29 ≠ 10-30' }]);
  });
  it('une capture qui donne plusieurs valeurs n’est pas comparable', () => {
    expect(capturesIncompatibles(['Plans at $10 and $20', 'Plan at $30'])).toEqual([]);
  });
  it('une seule capture, ou des valeurs égales, ne contredit rien', () => {
    expect(capturesIncompatibles(['Price: $10'])).toEqual([]);
    expect(capturesIncompatibles(['Price: $10', 'Now $10 per seat'])).toEqual([]);
  });
});
