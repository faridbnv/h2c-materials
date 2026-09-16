// Sorting the results table with estimates (plan D4): an estimated row sorts by its estimate's centre while estimates are
// shown, a measured row comes before an estimated one at the same value, and with estimates hidden nothing estimated
// counts, so estimated rows sort last in both directions as missing values do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useRegistry } from '../app/js/ui/registry.js';
import { sortRows } from '../app/js/ui/table.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));

const row = (id, headline, print = {}) => ({
  material: { id, name: id, headline: { tensileModulusXY: headline }, print, gates: {} },
  evaluation: { verdict: 'UNKNOWN' },
});
const measured = (value) => ({ known: true, value });
const estimate = (lo, centre, hi) => ({ known: false, estimate: { lo, centre, hi, unit: 'GPa' } });

const rows = [
  row('A-measured-2', measured(2)),
  row('B-estimated-3', estimate(1, 3, 6)),
  row('C-missing', { known: false, missing: 'not-published' }),
  row('D-measured-4', measured(4)),
  row('E-estimated-2', estimate(1.5, 2, 2.8)),
  row('F-estimated-0.04', estimate(0.009, 0.04, 0.2)),
];
const order = (dir, showEstimates, columnSet = 'properties', key = 'tensileModulusXY', list = rows) =>
  sortRows(list, { sort: { key, dir }, columnSet, ctx: { showEstimates } }).map((r) => r.material.id);

test('with estimates shown, an estimated row sorts by its centre, measured first at a tie, missing last', () => {
  useRegistry(db.registry);
  assert.deepEqual(order('asc', true), ['F-estimated-0.04', 'A-measured-2', 'E-estimated-2', 'B-estimated-3', 'D-measured-4', 'C-missing']);
  assert.deepEqual(order('desc', true), ['D-measured-4', 'B-estimated-3', 'A-measured-2', 'E-estimated-2', 'F-estimated-0.04', 'C-missing']);
});

test('with estimates hidden, estimated rows sort last in both directions, as they did', () => {
  useRegistry(db.registry);
  const asc = order('asc', false);
  const desc = order('desc', false);
  assert.deepEqual(asc.slice(0, 2), ['A-measured-2', 'D-measured-4']);
  assert.deepEqual(desc.slice(0, 2), ['D-measured-4', 'A-measured-2']);
  for (const list of [asc, desc]) assert.deepEqual(new Set(list.slice(2)), new Set(['B-estimated-3', 'C-missing', 'E-estimated-2', 'F-estimated-0.04']));
});

test('an estimated print window sorts by its top beside published windows, only while estimates are shown', () => {
  useRegistry(db.registry);
  const windows = [
    row('published-260', null, { nozzleC: { min: 240, max: 260 } }),
    row('estimated-285', null, { nozzleEstimate: { lo: 270, hi: 285 } }),
    row('published-300', null, { nozzleC: { min: 280, max: 300 } }),
    row('none', null, {}),
  ];
  assert.deepEqual(order('desc', true, 'printing', 'nozzleC', windows), ['published-300', 'estimated-285', 'published-260', 'none']);
  assert.deepEqual(order('desc', false, 'printing', 'nozzleC', windows).slice(0, 2), ['published-300', 'published-260']);
});
