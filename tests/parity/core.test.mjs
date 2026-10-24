// Core sufficiency (WP-25; pack 07 section 5.4): the engine on the PUBLISHED core alone must say what the engine says on the whole
// compiled database. This is the check that would have caught the Flexible component counting 10 -> 11 "not enough data" when a
// trimmed core lost a field the engine reads. The adapter (packages/parity/src/core-hook.ts) cuts the database with the same
// declarations the page and the writer use (CORE_FIELDS, ESTIMATE_FIELDS), so what is proved here is what the site ships.
// The whole corpus and 5,000 replays are `npm run parity -- --surface core --milestone`; this file keeps the template cases, which
// carry every mode, and the faults: a field dropped from the core is caught, and the development guard names it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { CORE_FIELDS, ESTIMATE_FIELDS } from '../../packages/domain/src/core/core-fields.ts';
import { runParity } from '../../packages/parity/src/compare.ts';
import { coreSufficiencyHook, registerCoreSufficiency, runCoreSufficiency } from '../../packages/parity/src/core-sufficiency.ts';
import { createCoreAdapter, installCoreHook, usesEstimates } from '../../packages/parity/src/core-hook.ts';
import { historicLinks } from '../../packages/parity/src/historic-links.ts';
import { linkUnits, runLinks } from '../../packages/parity/src/links.ts';
import { createOld, readDb } from '../../packages/parity/src/old-adapter.ts';
import { CLI_SMALL, cli, corpus, root, sharedOld, small } from './helpers.mjs';

// One case per mode of three templates, so that strict, explore and explore with estimates are all in it.
const templates = corpus.cases.filter((c) => c.group === 'template');
const modes = templates.filter((c) => /outdoor-structural-part|flexible-component|hot-environment/.test(c.id));

/** The declaration without one field: a path of keys into it, the last of which is removed. */
function without(spec, path) {
  const copy = structuredClone(spec);
  let node = copy;
  for (const key of path.slice(0, -1)) node = node[key];
  assert.ok(path.at(-1) in node, `${path.join('.')} must be in the declaration for the test to mean anything`);
  delete node[path.at(-1)];
  return copy;
}

test('no hook registered: not computable, with the reason, never zero', async () => {
  assert.equal(coreSufficiencyHook(), null);
  const r = await runCoreSufficiency({ cases: small, full: await sharedOld(), db: readDb() });
  assert.equal(r.kind, 'surface');
  assert.equal(r.report.status, 'not-computable');
  assert.equal(r.report.unitsCompared, 0);
  assert.match(r.report.notComputable[0].reason, /WP-25/);
});

test('which questions use the estimates part: exploration with the switch not off, as the engine\'s own context decides', () => {
  const asks = (unknownPolicy, useEstimates) => usesEstimates({ scenario: { unknownPolicy, useEstimates } });
  assert.equal(asks('strict', true), false);
  assert.equal(asks('exploration', true), true);
  assert.equal(asks('exploration', false), false);
  assert.equal(modes.some((c) => usesEstimates(c)) && modes.some((c) => !usesEstimates(c)), true, 'the cases under test cover both');
});

test('core sufficiency is zero: the engine on the core (and the estimates, where the question uses them) says what it says on the whole database', async () => {
  installCoreHook();
  installCoreHook(); // asking twice is not a second registration
  assert.ok(coreSufficiencyHook());
  assert.throws(() => registerCoreSufficiency({ coreAdapter: () => { throw new Error('x'); } }), /already registered/);
  const r = await runCoreSufficiency({ cases: modes, full: await sharedOld(), db: readDb() });
  assert.equal(r.kind, 'parity');
  assert.equal(r.report.status, 'zero', r.report.differences?.slice(0, 5).map((d) => `${d.case} ${d.record} ${d.tier}.${d.field}`).join('\n'));
  assert.equal(r.report.casesCompared, modes.length);
  assert.equal(r.report.casesNotComputable, 0);
  assert.equal(r.report.after, 'new (core only)');
});

test('CLI: --surface core computes (exit 0, zero); it is not part of a default run', () => {
  const r = spawnSync(process.execPath, [cli, '--surface', 'core', ...CLI_SMALL], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /core sufficiency/);
  assert.match(r.stdout, /RESULT: zero/);
  const noop = spawnSync(process.execPath, [cli, '--noop', ...CLI_SMALL], { cwd: root, encoding: 'utf8' });
  assert.equal(noop.status, 0);
  assert.doesNotMatch(noop.stdout, /core sufficiency/);
});

test('a field dropped from the core is caught: the comparison is not zero, and it names the record', async () => {
  // measurements[].specimenType decides whether a value counts as printed; a core without it answers differently (the Flexible incident, in kind).
  const lost = await createCoreAdapter(readDb(), { fields: { core: { ...CORE_FIELDS, measurements: without(CORE_FIELDS.measurements, ['specimenType']) }, estimates: ESTIMATE_FIELDS }, name: 'core without specimenType' });
  const r = await runParity({ corpusName: 'core-sufficiency', cases: modes, before: await sharedOld(), after: lost });
  assert.equal(r.status, 'differs');
  assert.ok(r.differences.length > 0);
  assert.ok(r.differences.every((d) => d.case.startsWith('template/')));
});

test('a field dropped from the estimates part is caught too, in the questions that use it and no others', async () => {
  const lost = await createCoreAdapter(readDb(), { fields: { core: CORE_FIELDS, estimates: { ...ESTIMATE_FIELDS, grades: { ...ESTIMATE_FIELDS.grades, estimate: { '*': without(ESTIMATE_FIELDS.grades.estimate['*'], ['centre']) } } } }, name: 'estimates without centre' });
  const r = await runParity({ corpusName: 'core-sufficiency', cases: modes, before: await sharedOld(), after: lost });
  assert.equal(r.status, 'differs');
  const cases = new Set(r.differences.map((d) => d.case));
  for (const id of cases) assert.match(id, /explore-estimates$/, `${id}: a question that does not use the estimates cannot miss them`);
});

test('the development guard names the field the core lacks, where the parity check only sees that the answer moved', async () => {
  const strictCase = modes.find((c) => !usesEstimates(c));
  const guarded = await createCoreAdapter(readDb(), { guard: true, fields: { core: { ...CORE_FIELDS, measurements: without(CORE_FIELDS.measurements, ['specimenType']) }, estimates: ESTIMATE_FIELDS } });
  const answer = await guarded.evaluate(strictCase);
  assert.equal(answer.outcome, 'not-computable');
  assert.match(answer.reason, /does not carry "measurements\[\]\.specimenType"/);
  // and with the real declarations the guarded engine runs through, reading nothing the core lacks
  const whole = await createCoreAdapter(readDb(), { guard: true });
  for (const c of modes) assert.equal((await whole.evaluate(c)).outcome, 'computed', c.id);
});

test('the core is enough to open every historic link, and the questions they ask are answered as the whole database answers them', async () => {
  const { TEMPLATES } = await import(pathToFileURL(join(root, 'app', 'js', 'ui', 'templates.js')).href);
  const units = linkUnits(historicLinks(TEMPLATES), []);
  const checked = await runLinks({ units, before: await createOld(readDb()), after: await createCoreAdapter(readDb()) });
  assert.equal(checked.openings.status, 'zero', checked.openings.differences.slice(0, 3).map((d) => `${d.case} ${d.field}`).join('\n'));
  assert.ok(checked.openings.unitsCompared >= 50);
  assert.equal(checked.replay?.status, 'zero');
});
