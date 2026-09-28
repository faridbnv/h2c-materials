// One decision traced (F13; the version 2.1 plan, 3.3): a product's verdict under a saved scenario, the state it was
// judged in and every record it rests on, as one object a test or a tool reads without scraping the page. The answers
// are the acceptance portfolio's S04 (test/acceptance/portfolio.json), written from the source before the code: Spectrum
// PLA Matt publishes its heat deflection only after annealing at 90 °C for 4 h.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceDecision } from '../scripts/trace.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'h2c-trace-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));

const PRODUCT = 'G001-06';
const scenario = (extra = {}) => JSON.stringify({
  version: 1, unknownPolicy: 'strict',
  constraints: [{ kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 }, { kind: 'gate', gate: 'nozzle' }],
  ...extra,
});

test('permitted annealing, the product is judged in the annealed state its sheet publishes, and the trace cites the measurement, its conditions and its source', () => {
  const t = traceDecision(db, scenario({ anneal: true }), PRODUCT);
  assert.equal(t.release.id, db.meta.release.id);
  assert.deepEqual(t.scenario.states, { anneal: true, annealMaxC: null, moisture: 'dry' });
  assert.equal(t.product.verdict, 'PASS');
  assert.equal(t.states.chosen, 'annealed:90:4');
  assert.deepEqual(t.states.permitted.map((s) => [s.id, s.verdict]), [['as-printed', 'UNKNOWN'], ['annealed:90:4', 'PASS']]);

  const hdt = t.requirements.find((r) => r.key === 'hdt045');
  assert.equal(hdt.status, 'PASS');
  assert.deepEqual(hdt.records.map((r) => [r.id, r.role]), [['V002780', 'decides']]);
  const [m] = hdt.records;
  assert.equal(m.raw.value, '116 °C');
  assert.equal(m.raw.postProcessing, 'annealed (4h @ 90°C)');
  assert.deepEqual(m.typed.anneal, { tempC: 90, hours: 4 });
  assert.equal(m.typed.testTemperatureC, null, 'the 90 °C is the annealing, not a test temperature (S04)');
  assert.deepEqual(hdt.admittedUnstated, ['specimen', 'moisture']);
  assert.match(m.locator, /annealed \(4h @ 90°C\)/);
  assert.equal(m.source.sha256, db.sources.find((s) => s.id === m.source.id).sha256);
  assert.match(m.source.sha256, /^[0-9a-f]{64}$/);

  // The treatment the state needs is a requirement of its own, and names the value that put the product in that state.
  const treatment = t.requirements.find((r) => r.key === 'treatment');
  assert.equal(treatment.status, 'PASS');
  assert.deepEqual(treatment.treatment, { tempC: 90, hours: 4 });
  assert.deepEqual(treatment.records.map((r) => r.id), ['V002780']);
  // A print gate cites the profile its recipe is read from.
  const nozzle = t.requirements.find((r) => r.key === 'nozzle');
  assert.ok(nozzle.records.length && nozzle.records.every((r) => r.kind === 'profile' || r.kind === 'guide'), JSON.stringify(nozzle.records));

  assert.equal(t.material.verdict, 'PASS');
  assert.ok(t.material.counts.pass >= 1 && t.material.counts.products === t.material.counts.pass + t.material.counts.fail + t.material.counts.untested);
});

test('used as printed, the same product is unresolved, and the trace names the annealed value it may not use and the state ruled out', () => {
  const t = traceDecision(db, scenario(), PRODUCT, { requirement: 'hdt045' });
  assert.equal(t.product.verdict, 'UNKNOWN');
  assert.equal(t.states.chosen, 'as-printed');
  assert.deepEqual(t.states.notPermitted.map((s) => [s.id, s.why]), [['annealed:90:4', 'the scenario does not permit annealing']]);
  assert.deepEqual(t.requirements.map((r) => r.key), ['hdt045'], 'a trace of one requirement holds that one');
  const [r] = t.requirements;
  assert.match(r.reason, /90 °C.*4 h/);
  assert.deepEqual(r.records.map((x) => [x.id, x.role]), [['V002780', 'published in state annealed:90:4']]);
  assert.throws(() => traceDecision(db, scenario(), PRODUCT, { requirement: 'warp' }), /No requirement "warp"/);
  assert.throws(() => traceDecision(db, scenario(), 'G999-01'), /not a product/);
});

test('the command prints the same trace as one JSON object, its keys always in the same order', () => {
  const file = join(dir, 's04.json');
  writeFileSync(file, scenario({ anneal: true }));
  const r = spawnSync(process.execPath, ['scripts/trace.mjs', '--scenario', file, '--product', PRODUCT, '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const printed = JSON.parse(r.stdout);
  assert.equal(r.stdout.trim(), JSON.stringify(traceDecision(db, scenario({ anneal: true }), PRODUCT, { file, database: printed.database }), null, 2));
});
