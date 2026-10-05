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
import { runSelection } from '../engine/constraints.js';
import { esc, priceSampleWords, explainButton } from './format.js';
import { prop, envLabel, envRequirement, GATE, H2C_STATUS, FILLER } from './labels.js';
import { numericFilters, nonNegativeKeys, headlineDef } from './registry.js';
import { PRINTABLE, printCheck } from './templates.js';

// Labels come from the one vocabulary (labels.js), and property names from the registry: the name a data sheet uses,
// with its method as the line under it. The reader is an engineer (D124).
//
// No placeholder numbers. Grey 1400 and 100 sitting in the boxes read as applied settings, which
// they were not, and an applied value looked almost identical. The example lives in the helper
// line where it cannot be mistaken for a constraint.
// The numeric filters come from the registry (headline_definitions.csv: filter group, operator, example).

// The order an engineer screens in (the owner's ruling of 2026-10-04): what kind of plastic, what it must withstand,
// whether the H2C can print it, the state the part is used in, then cost and how strict to be about the data. The keys
// are the constraints' stored group names, which saved scenarios carry; GROUP_LABEL is what the rail shows. The H2C's
// checks used to sit above every group and again under Compatibility at the bottom; they are one group now.
const GROUPS = ['Material family', 'Mechanical', 'Thermal', 'Environment', 'Compatibility', 'Part condition', 'Cost', 'Evidence'];
const GROUP_LABEL = { Compatibility: 'Printing on the H2C', Cost: 'Cost and availability', Evidence: 'Data quality' };
const OPEN_BY_DEFAULT = new Set(['Material family', 'Mechanical', 'Thermal', 'Compatibility']);

const H2C_STATUSES = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical'];
const REINFORCEMENT = ['carbon-fibre', 'glass-fibre', 'unfilled', 'esd', 'foaming', 'undisclosed'];

// The comparison in words; the symbols are in the pills' and the drawer's names of a limit.
const OP_WORD = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };

/**
 * The rail group a requirement is shown and counted in. It is derived from the requirement, not read from the group
 * name it was saved with: the reinforcement, build-material and drying checks were saved under "Manufacturing", a group
 * the rail no longer has, and the badge must count them where they now sit.
 */
export function railGroupOf(c) {
  if (c.kind === 'numeric') return numericFilters().find((f) => f.key === c.property)?.group ?? c.__group;
  if (c.kind === 'facet') return 'Material family';
  if (c.kind === 'environment') return 'Environment';
  if (c.kind === 'evidence') return 'Evidence';
  if (c.kind === 'gate') return c.gate === 'buyable' ? 'Cost' : 'Compatibility';
  return c.__group;
}

const find = (cs, pred) => cs.find(pred) ?? null;


// Interface state that must survive a re-render. The rail is rebuilt from the scenario on every
// change, which used to snap every group back to its default and drop keyboard focus, and an
// operator chosen before a number was typed was thrown away because no constraint held it yet.
const openGroups = new Map();
const draftOps = new Map();
const FOCUS_KEYS = ['valueFor', 'opFor', 'soft', 'gate', 'status', 'facet', 'family', 'polymer', 'env', 'buy', 'evidence', 'buildMaterial', 'clear', 'anneal', 'annealMax', 'moisture', 'printable'];

