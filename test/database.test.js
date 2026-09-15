// Invariants on the compiled database. These are the rules that would decay silently, because
// nothing crashes when a build starts asserting something it should not.
//
// Requires dist/db.json, so run `npm run build` first.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate } from '../build/src/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'dist/db.json');
let db = null;

before(() => {
  if (!existsSync(dbPath)) throw new Error('dist/db.json is missing. Run `npm run build` first.');
  db = JSON.parse(readFileSync(dbPath, 'utf8'));
});

const HEADLINE_PROPERTY = {
  density: ['Density'],
  tensileModulusXY: ['Tensile modulus'],
  tensileStrengthXY: ['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength'],
  elongationXY: ['Elongation at break', 'Elongation at yield'],
  hdt045: ['HDT'],
};

test('every numeric headline equals the measurement it cites', () => {
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  let checked = 0;
  for (const mat of db.materials) {
    for (const key of Object.keys(HEADLINE_PROPERTY)) {
      const h = mat.headline[key];
      if (!h?.known) continue;
      assert.ok(h.verified, `${mat.name} ${key} is not verified against a citation`);
      assert.equal(byId.get(h.measurementId).value, h.value, `${mat.name} ${key}`);
      checked++;
    }
  }
  // 369 since the 2026-09-13 missing-data research: PLA Lite 4, PLA Silk 3, CoPE 3, PET-GF 5, CPE 2
  // and nGen 3 on top of the manufacturer audit's 349.
  // 380 since the 2026-09-13 estimate-evidence research: PETG-GF +3, ASA-GF +4, POM +4.
  // 361 since the duplicate-products fix: PA, CoPA, PA-CF, PA-GF and TPE became family entries, and the
  // 19 headlines they held were copies of headlines PA6/66, PA12-CF, PA6-GF and TPC / TPEE still hold.
  // The count follows the data: one per value selection in data/tables/headlines.csv. A headline the
  // compiler dropped, or one it invented, still fails here; adding a headline row no longer does.
  const selections = readFileSync(join(root, 'data/tables/headlines.csv'), 'utf8').split('\n').filter((l) => l.endsWith(',value')).length;
  assert.equal(checked, selections);
  assert.ok(checked >= 361, 'no audited headline has gone missing since the duplicate-products fix');
});

// Regression: falling back to Vicat or glass transition surfaced TPE's -35 C glass transition in a
// column headed "HDT at 0.45 MPa". The Method sheet keeps those quantities distinct.
test('related evidence is always the same property as its column', () => {
  for (const mat of db.materials) {
    for (const [key, props] of Object.entries(HEADLINE_PROPERTY)) {
      const r = mat.headline[key]?.related;
      if (!r) continue;
      for (const i of r.items) {
        assert.ok(props.includes(i.property),
          `${mat.name} ${key} offers a ${i.property} measurement as related evidence`);
      }
    }
  }
});

test('no related evidence carries a negative value into a positive-only column', () => {
  for (const mat of db.materials) {
    for (const key of ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY']) {
      const r = mat.headline[key]?.related;
      if (!r) continue;
      assert.ok(r.best.value >= 0, `${mat.name} ${key} = ${r.best.value}`);
    }
  }
});

// Regression: PEBA's three grades measure 7.5, 25 and 30 MPa. Summarising that as "7.5 to 30"
// reads as one material's uncertainty rather than three different products. The Method sheet's
// Comparison / Headlines rule forbids cross-grade family ranges.
test('related evidence reports one measurement, never a cross-grade range', () => {
  for (const mat of db.materials) {
    for (const key of Object.keys(HEADLINE_PROPERTY)) {
      const r = mat.headline[key]?.related;
      if (!r) continue;
      assert.ok(r.best && typeof r.best.value === 'number', `${mat.name} ${key} has no single best measurement`);
      assert.ok(r.best.gradeId, 'the reported measurement names its grade');
      assert.equal(r.min, undefined, `${mat.name} ${key} still exposes a range`);
      assert.equal(r.max, undefined, `${mat.name} ${key} still exposes a range`);
    }
  }
});

test('related evidence never appears where a headline exists', () => {
  for (const mat of db.materials) {
    for (const key of Object.keys(HEADLINE_PROPERTY)) {
      const h = mat.headline[key];
      if (h?.known) assert.equal(h.related, undefined, `${mat.name} ${key}`);
    }
  }
});

test('quarantined measurements stay out of headlines and related evidence', () => {
  const quarantined = new Set(db.measurements.filter((m) => m.quarantined).map((m) => m.id));
  assert.ok(quarantined.size > 0, 'the snapshot should still contain quarantined rows');
  for (const mat of db.materials) {
    for (const h of Object.values(mat.headline)) {
      if (h?.measurementId) assert.ok(!quarantined.has(h.measurementId));
      for (const i of h?.related?.items ?? []) assert.ok(!quarantined.has(i.measurementId));
    }
  }
});

test('the six excluded materials trip the envelope gate on their own evidence', () => {
  const excluded = db.materials.filter((m) => m.excluded);
  assert.ok(excluded.length >= 6, 'the six audited exclusions are still excluded');
  for (const m of excluded) {
    assert.equal(m.gates.nozzle.verdict, 'exceeds', `${m.name} nozzle gate`);
  }
});

test('a material with one fitting grade is printable even when another grade is not', () => {
  const ppsgf = db.materials.find((m) => m.name === 'PPS-GF');
  assert.equal(ppsgf.gates.nozzle.verdict, 'within');
});

test('every HDT headline is either a stated 0.45 MPa or flagged as unstated', () => {
  for (const m of db.materials) {
    const h = m.headline.hdt045;
    if (!h?.known) continue;
    if (h.loadStated) assert.equal(h.loadMPa, 0.45, `${m.name} cites a ${h.loadMPa} MPa load`);
    else assert.equal(h.caveat, 'load-not-stated', `${m.name} has no caveat`);
  }
});

