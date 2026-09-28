// The version 2.1 acceptance portfolio (test/acceptance/portfolio.json; docs/audits/2026-09-27-v2.1-review/ACCEPTANCE.md).
//
// Every other test of the selection either builds a small material by hand or compares the page with the engine that
// drew it. This one asks the compiled database twelve practical questions whose answers were written from the source
// records before the code that meets them, so a rule the engine and the page share cannot agree with itself here. An
// expectation still marked todo names the work package that has not yet met it; node:test reports it without failing.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { templateByName } from '../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const portfolio = JSON.parse(readFileSync(join(root, 'test/acceptance/portfolio.json'), 'utf8'));
let db, base;

before(() => {
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  const group = (rows) => {
    const m = new Map();
    for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); }
    return m;
  };
  base = {
    db, productsByMaterial: productsByMaterial(db),
    measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence),
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), coverageByMaterial: group(db.coverage),
  };
});

// A question's context: the policy of the case, then of the expectation. Estimates stay off: none may confirm anything.
const contextFor = (c, e) => ({ ...base, useEstimates: false, evidence: 'comparable', unknownPolicy: 'strict', ...c.policy, ...e.policy });
const constraintsFor = (c, e) => e.constraints ?? c.constraints ?? templateByName(c.template)?.constraints ?? [];

function evaluate(c, e, materialId) {
  const material = db.materials.find((m) => m.id === materialId);
  assert.ok(material, `${materialId} is a material`);
  return runSelection([material], constraintsFor(c, e), contextFor(c, e)).evaluations[0];
}

function productResult(c, e) {
  const grade = db.grades.find((g) => g.id === e.product);
  assert.ok(grade && !grade.retired, `${e.product} is an active product`);
  const evaluation = evaluate(c, e, grade.materialId);
  const p = evaluation.products?.find((x) => x.gradeId === e.product);
  assert.ok(p, `${e.product} is judged among ${grade.materialId}'s products`);
  return { p, evaluation };
}

const reasons = (p) => (p.results ?? []).map((r) => r.reason ?? '');

function checkProduct(c, e) {
  const { p } = productResult(c, e);
  if (e.verdict) assert.equal(p.verdict, e.verdict, `${e.product}: ${e.because}`);
  if (e.failedBy) assert.ok((p.failedBy ?? []).some((x) => x.includes(e.failedBy)), `${e.product} fails on ${e.failedBy}; it failed on ${JSON.stringify(p.failedBy)}`);
  if (e.state) assert.equal(p.state?.id, e.state, `${e.product} decides in state ${e.state}`);
  if (e.treatment) assert.deepEqual({ tempC: p.state?.treatment?.tempC, hours: p.state?.treatment?.hours }, e.treatment, `${e.product} names the treatment it needs`);
  if (e.reasonMatches) assert.ok(reasons(p).some((r) => new RegExp(e.reasonMatches).test(r)), `a reason of ${e.product} matches /${e.reasonMatches}/: ${JSON.stringify(reasons(p))}`);
  if (e.admits) for (const a of e.admits) assert.ok((p.admitted ?? []).includes(a), `${e.product} says the policy admitted an unstated ${a}: ${JSON.stringify(p.admitted)}`);
  if (e.notUnresolvedBy) {
    assert.ok(p.results, `${e.product} carries its own results`);
    const by = new RegExp(e.notUnresolvedBy, 'i');
    // A tracked requirement is reported and holds nothing; only a mandatory one can hold a product.
    const held = (p.results ?? []).filter((r) => r.constraint?.mandatory !== false && (r.status === 'UNKNOWN' || r.status === 'INDETERMINATE')
      && (by.test(r.criterion ?? '') || by.test(r.constraint?.property ?? '') || by.test(r.constraint?.gate ?? '')));
    assert.deepEqual(held, [], `${e.product} is not held by ${e.notUnresolvedBy}`);
  }
}

/** The measurements, records and offers a passing product's answer cites. */
function cited(p) {
  const out = new Set();
  for (const r of p.results ?? []) {
    for (const id of [r.measurementId, ...(r.evidenceIds ?? []), ...(r.priceIds ?? []), ...(r.profileIds ?? [])]) if (id) out.add(id);
  }
  return out;
}

function checkMaterial(c, e) {
  const ev = evaluate(c, e, e.material);
  if (e.verdict) assert.equal(ev.verdict, e.verdict, `${e.material}: ${e.because}`);
  if (e.eligible !== undefined) assert.equal(ev.eligible, e.eligible);
  const n = e.counts ?? {};
  if (n.pass !== undefined) assert.equal(ev.counts.pass, n.pass);
  if (n.failAtLeast !== undefined) assert.ok(ev.counts.fail >= n.failAtLeast, `at least ${n.failAtLeast} failing product(s): ${JSON.stringify(ev.counts)}`);
  if (n.untestedAtLeast !== undefined) assert.ok(ev.counts.untested >= n.untestedAtLeast, `at least ${n.untestedAtLeast} untested product(s): ${JSON.stringify(ev.counts)}`);
}

