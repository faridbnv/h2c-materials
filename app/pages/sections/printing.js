// Printing on the H2C: what to set, what is needed and what goes wrong. Every temperature on one axis first (figures.js
// temperaturesFigure: the settings against the H2C's limits, and where a part softens); one sentence (findings.js
// the plate says the rest); the settings, what most products give beside the Bambu Lab Filament Guide's row (D88), or product by
// product where there are five or fewer (on the page's grid, common.js sheetFrame), from each product's print gate (grades[].print) and its profiles' AMS words; the products
// that need a hardened nozzle; what annealing makers publish; and what makers say about printing it, in their words.

import { esc, tableBox } from '../html.js';
import { indexDb, isProduct, stated, productNameOrId, makersOwn } from '../../js/ui/material-facts.js';
import { printWindows, typicalWindow } from '../../js/ui/material-stats.js';
import { hardenedShare } from '../../js/engine/products.js';
import { dryingWords, fmtNumber } from '../../js/ui/format.js';
import { settingWords, guideEnclosureWords, andList, windowText } from '../../js/ui/material-words.js';
import { onTheH2cRows, quoteOrder, instructive, nWords, fmtD, glue } from '../findings.js';
import { drawFigure, subhead, quote, quotes, productA, readerText, shortHeads, headA, sheetFrame, pageProducts, ACROSS_MAX } from './common.js';

/** The makers' topics about printing (db.meta.knowHow.topics), the order a print is set up in where makers tie. */
const PRINT_TOPICS = ['Printing advice', 'Warping and shrinkage', 'Moisture sensitivity', 'Nozzle wear', 'Adhesion between layers', 'Supports and removal', 'Odour and emissions'];
/** The environment categories about printing a part (evidence[].category): said here, not under Uses. */
export const PRINT_CATEGORIES = new Set(['print-quality', 'post-processing', 'moisture']);
// A statement in a maker's or another document's own words (makersOwn) is material-facts.js's since 2026-10-18, so the
// drawer's Environment counts the statements this page counts.
export { makersOwn };
/** A statement about the material in general (no product): this page's record, carrying its ID. */
export const general = (e) => !stated(e.gradeId);
const ANNEAL = /anneal|heat[- ]?treat|post[- ]?cur/i;
const SHOWN = 3;
/** A range's dash joined to its numbers, so it never breaks there (U+2060), once. */
const joinDash = (t) => String(t).replace(/(?<!\u2060)–(?!\u2060)/g, '\u2060–\u2060');
/** An annealing statement worth quoting first: a temperature, a time, an oven or a scale. */
const SCHEDULE = /\d\s?°C|\d\s?(?:min(?:utes)?|h|hours?)\b|oven|scal(?:e|ed|ing)|measure/i;

/** A grade's AMS words, from its profiles' routing (the maker's own statement, not Bambu Lab's "verify" notes). */
const amsOf = (c, g) => [...new Set(c.profiles.filter((p) => p.gradeId === g.id).map((p) => String(p.routing?.amsPublished ?? '').trim()).filter(stated))];

/** A setting's cell, product by product: its words, greyed where read from a sheet it shares or from the guide. */
function productCell(g, axis, label = '') {
  const p = g.print ?? {};
  const from = p.from?.[axis === 'hardened' ? 'hardenedNozzle' : axis];
  let words;
  if (axis === 'drying') words = dryingWords(p.drying);
  // A standard nozzle only where a sheet says so; the guide's "any size or material" is the guide's, said as such.
  else if (axis === 'hardened') words = p.hardenedNozzle === true ? 'hardened' : p.hardenedNozzle === false ? (from?.origin === 'guide' ? 'any' : 'standard') : 'not stated';
  else if (axis === 'chamber' && ['not-required', 'ambient'].includes(p.chamber?.state)) words = 'none needed';
  // A chamber its sheets leave silent, read as within from what the makers of its kind of plastic state (D151).
  else if (axis === 'chamber' && from?.origin === 'family') words = 'not stated; within, by its kind';
  else words = p[axis] ? settingWords(p[axis]) : 'not published';
  const title = from?.label ?? (from?.origin === 'guide' ? 'from the Bambu Lab Filament Guide' : null);
  return `<td${from ? ' class="from"' : ''} data-label="${esc(label)}"${title ? ` title="${esc(title)}"` : ''}>${esc(glue(joinDash(words)))}</td>`;
}

