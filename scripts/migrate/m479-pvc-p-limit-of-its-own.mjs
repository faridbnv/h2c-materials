#!/usr/bin/env node
// Migration m479 (2026-10-20): PVC-P's rubber limit decides from a reference of its own kind (the round's review, F4;
// D176). m477 had CL01 name PVC-P, though CL01's source (the Cambridge Materials Data Book) prints no PVC; m478 registered
// Fainplast's flexible-PVC table and added CL03 (the same 0.5 GPa ceiling for an unfilled PVC-P) as reported. Here CL03
// decides and CL01 names its kinds as D166 left them. A deciding row changes, in a commit of its own: the limit and its
// reach for PVC-P are the same, so no answer should move (its decision diff says so).
//
//   node scripts/migrate/m479-pvc-p-limit-of-its-own.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm479';
const t = openTables();
const WITH = 'Base polymer: TPU | TPE | PEBA | TPC | OBC | TPS | TPV | PVC-P; Modifier / filler: Unfilled / unspecified';
const WITHOUT = 'Base polymer: TPU | TPE | PEBA | TPC | OBC | TPS | TPV; Modifier / filler: Unfilled / unspecified';
const WORDS_WITH = 'An unfilled rubber (TPU, PEBA, OBC, TPE, TPS, TPV, PVC-P)';
const WORDS_WITHOUT = 'An unfilled rubber (TPU, PEBA, OBC, TPE, TPS, TPV)';
let n = 0;
const cl01 = t.get('class_limits', 'CL01');
if (cl01['Applies to'] === WITH) {
  const at = cl01.Basis.indexOf(' Since the owner\'s rulings of 2026-10-20 (m477, D176) it also holds for the plasticised PVC');
  if (at < 0) throw new Error(`${MIGRATION}: CL01's Basis moved`);
  t.set('class_limits', 'CL01', 'Applies to', WITHOUT, { expect: WITH, migration: MIGRATION });
  t.set('class_limits', 'CL01', 'Reason words', WORDS_WITHOUT, { expect: WORDS_WITH, migration: MIGRATION });
  t.set('class_limits', 'CL01', 'Basis', `${cl01.Basis.slice(0, at)} The plasticised PVC (PVC-P) is a rubber too, under a limit of its own that cites a flexible-PVC reference (CL03; the owner's rulings, m479, D176).`, { expect: cl01.Basis, migration: MIGRATION });
  n++;
}
if (t.get('class_limits', 'CL03').Status === 'reported') { t.set('class_limits', 'CL03', 'Status', 'deciding', { expect: 'reported', migration: MIGRATION }); n++; }
if (n) t.save();
console.log(`${MIGRATION}: ${n} class limit(s) changed`);
