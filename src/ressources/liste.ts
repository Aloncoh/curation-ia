// Liste des ressources pour construire, fournie par l'utilisateur le 2026-11-02 (ADR 0011). Elle tient lieu de sélection
// humaine : le code ne fait qu'en tracer la décision. Les sources correspondantes vivent hors de SOURCES : `npm run collect`
// ne les traite pas, seule `npm run ressources -- capturer` les capture.
import type { CompteId } from '../maquette/exemples.ts';

export interface EntreeRessource {
  slug: string;
  nom: string;
  /** `propriétaire/dépôt`, tel que l'API GitHub le nomme (URL canonique, sans redirection). */
  depot: string;
  /**
   * Fichiers à capturer ; le premier est le document principal de la publication (SKILL.md, sinon README). Le manifeste
   * `.claude-plugin/marketplace.json` d'anthropics/skills dit quel plugin contient chaque skill (le README ne le dit pas).
   */
  chemins: string[];
  compte: CompteId;
  remarque?: string;
  /** Provenance propre à l'entrée quand elle ne vient pas du fil d'origine ; sinon `DECOUVERTE_VIA`. */
  decouverteVia?: string;
  /** Trouvée par la découverte automatique (decouverte.ts), pas choisie par l'utilisateur : jamais « à publier » d'office. */
  decouverteAuto?: boolean;
}

/** Version de la liste, reprise dans `selection_decision.consignes_version`. */
export const VERSION_LISTE = 'liste-2026-11-02';

/** Provenance affichée avec chaque publication : un contenu externe attribué, jamais un avis de membre. */
export const DECOUVERTE_VIA =
  "Liste transmise par l'utilisateur le 2026-11-02, tirée d'un fil X de @Slonski_rt (contenu externe attribué ; chiffres d'installation du fil non vérifiés)";

/**
 * Compte signataire selon le rôle de chaque agent (décision de l'utilisateur du 2026-11-05, qui remplace la répartition
 * « fil équilibré » du 2026-11-02) : Repo signe les skills, MCP et projets GitHub. Radar (grandes entreprises), Nodi (modèles et assistants) et Pyxo (notes de version des outils)
 * ne signent aucune ressource. Précisé le même jour (« chacun a sa spécialité, il ne faut pas interférer ») : tous les
 * skills vont à Repo, y compris ceux de design ; Mova garde les outils et sites de design.
 */
const COMPTE_PAR_SLUG: Record<string, CompteId> = {};

const r = (slug: string, nom: string, depot: string, chemins: string[], remarque?: string, decouverteVia?: string): EntreeRessource => ({
  slug,
  nom,
  depot,
  chemins,
  compte: COMPTE_PAR_SLUG[slug] ?? 'repo',
  ...(remarque ? { remarque } : {}),
  ...(decouverteVia ? { decouverteVia } : {}),
});

/**
 * Alterne les comptes en gardant l'ordre de l'utilisateur à l'intérieur de chacun : le planning suit cet ordre, donc
 * deux publications voisines viennent de comptes différents tant que c'est possible.
 */
export function alternerComptes(liste: readonly EntreeRessource[]): EntreeRessource[] {
  const files = new Map<CompteId, EntreeRessource[]>();
  for (const e of liste) files.set(e.compte, [...(files.get(e.compte) ?? []), e]);
  const resultat: EntreeRessource[] = [];
  while (resultat.length < liste.length) for (const file of files.values()) { const e = file.shift(); if (e) resultat.push(e); }
  return resultat;
}

