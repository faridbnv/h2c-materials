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
import { normalCdf, normalQuantile, exceeds } from '../build/src/estimate/numerics.js';

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

// The guard on the page's own path (C25, D155): materials judged product by product, as the selector and the census
// judge them (scripts/trace.mjs pageContext). No material is "One check away" or tagged "likely" for a requirement its
// deciding product's own defended range wholly misses (a measured value widened by its test scatter, D152, or an
// estimate's screening or plausible range), nor where a product measured the way asked misses it and none meets it, which
// is "Unlikely to meet". A material with no product on record keeps the material-level contract above: it stays no
// candidate for a requirement its own defended range wholly fails, except by a verified implied bound.
test('on the page\'s path, nothing is one check away or likely for a requirement its own defended range wholly misses', async () => {
  const { pageContext } = await import('../scripts/trace.mjs');
  const { TEMPLATES } = await import('../app/js/ui/templates.js');
  const mats = db.materials.filter((m) => !m.familyEntry);
  const ctx = pageContext(db, { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true });
  const scatter = new Map(db.registry.headlines.filter((h) => h.testScatter).map((h) => [h.key, h.testScatter]));
  // The values a limit is on the line for (D152): L(1 - s) <= v for a relative scatter, so the value stands for limits up to v / (1 - s).
  // To twelve significant digits, as the build rounds: 1.89 / 0.9 is 2.0999999999999996 in binary, and a limit of 2.1
  // that the engine puts on the line (2.1 × 0.9 ≤ 1.89) read as wholly missed (the clean-up round's maker merge moved the
  // sampled limits onto it).
  const widen = (v, s, sign) => (v == null ? null : Number((s.is === 'relative' ? v / (1 - (sign * s.value) / 100) : v + sign * s.value).toPrecision(12)));
  const defended = (r, key) => {
    if (r.notApplicable) return 'na';
    if (Number.isFinite(r.observed)) {
      const iv = r.interval ?? { lo: r.observed, hi: r.observed };
      const s = scatter.get(key);
      return s ? { lo: widen(iv.lo, s, -1), hi: widen(iv.hi, s, 1) } : iv;
    }
    if (r.estimated && r.estimate) return r.estimate.screenRange ?? r.estimate.plausible ?? { lo: r.estimate.lo, hi: r.estimate.hi };
    return null;
  };
  const leaks = [];
  let checked = 0;
  const audit = (constraints, label) => {
    for (const e of runSelection(mats, constraints, ctx).evaluations) {
      if (e.group !== 'one-check-away' && !e.likely) continue;
      for (const c of constraints.filter((x) => x.kind === 'numeric' && x.mandatory !== false)) {
        checked++;
        const r = e.results.find((x) => x.constraint === c);
        const o = r ? defended(r, c.property) : null;
        if (o === 'na' || (o && compareInterval({ lo: o.lo ?? null, hi: o.hi ?? null }, c.operator, c.value) === STATUS.FAIL)) leaks.push(`${label}: ${e.materialId} ${e.group}${e.likely ? ' likely' : ''} on ${e.gradeId}`);
        const measured = e.products.map((p) => p.results.find((x) => x.constraint === c)).filter((x) => x && Number.isFinite(x.observed));
        if (measured.some((x) => x.status === STATUS.FAIL) && !e.products.some((p) => p.results.some((x) => x.constraint === c && x.status !== STATUS.FAIL && x.status !== STATUS.UNKNOWN))) {
          leaks.push(`${label}: ${e.materialId} ${e.group} though every measured product misses ${c.property}`);
        }
      }
    }
  };
  for (const t of TEMPLATES) audit(t.constraints, t.name);
  const productless = mats.filter((m) => !ctx.productsByMaterial.get(m.id)?.length);
  assert.ok(productless.length >= 1, 'the materials with no product on record are still judged');
  for (const k of KEYS) {
    const ends = new Set();
    for (const g of db.grades) {
      const h = g.headline?.[k], e = g.estimate?.[k];
      for (const v of [h?.value, e?.lo, e?.hi, e?.plausible?.lo, e?.plausible?.hi]) if (Number.isFinite(v)) ends.add(v);
    }
    const sorted = [...ends].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(sorted.length / 12));
    for (let i = 0; i < sorted.length; i += step) {
      for (const op of ['>=', '<=']) {
        const c = { kind: 'numeric', property: k, operator: op, value: sorted[i], mandatory: true };
        audit([c], `${k} ${op} ${sorted[i]}`);
        // A material with no product keeps the material-level contract on the page's path too.
        for (const e of runSelection(productless, [c], ctx).candidates) {
          const m = productless.find((x) => x.id === e.materialId), h = m.headline[k];
          const o = h.known ? (h.interval ?? { lo: h.value, hi: h.value }) : h.notApplicable ? 'na' : h.estimate?.canScreen ? h.estimate.screenRange : null;
          if (!(o === 'na' || (o && compareInterval({ lo: o.lo, hi: o.hi }, op, c.value) === STATUS.FAIL))) continue;
          if ((h.impliedBounds ?? []).some((b) => e.results[0].vetoedBy?.includes(b.measurementId))) continue;
          leaks.push(`${k} ${op} ${c.value}: ${m.name} (no product) is a candidate`);
        }
      }
    }
  }
  assert.ok(checked > 200, `only ${checked} requirement answers checked`);
  assert.deepEqual(leaks.slice(0, 10), [], `${leaks.length} leaks`);
});

