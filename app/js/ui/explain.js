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
      Ranked by how many candidates each criterion costs. "Removed" failed the test.
      "Held" could not be evaluated and is excluded only because the mode is Strict.</p>
    ${ranked.map((r, i) => `
      <div class="relax">
        <div>
          <div class="crit">${esc(nameOf(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference</span>' : ''}</div>
          <div class="why" style="font-size:12px;color:var(--ink-2)">
            removed ${r.removed} · held ${r.held} · dropping it would return ${r.recovered} candidate${r.recovered === 1 ? '' : 's'}</div>
          <div class="bar" style="width:${(r.removed / max) * 100}%"></div>
          <div class="held" style="width:${(r.held / max) * 100}%"></div>
        </div>
        <button class="btn btn-sm" data-relax="${i}">Relax</button>
      </div>`).join('')}
    <p style="margin-top:16px">
      <button class="btn" id="to-explore">Switch to Explore mode and keep unknowns visible</button></p>`;

  host.querySelectorAll('[data-relax]').forEach((b) => b.addEventListener('click', () => {
    actions.relax(ranked[Number(b.dataset.relax)].constraint);
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
        <div class="crit">${esc(r.criterion)}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference only</span>' : ''}</div>
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
  const hidden = selection.candidates.length;

  // Nothing passed, but the user has also hidden the states that did match.
  if (hidden > 0) {
    host.innerHTML = `<div class="empty">
      <h3>${hidden} material${hidden === 1 ? '' : 's'} match, but you have hidden them</h3>
      <p>The buttons at the bottom of the screen choose which results to show. Turn one back on.</p>
      <button class="btn btn-primary" id="show-all">Show everything that matched</button>
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
