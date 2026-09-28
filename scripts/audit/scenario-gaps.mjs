#!/usr/bin/env node
// The facts that would settle a scenario's answer, by exact product (version 2.1, F08; docs/GOALS.md, working rule 4,
// "targets before volume").
//
// The six templates and the acceptance portfolio's questions (test/acceptance/portfolio.json) are judged as the page
// judges them: product by product, in the state the question permits (D99), Confirmed only. A product left unresolved
// by exactly one requirement is one fact from an answer; that fact is listed with the kind of work that would settle it,
// the answers it would move, and when to stop looking:
//
//   another state      the product publishes the value only annealed, or only dry: the maker's value in the asked
//                      state, or the team's coupon; or the question permits the state it is published in
//   conditions         published without its direction or load: a re-read of the sheet's test conditions, or the maker
//   source silent      no value, record or recipe at all: the maker's other documents, then the maker, then a coupon
//   print test         a window the H2C only partly reaches, or a recommendation above it: a test print on the H2C
//   treatment          annealed at a schedule its sheet does not state: the maker's schedule
//
// A fact the research package of 2026-09-26 already put to the owner or a maker (archive/research-2026-09-26/
// owner-handoffs.csv) says so, so nobody searches it again. Counted by products made actionable and answers moved, never
// by documents. Generated; it decides nothing and changes no data.
//
//   npm run audit:scenario-gaps     writes docs/audits/2026-09-27-v2.1-review/SCENARIO-GAPS.md

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { csvText, readCsv } from '../../build/src/csv.js';
import { runSelection, STATUS, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../app/js/engine/products.js';
import { TEMPLATES, templateByName } from '../../app/js/ui/templates.js';
import { useRegistry } from '../../app/js/ui/registry.js';
import { describeConstraint } from '../../app/js/ui/labels.js';
import { releaseIdentity } from '../../build/src/release.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'docs/audits/2026-09-27-v2.1-review/SCENARIO-GAPS.md');

const wb = loadTables(join(root, 'data'));
const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'audit' });
db.meta.release = releaseIdentity(root);
useRegistry(db.registry);
const group = (list) => { const m = new Map(); for (const x of list) { if (!m.has(x.materialId)) m.set(x.materialId, []); m.get(x.materialId).push(x); } return m; };
const ctx = {
  db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage), unknownPolicy: UNKNOWN_POLICY.STRICT,
};
const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const materialById = new Map(db.materials.map((m) => [m.id, m]));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const handoffs = new Map();
for (const r of readCsv(join(root, 'archive/research-2026-09-26/owner-handoffs.csv')).records.map((x) => x.values)) {
  if (!handoffs.has(r.GradeID)) handoffs.set(r.GradeID, []);
  handoffs.get(r.GradeID).push(r);
}

// The questions: every template, and each portfolio case that states its own requirements, as printed and dry.
const portfolio = JSON.parse(readFileSync(join(root, 'test/acceptance/portfolio.json'), 'utf8'));
const questions = [
  ...TEMPLATES.map((t) => ({ name: t.name, constraints: t.constraints, policy: {} })),
  ...portfolio.cases.filter((c) => c.constraints && c.policy?.unknownPolicy !== 'exploration').map((c) => ({ name: `${c.id}: ${c.question}`, constraints: c.constraints, policy: { anneal: c.policy?.anneal, moisture: c.policy?.moisture } })),
];

