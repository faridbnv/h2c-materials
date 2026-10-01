// Typed canonical values decide; the parsers check them. A disagreement stops the build unless a Parse
// review explains it, and then the reviewed value is what the tool uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));
const run = (edit) => {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  return { db, mismatches: issues.filter((i) => i.code === 'PARSE-MISMATCH').map((i) => `${i.where}: ${i.message}`) };
};
const profile = (wb, id) => wb['Print setup'].rows.find((r) => r.ProfileID === id);
// A profile whose typed nozzle and chamber windows the parser reads from its raw text, with nothing reviewed: chosen
// from the data by that shape, not by ID, so a re-read of one sheet cannot break the proof that the check fires.
const fixture = base['Print setup'].rows.find((r) => r['Parse review'] === 'Not applicable' && /^\d+$/.test(r['Nozzle max °C']) && Number(r['Nozzle max °C']) < 300
  && r['Chamber state'] === 'range');
const nozzleMax = Number(fixture?.['Nozzle max °C']);

test('the stored values reproduce every parser reading today', () => {
  assert.deepEqual(run(() => {}).mismatches, []);
  assert.ok(fixture, 'no profile with a parsed nozzle and chamber window to test against');
});

test('a typed value that disagrees with the raw text stops the build', () => {
  const { mismatches } = run((wb) => { profile(wb, fixture.ProfileID)['Nozzle max °C'] = String(nozzleMax + 40); });
  assert.deepEqual(mismatches, [`profiles ${fixture.ProfileID}: Nozzle max °C is ${nozzleMax + 40} but the parser reads the raw text as ${nozzleMax}; correct the typed value, or explain it in Parse review`]);
});

test('a raw text edit the typed value does not follow stops the build too', () => {
  const { mismatches } = run((wb) => { profile(wb, fixture.ProfileID)['Chamber °C'] = 'Not required'; });
  assert.ok(mismatches.some((m) => m.includes(`${fixture.ProfileID}: Chamber state is range but the parser reads the raw text as not-required`)), mismatches.join(' | '));
});

test('a reviewed correction is accepted and decides the gate', () => {
  // The cell states 360 after a clause the parser cuts off; the review names the column it explains (D115).
  const { db, mismatches } = run((wb) => {
    const p = profile(wb, fixture.ProfileID);
    Object.assign(p, { 'Nozzle °C': `${p['Nozzle °C']} drying 360`, 'Nozzle max °C': '360', 'Parse review': 'Fields: Nozzle max °C. The sheet\'s table prints a maximum of 360 °C after its drying note.' });
  });
  assert.deepEqual(mismatches, []);
  const p = db.profiles.find((x) => x.id === fixture.ProfileID);
  assert.equal(p.nozzle.max, 360);
  assert.equal(p.gates.nozzle.verdict, 'exceeds');
});

test('an HDT test load is typed and checked the same way', () => {
  const hdt = base.Properties.rows.find((r) => r.Property === 'HDT' && r['Test load MPa'] === '0.45');
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === hdt.MeasurementID)['Test load MPa'] = '1.8'; });
  assert.ok(mismatches.some((m) => m.startsWith(`measurements ${hdt.MeasurementID}: Test load MPa is 1.8`)), mismatches.join(' | '));
});

