// Coverage lens.
//
// This answers a different question from the selector: what can this database decide, and what can
// it not. The previous build rendered a wall of 26-pixel cells under rotated headings, which was
// unreadable. This version leads with the totals, keeps the material names legible, and makes every
// cell say what it means in words on hover and on click.
//
// Method sheet, Verification / Coverage: coverage is terminal. It never feeds the selection engine.

import { coverageMatrix, COVERAGE_DOMAINS } from '../engine/coverage.js';
import { esc, scrollTable, markTableOverflow } from './format.js';

// Four readable states, collapsed from the eight the coverage table records.
const STATE = {
  'Evidence recorded': 'ok', 'Resolved': 'ok',
  'Partially resolved': 'partial', 'Reviewed with limitations': 'partial', 'Limited comparability': 'partial',
  'Gap': 'gap',
  'Conflict': 'bad', 'Quarantined': 'bad',
};
const MARK = { ok: '✓', partial: '◐', gap: '–', bad: '✕', none: '' };
// Since D114 the build derives a gap as it derives evidence, so a blank cell is only a domain nobody assessed: the
// Application column, whose rows are judgements the records cannot restate (D74).
const WORD = { ok: 'Data on file', partial: 'Limited or partial', gap: 'Gap: nothing on file', bad: 'Conflict or held back', none: 'Not assessed' };

const SHORT = {
  'Identity': 'Identity', 'H2C status': 'H2C', 'Print setup': 'Printing', 'Mechanical': 'Mechanical',
  'Thermal': 'Thermal', 'Moisture / environmental': 'Environment', 'Post-processing / application': 'Application',
  // A Canadian listing is recorded; a price converted from a foreign listing only is limited (D113, D114).
  'Canadian price': 'CA price',
};

// "Sparse properties" records the properties almost no data sheet publishes (compression strength, thermal expansion,
// fatigue and the rest). It is a gap for every material by construction, so as a column of the grid and a summary card
// it read as a domain every candidate failed ("0 of 82 recorded") and said nothing about any one of them. It is kept out
// of the grid and said once, under it, in the build's own words.
const SPARSE = 'Sparse properties';
const GRID = COVERAGE_DOMAINS.filter((d) => d !== SPARSE);

/** The record that decided a cell: the one with its status, not whichever came first. */
const deciding = (cell) => cell.records.find((r) => r.status === cell.status) ?? cell.records[0];

