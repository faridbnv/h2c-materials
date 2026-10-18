// "Why is my list empty" and "why this candidate".
//
// The exclusion panel ranks criteria by how many candidates each one actually costs, computed by
// removing one constraint at a time. Ranking by damage done is what makes it an answer rather than
// a log.

import { explainExclusions } from '../engine/constraints.js';
import { chip, esc } from './format.js';
import { describeConstraint, POLICY_LABELS, H2C_CHECK } from './labels.js';
import { lower } from './text.js';

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
  if (!byPolymer) return `${r.screened} of them excluded by an estimate`;
  if (!byEstimate) return `${byPolymer} of them excluded by resin reference data`;
  return `${r.screened} of them excluded: ${byEstimate} by an estimate, ${byPolymer} by resin reference data`;
}

export function renderExclusions(host, state, actions) {
  const { db, scenario, ctx } = state;
  if (!scenario.constraints.length) {
    // A tab that is always offered must lead somewhere. One sentence saying nothing was excluded left the reader on a
    // page with no next step, in a word ("constraints") the rest of the interface does not use.
    host.innerHTML = `<div class="empty">
      <h3>No requirements set yet</h3>
      <p>This tab ranks your requirements by how many materials each one removes. Nothing is removed yet.</p>
      <p><button class="btn btn-primary" id="to-start">Start from a typical part</button></p>
      <p class="fine">Or set your own requirements in Filters.</p>
    </div>`;
    host.querySelector('#to-start').addEventListener('click', () => actions.setLens('table'));
    return;
  }
  const ranked = explainExclusions(db.materials.filter((m) => !m.familyEntry), scenario.constraints, ctx);
  const max = Math.max(1, ...ranked.map((r) => r.removed + r.held));
  const explore = state.scenario.unknownPolicy === 'exploration';
  const indexed = ranked.map((r, i) => [r, i]);
  const required = indexed.filter(([r]) => r.constraint.mandatory !== false);
  // A requirement reported for each material but never applied removes nothing: it is listed apart, under a rule, so its
  // counts do not read as candidates it cost.
  const reported = indexed.filter(([r]) => r.constraint.mandatory === false);
  const isPrintGate = (r) => r.constraint.kind === 'gate' && ['nozzle', 'bed', 'chamber'].includes(r.constraint.gate);
  const printRows = required.filter(([r]) => isPrintGate(r));
  const relaxRow = (r, i) => `
      <div class="relax">
        <div>
          <div class="crit">${esc(nameOf(r.constraint))}</div>
          <div class="why" style="font-size:12px;color:var(--ink-2)">
            failed ${r.removed} · could not check ${r.held}${r.screened ? ` (${screenedClause(r)})` : ''} · removing it would bring back ${r.recovered} candidate${r.recovered === 1 ? '' : 's'}</div>
          <div class="bar" style="width:${(r.removed / max) * 100}%"></div>
          <div class="held" style="width:${(r.held / max) * 100}%"></div>
        </div>
        <button class="btn btn-sm" data-relax="${i}" aria-label="Remove the requirement: ${esc(nameOf(r.constraint))}">Remove</button>
      </div>`;

  host.innerHTML = `
    <p style="color:var(--ink-2);font-size:13px;margin:0 0 12px">
      Each requirement, ranked by how many candidates it costs. <b>Failed:</b> the published value misses it.
      <b>Could not check:</b> the data is missing; ${explore
        ? 'these stay listed, flagged, since the materials that could not be checked are included'
        : `these are out only because the materials that could not be checked are set to "${POLICY_LABELS.strict}" in the top bar`}.
      <b>Removing it</b> counts the materials that would come back without that one requirement.</p>
    ${required.map(([r, i]) => {
      // The H2C's three temperature checks under the one name the pill and the rail give them (REVIEW-0 F11), placed
      // where the first of them ranks, each still with its own counts and its Remove.
      if (!isPrintGate(r) || printRows.length < 2) return relaxRow(r, i);
      if (r !== printRows[0][0]) return '';
      return `<div class="relax-group"><div class="relax-group-head">${esc(H2C_CHECK)}</div>${printRows.map(([g, j]) => relaxRow(g, j)).join('')}</div>`;
    }).join('')}
    ${reported.length ? `<div class="relax-group relax-reported"><div class="relax-group-head">Reported, not required
      <span class="fine">shown for each material; it removes none, and its counts say what it would remove if required</span></div>
      ${reported.map(([r, i]) => relaxRow(r, i)).join('')}</div>` : ''}
    ${explore ? '' : `<p style="margin-top:16px">
      <button class="btn" id="to-explore">Include the materials that could not be checked</button>
      <span class="fine">They then stay listed, flagged, with what is missing for each.</span></p>`}`;

  host.querySelectorAll('[data-relax]').forEach((b) => b.addEventListener('click', () => {
    actions.removeConstraint(ranked[Number(b.dataset.relax)].constraint);
  }));
  host.querySelector('#to-explore')?.addEventListener('click', () => actions.setPolicy('exploration'));
}

