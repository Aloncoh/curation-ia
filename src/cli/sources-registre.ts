// npm run sources:registre — registre d'accès des sources (2026-11-05) : actives par état observé, différées avec motif
// et canal de remplacement, reprises en attente. Lecture seule, base configurée (Turso fait foi).
import { LIBELLES_ACCES, type EtatAcces } from '../collect/acces.ts';
import { SOURCES } from '../sources.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  const r = await database.client.execute('select id, acces_etat, acces_detail, echecs_consecutifs, reessai_apres, last_success_at from source');
  const lignes = new Map(r.rows.map((x) => [String(x.id), x]));
  const actives = SOURCES.filter((s) => !s.differee);
  const parEtat = new Map<string, string[]>();
  for (const s of actives) {
    const l = lignes.get(s.id);
    const etat = l?.acces_etat == null ? 'jamais collectée' : LIBELLES_ACCES[String(l.acces_etat) as EtatAcces] ?? String(l.acces_etat);
    const reprise = l?.reessai_apres ? ` — reprise après ${String(l.reessai_apres).slice(0, 16).replace('T', ' ')} UTC (${String(l.echecs_consecutifs)} échec(s) de suite)` : '';
    parEtat.set(etat, [...(parEtat.get(etat) ?? []), `${s.id}${reprise}${l?.acces_detail ? ` : ${String(l.acces_detail).slice(0, 80)}` : ''}`]);
  }
  console.log(`Sources actives : ${actives.length}`);
  for (const [etat, ids] of [...parEtat.entries()].sort()) {
    console.log(`\n## ${etat} (${ids.length})`);
    for (const id of ids) console.log(`- ${id}`);
  }
  const differees = SOURCES.filter((s) => s.differee);
  console.log(`\n## Différées, gardées au registre (${differees.length})`);
  for (const s of differees) console.log(`- ${s.id} — ${LIBELLES_ACCES[s.differee!.etat]} depuis le ${s.differee!.depuis} : ${s.differee!.motif}${s.differee!.alternative ? ` ; remplacement : ${s.differee!.alternative}` : ''}`);
});
