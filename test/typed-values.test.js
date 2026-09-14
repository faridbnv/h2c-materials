// Typed canonical values decide; the parsers check them. A disagreement stops the build unless a Parse
// review explains it, and then the reviewed value is what the tool uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));
const run = (edit) => {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  return { db, mismatches: issues.filter((i) => i.code === 'PARSE-MISMATCH').map((i) => `${i.where}: ${i.message}`) };
};
const profile = (wb, id) => wb['Print setup'].rows.find((r) => r.ProfileID === id);

test('the stored values reproduce every parser reading today', () => {
  assert.deepEqual(run(() => {}).mismatches, []);
});

test('a typed value that disagrees with the raw text stops the build', () => {
  const { mismatches } = run((wb) => { profile(wb, 'P0003')['Nozzle max °C'] = '260'; });
  assert.deepEqual(mismatches, ['profiles P0003: Nozzle max is 260 but the parser reads the raw text as 220; correct the typed value, or explain it in Parse review']);
});

test('a raw text edit the typed value does not follow stops the build too', () => {
  const { mismatches } = run((wb) => { profile(wb, 'P0003')['Chamber °C'] = 'Not required'; });
  assert.ok(mismatches.some((m) => /P0003: Chamber state is range but the parser reads the raw text as not-required/.test(m)), mismatches.join(' | '));
});

test('a reviewed correction is accepted and decides the gate', () => {
  const { db, mismatches } = run((wb) => {
    Object.assign(profile(wb, 'P0003'), { 'Nozzle max °C': '360', 'Parse review': 'The data sheet table reads 190-360 °C; the PDF text layer drops the 3.' });
  });
  assert.deepEqual(mismatches, []);
  const p = db.profiles.find((x) => x.id === 'P0003');
  assert.equal(p.nozzle.max, 360);
  assert.equal(p.gates.nozzle.verdict, 'exceeds');
});

test('an HDT test load is typed and checked the same way', () => {
  const hdt = base.Properties.rows.find((r) => r.Property === 'HDT' && r['Test load MPa'] === '0.45');
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === hdt.MeasurementID)['Test load MPa'] = '1.8'; });
  assert.ok(mismatches.some((m) => m.startsWith(`measurements ${hdt.MeasurementID}: Test load MPa is 1.8`)), mismatches.join(' | '));
});
