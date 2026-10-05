// Ligatures a PDF font maps to a digit or W: "ti" read as 3, 5, 8, > or +, "ft" as W (purefil/Fabru sheets). The fixture is the
// purefil COC tough page as the cache holds it (R-FABRU-PUREFIL-10802): its labels are damaged and its numbers are not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { repairLigatures } from '../scripts/lib/pdf-text.mjs';
import { readSheet } from '../scripts/ingest/propose.mjs';
import { documentFrom, presence } from '../scripts/ingest/read-common.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = new Map(readCsv(join(root, 'data/tables/properties.csv')).records.map((r) => [r.values.Property, r.values]));

const PAGE = [
  'specially developed for applica>ons where mechanical strength, chemical resistance and',
  'op>cal neutrality are required. Through targeted impact taming modifica>on, the material',
  'Prin5ng temperature 240 - 280 °C',
  'Hea5ng bed temperature 80 - 100 °C',
  'Elonga5on at break (ISO 527-2/1A) 20 %',
  'Heat deflec5on temperature 160 °C',
  'Drying 5me 4 h',
  'Vicat SoWening temperature 156 °C',
  'Thermal conduc5vity 23°C - W/(K*m)',
];

test('a ligature a font mapped to a digit, > , + or W is put back in a word, and nothing else changes', () => {
  assert.equal(repairLigatures('Prin5ng temperature'), 'Printing temperature');
  assert.equal(repairLigatures('Prin3ng temperature Shrinkage 1 %'), 'Printing temperature Shrinkage 1 %');
  assert.equal(repairLigatures('Hea5ng bed temperature'), 'Heating bed temperature');
  assert.equal(repairLigatures('Drying 5me'), 'Drying time');
  assert.equal(repairLigatures('elonga3on at break'), 'elongation at break');
  assert.equal(repairLigatures('applica8ons, applica>ons. proper+es'), 'applications, applications. properties');
  assert.equal(repairLigatures('thermoplas8c and elas+city'), 'thermoplastic and elasticity');
  assert.equal(repairLigatures('Vicat SoWening temperature'), 'Vicat Softening temperature');
  assert.equal(repairLigatures('the 5ps and 3tle'), 'the tips and title');
  // numbers, units, names and addresses are not words with a ligature
  for (const same of ['Printing temperature 240 - 280 °C', '5 mm', '3D printers', 'Slic3r', 'eryone3d', 'info@multi3dllc.com', 'FiberWood', 'PolyWood™', 'NatureWorks',
    'MakerWorld', 'CreatWare', 'SolidWorks', 'AgustaWestland', 'kWh', 'W/(K*m)', 'ISO 527-2/5A/500', 'Mg3Al', 'H2O', '>200', 'pe3ybTaTbl', '1,75', '23°C']) {
    assert.equal(repairLigatures(same), same, same);
  }
  assert.equal(repairLigatures(''), ''); assert.equal(repairLigatures(null), '');
});

test('a quote copied from the rendered page is borne out by the repaired view, and the numbers are the page\'s own', () => {
  const doc = documentFrom({ 1: { line: PAGE } });
  const row = presence(doc, 1, { numbers: ['240', '280'], quote: 'Printing temperature 240 - 280 °C' });
  assert.equal(row.presence, 'repaired');
  assert.deepEqual(row.flags, []);
  assert.equal(presence(doc, 1, { numbers: ['240'], quote: 'Prin5ng temperature 240 - 280 °C' }).presence, 'text', 'the page\'s own damaged text is still the line view');
  assert.equal(presence(doc, 1, { numbers: ['250'], quote: 'Printing temperature 250 °C' }).presence, 'visual-only', 'a number the page lacks is not borne out by a repair');
  assert.equal(presence(doc, 1, { numbers: ['80', '100'], quote: 'Heating bed temperature 80 - 100 °C' }).presence, 'repaired');
  assert.equal(presence(doc, 1, { numbers: ['90'], quote: 'Heating bed temperature 90 °C' }).presence, 'visual-only');
});

test('the sheet reader finds the labels of a sheet whose font damaged them', () => {
  const lines = PAGE.map((text, i) => ({ y: -i * 10, x0: 50, x1: 50 + text.length * 5, text, spans: [{ x: 50, w: text.length * 5, str: text }] }));
  const sheet = readSheet({ pages: [{ page: 1, lines }] }, registry);
  const settings = Object.fromEntries(sheet.settings.map((s) => [s.field, s.raw]));
  assert.equal(settings.nozzle, '240 - 280 °C');
  const values = Object.fromEntries(sheet.values.map((v) => [v.property, v.read.rawNumber]));
  assert.equal(values['Elongation at break'], '20');
  assert.equal(values.HDT, '160');
  assert.equal(values['Vicat softening temperature'], '156');
});
