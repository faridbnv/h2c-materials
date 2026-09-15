#!/usr/bin/env node
// Migration m08: typed canonical columns beside the raw text the build interprets (build/src/typed-values.js).
//
// profiles: Nozzle/Bed/Chamber state, min °C, max °C, requirement; Enclosure state; Drying state, °C, hours;
// Hardened nozzle; Parse review. measurements: Test load MPa for HDT rows; Parse review.
// Every value is the current parser's reading, so nothing the build decides changes; from here on the
// stored value is authoritative and the parser checks it. Re-runnable.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';
import { TEMP_WINDOW } from '../../build/src/compile.js';
import { PROFILE_TYPED_COLUMNS, MEASUREMENT_TYPED_COLUMNS, profileCellsFromParsed, loadCellFromParsed } from '../../build/src/typed-values.js';

export function migrate(t) {
  if (t.header('profiles').includes('Nozzle state')) return; // already applied
  const profileCells = new Map(t.rows('profiles').map((r) => [r.ProfileID, profileCellsFromParsed({
    nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
    bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
    enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying), abrasion: parseAbrasion(r['Abrasion / clogging']),
  })]));
  for (const { after, columns } of PROFILE_TYPED_COLUMNS) {
    let prev = after;
    for (const c of columns) {
      t.addColumn('profiles', c, { after: prev, fill: (r) => (c === 'Parse review' ? 'Not applicable' : profileCells.get(r.ProfileID)[c]) });
      prev = c;
    }
  }
  for (const { after, columns } of MEASUREMENT_TYPED_COLUMNS) {
    let prev = after;
    for (const c of columns) {
      t.addColumn('measurements', c, {
        after: prev,
        fill: (r) => (c === 'Parse review' ? 'Not applicable' : loadCellFromParsed(r.Property === 'HDT' ? parseHdtStandard(r['Standard / load']) : null)),
      });
      prev = c;
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
