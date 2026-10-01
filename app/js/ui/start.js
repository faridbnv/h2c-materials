// The starting panel.
//
// Opening on 102 rows of everything gave the reader no entry point and no sense of what the tool
// was for. This appears only while no constraint is set: it names the workflow in one line and
// offers the application templates as the first move. It disappears the moment a filter is applied.

import { TEMPLATES, templateByName, asksPrintable } from './templates.js';
import { esc } from './format.js';
import { describeConstraint, POLICY_LABELS } from './labels.js';

/**
 * How many materials the tool can select from. A family entry (PA, PA-CF, TPE...) is a name, never a candidate, so it
 * is not counted: the results header said "of the 98 materials" while the rail said "all 103", and both meant the
 * same set.
 */
export const candidateCount = (db) => db.materials.filter((m) => !m.familyEntry).length;

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

    <h2>Start from a typical part, or set your own requirements in Filters.</h2>
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
      <span><b>${candidateCount(db)}</b> materials, <b>${db.meta.counts.h2cRelevant}</b> of them in H2C scope</span>
      <span><b>${db.meta.counts.measurements}</b> measurements, each traceable to a source</span>
      <span><b>${db.meta.headlineCoverage.density}</b> have a density, <b>${db.meta.headlineCoverage.tensileModulusXY}</b> a modulus,
        <b>${db.meta.headlineCoverage.priceCADkg}</b> a price</span>
    </div>
    <p class="start-note">The gaps are the point. Where a property was never published this tool
      shows the gap rather than a guess, so a material is never ranked on a number nobody measured.</p>

    ${limits(db)}
  </section>`;
}

/**
 * What the database cannot answer. It used to live only on the start panel, so it vanished the
 * moment a requirement was set, which is exactly when someone substitutes a nearby metric for the
 * one they wanted.
 */
function limits(db) {
  return `
    <details class="start-limits">
      <summary>What this database cannot answer</summary>
      ${limitsBody(db)}
    </details>`;
}

/** The body of "What this database cannot answer", counted from the snapshot. */
function limitsBody(db) {
  // Counted from the snapshot, not typed in: each new manufacturer audit moves them.
  const profiles = db.profiles.length;
  const stated = (v) => v && !/^not published$/i.test(String(v).trim());
  const ams = db.profiles.filter((p) => stated(p.routing.amsPublished)).length;
  const enclosure = db.profiles.filter((p) => stated(p.enclosure)).length;
  const warping = db.evidence.filter((e) => /warp/i.test(e.topic ?? '')).length;
  return `
      <p>Some things a printer owner often wants are barely recorded in the sources this was built
        from, so no filter can answer them. If you came for one of these, this tool will not settle it.</p>
      <ul>
        <li><b>Warping and first-layer behaviour.</b> ${warping} records in the entire database. There is
          no basis for saying which material warps more than another.</li>
        <li><b>AMS compatibility.</b> Published for ${ams} of ${profiles} print profiles. Every other profile
          says to verify the exact grade, so the tool shows that text rather than a yes or no.</li>
        <li><b>Whether an enclosure is needed.</b> Answerable for ${enclosure} of ${profiles} profiles. Chamber
          temperature is recorded far more often and is the closest usable proxy.</li>
        <li><b>UV and outdoor life, food contact, creep, fatigue.</b> Narrative notes only, never a
          verdict. Read them in a material's Environment tab.</li>
        <li><b>Which exact product has every property.</b> A row shows a material as the spread of its
          products, so no one product need have every value. Check its Products tab before buying.</li>
      </ul>
      <p>Colour choice, print speed and layer-adhesion tuning are likewise out of scope. This is a
        materials database, not a profile library.</p>`;
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

  // Under Include uncertain the table lists the materials that could not be checked beside the ones that passed, so
  // the heading counts both. "15 meet these requirements" above 23 rows read as a contradiction; the other 8 were
  // listed and nothing on screen said what they were. An estimate may hold some of them out, and that is said too.
  const screened = explore && state.ctx?.useEstimates ? counts.screened : 0;
  const unknownClause = counts.unknown && explore ? `, and ${counts.unknown} more could not be checked for missing data` : '';
  const unknownSentence = !counts.unknown ? ''
    : explore ? `${POLICY_LABELS.exploration} lists those ${counts.unknown} flagged${screened
      ? `, except the ${screened} screened out by an estimate or the base polymer's published behaviour; the SCREENED chip at the bottom shows them` : ''}. `
    : `${counts.unknown} more could not be checked for missing data, and are left out under ${POLICY_LABELS.strict}. `;

  // How the products are judged (D99): the state every verdict below is in, and what annealing would add. The materials
  // it would add are named in the button's title, so the line stays one line.
  const gain = state.annealGain ?? [];
  const judgedAs = `${scenario.anneal ? `as printed, or annealed at its sheet's schedule${scenario.annealMaxC ? ` up to ${scenario.annealMaxC} °C` : ''}` : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned by moisture' : 'dry'}`;
  const printable = asksPrintable(cs);
  const stateLine = `<p class="state-line"><b>Each product is judged</b> ${esc(judgedAs)}${printable ? ', and must be printable on the H2C' : ''}.${gain.length
    ? ` <button type="button" class="btn btn-sm" data-act="anneal" title="${esc(`Would pass with annealing: ${gain.map((id) => state.db.materials.find((m) => m.id === id)?.name ?? id).join(', ')}`)}">Allow annealing: ${gain.length} more pass</button>` : ''}</p>`;

  // What was asked, as compact as the answer allows (the review of 2026-09-27, F09): the answer in one line with what
  // could not be checked beside it, the requirements as pills, how the products are judged in one line, and the
  // template's limits, the policy's detail and the database's limits one press away, their first sentence showing. The
  // rows are what a working engineer came for.
  const printGates = new Set(['nozzle', 'bed', 'chamber']);
  const shownHard = printable ? hard.filter((c) => !(c.kind === 'gate' && printGates.has(c.gate))) : hard;
  const firstSentence = (t) => (String(t).match(/^[^.:]+[.:]/)?.[0] ?? String(t)).replace(/[.:]$/, '');
  const beside = [scenario.template ? `${scenario.template} template${sameAsTemplate ? '' : ', changed'}` : null,
    counts.unknown ? `${counts.unknown} more could not be checked${explore ? `, listed flagged${screened ? `, except ${screened} screened out` : ''}` : `, left out under ${POLICY_LABELS.strict}`}` : null].filter(Boolean).join(' · ');
  return `
  <section class="active compact">
    <div class="active-head">
      <div>
        <h2>${counts.pass} of the ${counts.total} materials meet ${hard.length === 1 ? 'this requirement' : 'these requirements'}</h2>
        ${beside ? `<p>${esc(beside)}</p>` : ''}
      </div>
      <div class="active-actions">
        <button class="btn btn-sm btn-primary read-candidates" data-act="read">Read the candidates</button>
        <button class="btn btn-sm" data-act="explain">Why the rest were excluded</button>
        <button class="btn btn-sm" data-act="reset" title="Removes every requirement. Search, shortlist and view stay as they are.">Clear requirements</button>
      </div>
    </div>
    <div class="pills" title="Press a requirement to remove it">
      ${printable ? `<button class="pill" data-drop-printable title="Remove the print gates: research mode">Printable on the H2C<span class="x" aria-hidden="true">\u00d7</span></button>` : ''}
      ${shownHard.map((c) => pill(c, cs.indexOf(c))).join('')}
      ${soft.length ? `<span class="pill-group"><span class="pill-label" title="Reported on each material; never removes or reorders one">tracked only</span>${soft.map((c) => pill(c, cs.indexOf(c))).join('')}</span>` : ''}
    </div>
    ${stateLine}
    ${printable ? '' : `<p class="state-line research-line"><b>Print checks off:</b> whether the H2C can print a product is not checked, so a pass here says nothing about printing it. <button type="button" class="btn btn-sm" data-act="printable">Check printability</button></p>`}
    <details class="answer-notes">
      <summary>${template ? `<b>Not checked by this template:</b> ${esc(firstSentence(template.notChecked))}` : '<b>What this database cannot answer</b>'}</summary>
      ${template ? `<p class="not-checked">${esc(template.notChecked)}</p>` : ''}
      ${unknownSentence ? `<p>${esc(unknownSentence)}</p>` : ''}
      ${limitsBody(state.db)}
    </details>
  </section>`;
}

