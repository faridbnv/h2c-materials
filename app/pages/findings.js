// The Overview's words: every sentence a material's page says in its own voice, from the facts layer (material-facts.js,
// material-stats.js, material-highlights.js) and the compiled fields, never typed. The rules are content/PROPOSAL.md's
// (docs/audits/2026-10-17-pages-reimagined): the answer first, one idea a sentence, a caveat said once (the evidence
// line), the fact rather than the bookkeeping, engineering terms kept and the project's own words left out.
//
// A sentence is a Say: `{ text, html, toString() }`, the plain words and the same words as markup, each compiled value
// in it wrapped `<span data-v="<unrounded>" data-key="<headline key>" data-stat="median|q1|q3|min|max|n|product">` so the
// page check can hold it to the facts. Build one with the `say` tag and `num` (or `plain`), join them with `joinSay` and
// `andSay`. Nothing here decides anything or judges a product.
//
// The contract with the frame (track A): identitySentence, evidenceLine, onTheH2cRows, onTheH2cLine, standOutLines and
// productsHandoffWords, each from a material's context (material-facts.js materialContext).

import { esc, attrs } from './html.js';
import * as NUMBERS from './numbers.js';
import { fmtNumber, dryingWords, priceSampleWords, readableUnit } from '../js/ui/format.js';
import { REGISTRY } from '../js/ui/registry.js';
import { propertyName, envVerdictWords } from '../js/ui/labels.js';
import { identity, productNameOrId, printFacts, printCounts, priceRows, stated, groupByMaker } from '../js/ui/material-facts.js';
import { printWindows, dryingStats, dryingAdvice, compareMedians, printsAmorphous, heatLadder, typicalWindow } from '../js/ui/material-stats.js';
import { plural, lower, cap, andList, windowText, scheduleWords } from '../js/ui/material-words.js';
import { evidenceTier, standOut, standOutProducts, standing, productsOf, KEY_FIGURES, dryingSchedule } from '../js/ui/material-highlights.js';

// ------------------------------------------------------------------ sentences with their numbers marked

const SAY = Symbol('say');
/** A number held to its unit by a no-break space (U+00A0), so "0.45 MPa" or "350 °C" never breaks across lines. */
const UNIT = /(\d)[ \t]+(?=(?:°C|°F|MPa|GPa|kPa|kJ\/m²|J\/m|kg\/m³|g\/cm³|g\/10\s?min|cm³\/10\s?min|%|h\b|min\b|s\b|CAD\/kg|CAD\b|USD\b|EUR\b|mm\b|µm|kg\b|Shore\b))/g;
export const glue = (t) => String(t ?? '').replace(UNIT, '$1\u00a0');
const mk = (text, html) => ({ [SAY]: true, text: glue(text), html: glue(html), toString() { return glue(text); } });
/** Whether `x` is a Say. */
export const isSay = (x) => !!x?.[SAY];
/** Plain words as a Say. */
export const plain = (t) => mk(String(t ?? ''), esc(String(t ?? '')));
/** Raw markup as a Say (a link, an element): its text is its markup's text. */
export const markup = (html, text) => mk(text ?? String(html).replace(/<[^>]*>/g, ''), html);

/** A display number: the facts layer's value as the Overview prints it (numbers.js fmtDisplay where it has landed). */
export const fmtD = (v, unit) => (typeof NUMBERS.fmtDisplay === 'function'
  ? (unit ? `${NUMBERS.fmtDisplay(v, unit)}\u00a0${unit}` : NUMBERS.fmtDisplay(v))
  : glue(fmtNumber(v, unit)));

/**
 * A compiled value in a sentence: its display form, marked with the unrounded value and the field it states (`key` a
 * headline key, `stat` the summary's field: median, q1, q3, min, max, n; or 'product' with `grade`). Without `key` it is
 * a display statistic (a share, a window, a count of records) and is not marked.
 */
export function num(value, { key = null, stat = 'median', unit = null, grade = null, shown = null } = {}) {
  const text = shown ?? fmtD(value, unit);
  if (!key) return plain(text);
  return mk(text, `<span${attrs({ 'data-v': value, 'data-key': key, 'data-stat': stat, 'data-grade': grade })}>${esc(text)}</span>`);
}

/** A sentence from a template: interpolated Says keep their markup, anything else is escaped. */
export function say(strings, ...vals) {
  let text = '', html = '';
  strings.forEach((s, i) => {
    text += s;
    html += esc(s);
    if (i >= vals.length) return;
    const v = vals[i];
    if (isSay(v)) { text += v.text; html += v.html; } else if (v != null && v !== false) { text += String(v); html += esc(String(v)); }
  });
  return mk(text, html);
}
/** Says joined by a separator. */
export const joinSay = (parts, sep = ' ') => { const xs = parts.filter((p) => p && (isSay(p) ? p.text : p)).map((p) => (isSay(p) ? p : plain(p))); return mk(xs.map((p) => p.text).join(sep), xs.map((p) => p.html).join(esc(sep))); };
/** Says as a list in prose: "a", "a and b", "a, b and c". */
export function andSay(parts) {
  const xs = parts.filter(Boolean).map((p) => (isSay(p) ? p : plain(p)));
  if (xs.length < 2) return xs[0] ?? plain('');
  return joinSay([joinSay(xs.slice(0, -1), ', '), xs.at(-1)], ' and ');
}
/** A Say with its first letter in capitals (where it starts with words, not a number). */
export const capSay = (s) => (isSay(s) ? mk(cap(s.text), /^</.test(s.html) ? s.html : cap(s.html)) : plain(cap(String(s))));

/** A range of two compiled values of one key, joined so it never breaks at its dash: "40–53 MPa". */
export const spanSay = (lo, hi, { key = null, unit = null, stats = ['min', 'max'] } = {}) => (lo === hi
  ? num(lo, { key, stat: stats[0], unit })
  : say`${num(lo, { key, stat: stats[0] })}⁠–⁠${num(hi, { key, stat: stats[1], unit })}`);

/** A date as a reader writes it: "10 Sep 2026". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayWords = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(iso ?? '')); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(iso ?? ''); };
/** Two dates as a span: "10 Sep–5 Oct 2026", one date where both are one. */
export function daysWords(a, b) {
  if (!a || a === b) return dayWords(a ?? b);
  const [x, y] = [dayWords(a), dayWords(b)];
  return a.slice(0, 4) === b.slice(0, 4) ? `${x.replace(/ \d{4}$/, '')}–${y}` : `${x}–${y}`;
}

/** Small numbers in words, as prose prints them: "two products", "12 products". */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const countWords = (n) => (n >= 0 && n < WORDS.length ? WORDS[n] : fmtNumber(n));
/** A count with its noun, the number in words under eleven: "three products". */
export const nWords = (n, word, many = `${word}s`) => `${countWords(n)} ${n === 1 ? word : many}`;

