#!/usr/bin/env node
// Migration m50 (2026-09-18): the one normalized value that was rounded away from its own conversion.
//
// V002084 records Spectrum PC CF's notched Izod as the sheet prints it, 70 kg·cm/cm, with the conversion factor
// 9.80665 beside it. 70 x 9.80665 is 686.4655 J/m; the row carried 686.5, rounded when it was transcribed (m14).
// Nothing had caught it, because the raw-value reconciliation knew no conversion between kg·cm/cm and J/m and so
// skipped the row in silence. It knows one now, and the row is corrected to what its own factor gives.
//
// The source is unchanged and unread here: this is arithmetic on values already transcribed, not a re-read (D35).
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm50';
const DATE = '2026-09-18';

export function migrate(t) {
  const row = t.get('measurements', 'V002084');
  if (row['Normalized value'] === '686.4655') return;
  t.set('measurements', 'V002084', 'Normalized value', '686.4655', { expect: '686.5' });
  t.set('measurements', 'V002084', 'Notes',
    `${row.Notes} Corrected ${DATE} (${MIGRATION}): the normalized value read 686.5, rounded; 70 × 9.80665 is 686.4655 J/m, which is what the raw value and the factor say.`,
    { expect: row.Notes });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field}`);
}
