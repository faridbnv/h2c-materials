// Material detail drawer.
//
// Tabs are adaptive, not a fixed skeleton. A section with no data does not render blank and it
// does not render as zero: it renders the coverage record that explains the absence. With fracture
// toughness at zero records and compression and CTE at one each, a fixed skeleton would produce
// mostly empty pages. Showing the gap turns that into information.

import { renderValue, chip, esc, fmtNumber, wireEvidence } from './format.js';
import { renderWhy } from './explain.js';
import { materialName, gateVerdict, CHAMBER_GUIDANCE, ESTIMATE_STRENGTH, ESTIMATE_PRECISION } from './labels.js';
import { REGISTRY, propertiesInDomain, propertyApplies } from './registry.js';
import { evidenceSummary } from '../engine/coverage.js';

/** A temperature window, or nothing if none was published. A zero floor is the build's "ambient". */
const range = (r) => (!r ? null
  : r.min === r.max ? `${fmtNumber(r.max)} °C`
  : r.min === 0 ? `up to ${fmtNumber(r.max)} °C`
  : `${fmtNumber(r.min)}–${fmtNumber(r.max)} °C`);

const stated = (v) => v && !/^(not published|not applicable|not stated|n\/a)\b/i.test(String(v).trim());

/** A source URL as something you can open, with the reminder that it needs a connection. */
const sourceLink = (url) => /^https?:\/\//i.test(url ?? '')
  ? `<a href="${esc(url)}" target="_blank" rel="noopener" title="Opens the original source in a new tab. Needs an internet connection.">${esc(url)}</a>`
  : esc(url ?? '');

// The Mechanical and Thermal tabs list the registry's properties in those domains (properties.csv),
// the same classification coverage uses. A property that applies only to some materials is listed
// only for them, so a PLA is never told it has "not measured" an elastomer's Shore hardness.
const tabProperties = (tab, m) => propertiesInDomain(tab === 'Mechanical' ? 'mechanical' : 'thermal').filter((p) => propertyApplies(p, m));

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

