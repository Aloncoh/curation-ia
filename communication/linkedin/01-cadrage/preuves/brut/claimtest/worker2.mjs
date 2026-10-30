import { DatabaseSync } from 'node:sqlite';
const [file, me, startAt] = process.argv.slice(2);
while (Date.now() < Number(startAt)) {}
const db = new DatabaseSync(file, { timeout: 5000 });
const claim = db.prepare("UPDATE jobs SET status='leased', owner=?, lease_until=? WHERE id=(SELECT id FROM jobs WHERE status='pending' ORDER BY id LIMIT 1) RETURNING id");
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let n=0, busy=0;
for(;;){
  let r;
  try { db.exec('BEGIN IMMEDIATE'); r = claim.get(me, Date.now()+60000); db.exec('COMMIT'); }
  catch (e) { if (e.errcode === 5) { busy++; try{db.exec('ROLLBACK')}catch{}; continue; } throw e; }
  if(!r) break; n++; sleep(1);
}
console.log(me, 'claimed', n, 'busyRetries', busy);
