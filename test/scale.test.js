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
import { compile } from '../build/src/compile.js';
import { validate } from '../build/src/validate.js';

test('twice the entries pass the gate, compile and validate within budget', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-2x-'));
  try {
    const counts = synthesize(2, dir);
    const t0 = performance.now();
    const schemaIssues = checkData(join(dir, 'data'), join(dir, 'schema')).issues;
    const t1 = performance.now();
    const wb = loadTables(join(dir, 'data'));
    const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'scale' });
    issues.push(...validate(db, wb));
    const t2 = performance.now();

    assert.deepEqual(schemaIssues, []);
    assert.ok(counts.materials >= 190 && counts.measurements >= 3900, JSON.stringify(counts));
    const errors = issues.filter((i) => i.level === 'error');
    const blends = db.materials.filter((m) => m.family === 'Polymer Blends' && m.name.endsWith('×2')).map((m) => m.name);
    assert.ok(errors.every((e) => /cannot be estimated: its identity ".+ ×2" \(a blend is identified by its name\)/.test(e.message)), errors.map((e) => e.message).join(' | '));
    assert.ok(errors.every((e) => blends.some((b) => e.message.startsWith(b))));

    // Budgets with headroom for slow CI machines. Measured locally: gate ~0.3 s, compile and validate
    // ~10 s (the estimate model's Gaussian process is cubic in observations).
    assert.ok(t1 - t0 < 3000, `schema gate took ${Math.round(t1 - t0)} ms`);
    assert.ok(t2 - t1 < 90000, `compile and validate took ${Math.round(t2 - t1)} ms`);
    console.log(`2x: ${counts.materials} materials, ${counts.measurements} measurements; gate ${Math.round(t1 - t0)} ms, compile+validate ${Math.round(t2 - t1)} ms, db ${(JSON.stringify(db).length / 1048576).toFixed(1)} MB`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
