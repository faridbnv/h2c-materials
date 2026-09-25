// Makers' know-how (re-center lane 3, build/src/know-how.js): the maker's statements, shown in the product panel and
// never read by anything that screens, and the state every product and material carries where its documents are silent.
//
// The fixture rows are synthetic and live here, never in data/. The compile tests edit a clone of the real tables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { KNOW_HOW, KNOW_HOW_TOPICS, STATE } from '../build/src/know-how.js';
import { classifyTopic } from '../build/src/normalize/chemical.js';
import { runSelection, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { validateScenario } from '../app/js/engine/scenario.js';
import { TEMPLATES } from '../app/js/ui/templates.js';
import { worklist } from '../scripts/audit/know-how-worklist.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const STATES = Object.values(STATE);

test('every know-how topic maps to the know-how category, which no filter can use', () => {
  assert.ok(KNOW_HOW_TOPICS.length >= 11, KNOW_HOW_TOPICS.join(', '));
  for (const t of KNOW_HOW_TOPICS) {
    const c = classifyTopic(t);
    assert.equal(c.category, KNOW_HOW, t);
    assert.equal(c.filterable, false, t);
  }
  assert.ok(!(KNOW_HOW in db.meta.environmentCategories), 'the know-how category is not an environment the engine can be asked about');
});

test('the statements leave db.evidence: nothing the engine reads holds one', () => {
  assert.ok(db.knowHow.length > 0);
  const ids = new Set(db.knowHow.map((k) => k.id));
  assert.equal(db.evidence.filter((e) => e.category === KNOW_HOW || ids.has(e.id)).length, 0);
  assert.equal(db.meta.counts.evidence, db.evidence.length);
  assert.equal(db.meta.counts.knowHow, db.knowHow.length);
  for (const m of db.materials) for (const list of Object.values(m.evidenceIds ?? {})) for (const id of list) assert.ok(!ids.has(id), `${m.id} cites ${id}`);
  const grades = new Map(db.grades.map((g) => [g.id, g]));
  for (const k of db.knowHow) {
    assert.ok(KNOW_HOW_TOPICS.includes(k.topic), `${k.id} ${k.topic}`);
    if (k.gradeId !== 'Not applicable') {
      assert.equal(grades.get(k.gradeId)?.materialId, k.materialId, `${k.id} is filed under ${k.materialId}`);
      assert.equal(grades.get(k.gradeId).retired, false, `${k.id} is on a retired grade`);
    }
  }
});

test('a scenario cannot name the know-how category, and the statements change no template answer even beside the evidence', () => {
  const { scenario, warnings } = validateScenario({ constraints: [{ kind: 'environment', category: KNOW_HOW }] }, db.meta);
  assert.equal(scenario.constraints.length, 0);
  assert.match(warnings.join(' '), /names an environment this build does not have/);

  const group = (list) => { const out = new Map(); for (const x of list) { if (!out.has(x.materialId)) out.set(x.materialId, []); out.get(x.materialId).push(x); } return out; };
  const ctx = (evidence) => ({ db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage) });
  // The statements shaped as evidence records, as they would be had they stayed in db.evidence.
  const leaked = [...db.evidence, ...db.knowHow.map((k) => ({ ...classifyTopic(k.topic), id: k.id, materialId: k.materialId, gradeId: k.gradeId, topic: k.topic, finding: k.text, verdict: 'narrative', filterable: false }))];
  const mats = db.materials.filter((m) => !m.familyEntry);
  const answer = (c, policy) => runSelection(mats, c.constraints, { ...ctx(c.evidence), unknownPolicy: policy, useEstimates: true }).evaluations.map((e) => `${e.materialId} ${e.verdict} ${e.eligible} ${e.share ?? ''}`).join('\n');
  for (const t of TEMPLATES) {
    for (const policy of [UNKNOWN_POLICY.STRICT, UNKNOWN_POLICY.EXPLORATION]) {
      const plain = answer({ constraints: t.constraints, evidence: db.evidence }, policy);
      assert.equal(plain.split('\n').length, mats.length, `${t.name} answers every material`);
      assert.equal(answer({ constraints: t.constraints, evidence: leaked }, policy), plain, `${t.name}, ${policy}`);
    }
  }
});

test('every product and material carries one state, and the counts add up', () => {
  const active = db.grades.filter((g) => !g.retired);
  const withStatements = new Set(db.knowHow.map((k) => k.gradeId));
  for (const g of active) {
    assert.ok(STATES.includes(g.knowHow.state), g.id);
    assert.equal(g.knowHow.state === STATE.COLLECTED, withStatements.has(g.id), g.id);
    assert.equal(g.knowHow.statements, db.knowHow.filter((k) => k.gradeId === g.id).length, g.id);
    for (const part of ['chamber', 'drying', 'annealing']) assert.ok(STATES.includes(g.knowHow.recipe[part]), `${g.id} ${part}`);
    if (g.knowHow.state === STATE.SILENT) assert.match(g.knowHow.readOn, /^\d{4}-\d{2}-\d{2}$/);
  }
  for (const g of db.grades.filter((x) => x.retired)) assert.equal(g.knowHow, undefined, g.id);
  const materials = db.materials.filter((m) => !m.familyEntry);
  for (const m of materials) assert.ok(STATES.includes(m.knowHow.state), m.id);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  assert.equal(sum(db.meta.knowHow.materials), materials.length);
  assert.equal(sum(db.meta.knowHow.products), materials.reduce((n, m) => n + sum(m.knowHow.products), 0));
  assert.equal(db.meta.knowHow.statements, db.knowHow.length);
});

test('the states follow what was read: a maker-site search dates a silent product, no read leaves it unread, a statement collects it', () => {
  const base = loadTables(join(root, 'data'));
  const silent = db.grades.find((g) => !g.retired && g.knowHow.state === STATE.SILENT && !/-R\d+$/.test(g.id));
  const statement = db.knowHow.find((k) => k.gradeId !== 'Not applicable');
  const wb = structuredClone(base);
  const rows = wb['Know-how reads'].rows;
  // Search the silent product's own source; forget every read of the collected product's statement source.
  rows.push({ SourceID: silent.sourceId, Scope: 'maker site', 'Read on': '2026-10-01', 'Read by': 'fixture', __file: 'data/tables/know_how_reads.csv', __row: rows.length + 2, __numbers: {} });
  const { db: built, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false });
  assert.deepEqual(issues.filter((i) => i.level === 'error'), []);
  const g = built.grades.find((x) => x.id === silent.id);
  assert.equal(g.knowHow.state, STATE.SEARCHED);
  assert.equal(g.knowHow.searchedOn, '2026-10-01');
  assert.equal(built.grades.find((x) => x.id === statement.gradeId).knowHow.state, STATE.COLLECTED);

  const none = structuredClone(base);
  none['Know-how reads'].rows = [];
  none['Use & durability'].rows = none['Use & durability'].rows.filter((r) => r.Domain !== "Makers' know-how");
  const { db: bare } = buildDatabase(none, { snapshot: snapshotDate(none.Method.rows), build: 'test', estimates: false });
  assert.ok(bare.grades.filter((x) => !x.retired).every((x) => x.knowHow.state === STATE.UNREAD));
  assert.equal(bare.knowHow.length, 0);
});

test('the maker-site worklist is what the data gives (npm run audit:know-how)', () => {
  const templates = readCsv(join(root, 'build/snapshot/templates.csv')).records.map((r) => r.values);
  const committed = readFileSync(join(root, 'docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md'), 'utf8');
  assert.equal(worklist(db, templates), committed, 'stale: npm run audit:know-how');
});
