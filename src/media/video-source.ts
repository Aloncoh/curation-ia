// Vidéo d'un post tirée de sa source (décision de l'utilisateur du 2026-11-10 : « Vidéos des sources ») : la vidéo que
// l'éditeur a lui-même placée dans sa page (lecteur YouTube ou Vimeo intégré, ou balise <video> de la page), ou la source
// elle-même quand c'est une vidéo YouTube. Rien n'est copié : le site affiche le lecteur de l'hébergeur d'origine, et
// seulement après un clic. La page collectée est une donnée non fiable : seuls un identifiant (YouTube, Vimeo) ou une
// adresse https de fichier vidéo en sont tirés, jamais du HTML.
// Limites assumées : les liens vers une vidéo dans le texte (README, « Watch the recording ») sont ignorés, faute de
// savoir s'ils montrent le produit annoncé ; seule la première vidéo de la page est retenue.

export type VideoTrouvee =
  | { fournisseur: 'youtube'; id: string; titre: string | null }
  | { fournisseur: 'vimeo'; id: string; titre: string | null }
  | { fournisseur: 'fichier'; fichier: string; titre: string | null };

export interface CaptureVideo {
  url: string;
  titre: string | null;
  contenu: string;
  format: string;
}

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const EXTENSIONS_VIDEO = /\.(mp4|webm|m4v)$/i;

function decoder(attribut: string): string {
  return attribut
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

function attribut(balise: string, nom: string): string | null {
  const m = new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(balise);
  if (!m) return null;
  return decoder(m[1] ?? m[2] ?? m[3] ?? '');
}

/** Titre affichable : texte seul, espaces réduits, 200 caractères au plus ; vide → null. */
export function titrePropre(brut: string | null): string | null {
  if (brut === null) return null;
  const t = brut.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (t === '') return null;
  return t.length > 200 ? `${t.slice(0, 199).trimEnd()}…` : t;
}

/** Identifiant YouTube d'une adresse de vidéo (watch, embed, shorts, youtu.be), sinon null. */
export function idYoutube(adresse: string): string | null {
  let u: URL;
  try {
    u = new URL(adresse, 'https://www.youtube.com');
  } catch {
    return null;
  }
  const hote = u.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (hote === 'youtu.be') id = u.pathname.slice(1).split('/')[0] ?? null;
  else if (hote === 'youtube.com' || hote === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(u.pathname);
      id = m?.[1] ?? null;
    }
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

/** Identifiant Vimeo d'un lecteur intégré (player.vimeo.com/video/N), sinon null. */
export function idVimeo(adresse: string): string | null {
  try {
    const u = new URL(adresse, 'https://player.vimeo.com');
    if (u.hostname !== 'player.vimeo.com') return null;
    const m = /^\/video\/(\d{3,12})(?:\/|$)/.exec(u.pathname);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Adresse de fichier vidéo acceptable : https, sans identifiants, extension vidéo, 500 caractères au plus. */
export function fichierVideo(adresse: string, base: string): string | null {
  let u: URL;
  try {
    u = new URL(adresse, base);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || !EXTENSIONS_VIDEO.test(u.pathname)) return null;
  const texte = u.toString();
  return texte.length <= 500 ? texte : null;
}

/** Première vidéo placée par l'éditeur dans une capture HTML (ordre d'apparition), sinon null. */
function videoDuHtml(html: string, base: string): VideoTrouvee | null {
  const balises = /<iframe\b[^>]*>|<video\b[^>]*>[\s\S]*?<\/video>/gi;
  for (const m of html.matchAll(balises)) {
    const bloc = m[0];
    if (/^<iframe/i.test(bloc)) {
      const src = attribut(bloc, 'src') ?? attribut(bloc, 'data-src');
      if (!src) continue;
      const titre = titrePropre(attribut(bloc, 'title'));
      const yt = idYoutube(src);
      if (yt && /youtu/i.test(src)) return { fournisseur: 'youtube', id: yt, titre };
      const vm = idVimeo(src);
      if (vm) return { fournisseur: 'vimeo', id: vm, titre };
      continue;
    }
    const ouverture = /^<video\b[^>]*>/i.exec(bloc)?.[0] ?? '';
    const candidats = [attribut(ouverture, 'src'), ...[...bloc.matchAll(/<source\b[^>]*>/gi)].map((s) => attribut(s[0], 'src'))];
    for (const c of candidats) {
      const f = c ? fichierVideo(c, base) : null;
      if (f) return { fournisseur: 'fichier', fichier: f, titre: titrePropre(attribut(ouverture, 'title') ?? attribut(ouverture, 'aria-label')) };
    }
  }
  return null;
}

/** Vidéo d'une capture : la source elle-même si c'est une vidéo YouTube, sinon la première vidéo de sa page HTML. */
export function videoDeLaCapture(c: CaptureVideo): VideoTrouvee | null {
  if (/^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch|shorts\/)|youtu\.be\/)/.test(c.url)) {
    const id = idYoutube(c.url);
    if (id) return { fournisseur: 'youtube', id, titre: titrePropre(c.titre) };
  }
  if (c.format !== 'html') return null;
  return videoDuHtml(c.contenu, c.url);
}

/** Première vidéo des captures d'un post, dans l'ordre donné (document cité d'abord, puis renforts). */
export function videoDesCaptures(captures: readonly CaptureVideo[]): { video: VideoTrouvee; capture: CaptureVideo } | null {
  for (const capture of captures) {
    const video = videoDeLaCapture(capture);
    if (video) return { video, capture };
  }
  return null;
}

/** Adresse du lecteur servie au site : YouTube sans cookies avant lecture, Vimeo sans suivi, fichier tel quel. */
export function adresseIntegration(v: VideoTrouvee): string {
  if (v.fournisseur === 'youtube') return `https://www.youtube-nocookie.com/embed/${v.id}`;
  if (v.fournisseur === 'vimeo') return `https://player.vimeo.com/video/${v.id}?dnt=1`;
  return v.fichier;
}
