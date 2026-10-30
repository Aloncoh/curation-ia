// npm run export — écrit exports/source-documents.json, lisible par un humain.
import { mkdir, writeFile } from 'node:fs/promises';
import { buildExport } from '../export/export.ts';
import { runCommand } from './shared.ts';

const OUTPUT = 'exports/source-documents.json';

await runCommand(async ({ database }) => {
  const data = await buildExport(database.db, new Date().toISOString());
  await mkdir('exports', { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Export écrit : ${OUTPUT} (${data.documents.length} document(s), ${data.recent_runs.length} exécution(s) récentes)`);
});
