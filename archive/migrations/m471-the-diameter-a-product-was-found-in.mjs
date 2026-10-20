#!/usr/bin/env node
// Migration m471 (2026-10-20): grades.csv gains Diameter, the filament diameter the product's documents print (D175).
//
// The owner's ruling of 2026-10-20 (GOALS-LOG, item 8; OPEN-PROBLEMS §37.5): "A product found only in 2.85 mm stays, with
// a small warning that the H2C takes 1.75 mm." Diameters were free text on the grades ("Check 1.75 mm variant; diameter
// is not part tolerance" on 1,163 of 1,184), so nothing could find such a product. The new column is typed against
// schema/vocab/diameters.csv: 1.75 mm where a document of the product prints it or a listing prices it (a listing is the
// 1.75 mm filament by rule), 2.85 mm only or 3 mm only where they print only that, Not published where none prints a
// diameter. Each cell is the reading scripts/lib/diameters.mjs makes of the cached text of every document the grade's
// records cite (the round's diameter-scan.csv lists it, quote by quote).
//
// Thirteen products read as 2.85 mm only. Claude Opus 5.5 read each on its pages: BigRep's twelve print "Diameter
// 2.85 mm" on every document and no other diameter (BigRep sells its filaments for its own large-format printers), so
// they are 2.85 mm only, their prose says so, and their detail and card warn. 3DXTECH CarbonX CF-PLA's product page
// lists a "2.85mm Variant sold out or unavailable" beside a variant its text does not name; that is not a product found
// only in 2.85 mm, so it is Not published, its prose saying why. No product reads 3 mm only. A run where another
// product reads larger-only stops, so a new one is read before it is written. Run where the source cache is.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m471-the-diameter-a-product-was-found-in.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { gradeDocuments, diameterCell } from '../../scripts/lib/diameters.mjs';

const MIGRATION = 'm471';
const COLUMN = 'Diameter';
const t = openTables();
const documentsOf = gradeDocuments((name) => t.rows(name));

// The products read on their pages: [grade, a source, the words that give its diameter].
const LARGER_ONLY = [
  ['G076-01', 'S-BVOH', 'Filament Diameter - 2.85 mm +/- 0.05'],
  ['G031-18', 'R-BIGREP-EU3iphIQD9hGhUQXiWWOXbYBhjDcb7BNHD3k8dPwoQCsQg', 'Diameter 2.85 mm'],
  ['G027-23', 'D-BIGREP-ABS-PAGE', 'Filament Diameter - 2.85 mm +/- 0.05'],
  ['G020-30', 'R-BIGREP-EajSvqXsqMZDmdON2v3rhnQBDgGH-1IuRzfjv5WgPXKsQA', 'Diameter 2.85 mm'],
  ['G039-34', 'R-BIGREP-EbCK6vuDEMZAre3SgyY8Y2IBbx5LFjMs5Zw5lH43SKl3iw', 'Diameter 2.85 mm'],
  ['G057-05', 'R-BIGREP-EVMGxLYZZHtFnUXJyVdjMDkBNtXAN2Bj7nRmZ37F91wPdQ', 'Diameter 2.85 mm'],
  ['G053-11', 'R-BIGREP-EWGmERRaxthJq-JOsmzhLY0BOTiqFYed5n0DaVMe-iZ1cQ', 'Diameter 2.85 mm'],
  ['G001-179', 'D-BIGREP-PLX-PAGE', 'Diameter 2.85 mm'],
  ['G001-189', 'D-BIGREP-RPLA-PAGE', 'Diameter 2.85 mm'],
  ['G168-01', 'R-BIGREP-Ec5wx9MmYX1KseTcD5XV1IABzL0ure69YNjObGyOPwDL-w', 'Diameter 2.85 mm'],
  ['G169-02', 'D-BIGREP-HI-TEMP-CF-PAGE', 'Diameter 2.85 mm'],
  ['G168-06', 'R-BIGREP-Edf9dbsNa39BiC-Vl1Fh9MwB917sFqJdBc2ekgXXAjmr3g', 'Diameter 2.85 mm'],
];
const NOT_SETTLED = {
  'G018-04': ['XP-carbonx-pla-cf-1', '2.85mm Variant sold out or unavailable',
    'Its product page lists a "2.85mm Variant sold out or unavailable" beside a variant its text does not name, and its sheet prints no diameter: not a product found only in 2.85 mm, so its Diameter is Not published (D175, m471).'],
};
const larger = new Map(LARGER_ONLY.map(([g, s, q]) => [g, { s, q }]));

