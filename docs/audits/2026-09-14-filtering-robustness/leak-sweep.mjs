// Leak sweep: every single numeric requirement, both directions, a threshold at every evidence boundary.
// docs/audits/2026-09-14-filtering-robustness/REPORT.md explains what this checks and why.
// Run from anywhere after `npm run build`:  node docs/audits/2026-09-14-filtering-robustness/<this file>
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
import { readFileSync } from 'node:fs';
const { runSelection, evaluateConstraint, compareInterval, STATUS, UNKNOWN_POLICY } = await import(`${ROOT}app/js/engine/constraints.js`);
const db = JSON.parse(readFileSync(`${ROOT}dist/db.json`, 'utf8'));
const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const ctx = { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.EXPLORATION };
const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];
// Oracle: the widest range the database can defend for this headline.
const oracle = (m, k) => {
  const h = m.headline[k];
  if (h.known) return h.loadStated === false ? (h.loadBracket ?? null) : (h.interval ?? { lo: h.value, hi: h.value });
  if (h.notApplicable) return 'na';
  if (h.estimate) return h.estimate.plausible;
  return null;
};
const leaks = new Map(); let checks = 0;
for (const k of KEYS) {
  const vals = new Set();
  for (const m of mats) { const o = oracle(m, k); if (o && o !== 'na') { vals.add(o.lo); vals.add(o.hi); } }
  const ts = [...vals].filter(Number.isFinite).sort((a, b) => a - b);
  const thresholds = ts.flatMap((v, i) => [v, i + 1 < ts.length ? (v + ts[i + 1]) / 2 : v * 1.01]);
  for (const op of ['>=', '<=']) for (const t of thresholds) {
    const c = { kind: 'numeric', property: k, operator: op, value: t, mandatory: true };
    for (const e of runSelection(mats, [c], ctx).candidates) {
      checks++;
      const m = mats.find((x) => x.id === e.materialId), o = oracle(m, k);
      const r = e.results[0];
      const fails = o === 'na' || (o && compareInterval({ lo: o.lo, hi: o.hi }, op, t) === STATUS.FAIL);
      if (!fails) continue;
      const why = r.vetoedBy?.length ? 'vetoed by a raw related value' : r.estimate && !r.estimate.canScreen ? 'estimate may not screen' : 'other';
      const key = `${k} | ${m.name} | ${why}`;
      leaks.set(key, (leaks.get(key) ?? 0) + 1);
    }
  }
}
console.log('eligible (material, requirement) pairs checked:', checks, ' leaks:', [...leaks.values()].reduce((a, b) => a + b, 0));
const byWhy = {}; for (const [k, n] of leaks) { const w = k.split(' | ')[2]; byWhy[w] = (byWhy[w] ?? 0) + n; }
console.log(byWhy);
for (const [k, n] of [...leaks].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), k);
