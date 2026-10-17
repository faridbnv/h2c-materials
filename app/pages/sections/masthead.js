// The masthead: the material's name, the name it is also called and its full name, then its typical engineering
// numbers on the first screen (figures.js FIRST_SCREEN: each key property's median with how many products it is the
// median of, and the nozzle and bed windows most products accept, material-stats.js printWindows), then what it is
// (polymer, filler, family, Bambu Lab's standing). A material beyond the H2C's capability says so before anything else.
// How much is on file is counted under Sources; the release and the data's date are in the footer.

import { esc } from '../html.js';
import { fmtNumber, fmtBounded, publishedBound } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { identity, stated, isProduct } from '../../js/ui/material-facts.js';
import { printWindows } from '../../js/ui/material-stats.js';
import { ledeWords, describeFacets, windowText, plural, asPublishedWords } from '../../js/ui/material-words.js';
import { h2cStatusLabel, H2C_STATUS, FILLER } from '../../js/ui/labels.js';
import { FIRST_SCREEN } from '../figures.js';

/** One number of the first screen: its name, its value and unit, and what it rests on. */
const cell = (key, label, value, unit, basis, none = false) => `<div class="kn${none ? ' kn--none' : ''}" data-key="${esc(key)}"><dt>${esc(label)}</dt>`
  + `<dd>${none ? `<span class="kn-none">${esc(value)}</span>` : `<b>${value}</b>${unit ? ` <span class="u">${esc(unit)}</span>` : ''}`}${basis ? `<small>${esc(basis)}</small>` : ''}</dd></div>`;

/** A key property's typical value: the median of the products that publish it comparably, and how many they are. */
function keyCell(m, key) {
  const h = REGISTRY.allHeadlines.find((x) => x.key === key);
  if (!h) return '';
  const e = m.headline?.[key];
  const s = m.summary?.[key];
  if (e?.known) {
    const n = e.spread?.n ?? s?.n ?? 1;
    return cell(key, h.labels.plain, esc(fmtBounded(e.value, null, publishedBound(e))), h.unit, n === 1 ? 'one product' : `median of ${n} products`);
  }
  if (e?.notApplicable) return cell(key, h.labels.plain, 'Not applicable', '', '', true);
  const open = s?.asPublished?.n;
  return cell(key, h.labels.plain, open || e?.related ? 'Not compared' : 'Not published', '', open ? `${plural(open, 'product')}, ${asPublishedWords(h)}` : e?.related ? 'none on a comparable basis' : '', true);
}

/** A print window most products accept (printWindows): the span more than half of them include, all of them, or one. */
function windowCell(products, axis, label) {
  const pw = printWindows(products, axis);
  const counted = pw.windows.filter((w) => w.counted);
  if (!pw.n) return cell(axis, label, 'Not published', '', '', true);
  if (pw.n === 1) return cell(axis, label, esc(windowText(counted[0].min, counted[0].max)), '°C', 'one product');
  if (pw.every) return cell(axis, label, esc(windowText(pw.every.from, pw.every.to)), '°C', `all ${pw.n} products accept`);
  if (pw.most) return cell(axis, label, esc(windowText(pw.most.from, pw.most.to)), '°C', `most of ${pw.n} products accept`);
  return cell(axis, label, esc(windowText(pw.peak.from, pw.peak.to)), '°C', `${pw.peak.k} of ${pw.n} products accept`);
}

export default {
  id: 'masthead',
  title: null,
  render(c) {
    const m = c.m;
    const id = identity(m, c);
    const products = c.grades.filter(isProduct);
    const fact = (label, value) => (value ? `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>` : '');
    const status = `<span class="chip" title="${esc(H2C_STATUS[m.h2cStatus]?.meaning ?? '')}">${esc(h2cStatusLabel(m.h2cStatus))}</span>`;
    // Beyond the H2C's capability, the callout says what the status lede would; the facets are said alone.
    const lede = m.excluded ? describeFacets(m) : ledeWords(m);
    // A filler the material's name does not carry: its special formulations that declare or show one (grades[].variant,
    // a vocabulary value), counted, so "Unfilled" does not hide a steel-filled product filed under it.
    const filled = products.filter((g) => /filler/i.test(String(g.variant ?? ''))).length;
    const filler = FILLER[id.reinforcement] ?? id.reinforcement ?? '';
    const fillerText = filler ? `${filler}${filled ? ` (${plural(filled, 'special formulation')} ${filled === 1 ? 'carries' : 'carry'} a filler)` : ''}` : '';
    const numbers = [...FIRST_SCREEN.keys.map((k) => keyCell(m, k)), windowCell(products, 'nozzle', 'Nozzle'), windowCell(products, 'bed', 'Bed')].join('');
    const html = `<header class="mast">
<h1 class="mast-name">${esc(id.primary)}</h1>
${id.aka ? `<p class="mast-aka">also called ${esc(id.aka)}</p>` : ''}
${id.fullName ? `<p class="mast-full">${esc(id.fullName)}</p>` : ''}
${m.excluded ? '<p class="callout"><b>Beyond H2C capability.</b> Kept for reference, never a candidate: it needs more heat than the H2C gives.</p>' : ''}
<dl class="mast-numbers" aria-label="Typical values">${numbers}</dl>
<dl class="mast-facts">
${fact('Polymer', esc(stated(m.basePolymer) ? m.basePolymer : ''))}
${fact('Filler', esc(fillerText))}
${stated(m.family) && m.family !== m.basePolymer ? fact('Family', esc(m.family)) : ''}
${fact('Bambu Lab status', status)}
${fact('Products', esc(`${fmtNumber(id.products)} from ${plural(id.makers, 'maker')}`))}
</dl>
${lede ? `<p class="mast-lede">${esc(lede)}</p>` : ''}
</header>`;
    return { html, empty: false, stats: {} };
  },
};