// --- estimates on the compiled snapshot (DECISIONS D43) -----------------------------------------
const byName = (name) => db.materials.find((m) => m.name === name);
const ESTIMATED = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];
const valueOf = (m, k) => (m.headline[k].known ? m.headline[k].value : m.headline[k].estimate?.centre);

test('no in-scope headline is left with nothing: a value, an estimate or a reason it does not apply', () => {
  for (const m of db.materials.filter((x) => !x.excluded && !x.familyEntry)) {
    for (const k of ESTIMATED) {
      const h = m.headline[k];
      assert.ok(h.known || h.estimate || h.notApplicable, `${m.name} ${k} is blank`);
      assert.ok(!(h.known && (h.estimate || h.notApplicable)), `${m.name} ${k} mixes a value with inference`);
      assert.ok(!(h.estimate && h.notApplicable), `${m.name} ${k}`);
    }
  }
  for (const m of db.materials.filter((x) => x.excluded)) {
    assert.ok(ESTIMATED.every((k) => !m.headline[k].estimate), `${m.name} is out of scope`);
  }
});

test('every estimate nests its ranges and cites only its own material or representative product', () => {
  let n = 0;
  for (const m of db.materials) {
    for (const k of ESTIMATED) {
      const e = m.headline[k].estimate;
      if (!e) continue;
      n++;
      assert.ok(e.plausible.lo <= e.lo && e.lo <= e.centre && e.centre <= e.hi && e.hi <= e.plausible.hi, `${m.name} ${k}`);
      assert.ok(['this-grade', 'this-material', 'family'].includes(e.strength) && ['good', 'fair', 'poor'].includes(e.precision), `${m.name} ${k}`);
      assert.equal(e.strength === 'family', e.evidence.length === 0, `${m.name} ${k}`);
      const repF = db.grades.find((g) => g.id === m.representativeGrade)?.formulationKey;
      for (const item of e.evidence.flatMap((ev) => ev.items).filter((i) => i.measurementId)) {
        const x = db.measurements.find((y) => y.id === item.measurementId);
        const f = db.grades.find((g) => g.id === x.gradeId)?.formulationKey;
        assert.ok(x.materialId === m.id || f === repF, `${m.name} ${k} cites ${x.id}`);
      }
    }
  }
  assert.ok(n >= 80, `expected estimates for most gaps, got ${n}`);
});

// The model's promise is its coverage: hide a measured headline, predict it, and the range holds it
// as often as it says. The validator fails the build on drift; this pins the snapshot.
test('the likely and plausible ranges hold hidden measured headlines as often as they say', () => {
  for (const [key, p] of Object.entries(db.meta.estimateModel.properties)) {
    const c = p.calibration;
    assert.ok(c.held >= 40, `${key}: only ${c.held} headlines to calibrate against`);
    assert.ok(Math.abs(c.likelyCoverage - 0.8) <= 0.05, `${key}: likely range holds ${c.likelyCoverage}`);
    assert.ok(c.plausibleCoverage >= 0.93, `${key}: plausible range holds ${c.plausibleCoverage}`);
  }
  // The complaint that started the model: PA-CF strength 38-204 MPa. The product behind that number,
  // CarbonX CF PA12, now lives only under PA12-CF.
  const cf = byName('PA12-CF').headline.tensileStrengthXY.estimate;
  assert.equal(cf.strength, 'this-grade');
  assert.ok(cf.hi / cf.lo < 1.6 && cf.lo > 60 && cf.hi < 110, `PA12-CF strength ${cf.lo}-${cf.hi}`);
});

// --- 2026-09-13 duplicate products: docs/audits/2026-09-13-duplicate-products/ ------------------
test('every commercial product has exactly one home: no data sheet is filed under two materials', () => {
  const homes = new Map();
  for (const g of db.grades.filter((x) => !x.retired)) {
    const k = g.formulationKey || g.sourceId;
    if (!homes.has(k)) homes.set(k, new Set());
    homes.get(k).add(g.materialId);
  }
  const shared = [...homes].filter(([, ms]) => ms.size > 1).map(([k, ms]) => `${k}: ${[...ms].join(', ')}`);
  assert.deepEqual(shared, []);
  // Panchroma Silk PLA and Panchroma CoPE are two columns of one data sheet, not one product.
  assert.equal(byName('CoPE').headline.elongationXY.estimate.sharedWith, null);
});

test('PA, PA-CF, PA-GF, TPE and CoPA are family entries: no product, no value, never a candidate', () => {
  const families = { PA: 'family', 'PA-CF': 'family', 'PA-GF': 'family', TPE: 'family', CoPA: 'alias' };
  for (const [n, kind] of Object.entries(families)) {
    const m = byName(n);
    assert.equal(m.familyEntry?.kind, kind, n);
    assert.ok(m.familyEntry.members.length && m.familyEntry.members.every((x) => x.id && !byName(x.name).familyEntry), n);
    assert.ok(ESTIMATED.every((k) => !m.headline[k].known && !m.headline[k].estimate), `${n} carries a value`);
    assert.equal(db.grades.filter((g) => g.materialId === m.id && !g.retired).length, 0, `${n} owns a grade`);
    assert.equal(m.print.nozzleC, null);
  }
  assert.deepEqual(byName('CoPA').familyEntry.members.map((x) => x.name), ['PA6/66']);
  assert.equal(db.meta.counts.familyEntries, readFileSync(join(root, 'data/tables/family_entries.csv'), 'utf8').trim().split('\n').length - 1);
  assert.equal(db.meta.counts.h2cRelevant, db.materials.filter((m) => m.scope === 'H2C-relevant').length);
});

