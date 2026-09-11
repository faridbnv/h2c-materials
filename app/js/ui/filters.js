// The filter rail.
//
// The pattern that matters: every control states its own data availability before it is touched.
// It tells the user what a criterion can and cannot decide, and turns the build's audit findings
// into everyday guidance instead of a footnote.
//
// A field that cannot discriminate is not built as a filter. 133 of 156 print profiles say
// "Verify exact grade" for H2C routing, so routing appears in the detail drawer as evidence, never
// here. A filter that passes everything teaches the user to trust something that checked nothing.

import { availability } from '../engine/coverage.js';
import { esc } from './format.js';

const NUMERIC = [
  { group: 'Mechanical', key: 'density',           label: 'Density',              unit: 'kg/m³', op: '<=', placeholder: 1400 },
  { group: 'Mechanical', key: 'tensileModulusXY',  label: 'Tensile modulus XY',   unit: 'GPa',   op: '>=', placeholder: 3 },
  { group: 'Mechanical', key: 'tensileStrengthXY', label: 'Tensile strength XY',  unit: 'MPa',   op: '>=', placeholder: 50 },
  { group: 'Mechanical', key: 'elongationXY',      label: 'Elongation at break XY', unit: '%',   op: '>=', placeholder: 5 },
  { group: 'Thermal',    key: 'hdt045',            label: 'HDT at 0.45 MPa',      unit: '°C',    op: '>=', placeholder: 100 },
  { group: 'Cost',       key: 'priceCADkg',        label: 'Price',                unit: 'CAD/kg', op: '<=', placeholder: 100 },
];

const GROUPS = ['Compatibility', 'Mechanical', 'Thermal', 'Environment', 'Manufacturing', 'Cost', 'Evidence'];
const OPEN_BY_DEFAULT = new Set(['Compatibility', 'Mechanical']);

const H2C_STATUSES = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical'];
const REINFORCEMENT = [
  ['carbon-fibre', 'Carbon fibre'], ['glass-fibre', 'Glass fibre'], ['unfilled', 'Unfilled'],
  ['esd', 'ESD'], ['foaming', 'Foaming'], ['undisclosed', 'Undisclosed variant'],
];

const find = (cs, pred) => cs.find(pred) ?? null;

function availLine(a, extra) {
  let s = `<div class="avail">${a.withData} of ${a.total} have data`;
  if (extra) s += `<span class="caveat">${esc(extra)}</span>`;
  return s + '</div>';
}

export function renderFilters(host, state, actions) {
  const { db, scenario } = state;
  const materials = db.materials;
  const cs = scenario.constraints;

  const activeIn = (group) => cs.filter((c) => c.__group === group).length;
  const parts = [];

  for (const group of GROUPS) {
    const n = activeIn(group);
    parts.push(`<details class="group" data-group="${group}" ${OPEN_BY_DEFAULT.has(group) || n ? 'open' : ''}>
      <summary>${group}<span class="count" data-zero="${n === 0}">${n}</span></summary>
      <div class="group-body">${body(group, materials, cs, db)}</div>
    </details>`);
  }
  host.innerHTML = parts.join('');
  wire(host, state, actions);
}

