#!/usr/bin/env node
// Migration m285 (2026-10-01): print settings the import's own sheet reader finds on a profile's sheet and the profile
// does not hold, and what the control re-read of the swept database found besides (the data audit's RC8, RC2, RC3).
//
// A fresh random re-read of 30 print profiles after m276–m284 still found eight wrong: settings printed under labels
// nobody had listed ("Hot pad", "Closure chamber", "Drying Preparation"), a drying schedule cut before its hours, a
// window with no unit, a bed "< 80°C" typed as the point 80, and a question answered on the line before it ("Dry box
// recommended / Yes / No / Ruby or hardened nozzle recommended", where "No" answers the nozzle). The guard's own label
// list had found what someone thought of; `npm run audit:context` now runs the import's sheet reader
// (`scripts/ingest/propose.mjs`, readSheet, its lexicon taught the three labels) over every profile's sheet, and lists
// every setting it reads that the profile does not hold. Each row of m285-print-settings.csv is one of those, curated by
// Claude Opus from the cached sheet: the sheet's own words in the raw cell, full-width punctuation made plain, and the
// parsers' reading in the typed ones. Left out: a prose fragment the reader took for an enclosure (P0470), a colorFabb
// table row another profile of the product holds (P0513), and an enclosure row P0307 already holds as its chamber.
//
//   node scripts/migrate/m285-print-settings-the-reader-finds.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { correct } from './source-edits.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm285';
const here = dirname(fileURLToPath(import.meta.url));
const TYPED = { 'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'], 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'], 'Abrasion / clogging': ['Hardened nozzle'] };
const t = openTables();
const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
const retype = (id, columns) => {
  const row = t.get('profiles', id); const typed = typedOf(row); let n = 0;
  for (const c of columns) if (row[c] !== typed[c]) { t.set('profiles', id, c, typed[c], { expect: row[c], migration: MIGRATION }); n++; }
  return n;
};
let n = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-print-settings.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, r.SourceID, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  retype(e.id, TYPED[e.column]);
  n++;
}

// "< 80°C" is at most 80, with no lower end published: six beds were typed as the point (the parser reads it since m285).
for (const id of ['P0182', 'P0183', 'P0200', 'P0210', 'P0413', 'P0782']) n += retype(id, TYPED['Bed °C']) ? 1 : 0;
// P1322's review explained the open lower end the parser now reads itself; it still explains the nozzle permission.
{
  const r = t.get('profiles', 'P1322');
  const now = r['Parse review'].replace(/^Fields: Bed min °C, Hardened nozzle\. /, 'Fields: Hardened nozzle. ');
  if (now !== r['Parse review']) { t.set('profiles', 'P1322', 'Parse review', now, { expect: r['Parse review'], migration: MIGRATION }); n++; }
}

// Polymaker PolyMide CoPA prints its recorded mechanical table under "(Dry Status)"; its "(Wet Status)" table, below,
// was never transcribed (OPEN-PROBLEMS §28).
const COPA = 'S-POLYCN-TDS-Polymaker-PolyMide-CoPA-V5-5-2026-01-06-EN';
onSheet(t, COPA, '(Dry Status) | Young’s modulus (X-Y) 2703 ± 259 MPa | Notched charpy impact strength (X-Y) 6.9 ± 1.4 kJ/m | (Wet Status)', MIGRATION);
n += correct(t, { source: COPA, ids: ['V003792', 'V003793', 'V003794', 'V003795', 'V003796', 'V003797', 'V003798', 'V003799', 'V003800'], migration: MIGRATION, date: '2026-10-01',
  set: { 'Moisture condition': ['Not published', 'Dry Status'], 'Moisture state': ['not-stated', 'dry'] },
  note: 'the row sits in the table the sheet heads "(Dry Status)"; the "(Wet Status)" table below it is another (re-read by Claude Opus, the control re-read of the error-class sweep).' });

t.save();
console.log(`${MIGRATION}: ${n} records corrected`);
