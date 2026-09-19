#!/usr/bin/env node
// Migration m67 (2026-09-19): what the other three Perstorp documents are to the PCL row.
//
// m66 registered four documents and cited three of them. Only one is cited in the sense the register means: the
// Capa thermoplastics sheet, which the polymers.csv row names as its SourceID and which carries the morphology,
// the melting point and the crystallinity the row states. The 6800 product data sheet and its safety data sheet
// confirm that melting point and say the resin is insoluble in water; no column of any table is transcribed from
// them. That is corroboration, and the lint that looks for a source nothing cites was right to say so.
//
//   node scripts/migrate/m67-perstorp-citation-roles.mjs

import { openTables } from '../data/table-io.mjs';

const CORROBORATION = {
  'R-PERSTORP-CAPA-6800-PDS': "Confirms the melting point the PCL row states and names the polymer ('a linear polyester derived from caprolactone monomer'); no value is transcribed from it.",
  'R-PERSTORP-CAPA-6800-SDS': 'Confirms the melting point and says the resin is insoluble in water, which is why the PCL row records no water uptake; the density it publishes is at 60 °C, at the melt, and is not recorded.',
};

const t = openTables();
let n = 0;
for (const [id, note] of Object.entries(CORROBORATION)) {
  const row = t.rows('sources').find((s) => s.SourceID === id);
  if (!row || row['Citation role'] === 'corroboration') continue;
  t.set('sources', id, 'Citation role', 'corroboration', { expect: row['Citation role'] });
  t.set('sources', id, 'Source note', note, { expect: row['Source note'] });
  n++;
}
if (n) t.save();
console.log(`${n} source(s) now say what they are to the PCL row`);
