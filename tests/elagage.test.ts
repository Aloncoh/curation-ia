// Élagage des champs secondaires en écart (2026-11-05) : on retire, on ne réécrit jamais ; les champs principaux et les
// limites ne sont jamais retirés.
import { describe, expect, it } from 'vitest';
import { elaguer } from '../src/analysis/elagage.ts';
import type { Brouillon } from '../src/analysis/schemas.ts';

const cite = (texte: string) => ({ texte, passages: [`${texte} passage cité`] });
const BROUILLON: Brouillon = {
  accroche: cite('XREAL AURA runs Android XR'),
  description: cite('Glasses with a cabled puck.'),
  nouveaute: cite('First wired XR glasses on Android XR.'),
  ce_que_ca_permet: cite('Work on a private screen.'),
  pour_qui: cite('People on the move.'),
  exemple_usage: null,
  acces: cite('Order on the site.'),
  prerequis: null,
  cout: cite('From USD 1,099.'),
  limites_connues: cite('Few markets at launch.'),
  details: [
    { titre: 'Fonctionnement', texte: 'Light frames.', passages: ['light frames passage cité'] },
    { titre: 'Fonctionnement', texte: 'Play apps.', passages: ['play apps passage cité'] },
    { titre: 'Fonctionnement', texte: 'Private display.', passages: ['private display passage cité'] },
  ],
  attributions: [],
  reperes: [cite('Android XR'), cite('Gemini built in')],
  diapositives: ['accroche', 'acces', 'details:0', 'details:2', 'cout'],
  questions_a_tester: [],
};

describe('élagage des champs secondaires', () => {
  it('retire les champs et éléments en écart, et recale les diapositives des détails gardés', () => {
    const r = elaguer(BROUILLON, [
      { champ: 'acces', code: 'acces_sans_indice' },
      { champ: 'details:0', code: 'nombre_absent_des_citations', detail: '3' },
      { champ: 'reperes:1', code: 'repere_trop_long' },
    ])!;
    expect(r.retires).toEqual(['acces', 'details:0', 'reperes:1']);
    expect(r.brouillon.acces).toBeNull();
    expect(r.brouillon.details.map((d) => d.texte)).toEqual(['Play apps.', 'Private display.']);
    expect(r.brouillon.reperes.map((x) => x.texte)).toEqual(['Android XR']);
    // details:2 devient details:1 ; acces et details:0 disparaissent.
    expect(r.brouillon.diapositives).toEqual(['accroche', 'details:1', 'cout']);
    // Le reste est intact, mot pour mot.
    expect(r.brouillon.accroche).toEqual(BROUILLON.accroche);
    expect(r.brouillon.cout).toEqual(BROUILLON.cout);
  });

  it('ne retire jamais l’accroche, la description, la nouveauté ni une limite connue', () => {
    for (const champ of ['accroche', 'description', 'nouveaute', 'limites_connues']) {
      expect(elaguer(BROUILLON, [{ champ: 'acces', code: 'acces_sans_indice' }, { champ, code: 'contexte_a_relire' }])).toBeNull();
    }
  });

  it('laisse à vérifier un écart global (produit, captures, type d’information, diapositives)', () => {
    for (const champ of ['produit', 'captures', 'type_information', 'diapositives']) expect(elaguer(BROUILLON, [{ champ, code: 'x' }])).toBeNull();
  });

  it('sans écart, il n’y a rien à élaguer', () => {
    expect(elaguer(BROUILLON, [])).toBeNull();
  });
});
