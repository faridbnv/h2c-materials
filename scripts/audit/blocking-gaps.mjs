#!/usr/bin/env node
// The gaps that block an answer (re-center lane 4; docs/GOALS.md, "targets before volume").
//
// For each of the six templates, judged as the page judges them (by products, comparable evidence, Explore), this
// lists what keeps a material from an answer and what could turn one, so the next data work goes where it moves a
// verdict rather than where data happens to be missing:
//
//   unknown     a material none of whose products could be judged, and the requirement that stops each: a value its
//               products publish without the direction or load (a re-read of the test conditions may settle it), a
//               value none publishes (a targeted sheet), or a print setting none records;
//   admitted    the materials whose answer changes when values published without the direction or load are admitted:
//               the re-reads that would settle the most;
//   close       products that pass or fail a limit by 10 % or less on one value, where a misread number or condition
//               would turn the answer.
//
// Generated; nothing here is written by hand. It decides nothing and changes no data.
//
//   node scripts/audit/blocking-gaps.mjs   writes docs/audits/2026-09-25-re-center/BLOCKING-GAPS.md

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { runSelection, evaluateConstraint, STATUS, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { productsByMaterial, productView, EVIDENCE } from '../../app/js/engine/products.js';
import { TEMPLATES } from '../../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'docs/audits/2026-09-25-re-center/BLOCKING-GAPS.md');
const CLOSE = 0.1;

const wb = loadTables(join(root, 'data'));
const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'audit' });
const group = (list) => { const m = new Map(); for (const x of list) { if (!m.has(x.materialId)) m.set(x.materialId, []); m.get(x.materialId).push(x); } return m; };
const base = {
  db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage), measurementById: new Map(db.measurements.map((m) => [m.id, m])),
  unknownPolicy: UNKNOWN_POLICY.EXPLORATION,
};
const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const materialById = new Map(db.materials.map((m) => [m.id, m]));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const label = (c) => (c.kind === 'numeric' ? `${c.property} ${c.operator} ${c.value}` : c.kind === 'gate' ? `${c.gate} within the H2C` : c.kind);
const hard = (c) => c.mandatory !== false && c.gate !== 'scope' && c.kind !== 'facet';
const productName = (g) => `${g.manufacturer} ${g.product}`;

// Why a requirement leaves every product of a material unjudged: the kind of work that would settle it.
function why(results) {
  if (results.every((r) => r.missing === 'not-applicable')) return null; // a statement, not a gap (an elastomer's HDT)
  if (results.some((r) => r.missing === 'not-comparable')) return 'published, not comparable';
  if (results.some((r) => r.constraint.property === 'priceCADkg')) return 'no sampled price';
  if (results.some((r) => r.constraint.kind === 'gate')) return 'print setting not recorded';
  if (results.some((r) => r.status === STATUS.INDETERMINATE)) return 'straddles the limit';
  return 'not published';
}

const sections = [];
const blockers = new Map(); // `${materialId}|${what}` -> { material, what, why, templates: Set, limits: Set }
const admittedAll = [];
const closeAll = [];
for (const t of TEMPLATES) {
  const cs = t.constraints.filter(hard);
  const { evaluations } = runSelection(mats, t.constraints, base);
  const asPublished = new Map(runSelection(mats, t.constraints, { ...base, evidence: EVIDENCE.AS_PUBLISHED }).evaluations.map((e) => [e.materialId, e]));
  const unknown = evaluations.filter((e) => e.verdict === STATUS.UNKNOWN);
  const reasons = new Map();
  for (const e of unknown) {
    const m = materialById.get(e.materialId);
    const products = base.productsByMaterial.get(m.id) ?? [];
    for (const c of cs) {
      const results = (products.length ? products.map((g) => evaluateConstraint(productView(m, g, base), c, base)) : [evaluateConstraint(m, c, base)]);
      if (results.some((r) => r.status === STATUS.PASS || r.status === STATUS.FAIL)) continue;
      const w = why(results);
      if (!w) continue;
      reasons.set(w, (reasons.get(w) ?? 0) + 1);
      // One value settles every threshold on it: stiffness at 2.5, 3 and 5 GPa is one gap.
      const what = c.kind === 'numeric' ? c.property : `${c.gate} window`;
      const k = `${m.id}|${what}`;
      if (!blockers.has(k)) blockers.set(k, { material: m.name, id: m.id, what, why: w, products: products.length, templates: new Set(), limits: new Set() });
      blockers.get(k).templates.add(t.name);
      blockers.get(k).limits.add(label(c));
    }
  }
  const admitted = evaluations.filter((e) => asPublished.get(e.materialId)?.verdict !== e.verdict)
    .map((e) => ({ template: t.name, material: materialById.get(e.materialId).name, from: e.verdict, to: asPublished.get(e.materialId).verdict }));
  admittedAll.push(...admitted);
  // Close calls: a product decided on one numeric requirement by 10 % or less.
  for (const c of cs.filter((x) => x.kind === 'numeric')) {
    for (const m of mats) {
      for (const g of base.productsByMaterial.get(m.id) ?? []) {
        const v = g.headline?.[c.property];
        if (!v || v.level !== 'comparable' || !c.value) continue;
        const margin = (v.value - c.value) / Math.abs(c.value);
        if (Math.abs(margin) > CLOSE) continue;
        const passes = c.operator === '>=' ? v.value >= c.value : v.value <= c.value;
        closeAll.push({ template: t.name, material: m.name, product: productName(g), requirement: label(c), value: v.value, measurementId: v.measurementId, passes, margin });
      }
    }
  }
  sections.push({ t, counts: { pass: evaluations.filter((e) => e.verdict === STATUS.PASS).length, fail: evaluations.filter((e) => e.verdict === STATUS.FAIL).length, unknown: unknown.length },
    reasons: [...reasons].sort((a, b) => b[1] - a[1]), admitted: admitted.length });
}

