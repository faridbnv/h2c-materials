// WP-07: every word list the contracts derive their unions from (packages/domain/src/core/vocab.ts) equals the old code
// it is copied from, in order; the ID guards' patterns equal the schema's; and the real build uses no other word.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  STATUSES, GROUP_ORDER as GROUPS, UNKNOWN_POLICIES, EVIDENCE_LEVELS, SCENARIO_KINDS, CONSTRAINT_KINDS, OPERATORS, LENSES,
  COLUMN_SETS, PLOT_VIEWS, ENGINE_MISSING, PRODUCT_SHARES,
} from '../../packages/domain/src/core/vocab.ts';
import { ID_PATTERNS } from '../../packages/domain/src/core/ids.ts';
import { STATUS, GROUP_ORDER, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { EVIDENCE, SHARE } from '../../app/js/engine/products.js';
import { WORKSPACE_VIEWS } from '../../app/js/engine/scenario.js';
import { MISSING } from '../../build/src/normalize/values.js';
import { realDb, privateCopy, source, root } from './real.mjs';

const setLiteral = (name) => privateCopy('app/js/engine/scenario.js', new RegExp(`^const ${name} = (new Set\\(\\[[^\\]]*\\]\\));$`, 'm')).value;
const sorted = (xs) => [...xs].sort();

test('the engine\'s exported word lists, in order', () => {
  assert.deepEqual([...STATUSES], Object.values(STATUS));
  assert.deepEqual([...GROUPS], GROUP_ORDER);
  assert.deepEqual([...UNKNOWN_POLICIES], Object.values(UNKNOWN_POLICY));
  assert.deepEqual([...EVIDENCE_LEVELS], Object.values(EVIDENCE));
  assert.deepEqual([...PLOT_VIEWS], WORKSPACE_VIEWS);
  assert.deepEqual([...PRODUCT_SHARES], Object.values(SHARE));
});

test('the scenario validator\'s private lists (scenario.js KINDS, OPERATORS, LENSES, COLUMN_SETS), in order', () => {
  assert.deepEqual([...SCENARIO_KINDS], [...setLiteral('KINDS')]);
  assert.deepEqual([...OPERATORS], [...setLiteral('OPERATORS')]);
  assert.deepEqual([...LENSES], [...setLiteral('LENSES')]);
  assert.deepEqual([...COLUMN_SETS], [...setLiteral('COLUMN_SETS')]);
});

test('the engine evaluates exactly the constraint kinds, and compares with exactly the operators', () => {
  const constraints = source('app/js/engine/constraints.js');
  const evaluated = [...constraints.matchAll(/^\s*case '([a-z]+)': return \{ \.\.\.evaluate[A-Z]\w*\(/gm)].map((m) => m[1]);
  assert.deepEqual(evaluated, [...CONSTRAINT_KINDS]);
  const compared = [...constraints.matchAll(/^\s*case '([<>]=?)': \{$/gm)].map((m) => m[1]);
  assert.deepEqual(sorted(compared), sorted(OPERATORS));
});

test('the engine\'s missing words: every one the code writes, and every one the real build holds, is listed', () => {
  const written = new Set();
  assert.deepEqual(ENGINE_MISSING.slice(0, Object.keys(MISSING).length), Object.values(MISSING));
  for (const file of ['app/js/engine/constraints.js', 'app/js/engine/products.js', 'app/js/engine/workspace.js', 'build/src/compile.js', 'build/src/products.js']) {
    for (const m of source(file).matchAll(/missing(?::| \?\?) '([a-z-]+)'/g)) written.add(m[1]);
  }
  const held = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.missing === 'string') held.add(v.missing);
    for (const x of Object.values(v)) walk(x);
  };
  walk(realDb().materials);
  walk(realDb().grades);
  assert.ok(written.size >= 5 && held.size >= 2, `${[...written]} / ${[...held]}`);
  for (const w of [...written, ...held]) assert.ok(ENGINE_MISSING.includes(w), `${w} is not in ENGINE_MISSING`);
});

test('the ID guards use the schema\'s own patterns', () => {
  const column = (table, name) => JSON.parse(readFileSync(join(root, `schema/tables/${table}.schema.json`), 'utf8'))
    .fields.find((f) => f.name === name);
  const pattern = (table, name) => {
    const f = column(table, name);
    return f?.constraints?.pattern ?? f?.pattern;
  };
  const want = {
    MaterialID: pattern('materials', 'MaterialID'), GradeID: pattern('grades', 'GradeID'),
    MeasurementID: pattern('measurements', 'MeasurementID'), ProfileID: pattern('profiles', 'ProfileID'),
    SourceID: pattern('sources', 'SourceID'),
  };
  for (const [k, re] of Object.entries(ID_PATTERNS)) assert.equal(re.source, want[k], k);
  const db = realDb();
  for (const m of db.materials) assert.ok(ID_PATTERNS.MaterialID.test(m.id), m.id);
  for (const g of db.grades) assert.ok(ID_PATTERNS.GradeID.test(g.id), g.id);
  for (const m of db.measurements) assert.ok(ID_PATTERNS.MeasurementID.test(m.id), m.id);
  for (const p of db.profiles) assert.ok(ID_PATTERNS.ProfileID.test(p.id), p.id);
  for (const s of db.sources) assert.ok(ID_PATTERNS.SourceID.test(s.id), s.id);
});
