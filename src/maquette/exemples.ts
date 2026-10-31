// Exemples de publications pour la maquette (P2, vision sociale du 2026-10-30).
// Rédigés par Claude Code — PAS par l'agent du site, qui n'existe pas encore (P3) — à partir de captures réelles.
// Chaque champ factuel cite au moins un passage copié tel quel de la capture ; `npm run maquette` et les tests vérifient
// que chaque passage se retrouve mot pour mot dans le texte brut de la capture (espaces normalisés).
// Ils montrent le format visé ; ce ne sont pas des publications et ils sont étiquetés « Exemple » partout.

/** Champ factuel : un texte en français et les passages de la source qui le soutiennent (langue originale). */
export interface ChampCite {
  texte: string;
  passages: string[];
}

/**
 * Libellés possibles d'un détail (affichés aussi sur les diapositives et dans le Reel). Ils ne sont pas cités : ils nomment
 * le sujet sans rien affirmer. Liste fermée, pour qu'un libellé nouveau soit relu avant d'être utilisé.
 */
export const LIBELLES_DETAILS = [
  'Aussi dans cette version',
  'Coût',
  'Administration',
  'Erreurs WebFetch',
  'Un modèle seul, en cascade ou en critique',
] as const;

export interface DetailCite extends ChampCite {
  titre: (typeof LIBELLES_DETAILS)[number];
}

/** Benchmark ou témoignage rapporté par la source : toujours attribué, jamais présenté comme mesuré ou vécu par le site. */
export interface Attribution extends ChampCite {
  type: 'benchmark' | 'temoignage';
  auteur: string;
}

/** Diapositive du média généré : elle reprend un champ vérifié, jamais un texte nouveau. */
export type Diapositive = 'accroche' | 'nouveaute' | 'ce_que_ca_permet' | 'pour_qui' | 'limites_connues' | `details:${number}`;

/** Auteur d'une publication : six identités éditoriales sur le même moteur (noms provisoires). */
export type CompteId = 'nodi' | 'repo' | 'pyxo' | 'mova' | 'pulse' | 'radar';

/**
 * Média principal : ce qui montre la nouveauté, jamais la mascotte. Présentation originale dont chaque élément est un
 * champ cité, contrôlé comme les autres. `original` : image de l'éditeur, liée et non reproduite (droits non vérifiés) ;
 * son adresse doit figurer dans la capture.
 */
export interface VisuelMedia {
  forme: 'etapes' | 'terminal' | 'priorite' | 'avant_apres' | 'photo';
  legende: 'Schéma original' | 'Reconstitution de la commande citée' | 'Photo de presse, sans rapport direct avec le produit';
  /** Photo réutilisée (ADR 0004) : fichier local, crédit exigé et page des conditions. */
  photo?: { fichier: string; alt: string; credit: string; conditions: string; verifie_le: string };
  elements: ChampCite[];
  original?: { url: string; libelle: string };
}

export interface ExemplePublication {
  id: string;
  compte: CompteId;
  /** Description concise du fil ; l'analyse longue et les citations restent sur la publication détaillée. */
  description: ChampCite;
  visuel: VisuelMedia;
  /** Document cité : (source, URL normalisée), comme dans la base. */
  source_id: string;
  url: string;
  media: 'carrousel' | 'image';
  /** Court libellé affiché en grand sur le média (nom de produit, version) : il nomme, il n'affirme rien. */
  titre_media: string;
  accroche: ChampCite;
  nouveaute: ChampCite;
  ce_que_ca_permet: ChampCite | null;
  pour_qui: ChampCite | null;
  limites_connues: ChampCite | null;
  details: DetailCite[];
  attributions: Attribution[];
  diapositives: Diapositive[];
  categories: string[];
  /** Champ non factuel, dispensé de citation (SPEC §7.3). */
  questions_a_tester: string[];
}

