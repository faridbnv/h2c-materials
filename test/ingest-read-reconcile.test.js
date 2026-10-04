// The reader round's reconciler (scripts/ingest/read-reconcile.mjs), on a fixture page and fixture held rows: CI has no
// document cache, so nothing here reads one. What is asserted is the rule: a reading is borne out by the page or it is
// visual-only, it is classed against what the tables hold, and what decides needs a second read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../scripts/ingest/context.mjs';
import { documentFrom, numbersIn, presence, sameNumber } from '../scripts/ingest/read-common.mjs';
import { parseReadings, reconcile, secondStatus } from '../scripts/ingest/read-reconcile.mjs';
import { planBatches } from '../scripts/ingest/read-packet.mjs';
import { HEADER } from '../scripts/ingest/read-common.mjs';

const doc = documentFrom({
  1: {
    line: [
      'Properties (dry state)',
      'Tensile Strength (X-Y) ISO 527 38 ± 4 MPa',
      'Tensile Strength (Z) ISO 527 26 ± 2 MPa',
      'Density ISO 1183 1,22 g/cm³',
      'Nozzle Temperature 210 - 240 °C',
      'Bed Temperature 35 - 45 °C',
      'Blast Drying Oven: 55 °C, 8 h',
    ],
  },
  2: { line: ['Modulus Strength', '2790 38'], block: ['Modulus 2790', 'Strength 38'] },
  3: { line: [], ocr: ['Chamber Temperature 60 °C'] },
});