function checkTemplate(e) {
  const t = templateByName(e.template);
  assert.ok(t, `a template named ${e.template}`);
  for (const gate of e.includesGates ?? []) assert.ok(t.constraints.some((x) => x.kind === 'gate' && x.gate === gate), `${e.template} asks the ${gate} gate`);
  if (e.priceMandatory !== undefined) {
    const price = t.constraints.find((x) => x.property === 'priceCADkg');
    assert.equal(!!price && price.mandatory !== false, e.priceMandatory, `${e.template}'s price is ${e.priceMandatory ? '' : 'not '}a requirement`);
  }
}

function checkMeasurement(e) {
  const m = db.measurements.find((x) => x.id === e.measurement);
  assert.ok(m, `${e.measurement} is in the database`);
  if ('testTemperatureC' in e) assert.equal(m.testTemperatureC ?? null, e.testTemperatureC, e.because);
}

async function checkRanking(c) {
  const { rankingFor } = await import('../app/js/engine/indices.js');
  const { indexById } = await import('../app/js/engine/indices.js');
  const { guideRanking } = await import('../app/js/ui/ashby.js');
  const { sortRows } = await import('../app/js/ui/table.js');
  const ctx = contextFor(c, {});
  const materials = db.materials.filter((m) => !m.familyEntry);
  const selection = runSelection(materials, constraintsFor(c, {}), ctx);
  const byId = new Map(materials.map((m) => [m.id, m]));
  const rows = selection.candidates.map((e) => ({ material: byId.get(e.materialId), evaluation: e }));
  const state = { scenario: { rankBy: c.rankBy }, ctx, columnSet: 'properties', sort: { key: 'name', dir: 'asc' } };
  const ranking = rankingFor(rows, ctx, indexById(c.rankBy));
  const table = sortRows(rows, state).map((r) => r.material.id).filter((id) => ranking.byMaterial.has(id));
  const guide = guideRanking(rows, state, indexById(c.rankBy)).map((r) => r.materialId);
  assert.ok(table.length > 2, 'the question ranks several materials');
  assert.deepEqual(guide, table, 'the chart guide ranks as the table does');
  assert.deepEqual(ranking.order.map((r) => r.materialId), table, 'the export ranks as the table does');
}

async function checkRelease(e) {
  const { validateScenario, newScenario, toHash, fromHash } = await import('../app/js/engine/scenario.js');
  const now = { snapshot: '2026-09-21', build: '2026-09-28', release: { id: 'r-now' } };
  const saved = (release) => ({ ...newScenario({ ...now, release }), constraints: [] });
  if (e.release === 'different-same-date') {
    const { warnings } = validateScenario(saved({ id: 'r-before' }), now);
    assert.ok(warnings.some((w) => /r-before/.test(w) && /r-now/.test(w)), `a warning names both releases: ${JSON.stringify(warnings)}`);
  } else if (e.release === 'same') {
    assert.deepEqual(validateScenario(saved({ id: 'r-now' }), now).warnings, []);
  } else if (e.release === 'legacy') {
    const { release: _gone, ...legacy } = saved(null);
    const { warnings } = validateScenario(legacy, now);
    assert.ok(warnings.some((w) => /release/i.test(w)), `a legacy scenario says its identity cannot be checked: ${JSON.stringify(warnings)}`);
  } else if (e.release === 'link') {
    const back = fromHash(toHash(saved({ id: 'r-before' })), now);
    assert.ok(back.warnings.some((w) => /r-before/.test(w)), 'the link carried its release');
  }
}

test('every record the portfolio names is in the database', () => {
  const known = new Set([...db.measurements, ...db.evidence, ...db.profiles, ...db.prices].map((x) => x.id));
  const missing = portfolio.cases.flatMap((c) => c.expect.flatMap((e) => e.records ?? [])).filter((id) => !known.has(id));
  assert.deepEqual(missing, []);
});

for (const c of portfolio.cases) {
  c.expect.forEach((e, i) => {
    const name = `${c.id}.${i + 1} ${e.product ?? e.material ?? e.template ?? e.measurement ?? e.ranking ?? e.release}: ${e.because}`;
    const opts = e.todo ? { todo: `waits on ${e.todo}` } : {};
    if (e.product) {
      test(name, opts, () => checkProduct(c, e));
      if (e.records?.some((id) => /^[VQ]\d|^CA\d/.test(id)) && e.verdict === 'PASS') {
        test(`${c.id}.${i + 1} ${e.product} cites the records its answer rests on`, opts, () => {
          const { p } = productResult(c, e);
          const cites = cited(p);
          for (const id of e.records.filter((x) => /^[VQ]\d|^CA\d/.test(x))) assert.ok(cites.has(id), `${e.product} cites ${id}: ${[...cites].join(', ')}`);
        });
      }
    } else if (e.material) test(name, opts, () => checkMaterial(c, e));
    else if (e.template) test(name, opts, () => checkTemplate(e));
    else if (e.measurement) test(name, opts, () => checkMeasurement(e));
    else if (e.ranking) test(name, opts, () => checkRanking(c));
    else if (e.release) test(name, opts, () => checkRelease(e));
  });
}
