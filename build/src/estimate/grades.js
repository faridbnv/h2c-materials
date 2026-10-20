// Grade posteriors (DECISIONS D81): what the model says of each product, not only of each material.
//
// The model is already hierarchical — chemical group, identity, the material's own deviation, the product's own
// deviation (gaussian.js) — and a material's estimate is the prediction at the material (or, where it has one product,
// at that product's row). A grade's estimate is the same prediction at the grade's own row: its formulation, its maker
// as test house. No new hierarchy and no refit. A grade that publishes the headline pulls its own posterior towards what it published;
// one that publishes nothing gets its material's latent and the spread between products.
//
// The material's calibration does not hold at grade level (a product's value scatters about its material more than
// a material's about its family's prediction), so grade ranges have their own: every grade that publishes the
// headline has its own observations hidden in turn and is predicted from the rest, through the same hold-out the
// material calibration uses, and the likely and plausible scales are set from where the hidden values fell. The
// material's ranges are untouched.
//
// Attached only where a product lacks a comparable value. It never passes a requirement.
// D137 adds separate independent exclusion certification without changing these displayed ranges.

import { quantile, median, normalCdf } from './numerics.js';
import { HEAD, identityOf, sig3, transform } from './model.js';
import { predict } from './gaussian.js';
import { lowerBoundsOf } from '../lower-bounds.js';
import { ownBand, publishBand } from './anchor.js';

/**
 * Hide each grade's own observations of the headline's own kind and predict them: the grade-level scales, their
 * coverage, and the grades whose published value sits far outside what everything else predicts.
 */
