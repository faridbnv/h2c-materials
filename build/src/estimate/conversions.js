// Conversions: every related observation enters a headline's model converted to the headline's semantics, with a
// documented offset and spread refined by grades that publish both; and the spread between two products of one
// material, measured directly.

import { median } from './numerics.js';
import { HEAD } from './model.js';
import { meltingPoint } from './gaussian.js';

function documentedConversion(key, kind, model) {
  const table = model.conversions[key] ?? {};
  if (table[kind]) return table[kind];
  if (kind === 'HDT 0.45') return null;
  // An annealed related kind has no row of its own: conversions() composes it from its as-printed kind's and the
  // headline's annealed kind's learned offsets (D167).
  if (ANNEALED.test(kind)) return null;
  const wetClass = kind.endsWith(' wet') ? 'high' : kind.endsWith(' wet-low') ? 'low' : null;
  const wet = wetClass && model.wet[wetClass]?.[key];
  if (wet) {
    const dry = table[kind.replace(/ wet(-low)?$/, '')];
    // A conditioned value of an unknown direction keeps its dry kind's cap; it learns from its own pairs alone.
    if (dry) return { offset: dry.offset + wet.offset, sd: Math.hypot(dry.sd, wet.sd), why: `${dry.why}; measured after moisture conditioning (${wetClass} water uptake)`, learns: /down only$/.test(dry.learns ?? '') ? 'pairs, down only' : 'pairs' };
  }
  return null;
}

// An annealed kind (observations.js, D162, D167): the headline's own ('tensile XY annealed', 'HDT 0.45 annealed glassy')
// or a related one ('HDT 1.8 semi-filled annealed', 'tensile Z annealed').
const ANNEALED = / (annealed(?: glassy)?)$/;

/**
 * Conversions: the documented offset and spread, refined by formulations that publish both the
 * headline's semantics and the related kind. The median difference and a MAD spread are used, so one
 * odd data sheet cannot move a conversion; the documented value counts as fitting.documentedPairs pairs.
 *
 * `without` leaves out the pairs of these products (a Set of `${materialId}|${formulation}`): a hold-out that hides a
 * headline must not convert the remaining values with an offset its own hidden headlines helped learn.
 */