function body(group, materials, cs, db) {
  const out = [];

  if (group === 'Compatibility') {
    const scopeOn = !!find(cs, (c) => c.gate === 'scope');
    out.push(`<div class="control" data-active="${scopeOn}">
      <label><input type="checkbox" data-gate="scope" ${scopeOn ? 'checked' : ''}> H2C-relevant only</label>
      <div class="avail">96 in scope, 6 excluded as outside the H2C envelope</div>
    </div>`);

    const sel = find(cs, (c) => c.gate === 'h2cStatus')?.in ?? [];
    const counts = {};
    for (const m of materials) counts[m.h2cStatus] = (counts[m.h2cStatus] ?? 0) + 1;
    out.push(`<div class="control" data-active="${sel.length > 0}">
      <label>H2C status</label>
      <div class="checks">${H2C_STATUSES.map((s) => `
        <label><input type="checkbox" data-status="${esc(s)}" ${sel.includes(s) ? 'checked' : ''}>
        ${esc(s)}<span class="n">${counts[s] ?? 0}</span></label>`).join('')}</div>
    </div>`);

    for (const [gate, label, limit] of [['nozzle', 'Nozzle', 350], ['bed', 'Bed', 120], ['chamber', 'Chamber', 65]]) {
      const on = !!find(cs, (c) => c.gate === gate);
      const known = materials.filter((m) => m.gates[gate]?.verdict !== 'unknown').length;
      out.push(`<div class="control" data-active="${on}">
        <label><input type="checkbox" data-gate="${gate}" ${on ? 'checked' : ''}> ${label} within ${limit} °C baseline</label>
        <div class="avail">${known} of ${materials.length} publish a ${label.toLowerCase()} requirement</div>
      </div>`);
    }

    const abr = find(cs, (c) => c.gate === 'abrasive');
    out.push(`<div class="control" data-active="${!!abr}">
      <label><input type="checkbox" data-gate="abrasive" ${abr ? 'checked' : ''}> I have a hardened nozzle</label>
      <div class="avail">45 of ${materials.length} state an abrasion requirement</div>
    </div>`);

    out.push(`<div class="note"><strong>Not offered as filters.</strong> H2C left/right routing, AMS 2 Pro and
      AMS HT read "verify exact grade, no blanket approval" on 133 of 156 profiles, and printing
      difficulty is unpublished on all of them. They appear in each material's Printing tab as
      evidence rather than as filters that would pass everything.</div>`);
  }

  for (const f of NUMERIC.filter((x) => x.group === group)) {
    const c = find(cs, (x) => x.property === f.key);
    const a = availability(materials, f.key);
    const extra = f.key === 'hdt045' && a.caveats
      ? `${a.caveats} of those ${a.withData} cite a source that states the standard but not the load`
      : f.key === 'priceCADkg' ? 'Three Canadian retailers, sampled 2026-09-10' : null;
    out.push(`<div class="control" data-active="${!!c}">
      <label>${esc(f.label)}</label>
      ${availLine(a, extra)}
      <div class="row">
        <select class="op" data-op-for="${f.key}">
          ${['>=', '<=', '>', '<'].map((o) => `<option ${(c?.operator ?? f.op) === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
        <input type="number" step="any" data-value-for="${f.key}" value="${c ? c.value : ''}" placeholder="${f.placeholder}">
        <span class="unit">${esc(f.unit)}</span>
        ${c ? `<button class="icon-btn clear" data-clear="${f.key}" title="Clear">✕</button>` : ''}
      </div>
      ${c ? `<label style="font-weight:400;font-size:12px;margin-top:5px"><input type="checkbox" data-soft="${f.key}" ${c.mandatory === false ? 'checked' : ''}> Preference only, never removes a candidate</label>` : ''}
    </div>`);
  }

  if (group === 'Environment') {
    const cats = db.meta.environmentCategories ?? {};
    const verdict = Object.entries(cats).filter(([, v]) => v.kind === 'verdict');
    const indicator = Object.entries(cats).filter(([, v]) => v.kind === 'indicator');

    for (const [key, v] of verdict.sort((a, b) => b[1].usable - a[1].usable)) {
      const on = !!find(cs, (c) => c.kind === 'environment' && c.category === key);
      out.push(`<div class="control" data-active="${on}">
        <label><input type="checkbox" data-env="${esc(key)}" ${on ? 'checked' : ''}> ${esc(key.replace(/-/g, ' '))} resistance</label>
        <div class="avail">${v.usable} records state a verdict, across ${v.materials} materials</div>
      </div>`);
    }
    if (indicator.length) {
      out.push(`<div class="note"><strong>Evidence only, not filters.</strong>
        ${indicator.map(([k, v]) => `${esc(k.replace(/-/g, ' '))} (${v.records} records)`).join(', ')}.
        Every record in these categories is narrative text with no reducible verdict, so no material
        could pass or fail such a test. Offering them as constraints would return UNKNOWN for all
        ${db.meta.counts.materials} while looking like a working filter. They are shown in each
        material's Environment tab instead.</div>`);
    }
  }

  if (group === 'Manufacturing') {
    const sel = find(cs, (c) => c.facet === 'reinforcement')?.in ?? [];
    const counts = {};
    for (const m of materials) { const r = m.facets.reinforcement.value; counts[r] = (counts[r] ?? 0) + 1; }
    out.push(`<div class="control" data-active="${sel.length > 0}">
      <label>Reinforcement</label>
      <div class="avail">From the Modifier / filler column</div>
      <div class="checks">${REINFORCEMENT.map(([k, l]) => `
        <label><input type="checkbox" data-facet="${k}" ${sel.includes(k) ? 'checked' : ''}>
        ${esc(l)}<span class="n">${counts[k] ?? 0}</span></label>`).join('')}</div>
    </div>`);
    const dry = find(cs, (c) => c.gate === 'dryingKnown');
    out.push(`<div class="control" data-active="${!!dry}">
      <label><input type="checkbox" data-gate="dryingKnown" ${dry ? 'checked' : ''}> Drying schedule published</label>
      <div class="avail">73 of 156 profiles publish one</div>
    </div>`);
  }

  if (group === 'Evidence') {
    const g = find(cs, (c) => c.kind === 'evidence');
    out.push(`<div class="control" data-active="${!!g}">
      <label><input type="checkbox" data-evidence="exactGrade" ${g?.exactGrade ? 'checked' : ''}> Exact-grade measurement exists</label>
      <div class="avail">12 of ${materials.length} materials have no property measurements at all</div>
    </div>`);
    out.push(`<div class="control" data-active="${!!g?.noConflicts}">
      <label><input type="checkbox" data-evidence="noConflicts" ${g?.noConflicts ? 'checked' : ''}> Exclude unresolved conflicts</label>
      <div class="avail">1 open conflict and 1 quarantined measurement in this snapshot</div>
    </div>`);
  }

  return out.join('');
}

function wire(host, state, actions) {
  const { scenario } = state;
  const cs = () => scenario.constraints;
  const drop = (pred) => { scenario.constraints = cs().filter((c) => !pred(c)); };

  host.querySelectorAll('[data-gate]').forEach((el) => el.addEventListener('change', () => {
    const gate = el.dataset.gate;
    drop((c) => c.gate === gate);
    if (el.checked) {
      const group = gate === 'dryingKnown' ? 'Manufacturing' : 'Compatibility';
      scenario.constraints.push({ kind: 'gate', gate, __group: group, ...(gate === 'abrasive' ? { hardenedAvailable: true } : {}) });
    }
    actions.changed();
  }));

  const statusBoxes = [...host.querySelectorAll('[data-status]')];
  statusBoxes.forEach((el) => el.addEventListener('change', () => {
    const chosen = statusBoxes.filter((b) => b.checked).map((b) => b.dataset.status);
    drop((c) => c.gate === 'h2cStatus');
    if (chosen.length) scenario.constraints.push({ kind: 'gate', gate: 'h2cStatus', in: chosen, __group: 'Compatibility' });
    actions.changed();
  }));

  const facetBoxes = [...host.querySelectorAll('[data-facet]')];
  facetBoxes.forEach((el) => el.addEventListener('change', () => {
    const chosen = facetBoxes.filter((b) => b.checked).map((b) => b.dataset.facet);
    drop((c) => c.facet === 'reinforcement');
    if (chosen.length) scenario.constraints.push({ kind: 'facet', facet: 'reinforcement', in: chosen, __group: 'Manufacturing' });
    actions.changed();
  }));

  host.querySelectorAll('[data-env]').forEach((el) => el.addEventListener('change', () => {
    const cat = el.dataset.env;
    drop((c) => c.kind === 'environment' && c.category === cat);
    if (el.checked) scenario.constraints.push({ kind: 'environment', category: cat, require: ['resistant', 'limited'], __group: 'Environment' });
    actions.changed();
  }));

  const upsertNumeric = (key) => {
    const opEl = host.querySelector(`[data-op-for="${key}"]`);
    const vEl = host.querySelector(`[data-value-for="${key}"]`);
    const def = NUMERIC.find((f) => f.key === key);
    const raw = vEl.value.trim();
    drop((c) => c.property === key);
    if (raw !== '' && Number.isFinite(Number(raw))) {
      const existingSoft = host.querySelector(`[data-soft="${key}"]`)?.checked ?? false;
      scenario.constraints.push({
        kind: 'numeric', property: key, operator: opEl.value, value: Number(raw),
        mandatory: !existingSoft, __group: def.group,
      });
    }
    actions.changed();
  };
  host.querySelectorAll('[data-value-for]').forEach((el) => {
    el.addEventListener('change', () => upsertNumeric(el.dataset.valueFor));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') upsertNumeric(el.dataset.valueFor); });
  });
  host.querySelectorAll('[data-op-for]').forEach((el) => el.addEventListener('change', () => upsertNumeric(el.dataset.opFor)));
  host.querySelectorAll('[data-soft]').forEach((el) => el.addEventListener('change', () => upsertNumeric(el.dataset.soft)));
  host.querySelectorAll('[data-clear]').forEach((el) => el.addEventListener('click', () => {
    drop((c) => c.property === el.dataset.clear);
    actions.changed();
  }));

  const evBoxes = [...host.querySelectorAll('[data-evidence]')];
  evBoxes.forEach((el) => el.addEventListener('change', () => {
    drop((c) => c.kind === 'evidence');
    const spec = {};
    for (const b of evBoxes) if (b.checked) spec[b.dataset.evidence] = true;
    if (Object.keys(spec).length) scenario.constraints.push({ kind: 'evidence', ...spec, __group: 'Evidence' });
    actions.changed();
  }));
}

/** Relax one criterion from the ranked exclusion panel. */
export function removeConstraint(scenario, constraint) {
  scenario.constraints = scenario.constraints.filter((c) => c !== constraint);
}
