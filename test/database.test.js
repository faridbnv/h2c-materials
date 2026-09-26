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
import { validateEstimates } from '../build/src/estimate/validate.js';

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

test('every product value equals its measurement, and a material\'s headline is its products\' median', () => {
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  let checked = 0;
  for (const g of db.grades) {
    for (const key of Object.keys(HEADLINE_PROPERTY)) {
      const v = g.headline?.[key];
      if (!v) continue;
      assert.equal(byId.get(v.measurementId).value, v.value, `${g.id} ${key}`);
      // A twin's value is its sibling's measurement (D89); test/products.test.js checks who the sibling may be.
      assert.equal(byId.get(v.measurementId).gradeId, v.from?.origin === 'twin' ? v.from.gradeId : g.id, `${g.id} ${key}`);
      checked++;
    }
  }
  for (const mat of db.materials) {
    for (const key of Object.keys(HEADLINE_PROPERTY)) {
      const h = mat.headline[key];
      if (!h?.known) continue;
      assert.equal(h.value, mat.summary[key].median, `${mat.name} ${key}`);
      assert.equal(gradeById.get(h.typical.gradeId).headline[key].value, h.typical.value, `${mat.name} ${key}`);
    }
  }
  // What each build derives is in build/snapshot/products.csv; this guards against values going missing wholesale.
  assert.ok(checked >= 3000, `only ${checked} product values`);
});

test('a derived coverage row speaks only where no stored row does, and only for what the records prove', () => {
  // m48 moved 541 templated "Evidence recorded" rows out of coverage.csv. The build reports those pairs from the
  // material's own records instead. A stored row is a judgement and always wins; a derived one must never invent a
  // pair, contradict a stored status, or carry an identifier that is not in the tables.
  const stored = db.coverage.filter((c) => !c.derived);
  const derived = db.coverage.filter((c) => c.derived);
  assert.ok(derived.length > 400, `only ${derived.length} derived coverage rows`);

  const storedPairs = new Set(stored.filter((c) => c.status !== 'Superseded').map((c) => `${c.materialId} | ${c.domain}`));
  for (const c of derived) {
    assert.ok(!storedPairs.has(`${c.materialId} | ${c.domain}`), `${c.id} speaks for a pair a stored row already speaks for`);
    assert.equal(c.status, 'Evidence recorded');
    assert.equal(c.manufacturerCount, null, `${c.id} quotes a manufacturer count, which only a stored Grades row does`);
    assert.match(c.id, /^derived-M\d{3}-[a-z0-9-]+$/);
    assert.ok(c.finding && c.finding.length > 20, `${c.id} has no finding worth reading`);
  }
  // Every derived row must be provable by the same rule the validator checks stored rows with.
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  for (const c of derived) {
    const data = domainData(db, byId.get(c.materialId));
    assert.ok((data[c.domain] ?? []).length > 0, `${c.id} claims evidence the coverage rules cannot see`);
  }
  // No derived row may carry an ID any record cites: nothing in the tables points at one.
  const ids = new Set(derived.map((c) => c.id));
  assert.ok(!stored.some((c) => ids.has(c.id)));
  assert.equal(db.meta.counts.coverageDerived, derived.length);
  assert.equal(db.meta.counts.coverage, stored.length);
});

test('every profile note reaches the reader: the table and the compiled profiles hold the same rows', () => {
  // The notes were columns of profiles.csv until m44, where most were empty on most rows and three were empty on
  // every row. They are rows now, and a note that never reaches a profile is a note nobody reads.
  const stored = readFileSync(join(root, 'data/tables/profile_notes.csv'), 'utf8').trim().split('\n').length - 1;
  const compiled = db.profiles.flatMap((p) => p.notes);
  assert.equal(compiled.length, stored, 'profile_notes.csv rows and compiled profile notes disagree');
  assert.ok(compiled.length >= 363, 'profile notes have gone missing since m44 moved 363 of them');
  const ids = new Set(db.profiles.map((p) => p.id));
  assert.ok(db.profiles.every((p) => p.notes.every((n) => n.topic && n.text)), 'a profile note has no topic or no text');
  assert.equal(ids.size, db.profiles.length);
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
  // Excluded for the H2C's envelope: the industrial high-temperature family. The sintering filaments are excluded by
  // scope, not by the envelope (D87): they print at 170 to 250 °C, and their part is the sintered metal's.
  const excluded = db.materials.filter((m) => m.excluded && /Outside H2C Practical Envelope/.test(m.family));
  assert.ok(excluded.length >= 6, 'the six audited exclusions are still excluded');
  for (const m of excluded) {
    assert.equal(m.gates.nozzle.verdict, 'exceeds', `${m.name} nozzle gate`);
  }
});

test('a material with one fitting grade is printable even when another grade is not', () => {
  const ppsgf = db.materials.find((m) => m.name === 'PPS-GF');
  assert.equal(ppsgf.gates.nozzle.verdict, 'within');
});