export function conversions(key, raw, model, { without = null } = {}) {
  const byF = new Map(), makerOf = new Map();
  // A bound is not an exact value, so it cannot calibrate a conversion.
  for (const o of raw.filter((r) => !r.bound && !r.mixedStates)) { const g = `${o.m.id}|${o.f}`; if (without?.has(g)) continue; if (!byF.has(g)) byF.set(g, new Map()); byF.get(g).set(o.kind, o.yRaw); makerOf.set(g, o.maker ?? g); }
  const diffs = new Map(), makers = new Map();
  for (const [g, kinds] of byF) {
    if (!kinds.has(HEAD[key])) continue;
    for (const [k, y] of kinds) {
      if (k === HEAD[key]) continue;
      if (!diffs.has(k)) { diffs.set(k, []); makers.set(k, new Set()); }
      diffs.get(k).push(kinds.get(HEAD[key]) - y); makers.get(k).add(makerOf.get(g));
    }
  }
  const across = acrossProducts(key, byF);
  const out = { [HEAD[key]]: { offset: 0, sd: 0, pairs: 0, why: "The headline's own semantics" } };
  const kinds = new Set([...Object.keys(model.conversions[key] ?? {}), ...raw.map((o) => o.kind)]);
  for (const k of kinds) {
    if (k === HEAD[key]) continue;
    const doc = documentedConversion(key, k, model);
    if (!doc) continue;
    const ds = diffs.get(k) ?? [], n = ds.length, n0 = model.fitting.documentedPairs, nMin = model.fitting.minPairsForSpread;
    // A kind that learns from several makers only (conversions.csv Estimate learns, D167) keeps its documented offset and
    // spread until enough pairs from enough makers publish both: three PPA pairs of one maker taught the annealed heat
    // deflection −77 °C for every crystalline matrix.
    const several = model.fitting.severalMakers;
    if (doc.learns === 'pairs, several makers' && (n < several.pairs || (makers.get(k)?.size ?? 0) < several.makers)) {
      out[k] = { offset: doc.offset, sd: doc.sd, pairs: n, makers: makers.get(k)?.size ?? 0, learned: false, why: doc.why };
      continue;
    }
    const centre = n ? median(ds) : 0;
    const spread = n >= nMin ? 1.4826 * median(ds.map((d) => Math.abs(d - centre))) : 0;
    const df = n >= nMin ? n - 1 : 0;
    // A kind that learns across products (D159) pools a contrast per material with the within-product pairs: the products
    // that publish the headline's own kind against those that publish only this one. Its spread is still the pairs':
    // the contrast carries the spread between products, which the model's product term already holds.
    const cross = doc.learns === 'pairs, across products, down only' ? across(k) : null;
    const nc = cross?.materials ?? 0;
    const refined = (n * centre + nc * (cross?.contrast ?? 0) + n0 * doc.offset) / (n + nc + n0);
    out[k] = {
      // An unknown direction may move below its documented offset, never above it (conversions.csv Estimate learns, D56):
      // a data-sheet value with no stated direction is an XY or a moulded value far more often than a Z one, and 18 Z
      // results coded unknown once taught these conversions offsets of +0.31 to +0.46 (audit 2026-09-15, B-03, B-04).
      offset: /down only$/.test(doc.learns ?? '') ? Math.min(refined, doc.offset) : refined,
      sd: Math.sqrt((df * spread * spread + n0 * doc.sd * doc.sd) / (df + n0)),
      pairs: n, why: doc.why,
      ...(cross ? { across: { materials: nc, contrast: cross.contrast } } : {}),
    };
  }
  // An annealed value of a related kind converts first to its as-printed kind, then by the headline's annealed offset
  // for its matrix, both as learned (D167): an annealed HDT at 1.8 MPa on a crystalline bar is no printed bar's value.
  for (const k of new Set(raw.map((o) => o.kind))) {
    const a = ANNEALED.exec(k);
    if (!a || out[k] || k === `${HEAD[key]} ${a[1]}`) continue;
    const base = k.slice(0, a.index), annealed = out[`${HEAD[key]} ${a[1]}`];
    const asPrinted = base === HEAD[key] ? out[HEAD[key]] : out[base] ?? asPrintedOf(base);
    if (!asPrinted || !annealed) continue;
    out[k] = { offset: asPrinted.offset + annealed.offset, sd: Math.hypot(asPrinted.sd, annealed.sd), pairs: 0, composed: true,
      why: `${asPrinted.why}; measured after annealing: ${annealed.why}` };
  }
  return out;

  // A related kind no observation of this headline reads as printed (an annealed bar's only kind): its documented
  // conversion, as conversions() would hold it with no pairs.
  function asPrintedOf(base) {
    const doc = documentedConversion(key, base, model);
    return doc ? { offset: doc.offset, sd: doc.sd, why: doc.why } : null;
  }
}

/**
 * The cross-product contrast of a related kind (D159): per material, the median of the headline's own kind over its
 * products that publish it, less the median of the related kind over its products that publish that and not the
 * headline's kind; then the median over the materials that have both. A product that publishes both kinds usually prints
 * one number twice (24 tensile pairs at a median of 0), so the pairs alone cannot see what an unstated direction is; the
 * products that publish it alone can. `byF` is conversions()'s formulations with their kinds, hidden products already
 * left out, so a hold-out never sees its own value on either side.
 */
function acrossProducts(key, byF) {
  const byMaterial = new Map();
  for (const [g, kinds] of byF) {
    const id = g.slice(0, g.indexOf('|'));
    if (!byMaterial.has(id)) byMaterial.set(id, []);
    byMaterial.get(id).push(kinds);
  }
  const cache = new Map();
  return (k) => {
    if (!cache.has(k)) {
      const contrasts = [];
      for (const products of byMaterial.values()) {
        const head = products.filter((kinds) => kinds.has(HEAD[key])).map((kinds) => kinds.get(HEAD[key]));
        const only = products.filter((kinds) => kinds.has(k) && !kinds.has(HEAD[key])).map((kinds) => kinds.get(k));
        if (head.length && only.length) contrasts.push(median(head) - median(only));
      }
      cache.set(k, { materials: contrasts.length, contrast: contrasts.length ? median(contrasts) : 0 });
    }
    return cache.get(k);
  };
}

