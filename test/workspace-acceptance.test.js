// The Ashby decision workspace against the compiled database, on records re-read from their documents
// (test/acceptance/ashby-workspace.json; docs/audits/2026-09-29-ashby-makeover/ACCEPTANCE.md).
//
// The expectations were written from the cached documents, hash-checked, before this test; where a count is asserted it is
// re-derived here from the products' own states (grades[].states), not from the workspace, so the chart, the ranking
// and this test cannot agree with each other by sharing one mistake.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { indexById, rankingFor } from '../app/js/engine/indices.js';
import { buildWorkspace } from '../app/js/engine/workspace.js';
import { pairCompatibility } from '../app/js/ui/axes.js';
import { readCsv } from '../build/src/csv.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(readFileSync(join(root, 'test/acceptance/ashby-workspace.json'), 'utf8'));
const byId = (id) => spec.cases.find((c) => c.id === id);
let db, base, materials;

before(() => {
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
  base = {
    db, productsByMaterial: productsByMaterial(db), measurementById: new Map(db.measurements.map((m) => [m.id, m])), gradeById: new Map(db.grades.map((g) => [g.id, g])),
    measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), coverageByMaterial: group(db.coverage),
    useEstimates: false, evidence: 'comparable', unknownPolicy: 'strict', moisture: 'dry', anneal: false, annealMaxC: null,
  };
  materials = db.materials.filter((m) => !m.familyEntry);
});

function ask(c, over = {}) {
  const ctx = { ...base, ...c.policy, ...over };
  const selection = runSelection(materials, c.constraints, ctx);
  const byMaterial = new Map(materials.map((m) => [m.id, m]));
  const rows = selection.evaluations.filter((e) => e.eligible).map((e) => ({ material: byMaterial.get(e.materialId), evaluation: e }));
  return { ctx, selection, rows };
}

test('the documents these expectations were read from are the ones sources.csv still records', () => {
  const sources = new Map(readCsv(join(root, 'data/tables/sources.csv')).records.map((r) => [r.values.SourceID, r.values]));
  for (const s of spec.sources) {
    assert.equal(sources.get(s.sourceId)?.SHA256, s.sha256, `${s.sourceId}: the recorded document changed; re-read it before trusting these expectations`);
  }
});

test('T04: Fiberon PET-GF15 is unresolved without an oven, passes annealed, and is drawn at its annealed heat deflection', () => {
  const c = byId('T04');
  const dry = ask(c).selection.evaluations.flatMap((e) => e.products ?? []).find((p) => p.gradeId === c.product);
  assert.equal(dry.verdict, c.expect.noOven.verdict, c.expect.noOven.because);
  const o = c.expect.oven;
  const oven = ask(c, { anneal: true, annealMaxC: o.annealMaxC });
  const entry = oven.selection.evaluations.flatMap((e) => e.products ?? []).find((p) => p.gradeId === c.product);
  assert.deepEqual([entry.verdict, entry.state.id], [o.verdict, o.state]);
  const ws = buildWorkspace({ rows: oven.rows, ctx: oven.ctx, xKey: c.axes.x, yKey: c.axes.y, xLog: true, yLog: false });
  const p = ws.decision.find((q) => q.gradeId === c.product);
  assert.ok(p, 'drawn among the decision set');
  assert.deepEqual([p.y.value, p.y.measurementId, p.y.sourceStateId], [o.y.value, o.y.measurement, o.y.fromState]);
  assert.deepEqual([p.x.value, p.x.measurementId, p.x.sourceStateId, p.x.stateInvariantByRegistry], [o.x.value, o.x.measurement, o.x.fromState, o.x.invariant]);
  assert.notEqual(p.y.measurementId, o.never.measurement, o.never.because);
  // The records carry what the sheet prints.
  const m = (id) => db.measurements.find((x) => x.id === id);
  assert.deepEqual([m('V001933').value, m('V001933').postProcessingState, m('V001933').anneal], [133.7, 'annealed', { tempC: 120, hours: 16 }]);
  assert.deepEqual([m('V001931').value, m('V001931').postProcessingState], [81.6, 'as-printed']);
});