test('a test temperature is typed and checked the same way, and a wording with no number states none (m175)', async () => {
  const { readTestTemperature } = await import('../build/src/normalize/thermal.js');
  assert.deepEqual(['23°C', '23 °C', '-30°C', '21.5 °C', 'Room temperature', 'Not published'].map(readTestTemperature), [23, 23, -30, 21.5, null, null]);
  const cold = base.Properties.rows.find((r) => r['Test temperature'] === '-30°C' && r['Parse review'] === 'Not applicable');
  assert.equal(cold['Test temperature °C'], '-30');
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === cold.MeasurementID)['Test temperature °C'] = '23'; });
  assert.deepEqual(mismatches, [`measurements ${cold.MeasurementID}: Test temperature °C is 23 but the parser reads "-30°C" as -30; correct the typed value, or explain it in Parse review`]);
  // The compiled measurement carries it only where the source states one.
  const { db } = run(() => {});
  const stated = db.measurements.filter((m) => m.testTemperatureC != null);
  assert.ok(stated.length > 1000);
  const canonical = new Map(base.Properties.rows.map((r) => [r.MeasurementID, r]));
  for (const m of stated) {
    const r = canonical.get(m.id);
    assert.equal(m.testTemperatureC, Number(r['Test temperature °C']), m.id);
    if (m.testTemperatureC !== readTestTemperature(m.testTemperature)) {
      assert.ok(r['Parse review'] && r['Parse review'] !== 'Not applicable',
        `${m.id}: a raw/parser exception needs an explicit review`);
    }
  }
  // A reviewed source spelling keeps its typed value; removing the review restores the guard.
  const reviewed = run((wb) => {
    const r = wb.Properties.rows.find((x) => x.MeasurementID === cold.MeasurementID);
    r['Test temperature'] = '150℃';
    r['Test temperature °C'] = '150';
    r['Parse review'] = 'Fields: Test temperature °C. Source Celsius glyph transcribed as150°C; no other condition inferred.';
  });
  assert.deepEqual(reviewed.mismatches, []);
  assert.equal(reviewed.db.measurements.find((m) => m.id === cold.MeasurementID).testTemperatureC, 150);
  const unreviewed = run((wb) => {
    const r = wb.Properties.rows.find((x) => x.MeasurementID === cold.MeasurementID);
    r['Test temperature'] = '150℃';
    r['Test temperature °C'] = '150';
    r['Parse review'] = 'Not applicable';
  });
  assert.deepEqual(unreviewed.mismatches, [`measurements ${cold.MeasurementID}: Test temperature °C is 150 but the parser reads "150℃" as Not published; correct the typed value, or explain it in Parse review`]);
});

test('the annealing schedule is a typed pair the wording checks: three spellings of one schedule are one state', async () => {
  const { parseAnnealSchedule } = await import('../build/src/normalize/specimen.js');
  for (const text of ['All the specimens were annealed and dried at 55 °C for 8 h before testing', 'All the specimens were annealed and dried at 55 °C for 8 hours before testing', 'All the specimens were annealed and dried at 55 °C for 8 h ours before testing']) {
    assert.deepEqual(parseAnnealSchedule(text, 'annealed'), { tempC: 55, hours: 8 }, text);
  }
  assert.deepEqual(parseAnnealSchedule('All specimens were annealed at 80˚C for 30min and dried for 48h prior to testing', 'annealed'), { tempC: 80, hours: 0.5 });
  assert.deepEqual(parseAnnealSchedule('All specimens were annealed at 100 °C for 16 h, and immersed in water at 60 °C for 48 h prior to testing (average moisture content 2.57%)', 'annealed'), { tempC: 100, hours: 16 });
  assert.deepEqual(parseAnnealSchedule('HDT specimens annealed at 130 °C', 'annealed'), { tempC: 130, hours: null });
  assert.deepEqual(parseAnnealSchedule('* 3D printed at 100% infill and annealed at 110°C/20 min, XY axis', 'annealed'), { tempC: 110, hours: 0.3333 });
  assert.deepEqual(parseAnnealSchedule('All specimens were annealed at 100 ºC for 8h', 'annealed'), { tempC: 100, hours: 8 });
  assert.deepEqual(parseAnnealSchedule('Annealed (schedule not stated)', 'annealed'), { tempC: null, hours: null });
  // A sheet may state the same schedule the short way round, the time first and the temperature after an at
  // sign: Spectrum prints "annealed (4h @ 90°C)" beside its heat deflection rows, and read left to right the
  // temperature was 4.
  assert.deepEqual(parseAnnealSchedule('0.45 MN/m2, annealed (4h @ 90\u00b0C)', 'annealed'), { tempC: 90, hours: 4 });
  assert.deepEqual(parseAnnealSchedule('annealed (30min @ 120 C)', 'annealed'), { tempC: 120, hours: 0.5 });
  assert.equal(parseAnnealSchedule('As printed', 'as-printed'), null);
  const annealed = base.Properties.rows.find((r) => r['Anneal °C'] === '55').MeasurementID;
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === annealed)['Anneal °C'] = '65'; });
  assert.ok(mismatches.some((m) => m.startsWith(`measurements ${annealed}: Anneal °C is 65`)), mismatches.join('\n'));
});