const tables = {
  properties: [
    { Property: 'Tensile strength (endpoint unspecified)', Units: 'MPa' }, { Property: 'Density', Units: 'kg/m³' },
    { Property: 'Tensile modulus', Units: 'GPa' }, { Property: 'HDT', Units: '°C' },
  ],
  sources: [{ SourceID: 'S-1', SHA256: 'x', 'Applicable grades': 'G001-01' }],
  grades: [{ GradeID: 'G001-01', SourceID: 'S-1', Manufacturer: 'Acme', 'Product name': 'Acme PA-CF' }],
  measurements: [
    { MeasurementID: 'V1', SourceID: 'S-1', GradeID: 'G001-01', Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '38 ± 4 MPa', 'Raw unit': 'MPa', 'Raw numeric': '38', 'Normalized value': '38', 'Normalized unit': 'MPa', Operator: '=', Direction: 'XY', 'Moisture state': 'dry', 'Post-processing state': 'as-printed', 'Specimen type': 'Printed specimen', Locator: 'p. 1: Tensile Strength (X-Y)' },
    { MeasurementID: 'V2', SourceID: 'S-1', GradeID: 'G001-01', Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '26 ± 2 MPa', 'Raw unit': 'MPa', 'Raw numeric': '26', 'Normalized value': '26', 'Normalized unit': 'MPa', Operator: '=', Direction: 'Z', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Specimen type': 'Not published', Locator: 'p. 1: Tensile Strength (Z)' },
    { MeasurementID: 'V3', SourceID: 'S-1', GradeID: 'G001-01', Property: 'Density', 'Raw value': '1.22 g/cm³', 'Raw unit': 'g/cm³', 'Raw numeric': '1.22', 'Normalized value': '1220', 'Normalized unit': 'kg/m³', Operator: '=', Direction: 'Not applicable', 'Moisture state': 'dry', 'Post-processing state': 'not-stated', 'Specimen type': 'Not published', Locator: 'p. 1: Density' },
    { MeasurementID: 'V4', SourceID: 'S-1', GradeID: 'G001-01', Property: 'Tensile modulus', 'Raw value': '999 MPa', 'Raw unit': 'MPa', 'Raw numeric': '999', 'Normalized value': '0.999', 'Normalized unit': 'GPa', Operator: '=', Direction: 'XY', 'Moisture state': 'dry', 'Post-processing state': 'not-stated', 'Specimen type': 'Not published', Locator: 'p. 1: Modulus' },
  ],
  profiles: [{
    ProfileID: 'P1', SourceID: 'S-1', GradeID: 'G001-01', Profile: 'Manufacturer published guidance', 'Nozzle °C': '210 - 240 °C', 'Nozzle min °C': '210', 'Nozzle max °C': '240', 'Nozzle state': 'range',
    'Bed °C': '40-50', 'Bed min °C': '40', 'Bed max °C': '50', 'Bed state': 'range', 'Chamber °C': 'Not published', 'Chamber min °C': 'Not applicable', 'Chamber max °C': 'Not applicable', 'Chamber state': 'unknown',
    Drying: 'Blast Drying Oven: 55 °C, 8 h', 'Drying state': 'stated', 'Drying °C': '55', 'Drying hours': '8', Enclosure: 'Not published', 'Enclosure state': 'unknown', Locator: 'Recommended printing settings',
  }],
  page_context: [],
};

const row = (o) => Object.fromEntries(HEADER.map((h) => [h, String(o[h] ?? '')]).concat([['RowID', `t#${o.i ?? 1}`]]));
const value = (o) => row({ source_id: 'S-1', page: '1', kind: 'value', grade_id: 'G001-01', unit: 'MPa', operator: '=', confidence: 'high', ...o });
const setting = (o) => row({ source_id: 'S-1', page: '1', kind: 'setting', grade_id: 'G001-01', unit: '°C', confidence: 'high', ...o });
const run = (rows, seconds = []) => reconcile({ rows, seconds, tables, documentFor: async () => doc });
const only = async (r, seconds) => (await run([r], seconds)).rows[0];

test('numbers are compared at the coarser precision, and read out of ranges and decimal commas', () => {
  assert.deepEqual(numbersIn('40-70°C'), [40, 70]);
  assert.deepEqual(numbersIn('1,22 g/cm³'), [1.22]);
  assert.ok(sameNumber('1.22', '1.2'));
  assert.ok(sameNumber('38', 38));
  assert.ok(!sameNumber('38', '39'));
});

test('a number and a quote are on the page in the text layer, in the reading-order blocks, in the OCR, or the row is visual-only', () => {
  assert.equal(presence(doc, 1, { numbers: ['38'], quote: 'Tensile Strength (X-Y) ISO 527 38 ± 4 MPa' }).presence, 'text');
  assert.equal(presence(doc, 1, { numbers: ['1.22'], quote: 'Density ISO 1183 1,22 g/cm³' }).presence, 'text', 'a decimal comma is the same number');
  assert.equal(presence(doc, 1, { numbers: ['55'], quote: 'Blast Drying Oven 55 °C 8 h' }).presence, 'text', 'a dropped comma is no difference');
  assert.equal(presence(doc, 2, { numbers: ['2790'], quote: 'Modulus 2790' }).presence, 'block', 'the line view interleaves the columns; the block view does not');
  assert.equal(presence(doc, 3, { numbers: ['60'], quote: 'Chamber Temperature 60 °C' }).presence, 'ocr');
  const missing = presence(doc, 1, { numbers: ['39'], quote: 'Tensile Strength (X-Y) ISO 527 39 MPa' });
  assert.equal(missing.presence, 'visual-only');
  assert.ok(missing.flags.includes('number-not-on-page:39') && missing.flags.includes('quote-not-on-page'));
  assert.equal(presence(doc, 1, { numbers: ['38'], quote: '' }).presence, 'visual-only', 'no quote, no proof');
  assert.equal(presence(doc, 9, { numbers: ['38'], quote: 'x' }).presence, 'visual-only');
  assert.ok(presence(doc, 1, { numbers: ['5'], quote: 'Tensile Strength' }).flags.includes('number-not-on-page:5'), 'a 5 is not found inside 55 or 35');
});

test('a value the tables hold with the same number is a confirmation, with the conditions telling XY from Z', async () => {
  const xy = await only(value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '38', direction: 'X-Y', quote: 'Tensile Strength (X-Y) ISO 527 38 ± 4 MPa' }));
  assert.equal(xy.Class, 'confirms'); assert.equal(xy.HeldIDs, 'V1'); assert.equal(xy.Presence, 'text'); assert.equal(xy.SecondRead, 'not-required');
  const z = await only(value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '26', direction: 'Z', quote: 'Tensile Strength (Z) ISO 527 26 ± 2 MPa' }));
  assert.equal(z.Class, 'confirms'); assert.equal(z.HeldIDs, 'V2');
});

