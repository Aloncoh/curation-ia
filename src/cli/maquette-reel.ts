// npm run maquette:reel — génère le Reel d'exemple de la maquette (P2) : maquette/medias/reel-copilot-fusion.{mp4,vtt,jpg,json},
// vidéo verticale 720 × 1280 « hébergée par la plateforme ». Maquette seulement, sur macOS : voix de synthèse du système
// (`say`), police système Arial Rounded Bold et ffmpeg local ; aucun compte, aucune dépense. Le site réel (P7) choisira
// son outil de rendu et une police sous licence libre. Le texte de chaque segment est celui d'un champ vérifié de
// l'exemple (reel.ts) : la commande refuse un exemple « à vérifier ».
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildMaquetteData } from '../maquette/data.ts';
import { minuterSousTitres, planDessin, segmentsDuReel, textesDessines, versWebVTT, type ElementDessine } from '../maquette/reel.ts';
import { runCommand } from './shared.ts';

const executer = promisify(execFile);

const EXEMPLE = 'exemple-copilot-fusion';
const NOM = 'reel-copilot-fusion';
const SORTIE = resolve('maquette/medias');
const VOIX = 'Flo (Français (France))';
const POLICE = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf';
const MASCOTTE = resolve('assets/brand/mascotte-principale.png');
const FFMPEG = process.env.FFMPEG ?? join(homedir(), '.local/bin/ffmpeg');
const FFPROBE = process.env.FFPROBE ?? join(homedir(), '.local/bin/ffprobe');
const IMAGES_PAR_SECONDE = 30;
/** Silence après chaque segment, en secondes. */
const PAUSE = 0.8;
/** Jetons de la maquette (index.html) : visage de la mascotte, lueur des yeux, lavande. */
const COULEURS = { fond: '0x1d1b23', lueur: '0xfaf2e0', lavande: '0xb9b2ea', pied: '0xb4aec6', anneau: '0x847db6' };

const POSITIONS_X = { gauche: '48', droite: 'w-tw-48', centre: '(w-tw)/2' };

/** Élément du plan dessiné par drawtext depuis un fichier (aucun échappement de ponctuation, aucune expansion de %{…}). */
const drawtext = (element: ElementDessine, fichier: string) =>
  `drawtext=fontfile=police.ttf:textfile=${fichier}:expansion=none:fontsize=${element.taille}:fontcolor=${COULEURS[element.couleur]}` +
  `:x=${POSITIONS_X[element.x]}:y=${element.y}` +
  (element.interligne !== undefined ? `:line_spacing=${element.interligne}` : '') +
  (element.apparition !== undefined ? `:alpha='min(1,max(0,(t-${element.apparition})/0.45))'` : '');

async function dureeDe(fichier: string): Promise<number> {
  const { stdout } = await executer(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier]);
  const duree = Number(stdout.trim());
  if (!Number.isFinite(duree) || duree <= 0) throw new Error(`Durée illisible pour ${fichier}`);
  return duree;
}

