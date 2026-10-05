#!/usr/bin/env node
// Migration m290 (2026-10-02): the print settings the profile root-cause sweep found missing, cut short or taken from the
// wrong table, on every profile at once rather than on a sample.
//
// Five random draws after the error-class sweep still found 3 to 9 profiles in 40 wrong, each a different layout. So a
// script marked every line of every guidance sheet that could hide such an error, without understanding the layout: a
// setting-like number or statement no profile of the sheet holds, a held number found only under a specimen heading or
// beside another setting's label, a cell not printed as one run of words, two copies of one product's profile that
// disagree (PM-TRIAL-2026-10-01/data-audit/profiles/detect.mjs; on the tables before m285 it caught 27 of the 27 known
// errors it is meant to). Six Claude Sonnet readers judged the 1,412 marks on 681 sheets from the sheet text around
// each; Claude Opus grouped what they found by cause and settled what one reader's words could not say alone. Each row
// of m290-profile-settings.csv is one cell: the sheet's own words (full-width punctuation made plain outside Chinese),
// the quote they are printed in (checked here on the cached sheet), and the parsers' reading in the typed cells.
//
// Causes, and how many cells: drying stated in a sentence or a footnote, or its hours printed on the row below (about
// 90); SUNLU's "Room Temp." row answered "Normal temperature" or 常温 (18); a setting under a label the import did not
// know or beside another column (about 30); LUVOCOM 3F's nozzle taken from the extrusion table, not the 3D printing line
// (6); a nozzle or enclosure statement in prose (about 15). Bands of nozzle temperature per print speed or nozzle size
// are m291; copies of one product's profile are m292; dry-box advice is m293.
//
//   node scripts/migrate/m290-profile-settings.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed, reviewFields } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm290';
const here = dirname(fileURLToPath(import.meta.url));
export const TYPED = { 'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'], 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying need', 'Drying °C', 'Drying hours', 'Drying hours open'], 'Abrasion / clogging': ['Hardened nozzle'] };
export const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
/** Write the typed cells of the given raw columns from the parsers' reading of the row. */
export const retype = (t, id, columns, migration) => {
  const row = t.get('profiles', id); const typed = typedOf(row); let n = 0;
  for (const c of columns.flatMap((col) => TYPED[col])) if (row[c] !== typed[c]) { t.set('profiles', id, c, typed[c], { expect: row[c], migration }); n++; }
  return n;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const t = openTables();
  let n = 0;
  for (const e of rowsOf(join(here, `${MIGRATION}-profile-settings.csv`))) {
    const r = t.get('profiles', e.id);
    if (r[e.column] === e.value) continue;
    onSheet(t, r.SourceID, e.quote, MIGRATION);
    t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
    retype(t, e.id, [e.column], MIGRATION);
    n++;
  }
  // The parsers learned the wordings this sweep found (process.js: SUNLU's "Normal temperature" and 常温, "does not
  // require a heated chamber", "enclosed-chamber printing", "use of brass nozzle" ...); a profile elsewhere that prints
  // one is typed again, except in a column its Parse review explains (D115).
  let retyped = 0;
  for (const r of t.rows('profiles')) {
    const typed = typedOf(r); const reviewed = reviewFields(r) ?? new Set();
    for (const c of Object.values(TYPED).flat()) {
      if (r[c] === typed[c] || reviewed.has(c)) continue;
      t.set('profiles', r.ProfileID, c, typed[c], { expect: r[c], migration: MIGRATION });
      retyped++;
      console.log(`  ${r.ProfileID} ${c}: ${r[c]} -> ${typed[c]}`);
    }
  }
  // A review that explained a wording the parsers now read explains nothing in that column (PARSE-REVIEW-STALE).
  let reviews = 0;
  for (const r of t.rows('profiles')) {
    const fields = reviewFields(r); if (!fields?.size) continue;
    const typed = typedOf(r);
    const still = [...fields].filter((c) => !Object.values(TYPED).flat().includes(c) || r[c] !== typed[c]);
    if (still.length === fields.size) continue;
    const now = r['Parse review'].replace(/^Fields:\s*[^.]*\.\s*/, `Fields: ${still.length ? still.join(', ') : 'none'}. `) + ` (${MIGRATION}: the parsers read ${[...fields].filter((c) => !still.includes(c)).join(', ')} from the words since the profile root-cause sweep.)`;
    t.set('profiles', r.ProfileID, 'Parse review', now, { expect: r['Parse review'], migration: MIGRATION });
    reviews++;
  }
  t.save();
  console.log(`${MIGRATION}: ${n} cells written, ${retyped} typed cells read again, ${reviews} reviews scoped again`);
}
