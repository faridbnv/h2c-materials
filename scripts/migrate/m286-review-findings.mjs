#!/usr/bin/env node
// Migration m286 (2026-10-01): what the independent review of the error-class sweep found wrong, each re-read by Claude
// Opus from the cached sheet.
//
//   - QIDI PA12-CF p. 3 prints its Z values in the "Unannealed" column of a two-column table (the "Annealed" column is
//     "/"), under a footnote that describes the annealed column. A page statement (PC00012) gave all three annealed; it
//     now states no treatment, and the rows say their column.
//   - I-ESD-ABS heads only its thermal table "(After Annealing)", and its two HDT rows say so themselves; the page
//     statement (PC00041) reached the glass transition, printed under "Physical Properties".
//   - Two reviews explained a "℃" the test-temperature reader now reads (PARSE-REVIEW-STALE, measurement side).
//   - m278 wrote a normalised standard into five raw Standard / load cells; the raw cell keeps the sheet's words, and a
//     standard the sheet prints without its letter ("ASTM 648", "ASTM 3418") is not written for it.
//   - 3DJake's bed windows were recorded as a fragment ("± 35-60˚C") of a sentence that makes them conditional ("If you
//     have a heated bed the recommended temperature is …"), so they were typed required.
//   - Extrudr's DuraPro sheets print notched and unnotched ASTM D256 values under a "kj/m²" header; ASTM D256 reports J/m,
//     and the values (notched 100 to 220 for an ASA or an ABS) are J/m-sized. Two siblings were already flagged; the four
//     left are held out as an unresolved unit.
//
//   node scripts/migrate/m286-review-findings.mjs
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { correct, withNote } from './source-edits.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm286';
const DATE = '2026-10-01';
const t = openTables();
let n = 0;
const edit = (source, ids, set, note, quote) => { onSheet(t, source, quote, MIGRATION); return correct(t, { source, ids, set, note: `${note} (re-read by Claude Opus after the sweep's independent review)`, migration: MIGRATION, date: DATE }); };
const page = (id, set, why, quote) => {
  const r = t.get('page_context', id);
  onSheet(t, r.SourceID, quote, MIGRATION);
  let changed = false;
  for (const [field, [from, to]] of Object.entries(set)) {
    if (r[field] === to) continue;
    t.set('page_context', id, field, to, { expect: from, migration: MIGRATION }); changed = true;
  }
  if (changed) { t.set('page_context', id, 'Statement', withNote(r.Statement, why), { expect: r.Statement, migration: MIGRATION }); n++; }
};

// QIDI PA12-CF: the recorded Z values are the Unannealed column.
page('PC00012', { 'Post-processing state': ['annealed', 'not-stated'], 'Anneal °C': ['100', 'Not applicable'], 'Anneal h': ['8', 'Not applicable'] },
  '(m286: the annealing footnote describes the Annealed column, which p. 3 leaves "/"; the recorded rows are the Unannealed column and say so.)',
  'Post-processing : 100℃ Annealing 8hours | 38.61±2.19 MPa /');
n += edit('R-QIDI-PA12-CF', ['V009358', 'V009359', 'V009360'], { 'Post-processing': ['Not published', 'Unannealed'], 'Post-processing state': ['not-stated', 'as-printed'] },
  'the value sits in the table\'s "Unannealed" column (未退火); its "Annealed" column prints "/".', 'Unannealed Annealed | 38.61±2.19 MPa / | 2892.15±46.60 MPa / | 1.63±0.10 % /');

// I-ESD-ABS: "(After Annealing)" heads the thermal table only.
page('PC00041', { 'Post-processing state': ['annealed', 'not-stated'], 'Anneal °C': ['Not published', 'Not applicable'], 'Anneal h': ['Not published', 'Not applicable'] },
  '(m286: the heading covers the heat distortion rows, which state it themselves; the glass transition is printed under "Physical Properties".)',
  'Thermal Properties Standard Test Test Data (After Annealing) | Physical Properties Standard Test Test Data');

