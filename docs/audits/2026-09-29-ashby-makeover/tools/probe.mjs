#!/usr/bin/env node
// The review package's diagnostics (ASHBY-MAKEOVER-2026-09-28/probes/current-behavior.mjs), asked again of this
// checkout's code and compiled database, for the before/after record (README.md, "What moved"). The package ran them on
// the frozen release; recheck-509f6ef ran them on 03663e0b6e97, this branch's starting point. This reads the same
// questions through the decision workspace (D107) and prints one JSON object.
//
//   node docs/audits/2026-09-29-ashby-makeover/tools/probe.mjs > docs/audits/2026-09-29-ashby-makeover/evidence/after-probe.json

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const { runSelection } = await import(join(root, 'app/js/engine/constraints.js'));
const { productsByMaterial, productView, stateOf } = await import(join(root, 'app/js/engine/products.js'));
const { indexById, rankingFor } = await import(join(root, 'app/js/engine/indices.js'));
const { buildWorkspace, estimateContext, objectiveStages } = await import(join(root, 'app/js/engine/workspace.js'));
const { useRegistry } = await import(join(root, 'app/js/ui/registry.js'));
const { AXIS_DEFS, measurementMatches, pairCompatibility } = await import(join(root, 'app/js/ui/axes.js'));

const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const group = (rows, key) => { const m = new Map(); for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); } return m; };
const context = {
  db, productsByMaterial: productsByMaterial(db), measurementById: new Map(db.measurements.map((m) => [m.id, m])), gradeById: new Map(db.grades.map((g) => [g.id, g])),
  measurementsByMaterial: group(db.measurements, 'materialId'), evidenceByMaterial: group(db.evidence, 'materialId'),
  polymerEvidenceByMaterial: group(db.polymerEvidence ?? [], 'materialId'), coverageByMaterial: group(db.coverage, 'materialId'),
  unknownPolicy: 'strict', evidence: 'comparable', moisture: 'dry', anneal: false, annealMaxC: null, useEstimates: false, showEstimates: false,
};
const materials = db.materials.filter((m) => !m.familyEntry);
const byId = new Map(materials.map((m) => [m.id, m]));
const scope = { kind: 'gate', gate: 'scope' };
const gates = ['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate }));
const numeric = (property, operator, value) => ({ kind: 'numeric', property, operator, value, mandatory: true });
function ask(constraints, patch = {}) {
  const ctx = { ...context, ...patch };
  const selection = runSelection(materials, constraints, ctx);
  const all = selection.evaluations.map((e) => ({ material: byId.get(e.materialId), evaluation: e }));
  const rows = all.filter((r) => r.evaluation.eligible);
  return { ctx, selection, rows, all };
}
const beamIndex = indexById('beam-stiffness');
const ws = (q, over = {}) => buildWorkspace({ rows: q.rows, contextRows: q.all, ctx: q.ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beamIndex, ...over });

// The H2C beam: 3 GPa, 1250 kg/m³, scope and the print gates, dry, as printed.
const beamConstraints = [scope, ...gates, numeric('tensileModulusXY', '>=', 3), numeric('density', '<=', 1250)];
const beam = ask(beamConstraints);
const beamWs = ws(beam);
const M = beamWs.line.M;

// Conditioned: the decision set, and any mark whose coordinate is not its judged state's own (the review's 247).
const humid = ask(beamConstraints, { moisture: 'conditioned', unknownPolicy: 'exploration', useEstimates: true, showEstimates: true });
const humidWs = ws(humid);
const offState = [...humidWs.pairs, ...humidWs.contextPairs].filter((p) => p.plottable).filter((p) => {
  const g = context.gradeById.get(p.gradeId);
  const v = productView(byId.get(p.materialId), g, humid.ctx, stateOf(g, p.stateId)).headline.tensileModulusXY;
  return !v?.known || v.measurementId !== p.y.measurementId;
});

// Estimate context over scope only: ranges whose measured side collapsed a product spread to one value (the review's 13).
const overview = ask([scope], { unknownPolicy: 'exploration', useEstimates: true, showEstimates: true });
const est = estimateContext(overview.all, overview.ctx, { xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beamIndex, orientation: 'direct' });
const collapsed = est.ranges.filter((r) => [['x', 'density'], ['y', 'tensileModulusXY']].some(([a, key]) => {
  const s = byId.get(r.materialId).headline[key]?.spread;
  return r[a].measured && s && s.min !== s.max && r[a].lo === r[a].hi;
}));

// Strict evidence pairs with an explicit condition contradiction (the review's 27 of 352).
const xDef = AXIS_DEFS.find((a) => a.key === 'tensileModulusXY'), yDef = AXIS_DEFS.find((a) => a.key === 'tensileStrengthXY');
const flags = (key) => { const h = db.registry.headlines.find((x) => x.key === key); return { moisture: h.changesWithMoisture, annealing: h.changesWithAnnealing, specimen: !!h.direction }; };
const inv = { a: flags(xDef.key), b: flags(yDef.key) };
let strictPairs = 0, explicitConflicts = 0, wouldHaveMatched = 0;
for (const { material } of overview.rows) {
  const ms = context.measurementsByMaterial.get(material.id) ?? [];
  const xs = ms.map((m) => measurementMatches(m, xDef, 'strict')).filter(Boolean);
  const ys = ms.map((m) => measurementMatches(m, yDef, 'strict')).filter(Boolean);
  for (const a of xs) for (const b of ys) {
    if (a.measurement.gradeId !== b.measurement.gradeId) continue;
    const directionOnly = a.measurement.direction === 'not-applicable' || b.measurement.direction === 'not-applicable' || a.measurement.direction === b.measurement.direction;
    if (directionOnly) wouldHaveMatched++;
    const fit = pairCompatibility(a.measurement, b.measurement, 'strict', inv);
    if (fit.ok) {
      strictPairs++;
      const [x, y] = [a.measurement, b.measurement];
      const both = (k, vocab) => vocab.includes(x[k]) && vocab.includes(y[k]) && x[k] !== y[k];
      if (both('moistureState', ['dry', 'conditioned']) || both('postProcessingState', ['as-printed', 'annealed'])) explicitConflicts++;
    }
  }
}

// Scope only, conditioned: materials ranked, and ranks resting on a state their best product does not publish (78/77).
const humidScope = ask([scope], { moisture: 'conditioned' });
const humidRank = rankingFor(humidScope.rows, humidScope.ctx, beamIndex);
const lacking = humidRank.order.filter((r) => !context.gradeById.get(r.best.gradeId)?.states?.some((s) => s.id === r.best.stateId));

// The line at the fifth-ranked material's median: the ranking's count against the product states on or above it.
const lineRanked = beamWs.ranking.order.filter((r) => r.value >= M).length;

// Cost: the constrained beam ranked by material cost.
const cost = buildWorkspace({ rows: beam.rows, ctx: beam.ctx, xKey: 'materialCostPerVolume', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: indexById('beam-stiffness-cost') });

// Fiberon PET-GF15 in the warm fixture, oven unavailable and to 120 °C.
const warm = [scope, ...gates, numeric('tensileModulusXY', '>=', 4), numeric('hdt045', '>=', 80)];
const fiber = db.grades.find((g) => g.product === 'Fiberon PET-GF15');
const fiberCase = [false, true].map((oven) => {
  const q = ask(warm, { unknownPolicy: 'exploration', ...(oven ? { anneal: true, annealMaxC: 120 } : {}) });
  const w = buildWorkspace({ rows: q.rows, contextRows: q.all, ctx: q.ctx, xKey: 'density', yKey: 'hdt045', xLog: true, yLog: false });
  const p = [...w.pairs, ...w.contextPairs].find((x) => x.gradeId === fiber.id);
  return { oven, verdict: p?.verdict, state: p?.stateId, bucket: p?.bucket, drawn: p?.plottable ? { y: p.y.value, yMeasurement: p.y.measurementId } : null, why: p && !p.plottable ? p.y.missing ?? p.x.missing : null };
});

// An applied stage at the default line: what it keeps, and that the verdicts do not move.
const stage = objectiveStages(beam.all, beam.ctx, [{ index: 'beam-stiffness', cutoff: M }]);

console.log(JSON.stringify({
  release: db.meta.release?.id,
  beam: {
    materials: { pass: beam.selection.counts.pass, unknown: beam.selection.counts.unknown, fail: beam.selection.counts.fail },
    decision: beamWs.counts.decision, failedContextPairs: beamWs.counts.failed.pairs, unresolvedContextPairs: beamWs.counts.unresolved.pairs,
    notDrawable: beamWs.counts.gaps.products,
    line: { M, statesAtOrAbove: beamWs.line.above.pairs, materialsAtOrAbove: beamWs.line.above.materials, rankedMaterialsAtOrAbove: lineRanked },
    stageAtLine: { kept: stage.steps[0].products, materials: stage.steps[0].materials, verdictsUnchanged: ask(beamConstraints).selection.counts.pass === beam.selection.counts.pass },
  },
  conditionedBeam: { decisionPairs: humidWs.counts.decision.pairs, unresolvedDrawable: humidWs.counts.unresolved.pairs, unresolvedProducts: humidWs.counts.unresolved.products, marksNotAtTheirJudgedState: offState.length },
  estimates: { ranges: est.ranges.length, unavailable: est.unavailable.length, measuredSpreadCollapsed: collapsed.length },
  evidencePairs: { strictPairs, strictWithExplicitConflict: explicitConflicts, directionOnlyMatches: wouldHaveMatched },
  conditionedScopeRanking: { ranked: humidRank.order.length, rankedMaterials: humidRank.order.map((r) => r.materialId), restingOnAMissingState: lacking.length },
  cost: { ranked: cost.ranking.order.length, unranked: cost.ranking.unranked.length, drawable: cost.counts.decision.pairs, unpriced: cost.counts.gaps.unpriced },
  fiberon: fiberCase,
}, null, 2));
