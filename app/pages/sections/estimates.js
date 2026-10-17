// Estimated values: only where a key figure is missing or published only without a stated orientation or load. Each
// key property the build's estimate stage gives a range for (materials[].headline[key].estimate) and each estimated
// print window (materials[].print.*Estimate), in one table: the likely range (80 %), the plausible range (95 %), how
// precise it is, and how it sits beside what the products publish (materials[].summary[key].asPublished). Fenced off and
// marked †, in the selector's own terms (format.js estimateDisplay); an estimate never makes a material pass, and nothing
// else on the page rests on one.

import { esc, tableBox } from '../html.js';
import { fmtNumber, fmtRange, estimateDisplay } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { inText, countWords, glue } from '../findings.js';
import { andList } from '../../js/ui/material-words.js';
import { para } from './common.js';

/** How an estimate sits beside the values its products publish without a stated basis. */
function beside(h, m, d) {
  const a = m.summary?.[h.key]?.asPublished;
  if (!a?.n) return 'no product publishes it';
  const f = d.factor ?? 1;
  const span = a.min === a.max ? fmtNumber(a.min * f, d.unit) : `${fmtNumber(a.min * f)}–${fmtNumber(a.max * f, d.unit)}`;
  const lo = Number(String(d.lo).replace(/,/g, '')), hi = Number(String(d.hi).replace(/,/g, ''));
  const v = [a.min * f, a.max * f];
  const who = a.n === 1 ? 'one product gives' : `${countWords(a.n)} products give`;
  const where = v[1] < lo ? 'below the likely range' : v[0] > hi ? 'above the likely range' : v[0] <= lo + (hi - lo) * 0.15 ? 'at its low end' : v[1] >= hi - (hi - lo) * 0.15 ? 'at its high end' : 'inside it';
  return `${who} ${span} without a stated ${h.direction ? 'orientation' : 'test load'}, ${where}`;
}

export default {
  id: 'estimates',
  title: 'Estimated values',
  render(c) {
    const m = c.m;
    const est = REGISTRY.headlines.filter((h) => { const x = m.headline?.[h.key]; return x && !x.known && x.estimate; });
    const windows = [['nozzleEstimate', 'Nozzle window'], ['bedEstimate', 'Bed window'], ['chamberEstimate', 'Chamber window']].filter(([k]) => m.print?.[k]);
    if (!est.length && !windows.length) return { empty: true, html: '', stats: {} };
    const levels = est.map((h) => m.headline[h.key].estimate.levels).find(Boolean) ?? { likely: 0.8, plausible: 0.95 };
    const rows = est.map((h) => {
      const e = m.headline[h.key].estimate;
      const d = estimateDisplay(e, { ownUnit: true });
      const plausible = d.plausible ? `${d.plausible[0]}⁠–⁠${d.plausible[1]} ${d.unit}` : '—';
      const precision = e.precision === 'poor' ? 'poor: an order of magnitude only' : e.precision === 'fair' ? 'fair: a rough guide' : e.precision;
      return `<tr data-rec="${esc(`${m.id}/${h.key}/estimate`)}" data-estimate="${esc(h.key)}"><th scope="row" class="prop">${esc(h.labels.plain)}</th>`
        + `<td class="num" data-label="Likely"><span data-v="${esc(e.lo)}" data-key="${esc(h.key)}" data-stat="estimate.lo">${esc(d.lo)}</span>⁠–⁠<span data-v="${esc(e.hi)}" data-key="${esc(h.key)}" data-stat="estimate.hi">${esc(d.hi)}</span> ${esc(d.unit)} <span class="dagger" aria-label="estimate">†</span></td>`
        + `<td class="num" data-label="Plausible">${esc(plausible)}</td><td data-label="Precision">${esc(precision)}</td><td data-label="Beside what is published">${esc(beside(h, m, d))}</td></tr>`;
    });
    const wins = windows.map(([k, label]) => {
      const w = m.print[k];
      return `<tr data-rec="${esc(`${m.id}/${k}`)}" data-estimate="${esc(k)}"><th scope="row" class="prop">${esc(label)}</th><td class="num" data-label="Likely">${esc(fmtRange(w.lo, w.hi))} ${esc(w.unit)} <span class="dagger" aria-label="estimate">†</span></td><td class="num" data-label="Plausible">—</td><td data-label="Precision">${esc('a starting point to verify')}</td><td data-label="Beside what is published">${esc(`no product publishes one; estimated from ${w.basis}`)}</td></tr>`;
    });
    const named = est.map((h) => inText(h.labels.plain));
    const lead = est.length
      ? `No product publishes ${named.length === 1 ? `a ${named[0]}` : `values of ${andList(named)}`} that can be ranked, so the selector estimates ${named.length === 1 ? 'it' : 'them'} from the products' related values and similar materials.`
      : 'No product publishes these print windows, so the selector estimates them from similar materials.';
    const pct = (p) => Math.round(p * 100);
    const table = tableBox(`<table class="grid est"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Likely</th><th scope="col" class="num">Plausible</th><th scope="col">Precision</th><th scope="col">Beside what is published</th></tr></thead><tbody>${[...rows, ...wins].join('')}</tbody></table>`);
    const fold = `<details class="more"><summary>${esc('What likely and plausible mean')}</summary><p class="sec-p">${esc(`Tested against known values, a likely range held the true value ${pct(levels.likely) / 10} times in 10, and a plausible range ${pct(levels.plausible) / 5} times in 20.`)} <a href="method.html#estimates">How the estimates are made</a>.</p></details>`;
    return { empty: false, html: glue(`<div class="fence">${para([lead, 'An estimate is a range, never a product\'s value, and nothing above rests on it.'])}${table}${fold}</div>`), stats: { estimates: rows.length + wins.length } };
  },
};