test('a different number under the same property, page and conditions is a mismatch that needs a second read', async () => {
  const r = await only(value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '39', direction: 'XY', quote: 'Tensile Strength (X-Y) ISO 527 39 ± 4 MPa' }));
  assert.equal(r.Class, 'mismatch'); assert.equal(r.HeldIDs, 'V1');
  assert.equal(r.Presence, 'visual-only');
  assert.equal(r.SecondRead, 'pending');
  const same = await only(value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '38', direction: 'XY', quote: 'Tensile Strength (X-Y) ISO 527 38 ± 4 MPa' }));
  assert.equal(same.SecondRead, 'not-required');
});

test('with no held row under that property the reading is new, and a new decision value needs a second read', async () => {
  const hdt = await only(value({ field: 'HDT', number_lo: '55', unit: '°C', quote: 'Bed Temperature 35 - 45 °C' }));
  assert.equal(hdt.Class, 'new');
  assert.equal(hdt.SecondRead, 'pending');
  const unmapped = await only(value({ field: 'unmapped:Melt Index', number_lo: '1,22', unit: 'g/10 min', quote: 'Density ISO 1183 1,22 g/cm³' }));
  assert.equal(unmapped.Class, 'unmapped');
});

test('a page value in the other state is not the held row\'s: dry against conditioned is a new row, not a mismatch', async () => {
  const r = await only(value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '30', direction: 'XY', moisture: 'Conditioned 50 % RH', quote: 'Tensile Strength (X-Y) ISO 527 38 ± 4 MPa' }));
  assert.equal(r.Class, 'new');
});

test('a unit the unit in the table does not know is refused, not guessed at', async () => {
  const result = await run([value({ field: 'Density', number_lo: '1.22', unit: 'furlongs', quote: 'x' }), value({ field: 'Nonsense', number_lo: '1', quote: 'x' }), { ...row({ source_id: 'S-1', page: '1', kind: 'sparkle' }) }]);
  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.invalid.map((r) => r.bad[0].split(':')[0]), ['unit-unknown', 'property-unknown', 'kind']);
});

test('settings are compared with the profile: same range confirms, other range mismatches, none held is new', async () => {
  const same = await only(setting({ field: 'nozzle', number_lo: '210', number_hi: '240', quote: 'Nozzle Temperature 210 - 240 °C' }));
  assert.equal(same.Class, 'confirms'); assert.equal(same.HeldIDs, 'P1');
  const other = await only(setting({ field: 'bed', number_lo: '35', number_hi: '45', quote: 'Bed Temperature 35 - 45 °C' }));
  assert.equal(other.Class, 'mismatch'); assert.equal(other.Presence, 'text'); assert.equal(other.SecondRead, 'pending');
  const chamber = await only(setting({ field: 'chamber', number_lo: '60', page: '3', quote: 'Chamber Temperature 60 °C' }));
  assert.equal(chamber.Class, 'new'); assert.equal(chamber.Presence, 'ocr'); assert.equal(chamber.SecondRead, 'pending');
  const drying = await only(setting({ field: 'drying', number_lo: '55', test_conditions: 'hours=8', quote: 'Blast Drying Oven: 55 °C, 8 h' }));
  assert.equal(drying.Class, 'confirms');
  const wrongHours = await only(setting({ field: 'drying', number_lo: '55', test_conditions: 'hours=4', quote: 'Blast Drying Oven: 55 °C, 8 h' }));
  assert.equal(wrongHours.Class, 'mismatch');
  const speed = await only(setting({ field: 'print_speed', number_lo: '210', unit: 'mm/s', quote: 'Nozzle Temperature 210 - 240 °C' }));
  assert.equal(speed.Class, 'new'); assert.equal(speed.SecondRead, 'not-required', 'a speed does not decide whether a product prints');
});

test('a held row the reader could not find is looked for on the page: found there, it is a confirmation the reader missed', async () => {
  const there = await only(value({ field: 'Density', verdict: 'not-on-page', held_id: 'V3', quote: '' }));
  assert.equal(there.Class, 'confirms'); assert.match(there.Flags, /reader-missed-held-row/);
  const gone = await only(value({ field: 'Tensile modulus', verdict: 'not-on-page', held_id: 'V4', page: '1', quote: '' }));
  assert.equal(gone.Class, 'not-on-page'); assert.match(gone.Flags, /held-value-not-on-page/);
});