export function wireActive(host, state, actions) {
  host.querySelectorAll('[data-drop]').forEach((b) => b.addEventListener('click', () => {
    actions.removeConstraint(state.scenario.constraints[Number(b.dataset.drop)]);
  }));
  host.querySelector('[data-act="explain"]')?.addEventListener('click', () => actions.setLens('explain'));
  // On a phone the header is a screen tall: one press to the first candidate, which takes focus (F09).
  host.querySelector('[data-act="read"]')?.addEventListener('click', () => {
    const first = host.querySelector('tbody tr[data-material]') ?? host.querySelector('.empty');
    first?.scrollIntoView({ block: 'start' });
    first?.focus?.({ preventScroll: true });
  });
  host.querySelector('[data-act="reset"]')?.addEventListener('click', () => actions.reset());
  host.querySelector('[data-act="anneal"]')?.addEventListener('click', () => actions.allowAnnealing());
  host.querySelector('[data-act="printable"]')?.addEventListener('click', () => actions.checkPrintable());
  host.querySelector('[data-drop-printable]')?.addEventListener('click', () => {
    state.scenario.constraints = state.scenario.constraints.filter((c) => !(c.kind === 'gate' && ['nozzle', 'bed', 'chamber'].includes(c.gate)));
    actions.changed();
  });
}
