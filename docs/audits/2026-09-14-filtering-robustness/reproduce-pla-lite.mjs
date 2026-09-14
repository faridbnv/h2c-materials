// The reported scenario: Outdoor structural part in Explore with estimates, and why each kept material is kept.
// docs/audits/2026-09-14-filtering-robustness/REPORT.md explains what this checks and why.
// Run from anywhere after `npm run build`:  node docs/audits/2026-09-14-filtering-robustness/<this file>
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
import { readFileSync } from 'node:fs';
const { runSelection, evaluateMaterial, UNKNOWN_POLICY } = await import(`${ROOT}app/js/engine/constraints.js`);
const db = JSON.parse(readFileSync(`${ROOT}dist/db.json`, 'utf8'));
const cs = [
  { kind: 'facet', facet: 'supportMaterial', equals: false },
  { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100, mandatory: true },
  { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true },
  { kind: 'numeric', property: 'density', operator: '<=', value: 1500, mandatory: true },
];
const ctx = { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.EXPLORATION };
const mats = db.materials.filter((m) => !m.familyEntry);
const sel = runSelection(mats, cs, ctx);
console.log(sel.counts);
const byId = new Map(mats.map((m) => [m.id, m]));
for (const e of sel.evaluations.filter((e) => e.eligible)) {
  const m = byId.get(e.materialId);
  console.log(e.verdict.padEnd(8), m.name.padEnd(18), e.results.map((r) => `${r.criterion}: ${r.status} — ${r.reason}`).filter((t) => /hdt|Modulus|modulus/.test(t)).join(' || '));
}
for (const n of ['PLA Lite', 'PA66']) {
  const m = mats.find((x) => x.name === n);
  for (const [label, c] of [['explore+est', ctx], ['explore, no est', { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }], ['strict', { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.STRICT }]]) {
    const e = evaluateMaterial(m, cs, c);
    console.log(n, '|', label, '| verdict', e.verdict, 'eligible', e.eligible, 'screened', e.screened, '|', e.screenedBy.join('; '));
  }
  console.log('   ', evaluateMaterial(m, cs, ctx).results.filter((r) => r.screened).map((r) => r.reason).join(' || '));
}