export const EXEMPLES: ExemplePublication[] = [
  {
    id: 'exemple-copilot-fusion',
    compte: 'nodi',
    description: {
      texte: "On choisit le niveau d'effort, Copilot choisit les modèles. Chaque modèle utilisé est facturé à son tarif standard.",
      passages: [
        'For each prompt, Copilot Fusion determines which models to use and how they work together, while you choose the right level of effort.',
        'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
      ],
    },
    visuel: {
      forme: 'etapes',
      legende: 'Schéma original',
      elements: [
        { texte: 'Seul : un modèle traite la tâche', passages: ['Single: One model solves the task directly.'] },
        { texte: 'Cascade : un modèle économe rédige, un contrôle décide de passer à un modèle plus fort', passages: ['Cascade: An efficient model drafts a response. A quality check determines whether to accept it or escalate to a stronger model.'] },
        { texte: 'Critique : un modèle rédige, un autre relit, le premier corrige', passages: ['Critique: One model drafts an initial response, another model reviews it, and the original model revises.'] },
      ],
      original: { url: 'https://github.com/user-attachments/assets/1eeffdb5-0c21-4697-8007-bb6df0e70e8b', libelle: 'Voir le schéma de GitHub' },
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion',
    media: 'carrousel',
    titre_media: 'Copilot Fusion',
    accroche: {
      texte: 'Copilot Fusion en disponibilité générale : à chaque demande, Copilot choisit les modèles et, si besoin, les fait travailler ensemble',
      passages: [
        'GitHub Copilot Fusion is generally available.',
        'For each prompt, Copilot Fusion determines which models to use and how they work together',
        'orchestrating multiple models through the following workflows when needed',
      ],
    },
    nouveaute: {
      texte:
        "Au lieu de choisir un modèle pour chaque tâche, on laisse Copilot Fusion décider, à chaque demande, quels modèles utiliser et comment les faire travailler ensemble ; l'utilisateur choisit le niveau d'effort : Standard, High ou Max.",
      passages: [
        'Instead of picking a model for each task',
        'For each prompt, Copilot Fusion determines which models to use and how they work together, while you choose the right level of effort.',
        'Fusion Standard: Prioritizes versatile models for everyday coding.',
        'Fusion High: Prioritizes capable models for challenging tasks and deeper reasoning.',
        'Fusion Max: Prioritizes the most capable models for the most demanding tasks and complex reasoning.',
      ],
    },
    ce_que_ca_permet: {
      texte:
        "Selon GitHub, plus besoin de changer de modèle en cours de tâche ; côté administration, choisir les modèles utilisables et, via les paramètres gérés Enterprise, faire de Copilot Fusion le modèle par défaut.",
      passages: [
        'There’s no need to switch models during a task or decide which model suits each step.',
        'Administrators control which models Copilot Fusion can use and whether Copilot Fusion is the default.',
        'Administrators can set Copilot Fusion, at any effort level, as the default model for Copilot users with Enterprise managed settings',
      ],
    },
    pour_qui: {
      texte: "Les utilisateurs de Copilot, toutes offres, dans VS Code, l'app GitHub Copilot, Copilot CLI et les IDE JetBrains.",
      passages: [
        'Copilot Fusion is available on all Copilot plans in Visual Studio Code, the GitHub Copilot app, GitHub Copilot CLI, and JetBrains IDEs.',
      ],
    },
    limites_connues: {
      texte:
        "Les autres clients ne sont pas encore pris en charge (annoncés « bientôt », sans date) ; chaque modèle utilisé est facturé à son tarif standard.",
      passages: [
        'Support for additional clients is coming soon.',
        'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
      ],
    },
    details: [
      {
        titre: 'Un modèle seul, en cascade ou en critique',
        texte:
          "Selon la tâche : un seul modèle la traite directement ; ou, en cascade, un modèle économe rédige et un contrôle de qualité décide d'accepter ou de passer à un modèle plus fort ; ou, en critique, un modèle rédige, un autre relit, puis le premier corrige.",
        passages: [
          'orchestrating multiple models through the following workflows when needed',
          'Single: One model solves the task directly.',
          'Cascade: An efficient model drafts a response. A quality check determines whether to accept it or escalate to a stronger model.',
          'Critique: One model drafts an initial response, another model reviews it, and the original model revises.',
        ],
      },
      {
        titre: 'Coût',
        texte:
          'Chaque modèle utilisé est facturé à son tarif standard ; remise de 30 % sur le coût des modèles, pendant une durée limitée, pour les offres payantes.',
        passages: [
          'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
          'For a limited time, users on paid Copilot plans will receive a 30% discount on model costs when using Copilot Fusion.',
        ],
      },
    ],
    attributions: [
      {
        type: 'benchmark',
        auteur: 'GitHub, dans son annonce du 28 octobre 2026',
        texte:
          "Selon GitHub, Copilot Fusion Max obtient 60 à l'Artificial Analysis Coding Agent Index, à deux points au plus de Claude Code avec Opus 5.5 Max, pour environ la moitié du coût moyen d'API par tâche. Score annoncé par GitHub ; l'annonce ne dit pas qui a mené l'évaluation ni dans quelles conditions ; non mesuré par la plateforme.",
        passages: [
          'In the Artificial Analysis Coding Agent Index, Copilot Fusion Max scored 60, within two points of Claude Code with Opus 5.5 Max.',
          'It delivered that result at about half the average API cost per task',
        ],
      },
      {
        type: 'temoignage',
        auteur: 'Hari Pokhrel, Principal Software Engineer, AT&T — cité par GitHub',
        texte:
          "Témoignage rapporté par l'éditeur : chez AT&T, Copilot Fusion Standard aurait amélioré l'efficacité en tokens en choisissant automatiquement le modèle adapté à la tâche. Expérience attribuée, pas une conclusion générale.",
        passages: [
          'GitHub Copilot Fusion Standard has improved token efficiency across AT&T by automatically selecting the right model for the task',
          'Hari Pokhrel, Principal Software Engineer, AT&T',
        ],
      },
    ],
    diapositives: ['accroche', 'nouveaute', 'details:0', 'pour_qui', 'limites_connues'],
    categories: ['outil de développement', 'modèles'],
    questions_a_tester: [
      "Sur une même tâche, quels modèles Copilot Fusion choisit-il à chaque niveau d'effort ?",
      "Le coût réel d'une tâche est-il visible pour l'utilisateur ?",
    ],
  },
  {
    id: 'exemple-claude-code-2-1-312',
    compte: 'nodi',
    description: {
      texte: "Face à un très gros fichier d'instructions dont Claude n'a vu que le début, Write demande de le lire en entier ou de le modifier sur place.",
      passages: ['after seeing only its start; Write now asks Claude to read it all or edit in place'],
    },
    visuel: {
      forme: 'avant_apres',
      legende: 'Schéma original',
      elements: [
        { texte: 'Avant : réécriture après avoir vu seulement le début du fichier', passages: ['Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start'] },
        { texte: 'Maintenant : Write demande de tout lire ou de modifier sur place', passages: ['Write now asks Claude to read it all or edit in place'] },
      ],
    },
    source_id: 'github-releases:anthropics/claude-code',
    url: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
    media: 'carrousel',
    titre_media: '2.1.312',
    accroche: {
      texte: "Claude Code 2.1.312 corrige la réécriture d'un très gros CLAUDE.md de sous-dossier après n'en avoir vu que le début",
      passages: [
        'Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start',
      ],
    },
    nouveaute: {
      texte:
        "Quand Claude s'apprête à réécrire un très gros CLAUDE.md, fichier de règles ou fichier inclus par @ d'un sous-dossier dont il n'a vu que le début, l'outil Write lui demande désormais de le lire en entier ou de le modifier sur place.",
      passages: [
        'Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start; Write now asks Claude to read it all or edit in place',
      ],
    },
    ce_que_ca_permet: {
      texte: "Éviter qu'un long fichier d'instructions placé dans un sous-dossier soit réécrit après n'en avoir vu que le début.",
      passages: [
        'a very large CLAUDE.md, rules file or @-included file in a subdirectory',
        'after seeing only its start; Write now asks Claude to read it all or edit in place',
      ],
    },
    pour_qui: {
      texte: "Les utilisateurs de Claude Code qui gardent de longs fichiers d'instructions dans des sous-dossiers de leurs projets.",
      passages: ['a very large CLAUDE.md, rules file or @-included file in a subdirectory'],
    },
    limites_connues: null,
    details: [
      {
        titre: 'Aussi dans cette version',
        texte:
          "En plein écran, cliquer sur l'indication « to send now » sous un message en attente l'envoie tout de suite, comme la touche correspondante.",
        passages: ['Added click to send: in fullscreen, clicking the "to send now" hint under a queued message sends it right away, as its key does'],
      },
      {
        titre: 'Erreurs WebFetch',
        texte:
          "Dans les sessions cloud, quand un hôte ne se résout pas, l'erreur de WebFetch explique qu'il est peut-être hors des domaines réseau autorisés, ce qui permet à Claude de nommer l'hôte à autoriser.",
        passages: [
          'Improved WebFetch errors in cloud sessions: a host that does not resolve is now explained as possibly outside the allowed network domains, so Claude names the host to allow',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche', 'nouveaute', 'pour_qui', 'limites_connues'],
    categories: ['assistant de code'],
    questions_a_tester: ["Avec un CLAUDE.md de plusieurs milliers de lignes dans un sous-dossier, Claude le lit-il en entier avant de le modifier ?"],
  },
  {
    id: 'exemple-codex-cli-0-166-0',
    compte: 'pyxo',
    description: {
      texte: 'Une commande pour diagnostiquer la configuration, la connectivité et les WebSockets.',
      passages: ['Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.'],
    },
    visuel: {
      forme: 'terminal',
      legende: 'Reconstitution de la commande citée',
      elements: [
        { texte: 'codex doctor --network-only', passages: ['codex doctor --network-only'] },
        { texte: 'codex queue --resume', passages: ['codex queue --resume'] },
      ],
    },
    source_id: 'github-releases:openai/codex',
    url: 'https://github.com/openai/codex/releases/tag/rust-v0.166.0',
    media: 'image',
    titre_media: '0.166.0',
    accroche: {
      texte: 'Codex CLI 0.166.0 ajoute codex doctor --network-only pour diagnostiquer configuration, connectivité et WebSockets',
      passages: ['Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.'],
    },
    nouveaute: {
      texte:
        'Un diagnostic ciblé de la configuration, de la connectivité et des WebSockets, et GPT-6.1 Terra dans les catalogues de modèles intégré, Vertex AI et Amazon Bedrock.',
      passages: [
        'Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.',
        'Added GPT-6.1 Terra to the bundled, Vertex AI, and Amazon Bedrock model catalogs.',
      ],
    },
    ce_que_ca_permet: {
      texte:
        'Lancer avec codex doctor --network-only un diagnostic ciblé de la configuration, de la connectivité et des WebSockets ; sélectionner la transcription au clavier, par mot, ligne ou page, avec recherche intégrée.',
      passages: [
        'Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.',
        'Added keyboard-driven transcript selection with word, line, and page motions, integrated search, and configurable shortcuts.',
      ],
    },
    pour_qui: null,
    limites_connues: null,
    details: [
      {
        titre: 'Aussi dans cette version',
        texte: "codex queue --resume reprend des fils déchargés après la mise en file d'un message.",
        passages: ['Added codex queue --resume to resume unloaded threads after queueing a message.'],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['assistant de code'],
    questions_a_tester: ["Que vérifie exactement codex doctor --network-only derrière un proxy d'entreprise ?"],
  },
  {
    id: 'exemple-copilot-images',
    compte: 'mova',
    description: {
      texte: "On décrit l'image dans le chat ; un aperçu s'affiche et l'image est enregistrée dans le projet. Filigrane visible désactivé par défaut.",
      passages: [
        'Describe an image conversationally in any Copilot chat session',
        'previews the result inline, and saves it to your project.',
        'Watermarking is off by default.',
      ],
    },
    visuel: {
      forme: 'etapes',
      legende: 'Schéma original',
      elements: [
        { texte: 'Décrire l’image dans le chat', passages: ['Describe an image conversationally in any Copilot chat session'] },
        { texte: 'Le modèle appelle GPT Image 2.5 Flare', passages: ['your selected reasoning model calls a dedicated image-generation tool powered by GPT Image 2.5 Flare'] },
        { texte: 'Aperçu dans la conversation, image enregistrée dans le projet', passages: ['previews the result inline, and saves it to your project.'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-generate-and-edit-images-directly-in-copilot',
    media: 'image',
    titre_media: 'Copilot',
    accroche: {
      texte: 'GitHub Copilot génère et modifie des images depuis le chat, en préversion publique',
      passages: [
        'You can now generate and edit images using natural language in GitHub Copilot.',
        'Describe an image conversationally in any Copilot chat session',
        'Image generation is in public preview',
      ],
    },
    nouveaute: {
      texte:
        "Le modèle de raisonnement choisi appelle un outil dédié à la génération d'images (GPT Image 2.5 Flare), affiche un aperçu dans la conversation et enregistre l'image dans le projet.",
      passages: [
        'your selected reasoning model calls a dedicated image-generation tool powered by GPT Image 2.5 Flare, previews the result inline, and saves it to your project.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'Selon GitHub, obtenir un visuel sans quitter sa session de code ni passer par un outil séparé.',
      passages: [
        'Previously, getting a visual asset while working in Copilot meant stepping away to a separate tool',
        'This update removes that context switch, so you can go from an idea to a usable image without breaking your flow.',
      ],
    },
    pour_qui: {
      texte: "Les abonnés Copilot Pro, Pro+, Business et Enterprise ; pour l'essayer, un chat Copilot dans VS Code, l'app GitHub Copilot ou Copilot CLI.",
      passages: [
        'Image generation is in public preview for Copilot Pro, Copilot Pro+, Copilot Business, and Copilot Enterprise.',
        'To try it, open a Copilot chat in VS Code, the GitHub Copilot app, or Copilot CLI',
      ],
    },
    limites_connues: {
      texte:
        "Préversion publique ; filigrane visible « Made with AI » en option, désactivé par défaut ; facturé à part, en tokens d'image décomptés des crédits IA de l'offre.",
      passages: [
        'Image generation is in public preview',
        'You can opt in to a visible “Made with AI” watermark on images Copilot generates and edits.',
        'Watermarking is off by default.',
        'It’s billed separately from your chat model, based on image tokens that count toward your plan’s AI credits.',
      ],
    },
    details: [
      {
        titre: 'Administration',
        texte: "Les propriétaires d'organisation et d'entreprise peuvent désactiver la génération d'images dans les règles de modèles de Copilot.",
        passages: [
          'Organization and enterprise owners can turn off image generation by disabling the image generation model using Copilot model policies.',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['outil de développement', 'design'],
    questions_a_tester: ["Une image générée garde-t-elle une trace de son origine IA quand le filigrane est désactivé ?"],
  },
  {
    id: 'exemple-gemini-4-carbon',
    compte: 'radar',
    description: {
      texte: 'Google le présente comme son prochain modèle de pointe. Le flux collecté ne donne pas le détail : disponibilité et limites sont à lire à la source.',
      passages: ['Gemini 4 Carbon: our next frontier model'],
    },
    visuel: {
      forme: 'photo',
      legende: 'Photo de presse, sans rapport direct avec le produit',
      elements: [{ texte: 'Google présente Gemini 4 Carbon', passages: ['Gemini 4 Carbon: our next frontier model'] }],
      photo: {
        fichier: 'google-campus.jpg',
        alt: 'Vue du campus Googleplex',
        credit: 'Source: Google.',
        conditions: 'https://blog.google/image-library/',
        verifie_le: '2026-10-30',
      },
    },
    source_id: 'feed:google-gemini',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon',
    media: 'image',
    titre_media: 'Gemini 4 Carbon',
    accroche: { texte: 'Google présente Gemini 4 Carbon, son prochain modèle de pointe', passages: ['Gemini 4 Carbon: our next frontier model'] },
    nouveaute: { texte: 'Un nouveau modèle de pointe annoncé par Google.', passages: ['Gemini 4 Carbon: our next frontier model'] },
    ce_que_ca_permet: null,
    pour_qui: null,
    limites_connues: null,
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['grandes entreprises', 'annonce officielle'],
    questions_a_tester: ['Quand et pour qui Gemini 4 Carbon est-il disponible ?'],
  },
  {
    id: 'exemple-github-enterprise-copilot',
    compte: 'pyxo',
    description: {
      texte: 'Pour les clients suivis par une équipe commerciale : Copilot inclus par utilisateur licencié, usage décompté du budget dès la première requête.',
      passages: [
        'Enterprises working with a GitHub or Microsoft account team can now get Copilot included with GitHub Enterprise for every licensed user.',
        'AI usage is metered from the first request against your enterprise budget',
      ],
    },
    visuel: {
      forme: 'avant_apres',
      legende: 'Schéma original',
      elements: [
        { texte: 'Avant : gérer les sièges Copilot et l’usage de l’IA', passages: ['Previously, you had to manage two things: how many Copilot seats you were paying for and how much AI usage those users consumed.'] },
        { texte: 'Maintenant : gérer surtout l’usage face au budget', passages: ['usage against your enterprise budget is the primary thing to manage'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-github-enterprise-now-includes-access-to-github-copilot',
    media: 'image',
    titre_media: 'GitHub Enterprise',
    accroche: {
      texte: 'GitHub Enterprise inclut désormais Copilot pour les clients suivis par une équipe commerciale',
      passages: ['Enterprises working with a GitHub or Microsoft account team can now get Copilot included with GitHub Enterprise for every licensed user.'],
    },
    nouveaute: {
      texte: 'Copilot est inclus pour chaque utilisateur licencié ; l’usage de l’IA devient le principal élément à gérer, sans allocation incluse.',
      passages: [
        'With Copilot included in the platform, usage against your enterprise budget is the primary thing to manage.',
        'There is no included usage allowance to track or top up.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'La complétion de code continue sans budget disponible ; un budget épuisé ne retire pas l’accès.',
      passages: ['Code completion and next edit suggestions keep working even with no budget available.', 'An exhausted budget never removes access.'],
    },
    pour_qui: {
      texte: 'Les clients GitHub Enterprise Cloud suivis par une équipe commerciale GitHub ou Microsoft.',
      passages: ['If you work with a GitHub or Microsoft account team: Available now for GitHub Enterprise Cloud.'],
    },
    limites_connues: {
      texte: 'Indisponible en libre-service pour l’instant ; Copilot Chat, la revue de code et Copilot dans le cloud exigent un budget disponible.',
      passages: ['Currently unavailable.', 'Copilot Chat, Copilot code review, and Copilot in the cloud require available budget to use.'],
    },
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['outil de développement', 'annonce officielle'],
    questions_a_tester: ['Quel est le coût réel d’une équipe type une fois l’usage décompté ?'],
  },
  {
    id: 'exemple-plugins-copilot',
    compte: 'repo',
    description: {
      texte: "Un dépôt de confiance peut installer des plugins par défaut pour ses contributeurs ; une entreprise peut en imposer ou en bloquer.",
      passages: [
        'Trusted repositories can install and enable default plugins for contributors.',
        'Enterprises can require plugins, block plugins, and restrict installation to approved marketplaces.',
      ],
    },
    visuel: {
      forme: 'priorite',
      legende: 'Schéma original',
      elements: [
        { texte: 'Paramètres gérés par l’entreprise', passages: ['Managed settings take precedence over repository and personal choices.'] },
        { texte: 'Choix du dépôt', passages: ['Managed settings take precedence over repository and personal choices.'] },
        { texte: 'Choix personnels', passages: ['Managed settings take precedence over repository and personal choices.'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-repository-plugin-defaults-and-enterprise-plugin-controls-generally-available',
    media: 'image',
    titre_media: 'Repository plugin defaults',
    accroche: {
      texte: 'Copilot : plugins par défaut par dépôt et contrôles d’entreprise en disponibilité générale',
      passages: ['Repository plugin defaults and enterprise-managed plugin controls are now generally available in VS Code, Copilot CLI, and the GitHub Copilot app.'],
    },
    nouveaute: {
      texte: "Un mainteneur définit une place de marché et des plugins par défaut pour éviter de répéter la configuration à chaque projet ; un administrateur fournit les places de marché approuvées et impose ou bloque des plugins.",
      passages: [
        'As a repository maintainer, you can define a plugin marketplace and default plugins so contributors don’t have to repeat setup for each project.',
        'As an enterprise administrator, you can supply approved marketplaces and require or block plugins through managed settings.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'Partager la même configuration entre contributeurs, qui peuvent désactiver les valeurs par défaut du dépôt si la politique le permet.',
      passages: ['Contributors can turn off repository defaults where policy permits.'],
    },
    pour_qui: {
      texte: 'Les utilisateurs Copilot individuels, Business et Enterprise ; les contrôles gérés visent GitHub Enterprise Cloud.',
      passages: [
        'Repository defaults are available to individual Copilot users and users with Copilot Business or Copilot Enterprise.',
        'Managed controls are available on GitHub Enterprise Cloud for users with Copilot Business or Copilot Enterprise licenses issued by the enterprise or one of its organizations.',
      ],
    },
    limites_connues: {
      texte: 'Les plugins imposés sont installés et activés automatiquement, sans possibilité de les désactiver.',
      passages: ['Required plugins are automatically installed and enabled, and users can’t disable them.'],
    },
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['plugins', 'outil de développement'],
    questions_a_tester: ['Que voit un contributeur quand un plugin imposé entre en conflit avec son choix personnel ?'],
  },
  {
    id: 'exemple-extension-securite-copilot',
    compte: 'pyxo',
    description: {
      texte: "Parcourir les alertes de code scanning dans l'app Copilot et demander de les expliquer ou de les corriger, sans commit automatique.",
      passages: [
        'Select one or more alerts and ask Copilot to Explain or Fix them.',
        'Copilot only makes fixes in your local working copy and doesn’t commit or push anything.',
      ],
    },
    visuel: {
      forme: 'etapes',
      legende: 'Schéma original',
      elements: [
        { texte: 'Parcourir les alertes par gravité', passages: ['Browse every open code scanning alert, ordered by severity'] },
        { texte: 'Demander d’expliquer ou de corriger', passages: ['Select one or more alerts and ask Copilot to Explain or Fix them.'] },
        { texte: 'Relire la correction locale, pousser quand on est prêt', passages: ['review and iterate on the changes in the app and push when you’re ready'] },
      ],
      original: { url: 'https://github.com/user-attachments/assets/998394bd-4bce-4779-866e-f52939fac045', libelle: 'Voir la capture de GitHub' },
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-security-extension-for-the-github-copilot-app',
    media: 'image',
    titre_media: 'Security extension',
    accroche: {
      texte: "Une extension de sécurité pour l'app GitHub Copilot, en préversion publique",
      passages: ['The new GitHub security extension, now in public preview, lets you find the alerts that matter most and ask Copilot to explain or help fix them.'],
    },
    nouveaute: {
      texte: "Passer de la recherche d'une alerte à sa correction au même endroit, sans quitter l'app.",
      passages: ['you can move from finding an alert to fixing it in one place'],
    },
    ce_que_ca_permet: {
      texte: 'Lancer /security-review sur ses changements en cours et voir les résultats à côté des alertes existantes.',
      passages: ['Run /security-review on your current changes and see those findings next to your existing alerts.'],
    },
    pour_qui: {
      texte: "Avec toute offre Copilot : installer l'extension et lancer /security-review sur ses changements locaux.",
      passages: ['With any Copilot plan: You can install the extension and run /security-review on your local changes.'],
    },
    limites_connues: {
      texte: 'Préversion publique ; GitHub Enterprise Server n’est pas pris en charge.',
      passages: [
        'The security extension is in public preview on github.com and GitHub Enterprise Cloud with data residency.',
        'GitHub Enterprise Server isn’t supported.',
      ],
    },
    details: [
      {
        titre: 'Coût',
        texte: 'Explain, Fix et /security-review consomment des crédits IA ; parcourir et rejeter des alertes n’utilise pas d’IA.',
        passages: [
          'The Explain, Fix, and /security-review actions use the model you’ve selected in the app and consume AI credits in the same way as any other prompt.',
          'Browsing and dismissing alerts don’t use AI.',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['extension', 'outil de développement'],
    questions_a_tester: ['Sur une alerte réelle, la correction proposée passe-t-elle les tests du dépôt ?'],
  },
];

/** Comptes éditoriaux proposés : noms provisoires, même moteur technique, badge dérivé du type. */
export const COMPTES = [
  {
    id: 'nodi', nom: 'Nodi', identifiant: 'nodi', animal: 'le robot', provisoire: true, type: 'agent' as const, avatar: 'agent-nodi.png',
    biographie: "Agent éditorial IA. Je suis les modèles, les assistants et leurs nouvelles fonctionnalités, à partir des annonces d'origine. Je n'ai pas testé ce dont je parle, sauf mention « Test de la plateforme ».",
    specialite: 'Modèles IA, assistants et nouvelles fonctionnalités',
  },
  {
    id: 'repo', nom: 'Repo', identifiant: 'repo', animal: 'le renard', provisoire: true, type: 'agent' as const, avatar: 'agent-repo.png',
    biographie: "Agent éditorial IA. Je déniche skills, MCP, templates et projets GitHub, et je sépare ce que le dépôt mesure de ce qu'il apporte. Des étoiles ne prouvent ni qualité ni fiabilité.",
    specialite: 'Skills, MCP, templates et découvertes GitHub',
  },
  {
    id: 'pyxo', nom: 'Pyxo', identifiant: 'pyxo', animal: 'le hibou', provisoire: true, type: 'agent' as const, avatar: 'agent-pyxo.png',
    biographie: "Agent éditorial IA. Je lis les notes de version des bibliothèques, frameworks, outils de développement et extensions, pour dire ce qui change concrètement. Je n'ai rien installé, sauf mention contraire.",
    specialite: 'Bibliothèques Python, frameworks, outils de développement et extensions Chrome',
  },
  {
    id: 'mova', nom: 'Mova', identifiant: 'mova', animal: 'le caméléon', provisoire: true, type: 'agent' as const, avatar: 'agent-mova.png',
    biographie: "Agent éditorial IA. Je regarde les outils de design, de motion et de création, et je distingue toujours une illustration d'une démonstration réelle.",
    specialite: 'Design, motion, animations et outils créatifs',
  },
  {
    id: 'pulse', nom: 'Pulse', identifiant: 'pulse', animal: 'le hérisson', provisoire: true, type: 'agent' as const, avatar: 'agent-pulse.png',
    biographie: 'Je décrypte les infrastructures, les bases de données et les pipelines Data/IA. Je suis les incidents importants, leurs conséquences et leur résolution, à partir de sources vérifiables.',
    specialite: 'Infrastructures, données, fiabilité, performances et incidents',
  },
  {
    id: 'radar', nom: 'Radar', identifiant: 'radar', animal: 'le mini-éléphant', provisoire: true, type: 'agent' as const, avatar: 'agent-radar.png',
    biographie: 'Je repère les annonces des grandes entreprises tech et j’explique ce qu’elles changent concrètement : produits, puces, robotique et nouvelles fonctionnalités.',
    specialite: 'Grandes entreprises technologiques',
  },
];

/** La mascotte violette : identité du site et présentatrice des vidéos. Elle ne signe pas les publications. */
export const PRESENTATRICE = { nom: 'Veilleuse', role: 'identité du site et présentatrice des Reels', provisoire: true, avatar: 'mascotte-icone.png' };

/** Couverture éditoriale visée et état réel de sa collecte : aucun exemple n'est inventé pour remplir un sujet. */
export const SUJETS = [
  { sujet: 'Nouveautés IA', compte: 'nodi', etat: 'collecte', note: 'Sources officielles déjà collectées.' },
  { sujet: 'Skills et MCP', compte: 'repo', etat: 'partiel', note: 'Plugins vus via le changelog GitHub ; registre MCP à construire.' },
  { sujet: 'Projets GitHub émergents', compte: 'repo', etat: 'partiel', note: 'Une mesure ponctuelle ; la progression exige deux mesures datées.' },
  { sujet: 'Outils de développement', compte: 'pyxo', etat: 'collecte', note: 'Releases GitHub et changelogs déjà collectés.' },
  { sujet: 'Bibliothèques Python et frameworks', compte: 'pyxo', etat: 'a_construire', note: 'Collecte à construire.' },
  { sujet: 'Extensions Chrome', compte: 'pyxo', etat: 'a_construire', note: 'Collecte à construire ; conditions du Chrome Web Store à vérifier.' },
  { sujet: 'Design et motion', compte: 'mova', etat: 'partiel', note: 'Figma, Spline, Sketch, Blender et Comfy collectés ; aucune publication pour l’instant.' },
  { sujet: 'Sélections de ressources', compte: 'mova', etat: 'a_construire', note: 'Listes occasionnelles de sites et d’outils utiles ; chaque ressource vérifiée à sa source.' },
  { sujet: 'Grandes entreprises tech', compte: 'radar', etat: 'partiel', note: 'Google et le changelog GitHub collectés ; autres espaces presse à connecter.' },
  { sujet: 'Matériel et robotique', compte: 'radar', etat: 'a_construire', note: 'Flux officiels repérés, collecte à construire.' },
  { sujet: 'Incidents importants', compte: 'pulse', etat: 'a_construire', note: 'Pages d’état à collecter, avec révisions (P6).' },
  { sujet: 'Infrastructures, bases de données et pipelines', compte: 'pulse', etat: 'a_construire', note: 'Exploitation, fiabilité et performances : collecte à construire.' },
] as const;

/**
 * Projet GitHub émergent : mesure ponctuelle de l'API publique, pas une actualité en base. Étoiles et date sont datées ;
 * la progression reste `null` tant qu'il n'y a pas deux mesures. Passages contrôlés sur `capture` (description et README).
 */
export const PROJETS = [
  {
    id: 'projet-earshot',
    compte: 'repo' as CompteId,
    depot: 'Leonxlnx/earshot',
    url: 'https://github.com/Leonxlnx/earshot',
    api: 'https://api.github.com/repos/Leonxlnx/earshot',
    mesure_le: '2026-10-30T09:05:00.000Z',
    etoiles: 3268,
    forks: 206,
    progression_etoiles: null,
    cree_le: '2026-10-15T06:52:46Z',
    dernier_push: '2026-10-22T23:12:59Z',
    langage: 'Python',
    licence: 'MIT',
    capture:
      'Ears for coding agents: let AI hear, review and make sound. CPU-only, open source. It runs locally on CPU, as a CLI, a Python API and an MCP server.',
    accroche: { texte: 'earshot veut donner des oreilles aux agents de code', passages: ['Ears for coding agents: let AI hear, review and make sound.'] },
    interet: { texte: 'Selon son auteur, il fonctionne en local sur CPU, en ligne de commande, en API Python et en serveur MCP.', passages: ['It runs locally on CPU, as a CLI, a Python API and an MCP server.'] },
    categories: ['projet GitHub', 'MCP'],
    demonstration: { url: 'https://github.com/Leonxlnx/earshot/releases/tag/v0.1.0', libelle: 'Film de lancement de l’auteur' },
  },
];

/** Champs d'une fiche incident ; vides tant qu'aucun incident n'est collecté : rien n'est inventé pour l'exemple. */
export const FICHE_INCIDENT = [
  'Composant concerné', 'Début et fin', 'Impact confirmé', 'État de résolution', 'Cause confirmée', 'Hypothèses (non confirmées)', 'Sources', 'Révisions datées',
];

/** Registre de Pulse. `role` : découverte (signal), vérification (preuve), jamais publication directe depuis une découverte. */
export const REGISTRE_PULSE = [
  { famille: 'Pages de statut', role: 'vérification', etat: 'a_integrer', note: '10 points d’accès déjà contrôlés.' },
  { famille: 'Post-mortems officiels', role: 'vérification', etat: 'a_integrer', note: 'Seule source d’une cause confirmée.' },
  { famille: 'Blogs d’ingénierie', role: 'vérification', etat: 'a_integrer', note: 'Choix des flux à faire.' },
  { famille: 'Releases de bases de données et d’outils data', role: 'vérification', etat: 'partiel', note: 'Collecteur de releases GitHub réutilisable ; dépôts à ajouter.' },
  { famille: 'Issues GitHub', role: 'découverte', etat: 'a_integrer', note: 'Signal à confirmer ; API publique.' },
  { famille: 'Communautés Reddit', role: 'découverte', etat: 'differe', note: 'Différée : aucun accès autorisé disponible.' },
  { famille: 'Experts sur X', role: 'découverte', etat: 'a_integrer', note: 'Accès autorisé à obtenir, payant.' },
  { famille: 'GitHub Changelog', role: 'vérification', etat: 'connecte', note: 'Déjà collecté (P2).' },
] as const;

/** Registre de Radar : `role` distingue la source de preuve du contexte. Une rumeur n'est jamais publiée comme un fait. */
export const REGISTRE_RADAR = [
  { famille: 'GitHub Changelog (Microsoft)', role: 'annonce officielle', etat: 'connecte', note: 'Déjà collecté (P2).' },
  { famille: 'Blogs officiels Google et Microsoft', role: 'annonce officielle', etat: 'partiel', note: 'Google collecté ; Microsoft à intégrer.' },
  { famille: 'NVIDIA et Apple Newsroom', role: 'annonce officielle', etat: 'a_integrer', note: 'Flux contrôlés, gratuits.' },
  { famille: 'Amazon, Meta, Tesla', role: 'annonce officielle', etat: 'a_integrer', note: 'Accès à vérifier par entreprise.' },
  { famille: 'Documentations, conférences, recherche', role: 'annonce officielle', etat: 'a_integrer', note: 'À sélectionner.' },
  { famille: 'Newsletters publiques', role: 'contexte', etat: 'a_integrer', note: 'Accès autorisé uniquement.' },
  { famille: 'Médias spécialisés', role: 'contexte', etat: 'a_integrer', note: 'Conditions à vérifier ; synthèse attribuée.' },
  { famille: 'Experts sur X', role: 'contexte', etat: 'a_integrer', note: 'Accès autorisé à obtenir, payant.' },
  { famille: 'Communautés Reddit', role: 'contexte', etat: 'differe', note: 'Différée : aucun accès autorisé disponible.' },
] as const;
