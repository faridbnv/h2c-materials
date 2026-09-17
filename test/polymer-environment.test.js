// Polymer-level environmental behaviour (DECISIONS D64): the base polymer's published behaviour, attached to a material
// only where it has no record of its own, shown, able to screen under inference, and never a PASS.
//
// The fixture rows are synthetic and live here, never in data/. The compile tests edit a clone of the real tables so
// every real invariant still runs beside them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { validate } from '../build/src/validate.js';
import { compilePolymerEnvironment, categoryVerdict, attachPolymerEnvironment, POLYMER_EVIDENCE_TYPE } from '../build/src/polymer-environment.js';
import { evaluateConstraint, evaluateMaterial, runSelection, explainExclusions, STATUS, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { screenedChip, screenedByKind, SCREEN_PREFIX, setEnvironmentLabels } from '../app/js/ui/labels.js';

// The app seeds the category names from db.meta at boot; the chip test speaks in the same words.
setEnvironmentLabels({ 'organic-solvent': { label: 'Organic solvent resistance', noun: 'solvents' } });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));

// A source the fixture cites: the first retrieved, cited source of the real register.
const RETRIEVED = base.Sources.rows.find((s) => s['Citation role'] === 'cited' && s['Access status'] === 'Retrieved').SourceID;
const NOT_RETRIEVED = base.Sources.rows.find((s) => s['Citation role'] === 'not-retrieved')?.SourceID;

let n = 0;
const row = (polymer, category, agent, verdict, extra = {}) => ({
  PolymerEnvironmentID: `PB${String(++n).padStart(5, '0')}`, PolymerID: polymer, Category: category, Agent: agent,
  Conditions: 'Not published', Verdict: verdict, Finding: `${verdict} to ${agent} (fixture)`, SourceID: RETRIEVED, Locator: 'fixture', Notes: 'Not applicable',
  __file: 'data/tables/polymer_environment.csv', __row: n + 1, __numbers: {}, ...extra,
});

