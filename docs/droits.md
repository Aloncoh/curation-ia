# Droits des visuels et médias

_Relevé du 2026-11-05 (cap « réseau social vivant », SPEC §0). Ce n'est pas un avis juridique : il dit ce qui est établi, ce qui ne l'est pas et ce qu'il faut trancher avant un lancement public. Conditions des éditeurs : [docs/visuels.md](visuels.md) §4 (lues le 2026-10-31)._

## 1. Ce que nous utilisons

| Élément | Origine | Où | Droits établis | À faire |
|---|---|---|---|---|
| Mascotte (planche, icône, variantes) | fournie par l'utilisateur le 2026-10-30 | logo, favicon, états vides, accueil | non : auteur et conditions non documentés | l'utilisateur confirme qu'il détient les droits (création propre, commande, ou outil de génération dont les conditions autorisent l'usage commercial) |
| Six avatars d'agents (planches de Nodi, Repo, Pyxo, Mova, Pulse, Radar) | fournis par l'utilisateur le 2026-10-30 | profils, avatar en bas à droite des couvertures | non, même réserve | idem |
| Bannières des agents (`assets/brand/banniere-*.webp`, dossier `BANIERE/` non versionné) | fournies par l'utilisateur | profils | non, même réserve | idem |
| Personnages détourés (`maquette/medias/agents/`) | découpés le 2026-11-06 dans les planches de l'utilisateur, fond retiré par Vision (macOS), yeux d'origine effacés et remplacés à l'affichage par des yeux animés | accueil de la maquette | même réserve que les avatars | idem |
| Fonds des couvertures (`FONDS/pourpost.png`, 18 découpes) | fournis par l'utilisateur le 2026-11-05 | couvertures | non, même réserve ; **netteté insuffisante** (§3) | idem ; originaux en haute définition |
| Logos de marques (`apps/web/public/logos/`, svgl et simple-icons) | fichiers publics ; les marques restent la propriété de leurs titulaires | couvertures, au premier plan | **non pour plusieurs éditeurs** (§2) | décision de l'utilisateur (§4) |
| Images d'aperçu GitHub des dépôts (`maquette/medias/montages/ressources/gh-*.jpg`) | générées par GitHub à partir du dépôt | maquette, ressources | non : contenu du dépôt (avatar, README) à son auteur | garder pour la maquette ; sur le site, préférer le montage rendu par le code |
| Photo « Googleplex Campus » (`maquette/medias/google-campus.jpg`) | bibliothèque d'images presse de Google, même empreinte SHA-256 que l'original | maquette | oui, avec le crédit « Source: Google. » (relevé du 2026-10-31) | revérifier avant tout usage sur le site |
| Reel « Copilot Fusion » (`maquette/medias/reel-copilot-fusion.*`) | rendu par le code du projet | maquette | oui (création du projet), marqué « Illustration — not proof that it works » | aucun |
| Couvertures du fil de l'accueil (`maquette/medias/fil/`) | captures des couvertures du site, prises le 2026-11-06 | accueil de la maquette | composition propre ; elles contiennent des logos d'éditeurs et les fonds fournis | même règle que les logos et les fonds |
| Montages (`maquette/medias/montages/`) | rendus par le code du projet | maquette, site | composition propre ; ils peuvent contenir un logo ou une capture d'éditeur | même règle que les logos |
| Captures de pages (texte) | collectées pour vérifier les citations | base de données, jamais affichées en entier | citations courtes attribuées, résumés originaux avec lien | aucun |

## 2. Logos au premier plan : ce que disent les éditeurs

Les couvertures (demande de l'utilisateur du 2026-11-05 : « les vrais logos en couleur ») placent le logo au centre, en grand. D'après les conditions lues le 2026-10-31 :

- **Anthropic** : permission préalable, aucune exception éditoriale. Le logo Anthropic figure sur les couvertures de Claude Code, déjà publiées.
- **Google** : usage informatif admis, mais la marque ne doit jamais être l'élément le plus visible. Nos couvertures font l'inverse.
- **ElevenLabs** : permission écrite préalable pour les éléments de marque.
- **Figma** : capture limitée aux supports pédagogiques et projets scolaires.
- **OpenAI** : conditions non lues (page refusée à la collecte) ; à relire à la main.
- Autres marques (Meta, NVIDIA, Microsoft, GitHub, Vercel, Discord, Hugging Face…) : conditions non relues pour cet usage.

Citer un nom de marque dans un texte d'actualité n'est pas en cause ; c'est le logo graphique, en grand, qui l'est.

## 3. Netteté des fonds

Mesure du 2026-11-05 : chaque fond `assets/brand/fond-*.webp` fait **504 × 171 px**, découpé dans une planche de 1536 × 1024. Une couverture s'affiche jusqu'à environ 600 px de large, soit 1 200 px sur un écran haute densité : l'image est agrandie environ 2,4 fois et paraît floue. Un agrandissement par logiciel n'ajoute aucun détail réel. Les solutions sont : les originaux en haute définition (même nom de fichier, aucun code à changer), ou des fonds dessinés par le code, nets à toute taille, un univers par agent.

## 4. Décisions à prendre avant le lancement public

1. Droits de la mascotte, des avatars, des bannières et des fonds : origine et conditions (l'utilisateur).
2. Logos au premier plan : (a) garder le logo seulement pour les marques dont les conditions le permettent et le remplacer ailleurs par le nom en typographie ; (b) demander les permissions ; (c) retirer les logos des couvertures. Recommandation : (a) dès maintenant, (b) pour les quelques marques les plus fréquentes.
3. Fonds en haute définition, ou fonds dessinés par le code.
