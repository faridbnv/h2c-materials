#!/usr/bin/env node
// Migration m376 (2026-10-05): Bambu Lab's sheets say once how every test bar was printed and prepared, and six sheets'
// rows did not carry it (check round 3, D131; a reader found it on Bambu TPU 85A's V000830, and the sweep over every
// sheet that states a preparation found the rest).
//
// Bambu's sheets print, under their test table: "* All the specimens were printed at the following settings: ... All
// the specimens were annealed and dried at 55 °C for 8 h before testing" (or "were dried at 70 °C for 12 h before
// testing. It's not recommended to anneal" on its soft TPUs). On 31 of its sheets every row but melt flow carries that
// sentence: Post-processing holds it, with its state and schedule, Moisture condition "Dried before testing (see
// preparation)", Moisture state dry, and Specimen type "Printed specimen" where the sheet says the bars were printed
// (density keeps its own). Six sheets' rows
// carry none of it, or lack it on their physical rows: the V3.0 PC sheet (20 rows), TPU 85A and TPU 90A (18 each), and
// the V3.0 PLA Basic, PLA Matte and PLA Tough+ sheets (their density, melting, glass-transition and water rows). They
// are typed as their siblings are. A value measured annealed then stands for the product annealed, not as printed (D99).
// Melt flow is measured on the filament, not on a bar, and stays as it is. Each quote is checked on the cached sheet. A
// re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m376-what-every-bar-went-through.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm376';
const NP = 'Not published';
const DRIED = 'Dried before testing (see preparation)';
// [source, the sentence as the sheet prints it, annealed (°C, h) or null for dried only]
const SHEETS = [
  ['B-PC-Bambu-PC-Technical-Data-Sheet', 'specimens were annealed and dried at 80 °C for 12 h before testing', [80, 12]],
  ['B-PC-Bambu-PLA-Basic-Technical-Data-Sheet', 'All the specimens were annealed and dried at 55 °C for 8 h before testing', [55, 8]],
  ['B-PC-Bambu-PLA-Matte-Technical-Data-Sheet', 'All the specimens were annealed and dried at 55 °C for 8 h before testing', [55, 8]],
  ['B-PC-new-Bambu-PLA-Tough-Technical-Data-Sheet', 'All the specimens were annealed and dried at 50 °C for 8 h before testing', [50, 8]],
  ['B-TPU-SOFT-TDS-4', 'specimens were dried at 70 °C for 12 h before testing', null],
  ['B-TPU-SOFT-TDS-5', 'specimens were dried at 70 °C for 12 h before testing', null],
];
const OFF_THE_BAR = /^(Melt (?:mass|volume)-flow rate|Hardness)$/;
const t = openTables();
let rows = 0;

for (const [sid, words, anneal] of SHEETS) {
  onCachedSheet(t, sid, words, MIGRATION);
  // A bar is a printed one where the sheet says so; the V3.0 PLA sheets do not, and their rows keep their specimen type.
  const printed = !/^B-PC-(?:Bambu-PLA|new-Bambu-PLA)/.test(sid);
  if (printed) onCachedSheet(t, sid, 'All the specimens were printed at the following settings', MIGRATION);
  const sentence = `All the ${words.replace(/^All the /, '')}`;
  for (const m of t.rows('measurements').filter((x) => x.SourceID === sid && !x['Data status'].startsWith('Retired') && !OFF_THE_BAR.test(x.Property))) {
    const set = (column, value) => { if (m[column] !== value) { t.set('measurements', m.MeasurementID, column, value, { expect: m[column], migration: MIGRATION }); return 1; } return 0; };
    let n = 0;
    if (m['Moisture state'] === 'not-stated') {
      n += set('Moisture condition', anneal ? DRIED : sentence);
      n += set('Moisture state', 'dry');
    }
    if (anneal && m['Post-processing state'] === 'not-stated') {
      n += set('Post-processing', sentence);
      n += set('Post-processing state', 'annealed');
      n += set('Anneal °C', String(anneal[0]));
      n += set('Anneal h', String(anneal[1]));
    }
    if (printed && m.Property !== 'Density' && m['Specimen type'] === 'Not published (do not assume printed)') n += set('Specimen type', 'Printed specimen');
    if (n) rows++;
  }
}
if (rows) t.save();
console.log(`${MIGRATION}: ${rows} value(s) on ${SHEETS.length} Bambu Lab sheets typed with the preparation their sheet states once`);
