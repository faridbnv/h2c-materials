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
    //   2026-09-20   7,461 measurements   compile+validate 177 s at 2x   (b11 and b12; the budget was breached)
    //   2026-09-20   the same data        compile+validate 149 s at 2x   (the Cholesky takes two columns of a
    //                                     row at a time; 36 s at 1x, and bit for bit the same factor)
    //   2026-09-20   the same data        compile+validate 150.5 s at 2x on a rerun, and the check failed
    //   2026-09-20   the same data        compile+validate  16 s at 2x   (the kernel is solved by block,
    //                                     DECISIONS D79; the estimate stage is 5.7 s at 1x, down from 36)
    //   2026-09-21  11,096 measurements   compile+validate  41 s at 2x   (the import closed, b27 to b33)
    //   2026-09-21   the same data        compile+validate  59 s at 2x   (grade estimates, D81: every grade
    //                                     predicted and calibrated at grade level, +3 s at 1x; the downdate in
    //                                     predict() is dense, and making it sparse is the lever if this grows)
    //
    // The budget was raised once, from 90 s to 150 s, with the measurement written beside it. When it was
    // breached a second time it was not raised again: a budget raised the second time it is breached has stopped
    // being a budget. What was built instead is what this check had been saying to build since the day before,
    // and it bought a factor of nine rather than the factor of one and a bit a larger number would have bought.
    //
    // What the block solve is cubic in is the largest chemical group, not the corpus. A maker's new PLA grades
    // grow that group and a new polymer adds a block, so the corpus can grow a long way before this reads 150 s
    // again — but it is still cubic in something, so this check still has something to say.
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
