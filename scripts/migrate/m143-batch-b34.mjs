#!/usr/bin/env node
// Migration m143 (2026-09-25): batch b34, the held sheets get a home (re-center phase 5, part 2; D87).
//
// The owner lifted the import pause for the 74 sheets deferred for their identity: the 50 that name only a family and
// the 24 that waited on an owner ruling (docs/GOALS.md, "Decided on 2026-09-25, for phase 5"). m142 made the homes and
// R167 to R198 settled the identities; this applies the 44 sheets that entered, after a review of every row by an agent
// named as the reviewer (docs/audits/2026-09-18-v2-import/batches/b34/review.mjs). The 30 that did not enter are
// settled or deferred in the ledger, each with its reason (batches/b34/README.md).
//
// A home made before its products has no printing guidance until it cites one: a material quotes the first profile
// its `printing` citations name (compile.js, GUIDANCE-MISMATCH), and the applier writes that citation only for a
// material the batch itself creates. Each home cites its first product's first profile here, as m141's classes did.
//
//   node scripts/migrate/m143-batch-b34.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm143-batch-b34';
const DATE = '2026-09-25';
try {
  const { log, applied } = applyBatch('b34', { migration: MIGRATION, date: DATE });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}

const t = openTables();
const HOMES = ['M164', 'M165', 'M166', 'M167', 'M168', 'M169', 'M170', 'M171', 'M172', 'M173'];
let linked = 0;
for (const id of HOMES) {
  if (t.rows('material_links').some((x) => x.MaterialID === id && x.Link === 'printing')) continue;
  const products = new Set(t.rows('grades').filter((g) => g.MaterialID === id && g.Status === 'active').map((g) => g.GradeID));
  const first = t.rows('profiles').filter((p) => products.has(p.GradeID) && p.Status !== 'retired').map((p) => p.ProfileID).sort()[0];
  if (!first) continue;
  t.append('material_links', { MaterialID: id, Link: 'printing', RecordID: first });
  linked++;
}
if (linked) t.save();
console.log(`${MIGRATION}: ${linked} home(s) cite their first product's profile for printing guidance`);