/** The guide's row, as it prints it, a cell per setting (D88). */
function guideCells(g) {
  const lines = (t) => String(t ?? '').split(/(?<=\))\s+(?=[A-Z])/).map(esc).join('<br>');
  return {
    nozzle: lines(g.nozzle?.text), bed: lines(g.bed?.text),
    chamber: esc(g.chamber?.state === 'enclosed' ? 'enclosure required' : `enclosure ${guideEnclosureWords(g.enclosureState)}`),
    drying: esc(g.drying ? dryingWords(g.drying) : 'not stated'),
    hardened: esc(g.abrasion?.requiresHardened === true ? 'hardened' : g.abrasion?.requiresHardened === false ? 'any' : 'not stated'),
    ams: '—',
  };
}

/** The settings table: what most products give and the guide's row, or each product's under six products. */
function settingsTable(c) {
  const m = c.m;
  const products = pageProducts(c);
  const rows = onTheH2cRows(c);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  // The AMS: a row only where two products' sheets or more speak to it; one product's word is on its card.
  const amsSaid = products.map((g) => [g, amsOf(c, g)]).filter(([, t]) => t.length);
  const LABELS = [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Heated chamber'], ['drying', 'Drying'], ['hardened', 'Nozzle type'], ...(amsSaid.length >= 2 ? [['ams', 'AMS']] : [])];
  if (products.length <= ACROSS_MAX) {
    // Product by product, on the grid of the page's other product tables (common.js sheetFrame): the same products, in
    // the same order, under the same heads.
    const anyFrom = products.some((g) => Object.keys(g.print?.from ?? {}).length);
    const short = shortHeads(products);
    const head = `<tr><th scope="col" class="prop">Setting</th>${products.map((g) => `<th scope="col" class="col-p">${headA(c, g, short.get(g.id))}</th>`).join('')}</tr>`;
    const body = LABELS.map(([k, label]) => `<tr data-print="${k}"><th scope="row" class="prop">${esc(label)}</th>${products.map((g) => (k === 'ams'
      ? `<td data-label="${esc(short.get(g.id))}">${esc(amsOf(c, g).map((t) => `"${t}"`).join('; ') || 'not stated')}</td>` : productCell(g, k, short.get(g.id)))).join('')}</tr>`).join('');
    return sheetFrame(`<thead>${head}</thead><tbody>${body}</tbody>`, products.length, 'across', 'settings settings--each')
      + (anyFrom ? `<p class="sec-note">${esc(`In grey, a setting a product reads from a data sheet it shares or from the Bambu Lab Filament Guide, where its own sheet is silent${products.some((g) => g.print?.from?.chamber?.origin === 'family') ? ', or a chamber all of them leave silent, read from what the makers of its kind of plastic state' : ''}.`)}</p>` : '');
  }
  // What most products give: the plate's rows, with the chamber's given windows and the AMS statements beside them.
  const ch = printWindows(products, 'chamber');
  const chw = typicalWindow(ch);
  const chamberGiven = chw ? `${windowText(chw.from, chw.to)} °C` : null;
  // The AMS: how many sheets name it, the rest silent, and one product's words as an example.
  const [ex, exWords] = amsSaid[0] ?? [];
  const amsWords = amsSaid.length >= 2
    ? `${amsSaid.length === products.length ? `All ${fmtNumber(products.length)}` : fmtNumber(amsSaid.length)} products' sheets name it${amsSaid.length < products.length ? '; the rest are silent' : ''}. ${productNameOrId(ex)}: "${exWords.join('; ')}"`
    : '';
  const most = {
    nozzle: byKey.nozzle, bed: byKey.bed,
    chamber: { value: byKey.chamber.value === 'none needed' && chamberGiven ? `none; sheets that give one say ${chamberGiven}` : byKey.chamber.value, note: byKey.chamber.note },
    drying: byKey.drying, hardened: byKey.hardened,
    ams: { value: amsWords, note: '' },
  };
  const guide = c.guide ? guideCells(c.guide) : null;
  const mostLabel = `Most ${m.name} products`;
  const cell = (r) => `<td data-label="${esc(mostLabel)}">${esc(glue(joinDash(String(r?.value ?? 'not published'))))}${r?.note ? ` <span class="set-note">${esc(glue(r.note))}</span>` : ''}</td>`;
  const head = `<tr><th scope="col" class="prop">Setting</th><th scope="col">${esc(`Most ${m.name} products`)}</th>${guide ? `<th scope="col">${esc(c.guide.name ?? 'Bambu Lab Filament Guide')}</th>` : ''}</tr>`;
  const body = LABELS.map(([k, label]) => `<tr data-print="${k}"><th scope="row" class="prop">${esc(label)}</th>${cell(most[k])}${guide ? `<td class="guide" data-label="${esc(c.guide.name ?? 'Bambu Lab Filament Guide')}">${glue(guide[k])}</td>` : ''}</tr>`).join('');
  const type = c.guide?.guideType;
  const why = type && type !== m.name ? String(c.guide.materials?.find((x) => x.materialId === m.id)?.reason ?? '').replace(/\s*(?:since\s+)?m\d+\s*\(D\d+\)/g, '').replace(/\s*\(D\d+\)/g, '').trim() : '';
  const notes = [
    'Where a product\'s own sheet is silent, its setting comes from a sheet it shares or from the Bambu Lab Filament Guide; each product\'s card says which.',
    type && type !== m.name ? `The guide has no column named ${m.name}; its ${type} column is shown.${why && readerText(why) ? ` ${why.charAt(0).toUpperCase()}${why.slice(1)}${/\.$/.test(why) ? '' : '.'}` : ''}` : null,
  ].filter(Boolean);
  return `${tableBox(`<table class="grid settings"><thead>${head}</thead><tbody>${body}</tbody></table>`)}<p class="sec-note">${esc(notes.join(' '))}</p>`;
}

/** The products that need a hardened nozzle, by name, where some do and the table does not name them. */
function hardenedLine(c) {
  const hard = hardenedShare(c.grades);
  if (!hard.need || hard.need === hard.total || hard.total < 6) return '';
  const names = hard.needing.map((g) => productA(c, g));
  const list = names.length <= 8 ? names : [...names.slice(0, 7), `${names.length - 7} more`];
  return `<p class="sec-p"><b>${esc('Hardened nozzle.')}</b> ${esc(`${hard.need === 1 ? 'One product needs' : `${nWords(hard.need, 'product').replace(/^./, (x) => x.toUpperCase())} need`} one:`)} ${list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0]}.</p>`;
}

/** A schedule in a reader's words: "110 °C for 20 min", "50 °C for 8 h". */
const schedule = (a) => `${fmtD(a.tempC, '°C')}${a.hours != null ? ` for ${a.hours < 1 ? `${Math.round(a.hours * 60)} min` : `${fmtD(a.hours)} h`}` : ''}`;

/** After printing: the annealing schedules products publish values after, and what makers say about annealing. */
function afterPrinting(c, statements, used) {
  const products = c.grades.filter((g) => isProduct(g) && !g.retired);
  const annealed = products.filter((g) => (g.print?.anneal ?? []).length);
  const scheds = annealed.flatMap((g) => g.print.anneal.filter((a) => a.tempC != null)).sort((a, b) => a.tempC - b.tempC || (b.hours ?? 0) - (a.hours ?? 0));
  const said = quoteOrder(statements.filter((k) => ANNEAL.test(k.text)), c, { prefer: SCHEDULE, perProduct: true }).slice(0, SHOWN);
  for (const k of said) used.add(k.id);
  const envProduct = c.ev.filter((e) => makersOwn(e) && e.category === 'post-processing' && !general(e) && readerText(e.finding));
  const envGeneral = c.ev.filter((e) => makersOwn(e) && e.category === 'post-processing' && general(e));
  const envQuoted = quoteOrder(envProduct.map((e) => ({ ...e, text: e.finding })).filter((e) => ANNEAL.test(e.text)), c, { prefer: SCHEDULE, perProduct: true }).slice(0, Math.max(0, SHOWN - said.length));
  if (!annealed.length && !said.length && !envGeneral.length && !envQuoted.length) return '';
  const lead = annealed.length && scheds.length
    ? `${nWords(annealed.length, 'product').replace(/^./, (x) => x.toUpperCase())} ${annealed.length === 1 ? 'publishes' : 'publish'} values measured after annealing${scheds.length > 1 && schedule(scheds[0]) !== schedule(scheds.at(-1)) ? `, on schedules from ${schedule(scheds[0])} to ${schedule(scheds.at(-1))}` : `, at ${schedule(scheds[0])}`}.`
    : annealed.length ? `${nWords(annealed.length, 'product').replace(/^./, (x) => x.toUpperCase())} ${annealed.length === 1 ? 'publishes' : 'publish'} values measured after annealing.` : '';
  return `${subhead('After printing')}${lead ? `<p class="sec-p">${esc(lead)}</p>` : ''}${quotes([...said.map((k) => quote(c, k)), ...envQuoted.map((e) => quote(c, e, { text: e.finding })), ...envGeneral.map((e) => quote(c, e, { text: e.finding, rec: true }))])}`;
}

/**
 * What makers say about printing it: by topic, the instructive statements first (findings.js quoteOrder). A topic whose
 * makers instruct is open, up to three; one where they only claim is behind the fold, its best claim the maker's.
 */
function makersOnPrinting(c, statements, used) {
  const m = c.m;
  const counts = m.knowHow?.topics ?? {};
  const all = statements.filter((k) => PRINT_TOPICS.includes(k.topic) && !used.has(k.id));
  const every = all.length <= 12;
  const ordered = new Map(PRINT_TOPICS.map((t) => [t, quoteOrder(all.filter((k) => k.topic === t), c)]).filter(([, l]) => l.length));
  const topics = [...ordered.keys()]
    .sort((a, b) => (instructive(ordered.get(b)[0].text) ? 1 : 0) - (instructive(ordered.get(a)[0].text) ? 1 : 0)
      || (counts[b]?.makers ?? 0) - (counts[a]?.makers ?? 0) || PRINT_TOPICS.indexOf(a) - PRINT_TOPICS.indexOf(b));
  const block = (t) => {
    const list = ordered.get(t);
    const shown = every ? list : list.slice(0, 1);
    return `<div class="said-topic"><h4>${esc(t)}</h4>${quotes(shown.map((k) => quote(c, k)))}</div>`;
  };
  // Statements about the material in general on printing it (a printer maker's or a guide's), this page's records.
  const generalSaid = c.ev.filter((e) => makersOwn(e) && general(e) && ['print-quality', 'moisture'].includes(e.category));
  if (!topics.length && !generalSaid.length) return '';
  const instructs = topics.filter((t) => instructive(ordered.get(t)[0].text));
  const open = (every ? instructs.slice(0, 3) : instructs.slice(0, 2));
  const rest = topics.filter((t) => !open.includes(t));
  const gen = generalSaid.length ? `<div class="said-topic"><h4>${esc(`On ${m.name} in general`)}</h4>${quotes(generalSaid.map((e) => quote(c, e, { text: e.finding, rec: true, extra: stated(e.topic) && !/rubric/i.test(e.topic) ? e.topic : '' })))}</div>` : '';
  return `${subhead('What makers say about printing it')}${open.length || gen ? `<div class="said-topics">${open.map(block).join('')}${gen}</div>` : ''}`
    + (rest.length ? `<details class="more"><summary>${esc(`${open.length || gen ? 'More from makers' : 'From makers'}: ${andList(rest.map((t) => t.toLowerCase()))}`)}</summary><div class="said-topics">${rest.map(block).join('')}</div></details>` : '');
}

export default {
  id: 'printing',
  title: 'Printing on the H2C',
  render(c, env = {}) {
    const products = c.grades.filter((g) => isProduct(g) && !g.retired);
    if (!products.length || (!c.profiles.length && !products.some((g) => g.print?.profileIds?.length || Object.keys(g.print?.from ?? {}).length))) return { empty: true, html: '', stats: {} };
    const fig = drawFigure('temperaturesFigure', c, env, {});
    const byGrade = (env.index ?? indexDb(c.db)).knowHowByGrade;
    const statements = products.flatMap((g) => byGrade.get(g.id) ?? []);
    const used = new Set();
    const after = afterPrinting(c, statements, used);
    const html = glue([
      fig.empty ? '' : fig.html,
      settingsTable(c),
      hardenedLine(c),
      after,
      makersOnPrinting(c, statements, used),
    ].filter(Boolean).join('\n'));
    return { empty: false, html, stats: { figures: fig.empty ? 0 : (fig.stats?.figures ?? 1), dots: fig.stats?.dots ?? 0 } };
  },
};
