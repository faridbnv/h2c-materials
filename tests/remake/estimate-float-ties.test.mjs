// DT-1 (owner ruling OQ-06 A, applied in M3 by R1 A): in the estimate stage, whether a held-out value lies inside a
// z-scaled range is decided with the tolerance helper (numerics.ts exceeds), never a bare comparison, so a unit in the last
// place, which two machines do not always agree on, cannot move a coverage count. Transition 2026-10-22-dt1-float-tie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../../packages/build/src/estimate/', import.meta.url);
// A comparison against a z-scaled bound: "<= z * sd", "< zPlausible * ...".
const BARE = /(<=|<|>=|>)\s*z[A-Za-z]*\s*\*/;

test('no bare comparison against a z-scaled bound in the estimate stage', () => {
  const hits = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((line, i) => { if (BARE.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`); });
  }
  assert.deepEqual(hits, []);
});

test('the coverage checks named by DT-1 use the tolerance helper', () => {
  const grades = readFileSync(new URL('grades.ts', dir), 'utf8');
  assert.match(grades, /const within = \(h: Dyn, z: Dyn, cal: Dyn\) => !exceeds\(Math\.abs\(h\.o\.y - h\.p\.mu\)/);
  assert.match(grades, /return !exceeds\(a, y\) && !exceeds\(y, b\);/);
  assert.match(readFileSync(new URL('directions.ts', dir), 'utf8'), /held: !exceeds\(Math\.abs\(err\), zPlausible \*/);
  assert.match(readFileSync(new URL('calibration.ts', dir), 'utf8'), /const within = .*!exceeds\(/);
});
