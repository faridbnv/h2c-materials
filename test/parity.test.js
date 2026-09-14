// Migration parity: the CSV tables must read exactly as the retired workbooks did.
// Removed at cutover, when the workbooks leave the tree; until then both sources run side by side.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSource } from '../build/src/source.js';
import { compile } from '../build/src/compile.js';
import { compileReference } from '../build/src/reference.js';
import { snapshotDate } from '../build/src/load.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const haveWorkbook = existsSync(join(root, 'data/H2C_FDM_Material_Database.xlsx'));

// Fields that legitimately differ between the two readers. Anything else must be identical.
const strip = (row) => {
  const { __row, __file, __numbers, ...rest } = row;
  delete rest['Conversion factor'];
  return rest;
};
const factor = (r) => r.__numbers?.['Conversion factor'] ?? Number(r['Conversion factor']);

test('every CSV row reads as its workbook row', { skip: !haveWorkbook }, async () => {
  const x = await readSource(root, 'xlsx');
  const c = await readSource(root, 'csv');
  for (const sheet of Object.keys(x.wb)) {
    assert.deepEqual(c.wb[sheet].header, x.wb[sheet].header, `${sheet} header`);
    assert.equal(c.wb[sheet].rows.length, x.wb[sheet].rows.length, `${sheet} row count`);
    // One comparison per sheet; only a mismatch is worth a row-by-row diff.
    const xs = x.wb[sheet].rows.map(strip), cs = c.wb[sheet].rows.map(strip);
    if (JSON.stringify(cs) !== JSON.stringify(xs)) {
      const i = xs.findIndex((r, k) => JSON.stringify(r) !== JSON.stringify(cs[k]));
      assert.deepEqual(cs[i], xs[i], `${sheet} row ${i}`);
    }
    if (sheet === 'Properties') {
      x.wb[sheet].rows.forEach((xr, i) => {
        const a = factor(xr), b = factor(c.wb[sheet].rows[i]);
        if (!(a === b || (Number.isNaN(a) && Number.isNaN(b)))) assert.fail(`${xr.MeasurementID} conversion factor ${a} vs ${b}`);
      });
    }
  }
  assert.deepEqual(c.referenceRows.map(({ __row, ...r }) => r), x.referenceRows.map(({ __row, ...r }) => r));
});

test('both sources compile to the same database and reference', { skip: !haveWorkbook }, async () => {
  const x = await readSource(root, 'xlsx');
  const c = await readSource(root, 'csv');
  const opts = (wb) => ({ snapshot: snapshotDate(wb.Method.rows), build: 'parity' });
  const strip = (issues) => issues.map(({ where, message, level }) => ({ level, where: where.replace(/ row \d+/, ''), message: message.replace(/ row \d+/, '') }));
  const dx = compile(x.wb, opts(x.wb));
  const dc = compile(c.wb, opts(c.wb));
  assert.deepEqual(dc.db, dx.db);
  assert.deepEqual(strip(dc.issues), strip(dx.issues));
  assert.deepEqual(compileReference(c.referenceRows, []), compileReference(x.referenceRows, []));
});
