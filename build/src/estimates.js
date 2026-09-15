// Estimates for missing headlines: a calibrated prediction from every piece of evidence the snapshot holds.
//
// Three earlier models failed, and this one is shaped by all of them.
//
// The first pooled display families and took a sample's extremes as a bound (OBC borrowed polypropylene's
// elongation). The second kept three same-polymer spans and let none decide anything. The third (D42)
// gave each missing value a prediction interval from the material's other grades or same-polymer peers,
// with a conservative spread; it was honest and nearly useless: PA-CF strength 38–204 MPa, TPE
// elongation 73–4695%, and nothing at all for PA66, PA612 or POM. It also ignored the evidence most gaps
// already had: a break strength where the ultimate strength is missing, a flexural modulus where the
// tensile one is, a glass transition where the heat deflection temperature is.
//
// This model is one Gaussian model per headline (build/mappings/estimate-model.json, DECISIONS D43):
//
//   value of a product = identity (pulled towards its chemical group) + reinforcement
//                        + reinforcement in a semicrystalline matrix + declared variant + test house
//                        [+ melting point, for the heat deflection of fast-crystallising polymers]
//                        + this material's deviation + this product's deviation
//
// on the natural-log scale for density, stiffness, strength and elongation and in °C for heat
// deflection. Every observation of a material enters it, converted to the headline's own semantics with
// an offset and a spread (learned from grades that publish both, otherwise documented), so a PA-CF
// break strength of 72 MPa informs its ultimate strength directly, and a resin data sheet for PA66
// informs PA66 and, through the identity, PA66-CF. The spread between products of one material is
// measured directly from materials with several products; the remaining spreads are estimated from the
// data (empirical Bayes) above documented floors.
//
// The model is then checked the way it will be used: every measured headline is hidden in turn and
// predicted from everything else, and the likely (80%) and plausible (95%) ranges are scaled so that they
// contain the hidden value that often. The result is in the validation report. Measured headlines far
// outside their prediction, and evidence contradicting everything else, are reported, not silently used.
//
// What an estimate may do is decided in app/js/engine/constraints.js: it never passes a material, and it
// may screen one out of Explore only where `canScreen` is true.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { moistureState } from './normalize/moisture.js';

const here = dirname(fileURLToPath(import.meta.url));
export const ESTIMATE_MODEL = JSON.parse(readFileSync(join(here, '../mappings/estimate-model.json'), 'utf8'));

/** The headline's own semantics, as a conversion kind. A headline the model estimates needs one. */
const HEAD = { density: 'density', tensileModulusXY: 'tensile XY', tensileStrengthXY: 'ultimate XY', elongationXY: 'break XY', hdt045: 'HDT 0.45' };

/**
 * The headlines the registry marks Estimated. Estimating a headline needs a model of it: a
 * conversion kind here and a properties entry in estimate-model.json. A registry row cannot switch
 * estimation on without one, because the model would have nothing to predict from.
 */
export function estimateKeys(registry, model = ESTIMATE_MODEL) {
  const keys = registry.headlines.filter((h) => h.estimated).map((h) => h.key);
  const unmodelled = keys.filter((k) => !HEAD[k] || !model.properties[k]);
  if (unmodelled.length) throw new Error(`headline_definitions.csv marks ${unmodelled.join(', ')} Estimated, but the estimate model has no entry for ${unmodelled.length === 1 ? 'it' : 'them'} (build/src/estimates.js HEAD and build/mappings/estimate-model.json properties)`);
  return keys;
}

// ----------------------------------------------------------------------------------------- numerics

const erf = (x) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
export const normalCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inverse standard normal (Acklam). */
export function normalQuantile(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) return -normalQuantile(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Quantile p of a normal(mu, sd) truncated to [lo, hi] (either may be null). */
export function truncatedQuantile(mu, sd, lo, hi, p) {
  const A = lo == null ? 0 : normalCdf((lo - mu) / sd);
  const B = hi == null ? 1 : normalCdf((hi - mu) / sd);
  if (B - A < 1e-9) return hi != null && mu > hi ? hi : lo;
  return mu + sd * normalQuantile(A + p * (B - A));
}

/**
 * Quantile p of normal(mu, sd) multiplied by soft upper and lower limits: each limit is a normal CDF
 * centred on its value with its own spread, because a melting point or a glass transition plus a margin
 * is itself approximate. A hard truncation would pile an estimate against the limit with no width.
 */
export function boundedQuantile(mu, sd, bounds, p) {
  if (!bounds.length) return mu + sd * normalQuantile(p);
  const n = 801, lo = mu - 7 * sd, step = (14 * sd) / (n - 1);
  const dens = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x = lo + i * step;
    let d = Math.exp(-0.5 * ((x - mu) / sd) ** 2);
    for (const b of bounds) d *= b.side === 'upper' ? normalCdf((b.value - x) / b.sd) : normalCdf((x - b.value) / b.sd);
    dens[i] = d; total += d;
  }
  if (!(total > 0)) return mu + sd * normalQuantile(p);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += dens[i] / total; if (acc >= p) return lo + i * step; }
  return lo + (n - 1) * step;
}

/** Young's modulus in MPa from Shore hardness: Gent (1958) for Shore A, Qi, Joyce and Boyce (2003) for Shore D. */
export function modulusFromShore(shore) {
  const m = /^(\d+(?:\.\d+)?)\s*([AD])$/i.exec(String(shore ?? '').trim());
  if (!m) return null;
  const s = Number(m[1]);
  if (m[2].toUpperCase() === 'A') return s > 20 && s < 99 ? (0.0981 * (56 + 7.62336 * s)) / (0.137505 * (254 - 2.54 * s)) : null;
  const u = (100 - s) / 20;
  return s > 10 && s < 95 ? (781.88 - 156.376 * u) / (u * u) : null;
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };

