// Sujet d'une publication, pour sa couverture (décision de l'utilisateur du 2026-11-05) : avant même de lire le texte,
// on doit comprendre de quoi parle le post. Le sujet est déduit de l'adresse officielle citée (bouton, puis source) :
// un éditeur connu donne son logo et sa couleur (bibliothèque simple-icons 16.35.0, CC0 ; une marque qui a demandé son
// retrait, comme OpenAI, garde un monogramme), un dépôt GitHub sans marque connue donne son monogramme, jamais l'avatar
// de son propriétaire, souvent un visage. Le logo
// identifie le sujet ; il n'affirme aucun partenariat.
import { siAmd, siAnthropic, siApple, siBlender, siCloudflare, siCursor, siDeepseek, siElevenlabs, siFigma, siGithub, siGooglegemini, siHuggingface, siMeta, siMistralai, siN8n, siNotion, siNvidia, siSuno, siTesla, siVercel, siYoutube, type SimpleIcon } from 'simple-icons';
import type { Publication } from '@curation/contrat';

export interface Sujet {
  /** Nom affiché sur la couverture : l'éditeur, ou le dépôt. */
  nom: string;
  /** Ligne secondaire : le propriétaire d'un dépôt, l'éditeur d'un produit. */
  detail: string | null;
  /** Logo vectoriel (24 × 24), ou image (avatar GitHub), ou monogramme. */
  logo: { type: 'svg'; chemin: string } | { type: 'image'; src: string } | { type: 'monogramme'; lettres: string };
  /** Couleur de la marque, base de la palette de la couverture. */
  couleur: string;
}

interface Editeur { nom: string; icone: SimpleIcon | null; couleur?: string }

const EDITEURS: Record<string, Editeur> = {
  'anthropic.com': { nom: 'Anthropic', icone: siAnthropic, couleur: '#d97757' },
  'claude.com': { nom: 'Claude', icone: siAnthropic, couleur: '#d97757' },
  'github.blog': { nom: 'GitHub', icone: siGithub, couleur: '#6e40c9' },
  'figma.com': { nom: 'Figma', icone: siFigma },
  'cursor.com': { nom: 'Cursor', icone: siCursor, couleur: '#3b4cca' },
  'mistral.ai': { nom: 'Mistral AI', icone: siMistralai },
  'blog.google': { nom: 'Google Gemini', icone: siGooglegemini },
  'huggingface.co': { nom: 'Hugging Face', icone: siHuggingface },
  'elevenlabs.io': { nom: 'ElevenLabs', icone: siElevenlabs, couleur: '#5b5bd6' },
  'suno.com': { nom: 'Suno', icone: siSuno, couleur: '#e3407a' },
  'notion.com': { nom: 'Notion', icone: siNotion, couleur: '#4a4a55' },
  'blender.org': { nom: 'Blender', icone: siBlender },
  'n8n.io': { nom: 'n8n', icone: siN8n },
  'vercel.com': { nom: 'Vercel', icone: siVercel, couleur: '#3a3a44' },
  'cloudflare.com': { nom: 'Cloudflare', icone: siCloudflare },
  'nvidia.com': { nom: 'NVIDIA', icone: siNvidia },
  'deepseek.com': { nom: 'DeepSeek', icone: siDeepseek },
  'youtube.com': { nom: 'YouTube', icone: siYoutube },
  'openai.com': { nom: 'OpenAI', icone: null, couleur: '#10a37f' },
  // Grandes entreprises (Radar). Microsoft et Amazon ne figurent plus dans la bibliothèque : monogramme.
  'apple.com': { nom: 'Apple', icone: siApple, couleur: '#3a3a44' },
  'microsoft.com': { nom: 'Microsoft', icone: null, couleur: '#0078d4' },
  'aboutamazon.com': { nom: 'Amazon', icone: null, couleur: '#ff9900' },
  'amd.com': { nom: 'AMD', icone: siAmd },
  'fb.com': { nom: 'Meta', icone: siMeta },
  'tesla.com': { nom: 'Tesla', icone: siTesla },
  'spline.design': { nom: 'Spline', icone: null, couleur: '#7a5cff' },
  'vapi.ai': { nom: 'Vapi', icone: null, couleur: '#14b8a6' },
  'midjourney.com': { nom: 'Midjourney', icone: null, couleur: '#4f6bed' },
};

/** Propriétaires de dépôts qui sont aussi des éditeurs connus : leur logo plutôt que leur avatar. */
const PROPRIETAIRES: Record<string, Editeur> = {
  anthropics: EDITEURS['anthropic.com']!,
  'vercel-labs': { nom: 'Vercel', icone: siVercel, couleur: '#3a3a44' },
  vercel: { nom: 'Vercel', icone: siVercel, couleur: '#3a3a44' },
  cloudflare: EDITEURS['cloudflare.com']!,
  huggingface: EDITEURS['huggingface.co']!,
};

/** Couleur stable tirée d'un nom, pour un dépôt sans marque : jamais la même pour deux noms voisins. */
export function couleurDe(nom: string): string {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 46%)`;
}

const monogramme = (nom: string) => nom.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('') || '?';

function depuisEditeur(e: Editeur, detail: string | null): Sujet {
  const couleur = e.couleur ?? (e.icone ? `#${e.icone.hex}` : couleurDe(e.nom));
  return { nom: e.nom, detail, couleur, logo: e.icone ? { type: 'svg', chemin: e.icone.path } : { type: 'monogramme', lettres: monogramme(e.nom) } };
}

function hote(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/^docs\./, '');
  } catch {
    return null;
  }
}

/** Sujet d'une publication, ou null (une sélection montre sa mosaïque, pas un sujet unique). */
export function sujetDe(p: Pick<Publication, 'bouton' | 'sources' | 'nature'>): Sujet | null {
  if (p.nature === 'selection') return null;
  const url = p.bouton?.url ?? p.sources.documents.find((d) => d.url)?.url ?? null;
  if (!url) return null;
  const h = hote(url);
  if (!h) return null;
  if (h === 'github.com') {
    const [proprietaire, depot, type, , ...chemin] = new URL(url).pathname.split('/').filter(Boolean);
    if (!proprietaire) return null;
    const connu = PROPRIETAIRES[proprietaire.toLowerCase()];
    // Un skill dans un sous-dossier (`/tree/main/skills/frontend-design`) : son nom, pas celui du dépôt.
    const nomDepot = (type === 'tree' || type === 'blob') && chemin.length ? chemin.at(-1)! : depot ?? proprietaire;
    if (connu) return { ...depuisEditeur(connu, `${connu.nom} · GitHub`), nom: nomDepot };
    // Pas d'avatar du propriétaire : c'est souvent un visage (décision de l'utilisateur du 2026-11-05, « enlève les
    // visages »). Le monogramme du dépôt, aux couleurs du propriétaire, nomme le sujet.
    return { nom: nomDepot, detail: `${proprietaire} · GitHub`, couleur: couleurDe(proprietaire), logo: { type: 'monogramme', lettres: monogramme(nomDepot) } };
  }
  const editeur = EDITEURS[h] ?? Object.entries(EDITEURS).find(([cle]) => h.endsWith(`.${cle}`))?.[1];
  return editeur ? depuisEditeur(editeur, null) : { nom: h, detail: null, couleur: couleurDe(h), logo: { type: 'monogramme', lettres: monogramme(h) } };
}
