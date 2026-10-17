// Display statistics the material pages draw and the drawer does not: where a material's medians stand among every
// material's, how many of its products accept each print temperature, how much of the flat value each product keeps
// across the layers, a strength against stiffness map of every material, and a ladder of its temperatures. Pure data, no
// markup, no words: the pages' sentences are app/pages/findings.js's. Every input is a compiled field (materials[].headline,
// .summary, grades[].print, grades[].headline through material-facts.js spreadEntries, measurements[]) or a count of
// them; nothing here chooses a product's value, decides a gate or estimates, and the drawer reads none of it.
//
// The medians and quartiles are worked out as the build summarises a headline (build/src/products.js summarise, and
// print-spread.js rowSummary, which this module reuses): the median, and the quartiles from four values, linear between
// the nearest two.

import { REGISTRY } from './registry.js';
import { h2cLimit, materialName } from './labels.js';
import { isProduct, spreadEntries, dotMarks, rankOf } from './material-facts.js';
import { rowSummary } from './print-spread.js';
import { stripScale } from './scales.js';

/** A summary `{ n, median, q1, q3, min, max }` of plain numbers, on the build's rule (quartiles from four values). */
export const summarise = (values) => rowSummary(values.map((value) => ({ value, origin: 'own', variant: false })));

// ------------------------------------------------------------------ standing among the materials

/**
 * Where `value` falls among every other material's median of one key property (`rank` is material-facts.js
 * rankTable()[key]): `{ pct, below, level, above, others }`, `pct` the share of the other materials' medians below it
 * (a tie counts half), 0 to 100. Null where no other material has a value.
 */
export function percentileAmong(rank, materialId, value) {
  if (!rank || !Number.isFinite(value)) return null;
  const others = rank.entries.filter((x) => x.id !== materialId);
  if (!others.length) return null;
  const below = others.filter((x) => x.value < value).length;
  const level = others.filter((x) => x.value === value).length;
  return { pct: ((below + level / 2) / others.length) * 100, below, level, above: others.length - below - level, others: others.length };
}

/**
 * A material's standing on each key property in `keys` (registry headline keys; the selectable ones by default), from its
 * median (materials[].headline[key].value, a measured median, never an estimate) and its products' middle half
 * (materials[].summary[key].q1, q3), placed among every other material's median (`ranks`, material-facts.js rankTable).
 * One row per key, in the order given: `{ key, h, known, median, n, q1, q3, min, max, at (percentileAmong of the median),
 * lo, hi (the quartiles' places, 0 to 100, or null under four products), rank (material-facts.js rankOf) }`; a key the
 * material has no comparable value for is `{ key, h, known: false }`.
 */
export function propertyProfile(m, ranks, keys = REGISTRY.headlines.map((h) => h.key)) {
  return keys.map((key) => {
    const h = REGISTRY.allHeadlines.find((x) => x.key === key) ?? null;
    const e = m.headline?.[key];
    if (!h || !e?.known) return { key, h, known: false };
    const s = m.summary?.[key] ?? {};
    const sp = e.spread ?? {};
    const rank = ranks?.[key];
    const at = percentileAmong(rank, m.id, e.value);
    const q1 = s.q1 ?? sp.q1 ?? null, q3 = s.q3 ?? sp.q3 ?? null;
    return {
      key, h, known: true, median: e.value, n: sp.n ?? s.n ?? 1, q1, q3, min: sp.min ?? e.value, max: sp.max ?? e.value,
      at, lo: q1 != null ? percentileAmong(rank, m.id, q1)?.pct ?? null : null, hi: q3 != null ? percentileAmong(rank, m.id, q3)?.pct ?? null : null,
      rank: rank ? rankOf(rank, m.id) : null,
    };
  });
}

// ------------------------------------------------------------------ the material map

/**
 * Every material's median of two key properties, for a map of one against the other (strength against stiffness, the way
 * an Ashby chart places materials), zoomed on this material's neighbourhood. `{ points: [{ id, name, x, y, products,
 * self }] (every material with a known median of both, rankTable), xLog, yLog (each axis on the scale rule: logarithmic
 * where its values span more than ten times), nearest: [ids] (the other materials by their distance from this one's
 * medians in the map's own space: decades on a logarithmic axis, hundreds of °C on a linear one), window: { x: [lo, hi],
 * y: [lo, hi] } (the box holding this material's medians, the points in `include` (its products and middle half) and the
 * `neighbours` nearest materials, padded), landmarks: [ids] (the `label` nearest, named on the map) }`. By rule, never by
 * hand; the material itself is never a landmark.
 */
