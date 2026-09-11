// Coverage lens. The Coverage sheet is already a systematic nine-domain by 102-material matrix,
// so this view is close to free. It answers a different question from the selector: what can this
// database decide, and what can it not.

import { coverageMatrix, COVERAGE_DOMAINS } from '../engine/coverage.js';
import { esc } from './format.js';

const COLOR = {
  'Evidence recorded': 'var(--pass-bg)',
  'Resolved': 'var(--pass-bg)',
  'Partially resolved': 'var(--indet-bg)',
  'Reviewed with limitations': 'var(--indet-bg)',
  'Limited comparability': 'var(--indet-bg)',
  'Gap': 'var(--unknown-bg)',
  'Conflict': 'var(--fail-bg)',
  'Quarantined': 'var(--fail-bg)',
};
const MARK = {
  'Evidence recorded': '✓', 'Resolved': '✓', 'Partially resolved': '◐',
  'Reviewed with limitations': '◐', 'Limited comparability': '◐',
  'Gap': '?', 'Conflict': '✕', 'Quarantined': '✕',
};

export function renderCoverage(host, state, actions) {
  const { rows, db } = state;
  if (!rows.length) { host.innerHTML = `<div class="empty"><h3>No candidates to show coverage for.</h3></div>`; return; }

  const matrix = coverageMatrix(rows.map((r) => r.material), db.coverage);
  const totals = COVERAGE_DOMAINS.map((d, i) => matrix.filter((m) => {
    const s = m.cells[i].status;
    return s === 'Evidence recorded' || s === 'Resolved';
  }).length);

  host.innerHTML = `
    <p style="font-size:13px;color:var(--ink-2);margin:0 0 12px">
      Coverage is terminal: it reports gaps and conflicts and never feeds the selection engine.
      A row with evidence is not a declaration that all properties are known.</p>
    <div style="overflow:auto">
    <table class="cov">
      <thead><tr><th></th>${COVERAGE_DOMAINS.map((d) => `<th class="rot">${esc(d)}</th>`).join('')}</tr></thead>
      <tbody>
        ${matrix.map((m) => `<tr>
          <td class="mat"><a href="#" data-open="${esc(m.materialId)}">${esc(m.name)}</a></td>
          ${m.cells.map((c) => `<td><span class="cell" style="background:${COLOR[c.status] ?? 'var(--surface-2)'}"
              title="${esc(c.status ?? 'No record')}${c.records.length ? ' — ' + esc(c.records[0].finding.slice(0, 220)) : ''}"
              data-cov="${esc(m.materialId)}">${MARK[c.status] ?? ''}</span></td>`).join('')}
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td class="mat" style="font-weight:600">Evidence recorded</td>
        ${totals.map((t) => `<td style="text-align:center;font-size:11px;color:var(--ink-3)">${t}</td>`).join('')}</tr></tfoot>
    </table></div>
    <div class="legend-note">
      ✓ evidence recorded · ◐ limited or partial · ? gap · ✕ conflict or quarantined.
      Footer counts materials with evidence recorded in that domain, out of ${rows.length} candidates.</div>`;

  host.querySelectorAll('[data-open], [data-cov]').forEach((e) => e.addEventListener('click', (ev) => {
    ev.preventDefault();
    actions.openMaterial(e.dataset.open ?? e.dataset.cov);
  }));
}
