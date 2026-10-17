// Every measurement of the material, by domain and then by property in the registry's order, each property a group
// with how many values it lists and, per unit, their median and range. A row: the product, the value as published,
// its orientation, specimen and standard, the other conditions its record states (as chips), whether a figure on the
// main page draws it (a badge: in the median, not compared, not drawn and why: the build's own reason,
// material-facts.js notDrawnWhy, in labels.js whyOne's words), its document and its ID.

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { STATUS_WORDS, propertyName, whyOne } from '../../js/ui/labels.js';
import { tabProperties, comparisonsOf, notDrawnWhy, productNameOrId } from '../../js/ui/material-facts.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { outOfMedianWords, alsoForWords, cap, plural } from '../../js/ui/material-words.js';
import { typeSection, groupBlock, sourceCell, idCell, conditionChips, orientationWords, specimenWords, standardWords, countable, unitText, statsWords } from './common.js';

const DOMAINS = [['Mechanical', 'mechanical'], ['Thermal', 'thermal'], ['Physical', 'physical']];

/** For each measurement, whether a comparison on the page draws it, and the lines it carries there (comparisonsOf().onGraph). */
export function drawnIndex(c) {
  const byProperty = new Map();
  const lines = new Map();
  for (const tab of ['Mechanical', 'Thermal']) {
    for (const f of comparisonsOf(c.m, c, tab)) {
      for (const p of f.properties) if (!byProperty.has(p)) byProperty.set(p, f);
      if (!f.drawnGraphs.length) continue;
      for (const o of f.onGraph) (lines.get(o.mid) ?? lines.set(o.mid, []).get(o.mid)).push(o);
    }
  }
  return {
    lines,
    drawsProperty: (p) => byProperty.has(p),
    why: (x) => { const f = byProperty.get(x.property); return f ? notDrawnWhy(x, f.hs, c, f.drawnIds, f.namedIds) : 'none'; },
  };
}

/** A mark as the figures draw it, in CSS: dot, hollow (open), square (annealed), diamond (variant), coloured (claimed). */
export const tableMark = (marks) => `<i class="tm${marks.map((k) => ` tm--${k}`).join('')}" aria-hidden="true"></i>`;

/** Where the main page puts a value: a badge (with the mark it is drawn with) and, under it, why, in a few words. */
function drawnCell(x, c, ix) {
  const why = ix.why(x);
  if (why === 'none') return '<td class="drawn" data-why="none"></td>';
  if (why === 'drawn') {
    const lines = (ix.lines.get(x.id) ?? []).map((o) => {
      const reason = o.reason ? outOfMedianWords(o.reason, o.h) : null;
      const label = !reason ? 'In the median' : o.reason === 'as-published' ? 'Not compared' : 'Not in the median';
      const also = o.alsoFor ? alsoForWords(productNameOrId(o.e.g), o.e.v.from).trim() : '';
      return `<span class="bd${reason ? ' bd--apart' : ''}">${tableMark(o.marks)}${esc(label)}</span>${reason || also ? `<small>${esc(cap([reason, also].filter(Boolean).join('; ')))}</small>` : ''}`;
    });
    return `<td class="drawn" data-why="drawn">${lines.join('')}</td>`;
  }
  const label = why === 'named' ? 'Named in a sentence' : 'Not drawn';
  const reason = why === 'named' ? 'the only value of its test' : whyOne(why);
  return `<td class="drawn" data-why="${esc(why)}"><span class="bd bd--not">${esc(label)}</span><small>${esc(cap(reason))}</small></td>`;
}

/** The value as its document publishes it: a bound's sign, the number, ± its spread, the unit; words where it gave words. */
function valueCell(x) {
  const op = x.operator === '>' || x.operator === '<' ? `${x.operator} ` : '';
  const v = x.numeric
    ? `${esc(`${op}${fmtNumber(x.value)}`)}${unitText(x.unit) ? `<small>${esc(` ${unitText(x.unit)}`)}</small>` : ''}${x.uncertainty ? `<small class="pm">${esc(`± ${fmtNumber(x.uncertainty)}`)}</small>` : ''}`
    : x.qualitative && x.raw?.value ? `<span class="raw">${esc(x.raw.value)}</span><small> in words</small>`
      : `<span class="missing">${esc(STATUS_WORDS[x.dataStatus] ?? x.dataStatus ?? '')}</span>`;
  const tags = [x.quarantined ? 'held back' : null, x.implausible ? 'physically implausible' : null, x.corrected ? 'transcription corrected' : null].filter(Boolean);
  return `<td class="v">${v}${tags.map((t) => `<span class="tg">${esc(t)}</span>`).join('')}</td>`;
}