function availLine(a, extra, estimated = 0) {
  let s = `<div class="avail">${a.withData} of ${a.total} have data${estimated ? `, ${estimated} more estimated` : ''}`;
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

  // What each group's badge counts: its requirements, and for Part condition and Data quality the settings that change
  // which values are judged, which are not requirements but change answers all the same.
  const activeIn = (group) => cs.filter((c) => railGroupOf(c) === group).length
    + (group === 'Part condition' ? (scenario.anneal ? 1 : 0) + (scenario.moisture === 'conditioned' ? 1 : 0) : 0)
    + (group === 'Evidence' && state.ctx?.evidence === 'as-published' ? 1 : 0);
  const parts = [];
  for (const group of GROUPS) {
    const n = activeIn(group);
    const open = openGroups.has(group) ? openGroups.get(group) : OPEN_BY_DEFAULT.has(group) || n > 0;
    const inner = group === 'Part condition' ? partCondition(scenario, db) : body(group, materials, cs, db, state.ctx);
    parts.push(`<details class="group" data-group="${group}" ${open ? 'open' : ''}>
      <summary><span class="chevron" aria-hidden="true"></span>${esc(GROUP_LABEL[group] ?? group)}<span class="count" data-zero="${n === 0}">${n} set</span></summary>
      <div class="group-body">${inner}</div>
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

/**
 * Part condition (D99): the state the part is used in, which decides which of a product's published values are judged.
 * It adds no requirement. Annealing allowed can only add passes, since as printed is always tried too; conditioned
 * judges only values measured after moisture conditioning, which few products publish, so it turns most answers to
 * unknown. Each switch says which it does. It sat above every group as a checkbox and a radio pair, said neither, and
 * read as a filter.
 */
function partCondition(scenario, db) {
  const live = db.grades.filter((g) => !g.retired);
  const annealed = live.filter((g) => g.states?.some((s) => s.treatment)).length;
  const conditioned = live.filter((g) => g.states?.some((s) => s.moisture === 'conditioned')).length;
  const on = scenario.anneal === true;
  const dry = scenario.moisture !== 'conditioned';
  const seg = (attr, value, pressed, text) => `<button type="button" data-${attr}="${value}" aria-pressed="${pressed}">${text}</button>`;
  return `<div class="avail">The state the part is used in. It selects which published values your requirements are
      judged on, and adds no requirement of its own.</div>
    <div class="control part-state" data-active="${on}">
      <div class="seg-label" id="seg-anneal">Post-processing</div>
      <div class="segmented seg-sm" role="group" aria-labelledby="seg-anneal">
        ${seg('anneal', 'off', !on, 'As printed')}${seg('anneal', 'on', on, 'Annealing allowed')}</div>
      ${on ? `<label class="anneal-max">Oven reaches up to <input type="number" data-anneal-max min="0" step="5" value="${scenario.annealMaxC ?? ''}"
        placeholder="any" aria-label="The highest annealing temperature your oven reaches, in °C"> °C</label>` : ''}
      <div class="avail">${annealed} products publish annealed values. With annealing allowed, a product may be judged on them,
        and its result names the schedule from its data sheet. This can only add passes.</div>
    </div>
    <div class="control part-state" data-active="${!dry}">
      <div class="seg-label" id="seg-moisture">Moisture in service</div>
      <div class="segmented seg-sm" role="group" aria-labelledby="seg-moisture">
        ${seg('moisture', 'dry', dry, 'Dry')}${seg('moisture', 'conditioned', !dry, 'Conditioned')}</div>
      <div class="avail">Data sheets test dry bars. Conditioned judges only values measured after moisture conditioning,
        which ${conditioned} products publish, so most materials become unknown and Confirmed only leaves them out.</div>
    </div>`;
}

function body(group, materials, cs, db, ctx = {}) {
  const out = [];
  // With estimates on, the availability line also counts the materials an estimate stands in for.
  const estimatedFor = (key) => (ctx.showEstimates ? materials.filter((m) => { const h = m.headline?.[key]; return h && !h.known && !h.notApplicable?.rule && h.estimate; }).length : 0);

  if (group === 'Material family') {
    // Counted over the candidates every other requirement leaves, so a chip says how many a click would show; the
    // rest of the rail counts every material, because its availability lines describe the data, not the query.
    const isFamilyFacet = (c) => c.kind === 'facet' && (c.facet === 'family' || c.facet === 'polymer');
    const eligible = new Set(runSelection(materials, cs.filter((c) => !isFamilyFacet(c)), ctx).candidates.map((e) => e.materialId));
    const famSel = find(cs, (c) => c.facet === 'family')?.in ?? [];
    const polySel = find(cs, (c) => c.facet === 'polymer')?.in ?? null;
    const families = new Map();
    for (const m of materials) {
      const f = m.facets.family?.value ?? m.family;
      if (!families.has(f)) families.set(f, { total: 0, open: 0, polymers: new Map() });
      const e = families.get(f);
      e.total++;
      if (eligible.has(m.id)) e.open++;
      const p = m.facets.polymer?.value ?? `${f} › ${m.basePolymer}`;
      const pe = e.polymers.get(p) ?? { total: 0, open: 0 };
      pe.total++;
      if (eligible.has(m.id)) pe.open++;
      e.polymers.set(p, pe);
    }
    const ordered = [...families].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
    out.push(`<div class="control family-facet" data-active="${famSel.length > 0}">
      <div class="avail">Each count is how many of that family your other requirements leave. Tick a family to list its
        polymers.</div>
      <div class="checks">${ordered.map(([f, e]) => {
        const on = famSel.includes(f);
        const polymers = [...e.polymers].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
        const sub = on && polymers.length > 1 ? `<div class="checks sub-checks">${polymers.map(([p, pe]) => `
          <label><input type="checkbox" data-polymer="${esc(p)}" data-polymer-family="${esc(f)}" ${polySel?.includes(p) ? 'checked' : ''}>
          ${esc(p.split(' › ').pop())}<span class="n" title="${pe.open} of ${pe.total} left by the other requirements">${pe.open}</span></label>`).join('')}</div>` : '';
        return `<div class="family-chip">
          <label title="${e.open} of ${e.total} left by the other requirements"><input type="checkbox" data-family="${esc(f)}" data-polymers="${esc(polymers.map(([p]) => p).join('|'))}" ${on ? 'checked' : ''}>
          ${esc(f)}<span class="n">${e.open}</span></label>${sub}</div>`;
      }).join('')}</div>
    </div>`);

    // The filler and the build-material check describe the material too, so they sit with its family. They were under
    // "Manufacturing", which also held drying, a printing question.
    const sel = find(cs, (c) => c.facet === 'reinforcement')?.in ?? [];
    const counts = {};
    for (const m of materials) { const r = m.facets.reinforcement.value; counts[r] = (counts[r] ?? 0) + 1; }
    out.push(`<div class="control" data-active="${sel.length > 0}">
      <label>Filler</label>
      <div class="checks">${REINFORCEMENT.map((k) => `
        <label><input type="checkbox" data-facet="${k}" ${sel.includes(k) ? 'checked' : ''}>
        ${esc(FILLER[k])}<span class="n">${counts[k] ?? 0}</span></label>`).join('')}</div>
    </div>`);
    const build = find(cs, (c) => c.facet === 'supportMaterial');
    const supports = materials.filter((m) => m.facets.supportMaterial?.value).length;
    out.push(`<div class="control" data-active="${!!build}">
      <label><input type="checkbox" data-build-material ${build ? 'checked' : ''}> Build materials only</label>
      <div class="avail">Excludes the ${supports} support and interface materials.</div>
    </div>`);
  }

  if (group === 'Compatibility') {
    // One check for the H2C's temperature limits, with its three parts under it: every template asks all three (D101),
    // and a reader may drop one. It used to be a box above every group, with the same three gates repeated here.
    const asked = { nozzle: !!find(cs, (c) => c.gate === 'nozzle'), bed: !!find(cs, (c) => c.gate === 'bed'), chamber: !!find(cs, (c) => c.gate === 'chamber') };
    const check = printCheck(cs);
    const gateLine = (gate) => {
      if (gate !== 'chamber') {
        const known = materials.filter((m) => m.gates[gate]?.verdict !== 'unknown').length;
        return `${known} of ${materials.length} publish a ${gate} temperature`;
      }
      // The chamber is answered by a temperature or in words, and the two are counted apart: "no heated chamber
      // needed" settles the question without being a number.
      const numeric = materials.filter((m) => m.print?.chamberC).length;
      const words = materials.filter((m) => !m.print?.chamberC && m.print?.chamberGuidance?.state === 'not-required').length;
      const partial = materials.filter((m) => m.gates.chamber?.verdict === 'partial').length;
      return `${numeric} of ${materials.length} publish a chamber temperature; ${words} more say none is needed`
        + `<span class="caveat">${partial} publish a window the H2C reaches only in part; they stay unresolved</span>`;
    };
    out.push(`<div class="control print-check" data-active="${check !== 'none'}">
      <label><input type="checkbox" data-printable ${check === 'all' ? 'checked' : ''}> Within H2C temperature limits</label>
      <div class="avail">Checks each product's published nozzle, bed and chamber temperatures. Where its data sheet is
        silent, a data sheet shared with another product, then the Bambu Lab Filament Guide, stands in; the drawer says which.</div>
      <div class="checks sub-checks">${['nozzle', 'bed', 'chamber'].map((gate) => `
        <div><label><input type="checkbox" data-gate="${gate}" ${asked[gate] ? 'checked' : ''}> ${esc(GATE[gate].plain)}</label>
        <div class="avail">${gateLine(gate)}</div></div>`).join('')}</div>
    </div>`);

    // Asked as the hardware you lack. Owning a hardened nozzle removes nothing, so there is nothing to ask about it.
    const abr = find(cs, (c) => c.gate === 'abrasive' && !c.hardenedAvailable);
    const needsHardened = materials.filter((m) => m.gates.abrasive === 'requires-hardened').length;
    out.push(`<div class="control" data-active="${!!abr}">
      <label><input type="checkbox" data-gate="abrasive" ${abr ? 'checked' : ''}> Brass nozzle only</label>
      <div class="avail">Excludes the ${needsHardened} materials whose sources call for a hardened nozzle.</div>
      <div class="eg">A missing statement is not proof a filament is safe for brass. Fibre-filled materials without one stay
        unresolved; glow, metal, wood and marble fills deserve a check too.</div>
    </div>`);

    const dry = find(cs, (c) => c.gate === 'dryingKnown');
    const dryingBy = (need) => db.profiles.filter((p) => p.drying?.need === need).length;
    out.push(`<div class="control" data-active="${!!dry}">
      <label><input type="checkbox" data-gate="dryingKnown" ${dry ? 'checked' : ''}> Drying instructions published</label>
      <div class="avail">${dryingBy('required')} of ${db.profiles.length} print profiles require drying, ${dryingBy('optional')} advise it for a condition and ${dryingBy('not-needed')} say it is not needed.</div>
    </div>`);

    // The scope: materials the database holds for completeness that the H2C cannot finish, named by their families.
    const scopeOn = !!find(cs, (c) => c.gate === 'scope');
    const excluded = materials.filter((m) => m.excluded);
    const byFamily = new Map();
    for (const m of excluded) byFamily.set(m.family, [...(byFamily.get(m.family) ?? []), m]);
    const familyWords = [...byFamily].sort((x, y) => y[1].length - x[1].length).map(([f, ms]) => {
      const polymers = [...new Set(ms.map((m) => m.basePolymer).filter(Boolean))];
      return `${f} (${ms.length}${polymers.length > 2 ? `, e.g. ${polymers.slice(0, 2).join(', ')}` : ''})`;
    });
    out.push(`<div class="control" data-active="${scopeOn}">
      <label><input type="checkbox" data-gate="scope" ${scopeOn ? 'checked' : ''}> Exclude materials beyond H2C capability</label>
      <div class="avail">${excluded.length} materials: ${esc(familyWords.join(' and '))}.</div>
    </div>`);

    const sel = find(cs, (c) => c.gate === 'h2cStatus')?.in ?? [];
    const counts = {};
    for (const m of materials) counts[m.h2cStatus] = (counts[m.h2cStatus] ?? 0) + 1;
    const meanings = H2C_STATUSES.map((st) => `${H2C_STATUS[st].label}: ${H2C_STATUS[st].meaning}`).join(' ');
    out.push(`<div class="control" data-active="${sel.length > 0}">
      <label>${esc(GATE.h2cStatus.plain)} ${explainButton('?', meanings, { cls: 'info-mark', head: 'Bambu Lab status', label: 'What each Bambu Lab status means' })}</label>
      <div class="avail">Counts are of materials. A material can hold several products.</div>
      <div class="checks">${H2C_STATUSES.map((st) => `
        <label title="${esc(H2C_STATUS[st].meaning)}"><input type="checkbox" data-status="${esc(st)}" ${sel.includes(st) ? 'checked' : ''}>
        ${esc(H2C_STATUS[st].label)}<span class="n">${counts[st] ?? 0}</span></label>`).join('')}</div>
    </div>`);

    const verifyGrade = db.profiles.filter((p) => /verify exact grade/i.test(`${p.routing.left} ${p.routing.right}`)).length;
    out.push(`<div class="note"><strong>Not filters:</strong> AMS compatibility, H2C nozzle routing and print difficulty.
      ${verifyGrade} of ${db.profiles.length} print profiles say only "verify the exact grade", and none rates difficulty, so a
      filter would pass everything. Each material's Printing tab shows what is recorded.</div>`);
  }

  // Which materials a property does not apply to, by family: "elastomers, sintering filaments". The registry's reason
  // is a paragraph for the drawer; the rail names who is left out.
  const notApplicableTo = (key) => {
    const fams = new Map();
    for (const m of materials) if (m.headline?.[key]?.notApplicable) fams.set(m.family, (fams.get(m.family) ?? 0) + 1);
    return [...fams].sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ${n}`).join(', ');
  };

  // The basis every value in these two groups is compared on, said once at the top rather than under each property.
  if (group === 'Mechanical' || group === 'Thermal') {
    out.push(`<div class="avail">Compared on printed (or unstated) specimens, in the orientation named, as printed and dry unless
      Part condition says otherwise.</div>`);
  }

  for (const f of numericFilters().filter((x) => x.group === group)) {
    const c = find(cs, (x) => x.property === f.key);
    const a = availability(materials, f.key);
    const P = prop(f.key);
    const def = headlineDef(f.key);
    const extra = a.caveats
      ? `${a.caveats} of those ${a.withData} cite a source that states the standard but not the load`
      : def?.kind === 'price' ? `${priceSampleWords(db.meta)}.`
      : def?.appliesTo && a.notApplicable ? `Not applicable to ${a.notApplicable} material${a.notApplicable === 1 ? '' : 's'} (${notApplicableTo(f.key)})` : null;
    out.push(`<div class="control" data-active="${!!c}">
      <label title="${esc(P.technical)}">${esc(P.plain)}</label>
      <div class="sub-label">${esc(P.hint)}</div>
      ${availLine(a, extra, estimatedFor(f.key))}
      <div class="row">
        <select class="op" data-op-for="${f.key}" aria-label="${esc(P.plain)} comparison">
          ${['>=', '<=', '>', '<'].map((o) => `<option value="${o}" ${(c?.operator ?? draftOps.get(f.key) ?? f.op) === o ? 'selected' : ''}>${esc(OP_WORD[o])}</option>`).join('')}
        </select>
        <input type="number" step="any" data-value-for="${f.key}" value="${c ? c.value : ''}"
          ${nonNegativeKeys().has(f.key) ? 'min="0"' : ''} aria-label="${esc(P.plain)} value"
          aria-describedby="err-${f.key}">
        <span class="unit">${esc(P.unit)}</span>
        ${c ? `<button class="icon-btn clear" data-clear="${f.key}" title="Remove the ${esc(P.plain.toLowerCase())} requirement" aria-label="Remove the ${esc(P.plain.toLowerCase())} requirement">✕</button>` : ''}
      </div>
      <div class="field-error" id="err-${f.key}" role="alert" hidden></div>
      ${c ? '' : `<div class="eg">${esc(f.eg)}.</div>`}
      ${c ? `<label class="sub-check"><input type="checkbox" data-soft="${f.key}" ${c.mandatory === false ? 'checked' : ''}> Report only: shown for each material, does not filter</label>` : ''}
    </div>`);
  }

  // Availability: whether a sampled Canadian shop listed the product, and had it in stock on the day.
  if (group === 'Cost') {
    const buy = find(cs, (c) => c.gate === 'buyable');
    const withOffer = materials.filter((m) => m.buy).length;
    const inStock = materials.filter((m) => m.buy?.anyInStock).length;
    out.push(`<div class="control" data-active="${!!buy}">
      <label><input type="checkbox" data-buy="any" ${buy ? 'checked' : ''}> Sold in Canada (sampled)</label>
      <div class="avail">${withOffer} of ${materials.length} materials had a product listed by a sampled Canadian shop.</div>
      <label class="sub-check"><input type="checkbox" data-buy="stock" ${buy?.inStock ? 'checked' : ''} ${buy ? '' : 'disabled'}>
        In stock when sampled</label>
      <div class="avail">${inStock} had one in stock on the sampling day. Not live stock.</div>
      <div class="eg">Each product is judged on its own listings. No listing does not mean unavailable, so such a product
        stays unknown, not failed.</div>
    </div>`);
  }

  if (group === 'Environment') {
    const cats = db.meta.environmentCategories ?? {};
    const verdict = Object.entries(cats).filter(([, v]) => v.kind === 'verdict');
    const indicator = Object.entries(cats).filter(([, v]) => v.kind === 'indicator');

    for (const [key, v] of verdict.sort((a, b) => b[1].usable - a[1].usable)) {
      const on = !!find(cs, (c) => c.kind === 'environment' && c.category === key);
      // Materials covered only by their base polymer's reference data are counted apart: shown, never passing (D64).
      const own = v.usable ? `Makers state a verdict for ${v.materials} materials` : 'No maker states a verdict';
      const polymer = v.polymerMaterials ? `<span class="caveat">${v.polymerMaterials} more have base-polymer reference data only, which never passes</span>` : '';
      out.push(`<div class="control" data-active="${on}">
        <label><input type="checkbox" data-env="${esc(key)}" ${on ? 'checked' : ''}> ${esc(envRequirement(key))}</label>
        <div class="avail">${own}.${polymer}</div>
      </div>`);
    }
    if (verdict.length) {
      const anyPolymer = verdict.some(([, v]) => v.polymerMaterials);
      out.push(`<details class="rail-more"><summary><span class="chevron" aria-hidden="true"></span>How these are judged</summary>
        <p>A product passes only on its own maker's statement, or one in the data sheet it shares with another product.
        "Resistant" passes; "limited resistance", or a limit stated in words, stays unresolved. A pass covers the agents
        its source tested, not every chemical in the class.${anyPolymer ? ` Base-polymer reference data never passes; with
        "Let estimates rule out materials" on, it excludes a material whose polymer the reference reports attacked or
        dissolved.` : ''} Each material's Environment tab gives the agents and conditions.</p>
      </details>`);
    }
    if (indicator.length) {
      out.push(`<div class="note"><strong>Not filters:</strong>
        ${indicator.map(([k, v]) => `${esc(envLabel(k).toLowerCase())} (${v.records})`).join(', ')}. These are described in
        words with no pass or fail, so they cannot filter. Each material's Environment tab shows them.</div>`);
    }
  }

  if (group === 'Evidence') {
    const g = find(cs, (c) => c.kind === 'evidence');
    const measured = new Set(db.measurements.map((m) => m.materialId));
    const unmeasured = materials.filter((m) => !measured.has(m.id)).length;
    const conflicts = db.coverage.filter((r) => r.status === 'Conflict' || r.status === 'Quarantined').length;
    out.push(`<div class="control" data-active="${!!g?.exactGrade}">
      <label><input type="checkbox" data-evidence="exactGrade" ${g?.exactGrade ? 'checked' : ''}> Require product-level measurements</label>
      <div class="avail">A number measured on the product itself, or in the data sheet it shares with another product.
        ${unmeasured} of ${materials.length} materials have no measurements at all.</div>
    </div>`);
    out.push(`<div class="control" data-active="${!!g?.noConflicts}">
      <label><input type="checkbox" data-evidence="noConflicts" ${g?.noConflicts ? 'checked' : ''}> Exclude unresolved data conflicts</label>
      <div class="avail">Excludes a product whose sources disagree or whose value is held back: ${conflicts} on file, each
        affecting only the product it names.</div>
    </div>`);
    // Which values decide (D84). Values whose source leaves the test direction or load unstated read like moulded bars
    // and flatter a printed part, so they are counted apart unless the reader admits them.
    const asPublished = db.grades.reduce((n, gr) => n + Object.values(gr.headline ?? {}).filter((v) => v.level === 'as-published').length, 0);
    const admits = ctx?.evidence === 'as-published';
    out.push(`<div class="control" data-active="${admits}">
      <label><input type="checkbox" data-evidence-level ${admits ? 'checked' : ''}> Include values with no stated orientation or load</label>
      <div class="avail">${asPublished} product values do not state the specimen orientation or the test load. Many are
        moulded bars, stiffer and stronger than a print, so by default they are shown but not judged.</div>
    </div>`);
  }

  return out.join('');
}

