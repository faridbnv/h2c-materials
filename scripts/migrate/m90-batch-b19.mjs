#!/usr/bin/env node
// Migration m90 (2026-09-20): batch b19, the sheets a shop hosts that name no maker of their own.
//
// R074 settles all 114 of them: the shop is the manufacturer where the product name carries the shop's own
// brand, and otherwise it is the maker the sheet or the URL names; what neither names stays held. Reading that
// out needs four witnesses and no guesses (makerOfRecord in propose.mjs) — the ledger's own brand where the URL
// or the sheet corroborates it, a manufacturer the vocabulary knows named in the shop's URL, and a domain the
// sheet prints. Every one of the 114 answered to one of them, so nothing is held for want of a maker.
//
// Eighteen manufacturers enter schema/vocab/manufacturers.csv with the data that cites them, three of them the
// shops themselves: 3DJake lists its own range as 3DJAKE, MatterHackers as PRO Series and MH Build Series, and
// Filament2Print as F2P, which is the ruling's first clause answered by the inventory rather than by a rule.
//
// Twenty-three sheets were called after the words that announce them or after a form label. Two name rules fix
// that, and neither can move parity, which compares a property, a value and a unit: the announcement is not a
// name whatever printing mark stands behind it ("Technical Data Sheet Rev. 1", "Filament Technical Data Sheet
// V1.0"), and a label with nothing after it is not a name — "Product Name:" with the name on the line below is
// where Anycubic puts it, and nine products were called the label.
//
// Four reader defects found by reviewing rather than by reading, each of which would have entered as data:
//
//   - "1,1128 g/cc" and "1836,740 MPa" were no number at all. A thousands separator has exactly three digits
//     behind it and no more than three in front of the first group; anything else is a decimal comma, and both
//     of these reached the applier as a NaN.
//   - "DIN EN ISO 62 1)" made ISO 621, which is not a standard. The 1) is a footnote marker and a digit a
//     closing bracket follows is not part of a designation.
//   - "Print temperature 260°C ± 10" read as a window from 10 to 260 on fourteen Nobufil profiles. A tolerance
//     is centred on its nominal setting and the unit may stand between the two; PARSE-MISMATCH caught it.
//   - "2023/11/3 REV:V1.1 Http://www.jamghe.com" became a certification claim, because "V1.1" read as UL 94
//     V-1. A class has nothing behind its digit.
//
// And two the review now asks a person about rather than letting through: a value outside every physics window
// its own matrix and fill select, and a unit the page prints longer than the row records. Both found real
// defects in this batch — MatterHackers' PLA sheet prints a tensile modulus of 3.6 MPa and a flexural modulus
// of 3.8 MPa, which is its own slip for GPa, and its PETG sheet has the flexural modulus and strength labels
// swapped. Those four numbers enter as printed and marked physically implausible (D55), so they back nothing.
//
// Two rows are rejected: "Notched Izod Impact 7.6J/M2", where the longest unit the lexicon knows inside that is
// J/m and J/m is a thousand times J/m2. Neither reading may be assumed, so neither is recorded.
//
// Fifteen findings are accepted per record. Seven are one thing worth writing down: 3DJake's ecoPLA range
// publishes a modulus near 400 MPa, and on every sheet of it the printed yield stress divided by the printed
// yield strain gives the same number. The sheet is publishing the secant modulus at yield rather than the
// initial slope, which is a reading of the sheet and not a repair of it.
//
//   node scripts/migrate/m90-batch-b19.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b19', { migration: 'm90-batch-b19', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b19 refused:');
  console.error(error.message);
  process.exit(1);
}
