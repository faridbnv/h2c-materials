// Template and export tests against the compiled database. A template is the first thing a new user
// clicks, so what it returns is part of what the tool asserts.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection } from '../app/js/engine/constraints.js';
import { validateScenario } from '../app/js/engine/scenario.js';
import { TEMPLATES } from '../app/js/ui/templates.js';
import { toCSV } from '../app/js/ui/table.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let db, ctx;

before(() => {
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
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

// Regression: the indoor template gated on chamber data, which PLA Basic does not publish, so the
// most ordinary cheap filament was missing from the cheap-and-easy template.
test('the indoor prototype template includes ordinary PLA', () => {
  const names = candidates(TEMPLATES.find((t) => t.name === 'Indoor prototype')).map((m) => m.name);
  assert.ok(names.includes('PLA Basic'), names.join(', '));
});

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
  assert.match(csv, /# missing data: left out \(Strict\)/);
  const failing = rows.find((r) => r.evaluation.verdict === 'FAIL');
  const line = csv.split('\n').find((l) => l.startsWith(failing.material.id + ','));
  assert.match(line, /Density at most 1 kg\/m³: Published/);
  assert.doesNotMatch(csv.split('\n').find((l) => l.startsWith('MaterialID')), /Estimated fields/);
});
