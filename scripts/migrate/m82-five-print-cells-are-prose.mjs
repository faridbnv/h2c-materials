#!/usr/bin/env node
// Migration m82 (2026-09-20): five print-setup cells that hold a sentence from the page.
//
// The same defect docs/OPEN-PROBLEMS.md §9 records, arriving in new data. Raise3D wraps "A wear-resistant
// nozzle, such as hardened steel and ruby nozzle, is highly recommended." so that the word nozzle begins a
// line, and the rest of the sentence was read as a nozzle temperature; 3D4Makers runs a paragraph together
// with no spaces at all and its tail was read as an enclosure requirement.
//
//   P0642, P0657, P0675   Nozzle °C   ", such as hardened steel and ruby nozzle, is highly recommended."
//   P0608, P0609          Enclosure   "s/casingsforconnectors,sensorsandmeasuringdevices.Availablein..."
//
// None of the five is a setting. The sentence Raise3D wraps is about the nozzle's material rather than its
// temperature, and the database has a column for that; what it does not have is the sheet's own words for it,
// so the cell says Not published rather than a recommendation nobody read off a row.
//
// What the reader learned is in scripts/ingest/propose.mjs: a setting is a value and not a sentence. A value
// never has a verb saying what the sheet advises, and a value that states no number and none of the words a
// state is written in says nothing in eighty characters it could not say in twenty.
//
//   node scripts/migrate/m82-five-print-cells-are-prose.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const ROWS = [
  ['P0642', 'Nozzle °C'], ['P0657', 'Nozzle °C'], ['P0675', 'Nozzle °C'],
  ['P0608', 'Enclosure'], ['P0609', 'Enclosure'],
];

let n = 0;
for (const [id, field] of ROWS) {
  const row = t.rows('profiles').find((p) => p.ProfileID === id);
  if (!row || row[field] === 'Not published') continue;
  t.set('profiles', id, field, 'Not published', { expect: row[field] });
  n += 1;
}

// The typed column beside a raw cell says what the words mean, and these words are gone: "is highly
// recommended" is what made the nozzle a requirement on three rows that state no temperature at all.
for (const id of ['P0642', 'P0657', 'P0675']) {
  const row = t.rows('profiles').find((p) => p.ProfileID === id);
  if (!row || row['Nozzle requirement'] !== 'required') continue;
  t.set('profiles', id, 'Nozzle requirement', 'unknown', { expect: 'required' });
  n += 1;
}

if (n) t.save();
console.log(`${n} cell(s) written`);