/**
 * Converted observations for the model. On each formulation only the most direct related kinds are kept
 * (a break strength outranks a flexural strength); the headline's own kind is always kept.
 */
export function convert(key, raw, conv, S, model) {
  return mostDirect(key, convertAll(key, raw, conv, S, model), model);
}

/**
 * Every observation converted, before the most direct kinds are chosen: what a product's own values allow its estimate
 * reads all of them (anchor.js, D167), since a kind the fit leaves out beside a more direct one is still the product's.
 */
export function convertAll(key, raw, conv, S, model) {
  const out = [], tm = meltingPoint(key, S, model);
  for (const o of raw) {
    const c = conv[o.kind];
    // An annealed value beside its as-printed twin teaches its conversion and is no observation (D162).
    if (!c || o.pairOnly) continue;
    out.push({ ...o, y: o.yRaw + c.offset - tm.offset(o.m), noise2: c.sd * c.sd + o.half * o.half, conversion: c });
  }
  return out;
}

function mostDirect(key, out, model) {
  const best = new Map();
  for (const o of out) { if (o.kind === HEAD[key]) continue; const g = `${o.m.id}|${o.f}`; best.set(g, Math.min(best.get(g) ?? Infinity, o.conversion.sd)); }
  return out.filter((o) => o.kind === HEAD[key] || o.conversion.sd <= model.fitting.keepKindsWithinSpread * best.get(`${o.m.id}|${o.f}`) + 1e-12);
}

/**
 * The spread between two products of the same material, measured directly: every pair of formulations
 * of one material with the headline's semantics (and, for strength, a yield or break stress in XY). A
 * median-based estimate, because a single test house reporting on a different basis (3DXTECH's 8 GPa
 * PA12-CF beside Polymaker's 3.3 GPa) should not set the spread for every material.
 */
export function betweenProductSpread(key, raw, S) {
  const direct = new Set([HEAD[key], ...(key === 'tensileStrengthXY' ? ['break XY', 'yield XY'] : [])]);
  const diffs = [];
  const byClass = new Map();
  const byMaterial = new Map();
  for (const o of raw) {
    if (!direct.has(o.kind) || o.bound || S.info(o.m).morphology === 'elastomer') continue;
    if (!byMaterial.has(o.m.id)) byMaterial.set(o.m.id, { cls: S.matrix(o.m), fs: new Map() });
    const fs = byMaterial.get(o.m.id).fs; if (!fs.has(o.f)) fs.set(o.f, []); fs.get(o.f).push(o.yRaw);
  }
  for (const { cls, fs } of byMaterial.values()) {
    const v = [...fs.values()].map((ys) => ys.reduce((a, b) => a + b, 0) / ys.length);
    if (!byClass.has(cls)) byClass.set(cls, []);
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { const d = Math.abs(v[i] - v[j]); diffs.push(d); byClass.get(cls).push(d); }
  }
  // For a normal spread s, the absolute difference of two draws has median 0.954 s. The spread is also measured per
  // matrix as printed (D162): a crystalline matrix's products scatter in heat deflection with their crystallinity, far
  // more than a glassy one's, and one pooled spread set by the many glassy pairs served every matrix.
  const spread = (ds) => ({ sd: ds.length ? median(ds) / 0.954 : null, pairs: ds.length });
  return { ...spread(diffs), byMatrix: Object.fromEntries([...byClass].sort().map(([cls, ds]) => [cls, spread(ds)])) };
}

/**
 * The product spreads a fit holds fixed, from the measured spreads: the pooled one (w) where it has enough pairs, and,
 * where the headline asks for it (estimate-model.json productSpreadByMatrix: heat deflection), one for a matrix that
 * crystallises as printed, filled (ws) and unfilled (wu), where its own pairs suffice (D162). Each is floored at the
 * headline's floor for w. A matrix without its own uses w.
 */
export function productSpreads(between, key, model) {
  const floor = model.properties[key].floors.w, min = model.fitting.minBetweenProductPairs;
  const fix = (b) => (b && b.pairs >= min ? Math.max(b.sd, floor) : null);
  const byMatrix = model.properties[key].productSpreadByMatrix === true;
  return { w: fix(between), ws: byMatrix ? fix(between.byMatrix?.['semi-filled']) : null, wu: byMatrix ? fix(between.byMatrix?.['semi-unfilled']) : null };
}
