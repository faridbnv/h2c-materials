#!/usr/bin/env node
// Migration m88 (2026-09-20): a bed temperature whose dash did not survive the page.
//
// b18 read SUNLU's ABS-GF sheet, whose printing guide says "Bed temperature 90 - 100 °C, apply adhesive/spray
// glue." The dash is not in the document's text layer — the line arrives as "Bed temperature 90 100 °C" — and
// the repair that rejoins digits a page has split ("2 43 3 .4" for 2433.4) joined those two into 90100.
//
// The sheet states the same setting again in its table, with its dash: "Print Platform Temp. 90-100℃". So the
// window is not in doubt and the cell is corrected to what the sheet prints. PARSE-UNREAD is what found it:
// the typed Bed min and Bed max could be read from no such number, so the build said the raw text had not been
// parsed rather than letting the row stand with a window nothing supports.
//
// The reader is not changed here. Two numbers with a space between them are a split number as often as a range
// whose dash was lost, and telling those apart needs more than this one row shows; the gap is written down in
// the import's PLAN-REMAINING rather than guessed at.
//
//   node scripts/migrate/m88-sunlu-bed-window.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const row = t.get('profiles', 'P0795');
const WAS = '90100 °C';
const NOW = '90-100 °C';

if (row['Bed °C'] === NOW) {
  console.log('already corrected');
} else if (row['Bed °C'] !== WAS) {
  throw new Error(`m88: P0795 Bed °C is "${row['Bed °C']}", expected "${WAS}"; the data moved since this correction was written`);
} else {
  t.set('profiles', 'P0795', 'Bed °C', NOW, { expect: WAS });
  t.set('profiles', 'P0795', 'Bed min °C', '90', { expect: row['Bed min °C'] });
  t.set('profiles', 'P0795', 'Bed max °C', '100', { expect: row['Bed max °C'] });
  t.set('profiles', 'P0795', 'Parse review', 'Corrected 2026-09-20 (m88) against the source: the sheet prints "Bed temperature 90 - 100 °C" in its printing guide and "Print Platform Temp. 90-100℃" in its table; the dash is not in the document’s text layer, and the digits either side of it were joined into 90100.', { expect: row['Parse review'] });
  t.save();
  console.log('P0795 bed window corrected to 90-100 °C');
}