function built(rows, { estimates = true } = {}) {
  const wb = structuredClone(base);
  wb['Polymer environment'].rows = rows;
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates });
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.code} ${i.where}: ${i.message}`) };
}

// ---------------------------------------------------------------- the verdict rule

test('a category verdict: screens only where nothing in the class is resisted, all resistant is resistant, anything else is limited', () => {
  const a = (verdict, screens = verdict === 'not-resistant' || verdict === 'soluble') => ({ verdict, screens });
  assert.equal(categoryVerdict([a('resistant'), a('resistant')]), 'resistant');
  assert.equal(categoryVerdict([a('resistant'), a('limited')]), 'limited');
  assert.equal(categoryVerdict([a('absorbs')]), 'limited');
  assert.equal(categoryVerdict([a('stabilised-required'), a('resistant')]), 'limited');
  // PETG: resistant to 30% sulfuric acid, attacked by concentrated: the class is partly resisted, so it does not screen.
  assert.equal(categoryVerdict([a('resistant'), a('not-resistant')]), 'limited');
  // PA6: attacked at 2%, limited at best: nothing in the class is resisted, so it screens.
  assert.equal(categoryVerdict([a('limited'), a('not-resistant')]), 'not-resistant');
  assert.equal(categoryVerdict([a('not-resistant')]), 'not-resistant');
  assert.equal(categoryVerdict([a('limited'), a('soluble')]), 'soluble');
  assert.equal(categoryVerdict([a('not-resistant'), a('soluble')]), 'soluble');
  assert.equal(categoryVerdict([a('resistant'), a('soluble')]), 'limited');
  assert.equal(categoryVerdict([]), null);
});

// ---------------------------------------------------------------- compile

test('with the empty table the build carries no trace of the layer', () => {
  const { db, errors } = built([]);
  assert.deepEqual(errors, []);
  assert.equal(db.polymerEnvironment, undefined);
  assert.equal(db.polymerEvidence, undefined);
  assert.ok(db.materials.every((m) => !('polymer' in m.evidenceIds)));
  assert.ok(Object.values(db.meta.environmentCategories).every((c) => !('polymerMaterials' in c)));
  assert.ok(!('polymerEnvironment' in db.meta.counts));
});

test('the built database has no polymer layer while data/tables/polymer_environment.csv is header-only', () => {
  const rows = readFileSync(join(root, 'data/tables/polymer_environment.csv'), 'utf8').trim().split('\n').length - 1;
  const dbPath = join(root, 'dist/db.json');
  if (!existsSync(dbPath)) throw new Error('dist/db.json is missing. Run `npm run build` first.');
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  if (rows === 0) {
    assert.equal(db.polymerEnvironment, undefined);
    assert.equal(db.polymerEvidence, undefined);
  } else {
    assert.equal(db.polymerEnvironment.length, rows);
  }
});

test('records attach only where the material names the polymer and has no record of its own in the category', () => {
  const { db, errors } = built([row('PLA', 'acid', 'acetic acid 10 %', 'resistant'), row('PLA', 'organic-solvent', 'acetone', 'not-resistant'), row('PETG', 'acid', 'sulphuric acid 10 %', 'resistant')]);
  assert.deepEqual(errors, []);
  assert.equal(db.polymerEnvironment.length, 3);
  const own = (m, cat) => db.evidence.some((e) => e.materialId === m.id && e.category === cat);
  for (const m of db.materials.filter((x) => !x.familyEntry)) {
    const mine = db.polymerEvidence.filter((p) => p.materialId === m.id);
    assert.deepEqual(mine.map((p) => p.id), m.evidenceIds.polymer, m.name);
    for (const p of mine) {
      assert.equal(p.polymerId, m.estimateIdentity, `${m.name} ${p.id}`);
      assert.equal(own(m, p.category), false, `${m.name} has its own ${p.category} record but got a polymer-level one`);
      assert.equal(p.evidenceType, POLYMER_EVIDENCE_TYPE);
      assert.equal(p.inferred, true);
      assert.ok(p.agents.length >= 1 && p.agents.every((a) => a.polymerId === p.polymerId && a.category === p.category));
    }
    // Every category the polymer publishes and the material lacks is attached, none other.
    const expected = ['PLA', 'PETG'].includes(m.estimateIdentity)
      ? db.polymerEnvironment.filter((r) => r.polymerId === m.estimateIdentity).map((r) => r.category).filter((c, i, a) => a.indexOf(c) === i && !own(m, c)).sort()
      : [];
    assert.deepEqual(mine.map((p) => p.category).sort(), expected, m.name);
  }
  // At least one PLA-family material gets the solvent screen, and at least one with its own record does not.
  const solvent = db.polymerEvidence.filter((p) => p.category === 'organic-solvent');
  assert.ok(solvent.length > 0 && solvent.every((p) => p.verdict === 'not-resistant' && p.screens));
  const withOwn = db.materials.find((m) => m.estimateIdentity === 'PLA' && own(m, 'organic-solvent'));
  assert.ok(withOwn, 'a PLA material with its own solvent record exists in the data');
  assert.ok(!solvent.some((p) => p.materialId === withOwn.id));
  // Meta: every filterable category says how many materials it covers from the base polymer.
  assert.equal(db.meta.environmentCategories.acid.polymerMaterials, db.polymerEvidence.filter((p) => p.category === 'acid').length);
  assert.equal(db.meta.counts.polymerEnvironment, 3);
});

test('the core alone, without the estimate stage, still validates with the layer attached', () => {
  const { db, errors } = built([row('PLA', 'acid', 'acetic acid 10 %', 'resistant')], { estimates: false });
  assert.deepEqual(errors, []);
  assert.ok(db.polymerEvidence.length > 0);
});

test('the compiler refuses an unknown polymer, an unretrieved source, a fatigue or creep category, and a bad verdict', () => {
  const issues = [];
  const polymers = [{ id: 'PLA' }];
  const sources = [{ id: 'S-OK', citationRole: 'cited', accessStatus: 'Retrieved' }, { id: 'S-NO', citationRole: 'not-retrieved', accessStatus: 'Not retrieved: HTTP 404' }, { id: 'S-STATUS', citationRole: 'cited', accessStatus: 'Not retrieved: HTTP 403 on 2026-09-13' }];
  const good = { ...row('PLA', 'acid', 'a', 'resistant'), SourceID: 'S-OK' };
  const out = compilePolymerEnvironment([
    good,
    { ...row('PA6', 'acid', 'a', 'resistant'), SourceID: 'S-OK' },
    { ...row('PLA', 'alkali', 'a', 'resistant'), SourceID: 'S-NO' },
    { ...row('PLA', 'alkali', 'b', 'resistant'), SourceID: 'S-STATUS' },
    { ...row('PLA', 'alkali', 'c', 'resistant'), SourceID: 'S-MISSING' },
    { ...row('PLA', 'fatigue', 'a', 'resistant'), SourceID: 'S-OK' },
    { ...row('PLA', 'creep', 'a', 'resistant'), SourceID: 'S-OK' },
    { ...row('PLA', 'application', 'a', 'resistant'), SourceID: 'S-OK' },
    { ...row('PLA', 'oil-grease', 'a', 'excellent'), SourceID: 'S-OK' },
    { ...row('PLA', 'acid', ' A ', 'limited'), SourceID: 'S-OK' },
  ], { polymers, sources, issues });
  assert.deepEqual(out.map((r) => r.id), [good.PolymerEnvironmentID]);
  assert.equal(out[0].categoryLabel, 'Acid resistance');
  const codes = issues.map((i) => i.code);
  assert.deepEqual(codes, ['POLYMER-ENV-REFERENCE', 'POLYMER-ENV-REFERENCE', 'POLYMER-ENV-REFERENCE', 'POLYMER-ENV-REFERENCE', 'POLYMER-ENV-CATEGORY', 'POLYMER-ENV-CATEGORY', 'POLYMER-ENV-CATEGORY', 'POLYMER-ENV-VERDICT', 'POLYMER-ENV-DUPLICATE']);
  assert.ok(issues.every((i) => i.level === 'error'));
  assert.match(issues[1].message, /was not retrieved/);
  assert.match(issues[4].message, /parts under load/);
});

test('a real build with a bad row fails, and a duplicate (polymer, category, agent) is refused', () => {
  assert.ok(built([row('PLA', 'fatigue', 'a', 'resistant')]).errors.some((e) => e.startsWith('POLYMER-ENV-CATEGORY')));
  assert.ok(built([row('PLA', 'acid', 'a', 'resistant'), row('PLA', 'acid', 'a', 'limited')]).errors.some((e) => e.startsWith('POLYMER-ENV-DUPLICATE')));
  if (NOT_RETRIEVED) assert.ok(built([row('PLA', 'acid', 'a', 'resistant', { SourceID: NOT_RETRIEVED })]).errors.some((e) => e.startsWith('POLYMER-ENV-REFERENCE')));
});

test('attaching to a material that already has a record in the category is refused by the validator, not only avoided', () => {
  const { db } = built([row('PLA', 'acid', 'a', 'resistant')]);
  const p = db.polymerEvidence[0];
  const m = db.materials.find((x) => x.id === p.materialId);
  // Forge a grade-level record in that category and re-validate: precedence must be an invariant.
  db.evidence.push({ ...db.evidence[0], id: 'Q99999', materialId: m.id, category: p.category });
  const issues = validate(db, structuredClone(base));
  assert.ok(issues.some((i) => i.code === 'POLYMER-ENV-PRECEDENCE' && /takes precedence/.test(i.message)));
});

test('the layer is removable: dropping it leaves every other record as it was', () => {
  const plain = built([]).db;
  const { db } = built([row('PLA', 'acid', 'a', 'resistant')]);
  delete db.polymerEnvironment; delete db.polymerEvidence;
  delete db.meta.counts.polymerEnvironment; delete db.meta.counts.polymerEvidence;
  for (const m of db.materials) delete m.evidenceIds.polymer;
  for (const c of Object.values(db.meta.environmentCategories)) delete c.polymerMaterials;
  assert.deepEqual(db.materials.map((m) => m.evidenceIds), plain.materials.map((m) => m.evidenceIds));
  assert.deepEqual(db.evidence, plain.evidence);
  assert.deepEqual(db.meta.environmentCategories, plain.meta.environmentCategories);
});

// ---------------------------------------------------------------- engine

const rowsOf = (verdict, agent = 'acetone') => [{ id: 'PB00001', polymerId: 'PLA', category: 'organic-solvent', categoryLabel: 'Organic solvent resistance', agent, conditions: null, verdict, screens: verdict === 'not-resistant' || verdict === 'soluble', finding: 'fixture', sourceId: 'S-REF', locator: 'p. 1', notes: null }];
const polymerRecord = (verdict) => ({
  id: 'M-organic-solvent', materialId: 'M', polymerId: 'PLA', category: 'organic-solvent', categoryLabel: 'Organic solvent resistance',
  verdict, screens: verdict === 'not-resistant' || verdict === 'soluble', evidenceType: POLYMER_EVIDENCE_TYPE, inferred: true, agents: rowsOf(verdict), sourceIds: ['S-REF'],
});
const ctxWith = ({ own = [], polymer = null, policy = UNKNOWN_POLICY.EXPLORATION, inference = true } = {}) => ({
  db: { meta: { environmentCategories: { 'organic-solvent': { kind: 'verdict', label: 'Organic solvent resistance' } } } },
  evidenceByMaterial: new Map([['M', own.map((r, i) => ({ id: `Q${i}`, materialId: 'M', category: 'organic-solvent', ...r }))]]),
  polymerEvidenceByMaterial: new Map([['M', polymer ? [polymer] : []]]),
  unknownPolicy: policy, useEstimates: policy === UNKNOWN_POLICY.EXPLORATION && inference,
});
const solvent = { kind: 'environment', category: 'organic-solvent' };
const m = { id: 'M' };

test('a polymer-level "resistant" leaves the material UNKNOWN, with a reason naming the polymer and the reference', () => {
  const r = evaluateConstraint(m, solvent, ctxWith({ polymer: polymerRecord('resistant') }));
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.equal(r.polymer, true);
  assert.equal(r.screened, undefined);
  assert.match(r.reason, /base polymer PLA is published as resistant \(resistant to acetone; S-REF\)/);
  assert.match(r.reason, /never enough to pass/);
  const e = evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('resistant') }));
  assert.equal(e.verdict, STATUS.UNKNOWN);
  assert.equal(e.eligible, true);
  assert.equal(e.usesPolymer, true);
  assert.equal(e.screened, false);
  // Limited likewise.
  assert.equal(evaluateConstraint(m, solvent, ctxWith({ polymer: polymerRecord('limited') })).status, STATUS.UNKNOWN);
});

test('a polymer-level "not-resistant" screens under Include uncertain with inference on, and only then', () => {
  const on = evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('not-resistant') }));
  assert.equal(on.verdict, STATUS.UNKNOWN, 'inference never becomes a FAIL');
  assert.equal(on.screened, true);
  assert.equal(on.eligible, false);
  assert.deepEqual(on.screenedBy, ['Organic solvent resistance evidence']);
  assert.match(on.results[0].reason, /not resistant \(not resistant to acetone; S-REF\).*Screened out; not tested on this grade/);
  assert.equal(on.results[0].polymerScreen, true);
  assert.deepEqual(runSelection([m], [solvent], ctxWith({ polymer: polymerRecord('not-resistant') })).counts, { pass: 0, fail: 0, unknown: 1, screened: 1, total: 1 });

  const off = evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('not-resistant'), inference: false }));
  assert.equal(off.verdict, STATUS.UNKNOWN);
  assert.equal(off.screened, false);
  assert.equal(off.eligible, true);
  assert.match(off.results[0].reason, /would screen this material out with inference on/);

  const strict = evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('not-resistant'), policy: UNKNOWN_POLICY.STRICT }));
  assert.equal(strict.verdict, STATUS.UNKNOWN);
  assert.equal(strict.screened, false);
  assert.equal(strict.eligible, false, 'Confirmed only holds every UNKNOWN out, as today');
  assert.deepEqual(strict.heldBy, ['Organic solvent resistance evidence']);

  // Soluble screens the same way.
  assert.equal(evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('soluble') })).screened, true);
  // Why excluded counts it apart from an estimate's screen.
  const [x] = explainExclusions([m], [solvent], ctxWith({ polymer: polymerRecord('not-resistant') }));
  assert.equal(x.screened, 1);
  assert.equal(x.screenedByPolymer, 1);
});

test('a grade-level record always wins over the polymer-level one', () => {
  const pass = evaluateConstraint(m, solvent, ctxWith({ own: [{ verdict: 'resistant' }], polymer: polymerRecord('not-resistant') }));
  assert.equal(pass.status, STATUS.PASS);
  assert.equal(pass.polymer, undefined);
  const fail = evaluateConstraint(m, solvent, ctxWith({ own: [{ verdict: 'not-resistant' }], polymer: polymerRecord('resistant') }));
  assert.equal(fail.status, STATUS.FAIL);
  const narrative = evaluateConstraint(m, solvent, ctxWith({ own: [{ verdict: 'narrative' }], polymer: polymerRecord('not-resistant') }));
  assert.equal(narrative.status, STATUS.UNKNOWN);
  assert.equal(narrative.screened, undefined, 'a narrative record of the material itself keeps the polymer out');
});

test('the screened chip names the kind of screen with the criterion after its prefix', () => {
  const e = evaluateMaterial(m, [solvent], ctxWith({ polymer: polymerRecord('not-resistant') }));
  const chip = screenedChip(e);
  assert.equal(chip.text, `${SCREEN_PREFIX.polymer}: Resists solvents. Not a failure; not tested on this grade.`);
  assert.equal(chip.action, 'polymer');
  assert.deepEqual(screenedByKind(e), { estimate: [], polymer: ['Resists solvents'] });
  assert.match(chip.text, /^Screened by (an estimate|the base polymer's published behaviour): \S/);
});
