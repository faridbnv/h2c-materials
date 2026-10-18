// Display statistics the material pages draw and the drawer does not: how many of its products accept each print
// temperature, how much of the flat value each product keeps across the layers, the alternatives to a material and the
// frames of the maps and strips that compare them, and a ladder of its temperatures. Pure data, no
// markup, no words: the pages' sentences are app/pages/findings.js's. Every input is a compiled field (materials[].headline,
// .summary, grades[].print, grades[].headline through material-facts.js spreadEntries, measurements[]) or a count of
// them; nothing here chooses a product's value, decides a gate or estimates, and the drawer reads none of it.
//
// The medians and quartiles are worked out as the build summarises a headline (build/src/products.js summarise, and
// print-spread.js rowSummary, which this module reuses): the median, and the quartiles from four values, linear between
// the nearest two.

import { REGISTRY } from './registry.js';
import { h2cLimit } from './labels.js';
import { isProduct, dotMarks, materialContext, spreadEntries, shareOf } from './material-facts.js';
import { rowSummary } from './print-spread.js';
import { stripScale } from './scales.js';
import { pageOf } from './page-rule.js';

/** A summary `{ n, median, q1, q3, min, max }` of plain numbers, on the build's rule (quartiles from four values). */
export const summarise = (values) => rowSummary(values.map((value) => ({ value, origin: 'own', variant: false })));

/**
 * A material's medians against another material's, key by key (`keys`, registry headline keys), from the compiled
 * medians (materials[].headline[key].value, known only): `[{ key, h, a (this one's), b (the other's), kind: 'diff'
 * (°C: a − b) | 'ratio' (a / b − 1), value, n (this one's products compared), same (within `same` of the other's
 * value, 5 % by default) }]`, only keys both
 * know. Display only.
 */
export function compareMedians(m, other, keys, { same = 0.05 } = {}) {
  return keys.map((key) => {
    const h = REGISTRY.allHeadlines.find((x) => x.key === key);
    const ea = m.headline?.[key], eb = other.headline?.[key];
    if (!h || !ea?.known || !eb?.known || !(eb.value > 0)) return null;
    const a = ea.value, b = eb.value;
    const kind = h.unit === '°C' ? 'diff' : 'ratio';
    return { key, h, a, b, n: ea.spread?.n ?? m.summary?.[key]?.n ?? 1, kind, value: kind === 'diff' ? a - b : a / b - 1, same: Math.abs(a - b) <= same * Math.abs(b) };
  }).filter(Boolean);
}

/**
 * How a polymer solidifies in a print (polymers[].morphology and .asPrinted, by the material's estimate identity): true
 * where it is amorphous, or a semicrystalline polymer that prints amorphous (and, for one that does so unless
 * fibre-filled, the material is not fibre-filled); false where it crystallises; null where the data does not say.
 */
