// Structural invariants of the selection engine over random multi-requirement scenarios.
// docs/audits/2026-09-14-filtering-robustness/REPORT.md explains what this checks and why.
// Run from anywhere after `npm run build`:  node docs/audits/2026-09-14-filtering-robustness/<this file>
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
import { readFileSync } from 'node:fs';
const { runSelection, STATUS, UNKNOWN_POLICY } = await import(`${ROOT}app/js/engine/constraints.js`);
const db = JSON.parse(readFileSync(`${ROOT}dist/db.json`, 'utf8'));
const mats = db.materials.filter((m) => !m.familyEntry);
const evidenceByMaterial = new Map(), measurementsByMaterial = new Map(), coverageByMaterial = new Map();
for (const e of db.evidence) { if (!evidenceByMaterial.has(e.materialId)) evidenceByMaterial.set(e.materialId, []); evidenceByMaterial.get(e.materialId).push(e); }
for (const x of db.measurements) { if (!measurementsByMaterial.has(x.materialId)) measurementsByMaterial.set(x.materialId, []); measurementsByMaterial.get(x.materialId).push(x); }
for (const c of db.coverage) { if (!coverageByMaterial.has(c.materialId)) coverageByMaterial.set(c.materialId, []); coverageByMaterial.get(c.materialId).push(c); }
const base = { db, evidenceByMaterial, measurementsByMaterial, coverageByMaterial };
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ranges = { density: [800, 1800], tensileModulusXY: [0.01, 12], tensileStrengthXY: [5, 170], elongationXY: [1, 700], hdt045: [40, 270], priceCADkg: [20, 300] };
const cats = Object.keys(db.meta.environmentCategories);
const gen = () => {
  const kind = pick(['numeric', 'numeric', 'numeric', 'gate', 'facet', 'environment', 'evidence']);
  if (kind === 'numeric') { const p = pick(Object.keys(ranges)); const [a, b] = ranges[p]; return { kind, property: p, operator: pick(['>=', '<=']), value: a + rnd() * (b - a), mandatory: rnd() > 0.1 }; }
  if (kind === 'gate') return pick([{ kind, gate: 'scope' }, { kind, gate: 'nozzle' }, { kind, gate: 'bed' }, { kind, gate: 'chamber' }, { kind, gate: 'abrasive', hardenedAvailable: rnd() > 0.5 }, { kind, gate: 'buyable', inStock: rnd() > 0.5 }, { kind, gate: 'dryingKnown' }]);
  if (kind === 'facet') return pick([{ kind, facet: 'supportMaterial', equals: false }, { kind, facet: 'reinforcement', in: [pick(['carbon-fibre', 'glass-fibre', 'unfilled'])] }, { kind, facet: 'flexible', equals: rnd() > 0.5 }]);
  if (kind === 'environment') return { kind, category: pick(cats) };
  return { kind, exactGrade: rnd() > 0.5, noConflicts: rnd() > 0.5 };
};
const ids = (sel) => new Set(sel.candidates.map((e) => e.materialId));
const sub = (a, b) => [...a].every((x) => b.has(x));
const fails = {}; const bump = (k, ex) => { fails[k] ??= { n: 0, ex }; fails[k].n++; };
const modes = { strict: { unknownPolicy: UNKNOWN_POLICY.STRICT }, exploreNoEst: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }, exploreEst: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true } };
const N = 4000;
for (let i = 0; i < N; i++) {
  const cs = Array.from({ length: 1 + Math.floor(rnd() * 4) }, gen);
  const s = Object.fromEntries(Object.entries(modes).map(([k, c]) => [k, runSelection(mats, cs, { ...base, ...c })]));
  const I = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, ids(v)]));
  if (!sub(I.strict, I.exploreEst)) bump('Strict shows a material Explore does not', cs);
  if (!sub(I.exploreEst, I.exploreNoEst)) bump('Estimates on shows a material estimates off does not', cs);
  // PASS rests only on evidence: never on an estimate, a bracket or not-applicable.
  for (const e of s.exploreEst.evaluations) {
    for (const r of e.results) if (r.status === STATUS.PASS && (r.estimated || r.notApplicable || r.caveat)) bump('PASS resting on inference', cs);
    if (e.verdict === STATUS.PASS && e.screened) bump('PASS and screened at once', cs);
    if (e.verdict === STATUS.FAIL && e.eligible) bump('FAIL still eligible', cs);
  }
  // Adding a mandatory requirement never adds a material.
  const extra = [...cs, { ...gen(), mandatory: true }];
  for (const [k, c] of Object.entries(modes)) if (!sub(ids(runSelection(mats, extra, { ...base, ...c })), I[k])) bump(`Adding a requirement adds a material (${k})`, extra);
  // Tightening a numeric threshold never adds a material.
  const n = cs.find((c) => c.kind === 'numeric' && c.mandatory !== false);
  if (n) {
    const tight = cs.map((c) => (c === n ? { ...c, value: c.operator === '>=' ? c.value * 1.2 : c.value * 0.8 } : c));
    for (const [k, c] of Object.entries(modes)) if (!sub(ids(runSelection(mats, tight, { ...base, ...c })), I[k])) bump(`Tightening a threshold adds a material (${k})`, tight);
  }
  // A tracked (non-mandatory) requirement never removes a material.
  const soft = [...cs, { ...gen(), mandatory: false }];
  for (const [k, c] of Object.entries(modes)) if (!sub(I[k], ids(runSelection(mats, soft, { ...base, ...c })))) bump(`A tracked requirement removes a material (${k})`, soft);
}
console.log(`${N} random scenarios x 3 modes checked.`);
console.log(Object.keys(fails).length ? Object.entries(fails).map(([k, v]) => `${k}: ${v.n}  e.g. ${JSON.stringify(v.ex).slice(0, 300)}`).join('\n') : 'All structural invariants hold.');
