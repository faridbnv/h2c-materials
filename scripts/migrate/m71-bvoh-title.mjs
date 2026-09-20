#!/usr/bin/env node
// Migration m71 (2026-09-19): the BigRep BVOH source carried its file name as its title.
//
// The sheet's own head reads "BVOH / WATER SOLUBLE SUPPORT"; the register had "TDS-BigRep-BVOH-web", which is
// what the link is called. A title is what the publisher printed (D63), and the lint that says so only found
// this one once the file-name test stopped flagging every underscore as a file name.
//
//   node scripts/migrate/m71-bvoh-title.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const row = t.rows('sources').find((s) => s.SourceID === 'S-BVOH');
if (row && row.Title === 'TDS-BigRep-BVOH-web') {
  t.set('sources', 'S-BVOH', 'Title', 'BVOH Water Soluble Support', { expect: row.Title });
  t.save();
  console.log('1 source now carries the title its sheet prints');
} else {
  console.log('0 record(s) changed');
}