// Two measurement reviews that explain nothing now.
for (const id of ['V011542', 'V011543']) {
  const r = t.get('measurements', id);
  const now = r['Parse review'].replace(/^Fields: Test temperature °C\. /, 'Fields: none. ').replace(/$/, r['Parse review'].includes('m286') ? '' : ' The reader reads the glyph since the sweep (m286).');
  if (now !== r['Parse review']) { t.set('measurements', id, 'Parse review', now, { expect: r['Parse review'], migration: MIGRATION }); n++; }
}

// Raw Standard / load cells keep the sheet's words.
const RAW = [
  ['R-ULTIMAKER-MAKERBOT-MakerBot-', 'V007432', '66 psi 204°F ASTM 648; ASTM D648', '66 psi 204°F ASTM 648', 'Not published', 'Heat Deflection (ASTM 648, 66 psi)'],
  ['R-ULTIMAKER-MakerBot-Nylon-092', 'V011163', '66 psi 196°F ASTM 648; ASTM D648', '66 psi 196°F ASTM 648', 'Not published', 'ASTM 648'],
  ['R-FILAMENT2PRINT-PEEK-EV-Nat', 'V008886', 'HDT A; ISO 75', 'HDT-A ISO-R 75 Method A', 'ISO 75', 'Deflection temperature HDT-A 162 °C ISO-R 75 Method A'],
  ['R-MATTERHACKERS-PRO-SERIES-XKj', 'V008914', 'ASTM256; ASTM D256', 'ASTM256', 'Not published', 'ASTM256'],
  ['I-PLA-PLA-Silk-Dual-Color-TDS', 'V009856', 'ASTM 3418; ASTM D3418', 'ASTM 3418', 'Not published', 'ASTM 3418'],
];
for (const [prefix, id, from, to, standards, quote] of RAW) {
  const r = t.get('measurements', id);
  if (!r.SourceID.startsWith(prefix)) throw new Error(`${MIGRATION}: ${id} cites ${r.SourceID}`);
  n += edit(r.SourceID, [id], { 'Standard / load': [from, to], Standards: [r.Standards, standards] },
    `the raw cell held a standard the sheet does not print beside its own words ("${from}"); it keeps the sheet's words, and Standards lists only a standard they name.`, quote);
}

// 3DJake: a conditional bed window.
const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
for (const id of ['P0821', 'P0824', 'P0828', 'P0851', 'P0853', 'P0862', 'P0878', 'P0949', 'P0963']) {
  const r = t.get('profiles', id);
  const m = /^±\s*(\d+-\d+)˚C$/.exec(r['Bed °C']); if (!m) continue;
  const sentence = `If you have a heated bed the recommended temperature is ± ${m[1]}˚C`;
  onSheet(t, r.SourceID, sentence, MIGRATION);
  t.set('profiles', id, 'Bed °C', sentence, { expect: r['Bed °C'], migration: MIGRATION });
  const row = t.get('profiles', id); const typed = typedOf(row);
  for (const c of ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement']) if (row[c] !== typed[c]) t.set('profiles', id, c, typed[c], { expect: row[c], migration: MIGRATION });
  n++;
}

// Extrudr DuraPro: an ASTM D256 value under a kj/m² header, J/m-sized.
for (const [source, ids, quote] of [['R-EXTRUDR-durapro-asa-cf-TDS-en', ['V004094', 'V004095'], 'Notched impact strength ASTM D256 kj/m² 100 @ 23°C'],
  ['R-EXTRUDR-durapro-asa-TDS-en', ['V004149'], 'Unnotched impact strength ASTM D256 kj/m² 29 @ -30°C'], ['R-EXTRUDR-durapro-abs-TDS-en', ['V004271'], 'Unnotched impact strength ASTM D256 kj/m² 90 / -30°C']]) {
  n += edit(source, ids, { 'Data status': ['Published value', 'Unresolved unit / layout'] },
    'ASTM D256 reports J/m, the sheet heads the column kj/m², and its values (notched 100 to 220 for an ASA or an ABS) are J/m-sized; which unit they are in cannot be told, so the value is held out (its notched sibling on the ABS and ASA sheets is flagged physically implausible).', quote);
}

t.save();
console.log(`${MIGRATION}: ${n} records corrected`);