test('mis-filed products moved to the material they are, with everything recorded against them', () => {
  const at = (gid) => db.grades.find((g) => g.id === gid);
  assert.equal(at('G050-02').product, 'PA6 CF');
  assert.deepEqual(byName('PA6-GF').gradeIds, ['G051-01', 'G051-02', 'G051-03']);
  assert.ok(byName('TPU').gradeIds.includes('G039-03'));
  for (const gid of ['G050-02', 'G051-02', 'G051-03', 'G039-03']) {
    const mid = at(gid).materialId;
    assert.ok(db.measurements.filter((x) => x.gradeId === gid).every((x) => x.materialId === mid), gid);
  }
  for (const gid of ['G062-03', 'G063-01', 'G063-02', 'G044-02', 'G047-01', 'G061-01', 'G062-01', 'G064-02', 'G044-01']) {
    assert.ok(at(gid).retired, gid);
    assert.equal(db.measurements.filter((x) => x.gradeId === gid).length, 0, `${gid} still carries measurements`);
  }
  // Moving a price must not move a price headline with it.
  assert.equal(byName('PA6-GF').headline.priceCADkg.value, 76.99);
  // PA-ESD keeps its own product, and the print window it gets is that product's.
  assert.deepEqual(byName('PA-ESD').gradeIds, ['G064-01']);
  assert.deepEqual([byName('PA-ESD').print.nozzleC.min, byName('PA-ESD').print.nozzleC.max], [265, 285]);
  assert.deepEqual(db.meta.counts.retiredDuplicates, { measurements: 147, evidence: 16 });
});

test('an unstated-load heat headline carries a bracket from its matrix\'s load gap', () => {
  const b = byName('PLA Lite').headline.hdt045.loadBracket;
  assert.equal(b.lo, 53);
  assert.ok(b.hi > 55 && b.hi < 75, `PLA Lite bracket ${b.lo}-${b.hi}`);
  for (const m of db.materials.filter((x) => !x.excluded && !x.familyEntry && x.headline.hdt045?.known)) {
    assert.equal(!!m.headline.hdt045.loadBracket, m.headline.hdt045.loadStated === false, m.name);
  }
});

// Regression: Zytel 101L's moulded 3.1 GPa vetoed screening PA66 out of "stiffness at least 3 GPa".
test('a resin reference never vetoes a screen: implied bounds are the filament\'s own', () => {
  const model = JSON.parse(readFileSync(join(root, 'build/mappings/estimate-model.json'), 'utf8'));
  let bounds = 0;
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      for (const b of h?.impliedBounds ?? []) {
        const x = db.measurements.find((y) => y.id === b.measurementId);
        // Only a printed part or an unstated specimen bounds a printed headline: film strengths once kept PLA a
        // candidate for 140 MPa (audit 2026-09-15, C-02). A state the headline is not in bounds nothing either.
        assert.equal(x.specimenForm, 'printed', `${m.name} ${b.measurementId} is a ${x.specimenForm} specimen`);
        assert.equal(b.lo, x.value, `${m.name} ${b.measurementId} bounds at ${b.lo}, not its published value ${x.value}`);
        // The estimate respects what the material's own data prove (B-16).
        if (h.estimate) assert.ok(h.estimate.plausible.lo >= b.lo * 0.98, `${m.name} ${key} plausible from ${h.estimate.plausible.lo}, below its own ${b.measurementId} ${b.lo}`);
        assert.ok(!annealedBesideAsPrinted(x, db.measurements), `${m.name} ${b.measurementId} is annealed beside an as-printed value`);
        if (key === 'elongationXY') assert.notEqual(moistureState(x.moisture), 'conditioned', `${m.name} ${b.measurementId} is conditioned`);
        assert.equal(x.materialId, m.id, `${m.name} ${key} bound ${b.measurementId} is another material's`);
        assert.ok(model.impliedBounds[key].lowerFrom.some((r) => r.property === x.property), `${m.name} ${key}: ${x.property} does not bound it`);
        bounds++;
      }
    }
  }
  assert.ok(bounds > 0);
});

test('the validator rejects a family entry that owns a product or that the mapping does not describe', () => {
  assert.ok(errorsFor((c) => { mat(c, 'PA-CF').familyEntry = null; mat(c, 'PA-CF').headline.density = { known: false, missing: 'not-published' }; }).some((e) => /no value, no estimate/.test(e)));
});

// Estimates must make sense in tandem across a family, not only one at a time.
test('polyamide estimates follow the physics: melting point orders heat resistance, fibre raises stiffness', () => {
  const hdt = (n) => valueOf(byName(n), 'hdt045');
  assert.ok(hdt('PA66') > hdt('PA612') && hdt('PA612') > hdt('PA12'), `PA66 ${hdt('PA66')}, PA612 ${hdt('PA612')}, PA12 ${hdt('PA12')}`);
  assert.ok(hdt('PA66-CF') > hdt('PA66') + 50 && hdt('PA612-GF') > hdt('PA612') + 40);
  assert.ok(hdt('PA66-CF') < 262 && hdt('PA612-GF') < 218, 'a semicrystalline bar cannot hold above its melting point');
  const stiff = (n) => valueOf(byName(n), 'tensileModulusXY');
  assert.ok(stiff('PA66-CF') > stiff('PA66') * 1.5 && stiff('PA612-GF') > stiff('PA612') * 1.3);
  const stretch = (n) => valueOf(byName(n), 'elongationXY');
  assert.ok(stretch('PA66-CF') < stretch('PA66') && stretch('PA612-GF') < stretch('PA612'));
});

test('an elastomer\'s heat deflection and a support product\'s properties are not applicable, not estimated', () => {
  for (const n of ['TPU 85A', 'TPU 90A', 'TPC / TPEE', 'PEBA', 'OBC']) assert.ok(byName(n).headline.hdt045.notApplicable, n);
  for (const n of ['Support for PLA', 'PVA']) assert.ok(ESTIMATED.filter((k) => !byName(n).headline[k].known).every((k) => byName(n).headline[k].notApplicable), n);
  // A published value beats the rule: TPU has an HDT of its own on record, so it is estimated.
  assert.ok(byName('TPU').headline.hdt045.estimate);
});

