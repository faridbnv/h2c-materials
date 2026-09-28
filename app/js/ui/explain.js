// "Why is my list empty" and "why this candidate".
//
// The exclusion panel ranks criteria by how many candidates each one actually costs, computed by
// removing one constraint at a time. Ranking by damage done is what makes it an answer rather than
// a log.

import { explainExclusions } from '../engine/constraints.js';
import { chip, esc } from './format.js';
import { describeConstraint, POLICY_CONTROL, POLICY_LABELS } from './labels.js';

// The panel used to print raw internal keys here: "hdt045 >= 100", "tensileModulusXY >= 3",
// "scope". The requirement pills on the same screen said "HDT at least 100 °C" because they used a
// different code path. There is now one description, in labels.js, and everything uses it.
const nameOf = describeConstraint;

/**
 * How many of a requirement's unchecked materials a screen held out, and by what: an estimate, or the base polymer's
 * published behaviour (D64), which the engine counts apart so the panel can say which.
 */
function screenedClause(r) {
  const byPolymer = r.screenedByPolymer ?? 0;
  const byEstimate = r.screened - byPolymer;
  if (!byPolymer) return `${r.screened} of them screened by an estimate`;
  if (!byEstimate) return `${byPolymer} of them screened by the base polymer's published behaviour`;
  return `${r.screened} of them screened: ${byEstimate} by an estimate, ${byPolymer} by the base polymer's published behaviour`;
}

