#!/usr/bin/env node
// Migration m10: test conditions corrected against the data sheets, re-read 2026-09-14 (D35; every file's
// SHA-256 matched sources.csv).
//
// Polymaker data sheets print two tables of the same properties, each followed by its preparation note. The
// original transcription gave every row of a sheet one set of conditions, so the two tables could not be told
// apart (lint MEAS-DUPLICATE found V001184 = V001196; they are the dry and the conditioned results):
//
//  - PolyMide PA6-GF p. 4 and PolyMide CoPA p. 4: the first table is dry (annealed, dried 48 h), the second
//    conditioned (70% RH, 15 days). The dry rows said "Conditioned: 70% RH"; the conditioned rows carried the
//    dry note. The retired copies of the CoPA rows are corrected the same way.
//  - PolyMide PA12-CF p. 4: the second table was immersed in water for 3 days; its rows said "Dry".
//  - PolySonic PLA p. 3: the tables are classic speed (46.7 mm/s, 210 °C) and high speed (300 mm/s, 230 °C);
//    every row held a paste of the first table instead of its print parameters.
//  - HT-PLA-GF p. 3-4: the annealed Vicat, HDT and tensile/flexural rows were not marked annealed (the two
//    annealed Charpy rows already were); the as-printed notched Charpy row had no direction, and its Z value was
//    never transcribed.
//  - PolyMide CoPA p. 4: the -30 °C notched Charpy result was never transcribed.
//
// Values never change here, only conditions, and two published values are added. Each edit names the value
// it replaces, so a re-run after the data moved stops instead of overwriting. Re-runnable.

import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `V${String(from + i).padStart(6, '0')}`);
const DATE = '2026-09-14';
const DRIED = 'Dried before testing (see preparation)';
const RH70 = 'Conditioned: 70% RH';

const note = (text) => `Test condition corrected ${DATE} (m10) against the data sheet: ${text}`;
const PA6GF_DRY = 'All specimens were annealed at 80˚C for 6h and dried for 48h prior to testing';
const COPA_DRY = 'All specimens were annealed at 80˚C for 30min and dried for 48h prior to testing';
const PA12CF_DRY = 'All specimens were annealed at 80˚C for 24h and dried for 48h prior to testing';
const POLYSONIC_PASTE = /^printing temperature = 210 °C Young’s modulus \(X -Y\) ISO 527/;
const HTPLAGF_ANNEALED = 'Annealed (per TDS annealed block)';

/** Each correction: the rows, and per field the value it must replace and the value it writes. */
export const CORRECTIONS = [
  { source: 'S-POLYCN-PolyMide-PA6-GF-TDS-V5-1', ids: range(1179, 1190), set: { 'Moisture condition': [RH70, DRIED] },
    note: 'p. 4 first table, annealed at 80 °C for 6 h and dried for 48 h before testing.' },
  { source: 'S-POLYCN-PolyMide-PA6-GF-TDS-V5-1', ids: range(1191, 1199),
    set: { 'Post-processing': [PA6GF_DRY, 'All specimens were annealed at 80 °C for 6 h, and conditioned at 70% relative humidity and ambient temperature for 15 days prior to testing'] },
    note: 'p. 4 second table, conditioned at 70% RH for 15 days before testing.' },
  ...[[1023, 1034], [862, 873], [1089, 1100]].map(([a, b]) => ({ source: 'S-POLYCN-PolyMide-CoPA-TDS-V5-2', ids: range(a, b), set: { 'Moisture condition': [RH70, DRIED] },
    note: 'p. 4 first table, annealed at 80 °C for 30 min and dried for 48 h before testing.' })),
  ...[[1035, 1043], [874, 882], [1101, 1109]].map(([a, b]) => ({ source: 'S-POLYCN-PolyMide-CoPA-TDS-V5-2', ids: range(a, b),
    set: { 'Post-processing': [COPA_DRY, 'All specimens were annealed at 80 °C for 30 min, and conditioned at 70% relative humidity and ambient temperature for 15 days prior to testing'] },
    note: 'p. 4 second table, conditioned at 70% RH for 15 days before testing.' })),
  { source: 'S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1', ids: range(992, 1000),
    set: { 'Moisture condition': ['Dry', 'Conditioned: water immersion'], 'Post-processing': [PA12CF_DRY, 'All specimens were annealed at 80 °C for 24 h, and immersed in ambient-temperature water for 3 days prior to testing'] },
    note: 'p. 4 second table, immersed in water for 3 days before testing.' },
  { source: 'S-POLYCN-PolySonic-PLA-EN-V5-3-TDS', ids: range(9, 16),
    set: { 'Specimen / print parameters': [POLYSONIC_PASTE, 'Printing temperature 210 °C / 230 °C, bed 25 °C, 2 shells, 3 top and bottom layers, 100% infill, environment 25 °C, cooling fan on; conditioned at room temperature for 24 h (p. 6)'] },
    note: 'p. 6 lists both print temperatures; the thermal rows do not say which specimens were used.' },
  { source: 'S-POLYCN-PolySonic-PLA-EN-V5-3-TDS', ids: range(17, 28),
    set: { 'Specimen / print parameters': [POLYSONIC_PASTE, 'Classic printing speed 46.7 mm/s, printing temperature 210 °C, 0.4 mm nozzle, 0.2 mm layers; bed 25 °C, 2 shells, 3 top and bottom layers, 100% infill, cooling fan on (p. 3, p. 6)'] },
    note: 'p. 3 first table, classic printing speed.' },
  { source: 'S-POLYCN-PolySonic-PLA-EN-V5-3-TDS', ids: range(29, 37),
    set: { 'Specimen / print parameters': [POLYSONIC_PASTE, 'High printing speed 300 mm/s, printing temperature 230 °C, 0.4 mm nozzle, 0.2 mm layers; bed 25 °C, 2 shells, 3 top and bottom layers, 100% infill, cooling fan on (p. 3, p. 6)'] },
    note: 'p. 3 second table, high printing speed.' },
  { source: 'S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1', ids: [...range(351, 353), ...range(365, 374)],
    set: { 'Post-processing': ['Not published', HTPLAGF_ANNEALED] },
    note: 'the second block of results is marked "(annealed)" on p. 3 and follows the as-printed block on p. 4; the annealing schedule used for the specimens is not stated (p. 2 recommends 80-100 °C for 20-30 min).' },
  { source: 'S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1', ids: ['V000364'],
    set: { Direction: ['Not published', 'XY'], Locator: ['p. 4: Notched Charpy impact', 'p. 4: Notched Charpy impact strength (X-Y)'] },
    note: 'p. 4 prints this as-printed result as "Notched Charpy impact strength (X-Y)".' },
];

