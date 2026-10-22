// *On the H2C* in brief: a material's print settings as most of its products give them, each with who gives it. The
// material page's plate and settings table (app/pages, D145) and, since 2026-10-18, the selector's drawer print this one
// block from these functions, so the two never give two numbers for one setting (the PLA nozzle had read 260, 210 and
// 190–230 °C in the drawer beside the page's 195–230 °C). Display only: nothing here decides anything.

import type { Loose } from '../loose.ts';

import { fmtNumber, dryingWords } from './format.ts';
import { printWindows, dryingStats, dryingAdvice, typicalWindow } from './material-stats.ts';
import { plural, andList, windowText, h2cLimitsText } from './material-words.ts';
import { productsOf, dryingSchedule } from './material-highlights.ts';
import { printCounts } from './material-facts.ts';

/** A number held to its unit by a no-break space (U+00A0), so "0.45 MPa" or "350 °C" never breaks across lines. */
const UNIT = /(\d)[ \t]+(?=(?:°C|°F|MPa|GPa|kPa|kJ\/m²|J\/m|kg\/m³|g\/cm³|g\/10\s?min|cm³\/10\s?min|%|h\b|min\b|s\b|CAD\/kg|CAD\b|USD\b|EUR\b|mm\b|µm|kg\b|Shore\b))/g;
export const glue = (t: Loose) => String(t ?? '').replace(UNIT, '$1\u00a0');

/** Small numbers in words, as prose prints them: "two products", "12 products". */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const countWords = (n: Loose) => (n >= 0 && n < WORDS.length ? WORDS[n] : fmtNumber(n));

/** The products' window of one setting, with who gives it: { value, note }, or null where none is published. */
function windowRow(products: Loose, axis: Loose): Loose {
  const pw = printWindows(products, axis);
  const total = products.length;
  const unit = (from: Loose, to: Loose) => `${windowText(from, to)} °C`;
  const all = (n: Loose) => (n === total ? (n === 2 ? 'both products' : `all ${fmtNumber(n)} products`) : n === 2 ? 'both that give one' : `all ${fmtNumber(n)} that give one`);
  const lows = pw.ends.filter((e: Loose) => e.min != null && e.max == null), highs = pw.ends.filter((e: Loose) => e.max != null && e.min == null);
  const endWords = (): Loose => [lows.length ? `${countWords(lows.length)} ${lows.length === 1 ? 'gives' : 'give'} at least ${fmtNumber(Math.min(...lows.map((e: Loose) => e.min)))} °C` : null,
    highs.length ? `${countWords(highs.length)} ${highs.length === 1 ? 'gives' : 'give'} up to ${fmtNumber(Math.max(...highs.map((e: Loose) => e.max)))} °C` : null].filter(Boolean);
  if (!pw.n) {
    if (lows.length) return { value: `at least ${fmtNumber(Math.min(...lows.map((e: Loose) => e.min)))} °C`, note: `${countWords(lows.length)} ${lows.length === 1 ? 'product' : 'products'}`, pw };
    return null;
  }
  if (pw.n === 1) {
    const w = pw.windows.find((x: Loose) => x.counted);
    const ends = endWords();
    return { value: unit(w.min, w.max), note: `one product${ends.length ? `; ${andList(ends)}` : ''}`, pw };
  }
  const r = typicalWindow(pw);
  if (r.share === 'all') return { value: unit(r.from, r.to), note: all(pw.n), pw };
  if (r.share === 'most') return { value: unit(r.from, r.to), note: 'most products that give one', pw };
  return { value: unit(r.from, r.to), note: `${fmtNumber(r.k)} of ${fmtNumber(pw.n)} that give one`, pw };
}