export function materialMap(db, ranks, xKey, yKey, materialId, { label = 7, neighbours = 24, include = [] } = {}) {
  const xs = new Map((ranks?.[xKey]?.entries ?? []).map((e) => [e.id, e.value]));
  const ys = new Map((ranks?.[yKey]?.entries ?? []).map((e) => [e.id, e.value]));
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  const points = [...xs.keys()].filter((id) => ys.has(id)).map((id) => {
    const m = byId.get(id);
    return { id, name: materialName(m.name).primary ?? m.name, x: xs.get(id), y: ys.get(id), products: m.gradeIds?.length ?? 0, self: id === materialId };
  });
  const xLog = stripScale(points.map((p) => p.x), REGISTRY.allHeadlines.find((h) => h.key === xKey)?.unit).log;
  const yLog = stripScale(points.map((p) => p.y), REGISTRY.allHeadlines.find((h) => h.key === yKey)?.unit).log;
  // The map's own space: a decade on a logarithmic axis is as far as 100 units on a linear one (°C).
  const tx = (v) => (xLog ? Math.log10(v) : v / 100), ty = (v) => (yLog ? Math.log10(v) : v / 100);
  const self = points.find((p) => p.self);
  const dist = (p) => Math.hypot(tx(p.x) - tx(self.x), ty(p.y) - ty(self.y));
  const others = points.filter((p) => !p.self).sort((a, b) => dist(a) - dist(b) || a.name.localeCompare(b.name));
  if (!self) return { points, xLog, yLog, nearest: others.map((p) => p.id), window: null, landmarks: [] };
  const held = [self, ...include.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), ...others.slice(0, neighbours)];
  const span = (vals, t, log) => {
    const lo = Math.min(...vals.map(t)), hi = Math.max(...vals.map(t));
    const pad = Math.max((hi - lo) * 0.08, log ? 0.12 : 0.08);
    const back = (v) => (log ? 10 ** v : v * 100);
    return [back(lo - pad), back(hi + pad)];
  };
  const window = { x: span(held.map((p) => p.x), tx, xLog), y: span(held.map((p) => p.y), ty, yLog) };
  const inside = (p) => p.x >= window.x[0] && p.x <= window.x[1] && p.y >= window.y[0] && p.y <= window.y[1];
  return { points, xLog, yLog, nearest: others.map((p) => p.id), window, landmarks: others.filter(inside).slice(0, label).map((p) => p.id) };
}

/**
 * The materials a reader knows to place a value by: the `count` with the most products (then by name), never `except`.
 * The property profile ticks them on its tracks.
 */
export function landmarkMaterials(db, count = 3, except = null) {
  return db.materials.filter((m) => !m.familyEntry && m.id !== except)
    .sort((a, b) => (b.gradeIds?.length ?? 0) - (a.gradeIds?.length ?? 0) || a.name.localeCompare(b.name)).slice(0, count)
    .map((m) => ({ id: m.id, name: materialName(m.name).primary ?? m.name }));
}

// ------------------------------------------------------------------ across the layers

/**
 * Each product's flat (XY) and across-the-layers (Z) value of one property, for headlines `a` (XY) and `b` (Z) of a
 * comparison (`byKey` is comparisonsOf().byKey): `[{ g, xy, z, ratio, marks }]`, `xy` and `z` the spreadEntries entries.
 * The same products, on the same rules, as material-facts.js shareOf (two comparable values, neither a special
 * formulation, from one document, in one annealing state), so `ratio` is shareOf's share, product by product. Empty
 * where the two are not one property in two orientations.
 */
export function layerPairs(a, b, byKey, c) {
  if (!a.direction || !b.direction || a.direction === b.direction || a.valueProperties.join(';') !== b.valueProperties.join(';')) return [];
  const out = [];
  for (const ea of byKey.get(a.key) ?? []) {
    const eb = (byKey.get(b.key) ?? []).find((x) => x.g.id === ea.g.id);
    if (!eb || ea.variant || eb.variant || ea.v.level !== 'comparable' || eb.v.level !== 'comparable' || !(ea.v.value > 0)) continue;
    const xa = c.msById.get(ea.v.measurementId), xb = c.msById.get(eb.v.measurementId);
    const schedule = (v) => (v.anneal ? `${v.anneal.tempC}:${v.anneal.hours}` : null);
    if (!xa || !xb || xa.property !== xb.property || xa.sourceId !== xb.sourceId || schedule(ea.v) !== schedule(eb.v)) continue;
    out.push({ g: ea.g, xy: ea, z: eb, ratio: eb.v.value / ea.v.value, marks: [...new Set([...dotMarks(a, ea, c), ...dotMarks(b, eb, c)])] });
  }
  return out;
}

