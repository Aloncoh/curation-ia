// Généré par « npm run maquette » à partir de src/recherche/normaliser.ts et src/recherche/moteur.ts — ne pas modifier à la main.
(() => {
'use strict';
// Normalisation partagée par les contrôles, l'index, la requête et la maquette (ADR 0011 §5).
// Aucune importation : ce fichier est repris tel quel, sans ses types, dans la maquette.

/** Mots qui gardent leur `s` final : noms propres et termes techniques, pas des pluriels. Liste courte, versionnée. */
const EXCEPTIONS_PLURIEL = new Set(['macos', 'ios', 'ipados', 'watchos', 'visionos', 'tvos', 'canvas', 'windows', 'news', 'kubernetes', 'postgres', 'express', 'atlas', 'pandas', 'analytics', 'series']);

/** Mots vides français et anglais retirés de l'index et de la requête. Version 1, volontairement courte. */
const MOTS_VIDES = new Set([
  // français
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou', 'en', 'au', 'aux', 'a', 'à', 'pour', 'par', 'sur', 'dans', 'avec', 'sans',
  'ce', 'ces', 'cet', 'cette', 'son', 'sa', 'ses', 'leur', 'leurs', 'qui', 'que', 'qu', 'est', 'sont', 'se', 's', 'c', 'n', 'j', 'm', 't', 'y',
  // anglais
  'the', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'from', 'is', 'are', 'be', 'it', 'its', 'this', 'that', 'as', 'at',
]);

/** Étapes 1 et 2 : NFKD sans diacritiques, ligatures dépliées, minuscules ; tout ce qui n'est ni lettre ni chiffre devient une espace. */
function texteNormalise(texte        )         {
  return texte
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Étape 3 : pluriels simples, appliqués de la même façon à l'index et à la requête. */
function singulier(mot        )         {
  if (EXCEPTIONS_PLURIEL.has(mot)) return mot;
  // Un « js » final nomme une bibliothèque (nextjs, threejs), jamais un pluriel.
  if (mot.length >= 4 && mot.endsWith('s') && !/(?:ss|us|is|js)$/.test(mot)) return mot.slice(0, -1);
  if (/(?:eu|au)x$/.test(mot)) return mot.slice(0, -1);
  return mot;
}

/** Mots normalisés, sans mots vides, dans l'ordre du texte. */
function motsNormalises(texte        )           {
  const brut = texteNormalise(texte);
  if (!brut) return [];
  return brut
    .split(' ')
    .filter((mot) => !MOTS_VIDES.has(mot))
    .map(singulier);
}

/** Forme normalisée d'un texte ou d'un terme : mots normalisés séparés par une espace. */
const normaliser = (texte        )         => motsNormalises(texte).join(' ');

/** Le texte normalisé contient-il l'expression normalisée, en mots entiers ? Une expression vide ne correspond à rien. */
function contientExpression(texte        , expression        )          {
  const t = normaliser(texte);
  const e = normaliser(expression);
  return e !== '' && ` ${t} `.includes(` ${e} `);
}

// Classement et explication des résultats de recherche (ADR 0011 §5). Pur : n'importe que ./normaliser.ts, pour être
// repris sans ses types dans la maquette. Le site, l'application et la maquette classent ainsi avec le même code.


                                                                                         
                                                   

/** Mot-clé enregistré d'une révision. `raison` est obligatoire pour un terme proche ; `passage` cite la source. */
                                  
                     
                
                        
                         
 

/** Document classable : une révision de publication, ses mots-clés et les parties de son texte. */
                                    
                 
                     
                                                                                    
                      
                              
                                                                                                            
                   
 

/** Pourquoi un résultat remonte : le champ, le terme qui correspond, la raison et, s'il y en a un, un extrait. */
                                 
                        
                
                 
                         
 

                                 
                 
                     
                      
                     
                
                                                   
                   
                                    
 

/**
 * Poids proposés (ADR 0011 §5). Un terme proche ne compte que pour l'expression entière : un seul mot partagé avec un
 * terme proche ne suffit pas, pour éviter les associations trompeuses.
 */
const POIDS                                                              = {
  nom: { expression: 100, mot: 30 },
  usage: { expression: 40, mot: 10 },
  technologie: { expression: 40, mot: 10 },
  categorie: { expression: 40, mot: 10 },
  terme_proche: { expression: 25, mot: 0 },
  texte: { expression: 8, mot: 2 },
};
/** Plafond de la part « par mot » du texte : un texte long ne l'emporte pas sur un mot-clé. */
const PLAFOND_TEXTE_MOTS = 6;
/** Le dernier mot de la requête vaut aussi comme début de mot à partir de cette longueur. */
const LONGUEUR_MIN_PREFIXE = 3;

/**
 * Lexique versionné de termes proches appliqué à la requête (ADR 0008, deuxième couche ; P6 bloc 4, 2026-11-05) : les
 * publications sont en anglais, les recherches souvent en français. Chaque mot de la requête vaut aussi pour ses
 * équivalents ; un résultat trouvé ainsi le dit dans son explication. Liste courte, relue, à élargir avec l'évaluation.
 */
const VERSION_LEXIQUE = 'l1-2026-11-05';
const LEXIQUE_BRUT                           = {
  securiser: ['security', 'secure', 'vulnerability'], securite: ['security', 'secure'], securise: ['secure', 'security'],
  vulnerabilite: ['vulnerability', 'cve', 'security'], faille: ['vulnerability', 'cve'],
  saas: ['app', 'application'],
  lunette: ['glasses'], casque: ['headset'],
  musique: ['music', 'song'], chanson: ['song'], video: ['video'], image: ['image'],
  memoire: ['memory'], souvenir: ['memory'],
  tester: ['test', 'testing'], test: ['testing'],
  application: ['app'], appli: ['app'], site: ['website', 'web'],
  navigateur: ['browser'],
  diapositive: ['slides', 'deck', 'presentation'], slide: ['deck', 'presentation'], presentation: ['slides', 'deck'],
  dependance: ['dependency', 'dependabot'],
  synthese: ['speech', 'synthesis', 'tts'], vocale: ['voice', 'speech'], vocal: ['voice', 'speech'], voix: ['voice', 'speech'],
  locale: ['local', 'device'], local: ['device'],
  supprimer: ['remove'], retirer: ['remove'],
  tic: ['tics'], ecriture: ['writing'], ecrire: ['write', 'writing'],
  planifier: ['plan', 'planning'], plan: ['planning'], coder: ['code', 'coding'],
  generation: ['generate', 'generation', 'creation'], generer: ['generate'],
  recherche: ['research'], scientifique: ['science', 'scientific'],
  jarvis: ['assistant', 'voice'],
  revue: ['review'], relecture: ['review'],
  agent: ['agents'],
  ia: ['ai'],
  excel: ['spreadsheet'], tableur: ['spreadsheet'], powerpoint: ['slides', 'presentation'],
};
const LEXIQUE = new Map                  (
  Object.entries(LEXIQUE_BRUT).map(([cle, valeurs]) => [normaliser(cle), [...new Set(valeurs.map(normaliser).filter((v) => v !== '' && v !== normaliser(cle)))]]),
);
/** Forme lisible d'un équivalent normalisé (« glasse » s'affiche « glasses »), pour l'explication. */
const AFFICHAGE_LEXIQUE = new Map                (Object.values(LEXIQUE_BRUT).flat().map((v) => [normaliser(v), v]));
/** Mots vides de la seule requête (« mon », « je veux ») : les retirer de l'index changerait les contrôles qui partagent la normalisation. */
const MOTS_VIDES_REQUETE = new Set(['mon', 'ma', 'me', 'ton', 'ta', 'te', 'notre', 'nos', 'votre', 'vo', 'je', 'veux', 'voudrai', 'comment', 'faire', 'my', 'your', 'how', 'want', 'need', 'avant', 'before']);
const LONGUEUR_EXTRAIT = 200;

const LIEU                                 = {
  nom: 'le nom',
  categorie: 'la catégorie',
  usage: 'un usage',
  technologie: 'une technologie',
  terme_proche: 'un terme proche',
  texte: 'le texte de la publication',
};

/** Requête préparée : mots normalisés et règle du préfixe. */
                                  
                 
                   
                                                                             
                        
 

function preparerRequete(requete        )                  {
  const tous = motsNormalises(requete);
  // Une requête faite seulement de mots vides de requête les garde : mieux vaut chercher « comment » que rien.
  const utiles = tous.filter((m) => !MOTS_VIDES_REQUETE.has(m));
  const mots = utiles.length > 0 ? utiles : tous;
  const dernier = mots[mots.length - 1];
  return { mots, prefixe: dernier !== undefined && dernier.length >= LONGUEUR_MIN_PREFIXE, variantes: mots.map((m) => LEXIQUE.get(m) ?? []) };
}

                         
                      
                                                
                        
                                                                     
                      
                                                                                              
                                             
 

function rapprocher(texte        , q                 )                {
  const mots = motsNormalises(texte);
  const n = q.mots.length;
  const completes           = [];
  const proches                                    = [];
  const egal = (mot        , i        ) => {
    const attendu = q.mots[i] ;
    if (mot === attendu) return true;
    if (i === n - 1 && q.prefixe && mot.startsWith(attendu)) {
      completes.push(mot);
      return true;
    }
    if (q.variantes[i]?.includes(mot)) {
      proches.push({ mot: attendu, proche: AFFICHAGE_LEXIQUE.get(mot) ?? mot });
      return true;
    }
    return false;
  };
  const couverts = new Set        ();
  for (let i = 0; i < n; i++) if (mots.some((m) => egal(m, i))) couverts.add(i);
  let expression = false;
  for (let debut = 0; !expression && debut + n <= mots.length; debut++) {
    let ok = true;
    for (let i = 0; ok && i < n; i++) ok = egal(mots[debut + i] , i);
    expression = ok;
  }
  const vus = new Set        ();
  return { expression, couverts, completes: [...new Set(completes)], proches: proches.filter((p) => !vus.has(`${p.mot} ${p.proche}`) && vus.add(`${p.mot} ${p.proche}`)) };
}

const raisonValide = (raison               )                   => raison !== null && raison.trim().length > 0;

function extraitDe(texte        )         {
  const t = texte.replace(/\s+/g, ' ').trim();
  return t.length <= LONGUEUR_EXTRAIT ? t : `${t.slice(0, LONGUEUR_EXTRAIT - 1).trimEnd()}…`;
}

function expliquer(champ                , requete        , r               , q                 )         {
  const complement = (r.completes.length > 0 ? ` (« ${q.mots[q.mots.length - 1]} » complète « ${r.completes.join(' », « ')} »)` : '')
    + (r.proches.length > 0 ? ` (terme proche du lexique : ${r.proches.map((p) => `« ${p.mot} » → « ${p.proche} »`).join(', ')})` : '');
  if (r.expression) return q.mots.length > 1 ? `Expression « ${requete} » trouvée dans ${LIEU[champ]}${complement}.` : `Mot « ${requete} » trouvé dans ${LIEU[champ]}${complement}.`;
  const mots = [...r.couverts].sort((a, b) => a - b).map((i) => q.mots[i]);
  return `${mots.length > 1 ? 'Mots' : 'Mot'} « ${mots.join(' », « ')} » ${mots.length > 1 ? 'trouvés' : 'trouvé'} dans ${LIEU[champ]}${complement}.`;
}

/** Classe un document ; null s'il ne couvre pas tous les mots de la requête ou si rien ne s'explique. */
function classerDocument(doc                   , q                 )                        {
  const requete = q.mots.join(' ');
  const couverts = new Set        ();
  const meilleurParChamp = new Map                        ();
  const correspondances                                         = [];
  const garder = (champ                , poids        ) => meilleurParChamp.set(champ, Math.max(meilleurParChamp.get(champ) ?? 0, poids));

  for (const mc of doc.motsCles) {
    // Un terme proche sans raison n'explique rien : il est ignoré, jamais affiché.
    if (mc.champ === 'terme_proche' && !raisonValide(mc.raison)) continue;
    const r = rapprocher(mc.terme, q);
    const poids = r.expression ? POIDS[mc.champ].expression : r.couverts.size * POIDS[mc.champ].mot;
    if (poids === 0) continue;
    for (const i of r.couverts) couverts.add(i);
    garder(mc.champ, poids);
    const raison = mc.champ === 'terme_proche' ? mc.raison .trim() : expliquer(mc.champ, requete, r, q);
    correspondances.push({ champ: mc.champ, terme: mc.terme, raison, extrait: mc.passage ? extraitDe(mc.passage) : null, poids });
  }

  // Texte de la publication : l'expression se cherche partie par partie, pour ne pas enjamber deux parties.
  const parties = doc.textes.filter((t) => t.trim().length > 0);
  const avecExpression = parties.find((t) => rapprocher(t, q).expression);
  const toutLeTexte = rapprocher(parties.join(' \n '), q);
  if (avecExpression !== undefined || toutLeTexte.couverts.size > 0) {
    const poids = avecExpression !== undefined ? POIDS.texte.expression : Math.min(toutLeTexte.couverts.size * POIDS.texte.mot, PLAFOND_TEXTE_MOTS);
    for (const i of toutLeTexte.couverts) couverts.add(i);
    garder('texte', poids);
    const partie = avecExpression ?? parties.find((t) => rapprocher(t, q).couverts.size > 0) ;
    const r = avecExpression !== undefined ? rapprocher(avecExpression, q) : toutLeTexte;
    correspondances.push({ champ: 'texte', terme: requete, raison: expliquer('texte', requete, r, q), extrait: extraitDe(partie), poids });
  }

  // Couverture partielle admise depuis le 2026-11-05 pour les besoins de trois mots ou plus (« synthèse vocale locale ») :
  // un mot peut manquer, score proportionnel à la part couverte ; un résultat qui couvre tout passe toujours devant.
  // Jusqu'à deux mots, tous restent exigés : « motion comptable » ne doit rien remonter.
  if (couverts.size < (q.mots.length >= 3 ? q.mots.length - 1 : q.mots.length) || correspondances.length === 0) return null;
  correspondances.sort((a, b) => b.poids - a.poids);
  const score = Math.round([...meilleurParChamp.values()].reduce((s, p) => s + p, 0) * (couverts.size / q.mots.length));
  const nom = doc.motsCles.find((m) => m.champ === 'nom')?.terme ?? null;
  return {
    postId: doc.postId,
    revisionId: doc.revisionId,
    jour: doc.jour,
    nom,
    score,
    complet: couverts.size === q.mots.length,
    correspondances: correspondances.map(({ poids: _poids, ...c }) => c),
  };
}

/** Jour le plus récent d'abord, jour inconnu en dernier. */
const parJour = (a                , b                )         => {
  if (a.jour === b.jour) return 0;
  if (a.jour === null) return 1;
  if (b.jour === null) return -1;
  return a.jour < b.jour ? 1 : -1;
};

                                           

/**
 * Classe et explique. Les résultats qui couvrent tous les mots de la requête passent devant ; à partir de trois mots,
 * un mot peut manquer (voir classerDocument). Le score
 * additionne le meilleur poids de chaque champ, si bien que répéter un mot-clé n'augmente pas le score.
 */
function classer(requete        , documents                     , tri      = 'pertinence')                   {
  const q = preparerRequete(requete);
  if (q.mots.length === 0) return [];
  const resultats = documents.map((d) => classerDocument(d, q)).filter((r)                      => r !== null);
  // Départage final par `postId`, pour un ordre stable d'une page à l'autre.
  const ordre = tri === 'recents' ? (a                , b                ) => parJour(a, b) || b.score - a.score : (a                , b                ) => b.score - a.score || parJour(a, b);
  return resultats.sort((a, b) => Number(b.complet) - Number(a.complet) || ordre(a, b) || a.postId - b.postId);
}

window.RECHERCHE = Object.freeze({ classer, preparerRequete, normaliser, motsNormalises, POIDS });
})();