test('estimated nozzle and bed windows appear only where nothing is published, and decide nothing', () => {
  for (const m of db.materials) {
    for (const [est, pub, gate] of [['nozzleEstimate', 'nozzleC', 'nozzle'], ['bedEstimate', 'bedC', 'bed']]) {
      if (!m.print[est]) continue;
      assert.equal(m.print[pub], null, m.name);
      assert.equal(m.gates[gate].verdict, 'unknown', m.name);
      assert.ok(m.print[est].lo < m.print[est].hi && m.print[est].peers.length, m.name);
    }
  }
  assert.ok(byName('PA66').print.nozzleEstimate.lo > 262, 'a PA66 nozzle window starts above its melting point');
  assert.ok(byName('PA612-GF').print.nozzleEstimate);
});

// --- 2026-09-13 estimate evidence: docs/audits/2026-09-13-estimate-evidence/ ---------------------
test('values the registered sources publish are recorded as published', () => {
  const x = (id) => db.measurements.find((m) => m.id === id);
  assert.equal(x('V000605').value, 80, 'ISO 11357 80 °C, not 1135780');
  assert.equal(x('V000039').value, 110.3);
  assert.match(x('V000039').specimenType, /^Film specimen/);
  assert.equal(x('V000507').value, 72, 'Vicat A/120 at 72 °C');
  for (const n of ['PLA', 'PP', 'PP-GF', 'PA12-CF', 'PVDF', 'PC-ABS']) {
    const h = byName(n).headline.hdt045;
    assert.ok(h.loadStated && h.loadMPa === 0.45, `${n}: 3DXTECH prints "at 0.45 MPa (66psi)"`);
  }
  assert.ok(db.meta.estimateModel.rejected.length === 0, 'no physically impossible value remains');
});

test('PETG-GF, ASA-GF and POM carry printed headlines from their new representative grades', () => {
  const g = (n) => byName(n).representativeGrade;
  assert.equal(g('PETG-GF'), 'G025-02');
  assert.deepEqual(ESTIMATED.slice(0, 4).map((k) => byName('PETG-GF').headline[k].value), [1330, 2.3345, 53.6, 1.9]);
  assert.equal(g('ASA-GF'), 'G034-03');
  assert.deepEqual(ESTIMATED.map((k) => byName('ASA-GF').headline[k].value), [1110, 2.758, 39, 5.8, 98]);
  assert.equal(g('POM / Acetal'), 'G087-02');
  assert.deepEqual(ESTIMATED.slice(0, 4).map((k) => byName('POM / Acetal').headline[k].value), [1420, 1.87, 50, 11]);
});

test('resin references are study grades whose moulded values never become headlines', () => {
  for (const id of ['G055-R1', 'G058-R1', 'G087-R1']) {
    const grade = db.grades.find((x) => x.id === id);
    const m = db.materials.find((x) => x.id === grade.materialId);
    assert.ok(!m.gradeIds.includes(id), `${id} is not a procurement grade`);
    const rows = db.measurements.filter((x) => x.gradeId === id);
    assert.ok(rows.length && rows.every((x) => x.specimenType === 'Raw material value'), id);
    for (const k of ESTIMATED) assert.ok(!rows.some((x) => x.id === m.headline[k].measurementId), `${id} backs ${k}`);
  }
  assert.equal(byName('PA66').headline.tensileModulusXY.estimate.strength, 'this-material');
});

// --- 2026-09-13 manufacturer audit --------------------------------------------------------------
// docs/audits/2026-09-13-manufacturer-evidence/. Each test pins one change from its CHANGELOG.csv, so
// a later data edit that silently undoes one fails here rather than in front of a user.

test('the four audited grades, their profiles and their properties are compiled', () => {
  for (const [grade, material, profile] of [['G077-01', 'M077', 'P0157'], ['G038-02', 'M038', 'P0158'], ['G045-03', 'M045', 'P0159'], ['G073-02', 'M073', 'P0160']]) {
    assert.equal(db.grades.find((g) => g.id === grade)?.materialId, material, grade);
    assert.equal(db.profiles.find((p) => p.id === profile)?.gradeId, grade, profile);
  }
  const added = db.measurements.filter((m) => m.id >= 'V001808' && m.id <= 'V001899');
  assert.equal(added.length, 92);
});

// Regression: the quarantine moved the ABS median but the row still cited CA0069, and a wrong-product
// listing could still have been the buy link or the proof that ABS was in stock.
test('a quarantined price observation backs no headline, buy link or stock claim', () => {
  const q = db.prices.find((p) => p.id === 'CA0069');
  assert.ok(q.quarantined);
  const abs = db.materials.find((m) => m.id === q.materialId);
  assert.ok(!abs.headline.priceCADkg.priceIds.includes('CA0069'));
  assert.equal(abs.headline.priceCADkg.value, 25.99);
  for (const m of db.materials) {
    if (m.buy) assert.ok(!db.prices.some((p) => p.quarantined && p.url === m.buy.url && p.materialId === m.id), m.name);
  }
});

test('a qualitative result is evidence, never a number', () => {
  const noBreak = db.measurements.find((m) => m.id === 'V001899');
  assert.equal(noBreak.qualitative, true);
  assert.equal(noBreak.numeric, false);
  assert.equal(noBreak.value, null);
});

test('the corrected Bambu notch records carry their corrected state', () => {
  const byId = (id) => db.measurements.find((m) => m.id === id);
  assert.equal(byId('V000342').notch, 'Notched');
  assert.equal(byId('V000343').notch, 'Not published');
  assert.match(byId('V000717').locator, /notched/i);
});

