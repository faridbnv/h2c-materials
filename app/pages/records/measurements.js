// Every measurement of the material, by domain and property in the registry's order, with its value as published, the
// conditions its record holds, whether a figure on the material page draws it (and, if not, why: the build's own
// reason, material-facts.js notDrawnWhy, in labels.js whyOne's words), its document and its ID.

import { esc } from '../html.js';
import { STATUS_WORDS, propertyName, whyOne } from '../../js/ui/labels.js';
import { tabProperties, comparisonsOf, notDrawnWhy, productNameOrId, measurementFacts } from '../../js/ui/material-facts.js';
import { measuredValue, outOfMedianWords, alsoForWords, changedState, testGuessHead, conditionLine, cap } from '../../js/ui/material-words.js';
import { keyMark } from '../charts/marks.js';
import { recordTable, headRow, sourceCell, idCell, fold } from './common.js';

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
    why: (x) => { const f = byProperty.get(x.property); return f ? notDrawnWhy(x, f.hs, c, f.drawnIds, f.namedIds) : 'none'; },
  };
}

/** The Drawn cell: the mark it is drawn with and where it sits, or why it is not drawn. */
function drawnCell(x, c, ix) {
  const why = ix.why(x);
  if (why === 'drawn') {
    const lines = (ix.lines.get(x.id) ?? []).map((o) => {
      const place = o.reason ? `drawn, not in the median (${outOfMedianWords(o.reason, o.h)})` : 'drawn, in the median';
      const state = changedState(x, o.e.v);
      return `<span class="drawn-line">${keyMark(o.marks)}<span>${esc(`${place}${o.alsoFor ? alsoForWords(productNameOrId(o.e.g), o.e.v.from) : ''}.`)}${state.length ? `<span class="loc">${esc(`${cap(state.join(', '))}.`)}</span>` : ''}</span></span>`;
    });
    return `<td class="drawn" data-why="drawn">${lines.join('')}</td>`;
  }
  const words = why === 'named' ? 'named on the page, the only value of its test' : why === 'none' ? 'no figure draws this property' : `not drawn: ${whyOne(why)}`;
  return `<td class="drawn" data-why="${esc(why)}">${esc(words)}</td>`;
}

function valueCell(x) {
  const op = x.operator === '>' || x.operator === '<' ? `${x.operator} ` : '';
  const v = x.numeric ? esc(`${op}${measuredValue(x).trim()}`)
    : x.qualitative && x.raw?.value ? `<span class="raw">${esc(x.raw.value)}</span> <span class="tag">in words</span>`
      : `<span class="missing">${esc(STATUS_WORDS[x.dataStatus] ?? x.dataStatus ?? '')}</span>`;
  const tags = [x.quarantined ? 'held back' : null, x.implausible ? 'physically implausible' : null, x.corrected ? 'transcription corrected' : null].filter(Boolean);
  return `<td class="num v">${v}${tags.map((t) => ` <span class="tag">${esc(t)}</span>`).join('')}</td>`;
}

export default {
  id: 'measurements',
  title: 'Measurements',
  noun: 'measurement',
  count: (c) => c.ms.length,
  render(c) {
    const ix = drawnIndex(c);
    const order = new Map();
    let i = 0;
    for (const [tab] of DOMAINS) for (const p of tabProperties(tab, c.m)) order.set(p, i++);
    const domainOf = new Map(DOMAINS.flatMap(([tab, key]) => tabProperties(tab, c.m).map((p) => [p, key])));
    const name = (x) => productNameOrId(c.gradeById.get(x.gradeId) ?? { id: x.gradeId });
    const sorted = [...c.ms].sort((a, b) => (order.get(a.property) ?? 1e9) - (order.get(b.property) ?? 1e9) || a.property.localeCompare(b.property)
      || name(a).localeCompare(name(b)) || (b.value ?? -Infinity) - (a.value ?? -Infinity) || (a.id < b.id ? -1 : 1));
    const groups = [...DOMAINS.map(([tab, key]) => [key, tab]), ['other', 'Other']].map(([key, label]) => [key, label, sorted.filter((x) => (domainOf.get(x.property) ?? 'other') === key)]).filter(([, , xs]) => xs.length);
    // The conditions its record holds: orientation, specimen, standard, moisture and notch on one line (the drawer's), then
    // post-processing, test temperature and the specimen's print settings, folded where long.
    const more = (x) => {
      const f = measurementFacts(x, c);
      if (!f.more.length) return '<td class="raw none">—</td>';
      const text = f.more.map(([k, t]) => `${k}: ${t}`).join('. ');
      return `<td class="raw">${fold(text, 60, f.more.map(([k, t]) => `<b>${esc(k)}:</b> ${esc(t)}`).join('<br>'))}</td>`;
    };
    const row = (x) => `<tr data-mid="${esc(x.id)}" data-grade="${esc(x.gradeId)}"><th scope="row">${esc(propertyName(x.property))}${x.testGuess ? `<span class="loc">${esc(testGuessHead(x.testGuess))}</span>` : ''}</th>`
      + `<td>${esc(name(x))}</td>${valueCell(x)}<td>${esc(conditionLine(x) || '—')}</td>${more(x)}`
      + drawnCell(x, c, ix) + sourceCell(c, x.sourceId, x.locator) + idCell(x.id) + '</tr>';
    const head = headRow([['Property'], ['Product'], ['Value', 'num'], ['Conditions'], ['Also recorded'], ['On the page'], ['Document'], ['ID']]);
    const rows = groups.map(([key, label, xs]) => `<tbody id="measurements-${key}"><tr class="group"><th scope="rowgroup" colspan="8">${esc(`${label}: ${xs.length}`)}</th></tr>${xs.map(row).join('')}</tbody>`).join('');
    return recordTable({
      id: 'measurements', title: 'Measurements', n: c.ms.length, noun: 'measurement', head, rows,
      empty: 'No measurement is on file for this material.', widths: [11, 13, 11, 18, 14, 14, 13, 6],
      note: '<p class="rec-note">Each value as its document publishes it, with the conditions recorded beside it. On the page says whether a figure draws it, with the mark it is drawn with, or why it is not drawn.</p>',
    });
  },
};

