// Written summaries (D142): the paragraph at the head of a material's page, from data/tables/material_summaries.csv.
//
// A summary is editorial: words for a reader, deciding nothing. It states no number by hand. Each number is a
// placeholder in braces that this fills from the material's compiled values, so a summary cannot go stale beside the
// value it repeats: a corrected measurement moves the summary's number with it. A placeholder the material cannot fill
// (an unknown field, a property none of its products publishes comparably, quartiles of fewer than four products, a
// stray brace) stops the build (SUMMARY-PLACEHOLDER): the summary is re-worded, never filled with something else.
// A number typed outside a placeholder is the lint's to find (SUMMARY-NUMBER, lint-rules.js).
//
//   materials[].written = { by, on, status, parts: [{ text } | { field, value, unit?, bound? }] }
//
// Only a material with a row carries `written`. Its parts keep raw numbers; the page formats a filled value as its key
// figures do (format.js fmtNumber, a published bound's sign in front), so the two read alike. The page check (P12,
// test/pages.check.js) holds every filled value against the compiled spread and the page's own counts.
//
// The fields, all read from the compiled database (never from an estimate):
//
//   {products} {makers} {values} {profiles}   the material's products (active, not a reference grade), their makers,
//                                             its measurements with a number, its live print profiles: the counts its
//                                             page's masthead shows (app/js/ui/material-facts.js identity)
//   {name}                                    the material's name
//   {key.median|min|max|q1|q3}                a headline's spread across the products that publish it comparably
//                                             (materials[].summary[key], products.js); q1 and q3 from four products
//   {key.range}                               its lowest to its highest, as "min–max unit"
//   {key.n} {key.products}                    how many products it compares; how many products it was read across
//   {key.typical}                             the product nearest the median, by name
//   {key.label}                               the headline's name ("HDT at 0.45 MPa"; inside a sentence "tensile
//                                             modulus (XY)" as the page writes it there)
//   {nozzle.window} {bed.window}              the window most of its products give, as the page's On the H2C plate says
//                                             it ("195–230 °C", or "at least 50 °C"; material-highlights.js settingWindow)
//   {drying.schedule}                         the drying schedule of the products whose own or shared sheet gives one,
//                                             or the span where they differ ("50 °C for 6 h", "100–140 °C, 6–8 h";
//                                             material-highlights.js dryingSchedule)
//   {zshare.tensileStrength}                  the median share of its flat value its products keep across the layers
//                                             ("62 %"), and .tensileModulus, .elongation, .flexuralStrength,
//                                             .flexuralModulus (material-highlights.js zShare)
//
// `key` is any HeadlineKey of headline_definitions.csv, the price included. The counts ({products}, {makers}, {values},
// {profiles}) still fill, so older summaries build, but a summary that names one is a SUMMARY-COUNT lint finding: the
// page's head says how many products and makers there are, and a summary says what the material is (pages reimagined,
// 2026-10-17).

import { productName } from './products.js';
import { settingWindow, dryingSchedule, zShare, ZSHARE_PAIRS } from '../../app/js/ui/material-highlights.js';

/** The counts a summary may name, as the page's masthead counts them. */
export const COUNT_FIELDS = ['products', 'makers', 'values', 'profiles'];
/** What a summary may ask of a headline. */
export const HEADLINE_PARTS = ['median', 'min', 'max', 'q1', 'q3', 'range', 'n', 'products', 'typical', 'label'];
/** The fields of how it prints and how it holds across the layers, each from the page's own display rules. */
export const PRINT_FIELDS = ['nozzle.window', 'bed.window', 'drying.schedule', ...Object.keys(ZSHARE_PAIRS).map((k) => `zshare.${k}`)];

/** A name inside a sentence: "tensile modulus (XY)", but "HDT at 0.45 MPa" keeps its capitals (app/js/ui/text.js inSentence). */
const inSentence = (name) => (/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);

/** A well-formed placeholder: braces around anything but another brace. */
const PLACEHOLDER = /\{([^{}]*)\}/g;

// Whether a stored cell states something: as app/js/ui/text.js `stated`, which the page counts makers by.
const stated = (v) => !!v && !/^(not published|not applicable|not stated|not recorded|n\/a)\b/i.test(String(v).trim());
const isProduct = (g) => !/-R\d+$/.test(g.id);

/**
 * The sign of a published bound ("> 500 %") the way the page writes it, or null: '>' or '≥' for a lower limit, '<' or
 * '≤' for an upper one (app/js/engine/constraints.js boundOf).
 */
function boundSign(interval) {
  if (!interval) return null;
  const { lo, hi, openLow, openHigh } = interval;
  if (lo != null && hi == null) return openLow ? '>' : '≥';
  if (hi != null && lo == null) return openHigh ? '<' : '≤';
  return null;
}

/**
 * What a summary can fill for one material: its counts, its name, and per headline its spread, unit, label and typical
 * product. `ix` holds the database's records by material ({ grades, measurements, profiles }: Maps of arrays) and its
 * grades by ID.
 */