test('a typed state that contradicts the source\'s own words stops the build; a wording that says nothing does not', () => {
  const meas = (wb, id) => wb.Properties.rows.find((r) => r.MeasurementID === id);
  const annealed = base.Properties.rows.find((r) => r['Post-processing state'] === 'annealed').MeasurementID;
  const one = run((wb) => { meas(wb, annealed)['Post-processing state'] = 'as-printed'; });
  assert.ok(one.mismatches.some((m) => m.startsWith(`measurements ${annealed}: Post-processing state is as-printed`)), one.mismatches.join(' | '));

  const wet = base.Properties.rows.find((r) => r['Moisture state'] === 'conditioned').MeasurementID;
  const two = run((wb) => { meas(wb, wet)['Moisture state'] = 'dry'; });
  assert.ok(two.mismatches.some((m) => m.startsWith(`measurements ${wet}: Moisture state is dry`)), two.mismatches.join(' | '));

  // A new datasheet sentence is data, not a schema change: an unseen wording the reader has no opinion on compiles,
  // and the typed column decides. This is what m43 bought; before it, the sentence had to be added to a vocabulary.
  const unstated = base.Properties.rows.find((r) => r['Post-processing state'] === 'not-stated').MeasurementID;
  const three = run((wb) => { meas(wb, unstated)['Post-processing'] = 'Specimens rested in the bag for a week'; });
  assert.deepEqual(three.mismatches, []);

  // The states stay tied to the schedule beside them: a row that states no heat treatment cannot carry one.
  const four = run((wb) => { const r = meas(wb, annealed); r['Post-processing'] = 'Specimens rested in the bag for a week'; r['Post-processing state'] = 'not-stated'; });
  assert.ok(four.mismatches.some((m) => /Anneal °C is/.test(m)), four.mismatches.join(' | '));
});

test('the standards a row names are a typed list the source\'s words check', async () => {
  const { readStandards } = await import('../build/src/normalize/standards.js');
  // The same test, five ways a sheet prints it.
  for (const text of ['ISO 527', 'ISO527,GB/T1040', 'ISO 527-2/50', 'ISO 527-1/-2; 23 °C, 50 mm/min', 'ISO 527 (testing speed 5 mm/min)']) {
    assert.ok(readStandards(text).includes('ISO 527'), text);
  }
  assert.deepEqual(readStandards('ISO 527, GB/T 1040'), ['ISO 527', 'GB/T 1040']);
  assert.deepEqual(readStandards('D 638'), ['ASTM D638'], "ASTM's designations are printed without the body");
  assert.deepEqual(readStandards('ASTM D638; Type I; 5 mm/min'), ['ASTM D638'], 'a bare D638 inside ASTM D638 is not a second standard');
  assert.deepEqual(readStandards('GB/T 1040.4, 50 mm/min'), ['GB/T 1040'], 'a sub-part is the same test as its parent');
  // A method named where a standard would go is recorded only when no standard is named beside it.
  assert.deepEqual(readStandards('DSC, 10 °C/min'), ['DSC']);
  assert.deepEqual(readStandards('ISO 11357-1-3, DSC 10 °C/min'), ['ISO 11357']);
  // Nothing is inferred: a condition the sheet prints instead of a standard names none.
  for (const text of ['210 °C, 2.16 kg', 'Not published', 'Study staircase method; run-out 1,000,000 cycles', 'Equilibrium water absorption']) {
    assert.deepEqual(readStandards(text), [], text);
  }

  const row = base.Properties.rows.find((r) => r.Standards === 'ISO 527; GB/T 1040');
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === row.MeasurementID).Standards = 'ISO 178'; });
  assert.ok(mismatches.some((m) => m.startsWith(`measurements ${row.MeasurementID}: Standards is ISO 178`)), mismatches.join(' | '));
});


// D63 and m170: a print profile is the maker's printing guidance. How its test bars were printed is a condition of the
// measurements, and a profile that once held those settings holds none, and says so.
test('a print profile holds guidance, never how the test bars were printed', () => {
  const temps = ['Nozzle °C', 'Bed °C', 'Chamber °C'];
  for (const p of base['Print setup'].rows) {
    for (const c of temps) assert.doesNotMatch(p[c], /specimen|test (bar|piece|sample)|spline/i, `${p.ProfileID} ${c}`);
    if (/not printing guidance/.test(p.Locator)) for (const c of temps) assert.equal(p[c], 'Not published', `${p.ProfileID} ${c}`);
  }
});