export function renderCoverage(host, state, actions) {
  const { rows, db } = state;
  if (!rows.length) {
    host.innerHTML = `<div class="empty"><h3>No candidates to show coverage for</h3>
      <p>Relax a constraint, or show more states from the bar at the bottom.</p></div>`;
    return;
  }

  const materials = rows.map((r) => r.material);
  const matrix = coverageMatrix(materials, db.coverage, GRID);
  const n = matrix.length;

  const totals = GRID.map((domain, i) => {
    const t = { ok: 0, partial: 0, gap: 0, bad: 0, none: 0 };
    for (const m of matrix) {
      const s = STATE[m.cells[i].status];
      t[s ?? 'none']++;
    }
    return { domain, ...t };
  });

  const rowScore = (m) => m.cells.filter((c) => STATE[c.status] === 'ok').length;

  host.innerHTML = `
    <p class="lens-intro">What data is on file for the ${n} candidate${n === 1 ? '' : 's'} on screen, and where the gaps are.
      It never changes a result. "On file" means data exists, not that it settles your question. Select a cell to read it.</p>

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
          ${GRID.map((d) => `<th title="${esc(d)}">${esc(SHORT[d] ?? d)}</th>`).join('')}
          <th class="score">Recorded</th>
        </tr></thead>
        <tbody>
          ${matrix.map((m) => `<tr>
            <td class="mat"><button class="linkish" data-open="${esc(m.materialId)}">${esc(m.name)}</button></td>
            ${m.cells.map((c, i) => {
              const st = STATE[c.status] ?? 'none';
              // Explain the record that decided the cell, not whichever came first.
              const finding = deciding(c)?.finding ?? '';
              return `<td><button class="cov-cell ${st}" data-open="${esc(m.materialId)}" data-domain="${esc(GRID[i])}"
                title="${esc(`${m.name} — ${GRID[i]}: ${c.status ?? 'no record'}${finding ? '. ' + finding.slice(0, 260) : ''}`)}"
                aria-label="${esc(`${GRID[i]}: ${WORD[st] ?? 'no record'}`)}">${MARK[st] ?? ''}</button></td>`;
            }).join('')}
            <td class="score">${rowScore(m)}/${GRID.length}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${otherConflicts(materials, db)}
    ${sparseTable(materials, db, state.ctx)}`;

  // A cell opens the material at its Known gaps (Sources), where the record behind the mark is, and so does a material
  // named under the table; the name in the grid opens the Overview.
  markTableOverflow(host);
  host.querySelectorAll('[data-open]').forEach((e) => e.addEventListener('click', () =>
    actions.openMaterial(e.dataset.open, e.dataset.domain ? 'Coverage' : 'Overview')));
}

/** A material as a link to its record, in its Sources tab's Known gaps. */
const link = (id, name, domain) => `<button class="link-btn" data-open="${esc(id)}" data-domain="${esc(domain)}">${esc(name)}</button>`;

/**
 * Conflicts and held-back values recorded in an area the grid has no column for (a composition, a source that
 * contradicts itself, a measurement that could not be parsed). The legend promises ✕ for a conflict, so one the grid
 * cannot show is listed under it, one material to a line, rather than left for the drawer alone. It was one run-on
 * sentence naming them all.
 */
function otherConflicts(materials, db) {
  const shown = new Set([...GRID, SPARSE]);
  const on = new Set(materials.map((m) => m.id));
  const byMaterial = new Map();
  for (const c of db.coverage) {
    if (!on.has(c.materialId) || shown.has(c.domain) || STATE[c.status] !== 'bad') continue;
    if (!byMaterial.has(c.materialId)) byMaterial.set(c.materialId, []);
    byMaterial.get(c.materialId).push(`${c.domain.toLowerCase()}${c.status === 'Quarantined' ? ' (value held back)' : ''}`);
  }
  if (!byMaterial.size) return '';
  const names = new Map(materials.map((m) => [m.id, m.name]));
  return `<div class="cov-notes">
      <h3 class="sec"><span class="sw bad" aria-hidden="true">✕</span> Conflicts outside these columns</h3>
      <p class="fine">Sources that disagree, or a value held back, in an area the grid has no column for. Select a material to
        read the record in its Sources tab, under Known gaps.</p>
      <ul class="cov-list">${[...byMaterial].map(([id, what]) => `<li>${link(id, names.get(id), 'Coverage')}: ${esc(what.join('; '))}</li>`).join('')}</ul>
    </div>`;
}

/**
 * The rarely published properties (db.meta.sparseProperties): almost no filament data sheet gives them, so each would
 * be a column of gaps. They are listed under the grid the other way round: for each property, which candidates on
 * screen do publish it. The same rule derives each material's Sparse properties record (coverage-rules.js): a
 * measurement of the material, numeric or in words, not held back. It had been one sentence per distinct list of what
 * is missing ("141 of the 153 candidates on screen: Not published by its own products: …"), seven near-identical
 * paragraphs that hid the few materials that do publish one.
 */
function sparseTable(materials, db, ctx) {
  const props = db.meta.sparseProperties ?? [];
  if (!props.length) return '';
  const sparse = new Map(coverageMatrix(materials, db.coverage, [SPARSE]).map((m) => [m.materialId, m.cells[0]?.status]));
  const judged = materials.filter((m) => ['Gap', 'Evidence recorded'].includes(sparse.get(m.id)));
  const by = new Map(props.map((p) => [p, []]));
  for (const m of judged) {
    const own = new Set((ctx?.measurementsByMaterial?.get(m.id) ?? []).filter((x) => (x.numeric || x.qualitative) && !x.quarantined).map((x) => x.property));
    for (const p of props) if (own.has(p)) by.get(p).push(m);
  }
  const SHOWN = 6;
  const who = (list) => (!list.length ? '<span class="missing">none</span>'
    : list.slice(0, SHOWN).map((m) => link(m.id, m.name, SPARSE)).join(', ') + (list.length > SHOWN ? `, and ${list.length - SHOWN} more` : ''));
  return `<div class="cov-notes">
      <h3 class="sec">Rarely published properties</h3>
      <p class="fine">Almost no filament data sheet gives these, so they are not columns above. For each, the candidates on
        screen whose products publish it; every other candidate has a gap there.</p>
      ${scrollTable(`<table class="grid cov-sparse-table"><thead><tr><th>Property</th><th class="num">Published for</th><th>Candidates</th></tr></thead>
        <tbody>${props.map((p) => `<tr><td>${esc(p)}</td><td class="num">${by.get(p).length} of ${judged.length}</td><td>${who(by.get(p))}</td></tr>`).join('')}</tbody>
      </table>`)}
    </div>`;
}
