#!/usr/bin/env node
// Migration m79 (2026-09-20): nine resistivities that lost their exponent.
//
// A surface resistivity is published as a power of ten — "≤10³ Ω", "> 10¹² Ω" — and the raised part arrives on
// a baseline of its own. The reader joined it to the ten as digits rather than as a power, so every resistivity
// this database holds reads as the digits its exponent is made of:
//
//   ≤10³  Ω  became      103 Ω
//   ≤10⁵  Ω  became      105 Ω
//   >10¹² Ω  became     1012 Ω
//
// A surface resistivity of 1012 Ω is a conductor. 10¹² Ω is an insulator. The nine rows are nine orders of
// magnitude apart from what their sheets publish, and every one of them is an ESD or an insulating grade whose
// whole point is the number that was lost.
//
// Re-read from the cached documents, whose SHA-256s are the ones sources.csv records. What the reader learned is
// in build/src/measurement-rules.js, where rawNumber now reads a power of ten written either way, and in
// scripts/ingest/propose.mjs, where a bound may stand in front of the ten ("OL, >10¹²") and a candidate may
// begin where a power begins.
//
//   node scripts/migrate/m79-powers-of-ten.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const DATE = '2026-09-20';
const ROWS = [
  ['V005248', '103 Ω', '103', '10^3 Ω', '1000'],
  ['V005308', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V005341', '105 Ω', '105', '10^5 Ω', '100000'],
  ['V006217', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V006361', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V006390', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V006456', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V006479', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
  ['V006538', '1012 Ω', '1012', '10^12 Ω', '1000000000000'],
];

let n = 0;
for (const [id, wasRaw, wasNumber, raw, value] of ROWS) {
  const row = t.rows('measurements').find((r) => r.MeasurementID === id);
  if (!row || row['Raw value'] !== wasRaw) continue;
  const note = `Corrected ${DATE} (m79): the sheet publishes ${raw.replace('^', '')} and the raised part of the power was read as digits, making ${wasRaw}. Re-read from the source document (SHA-256 recorded in sources.csv).`;
  t.set('measurements', id, 'Raw value', raw, { expect: wasRaw });
  t.set('measurements', id, 'Raw numeric', value, { expect: wasNumber });
  t.set('measurements', id, 'Normalized value', value, { expect: wasNumber });
  t.set('measurements', id, 'Data status', 'Published value (transcription corrected)', { expect: row['Data status'] });
  t.set('measurements', id, 'Notes', row.Notes === 'Not applicable' ? note : `${row.Notes} ${note}`, { expect: row.Notes });
  n += 5;
}

if (n) t.save();
console.log(`${n} cell(s) written`);