test('every product HDT is a stated 0.45 MPa value, or as published with its load unstated', () => {
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  for (const g of db.grades) {
    const v = g.headline?.hdt045;
    if (!v) continue;
    const t = byId.get(v.measurementId).thermal;
    // ASTM D648's 66 psi is 0.455 MPa: the same test as ISO 75's 0.45 MPa, read as such by the estimate stage and the
    // product rule alike (PE's Braskem sheet states 0.455).
    if (t?.loadStated) assert.ok(v.level === 'comparable' && Math.abs(t.loadMPa - 0.45) <= 0.01, `${g.id} cites a ${t.loadMPa} MPa load`);
    else assert.deepEqual([v.level, v.caveat], ['as-published', 'load-not-stated'], g.id);
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
      // A material declared not estimated (a family's "polymer not stated" home, D87) shows what its products publish,
      // and a headline none of them publishes is unknown, as an untested product is; every other one has something.
      assert.ok(h.known || h.estimate || h.notApplicable || !m.estimateIdentity, `${m.name} ${k} is blank`);
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
  // CarbonX CF PA12, now lives only under PA12-CF, whose products publish their own strengths.
  const cf = byName('PA12-CF').headline.tensileStrengthXY;
  assert.ok(cf.known && cf.spread.min > 40 && cf.spread.max < 130, `PA12-CF strength ${cf.spread?.min}-${cf.spread?.max}`);
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
  // The three re-filed grades are its own; later batches add more beside them, which is not a re-filing.
  for (const id of ['G051-01', 'G051-02', 'G051-03']) assert.ok(byName('PA6-GF').gradeIds.includes(id), id);
  // PolyFlex TPU90 came to TPU from TPE; since m141 TPU is read by hardness, and it is a 90A.
  assert.ok(byName('TPU 90A class').gradeIds.includes('G039-03'));
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
  // Every re-filing and every republished sheet adds retired duplicates (m25's eight, m80's twenty, m113's
  // eighteen), so a fixed number measured the history rather than the rule. The rule is that the build counts
  // what the tables hold, and that nothing retired is lost: the count never falls below the 175 of 2026-09-20.
  const retiredIn = (table) => readFileSync(join(root, `data/tables/${table}.csv`), 'utf8').split('\n').filter((l) => /,Retired duplicate record,/.test(l)).length;
  assert.equal(db.meta.counts.retiredDuplicates.measurements, retiredIn('measurements'));
  assert.ok(db.meta.counts.retiredDuplicates.measurements >= 175);
  assert.equal(db.meta.counts.retiredDuplicates.evidence, 16);
});

test('a heat deflection whose load the sheet leaves unstated is as published, and counted apart in its material', () => {
  // eSUN PLA-Lite's 53 °C names ISO 75 but no load. It is counted apart (D84) and decides only when the reader asks.
  const lite = db.grades.find((g) => g.id === 'G004-01');
  assert.deepEqual([lite.headline.hdt045.level, lite.headline.hdt045.caveat], ['as-published', 'load-not-stated']);
  const pla = db.materials.find((m) => m.id === lite.materialId);
  assert.equal(pla.name, 'PLA');
  assert.ok(pla.summary.hdt045.asPublished.n >= 1 && pla.summary.hdt045.asPublished.min <= 53, 'counted apart in PLA');
});

// Regression: Zytel 101L's moulded 3.1 GPa vetoed screening PA66 out of "stiffness at least 3 GPa".
test('a resin reference never vetoes a screen: implied bounds are the filament\'s own', () => {
  const lowerBounds = Object.fromEntries(db.registry.headlines.map((d) => [d.key, d.lowerBounds]));
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
        if (key === 'elongationXY') assert.notEqual(x.moistureState, 'conditioned', `${m.name} ${b.measurementId} is conditioned`);
        assert.equal(x.materialId, m.id, `${m.name} ${key} bound ${b.measurementId} is another material's`);
        assert.ok(lowerBounds[key]?.properties.includes(x.property), `${m.name} ${key}: ${x.property} does not bound it`);
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
test('estimates follow the physics of printing: slow crystallisers deflect near Tg, a Vicat caps an unfilled bar, density mixes', () => {
  const est = (n, k) => byName(n).headline[k].estimate;
  // PET prints amorphous: its as-printed heat deflection sits near its own Vicat (65.9 °C), not near a crystalline bar's.
  assert.ok(est('PET', 'hdt045').plausible.hi < 90, `PET plausible to ${est('PET', 'hdt045').plausible.hi}`);
  // BVOH's own Vicat is 90 °C.
  assert.ok(est('BVOH', 'hdt045').plausible.hi <= 100, `BVOH plausible to ${est('BVOH', 'hdt045').plausible.hi}`);
  // Neat PA12 is 990-1040 kg/m³, and its products publish their own.
  const pa12 = byName('PA12').headline.density;
  assert.ok(pa12.known && pa12.value >= 990 && pa12.value <= 1100, `PA12 density ${pa12.value}`);
  // Carbon fibre cannot make PA66 lighter than PA66.
  assert.ok(est('PA66-CF', 'density').centre >= est('PA66', 'density').centre, 'PA66-CF lighter than PA66');
});

test('polyamide estimates follow the physics: melting point orders heat resistance, fibre raises stiffness', () => {
  // PA66 and PA612 have no products, so both are estimates; PA12's products publish their own.
  const hdt = (n) => valueOf(byName(n), 'hdt045');
  assert.ok(hdt('PA66') > hdt('PA612'), `PA66 ${hdt('PA66')}, PA612 ${hdt('PA612')}`);
  assert.ok(hdt('PA66-CF') > hdt('PA66') + 50 && hdt('PA612-GF') > hdt('PA612') + 40);
  assert.ok(hdt('PA66-CF') < 262 && hdt('PA612-GF') < 218, 'a semicrystalline bar cannot hold above its melting point');
  const stiff = (n) => valueOf(byName(n), 'tensileModulusXY');
  assert.ok(stiff('PA66-CF') > stiff('PA66') * 1.5 && stiff('PA612-GF') > stiff('PA612') * 1.3);
  const stretch = (n) => valueOf(byName(n), 'elongationXY');
  assert.ok(stretch('PA66-CF') < stretch('PA66') && stretch('PA612-GF') < stretch('PA612'));
});

test('an elastomer\'s heat deflection and a support product\'s properties are not applicable, not estimated', () => {
  for (const n of ['TPU 85A', 'TPU 90A', 'TPC / TPEE', 'PEBA', 'OBC']) assert.ok(byName(n).headline.hdt045.notApplicable, n);
  // A support product is not characterised as a structural material: its values are shown where its own sources
  // publish them and nowhere else. So a support material with no measurements of its own carries no estimate at
  // all, and one whose maker publishes something is read like any other material from that point on. BVOH has
  // always been the second kind; PVA became one when SUNLU's sheet arrived with a strength, an elongation and a
  // heat deflection on printed bars, which is why this is a rule here and no longer a list of names.
  const supports = db.materials.filter((m) => m.facets?.supportMaterial?.value === true);
  assert.ok(supports.length >= 4, 'no support materials to check');
  for (const m of supports) {
    const own = db.measurements.some((x) => x.materialId === m.id);
    if (own) continue;
    assert.ok(ESTIMATED.filter((k) => !m.headline[k].known).every((k) => m.headline[k].notApplicable), m.name);
  }
  // A published value no longer beats the rule (owner ruling, audit 2026-09-15, B-08): ISO 75 ends at 0.2 % outer-fibre
  // strain, which needs a modulus near 225 MPa. TPU's sheet gives 74 °C on a 26 MPa elastomer; it is evidence, not an estimate.
  for (const m of db.materials.filter((x) => ['TPU', 'TPU for AMS', 'TPU 95A HF', 'PEBA', 'TPC / TPEE', 'OBC'].includes(x.name))) {
    assert.ok(m.headline.hdt045.known || m.headline.hdt045.notApplicable, `${m.name} has a heat deflection estimate`);
  }
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
  // PLA's 3DXTECH value (V000008, 80 °C) states its load but is flagged physically implausible (m24): PLA's heat
  // deflection is estimated.
  assert.equal(x('V000008').implausible, true);
  // HyperLite PP's 3DXTECH value belongs to PP Lightweight since m25.
  for (const n of ['PP Lightweight', 'PP-GF', 'PA12-CF', 'PVDF', 'PC-ABS']) {
    const t = db.measurements.find((m) => m.id === byName(n).headline.hdt045.typical.measurementId).thermal;
    assert.ok(t.loadStated && Math.abs(t.loadMPa - 0.45) <= 0.01, `${n}: its typical product states 0.45 MPa`);
  }
  // A value the estimate model keeps out is not necessarily a wrong one. A bronze-filled PLA weighs 3.9 g/cm³
  // and that is a true fact about the product, which belongs in the database and on the page; what the model has
  // no covariate for is the load, so it excludes the value from the family's density rather than learning a PLA
  // that weighs like bronze. The grade says so itself, with the Variant D57 asks for.
  //
  // Asserting that nothing is ever rejected held only while no such product was in the corpus, and pinned the
  // model's guard to the corpus's contents. What it guards is that a rejection is explained: a value kept out
  // with nothing on its grade to say why is a value nobody has looked at.
  const variantOf = new Map(db.grades?.map((g) => [g.id, g.variant]) ?? []);
  for (const r of db.meta.estimateModel.rejected) {
    const m = db.measurements.find((x) => x.id === r.measurementId);
    const declared = m?.implausible || (m?.gradeId && variantOf.get(m.gradeId) && variantOf.get(m.gradeId) !== 'Not applicable');
    assert.ok(declared, `${r.measurementId} (${r.material} ${r.property} ${r.value} ${r.unit}) is kept out of the model and nothing on its grade says why`);
  }
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
// evidence. PC FR and PAHT-CF reach their whole window. The window is the Bambu product's own (D83): the material's
// union widens when another maker's product publishes a wider one, as Polymaker's PolyMax PC-FR (90-100 °C) did in m136.
test('chamber windows recovered from the cited Bambu data sheets are compiled', () => {
  // Each is the Bambu product's own window (D83); PLA Basic and PETG HF are products of PLA and PETG since m141.
  for (const [id, min, max] of [['G002-01', 25, 45], ['G022-01', 35, 50], ['G036-01', 45, 60], ['G048-01', 45, 60], ['G080-01', 45, 60]]) {
    const g = db.grades.find((x) => x.id === id);
    assert.equal(g.manufacturer, 'Bambu Lab', id);
    assert.deepEqual([g.print?.chamber?.min, g.print?.chamber?.max], [min, max], id);
    assert.equal(g.print.chamber.verdict, 'within', id);
  }
  for (const name of ['PC FR', 'PAHT-CF', 'Support for PA/PET']) assert.equal(byName(name).gates.chamber.verdict, 'within', name);
});

// Regression: a 60-90 °C chamber window was read by its upper end alone, so a material whose own
// window starts below the H2C's 65 °C failed outright. ABS-CF (50-70 °C) did, before this research.
test('a chamber window the H2C only partly reaches is partial, never within and never a failure', () => {
  for (const name of ['PPA-CF', 'ABS-CF']) {
    const g = db.materials.find((m) => m.name === name).gates.chamber;
    assert.equal(g.verdict, 'partial', name);
    assert.match(g.reason, /reaches only/, name);
  }
  // The verdict is the profile's, and a material's is the best of its profiles (GATE_PRECEDENCE): PPS-CF was
  // this test's third example until a grade arrived that prints at room temperature, which makes the material
  // printable and says nothing about the 60-90 °C window the third grade still publishes. So the window is
  // checked where it is decided, on every profile that states one.
  const partial = db.profiles.filter((p) => p.gates?.chamber?.verdict === 'partial');
  assert.ok(partial.length, 'some profile publishes a window the H2C only partly reaches');
  for (const p of partial) assert.match(p.gates.chamber.reason, /reaches only/);
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

// The Fiberon page headlines 133.7 °C. That figure is annealed; as printed it is 81.6 °C. Both are
// on record and the headline is the one a printed part has.
test('an annealed value is not averaged with its as-printed twin, and mixed schedules are not a precise mean', () => {
  // PET-GF15's 81.6 and 133.7 °C once became one observation of 107.65 °C, an outlier warning and a conflict; PPS-GF's
  // HDT after annealing at 130 and at 230 °C became one precise mean (audit 2026-09-15, C-01).
  const { conflicts, outliers } = db.meta.estimateModel;
  const flagged = conflicts.flatMap((c) => c.measurementIds);
  for (const id of ['V001933', 'V001932', 'V000353', 'V000352']) assert.ok(!flagged.includes(id), `${id} (annealed) is still averaged into an observation`);
  // What this guards is that no HDT observation mixes two states, which shows as a group holding more than one
  // measurement. Whether such a group also conflicts is a separate thing: an honest single-state value may
  // contradict its family and be down-weighted on purpose (fitWithConflicts), and PLA-GF's as-printed pair does,
  // its 15.8 C gap between the loads being the widest of any amorphous filament on record.
  // What a group may not mix is two states: an annealed value with an as-printed one, or two loads. Two sources
  // that publish one product's one value are one observation, and 3DXTECH's two revisions of its high-temperature
  // nylon sheet are that: both print 240 °C at 0.45 MPa as printed.
  const stateOf = (id) => {
    const m = db.measurements.find((x) => x.id === id);
    return `${m?.postProcessingState ?? '?'}|${m?.moistureState ?? '?'}|${m?.anneal?.tempC ?? ''}`;
  };
  for (const c of conflicts.filter((x) => x.key === 'hdt045')) {
    const states = new Set(c.measurementIds.map(stateOf));
    assert.equal(states.size, 1, `${c.material}'s ${c.kind} averages measurements of different states: ${[...states].join(' and ')}`);
  }
  // PET-GF is an outlier again, and for a different reason than the one this test was written for: its
  // as-printed 81.6 degC sits 3.6 sigma under a family whose centre moved when b19 added PET and PETG sheets,
  // and each of its HDT groups still holds one measurement. The symptom is not the rule. What this asserts is
  // the rule: an outlier on this key may not come from a group that averaged two states, which is the defect
  // the 2026-09-15 audit found (C-01). Pinning "PET-GF has no outlier" pinned the whole database's
  // centre to one material's value, and every batch that adds a PET moves it.
  const mixes = (ids) => new Set(ids.map(stateOf)).size > 1;
  for (const o of outliers.filter((x) => x.key === 'hdt045')) {
    const group = conflicts.find((c) => c.key === 'hdt045' && c.materialId === o.materialId && c.values.includes(o.measured));
    assert.ok(!group || !mixes(group.measurementIds), `${o.material}'s outlier is an average of ${[...new Set((group?.measurementIds ?? []).map(stateOf))].join(' and ')}`);
  }
});

test('a physically implausible value is kept and flagged, and backs no headline, bound or estimate', () => {
  const flagged = db.measurements.filter((m) => m.implausible);
  assert.ok(flagged.length >= 10);
  const ids = new Set(flagged.map((m) => m.id));
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      assert.ok(!ids.has(h.measurementId), `${m.name} ${key} headline is flagged ${h.measurementId}`);
      for (const b of h.impliedBounds ?? []) assert.ok(!ids.has(b.measurementId), `${m.name} ${key} bound ${b.measurementId}`);
      for (const e of h.estimate?.evidence ?? []) for (const i of e.items) assert.ok(!ids.has(i.measurementId), `${m.name} ${key} estimate uses ${i.measurementId}`);
    }
  }
  // TPU for AMS's 1.19 GPa on a 68D elastomer no longer passes a rigid-part stiffness requirement.
  const ams = db.materials.find((m) => m.name === 'TPU for AMS').headline.tensileModulusXY;
  assert.ok(!ams.known && (ams.estimate?.plausible.hi ?? 0) < 1, `TPU for AMS stiffness ${JSON.stringify(ams.estimate?.plausible)}`);
});

test('HyperLite PP is its own material, and PP describes unfilled polypropylene', () => {
  const pp = byName('PP'), light = byName('PP Lightweight');
  assert.ok(pp.headline.density.spread.max < 1000, `unfilled PP products publish up to ${pp.headline.density.spread.max} kg/m³`);
  assert.ok(pp.headline.tensileModulusXY.estimate.plausible.hi < 2.5, 'unfilled PP stiffness estimate');
  // PP Lightweight's one product is a declared variant, and so the material's own range.
  assert.equal(light.headline.density.value, 810);
  assert.ok(!db.measurements.some((m) => m.gradeId === 'G082-01'), 'the retired HyperLite grade still holds active measurements');

});

// The nGen TDS footnotes its density and HDT as raw-material supplier data. The printed XY values
// are headlines; the supplier values are related evidence and say why.
test('no product value is an annealed bar where the product publishes the property as printed', () => {
  // A rule over every product (re-center phase 5), where tests once pinned the cases that found it: IPCON PPA prints
  // "103 °C; 131 °C (annealed)" and only 131 °C had been transcribed (B-05, m21); PET-GF15 prints 81.6 and 133.7 °C.
  const byGrade = new Map();
  for (const m of db.measurements) { if (!byGrade.has(m.gradeId)) byGrade.set(m.gradeId, []); byGrade.get(m.gradeId).push(m); }
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  let annealed = 0;
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      const m = byId.get(v.measurementId);
      if (!m) continue;
      assert.ok(!annealedBesideAsPrinted(m, byGrade.get(g.id) ?? []), `${g.id} ${key} is ${m.id}, annealed beside an as-printed value`);
      if (m.postProcessingState === 'annealed') { annealed++; assert.ok(v.anneal, `${g.id} ${key} does not say it is reached after annealing`); }
    }
  }
  assert.equal(db.grades.find((g) => g.id === 'G069-01').headline.hdt045.value, 103, 'IPCON PPA, the case that found it');
  assert.ok(annealed > 0, 'no product value is annealed at all, so the second half of the rule is untested');
});

test('raw-material supplier values never become a product\'s value', () => {
  // nGen's resin sheet (G092-01) prints a moulded density and heat deflection; they stay evidence.
  const g = db.grades.find((x) => x.id === 'G092-01');
  assert.equal(g.headline.tensileModulusXY.value, 1.7);
  assert.ok(!g.headline.density && !g.headline.hdt045, 'a moulded value became G092-01\'s');
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  for (const x of db.grades) {
    for (const [key, v] of Object.entries(x.headline ?? {})) {
      if (v.measurementId) assert.ok(!['moulded', 'film', 'filament'].includes(byId.get(v.measurementId).specimenForm), `${x.id} ${key}`);
    }
  }
});

// Flexural is not tensile: PLA Lite publishes a flexural modulus and no tensile one.
test('a flexural modulus never fills the stiffness headline', () => {
  // eSUN PLA-Lite publishes a flexural modulus and no tensile one: it has no stiffness value of its own.
  const lite = db.grades.find((g) => g.id === 'G004-01');
  assert.equal(lite.headline.tensileModulusXY, undefined);
  assert.ok(db.measurements.some((m) => m.gradeId === lite.id && m.property === 'Flexural modulus'));
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

test('a band is attached by MaterialID, so renaming a material does not detach it', async () => {
  const { chamberBandsFromTables, attachChamberEstimates } = await import('../build/src/chamber-estimates.js');
  const wb = loadTables(join(root, 'data'));
  const bands = chamberBandsFromTables(wb);
  const renamed = db.materials.map((m) => ({ ...m, name: `${m.name} (renamed)`, print: { ...m.print, chamberEstimate: null } }));
  const after = attachChamberEstimates(renamed, bands);
  assert.equal(after.issues.length, 0, after.issues.map((i) => i.message).join(' | '));
  assert.equal(after.applied.length, db.materials.filter((m) => m.print?.chamberEstimate).length);
  assert.ok(after.applied.every((a) => a.material.endsWith('(renamed)')));
});

// --- 2026-09-13 coverage consolidation ----------------------------------------------------------
// docs/audits/2026-09-13-coverage-consolidation/. The validator now checks that every record points
// at the right material. Each test below breaks a copy of the snapshot in one way and requires the
// validator to name it, so a check that silently stopped firing would fail here.


const errorsFor = (mutate) => {
  const copy = structuredClone(db);
  mutate(copy);
  return [...validate(copy), ...validateEstimates(copy)].filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`);
};
const mat = (copy, name) => copy.materials.find((m) => m.name === name);

test('the consolidated snapshot passes every consistency check', () => {
  assert.deepEqual(errorsFor(() => {}), []);
});

test('a product value citing another product, or a material naming another\'s typical product, is an error', () => {
  const grade = (c, id) => c.grades.find((g) => g.id === id);
  assert.ok(errorsFor((c) => { grade(c, 'G068-02').headline.hdt045.measurementId = grade(c, 'G025-02').headline.density.measurementId; })
    .some((e) => /G068-02 hdt045 cites V\d+, a measurement of G025-02/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PET-GF').headline.hdt045.typical.gradeId = 'G025-02'; })
    .some((e) => /names G025-02 as its typical product/.test(e)));
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
  // PLA Tough+ is a product of PLA since m141, and its record went with it.
  assert.equal(db.evidence.find((e) => e.gradeId === 'G006-01' && e.topic === 'Resistance to Alkali')?.finding, 'Not resistant');
});

// Systematic data audit: use the actual source tables, then introduce independent corruption.
import { loadTables } from '../build/src/load.js';
import { measurementIssues, rawNumber, normalizedRawValue, unitKey, unitsKnown } from '../build/src/measurement-rules.js';
import { normalQuantile, boundedQuantile } from '../build/src/estimate/numerics.js';
import { modulusFromShore, kindOf } from '../build/src/estimate/observations.js';
import { annealedBesideAsPrinted } from '../build/src/normalize/specimen.js';
import { domainData } from '../build/src/coverage-rules.js';
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

test('a number written with an E is a power of ten, signed or not', () => {
  // A maker publishes a surface resistivity as "> 1.0E+15 ohms" and a thermal expansion as "5.0E-5 cm/cm/C";
  // read as the digits in front of the E they are 1 and 5, which is an insulator read as a conductor and an
  // expansion a thousand times what any polymer has. The sign is left out where it is positive: Nanovia prints
  // "10E13" for a surface resistivity and 3DJake "1E1" for the resistivity of a conductive grade.
  assert.equal(rawNumber('1.0E+15 ohms'), 1e15);
  assert.equal(rawNumber('> 1.0E+15'), 1e15);
  assert.equal(rawNumber('2.5 E-3'), 0.0025);
  assert.equal(rawNumber('5.0E -5 cm/cm/C'), 5e-5);
  assert.equal(rawNumber('10E13'), 1e14);
  assert.equal(rawNumber('1E1 ohm'), 10);
  assert.equal(rawNumber('1.02e4'), 10200);
  // The letter has to stand between two digits, so a designation that ends in one is not a number.
  assert.equal(rawNumber('E 2092'), null);
  assert.equal(rawNumber('ASTM E1131'), null);
  // And what was already read is read the same way: the raised power, the leading dot, the grouped thousands.
  assert.equal(rawNumber('6.75x10^14'), 6.75e14);
  assert.equal(rawNumber('1.25 g/cm3'), 1.25);
  assert.equal(rawNumber('.13 %'), 0.13);
  assert.equal(rawNumber('24 000 kg/cm2'), 24000);
});

test('a unit is its meaning, not its spelling, and a pair with no conversion says so rather than skipping', () => {
  // Spelling: spaces, superscripts, the degree sign and a parenthetical aside are not the unit.
  assert.equal(unitKey('M P a'), unitKey('MPa'));
  assert.equal(unitKey('kJ /m2'), unitKey('kJ/m²'));
  assert.equal(unitKey('g/10 min (unit not printed)'), unitKey('g/10min'));
  // Conversions, including the imperial and metric-technical units other makers publish.
  const value = (raw, from, to) => normalizedRawValue({ 'Raw value': raw, 'Raw unit': from, 'Normalized unit': to });
  assert.equal(value('1.24', 'g/cm³', 'kg/m³'), 1240);
  assert.equal(value('7550', 'psi', 'MPa').toFixed(3), '52.055');
  assert.equal(value('750', 'ksi', 'GPa').toFixed(3), '5.171');
  assert.equal(value('70 kg∙cm/cm', 'kg·cm/cm', 'J/m').toFixed(4), '686.4655');
  assert.equal(value('52', 'N/mm²', 'MPa'), 52);
  // A bound and an approximation lead with the number they qualify.
  assert.equal(rawNumber('> 500 %'), 500);
  assert.equal(rawNumber('~1.5 %'), 1.5);
  // An unknown pair is reported; a sheet that printed no unit is not an unknown pair.
  assert.equal(unitsKnown({ 'Raw unit': 'furlongs', 'Normalized unit': 'MPa' }), false);
  assert.equal(unitsKnown({ 'Raw unit': 'Not published', 'Normalized unit': 'Shore (scale not specified by source)' }), true);
  const wb = loadTables(join(root, 'data'));
  const row = wb.Properties.rows.find((r) => r.MeasurementID === 'V000539');
  const before = row['Raw unit'];
  row['Raw unit'] = 'furlongs';
  assert.ok(measurementIssues(db, wb).some((e) => e.code === 'MEAS-UNIT-UNKNOWN' && e.where.includes('V000539')));
  row['Raw unit'] = before;
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
  const value = (c) => c.grades.find((g) => g.id === 'G002-01').headline.tensileStrengthXY;
  assert.ok(errorsFor(c=>{const h=value(c);c.measurements.find(m=>m.id===h.measurementId).property='Flexural strength';}).some(e=>/inconsistent property/.test(e)));
  assert.ok(errorsFor(c=>{const h=value(c);c.measurements.find(m=>m.id===h.measurementId).unit='GPa';}).some(e=>/inconsistent property/.test(e)));
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
  const x = (o) => ({ numeric: true, direction: 'XY', moisture: 'Not published', moistureState: 'not-stated', specimenType: 'Printed specimen', ...o });
  assert.equal(kindOf(x({ property: 'Tensile break strength' }), 'tensileStrengthXY', 'amorphous'), 'break XY');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'Z' }), 'tensileModulusXY', 'amorphous'), 'tensile Z');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'XZ' }), 'tensileModulusXY', 'amorphous'), 'tensile XY');
  // A source's own orientation label never merges into XY or Z (Method, Comparison / Directions; audit 2026-09-15, C-03).
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'horizontal-source-label' }), 'tensileModulusXY', 'amorphous'), 'tensile unk');
  assert.equal(kindOf(x({ property: 'Tensile modulus', direction: 'vertical-xz-source-label' }), 'tensileModulusXY', 'amorphous'), 'tensile unk');
  assert.equal(kindOf(x({ property: 'HDT', specimenType: 'Raw material value', thermal: { loadStated: true, loadMPa: 0.455 } }), 'hdt045', 'amorphous'), 'HDT 0.45 moulded amorphous');
  assert.equal(kindOf(x({ property: 'Glass transition temperature' }), 'hdt045', 'semi-unfilled'), null);
  // The moisture state comes from the row's typed column, not from the wording (m43).
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Conditioned: 70% RH', moistureState: 'conditioned' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile XY wet');
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Wet (conditioning specified in source)', moistureState: 'conditioned' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile XY wet');
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Dry as moulded', moistureState: 'dry', specimenType: 'Raw material value' }), 'tensileModulusXY', 'semi-unfilled'), 'tensile moulded');
  // A state outside the three stops the build where it is read from the row (compile.js), not deep in the model.
  assert.throws(() => moistureState('Soaked'), /is not one of dry, conditioned, not-stated/);
  // How far a conditioned value converts depends on the polymer's water uptake; a polymer that takes up none reads as dry (B-14).
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Conditioned: 70% RH', moistureState: 'conditioned' }), 'tensileModulusXY', 'semi-unfilled', 'low'), 'tensile XY wet-low');
  assert.equal(kindOf(x({ property: 'Tensile modulus', moisture: 'Conditioned: 70% RH', moistureState: 'conditioned' }), 'tensileModulusXY', 'amorphous', null), 'tensile XY');
  // An elastomer's yield says nothing about its ultimate strength, and its heat deflection informs nothing (B-17, B-08).
  assert.equal(kindOf(x({ property: 'Tensile yield strength' }), 'tensileStrengthXY', 'elastomer'), null);
  assert.equal(kindOf(x({ property: 'HDT', thermal: { loadStated: true, loadMPa: 0.45 } }), 'hdt045', 'elastomer'), null);
});

test('the validator rejects a blank headline, a range that does not nest, and evidence from another material', () => {
  assert.ok(errorsFor((c) => { delete mat(c, 'PA66').headline.tensileModulusXY.estimate; }).some((e) => /no value, no estimate/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PA66').headline.tensileModulusXY.estimate.lo = 99; }).some((e) => /outside the likely range/.test(e)));
  assert.ok(errorsFor((c) => { mat(c, 'PA66').headline.tensileStrengthXY.estimate.plausible.hi = 1; }).some((e) => /not inside the plausible range/.test(e)));
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
test('a declared grade variant explains its own offset instead of moving its family', async () => {
  const { loadTables } = await import('../build/src/load.js');
  const { Worker } = await import('node:worker_threads');
  // PA66's estimated stiffness after setting some fields of one grade in a fresh copy of the tables. The four builds
  // below are whole builds and independent of each other, so each runs in a worker thread of its own and together they
  // take about as long as one.
  const pa66Stiffness = (gradeId, set) => new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { workerData: { root, gradeId, set }, parentPort } = require('node:worker_threads');
      const { pathToFileURL } = require('node:url');
      const { join } = require('node:path');
      (async () => {
        const { loadTables, snapshotDate } = await import(pathToFileURL(join(root, 'build/src/load.js')).href);
        const { buildDatabase } = await import(pathToFileURL(join(root, 'build/src/pipeline.js')).href);
        const wb = loadTables(join(root, 'data'));
        if (gradeId) Object.assign(wb.Grades.rows.find((g) => g.GradeID === gradeId), set);
        parentPort.postMessage(buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' }).db.materials.find((m) => m.name === 'PA66').headline.tensileModulusXY.estimate.centre);
      })();`, { eval: true, workerData: { root, gradeId, set } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => reject(new Error(`the build worker for ${gradeId ?? 'the tables as they are'} exited with code ${code} before it answered`)));
  });
  // Spectrum PA6 Neat (3.4 GPa, 1.25 g/cm³) is a compound. Declared, it explains its own offset; undeclared, it lifts
  // the unfilled polyamides' stiffness (audit 2026-09-15, B-11). HyperLite PP, once the test case, is its own material.
  // The invariant is that the declared grade leaves its family where it would be without the grade at all, and that
  // undeclared it can only lift the family, never lower it. It used to demand a lift of at least 5% when undeclared,
  // which measured how thin the product-level data was rather than the mechanism: once 2026-09-16 added eight
  // products to materials with several (PVB, BVOH, PE, TPC), the between-product spread learned from them absorbed an
  // undeclared compound as product deviation and the lift fell to 2.8%, while the declared estimate stayed within 2.3%
  // of the family without the grade. A check that fails when the model gets better data is measuring the wrong thing.
  const retire = { Status: 'retired', Availability: 'Retired mapping; audit trail only' };
  // Measured against a control, because removing any one product from a family moves the fit a little and that
  // movement is not what this test is about: retiring an ordinary PA6 grade, one with no variant declared, moves
  // PA66 by as much as retiring the declared compound does. The invariant is that the declared grade is no more
  // disturbing to its family than an ordinary sibling, which is what "explains its own offset" means; comparing it
  // with a fixed tolerance measured the model's sensitivity to its own data instead, and grew with the corpus.
  const sibling = loadTables(join(root, 'data')).Grades.rows.find((g) => g.MaterialID === 'M049' && g.GradeID !== 'G049-01' && g.Status === 'active' && !g.Variant.startsWith('undisclosed') && !g.Variant.startsWith('lightweight')).GradeID;
  const [declared, undeclared, without, control] = await Promise.all([
    pa66Stiffness(),                                          // the variant declared, as the tables have it
    pa66Stiffness('G049-01', { Variant: 'Not applicable' }),  // undeclared
    pa66Stiffness('G049-01', retire),                         // without the grade
    pa66Stiffness(sibling, retire),                           // the control: without an ordinary sibling instead
  ]);
  const ordinary = Math.abs(control / without - 1);
  assert.ok(Math.abs(declared / without - 1) <= Math.max(0.03, ordinary), `PA66 stiffness ${declared} with the variant declared, ${without} without the grade, ${control} without an ordinary sibling: the declared grade moved its family more than an ordinary one does`);
  // Within 2%: with a second, unfilled PA6 grade on record (STYX, 2026-09-16) the undeclared compound is absorbed as
  // product deviation and the family reads 0.9% lower, which is refit noise, not a lowering.
  assert.ok(undeclared >= declared * 0.98, `PA66 stiffness ${declared} declared, ${undeclared} undeclared: an undeclared compound lowered the family`);
  // Every declared variant is deliberate and says why: the column is a claim about a product whose published
  // numbers its base polymer cannot reach, and a claim with no reason beside it is a guess. (A list of the grades
  // themselves went stale with every batch; so did a list of the values, which named two and failed the day R095
  // added a third. What matters is that each one is a value of the vocabulary and is explained.)
  const variants = new Set(readFileSync(join(root, 'schema/vocab/grade-variants.csv'), 'utf8').split(/\r?\n/).slice(1).map((l) => l.split(',')[0]).filter(Boolean));
  for (const g of db.grades.filter((x) => x.variant)) {
    assert.ok(variants.has(g.variant), `${g.id} ${g.variant}`);
    const row = db.grades.find((x) => x.id === g.id);
    assert.ok(row.composition && !/^Not (published|applicable)$/.test(row.composition), `${g.id} declares a variant and says nothing about why`);
  }
  assert.ok(db.grades.filter((g) => g.variant).length >= 4, 'the declared variants are gone');
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
