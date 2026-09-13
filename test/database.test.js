// Invariants on the compiled database. These are the rules that would decay silently, because
// nothing crashes when a build starts asserting something it should not.
//
// Requires dist/db.json, so run `npm run build` first.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
  assert.equal(checked, 369);
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
  assert.equal(excluded.length, 6);
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

// --- family estimates on the compiled snapshot -------------------------------
test('estimates never sit on a headline that has its own measurement', () => {
  for (const m of db.materials) {
    for (const [k, h] of Object.entries(m.headline)) {
      if (h?.estimate) assert.equal(h.known, false, `${m.name} ${k}`);
    }
  }
});

// Regression: PA, PA6/66 and CoPA all draw their headline from one PolyMide datasheet. Counting
// them as three peers produced an "estimate" of 2.223 to 2.223 GPa, a precise value dressed as a
// range. The Method sheet calls shared formulation keys repeated evidence, not independent tests.
test('estimates are a real range, never a single value repeated', () => {
  for (const m of db.materials) {
    for (const [k, h] of Object.entries(m.headline)) {
      if (!h?.estimate) continue;
      assert.ok(h.estimate.hi > h.estimate.lo, `${m.name} ${k} spans ${h.estimate.lo} to ${h.estimate.hi}`);
      assert.ok(h.estimate.peerCount >= 2, `${m.name} ${k} cites ${h.estimate.peerCount} peers`);
    }
  }
});

test('every estimate names its basis and its peers, and excludes the material itself', () => {
  let n = 0;
  for (const m of db.materials) {
    for (const [k, h] of Object.entries(m.headline)) {
      if (!h?.estimate) continue;
      n++;
      assert.ok(h.estimate.basis, `${m.name} ${k} has no basis`);
      assert.equal(h.estimate.peers.length, h.estimate.peerCount, `${m.name} ${k}`);
      assert.ok(!h.estimate.peers.some((p) => p.id === m.id), `${m.name} ${k} includes itself`);
    }
  }
  assert.ok(n > 50, `expected a meaningful number of estimates, got ${n}`);
});

test('excluded materials get no estimates', () => {
  for (const m of db.materials.filter((x) => x.excluded)) {
    for (const h of Object.values(m.headline)) assert.equal(h?.estimate, undefined, m.name);
  }
});

// Elastomers, supports and rigid thermoplastics are different populations. Pooling them produced a
// modulus bound from 0.0053 to 2.88 GPa, which rules nothing out and misleads about support materials.
test('the widest tier never pools elastomers with rigid thermoplastics', () => {
  const tpu = db.materials.find((m) => m.name === 'TPU');
  assert.equal(tpu.headline.hdt045.estimate, undefined, 'TPU has no HDT peers and should get no bound');
  for (const m of db.materials.filter((x) => x.family === 'Flexible Elastomers')) {
    const e = m.headline.tensileModulusXY?.estimate;
    if (e) assert.ok(e.lo < 2, `${m.name} borrowed a rigid-thermoplastic bound: ${e.lo} to ${e.hi}`);
  }
});

// --- 2026-09-13 manufacturer audit --------------------------------------------------------------
// docs/audits/2026-09-13-manufacturer-evidence/. Each test pins one change from its CHANGELOG.csv, so
// a later workbook edit that silently undoes one fails here rather than in front of a user.

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
