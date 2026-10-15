// A print profile's typed cells, read again from its raw cells by the build's own parsers: the one reading the import's
// page-read path (scripts/ingest/read-proposals.mjs), the proposal applier (read-proposals-apply.mjs) and the migrations
// that correct a profile share, so what a migration writes is what the build would read (PARSE-MISMATCH, D49, D115).
// Lifted from migration m290 (2026-10-02), where it was first written, when the migrations left the working tree
// (maintainability round, 2026-10-15): living code no longer imports a run-once migration.
import { parseTemperature, parseDrying, parseEnclosure } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW, readAbrasion } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';

/** Each raw profile column, and the typed columns the build reads from it. */
export const TYPED = {
  'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'],
  'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'],
  Enclosure: ['Enclosure state'],
  Drying: ['Drying state', 'Drying need', 'Drying °C', 'Drying hours', 'Drying hours open'],
  'Abrasion / clogging': ['Hardened nozzle'],
  'Nozzle material': ['Hardened nozzle'],
  'Nozzle diameter': ['Hardened nozzle'],
};

/** The typed cells the parsers read from a profile row's raw cells. */
export const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
  bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
  enclosure: parseEnclosure(row.Enclosure),
  drying: parseDrying(row.Drying),
  abrasion: readAbrasion(row),
});

/** Write the typed cells of the given raw columns from the parsers' reading of the row; returns how many changed. */
export const retype = (t, id, columns, migration) => {
  const row = t.get('profiles', id);
  const typed = typedOf(row);
  let n = 0;
  for (const c of columns.flatMap((col) => TYPED[col])) {
    if (row[c] !== typed[c]) { t.set('profiles', id, c, typed[c], { expect: row[c], migration }); n++; }
  }
  return n;
};
