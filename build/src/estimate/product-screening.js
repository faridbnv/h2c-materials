// D137: independent product screening. The displayed D81 ranges are untouched.
// Formulations are split BEFORE fitting: three fifths training, one fifth calibration,
// one fifth evaluation. Calibration/evaluation target values and their conversion pairs
// never enter the screening fit. Related published properties remain legitimate inputs.
import { createHash } from 'node:crypto';
import { HEAD, transform, untransform, sig3 } from './model.js';
import { binomialTail } from './numerics.js';
import { conversions, convert, betweenProductSpread } from './conversions.js';
import { hyperparameters, spreadObservations, predict } from './gaussian.js';
import { fitWithConflicts } from './calibration.js';
import { toleranceSide } from './screening.js';
import { assess, LEVEL } from '../products.js';

export const partition = (formulation) => createHash('sha256').update(`D137:${formulation}`).digest().readUInt32BE(0) % 5;

// A PDF repeated under another source ID is still one source. Conservatively keep
// every formulation sharing its bytes together, even when it contains distinct products.
export function screeningGroups(raw, measurements, sources) {
  const byId = new Map(measurements.map((x) => [x.id, x]));
  const digest = new Map(sources.map((s) => [s.id, /^[a-f0-9]{64}$/.test(s.sha256) ? s.sha256 : s.id]));
  const parent = new Map(raw.map((o) => [o.f, o.f])), owner = new Map();
  const root = (f) => { while (parent.get(f) !== f) f = parent.get(f); return f; };
  for (const o of raw) for (const item of o.items) {
    const source = byId.get(item.measurementId)?.sourceId;
    if (!source) continue;
    const key = digest.get(source) ?? source;
    if (owner.has(key)) {
      const a = root(o.f), b = root(owner.get(key));
      if (a !== b) parent.set(a > b ? a : b, a > b ? b : a);
    } else owner.set(key, o.f);
  }
  return new Map([...parent.keys()].map((f) => [f, root(f)]));
}

// One-sided exact binomial upper confidence limit; no normal approximation at zero errors.
export function wrongRateUpper(wrong, total, confidence) {
  if (!total) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const p = (lo + hi) / 2;
    const cdf = 1 - binomialTail(total, p, wrong + 1);
    if (cdf > 1 - confidence) lo = p; else hi = p;
  }
  return hi;
}

export function certifyProductCases(calibration, evaluation, cfg, nominal) {
  const limit = toleranceSide(calibration, 'above', cfg, nominal);
  // Widen the shared helper's six-digit rounding before evaluation and use.
  const q = limit.certified ? Math.min(1 - 1e-7, limit.quantile + 1e-6) : null;
  const wrong = limit.certified ? evaluation.filter((c) => c.u > q).length : null;
  const upper = limit.certified ? wrongRateUpper(wrong, evaluation.length, cfg.confidence) : 1;
  const certified = limit.certified && upper <= cfg.maxWrongRate;
  return { calibration: calibration.length, evaluation: evaluation.length, wrongExclusions: wrong,
    retainedFailures: limit.certified ? evaluation.filter((c) => c.failureScreened && !c.failureScreened(q)).length : null,
    upperWrongRate: upper, certified, quantile: certified ? q : null,
    why: certified ? 'Separate complete single-numeric-requirement scenarios passed the error gate'
      : !limit.certified ? `${limit.why}; independent evaluation unavailable without a calibrated bound`
        : `Independent evaluation upper wrong-exclusion rate ${Math.round(upper * 1000) / 10}% exceeds the permitted limit` };
}

export function screeningTraining({ key, raw, withheld, S, definition }) {
  // Hide ALL values that could fill the target headline, not just the kernel's
  // preferred observation kind: break/yield can also be qualifying strength.
  // Otherwise the withheld answer leaks back in as a supposedly related input.
  const byFormulation = new Map();
  for (const list of S.byMaterial.values()) for (const x of list) {
    const f = S.fkey(x.gradeId);
    if (!byFormulation.has(f)) byFormulation.set(f, []);
    byFormulation.get(f).push(x);
  }
  const targetIds = new Set();
  for (const f of withheld) {
    const own = byFormulation.get(f) ?? [];
    for (const x of own) if (assess(x, definition, own, { treatment: null, moisture: 'dry' }).level === LEVEL.COMPARABLE) targetIds.add(x.id);
  }
  return raw.filter((o) => !(withheld.has(o.f)
    && (o.kind === HEAD[key] || o.items.some((x) => targetIds.has(x.measurementId)))));
}