function measurementRow(m, highlight) {
  const cond = [
    m.direction !== 'not-applicable' ? m.direction : null,
    m.specimenType?.startsWith('Not published') ? 'specimen not stated' : m.specimenType,
    m.standardText && m.standardText !== 'Not applicable' ? m.standardText : null,
    m.moisture && m.moisture !== 'Not published' ? m.moisture : null,
    m.notch === 'Notched' || m.notch === 'Unnotched' ? m.notch : null,
  ].filter(Boolean).join(' · ');
  // The conditions that decide whether a number applies to your part: annealed or as printed, at
  // what temperature, printed how. They were in the database and missing from the evidence view.
  const more = [
    ['Post-processing', m.postProcessing], ['Test temperature', m.testTemperature],
    ['Print parameters', m.printParameters], ['Notes', m.notes],
  ].filter(([, v]) => stated(v));
  // A qualitative result ("No break") is what the source said, so it is shown in its own words.
  const v = m.numeric
    ? `${fmtNumber(m.value)}${m.uncertainty ? ' ± ' + fmtNumber(m.uncertainty) : ''} ${esc(m.unit)}`
    : m.qualitative && m.raw?.value
      ? `${esc(m.raw.value)} <span class="missing">(stated in words, not a number)</span>`
      : `<span class="missing">${esc(m.dataStatus)}</span>`;
  const op = m.operator === '>' || m.operator === '<' ? esc(m.operator) + ' ' : '';
  return `<div class="evidence-row${highlight === m.id ? ' target' : ''}" data-mid="${esc(m.id)}">
    <div><strong>${esc(m.property)}</strong> — ${op}${v}
      ${m.corrected ? '<span class="chip chip-neutral" style="font-size:10px">transcription corrected</span>' : ''}
      ${m.quarantined ? '<span class="chip chip-FAIL" style="font-size:10px">quarantined</span>' : ''}</div>
    <div class="cond">${esc(cond)}</div>
    ${more.length ? `<dl class="kv small cond-more">${more.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
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

/** The full estimate record: both ranges, what it rests on, and every measurement behind it, converted. */
function estimateBlock(h, label) {
  if (h && !h.known && h.notApplicable) {
    return `<div class="est-card na-card"><h4>${esc(label)}: not applicable</h4>
      <div class="est-basis">${esc(h.notApplicable.reason)}</div></div>`;
  }
  const e = h && !h.known && h.estimate;
  if (!e) return '';
  const s = ESTIMATE_STRENGTH[e.strength];
  const pct = (p) => `${Math.round(p * 100)}%`;
  const item = (i) => `${esc(i.property)} ${fmtNumber(i.value)} ${esc(i.unit)}${i.direction && !['not-applicable', 'unknown'].includes(i.direction) ? ` (${esc(i.direction)})` : ''}`
    + `${i.measurementId ? ` <span style="font-family:var(--mono)">${esc(i.measurementId)}</span>` : ''}${i.from ? `, ${esc(i.from)}` : ''}`;
  const evidence = e.evidence.length
    ? `<ul class="est-evidence">${e.evidence.map((ev) => `<li>${ev.items.map(item).join('; ')}
        ${ev.sameGrade ? '<span class="tag">this grade</span>' : `<span class="tag">grade ${esc(ev.gradeId)}</span>`}
        \u2192 about ${fmtNumber(ev.converted)} ${esc(e.unit)} as this headline. <span class="fine">${esc(ev.conversion)}.</span>
        ${ev.conflict ? '<b>Contradicts the rest of the evidence and is down-weighted.</b>' : ''}</li>`).join('')}</ul>`
    : '';
  const bounds = e.bounds?.length ? ` Limited by ${e.bounds.map((b) => esc(b.why)).join('; ')}.` : '';
  return `<div class="est-card">
    <h4>${esc(label)}: estimated ${esc(s.short)}</h4>
    <div class="est-span">${fmtNumber(e.lo)} \u2013 ${fmtNumber(e.hi)} ${esc(e.unit)} <span class="fine">likely (${pct(e.levels.likely)}), centred on ${fmtNumber(e.centre)}</span></div>
    <div class="est-basis">Plausibly ${fmtNumber(e.plausible.lo)} \u2013 ${fmtNumber(e.plausible.hi)} ${esc(e.unit)} (${pct(e.levels.plausible)}). Precision: <b>${esc(e.precision)}</b>, ${esc(ESTIMATE_PRECISION[e.precision])}.
      ${esc(s.title)}${e.strength !== 'family' ? `; this material's own evidence carries about ${pct(e.ownShare)} of the estimate` : ''}. Family: ${esc(e.family)}.${bounds}
      ${e.sharedWith ? `Its representative product is also recorded under ${esc(e.sharedWith.name)}, so both show the same estimate.` : ''}
      The ranges are calibrated: when each measured value in the database is hidden and predicted from the rest, ranges like these contain it that often.
      It is never enough to pass a requirement. ${e.canScreen
        ? 'With "Include uncertain" and Estimates on, it screens this material out of a requirement its plausible range wholly fails, unless one of the material\'s own measurements could meet it.'
        : `It cannot screen this material out: ${esc(e.screenLimit)}.`}</div>
    ${evidence}
  </div>`;
}

/** An estimated nozzle or bed window, where nothing is published. It decides nothing. */
function windowEstimate(est, what) {
  if (!est) return '';
  return `<div class="est-card"><h4>${esc(what)}: estimated, not published</h4>
    <div class="est-span">${fmtNumber(est.lo)} \u2013 ${fmtNumber(est.hi)} ${esc(est.unit)}</div>
    <div class="est-basis">No source publishes this window for the material: ${esc(est.basis)} (${est.peers.map((p) => `${esc(p.name)} ${fmtNumber(p.min)}\u2013${fmtNumber(p.max)}`).join(', ')}).
      A starting point to verify, not a print setting, and it changes no result.</div></div>`;
}

/** A family entry has no product and no values: the drawer says what it is and links its members. */
function renderFamilyEntry(host, m, actions) {
  const f = m.familyEntry;
  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)}">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(m.name)}</h2>
          <div class="sub">${esc(m.fullName ?? '')}</div>
          <div class="sub" style="margin-top:5px">${f.kind === 'alias' ? 'An alias' : 'A family entry'} · H2C: ${esc(m.h2cStatus)}</div>
        </div>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-body">
      <p class="lede">${f.kind === 'alias'
        ? `${esc(m.name)} is another name for the material below. It has no product or values of its own.`
        : `${esc(m.name)} is a family, not one material. It has no product or values of its own, and it is never a candidate: each product is recorded once, under the material it is.`}</p>
      <div class="facts-list">${f.members.map((x) => `<div class="fact"><button class="btn btn-sm" data-open-member="${esc(x.id)}">${esc(x.name)}</button></div>`).join('')}</div>
      <p class="fine">${esc(f.why)}</p>
    </div>
  </div>`;
  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelectorAll('[data-open-member]').forEach((b) => b.addEventListener('click', () => actions.openMaterial(b.dataset.openMember)));
}

export function renderDrawer(host, state, actions) {
  const { db, selectedMaterialId, drawerTab, selection, ctx } = state;
  const m = db.materials.find((x) => x.id === selectedMaterialId);
  if (!m) { host.innerHTML = ''; return; }
  if (m.familyEntry) return renderFamilyEntry(host, m, actions);

  const ms = ctx.measurementsByMaterial.get(m.id) ?? [];
  const ev = ctx.evidenceByMaterial.get(m.id) ?? [];
  const cov = ctx.coverageByMaterial.get(m.id) ?? [];
  const profiles = db.profiles.filter((p) => p.materialId === m.id && !p.retired);
  const grades = db.grades.filter((g) => g.materialId === m.id && !g.retired);
  const prices = db.prices.filter((p) => p.materialId === m.id && !p.retired);
  const evaluation = selection.evaluations.find((e) => e.materialId === m.id);
  const summary = evidenceSummary(m, db);

  const counts = {
    Overview: null,
    Mechanical: ms.filter((x) => tabProperties('Mechanical', m).includes(x.property)).length,
    Thermal: ms.filter((x) => tabProperties('Thermal', m).includes(x.property)).length,
    Printing: profiles.length,
    Environment: ev.filter((e) => e.filterable).length,
    Grades: grades.length,
    Price: prices.length,
    Evidence: ms.length,
    Coverage: cov.length,
  };
  const tab = drawerTab in counts ? drawerTab : 'Overview';
  const pinned = state.scenario.shortlist.includes(m.id);

  host.innerHTML = `
  <div class="drawer" role="dialog" aria-label="${esc(m.name)} detail">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>${esc(materialName(m.name).primary)}</h2>
          ${materialName(m.name).aka ? `<div class="sub">also called ${esc(materialName(m.name).aka)}</div>` : ''}
          <div class="sub">${esc(m.fullName ?? '')}</div>
          <div class="sub" style="margin-top:5px">
            ${esc(m.family)} · ${esc(m.modifier)} · H2C: ${esc(m.h2cStatus)}
            ${m.excluded ? ' ' + chip('FAIL', 'Excluded from H2C scope') : ''}
          </div>
        </div>
        <button class="btn btn-sm" id="drawer-pin" aria-pressed="${pinned}">${pinned ? '★ On the shortlist' : '☆ Add to shortlist'}</button>
        <button class="icon-btn" id="drawer-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="drawer-tabs" role="tablist">
      ${Object.entries(counts).map(([k, n]) => `
        <button role="tab" data-tab="${k}" aria-selected="${k === tab}" data-empty="${n === 0}">
          ${k}${n === null ? '' : `<span class="n">${n}</span>`}</button>`).join('')}
    </div>
    <div class="drawer-body">${tabBody(tab, { m, ms, ev, cov, profiles, grades, prices, evaluation, summary, db, highlight: state.highlightMeasurement })}</div>
  </div>`;

  // Opening the tab was never enough. PA6-CF has 21 measurements grouped by source, so "one click
  // to the evidence" was one click plus a hunt. Take the reader to the row and mark it.
  const target = state.highlightMeasurement && host.querySelector(`[data-mid="${CSS.escape(state.highlightMeasurement)}"]`);
  if (target) {
    requestAnimationFrame(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }

  host.querySelector('#drawer-close').addEventListener('click', actions.closeDrawer);
  host.querySelector('#drawer-pin').addEventListener('click', () => actions.togglePin(m.id));
  host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => actions.setDrawerTab(b.dataset.tab)));
  wireEvidence(host, actions);
}

function tabBody(tab, c) {
  const { m, ms, ev, cov, profiles, grades, prices, evaluation, summary, db, highlight } = c;
  const covFor = (t) => cov.filter((r) => (COVERAGE_FOR_TAB[t] ?? []).includes(r.domain));

  if (tab === 'Overview') {
    // Every headline, labelled and explained exactly as the filter rail and the table label it.
    const HEAD = REGISTRY.headlines.map((h) => [h.labels.plain, h.key, h.labels.hint]);

    // The section that answers "can I print this" now also answers "what do I set it to". The
    // numbers were one tab away, which is one tab too many for the first question anyone asks.
    const gateLine = (g, label, window, extra = '') => {
      if (!g) return '';
      const { state, word } = gateVerdict(g.verdict);
      return `<div class="fact"><span class="chip chip-${state}">${esc(word)}</span>
        <div><b>${esc(label)}</b>${window ? ` <span class="set-to" title="Across the recorded profiles. The Printing tab has each one.">recorded ${esc(window)}</span>` : ''}
          <br><span class="fact-why">${esc(g.reason)}</span>${extra}</div></div>`;
    };
    // The chamber can be answered three ways: a temperature, a statement in words, or neither. An
    // estimated band is shown only in the third and second cases, and never changes the verdict.
    const guidance = m.print?.chamberGuidance;
    const est = m.print?.chamberEstimate;
    const chamberExtra = `${!m.print?.chamberC && guidance
        ? `<br><span class="fact-why">In words: ${esc(CHAMBER_GUIDANCE[guidance.state]?.title ?? guidance.label)}</span>` : ''}${est
        ? `<div class="est-card"><h4>Chamber: estimated, not published</h4>
            <div class="est-span">${fmtNumber(est.lo)} \u2013 ${fmtNumber(est.hi)} ${esc(est.unit)}</div>
            <div class="est-basis">No source publishes a chamber temperature for this material. The 2026-09-13
              research places it in this band, based on ${esc(est.basis)}. It is not a print setting, and it
              changes no result: a band can neither clear nor fail the chamber question.${est.caution ? ` ${esc(est.caution)}` : ''}</div>
          </div>` : ''}`;

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
            <div class="fact-value">${renderValue(h, { showUnit: true, estimates: true })}</div>
            <div class="fact-hint">${esc(hint)}</div>
            ${h?.caveatText ? `<div class="fact-warn">${esc(h.caveatText)}</div>` : ''}
            ${!h?.known && h?.estimate ? `<div class="fact-warn">estimated ${esc(ESTIMATE_STRENGTH[h.estimate.strength].short)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <p class="fine">${esc((m.headlineBasis ?? '').replace(/[.\s]*$/, ''))}. Click any number to see the measurement behind it.</p>
      ${HEAD.map(([label, k]) => estimateBlock(m.headline[k], label)).join('')}

      <h3 class="sec">Can the H2C print it?</h3>
      <div class="facts-list">
        ${gateLine(m.gates.nozzle, 'Nozzle temperature', range(m.print?.nozzleC), windowEstimate(m.print?.nozzleEstimate, 'Nozzle'))}
        ${gateLine(m.gates.bed, 'Bed temperature', range(m.print?.bedC), windowEstimate(m.print?.bedEstimate, 'Bed'))}
        ${gateLine(m.gates.chamber, 'Chamber temperature', range(m.print?.chamberC), chamberExtra)}
        <div class="fact">
          ${m.gates.abrasive === 'requires-hardened'
            // A requirement is not an ambiguity. The half-filled marker meant "we are not sure"
            // while the sentence next to it meant "you need one".
            ? '<span class="chip chip-need">Required</span>'
            : m.gates.abrasive === 'no-special-concern' ? '<span class="chip chip-PASS">Any nozzle</span>'
            : '<span class="chip chip-UNKNOWN">Not recorded</span>'}
          <div><b>Hardened nozzle</b><br><span class="fact-why">${m.gates.abrasive === 'requires-hardened'
            ? 'Abrasive. A brass nozzle will wear out.' : m.gates.abrasive === 'no-special-concern'
            ? 'The source states no special nozzle concern.' : 'No abrasion guidance in the sampled sources.'}</span></div></div>
        <div class="fact">
          ${m.gates.drying === 'required'
            ? '<span class="chip chip-neutral">Guidance published</span>'
            : '<span class="chip chip-UNKNOWN">Not recorded</span>'}
          <div><b>Drying before printing</b><br><span class="fact-why">${m.gates.drying === 'required'
            ? 'A source gives a drying schedule; see the Printing tab for its wording and whether it is a requirement or a recommendation.'
            : 'No drying guidance in the sampled sources. That is not the same as not needing it.'}</span></div></div>
        <div class="fact">
          <span class="chip chip-UNKNOWN">Not established</span>
          <div><b>Can it run through the AMS?</b><br><span class="fact-why">Bambu has not published
            AMS compatibility for this material. ${profiles.length
              ? 'Each grade\'s recorded wording is in the Printing tab.'
              : 'No print profile is on record for it at all.'}</span></div></div>
      </div>

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
    const list = tabProperties(tab, m);
    const rows = ms.filter((x) => list.includes(x.property));
    const present = new Set(rows.map((r) => r.property));
    const absent = list.filter((p) => !present.has(p));
    return `
      ${rows.length ? rows.map((r) => measurementRow(r, highlight)).join('') : gapBox(covFor(tab), `${tab.toLowerCase()} measurements`)}
      ${absent.length ? `<h3 class="sec">Not measured for this material</h3>
        <div class="gap">${absent.map(esc).join(' · ')}<br><br>
        Absent from the sampled sources. Not zero, and not a low value.</div>` : ''}
      ${rows.length ? `<h3 class="sec">Coverage</h3>${gapBox(covFor(tab), 'record')}` : ''}`;
  }

  if (tab === 'Printing') {
    if (!profiles.length) return gapBox(covFor('Printing'), 'print profile');
    return profiles.map((p) => `
      <h3 class="sec">${esc(p.id)} · ${esc(p.gradeId)} · ${esc(p.profile ?? '')}</h3>
      <dl class="kv">
        <dt>Nozzle</dt><dd>${esc(p.nozzle.text)} ${gateChip(p.gates.nozzle)}</dd>
        <dt>Bed</dt><dd>${esc(p.bed.text)} ${gateChip(p.gates.bed)}</dd>
        <dt>Chamber</dt><dd>${esc(p.chamber.text)} ${gateChip(p.gates.chamber)}
          ${p.chamber.fromEnclosure ? `<br><span class="missing" style="font-size:11px">Read from the enclosure row: "${esc(p.enclosure)}". Not needing an enclosure means not needing a heated chamber.</span>` : ''}
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
        <div class="cond">${esc(e.id)} · ${esc(e.gradeId)} · ${esc(e.evidenceType)} · ${esc(e.sourceId)}${e.locator ? ' · ' + esc(e.locator) : ''}${e.exposure ? ' · ' + esc(e.exposure) : ''}</div>
      </div>`).join('')}`).join('');
  }

  if (tab === 'Grades') {
    if (!grades.length) return gapBox(covFor('Grades'), 'commercial grade');
    // Colour. The field was collected on every grade and shown nowhere, but it does not hold what
    // a buyer wants: on 132 of 144 grades it is the same sentence saying properties may vary by
    // colour, and on the other four it names the colour of the specimen that was tested. So the
    // honest rendering is the tested colour where one is stated, and a plain warning otherwise.
    const SPEC_COLOUR = /^(white|black|natural|grey|gray|red|blue|green|yellow|orange|clear|transparent)\b/i;
    const colourLine = (g) => {
      const c = g.colourCaveat ?? '';
      if (SPEC_COLOUR.test(c.trim())) return `Measured on the <b>${esc(c.trim())}</b> version. Other colours may differ.`;
      return 'Not recorded. This database holds no colour range, and pigment can change strength and stiffness.';
    };
    return `<div class="note">Which colours a grade is sold in is not part of this database.
      Check the retailer listing. The note under each grade says only what colour was tested.</div>`
      + grades.map((g) => `
      <h3 class="sec">${esc(g.id)}</h3>
      <dl class="kv">
        <dt>Manufacturer</dt><dd>${esc(g.manufacturer ?? '')}</dd>
        <dt>Product</dt><dd>${esc(g.product ?? '')}</dd>
        <dt>Composition</dt><dd>${esc(g.composition ?? '')}</dd>
        ${g.variant ? `<dt>Variant</dt><dd>${esc(g.variant)}: its numbers describe this product, not the polymer in general</dd>` : ''}
        <dt>Availability</dt><dd>${esc(g.availability ?? '')}</dd>
        <dt>Certifications</dt><dd>${esc(g.certifications ?? '')}</dd>
        <dt>Colour</dt><dd>${colourLine(g)}</dd>
        <dt>Why this grade</dt><dd>${esc(g.rationale ?? '')}</dd>
        <dt>Source</dt><dd>${esc(g.sourceId ?? '')}</dd>
      </dl>`).join('');
  }

  if (tab === 'Price') {
    if (!prices.length) return gapBox(covFor('Price'), 'Canadian price observation');
    return `<div class="note">Headline is the median of observations flagged for the headline sample.
      Prices sampled ${esc(db.meta.pricesSampled ?? db.meta.snapshot)}; they are not live. A struck-through row is quarantined: the listing is a different product and backs nothing.</div>
      <table class="grid" style="margin-top:10px"><thead><tr>
      <th>ID</th><th>Retailer</th><th>Variant</th><th>kg</th><th>CAD/kg</th><th>Stock</th><th>In sample</th></tr></thead>
      <tbody>${prices.map((p) => `<tr${p.quarantined ? ` class="quarantined" title="${esc(p.notes ?? p.basis ?? '')}"` : ''}>
        <td>${esc(p.id)}${p.quarantined ? ' <span class="chip chip-FAIL" style="font-size:10px">quarantined</span>' : ''}</td><td>${esc(p.retailer)}</td><td>${esc(p.variant ?? '')}</td>
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
          ${s?.url ? `<dt>Original</dt><dd style="word-break:break-all;font-size:11px">${sourceLink(s.url)}</dd>` : ''}
        </dl>
        ${list.map((r) => measurementRow(r, highlight)).join('')}`;
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
  return `<span class="chip chip-${gateVerdict(g.verdict).state}" style="font-size:10px" title="${esc(g.reason)}">${esc(gateVerdict(g.verdict).short)}</span>`;
};