const cellOf = new Map();
for (const g of t.rows('grades')) {
  const { read, priced } = documentsOf(g.GradeID);
  let cell = diameterCell(read, { priced });
  if (cell === '2.85 mm only' || cell === '3 mm only') {
    if (NOT_SETTLED[g.GradeID]) cell = 'Not published';
    else if (!larger.has(g.GradeID) || cell !== '2.85 mm only') throw new Error(`${MIGRATION}: ${g.GradeID} ${g.Manufacturer} ${g['Product name']} reads ${cell}; read its pages and list it here first`);
  } else if (larger.has(g.GradeID) || NOT_SETTLED[g.GradeID]) throw new Error(`${MIGRATION}: ${g.GradeID} no longer reads larger-only (${cell}); the data moved`);
  cellOf.set(g.GradeID, cell);
}

let changed = 0;
if (!t.header('grades').includes(COLUMN)) {
  t.addColumn('grades', COLUMN, { after: 'Diameter compatibility', fill: (r) => cellOf.get(r.GradeID) });
  changed++;
}
for (const g of t.rows('grades')) if (g[COLUMN] !== cellOf.get(g.GradeID)) throw new Error(`${MIGRATION}: ${g.GradeID}'s ${COLUMN} is ${g[COLUMN]}, the documents read ${cellOf.get(g.GradeID)}; the data moved`);

// What the prose says of the products read on their pages.
for (const [grade, { s, q }] of larger) {
  onSheet(t, s, q, MIGRATION);
  const g = t.get('grades', grade);
  const words = `Only 2.85 mm found: "${q}" (${s}), and no other diameter on its documents; the H2C takes 1.75 mm (D175, ${MIGRATION}).`;
  if (g['Diameter compatibility'] === words) continue;
  t.set('grades', grade, 'Diameter compatibility', words, { expect: g['Diameter compatibility'], migration: MIGRATION });
  changed++;
}
for (const [grade, [s, q, words]] of Object.entries(NOT_SETTLED)) {
  onSheet(t, s, q, MIGRATION);
  const g = t.get('grades', grade);
  if (g['Diameter compatibility'] === words) continue;
  t.set('grades', grade, 'Diameter compatibility', words, { expect: g['Diameter compatibility'], migration: MIGRATION });
  changed++;
}

// The rule, said once (AGENTS.md: a sentence the same on every row is a rule, in method.csv).
const RULE = 'The H2C takes 1.75 mm filament (the owner\'s ruling of 2026-10-20). A product\'s Diameter is what its documents print: 1.75 mm where a document or a listing of it gives that diameter, 2.85 mm only (or 3 mm only) where they give only a larger one, Not published where none prints a diameter. A product found only in a larger diameter is kept and counted, as its values describe its polymer as printed; its detail in the drawer and its card on the material\'s page say that only that filament was found (D175).';
const method = t.find('method', 'Filament diameter');
if (!method) { t.append('method', { Section: 'H2C', Topic: 'Filament diameter', 'Definition / rule': RULE }); changed++; }
else if (method['Definition / rule'] !== RULE) throw new Error(`${MIGRATION}: method's Filament diameter row is not the one this migration writes`);

if (changed) t.save();
const counts = [...cellOf.values()].reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map());
console.log(`${MIGRATION}: ${changed} change(s); ${[...counts].map(([k, n]) => `${n} ${k}`).join(', ')}`);