// ------------------------------------------------------------------ print windows

/**
 * How many of a material's products accept each temperature of one print setting (nozzle, bed or chamber), from each
 * product's print gate (grades[].print[axis], as print-spread.js reads it). A product's window is drawn where its gate
 * gives both ends; it is counted where it comes from the product's own data sheet or one it shares (not the Bambu Lab
 * Filament Guide, which speaks for every product that reads it) and the product is not a special formulation, as
 * rowSummary counts a print row.
 *
 * `{ axis, limit, windows: [{ g, min, max, origin, variant, counted, profileId }] (lowest end first), n (counted),
 * guide, variant (drawn, not counted), oneEnd (windows with one end), ends: [{ g, min, max, origin }] (those windows),
 * states: Map(state → products with no window), stateOrigins: Map(state → { own, twin, guide }) (where each state was read),
 * runs: [{ from, to, k }] (whole degrees, k the counted windows that include every degree from..to), peak: { k, from, to }
 * (the widest run of the most, the lowest of equals), most: { from, to } | null (the degrees more than half the counted
 * windows include, about the peak), every: { from, to } | null (those all of them include) }`. Runs, peak, most and every
 * are null or empty where nothing is counted.
 */
export function printWindows(products, axis) {
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const windows = [];
  const states = new Map();
  let oneEnd = 0;
  const ends = [];
  const stateOrigins = new Map();
  for (const g of products) {
    const v = g.print?.[axis];
    const origin = g.print?.from?.[axis]?.origin ?? 'own';
    if (v?.state !== 'range') {
      const state = v?.state ?? 'unknown';
      states.set(state, (states.get(state) ?? 0) + 1);
      const o = stateOrigins.get(state) ?? { own: 0, twin: 0, guide: 0 };
      o[origin] = (o[origin] ?? 0) + 1;
      stateOrigins.set(state, o);
      continue;
    }
    if (v.min == null || v.max == null) { oneEnd++; ends.push({ g, min: v.min ?? null, max: v.max ?? null, origin }); continue; }
    const variant = !variantOnly && !!g.variant;
    windows.push({ g, min: v.min, max: v.max, origin, variant, counted: origin !== 'guide' && !variant, profileId: v.profileId ?? null });
  }
  windows.sort((p, q) => p.min - q.min || p.max - q.max || p.g.id.localeCompare(q.g.id));
  const counted = windows.filter((w) => w.counted);
  const n = counted.length;
  const out = { axis, limit: h2cLimit(axis) ?? null, windows, n, guide: windows.filter((w) => w.origin === 'guide' && !w.variant).length,
    variant: windows.filter((w) => w.variant).length, oneEnd, ends, states, stateOrigins, runs: [], peak: null, most: null, every: null };
  if (!n) return out;
  const lo = Math.floor(Math.min(...counted.map((w) => w.min))), hi = Math.ceil(Math.max(...counted.map((w) => w.max)));
  for (let t = lo; t <= hi; t++) {
    const k = counted.filter((w) => w.min <= t && t <= w.max).length;
    const last = out.runs.at(-1);
    if (last && last.k === k && last.to === t - 1) last.to = t; else out.runs.push({ from: t, to: t, k });
  }
  const top = Math.max(...out.runs.map((r) => r.k));
  out.peak = out.runs.filter((r) => r.k === top).sort((p, q) => (q.to - q.from) - (p.to - p.from) || p.from - q.from)[0];
  // The span about the peak where each degree is in more than half (or all) of the counted windows.
  const span = (ok) => {
    if (!ok(out.peak.k)) return null;
    const i = out.runs.indexOf(out.peak);
    let a = i, b = i;
    while (a > 0 && ok(out.runs[a - 1].k) && out.runs[a - 1].to === out.runs[a].from - 1) a--;
    while (b < out.runs.length - 1 && ok(out.runs[b + 1].k) && out.runs[b + 1].from === out.runs[b].to + 1) b++;
    return { from: out.runs[a].from, to: out.runs[b].to };
  };
  out.most = span((k) => k > n / 2);
  out.every = span((k) => k === n);
  return out;
}