/** Requirements that hold of the material as a whole and say nothing about a product: folded into one line when they pass. */
// The H2C's print checks pass or fail per product too, but the drawer's H2C printability section answers them for every
// product, so a passing one is folded into the same line rather than repeated.
const MATERIAL_LEVEL = (c) => (c.kind === 'gate' && ['scope', 'nozzle', 'bed', 'chamber'].includes(c.gate)) || (c.kind === 'facet' && c.facet === 'supportMaterial');

/**
 * The product a material's requirements lines are one product's of (see renderWhy): { gradeId, results }, its results
 * being what the lines show. The drawer's Products tab opens the same product first, so the two never name two.
 */
export function shownProduct(evaluation) {
  const open = (rows) => rows.some((r) => r.constraint?.mandatory === false && r.status === 'UNKNOWN');
  const meets = (rows) => rows.every((r) => r.constraint?.mandatory !== false || r.status === 'PASS');
  const passingProducts = (evaluation.products ?? []).filter((p) => p.verdict === 'PASS' && p.results?.length);
  const alt = evaluation.verdict === 'PASS' && !meets(evaluation.results)
    ? passingProducts.find((p) => meets(p.results)) ?? (open(evaluation.results) ? passingProducts.find((p) => !open(p.results)) : null) ?? null : null;
  return alt ? { gradeId: alt.gradeId, results: alt.results } : { gradeId: evaluation.gradeId ?? null, results: evaluation.results };
}

/**
 * A material against the requirements, one line per requirement: its result, the requirement, and what decided it, with
 * the measurement one press away. The lines are one product's, named once above them; a line that rests on another
 * product names its own. Record IDs stay in the button's title: the line is for reading (D124).
 *
 * The product shown (2026-10-18): the engine's (the first that passes, else the closest), unless it passes while leaving
 * a requirement that is reported, not required, unanswered and another passing product answers it. PLA had been shown
 * for a product with no price under a template that reports price, beside 182 passing products, most of them priced.
 * Display only: the material's answer and the engine's product, which the brief and the exports keep, do not change.
 */
