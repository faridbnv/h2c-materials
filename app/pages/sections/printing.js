// Printing on the H2C: how many of the material's products the H2C can print, setting by setting, from each product's
// own print gate (grades[].print); every product's print temperatures drawn together (D139: its lowest and highest
// nozzle, bed and heated-chamber setting and its drying temperature, the H2C's limit where it is near); then the
// hardened nozzle, drying, the AMS and where a silent sheet's settings were read. The words are the drawer's.

import { esc, tableBox } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { hardenedShare } from '../../js/engine/products.js';
import { isProduct, printFacts, printCounts, guideFacts } from '../../js/ui/material-facts.js';
import {
  plural, andList, joinedSpan, printAxisUnit, printApartWords, printLines, printSingles, printMissing, printOriginsWords, hardenedFactWords,
  dryingFactWords, amsSummary, guideEnclosureWords, guideHardenedWords, EMPTY_LINES,
} from '../../js/ui/material-words.js';
import { stripScale } from '../charts/scale.js';
import { dotTrack, dotRow, dotGraph } from '../charts/dotplot.js';
import { axisRow } from '../charts/axis.js';
import { keyMark, keyBand, keyMedian, keyLimit, keyList } from '../charts/marks.js';
import { figure } from '../charts/figure.js';
import { emptyBody, recordsLink, figureCounter } from './common.js';

/** The H2C's limits against the products, setting by setting (printCounts), as a table. */
function limitsTable(f) {
  return tableBox(`<table class="grid limits"><thead><tr><th scope="col">Setting</th><th scope="col" class="num">H2C limit</th><th scope="col" class="num">Within</th>`
    + `<th scope="col" class="num">Above or partly within</th><th scope="col" class="num">Not published</th></tr></thead><tbody>${f.axes.map((n) => `<tr><th scope="row">${esc(n.label)}</th>`
    + `<td class="num">${esc(fmtNumber(n.limit, '°C'))}</td><td class="num">${n.within}</td><td class="num">${n.over}</td><td class="num">${n.unknown}</td></tr>`).join('')}</tbody></table>`);
}

/** Every product's print temperatures, a graph per setting (printFacts().drawn), as the drawer's Printing tab draws them. */
function temperaturesFigure(f, c, no) {
  let dots = 0;
  const graphs = f.drawn.map((d) => {
    const scale = stripScale(d.onScale ? [...d.values, d.limit] : d.values, '°C');
    const limit = d.onScale ? scale.pct(d.limit) : null;
    const rows = d.rows.map((r) => {
      const entries = r.entries.map((e) => ({
        v: { value: e.value }, marks: [e.origin === 'guide' ? 'open' : '', e.variant ? 'variant' : ''].filter(Boolean),
        data: { 'data-grade': e.g.id, 'data-profile': e.profileId ?? null, 'data-guide': e.origin === 'guide' ? 'true' : null, 'data-v': fmtNumber(e.value), 'data-from': e.origin === 'twin' ? e.label : null },
      }));
      dots += entries.length;
      return dotRow({ data: { 'data-row': r.key, 'data-unit': '°C', 'data-open': `from ${f.guideName}` }, label: r.label, sub: plural(entries.length, 'product'), track: dotTrack({ entries, scale, summary: r.summary, limit }) });
    });
    return dotGraph(rows, axisRow(scale, printAxisUnit(d.limit, d.onScale)), { 'data-setting': d.axis });
  });
  const k = f.marks;
  const key = keyList([
    k.own ? [keyMark([]), esc('the product\'s data sheet, or one it shares')] : null,
    k.guide ? [keyMark(['open']), esc(`from ${f.guideName}`)] : null,
    k.variant ? [keyMark(['variant']), 'special formulation'] : null,
    k.band ? [keyBand, 'middle half'] : null,
    k.median ? [keyMedian, 'median'] : null,
    k.limit ? [keyLimit, esc('the H2C\'s limit')] : null,
  ].filter(Boolean));
  const table = tableBox(`<table class="grid sum"><thead><tr><th scope="col">Setting, <span class="u">°C</span></th><th scope="col" class="num" title="Products counted">n</th>`
    + `<th scope="col" class="num">Median</th><th scope="col" class="num">Middle half</th><th scope="col" class="num">Range</th></tr></thead><tbody>${f.rows.map((r) => {
      const s = r.summary;
      const apart = printApartWords(s);
      return `<tr><th scope="row">${esc(r.label)}</th><td class="num">${s.n}</td><td class="num">${s.n ? esc(fmtNumber(s.median)) : '—'}</td>`
        + `<td class="num">${s.q1 != null ? esc(s.q1 === s.q3 ? fmtNumber(s.q1) : `${fmtNumber(s.q1)}–${fmtNumber(s.q3)}`) : '—'}</td><td class="num">${s.n ? esc(joinedSpan(s)) : '—'}</td></tr>`
        + (apart.length ? `<tr class="apart"><td colspan="5">Also drawn, not counted: ${esc(andList(apart))}.</td></tr>` : '');
    }).join('')}</tbody></table>`);
  const single = printSingles(f);
  const missing = printMissing(f);
  const notes = [...printLines(f), single, missing ? `Not drawn: ${missing}.` : ''].filter(Boolean).map((t) => `<p class="fig-note">${esc(t)}</p>`).join('');
  return {
    dots,
    html: figure({
      id: `fig-${no.replace('.', '-')}`, n: no, title: 'Print temperatures across products', data: { 'data-print': 'temperatures' },
      key, plot: graphs.join(''), table, notes,
      label: `Dot plot, one dot per product and setting: ${f.drawn.map((d) => `${d.label.toLowerCase()}, ${plural(new Set(d.rows.flatMap((r) => r.entries.map((e) => e.g.id))).size, 'product')}`).join('; ')}.`,
      caption: `${esc(`A dot is one product's lowest or highest setting, or its drying temperature, as its own data sheet, a sheet it shares, or ${f.guideName} gives it: ${plural(f.products, 'product')} drawn.`)} ${recordsLink(c, '#profiles', 'Every print profile, with its document, is on the records page')}.`,
    }),
  };
}

