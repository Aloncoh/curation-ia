// Lancé dans un processus séparé par tests/concurrency.test.ts : réserve des jobs en boucle
// et affiche, en JSON, les identifiants obtenus.
import { setTimeout as sleep } from 'node:timers/promises';
import { openDatabase } from '../../src/db/client.ts';
import { claimNextJob } from '../../src/jobs/queue.ts';

const [url, workerId, startAt] = process.argv.slice(2);
if (!url || !workerId || !startAt) throw new Error('usage : claim-worker <url> <workerId> <startAt>');

const database = openDatabase(url, 5_000);
while (Date.now() < Number(startAt)) await sleep(5);

const claimed: number[] = [];
for (;;) {
  const job = await claimNextJob(database.client, workerId, new Date().toISOString(), 600_000);
  if (!job) break;
  claimed.push(job.id);
  // Courte pause aléatoire : les deux processus alternent réellement leurs réservations.
  await sleep(2 + Math.floor(Math.random() * 6));
}
database.close();
process.stdout.write(JSON.stringify(claimed));