/** A property's name inside a sentence: lower case, unless it begins with a name (Vicat, Charpy, Izod, Shore) or an abbreviation. */
export const inText = (label) => (/^(?:Vicat|Charpy|Izod|Shore|Rockwell|Barcol)\b/.test(label) ? label : lower(label));
const headline = (key) => REGISTRY.allHeadlines.find((h) => h.key === key) ?? null;
const labelOf = (key) => headline(key)?.labels.plain ?? key;

/** A link to a product's card on the material's Products page. */
export const productHref = (c, gradeId) => `${c.m.id}-products.html#${gradeId}`;
/** A product's name as a link to its card. */
export const productLink = (c, g) => markup(`<a class="prod" href="${esc(productHref(c, g.id))}" data-grade="${esc(g.id)}">${esc(productNameOrId(g))}</a>`, productNameOrId(g));

// ------------------------------------------------------------------ what the material is (the head)

/** A filler as an adjective before the polymer: "Glass-fibre-filled PCTG". */
const FILLER_ADJ = {
  'Glass fibre': 'Glass-fibre-filled', 'Carbon fibre': 'Carbon-fibre-filled', 'Aramid fibre': 'Aramid-fibre-filled', 'Natural fibre': 'Natural-fibre-filled',
  'Glass spheres': 'Glass-sphere-filled', Ceramic: 'Ceramic-filled', PTFE: 'PTFE-filled', Graphene: 'Graphene-filled', 'Metal powder': 'Metal-powder-filled',
  'ESD formulation': 'Anti-static (ESD)', 'Electrically conductive': 'Electrically conductive', Foaming: 'Foaming, lightweight',
};
/** The polymer group a name adds to an abbreviation where the abbreviation does not say it (polymers[].group). */
const GROUP_WORD = { copolyester: 'copolyester', elastomer: 'elastomer' };
/** A full name in sentence case: "Polyamide 6 (nylon 6)"; abbreviations and Shore keep their capitals. */
const sentenceCase = (t) => cap(String(t).split(/(\s+|\/|\(|\)|-)/).map((w, i) => (i && /^[A-Z][a-z]/.test(w) && !/^(Shore|Nylon)$/.test(w) ? w.toLowerCase() : w)).join(''));

/** What a material is, in an engineer's words: "Glass-fibre-filled PCTG copolyester", "Polylactic acid", "Silk PLA". */
export function whatItIs(m, db) {
  const poly = (db.polymers ?? []).find((p) => p.id === m.estimateIdentity);
  const base = stated(m.basePolymer) ? m.basePolymer : m.name;
  const full = stated(m.fullName) ? m.fullName : m.name;
  let words;
  if (/not disclosed/i.test(full)) words = sentenceCase(full);
  else if (FILLER_ADJ[m.modifier]) {
    const group = GROUP_WORD[poly?.group];
    words = `${FILLER_ADJ[m.modifier]} ${base}${group && !base.toLowerCase().includes(group) ? ` ${group}` : ''}`;
  } else if (/variant/i.test(m.modifier ?? '') && / - /.test(full)) words = `${sentenceCase(full.split(' - ').slice(1).join(' - '))} ${base}`;
  else words = sentenceCase(full);
  return m.facets?.supportMaterial?.value ? `${words}, a support material` : words;
}

