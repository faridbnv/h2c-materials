// "Why is my list empty" and "why this candidate".
//
// The exclusion panel ranks criteria by how many candidates each one actually costs, computed by
// removing one constraint at a time. Ranking by damage done is what makes it an answer rather than
// a log.

import { explainExclusions } from '../engine/constraints.js';
import { chip, esc } from './format.js';

const nameOf = (c) => {
  if (c.kind === 'numeric') return `${c.property} ${c.operator} ${c.value}`;
  if (c.kind === 'gate') return c.gate === 'h2cStatus' ? `H2C status in ${(c.in ?? []).join(', ')}` : c.gate;
  if (c.kind === 'facet') return `${c.facet} in ${(c.in ?? []).join(', ')}`;
  if (c.kind === 'environment') return `${c.category} evidence`;
  if (c.kind === 'evidence') return 'evidence quality';
  return c.kind;
};

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
