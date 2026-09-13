// The starting panel.
//
// Opening on 102 rows of everything gave the reader no entry point and no sense of what the tool
// was for. This appears only while no constraint is set: it names the workflow in one line and
// offers the application templates as the first move. It disappears the moment a filter is applied.

import { TEMPLATES, templateByName } from './templates.js';
import { esc } from './format.js';
import { describeConstraint } from './labels.js';

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

    ${limits()}
  </section>`;
}

/**
 * What the database cannot answer. It used to live only on the start panel, so it vanished the
 * moment a requirement was set, which is exactly when someone substitutes a nearby metric for the
 * one they wanted.
 */
function limits() {
  return `
    <details class="start-limits">
      <summary>What this database cannot answer</summary>
      <p>Some things a printer owner often wants are barely recorded in the sources this was built
        from, so no filter can answer them. If you came for one of these, this tool will not settle it.</p>
      <ul>
        <li><b>Warping and first-layer behaviour.</b> Six records in the entire database. There is
          no basis for saying which material warps more than another.</li>
        <li><b>AMS compatibility.</b> Published for 5 of 156 print profiles. Every other profile
          says to verify the exact grade, so the tool shows that text rather than a yes or no.</li>
        <li><b>Whether an enclosure is needed.</b> Answerable for 14 of 156 profiles. Chamber
          temperature is recorded far more often and is the closest usable proxy.</li>
        <li><b>UV and outdoor life, food contact, creep, fatigue.</b> Narrative notes only, never a
          verdict. Read them in a material's Environment tab.</li>
        <li><b>Which exact product has every property.</b> A row combines the evidence recorded
          for a material, which can come from different grades. Check the Grades tab before buying.</li>
      </ul>
      <p>Colour choice, print speed and layer-adhesion tuning are likewise out of scope. This is a
        materials database, not a profile library.</p>
    </details>`;
}

export function wireStart(host, actions) {
  host.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => {
    actions.applyTemplate(TEMPLATES[Number(b.dataset.template)]);
  }));
}

// The pills said "Modulus at least 3 GPa" while the explain panel said "tensileModulusXY >= 3" for
// the same criterion, because each had its own describe(). There is one now, in labels.js.
const describe = describeConstraint;

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
  const explore = scenario.unknownPolicy === 'exploration';
  const template = templateByName(scenario.template);
  const sameAsTemplate = template
    && JSON.stringify(template.constraints) === JSON.stringify(cs);

  const pill = (c, i) => `<button class="pill${c.mandatory === false ? ' soft' : ''}" data-drop="${i}"
      title="Remove this requirement">${esc(describe(c))}<span class="x" aria-hidden="true">\u00d7</span></button>`;

  return `
  <section class="active">
    <div class="active-head">
      <div>
        <h2>${counts.pass} of the ${counts.total} materials in this database meet
          ${hard.length === 1 ? 'this requirement' : 'these requirements'}</h2>
        <p>${counts.unknown ? `${counts.unknown} more could not be checked for missing data${explore ? ', and are listed flagged' : ', and are left out'}. ` : ''}${scenario.template ? `From the <b>${esc(scenario.template)}</b> template${sameAsTemplate ? '' : ', since changed'}. ` : ''}Click any criterion to remove it.</p>
      </div>
      <div class="active-actions">
        <button class="btn btn-sm" data-act="explain">Why the rest were excluded</button>
        <button class="btn btn-sm" data-act="reset" title="Removes every requirement. Search, shortlist and view stay as they are.">Clear requirements</button>
      </div>
    </div>
    ${template ? `<p class="not-checked"><b>Not checked by this template.</b> ${esc(template.notChecked)}</p>` : ''}
    <div class="pills">
      ${hard.map((c) => pill(c, cs.indexOf(c))).join('')}
      ${soft.length ? `<span class="pill-label" title="Reported on each material; never removes or reorders one">tracked only</span>${soft.map((c) => pill(c, cs.indexOf(c))).join('')}` : ''}
    </div>
    ${limits()}
  </section>`;
}

export function wireActive(host, state, actions) {
  host.querySelectorAll('[data-drop]').forEach((b) => b.addEventListener('click', () => {
    actions.removeConstraint(state.scenario.constraints[Number(b.dataset.drop)]);
  }));
  host.querySelector('[data-act="explain"]')?.addEventListener('click', () => actions.setLens('explain'));
  host.querySelector('[data-act="reset"]')?.addEventListener('click', () => actions.reset());
}
