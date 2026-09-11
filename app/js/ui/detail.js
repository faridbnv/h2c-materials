// Material detail drawer.
//
// Tabs are adaptive, not a fixed skeleton. A section with no data does not render blank and it
// does not render as zero: it renders the coverage record that explains the absence. With fracture
// toughness at zero records and compression and CTE at one each, a fixed skeleton would produce
// mostly empty pages. Showing the gap turns that into information.

import { renderValue, chip, esc, fmtNumber } from './format.js';
import { renderWhy } from './explain.js';
import { evidenceSummary } from '../engine/coverage.js';

const MECHANICAL = ['Tensile modulus', 'Tensile strength (endpoint unspecified)', 'Tensile yield strength',
  'Tensile break strength', 'Elongation at break', 'Elongation at yield', 'Flexural modulus',
  'Flexural strength', 'Charpy strength', 'Izod strength', 'Impact strength', 'Compression strength',
  'Interlayer adhesion strength', 'Hardness', 'Fatigue life'];
const THERMAL = ['HDT', 'Glass transition temperature', 'Vicat softening temperature',
  'Melting temperature', 'Crystallization temperature', 'Coefficient of thermal expansion', 'Thermal conductivity'];

const COVERAGE_FOR_TAB = {
  Mechanical: ['Mechanical', 'Sparse properties'],
  Thermal: ['Thermal', 'Sparse properties'],
  Printing: ['Print setup', 'H2C status'],
  Environment: ['Moisture / environmental', 'Post-processing / application'],
  Grades: ['Grades'],
  Price: ['Canadian price'],
  Overview: ['Identity'],
};

const gapBox = (records, what) => {
  if (records.length) {
    return records.map((r) => `<div class="gap"><strong>${esc(r.domain)} — ${esc(r.status)}.</strong> ${esc(r.finding)}</div>`).join('');
  }
  return `<div class="gap">No ${esc(what)} in the sampled sources, and no coverage record explains why.</div>`;
};

function measurementRow(m) {
  const cond = [
    m.direction !== 'not-applicable' ? m.direction : null,
    m.specimenType?.startsWith('Not published') ? 'specimen not stated' : m.specimenType,
    m.standardText && m.standardText !== 'Not applicable' ? m.standardText : null,
    m.moisture && m.moisture !== 'Not published' ? m.moisture : null,
    m.notch === 'Notched' || m.notch === 'Unnotched' ? m.notch : null,
  ].filter(Boolean).join(' · ');
  const v = m.numeric
    ? `${fmtNumber(m.value)}${m.uncertainty ? ' ± ' + fmtNumber(m.uncertainty) : ''} ${esc(m.unit)}`
    : `<span class="missing">${esc(m.dataStatus)}</span>`;
  const op = m.operator === '>' || m.operator === '<' ? esc(m.operator) + ' ' : '';
  return `<div class="evidence-row">
    <div><strong>${esc(m.property)}</strong> — ${op}${v}
      ${m.corrected ? '<span class="chip chip-neutral" style="font-size:10px">transcription corrected</span>' : ''}
      ${m.quarantined ? '<span class="chip chip-FAIL" style="font-size:10px">quarantined</span>' : ''}</div>
    <div class="cond">${esc(cond)}</div>
    <div class="cond">${esc(m.id)} · ${esc(m.gradeId)} · ${esc(m.sourceId)}${m.locator ? ' · ' + esc(m.locator) : ''}</div>
  </div>`;
}

/**
 * Related measurements shown under a missing headline. Never the headline, never used by a
 * constraint, and always carrying the reason it was not promoted.
 */
function relatedBlock(h) {
  const r = h && !h.known && h.related;
  if (!r) return '';
  return `<div class="related-list">
    <div class="related-head">${r.count} measurement${r.count === 1 ? '' : 's'} of this property on record across ${r.grades} grade${r.grades === 1 ? '' : 's'}, none promoted to the headline</div>
    ${r.items.map((i) => `<div class="related-item">
      <span class="rv">${fmtNumber(i.value)} ${esc(i.unit)}</span>
      <span>${esc(i.property)}</span>
      <span class="why">${esc(i.why)}</span>
      <span class="cond">${esc(i.measurementId)} \u00b7 ${esc(i.gradeId)}</span>
    </div>`).join('')}
  </div>`;
}

