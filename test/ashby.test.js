import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DETAIL_LEVELS, estimateTrace } from '../app/js/ui/ashby.js';

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