function wire(host, state, actions) {
  const { scenario } = state;
  host.querySelector('[data-printable]')?.addEventListener('change', (e) => {
    scenario.constraints = scenario.constraints.filter((c) => !(c.kind === 'gate' && PRINTABLE.some((p) => p.gate === c.gate)));
    if (e.target.checked) scenario.constraints.push(...PRINTABLE.map((c) => ({ ...c })));
    actions.changed();
  });
  // The master box is indeterminate while one or two of the three gates are asked; a property, not an attribute.
  const master = host.querySelector('[data-printable]');
  if (master) master.indeterminate = printCheck(scenario.constraints) === 'some';
  host.querySelectorAll('[data-anneal]').forEach((el) => el.addEventListener('click', () => {
    const on = el.dataset.anneal === 'on';
    if (scenario.anneal === on) return;
    scenario.anneal = on;
    if (!on) scenario.annealMaxC = null;
    actions.changed();
  }));
  host.querySelector('[data-anneal-max]')?.addEventListener('change', (e) => {
    const v = Number(e.target.value);
    scenario.annealMaxC = e.target.value.trim() !== '' && Number.isFinite(v) && v > 0 ? v : null;
    actions.changed();
  });
  host.querySelectorAll('[data-moisture]').forEach((el) => el.addEventListener('click', () => {
    const next = el.dataset.moisture === 'conditioned' ? 'conditioned' : 'dry';
    if ((scenario.moisture === 'conditioned' ? 'conditioned' : 'dry') === next) return;
    scenario.moisture = next;
    actions.changed();
  }));
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

  // Family, then polymer. A polymer chosen inside one family narrows that family only: the polymer requirement lists
  // the chosen polymers of the families that have some chosen, and every polymer of the families that have none (each
  // named within its family, so the two requirements together say exactly that).
  const familyBoxes = [...host.querySelectorAll('[data-family]')];
  const polymerBoxes = [...host.querySelectorAll('[data-polymer]')];
  const applyFamilies = () => {
    const families = familyBoxes.filter((b) => b.checked);
    drop((c) => c.facet === 'family' || c.facet === 'polymer');
    if (families.length) {
      scenario.constraints.push({ kind: 'facet', facet: 'family', in: families.map((b) => b.dataset.family), __group: 'Material family' });
      const chosen = (f) => polymerBoxes.filter((b) => b.checked && b.dataset.polymerFamily === f).map((b) => b.dataset.polymer);
      if (families.some((b) => chosen(b.dataset.family).length)) {
        const polymers = families.flatMap((b) => (chosen(b.dataset.family).length ? chosen(b.dataset.family) : b.dataset.polymers.split('|')));
        scenario.constraints.push({ kind: 'facet', facet: 'polymer', in: [...new Set(polymers)], __group: 'Material family' });
      }
    }
    actions.changed();
  };
  familyBoxes.forEach((el) => el.addEventListener('change', () => {
    if (!el.checked) polymerBoxes.filter((b) => b.dataset.polymerFamily === el.dataset.family).forEach((b) => { b.checked = false; });
    applyFamilies();
  }));
  polymerBoxes.forEach((el) => el.addEventListener('change', applyFamilies));

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
    const def = numericFilters().find((f) => f.key === key);
    const raw = vEl.value.trim();
    const existing = find(cs(), (c) => c.property === key);
    draftOps.set(key, opEl.value);

    // Say what is wrong and leave the entry and the applied criterion alone, rather than dropping
    // the requirement because the box could not be read.
    const problem = vEl.validity.badInput ? 'Enter a number.'
      : raw !== '' && !Number.isFinite(Number(raw)) ? 'Enter a number.'
      : raw !== '' && nonNegativeKeys().has(key) && Number(raw) < 0 ? `${prop(key).plain} cannot be negative.`
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

  host.querySelector('[data-evidence-level]')?.addEventListener('change', (e) => actions.setEvidence(e.target.checked ? 'as-published' : 'comparable'));
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
