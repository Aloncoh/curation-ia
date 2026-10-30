import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(process.argv[2]);
db.exec("PRAGMA journal_mode=WAL; DROP TABLE IF EXISTS jobs; CREATE TABLE jobs(id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending', owner TEXT, lease_until INTEGER);");
const ins = db.prepare("INSERT INTO jobs(status) VALUES('pending')");
db.exec('BEGIN'); for (let i=0;i<3000;i++) ins.run(); db.exec('COMMIT');
console.log(db.prepare('PRAGMA journal_mode').get());
