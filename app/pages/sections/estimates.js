// Estimated, not measured: each key property with no comparable value that the build's estimate stage gives a range
// for (materials[].headline[key].estimate), and each estimated print window (materials[].print.*Estimate). Fenced off
// from the measured sections and marked †, in the selector's own words (labels.js estimateTitle, format.js
// estimateDisplay), with what each rests on. An estimate never makes a material pass.

import { esc } from '../html.js';
import { fmtNumber, fmtRange, estimateDisplay } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { estimateTitle, ESTIMATE_STRENGTH } from '../../js/ui/labels.js';
import { productNameOrId } from '../../js/ui/material-facts.js';
import { plural, andList } from '../../js/ui/material-words.js';

/** What an estimate rests on, a line per piece of evidence: the record's property and value, whose it is, and what it gives here. */
function evidence(e, d, c) {
  if (!e.evidence?.length) return '';
  return `<ul class="est-evidence">${e.evidence.map((ev) => {
    const items = andList(ev.items.map((i) => `${i.property} ${fmtNumber(i.value)} ${i.unit}${i.direction && !['not-applicable', 'unknown'].includes(i.direction) ? ` (${i.direction})` : ''}`));
    const whose = ev.sameGrade ? 'the same product' : productNameOrId(c.gradeById.get(ev.gradeId) ?? { id: 'another product' });
    // The build says a value of the property itself needs no conversion in its own words ("The headline's own
    // semantics"); the page says it in the reader's.
    const how = /headline's own/i.test(ev.conversion) ? 'The same property, not converted' : ev.conversion;
    return `<li>${esc(`${items}, ${whose}: about ${d.num(ev.converted)} ${d.unit} for this property. ${how}.`)}${ev.conflict ? ' <b>Disagrees with the rest and is down-weighted.</b>' : ''}</li>`;
  }).join('')}</ul>`;
}

export default {
  id: 'estimates',
  title: 'Estimated, not measured',
  render(c) {
    const m = c.m;
    const est = REGISTRY.headlines.filter((h) => { const x = m.headline?.[h.key]; return x && !x.known && x.estimate; });
    const windows = [['nozzleEstimate', 'Nozzle'], ['bedEstimate', 'Bed'], ['chamberEstimate', 'Chamber']].filter(([k]) => m.print?.[k]);
    if (!est.length && !windows.length) {
      const missing = REGISTRY.headlines.filter((h) => { const x = m.headline?.[h.key]; return !x?.known && !x?.notApplicable; });
      const line = missing.length
        ? `No estimate is given for the key properties this material does not publish (${andList(missing.map((h) => h.labels.plain))}).`
        : 'Every key property of this material has a measured value, or does not apply to it, so none is estimated.';
      return { empty: true, html: `<p class="empty">${esc(line)}</p>`, stats: {} };
    }
    const levels = est.map((h) => m.headline[h.key].estimate.levels).find(Boolean) ?? { likely: 0.8, plausible: 0.95 };
    const pct = (p) => `${Math.round(p * 100)}%`;
    const cards = est.map((h) => {
      const e = m.headline[h.key].estimate;
      const d = estimateDisplay(e, { ownUnit: true });
      const basis = ESTIMATE_STRENGTH[e.strength]?.short ?? e.strength;
      return `<div class="est" data-estimate="${esc(h.key)}"><h3 class="est-name">${esc(h.labels.plain)}</h3>`
        + `<p class="est-range"><span class="est-num">~${esc(d.lo)}–${esc(d.hi)}</span> <span class="kf-unit">${esc(d.unit)}</span><span class="dagger" aria-label="estimate">†</span></p>`
        + `<p class="est-basis">${esc(`${e.precision} precision, ${basis}.`)}</p>`
        + `<p>${esc(estimateTitle({ ...e, screenLimit: null }, d))}</p>${evidence(e, d, c)}</div>`;
    });
    const wins = windows.map(([k, label]) => {
      const w = m.print[k];
      const words = k === 'chamberEstimate'
        ? `No source publishes a chamber temperature. Research of 2026-09-13 places it in this band, based on ${w.basis}. It is not a print setting and changes no result.${w.caution ? ` ${w.caution}` : ''}`
        : `No source publishes this window. Estimated as the ${w.basis} (${(w.peers ?? []).map((p) => `${p.name} ${fmtNumber(p.min)}–${fmtNumber(p.max)}`).join(', ')}). A starting point to verify. It changes no result.`;
      return `<div class="est" data-estimate="${esc(k)}"><h3 class="est-name">${esc(`${label}: estimated, not published`)}</h3><p class="est-range"><span class="est-num">${esc(fmtRange(w.lo, w.hi))}</span> <span class="kf-unit">${esc(w.unit)}</span><span class="dagger" aria-label="estimate">†</span></p><p>${esc(words)}</p></div>`;
    });
    const lead = `${plural(est.length + windows.length, 'estimate')}, for what this material's products do not publish comparably. Estimates fill gaps from related data and similar materials. Tested on known values, a likely range held ${pct(levels.likely)} of the time and a plausible range ${pct(levels.plausible)}. An estimate never makes a material pass, and nothing else on this page rests on one.`;
    return { empty: false, html: `<div class="fence"><p class="lead">${esc(lead)}</p><div class="est-grid">${[...cards, ...wins].join('')}</div></div>`, stats: { estimates: est.length + windows.length } };
  },
};
