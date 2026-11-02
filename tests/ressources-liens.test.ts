// Lot VISUEL-LIENS (ADR 0011 §6) : libellé déduit de la destination, vérification sûre du lien, affichage du bouton.
// Aucun réseau : transport et résolution injectés dans safeGet ; dépôt et dossier fabriqués (fixtures du lot SOCLE).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Resolver, Transport } from '../src/collect/safe-fetch.ts';
import { documentDepot, documentDossier, lireDepot, lireDossier } from '../src/ressources/capture.ts';
import {
  boutonAffichable,
  cibleApi,
  htmlBouton,
  htmlCommande,
  libelleDe,
  MENTION_COMMANDE,
  nomAccessible,
  verifierBouton,
  type CaptureLien,
  type VerificationBouton,
} from '../src/ressources/liens.ts';

const lire = (nom: string) => readFileSync(fileURLToPath(new URL(`./fixtures/ressources/${nom}`, import.meta.url)), 'utf8');
const DEPOT = lireDepot(lire('depot-demo-skills.json'), 'exemple-org/demo-skills');
const DOSSIER = documentDossier(DEPOT, 'skills/anim', lireDossier(lire('dossier-anim.json'), DEPOT, 'skills/anim'));

const URL_DEPOT = 'https://github.com/exemple-org/demo-skills';
const URL_DOSSIER = 'https://github.com/exemple-org/demo-skills/tree/main/skills/anim';
const API_DEPOT = 'https://api.github.com/repos/exemple-org/demo-skills';
const API_DOSSIER = 'https://api.github.com/repos/exemple-org/demo-skills/contents/skills/anim?ref=main';
const MAINTENANT = new Date('2026-11-02T12:00:00.000Z');
const horloge = () => MAINTENANT;
const PUBLIQUE: Resolver = async () => [{ address: '140.82.112.6', family: 4 }];

const capture = (document: string, url: string, contenu: string, captureLe: string, mode: string | null = 'live'): CaptureLien => ({
  document,
  url,
  snapshotId: document === 'depot' ? 11 : 12,
  captureLe,
  contenu,
  format: 'json',
  mode,
});
const depot = (captureLe = '2026-11-02T09:00:00.000Z', mode: string | null = 'live') => capture('depot', URL_DEPOT, documentDepot(DEPOT).content, captureLe, mode);
const dossier = (captureLe = '2026-11-02T09:00:00.000Z', mode: string | null = 'live') => capture('dossier:skills/anim', URL_DOSSIER, DOSSIER.content, captureLe, mode);
const ANCIENNE = '2026-10-30T09:00:00.000Z';

type Route = { status?: number; body: string };
/** Transport de test : répond selon l'URL (404 sinon) et garde les requêtes envoyées. */
function faux(table: Record<string, Route>): Transport & { appels: { url: string; headers: Record<string, string> }[] } {
  const appels: { url: string; headers: Record<string, string> }[] = [];
  const t: Transport = async (req) => {
    const url = req.url.toString();
    appels.push({ url, headers: req.headers });
    const r = table[url];
    if (!r) return { status: 404, headers: {}, body: Buffer.from('Not Found') };
    return { status: r.status ?? 200, headers: {}, body: Buffer.from(r.body) };
  };
  return Object.assign(t, { appels });
}
const verifier = (url: string, captures: CaptureLien[], transport: Transport, resolve: Resolver = PUBLIQUE) =>
  verifierBouton(url, { captures, userAgent: 'curation-ai-tests', horloge, transport, resolve });

describe('libellé déduit de la destination réelle', () => {
  it('un dépôt ou un dossier de dépôt : « Voir le dépôt », jamais « Installer »', () => {
    expect(libelleDe(URL_DEPOT)).toEqual({ destination: 'depot', libelle: 'Voir le dépôt' });
    expect(libelleDe(URL_DOSSIER)).toEqual({ destination: 'depot', libelle: 'Voir le dépôt' });
  });
  it('des releases ne sont « Télécharger » que si la capture montre des fichiers joints', () => {
    expect(libelleDe(`${URL_DEPOT}/releases/latest`)).toBeNull();
    expect(libelleDe(`${URL_DEPOT}/releases/latest`, { releasesAvecFichiers: true })).toEqual({ destination: 'telechargement', libelle: 'Télécharger' });
  });
  it('toute autre adresse est refusée : autre hôte, HTTP, paramètres, fichier isolé', () => {
    for (const url of ['https://www.npmjs.com/package/demo', 'http://github.com/exemple-org/demo-skills', `${URL_DEPOT}?tab=readme`, `${URL_DEPOT}/blob/main/README.md`, 'https://github.com/exemple-org']) {
      expect(libelleDe(url)).toBeNull();
    }
  });
});