// An at-least value ("65˚C+", "> 100 °C") has no upper end: no gate reads it as within by one.
test('an at-least window is never within the chamber by its upper end', () => {
  const { db } = run(() => {});
  const open = db.profiles.filter((p) => p.chamber.state === 'range' && p.chamber.max == null && p.chamber.min != null);
  assert.ok(open.length, 'no at-least chamber window to hold the rule to');
  for (const p of open) {
    const expected = p.chamber.min > 65 ? /^exceeds/ : /^partial$/;
    assert.match(p.gates.chamber.verdict, expected, `${p.id}: ${p.chamber.text}`);
  }
});

test('a Parse review silences only the columns it names (D115)', () => {
  const noteOnDrying = 'Fields: Drying °C. The sheet prints the drying temperature without its unit.';
  const { mismatches } = run((wb) => { Object.assign(profile(wb, fixture.ProfileID), { 'Nozzle max °C': String(nozzleMax + 40), 'Parse review': noteOnDrying }); });
  assert.ok(mismatches.some((m) => m.startsWith(`profiles ${fixture.ProfileID}: Nozzle max °C is ${nozzleMax + 40}`)), mismatches.join(' | '));
});

test('a review that names no columns, or a column its row lacks, stops the build (PARSE-REVIEW-SCOPE)', () => {
  const codes = (edit) => { const wb = structuredClone(base); edit(wb); return compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' }).issues.filter((i) => i.code === 'PARSE-REVIEW-SCOPE').map((i) => i.where); };
  assert.deepEqual(codes((wb) => { profile(wb, fixture.ProfileID)['Parse review'] = 'The sheet says so.'; }), [`profiles ${fixture.ProfileID}`]);
  assert.deepEqual(codes((wb) => { profile(wb, fixture.ProfileID)['Parse review'] = 'Fields: Bed width. The sheet says so.'; }), [`profiles ${fixture.ProfileID}`]);
  assert.deepEqual(codes((wb) => { profile(wb, fixture.ProfileID)['Parse review'] = 'Fields: none. A note about the sheet.'; }), []);
});

test('a typed endpoint its cell does not state, and an open bound typed as a point, stop the build whatever a review says', () => {
  const issuesOf = (edit, code) => { const wb = structuredClone(base); edit(wb); return compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' }).issues.filter((i) => i.code === code).map((i) => i.message); };
  // The data audit's case: a bed minimum of 3 read from "for 3D printers", behind a review about another column.
  const bounds = issuesOf((wb) => { Object.assign(profile(wb, fixture.ProfileID), { 'Bed °C': '90 - 110°C', 'Bed state': 'range', 'Bed min °C': '3', 'Bed max °C': '110', 'Bed requirement': 'required', 'Parse review': 'Fields: Bed min °C. Reviewed.' }); }, 'PARSE-TEXT-BOUNDS');
  assert.deepEqual(bounds, ['Bed min °C is 3, a number "90 - 110°C" does not state']);
  const open = issuesOf((wb) => { Object.assign(profile(wb, fixture.ProfileID), { 'Bed °C': '> 80 °C recommended', 'Bed state': 'range', 'Bed min °C': '80', 'Bed max °C': '80', 'Bed requirement': 'required', 'Parse review': 'Fields: Bed max °C. Reviewed.' }); }, 'OPEN-BOUND-WINDOW');
  assert.deepEqual(open, ['Bed "> 80 °C recommended" is an open bound, but its typed window is the single point 80']);
});

test('an at-least window followed by words stays open', async () => {
  const { parseTemperature } = await import('../build/src/normalize/process.js');
  for (const text of ['> 80 °C recommended', '≥ 90 °C for large parts', '>80°C']) {
    const p = parseTemperature(text, { plausible: [0, 250] });
    assert.deepEqual([p.min, p.max, p.openHigh], [Number(text.match(/\d+/)[0]), null, true], text);
  }
  assert.deepEqual(['min', 'max'].map((k) => parseTemperature('90 - 110°C', { plausible: [0, 250] })[k]), [90, 110]);
});
