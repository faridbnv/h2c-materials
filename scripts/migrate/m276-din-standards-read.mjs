#!/usr/bin/env node
// Migration m276 (2026-10-01): the standards a row's own words name, where the reader did not know DIN.
//
// The standards reader knew ISO, ASTM, GB/T and IEC. A row whose Standard / load printed "DIN 53504" (rubber tensile),
// "DIN 53505" (Shore hardness) or "DIN 53479" (density) was typed "Not published", and PARSE-MISMATCH could not see it
// (the data audit of 2026-10-01, RC3/RC4: standards printed on the sheet and not recorded). The reader now knows DIN's
// own five-digit plastics and rubber standards (build/src/normalize/standards.js); every row its words name one for
// gets the reading of those words. Nothing is read from elsewhere: the words were already in the row.
//
//   node scripts/migrate/m276-din-standards-read.mjs
import { openTables } from '../data/table-io.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';

const MIGRATION = 'm276';
const t = openTables();
let n = 0;
for (const r of t.rows('measurements')) {
  if (r['Data status'] === 'Retired duplicate record') continue;
  const read = readStandards(r['Standard / load']);
  if (!read.some((s) => s.startsWith('DIN '))) continue;
  const now = read.join('; ');
  if (r.Standards === now) continue;
  if (r['Parse review'] && /^Fields:[^.]*\bStandards\b/.test(r['Parse review'])) continue;
  t.set('measurements', r.MeasurementID, 'Standards', now, { expect: r.Standards, migration: MIGRATION });
  n++;
}
t.save();
console.log(`${MIGRATION}: ${n} rows now name the DIN standard their words print`);