// The Essentium profile needs 400 °C. The material stays printable through its other grade, but the
// profile itself must say it exceeds the printer rather than borrow the material's verdict.
test('an over-temperature audited profile exceeds the nozzle gate on its own', () => {
  assert.equal(db.profiles.find((p) => p.id === 'P0160').gates.nozzle.verdict, 'exceeds');
});

test('the snapshot comes from the Method sheet', () => {
  const row = db.method.find((r) => r.section === 'Scope' && r.topic === 'Snapshot');
  assert.ok(row, 'Method has a Scope / Snapshot row');
  assert.ok(row.rule.startsWith(db.meta.snapshot));
});

// --- 2026-09-13 missing-data research -----------------------------------------------------------
// docs/audits/2026-09-13-missing-data-research/. Each test pins one decision from RESPONSE.md.

// The chamber row in every Bambu data sheet is the first row after a page break, and none was
// transcribed. The re-fetched files match the recorded SHA-256, so these are omissions, not new
// evidence. PC FR and PAHT-CF reach their whole window.
test('chamber windows recovered from the cited Bambu data sheets are compiled', () => {
  const byName = (n) => db.materials.find((m) => m.name === n);
  for (const [name, min, max] of [['PLA Basic', 25, 45], ['PETG HF', 35, 50], ['PC FR', 45, 60], ['PAHT-CF', 45, 60], ['Support for PA/PET', 45, 60]]) {
    assert.deepEqual([byName(name).print.chamberC?.min, byName(name).print.chamberC?.max], [min, max], name);
    assert.equal(byName(name).gates.chamber.verdict, 'within', name);
  }
});

// Regression: a 60-90 °C chamber window was read by its upper end alone, so a material whose own
// window starts below the H2C's 65 °C failed outright. ABS-CF (50-70 °C) did, before this research.
test('a chamber window the H2C only partly reaches is partial, never within and never a failure', () => {
  for (const name of ['PPS-CF', 'PPA-CF', 'ABS-CF']) {
    const g = db.materials.find((m) => m.name === name).gates.chamber;
    assert.equal(g.verdict, 'partial', name);
    assert.match(g.reason, /reaches only/, name);
  }
});

test('a "-" in a data sheet is no setpoint, not zero and not "not required"', () => {
  const tpc = db.materials.find((m) => m.name === 'TPC / TPEE');
  assert.equal(tpc.gates.chamber.verdict, 'unknown');
  assert.equal(tpc.print.chamberGuidance.state, 'no-setpoint');
  assert.equal(tpc.print.chamberC, null);
});

// A source that says an enclosure is not necessary has said no heated chamber is needed. One that
// recommends an enclosure has said nothing about 65 °C.
test('enclosure guidance clears the chamber only when it says an enclosure is not needed', () => {
  for (const p of db.profiles.filter((x) => x.chamber.fromEnclosure)) {
    assert.equal(p.enclosureState, 'not-needed', p.id);
    assert.equal(p.gates.chamber.verdict, 'within', p.id);
  }
  for (const p of db.profiles.filter((x) => x.enclosureState === 'recommended' && x.chamber.state === 'unknown')) {
    assert.equal(p.gates.chamber.verdict, 'unknown', p.id);
  }
});

test('CoPE is its own grade, no longer a copy of CPE', () => {
  const cope = db.materials.find((m) => m.name === 'CoPE');
  const cpe = db.materials.find((m) => m.name === 'CPE');
  assert.equal(cope.representativeGrade, 'G091-02');
  for (const key of ['density', 'tensileModulusXY', 'tensileStrengthXY']) {
    assert.equal(cope.headline[key].gradeId, 'G091-02', key);
  }
  assert.notEqual(cope.headline.density.gradeId, cpe.headline.density.gradeId);
});

// The Fiberon page headlines 133.7 °C. That figure is annealed; as printed it is 81.6 °C. Both are
// on record and the headline is the one a printed part has.
test('an annealed value is not averaged with its as-printed twin, and mixed schedules are not a precise mean', () => {
  // PET-GF15's 81.6 and 133.7 °C once became one observation of 107.65 °C, an outlier warning and a conflict; PPS-GF's
  // HDT after annealing at 130 and at 230 °C became one precise mean (audit 2026-09-15, C-01).
  const { conflicts, outliers } = db.meta.estimateModel;
  const flagged = conflicts.flatMap((c) => c.measurementIds);
  for (const id of ['V001933', 'V001932', 'V000353', 'V000352']) assert.ok(!flagged.includes(id), `${id} (annealed) is still averaged into an observation`);
  assert.ok(!conflicts.some((c) => ['PLA-GF', 'PPS-GF'].includes(c.material) && c.key === 'hdt045'), 'a mixed-state HDT group still conflicts');
  assert.ok(!outliers.some((o) => o.material === 'PET-GF'), 'PET-GF is still an outlier');
});

test('PPA headlines its as-printed heat deflection, and its annealed value stays evidence', () => {
  // IPCON PPA prints "103 °C; 131 °C (annealed)"; only 131 °C was transcribed and it was the headline (B-05, m21).
  const ppa = db.materials.find((m) => m.name === 'PPA');
  assert.equal(ppa.headline.hdt045.value, 103);
  assert.equal(ppa.headline.hdt045.postProcessing, 'As printed');
  const annealed = db.measurements.find((m) => m.id === 'V001289');
  assert.equal([annealed.value, annealed.postProcessingState].join(' '), '131 annealed');
});