export function fillContext(m, ix, registry) {
  const products = (ix.grades.get(m.id) ?? []).filter((g) => !g.retired && isProduct(g));
  return {
    m, products, msById: new Map((ix.measurements.get(m.id) ?? []).map((x) => [x.id, x])),
    counts: {
      products: products.length,
      makers: new Set(products.map((g) => g.manufacturer).filter(stated)).size,
      values: (ix.measurements.get(m.id) ?? []).filter((x) => x.numeric).length,
      profiles: (ix.profiles.get(m.id) ?? []).filter((p) => !p.retired).length,
    },
    headlines: new Map(registry.headlines.map((h) => [h.key, h])),
    gradeById: ix.gradeById,
  };
}

/** The database's records by material and its grades by ID, as fillContext reads them. */
export function indexForFill({ grades, measurements, profiles }) {
  const by = (rows) => {
    const out = new Map();
    for (const r of rows) (out.get(r.materialId) ?? out.set(r.materialId, []).get(r.materialId)).push(r);
    return out;
  };
  return { grades: by(grades), measurements: by(measurements), profiles: by(profiles), gradeById: new Map(grades.map((g) => [g.id, g])) };
}

/**
 * One placeholder's parts, or the reason it cannot be filled: { parts } | { refused }. A number is { field, value,
 * unit?, bound? }; a name is { text }.
 */
export function fillField(field, fc) {
  const { m, counts, headlines } = fc;
  if (COUNT_FIELDS.includes(field)) return { parts: [{ field, value: counts[field] }] };
  if (field === 'name') return { parts: [{ text: m.name }] };
  if (PRINT_FIELDS.includes(field)) return fillPrintField(field, fc);
  const at = field.indexOf('.');
  const key = at < 0 ? field : field.slice(0, at);
  const part = at < 0 ? null : field.slice(at + 1);
  const h = headlines.get(key);
  if (!h) return { refused: `{${field}} names no field the build fills: name, ${PRINT_FIELDS.map((f) => `{${f}}`).join(', ')}, or a headline key of headline_definitions.csv with .${HEADLINE_PARTS.join('|.')}` };
  if (!HEADLINE_PARTS.includes(part)) return { refused: `{${field}}: ${key} is a headline, and .${part ?? ''} is not one of what a summary may ask of it (.${HEADLINE_PARTS.join(', .')})` };
  if (part === 'label') return { parts: [{ text: fc.midSentence ? inSentence(h.labels.plain) : h.labels.plain }] };
  const s = m.summary?.[key];
  if (m.headline?.[key]?.notApplicable) return { refused: `{${field}}: ${h.labels.plain} does not apply to ${m.name}` };
  if (!s?.n) return { refused: `{${field}}: none of ${m.name}'s products publishes ${h.labels.plain} on a comparable basis` };
  const unit = h.unit;
  const edge = (end) => (s.bounds?.[end] === 'lower' ? '>' : s.bounds?.[end] === 'upper' ? '<' : null);
  const number = (stat, value, extra = {}) => ({ field: `${key}.${stat}`, value, ...extra });
  switch (part) {
    case 'n': case 'products': return { parts: [number(part, s[part])] };
    case 'typical': {
      const g = fc.gradeById.get(s.typical);
      return g ? { parts: [{ text: productName(g) }] } : { refused: `{${field}}: the typical product ${s.typical} is not in the database` };
    }
    case 'median': {
      // A median is a bound only where it is the value of a typical product that published one (constraints.js publishedBound).
      const e = m.headline?.[key];
      const sign = e?.typical?.value === e?.value ? boundSign(e?.typical?.interval) : null;
      return { parts: [number('median', s.median, { unit, ...(sign ? { bound: sign } : {}) })] };
    }
    case 'min': case 'max': {
      const sign = edge(part);
      return { parts: [number(part, s[part], { unit, ...(sign ? { bound: sign } : {}) })] };
    }
    case 'q1': case 'q3':
      if (!Number.isFinite(s[part])) return { refused: `{${field}}: quartiles are given from four products compared, and ${h.labels.plain} compares ${s.n}` };
      return { parts: [number(part, s[part], { unit })] };
    case 'range': {
      const lo = edge('min'), hi = edge('max');
      return { parts: [number('min', s.min, lo ? { bound: lo } : {}), { text: '–' }, number('max', s.max, { unit, ...(hi ? { bound: hi } : {}) })] };
    }
    default: return { refused: `{${field}} is not a field the build fills` };
  }
}