/** How many counted windows include temperature `t` (printWindows' runs). */
export const acceptedAt = (pw, t) => pw.runs.find((r) => r.from <= t && t <= r.to)?.k ?? 0;

/**
 * What the products' print gates say about drying (grades[].print.drying), by where it was read: `{ have (products with
 * drying advice: a schedule, advice for a condition, or that none is needed), own, twin, guide (of those, read from
 * their own sheet, a sheet they share, Bambu Lab's Filament Guide), none (products with no advice), needs: { required,
 * optional, not-needed } }`.
 */
export function dryingAdvice(products) {
  const out = { have: 0, own: 0, twin: 0, guide: 0, none: 0, needs: { required: 0, optional: 0, 'not-needed': 0 } };
  for (const g of products) {
    const d = g.print?.drying;
    if (!d || !(d.need in out.needs)) { out.none++; continue; }
    out.have++;
    out.needs[d.need]++;
    out[g.print?.from?.drying?.origin ?? 'own']++;
  }
  return out;
}

/**
 * The drying temperatures and times the products' own sheets give (grades[].print.drying, a sheet a product shares
 * included, the guide and special formulations left out as rowSummary leaves them out): `{ temps (rowSummary of the
 * temperatures), hours (summarise of the times stated), products, entries: [{ g, value, origin, variant, counted }] }`.
 */
export function dryingStats(products) {
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const entries = [];
  for (const g of products) {
    const d = g.print?.drying;
    if (d?.tempC == null || d.need === 'not-needed') continue;
    const origin = g.print?.from?.drying?.origin ?? 'own';
    const variant = !variantOnly && !!g.variant;
    entries.push({ g, value: d.tempC, hours: d.hours ?? null, origin, variant, counted: origin !== 'guide' && !variant });
  }
  const counted = entries.filter((e) => e.counted);
  return { temps: rowSummary(entries), hours: summarise(counted.map((e) => e.hours).filter((x) => x != null)), products: products.length, entries };
}

// ------------------------------------------------------------------ the temperatures a part meets

/**
 * A material's temperatures on one axis, lowest first: each key property in °C that some product publishes comparably
 * (glass transition, HDT at both loads: materials[].summary[key], the build's own summary), then each property in
 * `extra` (Vicat, melting) from the values its products publish, one per product (the median of a product's own), every
 * numeric value in °C that is not held back or flagged implausible, whatever its test conditions; special formulations
 * left out of the median as rowSummary leaves them out. `[{ id, label, h (the headline, or null), compared (a key
 * property's comparable values, or values as published), summary: { n, median, q1, q3, min, max } }]`, by median.
 */
export function heatLadder(m, c, extra = []) {
  const rows = [];
  for (const h of REGISTRY.allHeadlines.filter((x) => x.unit === '°C')) {
    const s = m.summary?.[h.key];
    if (s?.n) rows.push({ id: h.key, label: h.labels.plain, h, compared: true, summary: s });
  }
  const variantOnly = c.grades.length > 0 && c.grades.filter(isProduct).every((g) => g.variant);
  for (const property of extra) {
    const byGrade = new Map();
    for (const x of c.ms) {
      if (x.property !== property || !x.numeric || x.unit !== '°C' || x.quarantined || x.implausible || !Number.isFinite(x.value)) continue;
      const g = c.gradeById.get(x.gradeId);
      if (!g || g.retired || !isProduct(g)) continue;
      (byGrade.get(g.id) ?? byGrade.set(g.id, { g, values: [] }).get(g.id)).values.push(x.value);
    }
    if (!byGrade.size) continue;
    const entries = [...byGrade.values()].map(({ g, values }) => ({ value: summarise(values).median, origin: 'own', variant: !variantOnly && !!g.variant }));
    rows.push({ id: property, label: property, h: null, compared: false, summary: rowSummary(entries) });
  }
  return rows.filter((r) => r.summary.n).sort((p, q) => p.summary.median - q.summary.median);
}

// ------------------------------------------------------------------ helpers the pages share

/** The products of a material (no reference grades). */
export const productsOf = (c) => c.grades.filter(isProduct);

/** Each product's own value of a key property with the product (spreadEntries), as a Map by grade ID. */
export const valuesByGrade = (m, c, key) => new Map(spreadEntries(m, c, key).map((e) => [e.g.id, e]));