export function printsAmorphous(m, db) {
  const p = (db.polymers ?? []).find((x) => x.id === m.estimateIdentity);
  if (!p) return null;
  if (p.morphology === 'amorphous') return true;
  if (p.asPrinted === 'prints amorphous') return true;
  if (p.asPrinted === 'prints amorphous unless fibre-filled') return !m.facets?.fibre?.value;
  if (p.morphology === 'semicrystalline') return false;
  return null;
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
 * states: Map(state → products with no window), stateOrigins: Map(state → { own, twin, guide, family }) (where each state was read),
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
      const o = stateOrigins.get(state) ?? { own: 0, twin: 0, guide: 0, family: 0 };
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

/**
 * The window a page states for one print setting (D145): the span more than half of the counted windows include, said
 * "all" only where every window includes the whole of it; the one window where only one is counted; the widest run of
 * the most where no span reaches half. One rule, so the On the H2C plate, the settings table, the temperatures figure
 * and a summary's {nozzle.window} cannot give two numbers for one setting (PA6 read "260 °C, all 7" beside "250–280 °C,
 * accepted by all 7", where all seven accept 260 °C alone). `{ from, to, share: 'one' | 'all' | 'most' | 'peak', k }` or
 * null.
 */
export function typicalWindow(pw) {
  if (!pw?.n) return null;
  if (pw.n === 1) { const w = pw.windows.find((x) => x.counted); return w ? { from: w.min, to: w.max, share: 'one', k: 1 } : null; }
  const s = pw.most ?? pw.peak;
  if (!s) return null;
  const all = !!pw.every && pw.every.from === s.from && pw.every.to === s.to;
  return { from: s.from, to: s.to, share: !pw.most ? 'peak' : all ? 'all' : 'most', k: pw.most ? null : pw.peak.k };
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

// ------------------------------------------------------------------ the alternatives, and comparing with them

const known = (m, key) => (m.headline?.[key]?.known ? m.headline[key].value : null);
const fibreOf = (m) => !!m.facets?.fibre?.value;
const flexibleOf = (m) => !!m.facets?.flexible?.value;
const supportOf = (m) => !!m.facets?.supportMaterial?.value || String(m.family ?? '').startsWith('Support');
const esdOf = (m) => !!m.facets?.esd?.value;
const byProducts = (a, b) => (b.gradeIds?.length ?? 0) - (a.gradeIds?.length ?? 0) || a.name.localeCompare(b.name);

/** Whether a material is drawn among the flexible ones (its own frame on the maps, its own alternatives). */
export const isFlexible = flexibleOf;

/**
 * The materials an engineer weighs this one against, by rule (display only; nothing is chosen by hand and nothing here
 * decides): of the materials with a page (page-rule.js pageOf), leaving out special classes (materials[].variantClass:
 * silk, particle-filled), support materials, ESD grades, and flexible with rigid (facets.flexible): up to two of the same
 * base polymer (materials[].basePolymer), the other fibre state first (facets.fibre), then by products; the two with the
 * most products of the same fibre state whose median HDT at 0.45 MPa lies within the larger of 20 °C and 20 % of this
 * one's (its glass transition where it has no HDT); the one with the most products above that window; filled to `max` by
 * the nearest HDT. A material with neither (the flexible ones) takes its own polymer's, then the most documented. Never a
 * material beyond the H2C's limits (materials[].excluded), on any page. Deterministic: every tie is broken by name. `ix` is
 * material-facts.js indexDb(db). Returns the materials, in that order.
 */
export function peerSet(db, m, ix, { max = 5 } = {}) {
  const hasPage = (x) => !x.familyEntry && !!pageOf(x, ix.measurementsByMaterial.get(x.id) ?? []);
  // Never a material beyond the H2C's limits (materials[].excluded), on any page, an excluded material's own included:
  // the alternatives are what an engineer could print on the H2C instead.
  // A foaming (lightweight) material is an alternative only to another: its density and stiffness are of another kind,
  // and nobody weighs PLA Aero against PETG (materials[].facets.reinforcement 'foaming', which has no variant class).
  const foaming = (x) => x.facets?.reinforcement?.value === 'foaming';
  const pool = db.materials.filter((x) => x.id !== m.id && hasPage(x) && !x.excluded && !x.variantClass && !supportOf(x) && flexibleOf(x) === flexibleOf(m) && !esdOf(x) && foaming(x) === foaming(m));
  const same = pool.filter((x) => x.basePolymer === m.basePolymer)
    .sort((a, b) => (fibreOf(a) === fibreOf(m)) - (fibreOf(b) === fibreOf(m)) || byProducts(a, b)).slice(0, 2);
  // Heat resistance places the others: HDT at 0.45 MPa, or the glass transition where this material has no HDT.
  const prop = known(m, 'hdt045') != null ? 'hdt045' : known(m, 'glassTransition') != null ? 'glassTransition' : null;
  const others = pool.filter((x) => !same.includes(x) && x.basePolymer !== m.basePolymer && fibreOf(x) === fibreOf(m));
  const out = [...same];
  if (prop) {
    const h = known(m, prop);
    const rated = others.filter((x) => known(x, prop) != null);
    const win = Math.max(20, 0.2 * Math.abs(h));
    out.push(...rated.filter((x) => Math.abs(known(x, prop) - h) <= win).sort(byProducts).slice(0, 2));
    out.push(...rated.filter((x) => known(x, prop) > h + win && !out.includes(x)).sort(byProducts).slice(0, 1));
    const near = rated.filter((x) => !out.includes(x)).sort((a, b) => Math.abs(known(a, prop) - h) - Math.abs(known(b, prop) - h) || a.name.localeCompare(b.name));
    for (const x of near) { if (out.length >= max) break; out.push(x); }
  }
  // Where heat places too few, the most documented of the rest.
  for (const x of others.filter((o) => !out.includes(o)).sort(byProducts)) { if (out.length >= max) break; out.push(x); }
  return out.slice(0, max);
}

/**
 * One material's value of one key property, as the pages draw it: `{ kind: 'compared', median, q1, q3, min, max, n }`
 * from materials[].headline[key] (a measured median, never an estimate) and materials[].summary[key] (quartiles from four
 * products); else `{ kind: 'open', min, max, n }` from summary[key].asPublished (values with no stated orientation or load,
 * not compared); else null.
 */
export function materialCell(m, key) {
  const e = m.headline?.[key], s = m.summary?.[key] ?? {};
  if (e?.known) {
    const sp = e.spread ?? {};
    return { kind: 'compared', median: e.value, q1: s.q1 ?? sp.q1 ?? null, q3: s.q3 ?? sp.q3 ?? null,
      min: s.min ?? sp.min ?? e.value, max: s.max ?? sp.max ?? e.value, n: s.n ?? sp.n ?? 1 };
  }
  if (s.asPublished?.n) return { kind: 'open', min: s.asPublished.min, max: s.asPublished.max, n: s.asPublished.n };
  return null;
}

/**
 * Z as a share of XY over a material's products (material-facts.js shareOf, on headlines `a` and `b`, registry
 * headline objects): `{ share (the median), n, shares }`, or null where no product publishes both from one sheet. `c` may
 * be passed for the material's own context; another material's is built.
 */
export function layerShareOf(db, mat, a, b, c = null) {
  const cc = c ?? materialContext(db, mat.id, { showEstimates: true });
  const byKey = new Map([a, b].map((h) => [h.key, spreadEntries(mat, cc, h.key)]));
  const shares = shareOf(a, b, byKey, cc);
  return shares ? { share: summarise(shares).median, n: shares.length, shares } : null;
}

/**
 * Which key property's products spread most: the largest q3 / q1 among `keys` with four compared products or more
 * (materials[].summary[key]), as `{ key, q1, q3, n, ratio }`, or null.
 */
export function widestSpread(m, keys) {
  let best = null;
  for (const key of keys) {
    const s = m.summary?.[key];
    if (!s || (s.n ?? 0) < 4 || !(s.q1 > 0) || s.q3 == null) continue;
    const ratio = s.q3 / s.q1;
    if (!best || ratio > best.ratio) best = { key, q1: s.q1, q3: s.q3, n: s.n, ratio };
  }
  return best;
}

/**
 * Where this material's median stands against its alternatives' on each key: `{ high: [keys], low: [keys] }`, a key
 * counted only where three materials or more have a median and this one leads (or trails) the next by 5 % (3 °C for a
 * temperature), as compareMedians calls two values the same.
 */
export function peerContrast(m, peers, keys) {
  const out = { high: [], low: [] };
  for (const key of keys) {
    const h = REGISTRY.allHeadlines.find((x) => x.key === key);
    const own = known(m, key);
    if (!h || own == null) continue;
    const vals = [own, ...peers.map((p) => known(p, key)).filter((v) => v != null)].sort((a, b) => b - a);
    if (vals.length < 3) continue;
    const clear = (a, b) => (h.unit === '°C' ? a - b >= 3 : a >= b * 1.05);
    if (vals[0] === own && clear(own, vals[1])) out.high.push(key);
    if (vals.at(-1) === own && clear(vals.at(-2), own)) out.low.push(key);
  }
  return out;
}

/**
 * The frame of a map of every material's median of `yKey` against `xKey` (material-facts.js rankTable `ranks`), one per
 * kind (rigid or flexible, facets.flexible), the same on every page of that kind: the scale rule over the kind's medians,
 * and, on a logarithmic axis, without the two furthest out at each end where the axis stays logarithmic, so a few far-off
 * materials (a modulus of 0.005 GPa) do not set it; they are drawn pinned to its edge. A linear axis holds every material. `{ points: [{ id, m, x, y }], xs, ys }`, `xs` and
 * `ys` stripScale results.
 */
export function mapFrame(db, ranks, xKey, yKey, flexible = false) {
  const unitOf = (key) => REGISTRY.allHeadlines.find((h) => h.key === key)?.unit;
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  const xs0 = new Map((ranks?.[xKey]?.entries ?? []).map((e) => [e.id, e.value]));
  const ys0 = new Map((ranks?.[yKey]?.entries ?? []).map((e) => [e.id, e.value]));
  const points = [...xs0.keys()].filter((id) => ys0.has(id) && flexibleOf(byId.get(id)) === flexible)
    .map((id) => ({ id, m: byId.get(id), x: xs0.get(id), y: ys0.get(id) }));
  if (!points.length) return { points, xs: null, ys: null };
  const trim = (vs) => (vs.length > 8 ? [...vs].sort((a, b) => a - b).slice(2, -2) : vs);
  const frame = (vs, unit) => { const all = stripScale(vs, unit); if (!all.log) return all; const t = stripScale(trim(vs), unit); return t.log ? t : all; };
  return { points, xs: frame(points.map((p) => p.x), unitOf(xKey)), ys: frame(points.map((p) => p.y), unitOf(yKey)) };
}

// ------------------------------------------------------------------ one scale per property, on every page

const PROPERTY_SCALES = new WeakMap();

/**
 * The scale a key property is drawn on, the same on every page of a kind (rigid or flexible, facets.flexible): the scale
 * rule (scales.js stripScale) over the kind's materials' medians (material-facts.js rankTable `ranks`), without the two
 * furthest at each end where the kind has more than eight, so a few far-off materials do not set it. A property is thus
 * logarithmic or linear on every page alike. Values beyond it are drawn as an edge marker by the figures. null where no
 * material of the kind has a median.
 */
export function propertyScale(db, ranks, key, flexible = false) {
  let cache = PROPERTY_SCALES.get(db);
  if (!cache) PROPERTY_SCALES.set(db, (cache = new Map()));
  const id = `${key}|${flexible ? 'flexible' : 'rigid'}`;
  if (cache.has(id)) return cache.get(id);
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  const vals = (ranks?.[key]?.entries ?? []).filter((e) => { const m = byId.get(e.id); return m && flexibleOf(m) === flexible; }).map((e) => e.value).sort((a, b) => a - b);
  const unit = REGISTRY.allHeadlines.find((h) => h.key === key)?.unit;
  const sc = vals.length ? stripScale(vals.length > 8 ? vals.slice(2, -2) : vals, unit) : null;
  cache.set(id, sc);
  return sc;
}
