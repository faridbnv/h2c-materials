#!/usr/bin/env node
// Migration m413 (2026-10-07): a page statement the completeness round's closing draw found typed beyond its words (D136).
//
// m410 recorded Stratasys ULTEM 1010's p. 8 impact heading, "Impact Properties: ASTM D256, ASTM D4812 (sample thickness
// 0.125 inches)", as stating printed specimens. Its words name two standards and a thickness, nothing of how the bars were
// made; the same page's other statement (PC00994, "0.25 mm (0.010 in.) Layer Height, XZ and ZX orientations") is the one
// that says the bars were printed, and it reaches the impact rows too. The impact heading's specimen becomes Not
// published, so it speaks only for what it says. Nothing a value inherits changes. A re-run is a no-op; a run after the
// data moved stops.
//
//   node scripts/migrate/m413-a-page-statement-says-only-its-standard.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm413';
const t = openTables();
const row = t.get('page_context', 'PC00995');
if (row.Statement !== 'ASTM D256, ASTM D4812 (sample thickness 0.125 inches)') throw new Error(`${MIGRATION}: PC00995 is not the impact heading it was`);
let n = 0;
if (row['Specimen type'] !== 'Not published') {
  t.set('page_context', 'PC00995', 'Specimen type', 'Not published', { expect: 'Printed specimen', migration: MIGRATION });
  t.set('page_context', 'PC00995', 'Reviewed by', `${row['Reviewed by']} Specimen type Not published since ${MIGRATION} (2026-10-07): the heading names its standards and a thickness only; PC00994 on the same page says the bars were printed.`, { expect: row['Reviewed by'], migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} page statement(s) narrowed to their words`);
