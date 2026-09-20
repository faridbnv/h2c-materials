#!/usr/bin/env node
// Migration m83 (2026-09-20): batch b14, the documents nothing was holding.
//
// The first batch chosen by what the ledger says about a document rather than by who published it: every row
// the queue said was read and unheld, in one run. Nanovia's twenty-two web pages, FormFutura's library as
// 3DJake mirrors it, Fabru / purefil, SIDDAMENT, BASF, Raise3D, Spectrum, colorFabb, Bambu, Eryone,
// Fillamentum and Prusa.
//
// What the reader had to learn, and what each thing cost before it learned it:
//
//   A section of a sheet is not its product. Nanovia's twenty-three pages each begin with the shop's own
//   navigation — Store, Distribution, News, Contact, Profile, Cart — and every one of them was a product
//   called Distribution. What such a page does say plainly is its breadcrumb, and the last step of a
//   breadcrumb is the page itself: ABS AF, PETG CF, PA-6 CF.
//
//   A retailer is not a manufacturer. A sheet a shop hosts that names no maker of its own gave its grade the
//   shop's name, so "Filament2Print BEDROCK 3D PPSU" said the shop made what it sells. Those wait for the
//   owner (Wave D); the sheets a shop hosts that do name their maker are unaffected, which is why 3DJake's
//   mirrors of FormFutura, Spectrum, colorFabb and Bambu are here.
//
//   A number written with an E is a power of ten. "1.0E+15 ohms" read as 1 and "10E13" as 13, which is an
//   insulator recorded as a conductor; the corpus writes it that way 125 times over. The exponent's sign is
//   left out where it is positive.
//
//   A designation's hyphen may not be a hyphen. "ISO 7619-1" typeset with a non-breaking hyphen left the -1
//   outside the designation, and a Shore hardness of 98A was read as 1.
//
//   A label may stand under its row. A bilingual sheet prints the maker's own language above the line that
//   carries the standard and the value, and English under it.
//
//   And a breadcrumb is not a composition: "Home / 3D printing filament / Reinforced / Carbon fibre / ..."
//   names a carbon load and a reinforcement and is a menu.
//
// Held, with the reason in the ledger: QIDI's whole library, whose bilingual table puts label, standard, value
// and English label on four baselines the page orders by height rather than by row; the shop-branded sheets
// above; twenty-seven documents that print another source's numbers (R053); and the identities nobody has
// settled.
//
// One row is rejected as a misreading — the low end of a foaming filament's density range, as b09 and b11
// rejected the same row — and two heat deflections are recorded as printed and physically implausible, each
// being a sheet that publishes a lower temperature under a lighter load than under a heavier one.
//
//   node scripts/migrate/m83-batch-b14.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b14', { migration: 'm83-batch-b14', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b14 refused:');
  console.error(error.message);
  process.exit(1);
}
