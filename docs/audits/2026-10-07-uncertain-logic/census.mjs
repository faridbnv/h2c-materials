// Census for OPEN-PROBLEMS §35: which unresolved ("uncertain") materials stay in Explore only because a sibling product is silent.
// Usage: node docs/audits/2026-10-07-uncertain-logic/census.mjs [property]   (default tensileModulusXY)
// Runs the scenario in scenario-link.txt (the High-stiffness fixture with Tensile modulus (XY) >= 5 GPa, Include uncertain, estimates on)
// against dist/db.json as the page does (scripts/trace.mjs pageContext). Build first: npm run build.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pageContext } from '../../../scripts/trace.mjs';
import { runSelection } from '../../../app/js/engine/constraints.js';
import { fromHash } from '../../../app/js/engine/scenario.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const db = JSON.parse(fs.readFileSync(join(root, 'dist/db.json'), 'utf8'));
const { scenario } = fromHash(fs.readFileSync(join(here, 'scenario-link.txt'), 'utf8').trim(), db.meta);
const key = process.argv[2] ?? 'tensileModulusXY';
const ctx = pageContext(db, scenario);
const mats = db.materials.filter((m) => !m.familyEntry);
const { evaluations, counts } = runSelection(mats, scenario.constraints, ctx);
const candidates = evaluations.filter((e) => e.eligible);
console.log(`release ${db.meta.release?.id}; ${scenario.constraints.length} requirements; counts`, counts, `candidates ${candidates.length}`);

const kept = [];
for (const e of candidates.filter((x) => x.verdict === 'UNKNOWN')) {
  const m = mats.find((x) => x.id === e.materialId);
  const h = m.headline[key];
  const rs = (e.products ?? []).map((p) => p.results.find((r) => r.constraint?.property === key));
  const fail = rs.filter((r) => r?.status === 'FAIL').length;
  const silent = rs.filter((r) => r && r.status === 'UNKNOWN').length;
  // Kept in Explore only by siblings that publish nothing comparable: a measured product fails, none passes, the headline is measured so no estimate exists.
  if (h?.known && fail && !rs.some((r) => r?.status === 'PASS')) {
    kept.push({ id: m.id, name: m.name, fail, silent, lo: h.spread?.min ?? h.value, hi: h.spread?.max ?? h.value });
  }
}
const allBelow = kept.filter((k) => k.hi < scenario.constraints.find((c) => c.property === key).value);
console.log(`${kept.length} candidates are unresolved with a measured failing product and silent siblings; ${allBelow.length} of them have every comparable value below the limit`);
for (const k of allBelow.sort((a, b) => b.hi - a.hi)) console.log(`  ${k.id} ${k.name}: ${k.fail} fail, ${k.silent} silent, comparable ${k.lo}-${k.hi}`);

console.log('\nmaterials with no comparable value at all, judged on their estimate:');
for (const e of evaluations) {
  const m = mats.find((x) => x.id === e.materialId);
  const est = m.headline[key]?.estimate;
  if (est && e.verdict === 'UNKNOWN') console.log(`  ${m.id} ${m.name}: ${e.screened ? 'SCREENED OUT' : 'kept'} (estimate ${est.lo?.toFixed(2)} to ${est.hi?.toFixed(2)}, plausibly ${est.plausible?.lo?.toFixed(2)} to ${est.plausible?.hi?.toFixed(2)})`);
}
