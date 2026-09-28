#!/usr/bin/env node
// Migration m212 (2026-09-28): the temperature Spectrum PLA Matt's heat deflection bars were annealed at is not the
// temperature they were tested at (the review of 2026-09-27, D07; version 2.1, F02 and F06; D97).
//
// Spectrum's sheet prints "Heat Deflection Temperature 0.45 MN/m2, annealed (4h @ 90°C)" and the same at 1.81 MN/m2
// (p. 1). The 90 °C is printed once, inside the annealing schedule. m118 re-read the rows "with the current reader" and
// gave both a test temperature of 90 °C as well: the reader took the first temperature on the line after the rates
// and standards were out of the way, and the schedule was not among them. Both rows' Anneal °C and Anneal h (90, 4)
// stand; their test temperature is the one the sheet does not state. The reader is corrected in the same change
// (scripts/ingest/propose.mjs), and the apply guard now refuses a number printed once that is given two roles (D97).
//
// The page is re-read here, on the cached text of the document whose bytes hash to the SHA-256 in sources.csv. The
// reviewer is an AI agent (claude-opus-5.5); the same reading was made independently by the review's data lane, also
// an agent, on 2026-09-27. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m212-an-anneal-is-not-a-test-temperature.mjs

import { readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
import { documentPath } from '../ingest/extract.mjs';
import { correct } from './source-edits.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm212-an-anneal-is-not-a-test-temperature';
const SOURCE = 'S-SPECTRUM-en-tds-spectrum-pla-matt';
// Each row as the page prints it: the label "Heat Deflection Temperature" on a line of its own, then a line per load.
const ROWS = [
  ['V002780', '0.45 MN/m2, annealed (4h @ 90°C) 116°C ISO 75'],
  ['V002781', '1.81 MN/m2, annealed (4h @ 90°C) 66°C ISO 75'],
];

const t = openTables();
const source = t.get('sources', SOURCE);
const path = documentPath(source.SHA256, SOURCE);
if (!path || sha256(readFileSync(path)) !== source.SHA256) throw new Error(`${migration}: the cached ${SOURCE} does not hash to ${source.SHA256}`);
const printed = pageReader(t, migration);
if (!printed(SOURCE, 1, 'Heat Deflection Temperature')) throw new Error(`${migration}: p. 1 of ${SOURCE} prints no heat deflection`);
for (const [id, statement] of ROWS) {
  if (!printed(SOURCE, 1, statement)) throw new Error(`${migration}: "${statement}" is not printed on p. 1 of ${SOURCE}`);
  const row = t.get('measurements', id);
  if (row['Anneal °C'] !== '90' || row['Anneal h'] !== '4') throw new Error(`${migration}: ${id} no longer records the 90 °C, 4 h anneal`);
}
const n = correct(t, {
  source: SOURCE, ids: ROWS.map(([id]) => id), migration, date: '2026-09-28',
  set: { 'Test temperature': ['90°C', 'Not published'], 'Test temperature °C': ['90', 'Not published'] },
  note: 'the sheet prints 90 °C once, as the annealing temperature of "annealed (4h @ 90°C)" (p. 1), not as a temperature the bar was tested at, which it does not state. The anneal (90 °C, 4 h) stands.',
});
if (n) t.save();
console.log(`${migration}: ${n} measurement(s) corrected`);