export const RESSOURCES: readonly EntreeRessource[] = alternerComptes([
  r('frontend-design', 'frontend-design', 'anthropics/skills', ['skills/frontend-design/SKILL.md', 'README.md', '.claude-plugin/marketplace.json'], 'dépôt sans licence globale ; licence propre au skill à lire'),
  r('agent-browser', 'agent-browser', 'vercel-labs/agent-browser', ['README.md']),
  r('react-best-practices', 'React Best Practices (Vercel)', 'vercel-labs/agent-skills', ['skills/react-best-practices/SKILL.md', 'README.md'], 'dépôt sans licence globale'),
  r(
    'skills-documents',
    'Skills de documents docx, xlsx, pptx, pdf',
    'anthropics/skills',
    ['skills/docx/SKILL.md', 'skills/xlsx/SKILL.md', 'skills/pptx/SKILL.md', 'skills/pdf/SKILL.md', 'README.md'],
    'code consultable, non libre selon le dépôt ; présentés pour démonstration et éducation',
  ),
  r('ui-ux-pro-max', 'UI UX Pro Max', 'nextlevelbuilder/ui-ux-pro-max-skill', ['README.md']),
  r('webapp-testing', 'webapp-testing', 'anthropics/skills', ['skills/webapp-testing/SKILL.md', 'README.md', '.claude-plugin/marketplace.json']),
  r('mcp-builder', 'mcp-builder', 'anthropics/skills', ['skills/mcp-builder/SKILL.md', 'README.md', '.claude-plugin/marketplace.json']),
  r('obsidian-skills', 'Obsidian Skills', 'kepano/obsidian-skills', ['README.md'], "angle souhaité par l'utilisateur : deuxième cerveau, connecter Obsidian à Claude, si la capture le soutient"),
  r('marketingskills', 'Marketing Skills', 'coreyhaines31/marketingskills', ['README.md']),
  r('scientific-agent-skills', 'Scientific Agent Skills (K-Dense)', 'K-Dense-AI/scientific-agent-skills', ['README.md'], 'ancien nom claude-scientific-skills, redirigé'),
  r('superpowers', 'Superpowers', 'obra/superpowers', ['README.md']),
  r('find-skills', 'find-skills', 'vercel-labs/skills', ['skills/find-skills/SKILL.md', 'README.md']),
  r('grill-me', 'grill-me (Matt Pocock)', 'mattpocock/skills', ['skills/productivity/grill-me/SKILL.md', 'README.md']),
  r('claude-mem', 'claude-mem', 'thedotmack/claude-mem', ['README.md']),
  r('humanizer', 'humanizer', 'blader/humanizer', ['README.md']),
  r('planning-with-files', 'planning-with-files', 'OthmanAdi/planning-with-files', ['README.md']),
  r('stop-slop', 'stop-slop', 'hardikpandya/stop-slop', ['README.md'], 'aucun push depuis le 2026-03-17'),
  r('improve-codebase-architecture', 'improve-codebase-architecture (Matt Pocock)', 'mattpocock/skills', ['skills/engineering/improve-codebase-architecture/SKILL.md', 'README.md']),
  r('skill-creator', 'skill-creator', 'anthropics/skills', ['skills/skill-creator/SKILL.md', 'README.md', '.claude-plugin/marketplace.json']),
  r(
    'claudeception',
    'Claudeception',
    'blader/Claudeception',
    ['README.md'],
    "fork de AlexMikhalev/claude-code-continuous-learning-skill (43 étoiles) ; aucun push depuis le 2026-02-21 ; l'attribution d'origine doit apparaître",
  ),
  r(
    'ecc',
    'ECC (Everything Claude Code)',
    'affaan-m/ECC',
    ['README.md'],
    "21e ressource, ajoutée à part par l'utilisateur ; aucun guide d'installation dédié à la racine (install.sh et install.ps1 sont des scripts, pas de la documentation) ; dépôt utilisé dans l'environnement de développement de ce projet, jamais présenté comme testé par la plateforme",
    "Ressource ajoutée par l'utilisateur le 2026-11-02, hors du fil X d'origine",
  ),
]);

export const SOURCE_PREFIXE = 'github-ressource:';
export const sourceIdDe = (depot: string): string => `${SOURCE_PREFIXE}${depot}`;

export const trouverRessource = (slug: string, liste: readonly EntreeRessource[] = RESSOURCES): EntreeRessource | undefined => liste.find((e) => e.slug === slug);

/** Identifiant externe du document principal : le premier chemin de la ressource. */
export const documentPrincipal = (e: EntreeRessource): string => `fichier:${e.chemins[0]}`;

/** Dossier d'un skill (`skills/x/SKILL.md` → `skills/x`) ; null pour un fichier qui n'est pas un SKILL.md. */
export function dossierDeSkill(chemin: string): string | null {
  const m = /^(.+)\/SKILL\.md$/.exec(chemin);
  return m ? m[1]! : null;
}
