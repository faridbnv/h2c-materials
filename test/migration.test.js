// The one-time conversion from the workbooks, proven two ways until cutover:
//  1. replaying dump + scripts/migrate/m*.mjs into an empty directory reproduces data/tables exactly;
//  2. the database compiled from data/tables equals the branch-base baseline, except for the
//     differences scripts/migrate/explained-differences.json lists one by one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChain } from '../scripts/migrate/chain.mjs';
import { diffAgainstBaseline, unexplained } from '../scripts/migrate/oracle.mjs';
import { readSource } from '../build/src/source.js';
import { snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { compileReference } from '../build/src/reference.js';
import { validate } from '../build/src/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const haveWorkbook = existsSync(join(root, 'data/H2C_FDM_Material_Database.xlsx'));

test('replaying the conversion chain reproduces the committed tables byte for byte', { skip: !haveWorkbook }, async () => {
  const out = mkdtempSync(join(tmpdir(), 'h2c-chain-'));
  try {
    await runChain(out);
    const files = readdirSync(join(root, 'data/tables')).filter((f) => f.endsWith('.csv')).sort();
    assert.deepEqual(readdirSync(join(out, 'data/tables')).filter((f) => f.endsWith('.csv')).sort(), files);
    for (const f of files) {
      assert.ok(readFileSync(join(out, 'data/tables', f), 'utf8') === readFileSync(join(root, 'data/tables', f), 'utf8'), `${f} differs from its replay`);
    }
    assert.equal(readFileSync(join(out, 'data/manifest.json'), 'utf8'), readFileSync(join(root, 'data/manifest.json'), 'utf8'));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('the compiled database equals the baseline except for the explained differences', async () => {
  const { wb, referenceRows } = await readSource(root, 'csv');
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'oracle' });
  validate(db, wb);
  const reference = compileReference(referenceRows, [], undefined, db.registry);
  const { extra, stale } = unexplained(diffAgainstBaseline({ db, reference }));
  assert.deepEqual(extra.slice(0, 20), [], `${extra.length} unexplained difference(s)`);
  assert.deepEqual(stale.map((d) => d.path), [], 'explained differences that no longer occur');
});
