// Lot VISUEL-LIENS (ADR 0011 §4) : composition du montage d'une ressource et production du visuel. Aucun navigateur ni
// réseau : le rendeur est injecté. Le brouillon et le dépôt sont les fixtures fabriquées du lot SOCLE.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MENTION_ILLUSTRATION } from '../src/analysis/publication.ts';
import { defautsMontage, htmlMontage, SURTITRE_ETAPES, type Montage } from '../src/media/montage.ts';
import type { ResultatRendu } from '../src/media/rendu.ts';
import { lireDepot } from '../src/ressources/capture.ts';
import { BrouillonRessource } from '../src/ressources/schemas.ts';
import { composerMontageRessource, produireVisuel, sourceDuVisuel, SURTITRE_COMMANDE } from '../src/ressources/visuel.ts';

const lire = (nom: string) => readFileSync(fileURLToPath(new URL(`./fixtures/ressources/${nom}`, import.meta.url)), 'utf8');
const BROUILLON = BrouillonRessource.parse(JSON.parse(lire('brouillon-demo-anim.json')));
const DEPOT = lireDepot(lire('depot-demo-skills.json'), 'exemple-org/demo-skills');
const FORK = lireDepot(lire('depot-demo-fork.json'), 'exemple-org/demo-fork');
const ENTREE = { compte: 'repo' as const };
const CAPTURE = '2026-11-02T12:00:00.000Z';

const brouillon = (b: Partial<BrouillonRessource> = {}): BrouillonRessource => ({ ...structuredClone(BROUILLON), ...b });
const etape = (texte: string) => ({ texte, passages: ['Pick the elements to animate.'] });
const html = (m: Montage) => htmlMontage(m, { avatar: 'data:image/png;base64,AAAA', polices: '', nomCompte: 'Repo' });

describe('composition du montage d’une ressource, sans modèle', () => {
  it('au moins deux étapes citées : gabarit étapes, surtitre fixe, textes repris tels quels', () => {
    const m = composerMontageRessource(BROUILLON, ENTREE, DEPOT, CAPTURE);
    expect(m).toMatchObject({ id: 'demo-anim', gabarit: 'etapes', compte: 'repo', titre: BROUILLON.accroche.texte, surtitre: SURTITRE_ETAPES, image: null, lignes: [], etiquettes: [] });
    expect(m.etapes).toEqual(BROUILLON.demarrage.etapes.map((e) => e.texte));
    expect(m.mention).toBe(MENTION_ILLUSTRATION);
    expect(defautsMontage(m)).toEqual([]);
  });
  it('une étape et une commande citée : terminal, signalé comme reconstitution ; une continuation « \\ » reste une seule commande', () => {
    const m = composerMontageRessource(
      brouillon({ demarrage: { ...BROUILLON.demarrage, etapes: [etape('Installer le skill.')], commande: 'npx skills add \\\n  exemple-org/demo-skills   --skill anim' } }),
      ENTREE,
      DEPOT,
      CAPTURE,
    );
    expect(m).toMatchObject({ gabarit: 'terminal_annote', surtitre: SURTITRE_COMMANDE, lignes: ['npx skills add exemple-org/demo-skills --skill anim'], etapes: [] });
    expect(defautsMontage(m)).toEqual([]);
  });
  it('deux commandes sur deux lignes : deux lignes, chacune avec son invite, jamais fondues en une seule', () => {
    const m = composerMontageRessource(
      brouillon({ demarrage: { ...BROUILLON.demarrage, etapes: [etape('Installer le skill.')], commande: 'npm install -g agent-browser\nagent-browser install' } }),
      ENTREE,
      DEPOT,
      CAPTURE,
    );
    expect(m.lignes).toEqual(['npm install -g agent-browser', 'agent-browser install']);
    expect(defautsMontage(m)).toEqual([]);
    expect(html(m).match(/<b>\$<\/b>/g)).toHaveLength(2);
  });
  it('ni deux étapes ni commande : les repères deviennent des fiches', () => {
    const m = composerMontageRessource(brouillon({ demarrage: { ...BROUILLON.demarrage, etapes: [etape('Installer le skill.')], commande: null } }), ENTREE, DEPOT, CAPTURE);
    expect(m.gabarit).toBe('fiches');
    expect(m.etiquettes.map((e) => e.texte)).toEqual(BROUILLON.reperes.map((r) => r.texte));
    expect(defautsMontage(m)).toEqual([]);
  });
  it('les étapes priment sur la commande, même quand elle existe', () => {
    expect(BROUILLON.demarrage.commande).not.toBeNull();
    expect(composerMontageRessource(BROUILLON, ENTREE, DEPOT, CAPTURE).gabarit).toBe('etapes');
  });
  it('une étape trop longue n’est pas raccourcie en silence : le montage est refusé', () => {
    const m = composerMontageRessource(brouillon({ demarrage: { ...BROUILLON.demarrage, etapes: [etape('Installer.'), etape('x'.repeat(81))] } }), ENTREE, DEPOT, CAPTURE);
    expect(m.etapes[1]).toHaveLength(81);
    expect(defautsMontage(m)).toContain('etapes_hors_limites');
  });
  it('quatre étapes passent, le gabarit n’en accepte pas plus', () => {
    const quatre = composerMontageRessource(brouillon({ demarrage: { ...BROUILLON.demarrage, etapes: ['Un', 'Deux', 'Trois', 'Quatre'].map(etape) } }), ENTREE, DEPOT, CAPTURE);
    expect(defautsMontage(quatre)).toEqual([]);
    expect(defautsMontage({ ...quatre, etapes: [...quatre.etapes, 'Cinq'] })).toContain('etapes_hors_limites');
  });
});

