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
  const wetClass = kind.endsWith(' wet') ? 'high' : kind.endsWith(' wet-low') ? 'low' : null;
  const wet = wetClass && model.wet[wetClass]?.[key];
  if (wet) {
    const dry = table[kind.replace(/ wet(-low)?$/, '')];
    if (dry) return { offset: dry.offset + wet.offset, sd: Math.hypot(dry.sd, wet.sd), why: `${dry.why}; measured after moisture conditioning (${wetClass} water uptake)` };
  }
  return null;
}

/**
 * Conversions: the documented offset and spread, refined by formulations that publish both the
 * headline's semantics and the related kind. The median difference and a MAD spread are used, so one
 * odd data sheet cannot move a conversion; the documented value counts as fitting.documentedPairs pairs.
 *
 * `without` leaves out the pairs of these products (a Set of `${materialId}|${formulation}`): a hold-out that hides a
 * headline must not convert the remaining values with an offset its own hidden headlines helped learn.
 */
export function conversions(key, raw, model, { without = null } = {}) {
  const byF = new Map();
  // A bound is not an exact value, so it cannot calibrate a conversion.
  for (const o of raw.filter((r) => !r.bound && !r.mixedStates)) { const g = `${o.m.id}|${o.f}`; if (without?.has(g)) continue; if (!byF.has(g)) byF.set(g, new Map()); byF.get(g).set(o.kind, o.yRaw); }
  const diffs = new Map();
  for (const kinds of byF.values()) {
    if (!kinds.has(HEAD[key])) continue;
    for (const [k, y] of kinds) { if (k === HEAD[key]) continue; if (!diffs.has(k)) diffs.set(k, []); diffs.get(k).push(kinds.get(HEAD[key]) - y); }
  }
  const across = acrossProducts(key, byF);
  const out = { [HEAD[key]]: { offset: 0, sd: 0, pairs: 0, why: "The headline's own semantics" } };
  const kinds = new Set([...Object.keys(model.conversions[key] ?? {}), ...raw.map((o) => o.kind)]);
  for (const k of kinds) {
    if (k === HEAD[key]) continue;
    const doc = documentedConversion(key, k, model);
    if (!doc) continue;
    const ds = diffs.get(k) ?? [], n = ds.length, n0 = model.fitting.documentedPairs, nMin = model.fitting.minPairsForSpread;
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
      // An unknown direction may move below its documented offset, never above it (estimate-model.json _directionComment).
      offset: / unk( |$)/.test(k) ? Math.min(refined, doc.offset) : refined,
      sd: Math.sqrt((df * spread * spread + n0 * doc.sd * doc.sd) / (df + n0)),
      pairs: n, why: doc.why,
      ...(cross ? { across: { materials: nc, contrast: cross.contrast } } : {}),
    };
  }
  return out;
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
  const out = [], tm = meltingPoint(key, S, model);
  for (const o of raw) {
    const c = conv[o.kind];
    if (!c) continue;
    out.push({ ...o, y: o.yRaw + c.offset - tm.offset(o.m), noise2: c.sd * c.sd + o.half * o.half, conversion: c });
  }
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
  const byMaterial = new Map();
  for (const o of raw) {
    if (!direct.has(o.kind) || o.bound || S.info(o.m).morphology === 'elastomer') continue;
    if (!byMaterial.has(o.m.id)) byMaterial.set(o.m.id, new Map());
    const fs = byMaterial.get(o.m.id); if (!fs.has(o.f)) fs.set(o.f, []); fs.get(o.f).push(o.yRaw);
  }
  for (const fs of byMaterial.values()) {
    const v = [...fs.values()].map((ys) => ys.reduce((a, b) => a + b, 0) / ys.length);
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) diffs.push(Math.abs(v[i] - v[j]));
  }
  // For a normal spread s, the absolute difference of two draws has median 0.954 s.
  return { sd: diffs.length ? median(diffs) / 0.954 : null, pairs: diffs.length };
}