function cholesky(K, n) {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = K[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) { if (!(s > 0)) return null; L[i * n + i] = Math.sqrt(s); } else L[i * n + j] = s / L[j * n + j];
    }
  }
  return L;
}
function inverseFromCholesky(L, n) {
  const Li = new Float64Array(n * n), A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    Li[i * n + i] = 1 / L[i * n + i];
    for (let j = 0; j < i; j++) { let s = 0; for (let k = j; k < i; k++) s -= L[i * n + k] * Li[k * n + j]; Li[i * n + j] = s / L[i * n + i]; }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = 0; for (let k = i; k < n; k++) s += Li[k * n + i] * Li[k * n + j]; A[i * n + j] = s; A[j * n + i] = s; }
  return A;
}
function invertSmall(B) {
  const n = B.length, A = B.map((r, i) => [...r, ...B.map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    const d = A[i][i]; for (let j = 0; j < 2 * n; j++) A[i][j] /= d;
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((r) => r.slice(n));
}

// ------------------------------------------------------------------------------------ the snapshot

// A material's chemical identity in the model: its base polymer, or for a blend its own name. A material
// whose identity has no entry in estimate-model.json identities cannot be estimated; validate.js says so.
export const identityOf = (m) => (m.family === 'Polymer Blends' ? m.normalizedName : m.basePolymer);

function snapshot(materials, gradeList, measurements, model) {
  const grades = new Map(gradeList.map((g) => [g.id, g]));
  const pool = materials.filter((m) => !m.excluded && !m.familyEntry && model.identities[identityOf(m)]);
  const inPool = new Map(pool.map((m) => [m.id, m]));
  const fkey = (gid) => grades.get(gid)?.formulationKey || gid;
  // A product declared a variant of its material (grades.csv Variant) carries that variant in every grade of its formulation.
  const variants = new Map();
  for (const g of gradeList) if (g.variant) variants.set(fkey(g.id), g.variant);
  const variantOf = (f) => (f ? variants.get(f) ?? null : null);
  const info = (m) => model.identities[identityOf(m)];
  const reinforcement = (m) => m.facets.reinforcement.value;
  const fibre = (m) => reinforcement(m) === 'carbon-fibre' || reinforcement(m) === 'glass-fibre';
  const matrix = (m) => (info(m).morphology === 'semicrystalline' ? (fibre(m) ? 'semi-filled' : 'semi-unfilled') : info(m).morphology);
  const usable = measurements.filter((x) => inPool.has(x.materialId) && x.numeric && !x.quarantined && !grades.get(x.gradeId)?.retired
    && !/^Film/i.test(x.specimenType ?? ''));
  const byMaterial = new Map();
  for (const x of usable) { if (!byMaterial.has(x.materialId)) byMaterial.set(x.materialId, []); byMaterial.get(x.materialId).push(x); }

  // Melting point and glass transition of a material: its own printed or product values, else its
  // identity's. Supplier resin values describe another specimen and are not used here.
  const own = (m, property, lo, hi) => median((byMaterial.get(m.id) ?? [])
    .filter((x) => x.property === property && x.value > lo && x.value < hi && !x.specimenType?.startsWith('Raw material')).map((x) => x.value));
  const tmOf = (m) => own(m, 'Melting temperature', 60, 420) ?? info(m).tm ?? null;
  const tgOf = (m) => own(m, 'Glass transition temperature', -150, 420)
    ?? median(pool.filter((p) => identityOf(p) === identityOf(m)).flatMap((p) => (byMaterial.get(p.id) ?? [])
      .filter((x) => x.property === 'Glass transition temperature' && x.value > -150 && x.value < 420 && !x.specimenType?.startsWith('Raw material')).map((x) => x.value)));

  return { grades, pool, inPool, fkey, variantOf, info, reinforcement, fibre, matrix, byMaterial, tmOf, tgOf };
}

// --------------------------------------------------------------------------------- evidence kinds

const DIRECTION_CLASS = { XY: 'XY', XZ: 'XY', 'horizontal-source-label': 'XY', 'along-flow': 'XY', Z: 'Z', ZX: 'Z', 'vertical-xz-source-label': 'Z' };
const STRENGTH_ENDPOINT = {
  'Tensile strength (endpoint unspecified)': 'ultimate', 'Tensile break strength': 'break',
  'Tensile yield strength': 'yield', 'Flexural strength': 'flexural',
};

/** The conversion kind of a measurement for a headline, or null when it says nothing about it. */
export function kindOf(x, key, matrixClass) {
  const moulded = x.specimenType?.startsWith('Raw material') ? ' moulded' : '';
  const dir = moulded ? '' : ` ${DIRECTION_CLASS[x.direction] ?? 'unk'}`;
  // The vocabulary declares each moisture wording's state (normalize/moisture.js); a conditioned value converts to dry.
  const wet = moistureState(x.moisture ?? 'Not published') === 'conditioned' ? ' wet' : '';
  const kind = (base) => `${base}${dir}${wet}${moulded}`;
  switch (key) {
    case 'density': return x.property === 'Density' ? `density${moulded}` : null;
    case 'tensileModulusXY':
      if (x.property === 'Tensile modulus') return kind('tensile');
      if (x.property === 'Flexural modulus') return kind('flexural');
      return null;
    case 'tensileStrengthXY': return STRENGTH_ENDPOINT[x.property] ? kind(STRENGTH_ENDPOINT[x.property]) : null;
    case 'elongationXY':
      if (x.property === 'Elongation at break') return kind('break');
      // A break strain is never below the strain at yield or at maximum stress.
      if (x.property === 'Elongation at yield' || x.property === 'Tensile strain at strength') return kind('yield');
      return null;
    case 'hdt045': {
      if (x.property === 'HDT') {
        const load = x.thermal?.loadMPa;
        // A moulded bar of an amorphous polymer deflects near Tg as a printed one does; a semicrystalline
        // one crystallises further in the mould, so the conversion depends on the matrix.
        const mould = moulded && `${moulded} ${matrixClass === 'amorphous' ? 'amorphous' : 'semicrystalline'}`;
        if (!x.thermal?.loadStated) return `HDT unstated${mould || ''}`;
        if (load >= 0.44 && load <= 0.46) return `HDT 0.45${mould || ''}`;
        return moulded ? null : `HDT 1.8 ${matrixClass}`;
      }
      if (moulded) return null;
      if (x.property === 'Glass transition temperature' && matrixClass === 'amorphous') return 'Tg amorphous';
      if (x.property === 'Vicat softening temperature' && matrixClass !== 'elastomer') return `Vicat ${matrixClass}`;
      if (x.property === 'Melting temperature' && matrixClass === 'semi-filled') return 'Tm semi-filled';
      return null;
    }
    default: return null;
  }
}

const transform = (key, model) => (model.properties[key].scale === 'log' ? Math.log : (v) => v);
const untransform = (key, model) => (model.properties[key].scale === 'log' ? Math.exp : (v) => v);

function documentedConversion(key, kind, model) {
  const table = model.conversions[key] ?? {};
  if (table[kind]) return table[kind];
  if (kind === 'HDT 0.45') return null;
  if (kind.endsWith(' wet') && model.wet[key]) {
    const dry = table[kind.slice(0, -4)];
    if (dry) return { offset: dry.offset + model.wet[key].offset, sd: Math.hypot(dry.sd, model.wet[key].sd), why: `${dry.why}; measured after moisture conditioning` };
  }
  return null;
}

/**
 * Observations of every kind for one headline, before conversion: one entry per material, formulation
 * and kind, averaging repeats. A shared datasheet cited by several materials is kept once, under the
 * first material that cites it (Method, Identity / Aliases).
 */
function rawObservations(key, S, model) {
  const [pl, ph] = model.properties[key].plausibleValues;
  const t = transform(key, model);
  const groups = new Map(), rejected = [], bounds = [];
  for (const m of S.pool) {
    const add = (entry) => {
      const g = `${m.id}|${entry.f}|${entry.kind}`;
      if (!groups.has(g)) groups.set(g, { m, f: entry.f, gradeId: entry.gradeId, kind: entry.kind, ys: [], half: [], items: [] });
      const e = groups.get(g);
      e.ys.push(entry.y); e.half.push(entry.half); e.items.push(entry.item);
    };
    for (const x of S.byMaterial.get(m.id) ?? []) {
      const kind = kindOf(x, key, S.matrix(m));
      if (!kind) continue;
      if (x.value < pl || x.value > ph) { rejected.push({ key, materialId: m.id, material: m.name, measurementId: x.id, property: x.property, value: x.value, unit: x.unit }); continue; }
      // A one-sided bound ("> 16.5 MPa", "< 0.8 %") says the value lies beyond it. Read as an exact point it became
      // the most precise observation of all (PEBA's strength estimate 16.4-16.6 MPa); left out, elastomers lost
      // the only evidence that they stretch hundreds of percent. It is kept at the bound with a documented
      // half-width (estimate-model.json bounds.oneSided), and it limits its own material's estimate.
      const side = x.interval && x.interval.hi == null ? 'lower' : x.interval && x.interval.lo == null ? 'upper' : null;
      if (model.properties[key].scale === 'log' && !(x.value > 0)) continue;
      if (side) bounds.push({ key, materialId: m.id, measurementId: x.id, gradeId: x.gradeId, kind, side, value: x.value });
      const lo = x.interval?.lo ?? x.value, hi = x.interval?.hi ?? x.value;
      if (model.properties[key].scale === 'log' && !side && !(lo > 0)) continue;
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      add({ f: S.fkey(x.gradeId), gradeId: x.gradeId, kind, y: t(x.value), half: side ? model.bounds.oneSided.half[scaleName] : (t(hi) - t(lo)) / 2,
        item: { measurementId: x.id, gradeId: x.gradeId, property: x.property, direction: x.direction, value: x.value, unit: x.unit, ...(side ? { bound: side } : {}) } });
    }
    // An elastomer's nominal hardness, from its product designation, informs its stiffness.
    if (key === 'tensileModulusXY' && S.info(m).morphology === 'elastomer') {
      for (const gid of m.gradeIds ?? []) {
        const h = model.hardness[gid];
        const e = h && modulusFromShore(h.shore);
        if (!e || S.grades.get(gid)?.retired) continue;
        add({ f: S.fkey(gid), gradeId: gid, kind: 'hardness', y: Math.log(e / 1000), half: 0,
          item: { gradeId: gid, property: `Shore hardness ${h.shore}`, value: Number((e / 1000).toPrecision(3)), unit: 'GPa', from: h.from } });
      }
    }
  }
  // A formulation cited by several materials is owned by the material it represents, else the first.
  const ownerOfF = new Map(), out = [];
  for (const m of S.pool) { const f = m.representativeGrade && S.fkey(m.representativeGrade); if (f && !ownerOfF.has(f)) ownerOfF.set(f, m.id); }
  for (const e of groups.values()) {
    if (!ownerOfF.has(e.f)) ownerOfF.set(e.f, e.m.id);
    if (ownerOfF.get(e.f) !== e.m.id) continue;
    out.push({ ...e, yRaw: e.ys.reduce((a, b) => a + b, 0) / e.ys.length, half: Math.max(...e.half), bound: e.items.some((i) => i.bound) });
  }
  return { raw: out, rejected, bounds, ownerOfF };
}

/**
 * Conversions: the documented offset and spread, refined by formulations that publish both the
 * headline's semantics and the related kind. The median difference and a MAD spread are used, so one
 * odd data sheet cannot move a conversion; the documented value counts as three pairs.
 */
function conversions(key, raw, model) {
  const byF = new Map();
  // A bound is not an exact value, so it cannot calibrate a conversion.
  for (const o of raw.filter((r) => !r.bound)) { const g = `${o.m.id}|${o.f}`; if (!byF.has(g)) byF.set(g, new Map()); byF.get(g).set(o.kind, o.yRaw); }
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
    out[k] = {
      offset: (n * centre + n0 * doc.offset) / (n + n0),
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
function convert(key, raw, conv, S, model) {
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
function betweenProductSpread(key, raw, S) {
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

// ------------------------------------------------------------------------------ the Gaussian model

/**
 * Heat deflection of a polymer that crystallises while printing rises with its melting point: a fibre
 * network carries the bar to within a fixed margin of it (slope 1), an unfilled bar part of the way.
 * The documented slope is the model's mean, so thin data can adjust it but not reverse it.
 */
function meltingPoint(key, S, model) {
  const slope = model.bounds.meltingPointSlope;
  const covariate = (m) => (key === 'hdt045' && S.info(m).fastCrystallising && S.tmOf(m) != null ? (S.tmOf(m) - slope.reference) / 50 : null);
  const offset = (m) => { const c = covariate(m); return c == null ? 0 : c * 50 * (S.fibre(m) ? slope.fibre : slope.unfilled); };
  return { covariate, offset };
}

function makeKernel(key, S, model) {
  const scale = model.properties[key].scaleUnit;
  const tmCovariate = meltingPoint(key, S, model).covariate;
  const columns = (m, formulation, manufacturer) => {
    const id = identityOf(m), info = S.info(m), f = S.reinforcement(m);
    const x = new Map([['1', 1], [`g:${info.group}`, 1], [`p:${id}`, 1]]);
    // Reinforcement acts through the matrix: a fibre network lifts a semicrystalline bar's heat
    // deflection towards its melting point but an amorphous bar's only a little past Tg.
    if (f !== 'unfilled') { if (key !== 'hdt045') x.set(`f:${f}`, 1); x.set(`fx:${f}:${info.morphology}`, 1); }
    for (const [tag, names] of Object.entries(model.variants)) if (names.includes(m.name)) x.set(`v:${tag}`, 1);
    // A variant product explains its own offset (a lightweight additive, an undisclosed filler) rather than moving its family.
    if (S.variantOf(formulation)) x.set(`v:grade:${S.variantOf(formulation)}`, 1);
    if (manufacturer) x.set(`s:${manufacturer}`, 1);
    if (tmCovariate(m) != null) x.set(S.fibre(m) ? 'tm:fibre' : 'tm:unfilled', tmCovariate(m));
    return x;
  };
  const sdOf = (c, hp) => (c === '1' ? 10 * scale : c[0] === 'g' ? hp.tg : c[0] === 'p' ? hp.tp : c.startsWith('fx:') ? hp.tfx
    : c[0] === 'f' ? hp.tf : c.startsWith('v:grade:') ? model.gradeVariants.spreadInScaleUnits * scale : c[0] === 'v' ? hp.tv : c.startsWith('tm:') ? hp.ttm : c[0] === 's' ? hp.tm : 0);
  const productSd = (m, hp) => (S.info(m).morphology === 'elastomer' ? hp.we : hp.w);
  const point = (m, f, manufacturer) => ({ m, f, x: columns(m, f, manufacturer) });
  const cov = (a, b, hp) => {
    let s = 0;
    for (const [c, v] of a.x) { const w = b.x.get(c); if (w !== undefined) { const t = sdOf(c, hp); s += v * w * t * t; } }
    if (a.m.id === b.m.id) s += hp.sm * hp.sm;
    if (a.f && a.f === b.f) s += productSd(a.m, hp) ** 2;
    return s;
  };
  return { point, cov };
}

function fitModel(key, obs, S, model, hp) {
  const { point, cov } = makeKernel(key, S, model);
  const n = obs.length;
  const pts = obs.map((o) => point(o.m, o.f, S.grades.get(o.gradeId)?.manufacturer));
  const mean = obs.reduce((a, o) => a + o.y, 0) / n;
  const r = obs.map((o) => o.y - mean);
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { const v = cov(pts[i], pts[j], hp) + (i === j ? obs[i].noise2 + 1e-9 : 0); K[i * n + j] = v; K[j * n + i] = v; }
  const L = cholesky(K, n);
  if (!L) return null;
  let logLik = 0; { const z = new Float64Array(n); for (let i = 0; i < n; i++) { let s = r[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * z[k]; z[i] = s / L[i * n + i]; logLik += -0.5 * z[i] * z[i] - Math.log(L[i * n + i]); } }
  return { logLik, n, pts, mean, r, L, cov, point };
}

function posterior(fit) {
  const { n, L, r } = fit;
  const Ki = inverseFromCholesky(L, n);
  const alpha = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Ki[i * n + j] * r[j]; alpha[i] = s; }
  return { ...fit, Ki, alpha };
}

/** Latent headline of a product (material m, formulation f, test house), optionally hiding observations S. */
function predict(P, hp, m, f, manufacturer, hide = []) {
  const { n, pts, Ki, alpha, r, mean, cov, point } = P;
  const t = point(m, f, manufacturer);
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) k[i] = cov(t, pts[i], hp);
  if (!hide.length) {
    let mu = mean, q = 0;
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (!k[i]) continue;
      mu += k[i] * alpha[i];
      let v = 0; for (let j = 0; j < n; j++) v += Ki[i * n + j] * k[j];
      w[i] = v; q += k[i] * v;
    }
    return { mu, sd: Math.sqrt(Math.max(1e-12, cov(t, t, hp) - q)), weights: w };
  }

  // Hiding observations H downdates the inverse: A = Ki - Ki[:,H] B^-1 Ki[H,:] with B = Ki[H,H], zero
  // on H's rows and columns. Only A r and A k are needed, so they are computed as vectors and the n x n
  // matrix is never formed: forming it for every calibration hold-out made calibration cubic in the
  // number of observations (13 s of a 13.6 s compile at twice today's data).
  const h = hide.length;
  const hidden = new Set(hide);
  const Binv = invertSmall(hide.map((a) => hide.map((b) => Ki[a * n + b])));
  for (const i of hide) k[i] = 0;
  // Ki[H_q, visible columns] against r and against k, then B^-1 applied to each.
  const tr = new Float64Array(h), tk = new Float64Array(h);
  for (let q = 0; q < h; q++) {
    const row = hide[q] * n;
    let sr = 0, sk = 0;
    for (let j = 0; j < n; j++) { if (hidden.has(j)) continue; sr += Ki[row + j] * r[j]; sk += Ki[row + j] * k[j]; }
    tr[q] = sr; tk[q] = sk;
  }
  const cr = new Float64Array(h), ck = new Float64Array(h);
  for (let p = 0; p < h; p++) for (let q = 0; q < h; q++) { cr[p] += Binv[p][q] * tr[q]; ck[p] += Binv[p][q] * tk[q]; }

  let mu = mean, q2 = 0;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!k[i]) continue;
    const row = i * n;
    let ar = 0, ak = 0;
    for (let j = 0; j < n; j++) { if (hidden.has(j)) continue; ar += Ki[row + j] * r[j]; ak += Ki[row + j] * k[j]; }
    for (let p = 0; p < h; p++) { ar -= Ki[row + hide[p]] * cr[p]; ak -= Ki[row + hide[p]] * ck[p]; }
    mu += k[i] * ar;
    w[i] = ak; q2 += k[i] * ak;
  }
  return { mu, sd: Math.sqrt(Math.max(1e-12, cov(t, t, hp) - q2)), weights: w };
}

/** Empirical Bayes: each free spread in turn over a grid, three sweeps, above its documented floor. */
function hyperparameters(key, obs, S, model, fixedW) {
  const scale = model.properties[key].scaleUnit, floors = model.properties[key].floors;
  const hp = { tg: scale, tp: scale / 2, tf: scale, tfx: scale / 2, tv: scale / 2, tm: scale / 3, ttm: scale / 2, sm: scale / 3, w: fixedW ?? scale / 2, we: scale };
  for (const [k, v] of Object.entries(floors)) if (k in hp) hp[k] = Math.max(hp[k], v);
  // The melting-point slope's spread is documented, not learned: a handful of unfilled polymers cannot
  // be allowed to reverse a physical relation (PVDF deflects near its melting point, PA66 far below).
  if (floors.ttm != null) hp.ttm = floors.ttm;
  const free = Object.keys(hp).filter((k) => !(k === 'w' && fixedW != null) && k !== 'ttm');
  const grid = [0.01, 0.05, 0.12, 0.25, 0.4, 0.6, 0.85, 1.2, 1.7, 2.5, 4].map((g) => g * scale);
  const score = (h) => fitModel(key, obs, S, model, h)?.logLik ?? -Infinity;
  let best = score(hp);
  for (let sweep = 0; sweep < 3; sweep++) {
    for (const k of free) {
      for (const v of grid) {
        if (v < (floors[k] ?? 0)) continue;
        const trial = { ...hp, [k]: v }, s = score(trial);
        if (s > best) { best = s; hp[k] = v; }
      }
    }
  }
  return hp;
}

// ---------------------------------------------------------------------------- screening back-test

/** P(X >= k) for X ~ Binomial(n, p). */
function binomialTail(n, p, k) {
  if (k <= 0) return 1;
  let term = Math.pow(1 - p, n), cdf = 0;
  for (let i = 0; i < k; i++) { cdf += term; term = term * ((n - i) / (i + 1)) * (p / (1 - p)); }
  return Math.max(0, 1 - cdf);
}

/**
 * Whether an evidence class may screen (DECISIONS D48). cases: [{ y, lo, hi }] in the headline's units, the true
 * value and the plausible range predicted with the class's information hidden. Certified when there are at
 * least minHeldCases and neither side misses significantly more often than maxOneSidedMiss.
 */
export function certifyScreening(cases, { maxOneSidedMiss, testLevel, minHeldCases }) {
  const n = cases.length;
  const high = cases.filter((c) => c.y > c.hi).length, low = cases.filter((c) => c.y < c.lo).length;
  const pHigh = binomialTail(n, maxOneSidedMiss, high), pLow = binomialTail(n, maxOneSidedMiss, low);
  const enough = n >= minHeldCases;
  const certified = enough && pHigh >= testLevel && pLow >= testLevel;
  const r = (x) => Math.round(x * 1000) / 1000;
  return {
    held: n, missHigh: high, missLow: low, missHighRate: n ? r(high / n) : null, missLowRate: n ? r(low / n) : null, pHigh: r(pHigh), pLow: r(pLow), certified,
    why: !enough ? `only ${n} held cases (${minHeldCases} needed)`
      : certified ? `ranges hold on both sides (${high} above, ${low} below of ${n})`
      : `plausible ranges are too narrow: ${pHigh < testLevel ? `${high} of ${n} true values above the range` : `${low} of ${n} below it`} (${Math.round(maxOneSidedMiss * 1000) / 10}% per side allowed)`,
  };
}

// --------------------------------------------------------------------------------------- building

const sig3 = (v, dir = 0) => {
  if (v == null || !Number.isFinite(v) || v === 0) return v;
  const p = 10 ** (2 - Math.floor(Math.log10(Math.abs(v))));
  return (dir < 0 ? Math.floor(v * p) : dir > 0 ? Math.ceil(v * p) : Math.round(v * p)) / p;
};

export function buildEstimates(materials, { grades = [], measurements = [], registry } = {}, model = ESTIMATE_MODEL) {
  const ESTIMATE_KEYS = estimateKeys(registry, model);
  const S = snapshot(materials, grades, measurements, model);
  const { likely, plausible } = model.levels;
  const zLikely = normalQuantile(0.5 + likely / 2), zPlausible = normalQuantile(0.5 + plausible / 2);
  const diagnostics = { levels: model.levels, properties: {}, rejected: [], bounds: [], conflicts: [], outliers: [] };

  for (const key of ESTIMATE_KEYS) {
    const inv = untransform(key, model);
    const { raw, rejected, bounds: oneSided, ownerOfF } = rawObservations(key, S, model);
    diagnostics.rejected.push(...rejected);
    diagnostics.bounds.push(...oneSided);
    const conv = conversions(key, raw, model);
    let obs = convert(key, raw, conv, S, model);
    const tmMean = meltingPoint(key, S, model).offset;
    const floors = model.properties[key].floors;
    const between = betweenProductSpread(key, raw, S);
    const fixedW = between.pairs >= 6 ? Math.max(between.sd, floors.w) : null;

    // The spreads are estimated on the headline and the single most direct kind per formulation, which
    // identifies them as well as the full set does at a fraction of the cost.
    const hasHead = new Set(obs.filter((o) => o.kind === HEAD[key]).map((o) => `${o.m.id}|${o.f}`));
    const hp = hyperparameters(key, obs.filter((o) => o.kind === HEAD[key] || !hasHead.has(`${o.m.id}|${o.f}`)), S, model, fixedW);

    // Evidence that contradicts everything else is down-weighted and reported, twice at most.
    let P = posterior(fitModel(key, obs, S, model, hp));
    for (let pass = 0; pass < 2; pass++) {
      const flagged = [];
      for (let i = 0; i < P.n; i++) if (!obs[i].conflict && Math.abs(P.alpha[i] / Math.sqrt(P.Ki[i * P.n + i])) > 3.5) flagged.push(i);
      if (!flagged.length) break;
      obs = obs.map((o, i) => (flagged.includes(i) ? { ...o, conflict: true, noise2: o.noise2 * 25 } : o));
      P = posterior(fitModel(key, obs, S, model, hp));
    }
    for (const o of obs.filter((o) => o.conflict)) {
      diagnostics.conflicts.push({ key, materialId: o.m.id, material: o.m.name, kind: o.kind, measurementIds: o.items.map((i) => i.measurementId).filter(Boolean), values: o.items.map((i) => i.value) });
    }

    // Calibration: hide each measured headline's own observations and predict it from the rest.
    const loo = [];
    for (const m of S.pool) {
      const h = m.headline[key];
      if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
      const f = S.fkey(h.gradeId);
      const hide = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
      if (!hide.length) continue;
      const p = predict(P, hp, m, f, S.grades.get(h.gradeId)?.manufacturer, hide);
      const rest = obs.some((o, i) => o.m.id === m.id && !hide.includes(i));
      loo.push({ m, y: transform(key, model)(h.value) - tmMean(m), p, rest });
    }
    const zs = loo.map((l) => Math.abs((l.y - l.p.mu) / l.p.sd));
    const calLikely = loo.length >= 20 ? Math.min(3, Math.max(0.6, quantile(zs, likely) / zLikely)) : 1.3;
    const calPlausible = loo.length >= 20 ? Math.min(3, Math.max(0.75, quantile(zs, plausible) / zPlausible)) : 1.3;
    const within = (l, z, cal) => Math.abs(l.y - l.p.mu) <= z * cal * l.p.sd;
    const width = (l) => (model.properties[key].scale === 'log' ? Math.exp(2 * zLikely * calLikely * l.p.sd) : 2 * zLikely * calLikely * l.p.sd);
    for (const l of loo) {
      const z = (l.y - l.p.mu) / (l.p.sd * calPlausible);
      if (Math.abs(z) > 3) {
        diagnostics.outliers.push({ key, materialId: l.m.id, material: l.m.name, measured: l.m.headline[key].value, expected: sig3(inv(l.p.mu + tmMean(l.m))), unit: l.m.headline[key].unit, z: Math.round(z * 10) / 10 });
      }
    }
    const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
    diagnostics.properties[key] = {
      observations: obs.length, formulations: new Set(obs.map((o) => o.f)).size,
      betweenProduct: { sd: r3(between.sd), pairs: between.pairs, used: r3(hp.w), estimated: fixedW == null },
      spreads: Object.fromEntries(Object.entries(hp).map(([k, v]) => [k, r3(v)])),
      calibration: {
        held: loo.length, likelyScale: r3(calLikely), plausibleScale: r3(calPlausible),
        likelyCoverage: loo.length ? r3(loo.filter((l) => within(l, zLikely, calLikely)).length / loo.length) : null,
        plausibleCoverage: loo.length ? r3(loo.filter((l) => within(l, zPlausible, calPlausible)).length / loo.length) : null,
        medianLikelyWidth: r3(median(loo.map(width))),
        medianLikelyWidthWithOwnEvidence: r3(median(loo.filter((l) => l.rest).map(width))),
      },
      conversions: Object.fromEntries(Object.entries(conv).filter(([k]) => k !== HEAD[key]).map(([k, c]) => [k, { offset: r3(c.offset), sd: r3(c.sd), pairs: c.pairs }])),
    };

    // A heat deflection value whose load the source never stated was measured at 0.45 MPa or at 1.8 MPa.
    // At 0.45 MPa it is the value; at 1.8 MPa the 0.45 MPa value lies above it by the gap this matrix
    // shows between the two loads. So the 0.45 MPa value is bracketed, not merely bounded below: PLA
    // Lite's 53 °C means 53 to about 63 °C, not "53 or anything above". Treated as unbounded, it kept a
    // PLA among candidates for "heat resistance at least 100 °C".
    if (key === 'hdt045') {
      // Back-test the bracket on every formulation publishing both loads: read the 1.8 MPa value as if its load were
      // unstated, and check the 0.45 MPa value lies under the bracket's top (it lies above its bottom by physics).
      const byF = new Map();
      for (const o of raw) { if (!byF.has(o.f)) byF.set(o.f, { m: o.m, kinds: new Map() }); byF.get(o.f).kinds.set(o.kind, o.yRaw); }
      // The gap between the loads depends on the matrix (an amorphous bar a few degrees, an unfilled semicrystalline
      // one up to 120 °C), so each matrix class is certified on its own pairs.
      const bracketCases = new Map();
      for (const { m, kinds } of byF.values()) {
        const matrix = S.matrix(m);
        const y = kinds.get('HDT 0.45'), v = kinds.get(`HDT 1.8 ${matrix}`), c = conv[`HDT 1.8 ${matrix}`];
        if (y == null || v == null || !c) continue;
        if (!bracketCases.has(matrix)) bracketCases.set(matrix, []);
        bracketCases.get(matrix).push({ materialId: m.id, y, lo: v, hi: v + c.offset + zPlausible * c.sd });
      }
      diagnostics.bracketScreening = Object.fromEntries(['amorphous', 'semi-unfilled', 'semi-filled', 'elastomer']
        .map((matrix) => [matrix, certifyScreening(bracketCases.get(matrix) ?? [], model.screening)]));
      for (const m of S.pool) {
        const h = m.headline.hdt045;
        const c = conv[`HDT 1.8 ${S.matrix(m)}`];
        if (!h?.known || h.loadStated !== false || !c) continue;
        h.loadBracket = {
          lo: h.value, hi: sig3(h.value + c.offset + zPlausible * c.sd, 1), unit: h.unit,
          why: `at 0.45 MPa the value itself; at 1.8 MPa up to ${sig3(c.offset + zPlausible * c.sd, 1)} °C lower than the 0.45 MPa value, the ${Math.round(plausible * 100)}% gap ${c.pairs} ${S.matrix(m)} grades publishing both loads show`,
          canScreen: diagnostics.bracketScreening[S.matrix(m)].certified,
          screenLimit: diagnostics.bracketScreening[S.matrix(m)].certified ? null : `the unstated-load bracket for ${S.matrix(m)} matrices is not certified to screen: ${diagnostics.bracketScreening[S.matrix(m)].why}`,
        };
      }
    }

    // The likely and plausible ranges of a prediction, with the physical and semantic limits that apply to the
    // material. Shared by the estimates and the screening back-test, so the back-test judges the ranges shown.
    const rangeFor = (m, subject, p, unit, { ownBounds = true } = {}) => {
      const h = { unit };
      const bounds = [];
      // Physical limits bound every estimate softly (estimate-model.json bounds): the property's outer
      // plausibleValues, and for heat deflection a floor near room temperature. They are published with the
      // estimate only where they move its plausible range, so a reader sees a limit when it matters.
      const [plo, phi] = model.properties[key].plausibleValues;
      const toModel = transform(key, model);
      const outerSd = model.properties[key].scale === 'log' ? model.bounds.plausibleValuesSd.log : model.bounds.plausibleValuesSd.linear;
      const physical = [
        { side: 'lower', value: toModel(plo), sd: outerSd, why: `physical lower limit ${plo} ${h.unit}: ${model.bounds.plausibleValuesSd.why}` },
        { side: 'upper', value: toModel(phi), sd: outerSd, why: `physical upper limit ${phi} ${h.unit}: ${model.bounds.plausibleValuesSd.why}` },
        ...(key === 'hdt045' ? [{ side: 'lower', value: model.bounds.hdtFloor.value, sd: model.bounds.hdtFloor.sd, why: `${model.bounds.hdtFloor.value} °C floor: ${model.bounds.hdtFloor.why}` }] : []),
      ];
      // A bound its own grades publish with the headline's own semantics limits its estimate.
      // For strength and elongation a printed part is strongest in XY, so a lower bound in an unstated direction
      // bounds the XY value too; an upper bound does only with the headline's own semantics.
      const limits = (b) => b.kind === HEAD[key] || (b.side === 'lower' && key !== 'hdt045' && key !== 'density' && b.kind === HEAD[key].replace(' XY', ' unk'));
      for (const b of ownBounds ? oneSided.filter((b) => b.materialId === subject.id && limits(b)) : []) {
        const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
        bounds.push({ side: b.side, value: toModel(b.value), sd: model.bounds.oneSided.sd[scaleName], why: `${b.side === 'lower' ? 'above' : 'below'} ${b.value} ${h.unit}, published for ${b.gradeId} (${b.measurementId})` });
      }
      if (key === 'hdt045' && S.info(m).morphology === 'semicrystalline' && S.tmOf(m) != null) {
        bounds.push({ side: 'upper', value: S.tmOf(m), sd: model.bounds.meltingSd, why: `melting point ${S.tmOf(m)} °C: ${model.bounds.hdtAboveMelting}` });
      }
      if (key === 'hdt045' && S.info(m).morphology === 'amorphous' && S.tgOf(m) != null) {
        const lift = S.fibre(m) ? model.bounds.amorphousAboveTg.fibre : model.bounds.amorphousAboveTg.unfilled;
        bounds.push({ side: 'upper', value: S.tgOf(m) + lift, sd: model.bounds.amorphousAboveTg.sd, why: `glass transition ${S.tgOf(m)} °C + ${lift} °C: ${model.bounds.amorphousAboveTg.why}` });
      }
      const qWith = (list) => (pr, cal) => inv(boundedQuantile(p.mu, p.sd * cal, list, pr));
      // A physical limit takes part only where it can reach the distribution; far limits would change
      // nothing but the numerical method. It is published only if it moves the plausible range itself.
      const reach = 6 * p.sd * Math.max(calLikely, calPlausible);
      const active = physical.filter((b) => (b.side === 'lower' ? b.value + 4 * b.sd > p.mu - reach : b.value - 4 * b.sd < p.mu + reach));
      const semantic = [...bounds];
      const all = qWith([...semantic, ...active]);
      for (const b of active) {
        const pr = b.side === 'lower' ? 0.5 - plausible / 2 : 0.5 + plausible / 2;
        const without = qWith([...semantic, ...active.filter((x) => x !== b)])(pr, calPlausible);
        const withIt = all(pr, calPlausible);
        if (Math.abs(without - withIt) > Math.abs(withIt) * 0.01 + 1e-9) bounds.push(b);
      }
      const q = qWith(bounds);
      const centre = q(0.5, calLikely);
      const range = [q(0.5 - likely / 2, calLikely), q(0.5 + likely / 2, calLikely)];
      const wide = [q(0.5 - plausible / 2, calPlausible), q(0.5 + plausible / 2, calPlausible)];

      return { bounds, centre, range, wide };
    };

    // Screening back-test (D48): hide what each evidence class lacks from every measured headline, predict it with
    // the production ranges, and certify the class only if those ranges are honest on both sides.
    const classCases = { 'this-grade': [], 'this-material': [], family: [] };
    for (const m of S.pool) {
      const h = m.headline[key];
      if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
      const f = S.fkey(h.gradeId);
      const headline = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
      if (!headline.length) continue;
      const rest = obs.map((o, i) => ((o.m.id === m.id || o.f === f) && !headline.includes(i) ? i : -1)).filter((i) => i >= 0);
      const manufacturer = S.grades.get(h.gradeId)?.manufacturer;
      const held = (hide) => {
        const p = predict(P, hp, m, f, manufacturer, hide);
        p.mu += tmMean(m);
        // Own published bounds are left out: in the back-test they would be the hidden evidence itself.
        const { wide } = rangeFor(m, m, p, h.unit, { ownBounds: false });
        return { materialId: m.id, y: h.value, lo: wide[0], hi: wide[1] };
      };
      // This grade: its other published kinds remain. This material: the whole grade is hidden, its other grades
      // remain. Family: everything of the material and its product is hidden.
      const sameGrade = rest.filter((i) => obs[i].f === f), otherGrades = rest.filter((i) => obs[i].f !== f);
      if (sameGrade.length) classCases['this-grade'].push(held(headline));
      if (otherGrades.length) classCases['this-material'].push(held([...headline, ...sameGrade]));
      classCases.family.push(held([...headline, ...rest]));
    }
    const certification = Object.fromEntries(Object.entries(classCases).map(([c, cases]) => [c, certifyScreening(cases, model.screening)]));
    diagnostics.properties[key].screening = certification;

    for (const m of S.pool) {
      const h = m.headline[key];
      if (!h || h.known || h.notApplicable) continue;
      const rep = m.representativeGrade && S.grades.has(m.representativeGrade) ? m.representativeGrade : null;
      const f = rep ? S.fkey(rep) : null;
      // Its own measurements, and those of its representative product filed under another material.
      const mine = obs.map((o, i) => ({ o, i })).filter(({ o }) => o.m.id === m.id || (f && o.f === f));
      const support = m.facets.supportMaterial?.value === true;
      if (!mine.length && (support || (key === 'hdt045' && S.info(m).morphology === 'elastomer'))) {
        h.notApplicable = { reason: support ? model.notApplicable.support : model.notApplicable.elastomerHdt };
        continue;
      }
      const manufacturer = rep ? S.grades.get(rep).manufacturer ?? null : null;
      // One product has one value: a representative product filed under another material is predicted
      // as that material's, so PA-CF and PA12-CF cannot disagree about CarbonX CF PA12.
      const owner = f && ownerOfF.get(f) && ownerOfF.get(f) !== m.id ? S.inPool.get(ownerOfF.get(f)) : null;
      const subject = owner ?? m;
      const p = predict(P, hp, subject, f, manufacturer);
      p.mu += tmMean(subject);

      const { bounds, centre, range, wide } = rangeFor(m, subject, p, h.unit);

      const onThisGrade = mine.some(({ o }) => o.f === f && f);
      const strength = onThisGrade ? 'this-grade' : mine.length ? 'this-material' : 'family';
      const totalWeight = p.weights.reduce((a, v) => a + v, 0);
      const ownWeight = mine.reduce((a, { i }) => a + p.weights[i], 0);
      const ownShare = totalWeight > 0 ? Math.max(0, Math.min(1, ownWeight / totalWeight)) : 0;
      const spread = model.properties[key].scale === 'log' ? range[1] / range[0] : range[1] - range[0];
      const precision = spread <= model.properties[key].precision.good ? 'good' : spread <= model.properties[key].precision.fair ? 'fair' : 'poor';
      // The range that decides a screen (D48). A certified class screens on its own plausible range. A class the
      // back-test could not certify screens only where the certified family model agrees: on the union of its own
      // range and the family-only range (the material's own evidence hidden), which is never narrower than a
      // certified family screen.
      let screenRange = null, screenBasis = null;
      if (certification[strength].certified) {
        screenRange = { lo: wide[0], hi: wide[1] };
        screenBasis = `${strength} estimates are certified to screen: ${certification[strength].why}`;
      } else if (strength !== 'family' && certification.family.certified) {
        const pf = predict(P, hp, subject, f, manufacturer, mine.map(({ i }) => i));
        pf.mu += tmMean(subject);
        const familyWide = rangeFor(m, subject, pf, h.unit, { ownBounds: false }).wide;
        screenRange = { lo: Math.min(wide[0], familyWide[0]), hi: Math.max(wide[1], familyWide[1]) };
        screenBasis = `${strength} estimates are not certified (${certification[strength].why}); screens only where the certified family-only range, ${sig3(familyWide[0], -1)} to ${sig3(familyWide[1], 1)} ${h.unit}, fails too`;
      }
      const canScreen = !!screenRange;

      const evidence = mine.map(({ o }) => ({
        kind: o.kind, gradeId: o.gradeId, sameGrade: !!f && o.f === f,
        items: o.items, converted: sig3(inv(o.y)), conversion: o.conversion.why, conflict: !!o.conflict,
      }));
      const family = [identityOf(m), m.facets.reinforcement.value !== 'unfilled' ? m.facets.reinforcement.value : null, S.variantOf(f),
        manufacturer ? `tested by ${manufacturer}` : null].filter(Boolean).join(', ');
      h.estimate = {
        kind: 'model', strength, precision, unit: h.unit,
        sharedWith: owner ? { materialId: owner.id, name: owner.name } : null,
        centre: sig3(centre), lo: sig3(range[0], -1), hi: sig3(range[1], 1),
        plausible: { lo: sig3(wide[0], -1), hi: sig3(wide[1], 1) },
        levels: model.levels, ownShare: Math.round(ownShare * 100) / 100,
        evidence, family, bounds,
        basis: strength === 'this-grade' ? "this grade's related measurements, with the family model"
          : strength === 'this-material' ? "this material's other grades, with the family model"
          : `the family model only: ${family}`,
        method: `Gaussian model of every observation in the snapshot, each converted to this headline; ${Math.round(likely * 100)}% and ${Math.round(plausible * 100)}% ranges calibrated by predicting ${loo.length} hidden measured headlines`,
        canScreen,
        screenRange: screenRange && { lo: sig3(screenRange.lo, -1), hi: sig3(screenRange.hi, 1) },
        screenBasis,
        screenLimit: canScreen ? null : `${strength === 'family' ? 'family-model' : strength} estimates of this property are not certified to screen: ${certification[strength].why}`,
      };
    }
  }
  return diagnostics;
}

/** Coverage summary for the validation report and meta. */
export function summariseEstimates(materials, registry) {
  const pool = materials.filter((m) => !m.excluded && !m.familyEntry);
  const out = {};
  for (const key of estimateKeys(registry)) {
    const missing = pool.filter((m) => !m.headline[key]?.known);
    const row = { missing: missing.length, 'this-grade': 0, 'this-material': 0, family: 0, notApplicable: 0, none: 0, canScreen: 0 };
    for (const m of missing) {
      const h = m.headline[key];
      if (h.notApplicable) row.notApplicable++;
      else if (h.estimate) { row[h.estimate.strength]++; if (h.estimate.canScreen) row.canScreen++; }
      else row.none++;
    }
    out[key] = row;
  }
  return out;
}
