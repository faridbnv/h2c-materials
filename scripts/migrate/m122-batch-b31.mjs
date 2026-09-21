#!/usr/bin/env node
// Migration m122 (2026-09-21): batch b31, the twins.
//
// Fifty-seven documents waited as twins: sheets that print another sheet's numbers under another product's name.
// R053 shapes the pairs within one material (a grade each, the values recorded once under a shared formulation
// key). R166 takes R045's shape for a pair across materials — a finish or a variant whose sheet reprints a base
// product's table — so the product and its sheet are registered with no values of their own, and a coverage row
// per material names the table it reprints. What neither settles stays held: seven twins whose ledger note names
// no primary, two whose own identity is unsettled, four whose primary is not applied yet, and Spectrum's PET-G
// FX120, which prints colorFabb nGen_FLEX's numbers and is an owner question (batches/b30/README.md).
//
//   node scripts/migrate/m122-batch-b31.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm122-batch-b31';
const DATE = '2026-09-21';
try {
  const { log, applied } = applyBatch('b31', { migration: MIGRATION, date: DATE });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}

// R166: one coverage row per material, naming each product whose sheet reprints another material's table.
const dir = join(projectRoot, 'docs/audits/2026-09-18-v2-import/proposals/b31');
const reprinting = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))).filter((p) => p.reprints);
const t = openTables();
const byMaterial = new Map();
for (const p of reprinting) {
  const g = p.grades[0].row;
  (byMaterial.get(g.MaterialID) ?? byMaterial.set(g.MaterialID, []).get(g.MaterialID)).push(`${g.Manufacturer} ${g['Product name']} (${p.source.row.SourceID}) reprints the table ${p.reprints.source} carries under ${p.reprints.material}`);
}
let added = 0;
for (const [material, lines] of byMaterial) {
  const finding = `Reviewed ${DATE} (ruling R166, ${MIGRATION}). ${lines.join('; ')}. Each product and its sheet are registered; the numbers are the other material's and are not repeated here.`;
  if (t.rows('coverage').some((c) => c.MaterialID === material && c.Finding === finding)) continue;
  t.append('coverage', { CoverageID: nextId('coverage', t.rows('coverage').map((c) => c.CoverageID)), MaterialID: material, Domain: 'Source conflict', Status: 'Reviewed with limitations', 'Manufacturer count': 'Not applicable', Finding: finding });
  added++;
}
if (added) t.save();
console.log(`${MIGRATION}: ${added} coverage row(s) for R166`);
