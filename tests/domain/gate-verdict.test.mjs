// WP-07 copies agree: the gate-verdict table (packages/domain/src/core/gate-verdict.ts) against every old copy of the
// verdict words (research gap-5 section 3 hazard 2), as lists and on every print gate of a real build.
// test/gate-verdicts.test.js pins four of the copies to each other; this pins all of them to the table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GATE_PRECEDENCE, GATE_TABLE, GATE_STATUS, gateStatus, gateRow, strongestVerdict } from '../../packages/domain/src/core/gate-verdict.ts';
import { GATE_PRECEDENCE as BUILD_PRECEDENCE, aggregateGate } from '../../build/src/gates.js';
import { GATE_STATUS as ENGINE_STATUS, STATUS, evaluateConstraint } from '../../app/js/engine/constraints.js';
import { GATE_VERDICT, OUTSIDE_WORDS, gateVerdict } from '../../app/js/ui/labels.js';
import { OUTSIDE } from '../../app/js/ui/print-spread.js';
import { printCounts, isProduct } from '../../app/js/ui/material-facts.js';
import { realDb, privateCopy, source, root, AXES } from './real.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sorted = (xs) => [...xs].sort();
const where = (col) => GATE_PRECEDENCE.filter((v) => GATE_TABLE[v][col]);
const NOBODY = 'a verdict nobody wrote';

/** Every gate verdict the real build holds: materials', products' and profiles', with where each came from. */
function realGates() {
  const db = realDb();
  const out = [];
  for (const m of db.materials) for (const a of AXES) if (m.gates?.[a]) out.push({ at: `${m.id} ${a}`, v: m.gates[a].verdict });
  for (const g of db.grades) for (const a of AXES) if (g.print?.[a]) out.push({ at: `${g.id} ${a}`, v: g.print[a].verdict });
  for (const p of db.profiles) for (const a of AXES) if (p.gates?.[a]) out.push({ at: `${p.id} ${a}`, v: p.gates[a].verdict });
  return out;
}

test('the real build uses every verdict, and only these', () => {
  const seen = new Set(realGates().map((g) => g.v));
  assert.deepEqual(sorted(seen), sorted(GATE_PRECEDENCE));
});

test('order: the build\'s precedence and the engine\'s GATE_STATUS key order (material-facts GATE_ORDER) are the table\'s', () => {
  assert.deepEqual([...GATE_PRECEDENCE], BUILD_PRECEDENCE);
  assert.deepEqual(Object.keys(GATE_TABLE), BUILD_PRECEDENCE);
  assert.deepEqual(Object.keys(ENGINE_STATUS), [...GATE_PRECEDENCE]);
  assert.match(source('app/js/ui/material-facts.js'), /^const GATE_ORDER = Object\.keys\(GATE_STATUS\);$/m);
});

test('status: the engine\'s GATE_STATUS, entry for entry, and the page chip\'s state', () => {
  assert.deepEqual(Object.entries(GATE_STATUS), Object.entries(ENGINE_STATUS));
  for (const [k, v] of Object.entries(STATUS)) assert.equal(v, k, 'STATUS strings are their keys, as the contract spells them');
  for (const v of [...GATE_PRECEDENCE, NOBODY]) assert.equal(gateVerdict(v).state, gateStatus(v), v);
  assert.deepEqual(sorted(Object.keys(GATE_VERDICT)), sorted(GATE_PRECEDENCE));
});

test('outside the H2C: print-spread OUTSIDE, labels OUTSIDE_WORDS, chamber-need ABOVE are the table\'s outside column', () => {
  const outside = sorted(where('outside'));
  assert.deepEqual(sorted(OUTSIDE), outside);
  assert.deepEqual(sorted(Object.keys(OUTSIDE_WORDS)), outside);
  const above = privateCopy('build/src/chamber-need.js', /^const ABOVE = (new Set\(\[[^\]]*\]\));$/m).value;
  assert.deepEqual(sorted(above), outside);
});

test('on the line: the engine marks edge alone (constraints.js:585), and the rail counts edge alone (filters.js)', () => {
  assert.deepEqual(where('onTheLine'), ['edge']);
  assert.match(source('app/js/engine/constraints.js'), /\.\.\.\(g\.verdict === 'edge' \? \{ onTheLine: true \} : \{\}\)/);
  assert.match(source('app/js/ui/filters.js'), /m\.gates\[gate\]\?\.verdict === 'edge'/);
});