await runCommand(async ({ database }) => {
  if (process.platform !== 'darwin') {
    console.error('maquette:reel utilise la synthèse vocale de macOS (say) : commande réservée à macOS.');
    return 1;
  }
  const data = await buildMaquetteData(database.client, new Date().toISOString());
  const exemple = data.exemples.find((e) => e.id === EXEMPLE);
  if (!exemple) {
    console.error(`Exemple ${EXEMPLE} introuvable dans la base (lancer d'abord une collecte réelle du GitHub Changelog).`);
    return 1;
  }
  const segments = segmentsDuReel(exemple);
  const textes = textesDessines(exemple, segments);
  const { stdout: versionFfmpeg } = await executer(FFMPEG, ['-hide_banner', '-version']);

  const travail = await mkdtemp(join(tmpdir(), 'curation-reel-'));
  try {
    await copyFile(POLICE, join(travail, 'police.ttf'));
    await copyFile(MASCOTTE, join(travail, 'mascotte.png'));
    const fichier = (nom: string, contenu: string) => writeFile(join(travail, nom), contenu, 'utf8');

    const minutage: { texte: string; debut: number; dureeParole: number; duree: number }[] = [];
    let debut = 0;
    for (const [i, segment] of segments.entries()) {
      await fichier(`parole${i}.txt`, segment.texte);
      await executer('say', ['-v', VOIX, '-o', join(travail, `parole${i}.aiff`), '-f', join(travail, `parole${i}.txt`)]);
      const dureeParole = await dureeDe(join(travail, `parole${i}.aiff`));
      // Durée calée sur un nombre entier d'images, pour que les débuts de segments (et les sous-titres) tombent juste.
      const duree = Math.ceil((dureeParole + PAUSE) * IMAGES_PAR_SECONDE) / IMAGES_PAR_SECONDE;

      const plan = planDessin(textes, i);
      for (const element of plan) await fichier(`${element.nom}${i}.txt`, element.texte);
      const filtre = [
        `[1:v]scale=176:176,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*lte(hypot(X-88,Y-88),87)'[m]`,
        `[2:v]format=rgba,geq=r='132':g='125':b='182':a='255*lte(hypot(X-94,Y-94),94)'[anneau]`,
        `[0:v][anneau]overlay=x=(W-w)/2:y='948+6*sin(2*PI*t/2.6)'[f1]`,
        `[f1][m]overlay=x=(W-w)/2:y='954+6*sin(2*PI*t/2.6)'[f2]`,
        `[f2]${plan.map((element) => drawtext(element, `${element.nom}${i}.txt`)).join(',')}[v]`,
        `[3:a]aresample=44100,apad=whole_dur=${duree}[a]`,
      ].join(';');
      await executer(
        FFMPEG,
        [
          '-y', '-hide_banner', '-loglevel', 'error',
          '-f', 'lavfi', '-i', `color=c=${COULEURS.fond}:s=720x1280:r=${IMAGES_PAR_SECONDE}:d=${duree}`,
          '-i', 'mascotte.png',
          '-f', 'lavfi', '-i', `color=c=${COULEURS.anneau}:s=188x188:r=${IMAGES_PAR_SECONDE}:d=${duree}`,
          '-i', `parole${i}.aiff`,
          '-filter_complex', filtre, '-map', '[v]', '-map', '[a]', '-t', String(duree),
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k', '-ac', '1',
          `segment${i}.mp4`,
        ],
        { cwd: travail },
      );
      minutage.push({ texte: segment.texte, debut, dureeParole, duree });
      debut += duree;
    }

    await mkdir(SORTIE, { recursive: true });
    const video = join(SORTIE, `${NOM}.mp4`);
    await fichier('liste.txt', segments.map((_, i) => `file 'segment${i}.mp4'`).join('\n'));
    await executer(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'liste.txt', '-c', 'copy', '-movflags', '+faststart', video], {
      cwd: travail,
    });
    await executer(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1.5', '-i', video, '-frames:v', '1', '-q:v', '3', join(SORTIE, `${NOM}.jpg`)]);
    const sousTitres = minuterSousTitres(minutage);
    // Sous-titres placés à hauteur de la mascotte : ils ne couvrent ni le texte ni la mention « Illustration ».
    await writeFile(join(SORTIE, `${NOM}.vtt`), versWebVTT(sousTitres, 'line:74%'), 'utf8');

    const dureeTotale = await dureeDe(video);
    const empreinte = async (chemin: string) => createHash('sha256').update(await readFile(chemin)).digest('hex');
    const manifeste = {
      id: NOM,
      exemple_id: exemple.id,
      statut: 'Exemple de maquette : ce n’est pas une publication et aucun agent du site ne l’a produit.',
      origine: 'generated',
      mention: textes.mentions[0],
      mention_analyse: textes.mentions[1],
      niveau_de_preuve: 'documentary_analysis',
      genere_le: new Date().toISOString(),
      duree_secondes: Math.round(dureeTotale * 1000) / 1000,
      format: { largeur: 720, hauteur: 1280, images_par_seconde: IMAGES_PAR_SECONDE },
      fichiers: { video: `${NOM}.mp4`, sous_titres: `${NOM}.vtt`, affiche: `${NOM}.jpg` },
      empreintes_sha256: { video: await empreinte(video), sous_titres: await empreinte(join(SORTIE, `${NOM}.vtt`)) },
      textes_dessines: textes,
      source: {
        nom: exemple.actualite.source.name,
        url: exemple.actualite.source.url,
        date_annonce: exemple.actualite.announced_at,
        capture: { content_hash: exemple.capture.content_hash, captured_at: exemple.capture.captured_at, run_id: exemple.capture.run_id },
      },
      segments: segments.map((segment, i) => ({
        ...segment,
        debut: Math.round(minutage[i]!.debut * 1000) / 1000,
        fin: Math.round((minutage[i]!.debut + minutage[i]!.duree) * 1000) / 1000,
      })),
      outils: {
        rendu: versionFfmpeg.split('\n')[0]!.split(' Copyright')[0],
        voix: `synthèse vocale macOS « ${VOIX} »`,
        police: 'Arial Rounded MT Bold (police système macOS, maquette seulement)',
      },
    };
    await writeFile(join(SORTIE, `${NOM}.json`), `${JSON.stringify(manifeste, null, 2)}\n`, 'utf8');
    console.log(
      `Reel : maquette/medias/${NOM}.mp4 (${manifeste.duree_secondes} s, ${segments.length} segments, ${sousTitres.length} sous-titres), .vtt, .jpg, .json`,
    );
  } finally {
    await rm(travail, { recursive: true, force: true });
  }
});
