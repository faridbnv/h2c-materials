// WP-07 copies agree: packages/domain stateId and parseStateId against the build's and the engine's copies, on every
// decision state of a real build. Saved decisions are keyed by this text; no test compared the two copies before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stateId, parseStateId } from '../../packages/domain/src/core/state-id.ts';
import { stateId as buildStateId } from '../../build/src/products.js';
import { stateId as engineStateId, parseStateId as engineParseStateId } from '../../app/js/engine/products.js';
import { realDb } from './real.mjs';

const states = () => realDb().grades.flatMap((g) => (g.states ?? []).map((s) => ({ gradeId: g.id, ...s })));

test('every state of the real build: the build, the engine and the shared core write the same identifier, the one stored', () => {
  const all = states();
  assert.ok(all.length > 1000, `expected the products' states, found ${all.length}`);
  assert.ok(all.some((s) => s.treatment) && all.some((s) => s.moisture === 'conditioned'), 'the data holds annealed and conditioned states');
  for (const s of all) {
    const want = stateId(s.treatment, s.moisture);
    assert.equal(buildStateId(s.treatment, s.moisture), want, `${s.gradeId} build`);
    assert.equal(engineStateId(s.treatment, s.moisture), want, `${s.gradeId} engine`);
    assert.equal(s.id, want, `${s.gradeId}: stored ${s.id}`);
  }
});

test('every real schedule with every moisture word, and none: the three copies agree', () => {
  const schedules = [null, undefined, ...new Map(states().filter((s) => s.treatment).map((s) => [JSON.stringify(s.treatment), s.treatment])).values(),
    { tempC: null, hours: 4 }, { tempC: 80, hours: null }, {}];
  const moistures = ['dry', 'conditioned', 'not-stated', undefined, null, ''];
  for (const t of schedules) {
    for (const m of moistures) {
      const want = stateId(t, m);
      assert.equal(buildStateId(t, m), want);
      assert.equal(engineStateId(t, m), want);
    }
  }
});

test('parseStateId equals the engine\'s on every real identifier and on ones stateId cannot write, and reads back what it wrote', () => {
  const real = [...new Set(states().map((s) => s.id))];
  const odd = ['', 'as-printed+conditioned', 'annealed:x:x', 'annealed:1e2:0.5', 'annealed:120', 'annealed:a:16', 'annealed:120:16:2',
    'dry', 'conditioned+annealed:120:16', 'annealed:Infinity:1', null, undefined, 5, {}];
  for (const id of [...real, ...odd]) assert.deepEqual(parseStateId(id), engineParseStateId(id), String(id));
  for (const id of real) {
    const p = parseStateId(id);
    assert.ok(p, id);
    assert.equal(stateId(p.treatment, p.moisture), id);
  }
});
