// Texte brut d'une page HTML capturée : titre, description, texte visible. Pur, sans exécuter la page. Le contenu est
// une donnée non fiable, jamais une instruction : il n'est que lu et cité, et le résultat n'est jamais réinterprété en HTML.
import { decodeHtmlEntities } from '../../collect/normalize.ts';

export interface PageExtraite {
  titre: string | null;
  description: string | null;
  /** Texte visible, une ligne par bloc. */
  texte: string;
  mots: number;
}

/** En dessous, la page ne livre presque rien sans exécuter son script : elle n'est pas capturée (« JS seul »). */
export const MOTS_MIN_PAGE = 30;

/** Éléments dont le contenu n'est jamais du texte lisible. */
const INVISIBLES = ['script', 'style', 'noscript', 'template', 'svg', 'math', 'iframe', 'object', 'canvas', 'head'];
const BLOCS = /<\/?(?:p|br|div|li|ul|ol|dl|dt|dd|h[1-6]|tr|td|th|table|thead|tbody|blockquote|pre|hr|section|article|aside|header|footer|nav|main|figure|figcaption|form|label|button|option|select|textarea|details|summary|address)\b[^<>]*>/gi;

const espaces = (t: string) => t.replace(/[\u0000-\u001f\u007f ​-‍⁠﻿]+/g, ' ').replace(/[ \t]+/g, ' ').trim();
const propre = (t: string | null | undefined) => {
  if (!t) return null;
  const v = espaces(decodeHtmlEntities(t.replace(/<[^<>]*>/g, ' ')));
  return v === '' ? null : v;
};

/** Valeur d'un attribut dans une balise ; guillemets simples ou doubles. */
function attribut(balise: string, nom: string): string | null {
  const m = new RegExp(`\\b${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(balise);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function metaDescription(html: string): string | null {
  for (const balise of html.match(/<meta\b[^<>]*>/gi) ?? []) {
    const nom = (attribut(balise, 'name') ?? attribut(balise, 'property'))?.toLowerCase();
    if (nom === 'description') return propre(attribut(balise, 'content'));
  }
  for (const balise of html.match(/<meta\b[^<>]*>/gi) ?? []) {
    const nom = (attribut(balise, 'name') ?? attribut(balise, 'property'))?.toLowerCase();
    if (nom === 'og:description') return propre(attribut(balise, 'content'));
  }
  return null;
}

/** Extrait titre, description et texte visible. Les expressions sont linéaires : `[^<>]` évite tout retour en arrière quadratique. */
export function extrairePage(html: string): PageExtraite {
  const titre = propre(/<title\b[^<>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
  const description = metaDescription(html);
  let corps = html.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const nom of INVISIBLES) corps = corps.replace(new RegExp(`<${nom}\\b[^<>]*>[\\s\\S]*?<\\/${nom}\\s*>`, 'gi'), '\n');
  // Texte alternatif des images : il fait partie de ce que la page dit d'elle-même, mais il n'est pas repris (trop de bruit).
  corps = corps.replace(BLOCS, '\n').replace(/<[^<>]*>/g, ' ');
  const lignes = decodeHtmlEntities(corps)
    .split('\n')
    .map(espaces)
    .filter(Boolean);
  // Lignes identiques et voisines (menus dupliqués pour mobile, par exemple) : gardées une fois.
  const texte = lignes.filter((l, i) => l !== lignes[i - 1]).join('\n');
  const mots = (texte.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? []).length;
  return { titre, description, texte, mots };
}