/** The kind of work one unsettled requirement needs, and when to stop looking. */
function kindOf(r, grade) {
  if (r.constraint?.property === 'priceCADkg' || r.constraint?.gate === 'buyable') return null; // sourcing, late in the funnel
  if (r.missing === 'other-state') {
    const e = r.elsewhere?.[0];
    return { kind: 'another state', work: e?.treatment ? 'the maker\'s as-printed value, or the team\'s coupon; or permit annealing' : 'the maker\'s value in the asked moisture state, or the team\'s conditioned coupon',
      stop: 'the maker says it publishes none: record it, and test' };
  }
  if (r.missing === 'not-comparable') return { kind: 'conditions', work: 'a re-read of the sheet\'s test conditions (direction, load), then the maker', stop: 'no document of the maker states them: record "not published after search"' };
  if (r.constraint?.kind === 'treatment') return { kind: 'treatment', work: 'the maker\'s annealing schedule', stop: 'the maker states none: the annealed values stay unusable' };
  if (r.constraint?.kind === 'gate' && r.status === STATUS.INDETERMINATE) return { kind: 'print test', work: 'a test print on the H2C at its chamber and bed limits', stop: 'the team\'s print decides' };
  if (r.constraint?.kind === 'gate') {
    const searched = grade.knowHow?.recipe?.chamber === 'searched';
    return { kind: 'source silent', work: searched ? 'the maker (its site was searched and publishes no print settings)' : 'the maker\'s site for its print settings, then the maker', stop: 'searched and asked: a test print on the H2C decides' };
  }
  if (r.status === STATUS.INDETERMINATE) return { kind: 'print test', work: 'the team\'s coupon: the published range straddles the limit', stop: 'the coupon decides' };
  return { kind: 'source silent', work: 'the maker\'s other documents, then the maker, then the team\'s coupon', stop: 'searched and asked: the coupon decides' };
}

const facts = new Map(); // `${gradeId}|${requirement}` -> fact
const summary = [];
for (const q of questions) {
  const { evaluations, counts } = runSelection(mats, q.constraints, { ...ctx, ...q.policy });
  let oneFact = 0, materialsOneFact = 0;
  for (const e of evaluations) {
    if (e.verdict === STATUS.PASS) continue;
    let materialMoves = false;
    for (const p of e.products ?? []) {
      if (p.verdict !== STATUS.UNKNOWN || p.screened) continue;
      const open = (p.results ?? []).filter((r) => r.constraint?.mandatory !== false && (r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE));
      if (open.length !== 1) continue;
      const grade = gradeById.get(p.gradeId);
      const k = kindOf(open[0], grade);
      if (!k) continue;
      oneFact++; materialMoves = true;
      const requirement = open[0].constraint ? describeConstraint(open[0].constraint) : open[0].criterion;
      const key = `${p.gradeId}|${requirement}`;
      const f = facts.get(key) ?? { grade, material: materialById.get(e.materialId), requirement, ...k, reason: open[0].reason, questions: new Set() };
      f.questions.add(q.name.split(':')[0]);
      facts.set(key, f);
    }
    if (materialMoves) materialsOneFact++;
  }
  summary.push({ q, counts, oneFact, materialsOneFact });
}

