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

  const blocks = AXIS_DEFS.map((a) => {
    const vals = picked.map((m) => m.headline[a.key]);
    const known = vals.filter((v) => v?.known).map((v) => v.value);
    if (!known.length) {
      return `<div class="cmp-prop"><h4>${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span></h4>
        <div class="gap">Not published for any pinned material.</div></div>`;
    }
    const max = Math.max(...known);
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
        if (!h?.known) return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
          <span class="missing">Not published</span><span></span></div>`;
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
    <table class="grid"><thead><tr><th>Material</th><th>Headline properties</th><th>Grades</th><th>Measurements</th></tr></thead>
      <tbody>${picked.map((m) => {
        const have = AXIS_DEFS.filter((a) => m.headline[a.key]?.known).length;
        return `<tr><td class="name">${esc(m.name)}</td>
          <td>${have} of ${AXIS_DEFS.length}</td>
          <td>${m.gradeIds.length}</td>
          <td>${state.ctx.measurementsByMaterial.get(m.id)?.length ?? 0}</td></tr>`;
      }).join('')}</tbody></table>`;

  host.querySelector('#cmp-print')?.addEventListener('click', () => window.print());
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
}

const verdictChip = (v) => {
  const map = { within: 'PASS', exceeds: 'FAIL', 'exceeds-recommended': 'INDETERMINATE', unknown: 'UNKNOWN' };
  return v ? chip(map[v] ?? 'UNKNOWN', v) : '';
};
