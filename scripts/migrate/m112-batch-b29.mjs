#!/usr/bin/env node
// Migration m112 (2026-09-21): batch b29, iSANMATE's current sheets.
//
// iSANMATE's library disallows fetching tools, so 23 of its documents waited for the owner (R084). The owner saved
// its TDS download page's 35 files; 14 are byte for byte documents already applied, 17 went to their rows, two
// file names each serve two revisions (staged against the one the page lists, the other dated unreachable), and
// PDS_TDS.pdf, which the inventory never listed, has a row of its own.
//
// iSANMATE prints its unit between the label and the method ("Tensile Strength MPa ASTM D-638 51"), sometimes with
// the value on the line below ("Tensile strength MPa" / "ISO 527 43.8"), and the reader read neither. Two reader
// rules read both; with a bracketed axis ("Elastic modulus(XY) MPa") and a Vicat method before the unit, the 19
// sheets read about 150 values against roughly 125 labelled lines that state a number. The census over the 14
// sheets transcribed by hand before the programme rises from 58 to 86 of 142; what it still misses is older layouts
// the current sheets do not use — a PEI sheet with three orientation columns (20 of the 56), two-page tables, a
// value printed after a bare "ISO" — and that is recorded in the census, not this batch.
//
// Identities: PLA CF under PLA-CF (the sheet heads itself "iSANMATE PLA CF" and restates "PLA" beneath); PCL a
// material of its own (R097); PDS a toughened PLA by its own description. A 69 MPa flexural modulus on PLA i5+ is
// kept and flagged (D55); PCL's melting row, which held the top of "58.0 to 60.0 °C", is rejected.
//
//   node scripts/migrate/m112-batch-b29.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b29', { migration: 'm112-batch-b29', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