const byKind = new Map();
for (const f of facts.values()) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
// Ranked by how many questions a fact settles; the table lists the facts that settle more than one, and the first three
// of each material's that settle one, so it stays a worklist a person can read. The counts cover every fact.
const ranked = [...facts.values()].sort((a, b) => b.questions.size - a.questions.size || a.material.name.localeCompare(b.material.name) || a.grade.id.localeCompare(b.grade.id, 'en', { numeric: true }));
const perMaterial = new Map();
const listed = ranked.filter((f) => {
  if (f.questions.size > 1) return true;
  const n = (perMaterial.get(f.material.id) ?? 0) + 1;
  perMaterial.set(f.material.id, n);
  return n <= 3;
});
const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const name = (g) => `${g.manufacturer} ${g.product}`;
const L = [
  '# The facts that would settle a scenario\'s answer, by product',
  '',
  '<!-- Generated by npm run audit:scenario-gaps (scripts/audit/scenario-gaps.mjs). Do not edit by hand. -->',
  '',
  `Release ${db.meta.release?.id ?? '(built without the entry point)'}, data of ${db.meta.snapshot}. Each question is judged as the page judges it, product by product, in the`,
  'state it permits (D99), Confirmed only. A product left unresolved by one requirement is one fact from an answer; the',
  'fact, the work that would settle it and when to stop are below, ranked by how many questions it would settle. Counted by',
  'products made actionable, never by documents (GOALS, working rule 4).',
  '',
  '## By question',
  '',
  '| Question | PASS | UNKNOWN | FAIL | Products one fact from an answer | Materials among them |',
  '|---|---:|---:|---:|---:|---:|',
  ...summary.map(({ q, counts, oneFact, materialsOneFact }) => `| ${cell(q.name.length > 90 ? `${q.name.slice(0, 87)}...` : q.name)} | ${counts.pass} | ${counts.unknown} | ${counts.fail} | ${oneFact} | ${materialsOneFact} |`),
  '',
  `## The facts: ${facts.size} in all, ${listed.length} listed`,
  '',
  `By kind: ${[...byKind].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('; ')}. A fact already put to the owner or a maker by the`,
  'research package of 2026-09-26 names its finding, so it is not searched again. Listed: every fact that settles more than one',
  'question, and the first three of each material\'s that settle one.',
  '',
  '| Product | Material | Requirement | Kind | Why it is not settled | The work | Stop when | Questions | Already asked |',
  '|---|---|---|---|---|---|---|---|---|',
  ...listed.map((f) => `| ${cell(name(f.grade))} (${f.grade.id}) | ${cell(f.material.name)} | ${cell(f.requirement)} | ${f.kind} | ${cell(f.reason)} | ${cell(f.work)} | ${cell(f.stop)} | ${[...f.questions].sort().join('; ')} | ${(handoffs.get(f.grade.id) ?? []).map((h) => `${h.FindingID} (${h.Outcome})`).join('; ')} |`),
  '',
];
writeFileSync(out, L.join('\n'));
console.log(`audit:scenario-gaps: ${questions.length} questions, ${facts.size} product facts one step from an answer (${[...byKind].map(([k, n]) => `${k} ${n}`).join(', ')}); wrote ${out.replace(`${root}/`, '')}`);


if (process.argv.includes('--csv')) {
  const targetDir = join(root, 'docs/audits/2026-09-28-gap-closing');
  mkdirSync(targetDir, { recursive: true });
  const path = join(targetDir, 'TARGETS.csv');
  // Freeze before edits: later tranches compare against the same products, states and questions.
  if (existsSync(path)) console.log('TARGETS.csv already frozen; retained (remove explicitly to start a new campaign).');
  else {
    const targets = ranked.filter((f) => f.kind !== 'print test');
    const rows = targets.map((f) => {
      const prior = handoffs.get(f.grade.id) ?? [];
      // A bounded search or NEEDS_VENDOR is not a finding that nothing is published.
      const closed = prior.some((h) => /NOT_PUBLISHED|SEARCHED_NOTHING_PUBLISHED/.test(h.Outcome));
      return { GradeID: f.grade.id, MaterialID: f.material.id, Manufacturer: f.grade.manufacturer, Product: f.grade.product,
        Requirement: f.requirement, Kind: f.kind, Questions: [...f.questions].sort().join('; '),
        'Expected movement': `${f.questions.size} question(s): product UNKNOWN to PASS or FAIL when exact-state evidence settles the limit; PASS adds a material with no passing product yet`,
        'Stop rule': f.kind === 'source silent' ? 'Re-read cached sheets; check matching held documents; search maker product page, downloads and print guide once; record absence without inference' : f.stop,
        Tranche: closed ? 'closed by prior handoff' : 'A; B; C where print settings remain silent',
        'Research-package handoff': prior.map((h) => `${h.FindingID} (${h.Outcome})`).join('; ') || 'None',
        'Source question': `Does the maker publish ${f.requirement} for this exact product in the question-specific state?`, State: 'Question-specific state; see frozen BASELINE.json', Status: closed ? 'searched, nothing published (prior handoff)' : 'open',
      };
    });
    writeFileSync(path, csvText(Object.keys(rows[0] ?? {}), rows));
    writeFileSync(join(targetDir, 'BASELINE.json'), JSON.stringify({ release: db.meta.release, questions: summary.map(({ q, counts, oneFact, materialsOneFact }) => ({ ...q, counts, oneFact, materialsOneFact })), facts: rows.length }, null, 2) + '\n');
    console.log(`froze ${rows.length} targets (${targets.filter((f) => f.questions.size > 1).length} multi-question) in ${path}`);
  }
}