/** The heated chamber in brief: none needed, or the window most give. */
function chamberRow(products: Loose): Loose {
  const pw = printWindows(products, 'chamber');
  const total = products.length;
  const none = (pw.states.get('not-required') ?? 0) + (pw.states.get('ambient') ?? 0);
  const limit = pw.limit;
  if (none && (none * 2 >= total || !pw.n)) {
    const note = none === total ? (total === 1 ? 'its one product' : total === 2 ? 'both products' : `all ${fmtNumber(total)} products`) : `${fmtNumber(none)} of ${fmtNumber(total)} products`;
    const w = windowRow(products, 'chamber');
    return { value: 'none needed', note, given: pw.n ? w : null, pw };
  }
  const w = windowRow(products, 'chamber');
  if (!w) return { value: 'not stated', note: '', pw };
  // Said beyond the limit only where the window shown goes past it, not where another product's does.
  const top = Number(String(w.value).match(/(\d+)\D*$/)?.[1]);
  return { ...w, note: `${w.note}${limit != null && top > limit ? `; beyond the H2C's ${fmtNumber(limit)} °C` : ''}` };
}

/** A drying schedule as the products give it: one schedule, or the span where they differ ("100–140 °C, 6–8 h"). */
export function dryingSpanWords(d: Loose) {
  if (!d) return '';
  const span = (lo: Loose, hi: Loose, unit: Loose) => (lo === hi ? `${fmtNumber(lo)} ${unit}` : `${fmtNumber(lo)}–${fmtNumber(hi)} ${unit}`);
  const t = span(d.tempMin ?? d.tempC, d.tempMax ?? d.tempC, '°C');
  if (d.hoursMin == null) return t;
  return d.hoursMin === d.hoursMax ? `${t} for ${span(d.hoursMin, d.hoursMax, 'h')}` : `${t}, ${span(d.hoursMin, d.hoursMax, 'h')}`;
}

/** Drying in brief: the typical schedule of the products whose own or shared sheet gives one, and what most ask. */
function dryingRow(c: Loose, products: Loose): Loose {
  const d = dryingStats(products);
  const a = dryingAdvice(products);
  const total = products.length;
  // Those that give it as optional are said beside those that call for it, so the count squares with the schedule's
  // products (PEI-CF: "1 of 3 products calls for it", then "2 products" in the figure; C15).
  const optional = a.needs.optional ? `; ${fmtNumber(a.needs.optional)} more ${a.needs.optional === 1 ? 'gives' : 'give'} it as optional` : '';
  const asks = a.needs.required >= a.needs.optional
    ? (a.needs.required === total ? (total === 1 ? 'its product calls for it' : total === 2 ? 'both products call for it' : `all ${fmtNumber(total)} products call for it`) : `${fmtNumber(a.needs.required)} of ${fmtNumber(total)} products ${a.needs.required === 1 ? 'calls' : 'call'} for it${optional}`)
    : 'most advise it only for wet filament';
  if (d.temps.n) return { value: glue(dryingSpanWords(dryingSchedule(products))), note: a.have ? asks : '', d, a };
  if (a.needs['not-needed'] && a.needs['not-needed'] * 2 >= a.have) return { value: 'not needed', note: total === 1 ? 'its product says so' : `${fmtNumber(a.needs['not-needed'])} of ${fmtNumber(total)} products ${a.needs['not-needed'] === 1 ? 'says' : 'say'} so`, d, a };
  const g = c.guide?.drying;
  if (g?.tempC != null) return { value: dryingWords(g), note: 'the Bambu Lab Filament Guide', d, a };
  return { value: c.m.gates?.drying === 'not-needed' ? 'not needed' : 'not stated', note: '', d, a };
}

/**
 * What the sheets say about the nozzle (grades[].print.hardenedNozzle and where it was read, .from.hardenedNozzle):
 * `{ ask, standard, guideAsk, guideAny, silent, total }`, the products whose own or shared sheet asks for a hardened
 * nozzle or says a standard one is enough, those whose setting is the Bambu Lab Filament Guide's, and those that say nothing.
 */
export function nozzleSay(products: Loose): Loose {
  const n = { ask: 0, standard: 0, guideAsk: 0, guideAny: 0, silent: 0, total: products.length };
  for (const g of products) {
    const v = g.print?.hardenedNozzle, guide = g.print?.from?.hardenedNozzle?.origin === 'guide';
    if (v === true) n[guide ? 'guideAsk' : 'ask']++;
    else if (v === false) n[guide ? 'guideAny' : 'standard']++;
    else n.silent++;
  }
  return n;
}

/**
 * The nozzle in brief, by what the sheets state, never by their silence: "hardened" where sheets that say ask for one,
 * "standard" only where sheets say a standard nozzle is enough, and "not stated" where none says.
 */
function nozzleTypeRow(c: Loose): Loose {
  const n = nozzleSay(productsOf(c));
  const of = (k: Loose) => `${fmtNumber(k)} of ${plural(n.total, 'product')}`;
  const bits = [n.ask ? `${of(n.ask)}' sheets ${n.ask === 1 ? 'asks' : 'ask'} for one` : null, n.standard ? `${fmtNumber(n.standard)} ${n.standard === 1 ? 'says' : 'say'} a standard nozzle is enough` : null,
    n.guideAsk || n.guideAny ? `the Bambu Lab Filament Guide says ${n.guideAsk ? 'hardened' : 'any'} for ${fmtNumber(n.guideAsk + n.guideAny)} more` : null,
    n.silent && (n.ask || n.standard || n.guideAsk || n.guideAny) ? 'the rest are silent' : null].filter(Boolean);
  const note = bits.join('; ').replace(/^1 of (\d[\d,]*) products' sheets asks/, 'one of $1 products\' sheets asks').replace(/^(\d[\d,]*) of (\d[\d,]*) products' sheets ask(?!s)/, (all, k, t) => (k === t ? (t === '1' ? 'its sheet asks' : `all ${t} products' sheets ask`) : all));
  let value: Loose;
  if (n.ask && n.ask >= n.standard) value = n.standard ? 'hardened for most' : 'hardened';
  else if (n.ask) value = 'standard for most';
  else if (n.standard) value = 'standard';
  else if (n.guideAsk) value = 'hardened, by the guide';
  else if (n.guideAny) value = 'any, by the guide';
  else value = 'not stated';
  return { value, note, n };
}

/**
 * The *On the H2C* plate's rows, in the order a print is set up: `[{ key, label, value, note }]` for the nozzle, bed,
 * heated chamber, drying and nozzle type. Plain text. `note` says who gives it ("most products that give one").
 */
export function onTheH2cRows(c: Loose): Loose {
  const products = productsOf(c);
  const out: Loose[] = [];
  const nozzle = windowRow(products, 'nozzle'), bed = windowRow(products, 'bed'), chamber = chamberRow(products), drying = dryingRow(c, products), type = nozzleTypeRow(c);
  out.push({ key: 'nozzle', label: 'Nozzle', value: nozzle?.value ?? 'not published', note: nozzle?.note ?? '' });
  out.push({ key: 'bed', label: 'Bed', value: bed?.value ?? 'not published', note: bed?.note ?? '' });
  out.push({ key: 'chamber', label: 'Heated chamber', value: chamber.value, note: chamber.note });
  out.push({ key: 'drying', label: 'Drying', value: drying.value, note: drying.note });
  out.push({ key: 'hardened', label: 'Nozzle type', value: type.value, note: type.note });
  return out.map((r) => ({ ...r, value: glue(r.value), note: glue(r.note) }));
}

/**
 * Whether any product asks for more than the H2C gives, in one line (material-facts.js printCounts): "No product's
 * setting is beyond the H2C's limits: nozzle 350 °C, bed 120 °C, heated chamber 65 °C." or "Beyond the H2C's limits
 * (…): nozzle for 2 products and chamber for 1 product." The material page's On the H2C foot (moved from
 * app/pages/sections/masthead.js, 2026-10-18, C01); the drawer's Printing tab names the products beyond, in the same
 * words (material-words.js printLines).
 */
export function beyondLimitsLine(grades: Loose) {
  const pc = printCounts(grades);
  if (!pc) return '';
  const limits = h2cLimitsText(pc.axes);
  const over = pc.axes.filter((a: Loose) => a.over);
  if (!over.length) return `No product's setting is beyond the H2C's limits: ${limits}.`;
  // Said once, short: the head already says a material beyond the H2C's capability is (the second review).
  return `Beyond the H2C's limits (${limits}): ${andList(over.map((a: Loose) => `${a.axis === 'chamber' ? 'chamber' : a.axis} for ${plural(a.over, 'product')}`))}.`;
}