/**
 * The Bambu Lab Filament Guide's row for the material's type (D88), as the guide prints it: read for a product only where
 * the product's own data sheet, and one it shares, say nothing on a setting.
 */
function guideBlock(f) {
  const g = f.guide;
  const rows = [
    ['Nozzle', g.nozzle.text], ['Bed', g.bed.text],
    ['Chamber', g.chamber.state === 'unknown' ? 'no temperature stated' : g.chamber.state === 'enclosed' ? 'enclosure required, no temperature (the H2C\'s heated chamber counts)' : g.chamber.text],
    ['Enclosure', guideEnclosureWords(g.enclosureState)], ['Nozzle type', `${g.nozzleSizeMaterial}: ${guideHardenedWords(g.abrasion.requiresHardened)}`],
  ];
  return `<div class="guide"><h3 class="sub-title">${esc(g.name)}</h3>
<p class="fig-note">${esc(`Used only where a product's own data sheet, and one it shares, are silent on a setting: ${f.readBy ? `${plural(f.readBy, 'product')} here ${f.readBy === 1 ? 'takes' : 'take'} at least one setting from it` : 'no product here needs it'}.`)}</p>
<dl class="facts facts--guide">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="raw">${esc(v)}</dd></div>`).join('')}</dl></div>`;
}

export default {
  id: 'printing',
  title: 'Printing on the H2C',
  records: '#profiles',
  render(c, env, place) {
    const m = c.m;
    const products = c.grades.filter(isProduct);
    const counts = printCounts(c.grades);
    const pf = printFacts(m, c);
    const guide = guideFacts(m, c);
    if (!c.profiles.length && !pf.drawn.length && !guide) {
      return { empty: true, html: emptyBody(c, EMPTY_LINES.Printing, { tab: 'Printing', anchor: '#profiles' }), stats: {} };
    }
    const next = figureCounter(place.n);
    const answer = counts
      ? (counts.all ? `All ${plural(counts.products, 'product')} ${counts.products === 1 ? 'is' : 'are'} within the H2C's nozzle, bed and chamber limits, each on its own settings.`
        : `${counts.products === 1 ? 'Its product' : `Its ${counts.products} products`}, each on its own settings, against the H2C's limits:`)
      : '';
    const read = counts ? printOriginsWords(counts.origins) : [];
    const fig = pf.drawn.length ? temperaturesFigure(pf, c, next()) : null;
    const nofig = !fig ? `<div class="nofig"><h3 class="sub-title">Print temperatures across products</h3><p>${esc(['No graph: no setting has two products\' values, one of them from a data sheet.', printSingles(pf), printMissing(pf) ? `Not drawn: ${printMissing(pf)}.` : ''].filter(Boolean).join(' '))}</p></div>` : '';
    const hard = hardenedShare(c.grades);
    const someHard = m.gates.abrasive === 'requires-hardened' && hard.total > 1 && hard.need < hard.total;
    const facts = [
      ['Hardened nozzle', hardenedFactWords(m.gates.abrasive, hard, someHard)],
      ['Drying', dryingFactWords(m.gates.drying, products)],
      ['AMS', amsSummary(c.profiles)],
      read.length ? ['Where a sheet is silent', `${andList(read)}. Products shows which.`] : null,
    ].filter(Boolean);
    const html = `<p class="lead">${esc(answer)}</p>
${counts && !counts.all ? limitsTable(counts) : ''}
${fig?.html ?? nofig}
<h3 class="sub-title">How it prints</h3>
<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
${guide ? guideBlock(guide) : ''}
<p class="fig-note">${recordsLink(c, '#profiles', `All ${plural(c.profiles.length, 'print profile')}, with their documents`)}.</p>`;
    return { empty: false, html, stats: { figures: fig ? 1 : 0, dots: fig?.dots ?? 0 } };
  },
};
