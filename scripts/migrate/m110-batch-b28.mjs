#!/usr/bin/env node
// Migration m110 (2026-09-21): batch b28, FormFutura's own library and what it let in.
//
// FormFutura serves its data sheets from a SharePoint library that answers 403 to anything without a session, so
// 64 of its documents sat gated since the inventory. The owner obtained the library itself; `ingest:fetch --stage
// --recursive` staged its 68 data sheets and passed over the other 290 files (safety sheets, declarations, case
// studies, leaflets, spool drawings), and nine turned out to be byte for byte the 3DJake copies already applied.
// FormFutura's own layout reads 131 of 132 values on the sheets with a text layer; the one sheet it misses is a
// scan (High Precision PET, S-PET-TDS), transcribed by hand before the programme.
//
// What the batch holds: FormFutura's EasyFil, Premium, ReFill, ReForm, MetalFil, High Precision and specialty
// ranges; the partner materials it distributes under their makers' names — LEHVOSS's LUVOCOM 3F (R096) and
// Copper3D's PLACTIVE (R092); CreatBot's PLA-CF and ASA and Filament2Print's own ASA and PETG; colorFabb's
// copperFill (R095); Fillamentum's NonOilen, which creates PLA-PHB (R088); and LEHVOSS's unfilled and
// mineral-filled high-temperature polyamides, which create PAHT and PAHT-CE (R093, R094).
//
// The identities are the sheets' own, or a ruling's where the reader could not settle them: ABSpro is a modified
// ABS (R090), ABSpro Flame Retardant a PC/ABS (R091), MetalFil a PLA Metal whose grades declare their load (R039,
// R095), EasyWood and EasyCork PLA Wood, StoneFil PLA Marble. Three moduli that physics rules out are kept and
// flagged (D55): Filament2Print's ASA and PETG print an "elastic modulus" that is yield stress over a 10 % strain,
// and EasyFil ePLA a flexural modulus of 3.8 MPa. CreatBot's ASA prints a melting temperature for an amorphous
// polymer, flagged the same way. PLACTIVE's two "heat deflections" were footnotes and are rejected.
//
// Set aside, each with its reason in the ledger: seven Fiberon repeats the grade lookup now finds (registered),
// FormFutura's LUVOCOM 3F PEEK 9581 NT (G097-04's), Kingroon's three sheets that print Bambu's numbers and
// FormFutura's PEI ULTEM 9085 that prints 3D4Makers' (twins, R053), a sheet whose text layer draws every glyph
// twice, and the FormFutura sheets waiting on a support reading, a polymer row or a name (3Diakon PMMA, Crystal
// Flex SBC, SKULPT, MDflex, Atlas and Helios Support, BVOH, Pegasus PP).
//
//   node scripts/migrate/m110-batch-b28.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b28', { migration: 'm110-batch-b28', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
