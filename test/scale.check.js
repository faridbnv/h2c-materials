// Scaling by entries. This file is named .check.js rather than .test.js and runs on its own (`npm run scale`,
// inside `npm run verify`), because it measures a time budget: run beside the rest of the suite it competes with
// every other test file for the machine and has read 40 seconds one run and 95 the next on the same data. What it
// is for is the trend in the estimate stage, and that is only readable when it has the machine to itself.
//
// Scaling by entries: at twice today's data (every material and everything recorded against it cloned
// under new IDs, scripts/data/synthesize.mjs) the schema gate, compiler and validator still hold, and
// the build stays inside a time budget. The one kind of error a doubling legitimately produces is named
// precisely: a new blend the estimate model has no identity for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synthesize } from '../scripts/data/synthesize.mjs';
import { checkData } from '../build/src/schema.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';

test('twice the entries pass the gate, compile and validate within budget', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-2x-'));
  try {
    const counts = synthesize(2, dir);
    const t0 = performance.now();
    const schemaIssues = checkData(join(dir, 'data'), join(dir, 'schema')).issues;
    const t1 = performance.now();
    const wb = loadTables(join(dir, 'data'));
    const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'scale' });
    const t2 = performance.now();

    assert.deepEqual(schemaIssues, []);
    assert.ok(counts.materials >= 190 && counts.measurements >= 3900, JSON.stringify(counts));
    const errors = issues.filter((i) => i.level === 'error');
    const blends = db.materials.filter((m) => m.family === 'Polymer Blends' && m.name.endsWith('×2')).map((m) => m.name);
    assert.ok(errors.every((e) => /cannot be estimated: its identity ".+ ×2" \(a blend is identified by its name\)/.test(e.message)), errors.map((e) => e.message).join(' | '));
    assert.ok(errors.every((e) => blends.some((b) => e.message.startsWith(b))));

    // Budgets with headroom for slow CI machines, and a record of what they were set against, because the
    // number that matters is the trend:
    //
    //   2026-09-18   2,645 measurements   compile+validate ~10 s at 2x   (budget 90 s)
    //   2026-09-19   6,009 measurements   compile+validate 111 s at 2x   (compile alone 0.04 s; the estimate
    //                                     stage is 40 s at 1x and all of the rest)
    //   2026-09-19   the same data        compile+validate 100 s at 2x   (the kernel's covariance stopped
    //                                     looking a column up by name; 33 s at 1x, bit for bit the same fit)
    //
    // The corpus has grown 2.3x in a day, so this 2x check now covers 4.5x what it did, and the estimate
    // model's Gaussian process is cubic in observations. The budget is raised to 150 s with that measurement
    // beside it rather than removed: what it is for is to say when the exact block solve (DECISIONS D77, the
    // plan's Phase 5 option 2) has to be built, and the answer is now soon. The core compile and validate,
    // which is what the schema gate and the database's own correctness rest on, is separately held to 5 s.
    assert.ok(t1 - t0 < 3000, `schema gate took ${Math.round(t1 - t0)} ms`);
    assert.ok(t2 - t1 < 150000, `compile and validate took ${Math.round(t2 - t1)} ms`);
    const t3 = performance.now();
    buildDatabase(loadTables(join(dir, 'data')), { snapshot: snapshotDate(wb.Method.rows), build: 'scale', estimates: false });
    assert.ok(performance.now() - t3 < 5000, `compile and validate without estimates took ${Math.round(performance.now() - t3)} ms`);
    console.log(`2x: ${counts.materials} materials, ${counts.measurements} measurements; gate ${Math.round(t1 - t0)} ms, compile+validate ${Math.round(t2 - t1)} ms, db ${(JSON.stringify(db).length / 1048576).toFixed(1)} MB`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