export function attachProductScreening({ key, raw, S, model, tmMean, measurements, sources, definition }) {
  const groups = screeningGroups(raw, measurements, sources);
  const truths = new Map();
  for (const g of S.grades.values()) {
    if (g.retired || /-R\d+$/.test(g.id) || !S.inPool.has(g.materialId)) continue;
    const state = g.states?.find((s) => !s.treatment && s.moisture === 'dry');
    const v = state?.values?.[key];
    // These are complete scenarios: one numeric requirement plus all three printer gates.
    // An incomplete record is never counted as an evaluated success.
    if (v?.level !== 'comparable' || !Number.isFinite(v.value)
      || v.interval && v.interval.kind !== 'point' && v.interval.kind !== 'uncertainty'
      || !['nozzle', 'bed', 'chamber'].every((a) => g.print?.[a]?.verdict === 'within')) continue;
    const f = S.fkey(g.id);
    const group = groups.get(f) ?? f;
    if (!truths.has(group)) truths.set(group, { g, f, group, value: v.value });
  }
  const withheldGroupsWithTruth = new Set([...truths.keys()].filter((f) => partition(f) >= 3));
  const withheld = new Set([...groups].filter(([, group]) => withheldGroupsWithTruth.has(group)).map(([f]) => f));
  const withheldGroups = new Set(raw.filter((o) => withheld.has(o.f)).map((o) => `${o.m.id}|${o.f}`));
  const training = screeningTraining({ key, raw, withheld, S, definition });
  // Reserve every supported property's share up front. A certificate cannot be
  // withdrawn merely because another AND requirement is added to the question.
  // Absolute residual bounds cover both ends; only the as-printed/dry route can
  // use them. Other routes have no inferred exclusion and retain ordinary OR logic.
  const maxNumericTests = Object.keys(model.properties).length;
  const cfg = { maxWrongRate: model.screening.maxWrongRate / maxNumericTests,
    confidence: 1 - (1 - model.screening.confidence) / maxNumericTests };
  const report = { context: 'as-printed+dry', maxNumericTests, maxWrongRate: model.screening.maxWrongRate,
    confidence: model.screening.confidence, allocatedMaxWrongRate: cfg.maxWrongRate, allocatedConfidence: cfg.confidence,
    split: 'SHA-256 formulation/source-byte groups: 0–2 training, 3 calibration, 4 evaluation; one truth per group',
    classes: {}, limitation: 'No class has enough independent cases for the complete-scenario allocation; other service states have no numerical screening' };
  if (!training.length) return report;
  const conv = conversions(key, training, model, { without: withheldGroups });
  const converted = convert(key, training, conv, S, model);
  const between = betweenProductSpread(key, training, S);
  const floors = model.properties[key].floors;
  const fixedW = between.pairs >= model.fitting.minBetweenProductPairs ? Math.max(between.sd, floors.w) : null;
  const hp = hyperparameters(key, spreadObservations(key, converted, model.fitting.spreadSampleMax), S, model, fixedW,
    { start: { ...floors }, sweeps: 1 });
  const { P, obs } = fitWithConflicts(key, converted, S, model, hp);
  const strengthOf = (m, f) => obs.some((o) => o.f === f) ? 'this-grade'
    : obs.some((o) => o.m.id === m.id) ? 'this-material' : 'family';
  const samples = Object.fromEntries(['this-grade', 'this-material', 'family'].map((c) => [c, { calibration: [], evaluation: [] }]));
  const tx = transform(key, model), inv = untransform(key, model);
  for (const t of truths.values()) {
    const fold = partition(t.group);
    if (fold < 3) continue;
    const m = S.inPool.get(t.g.materialId), p = predict(P, hp, m, t.f, t.g.manufacturer);
    const z = Math.abs((tx(t.value) - tmMean(m) - p.mu) / p.sd);
    // A monotone finite score, not a Gaussian tail probability: extreme residuals
    // must widen the bound rather than disappear through floating-point CDF saturation.
    const u = z / (1 + z);
    samples[strengthOf(m, t.f)][fold === 3 ? 'calibration' : 'evaluation'].push({ u,
      beyond: { above: false, below: false }, failureScreened: (q) => inv(p.mu + tmMean(m) + p.sd * q / (1 - q)) < t.value + Math.max(1, Math.abs(t.value) * 0.1) });
  }
  for (const [c, sets] of Object.entries(samples)) report.classes[c] = {
    ...certifyProductCases(sets.calibration, sets.evaluation, cfg, 0),
    singleTestDiagnostic: certifyProductCases(sets.calibration, sets.evaluation, model.screening, 0),
  };
  report.limitation = Object.values(report.classes).some((c) => c.certified)
    ? 'Only the untreated dry route is certified; other states have no numerical screening'
    : 'No class has enough independent cases for the complete-scenario allocation; other service states have no numerical screening';
  for (const g of S.grades.values()) {
    const e = g.estimate?.[key];
    if (!e) continue;
    const m = S.inPool.get(g.materialId), f = S.fkey(g.id);
    const strength = strengthOf(m, f), cert = report.classes[strength];
    const z = cert.certified ? cert.quantile / (1 - cert.quantile) : null;
    const p = z == null ? null : predict(P, hp, m, f, g.manufacturer);
    let screenRange = z == null ? null : {
      lo: sig3(Math.min(e.plausible.lo, inv(p.mu + tmMean(m) - z * p.sd)), -1),
      hi: sig3(Math.max(e.plausible.hi, inv(p.mu + tmMean(m) + z * p.sd)), 1),
    };
    if (screenRange && !Object.values(screenRange).every(Number.isFinite)) screenRange = null;
    Object.assign(e, { kind: 'product-model', canScreen: !!screenRange, screenRange,
      screenLimit: cert.why, screenBasis: cert.certified ? `${strength}: ${cert.why}` : null,
      screening: { ...report, strength, classes: undefined, ...cert } });
    delete e.screening.classes;
  }
  return report;
}
