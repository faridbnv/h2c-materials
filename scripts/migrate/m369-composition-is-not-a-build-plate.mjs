#!/usr/bin/env node
// Migration m369 (2026-10-05): a product's Composition / filler is what the sheet says the product is made of, not its
// printer's build plate or a shop card for another product (check round 3; build/reports/table-detectors, wrong-column).
//
// The import's composition reader (scripts/ingest/propose.mjs, composition) took the first line naming a load, and a
// load's words are also a build plate's: Flashforge's sheets print "Build Surface Material Tempered glass, BuildTak,
// Carbon fiber plate", SIDDAMENT's "Printing Platform: Tempered Glass, PEI Board, Carbon Fiber Board", 3D4Makers' "Bed
// Adhesion PEI Sheet, carbon fiber plate or glass plate", and Nanovia's captured pages carry shop cards for other
// products ("Nanovia PEKK-A CF : Carbon fiber reinforced Starting at : 562,88 € ex. VAT / kg Select options", on Nanovia
// ASA's page, and a card title on its own line, "Nanovia ABS CF : Carbon fiber reinforced", on Nanovia PLA VX's). 40 grades
// held one, and the drawer showed it as the product's composition. The reader now passes over
// build-surface lines and shop cards; this migration reads each of those grades' sheets again with it, and writes what
// it finds now (the sheet's own statement of a load, or "Not published" where it states none). Composition decides no
// answer; it is shown. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m369-composition-is-not-a-build-plate.mjs
import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { composition } from '../ingest/propose.mjs';

const MIGRATION = 'm369';
const NP = 'Not published';
const NOT_A_LOAD = /\b(?:build surface material|printing platform|bed adhesion)\b|glue stick|\bstarting at\s*:/i;
// What m369 wrote on its first run, before the reader knew another product's card title: read again as well.
const A_CARD = /^Nanovia (?:PEKK-A CF|ABS CF|PC CF|PETG CF) : Carbon fiber reinforced \(p\. 1/;
const t = openTables();
let changed = 0;

for (const g of t.rows('grades')) {
  const held = g['Composition / filler'];
  if (!(NOT_A_LOAD.test(held) || A_CARD.test(held)) || !/\(p\. \d+, as the sheet states it\)$/.test(held)) continue;
  const text = cachedText(t.get('sources', g.SourceID)?.SHA256);
  if (!text) throw new Error(`${MIGRATION}: ${g.GradeID}'s sheet ${g.SourceID} has no cached text; restore the source store first`);
  // The held line is the sheet's own, read where the grade's sheet prints it.
  // A captured page's entities ("&euro;") are decoded in its cached text, so the line's first words are what is compared.
  const line = held.replace(/ \(p\. \d+, as the sheet states it\)$/, '').slice(0, 30);
  if (!text.pages.some((p) => p.lines.some((l) => String(l.text).replace(/\s+/g, ' ').includes(line)))) {
    throw new Error(`${MIGRATION}: ${g.GradeID}'s held composition is not on its sheet ${g.SourceID}`);
  }
  const now = composition(text, { product: g['Product name'] }) ?? NP;
  if (NOT_A_LOAD.test(now)) throw new Error(`${MIGRATION}: ${g.GradeID}: the reader still takes "${now}"`);
  t.set('grades', g.GradeID, 'Composition / filler', now, { expect: held, migration: MIGRATION });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} grade(s) read again for their composition; a build plate or a shop card is no longer one`);
