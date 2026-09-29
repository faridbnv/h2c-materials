#!/usr/bin/env node
// What the makeover moved (GOALS working rule 3): every template, both policies, dry and conditioned, as printed and with
// annealing permitted, asked of the engine before the change and after it, and every goal's ranking over the answer.
//
//   node rank-diff.mjs <before app/js dir> <before db.json> <after app/js dir> <after db.json> > rank-diff.json
//
// Verdicts are compared material by material; a ranking by its order, each material's median index, its best product
// and state, and which passing materials it leaves unranked. The two engines read their own databases, which differ
// only in the release identity (npm run build:diff: 0 differences).

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [beforeApp, beforeDb, afterApp, afterDb] = process.argv.slice(2).map((p) => resolve(p));
const load = async (app, dbPath) => {
  const imp = (f) => import(pathToFileURL(join(app, f)).href);
  const [{ runSelection }, { productsByMaterial }, { INDICES, rankingFor }, { TEMPLATES }] = await Promise.all([
    imp('engine/constraints.js'), imp('engine/products.js'), imp('engine/indices.js'), imp('ui/templates.js')]);
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const group = (rows, key) => { const m = new Map(); for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); } return m; };
  const base = { db, productsByMaterial: productsByMaterial(db), measurementsByMaterial: group(db.measurements, 'materialId'), evidenceByMaterial: group(db.evidence, 'materialId'),
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? [], 'materialId'), coverageByMaterial: group(db.coverage, 'materialId'), evidence: 'comparable' };
  return { runSelection, INDICES, rankingFor, TEMPLATES, db, base };
};
const before = await load(beforeApp, beforeDb);
const after = await load(afterApp, afterDb);

const MODES = [];
for (const policy of ['strict', 'exploration']) for (const moisture of ['dry', 'conditioned']) for (const anneal of [false, true]) {
  MODES.push({ policy, moisture, anneal, name: `${policy === 'strict' ? 'Strict' : 'Explore'}${moisture === 'conditioned' ? ', conditioned' : ''}${anneal ? ', annealing permitted' : ''}` });
}
const QUESTIONS = [...after.TEMPLATES.map((t) => ({ name: t.name, constraints: t.constraints })),
  { name: 'In scope only', constraints: [{ kind: 'gate', gate: 'scope' }] },
  { name: 'H2C beam (the review)', constraints: [{ kind: 'gate', gate: 'scope' }, ...['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate })),
    { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true }, { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true }] }];

function answer(E, q, mode) {
  const ctx = { ...E.base, unknownPolicy: mode.policy, moisture: mode.moisture, anneal: mode.anneal, annealMaxC: null, useEstimates: false };
  const materials = E.db.materials.filter((m) => !m.familyEntry);
  const sel = E.runSelection(materials, q.constraints, ctx);
  const byId = new Map(materials.map((m) => [m.id, m]));
  const rows = sel.evaluations.filter((e) => e.eligible).map((e) => ({ material: byId.get(e.materialId), evaluation: e }));
  const verdicts = Object.fromEntries(sel.evaluations.map((e) => [e.materialId, e.verdict]));
  const rankings = Object.fromEntries(E.INDICES.map((index) => {
    const r = E.rankingFor(rows, ctx, index);
    return [index.id, { order: r.order.map((o) => [o.materialId, Number(o.value.toPrecision(6)), o.best?.gradeId ?? null, o.best?.stateId ?? null]), unranked: r.unranked.map((u) => u.materialId) }];
  }));
  return { verdicts, rankings };
}

const nameOf = new Map(after.db.materials.map((m) => [m.id, m.name]));
const out = { verdictChanges: 0, questions: QUESTIONS.length * MODES.length, rankings: 0, rankingsMoved: 0, moved: [] };
for (const q of QUESTIONS) {
  for (const mode of MODES) {
    const a = answer(before, q, mode), b = answer(after, q, mode);
    for (const id of Object.keys(a.verdicts)) if (a.verdicts[id] !== b.verdicts[id]) { out.verdictChanges++; out.moved.push({ question: q.name, mode: mode.name, material: nameOf.get(id), verdict: [a.verdicts[id], b.verdicts[id]] }); }
    for (const index of after.INDICES) {
      out.rankings++;
      const ra = a.rankings[index.id], rb = b.rankings[index.id];
      if (JSON.stringify(ra) === JSON.stringify(rb)) continue;
      out.rankingsMoved++;
      const ids = (r) => r.order.map((o) => o[0]);
      const left = ids(ra).filter((id) => !ids(rb).includes(id));
      const joined = ids(rb).filter((id) => !ids(ra).includes(id));
      // A rank that rested on a state its best product does not publish: the defect this corrects (A01).
      const onMissingState = ra.order.filter(([, , g, s]) => g && !after.db.grades.find((x) => x.id === g)?.states?.some((st) => st.id === s)).length;
      out.moved.push({ question: q.name, mode: mode.name, goal: index.id, ranked: [ra.order.length, rb.order.length], unranked: [ra.unranked.length, rb.unranked.length],
        leftRanking: left.map((id) => nameOf.get(id)), joinedRanking: joined.map((id) => nameOf.get(id)), beforeRestingOnAMissingState: onMissingState,
        sameOrderOfRemaining: JSON.stringify(ids(ra).filter((id) => ids(rb).includes(id))) === JSON.stringify(ids(rb).filter((id) => ids(ra).includes(id))) });
    }
  }
}
out.summary = {
  verdictsCompared: QUESTIONS.length * MODES.length,
  verdictChanges: out.verdictChanges,
  rankingsCompared: out.rankings,
  rankingsMoved: out.rankingsMoved,
  movedOnlyInConditionedModes: out.moved.filter((m) => m.goal).every((m) => /conditioned/.test(m.mode)),
  everyLeaverRestedOnAMissingState: out.moved.filter((m) => m.goal).every((m) => m.leftRanking.length === m.beforeRestingOnAMissingState || m.beforeRestingOnAMissingState >= m.leftRanking.length),
};
console.log(JSON.stringify(out, null, 2));
