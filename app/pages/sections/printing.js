// How to print it: the nozzle, bed and heated-chamber temperatures most of the material's products accept, from each
// product's own print gate (grades[].print) counted by material-stats.js printWindows, drawn as every product's window
// with how many accept each temperature over them; drying as a strip with its typical schedule; then the hardened
// nozzle, the AMS, where a silent sheet's settings were read and the Bambu Lab Filament Guide's row. The bookkeeping
// (what is counted, drawn and not counted, not drawn and why, the medians, the H2C's limits) is under "How this is
// counted".

import { esc, tableBox } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { hardenedShare } from '../../js/engine/products.js';
import { isProduct, printFacts, printCounts, guideFacts } from '../../js/ui/material-facts.js';
import { printWindows, dryingStats, dryingAdvice, settingOrigins } from '../../js/ui/material-stats.js';
import {
  plural, andList, cap, joinedSpan, windowText, printApartWords, printLines, printSingles, printMissing,
  amsSummary, guideEnclosureWords, guideHardenedWords, EMPTY_LINES,
} from '../../js/ui/material-words.js';
import { stripScale } from '../charts/scale.js';
import { dotTrack, dotRow, dotGraph } from '../charts/dotplot.js';
import { axisRow } from '../charts/axis.js';
import { keyLimit, keyList } from '../charts/marks.js';
import { windowPanel } from '../charts/windows.js';
import { figure, figId, howCounted } from '../charts/figure.js';
import { emptyBody, recordsLink, figureCounter, findingsBlock, notesHtml, middleHalf, readerText } from './common.js';
import { printFindings, basisWords } from '../findings.js';

