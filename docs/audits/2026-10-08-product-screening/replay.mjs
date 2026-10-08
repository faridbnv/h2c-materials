// Frozen D137 decision replay. Supply the old dist/db.json built at BASELINE.commit.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { runSelection } from '../../../app/js/engine/constraints.js';
import { pageContext } from '../../../scripts/trace.mjs';
import { fromHash } from '../../../app/js/engine/scenario.js';
import { TEMPLATES } from '../../../app/js/ui/templates.js';
const root = new URL('../../../', import.meta.url);
const read = (rel) => JSON.parse(readFileSync(new URL(rel, root)));
const before = read(process.argv.find((a) => a.endsWith('db.json')) ?? '.cache/uncertain-screening-baseline/db.json');
const after = read('dist/db.json');
const receipt = read('docs/audits/2026-10-08-product-screening/BASELINE.json');
const sha = (f) => createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex');
for (const [f, digest] of Object.entries({ ...receipt.data, ...receipt.acceptance })) assert.equal(sha(f), digest, f);
for (const old of before.materials) {
  const current = after.materials.find((m) => m.id === old.id);
  assert.deepEqual(current.headline, old.headline, `${old.id} material values/spreads/estimates`);
  assert.deepEqual(current.summary, old.summary, `${old.id} observed summaries`);
}
for (const old of before.grades) {
  const current = after.grades.find((g) => g.id === old.id);
  assert.deepEqual(current.headline, old.headline, `${old.id} published product values`);
  assert.deepEqual(current.states, old.states, `${old.id} published states`);
  for (const [key, e] of Object.entries(old.estimate ?? {})) {
    const now = current.estimate[key];
    for (const field of ['centre', 'lo', 'hi', 'plausible']) assert.deepEqual(now[field], e[field], `${old.id} ${key} displayed prediction ${field}`);
  }
}
const select = (db, scenario) => runSelection(db.materials.filter((m) => !m.familyEntry), scenario.constraints, pageContext(db, scenario));
const cases = TEMPLATES.flatMap((t) => ['strict', 'exploration'].flatMap((policy) => [false, true].map((useEstimates) => ({ name: `${t.name}/${policy}/estimates=${useEstimates}`, scenario: { constraints: t.constraints, unknownPolicy: policy, useEstimates } }))));
const { scenario } = fromHash(readFileSync(new URL('../2026-10-07-uncertain-logic/scenario-link.txt', import.meta.url), 'utf8').trim(), after.meta);
cases.push({ name: 'Reported 5 GPa scenario', scenario });
// Deterministic thresholds and service/quality combinations, not a sampled accuracy claim.
for (const property of ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045']) {
  const thresholds = { density: [900, 1250, 1500], tensileModulusXY: [2, 3, 5], tensileStrengthXY: [20, 50, 100], elongationXY: [5, 20, 100], hdt045: [60, 90, 120] }[property];
  for (const value of thresholds) for (const evidence of ['comparable', 'as-published']) for (const moisture of ['dry', 'conditioned']) for (const anneal of [false, true]) cases.push({ name: `${property}/${value}/${evidence}/${moisture}/anneal=${anneal}`, scenario: { constraints: [{ kind: 'numeric', property, operator: '>=', value }], unknownPolicy: 'exploration', useEstimates: true, evidence, moisture, anneal } });
}
const results = cases.map(({ name, scenario }) => {
  const old = select(before, scenario), current = select(after, scenario);
  const changes = [];
  for (const e of current.evaluations) {
    const prev = old.evaluations.find((p) => p.materialId === e.materialId);
    assert.equal(e.verdict, prev.verdict, `${name} ${e.materialId} evidence verdict`);
    if (e.eligible !== prev.eligible) changes.push({ material: e.materialId, before: prev.eligible, after: e.eligible,
      reason: e.screened ? 'Every unresolved product is independently screened' : 'At least one unresolved product has no certified exclusion in this context',
      representative: e.gradeId, unresolved: e.counts?.untested, screened: e.counts?.screened });
  }
  const candidates = current.evaluations.filter((e) => e.eligible);
  return { name, before: old.counts, after: current.counts, candidates: candidates.length,
    estimated: candidates.filter((e) => e.shortlistGroup === 'estimated').length,
    insufficient: candidates.filter((e) => e.shortlistGroup === 'insufficient').length, changes };
});
const report = { baseline: receipt.commit, release: after.meta.release.id, canonicalDataChanges: 0, protectedFixtureChanges: 0,
  evidenceVerdictChanges: 0, displayedPredictionChanges: 0,
  eligibilityChanges: results.reduce((n, r) => n + r.changes.length, 0), scenarios: results,
  certification: Object.fromEntries(Object.entries(after.meta.estimateModel.properties).map(([k, p]) => [k, p.productScreening ?? { limitation: 'Grade calibration stopped; no product predictions or screening shipped' }])) };
if (process.argv.includes('--write')) writeFileSync(new URL('RESULTS.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, scenarios: results.slice(0, 25).map(({ changes, ...r }) => ({ ...r, changes: changes.length })) }, null, 2));