/** Published values that were never transcribed: a template row, and the fields that differ. */
export const ADDITIONS = [
  { like: 'V000364', source: 'S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1',
    set: { 'Raw value': '4.28±0.18 kJ/m2', 'Raw numeric': '4.28', 'Raw uncertainty ±': '0.18', 'Normalized value': '4.28', 'Normalized uncertainty ±': '0.18', Direction: 'Z', Locator: 'p. 4: Notched Charpy impact strength (Z)' },
    note: `Added ${DATE} (m10): the as-printed Z result on p. 4 was never transcribed.` },
  { like: 'V001033', source: 'S-POLYCN-PolyMide-CoPA-TDS-V5-2',
    set: { 'Raw value': '4.5 ± 1.5 kJ/m2', 'Raw numeric': '4.5', 'Raw uncertainty ±': '1.5', 'Normalized value': '4.5', 'Normalized uncertainty ±': '1.5', 'Moisture condition': DRIED,
      'Test temperature': '-30°C', 'Standard / load': 'ISO 179-1/1eA:2010', Notch: 'Notched', Locator: 'p. 4: Low temperature impact strength (X-Y), -30°C' },
    note: `Added ${DATE} (m10): the -30 °C notched Charpy result in the dry table on p. 4 was never transcribed.` },
];

const NA = 'Not applicable';
const withNote = (before, text) => (before == null || before === NA ? text : before.includes(text) ? before : `${before} ${text}`);

export function migrate(t) {
  for (const c of CORRECTIONS) {
    for (const id of c.ids) {
      const row = t.get('measurements', id);
      if (row.SourceID !== c.source) throw new Error(`m10: ${id} cites ${row.SourceID}, not ${c.source}`);
      let changed = false;
      for (const [field, [from, to]] of Object.entries(c.set)) {
        if (row[field] === to) continue;
        if (from instanceof RegExp ? !from.test(row[field] ?? '') : row[field] !== from) throw new Error(`m10: ${id} ${field} is "${row[field]}"; expected ${from}; the data moved since this correction was written`);
        t.set('measurements', id, field, to, { expect: row[field] });
        changed = true;
      }
      if (changed) t.set('measurements', id, 'Notes', withNote(row.Notes, note(c.note)), { expect: row.Notes });
    }
  }
  const rows = t.rows('measurements');
  for (const a of ADDITIONS) {
    if (rows.some((r) => r.SourceID === a.source && r.Locator === a.set.Locator)) continue; // already added
    const like = t.get('measurements', a.like);
    const id = nextId('measurements', rows.map((r) => r.MeasurementID));
    t.append('measurements', { ...like, ...a.set, MeasurementID: id, Notes: a.note });
  }
  for (const source of new Set([...CORRECTIONS, ...ADDITIONS].map((c) => c.source))) {
    const s = t.get('sources', source);
    if (s['Access date'] !== DATE) t.set('sources', source, 'Access date', DATE, { expect: s['Access date'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const changes = t.save();
  const by = new Map();
  for (const c of changes) by.set(`${c.table}.${c.field ?? c.action}`, (by.get(`${c.table}.${c.field ?? c.action}`) ?? 0) + 1);
  for (const [k, n] of by) console.log(`${String(n).padStart(5)}  ${k}`);
  console.log(`${changes.length} change(s)`);
}