export default {
  id: 'measurements',
  title: 'Measurements',
  noun: 'measurement',
  count: (c) => c.ms.length,
  render(c) {
    const ix = drawnIndex(c);
    const name = (x) => productNameOrId(c.gradeById.get(x.gradeId) ?? { id: x.gradeId });
    const domainOf = new Map(DOMAINS.flatMap(([tab, key]) => tabProperties(tab, c.m).map((p) => [p, key])));
    const order = new Map(DOMAINS.flatMap(([tab]) => tabProperties(tab, c.m)).map((p, i) => [p, i]));
    const byProperty = new Map();
    for (const x of c.ms) (byProperty.get(x.property) ?? byProperty.set(x.property, []).get(x.property)).push(x);
    const properties = [...byProperty.keys()].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || a.localeCompare(b));

    // A heat deflection is three tests, not one: its values are grouped by their typed load (thermal.loadMPa), 0.45 MPa,
    // 1.8 MPa and any other, and those whose load is not stated, each with its own median. Any property the build reads
    // a test load for is split so.
    const loadOf = (x) => (x.thermal?.loadStated && Number.isFinite(x.thermal.loadMPa) ? x.thermal.loadMPa : 'none');
    const loadTitle = (p, load) => (load === 'none' ? `${propertyName(p)}, load not stated`
      : REGISTRY.allHeadlines.find((h) => h.loadMPa === load && h.valueProperties?.includes(p))?.labels.plain ?? `${propertyName(p)} at ${fmtNumber(load)} MPa`);
    const parts = (p) => {
      const xs = byProperty.get(p);
      if (!xs.some((x) => x.thermal)) return [[propertyName(p), xs]];
      const by = new Map();
      for (const x of xs) (by.get(loadOf(x)) ?? by.set(loadOf(x), []).get(loadOf(x))).push(x);
      return [...by].sort((a, b) => (a[0] === 'none') - (b[0] === 'none') || a[0] - b[0]).map(([load, ys]) => [loadTitle(p, load), ys, load]);
    };

    // Beside a group's median of the values it lists: the main page's, where it differs, and what it is over. That one
    // compares products on one basis (one value a product, its orientation and load), so the two need not agree.
    const median = (vs) => { const t = [...vs].sort((a, b) => a - b), k = t.length >> 1; return t.length % 2 ? t[k] : (t[k - 1] + t[k]) / 2; };
    const mainPage = (p, load, listed) => {
      const hs = REGISTRY.allHeadlines.filter((h) => h.kind === 'measurement' && h.valueProperties?.includes(p) && (h.loadMPa == null || h.loadMPa === load) && (load == null || load === 'none' ? h.loadMPa == null : true) && c.m.summary?.[h.key]?.n);
      if (!hs.length) return '';
      const parts = hs.map((h, i) => { const s = c.m.summary[h.key]; return { h, s, text: `${hs.length > 1 && h.direction ? `${h.direction} ` : ''}${fmtNumber(s.median)} ${h.unit} over ${i ? fmtNumber(s.n) : plural(s.n, 'compared product')}` }; });
      if (listed?.length > 1 && parts.every(({ s }) => fmtNumber(s.median) === fmtNumber(median(listed)))) return '';
      return `main page: ${parts.map((x) => x.text).join('; ')}`;
    };

    const group = (p, title, list, load = null) => {
      const xs = list.sort((a, b) => name(a).localeCompare(name(b)) || (b.value ?? -Infinity) - (a.value ?? -Infinity) || (a.id < b.id ? -1 : 1));
      // The unit most of its values are in is the group's; a value in another counts under its own (Izod in kJ/m² and J/m).
      const units = new Map();
      for (const x of xs.filter(countable)) (units.get(x.unit) ?? units.set(x.unit, []).get(x.unit)).push(x.value);
      const main = [...units].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? null;
      const figure = ix.drawsProperty(p);
      const oriented = xs.some((x) => orientationWords(x));
      const cols = [['Product', 'p'], ['Value', 'v'], ...(oriented ? [['Orien\u00adtation', 'or']] : []), ['Specimen and standard', 'sp'], ['Conditions', 'cd'],
        ...(figure ? [['On the main page', 'drawn']] : []), ['Document', 'src'], ['ID', 'id']];
      const rows = xs.map((x) => {
        const o = orientationWords(x);
        const std = standardWords(x);
        const n = countable(x) ? ` data-n="${x.value}"${x.unit !== main ? ` data-u="${esc(x.unit)}"` : ''}` : '';
        return `<tr data-mid="${esc(x.id)}" data-grade="${esc(x.gradeId)}"${o ? ` data-o="${esc(x.direction)}"` : ''}${n}>`
          + `<th scope="row">${esc(name(x))}</th>${valueCell(x)}${oriented ? `<td class="or">${esc(o)}</td>` : ''}`
          + `<td class="sp">${esc(specimenWords(x))}<small>${esc(std ?? 'no standard stated')}</small></td>`
          + `<td class="cd">${conditionChips(x)}</td>${figure ? drawnCell(x, c, ix) : ''}${sourceCell(c, x.sourceId, x.locator)}${idCell(x.id)}</tr>`;
      });
      return groupBlock({
        title, cols, rows, cls: 'rt--m',
        attrs: ` data-group="${esc(title)}" data-prop="${esc(p)}"${main ? ` data-unit="${esc(main)}"` : ''}`,
        stats: statsWords(xs.length, 'measurement', [...units].sort((a, b) => (a[0] === main ? -1 : b[0] === main ? 1 : 0))),
        aside: mainPage(p, load, units.get(main)),
        note: figure ? '' : 'No figure on the main page draws this property.',
      });
    };

    const domains = [...DOMAINS.map(([tab, key]) => [key, tab]), ['other', 'Other']]
      .map(([key, label]) => [key, label, properties.filter((p) => (domainOf.get(p) ?? 'other') === key)])
      .filter(([, , ps]) => ps.length);
    const body = domains.map(([key, label, ps]) => `<div class="dom" id="measurements-${key}"><h3 class="dom-h">${esc(label)}</h3>${ps.flatMap((p) => parts(p).map(([title, xs, load]) => group(p, title, xs, load))).join('')}</div>`).join('');
    return typeSection({
      id: 'measurements', title: 'Measurements', n: c.ms.length, noun: 'measurement', body,
      empty: 'No measurement is on file for this material.',
      note: '<p class="rs-note">Every measurement on file, as its document publishes it, grouped by property; a group\'s median and range are of the values it lists. The badge says whether the main page\'s figures draw a value and, if not, why.</p>',
    });
  },
};
