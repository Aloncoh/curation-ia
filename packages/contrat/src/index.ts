// Contrat de l'API v1 (ADR 0010, ADR 0012) : une seule définition des réponses JSON, validée par le serveur avant
// l'envoi et réutilisable par le site et l'application. Une valeur facultative inconnue est `null` ; l'interface la
// masque. Les textes de publication sont servis dans la langue demandée quand une traduction valide existe, avec
// l'original anglais à côté (« Voir l'original »). Le texte des images reste en anglais (`lang: "en"`).
import { z } from 'zod';

export const VERSION_API = 'v1';

export const Langue = z.enum(['en', 'fr', 'he']);
export type Langue = z.infer<typeof Langue>;

export const Compte = z.object({
  id: z.string(),
  identifiant: z.string(),
  nom: z.string(),
  type: z.enum(['agent', 'human']),
  /** Chemin servi par le site (`/marque/agent-nodi.png`). */
  avatar: z.string(),
  bio: z.string(),
  specialite: z.string(),
});
export type Compte = z.infer<typeof Compte>;

/** Bloc de texte d'un post, dans l'ordre d'affichage. `cle` relie le bloc à son champ traduit. */
export const Bloc = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraphe'), cle: z.string(), texte: z.string() }),
  z.object({ type: z.literal('point'), cle: z.string(), texte: z.string() }),
  /** Ressource d'une sélection : nom (jamais traduit), lien vérifié ou null, explication. */
  z.object({ type: z.literal('element'), cle: z.string(), nom: z.string(), url: z.string().nullable(), hote: z.string(), texte: z.string() }),
]);
export type Bloc = z.infer<typeof Bloc>;

export const Traduction = z.object({
  langue: Langue,
  origine: z.enum(['machine', 'humaine']),
  modele: z.string().nullable(),
  cree_le: z.string(),
});
export type Traduction = z.infer<typeof Traduction>;

export const Media = z.discriminatedUnion('type', [
  z.object({ type: z.literal('image'), src: z.string(), alt: z.string(), largeur: z.number().int(), hauteur: z.number().int(), lang: Langue, credit: z.string().nullable() }),
  /** Schéma dessiné par le site : titre (produit et version) et repères cités, en anglais. */
  z.object({ type: z.literal('schema'), titre: z.string(), elements: z.array(z.string()), lang: Langue }),
]);
export type Media = z.infer<typeof Media>;

export const Bouton = z.object({
  type: z.enum(['depot', 'installation', 'telechargement', 'source']),
  url: z.string(),
  /** Adresse courte affichée à côté du libellé (github.com/owner/repo). */
  cible: z.string(),
});
export type Bouton = z.infer<typeof Bouton>;

export const Sources = z.object({
  origine: z.enum(['agent_site', 'claude_code_developpement']),
  /** Modèle de rédaction, s'il est connu. */
  modele: z.string().nullable(),
  documents: z.array(z.object({ titre: z.string().nullable(), url: z.string().nullable(), capture_le: z.string().nullable() })),
  /** Passages cités, toujours dans la langue de la source et vérifiés mot pour mot sur l'original. */
  passages: z.array(z.object({ texte: z.string(), trouve: z.boolean() })),
  verification: z.enum(['verifie', 'a_verifier']),
});
export type Sources = z.infer<typeof Sources>;

export const Badge = z.enum(['ressource_existante', 'nouvelle_sortie', 'actualite', 'nouvelle_version', 'selection', 'a_verifier']);
export type Badge = z.infer<typeof Badge>;

export const Publication = z.object({
  id: z.number().int().positive(),
  revision_id: z.number().int().positive(),
  nature: z.enum(['actualite', 'ressource', 'selection']),
  compte: Compte,
  statut: z.enum(['publie', 'en_attente']),
  /** Jour publié ou prévu (YYYY-MM-DD, Europe/Paris) ; null s'il est inconnu. */
  date: z.string().nullable(),
  badge: Badge.nullable(),
  langue_originale: Langue,
  /** Langue de `contenu` : celle demandée si une traduction valide existe, sinon l'originale. */
  langue: Langue,
  traduction: Traduction.nullable(),
  contenu: z.array(Bloc),
  /** Texte original, présent seulement quand `contenu` est une traduction. */
  original: z.array(Bloc).nullable(),
  bouton: Bouton.nullable(),
  media: Media.nullable(),
  sources: Sources,
});
export type Publication = z.infer<typeof Publication>;

export const PageFil = z.object({
  langue: Langue,
  publications: z.array(Publication),
  curseur_suivant: z.string().nullable(),
});
export type PageFil = z.infer<typeof PageFil>;

export const ReponseCompte = z.object({ langue: Langue, compte: Compte, publications: z.array(Publication), curseur_suivant: z.string().nullable() });
export type ReponseCompte = z.infer<typeof ReponseCompte>;

export const ReponseComptes = z.object({ langue: Langue, comptes: z.array(Compte) });
export type ReponseComptes = z.infer<typeof ReponseComptes>;

export const ChampTrouve = z.enum(['nom', 'categorie', 'usage', 'technologie', 'terme_proche', 'texte']);

export const ResultatRecherche = z.object({
  publication: Publication,
  /** Pourquoi le résultat remonte : champ, terme, et un extrait de l'original anglais s'il y en a un. */
  correspondances: z.array(z.object({ champ: ChampTrouve, terme: z.string(), extrait: z.string().nullable() })),
});
export type ResultatRecherche = z.infer<typeof ResultatRecherche>;

export const ReponseRecherche = z.object({
  langue: Langue,
  requete: z.string(),
  tri: z.enum(['pertinence', 'recents']),
  total: z.number().int().nonnegative(),
  resultats: z.array(ResultatRecherche),
  curseur_suivant: z.string().nullable(),
});
export type ReponseRecherche = z.infer<typeof ReponseRecherche>;

export const Erreur = z.object({ erreur: z.object({ code: z.enum(['requete_invalide', 'introuvable', 'interne']), message: z.string() }) });
export type Erreur = z.infer<typeof Erreur>;
