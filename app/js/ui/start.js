// The starting panel.
//
// Opening on 102 rows of everything gave the reader no entry point and no sense of what the tool
// was for. This appears only while no constraint is set: it names the workflow in one line and
// offers the application templates as the first move. It disappears the moment a filter is applied.

import { TEMPLATES } from './templates.js';
import { esc } from './format.js';

export function renderStart(state, actions) {
  if (state.scenario.constraints.length) return '';
  const { db } = state;
  return `
  <section class="start">
    <div class="start-flow">
      <span class="step"><b>1</b> Set requirements</span><i>&rsaquo;</i>
      <span class="step"><b>2</b> Read the candidates</span><i>&rsaquo;</i>
      <span class="step"><b>3</b> Compare the trade-offs</span><i>&rsaquo;</i>
      <span class="step"><b>4</b> Check the evidence</span>
    </div>

    <h2>Start from a typical part, or set your own constraints on the left.</h2>
    <p>A template only fills in the controls. Every value it sets stays editable, and nothing is
      decided for you.</p>

    <div class="start-grid">
      ${TEMPLATES.map((t, i) => `
        <button class="start-card" data-template="${i}">
          <span class="start-card-name">${esc(t.name)}</span>
          <span class="start-card-desc">${esc(t.description)}</span>
        </button>`).join('')}
    </div>

    <div class="start-facts">
      <span><b>${db.meta.counts.h2cRelevant}</b> materials in H2C scope</span>
      <span><b>${db.meta.counts.measurements}</b> measurements, each traceable to a source</span>
      <span><b>${db.meta.headlineCoverage.density}</b> have a density, <b>${db.meta.headlineCoverage.tensileModulusXY}</b> a modulus,
        <b>${db.meta.headlineCoverage.priceCADkg}</b> a Canadian price</span>
    </div>
    <p class="start-note">The gaps are the point. Where a property was never published this tool
      shows the gap rather than a guess, so a material is never ranked on a number nobody measured.</p>
  </section>`;
}

export function wireStart(host, actions) {
  host.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => {
    actions.applyTemplate(TEMPLATES[Number(b.dataset.template)]);
  }));
}
