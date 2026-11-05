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
  /** Montage rendu par le code. `lang` : langue du texte inscrit dans l'image (en) ; `alt_lang` : langue du texte alternatif servi. */
  z.object({ type: z.literal('image'), src: z.string(), alt: z.string(), alt_lang: Langue, largeur: z.number().int(), hauteur: z.number().int(), lang: Langue, credit: z.string().nullable() }),
  /** Carrousel de diapositives dessinées par le site, texte en anglais comme les montages. */
  z.object({ type: z.literal('carrousel'), titre: z.string(), diapositives: z.array(z.object({ libelle: z.string(), texte: z.string() })).min(1), lang: Langue }),
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
  /** Fond de couverture fourni pour l'agent (/marque/fond-…), null : couverture dessinée par le client. */
  fond: z.string().nullable(),
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

/** Élément d'une section de fiche : `titre` (titre d'un détail, auteur d'un benchmark), `complement` (conditions d'un benchmark). */
export const ElementFiche = z.object({ cle: z.string(), titre: z.string().nullable(), texte: z.string(), complement: z.string().nullable() });
export type ElementFiche = z.infer<typeof ElementFiche>;
export const SectionFiche = z.object({
  id: z.enum(['nouveaute', 'pour_qui', 'exemple_usage', 'acces', 'prerequis', 'cout', 'limites_connues', 'details', 'attributions', 'questions_a_tester', 'demarrage', 'compatibilites', 'limites', 'licence_locale']),
  elements: z.array(ElementFiche).min(1),
});
export type SectionFiche = z.infer<typeof SectionFiche>;

/**
 * Fiche d'approfondissement (SPEC §6) : sections rédigées (traduites si possible, original à côté), puis faits datés.
 * Une section absente n'est pas servie ; `licence` vaut null quand elle ne s'applique pas, `{ valeur: null }` quand
 * elle est inconnue (« Non renseigné »).
 */
export const Fiche = z.object({
  publication: Publication,
  langue: Langue,
  traduction: Traduction.nullable(),
  sections: z.array(SectionFiche),
  original: z.array(SectionFiche).nullable(),
  commande: z.string().nullable(),
  licence: z.object({ valeur: z.string().nullable() }).nullable(),
  depot: z.object({ nom: z.string(), url: z.string().nullable(), etoiles: z.number().int().nullable(), etoiles_au: z.string().nullable(), cree_le: z.string().nullable(), dernier_push: z.string().nullable() }).nullable(),
  /** Versions du produit suivi, de la plus récente à la plus ancienne ; vide si la publication n'est reliée à aucun produit suivi. */
  versions: z.array(z.object({ version: z.string(), prerelease: z.boolean(), publiee_le: z.string().nullable(), courante: z.boolean() })),
  /** Révisions de la publication, de la plus récente à la plus ancienne. */
  revisions: z.array(z.object({ seq: z.number().int().positive(), cree_le: z.string(), courante: z.boolean() })).min(1),
});
export type Fiche = z.infer<typeof Fiche>;
