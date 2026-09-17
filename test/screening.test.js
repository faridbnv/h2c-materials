// Screening (DECISIONS D48). The structural invariants of the selection engine, a leak sweep over every single
// numeric requirement against the range the rule defends, and the back-test that decides which evidence may
// screen at all. Moved here from docs/audits/2026-09-14-filtering-robustness/, where they were one-off scripts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSelection, compareInterval, STATUS, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { certifyScreening, toleranceRank, minimumCases } from '../build/src/estimate/screening.js';
import { ESTIMATE_MODEL } from '../build/src/estimate/model.js';
import { normalCdf, normalQuantile } from '../build/src/estimate/numerics.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'dist/db.json');
const db = existsSync(dbPath) ? JSON.parse(readFileSync(dbPath, 'utf8')) : null;
const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];

function context() {
  const group = (list) => { const m = new Map(); for (const x of list) { if (!m.has(x.materialId)) m.set(x.materialId, []); m.get(x.materialId).push(x); } return m; };
  return { db, evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage) };
}

test('structural invariants hold over random multi-requirement scenarios', () => {
  const mats = db.materials.filter((m) => !m.familyEntry);
  const base = context();
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const ranges = { density: [800, 1800], tensileModulusXY: [0.01, 12], tensileStrengthXY: [5, 170], elongationXY: [1, 700], hdt045: [40, 270], priceCADkg: [20, 300] };
  const cats = Object.keys(db.meta.environmentCategories);
  const statuses = [...new Set(mats.map((m) => m.h2cStatus))];
  // Thresholds at the evidence itself half the time: a headline value, an interval or band end, an estimate end. Every
  // comparison the rail can emit, including the strict ones (audit 2026-09-15).
  const edges = Object.fromEntries(Object.keys(ranges).map((k) => [k, mats.flatMap((m) => {
    const h = m.headline[k];
    return [h?.value, h?.interval?.lo, h?.interval?.hi, h?.estimate?.plausible?.lo, h?.estimate?.plausible?.hi, h?.loadBracket?.hi];
  }).filter(Number.isFinite)]));
  const gen = () => {
    const kind = pick(['numeric', 'numeric', 'numeric', 'gate', 'facet', 'environment', 'evidence']);
    if (kind === 'numeric') {
      const p = pick(Object.keys(ranges)); const [a, b] = ranges[p];
      const value = rnd() < 0.5 && edges[p].length ? pick(edges[p]) : a + rnd() * (b - a);
      return { kind, property: p, operator: pick(['>=', '<=', '>', '<']), value, mandatory: rnd() > 0.1 };
    }
    if (kind === 'gate') return pick([{ kind, gate: 'scope' }, { kind, gate: 'nozzle' }, { kind, gate: 'bed' }, { kind, gate: 'chamber' }, { kind, gate: 'abrasive', hardenedAvailable: rnd() > 0.5 }, { kind, gate: 'buyable', inStock: rnd() > 0.5 }, { kind, gate: 'dryingKnown' }, { kind, gate: 'h2cStatus', in: statuses.filter(() => rnd() > 0.4) }].filter((g) => !g.in || g.in.length));
    if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'reinforcement', in: [pick(['carbon-fibre', 'glass-fibre', 'unfilled'])] }, { kind, facet: 'flexible', equals: rnd() > 0.5 }]);
    if (kind === 'environment') return { kind, category: pick(cats) };
    return { kind, exactGrade: rnd() > 0.5, noConflicts: rnd() > 0.5 };
  };
  const ids = (sel) => new Set(sel.candidates.map((e) => e.materialId));
  const sub = (a, b) => [...a].every((x) => b.has(x));
  const fails = {};
  const bump = (k, ex) => { fails[k] ??= { n: 0, ex }; fails[k].n++; };
  const modes = { strict: { unknownPolicy: UNKNOWN_POLICY.STRICT }, exploreNoEst: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }, exploreEst: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true } };
  for (let i = 0; i < 1500; i++) {
    const cs = Array.from({ length: 1 + Math.floor(rnd() * 4) }, gen);
    const s = Object.fromEntries(Object.entries(modes).map(([k, c]) => [k, runSelection(mats, cs, { ...base, ...c })]));
    const I = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, ids(v)]));
    if (!sub(I.strict, I.exploreEst)) bump('Strict shows a material Explore does not', cs);
    if (!sub(I.exploreEst, I.exploreNoEst)) bump('Estimates on shows a material estimates off does not', cs);
    for (const e of s.exploreEst.evaluations) {
      for (const r of e.results) if (r.status === STATUS.PASS && (r.estimated || r.notApplicable || r.caveat)) bump('PASS resting on inference', cs);
      // A close-to-limit PASS is judged on a published mean (D54): it must rest on a measurement, and say so.
      for (const r of e.results) if (r.closeToLimit && !(r.measurementId && /close to the limit/.test(r.reason))) bump('close-to-limit result without its measurement or wording', cs);
      if (e.verdict === STATUS.PASS && e.screened) bump('PASS and screened at once', cs);
      if (e.verdict === STATUS.FAIL && e.eligible) bump('FAIL still eligible', cs);
    }
    const extra = [...cs, { ...gen(), mandatory: true }];
    for (const [k, c] of Object.entries(modes)) if (!sub(ids(runSelection(mats, extra, { ...base, ...c })), I[k])) bump(`Adding a requirement adds a material (${k})`, extra);
    const n = cs.find((c) => c.kind === 'numeric' && c.mandatory !== false);
    if (n) {
      const tight = cs.map((c) => (c === n ? { ...c, value: c.operator.startsWith('>') ? c.value * 1.2 : c.value * 0.8 } : c));
      for (const [k, c] of Object.entries(modes)) if (!sub(ids(runSelection(mats, tight, { ...base, ...c })), I[k])) bump(`Tightening a threshold adds a material (${k})`, tight);
    }
    const soft = [...cs, { ...gen(), mandatory: false }];
    for (const [k, c] of Object.entries(modes)) if (!sub(I[k], ids(runSelection(mats, soft, { ...base, ...c })))) bump(`A tracked requirement removes a material (${k})`, soft);
  }
  assert.deepEqual(Object.entries(fails).map(([k, v]) => `${k}: ${v.n} e.g. ${JSON.stringify(v.ex).slice(0, 200)}`), []);
});

