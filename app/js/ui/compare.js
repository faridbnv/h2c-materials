// Compare workspace: aligned bars with bounds, two to six materials.
//
// No radar charts of raw engineering properties. A condition row sits under every property block,
// because a comparison of numbers measured differently is not a comparison.

import { AXIS_DEFS } from './axes.js';
import { renderValue, esc, fmtNumber, chip, wireEvidence } from './format.js';
import { prop, describeConstraint, gateVerdict, estimateTitle } from './labels.js';

const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

export function renderCompare(host, state, actions) {
  const { db, scenario } = state;
  const pinned = scenario.shortlist.map((id) => db.materials.find((m) => m.id === id)).filter(Boolean);

  // The baseline joins the comparison as an extra bar, marked as a reference rather than a
  // shortlisted candidate. Without it the bars are only relative to each other, which tells you
  // which of three unfamiliar materials is stiffest and nothing about whether any of them is stiff.
  const anchor = state.baseline && !scenario.shortlist.includes(state.baseline)
    ? db.materials.find((m) => m.id === state.baseline) : null;
  const picked = anchor ? [...pinned, anchor] : pinned;
  const isAnchor = (m) => anchor && m.id === anchor.id;

  // One candidate against a familiar baseline is a comparison, and the most natural first one:
  // "how does this compare with PLA?" It used to demand a second pin before drawing anything.
  if (pinned.length === 0 || (pinned.length === 1 && !anchor)) {
    host.innerHTML = `<div class="empty">
      <h3>${pinned.length ? 'Add a second material, or compare against one you know' : 'Shortlist materials to compare them'}</h3>
      <p>Use the star in the results table, or open any material and press <b>Add to shortlist</b>.
      ${pinned.length === 1 ? `<strong>${esc(pinned[0].name)}</strong> is shortlisted so far.` : ''}</p>
      ${pinned.length === 1 ? `<label class="baseline-pick">Compare it against
        <select data-baseline><option value="">choose a material</option>
        ${BASELINE_NAMES.map((n) => db.materials.find((m) => m.name === n)).filter((m) => m && m.id !== pinned[0].id)
          .map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>` : ''}</div>`;
    host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
    return;
  }

  // A shortlist is research history, and keeping a material after the requirements change is
  // useful. Showing it without its current result is not: an old pick read as a current answer.
  const tested = scenario.constraints.length > 0;
  const evalOf = (m) => state.selection.evaluations.find((e) => e.materialId === m.id);
  const resultChip = (m) => {
    if (!tested) return '<span class="chip chip-neutral" title="No requirement is set">not tested</span>';
    const e = evalOf(m);
    if (!e) return '';
    const why = [...e.failed, ...e.unresolved].map((r) => `${describeConstraint(r.constraint)}: ${r.reason}`).join('\n');
    return `<span title="${esc(why || 'Meets every requirement')}">${chip(e.verdict)}</span>`;
  };

  // Estimates belong here too. Compare used to print "Not published" for a material whose family
  // bound was the very thing that decided whether it stayed in the results, so the reader saw a
  // blank where the tool had an opinion.
  const useEstimates = state.ctx?.showEstimates;
  const estimateOf = (m, key) => {
    const h = m.headline[key];
    return !h?.known && useEstimates && h?.estimate ? h.estimate : null;
  };

  const blocks = AXIS_DEFS.map((a) => {
    const vals = picked.map((m) => m.headline[a.key]);
    const known = vals.filter((v) => v?.known).map((v) => v.value);
    const estHi = picked.map((m) => estimateOf(m, a.key)).filter(Boolean).map((e) => e.plausible?.hi ?? e.hi);
    const boundHi = vals.filter((v) => v?.known && v.interval?.hi != null).map((v) => v.interval.hi);
    const related = vals.filter((v) => v && !v.known && v.related);
    if (!known.length && !estHi.length && !related.length) {
      return `<div class="cmp-prop"><h4>${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span></h4>
        <div class="gap">Not published for any pinned material.</div></div>`;
    }
    // The scale has to cover the estimated spans too, or an estimate wider than every measurement
    // runs off the end of its track.
    // Bounds too: a measured range whose top sits above every central value used to run past the
    // end of its track.
    const max = Math.max(...known, ...estHi, ...boundHi, ...related.map((v) => v.related.best.value));
    const conds = picked.map((m) => {
      const h = m.headline[a.key];
      if (!h?.known) return null;
      return [h.direction && h.direction !== 'not-applicable' ? h.direction : null,
        h.specimenType?.startsWith('Not published') ? 'specimen not stated' : h.specimenType,
        h.loadStated === false ? 'load not stated' : null].filter(Boolean).join(' · ');
    });
    const differ = new Set(conds.filter(Boolean)).size > 1;

    return `<div class="cmp-prop">
      <h4 title="${esc(prop(a.key).technical)}">${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span></h4>
      ${picked.map((m, i) => {
        const h = m.headline[a.key];
        const who = `${esc(m.name)}${isAnchor(m) ? ' <span class="anchor-tag">baseline</span>' : ''}`;
        if (!h?.known) {
          const e = estimateOf(m, a.key);
          if (h?.notApplicable) {
            return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
              <span class="missing" title="${esc(h.notApplicable.reason)}">not applicable</span><span></span></div>`;
          }
          // A measurement that never became the headline is still a measurement. The table shows
          // it with an asterisk; Compare used to print "Not published" for the same material. With
          // estimates on, the estimate already carries it, converted, so the estimate is shown.
          if (h?.related && !e) {
            const b = h.related.best;
            return `<div class="cmp-bar cmp-related${isAnchor(m) ? ' anchor' : ''}">
              <span>${who}</span>
              <span class="track"><span class="related-tick" style="left:${(b.value / max) * 100}%"></span></span>
              <span class="val">${renderValue(h)}</span></div>`;
          }
          if (!e) {
            return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
              <span class="missing" title="${esc(h?.text ?? 'Not published in the sampled sources. Not zero, and not a low value.')}">${esc(missingWord(h))}</span><span></span></div>`;
          }
          // A span, not a bar: the likely range, with the plausible range behind it and a tick at the
          // centre. There is no measured value to fill to.
          const pct = (v) => Math.max(0, Math.min(100, (v / max) * 100));
          const left = pct(e.lo);
          const w = Math.max(pct(e.hi) - left, 1.5);
          const wide = e.plausible ? `<span class="est-wide" style="left:${pct(e.plausible.lo)}%;width:${Math.max(pct(e.plausible.hi) - pct(e.plausible.lo), 1.5)}%"></span>` : '';
          const title = estimateTitle(e, fmtNumber);
          return `<div class="cmp-bar estimated${isAnchor(m) ? ' anchor' : ''}" title="${esc(title)}">
            <span>${who}</span>
            <span class="track">${wide}<span class="est-span" style="left:${left}%;width:${w}%"></span><span class="est-centre" style="left:${pct(e.centre)}%"></span></span>
            <span class="val est est-${esc(e.precision)}">~${fmtNumber(e.lo)}\u2013${fmtNumber(e.hi)}<span class="est-mark">\u2020</span></span></div>`;
        }
        const w = (h.value / max) * 100;
        const bounds = h.interval && h.interval.lo !== h.interval.hi && h.interval.lo !== null && h.interval.hi !== null
          ? `<span class="bounds" style="left:${(h.interval.lo / max) * 100}%;width:${((h.interval.hi - h.interval.lo) / max) * 100}%"></span>` : '';
        return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}">
          <span>${who}</span>
          <span class="track"><span class="fill" style="width:${w}%"></span>${bounds}</span>
          <span class="val">${renderValue(h)}</span></div>`;
      }).join('')}
      <div class="cmp-cond">${conds.map((c, i) => c ? `${esc(picked[i].name)}: ${esc(c)}` : '').filter(Boolean).join(' | ')}
        ${differ ? '<span class="differ"> — conditions differ across columns</span>' : ''}</div>
    </div>`;
  }).join('');

  const anyRelated = picked.some((m) => AXIS_DEFS.some((a) => !m.headline[a.key]?.known && m.headline[a.key]?.related));
  const anyBounds = picked.some((m) => AXIS_DEFS.some((a) => {
    const i = m.headline[a.key]?.interval;
    return m.headline[a.key]?.known && i && i.lo !== i.hi;
  }));

  // What was asked, on screen and on paper. A printed comparison used to carry the bars and nothing
  // that said which question they answered, under which rule, from which snapshot.
  const hard = scenario.constraints.filter((c) => c.mandatory !== false);
  const soft = scenario.constraints.filter((c) => c.mandatory === false);
  const context = `<div class="cmp-context">
      <div><b>Requirements:</b> ${hard.length ? hard.map((c) => esc(describeConstraint(c))).join('; ') : 'none set, so nothing has been tested'}${soft.length ? `. <b>Tracked only:</b> ${soft.map((c) => esc(describeConstraint(c))).join('; ')}` : ''}.</div>
      <div class="fine">${scenario.template ? `Template: ${esc(scenario.template)}. ` : ''}Missing data ${scenario.unknownPolicy === 'exploration' ? 'kept and flagged' : 'left out'}${useEstimates ? ', estimates on (they never pass a material and may screen one out)' : ''}.
        Database snapshot ${esc(db.meta.snapshot)}, build ${esc(db.meta.build)}. Values are recorded for each material and may come from
        different grades; check the exact grade before you buy or print.</div>
    </div>`;

  host.innerHTML = `
    ${context}
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <span class="fine">Shortlisted ${pinned.length}, with each one's result against the requirements above:</span>
      ${pinned.map((m) => `<span class="pin">${esc(m.name)} ${resultChip(m)}</span>`).join('')}
      ${anchor ? `<span class="pin anchor">${esc(anchor.name)} · baseline</span>` : ''}
      <label class="baseline-pick" title="Adds a familiar material as a reference bar.">
        Compare against
        <select data-baseline>
          <option value="">nothing</option>
          ${BASELINE_NAMES.map((n) => db.materials.find((m) => m.name === n)).filter(Boolean)
            .map((m) => `<option value="${esc(m.id)}" ${state.baseline === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </label>
      <div class="spacer" style="flex:1"></div>
      <button class="btn btn-sm" id="cmp-print">Print summary</button>
    </div>
    ${anyBounds || anyRelated ? `<p class="fine">${anyBounds ? 'The <b>|—|</b> marks on a bar are the range or uncertainty the source reported. ' : ''}${anyRelated ? 'A <b>*</b> value is a measurement that was never made the headline, drawn as a tick, not a bar; hover it for why.' : ''}</p>` : ''}
    ${blocks}
    <h3 class="sec">Process requirements</h3>
    <table class="grid"><thead><tr><th>Material</th><th>Nozzle within H2C</th><th>Bed within H2C</th><th>Chamber within H2C</th><th>Hardened nozzle</th><th>Drying</th></tr></thead>
      <tbody>${picked.map((m) => `<tr><td class="name">${esc(m.name)}</td>
        ${['nozzle', 'bed', 'chamber'].map((g) => `<td title="${esc(m.gates[g]?.reason ?? '')}">${verdictChip(m.gates[g]?.verdict)}</td>`).join('')}
        <td>${esc(ABRASION_WORD[m.gates.abrasive] ?? 'not recorded')}</td><td>${esc(m.gates.drying === 'required' ? 'guidance published' : 'not recorded')}</td></tr>`).join('')}</tbody></table>

    <h3 class="sec">Evidence completeness</h3>
    <table class="grid"><thead><tr><th>Material</th><th>Measured</th><th>Estimated</th><th>Grades</th><th>Measurements</th></tr></thead>
      <tbody>${picked.map((m) => {
        const have = AXIS_DEFS.filter((a) => m.headline[a.key]?.known).length;
        const est = AXIS_DEFS.filter((a) => estimateOf(m, a.key)).length;
        return `<tr><td class="name">${esc(m.name)}</td>
          <td>${have} of ${AXIS_DEFS.length}</td>
          <td>${est ? `<span class="est">${est}<span class="est-mark">\u2020</span></span>` : '\u2014'}</td>
          <td>${m.gradeIds.length}</td>
          <td>${state.ctx.measurementsByMaterial.get(m.id)?.length ?? 0}</td></tr>`;
      }).join('')}</tbody></table>
    ${picked.some((m) => AXIS_DEFS.some((a) => estimateOf(m, a.key)))
      ? `<p class="fine">A \u2020 span is an estimate, not a measurement: the likely range (${Math.round((db.meta.estimateModel?.levels?.likely ?? 0.8) * 100)}%), with the
         plausible range behind it and a tick at its centre. It is built from the material's own related
         measurements where it has any, and from its polymer family. It never passes a requirement; hover
         it for what it rests on and whether it can screen.</p>`
      : ''}`;

  host.querySelector('#cmp-print')?.addEventListener('click', () => window.print());
  wireEvidence(host, actions);
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
}

const ABRASION_WORD = { 'requires-hardened': 'required', 'no-special-concern': 'not needed', unknown: 'not recorded' };

const MISSING_WORD = {
  'not-published': 'Not published', 'insufficient-comparable': 'Not comparable', 'not-applicable': 'Not applicable',
  'quarantined': 'Quarantined', 'not-available-in-market': 'No Canadian price',
};
const missingWord = (h) => MISSING_WORD[h?.missing] ?? 'Not published';

const verdictChip = (v) => (v ? chip(gateVerdict(v).state, gateVerdict(v).short) : '');
