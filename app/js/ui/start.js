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

const OP_WORD = { '>=': 'at least', '<=': 'at most', '>': 'above', '<': 'below' };
const PROP_WORD = {
  density: 'Density', tensileModulusXY: 'Modulus', tensileStrengthXY: 'Strength',
  elongationXY: 'Elongation', hdt045: 'HDT', priceCADkg: 'Price',
};
const UNIT = { density: 'kg/m\u00b3', tensileModulusXY: 'GPa', tensileStrengthXY: 'MPa', elongationXY: '%', hdt045: '\u00b0C', priceCADkg: 'CAD/kg' };
const GATE_WORD = {
  scope: 'H2C-relevant only', nozzle: 'Nozzle fits the H2C', bed: 'Bed fits the H2C',
  chamber: 'Chamber fits the H2C', abrasive: 'Hardened nozzle available',
  dryingKnown: 'Drying schedule published', h2cStatus: 'H2C status',
};

function describe(c) {
  if (c.kind === 'numeric') return `${PROP_WORD[c.property] ?? c.property} ${OP_WORD[c.operator] ?? c.operator} ${c.value} ${UNIT[c.property] ?? ''}`.trim();
  if (c.kind === 'gate') return c.gate === 'h2cStatus' ? `Status: ${(c.in ?? []).join(', ')}` : (GATE_WORD[c.gate] ?? c.gate);
  if (c.kind === 'facet') return (c.in ?? []).map((x) => x.replace(/-/g, ' ')).join(' or ');
  if (c.kind === 'environment') return `${c.category.replace(/-/g, ' ')} resistance`;
  if (c.kind === 'evidence') return 'Evidence quality';
  return c.kind;
}

/**
 * Once a constraint is set the start panel gives way to this: the same visual language, but now
 * reporting what is actually being asked and letting any of it be dropped in one click.
 *
 * The previous build simply removed the start panel, so the moment anyone used the tool they were
 * left with a bare table and no statement of what they had asked for.
 */
export function renderActive(state, actions) {
  const { scenario, selection } = state;
  const cs = scenario.constraints;
  if (!cs.length) return '';
  const hard = cs.filter((c) => c.mandatory !== false);
  const soft = cs.filter((c) => c.mandatory === false);
  const { counts } = selection;

  const pill = (c, i) => `<button class="pill${c.mandatory === false ? ' soft' : ''}" data-drop="${i}"
      title="Remove this criterion">${esc(describe(c))}<span class="x">\u00d7</span></button>`;

  return `
  <section class="active">
    <div class="active-head">
      <div>
        <h2>${counts.pass} of ${counts.total} materials meet ${hard.length === 1 ? 'this requirement' : 'these requirements'}</h2>
        <p>${scenario.template ? `From the <b>${esc(scenario.template)}</b> template. ` : ''}Click any criterion to drop it.</p>
      </div>
      <div class="active-actions">
        <button class="btn btn-sm" data-act="explain">Why the rest were excluded</button>
        <button class="btn btn-sm" data-act="reset">Start over</button>
      </div>
    </div>
    <div class="pills">
      ${hard.map((c) => pill(c, cs.indexOf(c))).join('')}
      ${soft.length ? `<span class="pill-label">preferences</span>${soft.map((c) => pill(c, cs.indexOf(c))).join('')}` : ''}
    </div>
  </section>`;
}

export function wireActive(host, state, actions) {
  host.querySelectorAll('[data-drop]').forEach((b) => b.addEventListener('click', () => {
    actions.relax(state.scenario.constraints[Number(b.dataset.drop)]);
  }));
  host.querySelector('[data-act="explain"]')?.addEventListener('click', () => actions.setLens('explain'));
  host.querySelector('[data-act="reset"]')?.addEventListener('click', () => actions.reset());
}