// The range each headline defends: a measured interval, a certified unstated-load bracket, the range the back-test
// lets an estimate screen on, or not applicable. In Explore with estimates on, a material whose defended range
// wholly fails a requirement must not remain a candidate, unless its own measurement bounds the headline from
// below and meets the requirement (then the range, not the material, was wrong).
test('no material stays a candidate for a requirement its defended range fails, except by a verified implied bound', () => {
  const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
  const ctx = { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.EXPLORATION };
  const defended = (m, k) => {
    const h = m.headline[k];
    if (h.known) return h.loadStated === false ? (h.loadBracket?.screenRange ?? null) : (h.interval ?? { lo: h.value, hi: h.value });
    if (h.notApplicable) return 'na';
    return h.estimate?.canScreen ? h.estimate.screenRange : null;
  };
  const leaks = [];
  let checked = 0, vetoes = 0;
  for (const k of KEYS) {
    const vals = new Set();
    for (const m of mats) { const o = defended(m, k); if (o && o !== 'na') { vals.add(o.lo); vals.add(o.hi); } }
    const ts = [...vals].filter(Number.isFinite).sort((a, b) => a - b);
    const thresholds = ts.flatMap((v, i) => [v, i + 1 < ts.length ? (v + ts[i + 1]) / 2 : v * 1.01]);
    for (const op of ['>=', '<=']) {
      for (const t of thresholds) {
        const c = { kind: 'numeric', property: k, operator: op, value: t, mandatory: true };
        for (const e of runSelection(mats, [c], ctx).candidates) {
          checked++;
          const m = mats.find((x) => x.id === e.materialId), o = defended(m, k), r = e.results[0];
          if (!(o === 'na' || (o && compareInterval({ lo: o.lo, hi: o.hi }, op, t) === STATUS.FAIL))) continue;
          const bound = (m.headline[k].impliedBounds ?? []).find((b) => r.vetoedBy?.includes(b.measurementId));
          if (bound && compareInterval({ lo: bound.lo, hi: null }, op, t) === STATUS.PASS) { vetoes++; continue; }
          leaks.push(`${k} ${op} ${t}: ${m.name}`);
        }
      }
    }
  }
  assert.ok(checked > 10000, `only ${checked} pairs checked`);
  assert.deepEqual(leaks.slice(0, 10), [], `${leaks.length} leaks`);
  assert.ok(vetoes >= 0);
});

