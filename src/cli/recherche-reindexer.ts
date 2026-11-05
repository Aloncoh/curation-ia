// npm run recherche:reindexer -- --confirmer — réindexe chaque publication en ligne ou planifiée sur sa dernière révision,
// après un changement de ce que l'index contient (P6 bloc 4, 2026-11-05 : champs des actualités, produit et catégories).
// Aucun appel au modèle ; écrit seulement l'index de recherche, d'où --confirmer.
import { indexer } from '../recherche/index.ts';
import { runCommand } from './shared.ts';

await runCommand(async ({ database }) => {
  if (!process.argv.includes('--confirmer')) {
    console.log('Refus : ajouter --confirmer. Cette commande réécrit l’index de recherche de la base configurée.');
    process.exitCode = 1;
    return;
  }
  const r = await database.client.execute(`
    select p.id, (select id from post_revision x where x.post_id = p.id order by seq desc limit 1) as revision_id
    from post p where p.status in ('publie', 'en_attente') order by p.id`);
  let indexees = 0;
  for (const row of r.rows) {
    const tx = await database.client.transaction('write');
    try {
      if (await indexer(tx, Number(row.id), Number(row.revision_id))) indexees++;
      await tx.commit();
    } finally {
      tx.close();
    }
  }
  console.log(`${indexees} publication(s) réindexée(s) sur ${r.rows.length} lue(s).`);
});