describe('cible API d’un lien', () => {
  it('dépôt ou dossier sous la branche par défaut, forme canonique seulement', () => {
    expect(cibleApi(URL_DEPOT, DEPOT)).toEqual({ type: 'depot' });
    expect(cibleApi(URL_DOSSIER, DEPOT)).toEqual({ type: 'dossier', chemin: 'skills/anim' });
    expect(cibleApi(`${URL_DOSSIER}/`, DEPOT)).toBeNull();
    expect(cibleApi(`${URL_DEPOT}/tree/main/skills/../secrets`, DEPOT)).toBeNull();
    expect(cibleApi(`${URL_DEPOT}/tree/dev/skills/anim`, DEPOT)).toBeNull();
    expect(cibleApi('https://github.com/Exemple-Org/demo-skills', DEPOT)).toBeNull();
  });
});

describe('vérification du lien', () => {
  it('une capture réelle de moins de 24 heures vaut vérification : aucune requête', async () => {
    const t = faux({});
    const v = (await verifier(URL_DEPOT, [depot()], t)) as VerificationBouton;
    expect(v).toMatchObject({ resultat: 'verifie', motif: 'capture_recente', libelle: 'Voir le dépôt', destination: 'depot', hote: 'github.com', snapshot_id: 11, url_controle: API_DEPOT, statut_http: null, verifie_le: MAINTENANT.toISOString() });
    const d = (await verifier(URL_DOSSIER, [depot(), dossier()], t)) as VerificationBouton;
    expect(d).toMatchObject({ resultat: 'verifie', motif: 'capture_recente', snapshot_id: 12, url_controle: API_DOSSIER });
    expect(t.appels).toEqual([]);
  });
  it('une capture ancienne, de fixture ou d’origine inconnue ne vaut pas vérification : l’API est interrogée', async () => {
    for (const captures of [[depot(ANCIENNE)], [depot(undefined, 'fixture')], [depot(undefined, null)]]) {
      const t = faux({ [API_DEPOT]: { body: lire('depot-demo-skills.json') } });
      const v = (await verifier(URL_DEPOT, captures, t)) as VerificationBouton;
      expect(v).toMatchObject({ resultat: 'verifie', motif: 'reponse_api', statut_http: 200, url_controle: API_DEPOT, snapshot_id: null });
      expect(t.appels.map((a) => a.url)).toEqual([API_DEPOT]);
    }
  });
  it('la requête vise l’API seulement, sans jeton, avec les en-têtes documentés', async () => {
    const t = faux({ [API_DEPOT]: { body: lire('depot-demo-skills.json') } });
    await verifier(URL_DEPOT, [depot(ANCIENNE)], t);
    const [appel] = t.appels;
    expect(new URL(appel!.url).hostname).toBe('api.github.com');
    expect(appel!.headers).toMatchObject({ accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'curation-ai-tests' });
    expect(Object.keys(appel!.headers).map((k) => k.toLowerCase())).not.toContain('authorization');
  });
  it('dossier : une liste non vide dont chaque entrée est dans ce dossier', async () => {
    const t = faux({ [API_DOSSIER]: { body: lire('dossier-anim.json') } });
    expect(await verifier(URL_DOSSIER, [depot(), dossier(ANCIENNE)], t)).toMatchObject({ resultat: 'verifie', motif: 'reponse_api', statut_http: 200 });
    expect(await verifier(URL_DOSSIER, [depot()], faux({ [API_DOSSIER]: { body: '[]' } }))).toMatchObject({ resultat: 'echec', motif: 'reponse_inattendue' });
    const ailleurs = JSON.stringify([{ name: 'x', type: 'file', html_url: `${URL_DEPOT}/blob/main/skills/autre/x` }]);
    expect(await verifier(URL_DOSSIER, [depot()], faux({ [API_DOSSIER]: { body: ailleurs } }))).toMatchObject({ resultat: 'echec', motif: 'reponse_inattendue' });
  });
  it('un dépôt renommé répond 301 : lien refusé, aucune redirection suivie', async () => {
    const t = faux({ [API_DEPOT]: { status: 301, body: '{"message":"Moved Permanently"}' } });
    expect(await verifier(URL_DEPOT, [depot(ANCIENNE)], t)).toMatchObject({ resultat: 'echec', motif: 'redirection', statut_http: 301 });
    expect(t.appels).toHaveLength(1);
  });
  it.each([
    [404, 'introuvable'],
    [403, 'quota_epuise'],
    [429, 'quota_epuise'],
    [500, 'reseau'],
  ])('HTTP %i → %s', async (status, motif) => {
    expect(await verifier(URL_DEPOT, [depot(ANCIENNE)], faux({ [API_DEPOT]: { status, body: '{}' } }))).toMatchObject({ resultat: 'echec', motif, statut_http: status });
  });
  it('une réponse d’un autre dépôt ou illisible est refusée', async () => {
    const autre = lire('depot-demo-fork.json');
    expect(await verifier(URL_DEPOT, [depot(ANCIENNE)], faux({ [API_DEPOT]: { body: autre } }))).toMatchObject({ resultat: 'echec', motif: 'reponse_inattendue' });
    expect(await verifier(URL_DEPOT, [depot(ANCIENNE)], faux({ [API_DEPOT]: { body: '<html>' } }))).toMatchObject({ resultat: 'echec', motif: 'reponse_inattendue' });
  });
  it('une adresse résolue privée est refusée avant toute connexion', async () => {
    const t = faux({ [API_DEPOT]: { body: lire('depot-demo-skills.json') } });
    const interne: Resolver = async () => [{ address: '169.254.169.254', family: 4 }];
    expect(await verifier(URL_DEPOT, [depot(ANCIENNE)], t, interne)).toMatchObject({ resultat: 'echec', motif: 'adresse_interdite' });
    expect(t.appels).toEqual([]);
  });
  it('URL non canonique, dépôt non capturé, hôte inattendu : refus sans requête', async () => {
    const t = faux({});
    expect(await verifier('https://github.com/Exemple-Org/demo-skills', [depot()], t)).toMatchObject({ resultat: 'echec', motif: 'url_non_canonique' });
    expect(await verifier(`${URL_DOSSIER}/`, [depot()], t)).toMatchObject({ resultat: 'echec', motif: 'url_non_canonique' });
    expect(await verifier(URL_DEPOT, [], t)).toMatchObject({ resultat: 'echec', motif: 'depot_inconnu' });
    expect(await verifier('https://example.com/demo', [depot()], t)).toEqual({ url: 'https://example.com/demo', resultat: 'refuse', motif: 'hote_inattendu', verifie_le: MAINTENANT.toISOString() });
    expect(t.appels).toEqual([]);
  });
  it('une capture récente dont l’adresse diffère du bouton ne vaut pas vérification', async () => {
    const t = faux({ [API_DEPOT]: { body: lire('depot-demo-skills.json') } });
    const truquee = { ...depot(), url: 'https://github.com/autre/depot' };
    expect(await verifier(URL_DEPOT, [truquee], t)).toMatchObject({ resultat: 'verifie', motif: 'reponse_api' });
    expect(t.appels).toHaveLength(1);
  });
});