/** Words a name may say another way: "Fiber" and "Fibre", "Reinforced" and "filled", ESD and anti-static. */
const SAME_WORD = { fiber: 'fibre', reinforced: 'filled', electrostatic: 'static', dissipative: 'static', esd: 'static', anti: 'static', lightweight: 'foaming' };
const STOP = new Set(['a', 'an', 'and', 'of', 'the', 'for', 'in', 'with']);
const wordsOf = (t) => new Set(String(t ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map((w) => SAME_WORD[w] ?? w));

/**
 * Bambu Lab's standing in a sentence an engineer would write (labels.js H2C_STATUS says it as a filter label): what the
 * listing covers, and for an unlisted material what the page shows instead. A material beyond the H2C's capability says
 * so in the head's callout, so it has none here.
 */
function standingLede(m) {
  // A type's name where it is one short abbreviation ("PLA", "PETG-GF"); a descriptive name reads as "this material type".
  const named = /^[A-Z0-9][A-Z0-9+/-]*$/.test(m.name);
  switch (m.h2cStatus) {
    case 'Official Bambu product': return 'Bambu Lab sells its own filament of this material for the H2C.';
    case 'Officially listed family': return `Bambu Lab lists ${named ? `${m.name} as a material type` : 'this material type'} for the H2C; the listing covers the type, not each brand.`;
    case 'Conditional': return 'Bambu Lab does not list this material for the H2C; Printing on the H2C, below, gives the conditions it prints under.';
    case 'Theoretical': return 'Bambu Lab does not list this material for the H2C; its published process temperatures are within the printer\'s limits.';
    default: return '';
  }
}

/** The head's identity sentence: what it is where the full name above it does not say so, its products and makers, and Bambu Lab's standing. */
export function identitySentence(c) {
  const id = identity(c.m, c);
  const lede = c.m.excluded ? '' : standingLede(c.m);
  const makers = id.makers === 1 ? 'one maker' : `${fmtNumber(id.makers)} makers`;
  // The head shows the name and the full name above this line: what the material is is said only where it adds a word
  // to them ("a support material"), never to restate a filler or variant the full name already names.
  const what = whatItIs(c.m, c.db);
  const shown = wordsOf(`${c.m.fullName} ${c.m.name} ${c.m.basePolymer}`);
  const support = /, a support material$/.test(what);
  const core = what.replace(/, a support material$/, '');
  // A group word ("copolyester") and "filled" (said of a filler the full name names) add nothing a reader lacks.
  const group = new Set([...Object.values(GROUP_WORD), 'filled']);
  const adds = [...wordsOf(core)].some((w) => !shown.has(w) && !group.has(w));
  const count = plural(id.products, 'product');
  if (adds) return say`${what}, ${count} from ${makers}.${lede ? ` ${lede}` : ''}`;
  if (support && !shown.has('support')) return say`A support material, ${count} from ${makers}.${lede ? ` ${lede}` : ''}`;
  return say`${cap(count)} from ${makers}.${lede ? ` ${lede}` : ''}`;
}

// ------------------------------------------------------------------ how well documented (the evidence line)

const HEADS = { well: 'Well documented', partly: 'Partly documented', thinly: 'Thinly documented' };
/** "tensile strength (Z) rests on 3 products". */
const restsOn = (t) => say`${inText(t.h.labels.plain)} rests on ${num(t.n, { key: t.key, stat: 'n', shown: plural(t.n, 'product') })}`;
const isAre = (xs) => (xs.length === 1 ? 'is' : 'are');
const names = (ts) => andList(ts.map((t) => inText(t.h.labels.plain)));

/** The definition of a key figure, said once on the page. */
function definition(c) {
  const m = c.m;
  const variants = productsOf(c).some((g) => g.variant);
  const toughened = !!m.summary?.charpyNotched?.claimed?.setApart;
  const apart = variants && toughened ? 'Products with an added filler or additive, and for notched impact those sold as toughened, are shown but kept out of the medians.'
    : variants ? 'Products with an added filler or additive are shown but kept out of the medians.'
      : toughened ? 'For notched impact, products sold as toughened are shown but kept out of the median.' : '';
  return joinSay(['Each figure is the median of the products that publish it with a stated orientation or test load, and beside it the middle half of them.', apart]);
}

/** Why the values published cannot be ranked, said once: "No sheet states how its tensile bars were printed, so …". */
function openReason(t) {
  if (!t.openOnly.length) return null;
  const dir = t.openOnly.filter((x) => x.h.direction), load = t.openOnly.filter((x) => !x.h.direction);
  const tests = [...new Set(dir.map((x) => (/tensile|elongation/i.test(x.h.labels.plain) ? 'tensile' : /flexural/i.test(x.h.labels.plain) ? 'flexural' : 'test')))];
  const parts = [];
  if (dir.length) parts.push(`No sheet states how its ${andList(tests)} bars were printed, so ${names(dir)} ${isAre(dir)} shown as published and not ranked against other materials.`);
  if (load.length) parts.push(`No sheet states the test load of its ${names(load)}, so ${load.length === 1 ? 'it is' : 'they are'} shown as published and not ranked against other materials.`);
  return parts.join(' ');
}

/** The makers whose documents give the values: "two makers' documents: Spectrum's, which FormFutura AthenaX GF10 shares, and Fiberlogy's". */
function makersWords(c, t) {
  const ms = t.makers;
  if (!ms.length) return 'no document with a number';
  const one = ({ maker, readers }) => (readers.length ? `${maker}'s, which ${andList(readers.map(productNameOrId))} ${readers.length === 1 ? 'shares' : 'share'}` : `${maker}'s`);
  if (ms.length > 3) return `${fmtNumber(ms.length)} makers' documents`;
  const list = ms.length === 1 ? one(ms[0]) : `${ms.slice(0, -1).map(one).join(', ')}${ms.some((x) => x.readers.length) ? ',' : ''} and ${one(ms.at(-1))}`;
  return `${ms.length === 1 ? 'one maker\'s documents' : `${countWords(ms.length)} makers' documents`}: ${list}`;
}

/**
 * The evidence line: how well documented the material is, why where it matters, and what a key figure is, said once on
 * the page. `{ tier, head ('Well documented'…), text, html, toString() }`; the head is not in the text.
 */
export function evidenceLine(c) {
  const t = evidenceTier(c.m, c);
  let body;
  if (t.tier === 'well') {
    body = joinSay([`${fmtNumber(t.documents)} documents from ${plural(t.publishers, 'publisher')}${t.dataSheets ? `, ${t.dataSheets === t.documents ? 'all' : fmtNumber(t.dataSheets)} of them data sheets` : ''}.`, definition(c)]);
  } else if (t.tier === 'partly') {
    const byN = [...new Set(t.weak.map((x) => x.n))].map((n) => t.weak.filter((x) => x.n === n));
    const restsOnAll = byN.map((g, i) => (g.length === 1 ? (i ? say`${inText(g[0].h.labels.plain)} on ${plural(g[0].n, 'product')}` : restsOn(g[0]))
      : say`${names(g)} ${i ? 'on' : 'rest on'} ${plural(g[0].n, 'product')} each`));
    const parts = [...restsOnAll, t.missing.length ? plain(`${names(t.missing)} ${isAre(t.missing)} not published`) : null,
      t.openOnly.length ? plain(`${names(t.openOnly)} ${t.openOnly.length === 1 ? 'is' : 'are'} published only without a stated orientation or test load`) : null].filter(Boolean);
    body = joinSay([say`${capSay(andSay(parts))}.`, definition(c)]);
  } else {
    const word = t.makers.length <= 1 ? 'one sheet\'s word' : t.makers.length === 2 ? 'one or two sheets\' word' : 'a few sheets\' word';
    body = joinSay([`${cap(nWords(t.products, 'product'))}, with values from ${makersWords(c, t)}.`, openReason(t), t.ranked.length ? `Read each figure as ${word}.` : null]);
  }
  return { ...body, tier: t.tier, head: HEADS[t.tier], facts: t, toString() { return `${HEADS[t.tier]}: ${body.text}`; } };
}

// ------------------------------------------------------------------ printing on the H2C, in brief

/** The products' window of one setting, with who gives it: { value, note }, or null where none is published. */
function windowRow(products, axis) {
  const pw = printWindows(products, axis);
  const total = products.length;
  const unit = (from, to) => `${windowText(from, to)} °C`;
  const all = (n) => (n === total ? (n === 2 ? 'both products' : `all ${fmtNumber(n)} products`) : `all ${fmtNumber(n)} that give one`);
  const lows = pw.ends.filter((e) => e.min != null && e.max == null), highs = pw.ends.filter((e) => e.max != null && e.min == null);
  const endWords = () => [lows.length ? `${countWords(lows.length)} ${lows.length === 1 ? 'gives' : 'give'} at least ${fmtNumber(Math.min(...lows.map((e) => e.min)))} °C` : null,
    highs.length ? `${countWords(highs.length)} ${highs.length === 1 ? 'gives' : 'give'} up to ${fmtNumber(Math.max(...highs.map((e) => e.max)))} °C` : null].filter(Boolean);
  if (!pw.n) {
    if (lows.length) return { value: `at least ${fmtNumber(Math.min(...lows.map((e) => e.min)))} °C`, note: plural(lows.length, 'product'), pw };
    return null;
  }
  if (pw.n === 1) {
    const w = pw.windows.find((x) => x.counted);
    const ends = endWords();
    return { value: unit(w.min, w.max), note: `one product${ends.length ? `; ${andList(ends)}` : ''}`, pw };
  }
  const r = typicalWindow(pw);
  if (r.share === 'all') return { value: unit(r.from, r.to), note: all(pw.n), pw };
  if (r.share === 'most') return { value: unit(r.from, r.to), note: 'most products that give one', pw };
  return { value: unit(r.from, r.to), note: `${fmtNumber(r.k)} of ${fmtNumber(pw.n)} that give one`, pw };
}

/** The heated chamber in brief: none needed, or the window most give. */
function chamberRow(products) {
  const pw = printWindows(products, 'chamber');
  const total = products.length;
  const none = (pw.states.get('not-required') ?? 0) + (pw.states.get('ambient') ?? 0);
  const limit = pw.limit;
  if (none && (none * 2 >= total || !pw.n)) {
    const note = none === total ? (total === 2 ? 'both products' : `all ${fmtNumber(total)} products`) : `${fmtNumber(none)} of ${fmtNumber(total)} products`;
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
export function dryingSpanWords(d) {
  if (!d) return '';
  const span = (lo, hi, unit) => (lo === hi ? `${fmtNumber(lo)} ${unit}` : `${fmtNumber(lo)}–${fmtNumber(hi)} ${unit}`);
  const t = span(d.tempMin ?? d.tempC, d.tempMax ?? d.tempC, '°C');
  if (d.hoursMin == null) return t;
  return d.hoursMin === d.hoursMax ? `${t} for ${span(d.hoursMin, d.hoursMax, 'h')}` : `${t}, ${span(d.hoursMin, d.hoursMax, 'h')}`;
}

/** Drying in brief: the typical schedule of the products whose own or shared sheet gives one, and what most ask. */
function dryingRow(c, products) {
  const d = dryingStats(products);
  const a = dryingAdvice(products);
  const total = products.length;
  const asks = a.needs.required >= a.needs.optional
    ? (a.needs.required === total ? (total === 2 ? 'both products call for it' : `all ${fmtNumber(total)} products call for it`) : `${fmtNumber(a.needs.required)} of ${fmtNumber(total)} products ${a.needs.required === 1 ? 'calls' : 'call'} for it`)
    : 'most advise it only for wet filament';
  if (d.temps.n) return { value: glue(dryingSpanWords(dryingSchedule(products))), note: a.have ? asks : '', d, a };
  if (a.needs['not-needed'] && a.needs['not-needed'] * 2 >= a.have) return { value: 'not needed', note: `${fmtNumber(a.needs['not-needed'])} of ${fmtNumber(total)} products say so`, d, a };
  const g = c.guide?.drying;
  if (g?.tempC != null) return { value: dryingWords(g), note: 'Bambu Lab\'s guide', d, a };
  return { value: c.m.gates?.drying === 'not-needed' ? 'not needed' : 'not stated', note: '', d, a };
}

/**
 * What the sheets say about the nozzle (grades[].print.hardenedNozzle and where it was read, .from.hardenedNozzle):
 * `{ ask, standard, guideAsk, guideAny, silent, total }`, the products whose own or shared sheet asks for a hardened
 * nozzle or says a standard one is enough, those whose setting is Bambu Lab's guide's, and those that say nothing.
 */
export function nozzleSay(products) {
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
function nozzleTypeRow(c) {
  const n = nozzleSay(productsOf(c));
  const of = (k) => `${fmtNumber(k)} of ${plural(n.total, 'product')}`;
  const bits = [n.ask ? `${of(n.ask)}' sheets ${n.ask === 1 ? 'asks' : 'ask'} for one` : null, n.standard ? `${fmtNumber(n.standard)} say a standard nozzle is enough` : null,
    n.guideAsk || n.guideAny ? `Bambu Lab's guide says ${n.guideAsk ? 'hardened' : 'any'} for ${fmtNumber(n.guideAsk + n.guideAny)} more` : null,
    n.silent && (n.ask || n.standard || n.guideAsk || n.guideAny) ? 'the rest are silent' : null].filter(Boolean);
  const note = bits.join('; ').replace(/^1 of (\d[\d,]*) products' sheets asks/, 'one of $1 products\' sheets asks').replace(/^(\d[\d,]*) of (\d[\d,]*) products' sheets ask(?!s)/, (all, k, t) => (k === t ? (t === '1' ? 'its sheet asks' : `all ${t} products' sheets ask`) : all));
  let value;
  if (n.ask && n.ask >= n.standard) value = n.standard ? 'hardened for most' : 'hardened';
  else if (n.ask) value = 'standard for most';
  else if (n.standard) value = 'standard';
  else if (n.guideAsk) value = 'hardened, by Bambu Lab\'s guide';
  else if (n.guideAny) value = 'any, by Bambu Lab\'s guide';
  else value = 'not stated';
  return { value, note, n };
}

/**
 * The *On the H2C* plate's rows, in the order a print is set up: `[{ key, label, value, note }]` for the nozzle, bed,
 * heated chamber, drying and nozzle type. Plain text. `note` says who gives it ("most products that give one").
 */
export function onTheH2cRows(c) {
  const products = productsOf(c);
  const out = [];
  const nozzle = windowRow(products, 'nozzle'), bed = windowRow(products, 'bed'), chamber = chamberRow(products), drying = dryingRow(c, products), type = nozzleTypeRow(c);
  out.push({ key: 'nozzle', label: 'Nozzle', value: nozzle?.value ?? 'not published', note: nozzle?.note ?? '' });
  out.push({ key: 'bed', label: 'Bed', value: bed?.value ?? 'not published', note: bed?.note ?? '' });
  out.push({ key: 'chamber', label: 'Heated chamber', value: chamber.value, note: chamber.note });
  out.push({ key: 'drying', label: 'Drying', value: drying.value, note: drying.note });
  out.push({ key: 'hardened', label: 'Nozzle type', value: type.value, note: type.note });
  return out.map((r) => ({ ...r, value: glue(r.value), note: glue(r.note) }));
}

/** One line on the H2C's limits: within all of them, or which settings ask for more than it gives. */
export function onTheH2cLine(c) {
  // A material beyond the H2C's capability says so in its head: the plate does not say it again.
  if (c.m.excluded) return plain('');
  const pf = printFacts(c.m, c);
  const counts = printCounts(c.grades);
  const total = productsOf(c).length;
  const over = pf.outside.filter((a) => a.list.length);
  if (over.length) {
    const AXIS = { nozzle: 'nozzle', bed: 'bed', chamber: 'chamber' };
    return plain(`${cap(andList(over.map((a, i) => `${a.list.length === total ? (total === 2 ? 'both products' : `all ${fmtNumber(total)} products`) : `${fmtNumber(a.list.length)} of ${i ? fmtNumber(total) : plural(total, 'product')}`} ${a.list.length === 1 ? 'asks' : 'ask'} for more ${AXIS[a.axis] ?? lower(a.label)} heat than the H2C's ${fmtNumber(pf.limits.find((l) => l.axis === a.axis)?.limit)} °C`)))}.`);
  }
  if (counts?.all) return plain('Every product\'s settings are within the H2C\'s limits.');
  return plain('No product asks for more than the H2C gives.');
}

// ------------------------------------------------------------------ products that stand out, and the hand-off

/** A product value's state, in words: sold as toughened, measured after annealing, the products that read its sheet. */
function stateWords(x) {
  const bits = [];
  if (x.toughened) bits.push('sold as toughened');
  if (x.v?.anneal) bits.push(`measured after annealing ${scheduleWords(x.v.anneal)}`);
  if (x.v?.converted) bits.push('converted from a foreign price');
  return bits;
}

/**
 * The products that stand out (material-highlights.js standOutProducts), a fact a line: `[{ gradeId, label, name, href,
 * detail (Say), text, html }]`, the html with the product's name linked to its card; [] under six products.
 */
export function standOutLines(c) {
  return standOutProducts(c).map((x) => {
    const h = x.key ? headline(x.key) : null;
    let detail;
    if (x.kind === 'documented') detail = plain(x.others ? `, and ${plural(x.others, 'other')} that ${x.others === 1 ? 'publishes' : 'publish'} as much.` : ', with values for more properties than any other.');
    else if (x.kind === 'layers') detail = say`, ${Math.round(x.share * 100)} % of its flat tensile strength (the median product keeps ${Math.round(x.median * 100)} %).`;
    else {
      const bits = stateWords(x);
      const also = x.also ? `, and it keeps the most strength across the layers, ${Math.round(x.also.share * 100)} % of its flat value` : '';
      const readers = x.readers?.length ? ` (${andList(x.readers.map(productNameOrId))} ${x.readers.length === 1 ? 'shares its' : 'share its'} data sheet)` : '';
      detail = say`, ${num(x.v.value, { key: x.key, stat: 'product', unit: h?.unit, grade: x.g.id })}${readers}${bits.length ? `, ${andList(bits)}` : ''}${also}.`;
    }
    const link = productLink(c, x.g);
    return { gradeId: x.g.id, kind: x.kind, label: x.label, name: productNameOrId(x.g), href: productHref(c, x.g.id), detail,
      text: `${x.label}: ${link.text}${detail.text}`, html: `${esc(x.label)}: ${link.html}${detail.html}` };
  });
}

/**
 * The Products hand-off's words: `{ lede (Say: the products and who makes them), button ('Compare the 195 products'),
 * href, closing (Say, or null where no product is named as standing out) }`.
 */
export function productsHandoffWords(c) {
  const products = productsOf(c);
  const makers = groupByMaker(products).filter(([k]) => stated(k)).map(([maker, gs]) => ({ maker, n: gs.length })).sort((a, b) => b.n - a.n || a.maker.localeCompare(b.maker));
  const n = products.length;
  const several = makers.filter((x) => x.n > 1);
  const lede = makers.length <= 3
    ? plain(`${cap(nWords(n, 'product'))} from ${makers.length === 1 ? `one maker, ${makers[0].maker}` : `${countWords(makers.length)} makers: ${andList(makers.map((x) => x.maker))}`}.`)
    : !several.length ? plain(`${fmtNumber(n)} products, one from each of ${fmtNumber(makers.length)} makers.`)
      : plain(`${fmtNumber(n)} products from ${fmtNumber(makers.length)} makers; the most from ${andList(several.slice(0, 3).map((x) => `${x.maker} (${x.n})`))}.`);
  return {
    lede, button: `Compare the ${n === 2 ? 'two' : fmtNumber(n)} products`, href: `${c.m.id}-products.html`,
    closing: standOutProducts(c).length ? plain('These are published values, not recommendations: the selector judges each product against your requirements.') : null,
  };
}

// ------------------------------------------------------------------ among the materials

/** The properties the standing sentence speaks of, in the order an engineer reads a sheet. */
const STANDING_KEYS = ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'hdt045', 'density', 'priceCADkg'];

/** Where the material sits among every material: its high and low properties, and those in the middle half. */
export function standingWords(c, ranks) {
  const m = c.m;
  const rows = STANDING_KEYS.map((key) => ({ key, at: standing(m, ranks, key) })).filter((r) => r.at && m.summary?.[r.key]?.n);
  if (!rows.length) return null;
  const high = rows.filter((r) => r.at.pct >= 75), low = rows.filter((r) => r.at.pct <= 25), mid = rows.filter((r) => r.at.pct > 25 && r.at.pct < 75);
  const lbl = (rs) => andList(rs.map((r) => inText(labelOf(r.key))));
  if (!high.length && !low.length) return plain(`Among the materials, ${m.name} sits in the middle half on every property it publishes comparably.`);
  const has = [high.length ? `a high ${lbl(high)}` : null, low.length ? `a low ${lbl(low)}` : null].filter(Boolean);
  const quarter = high.length && low.length ? 'the top or bottom quarter' : high.length ? 'the top quarter' : 'the lowest quarter';
  const n = high.length + low.length;
  const which = n === 1 ? 'it is' : n === 2 ? 'both are' : 'each is';
  return joinSay([`Among the materials, ${m.name} has ${has.join(has.length > 1 && high.length > 1 ? ', and ' : ' and ')}: ${which} in ${quarter} of the materials that publish ${n === 2 ? 'them' : 'it'}.`,
    // Two named at most: a longer list is the rest, and the figure below names each.
    mid.length > 2 ? 'The rest of its key properties sit in the middle half.' : mid.length ? `Its ${lbl(mid)} ${mid.length === 1 ? 'sits' : 'sit'} in the middle half.` : null]);
}

/** How one median differs from another's, as an engineer says it, or null where the two are about the same. */
const ADJ = {
  tensileModulusXY: ['stiffer', 'less stiff', 'as stiff'], tensileStrengthXY: ['stronger flat', 'weaker flat', 'as strong flat'],
  tensileStrengthZ: ['stronger across the layers', 'weaker across the layers', 'as strong across the layers'],
  charpyNotched: ['tougher in notched impact', 'less tough in notched impact', 'as tough in notched impact'],
  priceCADkg: ['more expensive', 'less expensive', 'as expensive'],
};
function differ(r, other) {
  const on = other.summary?.[r.key]?.n ?? 0;
  if (r.n < 2 || on < 2) return null;
  if (r.kind === 'diff') return Math.abs(r.value) <= 3 ? null : { r, size: Math.abs(r.value) / Math.max(1, Math.abs(r.b)), hdt: true };
  if (r.same) return null;
  return { r, size: Math.abs(Math.log(r.a / r.b)) };
}
const differWords = ({ r }) => {
  const [more, less, as] = ADJ[r.key] ?? ['higher', 'lower', 'as high'];
  if (r.a / r.b >= 2) return `${(r.a / r.b).toFixed(1)} times ${as}`;
  return `${Math.round(Math.abs(r.value) * 100)} % ${r.value > 0 ? more : less}`;
};

/** The first two alternatives (material-stats.js peerSet), against this material, in a sentence each. */
export function peersWords(c, peers) {
  const m = c.m;
  const out = [];
  for (const p of peers ?? []) {
    if (out.length === 2) break;
    const rows = compareMedians(m, p, KEY_FIGURES);
    // A filled material against its own unfilled polymer: what the filler does to it, said first.
    const base = p.basePolymer === m.basePolymer && /unfilled/i.test(p.modifier ?? '') && FILLER_ADJ[m.modifier];
    const hdt = rows.find((r) => r.key === 'hdt045');
    if (base && hdt && (m.summary?.hdt045?.n ?? 0) >= 2 && (p.summary?.hdt045?.n ?? 0) >= 2) {
      const d = hdt.a - hdt.b;
      const verb = Math.abs(d) <= 3 ? `adds little to ${p.name}'s heat resistance` : d > 0 ? `raises ${p.name}'s HDT at 0.45 MPa by ${fmtD(Math.abs(d), '°C')}` : `lowers ${p.name}'s HDT at 0.45 MPa by ${fmtD(Math.abs(d), '°C')}`;
      out.push(say`${cap(lower(m.modifier))} ${verb}: ${m.name}'s HDT at 0.45 MPa is ${num(hdt.a, { key: 'hdt045', unit: '°C' })} against ${fmtD(hdt.b, '°C')}.`);
      continue;
    }
    const diffs = rows.map((r) => differ(r, p)).filter(Boolean).sort((a, b) => b.size - a.size).slice(0, 3);
    if (!diffs.length) {
      const both = rows.filter((r) => r.n >= 2 && (p.summary?.[r.key]?.n ?? 0) >= 2);
      if (both.length === 1) out.push(say`Against ${p.name}, ${m.name}'s ${inText(both[0].h.labels.plain)} is about the same: ${num(both[0].a, { key: both[0].key, unit: both[0].h.unit })} against ${fmtD(both[0].b, both[0].h.unit)}.`);
      else if (both.length) out.push(plain(`Against ${p.name}, ${m.name}'s medians are about the same on ${andList(both.map((r) => inText(r.h.labels.plain)))}.`));
      continue;
    }
    const adj = diffs.filter((x) => !x.hdt).map(differWords);
    const heat = diffs.find((x) => x.hdt);
    const heatWords = heat ? `its HDT at 0.45 MPa is ${fmtD(Math.abs(heat.r.value), '°C')} ${heat.r.value > 0 ? 'higher' : 'lower'}` : null;
    out.push(plain(adj.length ? `Against ${p.name}, ${m.name} is ${andList(adj)}${heatWords ? `, and ${heatWords}` : ''}.` : `Against ${p.name}, ${m.name}'s ${heatWords.replace(/^its /, '')}.`));
  }
  return out;
}

// ------------------------------------------------------------------ mechanical properties

/** A value's display in a unit a reader reads easily (a soft elastomer's 0.0159 GPa as 15.9 MPa, format.js readableUnit). */
const readable = (v, unit, ref = v) => { const r = readableUnit(unit, ref); return fmtD(v * r.factor, r.unit); };
/** A summary's median as a Say, with its unit. */
const med = (m, key) => { const s = m.summary[key]; const unit = headline(key)?.unit; return num(s.median, { key, unit, shown: readable(s.median, unit, s.max ?? s.median) }); };
/** A summary's published-only span: "55 MPa", "39–70 MPa". */
const openSpan = (m, key) => {
  const a = m.summary[key].asPublished, unit = headline(key)?.unit, r = readableUnit(unit, a.max);
  if (r.factor === 1) return spanSay(a.min, a.max, { key, unit, stats: ['asPublished.min', 'asPublished.max'] });
  return a.min === a.max ? num(a.min, { key, stat: 'asPublished.min', shown: readable(a.min, unit, a.max) })
    : say`${num(a.min, { key, stat: 'asPublished.min', shown: fmtD(a.min * r.factor) })}\u2060–\u2060${num(a.max, { key, stat: 'asPublished.max', shown: readable(a.max, unit) })}`;
};

/** The mechanical section's opening: the flat tensile values, with elongation, and the bending values, two sentences. */
export function mechanicalWords(c) {
  const m = c.m;
  const s = (k) => m.summary?.[k];
  const out = [];
  if (s('tensileStrengthXY')?.n) {
    const mod = s('tensileModulusXY')?.n ? say` at a modulus of ${med(m, 'tensileModulusXY')}` : '';
    const el = s('elongationXY')?.n ? say`, and breaks at ${med(m, 'elongationXY')} elongation` : '';
    out.push(say`Printed flat (XY), ${m.name} typically reaches a tensile strength of ${med(m, 'tensileStrengthXY')}${mod}${el}.`);
  } else {
    const open = [['tensileStrengthXY', 'a tensile strength'], ['tensileModulusXY', 'a modulus'], ['elongationXY', 'an elongation at break']].filter(([k]) => !s(k)?.n && s(k)?.asPublished?.n);
    if (open.length) out.push(say`As published, its products give ${andSay(open.map(([k, w]) => say`${w} of ${openSpan(m, k)}`))}.`);
    else if (s('tensileModulusXY')?.n) out.push(say`Printed flat (XY), ${m.name}'s tensile modulus is typically ${med(m, 'tensileModulusXY')}.`);
  }
  if (s('flexuralStrengthXY')?.n && s('flexuralModulusXY')?.n) out.push(say`In bending, its flexural strength is typically ${med(m, 'flexuralStrengthXY')} at a flexural modulus of ${med(m, 'flexuralModulusXY')}.`);
  // Impact: where no product publishes a notched value, what its sheets give instead, in one clause.
  if (!s('charpyNotched')?.n && !s('izodNotched')?.n && !s('charpyNotched')?.asPublished?.n && !s('izodNotched')?.asPublished?.n) {
    const impact = c.ms.filter((x) => /impact/i.test(x.property) && x.numeric);
    if (impact.length && impact.every((x) => /unnotched/i.test(x.notch ?? ''))) out.push(plain('Its sheets publish only unnotched impact values.'));
  }
  return out.slice(0, 3);
}

// ------------------------------------------------------------------ thermal properties

/** The thermal section's opening: where it softens and why, the products well above the rest, Vicat and melting. */
export function thermalWords(c, { table = false } = {}) {
  const m = c.m;
  const s = (k) => m.summary?.[k];
  const out = [];
  const a = s('hdt045'), b = s('hdt18'), tg = s('glassTransition');
  const amorphous = printsAmorphous(m, c.db);
  const at = (k, x) => (x.n >= 4 ? med(m, k) : spanSay(x.min, x.max, { key: k, unit: '°C' }));
  if (a?.n && b?.n && tg?.n && amorphous === true && Math.abs(a.median - b.median) <= 3) {
    out.push(say`${m.name} is amorphous as printed, so it softens at its glass transition, typically ${med(m, 'glassTransition')}: its HDT is ${at('hdt045', a)} under 0.45 MPa and ${at('hdt18', b)} under 1.8 MPa.`);
  } else if (a?.n) {
    const lead = a.n >= 4 ? say`${m.name}'s HDT is typically ${at('hdt045', a)} under 0.45 MPa` : say`Its products put HDT at ${at('hdt045', a)} under 0.45 MPa`;
    out.push(say`${lead}${b?.n ? say` and ${at('hdt18', b)} under 1.8 MPa` : ''}${tg?.n ? say`, ${tg.n >= 4 ? 'with its glass transition typically at' : 'against a glass transition of'} ${at('glassTransition', tg)}` : ''}.`);
    if (amorphous === false && tg?.n && a.median - tg.median >= 20) out.push(plain(`Semicrystalline, it carries light load well above its glass transition.`));
  } else if (tg?.n) out.push(say`Its glass transition is ${tg.n >= 4 ? 'typically ' : ''}${at('glassTransition', tg)}.`);
  // The products well above the rest, by name, with their state.
  const so = standOut(m, c, 'hdt045');
  if (so?.list.length) {
    const named = so.list.slice(0, 3).map((e) => say`${productNameOrId(e.g)} (${num(e.v.value, { key: 'hdt045', stat: 'product', unit: '°C', grade: e.g.id })}${e.v.anneal ? `, annealed ${scheduleWords(e.v.anneal)}` : ''})`);
    const lo = Math.min(...so.list.map((e) => e.v.value)), hi = Math.max(...so.list.map((e) => e.v.value));
    out.push(so.list.length === 1
      ? say`One product publishes far more at 0.45 MPa: ${named[0]}.`
      : say`${cap(nWords(so.list.length, 'product'))} publish ${fmtD(lo)} to ${fmtD(hi, '°C')} at 0.45 MPa${so.annealed ? `, ${countWords(so.annealed)} of them after annealing` : ''}. The highest are ${andSay(named)}.`);
  }
  // Vicat and melting, as published, where no table says them.
  if (!table) {
    const rows = heatLadder(m, c, ['Vicat softening temperature', 'Melting temperature']).filter((r) => !r.compared);
    // One product with values from two documents is said as both, never as their median ("77–89 °C").
    const raw = (prop) => c.ms.filter((x) => x.property === prop && x.numeric && x.unit === '°C' && !x.quarantined && !x.implausible).map((x) => x.value);
    const value = (r) => { if (r.summary.n > 1) return `typically ${fmtD(r.summary.median, '°C')}`; const vs = raw(r.id); const lo = Math.min(...vs), hi = Math.max(...vs); return `${lo === hi ? fmtD(lo, '°C') : `${fmtD(lo)}–${fmtD(hi, '°C')}`}, from one product`; };
    const said = rows.map((r, i) => `${r.id === 'Vicat softening temperature' ? 'Vicat softening' : 'melting'} ${i ? '' : 'is '}${value(r)}`);
    if (said.length) out.push(plain(`As published, ${andList(said)}.`));
  }
  return out;
}

// ------------------------------------------------------------------ printing on the H2C

// ------------------------------------------------------------------ density and price

/** The density sentence. */
export function densityWords(c) {
  const m = c.m;
  const d = m.summary?.density;
  if (!d?.n) return null;
  if (d.n === 1) return say`One product gives a density of ${med(m, 'density')}.`;
  if (d.min === d.max) return say`All ${countWords(d.n)} products give a density of ${med(m, 'density')}.`;
  if (d.n < 4) return say`Its ${countWords(d.n)} products give a density of ${spanSay(d.min, d.max, { key: 'density', unit: 'kg/m³' })}.`;
  return say`${m.name}'s density is typically ${med(m, 'density')}${d.q1 != null ? say`, the middle half ${spanSay(d.q1, d.q3, { key: 'density', unit: 'kg/m³', stats: ['q1', 'q3'] })}` : ''}, across ${num(d.n, { key: 'density', stat: 'n', shown: plural(d.n, 'product') })}.`;
}

/** The price sentences: the typical price and the lowest, or the one product's, and the Canadian listings not used. */
export function priceWords(c) {
  const m = c.m;
  const s = m.summary?.priceCADkg;
  const out = [];
  const rows = priceRows(c);
  if (s?.n > 1) {
    const low = standOutProducts(c).find((x) => x.kind === 'low' && x.key === 'priceCADkg')
      ?? (() => { const e = productsOf(c).filter((g) => g.headline?.priceCADkg && !g.variant).sort((a, b) => a.headline.priceCADkg.value - b.headline.priceCADkg.value)[0]; return e ? { g: e, v: e.headline.priceCADkg } : null; })();
    out.push(say`${m.name} typically costs ${med(m, 'priceCADkg')}${s.q1 != null ? say`, the middle half ${spanSay(s.q1, s.q3, { key: 'priceCADkg', unit: 'CAD/kg', stats: ['q1', 'q3'] })}` : ''}, across the ${num(s.n, { key: 'priceCADkg', stat: 'n', shown: plural(s.n, 'product') })} with a regular price in the sample${low ? say`; the lowest is ${productLink(c, low.g)} at ${num(low.v.value, { key: 'priceCADkg', stat: 'product', unit: 'CAD/kg', grade: low.g.id })}` : ''}.`);
  } else if (s?.n === 1) {
    const g = c.gradeById.get(s.typical);
    const listing = rows.find((r) => r.used && r.p.gradeId === s.typical);
    const fx = listing?.converted && listing.p.fx ? `, from ${listing.p.retailer}'s listing in ${listing.p.currency}, converted at the Bank of Canada rate of ${dayWords(listing.p.fx.date)}` : '';
    out.push(say`One product has a sampled price: ${g ? productLink(c, g) : 'one product'} at ${num(s.median, { key: 'priceCADkg', unit: 'CAD/kg' })}${fx}.${listing?.converted ? ' No Canadian shop in the sample sells it.' : ''}`);
  }
  // A Canadian shop's listing of a product with no price in the sample: the reader learns the product is sold here.
  const priced = new Set(rows.filter((r) => r.used).map((r) => r.p.gradeId));
  const unpriced = (s?.n ?? 0) >= 4 ? [] : rows.filter((r) => !r.used && !r.foreign && r.unused === 'no-regular' && !priced.has(r.p.gradeId));
  for (const r of unpriced.slice(0, 3)) {
    const g = r.product;
    out.push(say`${r.p.retailer} lists ${g ? productLink(c, g) : 'a product'}${/out of stock/i.test(r.p.stock ?? '') ? ', out of stock when sampled,' : ''} with no regular price recorded.`);
  }
  return out;
}

/** The sampling sentence, said once, last. */
export function priceSampleLine(c) {
  const ps = c.db.meta.priceSample;
  if (!ps) return plain(`Regular prices, never sale prices, ${priceSampleWords(c.db.meta)}; shipping and tax are not included.`);
  return plain(`Regular prices, never sale prices, sampled from ${plural(ps.canadianRetailers, 'Canadian shop')}${ps.foreignSellers ? ` and ${plural(ps.foreignSellers, 'foreign shop')}` : ''} between ${daysWords(ps.from, ps.to).replace('–', ' and ')}; shipping and tax are not included.`);
}

// ------------------------------------------------------------------ chemicals and environment

/**
 * What the statements on one exposure say, counted in one unit, statements, so the counts add up to the row's total:
 * the verdict all of them give; "mostly <verdict>" where two thirds or more give one, with every verdict's count; else
 * "mixed", with the counts. A statement in words with no verdict is counted as "without a verdict".
 */
export function verdictWords(records) {
  // A "no data" statement says nothing, so it is not counted; a statement in words alone counts but gives no verdict.
  const said = records.filter((e) => e.verdict !== 'no-data');
  const n = said.length;
  if (!n) return records.length ? 'No data published' : '';
  const counts = new Map();
  for (const e of said) if (e.verdict !== 'narrative') counts.set(e.verdict, (counts.get(e.verdict) ?? 0) + 1);
  const list = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const of = (k) => (k === n ? (n === 1 ? 'in its one statement' : n === 2 ? 'in both statements' : `in all ${fmtNumber(n)} statements`) : `in ${fmtNumber(k)} of ${fmtNumber(n)} statements`);
  if (!list.length) return `Described without a verdict, ${of(n)}`;
  const [top, k] = list[0];
  const word = cap(envVerdictWords(top));
  // One verdict, the others in words only: it is that verdict, however few say it.
  if (list.length === 1) return `${word}, ${of(k)}${k / n < 2 / 3 ? (n - k === 1 ? '; the other gives no verdict' : '; the others give no verdict') : ''}`;
  if (k / n >= 2 / 3) return `${word}, ${of(k)}`;
  const disagree = list.reduce((s, [, x]) => s + x, 0);
  return `Mixed: ${fmtNumber(disagree)} statements disagree`;
}

// ------------------------------------------------------------------ statements chosen by rule

/**
 * A statement worth quoting first: a number with its unit, a printing condition (a nozzle, annealing, drying, an
 * enclosure), or an instruction, a verb where an instruction stands (at a sentence's start, or after "should", "must",
 * "recommend"): "Use a hardened nozzle", "it is recommended to dry", never the "use" of "safe for home use".
 */
const NUMBER_UNIT = /\d\s?(?:°C|°F|%|mm\/s|mm|µm|h\b|hrs?\b|hours?|min(?:utes)?\b)/i;
const CONDITION = /\b(?:nozzles?|anneal(?:ed|ing)?|dry(?:ing)?|dried|dry ?box|dryer|desiccant|enclosure|heated chamber|build plate|glue stick|bed temperature)\b/i;
const INSTRUCTION = /(?:^|[.;:!]\s+|\b(?:should|must|needs? to|recommend(?:ed|s)?(?: to)?|advised? to|best to|try to|please|we suggest)\s+(?:to\s+)?(?:be\s+)?)(?:use|using|set|avoid|keep|store|reduce|increase|lower|raise|print|preheat|measure|scale|enable|disable|apply|clean|turn)\b/i;
const SPECIFIC = { test: (t) => NUMBER_UNIT.test(t) || CONDITION.test(t) || INSTRUCTION.test(t) };
/** A claim that sells and instructs nothing: never quoted where the topic has an instructive statement. */
const CLAIM = /\b(?:odou?rless|odou?r[- ]free|(?:fully |100 ?% )?biodegradable|compostable|eco[- ]?friendly|easy to print|easy[- ]to[- ]use|hassle[- ]free|perfect|amazing|excellent|superior|premium|best[- ]in[- ]class|unmatched|outstanding)\b/i;
/** Whether a statement instructs: a number with its unit, a condition, or an instruction (use, dry, set, avoid, anneal, nozzle). */
export const instructive = (t) => SPECIFIC.test(String(t ?? ''));
/** Topics that sell rather than inform: quoted after the others. */
const SELLING = new Set(['Benefits', 'Good for']);
/**
 * Statements ordered as a page quotes them: an instructive one first (a number with its unit, a condition, or an
 * instruction; `prefer` adds a pattern of its own), then a sentence of readable length (six to forty words), a data
 * sheet's before a product page's, one that informs before one that sells, and the maker with the most products here;
 * at most one of a text. Where any statement instructs, a pure claim ("odourless", "easy to print") is left out.
 */
export function quoteOrder(list, c, { prefer = null, perProduct = false } = {}) {
  const makers = new Map();
  for (const g of productsOf(c)) makers.set(g.manufacturer, (makers.get(g.manufacturer) ?? 0) + 1);
  const sheet = (k) => (/TDS|data sheet/i.test(c.sourceById.get(k.sourceId)?.sourceClass ?? '') ? 0 : 1);
  const words = (t) => String(t ?? '').trim().split(/\s+/).length;
  const text = (k) => k.text ?? k.finding ?? '';
  const claim = (k) => CLAIM.test(text(k)) && !instructive(text(k));
  const score = (k) => {
    const t = text(k);
    return [prefer ? (prefer.test(t) ? 0 : 1) : 0, instructive(t) ? 0 : 1, words(t) >= 6 && words(t) <= 40 ? 0 : 1, sheet(k), claim(k) ? 1 : 0, SELLING.has(k.topic) ? 1 : 0,
      -(makers.get(c.gradeById.get(k.gradeId)?.manufacturer) ?? 0)];
  };
  const anyInstructs = list.some((k) => instructive(text(k)));
  const keyed = list.filter((k) => !(anyInstructs && claim(k))).map((k) => ({ k, s: score(k) }));
  keyed.sort((a, b) => { for (let i = 0; i < a.s.length; i++) if (a.s[i] !== b.s[i]) return a.s[i] - b.s[i]; return String(a.k.id).localeCompare(String(b.k.id)); });
  const seen = new Set(), products = new Set();
  return keyed.map((x) => x.k).filter((k) => {
    const key = String(text(k)).slice(0, 80);
    if (seen.has(key) || (perProduct && stated(k.gradeId) && products.has(k.gradeId))) return false;
    seen.add(key);
    products.add(k.gradeId);
    return true;
  });
}

// ------------------------------------------------------------------ kept for the frame's first screen until it is rebuilt

/** Where a key property's nearest value on file lacks the condition it is compared on, in short words (the first screen's). */
export function nearestLacks(h, b, x) {
  const unstated = (v) => !v || /^(unknown|not-stated|Not published|Not applicable|not-applicable)$/i.test(String(v));
  const out = [];
  const name = propertyName(b.property ?? '');
  if (b.property && !h.valueProperties?.includes(b.property)) out.push(/test unclear/i.test(name) ? 'test unclear' : lower(name));
  if (h.loadMPa != null) out.push(b.loadMPa != null ? (b.loadMPa !== h.loadMPa ? `at ${fmtNumber(b.loadMPa)} MPa` : null) : 'load not stated');
  if (h.notch) out.push(unstated(x?.notch) ? 'notch not stated' : x.notch !== h.notch ? lower(x.notch) : null);
  const moulded = b.printed === false && /moulded|resin/i.test(`${x?.specimenForm ?? ''} ${b.why ?? ''}`);
  if (moulded) out.push('a moulded bar');
  else if (h.direction) out.push(unstated(b.direction) ? 'orientation not stated' : b.direction !== h.direction ? `${b.direction} bar` : null);
  if (h.testTemperatureC != null && Number.isFinite(x?.testTemperatureC) && Math.abs(x.testTemperatureC - h.testTemperatureC) > 3) out.push(`tested at ${fmtNumber(x.testTemperatureC)} °C`);
  return out.filter(Boolean);
}

/** Who a print window rests on (the old first screen's words): "all 3 products", "most products". */
export function acceptSubject(k, n, total = n) {
  if (k === 'all') return n === total ? (n === 2 ? 'both products' : `all ${n} products`) : `all ${n} that give one`;
  if (k === 'most') return 'most products that give one';
  return `${k} of ${n} that give one`;
}

/** One comparison line (the old first screen's): "tensile modulus 35 % lower, HDT at 0.45 MPa 15 °C higher". */
export function versusWords(rows) {
  if (!rows.length) return '';
  const name = (r) => (r.key === 'priceCADkg' ? 'price' : inText(r.h.labels.plain.replace(/^Tensile /, '').replace(/ impact$/, '')));
  const differ = rows.filter((r) => !r.same).map((r) => (r.kind === 'diff' ? `${name(r)} ${fmtNumber(Math.abs(r.value))} °C ${r.value > 0 ? 'higher' : 'lower'}`
    : r.value >= 1 ? `${name(r)} ${(r.a / r.b).toFixed(1)} times as high` : `${name(r)} ${Math.round(Math.abs(r.value) * 100)} % ${r.value > 0 ? 'higher' : 'lower'}`));
  const same = rows.filter((r) => r.same).map(name);
  return [differ.join(', '), same.length ? `${andList(same)} about the same` : ''].filter(Boolean).join('; ');
}