// D59: each end of a screening range is a distribution-free tolerance limit of where hidden true values fell in their
// predictions. It is never inside the plausible range, it widens where the tail is too thin, and too few cases set nothing.
test('screening ends are tolerance limits: at the plausible range when calibrated, wider when not, absent when too few', () => {
  const cfg = ESTIMATE_MODEL.screening;
  const nominal = 0.5 + ESTIMATE_MODEL.levels.plausible / 2;
  const cases = (us) => us.map((u) => ({ u, beyond: { above: u > nominal, below: u < 1 - nominal } }));
  const uniform = (n) => Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  // Calibrated: positions spread evenly. The ends stay at the plausible range.
  const calibrated = certifyScreening(cases(uniform(100)), cfg, nominal);
  assert.equal(calibrated.above.quantile, nominal);
  assert.equal(calibrated.below.quantile, Number((1 - nominal).toPrecision(6)));
  // Too narrow: true values pile into the tails. The ends move out, and still hold at the stated rate.
  const narrow = certifyScreening(cases(uniform(100).map((u) => (u < 0.2 ? u / 50 : u > 0.8 ? 1 - (1 - u) / 50 : u))), cfg, nominal);
  assert.ok(narrow.above.certified && narrow.above.quantile > nominal, JSON.stringify(narrow.above));
  assert.ok(narrow.below.certified && narrow.below.quantile < 1 - nominal, JSON.stringify(narrow.below));
  // The guarantee: a model whose standard deviation is half the truth (true positions u = Φ(2Z)) needs its top at the
  // 99.48% point to be beyond at most 10%. Over many classes of 40 cases, the top the build takes is beyond at most 10%
  // (exactly: 1 - Φ(Φ⁻¹(q)/2)) in at least `confidence` of classes; one rank narrower, it is clearly not.
  let state = 0x9e3779b9;
  const rnd = () => { state = (state + 0x6d2b79f5) | 0; let t = Math.imul(state ^ (state >>> 15), 1 | state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const wrongRate = (q) => 1 - normalCdf(normalQuantile(q) / 2);
  const n = 40, r = toleranceRank(n, cfg), classes = 2000;
  // An end the build refuses to set (a hold-out beyond anything the model reaches) screens nothing, so it cannot be wrong.
  let held = 0, set = 0, heldNarrower = 0;
  for (let k = 0; k < classes; k++) {
    const us = Array.from({ length: n }, () => normalCdf(2 * gauss()));
    const side = certifyScreening(cases(us), cfg, nominal).above;
    if (side.certified) set++;
    if (!side.certified || wrongRate(side.quantile) <= cfg.maxWrongRate) held++;
    const narrower = Math.max(nominal, [...us].sort((a, b) => b - a)[r]);
    if (wrongRate(narrower) <= cfg.maxWrongRate) heldNarrower++;
  }
  assert.ok(set / classes >= 0.9, `an end was set in only ${set} of ${classes} classes`);
  assert.ok(held / classes >= cfg.confidence - 0.015, `the top held in ${held} of ${classes} classes`);
  assert.ok(heldNarrower / classes <= cfg.confidence - 0.08, `one rank narrower still held in ${heldNarrower} of ${classes} classes`);
  // Too few cases never set an end, however good they look.
  const few = minimumCases(cfg) - 1;
  assert.equal(toleranceRank(few, cfg), null);
  assert.equal(certifyScreening(cases(uniform(few)), cfg, nominal).certified, false);
  assert.ok(toleranceRank(few + 1, cfg) >= 1);
});

test('every estimate that may screen names the range and the reason, and the range is never narrower than it shows', () => {
  let screening = 0;
  for (const m of db.materials) {
    for (const [k, h] of Object.entries(m.headline)) {
      const e = h.estimate;
      if (!e) continue;
      if (!e.canScreen) { assert.ok(e.screenLimit, `${m.name} ${k} cannot screen without a reason`); continue; }
      screening++;
      assert.ok(e.screenRange && e.screenBasis, `${m.name} ${k}`);
      // An open end (null) screens nothing on that side; a closed one is never inside the plausible range.
      assert.ok((e.screenRange.lo == null || e.screenRange.lo <= e.plausible.lo) && (e.screenRange.hi == null || e.screenRange.hi >= e.plausible.hi), `${m.name} ${k} screens on a range narrower than its plausible range`);
      // An end never screens against the material's own evidence.
      for (const ev of e.evidence) {
        if (e.screenRange.hi != null && !ev.items.some((i) => i.bound === 'upper')) assert.ok(ev.converted <= e.screenRange.hi * 1.001, `${m.name} ${k}: own ${ev.kind} ${ev.converted} above the screen top ${e.screenRange.hi}`);
        if (e.screenRange.lo != null && !ev.items.some((i) => i.bound === 'lower')) assert.ok(ev.converted >= e.screenRange.lo * 0.999, `${m.name} ${k}: own ${ev.kind} ${ev.converted} below the screen bottom ${e.screenRange.lo}`);
      }
    }
  }
  assert.ok(screening > 0);
  for (const [k, p] of Object.entries(db.meta.estimateModel.properties)) assert.ok(p.screening?.family, `${k} has no back-test`);
});
