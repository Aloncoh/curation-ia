// Exemples de publications pour la maquette (P2, vision sociale du 2026-10-30), en anglais depuis le 2026-11-03 (SPEC §7.13).
// Rédigés par Claude Code — PAS par l'agent du site, qui n'existe pas encore (P3) — à partir de captures réelles.
// Chaque champ factuel cite au moins un passage copié tel quel de la capture ; `npm run maquette` et les tests vérifient
// que chaque passage se retrouve mot pour mot dans le texte brut de la capture (espaces normalisés).
// Ils montrent le format visé ; ce ne sont pas des publications et ils sont étiquetés « Exemple » partout.

/** Champ factuel : un texte en anglais et les passages de la source qui le soutiennent (langue originale). */
export interface ChampCite {
  texte: string;
  passages: string[];
}

/**
 * Libellés possibles d'un détail (affichés aussi sur les diapositives et dans le Reel). Ils ne sont pas cités : ils nomment
 * le sujet sans rien affirmer. Liste fermée, pour qu'un libellé nouveau soit relu avant d'être utilisé.
 */
export const LIBELLES_DETAILS = [
  'Also in this release',
  'Cost',
  'Administration',
  'WebFetch errors',
  'Single model, cascade or critique',
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
      texte: "You pick the effort level, Copilot picks the models. Each model it uses is billed at its standard rate.",
      passages: [
        'For each prompt, Copilot Fusion determines which models to use and how they work together, while you choose the right level of effort.',
        'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
      ],
    },
    visuel: {
      forme: 'etapes',
      legende: 'Schéma original',
      elements: [
        { texte: 'Single: one model handles the task', passages: ['Single: One model solves the task directly.'] },
        { texte: 'Cascade: a cheaper model drafts, a check decides whether to move up to a stronger one', passages: ['Cascade: An efficient model drafts a response. A quality check determines whether to accept it or escalate to a stronger model.'] },
        { texte: 'Critique: one model drafts, another reviews, the first one revises', passages: ['Critique: One model drafts an initial response, another model reviews it, and the original model revises.'] },
      ],
      original: { url: 'https://github.com/user-attachments/assets/1eeffdb5-0c21-4697-8007-bb6df0e70e8b', libelle: 'Voir le schéma de GitHub' },
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion',
    media: 'carrousel',
    titre_media: 'Copilot Fusion',
    accroche: {
      texte: 'Copilot Fusion is generally available: for every request, Copilot picks the models and, when needed, makes them work together',
      passages: [
        'GitHub Copilot Fusion is generally available.',
        'For each prompt, Copilot Fusion determines which models to use and how they work together',
        'orchestrating multiple models through the following workflows when needed',
      ],
    },
    nouveaute: {
      texte:
        "Rather than choosing a model for every task, you let Copilot Fusion decide, request by request, which models to use and how to combine them; the user sets the effort level: Standard, High or Max.",
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
        "According to GitHub, no more switching models mid-task; on the admin side, you choose which models can be used and, through Enterprise managed settings, can make Copilot Fusion the default model.",
      passages: [
        'There’s no need to switch models during a task or decide which model suits each step.',
        'Administrators control which models Copilot Fusion can use and whether Copilot Fusion is the default.',
        'Administrators can set Copilot Fusion, at any effort level, as the default model for Copilot users with Enterprise managed settings',
      ],
    },
    pour_qui: {
      texte: "Copilot users on every plan, in VS Code, the GitHub Copilot app, Copilot CLI and JetBrains IDEs.",
      passages: [
        'Copilot Fusion is available on all Copilot plans in Visual Studio Code, the GitHub Copilot app, GitHub Copilot CLI, and JetBrains IDEs.',
      ],
    },
    limites_connues: {
      texte:
        "Other clients aren’t supported yet (announced as “coming soon”, with no date); each model used is billed at its standard rate.",
      passages: [
        'Support for additional clients is coming soon.',
        'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
      ],
    },
    details: [
      {
        titre: 'Single model, cascade or critique',
        texte:
          "Depending on the task: a single model handles it directly; or, in cascade mode, a cheaper model drafts and a quality check decides whether to keep the answer or move up to a stronger model; or, in critique mode, one model drafts, another reviews, then the first one revises.",
        passages: [
          'orchestrating multiple models through the following workflows when needed',
          'Single: One model solves the task directly.',
          'Cascade: An efficient model drafts a response. A quality check determines whether to accept it or escalate to a stronger model.',
          'Critique: One model drafts an initial response, another model reviews it, and the original model revises.',
        ],
      },
      {
        titre: 'Cost',
        texte:
          'Each model used is billed at its standard rate; for a limited time, paid plans get a 30% discount on model costs.',
        passages: [
          'When you use Copilot Fusion you’re billed for each model it uses, at each model’s standard rate.',
          'For a limited time, users on paid Copilot plans will receive a 30% discount on model costs when using Copilot Fusion.',
        ],
      },
    ],
    attributions: [
      {
        type: 'benchmark',
        auteur: 'GitHub, in its 28 October 2026 announcement',
        texte:
          "According to GitHub, Copilot Fusion Max scores 60 on the Artificial Analysis Coding Agent Index, at most two points behind Claude Code with Opus 5.5 Max, for roughly half the average API cost per task. Score announced by GitHub; the announcement doesn’t say who ran the evaluation or under what conditions; not measured by the platform.",
        passages: [
          'In the Artificial Analysis Coding Agent Index, Copilot Fusion Max scored 60, within two points of Claude Code with Opus 5.5 Max.',
          'It delivered that result at about half the average API cost per task',
        ],
      },
      {
        type: 'temoignage',
        auteur: 'Hari Pokhrel, Principal Software Engineer, AT&T — quoted by GitHub',
        texte:
          "Testimonial reported by the vendor: at AT&T, Copilot Fusion Standard reportedly made token use more efficient by picking a suitable model for each task on its own. An attributed experience, not a general conclusion.",
        passages: [
          'GitHub Copilot Fusion Standard has improved token efficiency across AT&T by automatically selecting the right model for the task',
          'Hari Pokhrel, Principal Software Engineer, AT&T',
        ],
      },
    ],
    diapositives: ['accroche', 'nouveaute', 'details:0', 'pour_qui', 'limites_connues'],
    categories: ['outil de développement', 'modèles'],
    questions_a_tester: [
      "On the same task, which models does Copilot Fusion pick at each effort level?",
      "Can the user see what a task actually costs?",
    ],
  },
  {
    id: 'exemple-claude-code-2-1-312',
    compte: 'nodi',
    description: {
      texte: "When Claude has only seen the beginning of a very large instructions file, Write now asks it to read the whole file or edit in place.",
      passages: ['after seeing only its start; Write now asks Claude to read it all or edit in place'],
    },
    visuel: {
      forme: 'avant_apres',
      legende: 'Schéma original',
      elements: [
        { texte: 'Before: rewritten after reading just the beginning', passages: ['Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start'] },
        { texte: 'Now: Write asks to read everything or edit in place', passages: ['Write now asks Claude to read it all or edit in place'] },
      ],
    },
    source_id: 'github-releases:anthropics/claude-code',
    url: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.312',
    media: 'carrousel',
    titre_media: '2.1.312',
    accroche: {
      texte: "Claude Code 2.1.312 stops a huge subdirectory CLAUDE.md from being rewritten when only its beginning was read",
      passages: [
        'Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start',
      ],
    },
    nouveaute: {
      texte:
        "When Claude is about to rewrite a huge CLAUDE.md, rules file or file pulled in with @ inside a subdirectory, having seen only its first part, the Write tool now asks it to read everything or edit in place.",
      passages: [
        'Fixed Claude overwriting a very large CLAUDE.md, rules file or @-included file in a subdirectory after seeing only its start; Write now asks Claude to read it all or edit in place',
      ],
    },
    ce_que_ca_permet: {
      texte: "Prevents a long instructions file stored in a subdirectory from being rewritten when only its beginning was read.",
      passages: [
        'a very large CLAUDE.md, rules file or @-included file in a subdirectory',
        'after seeing only its start; Write now asks Claude to read it all or edit in place',
      ],
    },
    pour_qui: {
      texte: "Claude Code users who keep long instructions files in the subdirectories of their projects.",
      passages: ['a very large CLAUDE.md, rules file or @-included file in a subdirectory'],
    },
    limites_connues: null,
    details: [
      {
        titre: 'Also in this release',
        texte:
          "In fullscreen, clicking the “to send now” hint below a queued message sends it immediately, just like the matching key.",
        passages: ['Added click to send: in fullscreen, clicking the "to send now" hint under a queued message sends it right away, as its key does'],
      },
      {
        titre: 'WebFetch errors',
        texte:
          "In cloud sessions, when a host doesn’t resolve, the WebFetch error explains it may be outside the allowed network domains, so Claude can tell you which host to allow.",
        passages: [
          'Improved WebFetch errors in cloud sessions: a host that does not resolve is now explained as possibly outside the allowed network domains, so Claude names the host to allow',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche', 'nouveaute', 'pour_qui', 'limites_connues'],
    categories: ['assistant de code'],
    questions_a_tester: ["With a CLAUDE.md several thousand lines long in a subdirectory, does Claude read all of it before editing?"],
  },
  {
    id: 'exemple-codex-cli-0-166-0',
    compte: 'pyxo',
    description: {
      texte: 'A command to diagnose configuration, connectivity and WebSockets.',
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
      texte: 'Codex CLI 0.166.0 adds codex doctor --network-only to diagnose configuration, connectivity and WebSockets',
      passages: ['Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.'],
    },
    nouveaute: {
      texte:
        'A targeted check of configuration, connectivity and WebSockets, plus GPT-6.1 Terra in the built-in model catalog and in the Vertex AI and Amazon Bedrock ones.',
      passages: [
        'Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.',
        'Added GPT-6.1 Terra to the bundled, Vertex AI, and Amazon Bedrock model catalogs.',
      ],
    },
    ce_que_ca_permet: {
      texte:
        'Run a targeted configuration, connectivity and WebSocket check with codex doctor --network-only; select transcript text from the keyboard, by word, line or page, with built-in search.',
      passages: [
        'Added codex doctor --network-only for focused configuration, connectivity, and WebSocket diagnostics.',
        'Added keyboard-driven transcript selection with word, line, and page motions, integrated search, and configurable shortcuts.',
      ],
    },
    pour_qui: null,
    limites_connues: null,
    details: [
      {
        titre: 'Also in this release',
        texte: "codex queue --resume picks up unloaded threads after a message has been queued.",
        passages: ['Added codex queue --resume to resume unloaded threads after queueing a message.'],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['assistant de code'],
    questions_a_tester: ["What exactly does codex doctor --network-only check behind a corporate proxy?"],
  },
  {
    id: 'exemple-copilot-images',
    compte: 'mova',
    description: {
      texte: "Describe the image in chat; a preview appears and the image is saved to the project. Visible watermark off by default.",
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
        { texte: 'Describe the image in chat', passages: ['Describe an image conversationally in any Copilot chat session'] },
        { texte: 'The model calls GPT Image 2.5 Flare', passages: ['your selected reasoning model calls a dedicated image-generation tool powered by GPT Image 2.5 Flare'] },
        { texte: 'Preview in the conversation, image saved to the project', passages: ['previews the result inline, and saves it to your project.'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-generate-and-edit-images-directly-in-copilot',
    media: 'image',
    titre_media: 'Copilot',
    accroche: {
      texte: 'GitHub Copilot creates and edits images from chat, in public preview',
      passages: [
        'You can now generate and edit images using natural language in GitHub Copilot.',
        'Describe an image conversationally in any Copilot chat session',
        'Image generation is in public preview',
      ],
    },
    nouveaute: {
      texte:
        "The chosen reasoning model calls a dedicated image-generation tool (GPT Image 2.5 Flare), shows a preview in the conversation and saves the image to the project.",
      passages: [
        'your selected reasoning model calls a dedicated image-generation tool powered by GPT Image 2.5 Flare, previews the result inline, and saves it to your project.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'According to GitHub, you get a visual without leaving your coding session or switching to a separate tool.',
      passages: [
        'Previously, getting a visual asset while working in Copilot meant stepping away to a separate tool',
        'This update removes that context switch, so you can go from an idea to a usable image without breaking your flow.',
      ],
    },
    pour_qui: {
      texte: "Copilot Pro, Pro+, Business and Enterprise subscribers; to try it, a Copilot chat in VS Code, the GitHub Copilot app or Copilot CLI.",
      passages: [
        'Image generation is in public preview for Copilot Pro, Copilot Pro+, Copilot Business, and Copilot Enterprise.',
        'To try it, open a Copilot chat in VS Code, the GitHub Copilot app, or Copilot CLI',
      ],
    },
    limites_connues: {
      texte:
        "Public preview; the visible “Made with AI” watermark is optional and off by default; billed separately, in image tokens counted against the plan’s AI credits.",
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
        texte: "Organization and enterprise owners can switch image generation off in Copilot’s model policies.",
        passages: [
          'Organization and enterprise owners can turn off image generation by disabling the image generation model using Copilot model policies.',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['outil de développement', 'design'],
    questions_a_tester: ["Does a generated image keep any trace of its AI origin when the watermark is off?"],
  },
  {
    id: 'exemple-gemini-4-carbon',
    compte: 'radar',
    description: {
      texte: 'Google presents it as its next frontier model. The collected feed gives no details: check the source for availability and limits.',
      passages: ['Gemini 4 Carbon: our next frontier model'],
    },
    visuel: {
      forme: 'photo',
      legende: 'Photo de presse, sans rapport direct avec le produit',
      elements: [{ texte: 'Google introduces Gemini 4 Carbon', passages: ['Gemini 4 Carbon: our next frontier model'] }],
      photo: {
        fichier: 'google-campus.jpg',
        alt: 'View of the Googleplex campus',
        credit: 'Source: Google.',
        conditions: 'https://blog.google/image-library/',
        verifie_le: '2026-10-30',
      },
    },
    source_id: 'feed:google-gemini',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon',
    media: 'image',
    titre_media: 'Gemini 4 Carbon',
    accroche: { texte: 'Google introduces Gemini 4 Carbon, its next frontier model', passages: ['Gemini 4 Carbon: our next frontier model'] },
    nouveaute: { texte: 'A new frontier model announced by Google.', passages: ['Gemini 4 Carbon: our next frontier model'] },
    ce_que_ca_permet: null,
    pour_qui: null,
    limites_connues: null,
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['grandes entreprises', 'annonce officielle'],
    questions_a_tester: ['When, and for whom, is Gemini 4 Carbon available?'],
  },
  {
    id: 'exemple-github-enterprise-copilot',
    compte: 'pyxo',
    description: {
      texte: 'For customers working with an account team: Copilot included for every licensed user, usage counted against the budget from the first request.',
      passages: [
        'Enterprises working with a GitHub or Microsoft account team can now get Copilot included with GitHub Enterprise for every licensed user.',
        'AI usage is metered from the first request against your enterprise budget',
      ],
    },
    visuel: {
      forme: 'avant_apres',
      legende: 'Schéma original',
      elements: [
        { texte: 'Before: manage Copilot seats and AI usage', passages: ['Previously, you had to manage two things: how many Copilot seats you were paying for and how much AI usage those users consumed.'] },
        { texte: 'Now: mostly manage usage against the budget', passages: ['usage against your enterprise budget is the primary thing to manage'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-github-enterprise-now-includes-access-to-github-copilot',
    media: 'image',
    titre_media: 'GitHub Enterprise',
    accroche: {
      texte: 'GitHub Enterprise now includes Copilot for customers working with an account team',
      passages: ['Enterprises working with a GitHub or Microsoft account team can now get Copilot included with GitHub Enterprise for every licensed user.'],
    },
    nouveaute: {
      texte: 'Copilot is included for every licensed user; AI usage becomes the main thing to manage, with no included allowance.',
      passages: [
        'With Copilot included in the platform, usage against your enterprise budget is the primary thing to manage.',
        'There is no included usage allowance to track or top up.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'Code completion keeps working with no budget left; an exhausted budget doesn’t remove access.',
      passages: ['Code completion and next edit suggestions keep working even with no budget available.', 'An exhausted budget never removes access.'],
    },
    pour_qui: {
      texte: 'GitHub Enterprise Cloud customers working with a GitHub or Microsoft account team.',
      passages: ['If you work with a GitHub or Microsoft account team: Available now for GitHub Enterprise Cloud.'],
    },
    limites_connues: {
      texte: 'Not available as self-service for now; Copilot Chat, code review and Copilot in the cloud need available budget.',
      passages: ['Currently unavailable.', 'Copilot Chat, Copilot code review, and Copilot in the cloud require available budget to use.'],
    },
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['outil de développement', 'annonce officielle'],
    questions_a_tester: ['What does a typical team actually pay once usage is counted?'],
  },
  {
    id: 'exemple-plugins-copilot',
    compte: 'repo',
    description: {
      texte: "A trusted repository can install default plugins for its contributors; an enterprise can require or block plugins.",
      passages: [
        'Trusted repositories can install and enable default plugins for contributors.',
        'Enterprises can require plugins, block plugins, and restrict installation to approved marketplaces.',
      ],
    },
    visuel: {
      forme: 'priorite',
      legende: 'Schéma original',
      elements: [
        { texte: 'Enterprise managed settings', passages: ['Managed settings take precedence over repository and personal choices.'] },
        { texte: 'Repository choices', passages: ['Managed settings take precedence over repository and personal choices.'] },
        { texte: 'Personal choices', passages: ['Managed settings take precedence over repository and personal choices.'] },
      ],
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-repository-plugin-defaults-and-enterprise-plugin-controls-generally-available',
    media: 'image',
    titre_media: 'Repository plugin defaults',
    accroche: {
      texte: 'Copilot: per-repository default plugins and enterprise controls are generally available',
      passages: ['Repository plugin defaults and enterprise-managed plugin controls are now generally available in VS Code, Copilot CLI, and the GitHub Copilot app.'],
    },
    nouveaute: {
      texte: "A maintainer sets up a marketplace and default plugins so setup isn’t repeated for every project; an administrator supplies approved marketplaces and requires or blocks plugins.",
      passages: [
        'As a repository maintainer, you can define a plugin marketplace and default plugins so contributors don’t have to repeat setup for each project.',
        'As an enterprise administrator, you can supply approved marketplaces and require or block plugins through managed settings.',
      ],
    },
    ce_que_ca_permet: {
      texte: 'Share one setup across contributors, who can turn off the repository defaults if policy allows.',
      passages: ['Contributors can turn off repository defaults where policy permits.'],
    },
    pour_qui: {
      texte: 'Individual, Business and Enterprise Copilot users; managed controls target GitHub Enterprise Cloud.',
      passages: [
        'Repository defaults are available to individual Copilot users and users with Copilot Business or Copilot Enterprise.',
        'Managed controls are available on GitHub Enterprise Cloud for users with Copilot Business or Copilot Enterprise licenses issued by the enterprise or one of its organizations.',
      ],
    },
    limites_connues: {
      texte: 'Required plugins are installed and enabled automatically, and can’t be turned off.',
      passages: ['Required plugins are automatically installed and enabled, and users can’t disable them.'],
    },
    details: [],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['plugins', 'outil de développement'],
    questions_a_tester: ['What does a contributor see when a required plugin conflicts with their personal choice?'],
  },
  {
    id: 'exemple-extension-securite-copilot',
    compte: 'pyxo',
    description: {
      texte: "Browse code scanning alerts in the Copilot app and ask for an explanation or a fix, with no automatic commit.",
      passages: [
        'Select one or more alerts and ask Copilot to Explain or Fix them.',
        'Copilot only makes fixes in your local working copy and doesn’t commit or push anything.',
      ],
    },
    visuel: {
      forme: 'etapes',
      legende: 'Schéma original',
      elements: [
        { texte: 'Browse alerts by severity', passages: ['Browse every open code scanning alert, ordered by severity'] },
        { texte: 'Ask for an explanation or a fix', passages: ['Select one or more alerts and ask Copilot to Explain or Fix them.'] },
        { texte: 'Review the local fix, push when ready', passages: ['review and iterate on the changes in the app and push when you’re ready'] },
      ],
      original: { url: 'https://github.com/user-attachments/assets/998394bd-4bce-4779-866e-f52939fac045', libelle: 'Voir la capture de GitHub' },
    },
    source_id: 'feed:github-changelog',
    url: 'https://github.blog/changelog/2026-10-28-security-extension-for-the-github-copilot-app',
    media: 'image',
    titre_media: 'Security extension',
    accroche: {
      texte: "A security extension for the GitHub Copilot app, in public preview",
      passages: ['The new GitHub security extension, now in public preview, lets you find the alerts that matter most and ask Copilot to explain or help fix them.'],
    },
    nouveaute: {
      texte: "Go from finding an alert to fixing it in one place, without leaving the app.",
      passages: ['you can move from finding an alert to fixing it in one place'],
    },
    ce_que_ca_permet: {
      texte: 'Check your in-progress changes with /security-review and see the results next to the alerts already open.',
      passages: ['Run /security-review on your current changes and see those findings next to your existing alerts.'],
    },
    pour_qui: {
      texte: "Any Copilot plan can install the extension and use /security-review on local changes.",
      passages: ['With any Copilot plan: You can install the extension and run /security-review on your local changes.'],
    },
    limites_connues: {
      texte: 'Public preview; GitHub Enterprise Server isn’t supported.',
      passages: [
        'The security extension is in public preview on github.com and GitHub Enterprise Cloud with data residency.',
        'GitHub Enterprise Server isn’t supported.',
      ],
    },
    details: [
      {
        titre: 'Cost',
        texte: 'Explain, Fix and /security-review use AI credits; browsing and dismissing alerts doesn’t use AI.',
        passages: [
          'The Explain, Fix, and /security-review actions use the model you’ve selected in the app and consume AI credits in the same way as any other prompt.',
          'Browsing and dismissing alerts don’t use AI.',
        ],
      },
    ],
    attributions: [],
    diapositives: ['accroche'],
    categories: ['extension', 'outil de développement'],
    questions_a_tester: ['On a real alert, does the suggested fix pass the repository’s tests?'],
  },
];

/** Comptes éditoriaux proposés : noms provisoires, même moteur technique, badge dérivé du type. */
export const COMPTES = [
  {
    id: 'nodi', nom: 'Nodi', identifiant: 'nodi', animal: 'le robot', provisoire: true, type: 'agent' as const, avatar: 'agent-nodi.png',
    biographie: "Agent éditorial IA. Je suis les modèles, les assistants et leurs nouvelles fonctionnalités, à partir des annonces d'origine et des vidéos d'AI Search, que je cite toujours. Je n'ai pas testé ce dont je parle, sauf mention « Test de la plateforme ».",
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
  { sujet: 'Incidents importants', compte: 'pulse', etat: 'a_construire', note: 'Pages d’état à collecter, avec révisions.' },
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
    accroche: { texte: 'earshot wants to give coding agents ears', passages: ['Ears for coding agents: let AI hear, review and make sound.'] },
    interet: { texte: 'According to its author, it runs locally on CPU, as a command-line tool, a Python API and an MCP server.', passages: ['It runs locally on CPU, as a CLI, a Python API and an MCP server.'] },
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
  { famille: 'GitHub Changelog', role: 'vérification', etat: 'connecte', note: 'Déjà collecté.' },
] as const;

/** Registre de Radar : `role` distingue la source de preuve du contexte. Une rumeur n'est jamais publiée comme un fait. */
export const REGISTRE_RADAR = [
  { famille: 'GitHub Changelog (Microsoft)', role: 'annonce officielle', etat: 'connecte', note: 'Déjà collecté.' },
  { famille: 'Blogs officiels Google et Microsoft', role: 'annonce officielle', etat: 'partiel', note: 'Google collecté ; Microsoft à intégrer.' },
  { famille: 'NVIDIA et Apple Newsroom', role: 'annonce officielle', etat: 'a_integrer', note: 'Flux contrôlés, gratuits.' },
  { famille: 'Amazon, Meta, Tesla', role: 'annonce officielle', etat: 'a_integrer', note: 'Accès à vérifier par entreprise.' },
  { famille: 'Documentations, conférences, recherche', role: 'annonce officielle', etat: 'a_integrer', note: 'À sélectionner.' },
  { famille: 'Newsletters publiques', role: 'contexte', etat: 'a_integrer', note: 'Accès autorisé uniquement.' },
  { famille: 'Médias spécialisés', role: 'contexte', etat: 'a_integrer', note: 'Conditions à vérifier ; synthèse attribuée.' },
  { famille: 'Experts sur X', role: 'contexte', etat: 'a_integrer', note: 'Accès autorisé à obtenir, payant.' },
  { famille: 'Communautés Reddit', role: 'contexte', etat: 'differe', note: 'Différée : aucun accès autorisé disponible.' },
] as const;
