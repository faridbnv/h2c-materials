#!/usr/bin/env node
// Migration m100 (2026-09-21): batch b25, the documents four rulings and four polymer rows freed.
//
// This is the first batch of the completion plan's phase D. Nothing here is a reader rule: what let these
// documents in is data — four rows of polymers.csv written from producers' references (m98), and the rulings
// that say what to do with what those rows identify.
//
//   Siraya Tech's Fibreheart PAHT CF (PPA based) names one polymer twice. PAHT is the trade descriptor and PPA
//   the polymer the sheet says it is based on, which R086 settles; it joins the PPA-CF material that exists.
//
//   colorFabb's PLA/PHA is a blend, and R082 says a blend is a material named for the blend, as PC-ABS is.
//   m98 wrote its polymers.csv row; R087 is the permission apply.mjs asks for. Two sheets enter for it — the
//   2023 revision colorFabb serves and the copy NinjaTek hosts — as one grade citing two sources.
//
//   colorFabb's LW-ASA joins ASA Aero. Its density is the range the sheet publishes, 0.40 to 1,07 g/cm³,
//   because a foaming filament's density is set by how much the printer foams it. The foamed end is below what
//   the physics windows allow an amorphous compound, and the acceptance on that row says why: the windows have
//   no class for a foamed grade yet, which is a fix this programme has named and not made.
//
// Three readers' decisions are recorded on the rows they are about, each read against the page: the LW-ASA
// range, Eryone's Charpy row (the sheet prints the pendulum energy in the value column beside the result), and
// AzureFilm's tensile modulus of 1,0 MPa, which is kept as published and flagged physically implausible (D55).
//
// Two of the six documents proposed are twins of sheets already recorded (Eryone's Hyper Speed TPU, AzureFilm's
// ABS P): the product already has a grade, so the ledger records which source they repeat and nothing is
// written twice. The two copperFill sheets are held: colorFabb declares the copper load in its first sentence,
// and a load a maker declares is a modifier value the vocabulary does not have — a ruling, as graphene and
// natural fibre were (R080) — not the undisclosed filler R078 speaks for.
//
//   node scripts/migrate/m100-batch-b25.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b25', { migration: 'm100-batch-b25', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
