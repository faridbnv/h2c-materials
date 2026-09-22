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

test('the stored values reproduce every parser reading today', () => {
  assert.deepEqual(run(() => {}).mismatches, []);
});

test('a typed value that disagrees with the raw text stops the build', () => {
  const { mismatches } = run((wb) => { profile(wb, 'P0003')['Nozzle max °C'] = '260'; });
  assert.deepEqual(mismatches, ['profiles P0003: Nozzle max is 260 but the parser reads the raw text as 220; correct the typed value, or explain it in Parse review']);
});

test('a raw text edit the typed value does not follow stops the build too', () => {
  const { mismatches } = run((wb) => { profile(wb, 'P0003')['Chamber °C'] = 'Not required'; });
  assert.ok(mismatches.some((m) => /P0003: Chamber state is range but the parser reads the raw text as not-required/.test(m)), mismatches.join(' | '));
});

test('a reviewed correction is accepted and decides the gate', () => {
  const { db, mismatches } = run((wb) => {
    Object.assign(profile(wb, 'P0003'), { 'Nozzle max °C': '360', 'Parse review': 'The data sheet table reads 190-360 °C; the PDF text layer drops the 3.' });
  });
  assert.deepEqual(mismatches, []);
  const p = db.profiles.find((x) => x.id === 'P0003');
  assert.equal(p.nozzle.max, 360);
  assert.equal(p.gates.nozzle.verdict, 'exceeds');
});

test('an HDT test load is typed and checked the same way', () => {
  const hdt = base.Properties.rows.find((r) => r.Property === 'HDT' && r['Test load MPa'] === '0.45');
  const { mismatches } = run((wb) => { wb.Properties.rows.find((r) => r.MeasurementID === hdt.MeasurementID)['Test load MPa'] = '1.8'; });
  assert.ok(mismatches.some((m) => m.startsWith(`measurements ${hdt.MeasurementID}: Test load MPa is 1.8`)), mismatches.join(' | '));
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