test('a context heading lists the held rows on its page that would inherit it, and those it contradicts', async () => {
  const r = await only(row({ source_id: 'S-1', page: '1', kind: 'context', field: 'tensile', moisture: 'Conditioned', post_processing: 'annealed 80 °C 4 h', table_heading: 'Properties', quote: 'Properties (dry state)', confidence: 'high' }));
  assert.equal(r.Class, 'context');
  assert.match(r.HeldValues, /V2\(moisture=conditioned,treatment=annealed\)/, 'V2 states neither');
  assert.match(r.Flags, /contradicts:V1:moisture/, 'V1 is dry');
  assert.match(r.Flags, /contradicts:V1:treatment/, 'V1 is as printed');
});

test('a second reading of the same place with the same numbers agrees; other numbers disagree; none leaves it pending', async () => {
  const first = value({ field: 'Tensile strength (endpoint unspecified)', number_lo: '39', direction: 'XY', quote: 'x' });
  const second = (n) => ({ ...value({ field: 'Tensile strength (endpoint unspecified)', number_lo: n, direction: 'XY', quote: 'x' }), RowID: 's#1' });
  assert.equal(secondStatus(first, []), 'pending');
  assert.equal(secondStatus(first, [second('39')]), 'agreed');
  assert.equal(secondStatus(first, [second('41')]), 'disagrees');
  assert.equal((await run([first], [second('39')])).rows[0].SecondRead, 'agreed');
  const result = await run([first]);
  assert.equal(result.tasks.length, 1);
  assert.deepEqual(Object.keys(result.tasks[0]), ['task_id', 'source_id', 'page', 'kind', 'field', 'product', 'label', 'locator'], 'a task carries no value');
});

test('held rows no reading named are reported', async () => {
  const result = await run([value({ field: 'Density', number_lo: '1.22', unit: 'g/cm³', quote: 'Density ISO 1183 1,22 g/cm³' })]);
  assert.deepEqual(result.unreadHeld.filter((u) => u.Kind === 'measurement').map((u) => u.ID), ['V1', 'V2', 'V4']);
  assert.deepEqual(result.unreadHeld.filter((u) => u.Kind === 'profile').map((u) => u.ID), ['P1']);
});

test('the schema document\'s examples parse with the schema\'s own columns', () => {
  const md = readFileSync(join(projectRoot, 'docs/audits/2026-10-04-reader-round/READING-SCHEMA.md'), 'utf8');
  const examples = [...md.matchAll(/```csv\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  assert.ok(examples.length >= 4);
  const rows = parseReadings(`${HEADER.join(',')}\n${examples.join('\n')}\n`, 'schema-examples');
  assert.equal(rows.length, examples.length);
  assert.deepEqual([...new Set(rows.map((r) => r.kind))].sort(), ['context', 'setting', 'value']);
  const prompt = readFileSync(join(projectRoot, 'docs/audits/2026-10-04-reader-round/READER-PROMPT.md'), 'utf8');
  assert.equal(parseReadings(`${HEADER.join(',')}\n${[...prompt.matchAll(/```csv\n([\s\S]*?)```/g)].map((m) => m[1].trim()).join('\n')}\n`, 'prompt-examples').length, 3);
});

test('a readings file without the schema\'s columns is refused', () => {
  assert.throws(() => parseReadings('source_id,page\nS-1,1\n', 'bad.csv'), /missing column/);
});

test('batches fill to the page budget, never mix tiers, and a long document stands alone', () => {
  const d = (id, tier, pages, publisher = 'P') => ({ SourceID: id, Tier: tier, Pages: String(pages), Publisher: publisher });
  const batches = planBatches([d('a', '1', 20), d('b', '1', 20), d('c', '1', 20), d('d', '2', 3), d('e', '1', 100), d('f', '1', 0)], { size: 25, pages: 45 });
  assert.deepEqual(batches.map((b) => [b.tier, b.docs.map((x) => x.SourceID)]), [['1', ['a', 'b']], ['1', ['c']], ['1', ['e']], ['1', ['f']], ['2', ['d']]]);
  assert.equal(planBatches([d('a', '1', 1), d('b', '1', 1), d('c', '1', 1)], { size: 2, pages: 45 }).length, 2, 'the document cap applies too');
});
