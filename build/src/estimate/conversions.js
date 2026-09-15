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
 * odd data sheet cannot move a conversion; the documented value counts as three pairs.
 */
export function conversions(key, raw, model) {
  const byF = new Map();
  // A bound is not an exact value, so it cannot calibrate a conversion.
  for (const o of raw.filter((r) => !r.bound && !r.mixedStates)) { const g = `${o.m.id}|${o.f}`; if (!byF.has(g)) byF.set(g, new Map()); byF.get(g).set(o.kind, o.yRaw); }
  const diffs = new Map();
  for (const kinds of byF.values()) {
    if (!kinds.has(HEAD[key])) continue;
    for (const [k, y] of kinds) { if (k === HEAD[key]) continue; if (!diffs.has(k)) diffs.set(k, []); diffs.get(k).push(kinds.get(HEAD[key]) - y); }
  }
  const out = { [HEAD[key]]: { offset: 0, sd: 0, pairs: 0, why: "The headline's own semantics" } };
  const kinds = new Set([...Object.keys(model.conversions[key] ?? {}), ...raw.map((o) => o.kind)]);
  for (const k of kinds) {
    if (k === HEAD[key]) continue;
    const doc = documentedConversion(key, k, model);
    if (!doc) continue;
    const ds = diffs.get(k) ?? [], n = ds.length, n0 = 3;
    const centre = n ? median(ds) : 0;
    const spread = n >= 3 ? 1.4826 * median(ds.map((d) => Math.abs(d - centre))) : 0;
    const df = n >= 3 ? n - 1 : 0;
    const refined = (n * centre + n0 * doc.offset) / (n + n0);
    out[k] = {
      // An unknown direction may move below its documented offset, never above it (estimate-model.json _directionComment).
      offset: / unk( |$)/.test(k) ? Math.min(refined, doc.offset) : refined,
      sd: Math.sqrt((df * spread * spread + n0 * doc.sd * doc.sd) / (df + n0)),
      pairs: n, why: doc.why,
    };
  }
  return out;
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
  return out.filter((o) => o.kind === HEAD[key] || o.conversion.sd <= 1.5 * best.get(`${o.m.id}|${o.f}`) + 1e-12);
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