const SETTINGS = [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Heated chamber']];

/** The H2C's limits against the products, setting by setting (printCounts), as a table. */
function limitsTable(f) {
  return tableBox(`<table class="grid limits"><thead><tr><th scope="col">Setting</th><th scope="col" class="num">H2C limit</th><th scope="col" class="num">Within</th>`
    + `<th scope="col" class="num">Above or partly within</th><th scope="col" class="num">Not published</th></tr></thead><tbody>${f.axes.map((n) => `<tr><th scope="row">${esc(n.label)}</th>`
    + `<td class="num">${esc(fmtNumber(n.limit, '°C'))}</td><td class="num">${n.within}</td><td class="num">${n.over}</td><td class="num">${n.unknown}</td></tr>`).join('')}</tbody></table>`);
}

/** The medians of every product's lowest and highest setting and its drying temperature (printFacts().rows), as a table. */
function mediansTable(pf) {
  return tableBox(`<table class="grid sum"><thead><tr><th scope="col">Setting, <span class="u">°C</span></th><th scope="col" class="num" title="Products counted">n</th>`
    + `<th scope="col" class="num">Median</th><th scope="col" class="num">Middle half</th><th scope="col" class="num">Range</th></tr></thead><tbody>${pf.rows.map((r) => {
      const s = r.summary;
      const apart = printApartWords(s);
      return `<tr><th scope="row">${esc(r.label)}</th><td class="num">${s.n}</td><td class="num">${s.n ? esc(fmtNumber(s.median)) : '—'}</td>`
        + `<td class="num">${s.q1 != null ? esc(middleHalf(s)) : '—'}</td><td class="num">${s.n ? esc(joinedSpan(s)) : '—'}</td></tr>`
        + (apart.length ? `<tr class="apart"><td colspan="5">Also drawn, not counted: ${esc(andList(apart))}.</td></tr>` : '');
    }).join('')}</tbody></table>`);
}

/** The drying temperatures as one strip of dots (the dot grammar), with the typical schedule beside it. */
function dryingStrip(d, guideName) {
  const entries = d.entries.map((e) => ({ v: { value: e.value }, marks: [e.origin === 'guide' ? 'open' : '', e.variant ? 'variant' : ''].filter(Boolean),
    data: { 'data-grade': e.g.id, 'data-v': `${fmtNumber(e.value)}${e.hours != null ? ` °C for ${fmtNumber(e.hours)} h` : ''}`, 'data-from': e.origin === 'guide' ? `from ${guideName}` : null } }));
  if (entries.length < 2) return '';
  const scale = stripScale(entries.map((e) => e.v.value), '°C');
  const t = d.temps, h = d.hours;
  const sub = t.n ? `typically ${fmtNumber(t.median)} °C${h.n ? ` for ${fmtNumber(h.median)} h` : ''}` : '';
  return `<div class="pw-dry">${dotGraph([dotRow({ data: { 'data-row': 'drying', 'data-unit': '°C', 'data-open': `from ${guideName}` }, label: 'Drying', sub, track: dotTrack({ entries, scale, summary: t }) })], axisRow(scale, '°C'), { 'data-setting': 'drying' })}</div>`;
}

/** What a setting is called in "take their … from": the settings of a print gate in plain words. */
const SETTING_WORDS = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber', drying: 'drying', enclosure: 'enclosure need', hardenedNozzle: 'nozzle type', anneal: 'annealing' };

/** "66 products take at least one setting from Bambu Lab's guide: 4 their nozzle, 5 their bed, …" (settingOrigins). */
function originLine(o, from) {
  if (!o.products) return '';
  const list = o.settings.map(([k, n], i) => `${n} ${i ? '' : 'their '}${SETTING_WORDS[k] ?? k}`);
  return `${o.products === 1 ? 'One product takes' : `${o.products} products take`} at least one setting from ${from}: ${andList(list)}.`;
}

/**
 * The Bambu Lab Filament Guide's row for the material's type (D88), as the guide prints it: read for a product only where
 * the product's own data sheet, and one it shares, say nothing on a setting.
 */
function guideBlock(f, name) {
  const g = f.guide;
  const rows = [
    ['Nozzle', g.nozzle.text], ['Bed', g.bed.text],
    ['Chamber', g.chamber.state === 'unknown' ? 'no temperature stated' : g.chamber.state === 'enclosed' ? 'enclosure required, no temperature (the H2C\'s heated chamber counts)' : g.chamber.text],
    ['Enclosure', guideEnclosureWords(g.enclosureState)], ['Nozzle type', `${g.nozzleSizeMaterial}: ${guideHardenedWords(g.abrasion.requiresHardened)}`],
  ];
  return `<div class="guide"><h3 class="sub-title">${esc(g.name)}</h3>
<p class="note">${esc(`Read for a product only where its own sheet, and a sheet it shares, are silent on a setting.${f.readBy ? '' : ' No product here needs it.'}`)}</p>
${rowNote(f, name)}
<dl class="facts facts--guide">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="raw">${guideLines(v)}</dd></div>`).join('')}</dl></div>`;
}

/**
 * Where the guide's row is named for another type than the material (PETG reads its PETG HF row): which row it is, and
 * why, in the mapping's own Reason (print_guide_materials.csv), its record names taken out; left unsaid where the
 * reason speaks only in record names.
 */
function rowNote(f, name) {
  const type = f.guide.guideType;
  if (!type || type === name) return '';
  const why = String(f.why ?? '').replace(/\s*(?:since\s+)?m\d+\s*\(D\d+\)/g, '').replace(/\s*\(D\d+\)/g, '').replace(/\s+([,;.])/g, '$1').trim();
  const reason = why && readerText(why) ? ` ${why.charAt(0).toUpperCase()}${why.slice(1)}${/[.]$/.test(why) ? '' : '.'}` : '';
  return `<p class="note">${esc(`Bambu Lab's guide has no row named ${name}; its ${type} row is read.${reason}`)}</p>`;
}

/**
 * A guide cell as the guide prints it, each of its entries on a line of its own: a line is broken only at the space the
 * stored text leaves after a closing bracket, before the next entry's name. Not a word is changed.
 */
const guideLines = (text) => String(text ?? '').split(/(?<=\))\s+(?=[A-Z])/).map(esc).join('<br>');

/** The hardened-nozzle line: which products need one, by name, or what the sources say. */
function hardenedLine(gate, hard) {
  if (hard.need && hard.need < hard.total) {
    return `${hard.need} of ${hard.total} products need one: ${hard.needing.slice(0, 4).map((g) => `${g.manufacturer} ${g.product}`).join(', ')}${hard.need > 4 ? ` and ${hard.need - 4} more` : ''}. The others state no need or say nothing.`;
  }
  if (hard.need) return hard.total === 1 ? 'Its product needs one.' : `All ${hard.total} products need one.`;
  return gate === 'requires-hardened' ? 'Required: the filler wears out a brass nozzle.' : gate === 'no-special-concern' ? 'Its sources state no special nozzle need.' : 'No source mentions nozzle wear.';
}

/**
 * The drying line: how many products have drying advice and where each was read (material-stats.js dryingAdvice), and
 * the typical schedule of those whose own or shared sheet gives one; or what the sources say where none has any.
 */
function dryingLine(gate, products, d, advice) {
  if (!advice.have) return gate === 'not-needed' ? 'Its sources say drying is not needed.' : 'No source states whether to dry it. That does not mean it needs none.';
  const typical = d?.temps?.n > 1 ? ` Typically ${fmtNumber(d.temps.median)} °C${d.hours?.n ? ` for ${fmtNumber(d.hours.median)} h` : ''}.` : '';
  return `${advice.have} of ${plural(products.length, 'product')} have drying advice: ${basisWords(advice, advice.have)}.${typical}`;
}

export default {
  id: 'printing',
  title: 'How to print it on the H2C',
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
    const pw = Object.fromEntries(SETTINGS.map(([axis]) => [axis, printWindows(products, axis)]));
    const drying = dryingStats(products);
    const advice = dryingAdvice(products);
    const origins = settingOrigins(products);
    const hard = hardenedShare(c.grades);
    const chamberOutside = pf.outside.find((a) => a.axis === 'chamber')?.list.length ?? 0;
    const findings = printFindings({
      nozzle: pw.nozzle, bed: pw.bed, chamber: pw.chamber, products: products.length, chamberOutside, limit: pw.chamber.limit,
      drying, hard, abrasive: m.gates.abrasive, dryingGate: m.gates.drying,
      outside: pf.outside.map((a) => ({ ...a, limit: pf.limits.find((l) => l.axis === a.axis)?.limit })),
    });

    // The figure: a panel for each setting two counted windows or more give, and the drying strip.
    // A setting is drawn where three counted windows or more give it and they do not all agree: otherwise the
    // findings say it in full, and a figure would add nothing.
    const drawable = (p) => p.n > 2 && !(p.every && p.windows.filter((w) => w.counted).every((w) => w.min === p.every.from && w.max === p.every.to));
    const panels = SETTINGS.filter(([axis]) => drawable(pw[axis])).map(([axis, label]) => {
      const p = pw[axis];
      const at = p.peak.from === p.peak.to ? `${fmtNumber(p.peak.from)} °C` : `${windowText(p.peak.from, p.peak.to)} °C`;
      return windowPanel(p, { label, peakWords: p.every ? `all ${p.n} accept ${windowText(p.every.from, p.every.to)} °C` : `${p.peak.k} of ${p.n} accept ${at}`, guideName: pf.guideName });
    });
    const strip = dryingStrip(drying, pf.guideName);
    let fig = '';
    let dots = 0;
    if (panels.length) {
      const drawn = SETTINGS.filter(([axis]) => drawable(pw[axis])).map(([axis]) => pw[axis]);
      const key = keyList([
        ['<svg class="key-mk" width="22" height="14" aria-hidden="true" focusable="false"><line class="wb" x1="2" x2="20" y1="7" y2="7" style="stroke-width:3px"/></svg>', esc('a product\'s window, from its own sheet or a sheet it shares')],
        drawn.some((p) => p.guide) ? ['<svg class="key-mk" width="22" height="14" aria-hidden="true" focusable="false"><line class="wb wb--guide" x1="2" x2="20" y1="7" y2="7" style="stroke-width:3px"/></svg>', esc('from Bambu Lab\'s guide, drawn but not counted')] : null,
        drawn.some((p) => p.variant) ? ['<svg class="key-mk" width="22" height="14" aria-hidden="true" focusable="false"><line class="wb wb--variant" x1="2" x2="20" y1="7" y2="7" style="stroke-width:3px"/></svg>', 'special formulation, drawn but not counted'] : null,
        panels.some((x) => x.onScale) ? [keyLimit, esc('the H2C\'s limit')] : null,
      ].filter(Boolean));
      dots = drawn.reduce((n, p) => n + p.windows.length, 0) + drying.entries.length;
      // The title: the setting the most products accept, nozzle and bed, with how many accept it.
      const at = (p) => (p.peak.from === p.peak.to ? `${fmtNumber(p.peak.from)} °C` : `${windowText(p.peak.from, p.peak.to)} °C`);
      const peaks = [['nozzle', 'on the nozzle'], ['bed', 'on the bed']].filter(([axis]) => drawable(pw[axis]) && !pw[axis].every).map(([axis, where]) => ({ p: pw[axis], where }));
      const title = peaks.length ? `${andList(peaks.map(({ p, where }) => `${at(p)} ${where}`))} ${peaks.length > 1 ? 'suit' : 'suits'} the most products: ${andList(peaks.map(({ p }) => `${p.peak.k} of ${p.n}`))}`
        : pw.nozzle.every ? `${cap(pw.nozzle.n === 2 ? 'both products' : `all ${pw.nozzle.n} products`)} accept ${windowText(pw.nozzle.every.from, pw.nozzle.every.to)} °C on the nozzle`
          : 'The temperatures its products accept';
      const countedN = drawn.map((p) => `${p.n} for the ${SETTINGS.find(([a]) => a === p.axis)[1].toLowerCase()}`);
      const notCounted = drawn.flatMap((p) => [p.guide ? `${plural(p.guide, `${SETTINGS.find(([a]) => a === p.axis)[1].toLowerCase()} window`)} from ${pf.guideName}` : null,
        p.variant ? `${plural(p.variant, `${SETTINGS.find(([a]) => a === p.axis)[1].toLowerCase()} window`)} of special formulations` : null]).filter(Boolean);
      const missing = printMissing(pf);
      const no = next();
      fig = figure({
        id: figId(no), n: no, title, data: { 'data-print': 'windows' }, cls: 'fig--print',
        key,
        plot: `<div class="pw-grid">${panels.map((x) => x.html).join('')}</div>${strip}`,
        label: `Print windows of each product, with how many products accept each temperature: ${drawn.map((p) => `${SETTINGS.find(([a]) => a === p.axis)[1].toLowerCase()}, ${plural(p.n, 'product')} counted, ${p.most ? `most accept ${p.most.from} to ${p.most.to} °C` : `at most ${p.peak.k} accept one temperature`}`).join('; ')}.`,
        read: esc('A bar is one product\'s window, from its lowest to its highest setting. Above the bars, the height is how many products accept each temperature, and the highlighted span is what more than half of them accept.'),
        counted: notesHtml([
          `Counted: the products whose own data sheet, or one they share, gives both ends of the window. That is ${andList(countedN)}.`,
          notCounted.length ? `Drawn but not counted: ${andList(notCounted)}. The guide speaks for every product that reads it, so it is drawn once per product and counted for none.` : null,
          'The height at each whole degree is how many counted windows include it. The dashed line is half of them.',
          missing ? `Not drawn: ${missing}.` : null,
          ...printLines(pf), printSingles(pf),
        ]) + mediansTable(pf) + (counts && !counts.all ? limitsTable(counts) : '') + `<p>${recordsLink(c, '#profiles', 'Every print profile, with its document, on the records page')}.</p>`,
      });
    }

    const facts = [
      ['Hardened nozzle', hardenedLine(m.gates.abrasive, hard)],
      ['Drying', dryingLine(m.gates.drying, products, drying, advice)],
      // Bambu Lab's notes that only say a product is not verified are left out: they say nothing about this material.
      ['AMS', amsSummary(c.profiles).split(/(?<=\.) (?=Bambu's notes?)/).filter((t) => !/^Bambu's notes? [^:]*: "not verified[^"]*"(?: \(\d+ of \d+ profiles\))?\.?$/i.test(t)).join(' ')],
      origins.guide.products || origins.twin.products ? ['Where a sheet is silent', [originLine(origins.guide, 'Bambu Lab\'s guide'), originLine(origins.twin, 'a sheet they share')].filter(Boolean).join(' ')] : null,
    ].filter(Boolean);
    const html = `${findingsBlock(findings)}${fig}
<h3 class="sub-title">Nozzle, drying and AMS</h3>
<dl class="facts" data-drying-have="${advice.have}" data-drying-own="${advice.own}" data-drying-twin="${advice.twin}" data-drying-guide="${advice.guide}" data-products="${products.length}">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
${!panels.length && pf.rows.length ? howCounted(notesHtml([...printLines(pf), printSingles(pf), printMissing(pf) ? `Not counted: ${printMissing(pf)}.` : null]) + mediansTable(pf) + (counts && !counts.all ? limitsTable(counts) : ''), 'How the settings are counted') : ''}
${guide ? guideBlock(guide, m.name) : ''}
<p class="note">${recordsLink(c, '#profiles', `All ${plural(c.profiles.length, 'print profile')}, with their documents`)}.</p>`;
    return { empty: false, html, stats: { figures: fig && panels.length ? 1 : 0, dots } };
  },
};