test('T05: a dry modulus and a conditioned strength of one sheet are never a strict pair; the dried table\'s own pair is', () => {
  const c = byId('T05');
  const flags = (key) => { const h = db.registry.headlines.find((x) => x.key === key); return { moisture: h.changesWithMoisture, annealing: h.changesWithAnnealing, specimen: !!h.direction }; };
  const inv = { a: flags('tensileModulusXY'), b: flags('tensileStrengthXY') };
  for (const pair of c.pairs) {
    const a = db.measurements.find((x) => x.id === pair.x), b = db.measurements.find((x) => x.id === pair.y);
    assert.equal(a.gradeId, c.product);
    const fit = pairCompatibility(a, b, 'strict', inv);
    assert.equal(fit.ok, pair.strict, `${pair.x} with ${pair.y}: ${pair.because}; conflicts ${JSON.stringify(fit.conflicts)}`);
    if (pair.conflict) assert.ok(fit.conflicts.includes(pair.conflict), JSON.stringify(fit.conflicts));
    // Mixed exploration still shows it, naming the conflict.
    assert.equal(pairCompatibility(a, b, 'broad', inv).ok, true);
  }
});

test('A01: a conditioned question ranks only products that publish a conditioned value, re-derived from their own states', () => {
  const c = byId('A01');
  const { ctx, rows } = ask(c);
  const ranking = rankingFor(rows, ctx, indexById(c.rankBy));
  assert.deepEqual(ranking.order.map((r) => r.materialId), c.expect.ranked, c.expect.because);
  // Independently: which passing products state a conditioned modulus, with a density from any state the registry lets
  // stand in (density does not change with moisture).
  const onScreen = new Set(rows.map((r) => r.material.id));
  const derived = db.grades.filter((g) => !g.retired && onScreen.has(g.materialId)).filter((g) => {
    const cond = (g.states ?? []).find((s) => s.id === 'conditioned');
    const E = cond?.values?.tensileModulusXY, rho = g.states?.[0]?.values?.density;
    return E?.level === 'comparable' && rho?.level === 'comparable';
  }).map((g) => g.materialId);
  assert.deepEqual([...new Set(derived)].sort(), [...c.expect.ranked].sort());
  // No ranked product rests on a state it does not publish.
  for (const r of ranking.order) {
    const g = db.grades.find((x) => x.id === r.best.gradeId);
    assert.ok(g.states.some((s) => s.id === r.best.stateId), `${r.materialId} ranks on ${r.best.stateId}, which ${g.id} publishes`);
  }
});

test('T09: the H2C beam matches its reviewed acceptance set and draws exactly the passing products whose judged state publishes both values', () => {
  const c = byId('T09');
  const { ctx, rows, selection } = ask(c);
  assert.equal(selection.counts.pass, c.expect.passMaterials, c.expect.because);
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: indexById(c.rankBy) });
  // Re-derived from the products' states: a value in the judged state where the registry says the state changes it, else
  // the first state's; comparable only (the question's evidence level).
  const flags = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h]));
  const valueOf = (g, stateId, key) => {
    const first = g.states[0];
    const state = g.states.find((s) => s.id === stateId);
    if (!state) return flags[key].changesWithMoisture || flags[key].changesWithAnnealing ? (stateId === first.id ? first.values[key] : undefined) : first.values[key];
    const changes = (state.treatment && flags[key].changesWithAnnealing) || (state.moisture === 'conditioned' && flags[key].changesWithMoisture);
    return state.id === first.id ? first.values[key] : changes ? state.values[key] : first.values[key];
  };
  const expected = [];
  for (const r of rows) {
    for (const p of r.evaluation.products.filter((x) => x.verdict === 'PASS')) {
      const g = db.grades.find((x) => x.id === p.gradeId);
      const rho = valueOf(g, p.state.id, 'density'), E = valueOf(g, p.state.id, 'tensileModulusXY');
      if (rho?.level === 'comparable' && E?.level === 'comparable') expected.push([`${r.material.id}|${g.id}|${p.state.id}`, rho.value, E.value]);
    }
  }
  expected.sort((a, b) => a[0].localeCompare(b[0]));
  const drawn = ws.decision.map((p) => [p.key, p.x.value, p.y.value]).sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(drawn, expected);
  assert.equal(ws.counts.decision.materials, new Set(expected.map((e) => e[0].split('|')[0])).size);
  // The line's count is of product states and their materials, from the same pairs: every counted pair is at or above M.
  const M = ws.line.M;
  const above = expected.filter(([, rho, E]) => Math.sqrt(E) / rho >= M);
  assert.deepEqual([ws.line.above.pairs, ws.line.above.materials], [above.length, new Set(above.map((e) => e[0].split('|')[0])).size]);
});
