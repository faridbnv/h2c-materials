import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DETAIL_LEVELS, estimateTrace, chooseLabels, labelBox } from '../app/js/ui/ashby.js';

const xDef = { label: 'Density', unit: 'kg/m³' };
const yDef = { label: 'Stiffness', unit: 'GPa' };

test('Ashby view names say what each point represents', () => {
  assert.deepEqual(DETAIL_LEVELS.map((d) => d.label), [
    'One material',
    'One matched measurement pair',
    'One mixed-condition pair',
  ]);
});

test('a one-axis estimate is a hoverable range in raw data coordinates', () => {
  const q = {
    id: 'M1', name: 'Example', family: 'PLA',
    x: { lo: 950, hi: 1150, measured: false, precision: 'fair', basis: 'related grades' },
    y: { lo: 4.2, hi: 4.2, measured: true },
  };
  const trace = estimateTrace(q, xDef, yDef, { color: '#3a7ca5' });
  assert.deepEqual(trace.x, [950, 1150]);
  assert.deepEqual(trace.y, [4.2, 4.2]);
  assert.match(trace.mode, /lines/);
  assert.match(trace.hovertemplate, /Estimated material range/);
  assert.match(trace.hovertemplate, /Not a measured point/);
  assert.deepEqual(trace.customdata, [['M1'], ['M1']]);
  assert.equal(trace.line.color, '#3a7ca5');
  assert.equal(trace.legendgroup, 'PLA');
});

test('a two-axis estimate is a closed range box, not a point', () => {
  const q = {
    id: 'M2', name: 'Example 2',
    x: { lo: 900, hi: 1100, measured: false },
    y: { lo: 2, hi: 6, measured: false },
  };
  const trace = estimateTrace(q, xDef, yDef, { color: '#c1622f', fill: 'rgba(193,98,47,.025)' });
  assert.deepEqual(trace.x, [900, 1100, 1100, 900, 900]);
  assert.deepEqual(trace.y, [2, 2, 6, 6, 2]);
  assert.equal(trace.fill, 'toself');
  assert.equal(trace.showlegend, false);
  assert.equal(trace.line.color, '#c1622f');
  assert.equal(trace.fillcolor, 'rgba(193,98,47,.025)');
  assert.equal(Object.hasOwn(trace, 'marker'), false,
    'Plotly crashes when a box trace contains marker: undefined');
});

test('point labels never print over each other, in priority order, and a label that fits nowhere is left off', () => {
  const width = (name) => name.length * 6;
  const bounds = { x0: 0, x1: 400, y0: -14, y1: 300 };
  const at = (name, px, py, trace, index, extra = {}) => ({ name, px, py, trace, index, radius: 5.5, x: px, y: py, ...extra });
  // Five materials in one spot, as the outdoor template's carbon-fibre cluster was, and one far from it.
  const cluster = ['ASA-CF', 'PAHT-CF', 'PA6-CF', 'PA612-ESD', 'CPE-CF'].map((n, i) => at(n, 200 + i * 3, 150 + i * 2, 0, i));
  const far = at('PVDF', 380, 20, 1, 0);
  const front = at('PPA-CF', 100, 250, 2, 0, { front: true });
  const markers = [...cluster, far, front].map((q) => ({ px: q.px, py: q.py, key: `${q.trace}:${q.index}` }));
  const chosen = chooseLabels({ points: [...cluster, far, { ...front }], markers }, bounds, width);
  const boxes = chosen.points.map((q) => labelBox(q.px, q.py, width(q.name), q.position, q.radius));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${chosen.points[i].name} overlaps ${chosen.points[j].name}`);
    }
  }
  const names = chosen.points.map((q) => q.name);
  // The front is placed first; the isolated point before the middle of the cluster; not all five fit in one spot.
  assert.equal(names[0], 'PPA-CF');
  assert.ok(names.includes('PVDF'));
  assert.ok(names.filter((n) => cluster.some((q) => q.name === n)).length < cluster.length);
  // Every label stays inside the plot.
  for (const b of boxes) assert.ok(b.x0 >= bounds.x0 && b.x1 <= bounds.x1 && b.y0 >= bounds.y0 && b.y1 <= bounds.y1);
  // A shortlisted material is labelled first, by a leader line, and a point label then keeps clear of it.
  const pinned = chooseLabels({ pins: [at('PA6-CF', 200, 150, 0, 2)], points: cluster.filter((q) => q.name !== 'PA6-CF'), markers }, bounds, width);
  assert.equal(pinned.pins.length, 1);
  assert.ok(Number.isFinite(pinned.pins[0].ax) && Number.isFinite(pinned.pins[0].ay));
});
