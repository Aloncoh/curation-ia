// Estimation du budget : `npm run budget` écrit exports/budget.md. Aucun réseau, aucun appel au modèle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { coutChaine, coutMensuel, FLUX_MENSUEL_MINIMAL, HYPOTHESES, TARIFS_ESTIMATION, VERIFICATION_TYPE, verificateurDe, VOLUMES_MENSUELS, type Hypotheses } from '../analysis/estimation.ts';

const dollars = (v: number) => (v < 0.01 ? `${v.toFixed(5)} $` : v < 1 ? `${v.toFixed(3)} $` : `${v.toFixed(2)} $`);

function tableau(h: Hypotheses): string[] {
  return [
    `### Hypothèse ${h.nom}`,
    '',
    '| Modèle | Qualification | Rédaction | Une actualité retenue | Une publication | 100 publications | 100 avec un autre modèle en vérification |',
    '|---|---|---|---|---|---|---|',
    ...Object.entries(TARIFS_ESTIMATION).map(([nom, t]) => {
      const c = coutChaine(t, h);
      const v = coutChaine(t, h, { modele: verificateurDe(nom), ...VERIFICATION_TYPE });
      return `| ${t.nom} | ${dollars(c.qualification)} | ${dollars(c.redaction)} | ${dollars(c.par_actualite_retenue)} | ${dollars(c.par_publication)} | ${dollars(c.par_publication * 100)} | ${dollars(v.par_publication * 100)} |`;
    }),
    '',
    `| Modèle | ${VOLUMES_MENSUELS.map((n) => `${n} publications/mois`).join(' | ')} |`,
    `|---|${VOLUMES_MENSUELS.map(() => '---').join('|')}|`,
    ...Object.values(TARIFS_ESTIMATION).map((t) => `| ${t.nom} | ${VOLUMES_MENSUELS.map((n) => dollars(coutMensuel(coutChaine(t, h), n, FLUX_MENSUEL_MINIMAL).cout)).join(' | ')} |`),
    '',
  ];
}

const document = [
  '# Budget estimé du texte',
  '',
  `Estimation sans aucun appel au modèle. Tarifs relevés le ${TARIFS_ESTIMATION['deepseek-flash']!.releve_le}. Plancher mensuel : ${FLUX_MENSUEL_MINIMAL} actualités analysées, mesuré et sous-estimé.`,
  '',
  ...HYPOTHESES.flatMap(tableau),
].join('\n');

mkdirSync('exports', { recursive: true });
writeFileSync('exports/budget.md', document);
console.log(document);