export function calibrateGrades({ key, def = null, model, S, obs, ownObs = obs, holdOut, zLikely, zPlausible, tmMean = () => 0 }) {
  const cfg = model.calibration;
  const groups = new Map();
  obs.forEach((o, i) => {
    if (o.kind !== HEAD[key] || !o.f) return;
    const k = `${o.m.id}|${o.f}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const held = [];
  for (const hide of groups.values()) {
    const o0 = obs[hide[0]];
    // The grade's only evidence is not held against it: hidden, it would be predicted from the family alone, which
    // is the material calibration's question, not this one's.
    if (!obs.some((o, i) => o.m.id === o0.m.id && !hide.includes(i))) continue;
    const p = holdOut(o0.m, o0.f, S.grades.get(o0.gradeId)?.manufacturer, hide, { refitConversions: false });
    for (const i of hide) held.push({ o: obs[i], p, sd: Math.sqrt(p.sd * p.sd + obs[i].noise2) });
  }
  const zs = held.map((h) => Math.abs((h.o.y - h.p.mu) / h.sd));
  const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
  const enough = held.length >= cfg.minHeld;
  const calLikely = enough ? clamp(quantile(zs, model.levels.likely) / zLikely, cfg.likelyScale) : cfg.defaultScale;
  const calPlausible = enough ? clamp(quantile(zs, model.levels.plausible) / zPlausible, cfg.plausibleScale) : cfg.defaultScale;
  const within = (h, z, cal) => Math.abs(h.o.y - h.p.mu) <= z * Math.sqrt((h.p.sd * cal) ** 2 + h.o.noise2);
  const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
  const calibration = {
    held: held.length, grades: new Set(held.map((h) => h.o.gradeId)).size,
    likelyScale: r3(calLikely), plausibleScale: r3(calPlausible),
    likelyCoverage: held.length ? r3(held.filter((h) => within(h, zLikely, calLikely)).length / held.length) : null,
    plausibleCoverage: held.length ? r3(held.filter((h) => within(h, zPlausible, calPlausible)).length / held.length) : null,
    // The median width of the plausible range a hidden grade would be shown (a ratio on a log scale, °C otherwise).
    medianPlausibleWidth: held.length ? r3(median(held.map((h) => (model.properties[key].scale === 'log' ? Math.exp(2 * zPlausible * calPlausible * h.p.sd) : 2 * zPlausible * calPlausible * h.p.sd)))) : null,
  };
  // The same hidden grades by matrix as printed and by fold of materials (D162): the coverage the shared scales give each,
  // and the scales each class alone would need.
  const groupBy = (key2) => { const out = {}; for (const h of held) (out[key2(h)] ??= []).push(h); return out; };
  const zOf = (h) => Math.abs((h.o.y - h.p.mu) / h.sd);
  calibration.byMatrix = Object.fromEntries(Object.entries(groupBy((h) => S.matrix(h.o.m))).sort().map(([cls, hs]) => [cls, {
    held: hs.length,
    likelyCoverage: r3(hs.filter((h) => within(h, zLikely, calLikely)).length / hs.length),
    plausibleCoverage: r3(hs.filter((h) => within(h, zPlausible, calPlausible)).length / hs.length),
    likelyScale: r3(quantile(hs.map(zOf), model.levels.likely) / zLikely), plausibleScale: r3(quantile(hs.map(zOf), model.levels.plausible) / zPlausible),
  }]));
  // How well the grade predictions state a chance (D165): where each hidden value fell in its predictive distribution
  // (the probability integral transform, u), and, for each limit the presets ask of the headline (estimate-model.json
  // reliabilityLimits), the predicted chance of meeting it in tenths beside how often the hidden value met it.
  const limits = model.properties[key].reliabilityLimits ?? [];
  if (held.length && limits.length) {
    const t = model.properties[key].scale === 'log' ? Math.log : (v) => v;
    const sdOf = (h) => Math.sqrt((h.p.sd * calLikely) ** 2 + h.o.noise2);
    const u = held.map((h) => normalCdf((h.o.y - h.p.mu) / sdOf(h)));
    const bins = Array.from({ length: 10 }, () => ({ n: 0, predicted: 0, met: 0 }));
    for (const h of held) for (const l of limits) {
      const z = (t(l.value) - tmMean(h.o.m) - h.p.mu) / sdOf(h);
      const chance = l.operator === '>=' ? 1 - normalCdf(z) : normalCdf(z);
      const met = l.operator === '>=' ? h.o.y >= t(l.value) - tmMean(h.o.m) : h.o.y <= t(l.value) - tmMean(h.o.m);
      const b = bins[Math.min(9, Math.floor(chance * 10))];
      b.n++; b.predicted += chance; b.met += met ? 1 : 0;
    }
    calibration.reliability = {
      medianU: r3(median(u)),
      bins: bins.map((b, i) => ({ from: i / 10, n: b.n, predicted: b.n ? r3(b.predicted / b.n) : null, observed: b.n ? r3(b.met / b.n) : null })),
    };
  }
  const order = [...new Set(S.pool.map((m) => m.id))].sort();
  const foldOf = new Map(order.map((id, i) => [id, i % cfg.folds]));
  calibration.byFold = Object.entries(groupBy((h) => foldOf.get(h.o.m.id))).sort().map(([, hs]) => ({ held: hs.length,
    plausibleCoverage: r3(hs.filter((h) => within(h, zPlausible, calPlausible)).length / hs.length) }));
  // The anchor's back-test (D167, anchor.js): each hidden grade that publishes the asked property another way too. Does
  // its own band hold its hidden value; where the model's centre lies outside the band (its estimate withheld), which
  // was right; and do its ranges, held inside the band, still hold the hidden value as often as they claim.
  // A band is its conversion's spread at the plausible level, widened by a scale per side set as the ranges' are: from
  // where the hidden values fell against each band of their own product (each band on its own), so each side holds the
  // hidden value as often as it claims (97.5 % each). Unscaled, the bands held 85 to 90 %, not 95 %; and a printed bar
  // falls far below its own moulded value more often than it rises above it, so the sides differ (D167).
  let bandScale = { lo: cfg.defaultScale, hi: cfg.defaultScale };
  if (def) {
    const up = [], down = [];
    for (const h of held) {
      const own = ownObs.filter((o) => o.m.id === h.o.m.id && o.f === h.o.f && o.kind !== HEAD[key]);
      for (const b of ownBand({ def, model, key, own, centreOf: (o) => o.y, zPlausible, scale: 1 })?.bands ?? []) {
        const z = (h.o.y - (b.lo + b.hi) / 2) / ((b.hi - b.lo) / 2);
        up.push(Math.max(0, z)); down.push(Math.max(0, -z));
      }
    }
    const side = 0.5 + model.levels.plausible / 2;
    if (up.length >= cfg.minHeld) bandScale = { lo: clamp(quantile(down, side), [1, cfg.plausibleScale[1]]), hi: clamp(quantile(up, side), [1, cfg.plausibleScale[1]]) };
  }
  if (def) {
    const rows = { cases: 0, disagree: 0, inBand: 0, inNominal: 0, withheld: 0, withheldInBand: 0, withheldInModel: 0, anchored: 0,
      likelyBefore: 0, plausibleBefore: 0, likelyAfter: 0, plausibleAfter: 0 };
    for (const h of held) {
      const own = ownObs.filter((o) => o.m.id === h.o.m.id && o.f === h.o.f && o.kind !== HEAD[key]);
      const band = ownBand({ def, model, key, own, centreOf: (o) => o.y, zPlausible, scale: bandScale });
      if (!band) continue;
      rows.cases++;
      if (band.disagree) { rows.disagree++; continue; }
      const y = h.o.y, inBand = y >= band.lo && y <= band.hi;
      if (inBand) rows.inBand++;
      if (band.bands.every((b) => y >= b.lo && y <= b.hi)) rows.inNominal++;
      const sdL = Math.sqrt((h.p.sd * calLikely) ** 2 + h.o.noise2), sdP = Math.sqrt((h.p.sd * calPlausible) ** 2 + h.o.noise2);
      const inRange = (z, sd, held) => {
        const lo = h.p.mu - z * sd, hi = h.p.mu + z * sd;
        return held ? y >= Math.max(lo, band.lo) && y <= Math.min(hi, band.hi) : y >= lo && y <= hi;
      };
      if (h.p.mu < band.lo || h.p.mu > band.hi) {
        rows.withheld++;
        if (inBand) rows.withheldInBand++;
        if (inRange(zPlausible, sdP, false)) rows.withheldInModel++;
        continue;
      }
      rows.anchored++;
      rows.likelyBefore += inRange(zLikely, sdL, false); rows.plausibleBefore += inRange(zPlausible, sdP, false);
      rows.likelyAfter += inRange(zLikely, sdL, true); rows.plausibleAfter += inRange(zPlausible, sdP, true);
    }
    const share = (n, d) => (d ? r3(n / d) : null);
    calibration.anchor = { bandScale: { lo: r3(bandScale.lo), hi: r3(bandScale.hi) }, cases: rows.cases, disagree: rows.disagree,
      bandCoverage: share(rows.inNominal, rows.cases - rows.disagree), anchorCoverage: share(rows.inBand, rows.cases - rows.disagree),
      withheld: rows.withheld, withheldInBand: rows.withheldInBand, withheldInModel: rows.withheldInModel, anchored: rows.anchored,
      likelyBefore: share(rows.likelyBefore, rows.anchored), plausibleBefore: share(rows.plausibleBefore, rows.anchored),
      likelyAfter: share(rows.likelyAfter, rows.anchored), plausibleAfter: share(rows.plausibleAfter, rows.anchored) };
  }
  // The worst hidden value per grade, where it sits beyond what the calibrated plausible range allows.
  const outliers = new Map();
  for (const h of held) {
    const z = (h.o.y - h.p.mu) / Math.sqrt((h.p.sd * calPlausible) ** 2 + h.o.noise2);
    if (Math.abs(z) <= cfg.outlierZ) continue;
    const prior = outliers.get(h.o.gradeId);
    if (!prior || Math.abs(z) > Math.abs(prior.z)) {
      outliers.set(h.o.gradeId, { key, gradeId: h.o.gradeId, materialId: h.o.m.id, material: h.o.m.name, kind: h.o.kind,
        measurementIds: h.o.items.map((x) => x.measurementId).filter(Boolean), z: Math.round(z * 10) / 10 });
    }
  }
  return { calLikely, calPlausible, bandScale, calibration, outliers: [...outliers.values()] };
}

/**
 * What each formulation's own measurements prove a headline is at least (lower-bounds.js), as a function of the
 * formulation key: the list a grade's range is floored by. Built once per headline from the snapshot's usable
 * measurements, so a twin that prints its sibling's table is floored by that table too.
 */
export function formulationFloors(def, S) {
  const byF = new Map();
  if (def?.lowerBounds) {
    for (const list of S.byMaterial.values()) for (const x of list) {
      const f = S.fkey(x.gradeId);
      if (!byF.has(f)) byF.set(f, []);
      byF.get(f).push(x);
    }
  }
  const floors = new Map([...byF].map(([f, own]) => [f, lowerBoundsOf(def, own)]));
  return (f) => floors.get(f) ?? [];
}

/**
 * The estimate of every active grade of every material in the pool, for one headline: attached to the grade as
 * `estimate[key]`. Grades that share a formulation share one posterior and say so.
 */
export function attachGradeEstimates({ key, def, model, S, obs, P, hp, tmMean, inv, rangeFor, ownerOfF, floorsOf, zPlausible, bandScale = 1, anchorOn = true, ownObs = obs, centres = null, withheld = [] }) {
  // The fit's conflict flags, for the bands it publishes: a flag says a value disagrees with its material, not with itself.
  const conflicted = new Set(obs.filter((o) => o.conflict).map((o) => `${o.m.id}|${o.f}|${o.kind}`));
  const byFormulation = new Map();
  for (const g of S.grades.values()) {
    if (g.retired || !S.inPool.has(g.materialId)) continue;
    const f = S.fkey(g.id);
    const k = `${g.materialId}|${f}`;
    if (!byFormulation.has(k)) byFormulation.set(k, []);
    byFormulation.get(k).push(g);
  }
  const cfg = model.properties[key];
  let attached = 0;
  for (const grades of byFormulation.values()) {
    const g0 = grades[0];
    const m = S.inPool.get(g0.materialId);
    const h = m.headline[key];
    if (!h || h.notApplicable) continue;
    const f = S.fkey(g0.id);
    const owner = ownerOfF.get(f) && ownerOfF.get(f) !== m.id ? S.inPool.get(ownerOfF.get(f)) : null;
    const subject = owner ?? m;
    const manufacturer = g0.manufacturer ?? null;
    const p = predict(P, hp, subject, f, manufacturer);
    p.mu += tmMean(subject);
    // The model's centre before any bound, for the unstated-direction back-test (directions.js), read rather than predicted twice.
    if (centres) centres.set(`${m.id}|${f}`, inv(p.mu));
    const own = obs.map((o, i) => ({ o, i })).filter(({ o }) => o.f === f && (o.m.id === m.id || o.m.id === subject.id));
    // A value of the headline's own kind that the owner's ruling of 2026-10-20 sets apart (D172: a bar no document describes
    // as printed) would be the estimate's own answer at its own value with almost no width (Bambu Lab PETG HF's 69 to 69 °C
    // was the same trap, D167): such a product shows its value, set apart, and is not estimated, as it was not while that
    // value decided.
    // A product with no comparable value of its own that still holds an observation of the headline's own kind holds it on a
    // bar set apart, replaced by a better document (D171) or only a ceiling (D166), which the estimate would only echo.
    const echoes = () => own.some(({ o }) => o.kind === HEAD[key]);
    // What its own values of the asked property, measured another way, allow (anchor.js, D167): the estimate is held
    // inside it, from both sides, where the model's centre lies inside; where it lies outside, the product's own sheet
    // and its kind's model disagree, and no estimate is shown. Where its own sheets disagree, nothing anchors it.
    const band = ownBand({ def, model, key, zPlausible, scale: bandScale, centreOf: (o) => o.y + tmMean(o.m),
      own: ownObs.filter((o) => o.f === f && (o.m.id === m.id || o.m.id === subject.id)).map((o) => ({ ...o, conflict: conflicted.has(`${o.m.id}|${o.f}|${o.kind}`) })) });
    // A floor its own values prove (a yield stress under the ultimate) above a band they allow is its own sheets
    // disagreeing too: Extrudr DURAPRO PA6 CF yields at 120 MPa on an undescribed bar and 60 MPa on a moulded one.
    const floorTop = Math.max(-Infinity, ...floorsOf(f).filter((b) => (!b.unit || b.unit === h.unit) && (cfg.scale !== 'log' || b.lo > 0)).map((b) => transform(key, model)(b.lo)));
    if (band && !band.disagree && band.bands.some((b) => b.hi < floorTop)) band.disagree = true;
    const anchor = anchorOn && band && !band.disagree ? band : null;
    if (anchor && (p.mu < anchor.lo || p.mu > anchor.hi)) {
      const note = { centre: sig3(inv(p.mu)), ownBand: publishBand(band, inv),
        why: `its own ${band.bands.flatMap((b) => b.measurementIds).join(', ')} put its printed value at ${sig3(inv(anchor.lo), -1)} to ${sig3(inv(anchor.hi), 1)} ${h.unit}, where its kind's model puts it at ${sig3(inv(p.mu))}` };
      for (const g of grades) {
        if (g.states?.find((s) => !s.treatment && s.moisture === 'dry')?.values?.[key]?.level === 'comparable' || echoes(g)) continue;
        g.estimateWithheld ??= {};
        g.estimateWithheld[key] = note;
        withheld.push({ key, gradeId: g.id, materialId: m.id, ...note });
      }
      continue;
    }
    // Every grade takes the bounds its own sheets publish, and the floors its own measurements prove: a yield or break
    // stress under its ultimate strength, a heat deflection at 1.8 MPa under the one at 0.45 MPa (bounds.js, D126).
    const { centre, range, wide } = rangeFor(m, subject, p, h.unit, { formulation: f, implied: floorsOf(f), anchor });
    const mine = obs.some((o) => o.m.id === m.id);
    const strength = own.length ? 'this-grade' : mine ? 'this-material' : 'family';
    const total = p.weights.reduce((a, v) => a + v, 0);
    const ownWeight = own.reduce((a, { i }) => a + p.weights[i], 0);
    const spread = cfg.scale === 'log' ? range[1] / range[0] : range[1] - range[0];
    const precision = spread <= cfg.precision.good ? 'good' : spread <= cfg.precision.fair ? 'fair' : 'poor';
    const estimate = {
      strength, precision, unit: h.unit,
      centre: sig3(centre), lo: sig3(range[0], -1), hi: sig3(range[1], 1),
      plausible: { lo: sig3(wide[0], -1), hi: sig3(wide[1], 1) },
      impliedBounds: floorsOf(f),
      // What its own values allow (D167), published whether or not it holds the range, so the engine tags no product
      // likely against its own sheet.
      ...(band ? { ownBand: publishBand(band, inv) } : {}),
      ownShare: total > 0 ? Math.round(Math.max(0, Math.min(1, ownWeight / total)) * 100) / 100 : 0,
      evidence: own.map(({ o }) => ({ kind: o.kind, measurementIds: o.items.map((x) => x.measurementId).filter(Boolean),
        converted: sig3(inv(o.y + tmMean(o.m))), conflict: !!o.conflict })),
      basis: strength === 'this-grade' ? "this grade's own measurements, with its material and the family model"
        : strength === 'this-material' ? `its material's other grades and the family model (${identityOf(m)})`
          : `the family model only (${identityOf(m)})`,
    };
    for (const g of grades) {
      // A product with a comparable value of its own shows that value; an estimate would only sit beside it (D83). The
      // value is the as-printed dry one: a product that publishes the headline only after annealing has an as-printed
      // part nobody measured, and is estimated as printed (D162), as product screening already reads it (D137).
      if (g.states?.find((s) => !s.treatment && s.moisture === 'dry')?.values?.[key]?.level === 'comparable' || echoes(g)) continue;
      g.estimate ??= {};
      g.estimate[key] = grades.length > 1 ? { ...estimate, sharedWith: grades.filter((x) => x !== g).map((x) => x.id) } : estimate;
      attached++;
    }
  }
  return attached;
}

/** The constants every grade estimate shares, said once (meta.estimateModel.gradeEstimates). */
export function gradeEstimateMeta(model) {
  return {
    version: 2,
    levels: model.levels,
    method: 'The Gaussian model of every observation, predicted at the grade\'s own row (its formulation and its maker as test house); likely and plausible ranges calibrated by hiding each grade\'s own published values and predicting them from the rest (DECISIONS D81).',
    decides: 'Never PASS. Independently certified product bounds may exclude in as-printed/dry contexts using the reserved complete-scenario budget; uncertified classes remain UNKNOWN (D137).',
  };
}