// D155: the groups present the verdicts and change none of them. Over the six presets and random scenarios, on the page's
// path: each material's verdict is the D100 rule over its products' verdicts, its eligibility and hide follow from them as
// before, its group agrees with them (Include lists exactly the meets, one check away, not enough data and unlikely
// groups), and judging the products in reverse order moves no verdict, count, eligibility or group.
test('grouping never changes a verdict, a count or an eligibility', async () => {
  const { pageContext } = await import('../scripts/trace.mjs');
  const { TEMPLATES } = await import('../app/js/ui/templates.js');
  const mats = db.materials.filter((m) => !m.familyEntry);
  const LISTED = ['meets', 'one-check-away', 'not-enough-data', 'unlikely-to-meet'];
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const scenarios = TEMPLATES.map((t) => t.constraints);
  for (let i = 0; i < 6; i++) {
    const k = KEYS[Math.floor(rnd() * KEYS.length)];
    const vals = db.grades.map((g) => g.headline?.[k]?.value).filter(Number.isFinite);
    scenarios.push([{ kind: 'numeric', property: k, operator: rnd() < 0.5 ? '>=' : '<=', value: vals[Math.floor(rnd() * vals.length)], mandatory: true },
      ...(rnd() < 0.5 ? [{ kind: 'gate', gate: 'chamber' }] : [])]);
  }
  const problems = [];
  for (const constraints of scenarios) {
    for (const [unknownPolicy, useEstimates] of [['strict', false], ['exploration', false], ['exploration', true]]) {
      const ctx = pageContext(db, { unknownPolicy, useEstimates });
      const sel = runSelection(mats, constraints, ctx);
      const reversed = new Map([...ctx.productsByMaterial].map(([id, gs]) => [id, [...gs].reverse()]));
      const flipped = runSelection(mats, constraints, { ...ctx, productsByMaterial: reversed });
      assert.deepEqual(flipped.counts, sel.counts);
      const explore = unknownPolicy === 'exploration';
      for (const [j, e] of sel.evaluations.entries()) {
        const f = flipped.evaluations[j];
        const where = `${e.materialId} (${unknownPolicy}${useEstimates ? '+est' : ''})`;
        if (f.verdict !== e.verdict || f.eligible !== e.eligible || f.screened !== e.screened || f.group !== e.group || f.likely !== e.likely) problems.push(`${where}: product order moved the answer`);
        if (e.products.length) {
          const vs = e.products.map((p) => p.verdict);
          const expect = vs.includes('PASS') ? 'PASS' : vs.includes('UNKNOWN') ? 'UNKNOWN' : 'FAIL';
          if (e.verdict !== expect) problems.push(`${where}: verdict ${e.verdict}, its products say ${expect}`);
          const hidden = explore && e.verdict === 'UNKNOWN' && e.products.filter((p) => p.verdict === 'UNKNOWN').every((p) => p.screened);
          if (e.screened !== hidden) problems.push(`${where}: hide moved`);
        }
        if (e.eligible !== (e.verdict === 'PASS' || (explore && e.verdict === 'UNKNOWN' && !e.screened))) problems.push(`${where}: eligibility moved`);
        const g = { PASS: 'meets', FAIL: 'fail' }[e.verdict] ?? (e.screened ? 'hidden' : null);
        if (g ? e.group !== g : !LISTED.slice(1).includes(e.group)) problems.push(`${where}: group ${e.group} for ${e.verdict}${e.screened ? ' screened' : ''}`);
        if (explore && e.eligible !== LISTED.includes(e.group)) problems.push(`${where}: listed ${e.eligible} but group ${e.group}`);
        if (e.likely && e.group !== 'not-enough-data') problems.push(`${where}: likely outside "Not enough data"`);
      }
    }
  }
  assert.deepEqual(problems.slice(0, 10), [], `${problems.length} problems`);
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

// The case that sets a range's scale lies on an end of its range by construction; a unit in the last place, which Linux on
// x64 and a Mac on arm64 do not always agree on, must not put it beyond (the m223 build: CI and a Mac counted it apart).
test('a true value on an end of its range, to rounding, does not lie beyond it', () => {
  assert.equal(exceeds(84.3, 84.29999999999998), false);
  assert.equal(exceeds(1.3000000000000003, 1.3), false);
  assert.equal(exceeds(1.29, 1.29), false);
  assert.equal(exceeds(84.31, 84.3), true);
  assert.equal(exceeds(-1.3, -1.3000000000000003), false);
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