export function renderDrawer(host, state, actions) {
  const { db, selectedMaterialId, drawerTab, selection, ctx } = state;
  const m = db.materials.find((x) => x.id === selectedMaterialId);
  if (!m) { host.innerHTML = ''; return; }

  const ms = ctx.measurementsByMaterial.get(m.id) ?? [];
  const ev = ctx.evidenceByMaterial.get(m.id) ?? [];
  const cov = ctx.coverageByMaterial.get(m.id) ?? [];
  const profiles = db.profiles.filter((p) => p.materialId === m.id);
  const grades = db.grades.filter((g) => g.materialId === m.id);
  const prices = db.prices.filter((p) => p.materialId === m.id);
  const evaluation = selection.evaluations.find((e) => e.materialId === m.id);
  const summary = evidenceSummary(m, db);

  const counts = {
    Overview: null,
    Mechanical: ms.filter((x) => MECHANICAL.includes(x.property)).length,
    Thermal: ms.filter((x) => THERMAL.includes(x.property)).length,
    Printing: profiles.length,
    Environment: ev.filter((e) => e.filterable).length,
    Grades: grades.length,
    Price: prices.length,
    Evidence: ms.length,
    Coverage: cov.length,
  };
  const tab = drawerTab in counts ? drawerTab : 'Overview';

  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)} detail">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(m.name)}</h2>
          <div class="sub">${esc(m.fullName ?? '')}</div>
          <div class="sub" style="margin-top:5px">
            ${esc(m.family)} · ${esc(m.modifier)} · H2C: ${esc(m.h2cStatus)}
            ${m.excluded ? ' ' + chip('FAIL', 'Excluded from H2C scope') : ''}
          </div>
        </div>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-tabs" role="tablist">
      ${Object.entries(counts).map(([k, n]) => `
        <button role="tab" data-tab="${k}" aria-selected="${k === tab}" data-empty="${n === 0}">
          ${k}${n === null ? '' : `<span class="n">${n}</span>`}</button>`).join('')}
    </div>
    <div class="drawer-body">${tabBody(tab, { m, ms, ev, cov, profiles, grades, prices, evaluation, summary, db })}</div>
  </div>`;

  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tab)));
  host.querySelectorAll('[data-measurement]').forEach((d) => d.addEventListener('click', () => actions.openMeasurement(d.dataset.measurement)));
}

function tabBody(tab, c) {
  const { m, ms, ev, cov, profiles, grades, prices, evaluation, summary, db } = c;
  const covFor = (t) => cov.filter((r) => (COVERAGE_FOR_TAB[t] ?? []).includes(r.domain));

  if (tab === 'Overview') {
    return `
      <h3 class="sec">Headline properties</h3>
      <dl class="kv">
        ${[['Density', 'density'], ['Tensile modulus XY', 'tensileModulusXY'], ['Tensile strength XY', 'tensileStrengthXY'],
           ['Elongation at break XY', 'elongationXY'], ['HDT at 0.45 MPa', 'hdt045'], ['Price', 'priceCADkg']]
          .map(([label, k]) => `<dt>${label}</dt><dd>${renderValue(m.headline[k], { showUnit: true })}
            ${m.headline[k]?.caveatText ? `<br><span class="missing">${esc(m.headline[k].caveatText)}</span>` : ''}
            ${relatedBlock(m.headline[k])}</dd>`).join('')}
      </dl>
      <div class="note">${esc(m.headlineBasis ?? '')}</div>

      <h3 class="sec">Against your constraints</h3>
      ${evaluation ? renderWhy(evaluation) : '<p class="missing">No constraints set.</p>'}

      <h3 class="sec">Evidence coverage</h3>
      <dl class="kv">
        <dt>Measurements</dt><dd>${summary.numericMeasurements} numeric of ${summary.measurements}${summary.quarantined ? `, ${summary.quarantined} quarantined` : ''}</dd>
        <dt>Grades on record</dt><dd>${summary.grades || '<span class="missing">None</span>'}</dd>
        <dt>Exact-grade evidence</dt><dd>${summary.exactGradeEvidence ? 'Yes' : '<span class="missing">No</span>'}</dd>
        <dt>Coverage gaps</dt><dd>${summary.gaps}</dd>
        <dt>Unresolved conflicts</dt><dd>${summary.conflicts}</dd>
        <dt>Limited comparability</dt><dd>${summary.limitedComparability}</dd>
      </dl>

      <h3 class="sec">Best uses and limitations</h3>
      <dl class="kv">
        <dt>Best uses</dt><dd>${m.bestUses === 'Not published' ? '<span class="missing">Not published</span>' : esc(m.bestUses ?? '')}</dd>
        <dt>Limitations</dt><dd>${esc(m.limitations ?? '')}</dd>
        <dt>Impact</dt><dd>${esc(m.impactNote ?? '')}</dd>
        <dt>Fatigue and creep</dt><dd>${esc(m.fatigueCreep ?? '')}</dd>
      </dl>`;
  }

  if (tab === 'Mechanical' || tab === 'Thermal') {
    const list = tab === 'Mechanical' ? MECHANICAL : THERMAL;
    const rows = ms.filter((x) => list.includes(x.property));
    const present = new Set(rows.map((r) => r.property));
    const absent = list.filter((p) => !present.has(p));
    return `
      ${rows.length ? rows.map(measurementRow).join('') : gapBox(covFor(tab), `${tab.toLowerCase()} measurements`)}
      ${absent.length ? `<h3 class="sec">Not measured for this material</h3>
        <div class="gap">${absent.map(esc).join(' · ')}<br><br>
        Absent from the sampled sources. Not zero, and not a low value.</div>` : ''}
      ${rows.length ? `<h3 class="sec">Coverage</h3>${gapBox(covFor(tab), 'record')}` : ''}`;
  }

  if (tab === 'Printing') {
    if (!profiles.length) return gapBox(covFor('Printing'), 'print profile');
    return profiles.map((p) => `
      <h3 class="sec">${esc(p.id)} · ${esc(p.profile ?? '')}</h3>
      <dl class="kv">
        <dt>Nozzle</dt><dd>${esc(p.nozzle.text)} ${gateChip(p.gates.nozzle)}</dd>
        <dt>Bed</dt><dd>${esc(p.bed.text)} ${gateChip(p.gates.bed)}</dd>
        <dt>Chamber</dt><dd>${esc(p.chamber.text)} ${gateChip(p.gates.chamber)}
          ${p.chamber.strippedTail ? `<br><span class="missing" style="font-size:11px">Trailing text not read as a chamber requirement: ${esc(p.chamber.strippedTail)}</span>` : ''}</dd>
        <dt>Nozzle material</dt><dd>${esc(p.nozzleMaterial ?? '')}</dd>
        <dt>Nozzle diameter</dt><dd>${esc(p.nozzleDiameter.text)}</dd>
        <dt>Abrasion</dt><dd>${esc(p.abrasion.text)}</dd>
        <dt>Drying</dt><dd>${esc(p.drying.text)}</dd>
        <dt>Enclosure</dt><dd>${esc(p.enclosure ?? '')}</dd>
        <dt>Plate</dt><dd>${esc(p.plate ?? '')}</dd>
        <dt>Support pairing</dt><dd>${esc(p.supportPairing ?? '')}</dd>
        <dt>Failure modes</dt><dd>${esc(p.failureModes ?? '')}</dd>
      </dl>
      <h3 class="sec">H2C routing and AMS — evidence, not a filter</h3>
      <div class="note">These fields read "verify exact grade" on most profiles, so the selector does
        not filter on them. They are reproduced here exactly as recorded.</div>
      <dl class="kv" style="margin-top:10px">
        <dt>H2C left</dt><dd>${esc(p.routing.left ?? '')}</dd>
        <dt>H2C right</dt><dd>${esc(p.routing.right ?? '')}</dd>
        <dt>AMS 2 Pro</dt><dd>${esc(p.routing.ams2Pro ?? '')}</dd>
        <dt>AMS HT</dt><dd>${esc(p.routing.amsHT ?? '')}</dd>
        <dt>AMS published</dt><dd>${esc(p.routing.amsPublished ?? '')}</dd>
        <dt>Source</dt><dd>${esc(p.sourceId ?? '')} · ${esc(p.h2cSourceId ?? '')}</dd>
      </dl>`).join('');
  }

  if (tab === 'Environment') {
    const byCat = {};
    for (const e of ev) (byCat[e.categoryLabel ?? 'Other'] ||= []).push(e);
    if (!ev.length) return gapBox(covFor('Environment'), 'environment evidence');
    return Object.entries(byCat).map(([label, list]) => `
      <h3 class="sec">${esc(label)}${list[0]?.filterable ? '' : ' — not used for filtering'}</h3>
      ${list.map((e) => `<div class="evidence-row">
        <div><strong>${esc(e.topic)}</strong>${e.agent ? ` · ${esc(e.agent)}` : ''}${e.strength && e.strength !== 'unspecified' ? ` · ${esc(e.strength)}` : ''}</div>
        <div>${esc(e.finding)}</div>
        <div class="cond">${esc(e.evidenceType)} · ${esc(e.sourceId)}${e.exposure ? ' · ' + esc(e.exposure) : ''}</div>
      </div>`).join('')}`).join('');
  }

  if (tab === 'Grades') {
    if (!grades.length) return gapBox(covFor('Grades'), 'commercial grade');
    return grades.map((g) => `
      <h3 class="sec">${esc(g.id)}</h3>
      <dl class="kv">
        <dt>Manufacturer</dt><dd>${esc(g.manufacturer ?? '')}</dd>
        <dt>Product</dt><dd>${esc(g.product ?? '')}</dd>
        <dt>Composition</dt><dd>${esc(g.composition ?? '')}</dd>
        <dt>Availability</dt><dd>${esc(g.availability ?? '')}</dd>
        <dt>Certifications</dt><dd>${esc(g.certifications ?? '')}</dd>
        <dt>Colour caveat</dt><dd>${esc(g.colourCaveat ?? '')}</dd>
        <dt>Why this grade</dt><dd>${esc(g.rationale ?? '')}</dd>
        <dt>Source</dt><dd>${esc(g.sourceId ?? '')}</dd>
      </dl>`).join('');
  }

  if (tab === 'Price') {
    if (!prices.length) return gapBox(covFor('Price'), 'Canadian price observation');
    return `<div class="note">Headline is the median of observations flagged for the headline sample.
      Snapshot 2026-09-10; prices are not live.</div>
      <table class="grid" style="margin-top:10px"><thead><tr>
      <th>ID</th><th>Retailer</th><th>Variant</th><th>kg</th><th>CAD/kg</th><th>Stock</th><th>In sample</th></tr></thead>
      <tbody>${prices.map((p) => `<tr>
        <td>${esc(p.id)}</td><td>${esc(p.retailer)}</td><td>${esc(p.variant ?? '')}</td>
        <td class="num">${fmtNumber(p.netMassKg)}</td>
        <td class="num">${p.regularPerKg === null ? '<span class="missing">n/a</span>' : fmtNumber(p.regularPerKg)}</td>
        <td>${esc(p.stock)}</td><td>${p.headlineSample ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>`;
  }

  if (tab === 'Evidence') {
    if (!ms.length) return gapBox(cov, 'measurement');
    const bySource = {};
    for (const x of ms) (bySource[x.sourceId] ||= []).push(x);
    return Object.entries(bySource).map(([sid, list]) => {
      const s = db.sources.find((x) => x.id === sid);
      return `<h3 class="sec">${esc(sid)}</h3>
        <dl class="kv">
          <dt>Publisher</dt><dd>${esc(s?.publisher ?? '')}</dd>
          <dt>Title</dt><dd>${esc(s?.title ?? '')}</dd>
          <dt>Class</dt><dd>${esc(s?.sourceClass ?? '')}</dd>
          <dt>Accessed</dt><dd>${esc(s?.accessDate ?? '')}</dd>
          ${s?.url ? `<dt>URL</dt><dd style="word-break:break-all;font-size:11px">${esc(s.url)}</dd>` : ''}
        </dl>
        ${list.map(measurementRow).join('')}`;
    }).join('');
  }

  if (tab === 'Coverage') {
    if (!cov.length) return `<div class="gap">No coverage records for this material.</div>`;
    return cov.map((r) => `<div class="evidence-row">
      <div><strong>${esc(r.domain)}</strong> — ${chip(statusToState(r.status), r.status)}</div>
      <div>${esc(r.finding)}</div>
      <div class="cond">${esc(r.id)}</div>
    </div>`).join('');
  }
  return '';
}

const statusToState = (s) =>
  s === 'Evidence recorded' || s === 'Resolved' ? 'PASS'
  : s === 'Gap' ? 'UNKNOWN'
  : s === 'Conflict' || s === 'Quarantined' ? 'FAIL' : 'INDETERMINATE';

const gateChip = (g) => {
  if (!g) return '';
  const map = { within: 'PASS', exceeds: 'FAIL', 'exceeds-recommended': 'INDETERMINATE', unknown: 'UNKNOWN' };
  return `<span class="chip chip-${map[g.verdict]}" style="font-size:10px" title="${esc(g.reason)}">${esc(g.verdict)}</span>`;
};
