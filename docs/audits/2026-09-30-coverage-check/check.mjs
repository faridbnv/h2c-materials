// The coverage page, cell by cell, against the records (D74, D114): the matrix the Data coverage lens draws
// (app/js/engine/coverage.js) for every material in scope, compared with what `coverage-rules.js` says its own records
// hold. A cell that says evidence without records, or a gap beside them, is a mismatch; a blank cell outside Application
// is a domain nobody reports on. It also counts the conflicts recorded where the grid has no column.
//
//   node docs/audits/2026-09-30-coverage-check/check.mjs     needs npm run build
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const { coverageMatrix, COVERAGE_DOMAINS } = await import(join(root, 'app/js/engine/coverage.js'));
const { domainData } = await import(join(root, 'build/src/coverage-rules.js'));
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));

const GRID = COVERAGE_DOMAINS.filter((d) => d !== 'Sparse properties');
const EVIDENCE = new Set(['Evidence recorded', 'Resolved']);
const materials = db.materials.filter((m) => !m.familyEntry);
const mismatches = [], blanks = {}, tally = {};
for (const row of coverageMatrix(materials, db.coverage, GRID)) {
  const m = materials.find((x) => x.id === row.materialId);
  const data = domainData(db, m);
  row.cells.forEach((cell, i) => {
    const domain = GRID[i];
    const key = `${domain} | ${cell.status ?? 'blank'}`;
    tally[key] = (tally[key] ?? 0) + 1;
    if (!cell.status) blanks[domain] = (blanks[domain] ?? 0) + 1;
    if (data[domain] === undefined) return;
    const has = data[domain].length > 0;
    if ((has && (cell.status === 'Gap' || !cell.status)) || (!has && EVIDENCE.has(cell.status))) mismatches.push(`${m.id} ${m.name}, ${domain}: ${cell.status ?? 'blank'} with${has ? '' : 'out'} records`);
  });
}
const outside = db.coverage.filter((c) => !COVERAGE_DOMAINS.includes(c.domain) && ['Conflict', 'Quarantined'].includes(c.status)).map((c) => `${c.materialId} ${c.domain} (${c.status})`);
console.log(JSON.stringify({ release: db.meta.release.id, materials: materials.length, mismatches, blanks, conflictsOutsideTheGrid: outside, cells: tally }, null, 1));
if (mismatches.length) process.exit(1);
