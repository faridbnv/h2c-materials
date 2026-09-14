// The filter rail.
//
// The pattern that matters: every control states its own data availability before it is touched.
// It tells the user what a criterion can and cannot decide, and turns the build's audit findings
// into everyday guidance instead of a footnote.
//
// A field that cannot discriminate is not built as a filter. Most print profiles (140 of 167) say
// "Verify exact grade" for H2C routing, so routing appears in the detail drawer as evidence, never
// here. A filter that passes everything teaches the user to trust something that checked nothing.

import { availability } from '../engine/coverage.js';
import { esc } from './format.js';
import { prop, envLabel, envNoun } from './labels.js';

// Labels come from the one vocabulary. The rail used to speak materials science on its own
// ("Tensile modulus XY", "HDT at 0.45 MPa") while the detail drawer three clicks away said
// "Stiffness" and "Heat resistance" for the same number. Plain name leads, technical name follows.
//
// No placeholder numbers. Grey 1400 and 100 sitting in the boxes read as applied settings, which
// they were not, and an applied value looked almost identical. The example lives in the helper
// line where it cannot be mistaken for a constraint.
const NUMERIC = [
  { group: 'Mechanical', key: 'density',           op: '<=', eg: 'e.g. 1400 for something light' },
  { group: 'Mechanical', key: 'tensileModulusXY',  op: '>=', eg: 'e.g. 3, about as stiff as unfilled PLA' },
  { group: 'Mechanical', key: 'tensileStrengthXY', op: '>=', eg: 'e.g. 50 for a load-bearing part' },
  { group: 'Mechanical', key: 'elongationXY',      op: '>=', eg: 'e.g. 100 or more for anything rubbery' },
  { group: 'Thermal',    key: 'hdt045',            op: '>=', eg: 'e.g. 100 to survive a hot car' },
  { group: 'Cost',       key: 'priceCADkg',        op: '<=', eg: 'e.g. 60 per kilogram' },
];

// Ordered by how often a criterion actually decides something. Mechanical and thermal properties
// carry the decision; compatibility sits last because for this database it mostly cannot
// discriminate, and putting it first made the whole rail look like it did nothing.
const GROUPS = ['Mechanical', 'Thermal', 'Cost', 'Environment', 'Manufacturing', 'Evidence', 'Compatibility'];
const OPEN_BY_DEFAULT = new Set(['Mechanical', 'Thermal']);

const H2C_STATUSES = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical'];
const REINFORCEMENT = [
  ['carbon-fibre', 'Carbon fibre'], ['glass-fibre', 'Glass fibre'], ['unfilled', 'Unfilled'],
  ['esd', 'ESD'], ['foaming', 'Foaming'], ['undisclosed', 'Undisclosed variant'],
];

// Plain words for the comparison. "≥" is unambiguous to an engineer and opaque to everyone else.
const OP_WORD = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };

const find = (cs, pred) => cs.find(pred) ?? null;

