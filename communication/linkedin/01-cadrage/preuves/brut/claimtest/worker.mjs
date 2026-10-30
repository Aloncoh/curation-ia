import { DatabaseSync } from 'node:sqlite';
const [file, me, startAt] = process.argv.slice(2); while (Date.now() < Number(startAt)) {}
const db = new DatabaseSync(file, { timeout: 5000 });
const claim = db.prepare("UPDATE jobs SET status='leased', owner=?, lease_until=? WHERE id=(SELECT id FROM jobs WHERE status='pending' ORDER BY id LIMIT 1) RETURNING id");
let n=0;
for(;;){ db.exec('BEGIN IMMEDIATE'); const r = claim.get(me, Date.now()+60000); db.exec('COMMIT'); if(!r) break; n++; }
console.log(me, 'claimed', n);
