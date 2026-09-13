// Coverage lens.
//
// This answers a different question from the selector: what can this database decide, and what can
// it not. The previous build rendered a wall of 26-pixel cells under rotated headings, which was
// unreadable. This version leads with the totals, keeps the material names legible, and makes every
// cell say what it means in words on hover and on click.
//
// Method sheet, Verification / Coverage: coverage is terminal. It never feeds the selection engine.

import { coverageMatrix, COVERAGE_DOMAINS } from '../engine/coverage.js';
import { esc } from './format.js';

// Four readable states, collapsed from the eight the workbook records.
const STATE = {
  'Evidence recorded': 'ok', 'Resolved': 'ok',
  'Partially resolved': 'partial', 'Reviewed with limitations': 'partial', 'Limited comparability': 'partial',
  'Gap': 'gap',
  'Conflict': 'bad', 'Quarantined': 'bad',
};
const MARK = { ok: '✓', partial: '◐', gap: '–', bad: '✕' };
const WORD = { ok: 'Evidence recorded', partial: 'Limited or partial', gap: 'Gap, nothing recorded', bad: 'Conflict or quarantined' };

const SHORT = {
  'Identity': 'Identity', 'H2C status': 'H2C', 'Print setup': 'Printing', 'Mechanical': 'Mechanical',
  'Thermal': 'Thermal', 'Moisture / environmental': 'Environment', 'Post-processing / application': 'Application',
  'Canadian price': 'Price', 'Sparse properties': 'Sparse data',
};

export function renderCoverage(host, state, actions) {
  const { rows, db } = state;
  if (!rows.length) {
    host.innerHTML = `<div class="empty"><h3>No candidates to show coverage for</h3>
      <p>Relax a constraint, or show more states from the bar at the bottom.</p></div>`;
    return;
  }

  const matrix = coverageMatrix(rows.map((r) => r.material), db.coverage);
  const n = matrix.length;

  const totals = COVERAGE_DOMAINS.map((domain, i) => {
    const t = { ok: 0, partial: 0, gap: 0, bad: 0, none: 0 };
    for (const m of matrix) {
      const s = STATE[m.cells[i].status];
      t[s ?? 'none']++;
    }
    return { domain, ...t };
  });

  const rowScore = (m) => m.cells.filter((c) => STATE[c.status] === 'ok').length;

  host.innerHTML = `
    <p class="lens-intro">What this database can and cannot support for the ${n} candidate${n === 1 ? '' : 's'}
      on screen. Coverage reports gaps; it never changes a selection result, and "recorded" means
      evidence exists, not that it is good or that it settles your question. Click a cell to read it.</p>

    <div class="cov-summary">
      ${totals.map((t) => `
        <div class="cov-card">
          <div class="cov-card-title">${esc(SHORT[t.domain] ?? t.domain)}</div>
          <div class="cov-meter" title="${t.ok} recorded, ${t.partial} limited, ${t.gap} gaps, ${t.bad} conflicts">
            ${t.ok ? `<span class="seg ok" style="flex:${t.ok}"></span>` : ''}
            ${t.partial ? `<span class="seg partial" style="flex:${t.partial}"></span>` : ''}
            ${t.gap ? `<span class="seg gap" style="flex:${t.gap}"></span>` : ''}
            ${t.bad ? `<span class="seg bad" style="flex:${t.bad}"></span>` : ''}
            ${t.none ? `<span class="seg none" style="flex:${t.none}"></span>` : ''}
          </div>
          <div class="cov-card-n">${t.ok} of ${n} recorded</div>
        </div>`).join('')}
    </div>

    <div class="cov-legend">
      ${Object.entries(WORD).map(([k, w]) => `<span class="cov-key"><i class="sw ${k}">${MARK[k]}</i>${esc(w)}</span>`).join('')}
    </div>

    <div class="cov-scroll">
      <table class="cov2">
        <thead><tr>
          <th class="mat">Material</th>
          ${COVERAGE_DOMAINS.map((d) => `<th title="${esc(d)}">${esc(SHORT[d] ?? d)}</th>`).join('')}
          <th class="score">Recorded</th>
        </tr></thead>
        <tbody>
          ${matrix.map((m) => `<tr>
            <td class="mat"><button class="linkish" data-open="${esc(m.materialId)}">${esc(m.name)}</button></td>
            ${m.cells.map((c, i) => {
              const st = STATE[c.status] ?? 'none';
              // Explain the record that decided the cell, not whichever came first.
              const finding = (c.records.find((r) => r.status === c.status) ?? c.records[0])?.finding ?? '';
              return `<td><button class="cov-cell ${st}" data-open="${esc(m.materialId)}" data-domain="${esc(COVERAGE_DOMAINS[i])}"
                title="${esc(`${m.name} — ${COVERAGE_DOMAINS[i]}: ${c.status ?? 'no record'}${finding ? '. ' + finding.slice(0, 260) : ''}`)}"
                aria-label="${esc(`${COVERAGE_DOMAINS[i]}: ${WORD[st] ?? 'no record'}`)}">${MARK[st] ?? ''}</button></td>`;
            }).join('')}
            <td class="score">${rowScore(m)}/${COVERAGE_DOMAINS.length}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // A cell opens the material at its Coverage tab, where the record behind the mark is; the name
  // opens the Overview.
  host.querySelectorAll('[data-open]').forEach((e) => e.addEventListener('click', () =>
    actions.openMaterial(e.dataset.open, e.dataset.domain ? 'Coverage' : 'Overview')));
}
