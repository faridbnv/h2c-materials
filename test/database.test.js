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
import { readCsv } from '../build/src/csv.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'dist/db.json');
let db = null;
const readCsvRows = (table) => readCsv(join(root, 'data/tables', table)).records.map((r) => r.values);

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

test('a derived coverage row speaks only where no stored row does, and only for what the records show', () => {
  // m48 moved 541 templated "Evidence recorded" rows out of coverage.csv, and m233 145 templated Gaps (D74, D114). The
  // build reports those pairs from the material's own records instead, evidence and absence. A stored row is a judgement
  // and always wins; a derived one must never invent a pair, contradict a stored status, or carry an identifier that is
  // not in the tables.
  const stored = db.coverage.filter((c) => !c.derived);
  const derived = db.coverage.filter((c) => c.derived);
  assert.ok(derived.length > 400, `only ${derived.length} derived coverage rows`);

  const storedPairs = new Set(stored.filter((c) => c.status !== 'Superseded').map((c) => `${c.materialId} | ${c.domain}`));
  for (const c of derived) {
    assert.ok(!storedPairs.has(`${c.materialId} | ${c.domain}`), `${c.id} speaks for a pair a stored row already speaks for`);
    assert.ok(['Evidence recorded', 'Gap', 'Limited comparability'].includes(c.status), `${c.id} derives "${c.status}"`);
    assert.equal(c.manufacturerCount, null, `${c.id} quotes a manufacturer count, which only a stored Grades row does`);
    assert.match(c.id, /^derived-M\d{3}-[a-z0-9-]+$/);
    assert.ok(c.finding && c.finding.length > 20, `${c.id} has no finding worth reading`);
  }
  // Every derived row must agree with the same rule the validator checks stored rows with: evidence only with records,
  // a gap only without, and a limited price only where the price is converted from a foreign listing (D113).
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  for (const c of derived.filter((x) => x.domain !== 'Sparse properties')) {
    const m = byId.get(c.materialId);
    const has = (domainData(db, m)[c.domain] ?? []).length > 0;
    if (c.status === 'Evidence recorded') assert.ok(has, `${c.id} claims evidence the coverage rules cannot see`);
    else assert.ok(!has && !m.familyEntry, `${c.id} says "${c.status}" beside records of its own, or on a family entry`);
    if (c.status === 'Limited comparability') assert.ok(c.domain === 'Canadian price' && m.headline.priceCADkg?.converted, `${c.id} is limited without a converted price`);
    // A price gap beside listings that give no price (out of stock) names them, rather than saying there are none.
    if (c.domain === 'Canadian price' && c.status === 'Gap') {
      const listed = db.prices.filter((p) => p.materialId === m.id && !p.quarantined);
      assert.ok(listed.every((p) => c.finding.includes(p.id)) && (listed.length > 0) !== c.finding.startsWith('No listing'), `${c.id}: "${c.finding}"`);
    }
  }
  // The rarely published properties a derived row names are exactly the ones the material's own products leave out.
  for (const c of derived.filter((x) => x.domain === 'Sparse properties' && x.status === 'Gap')) {
    const published = new Set(db.measurements.filter((m) => m.materialId === c.materialId && (m.numeric || m.qualitative) && !m.quarantined).map((m) => m.property));
    const named = c.finding.replace(/^Not published by its own products: /, '').replace(/\.$/, '').split(', ');
    assert.deepEqual(named.filter((p) => published.has(p)), [], `${c.id} names a property the material publishes`);
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

test('the excluded materials never read as printable, and trip the envelope gate on any window they publish', () => {
  // Excluded, and beyond the H2C's limits: the industrial high-temperature materials, whose H2C status says so once
  // (m146). The sintering filaments are excluded by scope, not by the envelope (D87): they print at 170 to 250 °C, and
  // their part is the sintered metal's. A material whose sheets publish no printing guidance, only the temperature its
  // test bars were printed at, has no window of its own (D63, m170): its gate is unknown, and its exclusion is its H2C
  // status.
  const excluded = db.materials.filter((m) => m.excluded && m.h2cStatus === 'Exceeds H2C limits');
  assert.ok(excluded.length >= 6, 'the six audited exclusions are still excluded');
  let published = 0;
  for (const m of excluded) {
    if (m.gates.nozzle.verdict === 'unknown') continue;
    published++;
    assert.equal(m.gates.nozzle.verdict, 'exceeds', `${m.name} nozzle gate`);
  }
  assert.ok(published >= 6, 'the six audited exclusions trip the gate on a window they publish');
});

test('a material is printable where one of its products is: each gate is the best of its profiles\', each window spans theirs', () => {
  // A rule over every material, where a test once pinned the case that found it (PPS-GF, one grade within the nozzle
  // limit beside one that is not; re-center phase 5). Precedence is GATE_PRECEDENCE: within first, unknown last.
  const PRECEDENCE = ['within', 'partial', 'exceeds-recommended', 'exceeds', 'unknown'];
  let mixed = 0;
  for (const m of db.materials) {
    const own = db.profiles.filter((p) => p.materialId === m.id && !p.retired);
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const verdicts = own.map((p) => p.gates[axis].verdict);
      assert.equal(m.gates[axis].verdict, PRECEDENCE.find((v) => verdicts.includes(v)) ?? 'unknown', `${m.name} ${axis}`);
      if (verdicts.includes('within') && verdicts.some((v) => v !== 'within')) mixed++;
      const ranges = own.map((p) => p[axis]).filter((t) => t.state === 'range' && t.max !== null);
      const window = m.print[`${axis}C`];
      if (!ranges.length) { assert.equal(window, null, `${m.name} ${axis} window`); continue; }
      if (ranges.some((r) => r.min === null)) assert.equal(window.min, null, `${m.name} ${axis}: no lower endpoint may be invented`);
      else assert.equal(window.min, Math.min(...ranges.map((r) => r.min)), `${m.name} ${axis} lower end`);
      assert.equal(window.max, Math.max(...ranges.map((r) => r.max)), `${m.name} ${axis} upper end`);
    }
  }
  assert.ok(mixed > 0, 'no material has a printable product beside one that is not, so the rule is untested');
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
      // A material declared not estimated (a family's maker-undisclosed home, D87, D106) shows what its products publish,
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
  // PA12-CF's strength range, the complaint that started the model, is its products' spread now, and
  // build/snapshot/summaries.csv holds it.
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
  // Two columns of one sheet (Panchroma Silk PLA and Panchroma CoPE) are two products, each with its own key:
  // FORMULATION-KEY-SPANS-MATERIALS stops a key shared across materials in the lint.
});

test('every family entry and alias owns no product, carries no value, is never a candidate, and has its members', () => {
  // A rule over every row of family_entries.csv, where the test once named five (PA, PA-CF, PA-GF, TPE, CoPA).
  const table = readCsvRows('family_entries.csv');
  const members = readCsvRows('family_members.csv');
  const entries = db.materials.filter((m) => m.familyEntry);
  assert.equal(entries.length, table.length);
  assert.equal(db.meta.counts.familyEntries, table.length);
  const kinds = new Map(table.map((r) => [r.MaterialID, r.Kind]));
  for (const m of entries) {
    const n = m.name;
    assert.equal(m.scope, 'Family entry', n);
    assert.equal(m.familyEntry.kind, kinds.get(m.id), n);
    const listed = members.filter((r) => r.FamilyMaterialID === m.id).map((r) => r.MemberMaterialID).sort();
    assert.deepEqual(m.familyEntry.members.map((x) => x.id).sort(), listed, `${n} members`);
    assert.ok(listed.length && m.familyEntry.members.every((x) => x.id && !byName(x.name)?.familyEntry), `${n}: a member is missing or is itself a family`);
    assert.ok(ESTIMATED.every((k) => !m.headline[k].known && !m.headline[k].estimate), `${n} carries a value`);
    assert.equal(db.grades.filter((g) => g.materialId === m.id && !g.retired).length, 0, `${n} owns a grade`);
    assert.equal(m.print.nozzleC, null, n);
    assert.notEqual(m.gates.scope, 'within', `${n} is a candidate`);
  }
  assert.ok(entries.some((m) => m.familyEntry.kind === 'family') && entries.some((m) => m.familyEntry.kind === 'alias'));
  assert.equal(db.meta.counts.h2cRelevant, db.materials.filter((m) => m.scope === 'H2C-relevant').length);
});

test('every record moves with its product: it sits under its grade\'s material, and a retired grade keeps none', () => {
  // A rule over every measurement, where the test once named the re-filed and retired grades of the 2026-09-13
  // duplicate-products audit (G050-02, G051-01 to -03, G039-03; G062-03 and eight more retired). What each product
  // publishes is in build/snapshot/products.csv; this is what a re-filing (moveGrade, D86) must leave behind.
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const retired = new Set(db.grades.filter((g) => g.retired).map((g) => g.id));
  assert.ok(retired.size > 0, 'no retired grade to check');
  for (const x of db.measurements.filter((m) => m.gradeId)) {
    assert.equal(x.materialId, gradeById.get(x.gradeId)?.materialId, `${x.id} is filed under ${x.materialId}, its grade ${x.gradeId} under another`);
    assert.ok(!retired.has(x.gradeId), `${x.id} is an active measurement of retired grade ${x.gradeId}`);
  }
  // Every re-filing and every republished sheet adds retired duplicates (m25's eight, m80's twenty, m113's
  // eighteen), so a fixed number measured the history rather than the rule. The rule is that the build counts
  // what the tables hold, and that nothing retired is lost: the count never falls below the 175 of 2026-09-20.
  const retiredIn = (table) => readFileSync(join(root, `data/tables/${table}.csv`), 'utf8').split('\n').filter((l) => /,Retired duplicate record,/.test(l)).length;
  assert.equal(db.meta.counts.retiredDuplicates.measurements, retiredIn('measurements'));
  assert.ok(db.meta.counts.retiredDuplicates.measurements >= 175);
  assert.equal(db.meta.counts.retiredDuplicates.evidence, retiredIn('evidence'));
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
  // Any family entry will do: the fixture is the first, whatever its name.
  const name = db.materials.find((m) => m.familyEntry?.kind === 'family').name;
  assert.ok(errorsFor((c) => { mat(c, name).familyEntry = null; mat(c, name).headline.density = { known: false, missing: 'not-published' }; }).some((e) => /no value, no estimate/.test(e)), name);
});

// Estimates must make sense in tandem across a family, not only one at a time.
test('estimates follow the physics of printing: under the melting point and the bar\'s own Vicat; fibre adds weight and stiffness and takes stretch', () => {
  // Rules over every estimate, where two tests once pinned the cases that found them (PET, BVOH, PA12, and the
  // polyamides PA66, PA66-CF, PA612, PA612-GF). The values are in build/snapshot/headlines.csv; a published value
  // that breaks the family order is EST-FAMILY-ORDER's, reviewed per record.
  const polymer = new Map(db.polymers.map((p) => [p.id, p]));
  const held = { melting: 0, vicat: 0, fibre: 0 };
  for (const m of db.materials) {
    const e = m.headline.hdt045?.estimate;
    if (!e) continue;
    // A semicrystalline bar cannot hold its shape above its melting point.
    const tm = polymer.get(m.estimateIdentity)?.meltingPointC;
    if (tm != null) { held.melting++; assert.ok(e.centre < tm, `${m.name} is estimated to deflect at ${e.centre} °C, at or above its polymer's melting point ${tm} °C`); }
    // An unfilled bar is capped by the highest Vicat its own products publish (D56): a slow crystalliser such as PET
    // deflects near its own Vicat, not near a crystalline bar's.
    if (m.modifier !== 'Unfilled / unspecified') continue;
    const vicat = db.measurements.filter((x) => x.materialId === m.id && x.property === 'Vicat softening temperature' && x.numeric && !x.implausible).map((x) => x.value);
    if (vicat.length) { held.vicat++; assert.ok(e.centre <= Math.max(...vicat), `${m.name} is estimated to deflect at ${e.centre} °C, above its own Vicat ${Math.max(...vicat)} °C`); }
  }
  // Fibre in a polymer: estimated no lighter, stiffer, and stretching less than the same polymer unfilled.
  const ORDER = { density: (f, u) => f >= u, tensileModulusXY: (f, u) => f > u, elongationXY: (f, u) => f < u };
  for (const m of db.materials.filter((x) => ['Carbon fibre', 'Glass fibre'].includes(x.modifier) && !x.familyEntry)) {
    const base = db.materials.find((x) => x.estimateIdentity && x.estimateIdentity === m.estimateIdentity && x.modifier === 'Unfilled / unspecified' && !x.familyEntry);
    for (const [key, ordered] of Object.entries(ORDER)) {
      const [f, u] = [m, base].map((x) => x?.headline[key]?.estimate?.centre);
      if (f == null || u == null) continue;
      held.fibre++;
      assert.ok(ordered(f, u), `${m.name} ${key} is estimated at ${f} beside unfilled ${base.name}'s ${u}`);
    }
  }
  for (const [rule, n] of Object.entries(held)) assert.ok(n > 0, `no estimate to check the ${rule} rule on`);
});

test('an elastomer\'s heat deflection and a support product\'s properties are not applicable, not estimated', () => {
  // Every material whose polymer is an elastomer, where the test once named five (TPU 85A, TPU 90A, TPC / TPEE, PEBA,
  // OBC). ISO 75 ends at 0.2 % outer-fibre strain, which needs a modulus near 225 MPa; heat deflection does not apply to
  // an elastomer by its headline definition (D56 as amended by D83), whatever its own sheet publishes.
  const morphology = new Map(db.polymers.map((p) => [p.id, p.morphology]));
  const elastomers = db.materials.filter((m) => morphology.get(m.estimateIdentity) === 'elastomer');
  assert.ok(elastomers.length > 0, 'no elastomer to check');
  for (const m of elastomers) {
    const h = m.headline.hdt045;
    assert.ok(h.notApplicable && !h.known && !h.estimate, `${m.name} has a heat deflection`);
  }
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
  // An estimated nozzle window starts above the polymer's melting point, or nothing melts: a rule over every one,
  // where the test once named PA66's.
  const meltingPoint = new Map(db.polymers.map((p) => [p.id, p.meltingPointC]));
  const estimated = db.materials.filter((m) => m.print.nozzleEstimate && meltingPoint.get(m.estimateIdentity) != null);
  assert.ok(estimated.length > 0, 'no estimated nozzle window on a polymer with a melting point');
  for (const m of estimated) assert.ok(m.print.nozzleEstimate.lo > meltingPoint.get(m.estimateIdentity), `${m.name}'s nozzle window starts at ${m.print.nozzleEstimate.lo} °C, not above its melting point`);
});

// --- 2026-09-13 estimate evidence: docs/audits/2026-09-13-estimate-evidence/ ---------------------
test('a value the estimate model keeps out is explained on its grade', () => {
  // The 2026-09-13 transcription pins that once opened this test are guarded elsewhere: a glass transition of
  // 1135780 °C (ISO 11357 read as the value, V000605) is outside its physics window (MEAS-PHYSICS-WINDOW); a film
  // (V000039) is never a product value (products.test.js); a flag (V000008) is its row's Data status, which a
  // migration sets; a Vicat (V000507) caps its material's heat deflection estimate, so a change to it moves
  // build/snapshot/headlines.csv; and every product heat deflection states 0.45 MPa or is as published (above).
  //
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

test('a study or reference grade is no product of its material and backs none of its values', () => {
  // A rule over every -R# grade, where the test once named three resin references (G055-R1, G058-R1, G087-R1). A
  // moulded value is never any product's value (products.test.js); a study grade's printed bars are its own record.
  const study = db.grades.filter((g) => /-R\d+$/.test(g.id));
  assert.ok(study.length > 0, 'no study or reference grade to check');
  for (const g of study) {
    const m = db.materials.find((x) => x.id === g.materialId);
    assert.ok(!m.gradeIds.includes(g.id), `${g.id} is listed as a procurement grade of ${m.name}`);
    const own = new Set(db.measurements.filter((x) => x.gradeId === g.id).map((x) => x.id));
    for (const [k, h] of Object.entries(m.headline)) {
      assert.ok(!own.has(h?.measurementId) && !own.has(h?.typical?.measurementId), `${g.id} backs ${m.name}'s ${k}`);
    }
  }
});

// --- 2026-09-13 manufacturer audit --------------------------------------------------------------
// docs/audits/2026-09-13-manufacturer-evidence/. Each test pins one change from its CHANGELOG.csv, so
// a later data edit that silently undoes one fails here rather than in front of a user.

// Regression: the quarantine moved the ABS median but the row still cited CA0069, and a wrong-product
// listing could still have been the buy link or the proof that ABS was in stock. Now a rule over every price.
test('a quarantined price observation backs no headline, buy link or stock claim, and a price moves with its product', () => {
  const prices = new Map(db.prices.map((p) => [p.id, p]));
  const quarantined = db.prices.filter((p) => p.quarantined);
  assert.ok(quarantined.length > 0, 'no quarantined price to check');
  for (const x of [...db.materials, ...db.grades]) {
    for (const id of x.headline?.priceCADkg?.priceIds ?? []) {
      assert.ok(!prices.get(id)?.quarantined, `${x.name ?? x.id}'s price cites quarantined ${id}`);
      // Moving a product moves its listings, and a material's price is its own products' (m25, D86).
      assert.equal(prices.get(id)?.materialId, x.materialId ?? x.id, `${x.name ?? x.id}'s price cites ${id}, another material's listing`);
    }
  }
  for (const m of db.materials) {
    if (m.buy) assert.ok(!quarantined.some((p) => p.url === m.buy.url && p.materialId === m.id), m.name);
  }
});

// D113: a foreign listing prices a product that has no Canadian listing, and nothing more. It is never a buy link, the
// proof of stock in Canada, or one of the listings a Canadian price is the median of.
test('a foreign listing lists nothing in Canada, and a product with a Canadian listing is priced from it alone', () => {
  const prices = new Map(db.prices.map((p) => [p.id, p]));
  for (const x of [...db.materials, ...db.grades]) {
    for (const id of x.buy?.priceIds ?? []) assert.ok(!prices.get(id)?.foreign, `${x.name ?? x.id}'s buy link or stock cites foreign ${id}`);
  }
  for (const g of db.grades) {
    const h = g.headline?.priceCADkg;
    if (!h) continue;
    const cited = h.priceIds.map((id) => prices.get(id));
    const canadian = db.prices.some((p) => p.gradeId === g.id && !p.foreign && p.headlineSample && p.regularPerKg !== null);
    if (canadian) assert.ok(cited.every((p) => !p.foreign) && !h.converted, `${g.id} has a Canadian listing but its price cites a foreign one`);
    else assert.ok(cited.every((p) => p.foreign) && h.converted, `${g.id}'s price is foreign and does not say so`);
  }
});

test('a qualitative result is evidence, never a number', () => {
  const qualitative = db.measurements.filter((m) => m.qualitative);
  assert.ok(qualitative.length > 0, 'no qualitative result to check');
  for (const m of qualitative) assert.deepEqual([m.numeric, m.value], [false, null], m.id);
});

// The Essentium profile needs 400 °C (P0160): it exceeds the nozzle gate on its own, while its material stays
// printable through another grade. A rule over every profile and axis now: the verdict is its own window's.
test('every profile\'s gate is its own published window against the H2C', () => {
  const limit = { nozzle: db.meta.h2cBaseline.nozzleC, bed: db.meta.h2cBaseline.bedC, chamber: db.meta.h2cBaseline.chamberC };
  const seen = new Set();
  for (const p of db.profiles) {
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const w = p[axis];
      const { verdict, reason } = p.gates[axis];
      seen.add(verdict);
      // An at-least window ("65˚C+", "> 100 °C") has a lower end and no upper: it is judged by its lower end, and the
      // chamber the H2C reaches only the bottom of is partial.
      if (w.state === 'range' && w.max === null && w.min !== null) {
        const expected = w.min > limit[axis] ? (w.requirement === 'recommended' ? 'exceeds-recommended' : 'exceeds') : axis === 'chamber' ? 'partial' : 'within';
        assert.equal(verdict, expected, `${p.id} ${axis}: at least ${w.min} °C against ${limit[axis]} °C`);
        continue;
      }
      // Within with no window: a statement that nothing is needed, or (D93) a chamber the maker asks to enclose, which
      // the H2C's heated chamber is, and nothing else.
      if (w.state !== 'range' || w.max === null) {
        const cleared = ['not-required', 'ambient'].includes(w.state) || (axis === 'chamber' && w.state === 'enclosed' && verdict === 'within');
        assert.ok(!['within', 'partial', 'exceeds', 'exceeds-recommended'].includes(verdict) || cleared, `${p.id} ${axis}: ${verdict} with no window`);
        continue;
      }
      const expected = w.max <= limit[axis] ? 'within'
        : axis === 'chamber' && w.min !== null && w.min <= limit[axis] ? 'partial'
        : w.requirement === 'recommended' ? 'exceeds-recommended' : 'exceeds';
      assert.equal(verdict, expected, `${p.id} ${axis}: ${w.min}-${w.max} °C against ${limit[axis]} °C`);
      // A window the H2C reaches only in part says how much, and is never within and never a failure (ABS-CF, PPA-CF).
      if (verdict === 'partial') assert.match(reason, /reaches only/, p.id);
    }
  }
  for (const v of ['within', 'partial', 'exceeds']) assert.ok(seen.has(v), `no profile is ${v}, so that branch is untested`);
});

test('the snapshot comes from the Method sheet', () => {
  const row = db.method.find((r) => r.section === 'Scope' && r.topic === 'Snapshot');
  assert.ok(row, 'Method has a Scope / Snapshot row');
  assert.ok(row.rule.startsWith(db.meta.snapshot));
});

// --- 2026-09-13 missing-data research -----------------------------------------------------------
// docs/audits/2026-09-13-missing-data-research/. Its recovered chamber windows (the Bambu sheets' row after a page
// break) are profiles.csv's; a product's window is its own profile's (products.test.js), each profile's verdict is its
// window's (above), and the materials' chamber verdicts are in build/snapshot/gates.csv.

test('a "-" in a data sheet is no setpoint, not zero and not "not required"', () => {
  // Every profile and material that lists no setpoint, where the test once named TPC / TPEE's.
  const profiles = db.profiles.filter((p) => p.chamber.state === 'no-setpoint');
  assert.ok(profiles.length > 0, 'no profile lists a "-" to check');
  for (const p of profiles) assert.deepEqual([p.gates.chamber.verdict, p.chamber.min, p.chamber.max], ['unknown', null, null], p.id);
  // A material's window and verdict are its profiles' (above), so a "-" never becomes a material's temperature either.
});

// A source that says an enclosure is not necessary has said no heated chamber is needed. One that
// recommends an enclosure has said nothing about 65 °C, unless its row declares the chamber "enclosed" for a type its
// printer maker's guide asks an enclosure for (D93; products.test.js holds those).
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
  // HDT after annealing at 130 and at 230 °C became one precise mean (audit 2026-09-15, C-01). The rule below covers
  // every conflict, so the four measurements that found it are no longer named.
  const { conflicts, outliers } = db.meta.estimateModel;
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
  // No product value is one either (products.test.js). TPU for AMS's flagged 1.19 GPa, the case that found it, left its
  // stiffness an estimate, which build/snapshot/headlines.csv holds.
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
  // IPCON PPA's 103 °C, the case that found it, is in build/snapshot/products.csv.
  assert.ok(annealed > 0, 'no product value is annealed at all, so the second half of the rule is untested');
});

// Flexural is not tensile: eSUN PLA-Lite publishes a flexural modulus and no tensile one, and has no stiffness of its
// own. A rule over every product value now: it is a measurement of a property its headline takes.
test('a product value is always a property its headline takes: a flexural modulus never fills the stiffness headline', () => {
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  const takes = new Map(db.registry.headlines.map((d) => [d.key, d.valueProperties]));
  let flexuralOnly = 0;
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (!v.measurementId) continue;
      assert.ok(takes.get(key)?.includes(byId.get(v.measurementId).property), `${g.id} ${key} is a ${byId.get(v.measurementId).property}`);
    }
    const own = db.measurements.filter((m) => m.gradeId === g.id);
    if (own.some((m) => m.property === 'Flexural modulus') && !own.some((m) => m.property === 'Tensile modulus')) {
      flexuralOnly++;
      assert.equal(g.headline?.tensileModulusXY, undefined, `${g.id} publishes no tensile modulus and has a stiffness value`);
    }
  }
  assert.ok(flexuralOnly > 0, 'no product publishes a flexural modulus alone, so the rule is untested');
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
  // PPA's band (80 °C upward), the case that found it, is chamber_bands.csv's; its gate is in build/snapshot/gates.csv.
  assert.ok(db.materials.some((m) => m.print?.chamberEstimate), 'no estimated chamber band, so the rule is untested');
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

// Each fixture below is chosen from the data by what it must be, not by its ID, so a re-filing or a new batch never
// breaks the proof that the check still fires.
test('a product value citing another product, or a material naming another\'s typical product, is an error', () => {
  const a = db.grades.find((g) => g.headline?.hdt045?.measurementId);
  const b = db.grades.find((g) => g.id !== a.id && g.headline?.density?.measurementId);
  const grade = (c, id) => c.grades.find((g) => g.id === id);
  assert.ok(errorsFor((c) => { grade(c, a.id).headline.hdt045.measurementId = grade(c, b.id).headline.density.measurementId; })
    .some((e) => e.includes(`${a.id} hdt045 cites ${b.headline.density.measurementId}, a measurement of ${b.id}`)), `${a.id} citing ${b.id}`);
  const m = db.materials.find((x) => x.headline.hdt045?.typical?.gradeId);
  const stranger = db.grades.find((g) => !g.retired && g.materialId !== m.id).id;
  assert.ok(errorsFor((c) => { mat(c, m.name).headline.hdt045.typical.gradeId = stranger; })
    .some((e) => e.includes(`names ${stranger} as its typical product`)), m.name);
});

test('a record filed under the wrong material is an error', () => {
  const x = db.measurements.find((m) => m.gradeId && db.grades.some((g) => g.id === m.gradeId && !g.retired));
  const other = db.materials.find((m) => m.id !== x.materialId).id;
  assert.ok(errorsFor((c) => { c.measurements.find((m) => m.id === x.id).materialId = other; })
    .some((e) => e.includes(`its grade ${x.gradeId} belongs to ${x.materialId}`)), x.id);
});

test('a procurement grade missing from GradeIDs is an error; a study grade is not', () => {
  const m = db.materials.find((x) => x.gradeIds.length > 0);
  assert.ok(errorsFor((c) => { mat(c, m.name).gradeIds = []; }).some((e) => e.includes(`${m.gradeIds[0]} belongs to this material`)), m.name);
  // That a study grade is never listed is the rule over every -R# grade above.
});

test('guidance that does not quote its printing evidence is an error', () => {
  const quoted = (x) => x.printingEvidence.map((id) => db.profiles.find((p) => p.id === id)).find(Boolean);
  const m = db.materials.find((x) => quoted(x) && x.guidance.chamber !== 'Not published' && quoted(x).chamber.text !== 'Not published');
  assert.ok(errorsFor((c) => { mat(c, m.name).guidance.chamber = 'Not published'; })
    .some((e) => e.includes(`chamber guidance "Not published" is not what its printing evidence ${quoted(m).id} says`)), m.name);
});

// Regression: the Environmental evidence column held a copy of family application notes for 31
// materials, and PC FR's coverage said "Evidence recorded" on the strength of polycarbonate's notes. The recovered
// Bambu chemical records (audit 2026-09-13) differ by material for the same reason: each is its own sheet's, and every
// verdict an environment requirement screens on is in build/snapshot/environment.csv, which verify compares.
test('environmental evidence and coverage describe only the material\'s own records', () => {
  for (const m of db.materials) {
    const own = new Set(db.evidence.filter((e) => e.materialId === m.id).map((e) => e.id));
    for (const id of m.evidenceIds.environmental) assert.ok(own.has(id), `${m.name} cites ${id}, another material's record, as its environmental evidence`);
  }
  const m = db.materials.find((x) => x.evidenceIds.environmental.length);
  const foreign = db.evidence.find((e) => e.materialId !== m.id).id;
  assert.ok(errorsFor((c) => { mat(c, m.name).evidenceIds.environmental = [foreign]; }).some((e) => e.includes(`Environmental evidence cites "${foreign}"`)), m.name);
  // A coverage row may not say Gap beside the material's own records, nor claim records it does not have.
  const stored = db.coverage.filter((x) => !x.derived && x.status !== 'Superseded');
  const dataOf = (c) => domainData(db, db.materials.find((x) => x.id === c.materialId))[c.domain];
  const beside = stored.find((c) => c.status === 'Evidence recorded' && dataOf(c)?.length > 0);
  assert.ok(errorsFor((c) => { c.coverage.find((x) => x.id === beside.id).status = 'Gap'; }).some((e) => e.includes(beside.id) && /says "Gap" beside/.test(e)), beside.id);
  const without = stored.find((c) => c.status === 'Gap' && dataOf(c) && dataOf(c).length === 0);
  assert.ok(errorsFor((c) => { c.coverage.find((x) => x.id === without.id).status = 'Evidence recorded'; }).some((e) => e.includes(without.id) && /has no record of its own/.test(e)), without.id);
});

// Systematic data audit: use the actual source tables, then introduce independent corruption.
import { loadTables } from '../build/src/load.js';
import { measurementIssues, rawNumber, normalizedRawValue, unitKey, unitsKnown } from '../build/src/measurement-rules.js';
import { normalQuantile, boundedQuantile } from '../build/src/estimate/numerics.js';
import { modulusFromShore, kindOf } from '../build/src/estimate/observations.js';
import { annealedBesideAsPrinted } from '../build/src/normalize/specimen.js';
import { domainData } from '../build/src/coverage-rules.js';
import { moistureState } from '../build/src/normalize/moisture.js';

// A published row whose raw value is written with a decimal comma ("4,30%"), chosen from the data by that shape.
const decimalComma = (wb) => wb.Properties.rows.find((r) => /^Published value/.test(r['Data status']) && /^\d+,\d{1,2}\D*$/.test(r['Raw value']) && r['Conversion factor'] === '1');

test('raw values reconcile, including decimal commas and grouped cycle counts', () => {
  const wb = loadTables(join(root, 'data'));
  assert.deepEqual(measurementIssues(db, wb), []);
  assert.equal(rawNumber('4,30%'), 4.3);
  assert.equal(rawNumber('123,460'), 123460);
  assert.equal(rawNumber('24 000 kg/cm2'), 24000);
  const row = decimalComma(wb);
  assert.ok(row, 'no published value written with a decimal comma to test against');
  const [normalized, raw] = [row['Normalized value'], row['Raw numeric']];
  row['Normalized value'] = String(Number(normalized) + 1);
  assert.ok(measurementIssues(db, wb).some((e) => e.where.includes(row.MeasurementID)), row.MeasurementID);
  row['Normalized value'] = normalized;
  row['Raw numeric'] = String(Number(raw) + 1);
  assert.ok(measurementIssues(db, wb).some((e) => e.where.includes(row.MeasurementID) && /cached normalized formula/.test(e.message)), row.MeasurementID);
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
  const row = decimalComma(wb);
  const before = row['Raw unit'];
  row['Raw unit'] = 'furlongs';
  assert.ok(measurementIssues(db, wb).some((e) => e.code === 'MEAS-UNIT-UNKNOWN' && e.where.includes(row.MeasurementID)), row.MeasurementID);
  row['Raw unit'] = before;
});

test('a strain at another endpoint is never an elongation at break, and a retired duplicate never reaches the database', () => {
  // The 2026-09-13 endpoint corrections (V000920 and its kin, a strain at maximum force filed as an elongation at
  // break) are a rule now: a strain whose own locator names another endpoint cannot be an Elongation at break (the
  // validator, below), and related evidence is always its column's property (above). A retired duplicate (V000894)
  // is audit trail only.
  assert.ok(!db.measurements.some((m) => m.dataStatus === 'Retired duplicate record'), 'a retired duplicate reached db.measurements');
  // Nanovia's "Elongation ultimate strength" is the strain at the maximum stress (m167): an ultimate strength is an
  // endpoint too.
  for (const shape of [/at max\.? force|at yield|at strength/i, /ultimate (tensile )?strength/i]) {
    const strain = db.measurements.find((m) => m.property === 'Tensile strain at strength' && shape.test(m.locator ?? ''));
    assert.ok(strain, `no strain at another endpoint (${shape}) to test against`);
    assert.ok(errorsFor((c) => { c.measurements.find((m) => m.id === strain.id).property = 'Elongation at break'; }).some((e) => e.includes(strain.id) && /endpoint/.test(e)), strain.id);
  }
});

test('a tensile value labelled only by a ±45° raster is XY; a ±45° bar beside the sheet\'s own XY bar is not (D91)', () => {
  const TENSILE = new Set(['Tensile modulus', 'Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength',
    'Elongation at break', 'Elongation at yield', 'Tensile strain at strength']);
  const RASTER_45 = /±\s?45|\+\s?\/\s?-\s?45|45°?\s?(?:and|\/)\s?-45|45°?-45°|45\/45/i;
  const BUILD = new Set(['XY', 'Z', 'XZ', 'ZX']);
  const sheetXY = (m) => db.measurements.some((x) => x !== m && x.sourceId === m.sourceId && x.gradeId === m.gradeId && x.property === m.property && x.direction === 'XY');
  let xy = 0;
  for (const m of db.measurements.filter((x) => TENSILE.has(x.property))) {
    const raster = m.direction === 'raster-45' || RASTER_45.test(`${m.printParameters ?? ''} ${m.locator ?? ''}`);
    if (!raster) continue;
    if (m.direction === 'XY') { xy++; continue; }
    if (BUILD.has(m.direction)) continue;
    assert.ok(sheetXY(m), `${m.id}: labelled only by a ±45° raster, so XY (${m.directionText})`);
  }
  assert.ok(xy > 20, `only ${xy} tensile values on a ±45° raster are XY`);
});

// OPEN-PROBLEMS §18, m191: a tensile bar its sheet shows or says stood upright is Z, the layer strength (D92). The
// label is the bar's, so every tensile value of that bar moves together, and each says where its sheet shows it.
test('a tensile bar its sheet shows upright is Z for every value of that bar, and says where', () => {
  const TENSILE = new Set(['Tensile modulus', 'Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength',
    'Elongation at break', 'Elongation at yield']);
  let moved = 0;
  for (const m of db.measurements.filter((x) => TENSILE.has(x.property) && x.direction === 'Z')) {
    const was = /Direction Z, was (ZX|XZ): (pp?\. \d+)/.exec(m.notes ?? '');
    if (!was) continue;
    moved++;
    const left = db.measurements.filter((x) => x.sourceId === m.sourceId && x.gradeId === m.gradeId && TENSILE.has(x.property) && x.direction === was[1]);
    assert.deepEqual(left.map((x) => x.id), [], `${m.id} is Z, but its sheet's other ${was[1]} tensile values are not`);
  }
  assert.ok(moved >= 20, `only ${moved} tensile values moved from an upright bar's label to Z`);
});

test('a retired grade or profile is archival, never active procurement or printing evidence', () => {
  // A rule over every material, where the test once named CoPE's retired grade and profile (G091-01, P0115).
  const retiredGrades = new Set(db.grades.filter((g) => g.retired).map((g) => g.id));
  const retiredProfiles = new Set(db.profiles.filter((p) => p.retired).map((p) => p.id));
  assert.ok(retiredGrades.size > 0 && retiredProfiles.size > 0, 'nothing retired to check');
  for (const m of db.materials) {
    assert.deepEqual(m.gradeIds.filter((id) => retiredGrades.has(id)), [], `${m.name} lists a retired grade`);
    assert.deepEqual(m.profileIds.filter((id) => retiredProfiles.has(id)), [], `${m.name} lists a retired profile`);
  }
  const g = db.grades.find((x) => x.retired);
  const owner = db.materials.find((m) => m.id === g.materialId);
  assert.ok(errorsFor((c) => { mat(c, owner.name).gradeIds.push(g.id); }).some((e) => e.includes(`retired mapping ${g.id}`)), g.id);
});

test('a headline cannot borrow another property simply because its value matches', () => {
  const id = db.grades.find((g) => g.headline?.tensileStrengthXY?.measurementId).id;
  const value = (c) => c.grades.find((g) => g.id === id).headline.tensileStrengthXY;
  assert.ok(errorsFor((c) => { const h = value(c); c.measurements.find((m) => m.id === h.measurementId).property = 'Flexural strength'; }).some((e) => /inconsistent property/.test(e)), id);
  assert.ok(errorsFor((c) => { const h = value(c); c.measurements.find((m) => m.id === h.measurementId).unit = 'GPa'; }).some((e) => /inconsistent property/.test(e)), id);
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
  // Any material estimated for stiffness and strength from evidence of its own will do; PA66 was the first.
  const name = db.materials.find((m) => !m.familyEntry && m.estimateIdentity
    && m.headline.tensileModulusXY?.estimate?.evidence?.[0]?.items?.[0]?.measurementId && m.headline.tensileStrengthXY?.estimate).name;
  const own = byName(name);
  assert.ok(errorsFor((c) => { delete mat(c, name).headline.tensileModulusXY.estimate; }).some((e) => /no value, no estimate/.test(e)), name);
  assert.ok(errorsFor((c) => { mat(c, name).headline.tensileModulusXY.estimate.lo = own.headline.tensileModulusXY.estimate.hi + 99; }).some((e) => /outside the likely range/.test(e)), name);
  assert.ok(errorsFor((c) => { mat(c, name).headline.tensileStrengthXY.estimate.plausible.hi = own.headline.tensileStrengthXY.estimate.lo - 1; }).some((e) => /not inside the plausible range/.test(e)), name);
  const keys = new Set(db.grades.filter((g) => g.materialId === own.id).map((g) => g.formulationKey));
  const foreign = db.measurements.find((m) => m.materialId !== own.id && !keys.has(db.grades.find((g) => g.id === m.gradeId)?.formulationKey)).id;
  assert.ok(errorsFor((c) => { mat(c, name).headline.tensileModulusXY.estimate.evidence[0].items[0].measurementId = foreign; }).some((e) => /neither this material/.test(e)), name);
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
  // PA66's estimated stiffness after setting some fields of one grade in a fresh copy of the tables. The three builds
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
  const retire = { Status: 'retired' };
  // Measured against a control, because removing any one product from a family moves the fit a little and that
  // movement is not what this test is about: retiring an ordinary PA6 grade, one with no variant declared, moves
  // PA66 by as much as retiring the declared compound does. The invariant is that the declared grade is no more
  // disturbing to its family than an ordinary sibling, which is what "explains its own offset" means; comparing it
  // with a fixed tolerance measured the model's sensitivity to its own data instead, and grew with the corpus.
  // The fixture is a real compound (Spectrum PA6 Neat, G049-01, a grade of PA6 that declares an undisclosed dense
  // filler); if the data stops saying so, the comparison below would compare a grade with itself, so it says so first.
  const grades = loadTables(join(root, 'data')).Grades.rows;
  const fixture = grades.find((g) => g.GradeID === 'G049-01');
  assert.ok(fixture?.Status === 'active' && /dense filler$/.test(fixture.Variant), 'G049-01 no longer declares a dense filler: choose another declared compound of PA6 for this test');
  const sibling = grades.find((g) => g.MaterialID === fixture.MaterialID && g.GradeID !== fixture.GradeID && g.Status === 'active' && g.Variant === 'Not applicable').GradeID;
  // The variant declared, as the tables have it, is the database this file already read: the build is deterministic
  // (contract.test.js builds it twice), so a fourth whole build would only repeat it.
  const declared = byName('PA66').headline.tensileModulusXY.estimate.centre;
  const [undeclared, without, control] = await Promise.all([
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
