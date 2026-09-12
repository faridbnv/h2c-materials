// Compare workspace: aligned bars with bounds, two to six materials.
//
// No radar charts of raw engineering properties. A condition row sits under every property block,
// because a comparison of numbers measured differently is not a comparison.

import { AXIS_DEFS } from './axes.js';
import { renderValue, esc, fmtNumber, chip } from './format.js';
import { prop } from './labels.js';

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

  if (pinned.length < 2) {
    host.innerHTML = `<div class="empty">
      <h3>Pin two to six materials to compare them</h3>
      <p>Use the star in the results table, or click a point on the Ashby chart and pin it.
      ${pinned.length === 1 ? `<strong>${esc(pinned[0].name)}</strong> is pinned so far.` : ''}</p></div>`;
    return;
  }

  // Estimates belong here too. Compare used to print "Not published" for a material whose family
  // bound was the very thing that decided whether it stayed in the results, so the reader saw a
  // blank where the tool had an opinion.
  const useEstimates = state.ctx?.useEstimates;
  const estimateOf = (m, key) => {
    const h = m.headline[key];
    return !h?.known && useEstimates && h?.estimate ? h.estimate : null;
  };

  const blocks = AXIS_DEFS.map((a) => {
    const vals = picked.map((m) => m.headline[a.key]);
    const known = vals.filter((v) => v?.known).map((v) => v.value);
    const estHi = picked.map((m) => estimateOf(m, a.key)).filter(Boolean).map((e) => e.hi);
    if (!known.length && !estHi.length) {
      return `<div class="cmp-prop"><h4>${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span></h4>
        <div class="gap">Not published for any pinned material.</div></div>`;
    }
    // The scale has to cover the estimated spans too, or an estimate wider than every measurement
    // runs off the end of its track.
    const max = Math.max(...known, ...estHi);
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
          if (!e) {
            return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
              <span class="missing">Not published</span><span></span></div>`;
          }
          // A span, not a bar. There is no value to fill to, and drawing one would invent a number.
          const left = (e.lo / max) * 100;
          const w = Math.max(((e.hi - e.lo) / max) * 100, 1.5);
          const title = `Estimated, not measured. The ${e.peerCount} measured peers in ${e.basis} `
            + `fall between ${fmtNumber(e.lo)} and ${fmtNumber(e.hi)} ${e.unit}. `
            + 'Used only to rule a material out, never to confirm one in.';
          return `<div class="cmp-bar estimated${isAnchor(m) ? ' anchor' : ''}" title="${esc(title)}">
            <span>${who}</span>
            <span class="track"><span class="est-span" style="left:${left}%;width:${w}%"></span></span>
            <span class="val est">~${fmtNumber(e.lo)}\u2013${fmtNumber(e.hi)}<span class="est-mark">\u2020</span></span></div>`;
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

  host.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      ${pinned.map((m) => `<span class="pin">${esc(m.name)}</span>`).join('')}
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
    ${blocks}
    <h3 class="sec">Process requirements</h3>
    <table class="grid"><thead><tr><th>Material</th><th>Nozzle</th><th>Bed</th><th>Chamber</th><th>Abrasive</th><th>Drying</th></tr></thead>
      <tbody>${picked.map((m) => `<tr><td class="name">${esc(m.name)}</td>
        ${['nozzle', 'bed', 'chamber'].map((g) => `<td title="${esc(m.gates[g]?.reason ?? '')}">${verdictChip(m.gates[g]?.verdict)}</td>`).join('')}
        <td>${esc(m.gates.abrasive)}</td><td>${esc(m.gates.drying)}</td></tr>`).join('')}</tbody></table>

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
      ? `<p class="fine">A \u2020 span is the range of a material's closest measured relatives, not a
         measurement of the material itself. It can rule one out of a requirement, never satisfy one.</p>`
      : ''}`;

  host.querySelector('#cmp-print')?.addEventListener('click', () => window.print());
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
}

const verdictChip = (v) => {
  const map = { within: 'PASS', exceeds: 'FAIL', 'exceeds-recommended': 'INDETERMINATE', unknown: 'UNKNOWN' };
  return v ? chip(map[v] ?? 'UNKNOWN', v) : '';
};
