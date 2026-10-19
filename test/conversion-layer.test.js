// The estimate model's documented conversions are rows of conversions.csv (D157). The model built from the rows is the
// configuration it replaced, block for block: test/fixtures/estimate-conversions-2026-10-18.json holds the blocks cut
// from build/mappings/estimate-model.json in the same commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../scripts/data/table-io.mjs';
import { estimateConversions } from '../build/src/evidence-ledger.js';
import { modelWith, ESTIMATE_MODEL } from '../build/src/estimate/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(join(root, 'test/fixtures/estimate-conversions-2026-10-18.json'), 'utf8'));

test('the conversions read from conversions.csv are the configuration they replaced', () => {
  const { conversions, wet } = estimateConversions(openTables().rows('conversions'));
  // How each kind learned before: a declared learns, else the rule the code applied to an unknown direction (D56).
  const expected = Object.fromEntries(Object.entries(fixture.conversions).map(([key, table]) => [key, Object.fromEntries(Object.entries(table)
    .map(([kind, c]) => [kind, { ...c, learns: c.learns ?? (/ unk( |$)/.test(kind) ? 'pairs, down only' : 'pairs') }]))]));
  assert.deepEqual(conversions, expected);
  assert.deepEqual(wet, fixture.wet);
  const model = modelWith([], { conversions, wet });
  assert.deepEqual(model.conversions, expected);
  assert.equal(ESTIMATE_MODEL.conversions, undefined, 'estimate-model.json no longer holds conversions');
});

test('a learned offset outside its row\'s band is reported as drift', async () => {
  const { estimateConversions: read } = await import('../build/src/evidence-ledger.js');
  const row = (id, kind, extra) => ({ ConversionID: id, 'Target headline': 'tensileModulusXY', 'Estimate kind': kind, 'Estimate offset': '0', 'Estimate sd': '0.2',
    'Estimate learns': 'pairs', 'Estimate note': kind, 'Physical relation': 'Not applicable', 'Absolute offset': '0', ...extra });
  const { bands } = read([
    row('CV01', 'flexural XY', { Kind: 'band', 'Factor low': '0.46', 'Factor high': '1.93' }),
    row('CV02', 'tensile Z', { Kind: 'floor', 'Factor low': '0.79', 'Factor high': 'Not applicable' }),
    row('CV03', 'tensile moulded', { Kind: 'estimate', 'Factor low': 'Not applicable', 'Factor high': 'Not applicable' }),
  ]);
  assert.deepEqual(bands.map((b) => [b.id, b.rowKind, b.factorLow, b.factorHigh]), [['CV01', 'band', 0.46, 1.93], ['CV02', 'floor', 0.79, null]]);
});