/** A print window, a drying schedule or an across-the-layers share, as parts, or why it cannot be filled. */
function fillPrintField(field, fc) {
  const { products = [], msById = new Map(), gradeById = new Map(), m } = fc;
  const [what, which] = field.split('.');
  if (what === 'nozzle' || what === 'bed') {
    const w = settingWindow(products, what);
    if (!w) return { refused: `{${field}}: no product of ${m.name} gives a ${what} window` };
    if (w.to == null) return { parts: [{ text: 'at least ' }, { field: `${field}.from`, value: w.from, unit: '°C' }] };
    if (w.from === w.to) return { parts: [{ field: `${field}.from`, value: w.from, unit: '°C' }] };
    return { parts: [{ field: `${field}.from`, value: w.from }, { text: '–' }, { field: `${field}.to`, value: w.to, unit: '°C' }] };
  }
  if (what === 'drying') {
    // One schedule where the products agree, the span where they differ ("100–140 °C, 6–8 h"): never a median no maker gave.
    const d = dryingSchedule(products);
    if (!d) return { refused: `{${field}}: no product of ${m.name} gives a drying temperature on its own sheet or one it shares` };
    const span = (name, lo, hi, unit) => (lo === hi ? [{ field: `${field}.${name}`, value: lo, unit }]
      : [{ field: `${field}.${name}.from`, value: lo }, { text: '–' }, { field: `${field}.${name}.to`, value: hi, unit }]);
    // "at 50 °C for 6 h", "at 50–60 °C for 4 h", "at 100–140 °C, 4–12 h": "for" wherever the time is one.
    const oneTime = d.hoursMin === d.hoursMax;
    return { parts: [...span('temp', d.tempMin, d.tempMax, '°C'), ...(d.hoursMin != null ? [{ text: oneTime ? ' for ' : ', ' }, ...span('hours', d.hoursMin, d.hoursMax, 'h')] : [])] };
  }
  const pair = ZSHARE_PAIRS[which];
  const s = pair ? zShare(products, pair[0], pair[1], msById, gradeById) : null;
  if (!s) return { refused: `{${field}}: no product of ${m.name} publishes both its flat and its across-the-layers value from one sheet` };
  return { parts: [{ field, value: Math.round(s.median * 100), unit: '%' }] };
}

/**
 * A summary's text as parts, every placeholder filled: { parts, refusals: [reason] }. A brace that opens or closes no
 * placeholder is refused, so a typo never reaches the page as a literal brace.
 */
export function fillSummary(text, fc) {
  const parts = [];
  const refusals = [];
  let last = 0;
  const words = (t) => {
    if (!t) return;
    if (/[{}]/.test(t)) refusals.push(`a stray brace in "${t.trim().slice(0, 60)}": a placeholder is {field}, one pair of braces around a field name`);
    parts.push({ text: t });
  };
  for (const x of String(text).matchAll(PLACEHOLDER)) {
    words(text.slice(last, x.index));
    last = x.index + x[0].length;
    // A headline's name inside a sentence is written as the page writes it there, its first letter lower-cased.
    const f = fillField(x[1].trim(), { ...fc, midSentence: /\S/.test(text.slice(0, x.index)) && !/[.!?]\s*$/.test(text.slice(0, x.index)) });
    if (f.refused) refusals.push(f.refused); else parts.push(...f.parts);
  }
  words(text.slice(last));
  // Adjacent words joined, so the parts read as the sentence does.
  const merged = [];
  for (const p of parts) {
    if (p.text != null && merged.at(-1)?.text != null && !merged.at(-1).field) merged.at(-1).text += p.text;
    else merged.push({ ...p });
  }
  return { parts: merged, refusals };
}

/**
 * Each material with a row of material_summaries.csv gets `written`: who wrote it, when, its review status, and its
 * parts. A row on a family entry, which has no page, or one with a placeholder the material cannot fill, is a
 * SUMMARY-PLACEHOLDER error naming the material and the field. Runs after attachProducts, which compiles the spreads.
 */
export function attachWritten(materials, rows, { grades, measurements, profiles, registry, issues }) {
  if (!rows?.length) return;
  const byId = new Map(materials.map((m) => [m.id, m]));
  const ix = indexForFill({ grades, measurements, profiles });
  for (const r of rows) {
    const where = `material_summaries ${r.MaterialID}`;
    const m = byId.get(r.MaterialID);
    if (!m || m.familyEntry) {
      issues.push({ level: 'error', code: 'SUMMARY-PLACEHOLDER', table: 'material_summaries', record: r.MaterialID, field: 'MaterialID', where, message: m ? `${m.name} is a family entry, which has no page and no summary` : 'no such material' });
      continue;
    }
    const { parts, refusals } = fillSummary(r.Summary ?? '', fillContext(m, ix, registry));
    for (const reason of refusals) issues.push({ level: 'error', code: 'SUMMARY-PLACEHOLDER', table: 'material_summaries', record: r.MaterialID, field: 'Summary', where, message: `${m.name}: ${reason}. Re-word the summary (AGENTS.md, "Write or revise a material's summary").` });
    if (refusals.length) continue;
    m.written = { by: r['Written by'], on: r['Written on'], status: r['Review status'], parts };
  }
}
