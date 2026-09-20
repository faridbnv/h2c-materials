#!/usr/bin/env node
// Migration m75 (2026-09-19): two heat deflection values that are an annealing temperature.
//
// Spectrum's PLA Matt sheet prints its heat deflection rows as
//
//   0.45 MN/m2, annealed (4h @ 90°C)   116°C   ISO 75
//   1.81 MN/m2, annealed (4h @ 90°C)    66°C   ISO 75
//
// and b02 recorded 90 °C for both: the reader took the first number-and-unit pair on the line, and that pair is
// the annealing temperature inside the brackets. The pair 90/90 is also what a heat deflection cannot be — a
// lighter load cannot deflect a bar at the same temperature as a heavier one — but nothing checked equal values.
//
// Re-read from the cached document, whose SHA-256 is the one sources.csv records, page 1. The values are
// corrected to what the sheet prints, the locator and Standard / load are restored to the row's own words, and
// the annealing schedule the sheet states goes into the columns that own it (Anneal °C, Anneal h), which the
// parser now reads from the short form the sheet writes it in.
//
// What the pipeline learned from this is in scripts/ingest/propose.mjs: a value a sheet prints inside brackets
// is the row's conditions and not its result, wherever the line offers one outside them.
//
//   node scripts/migrate/m75-spectrum-pla-matt-hdt.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const DATE = '2026-09-19';
const NOTE = `Corrected ${DATE} (m75): b02 recorded 90 °C, which is the annealing temperature the sheet prints in brackets on the same line ("annealed (4h @ 90°C)"), not the heat deflection. Re-read from the source document, page 1 (SHA-256 recorded in sources.csv).`;

const ROWS = [
  { id: 'V002780', was: '90', now: '116', load: '0.45 MN/m2' },
  { id: 'V002781', was: '90', now: '66', load: '1.81 MN/m2' },
];

let n = 0;
for (const { id, was, now, load } of ROWS) {
  const row = t.rows('measurements').find((m) => m.MeasurementID === id);
  if (!row || row['Raw numeric'] !== was) continue;
  t.set('measurements', id, 'Raw value', `${now} °C`, { expect: `${was} °C` });
  t.set('measurements', id, 'Raw numeric', now, { expect: was });
  t.set('measurements', id, 'Normalized value', now, { expect: was });
  t.set('measurements', id, 'Data status', 'Published value (transcription corrected)', { expect: 'Published value' });
  t.set('measurements', id, 'Post-processing', 'annealed (4h @ 90°C)', { expect: 'annealed' });
  t.set('measurements', id, 'Anneal °C', '90', { expect: 'Not published' });
  t.set('measurements', id, 'Anneal h', '4', { expect: 'Not published' });
  t.set('measurements', id, 'Standard / load', `${load} annealed 4h 90°C ISO 75`, { expect: `${load} annealed 4h ISO 75` });
  t.set('measurements', id, 'Locator', `p. 1: Heat Deflection Temperature ${load}, annealed (4h @ 90°C)`, { expect: `p. 1: Heat Deflection Temperature ${load}, annealed (4h @` });
  t.set('measurements', id, 'Notes', `${row.Notes} ${NOTE}`, { expect: row.Notes });
  n += 10;
}

if (n) t.save();
console.log(`${n} cell(s) written`);
