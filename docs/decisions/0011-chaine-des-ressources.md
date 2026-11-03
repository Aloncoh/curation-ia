# ADR-0011 : chaîne des ressources pour construire, mots-clés structurés et recherche

**Statut :** acceptée sur demande de l'utilisateur du 2026-11-02
**Date :** 2026-11-02
**Décideurs :** l'utilisateur (publication par ressource, bouton, mots-clés, recherche, plafond partagé) ; Claude (modèle de données, contrôles, découpage)

## Contexte

L'utilisateur transmet une liste de skills et de dépôts, tirée d'un fil X de @Slonski_rt (contenu externe attribué ; chiffres d'installation du fil non vérifiés, docs/ressources-candidates.md). Il demande, dès maintenant, **une publication distincte par ressource retenue** :

- un texte rédigé avec nos mots : ce que fait la ressource, son intérêt, un exemple concret, comment commencer, ses limites ;
- un visuel dédié, sans image générique ni fausse capture ;
- un bouton vers la ressource officielle, depuis le fil et le détail, nommé selon la destination réelle (« Voir le dépôt », « Installer », « Télécharger ») ;
- des instructions de démarrage vérifiées dans la documentation, sans aucune installation au clic ;
- des mots-clés structurés et indexés (nom, catégorie, usages, technologies, termes proches), qui servent réellement à retrouver et classer les publications.

Une recherche « motion design » doit retrouver plusieurs ressources liées sans leur nom exact, en expliquant chaque correspondance et sans association trompeuse. La chaîne est automatique : rédaction → visuel → liens vérifiés → mots-clés → contrôles → publication → indexation. Le site et l'application lisent les mêmes données (ADR 0010). La publication respecte le plafond global de 20 par jour, partagé avec les autres contenus et les nouveautés prioritaires (SPEC §3.6). Ressources existantes et vraies nouvelles sorties sont distinguées ; rien n'est présenté comme testé. Les images générées par un modèle ne sont pas autorisées sans accord de l'utilisateur, car payantes : les visuels sont des montages rendus par le code (ADR 0007), d'origine `generated` avec la mention d'illustration.

Ce qui existe déjà :

- collecte sûre (`safeGet`) et captures idempotentes (`storeDocuments`) ;
- `news_item`, `post_draft`, `post`, `post_revision`, `post_source` et `media_asset` (ADR 0004) ;
- contrôles mot pour mot bornés à des mots entiers (`contientMotPourMot`), `ESSAI_REVENDIQUE`, `POPULARITE` et `prioriteEditoriale` ;
- montages `fiches` et `terminal_annote` ;
- grille `d1` et découverte automatique de dépôts : prévues en P6 (SPEC §7.3 ter) ;
- recherche : approche de l'ADR 0008, prévue en P6.

Faits relevés le 2026-11-02 :

- **GitHub REST, sans jeton** : 60 requêtes par heure et par adresse IP ([documentation officielle](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), lue le 2026-11-02). `GET /rate_limit` répondait 38 restantes à 11:5x UTC : le budget est partagé avec les autres essais de la journée.
- **`https://github.com/robots.txt`** (lu le 2026-11-02) interdit `/*/tree/` aux robots et renvoie vers l'API. Un dossier de skill (`/tree/main/skills/…`) ne se vérifie donc pas en lisant la page HTML.
- **Dépôt renommé** : `github.com/K-Dense-AI/claude-scientific-skills` répond 301 vers `scientific-agent-skills`. `safeGet` refuse toute redirection ; il faut donc l'URL canonique donnée par l'API.
- **Essai FTS5 réel**, `@libsql/client` 0.18.0, SQLite 3.45.1, options `ENABLE_FTS5`, en mémoire et sur fichier, résultats identiques :

  | Essai | Résultat |
  |---|---|
  | table `fts5(... tokenize = 'unicode61 remove_diacritics 2', prefix = '2 3')` | créée |
  | `"motion design"` | 2 lignes sur 4, celles qui contiennent l'expression |
  | `memoire` et `"mémoire"` | trouvent « mémoire » : accents ignorés |
  | `anim*` | trouve « animation » |
  | filtre de colonne `mots_cles : effet` | fonctionne |
  | `bm25()` avec poids par colonne, `highlight()` | fonctionnent |
  | suppression d'une ligne dans une transaction | prise en compte |
  | saisie brute `foo"` | erreur SQL : une saisie brute ne doit jamais atteindre le moteur |

  Sur 4 documents, `bm25` vaut 0 pour une expression présente dans la moitié d'entre eux : sur un petit corpus, ce score ne départage rien. La disponibilité de FTS5 sur une base Turso hébergée reste non établie (ADR 0008, essai prévu en P5).

## Décision

### 1. Modèle de données : l'existant d'abord, quatre ajouts

**Source.** Un enregistrement `source` par dépôt :

- `kind = 'github-ressource'`, `id = 'github-ressource:<owner>/<repo>'` ;
- hôtes autorisés : `api.github.com` et `raw.githubusercontent.com` seulement ;
- toujours par `safeGet` : HTTPS, adresses vérifiées, aucune redirection, délai de 15 s, 2 Mio au plus par réponse ;
- en-têtes : `accept: application/vnd.github+json` (API), `x-github-api-version: 2022-11-28`, un `user-agent` du projet ;
- **aucun jeton, aucune clé lue.**

Ces sources ne figurent pas dans `SOURCES` : `npm run collect` ne les traite pas. La liste vit dans `src/ressources/liste.ts`, synchronisée vers `source` par une fonction propre. Le statut d'une source reste `never` jusqu'à sa première capture réussie.

**Documents et captures** (`source_document` + `document_snapshot`, `storeDocuments` réutilisé, idempotent). `external_id` prend l'une de ces formes :

| `external_id` | Contenu | `content_format` |
|---|---|---|
| `depot` | métadonnées du dépôt par `GET /repos/{owner}/{repo}` : `full_name`, `html_url`, `description`, `created_at`, `pushed_at`, `stargazers_count`, `archived`, `fork`, `parent.full_name`, `parent.html_url`, `license.spdx_id`, `default_branch`, `topics`, `homepage` ; JSON trié, sous-ensemble stable | `json` |
| `fichier:<chemin>` | fichier brut `https://raw.githubusercontent.com/<full_name canonique>/<default_branch>/<chemin>` : README, SKILL.md, licence propre au skill | `markdown`, ou `text` pour une licence |
| `dossier:<chemin>` | liste du dossier d'un skill, `GET /repos/{o}/{r}/contents/<chemin>?ref=<branche>` : noms, types et `html_url` seulement | `json` |

Une capture `depot` change dès que les étoiles changent. C'est voulu : deux captures datées donnent la progression (SPEC §7.3 ter). Pour les skills dont le dépôt n'a pas de licence globale, le capteur ajoute `fichier:<dossier>/LICENSE.txt` (ou `LICENSE`, `LICENSE.md`) si la liste du dossier en contient un. Un fichier absent (404) est tracé comme absent ; ce n'est pas une erreur de la ressource.

**Actualité** : un `news_item` par ressource.

- `kind = 'decouverte'`, `title` = nom de la liste ;
- `announced_at = null` : une découverte n'est pas une annonce, et ses dates vivent dans la capture `depot` ;
- document principal (`news_item_document.role = 'primary'`) : le **premier chemin** de la ressource dans la liste (SKILL.md, sinon README) ; les autres documents, `depot` et `dossier:` compris, sont `supporting` ;
- le slug se retrouve par la liste : slug → dépôt → `external_id` du premier chemin → actualité ; aucune table de ressources ;
- `src/analysis/pipeline.ts` (`aTraiter`) exclut `kind = 'decouverte'` : le moteur payant ne les qualifie jamais avec la grille des actualités.

**Sélection.** La liste vient de l'utilisateur ; elle tient lieu de sélection humaine. Le code trace dans `selection_decision` une décision par ressource :

- champs : `origine = 'regles'`, `juge = 'code'`, `consignes_version = 'liste-2026-11-02'` ;
- `ecarter` si le dépôt est introuvable ou archivé ;
- `approfondir` si le chemin principal est absent ou si sa capture a moins de trois mots ;
- `publier` sinon, motif `liste_utilisateur`.

Les étoiles n'entrent dans aucune décision. Le seuil de la découverte automatique (SPEC §7.3 ter) ne s'applique pas à une liste fournie à la main. Les étoiles restent affichées datées, comme une information.

**Brouillon, publication, révision et sources** : les tables existantes.

- `post_draft` : une ligne par actualité.
  - `run_id` : une ligne `llm_run` d'import, `status = 'terminee'`, plafonds à 0, `reason = 'import ressources, aucun appel au modèle'` ;
  - `model = 'claude-code'`, `prompt_version = 'ressources-<consignes>'` (`ressources-r2` depuis le 2026-11-02), `snapshot_id` = capture du document principal ;
  - `content` = contenu stocké, `checks` = contrôles.
- `post` : compte de la liste, `evidence_level = 'documentary_analysis'`.
- `post_revision` : chaque import qui change le contenu ajoute une révision `seq + 1`. Le contenu de chaque révision reste dans `post_revision.content`, même si `post_draft` ne garde que le dernier.
- `post_source` : toutes les captures de la ressource utilisées par la révision.
- `media_asset` : `origin = 'generated'`, mention d'illustration (contrainte existante).

**Une seule migration, `drizzle/0009_chaine_ressources.sql`**, qui ajoute :

1. **`post_draft.origine`**, `text not null default 'agent_site'`, contrainte `post_draft_origine_ck` : `origine in ('agent_site', 'claude_code_developpement')`. La recréation de table générée par drizzle-kit est acceptée ; une clé étrangère cassée doit faire échouer un test.
2. **`post_mot_cle`** : mots-clés indexés.
   - Colonnes : `id`, `post_id` → `post`, `revision_id` → `post_revision`, `champ`, `terme`, `terme_normalise`, `raison`, `passage`, `created_at`.
   - `champ in ('nom', 'categorie', 'usage', 'technologie', 'terme_proche')`.
   - `post_mot_cle_raison_ck` : `champ <> 'terme_proche' or length(trim(coalesce(raison, ''))) > 0`.
   - `post_mot_cle_passage_ck` : `champ not in ('usage', 'technologie') or length(trim(coalesce(passage, ''))) > 0`.
   - Index unique `(revision_id, champ, terme_normalise)` ; index `(terme_normalise)` et `(post_id)`.
   - `passage` : citation mot pour mot qui soutient le terme. `raison` : lien explicite pour un terme proche.
3. **`post_bouton`** : bouton et contrôle daté.
   - Colonnes : `id`, `post_id` → `post`, `revision_id` → `post_revision`, `libelle`, `destination`, `url`, `hote`, `url_controle`, `statut_http`, `resultat`, `motif`, `snapshot_id` → `document_snapshot` (preuve, nullable), `verifie_le`, `created_at`.
   - `libelle in ('Voir le dépôt', 'Installer', 'Télécharger')`.
   - `destination in ('depot', 'installation', 'telechargement')`.
   - `post_bouton_coherence_ck` : (`depot`, « Voir le dépôt ») ou (`installation`, « Installer ») ou (`telechargement`, « Télécharger »).
   - `resultat in ('verifie', 'echec')` ; index `(post_id, verifie_le)`.
   - Une ligne par vérification : l'historique reste. La dernière ligne `verifie` de moins de 7 jours (réglage) commande l'affichage.
   - Migration 0010 (2026-11-02) : `post_bouton_url_ck`, `url like 'https://%'` et `hote = 'github.com'` pour un dépôt ou un téléchargement. La lecture (`src/maquette/ressources.ts`) refait aussi le contrôle `destinationDe` : une ligne écrite par un autre chemin ne devient jamais un bouton.
4. **`publication_planifiee`** : planification.
   - Colonnes : `post_id` (clé primaire → `post`), `jour`, `rang`, `priorite`, `statut_sortie`, `utilise_reserve`, `etat`, `motif`, `created_at`, `updated_at`.
   - `jour` : `YYYY-MM-DD`, jour civil Europe/Paris, la frontière du plafond.
   - `priorite in (1, 2, 3, 4)` ; `statut_sortie in ('ressource_existante', 'nouvelle_sortie', 'actualite')`.
   - `utilise_reserve` : booléen.
   - `etat in ('prevue', 'reportee', 'publiee')`. `reportee` vaut « attend faute de place », distinct d'un sujet jugé sans intérêt (SPEC §3.6).
   - Index `(jour, etat)`. Migration 0010 (2026-11-02) : index unique partiel `(jour, rang)` hors `reportee` ; les rangs déjà écrits sont renumérotés avant sa création.
5. **`recherche_publication`**, table virtuelle FTS5 : `post_id UNINDEXED, revision_id UNINDEXED, nom, mots_cles, texte`, `tokenize = 'unicode61 remove_diacritics 2'`, `prefix = '2 3'`. Elle reçoit des textes **déjà normalisés** par `src/recherche/normaliser.ts`. drizzle ne déclare pas les tables virtuelles : un commentaire dans `schema.ts` renvoie à la migration. **Repli documenté** si une base refuse FTS5 (Turso hébergé, essai en P5) : une migration ultérieure remplace cette table par `recherche_terme (post_id, revision_id, champ, terme_normalise)`, interrogée en SQL simple. La signature de `rechercher` ne change pas, car le classement et l'explication se font dans le code (§5).

**Réglages** (table `setting`, valeurs par défaut dans le code, modifiables sans toucher au code) :

| Clé | Défaut | Origine |
|---|---|---|
| `publication.plafond_jour` | 20 | SPEC §3.6 |
| `publication.reserve_nouveautes_jour` | 5 | valeur proposée |
| `ressources.seuil_nouvelle_sortie_jours` | 14 | valeur proposée |
| `ressources.inactivite_jours` | 90 | valeur proposée |
| `ressources.validite_lien_jours` | 7 | valeur proposée |

### 2. Schéma Zod `BrouillonRessource` (`src/ressources/schemas.ts`)

Le brouillon est le fichier `data/ressources/brouillons/<slug>.json`. Ces brouillons sont versionnés : `.gitignore` passe de `data/` à `data/*`, avec `!data/ressources/`, `data/ressources/*` et `!data/ressources/brouillons/`. Les captures (`data/ressources/captures/`) restent non versionnées : ce sont des contenus de tiers.

`cite = { texte: string (non vide), passages: string[] }`, comme `src/analysis/schemas.ts`. Objet strict :

| Champ | Type | Règle |
|---|---|---|
| `slug` | string | entrée de `src/ressources/liste.ts` |
| `consignes` | `'r2'` | version des consignes de rédaction des ressources (`CONSIGNES_RESSOURCES`) ; r2 depuis le 2026-11-02 (ligne éditoriale complétée) ; un brouillon d'une autre version est bloqué (`consignes_inconnues`) jusqu'à sa réécriture |
| `accroche` | cite | 110 caractères au plus, sans `?` ni `!`, nomme la ressource |
| `description` | cite | ce que c'est, ce que ça apporte, à qui |
| `interet` | cite | ce que la ressource apporte concrètement, dans quelle situation |
| `exemple_usage` | cite | un **usage possible** décrit par la source, jamais un essai réalisé |
| `demarrage` | `{ etapes: cite[] (1 à 4), commande: string \| null, passages: string[] (≥ 1) }` | `commande` admise seulement si elle figure **mot pour mot** dans la capture brute ; `passages` soutient le démarrage dans son ensemble |
| `compatibilites` | cite[] | agents, outils ou versions cités ; vide = « Non renseigné » ; champ de contrôle, bref, pas une rubrique du post |
| `limites` | cite[] | vide = « Non renseigné » ; depuis la ligne éditoriale du 2026-11-02, une limite n'est retenue que si elle compte pour décider (dépôt non maintenu, fork, licence non libre, coût, risque de sécurité), en une phrase |
| `licence_locale` | cite \| null | licence propre au skill quand le dépôt n'a pas de licence globale |
| `mots_cles` | `{ nom: string, categorie: CATEGORIES, usages: cite[] (1 à 6), technologies: cite[] (0 à 6), termes_proches: { terme: string, raison: string }[] (0 à 8) }` | un terme : 1 à 4 mots, 40 caractères au plus |
| `bouton` | `{ libelle: 'Voir le dépôt' \| 'Installer' \| 'Télécharger', url: string }` | proposé par le rédacteur, recalculé et vérifié par le code |
| `reperes` | cite[] (1 à 3, 64 caractères au plus) | textes du visuel |

Le code ajoute à l'import le **contenu stocké** `ContenuRessource`. Ces champs sont refusés dans le brouillon, objet strict :

- `statut_sortie` ∈ `ressource_existante | nouvelle_sortie` ;
- `etat_depot` : étoiles datées, création, dernier push, licence, archivé, fork et parent, inactivité ;
- `compte`, `origine`, `niveau_preuve = 'documentary_analysis'` ;
- `mention = 'Analyse IA à partir des sources — non testé par la plateforme'` ;
- `captures` (identifiants et dates), `categories = [mots_cles.categorie]`, `nature = 'ressource'`, `decouverte_via` (provenance de la liste).

**Statut de sortie, calculé par le code** (`src/ressources/statut.ts`) :

- `nouvelle_sortie` seulement si la date de création est connue et précède la capture `depot` de 14 jours au plus (réglage) ;
- pour un dépôt entier, la date de création est `created_at` ; pour un skill dans un dépôt, on ne connaît que celle du dépôt, plus ancienne que le skill ;
- sinon `ressource_existante`. Une date inconnue ne fait jamais une nouvelle sortie.

Pour un skill dans un dépôt ancien, « date d'ajout du skill : Non renseigné ». Ce biais prudent est voulu.

**Passages.** Ils sont contrôlés avec `contientMotPourMot`, espaces normalisés et mots entiers. Chaque partie citable est séparée, pour qu'un passage ne puisse pas enjamber deux documents :

- texte brut (`toPlainText`) de chaque fichier ;
- `description` du dépôt ;
- `topics` joints par des espaces.

La `commande` se contrôle sur le contenu **brut** (Markdown, espaces normalisés), car `toPlainText` retire des signes utiles à une commande.

### 3. Contrôles (`src/ressources/controles.ts`)

Ce sont des contrôles du code, sans aucun appel au modèle, et jamais un second appel au même modèle. `controlerRessource(brouillon, captures, metadonnees, entreeListe)` rend `{ bloquants: Controle[], a_verifier: Controle[] }`.

**Contrôles bloquants** : publication `rejete`, aucun visuel, bouton, mot-clé, index ni planning.

| Code | Règle |
|---|---|
| `schema_invalide`, `slug_inconnu`, `consignes_inconnues`, `capture_absente` | entrée inutilisable |
| `champ_sans_citation`, `citation_introuvable`, `citation_trop_courte`, `citation_trop_longue` | règles et seuils de `controlerBrouillon` : 3 mots, 300 caractères |
| `commande_introuvable` | `demarrage.commande` absente mot pour mot de la capture brute |
| `essai_non_realise` | `ESSAI_REVENDIQUE` sur tout texte rédigé : exporté de `src/analysis/controles.ts`, sans changer son comportement |
| `popularite_invoquee` | `POPULARITE` sur tout texte rédigé, mots-clés compris : exporté de `src/selection/consignes.ts` |
| `bouton_libelle_incoherent` | libellé différent de celui que le code déduit de la destination |
| `bouton_hote_inattendu` | hôte hors liste |
| `bouton_url_non_canonique` | URL différente de l'URL canonique tirée de la capture `depot` ou `dossier:` |
| `nom_incoherent` | `mots_cles.nom` différent du nom de la liste et du `full_name` capturé |
| `usage_sans_passage`, `technologie_introuvable` | un usage sans passage retrouvé ; une technologie absente des captures après normalisation, en mots entiers |
| `terme_proche_sans_raison` | raison vide ou de moins de quatre mots |
| `terme_proche_non_relie` | la raison normalisée ne contient ni le nom, ni un usage, ni une technologie, ni la catégorie de la publication |
| `terme_proche_nom_absent` | terme proche à majuscule initiale (marque, produit), absent des captures |
| `fork_sans_parent` | dépôt `fork` dont le parent est inconnu : l'attribution d'origine est impossible |

**Destination et libellé, déduits par le code** (`destinationDe(url)`) :

| URL | Destination | Libellé |
|---|---|---|
| `https://github.com/<o>/<r>` ou `.../tree/<branche>/<chemin>` | `depot` | « Voir le dépôt » |
| `https://github.com/<o>/<r>/releases/...` avec fichiers joints dans la capture | `telechargement` | « Télécharger » |
| page d'installation d'un magasin d'extensions officiel, liste fermée | `installation` | « Installer » |

La liste fermée des magasins (Marketplace VS Code, Chrome Web Store…) est vide dans ce lot. **Un dépôt GitHub n'est jamais « Installer ».** Toute autre URL : `bouton_hote_inattendu`.

**Contrôles « à vérifier »** : publication `a_verifier`, non planifiée, non indexée.

- **Repris de l'existant** : `accroche_non_conforme`, `copie_de_la_source`, `nombre_absent_des_citations`, `soutien_nom_absent`, `contexte_a_relire`, `benchmark_non_attribue`, `repere_trop_long`, `diapositive_sensationnelle`. Les fonctions internes de `src/analysis/controles.ts` sont exportées, à comportement constant.
- **Consignes r2** (2026-11-02, ligne éditoriale complétée par l'utilisateur) : `formule_figee`, une phrase de l'accroche, de la description ou de l'intérêt qui s'ouvre sur « Ce qui le/la distingue », « démarque » ou « rend unique » (formule reprise dans 13 des 21 brouillons r1) ; `repere_redondant`, un repère d'au moins deux mots significatifs dont 70 % ou plus (mots normalisés, nom de la ressource exclu) figurent déjà dans l'accroche, la description ou l'intérêt. Ce sont des heuristiques : elles signalent une redite, elles ne jugent pas la qualité d'un repère.
- **`commande_risquee`** : la commande contient `| sh`, `| bash`, `sudo `, `rm -rf` ou `curl … |`.
- **`licence_locale_absente`** : le dépôt n'a pas de licence et une licence locale a été capturée, mais `licence_locale` est nul.
- **`fork_non_mentionne`** : le dépôt est un fork, et ni `description` ni `limites` ne citent le propriétaire du parent ou le mot « fork ».
- **`terme_proche_redondant`** : le terme proche est déjà un usage ou une technologie.
- **`etape_trop_longue`** (ajouté le 2026-11-02) : avec 2 étapes ou plus, une étape de plus de 80 caractères (`LONGUEUR_MAX_ETAPE`) ne tiendrait pas dans sa case du visuel `etapes`. Signalé par `verifier`, avant l'import, au lieu d'un `visuel_absent` découvert au rendu.
- **`visuel_absent`** et **`lien_non_verifie`** : posés par la chaîne (§4, §6), pas par `verifier`.

**Toujours fait par le code, jamais par le rédacteur :**

- la mention « Analyse IA à partir des sources — non testé par la plateforme » ;
- l'**origine du brouillon**, tracée dans `post_draft.origine` et affichée partout où la publication apparaît : « Rédigé pendant le développement par Claude Code, assistant de programmation, pas par l'agent du site ; vérifié par les contrôles du code » ou « Rédigé par l'agent du site (modèle, version du prompt) » ;
- le bloc « État du dépôt » (calculé et stocké dans le contenu ; **plus affiché** dans la publication depuis les retours de l'utilisateur sur la maquette du 2026-11-02, qui retirent les blocs administratifs) : étoiles « au <date> », une information et pas un critère ; création ; dernier push, avec « aucun push depuis le … » au-delà de 90 jours ; licence (« Non renseigné » si l'API n'en donne aucune) ; archivé ; « Fork de <parent> », lien compris. Pour Claudeception, l'attribution d'origine apparaît ainsi dans le fil et le détail.

Un angle souhaité, comme « deuxième cerveau » pour Obsidian Skills, n'entre dans un texte que si un passage le soutient. Un mot-clé non soutenu est refusé.

### 4. Visuel (`src/media/*`, `src/ressources/visuel.ts`)

- **Nouveau gabarit `etapes`.** 2 à 4 cases reliées par des flèches, dans le style feutre et coutures de `style.ts`. Chaque case reprend `demarrage.etapes[i].texte`, 80 caractères au plus. Le surtitre est fixe : « Pour commencer, selon la documentation ». Classes CSS : `.etapes`, `.etape`, `.fleche`. Défauts ajoutés : `etapes_hors_limites` pour un nombre hors de 2 à 4 ou un texte trop long. Le rendu contrôle le débordement et la zone des `.etape`, comme pour `.fiche`.
- **Composition choisie par le code** (`composerMontageRessource`), sans modèle :
  - au moins 2 étapes : `etapes` ;
  - sinon, une commande : `terminal_annote`, une ligne par commande, chacune avec son invite `$` (une ligne terminée par `\` se joint à la suivante), et le surtitre « Reconstitution de la commande citée ». Corrigé le 2026-11-02 : deux commandes fondues en une seule ligne changeaient leur sens ;
  - sinon : `fiches`, sur les `reperes`.
- **Commun à tous les montages** :
  - titre : `accroche.texte` ;
  - compte : celui de la liste ;
  - pied : `Source : github.com/<full_name> · capturé le <jour>`, plus `· Fork de <parent>` s'il y a lieu  ; le pied tient sur trois lignes au plus (`PIED_HAUTEUR_MAX`, src/media/rendu.ts, porté de 110 à 125 px le 2026-11-02 pour le crédit d'un fork, Claudeception) ;
  - mention : « Illustration — ne prouve pas le fonctionnement ».
- **Images.** Aucune capture recréée et aucune image d'éditeur. Une image de README n'entre que si ses droits sont établis par écrit (docs/visuels.md §4), ce qui n'est le cas d'aucune dans ce lot. Aucune image produite par un modèle.
- **Sortie.** Le fichier va dans `maquette/medias/montages/ressources/<slug>.jpg` (`DOSSIER_VISUELS`). `media_asset.content` vaut `{ forme: 'montage', gabarit, fichier, octets }`, et `alt_text` vient de `texteAlternatif`. Rendu impossible (Chrome absent, défaut de mise en page) : publication `a_verifier`, motif `visuel_absent`, sans planification. Le contrôle passe au nouvel import.

### 5. Recherche (`src/recherche/*`)

**`normaliser.ts`**, sans aucune importation, est partagé par les contrôles, l'index, la requête et la maquette :

1. NFKD, retrait des diacritiques, `œ` → `oe`, `æ` → `ae`, minuscules ;
2. tout ce qui n'est ni lettre ni chiffre devient une espace ;
3. pluriels simples, appliqués à l'index comme à la requête :
   - un `s` final tombe pour un mot de 4 lettres au moins qui ne finit ni par `ss`, ni par `us`, ni par `is` ;
   - un `x` final tombe après `eu` ou `au` ;
   - liste d'exceptions courte (`macos`, `canvas`, `ios`…) ;
4. mots vides français et anglais retirés (liste courte, versionnée).

**`moteur.ts`**, pur, n'importe que `./normaliser.ts`. Il contient `classer(requete, documents)` et l'explication des correspondances.

- **Correspondance** : chaque mot de la requête doit être couvert par au moins un champ (ET logique). Le dernier mot de 3 lettres ou plus vaut aussi comme préfixe.
- **Poids proposés**, constantes testées :

  | Champ | Expression entière | Par mot |
  |---|---|---|
  | `nom` | 100 | 30 |
  | `usage`, `technologie`, `categorie` | 40 | 10 |
  | `terme_proche` | 25 | — |
  | texte de la publication | 8 | 2 par mot, plafonné |

- **Texte de la publication** : accroche, description, intérêt, exemple, démarrage, compatibilités, limites.
- **Explication** : chaque résultat porte `correspondances: { champ, terme, raison, extrait }[]`. Pour un terme proche, la raison enregistrée est affichée. Un résultat sans correspondance explicable n'est pas rendu.
- **Départage** : à score égal, le jour (publié ou prévu) le plus récent, puis `post_id`.

**`index.ts`** : `indexer(tx, postId, revisionId)` et `desindexer(tx, postId)`.

- Il écrit la ligne FTS5 normalisée : `nom` ; `mots_cles` (catégorie, usages, technologies, termes proches) ; `texte`.
- Il est appelé dans la transaction qui planifie la publication. Une nouvelle révision remplace la ligne ; un retrait la supprime.
- Seules les publications `en_attente` planifiées et `publie` sont indexées : jamais `brouillon`, `a_verifier`, `rejete` ni `retire`.

**`rechercher.ts`** : `rechercher(client, requete, { tri: 'pertinence' | 'recents', curseur, mode: 'public' | 'apercu' })`.

1. La requête est validée par Zod : 1 à 200 caractères ; vide après normalisation, la réponse est vide et le dit.
2. La requête FTS5 est construite par le code, mots normalisés entre guillemets, jamais la saisie brute. Elle donne les candidats.
3. `classer` classe et explique.
4. Le curseur est opaque : rang, plus l'empreinte de la requête, qui doit concorder.
5. Pages de 20 résultats, 50 au plus.

Modes :

- `public` : seulement les publications `publie`. C'est celui de l'API v1 commune au site et à l'application (ADR 0010) ; aucune n'existe avant P5.
- `apercu` : publications `publie` et `en_attente`, chaque résultat étiqueté « pas encore publié ». C'est celui de `chercher` et de la maquette.

Une requête n'est jamais enregistrée avec l'identité de son auteur.

**Évaluation.** « motion design » doit retrouver au moins deux ressources sans leur nom. C'est un test sur fixtures. Sur les vraies captures, ce sera ce que les passages permettent : on ne force aucune association. Le jeu de requêtes de référence (ADR 0008, SPEC §7.15) s'y ajoute quand les brouillons sont importés, avec les publications attendues lues par un humain.

**Maquette** : `npm run maquette` écrit `maquette/recherche.js`.

- Il prend `normaliser.ts` et `moteur.ts`, en retire les types avec `module.stripTypeScriptTypes` de Node 24 (expérimental, à surveiller) et réécrit le seul import `./normaliser.ts`.
- Les documents de recherche sont exportés dans `donnees.js`.
- Site, application et maquette classent avec le même code.

### 6. Liens (`src/ressources/liens.ts`) et planification (`src/ressources/planification.ts`)

**Vérification du bouton** : une requête sûre, par `safeGet`, sur l'API, la méthode d'accès documentée. Les pages HTML de `github.com` ne sont jamais lues (robots.txt).

- Pour un dépôt : `GET /repos/{o}/{r}`.
- Pour un dossier : `GET /repos/{o}/{r}/contents/<chemin>?ref=<branche>`.
- Le lien est vérifié si la réponse est un statut 200, sans redirection, et si son `html_url` est exactement l'URL du bouton.
- Un dépôt renommé répond 301 : le lien est refusé, et l'URL canonique (`full_name` de la capture `depot`) doit être utilisée.
- Une capture `depot` ou `dossier:` de moins de 24 heures, réussie, vaut vérification : `snapshot_id` est rempli, aucune requête n'est relancée.
- Échec : ligne `post_bouton` en `echec`, avec motif, aucun bouton affiché, publication `a_verifier` (`lien_non_verifie`).
- Le bouton est un lien `<a href target="_blank" rel="noopener noreferrer">`, sans attribut `download` ni script. Son nom accessible vaut « Voir le dépôt <full_name> sur GitHub (nouvel onglet) ».
- La commande s'affiche en texte, avec la mention « Commande citée de la documentation, non exécutée par la plateforme ». Rien ne s'installe au clic.

**Planification.** Rien n'atteint `publie` avant P5 : une publication conforme passe en `en_attente`, avec un jour prévu.

- **Ordre** :
  1. `prioriteEditoriale(nature, categories)`, soit 2 pour une ressource ;
  2. `nouvelle_sortie` avant `ressource_existante` ;
  3. ordre de la liste ;
  4. `post_id`.
- **Capacité d'un jour** :
  - `plafond_jour` moins le nombre de publications déjà prévues ou publiées ce jour-là, **tous contenus confondus** ;
  - une `ressource_existante` ne peut occuper que `plafond_jour − reserve_nouveautes_jour` places, soit 15 par défaut ;
  - la réserve sert aux nouveautés prioritaires : actualités de priorité 1 à 3 et ressources `nouvelle_sortie`, avec `utilise_reserve = 1` ;
  - le plafond n'est jamais dépassé, et le compte se fait dans la transaction d'écriture.
- **Rang** (corrigé le 2026-11-02) : l'écriture prend le premier rang libre du jour, puis les rangs du jour sont renumérotés de 1 à n dans l'ordre ci-dessus, à chaque placement ou retrait. Ni trou ni doublon ; l'index unique `(jour, rang)` l'impose.
- **Réimport** : une publication prévue aujourd'hui ou plus tard garde sa place seulement si son statut de sortie et sa priorité sont inchangés et si sa place reste admissible (réserve aux seules nouveautés prioritaires) ; sinon elle est replacée.
- **Réglages** : `planning --plafond N` ou `--reserve N` replace toutes les publications prévues dans la même transaction que l'écriture du réglage ; aucun jour à venir ne reste au-dessus du nouveau plafond.
- **Report** : au-delà d'un horizon de 60 jours, l'état passe à `reportee`, motif `plafond_atteint`. Un sujet sans place reste distinct d'un sujet écarté.
- **Avant P5** : un jour passé sans publication reprogramme les publications `prevue`, motif `reprogrammee_avant_p5`. Une ressource existante peut attendre sans devenir obsolète.
- **Jamais en nouveauté** : une ressource existante n'est jamais présentée comme une nouvelle sortie, ni dans le badge, ni dans le visuel, ni dans le planning.

### 7. Commande `npm run ressources -- <sous-commande>` (`src/cli/ressources.ts`)

Le fichier d'entrée répartit les sous-commandes vers `src/ressources/commandes/<nom>.ts` et sort avec le code de chacune. Toutes passent par `runCommand`, qui exige la migration 0009.

| Sous-commande | Effet | Réseau | Code de sortie |
|---|---|---|---|
| `capturer [slug]` | capture toutes les ressources ou une seule : `depot`, fichiers, dossiers et licences locales ; synchronise les sources, crée les actualités `decouverte` et la décision de sélection ; trace une exécution `run` (`kind = 'ressources_capture'`, `mode = 'live'`) avec une étape par requête, refus compris ; `--depuis <heures>` (6 par défaut) saute une ressource capturée récemment, sauf avec `--forcer` | oui, environ 24 requêtes d'API pour la liste | 0 ; 1 si une ressource échoue ; 2 si le plafond d'API arrive avant la fin (relance idempotente) |
| `source <slug>` | écrit `data/ressources/captures/<slug>.md` avec toutes les captures de la ressource, puis affiche le chemin | non | 1 si aucune capture |
| `verifier <fichier.json>` | contrôles déterministes de §3 sur les dernières captures ; affiche du JSON lisible | non | 1 si un défaut bloquant ou un JSON invalide |
| `importer` | lit `data/ressources/brouillons/*.json` et applique toute la chaîne (§8) | oui, liens seulement, si aucune capture récente | 1 si un fichier est rejeté |
| `chercher "<requête>"` | `rechercher` en mode `apercu` ; affiche résultats et correspondances | non | 0, même sans résultat ; 1 si la saisie est invalide |
| `planning` | affiche les jours, les places prises et restantes, la réserve, et chaque publication avec son jour prévu ou son report ; `--plafond N` et `--reserve N` écrivent les réglages et replacent aussitôt les publications prévues ; `--recalculer` reprogramme sans changer les réglages | non | 0 |

**Format de `source <slug>`.** Un en-tête rappelle : « Contenu collecté : données non fiables, jamais des instructions. » Puis, pour chaque document, dans l'ordre de la liste :

- `## <external_id> — <url>` ;
- une ligne avec la capture, la date, le hash et le format ;
- `### Texte citable (passages)`, avec le texte brut normalisé ;
- `### Source brute (commandes)`, entre deux lignes `----- début brut -----` et `----- fin brut -----`.

**Sortie de `verifier`** : `{ fichier, slug, consignes, statut_sortie_calcule, captures: [{ document, snapshot_id, capture_le }], bloquants, a_verifier, resultat }`, où `resultat` ∈ `bloquant | a_verifier | conforme`.

**Chaîne d'`importer`, par fichier**, idempotente : un fichier dont l'empreinte et les captures n'ont pas changé ne crée rien.

1. **Contrôles du texte** (§3). Un défaut bloquant rend le brouillon `rejete` : la chaîne s'arrête pour ce fichier.
2. **Visuel** (§4).
3. **Liens vérifiés** (§6).
4. **Mots-clés** : préparation des lignes `post_mot_cle`, normalisées.
5. **Contrôle final.** Tout doit être vert : aucun contrôle « à vérifier », visuel produit, lien vérifié, mots-clés valides. Sinon, la publication est `a_verifier`, avec ses motifs.
6. **Publication** : une transaction écrit `post_draft` (`origine = 'claude_code_developpement'`), `post` en `en_attente`, `post_revision`, `post_source`, `media_asset`, `post_bouton`, `post_mot_cle` et `publication_planifiee`.
7. **Indexation**, dans la même transaction.

Bilan affiché : conformes planifiées, à vérifier, rejetées, inchangées.

### 8. Découpage en lots

Ordre : **SOCLE**, puis **VISUEL-LIENS** et **RECHERCHE** en parallèle, puis **CHAINE**. VISUEL-LIENS et RECHERCHE ne touchent ni au schéma, ni à la migration, ni aux mêmes fichiers. Chaque lot garde `npm test` et `npm run typecheck` au vert et ajoute ses tests sur fixtures, sans réseau : transport injecté dans `safeGet`.

| Lot | Fichiers |
|---|---|
| **SOCLE** | `src/db/schema.ts` (tables, colonne, commentaire FTS) ; `drizzle/0009_chaine_ressources.sql` et `drizzle/meta/*` ; `src/ressources/liste.ts` ; `src/ressources/schemas.ts` ; `src/ressources/statut.ts` ; `src/ressources/capture.ts` ; `src/ressources/controles.ts` (dont `destinationDe`) ; `src/recherche/normaliser.ts` ; `src/control/settings.ts` (lecture d'un réglage entier, avec défaut) ; exports sans changement de comportement dans `src/analysis/controles.ts` et `src/selection/consignes.ts` ; exclusion des découvertes dans `src/analysis/pipeline.ts` ; `src/cli/ressources.ts` ; `src/ressources/commandes/{capturer,source,verifier}.ts` ; **bouchons** `src/ressources/commandes/{importer,chercher,planning}.ts`, qui affichent « pas encore construit (lot …) » et sortent en 2 ; script `ressources` dans `package.json` ; `.gitignore` ; `tests/ressources-socle.test.ts` et fixtures |
| **VISUEL-LIENS** | `src/media/montage.ts`, `src/media/style.ts`, `src/media/rendu.ts` (gabarit `etapes`) ; `src/ressources/visuel.ts` ; `src/ressources/liens.ts` ; `tests/ressources-visuel.test.ts`, `tests/ressources-liens.test.ts` ; `tests/montage.test.ts` reste vert |
| **RECHERCHE** | `src/recherche/moteur.ts`, `src/recherche/index.ts`, `src/recherche/rechercher.ts` ; `src/ressources/mots-cles.ts` ; `src/ressources/commandes/chercher.ts`, qui remplace le bouchon ; `tests/recherche.test.ts` : « motion design », saisies hostiles, exclusion des brouillons, explication, curseur |
| **CHAINE** | `src/ressources/chaine.ts` ; `src/ressources/planification.ts` ; `src/ressources/commandes/{importer,planning}.ts`, qui remplacent les bouchons ; `src/maquette/data.ts`, `src/cli/maquette.ts` (export des publications de ressources et de `recherche.js`) ; `maquette/index.html` : badge de statut, bouton, boîte de recherche avec correspondances, origine dans le panneau « Sources » ; mots-clés **invisibles dans les publications**, utilisés seulement par la recherche (retours de l'utilisateur du 2026-11-02, qui remplacent les mots-clés cliquables et le détail démarrage / état du dépôt prévus à l'origine) ; `tests/ressources-chaine.test.ts` |

**Rédaction des 20 brouillons**, après SOCLE, par Claude Code pendant le développement, sans appel payant. Pour chaque ressource :

1. `capturer` ;
2. `source <slug>` ;
3. écriture de `data/ressources/brouillons/<slug>.json` avec nos mots, selon la règle de ton et la ligne éditoriale de `docs/agents-editoriaux.md` §5 (2026-11-02 : public de pairs, aucun terme courant défini ; post court qui va à l'essentiel, sans rubrique systématique sur le démarrage, les compatibilités ou les limites) ;
4. `verifier`, jusqu'à zéro défaut bloquant.

L'import se fait après le lot CHAINE.

## Options considérées

| Sujet | Option | Choix et raison |
|---|---|---|
| Identité d'une ressource | table `ressource` dédiée | non : la liste versionnée et le document principal suffisent, sans doublon d'identité |
| | `news_item kind = 'decouverte'`, document principal | **oui**, comme prévu en SPEC §7.3 ter |
| Brouillons rédigés pendant le développement | les faire passer pour des sorties de l'agent | non : origine trompeuse |
| | `post_draft.origine` + `llm_run` d'import sans appel | **oui** : traçable et affiché |
| Vérifier le bouton | lire la page HTML de `github.com` | non : `/*/tree/` interdit par robots.txt, page lourde |
| | API GitHub, `html_url` exact | **oui** : méthode documentée, redirection refusée |
| Index | `LIKE` sur les révisions | non : lent, aucune explication |
| | FTS5 seul, classement `bm25` | non : `bm25` nul sur un petit corpus (essai), explication indirecte |
| | **FTS5 pour les candidats, classement et explication dans le code** | **oui** : même résultat sur le site, dans l'application et dans la maquette ; repli SQL simple si FTS5 manque en ligne |
| | base vectorielle | non : aucun besoin démontré (ADR 0008) |
| Termes proches | lexique global seul (ADR 0008) | insuffisant pour un besoin propre à une ressource |
| | termes proches par publication, avec raison contrôlée | **oui**, en complément du lexique |
| Visuel | image d'un modèle | non : payant, sans accord, risque de visuel trompeur |
| | image de README | non tant que les droits ne sont pas établis par écrit |
| | **montages du code** (`etapes`, `terminal_annote`, `fiches`) | **oui** |
| Réserve quotidienne | plafond séparé pour les ressources | non : ce serait une répartition fixe, refusée par SPEC §3.6 |
| | réserve pour les nouveautés prioritaires, réglable | **oui** |

## Compromis

- **Pendant le développement, Claude Code rédige ; le site ne rédige pas.** Les brouillons sont écrits par l'assistant de développement, pas par l'agent du site, et cela s'affiche. Le contrôle reste celui du code, pas un second avis du même modèle. La chaîne sera la même quand l'agent du site rédigera (P6).
- **Prudence sur la nouveauté.** Le statut d'un skill dans un dépôt ancien ne connaît pas sa date d'ajout. Un vrai nouveau skill peut ainsi être classé « ressource existante » ; l'inverse n'arrive jamais.
- **Quota d'API sans jeton.** 60 requêtes par heure, partagées : une capture complète peut demander deux passages. La commande s'arrête proprement et reprend.
- **Normalisation.** Les pluriels simples et les mots vides restent grossiers. Un synonyme non prévu n'est trouvé que par un terme proche relu, et « repo pour un Jarvis » reste hors de portée sans couche sémantique (ADR 0008).
- **Rythme.** Avec la réserve de 5, les 20 ressources occupent 15 places le premier jour et 5 le suivant. C'est conforme au plafond, mais dense pour le fil ; la réserve est réglable.
- **Recherche avant le volume.** Cette recherche est construite sur un petit corpus : son évaluation (SPEC §7.15) reste à faire sur un volume réel.
- **Typage retiré à la volée.** `stripTypeScriptTypes` est expérimental dans Node 24. Si l'API change, le lot CHAINE garde un test de parité entre `maquette/recherche.js` et `moteur.ts`.

## Conséquences

- La découverte et la recherche avancent pour cette liste avant P6, à la demande de l'utilisateur. Restent en P6 la découverte automatique (seuil d'étoiles, grille `d1`), le suivi des évolutions et la recherche sur toutes les publications.
- La publication réelle reste en P5. D'ici là, les publications de ressources sont `en_attente` avec un jour prévu, visibles seulement dans la maquette et dans `chercher`, en mode « aperçu ».
- L'API v1 de P4 exposera `rechercher` en mode `public` et lira les mêmes tables pour le bouton, les mots-clés, le statut et l'origine, sur le site comme dans l'application.
- L'ADR 0008 reste valable, avec ces précisions : candidats par FTS5, classement et explication dans le code, publications `en_attente` indexées seulement en mode aperçu, et termes proches par publication.
- À revoir :
  - P5 : FTS5 sur Turso hébergé, et plafond appliqué à toutes les publications par la même table ;
  - P6 : grille `d1` et découverte automatique ;
  - réglages proposés (réserve 5, seuil 14 jours, inactivité 90 jours, validité du lien 7 jours) : à confirmer par l'utilisateur.

## Complément du 2026-11-02 : le format « sélection »

**Décision de l'utilisateur (2026-11-02)** : en plus des posts individuels, la chaîne publie des **sélections de ressources**, sur le modèle d'un post X du type « 7 free AI design resources worth bookmarking » : une accroche courte qui annonce la sélection, puis une liste de ressources, chacune avec son nom cliquable vers la page officielle et une explication concrète d'une ligne ; le texte vient avant le montage ; l'aperçu replié (« Voir plus ») relève de la page. Ton : celui de `src/analysis/prompts.ts` et de `docs/agents-editoriaux.md` (aucune définition, aucun rappel des bases, aucune rubrique systématique, aucun remplissage). **Décisions de Claude** : modèle de données sans migration, contrôles, capture des sites, montage, découpage ci-dessous.

### Données (sans migration)

- **Liste** : `src/ressources/selection/liste.ts` (`SELECTIONS`), versionnée `selections-2026-11-02`. Chaque site : slug, nom (aussi libellé du lien), URL canonique finale, hôte unique autorisé, et `verifiee_a_la_main` quand le domaine nu redirige (fontinlogo.com → www.fontinlogo.com, en-têtes lus à la main le 2026-11-02 ; la collecte, elle, ne suit aucune redirection). **Compte signataire selon le sujet** (`COMPTE_PAR_SUJET`) : design → Mova.
- **Sources** : une par hôte, `kind = 'site-ressource'`, `id = 'site-ressource:<hôte>'`, `allowed_hosts = [hôte]` ; une pour la liste elle-même, `kind = 'selection-ressources'`. Documents : `robots` (texte), `page-accueil` (JSON trié : URL, titre, description, texte visible ligne par ligne, statut, type), `apercu` (JSON : fichier, sha256, taille, `droits_a_verifier: true`, ou bien `refuse: true` et son motif), `liste` (la liste transmise par l'utilisateur). `storeDocuments`, idempotent, comme le reste.
- **Actualité** : `news_item.kind = 'selection'`, document principal = la liste, documents d'appui = pages, robots.txt et aperçus. Exclue de la qualification payante (`aTraiter`), de la relecture des brouillons et du fil des actualités de la maquette, comme `decouverte`. Décision du code dans `selection_decision` : `publier` (motif `liste_utilisateur`) si au moins 3 sites sont capturés, sinon `approfondir`.
- **Publication** : les tables existantes. `post_draft.information_type = 'selection'`, `prompt_version = 'selection-s1'`, `origine = 'claude_code_developpement'`, `snapshot_id` = capture de la liste ; `post_revision.content` = brouillon + `ContenuSelection` (nature, compte, origine, mention IA, catégorie, captures citées, `exclus` : sites non retenus avec leur motif tracé) + `liens` (une vérification datée par ressource) ; `post_source` : liste, pages, robots.txt et aperçus cités ; `media_asset` : `origin = 'generated'`, mention d'illustration, `content.droits_a_verifier = true`. `post_bouton` n'est pas utilisé : ses contraintes (libellés « Voir le dépôt »…, hôte `github.com`) visent les dépôts ; le lien d'une sélection porte le nom de la ressource.

### Capture des sites

`npm run ressources -- selection capturer <slug>` : pour chaque site, **robots.txt d'abord** (RFC 9309 : groupe du jeton `curation-ai-collector`, sinon `*` ; règle la plus longue, `allow` à égalité ; 4xx = aucune restriction ; erreur serveur, réseau ou **redirection** = tout interdit, par prudence ; lignes `Content-Signal` relevées et tracées), puis la page d'accueil à l'URL canonique exacte, par `safeGet` : liste blanche réduite à l'hôte, adresses vérifiées, connexion épinglée, aucune redirection suivie (son `location` est tracé, jamais suivi), 15 s, 4 Mio (512 Kio pour robots.txt). Refus tracés dans `run_step` : `robots_interdit`, `robots_inaccessible`, `redirection`, `protection_anti_robot` (en-tête `cf-mitigated`, jamais contournée), `acces_refuse`, `type_inattendu`, `texte_insuffisant` (moins de 30 mots lisibles sans exécuter la page : « JS seul »)… Le texte est extrait du HTML en texte brut (`html.ts`), sans exécuter la page.

**Aperçus** (`selection apercus <slug>`, ou à la suite de `capturer`) : captures d'écran locales par Chrome (`playwright-core`, canal `chrome`), 1440 × 900, sans tête, contexte neuf par site, **sans connexion, sans clic ni cookie accepté**, sans téléchargement, service worker ni permission. Seuls les sites capturés en texte (donc permis par robots.txt) sont photographiés ; l'hôte est résolu et ses adresses vérifiées avant la navigation ; toute redirection (HTTP ou script) et toute protection anti-robot refusent l'aperçu ; les sous-requêtes non HTTPS ou vers une adresse locale écrite en clair sont bloquées. Limite connue : Chrome résout lui-même les hôtes des sous-ressources (CDN) ; l'épinglage d'adresse de `safeGet` ne s'y applique pas. Fichiers : `maquette/medias/montages/selections/apercus/<site>.jpg`. **Droits de publication non tranchés** (STATE.md, point montages) : exemple de maquette, jamais publié tel quel, tracé `droits_a_verifier`.

### Brouillon `BrouillonSelection` (`src/ressources/selection/schemas.ts`)

Fichier `data/ressources/brouillons/<slug>.json` reconnu par `"format": "selection"` (`verifier` et `importer` l'aiguillent). Objet strict : `slug`, `consignes = 's1'`, `accroche` (passages vides : elle annonce la sélection), `ressources` (3 à 10 : `site`, `nom`, `url`, `libelle_lien`, `explication` citée, `categorie`, `usages` cités 1 à 4, `termes_proches` avec raison), `mots_cles` (`nom` de la sélection, catégorie de `CATEGORIES`, termes proches).

### Contrôles déterministes (`src/ressources/selection/controles.ts`)

Bloquants : `schema_invalide`, `selection_inconnue`, `consignes_inconnues`, `capture_absente`, `site_inconnu`, `site_en_double`, **`site_non_capture`** (un site refusé ne peut pas être présenté sans affirmation non soutenue), **`lien_hote_inattendu`** (HTTPS, sans port ni identifiants, hôte de la liste), **`lien_non_canonique`**, **`libelle_incoherent`** (libellé ≠ nom), `nom_incoherent`, `champ_sans_citation`, **`citation_introuvable`** (passage absent, mot pour mot en mots entiers, de la capture de *cette* page : titre, description ou une ligne de texte), `citation_trop_courte`, `citation_trop_longue`, **`nombre_non_soutenu`** (tout chiffre de l'explication absent de ses passages ; dans l'accroche, tout nombre autre que le nombre de ressources), **`gratuite_non_prouvee`** (« gratuit », « free »… sans passage qui le dise ; dans l'accroche, il faut ce passage pour chaque ressource), `mot_cle_affirmatif` (chiffre ou gratuité dans une catégorie, un usage ou un terme proche), `usage_sans_passage`, `terme_proche_sans_raison`, `terme_proche_non_relie`, **`essai_non_realise`**, `popularite_invoquee`. À vérifier : `accroche_non_conforme`, `accroche_citee`, `explication_trop_longue` (150 caractères, une ligne), `copie_de_la_source`, `terme_proche_redondant` ; posés par la chaîne : `visuel_absent`, `lien_non_verifie`.

**Lien vérifié** : une capture réelle (`live`) de l'URL exacte, réussie sans redirection et de moins de 24 heures, en tient lieu (`capture_recente`) ; sinon une requête `safeGet` doit répondre 200 (`reponse_directe`). Le lien n'est affiché que si sa vérification date de moins de `ressources.validite_lien_jours` (7 jours) ; sinon le nom reste du texte.

### Montage, mots-clés, planification, maquette

- **Gabarit `selection`** (`src/media/montage.ts`, `style.ts`, `rendu.ts`) : grille de 4 à 6 cases, une par ressource citée, dans l'ordre du texte, le nom du site sous chaque aperçu ; un site sans aperçu garde sa case « Aperçu indisponible », sans image de substitution. Pied : « Captures des sites cités, © leurs auteurs · capturées le <jour> » (défaut `credit_absent` sinon) et la mention « Illustration — ne prouve pas le fonctionnement ». Défauts : `apercus_hors_limites`, `nom_apercu_hors_limites`, `image_non_locale`, `apercus_absents`, `apercus_hors_zone` (mise en page rendue). Une image dont l'empreinte a changé depuis sa capture est refusée (`visuel_absent`). Le carrousel n'est pas construit : au-delà de 6 ressources, le visuel est absent et la publication reste à vérifier.
- **Mots-clés** (`motsClesSelection`) : le nom de la sélection d'abord (il nomme le résultat), puis, pour chaque ressource citée, son nom, sa catégorie, ses usages (avec passage) et ses termes proches (avec raison) ; jamais affichés. `textesDePublication` indexe aussi le nom et l'explication de chaque ressource.
- **Planification** : une sélection = **une** publication dans le plafond de 20 par jour, priorité `prioriteEditoriale('ressource', …)` = 2, `ressource_existante` (jamais présentée comme une nouvelle sortie), placée après les ressources de la liste ; mêmes fonctions (`placer`, `renumeroter`, `indexer`), dans une transaction.
- **Maquette** : `donnees.js` expose `selections` (accroche, liste avec nom, lien vérifié ou `null`, libellé, explication citée, montage avec crédit et `droits_a_verifier`, sites exclus avec motif) et `selections_non_planifiees` ; les documents de recherche des sélections rejoignent `recherche`. L'affichage dans `maquette/index.html` (post de sélection, « Voir plus », liste, montage) reste à brancher : la recherche du navigateur classe déjà la sélection, mais la page ne rend aujourd'hui que les ressources.

### Première sélection (2026-11-02)

« Sélection design web », Mova, 7 sites transmis par l'utilisateur (post X, auteur non identifié). Capturés : Motion Sites, Land-book, Recent Design, Landdding, Font in Logo, 60fps. Non retenu : Godly (`godly.website` répond 301 vers `http://recent.design/?ref=godly`, redirection refusée). Aperçu refusé pour Land-book (défi Cloudflare, HTTP 403 `cf-mitigated: challenge` dans Chrome ; la page en texte, elle, a répondu 200 à `safeGet`). Planifiée le 2026-11-03, en attente, indexée.

### Compromis

- Les captures d'écran de sites tiers servent l'exemple : leur publication attend une décision sur les droits.
- Une page d'accueil dit peu, et souvent en slogans : l'explication ne garde que ce que la page affirme, en une ligne ; une liste de filtres faite de mots isolés ne se cite pas (3 mots au moins), donc ne s'affirme pas.
- Le texte de la page se lit sans exécuter son script : une page « JS seul » est refusée plutôt que lue à moitié ; l'aperçu, lui, exécute la page dans Chrome, avec les limites de réseau décrites plus haut.
