# Visuels des publications

> Décision de l'utilisateur du 2026-10-31. « Posts animés » désigne surtout des photos et captures mises en page dans un montage travaillé : détourage, composition, annotations, aperçu de l'outil et texte court. Une vidéo n'est pas requise à chaque publication. Décision technique : [ADR 0007](decisions/0007-montages-graphiques.md).

## 1. Ce qu'un visuel doit faire

Montrer la nouveauté et donner envie de comprendre. Compter sur un visiteur qui fait défiler : le titre se lit d'abord, l'image dit de quoi il s'agit, les annotations disent ce qui change. La nouveauté est en gros titre, le fond reste lumineux, chaque compte garde sa couleur.

Inspiration tirée des posts efficaces sur X et Reddit : une seule idée par image, un sujet grand et cadré serré, peu de mots, un texte lisible sur téléphone, le produit plutôt que le logo. Ce sont des principes, pas des gabarits copiés. Aucune étude sérieuse trouvée ne mesure l'effet de montages annotés dans ces fils : l'effet réel reste à observer.

## 2. Gabarits

Format maître : 1080 × 1350 (4:5), recommandé par Reddit pour ses annonces du fil. La compatibilité avec X reste à contrôler : sa page d'aide n'a pas pu être lue.

| Gabarit | Sert à | Média requis |
|---|---|---|
| `photo_titre` | une annonce portée par une photo | photo autorisée |
| `fenetre_annotee` | montrer l'outil, avec deux ou trois étiquettes | capture autorisée |
| `loupe` | montrer un détail d'interface | capture autorisée |
| `avant_apres` | montrer ce qui change | deux images autorisées |
| `detourage_titre` | un produit ou un objet qui sort du cadre | image détourée autorisée |
| `terminal_annote` | une commande citée | aucun : reconstitution étiquetée |
| `fiches` | deux ou trois repères cités | aucun : cas par défaut sans média |

La signature graphique vient de la mascotte en peluche : le feutre en fond et des étiquettes cousues, reliées par un fil à ce qu'elles montrent.

## 3. Règles

- **Aucun texte nouveau** : titre et étiquettes viennent de champs cités du brouillon, notamment `reperes` (trois au plus, 64 caractères au plus).
- **Lisibilité** : contraste de 4,5:1 au moins pour le texte que nous ajoutons (WCAG 2.2) ; 40 px au moins sur 1080 pour les étiquettes, à contrôler sur un vrai téléphone.
- **Mention** « Illustration — ne prouve pas le fonctionnement » sur chaque montage, crédit exigé par l'éditeur au pied.
- **Refus automatique** : texte qui déborde, étiquettes qui se chevauchent, fiches hors zone, image distante ou illisible, crédit ou texte alternatif manquant, mention inexacte. L'image n'est pas produite.
- **Pas de faux** : aucune interface recréée pour faire croire à une capture. Une commande reconstituée le dit sur l'image.
- **Annotation sans repérage** : sans humain ni modèle de vision, les étiquettes s'empilent sans fil, car le code ne sait pas où se trouve l'élément dans l'image.

## 4. Droits par éditeur

Relevé du 2026-10-31. Ce n'est pas un avis juridique. Rien de lu ne dit si annoter ou détourer une capture constitue une modification interdite : à trancher avant toute publication automatique d'une capture. Tant que ce n'est pas tranché, le cas par défaut reste `fiches`.

| Éditeur | Photo ou capture | Conditions lues |
|---|---|---|
| Google | autorisé pour un usage informatif, dont un article d'actualité | [montrer le produit fidèlement](https://partnermarketinghub.withgoogle.com/brands/google/branding-guidelines/how-to-show-googles-brand/), sans modifier l'interface ; attribution ; marque jamais élément le plus visible. [Images de la page presse](https://blog.google/press/) : crédit « Source: Google » |
| Figma | capture limitée aux supports pédagogiques et projets scolaires | [règles de marque](https://www.figma.com/using-the-figma-brand/) |
| Anthropic | permission préalable, aucune exception éditoriale | [règles de marque](https://www.anthropic.com/legal/trademark-guidelines) du 1er août 2024 |
| Mistral | kit destiné aux partenaires, presse et captures non traitées | [page de marque](https://mistral.ai/brand) |
| ElevenLabs | permission écrite préalable pour les éléments de marque | [conditions](https://elevenlabs.io/terms-of-use), section 5c |
| OpenAI | non lu : page refusée | à relire à la main |

## 5. Détourage

| Outil | Licence | Tourne sur Linux | Décision |
|---|---|---|---|
| Apple Vision | système | non | essayé en local, 219 à 404 ms ; utilisable à la main |
| `rembg` | MIT pour le code ; modèle par défaut non commercial | oui, Python | écarté par défaut ; second langage, poids à vérifier |
| `@imgly/background-removal-node` | AGPL-3.0 | oui | écarté tant que la portée de l'AGPL n'est pas tranchée |
| PNG transparent d'un kit presse | selon l'éditeur | oui | à privilégier |

## 6. Production

`npm run montage` rend les exemples dans `maquette/medias/montages/` par le navigateur Chrome local, sans réseau ni modèle. Les exemples sont signalés comme tels : les images du projet remplacent les médias d'éditeurs tant que leurs droits ne sont pas établis. Une capture de la maquette qui montre la photo Google porte le crédit de cette photo.


## Couvertures et couleurs du site (décision de l'utilisateur du 2026-11-05)

- **Critère** : avant de lire le texte, on doit comprendre de quoi parle le post.
- **Couverture de chaque post** (`apps/web/components/Couverture.tsx`, sujet déduit dans `apps/web/lib/sujet.ts`) : fond aux couleurs de la marque du sujet, son logo en grand (simple-icons 16.35.0, CC0 ; monogramme pour une marque retirée de la bibliothèque, comme OpenAI), son nom, et l'avatar de l'agent en petit dans un coin comme signature. Pour un dépôt GitHub sans marque connue : l'avatar public du propriétaire. Formes du fond propres à chaque post (graine = identifiant).
- **Rythme du fil** : ressource en grand visuel (16:9), sélection en grille de captures (mosaïque existante), annonce courte avec une vignette carrée. La page d'un post montre la couverture puis le média complet (montage, carrousel).
- **Couleurs** : violet signature (logo, onglet actif, boutons principaux) ; fond blanc légèrement lilas en clair, aubergine presque noir en sombre ; une couleur par agent (celle de ses montages) pour l'avatar et la signature.
- **Pas encore fait** : reprise des images officielles (og:image) selon leurs conditions (ADR 0004) ; illustrations générées par une IA d'images, à brancher quand l'utilisateur aura ouvert un compte et fixé un budget ; animation légère pour les outils de motion.