// Properties that cannot be negative. A negative density or price was accepted as a real
// requirement and silently emptied the list.
const NON_NEGATIVE = new Set(['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'priceCADkg']);

// Interface state that must survive a re-render. The rail is rebuilt from the scenario on every
// change, which used to snap every group back to its default and drop keyboard focus, and an
// operator chosen before a number was typed was thrown away because no constraint held it yet.
const openGroups = new Map();
const draftOps = new Map();
const FOCUS_KEYS = ['valueFor', 'opFor', 'soft', 'gate', 'status', 'facet', 'env', 'buy', 'evidence', 'buildMaterial', 'clear'];

function availLine(a, extra) {
  let s = `<div class="avail">${a.withData} of ${a.total} have data`;
  if (extra) s += `<span class="caveat">${esc(extra)}</span>`;
  return s + '</div>';
}

export function renderFilters(host, state, actions) {
  const { db, scenario } = state;
  // Counts are over candidates. A family entry owns no product, so counting it would read as missing data.
  const materials = db.materials.filter((m) => !m.familyEntry);
  const cs = scenario.constraints;

  const focused = host.contains(document.activeElement) ? document.activeElement : null;
  const focusKey = focused && FOCUS_KEYS.find((k) => focused.dataset?.[k] !== undefined);
  const focusValue = focusKey ? focused.dataset[focusKey] : null;

  const activeIn = (group) => cs.filter((c) => c.__group === group).length;
  const parts = [];

  // One always-visible control above the groups: it is the only compatibility filter that
  // changes the candidate set for most sessions.
  const scopeOn = !!find(cs, (c) => c.gate === 'scope');
  const outOfScope = materials.filter((m) => m.excluded).length;
  parts.push(`<div class="rail-pinned">
    <label class="toggle"><input type="checkbox" data-gate="scope" ${scopeOn ? 'checked' : ''}>
      <span>In the H2C research scope only</span></label>
    <div class="avail">Hides the ${outOfScope} materials the database places outside the printer's envelope.
      It does not check print settings; those are under Compatibility.</div>
  </div>`);

  for (const group of GROUPS) {
    const n = activeIn(group);
    const open = openGroups.has(group) ? openGroups.get(group) : OPEN_BY_DEFAULT.has(group) || n > 0;
    parts.push(`<details class="group" data-group="${group}" ${open ? 'open' : ''}>
      <summary>${group}<span class="count" data-zero="${n === 0}">${n}</span></summary>
      <div class="group-body">${body(group, materials, cs, db)}</div>
    </details>`);
  }
  host.innerHTML = parts.join('');
  host.querySelectorAll('details.group').forEach((d) => d.addEventListener('toggle', () => openGroups.set(d.dataset.group, d.open)));
  wire(host, state, actions);

  if (focusKey) {
    // A cleared criterion loses its clear button; its number box is the natural place to land.
    const attr = focusKey === 'clear' ? 'data-value-for' : `data-${focusKey.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;
    host.querySelector(`[${attr}="${CSS.escape(focusValue)}"]`)?.focus();
  }
}

function body(group, materials, cs, db) {
  const out = [];

  if (group === 'Compatibility') {
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
      // The chamber is answered by a temperature or in words, and the two are counted apart: "no
      // heated chamber needed" settles the question without being a number.
      const avail = gate === 'chamber'
        ? (() => {
          const numeric = materials.filter((m) => m.print?.chamberC).length;
          const words = materials.filter((m) => !m.print?.chamberC && m.print?.chamberGuidance?.state === 'not-required').length;
          const partial = materials.filter((m) => m.gates.chamber?.verdict === 'partial').length;
          return `${numeric} of ${materials.length} publish a chamber temperature and ${words} more say no heated chamber is needed<span class="caveat">${partial} publish a window the H2C only partly reaches; those stay unresolved, not passed</span>`;
        })()
        : `${known} of ${materials.length} publish a ${label.toLowerCase()} requirement`;
      out.push(`<div class="control" data-active="${on}">
        <label><input type="checkbox" data-gate="${gate}" ${on ? 'checked' : ''}> ${label} within ${limit} °C baseline</label>
        <div class="avail">${avail}</div>
      </div>`);
    }

    // Asked as the hardware you lack. Owning a hardened nozzle removes nothing, so there is nothing
    // to ask about it.
    const abr = find(cs, (c) => c.gate === 'abrasive' && !c.hardenedAvailable);
    const needsHardened = materials.filter((m) => m.gates.abrasive === 'requires-hardened').length;
    out.push(`<div class="control" data-active="${!!abr}">
      <label><input type="checkbox" data-gate="abrasive" ${abr ? 'checked' : ''}> I don't have a hardened nozzle</label>
      <div class="avail">${needsHardened} of ${materials.length} are recorded as needing one, and those are hidden</div>
      <div class="eg">No record is not proof a filament is safe for brass. Fibre-filled materials
        without guidance stay unresolved; glow, metal, wood and marble fills are worth checking.
        With a hardened nozzle, leave this off: it prints everything here.</div>
    </div>`);

    const verifyGrade = db.profiles.filter((p) => /verify exact grade/i.test(`${p.routing.left} ${p.routing.right}`)).length;
    out.push(`<div class="note"><strong>Not offered as filters.</strong> H2C left/right routing, AMS 2 Pro and
      AMS HT read "verify exact grade, no blanket approval" on ${verifyGrade} of ${db.profiles.length} profiles, and printing
      difficulty is unpublished on all of them. They appear in each material's Printing tab as
      evidence rather than as filters that would pass everything.</div>`);
  }

  for (const f of NUMERIC.filter((x) => x.group === group)) {
    const c = find(cs, (x) => x.property === f.key);
    const a = availability(materials, f.key);
    const P = prop(f.key);
    const extra = f.key === 'hdt045' && a.caveats
      ? `${a.caveats} of those ${a.withData} cite a source that states the standard but not the load`
      : f.key === 'priceCADkg' ? `Three Canadian retailers, sampled ${db.meta.pricesSampled ?? db.meta.snapshot}` : null;
    out.push(`<div class="control" data-active="${!!c}">
      <label title="${esc(P.technical)}">${esc(P.plain)}</label>
      <div class="sub-label">${esc(P.hint)}</div>
      ${availLine(a, extra)}
      <div class="row">
        <select class="op" data-op-for="${f.key}" aria-label="${esc(P.plain)} comparison">
          ${['>=', '<=', '>', '<'].map((o) => `<option value="${o}" ${(c?.operator ?? draftOps.get(f.key) ?? f.op) === o ? 'selected' : ''}>${esc(OP_WORD[o])}</option>`).join('')}
        </select>
        <input type="number" step="any" data-value-for="${f.key}" value="${c ? c.value : ''}"
          ${NON_NEGATIVE.has(f.key) ? 'min="0"' : ''} aria-label="${esc(P.plain)} value"
          aria-describedby="err-${f.key}">
        <span class="unit">${esc(P.unit)}</span>
        ${c ? `<button class="icon-btn clear" data-clear="${f.key}" title="Remove the ${esc(P.plain.toLowerCase())} requirement" aria-label="Remove the ${esc(P.plain.toLowerCase())} requirement">✕</button>` : ''}
      </div>
      <div class="field-error" id="err-${f.key}" role="alert" hidden></div>
      ${c ? '' : `<div class="eg">${esc(f.eg)}. Applies when you press Enter or leave the box.</div>`}
      ${c ? `<label style="font-weight:400;font-size:12px;margin-top:5px"><input type="checkbox" data-soft="${f.key}" ${c.mandatory === false ? 'checked' : ''}> Track only: reported on each material, never removes or reorders one</label>` : ''}
    </div>`);
  }

  // Availability. Half the results from a template have no price and nothing said whether they
  // could be bought at all, so a recommendation could not be acted on. The data supports this:
  // 48 materials have at least one sampled Canadian offer and 42 had stock on the sampling date.
  if (group === 'Cost') {
    const buy = find(cs, (c) => c.gate === 'buyable');
    const withOffer = materials.filter((m) => m.buy).length;
    const inStock = materials.filter((m) => m.buy?.anyInStock).length;
    out.push(`<div class="control" data-active="${!!buy}">
      <label><input type="checkbox" data-buy="any" ${buy ? 'checked' : ''}> Listed in the Canadian price sample</label>
      <div class="avail">${withOffer} of ${materials.length} were listed by a sampled Canadian retailer</div>
      <label class="sub-check"><input type="checkbox" data-buy="stock" ${buy?.inStock ? 'checked' : ''} ${buy ? '' : 'disabled'}>
        and it was in stock when sampled</label>
      <div class="avail">${inStock} had stock on ${esc(db.meta.pricesSampled ?? db.meta.snapshot)}. Not live stock.</div>
      <div class="eg">Three retailers, one sampling date. A material with no offer here is not
        necessarily unavailable, so it is held as unknown rather than failed.</div>
    </div>`);
  }

  if (group === 'Environment') {
    const cats = db.meta.environmentCategories ?? {};
    const verdict = Object.entries(cats).filter(([, v]) => v.kind === 'verdict');
    const indicator = Object.entries(cats).filter(([, v]) => v.kind === 'indicator');

    for (const [key, v] of verdict.sort((a, b) => b[1].usable - a[1].usable)) {
      const on = !!find(cs, (c) => c.kind === 'environment' && c.category === key);
      out.push(`<div class="control" data-active="${on}">
        <label><input type="checkbox" data-env="${esc(key)}" ${on ? 'checked' : ''}> Resists ${esc(envNoun(key))}</label>
        <div class="avail">${v.usable} records state a verdict, across ${v.materials} materials</div>
      </div>`);
    }
    if (verdict.length) {
      out.push(`<div class="eg">A pass means a source reported resistance to the exposures it tested,
        not to every chemical in the class. "Limited resistance" counts as unresolved. Open the
        material's Environment tab for the exact agent and conditions.</div>`);
    }
    if (indicator.length) {
      out.push(`<div class="note"><strong>Evidence only, not filters.</strong>
        ${indicator.map(([k, v]) => `${esc(envLabel(k))} (${v.records} records)`).join(', ')}.
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
    const dryingProfiles = db.profiles.filter((p) => p.drying?.state === 'stated').length;
    out.push(`<div class="control" data-active="${!!dry}">
      <label><input type="checkbox" data-gate="dryingKnown" ${dry ? 'checked' : ''}> Drying guidance published</label>
      <div class="avail">${dryingProfiles} of ${db.profiles.length} print profiles publish one</div>
    </div>`);
    const build = find(cs, (c) => c.facet === 'supportMaterial');
    const supports = materials.filter((m) => m.facets.supportMaterial?.value).length;
    out.push(`<div class="control" data-active="${!!build}">
      <label><input type="checkbox" data-build-material ${build ? 'checked' : ''}> Build materials only</label>
      <div class="avail">Hides the ${supports} support and interface materials</div>
    </div>`);
  }

  if (group === 'Evidence') {
    const g = find(cs, (c) => c.kind === 'evidence');
    const measured = new Set(db.measurements.map((m) => m.materialId));
    const unmeasured = materials.filter((m) => !measured.has(m.id)).length;
    const conflicts = db.coverage.filter((r) => r.status === 'Conflict' || r.status === 'Quarantined').length;
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    out.push(`<div class="control" data-active="${!!g?.exactGrade}">
      <label><input type="checkbox" data-evidence="exactGrade" ${g?.exactGrade ? 'checked' : ''}> Has a grade-specific measurement</label>
      <div class="avail">Any numeric property on any recorded grade. ${unmeasured} of ${materials.length} materials have no property measurements at all</div>
    </div>`);
    out.push(`<div class="control" data-active="${!!g?.noConflicts}">
      <label><input type="checkbox" data-evidence="noConflicts" ${g?.noConflicts ? 'checked' : ''}> Exclude unresolved conflicts</label>
      <div class="avail">${plural(conflicts, 'coverage record')} flagged as a conflict or quarantined in this snapshot</div>
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
      scenario.constraints.push({ kind: 'gate', gate, __group: group, ...(gate === 'abrasive' ? { hardenedAvailable: false } : {}) });
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
    if (el.checked) scenario.constraints.push({ kind: 'environment', category: cat, __group: 'Environment' });
    actions.changed();
  }));

  host.querySelector('[data-build-material]')?.addEventListener('change', (e) => {
    drop((c) => c.facet === 'supportMaterial');
    if (e.target.checked) scenario.constraints.push({ kind: 'facet', facet: 'supportMaterial', equals: false, __group: 'Manufacturing' });
    actions.changed();
  });

  const upsertNumeric = (key) => {
    const opEl = host.querySelector(`[data-op-for="${key}"]`);
    const vEl = host.querySelector(`[data-value-for="${key}"]`);
    const errEl = host.querySelector(`#err-${key}`);
    const def = NUMERIC.find((f) => f.key === key);
    const raw = vEl.value.trim();
    const existing = find(cs(), (c) => c.property === key);
    draftOps.set(key, opEl.value);

    // Say what is wrong and leave the entry and the applied criterion alone, rather than dropping
    // the requirement because the box could not be read.
    const problem = vEl.validity.badInput ? 'Enter a number.'
      : raw !== '' && !Number.isFinite(Number(raw)) ? 'Enter a number.'
      : raw !== '' && NON_NEGATIVE.has(key) && Number(raw) < 0 ? `${prop(key).plain} cannot be negative.`
      : null;
    errEl.hidden = !problem;
    errEl.textContent = problem ?? '';
    vEl.setAttribute('aria-invalid', String(!!problem));
    if (problem) return;

    // An operator picked before any number is typed is a draft, not a change.
    if (raw === '' && !existing) return;

    drop((c) => c.property === key);
    if (raw !== '') {
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

  const buyBoxes = [...host.querySelectorAll('[data-buy]')];
  buyBoxes.forEach((el) => el.addEventListener('change', () => {
    const any = buyBoxes.find((b) => b.dataset.buy === 'any');
    const stock = buyBoxes.find((b) => b.dataset.buy === 'stock');
    drop((c) => c.gate === 'buyable');
    // "In stock" only means anything once the offer filter itself is on.
    if (el.dataset.buy === 'stock' && el.checked) any.checked = true;
    if (any.checked) {
      scenario.constraints.push({ kind: 'gate', gate: 'buyable', inStock: stock.checked, __group: 'Cost' });
    }
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

/** Remove one criterion from the ranked exclusion panel. */
export function removeConstraint(scenario, constraint) {
  scenario.constraints = scenario.constraints.filter((c) => c !== constraint);
}
