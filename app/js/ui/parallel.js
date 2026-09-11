// Parallel coordinates. Axis brushing makes the visualization itself another filter.
// Disabled above 30 candidates, with the button saying why: 100+ lines are unreadable.

import { AXIS_DEFS } from './axes.js';
import { buildFamilyColors, esc } from './format.js';

export const PARALLEL_LIMIT = 30;

export function renderParallel(host, state, actions) {
  const { rows, db } = state;
  if (rows.length > PARALLEL_LIMIT) {
    host.innerHTML = `<div class="empty">
      <h3>Too many candidates for parallel coordinates</h3>
      <p>This view needs ${PARALLEL_LIMIT} or fewer to stay readable. You have ${rows.length}.
      Narrow the constraints, or use the Ashby or Table lens.</p></div>`;
    return;
  }
  const usable = rows.filter(({ material: m }) => AXIS_DEFS.every((a) => m.headline[a.key]?.known));
  if (usable.length < 2) {
    host.innerHTML = `<div class="empty">
      <h3>Not enough complete records</h3>
      <p>Parallel coordinates needs every axis populated for a line to be drawn. Only
      ${usable.length} of ${rows.length} candidates have all six headline properties, so there is
      nothing meaningful to draw. The Coverage lens shows where the gaps are.</p></div>`;
    return;
  }

  const colors = buildFamilyColors(db.materials);
  const families = [...new Set(usable.map((r) => r.material.family))];
  const trace = {
    type: 'parcoords',
    line: {
      color: usable.map((r) => families.indexOf(r.material.family)),
      colorscale: families.map((f, i) => [families.length === 1 ? 0 : i / (families.length - 1), colors.color(f)]),
    },
    dimensions: AXIS_DEFS.map((a) => ({
      label: `${a.label} (${a.unit})`,
      values: usable.map((r) => r.material.headline[a.key].value),
    })),
  };
  const dark = document.documentElement.dataset.theme === 'dark'
    || (matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light');

  host.innerHTML = `<div id="plot"></div>
    <div class="legend-note">${usable.length} of ${rows.length} candidates have all six properties and are drawn.
    Drag along an axis to brush. Colour is polymer family.</div>`;
  Plotly.newPlot(host.querySelector('#plot'), [trace], {
    margin: { l: 80, r: 60, t: 46, b: 20 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: dark ? '#ecedef' : '#1a1a18', size: 11 },
    height: 520,
  }, { displaylogo: false, responsive: true });
}