export function renderExclusions(host, state, actions) {
  const { db, scenario, ctx } = state;
  if (!scenario.constraints.length) {
    // A tab that is always offered must lead somewhere. One sentence saying nothing was excluded left the reader on a
    // page with no next step, in a word ("constraints") the rest of the interface does not use.
    host.innerHTML = `<div class="empty">
      <h3>No requirements set yet</h3>
      <p>This tab explains which requirements removed which materials. Nothing has been removed, because nothing has
        been asked.</p>
      <p><button class="btn btn-primary" id="to-start">Start from a typical part</button></p>
      <p class="fine">Or set your own requirements under Filters. This tab then ranks them by how many materials each
        one removes.</p>
    </div>`;
    host.querySelector('#to-start').addEventListener('click', () => actions.setLens('table'));
    return;
  }
  const ranked = explainExclusions(db.materials.filter((m) => !m.familyEntry), scenario.constraints, ctx);
  const max = Math.max(1, ...ranked.map((r) => r.removed + r.held));
  const explore = state.scenario.unknownPolicy === 'exploration';

  host.innerHTML = `
    <p style="color:var(--ink-2);font-size:13px;margin:0 0 12px">
      Ranked by how many candidates each requirement costs. "Failed" means the evidence does not
      meet it. "Could not check" means the data is missing${explore
        ? `, and those stay listed and flagged because ${POLICY_CONTROL} is set to "${POLICY_LABELS.exploration}"`
        : `, and those are out only because ${POLICY_CONTROL} is set to "${POLICY_LABELS.strict}" in the top bar`}.
      "Removing it" counts the materials that would come back with that one requirement gone.</p>
    ${ranked.map((r, i) => `
      <div class="relax">
        <div>
          <div class="crit">${esc(nameOf(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference</span>' : ''}</div>
          <div class="why" style="font-size:12px;color:var(--ink-2)">
            failed ${r.removed} · could not check ${r.held}${r.screened ? ` (${screenedClause(r)})` : ''} · removing it would bring back ${r.recovered} candidate${r.recovered === 1 ? '' : 's'}</div>
          <div class="bar" style="width:${(r.removed / max) * 100}%"></div>
          <div class="held" style="width:${(r.held / max) * 100}%"></div>
        </div>
        <button class="btn btn-sm" data-relax="${i}" aria-label="Remove the requirement: ${esc(nameOf(r.constraint))}">Remove</button>
      </div>`).join('')}
    ${explore ? '' : `<p style="margin-top:16px">
      <button class="btn" id="to-explore">Switch to ${POLICY_LABELS.exploration}</button>
      <span class="fine">Materials that could not be checked stay listed, flagged.</span></p>`}`;

  host.querySelectorAll('[data-relax]').forEach((b) => b.addEventListener('click', () => {
    actions.removeConstraint(ranked[Number(b.dataset.relax)].constraint);
  }));
  host.querySelector('#to-explore')?.addEventListener('click', () => actions.setPolicy('exploration'));
}

/** Per-candidate explanation: one line per criterion, with the measurement behind it and the product it is from. */
export function renderWhy(evaluation, { productName } = {}) {
  if (!evaluation.results.length) return `<p class="missing">No requirements are set.</p>`;
  // One list, so the result chips share a column and the text beside them one left edge (app.css).
  return `<div class="explain-list">${evaluation.results.map((r) => `
    <div class="explain-row">
      ${chip(r.status)}
      <div>
        <div class="crit">${esc(describeConstraint(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">preference only</span>' : ''}</div>
        <div class="why">${esc(r.reason)}${r.measurementId
          // The measurement a result rests on, labelled and one press away (wireEvidence opens it), where a bare code had
          // named it and led nowhere.
          ? ` · measurement <button type="button" class="link-btn" data-measurement="${esc(r.measurementId)}" title="Opens the measurement behind this result">${esc(r.measurementId)}</button>` : ''}${r.gradeId ? ` · ${esc(productName?.(r.gradeId) ? `${productName(r.gradeId)} (${r.gradeId})` : `product ${r.gradeId}`)}` : ''}${r.polymer
          // A result that rests on the base polymer's published behaviour says so, and where its rows are (D64).
          ? ` · from the base polymer ${esc(r.polymerId)}, shown on the Environment tab` : ''}</div>
      </div>
    </div>`).join('')}</div>`;
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
      <p>Search looks at material names, families, polymers, fillers and product IDs (G…), and at the maker and
        name of each product. A product this database does not hold finds nothing; try its polymer instead,
        such as PLA, PETG or PA6-CF.</p>
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

  // Three different answers, with three different ways forward (the review of 2026-09-27, U08): no material could be
  // confirmed at all (every one unresolved), which says the records cannot answer the question, not that nothing suits
  // it; every material was measured and failed; or some of each. A requirement the records could not confirm for any
  // material is named, because dropping it abandons the part's real need.
  const { counts } = selection;
  const unconfirmable = scenario.constraints.filter((c) => c.mandatory !== false && unconfirmed(selection, c));
  const explore = scenario.unknownPolicy === 'exploration';
  const next = `<ul class="next-steps">
      ${counts.unknown ? `<li>${explore ? 'Include uncertain lists them already; the SCREENED chip brings back any an estimate held out.' : `<button type="button" class="btn btn-sm" id="to-explore">Include uncertain</button> lists the ${counts.unknown} that could not be checked, flagged, so you can see what is missing for each.`}</li>` : ''}
      ${unconfirmable.length ? `<li>Open a material's Environment or Products tab for what its makers do say, and plan a test of your own part for ${esc(unconfirmable.map(describeConstraint).join('; '))}: no record here can confirm it.</li>` : ''}
      <li>The ranked list below says which requirement holds out the most, and which only failed.</li>
    </ul>`;
  const lead = !counts.fail && counts.unknown
    ? `<h3>No material can be confirmed from the current records: all ${counts.unknown} are unresolved</h3>
       <p>Nothing failed. The records cannot confirm ${unconfirmable.length ? esc(unconfirmable.map(describeConstraint).join('; ')) : 'these requirements'} for any material, which says what the database lacks, not that no material suits the part. Keep the requirement if the part needs it.</p>`
    : counts.fail && !counts.unknown
      ? `<h3>No material meets all of these requirements: every one was measured and fails</h3>
       <p>That is a real answer, not an error. The quickest way forward is to relax whichever requirement is costing you the most.</p>`
      : `<h3>No material is confirmed to meet all of these requirements</h3>
       <p>${counts.fail} failed a requirement on its own records, and ${counts.unknown} could not be checked, so not everything here is ruled out.${unconfirmable.length ? ` No material's records can confirm ${esc(unconfirmable.map(describeConstraint).join('; '))}.` : ''}</p>`;
  host.innerHTML = `
    <div class="empty" style="max-width:820px">${lead}${next}</div>
    <div id="ranked" style="max-width:820px"></div>`;
  host.querySelector('#to-explore')?.addEventListener('click', () => actions.setPolicy('exploration'));

  renderExclusions(host.querySelector('#ranked'), state, actions);
}

/** Whether no material's records confirm a requirement: none passes it, on any of its products. */
function unconfirmed(selection, c) {
  return selection.evaluations.every((e) => {
    const results = e.products?.length ? e.products.flatMap((p) => p.results ?? []) : e.results ?? [];
    return !results.some((r) => r.constraint === c && r.status === 'PASS');
  });
}
