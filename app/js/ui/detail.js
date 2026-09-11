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

/** A plain sentence about what the material is, instead of three coded fields. */
function describeFacets(m) {
  const bits = [];
  const fill = {
    'carbon-fibre': 'Carbon-fibre reinforced', 'glass-fibre': 'Glass-fibre reinforced',
    'esd': 'Static-dissipative', 'foaming': 'Foaming, for lightweight parts',
    'unfilled': 'Unfilled', 'undisclosed': 'A commercial variant whose filler is not disclosed',
  }[m.facets.reinforcement.value];
  if (fill) bits.push(fill);
  if (m.facets.supportMaterial.value) bits.push('a support or interface material rather than a structural one');
  if (m.facets.flexible.value) bits.push('a flexible elastomer');
  return bits.length ? bits.join(', ') + '.' : '';
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
    const HEAD = [
      ['Density', 'density', 'how heavy a printed part will be'],
      ['Stiffness', 'tensileModulusXY', 'resistance to bending and stretching'],
      ['Strength', 'tensileStrengthXY', 'load it takes before failing'],
      ['Stretch before breaking', 'elongationXY', 'high means tough, low means brittle'],
      ['Heat resistance', 'hdt045', 'temperature where it starts to soften under load'],
      ['Price', 'priceCADkg', 'sampled Canadian retail'],
    ];

    const gateLine = (g, label) => {
      if (!g) return '';
      const word = { within: 'Yes', exceeds: 'No', 'exceeds-recommended': 'Yes, with a caveat', unknown: 'Not published' }[g.verdict];
      const cls = { within: 'PASS', exceeds: 'FAIL', 'exceeds-recommended': 'INDETERMINATE', unknown: 'UNKNOWN' }[g.verdict];
      return `<div class="fact"><span class="chip chip-${cls}">${esc(word)}</span>
        <div><b>${esc(label)}</b><br><span class="fact-why">${esc(g.reason)}</span></div></div>`;
    };

    const printable = m.excluded
      ? `<div class="callout bad"><b>Outside the printer's envelope.</b> This material is in the
          database for completeness but is not treated as H2C-printable.</div>`
      : '';

    return `
      ${printable}
      <p class="lede">${esc(m.fullName ?? m.name)}. ${esc(describeFacets(m))}
        ${m.h2cStatus === 'Official Bambu product' ? 'Sold by Bambu for this printer.'
          : m.h2cStatus === 'Officially listed family' ? 'Bambu lists this family, but not necessarily every brand of it.'
          : m.h2cStatus === 'Conditional' ? 'Usable with conditions; check the Printing tab.'
          : 'Included on the strength of its processing requirements, not on any Bambu validation.'}</p>

      <h3 class="sec">Key numbers</h3>
      <div class="facts">
        ${HEAD.map(([label, k, hint]) => {
          const h = m.headline[k];
          return `<div class="fact-card${h?.known ? '' : ' empty'}">
            <div class="fact-label">${esc(label)}</div>
            <div class="fact-value">${renderValue(h, { showUnit: true })}</div>
            <div class="fact-hint">${esc(hint)}</div>
            ${h?.caveatText ? `<div class="fact-warn">${esc(h.caveatText)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <p class="fine">${esc((m.headlineBasis ?? '').replace(/[.\s]*$/, ''))}. Click any number to see the measurement behind it.</p>

      <h3 class="sec">Can the H2C print it?</h3>
      <div class="facts-list">
        ${gateLine(m.gates.nozzle, 'Nozzle temperature')}
        ${gateLine(m.gates.bed, 'Bed temperature')}
        ${gateLine(m.gates.chamber, 'Chamber temperature')}
        <div class="fact"><span class="chip chip-${m.gates.abrasive === 'requires-hardened' ? 'INDETERMINATE' : m.gates.abrasive === 'no-special-concern' ? 'PASS' : 'UNKNOWN'}">
          ${m.gates.abrasive === 'requires-hardened' ? 'Hardened nozzle' : m.gates.abrasive === 'no-special-concern' ? 'Any nozzle' : 'Not published'}</span>
          <div><b>Nozzle wear</b><br><span class="fact-why">${m.gates.abrasive === 'requires-hardened'
            ? 'Abrasive. A brass nozzle will wear out.' : m.gates.abrasive === 'no-special-concern'
            ? 'The source states no special nozzle concern.' : 'No abrasion guidance in the sampled sources.'}</span></div></div>
        <div class="fact"><span class="chip chip-${m.gates.drying === 'required' ? 'INDETERMINATE' : 'UNKNOWN'}">
          ${m.gates.drying === 'required' ? 'Dry it first' : 'Not published'}</span>
          <div><b>Drying</b><br><span class="fact-why">${m.gates.drying === 'required'
            ? 'A drying schedule is published; see the Printing tab.' : 'No drying schedule in the sampled sources.'}</span></div></div>
      </div>
      <div class="note">Routing between the H2C's two sides, and AMS feeding, are recorded per grade
        and almost always say "verify the exact grade". They are in the Printing tab rather than
        summarised here, because summarising them would overstate what is known.</div>

      ${m.bestUses && m.bestUses !== 'Not published' ? `<h3 class="sec">Good for</h3><p>${esc(m.bestUses)}</p>` : ''}
      ${m.limitations ? `<h3 class="sec">Watch out for</h3><p>${esc(m.limitations)}</p>` : ''}

      <h3 class="sec">How well documented is it?</h3>
      <div class="facts">
        <div class="fact-card"><div class="fact-label">Measurements</div>
          <div class="fact-value">${summary.numericMeasurements}</div>
          <div class="fact-hint">${summary.quarantined ? `${summary.quarantined} quarantined` : 'numeric, each with a source'}</div></div>
        <div class="fact-card"><div class="fact-label">Grades on record</div>
          <div class="fact-value">${summary.grades || '\u2014'}</div>
          <div class="fact-hint">${summary.exactGradeEvidence ? 'grade-specific evidence exists' : 'no grade-specific evidence'}</div></div>
        <div class="fact-card${summary.gaps ? ' warn' : ''}"><div class="fact-label">Known gaps</div>
          <div class="fact-value">${summary.gaps}</div>
          <div class="fact-hint">recorded as missing</div></div>
        <div class="fact-card${summary.conflicts ? ' warn' : ''}"><div class="fact-label">Unresolved conflicts</div>
          <div class="fact-value">${summary.conflicts}</div>
          <div class="fact-hint">sources disagree</div></div>
      </div>

      ${evaluation && evaluation.results.length ? `<h3 class="sec">Against your requirements</h3>${renderWhy(evaluation)}` : ''}`;
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