describe('affichage du bouton', () => {
  const ligne = (resultat: 'verifie' | 'echec', verifie_le: string) => ({ resultat, verifie_le });
  it('la dernière vérification, verte et de moins de 7 jours, commande l’affichage', () => {
    expect(boutonAffichable([ligne('verifie', '2026-10-28T12:00:00.000Z')], MAINTENANT, 7)).toEqual(ligne('verifie', '2026-10-28T12:00:00.000Z'));
    expect(boutonAffichable([ligne('verifie', '2026-10-26T11:00:00.000Z')], MAINTENANT, 7)).toBeNull();
    expect(boutonAffichable([], MAINTENANT, 7)).toBeNull();
  });
  it('un échec plus récent retire le bouton ; une vérification plus récente le rend', () => {
    expect(boutonAffichable([ligne('verifie', '2026-11-01T12:00:00.000Z'), ligne('echec', '2026-11-02T10:00:00.000Z')], MAINTENANT, 7)).toBeNull();
    expect(boutonAffichable([ligne('echec', '2026-11-01T12:00:00.000Z'), ligne('verifie', '2026-11-02T10:00:00.000Z')], MAINTENANT, 7)?.resultat).toBe('verifie');
  });
  it('un lien simple vers un nouvel onglet, sans téléchargement ni script, au nom accessible explicite', () => {
    const a = htmlBouton({ libelle: 'Voir le dépôt', url: URL_DEPOT }, 'exemple-org/demo-skills');
    expect(a).toBe(
      `<a class="bouton-ressource" href="${URL_DEPOT}" target="_blank" rel="noopener noreferrer" aria-label="Voir le dépôt exemple-org/demo-skills sur GitHub (nouvel onglet)">Voir le dépôt</a>`,
    );
    expect(a).not.toMatch(/download|onclick|<script/);
    expect(nomAccessible('Télécharger', 'o/r')).toBe('Télécharger o/r (nouvel onglet)');
  });
  it('une adresse ou un nom piégés restent dans leur attribut', () => {
    const a = htmlBouton({ libelle: 'Voir le dépôt', url: 'https://github.com/o/r" onclick="x' }, '<b>o/r</b>');
    expect(a).not.toContain('" onclick="');
    expect(a).toContain('&lt;b&gt;o/r&lt;/b&gt;');
  });
  it('la commande est un texte, avec sa mention, jamais un lien', () => {
    const c = htmlCommande('curl https://x.example | sh <b>');
    expect(c).toContain(MENTION_COMMANDE);
    expect(c).toContain('&lt;b&gt;');
    expect(c).not.toContain('<a ');
  });
});