export function renderWhy(evaluation, { productName } = {}) {
  if (!evaluation.results.length) return `<p class="missing">No requirements are set.</p>`;
  const { gradeId: best, results } = shownProduct(evaluation);
  const name = (id) => productName?.(id) || 'a product';
  const trivial = results.filter((r) => MATERIAL_LEVEL(r.constraint) && r.status === 'PASS');
  const rows = results.filter((r) => !trivial.includes(r));
  const passing = evaluation.counts?.pass ?? 0;
  const head = !best ? '' : evaluation.verdict === 'PASS'
    ? `<p class="fine why-on">Shown for <b>${esc(name(best))}</b>${passing > 1 ? `, one of the ${passing} that pass` : ', the product that passes'}.</p>`
    : `<p class="fine why-on">Shown for its closest product, <b>${esc(name(best))}</b>.</p>`;
  // The three H2C limits a product's settings are within are one requirement to a reader: said once in "Also met".
  const GATES = ['nozzle', 'bed', 'chamber'];
  const gates = trivial.filter((r) => r.constraint.kind === 'gate' && GATES.includes(r.constraint.gate));
  const also = [...trivial.filter((r) => !gates.includes(r)).map((r) => lower(describeConstraint(r.constraint))),
    ...(gates.length === GATES.length ? [lower(H2C_CHECK)] : gates.map((r) => lower(describeConstraint(r.constraint))))];
  // One list, so the result chips share a column and the text beside them one left edge (app.css). A requirement the
  // product's sheets cannot settle (the engine's INDETERMINATE: a chamber recommended above the H2C's, not required)
  // reads UNKNOWN, as the table counts it, its half-filled mark and its reason kept.
  return `${head}<div class="explain-list">${rows.map((r) => `
    <div class="explain-row">
      ${r.constraint.mandatory === false
        // A requirement reported, not required, decides nothing: its mark is neutral, its words say where the value stands.
        ? `<span class="chip chip-neutral">${{ PASS: 'within', FAIL: 'beyond', UNKNOWN: 'no data', INDETERMINATE: 'no data' }[r.status] ?? esc(r.status)}</span>`
        : chip(r.status, r.status === 'INDETERMINATE' ? 'UNKNOWN' : r.status)}
      <div>
        <div class="crit">${esc(describeConstraint(r.constraint))}${r.constraint.mandatory === false ? ' <span class="chip chip-neutral" style="font-size:10px">reported, not required</span>' : ''}</div>
        <div class="why">${esc(r.reason)}${r.gradeId && r.gradeId !== best ? ` (${esc(name(r.gradeId))})` : ''}${r.measurementId
          // The measurement a result rests on, one press away (wireEvidence opens it in Sources).
          ? ` <button type="button" class="link-btn src-link" data-measurement="${esc(r.measurementId)}" title="Opens measurement ${esc(r.measurementId)} in Sources">source</button>` : ''}${r.polymer
          // A result that rests on the base polymer's reference data says so, and where its rows are (D64).
          ? ` From reference data for ${esc(r.polymerId)} resin, in the Environment tab.` : ''}</div>
      </div>
    </div>`).join('')}</div>${also.length ? `<p class="fine why-also">Also met: ${esc(also.join(' · '))}.</p>` : ''}`;
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
      <p>Search looks at material names, families, polymers and fillers, and at each product's maker and name. A
        product not in the database finds nothing; try its polymer instead, such as PLA, PETG or PA6-CF.</p>
      <button class="btn btn-primary" id="clear-search">Clear the search</button></div>`;
    host.querySelector('#clear-search').addEventListener('click', () => actions.clearSearch());
    return;
  }

  const hidden = selection.candidates.length;
  // Nothing is shown, but candidates exist under result types the user switched off.
  if (hidden > 0) {
    host.innerHTML = `<div class="empty">
      <h3>${hidden} material${hidden === 1 ? '' : 's'} meet${hidden === 1 ? 's' : ''} your requirements, but the result buttons hide ${hidden === 1 ? 'it' : 'them'}</h3>
      <p>The buttons at the bottom of the screen choose which results the table shows.</p>
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
      ${counts.unknown ? `<li>${explore ? 'The materials that could not be checked are listed already; the SCREENED chip brings back any an estimate excluded.' : `<button type="button" class="btn btn-sm" id="to-explore">Include them</button> lists the ${counts.unknown} that could not be checked, flagged, with what is missing for each.`}</li>` : ''}
      ${unconfirmable.length ? `<li>No data here can confirm ${esc(unconfirmable.map(describeConstraint).join('; '))}. Read what makers say in a material's Environment or Products tab, and plan a test of your own part.</li>` : ''}
      <li>The ranked list below shows which requirement removes the most, and which ones only failed.</li>
    </ul>`;
  const lead = !counts.fail && counts.unknown
    ? `<h3>No material can be confirmed from the data on file: all ${counts.unknown} are unresolved</h3>
       <p>Nothing failed. The data cannot confirm ${unconfirmable.length ? esc(unconfirmable.map(describeConstraint).join('; ')) : 'these requirements'} for any material. That is a gap in the data, not proof that no material suits the part, so keep the requirement if the part needs it.</p>`
    : counts.fail && !counts.unknown
      ? `<h3>No material meets all of these requirements: every one was measured and fails</h3>
       <p>That is a real answer, not an error. Relax the requirement that costs the most, below.</p>`
      : `<h3>No material is confirmed to meet all of these requirements</h3>
       <p>${counts.fail} failed a requirement on their own data and ${counts.unknown} could not be checked, so not all are ruled out.${unconfirmable.length ? ` No material's data can confirm ${esc(unconfirmable.map(describeConstraint).join('; '))}.` : ''}</p>`;
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
