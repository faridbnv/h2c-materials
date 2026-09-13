// "Why is my list empty" and "why this candidate".
//
// The exclusion panel ranks criteria by how many candidates each one actually costs, computed by
// removing one constraint at a time. Ranking by damage done is what makes it an answer rather than
// a log.

import { explainExclusions } from '../engine/constraints.js';
import { chip, esc } from './format.js';
import { describeConstraint } from './labels.js';

// The panel used to print raw internal keys here: "hdt045 >= 100", "tensileModulusXY >= 3",
// "scope". The requirement pills on the same screen said "HDT at least 100 °C" because they used a
// different code path. There is now one description, in labels.js, and everything uses it.
const nameOf = describeConstraint;

export function renderExclusions(host, state, actions) {
  const { db, scenario, ctx } = state;
  if (!scenario.constraints.length) {
    host.innerHTML = `<p class="empty">No constraints set, so nothing has been excluded.</p>`;
    return;
  }
  const ranked = explainExclusions(db.materials, scenario.constraints, ctx);
  const max = Math.max(1, ...ranked.map((r) => r.removed + r.held));

  host.innerHTML = `
    <p style="color:var(--ink-2);font-size:13px;margin:0 0 12px">
      Ranked by how many candidates each requirement costs. "Failed" means the evidence does not
      meet it. "Could not check" means the data is missing${state.scenario.unknownPolicy === 'exploration'
        ? ', and those stay listed and flagged because missing data is set to "keep it"'
        : ', and those are out only because missing data is set to "leave it out" in the top bar'}.
      "Removing it" counts the materials that would come back with that one requirement gone.</p>
    ${ranked.map((r, i) => `
      <div class="relax">
        <div>
          <div class="crit">${esc(nameOf(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference</span>' : ''}</div>
          <div class="why" style="font-size:12px;color:var(--ink-2)">
            failed ${r.removed} · could not check ${r.held} · removing it would bring back ${r.recovered} candidate${r.recovered === 1 ? '' : 's'}</div>
          <div class="bar" style="width:${(r.removed / max) * 100}%"></div>
          <div class="held" style="width:${(r.held / max) * 100}%"></div>
        </div>
        <button class="btn btn-sm" data-relax="${i}" aria-label="Remove the requirement: ${esc(nameOf(r.constraint))}">Remove</button>
      </div>`).join('')}
    ${state.scenario.unknownPolicy === 'exploration' ? '' : `<p style="margin-top:16px">
      <button class="btn" id="to-explore">Keep materials with missing data visible instead</button></p>`}`;

  host.querySelectorAll('[data-relax]').forEach((b) => b.addEventListener('click', () => {
    actions.removeConstraint(ranked[Number(b.dataset.relax)].constraint);
  }));
  host.querySelector('#to-explore')?.addEventListener('click', () => actions.setPolicy('exploration'));
}

/** Per-candidate explanation: one line per criterion, with the measurement behind it. */
export function renderWhy(evaluation) {
  if (!evaluation.results.length) return `<p class="missing">No constraints are set.</p>`;
  return evaluation.results.map((r) => `
    <div class="explain-row">
      ${chip(r.status)}
      <div>
        <div class="crit">${esc(describeConstraint(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference only</span>' : ''}</div>
        <div class="why">${esc(r.reason)}${r.measurementId ? ` · <span style="font-family:var(--mono)">${esc(r.measurementId)}</span>` : ''}${r.gradeId ? ` · ${esc(r.gradeId)}` : ''}</div>
      </div>
    </div>`).join('');
}


/**
 * The zero-result screen.
 *
 * Over-constraining is the likeliest mistake a first-time user makes, and the result used to be an
 * empty grid with a column header row and a footnote about em dashes: no explanation, no suggestion,
 * no way out except guessing which filter to undo.
 */
export function renderNoResults(host, state, actions) {
  const { scenario, selection } = state;
  const q = state.search.trim();

  // Four different empty screens, because they have four different ways out. A search for a name
  // the database does not hold used to report "102 materials match, but you have hidden them" and
  // offer a button that changed nothing.
  if (state.subset) {
    host.innerHTML = `<div class="empty"><h3>Nothing in the region you selected on the chart matches</h3>
      <p>The selection from the chart is still narrowing the list${q ? `, together with the search "${esc(q)}"` : ''}.</p>
      <button class="btn btn-primary" id="clear-region">Clear the chart selection</button></div>`;
    host.querySelector('#clear-region').addEventListener('click', () => actions.selectSubset(null));
    return;
  }
  if (q) {
    host.innerHTML = `<div class="empty"><h3>No material is called anything like "${esc(q)}"</h3>
      <p>Search looks at material names, families, fillers and grade IDs. Brand and product names are
        not searched; try the polymer instead, such as PLA, PETG or PA6-CF.</p>
      <button class="btn btn-primary" id="clear-search">Clear the search</button></div>`;
    host.querySelector('#clear-search').addEventListener('click', () => actions.clearSearch());
    return;
  }

  const hidden = selection.candidates.length;
  // Nothing is shown, but candidates exist under result types the user switched off.
  if (hidden > 0) {
    host.innerHTML = `<div class="empty">
      <h3>${hidden} material${hidden === 1 ? '' : 's'} meet${hidden === 1 ? 's' : ''} your requirements, but the result filters hide ${hidden === 1 ? 'it' : 'them'}</h3>
      <p>The buttons at the bottom of the screen choose which kinds of result to show.</p>
      <button class="btn btn-primary" id="show-all">Show the candidates again</button>
    </div>`;
    host.querySelector('#show-all').addEventListener('click', () => actions.showAllStates());
    return;
  }

  if (!scenario.constraints.length) {
    host.innerHTML = `<div class="empty"><h3>Nothing to show</h3>
      <p>No requirements are set and no materials are listed, which should not happen. Reload the page.</p></div>`;
    return;
  }

  host.innerHTML = `
    <div class="empty" style="max-width:820px">
      <h3>No material meets all of these requirements</h3>
      <p>That is a real answer, not an error: nothing in the database does everything you asked.
         The quickest way forward is to drop whichever requirement is costing you the most.</p>
    </div>
    <div id="ranked" style="max-width:820px"></div>`;

  renderExclusions(host.querySelector('#ranked'), state, actions);
}
