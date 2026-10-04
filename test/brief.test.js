// The decision brief (D103): a chosen product, in its state, on its release, with what it passed and on which records,
// what is not settled, how to print and treat it, and the team's test, written from the engine's own answer.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { newScenario, serialize, deserialize, toHash, fromHash } from '../app/js/engine/scenario.js';
import { decisionBrief } from '../app/js/ui/brief.js';
import { useRegistry } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let db, base;
before(() => {
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  useRegistry(db.registry);
  const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
  base = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage), measurementsByMaterial: group(db.measurements), unknownPolicy: 'strict' };
});

const OUTDOOR = [
  { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 },
  { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 },
  { kind: 'gate', gate: 'chamber' },
];

function briefFor(gradeId, extra = {}) {
  const scenario = { ...newScenario(db.meta), constraints: OUTDOOR, ...extra };
  const grade = db.grades.find((g) => g.id === gradeId);
  const material = db.materials.find((m) => m.id === grade.materialId);
  const evaluation = runSelection([material], scenario.constraints, { ...base, anneal: scenario.anneal, moisture: scenario.moisture }).evaluations[0];
  const entry = evaluation.products.find((p) => p.gradeId === gradeId);
  const decision = { gradeId, stateId: entry.state.id, release: db.meta.release.id, chosenOn: '2026-09-28', note: 'Bracket trial', tests: [{ date: '2026-10-01', operator: 'JS', method: 'ISO 75', result: '104 °C' }] };
  return decisionBrief({ db, scenario, material, grade, evaluation, entry, decision });
}

test('a brief names the exact product, its release, its answer and the records it rests on', () => {
  const md = briefFor('G033-11');
  assert.match(md, /^# Decision brief: .*FIBERON ASA CF08 \(G033-11\)/);
  assert.match(md, new RegExp(`release ${db.meta.release.id}`));
  assert.match(md, /\*\*PASS\*\*, judged as printed, dry/);
  assert.match(md, /\| V006484 \|/, 'the measurement it passed on, with where it is printed');
  const sha = db.sources.find((s) => s.id === db.measurements.find((m) => m.id === 'V006484').sourceId).sha256;
  assert.ok(md.includes(sha), 'and the SHA-256 of the document it is printed in');
  assert.match(md, /Not stated by the values it passed on, and accepted for screening/, 'the conditions admitted unstated are said');
  assert.match(md, /## How to print and treat it[\s\S]*Nozzle: 260–280 °C/);
  assert.match(md, /## The confirmation test/);
  assert.match(md, /\| 2026-10-01 \| JS \|/, "the team's result is recorded with it");
  assert.match(md, /> Bracket trial/);
});

test("a brief for an annealed state names the annealing the answer needs, and one as printed says it is not settled", () => {
  const annealed = briefFor('G050-01', { anneal: true });
  assert.match(annealed, /judged annealed at 80 °C for 12 h/);
  assert.match(annealed, /needs annealing at 80 °C for 12 h, as its sheet states/i);
  const printed = briefFor('G050-01');
  assert.match(printed, /\*\*UNKNOWN\*\*, judged as printed/);
  assert.match(printed, /## What is not settled[\s\S]*Published only after annealing at 80 °C for 12 h/);
});

test('a chosen product travels in the saved file with its tests, and in a link without them', () => {
  const s = { ...newScenario(db.meta), decisions: [{ gradeId: 'G033-11', stateId: 'as-printed', release: 'abc123def456', chosenOn: '2026-09-28', note: 'n', tests: [{ result: 'ok', bogus: 'x' }] }, { gradeId: 'G999-01' }] };
  const gradeIds = new Set(db.grades.map((g) => g.id));
  const { scenario, warnings } = deserialize(serialize(s), db.meta, { gradeIds });
  assert.equal(scenario.decisions.length, 1, 'a product this database does not hold is dropped, with a warning');
  assert.ok(warnings.some((w) => /chosen product/.test(w)));
  assert.equal(scenario.decisions[0].tests[0].result, 'ok');
  assert.equal(scenario.decisions[0].tests[0].bogus, undefined, 'a test row holds its fields only');
  const back = fromHash(toHash(scenario), db.meta, { gradeIds }).scenario;
  assert.deepEqual(back.decisions.map((d) => [d.gradeId, d.stateId, d.release]), [['G033-11', 'as-printed', 'abc123def456']]);
  assert.deepEqual(back.decisions[0].tests, [], 'notes and tests travel in the file, not the link');
});