describe('pied du visuel', () => {
  it('dépôt canonique et jour de capture à Paris', () => {
    expect(sourceDuVisuel(DEPOT, CAPTURE)).toBe('Source : github.com/exemple-org/demo-skills · capturé le 2\u00a0novembre\u00a02026');
    expect(sourceDuVisuel(DEPOT, '2026-11-01T23:30:00.000Z')).toContain('capturé le 2\u00a0novembre\u00a02026');
  });
  it('un fork nomme son parent, dans le pied comme dans le document rendu', () => {
    expect(sourceDuVisuel(FORK, CAPTURE)).toBe('Source : github.com/exemple-org/demo-fork · capturé le 2\u00a0novembre\u00a02026 · Fork de origine-org/learning-loop');
    const m = composerMontageRessource(BROUILLON, ENTREE, FORK, CAPTURE);
    expect(html(m)).toContain('Fork de origine-org/learning-loop');
  });
  it('le document du montage ne charge rien du réseau et porte la mention d’illustration', () => {
    const document = html(composerMontageRessource(BROUILLON, ENTREE, DEPOT, CAPTURE));
    expect(document).not.toMatch(/(?:src|href)="https?:/);
    expect(document).not.toContain('<script');
    expect(document).toContain(MENTION_ILLUSTRATION);
    expect(document).toContain(SURTITRE_ETAPES);
  });
});

describe('production du visuel, rendeur injecté', () => {
  const montage = composerMontageRessource(BROUILLON, ENTREE, DEPOT, CAPTURE);
  const rendeur = (r: Partial<ResultatRendu>) => async (montages: Montage[], dossier: string): Promise<ResultatRendu[]> =>
    montages.map((m) => ({ id: m.id, fichier: `${dossier}/${m.id}.jpg`, defauts: [], duree_ms: 12, octets: 4_096, ...r }));

  it('un rendu réussi donne le contenu de media_asset et son texte alternatif', async () => {
    const issue = await produireVisuel(montage, { dossier: 'sortie', rendre: rendeur({}) });
    expect(issue).toEqual({
      ok: true,
      media: {
        content: { forme: 'montage', gabarit: 'etapes', fichier: 'sortie/demo-anim.jpg', octets: 4_096 },
        alt_text: `${BROUILLON.accroche.texte}. Étape 1 : ${BROUILLON.demarrage.etapes[0]!.texte}. Étape 2 : ${BROUILLON.demarrage.etapes[1]!.texte}`,
      },
    });
  });
  it('un défaut de mise en page donne visuel_absent avec ses motifs', async () => {
    expect(await produireVisuel(montage, { rendre: rendeur({ fichier: null, defauts: ['etapes_hors_zone'] }) })).toEqual({ ok: false, motif: 'visuel_absent', defauts: ['etapes_hors_zone'] });
  });
  it('un navigateur absent donne visuel_absent, sans exception', async () => {
    const issue = await produireVisuel(montage, { rendre: async () => Promise.reject(new Error('Chrome introuvable')) });
    expect(issue).toMatchObject({ ok: false, motif: 'visuel_absent' });
    expect(issue.ok ? [] : issue.defauts[0]).toContain('Chrome introuvable');
  });
  it('un rendu qui oublie le montage n’est pas pris pour un succès', async () => {
    expect(await produireVisuel(montage, { rendre: async () => [] })).toEqual({ ok: false, motif: 'visuel_absent', defauts: ['rendu_absent'] });
  });
});
