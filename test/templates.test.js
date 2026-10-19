// Template and export tests against the compiled database. A template is the first thing a new user
// clicks, so what it returns is part of what the tool asserts.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection, explainExclusions } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { validateScenario } from '../app/js/engine/scenario.js';
import { TEMPLATES } from '../app/js/ui/templates.js';
import { toCSV } from '../app/js/ui/table.js';
import { useRegistry } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let db, ctx;

before(() => {
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  useRegistry(db.registry); // as app/js/main.js does on start-up
  const group = (rows) => {
    const m = new Map();
    for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); }
    return m;
  };
  ctx = { db, measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage), unknownPolicy: 'strict' };
});

const candidates = (t) => {
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  return runSelection(db.materials, t.constraints, ctx).candidates.map((e) => byId.get(e.materialId));
};

// Regression: "Support for ABS" came back as an indoor prototype material.
test('no template recommends a support or interface material', () => {
  for (const t of TEMPLATES) {
    const support = candidates(t).filter((m) => m.facets.supportMaterial.value);
    assert.deepEqual(support.map((m) => m.name), [], t.name);
  }
});

// Every template's answer, material by material and mode by mode, is build/snapshot/templates.csv, which verify
// compares on every change: that is where ordinary PLA's place in Indoor prototype is held (the regression that the
// template once gated on chamber data PLA Basic does not publish).

test('every template names what it does not check, and survives validation', () => {
  for (const t of TEMPLATES) {
    assert.ok(t.notChecked && t.notChecked.length > 20, t.name);
    assert.doesNotThrow(() => validateScenario({ version: 1, constraints: t.constraints }, db.meta), t.name);
  }
  // The "no heated chamber" promise was never tested: the chamber gate compares against the H2C's
  // own actively heated 65 °C.
  assert.ok(!TEMPLATES.some((t) => /no heated chamber/i.test(`${t.name} ${t.description}`)));
});

// Regression: the export listed only unresolved criteria, so a genuine failure had no reason.
test('the CSV says why each row failed and what was asked', () => {
  const scenario = { unknownPolicy: 'strict', template: null, assumptions: [], constraints: [{ kind: 'numeric', property: 'density', operator: '<=', value: 1, mandatory: true }] };
  const sel = runSelection(db.materials, scenario.constraints, ctx);
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  const rows = sel.evaluations.slice(0, 5).map((e) => ({ material: byId.get(e.materialId), evaluation: e }));
  const csv = toCSV(rows, db.meta, { scenario, useEstimates: false });
  assert.match(csv, /# required: Density at most 1 kg\/m³/);
  assert.match(csv, /# materials that could not be checked: leave out/);
  const failing = rows.find((r) => r.evaluation.verdict === 'FAIL');
  const line = csv.split('\n').find((l) => l.startsWith(failing.material.id + ','));
  assert.match(line, /Density at most 1 kg\/m³: Published/);
  const header = csv.split('\n').find((l) => l.startsWith('MaterialID'));
  assert.doesNotMatch(header, /Estimated fields/);
  // A property that does not apply hides a material whatever the estimates switch says, so its column is always there (D148).
  assert.match(header, /Hidden: does not apply/);
});

// D148 (the screening review, C07 and C20). Outdoor structural part, Include: the page hides the 14 materials HDT does not
// apply to (13 elastomers and OBC), with estimates on or off, and "Why the rest were excluded" counts those 14, each
// "Does not apply". It had counted 22 on HDT: 8 more fail another requirement, and the page lists them as failures.
// Fourteen until stage 3b of the screening build: OBC and the four TPU classes, which HDT does not apply to either, now fail
// the preset's 3 GPa stiffness on their kind's physics limit (CL01, D154), and a failure is not a hide.
test('Outdoor structural part hides the 9 materials HDT does not apply to and nothing fails, estimates on or off, and Why excluded counts 9', () => {
  const t = TEMPLATES.find((x) => x.name === 'Outdoor structural part');
  const hdt = t.constraints.find((c) => c.property === 'hdt045');
  const mats = db.materials.filter((m) => !m.familyEntry);
  for (const useEstimates of [true, false]) {
    const c = { ...ctx, productsByMaterial: productsByMaterial(db), unknownPolicy: 'exploration', useEstimates };
    const sel = runSelection(mats, t.constraints, c);
    const hidden = sel.evaluations.filter((e) => e.screened);
    assert.equal(hidden.length, 9, `estimates ${useEstimates ? 'on' : 'off'}`);
    for (const e of hidden) {
      assert.equal(e.verdict, 'UNKNOWN', 'hidden, never failed');
      assert.ok(e.unresolved.every((r) => r.notApplicable && r.constraint === hdt && /: Does not apply: /.test(r.reason)), e.materialId);
    }
    const why = explainExclusions(mats, t.constraints, c).find((r) => r.constraint === hdt);
    assert.equal(why.screened, 9);
    assert.equal(why.screenedNotApplicable, 9);
  }
});
