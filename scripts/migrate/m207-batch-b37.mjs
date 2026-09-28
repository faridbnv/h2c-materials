#!/usr/bin/env node
// Migration m207 (2026-09-27): batch b37, the two held sheets whose makers' own pages name the polymer (R203, R204; the
// owner lifted the pause for them on 2026-09-27; GOALS C2).
//
// Both sheets were deferred for their identity: "names neither polymer nor family" (OPEN-PROBLEMS §14). The research
// package of 2026-09-26 found the makers' pages that name it, staged into the ledger as witnesses:
//   Fillamentum Timberfill: "a blend of biopolymers (mostly PLA) with the addition of 15% natural wood fibers" (MAG #3)
//     -> PLA Wood (M014), R203.
//   NinjaTek Eel: "Eel™ TPU 3D printing filament is one of the only conductive, static dissipative and flexible
//     materials" -> TPU-EC (M157), R204; a conductive TPU is filed by its load, not its hardness (D86 splits unfilled
//     TPU). The ledger listed it as "NinjaFlex Edge"; its sheet and URL are Eel's.
// Every row was read by an agent named as the reviewer (docs/audits/2026-09-18-v2-import/batches/b37/review.mjs).
//
// Multi3D Electrifi, deferred for the same gap, stays deferred: its safety data sheet (staged as a witness) names its
// chemical family, "Polymer-metal composite / biodegradable polyester", for which no material or home exists. The
// ledger's note says so, as the fact that frees it once a polyester home is decided.
//
//   node scripts/migrate/m207-batch-b37.mjs

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { projectRoot } from '../data/table-io.mjs';
import { readCsv, csvText } from '../../build/src/csv.js';

const MIGRATION = 'm207-batch-b37';
const DATE = '2026-09-27';
try {
  const { log, applied } = applyBatch('b37', { migration: MIGRATION, date: DATE });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}

// Electrifi: still deferred, with what its maker's safety data sheet says.
const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const ledger = readCsv(LEDGER).records.map((r) => r.values);
const electrifi = ledger.find((r) => r.doc_key === '2688570615b2eb82');
const WITNESS = 'https://www.multi3dllc.com/wp-content/uploads/2016/09/Electrifi_MSDS.pdf#witness-for=2688570615b2eb82';
if (!ledger.some((r) => r.doc_key === WITNESS && r.sha256)) throw new Error(`${MIGRATION}: the Electrifi safety data sheet is not staged as a witness`);
const NOTE = ` Its maker's safety data sheet (witness ${WITNESS}, research package of 2026-09-26) gives "CHEMICAL FAMILY: Polymer-metal composite / biodegradable polyester": no material or home holds a polyester filament, so it waits on that decision (${MIGRATION}).`;
if (electrifi.status !== 'deferred') throw new Error(`${MIGRATION}: Electrifi is ${electrifi.status}, not deferred`);
if (!electrifi.status_note.includes(NOTE.trim())) {
  electrifi.status_note = `${electrifi.status_note}${NOTE}`;
  electrifi.updated = DATE;
  writeFileSync(LEDGER, csvText(Object.keys(ledger[0]), ledger));
  console.log(`${MIGRATION}: Electrifi's deferral names what its safety data sheet says`);
}