test('the build\'s producers write only verdicts in the table; the validation report and the contract list exactly the six', () => {
  const produced = new Set();
  for (const file of ['build/src/normalize/process.js', 'build/src/gates.js']) for (const m of source(file).matchAll(/verdict: '([a-z-]+)'/g)) produced.add(m[1]);
  assert.ok(produced.size >= 5, [...produced].join());
  for (const v of produced) assert.ok(GATE_PRECEDENCE.includes(v), `${v} is produced and not in the table`);
  const report = privateCopy('build/src/validate.js', /^\s*const t = (\{ within: 0, [^}]*\});$/m).value;
  assert.deepEqual(sorted(Object.keys(report)), sorted(GATE_PRECEDENCE));
  const contract = JSON.parse(readFileSync(join(root, 'schema/db.schema.json'), 'utf8'));
  const enums = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.properties?.verdict?.enum?.includes('exceeds')) enums.push(node.properties.verdict.enum);
    for (const v of Object.values(node)) walk(v);
  };
  walk(contract);
  assert.ok(enums.length >= 3);
  for (const e of enums) assert.deepEqual(sorted(e), sorted(GATE_PRECEDENCE));
});

test('every real material gate: the engine\'s answer, and its on-the-line flag, are the table\'s', () => {
  let n = 0;
  for (const m of realDb().materials) {
    for (const a of AXES) {
      if (!m.gates?.[a]) continue;
      const r = evaluateConstraint(m, { kind: 'gate', gate: a });
      const row = gateRow(m.gates[a].verdict);
      assert.equal(r.status, row.status, `${m.id} ${a}`);
      assert.equal(r.onTheLine === true, row.onTheLine, `${m.id} ${a}`);
      n++;
    }
  }
  assert.ok(n > 300, `${n}`);
  for (const v of realGates().map((g) => g.v)) assert.equal(ENGINE_STATUS[v] ?? STATUS.UNKNOWN, gateStatus(v));
});

test('every real profile set: the verdict aggregateGate takes is strongestVerdict\'s', () => {
  const db = realDb();
  const byId = new Map(db.profiles.map((p) => [p.id, p]));
  const sets = [
    ...db.materials.map((m) => ({ at: m.id, ids: m.profileIds ?? [] })),
    ...db.grades.filter((g) => g.print?.profileIds).map((g) => ({ at: g.id, ids: g.print.profileIds })),
  ];
  let n = 0;
  for (const { at, ids } of sets) {
    const profiles = ids.map((id) => byId.get(id)).filter(Boolean);
    for (const a of AXES) {
      if (profiles.some((p) => !p.gates?.[a])) continue;
      assert.equal(strongestVerdict(profiles.map((p) => p.gates[a].verdict)), aggregateGate(profiles, a).verdict, `${at} ${a}`);
      n++;
    }
  }
  assert.ok(n > 1000, `${n}`);
  assert.equal(strongestVerdict([]), aggregateGate([], 'nozzle').verdict);
});

test('every real material\'s products: printCounts counts within, low end, over and unknown, and names the best, as the table does', () => {
  const db = realDb();
  const byMaterial = Map.groupBy(db.grades, (g) => g.materialId);
  let n = 0;
  for (const m of db.materials) {
    const counts = printCounts(byMaterial.get(m.id) ?? []);
    if (!counts) continue;
    const products = (byMaterial.get(m.id) ?? []).filter(isProduct);
    assert.equal(products.length, counts.products, m.id);
    for (const axis of counts.axes) {
      // The verdict printCounts reads for a product (material-facts.js:730): the gate where a profile or a source speaks.
      const vs = products.map((g) => (g.print?.profileIds.length || g.print?.from?.[axis.axis] ? g.print[axis.axis].verdict : 'unknown'));
      const count = (pick) => vs.filter((v) => pick(gateRow(v), v)).length;
      assert.equal(axis.within, count((r) => r.within), `${m.id} ${axis.axis} within`);
      assert.equal(axis.lowEnd, count((r) => r.lowEnd), `${m.id} ${axis.axis} lowEnd`);
      assert.equal(axis.over, count((r) => r.outside), `${m.id} ${axis.axis} over`);
      assert.equal(axis.unknown, count((r, v) => v === 'unknown'), `${m.id} ${axis.axis} unknown`);
      assert.equal(axis.best, strongestVerdict(vs), `${m.id} ${axis.axis} best`);
      n++;
    }
  }
  assert.ok(n > 300, `${n}`);
});

test('a word nobody wrote reads as unknown everywhere the table is asked', () => {
  assert.equal(gateStatus(NOBODY), 'UNKNOWN');
  assert.equal(ENGINE_STATUS[NOBODY] ?? STATUS.UNKNOWN, 'UNKNOWN');
  assert.equal(strongestVerdict([NOBODY]), 'unknown');
});
