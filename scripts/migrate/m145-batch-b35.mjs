#!/usr/bin/env node
// Migration m145 (2026-09-25): batch b35, the three sheets whose identity the owner settled after batch b34 (R199 to
// R202; the owner's answers to OPEN-PROBLEMS §14).
//
// FormFutura's Crystal Flex enters under SBC (M174, made by m144) and purefil's TPV sheet under TPE, polymer not stated
// (M167), after an agent named as the reviewer read every row (docs/audits/2026-09-18-v2-import/batches/b35/review.mjs).
// QIDI's S-White is settled as Support for ABS (R202) and does not enter: QIDI's bilingual layout holds it, and the one
// row that misread proves the hold; it is deferred with the gap named. As in m143, a material with products and no
// printing citation cites its first product's first profile, so SBC's guidance quotes Crystal Flex's.
//
//   node scripts/migrate/m145-batch-b35.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm145-batch-b35';
const DATE = '2026-09-25';
try {
  const { log, applied } = applyBatch('b35', { migration: MIGRATION, date: DATE });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}

const t = openTables();
let linked = 0;
for (const id of ['M174', 'M167']) {
  if (t.rows('material_links').some((x) => x.MaterialID === id && x.Link === 'printing')) continue;
  const products = new Set(t.rows('grades').filter((g) => g.MaterialID === id && g.Status === 'active').map((g) => g.GradeID));
  const first = t.rows('profiles').filter((p) => products.has(p.GradeID) && p.Status !== 'retired').map((p) => p.ProfileID).sort()[0];
  if (!first) continue;
  t.append('material_links', { MaterialID: id, Link: 'printing', RecordID: first });
  linked++;
}
if (linked) t.save();
console.log(`${MIGRATION}: ${linked} material(s) cite their first product's profile for printing guidance`);