const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 1000) / 10} %`;
const ranked = [...blockers.values()].filter((b) => b.why !== 'no sampled price')
  .sort((a, b) => b.templates.size - a.templates.size || b.products - a.products || a.material.localeCompare(b.material));
const unpriced = [...blockers.values()].filter((b) => b.why === 'no sampled price');
const closest = closeAll.sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin));
const L = [
  '# The gaps that block an answer',
  '',
  'Generated by `node scripts/audit/blocking-gaps.mjs` from the current data; nothing here is written by hand, and it',
  'changes nothing. Each of the six templates is judged as the page judges it: product by product, comparable values',
  'only (D83, D84), in Explore, without estimates. Re-center lane 4 starts here (`REPORT.md`, "Phase 6"): the data work',
  'that settles the most answers first, not the most data.',
  '',
  '## By template',
  '',
  '| Template | In scope | PASS | FAIL | UNKNOWN | What leaves the unknowns unjudged (requirement × material) | Answers that change when values without direction or load are admitted |',
  '|---|---:|---:|---:|---:|---|---:|',
  ...sections.map((s) => `| ${s.t.name} | ${mats.length} | ${s.counts.pass} | ${s.counts.fail} | ${s.counts.unknown} | ${s.reasons.map(([w, n]) => `${w} ${n}`).join('; ') || '—'} | ${s.admitted} |`),
  '',
  'The kinds of work: **published, not comparable** is a re-read of the test conditions (direction, load) the sheet may',
  'state elsewhere, or a sheet that states them; **not published** is a targeted sheet, or the maker\'s site; **print',
  'setting not recorded** is lane 2\'s work (the product\'s own chamber or nozzle window); **no sampled price** is the',
  'price refresh the plan leaves for later, since cost sits late in the funnel. Heat deflection of an elastomer is not',
  'applicable (D56) and is not counted as a gap.',
  '',
  '## The requirements that block the most',
  '',
  'A material none of whose products can be judged on a property, counted across the templates whose answer it holds',
  'up (one value settles every threshold on it). The first rows are where one reading settles several answers. Price is',
  `apart: ${unpriced.length} materials hold up the Indoor prototype for want of a sampled price.`,
  '',
  '| Material | Products | Property | Why unjudged | Limits | Templates |',
  '|---|---:|---|---|---|---:|',
  ...ranked.slice(0, 60).map((b) => `| ${b.material} (${b.id}) | ${b.products} | ${b.what} | ${b.why} | ${[...b.limits].map((l) => l.replace(`${b.what} `, '')).join(', ')} | ${b.templates.size} |`),
  ...(ranked.length > 60 ? ['', `And ${ranked.length - 60} more, each holding up one template.`] : []),
  '',
  '## Answers a re-read of the test conditions could settle',
  '',
  'Materials whose answer changes when values published without the direction or load are admitted. Each is settled',
  'by finding what the sheet, or the maker, says about how the bar was tested.',
  '',
  '| Template | Material | Comparable only | Admitting them |',
  '|---|---|---|---|',
  ...admittedAll.map((a) => `| ${a.template} | ${a.material} | ${a.from} | ${a.to} |`),
  '',
  '## Close calls',
  '',
  `Products decided by ${Math.round(CLOSE * 100)} % or less on one value: a misread number, unit or condition here turns an answer. These`,
  `are the first values a person should check against the page: the ${Math.min(80, closest.length)} closest of ${closest.length} (a product counts once per template).`,
  '',
  '| Template | Material | Product | Requirement | Value | Margin | Measurement |',
  '|---|---|---|---|---:|---:|---|',
  ...closest.slice(0, 80).map((c) => `| ${c.template} | ${c.material} | ${c.product} | ${c.requirement} | ${c.value} | ${pct(c.margin)} ${c.passes ? 'pass' : 'fail'} | ${c.measurementId} |`),
  '',
];
writeFileSync(out, `${L.join('\n')}\n`);
console.log(`${sections.map((s) => `${s.t.name}: ${s.counts.unknown} unknown`).join('; ')}; ${ranked.length} blocking requirement(s), ${admittedAll.length} answer(s) a re-read could settle, ${closeAll.length} close call(s) -> ${out}`);