test('PET-GF15 keeps its as-printed and annealed HDT apart, and headlines the as-printed one', () => {
  const petgf = db.materials.find((m) => m.name === 'PET-GF');
  assert.equal(petgf.representativeGrade, 'G068-02');
  assert.equal(petgf.headline.hdt045.value, 81.6);
  const hdt = db.measurements.filter((m) => m.gradeId === 'G068-02' && m.property === 'HDT' && m.thermal.loadMPa === 0.45);
  assert.deepEqual(hdt.map((m) => [m.value, m.postProcessing.split(' ')[0]]).sort(), [[133.7, 'Annealed'], [81.6, 'As']]);
});

// The nGen TDS footnotes its density and HDT as raw-material supplier data. The printed XY values
// are headlines; the supplier values are related evidence and say why.
test('raw-material supplier values never become headlines', () => {
  const ngen = db.materials.find((m) => m.name === 'nGen / Amphora');
  assert.equal(ngen.headline.tensileModulusXY.value, 1.7);
  for (const key of ['density', 'hdt045']) {
    assert.equal(ngen.headline[key].known, false, key);
    assert.match(ngen.headline[key].related.best.why, /raw-material/, key);
  }
  for (const mat of db.materials) {
    for (const [key, h] of Object.entries(mat.headline)) {
      if (h?.known && h.specimenType) assert.ok(!h.specimenType.startsWith('Raw material'), `${mat.name} ${key}`);
    }
  }
});

// Flexural is not tensile: PLA Lite publishes a flexural modulus and no tensile one.
test('a flexural modulus never fills the stiffness headline', () => {
  const lite = db.materials.find((m) => m.name === 'PLA Lite');
  assert.equal(lite.headline.tensileModulusXY.known, false);
  assert.ok(db.measurements.some((m) => m.materialId === lite.id && m.property === 'Flexural modulus'));
});

// A research band is inference about a setpoint. It is shown only where no source says anything
// better, and it changes no verdict.
test('an estimated chamber band never sits beside published evidence and never decides a gate', () => {
  for (const m of db.materials) {
    const e = m.print?.chamberEstimate;
    if (!e) continue;
    assert.equal(m.print.chamberC, null, m.name);
    assert.notEqual(m.print.chamberGuidance?.state, 'not-required', m.name);
    assert.ok(!m.excluded, m.name);
    assert.ok(e.lo < e.hi && e.basis, m.name);
    assert.ok(['unknown'].includes(m.gates.chamber.verdict), `${m.name}: a band sits on a material whose gate says ${m.gates.chamber.verdict}`);
  }
  const ppa = db.materials.find((m) => m.name === 'PPA');
  assert.equal(ppa.print.chamberEstimate.lo, 80);
  assert.equal(ppa.gates.chamber.verdict, 'unknown');
});

// --- 2026-09-13 coverage consolidation ----------------------------------------------------------
// docs/audits/2026-09-13-coverage-consolidation/. The validator now checks that every record points
// at the right material. Each test below breaks a copy of the snapshot in one way and requires the
// validator to name it, so a check that silently stopped firing would fail here.


