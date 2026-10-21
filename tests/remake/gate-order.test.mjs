// Untested-rules question 1 (S11-07 and S06-06): the order of the six print-gate verdicts, stated as a LITERAL list.
// tests/domain/gate-verdict.test.mjs and test/gate-verdicts.test.js compare the copies of the order with each other, so a
// reordering of every copy together would fail neither. This list is written from the owner's page (docs/next/untested-rules.md
// question 1: "within, within at the low end, edge, exceeds a recommendation, exceeds, unknown") and is compared with each
// copy; the old files are read, never edited. When several profiles speak, the best-ranked verdict speaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { GATE_PRECEDENCE as OLD_BUILD_ORDER, aggregateGate as oldAggregate } from '../../build/src/gates.js';
import { GATE_PRECEDENCE as NEW_BUILD_ORDER, aggregateGate as newAggregate } from '../../packages/build/src/gates.ts';
import { GATE_STATUS as ENGINE_STATUS } from '../../app/js/engine/constraints.js';
import { GATE_VERDICT as PAGE_WORDS } from '../../app/js/ui/labels.js';
import { GATE_PRECEDENCE as DOMAIN_ORDER, GATE_TABLE, strongestVerdict } from '../../packages/domain/src/core/gate-verdict.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));

// Best first. Each entry: the identifier the code uses, and the words of the owner's page.
const SIX_VERDICTS = [
  ['within', 'within'],
  ['within-low-end', 'within at the low end'],
  ['edge', 'edge'],
  ['exceeds-recommended', 'exceeds a recommendation'],
  ['exceeds', 'exceeds'],
  ['unknown', 'unknown'],
];
const ORDER = SIX_VERDICTS.map(([id]) => id);

test('the literal list has six distinct verdicts, with the two ends the owner names', () => {
  assert.equal(new Set(ORDER).size, 6);
  assert.equal(ORDER[0], 'within');
  assert.equal(ORDER.at(-1), 'unknown');
  assert.deepEqual(SIX_VERDICTS.map(([, words]) => words), ['within', 'within at the low end', 'edge', 'exceeds a recommendation', 'exceeds', 'unknown']);
  assert.ok(!ORDER.includes('partial'), 'partial is retired (D151)');
});

const isTheOrder = (copy) => copy.length === ORDER.length && ORDER.every((id, i) => copy[i] === id);

test('every copy of the order, old and new, is the literal list', () => {
  const copies = {
    'build/src/gates.js GATE_PRECEDENCE': OLD_BUILD_ORDER,
    'packages/build/src/gates.ts GATE_PRECEDENCE': NEW_BUILD_ORDER,
    'packages/domain gate-verdict.ts GATE_PRECEDENCE': DOMAIN_ORDER,
    'the shared table\'s key order': Object.keys(GATE_TABLE),
    'app/js/engine/constraints.js GATE_STATUS key order, which the page ranks by': Object.keys(ENGINE_STATUS),
    'app/js/ui/labels.js GATE_VERDICT key order': Object.keys(PAGE_WORDS),
  };
  for (const [where, copy] of Object.entries(copies)) assert.ok(isTheOrder(copy), `${where} is ${copy.join(', ')}`);
  const facts = readFileSync(join(root, 'app/js/ui/material-facts.js'), 'utf8');
  assert.match(facts, /^const GATE_ORDER = Object\.keys\(GATE_STATUS\);$/m, 'the page ranks a material\'s products by the engine\'s key order');
});

test('the comparison can fail: every adjacent swap, and a dropped or added verdict, in a copy of the order is refused', () => {
  for (let i = 0; i + 1 < ORDER.length; i++) {
    const swapped = [...OLD_BUILD_ORDER];
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    assert.ok(!isTheOrder(swapped), `swap at ${i}`);
  }
  assert.ok(!isTheOrder(OLD_BUILD_ORDER.slice(1)) && !isTheOrder([...OLD_BUILD_ORDER, 'partial']));
});

/** A profile that holds one verdict on the nozzle gate, as the build's aggregateGate reads it. */
const profile = (verdict, i) => ({ id: `P${i}`, gradeId: `G${i}`, gates: { nozzle: { verdict, reason: verdict } } });
/** Every non-empty set of the six verdicts: 63 sets. */
const subsets = ORDER.map((_, i) => i).reduce((all, i) => [...all, ...all.map((s) => [...s, ORDER[i]])], [[]]).filter((s) => s.length);

test('with several profiles the best-ranked verdict speaks: old build, new build and the shared table agree, on all 63 sets, in any input order', () => {
  assert.equal(subsets.length, 63);
  for (const set of subsets) {
    const expected = ORDER.find((v) => set.includes(v));
    for (const input of [set, [...set].reverse()]) {
      const profiles = input.map(profile);
      assert.equal(oldAggregate(profiles, 'nozzle').verdict, expected, `old build ${input}`);
      assert.equal(newAggregate(profiles, 'nozzle').verdict, expected, `new build ${input}`);
      assert.equal(strongestVerdict(input), expected, `shared table ${input}`);
    }
  }
});

test('adjacent ranks, one at a time: each verdict beats every verdict below it and loses to every one above it', () => {
  for (let i = 0; i < ORDER.length; i++) for (let j = i + 1; j < ORDER.length; j++) {
    assert.equal(oldAggregate([profile(ORDER[j], 1), profile(ORDER[i], 2)], 'nozzle').verdict, ORDER[i], `${ORDER[i]} over ${ORDER[j]}`);
  }
});

test('silence never outranks a known exceedance, and no profile at all is unknown', () => {
  assert.equal(oldAggregate([profile('unknown', 1), profile('exceeds', 2)], 'nozzle').verdict, 'exceeds');
  assert.equal(oldAggregate([], 'nozzle').verdict, 'unknown');
  assert.equal(newAggregate([], 'nozzle').verdict, 'unknown');
  assert.equal(strongestVerdict([]), 'unknown');
  assert.equal(strongestVerdict(['a verdict nobody wrote']), 'unknown');
});
