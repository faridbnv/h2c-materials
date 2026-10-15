// A print gate's verdict is named in three places, each for its own job: the build ranks a material's profiles by it
// (build/src/gates.js GATE_PRECEDENCE), the engine says what it answers for a requirement (GATE_STATUS), and the page
// words it (ui/labels.js GATE_VERDICT). The compiled database's contract lists the verdicts a gate may hold. A verdict
// added to one and not the others reaches one screen and not the next; this keeps the four the same set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GATE_PRECEDENCE } from '../build/src/gates.js';
import { GATE_STATUS, STATUS } from '../app/js/engine/constraints.js';
import { GATE_VERDICT, gateVerdict } from '../app/js/ui/labels.js';

const sorted = (xs) => [...xs].sort();

test('the build, the engine, the page and the contract know the same gate verdicts', () => {
  assert.deepEqual(sorted(Object.keys(GATE_STATUS)), sorted(GATE_PRECEDENCE));
  assert.deepEqual(sorted(Object.keys(GATE_VERDICT)), sorted(GATE_PRECEDENCE));
  const contract = JSON.parse(readFileSync(new URL('../schema/db.schema.json', import.meta.url), 'utf8'));
  const enums = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.properties?.verdict?.enum?.includes('within')) enums.push(node.properties.verdict.enum);
    for (const v of Object.values(node)) walk(v);
  };
  walk(contract);
  assert.ok(enums.length >= 3, 'the contract declares the nozzle, bed and chamber verdicts');
  for (const e of enums) assert.deepEqual(sorted(e), sorted(GATE_PRECEDENCE));
});

test('a chip is coloured by the engine\'s own answer, and an unknown verdict reads as no data', () => {
  for (const v of GATE_PRECEDENCE) assert.equal(gateVerdict(v).state, GATE_STATUS[v]);
  assert.equal(GATE_STATUS.within, STATUS.PASS);
  assert.equal(GATE_STATUS.exceeds, STATUS.FAIL);
  assert.equal(GATE_STATUS['exceeds-recommended'], STATUS.INDETERMINATE, 'a recommendation never removes a candidate (D6)');
  assert.deepEqual(gateVerdict('a verdict nobody wrote'), gateVerdict('unknown'));
});