const errorsFor = (mutate) => {
  const copy = structuredClone(db);
  mutate(copy);
  return validate(copy).filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`);
};
const mat = (copy, name) => copy.materials.find((m) => m.name === name);

test('the consolidated snapshot passes every consistency check', () => {
  assert.deepEqual(errorsFor(() => {}), []);
});

test('a headline citing another material, or another grade, is an error', () => {
  assert.ok(errorsFor((c) => { mat(c, 'PC FR').headline.density.measurementId = mat(c, 'PLA Basic').headline.density.measurementId; })
    .some((e) => /Headline density cites .* a measurement of/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PET-GF').representativeGrade = 'G068-01'; })
    .some((e) => /not the representative grade G068-01/.test(e)));
});

test('a record filed under the wrong material is an error', () => {
  assert.ok(errorsFor((c) => { c.measurements.find((m) => m.gradeId === 'G036-01').materialId = 'M035'; })
    .some((e) => /its grade G036-01 belongs to M036/.test(e)));
});

test('a procurement grade missing from GradeIDs is an error; a study grade is not', () => {
  assert.ok(errorsFor((c) => { mat(c, 'CoPE').gradeIds = []; }).some((e) => /G091-02 belongs to this material/.test(e)));
  assert.ok(!db.materials.find((m) => m.name === 'PA12').gradeIds.some((g) => /-R\d+$/.test(g)));
});

test('guidance that does not quote its printing evidence is an error', () => {
  assert.ok(errorsFor((c) => { mat(c, 'PC FR').guidance.chamber = 'Not published'; })
    .some((e) => /chamber guidance "Not published" is not what its printing evidence P0044 says/.test(e)));
});

// Regression: the Environmental evidence column held a copy of family application notes for 31
// materials, and PC FR's coverage said "Evidence recorded" on the strength of polycarbonate's notes.
test('environmental evidence and coverage describe only the material\'s own records', () => {
  const pcfr = db.materials.find((m) => m.name === 'PC FR');
  const own = db.evidence.filter((e) => e.materialId === pcfr.id);
  assert.deepEqual(own.filter((e) => e.category === 'acid').map((e) => e.finding), ['Not resistant']);
  assert.ok(pcfr.evidenceIds.environmental.every((id) => own.some((e) => e.id === id)));
  assert.ok(errorsFor((c) => { mat(c, 'PC FR').evidenceIds.environmental = ['Q00290']; }).some((e) => /Environmental evidence cites "Q00290"/.test(e)));
  assert.ok(errorsFor((c) => { c.coverage.find((x) => x.id === 'C00435').status = 'Gap'; }).some((e) => /C00435.*Print setup says "Gap" beside/.test(e)));
  assert.ok(errorsFor((c) => { c.coverage.find((x) => x.id === 'C00428').status = 'Evidence recorded'; }).some((e) => /C00428.*has no record of its own/.test(e)));
});

// The recovered chemical rows differ by material; a family default would have been wrong for these.
test('recovered Bambu chemical records keep each data sheet\'s own verdict', () => {
  const finding = (name, topic) => db.evidence.find((e) => e.materialId === db.materials.find((m) => m.name === name).id && e.topic === topic)?.finding;
  assert.equal(finding('ABS-GF', 'Resistance to Acid'), 'Resistant');
  assert.equal(finding('PPS-CF', 'Resistance to Organic Solvent'), 'Resistant');
  assert.equal(finding('PVA', 'Solubility'), 'Soluble in water');
  assert.equal(finding('PLA Tough+', 'Resistance to Alkali'), 'Not resistant');
});

// Systematic data audit: use the actual source tables, then introduce independent corruption.
import { loadTables } from '../build/src/load.js';
import { measurementIssues, rawNumber } from '../build/src/measurement-rules.js';
import { normalQuantile, boundedQuantile, modulusFromShore, kindOf } from '../build/src/estimates.js';
import { annealedBesideAsPrinted } from '../build/src/normalize/specimen.js';
import { moistureState } from '../build/src/normalize/moisture.js';

test('raw values reconcile, including decimal commas and grouped cycle counts', () => {
  const wb=loadTables(join(root,'data'));
  assert.deepEqual(measurementIssues(db,wb),[]);
  assert.equal(rawNumber('4,30%'),4.3);
  assert.equal(rawNumber('123,460'),123460);
  assert.equal(rawNumber('24 000 kg/cm2'),24000);
  wb.Properties.rows.find(r=>r.MeasurementID==='V000539')['Normalized value']='4';
  assert.ok(measurementIssues(db,wb).some(e=>e.where.includes('V000539')));
  wb.Properties.rows.find(r=>r.MeasurementID==='V000539')['Normalized value']='4.3';
  wb.Properties.rows.find(r=>r.MeasurementID==='V000539')['Raw numeric']='4';
  assert.ok(measurementIssues(db,wb).some(e=>/cached normalized formula/.test(e.message)));
});

test('corrected source endpoints and qualitative outcomes stay distinct', () => {
  // V000894 was the same record filed under PA; it is a retired duplicate since 2026-09-13.
  assert.ok(!db.measurements.some((m) => m.id === 'V000894'));
  for(const id of ['V000920']){
    const m=db.measurements.find(m=>m.id===id);
    assert.equal(m.property,'Tensile strain at strength'); assert.equal(m.value,4.4);
    assert.ok(!db.materials.flatMap(m=>m.headline.elongationXY.related?.items??[]).some(i=>i.measurementId===id));
  }
  assert.equal(db.measurements.find(m=>m.id==='V001349').value,1.3);
  assert.equal(db.measurements.find(m=>m.id==='V000419').qualitative,true);
  assert.ok(errorsFor(c=>{c.measurements.find(m=>m.id==='V000920').property='Elongation at break';}).some(e=>/endpoint/.test(e)));
});

test('retired CoPE identity is archival, never active procurement or printing evidence', () => {
  const m=mat(db,'CoPE');
  assert.deepEqual(m.gradeIds,['G091-02']);
  assert.ok(!m.profileIds.includes('P0115'));
  assert.equal(db.grades.find(g=>g.id==='G091-01').retired,true);
  assert.equal(db.profiles.find(p=>p.id==='P0115').retired,true);
  assert.ok(errorsFor(c=>{mat(c,'CoPE').gradeIds.push('G091-01');}).some(e=>/retired mapping/.test(e)));
});

test('a headline cannot borrow another property simply because its value matches', () => {
  assert.ok(errorsFor(c=>{const h=mat(c,'PLA Basic').headline.tensileStrengthXY;c.measurements.find(m=>m.id===h.measurementId).property='Flexural strength';}).some(e=>/inconsistent property/.test(e)));
  assert.ok(errorsFor(c=>{const h=mat(c,'PLA Basic').headline.tensileStrengthXY;c.measurements.find(m=>m.id===h.measurementId).unit='GPa';}).some(e=>/inconsistent property/.test(e)));
});

test('the estimate numerics: normal quantiles, soft limits and hardness', () => {
  assert.ok(Math.abs(normalQuantile(0.975) - 1.95996) < 1e-4 && Math.abs(normalQuantile(0.1) + 1.28155) < 1e-4);
  assert.ok(Math.abs(boundedQuantile(10, 2, [], 0.5) - 10) < 1e-9);
  // A soft upper limit pulls the distribution below it without piling it against the limit.
  const hi = boundedQuantile(100, 10, [{ side: 'upper', value: 90, sd: 6 }], 0.9);
  const lo = boundedQuantile(100, 10, [{ side: 'upper', value: 90, sd: 6 }], 0.1);
  assert.ok(hi < 100 && hi - lo > 10, `soft limit gives ${lo}-${hi}`);
  assert.ok(Math.abs(modulusFromShore('95A') - 43.8) < 0.5 && Math.abs(modulusFromShore('45D') - 46.5) < 0.5);
  assert.equal(modulusFromShore('hard'), null);
});

test('evidence kinds: a moulded amorphous bar is converted as amorphous, a Z value is never XY', () => {
  const x = (o) => ({ numeric: true, direction: 'XY', moisture: 'Not published', specimenType: 'Printed specimen', ...o });
  assert.equal(kindOf(x({ property: 'Tensile break strength' }), 'tensileStrengthXY', 'amorphous'), 'break XY');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'Z' }), 'tensileModulusXY', 'amorphous'), 'tensile Z');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'XZ' }), 'tensileModulusXY', 'amorphous'), 'tensile XY');
  // A source's own orientation label never merges into XY or Z (Method, Comparison / Directions; audit 2026-09-15, C-03).
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'horizontal-source-label' }), 'tensileModulusXY', 'amorphous'), 'tensile unk');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'vertical-xz-source-label' }), 'tensileModulusXY', 'amorphous'), 'tensile unk');
  assert.equal(kindOf(x({ property: 'HDT', specimenType: 'Raw material value', thermal: { loadStated: true, loadMPa: 0.455 } }), 'hdt045', 'amorphous'), 'HDT 0.45 moulded amorphous');
  assert.equal(kindOf(x({ property: 'Glass transition temperature' }), 'hdt045', 'semi-unfilled'), null);
  // The moisture state comes from the vocabulary's declared State, not from the wording.
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Conditioned: 70% RH' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile XY wet');
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Wet (conditioning specified in source)' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile XY wet');
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Dry as moulded', specimenType: 'Raw material value' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile moulded');
  assert.throws(() => kindOf(x({ property: 'Tensile modulus', moisture: 'Soaked' }), 'tensileModulusXY', 'semi-unfilled'), /not in schema\/vocab\/moisture-conditions\.csv/);
});

test('the validator rejects a blank headline, a range that does not nest, and evidence from another material', () => {
  assert.ok(errorsFor((c) => { delete mat(c, 'PA66').headline.tensileModulusXY.estimate; }).some((e) => /no value, no estimate/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PA66').headline.tensileModulusXY.estimate.lo = 99; }).some((e) => /outside the likely range/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PA12-CF').headline.tensileStrengthXY.estimate.plausible.hi = 70; }).some((e) => /not inside the plausible range/.test(e)));
  const foreign = db.measurements.find((m) => m.materialId === byName('PLA').id).id;
  assert.ok(errorsFor((c) => { mat(c, 'PA66').headline.tensileModulusXY.estimate.evidence[0].items[0].measurementId = foreign; }).some((e) => /neither this material/.test(e)));
  assert.ok(errorsFor((c) => { c.meta.estimateModel.properties.density.calibration.likelyCoverage = 0.5; }).some((e) => /likely range contains 50%/.test(e)));
});

// 2026-09-14 transfer verification: estimates may not reach physically impossible values (a heat
// deflection below room temperature, a property beyond its physical limits), and calibration must hold.
test('no estimate reaches past a physical limit, and calibration still holds', () => {
  const model = JSON.parse(readFileSync(join(root, 'build/mappings/estimate-model.json'), 'utf8'));
  const floor = model.bounds.hdtFloor.value - 2 * model.bounds.hdtFloor.sd;
  for (const m of db.materials) {
    for (const [key, p] of Object.entries(model.properties)) {
      const e = m.headline[key]?.estimate;
      if (!e) continue;
      const [lo, hi] = p.plausibleValues;
      assert.ok(e.plausible.lo >= lo && e.plausible.hi <= hi * 1.5, `${m.name} ${key} ${e.plausible.lo}-${e.plausible.hi}`);
      if (key === 'hdt045') assert.ok(e.plausible.lo >= floor, `${m.name} HDT plausible from ${e.plausible.lo} °C`);
    }
  }
  for (const [key, p] of Object.entries(db.meta.estimateModel.properties)) {
    assert.ok(Math.abs(p.calibration.likelyCoverage - 0.8) <= 0.1, `${key} likely coverage ${p.calibration.likelyCoverage}`);
    assert.ok(p.calibration.plausibleCoverage >= 0.9, `${key} plausible coverage ${p.calibration.plausibleCoverage}`);
  }
});

// 2026-09-14: a grade declared a variant of its material (grades.csv Variant) explains its own offset. HyperLite
// PP's 0.81 g/cc (a lightweight additive) was a model outlier and pulled PP's family; declared, it is neither.
test('a declared grade variant explains its own offset instead of being an outlier', async () => {
  const { loadTables, snapshotDate } = await import('../build/src/load.js');
  const { compile } = await import('../build/src/compile.js');
  const flagged = (edit) => {
    const wb = loadTables(join(root, 'data'));
    edit(wb);
    const d = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' }).db;
    const em = d.meta.estimateModel;
    return [...em.outliers, ...em.conflicts].filter((o) => o.materialId === 'M082' && o.key === 'density').length;
  };
  assert.equal(flagged(() => {}), 0);
  assert.ok(flagged((wb) => { wb.Grades.rows.find((g) => g.GradeID === 'G082-01').Variant = 'Not applicable'; }) > 0, 'without the declaration the lightweight product is flagged');
  assert.deepEqual(db.grades.filter((g) => g.variant).map((g) => `${g.id} ${g.variant}`), ['G082-01 lightweight additive', 'G085-01 undisclosed dense filler']);
});

// 2026-09-14: a one-sided bound is evidence of a limit, not an exact value. Read as a point, "> 16.5 MPa" pinned PEBA's
// strength to 16.4-16.6 MPa; left out, elastomers lost the evidence that they stretch hundreds of percent.
test('a one-sided bound informs its family, is marked, and limits its own material\'s estimate', () => {
  const bounds = new Map(db.measurements.filter((m) => m.interval && (m.interval.lo == null || m.interval.hi == null)).map((m) => [m.id, m]));
  assert.ok(bounds.size > 0);
  let limited = 0;
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      const e = h.estimate;
      if (!e) continue;
      for (const ev of e.evidence ?? []) {
        for (const i of ev.items) {
          const b = bounds.get(i.measurementId);
          if (!b) continue;
          assert.ok(i.bound, `${m.name} ${key}: ${i.measurementId} is a bound but not marked`);
          // A lower bound on this material's own XY or unstated-direction strength or strain limits the estimate.
          if (b.interval.hi == null && key !== 'density' && key !== 'hdt045' && ['XY', 'unknown'].includes(i.direction) && b.materialId === m.id) {
            assert.ok(e.plausible.lo >= b.value * 0.97, `${m.name} ${key} plausible from ${e.plausible.lo}, below its published "> ${b.value}"`);
            limited++;
          }
        }
      }
    }
  }
  assert.ok(limited > 0, 'at least one estimate is limited by its own bound');
});
