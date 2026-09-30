// The frozen scenario replay (GAP-FILL-PLAN 06, "Useful scenario movement"): the fifteen questions the research froze
// (FROZEN-QUESTIONS.json: the six templates, the five acceptance scenarios, four state variants), answered by this
// checkout's engine over two compiled databases: the baseline's and the current build's. Every material verdict and every
// product state's verdict is compared; a change is listed with the results that made it.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/replay.mjs <before db.json> [after db.json] [out.json]
//
// The before database is the build of the base commit (BASELINE.json), kept outside the repository: it is 25 MB.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const { runSelection, UNKNOWN_POLICY } = await import(join(root, 'app/js/engine/constraints.js'));
const { productsByMaterial } = await import(join(root, 'app/js/engine/products.js'));
const { useRegistry } = await import(join(root, 'app/js/ui/registry.js'));

const [beforePath, afterPath = join(root, 'dist/db.json'), outPath = join(here, 'FROZEN-REPLAY.json')] = process.argv.slice(2);
if (!beforePath) { console.error('usage: replay.mjs <before db.json> [after db.json] [out.json]'); process.exit(2); }
const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const after = JSON.parse(readFileSync(afterPath, 'utf8'));
const { questions } = JSON.parse(readFileSync(join(here, 'FROZEN-QUESTIONS.json'), 'utf8'));

const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
function replay(db) {
  useRegistry(db.registry);
  const ctx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
    measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage), unknownPolicy: UNKNOWN_POLICY.STRICT };
  const materials = db.materials.filter((m) => !m.familyEntry && !m.excluded);
  const out = new Map();
  for (const q of questions) {
    const s = runSelection(materials, q.constraints, { ...ctx, ...q.policy });
    for (const e of s.evaluations) {
      out.set(JSON.stringify([q.id, 'material', e.materialId]), { question: q.id, lane: q.lane, level: 'material', id: e.materialId, verdict: e.verdict, screened: e.screened ?? null });
      for (const p of e.products ?? []) {
        out.set(JSON.stringify([q.id, 'product', p.gradeId, p.state]), { question: q.id, lane: q.lane, level: 'product', id: p.gradeId, state: p.state, verdict: p.verdict, results: p.results });
      }
    }
  }
  return out;
}

const b = replay(before), a = replay(after);
const changes = [], appeared = [], vanished = [];
for (const [key, r] of a) {
  const old = b.get(key);
  if (!old) { appeared.push(r); continue; }
  if (old.verdict !== r.verdict || (old.screened ?? null) !== (r.screened ?? null)) changes.push({ ...r, before: old.verdict, after: r.verdict, screenedBefore: old.screened ?? null, screenedAfter: r.screened ?? null, beforeResults: old.results });
}
for (const [key, r] of b) if (!a.has(key)) vanished.push(r);
const tally = (rows, f) => rows.reduce((t, r) => { const k = f(r); t[k] = (t[k] ?? 0) + 1; return t; }, {});
const report = {
  before: before.meta.release.id, after: after.meta.release.id, questions: questions.length, evaluations: b.size,
  verdictChanges: changes.filter((c) => c.before !== c.after).length,
  transitions: tally(changes.filter((c) => c.before !== c.after), (c) => `${c.lane}/${c.level}/${c.before}→${c.after}`),
  screenChanges: tally(changes.filter((c) => c.before === c.after), (c) => `${c.lane}/${c.level}/${c.verdict}: screened ${c.screenedBefore} → ${c.screenedAfter}`),
  newPasses: changes.filter((c) => c.after === 'PASS' && c.before !== 'PASS').length,
  appeared: appeared.length, vanished: vanished.length,
  changes, appearedRows: appeared, vanishedRows: vanished,
};
writeFileSync(outPath, `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify({ before: report.before, after: report.after, questions: report.questions, evaluations: report.evaluations, verdictChanges: report.verdictChanges, transitions: report.transitions, screenChanges: report.screenChanges, newPasses: report.newPasses, appeared: report.appeared, vanished: report.vanished }, null, 1));
