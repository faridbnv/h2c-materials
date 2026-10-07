// The plain-language status in README.md has generated numbers (scripts/docs-status.mjs). Its rounding rule, its
// accuracy figures, and the fact that the committed README matches what the script writes now.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roundCount, figure, about, drawResult, renderStatus, replaceBlock, pricesSampled, START, END } from '../scripts/docs-status.mjs';
import { statusCounts } from '../scripts/lib/status-counts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('counts round to 100 from 1,000, to 50 from 100, and are exact below 100', () => {
  assert.equal(about(1149), 'about 1,100');
  assert.equal(about(1150), 'about 1,200');
  assert.equal(about(14403), 'about 14,400');
  assert.equal(about(2002), 'about 2,000');
  assert.equal(about(999), 'about 1,000');
  assert.equal(about(312), 'about 300');
  assert.equal(about(326), 'about 350');
  assert.equal(about(100), 'about 100');
  assert.equal(about(17), '17');
  assert.equal(about(99), '99');
  assert.equal(figure(1109), '1,100');
  assert.deepEqual(roundCount(17), { value: 17, exact: true });
  assert.deepEqual(roundCount(310), { value: 300, exact: false });
});

test('a draw counts the final call, and a partly wrong record is not a wrong one', () => {
  const csv = [
    'Draw,Table,Record,Verdict,Decided',
    '1,measurements,V1,correct,correct',
    '2,measurements,V2,wrong,"correct: the row inherits the page"',
    '3,measurements,V3,wrong,wrong (deciding): the nozzle cell dropped a word',
    '4,measurements,V4,partly,partly wrong (not deciding): a sentence was not held',
    '5,profiles,P5,correct,',
  ].join('\n');
  assert.deepEqual(drawResult(csv), { sample: 5, wrong: 2, partly: 1, deciding: null });
  assert.throws(() => drawResult('Draw,Record\n1,V1\n'), /no Verdict column/);
});

const counts = { materials: { total: 175, familyEntries: 23, listed: 152, excluded: 17, judged: 135 }, products: 1109, measurements: 14403, sources: 2002,
  unknown: { chamber: 310, drying: 201, nozzle: 33, bed: 33 } };
const acc = { latest: { path: join(root, 'docs/audits/x/blind-draw/verdicts-1.csv'), sample: 40, wrong: 0, partly: 0 }, earlier: { min: 2, max: 4 } };

test('the block states the material split so that it adds up', () => {
  const block = renderStatus(counts, acc, '2026-09-21');
  assert.match(block, /The page lists 152\s+materials: the 135 the H2C\s+can print/);
  assert.match(block, /and 17 it shows only to say why they are out/);
  assert.match(block, /About 1,100 products, 14,400 measured values and 2,000 source documents/);
  assert.match(block, /unknown for about 300 products\), drying\s+\(about 200\)/);
  assert.match(block, /\(33 each\)/);
  assert.match(block, /The latest, of 40\s+records, found\s+none\s+with\s+a\s+wrong\s+cell; earlier samples found 2 to 4/);
  assert.ok(block.split('\n').every((l) => l.length <= 120 || l.startsWith('<!--')), 'every line fits 120 columns');
  assert.match(block, /^## Where things stand \(2026-09-21\)$/m);
  assert.throws(() => renderStatus({ ...counts, materials: { ...counts.materials, judged: 134 } }, acc, 'x'), /do not add up/);
});

test('the accuracy sentence follows the latest draw, and drops the earlier clause when there is none', () => {
  const some = renderStatus(counts, { latest: { ...acc.latest, wrong: 2 }, earlier: null }, '2026-09-21');
  assert.match(some, /found\s+2\s+with\s+a\s+wrong\s+cell, and each cause/);
  const sealed = renderStatus(counts, { ...acc, sealed: { path: join(root, 'docs/audits/x/blind-draw/draw-b-verdicts-1.csv'), sample: 98, wrong: 15, deciding: 2 } }, '2026-09-21');
  assert.match(sealed.replace(/\s+/g, ' '), /A sealed sample of 98 of the records the answers rest on, drawn before a round read anything and read after its corrections, found 15 with a wrong cell, 2 of them in a cell that can change an answer\./);
  const split = renderStatus({ ...counts, unknown: { ...counts.unknown, nozzle: 33, bed: 12 } }, acc, '2026-09-21');
  assert.match(split, /\(33 for the nozzle and 12 for the bed\)/);
});

test('only the marked block is replaced', () => {
  const text = `before\n${START}\nold\n${END}\nafter\n`;
  assert.equal(replaceBlock(text, `${START}\nnew\n${END}`), `before\n${START}\nnew\n${END}\nafter\n`);
  assert.throws(() => replaceBlock('no markers', 'x'), /no .* pair/);
});

test('the committed README block is what the script writes from the database now', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/docs-status.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('the counts of a small database', () => {
  const db = {
    materials: [{ id: 'M1' }, { id: 'M2', excluded: true }, { id: 'M3', familyEntry: true }],
    grades: [{ id: 'G1-01', materialId: 'M1' }, { id: 'G1-02', materialId: 'M1', retired: true }, { id: 'G1-R1', materialId: 'M1' }, { id: 'G2-01', materialId: 'M2' }],
    measurements: [{}, {}, {}], sources: [{}],
  };
  const c = statusCounts(db);
  assert.deepEqual(c.materials, { total: 3, familyEntries: 1, listed: 2, excluded: 1, judged: 1 });
  assert.equal(c.products, 2);
  assert.deepEqual(c.unknown, { chamber: 2, drying: 2, nozzle: 2, bed: 2 });
  assert.deepEqual(c.priceDates, []);
  const priced = statusCounts({ ...db, prices: [{ accessDate: '2026-09-30' }, { accessDate: '2026-09-10' }, { accessDate: '2026-09-30' }, { accessDate: '2026-10-07', quarantined: true }] });
  assert.deepEqual(priced.priceDates, ['2026-09-10', '2026-09-30'], 'distinct days, oldest first, a quarantined listing not among them');
});

test('the price sentence names the days the listings in use were read on', () => {
  assert.equal(pricesSampled(['2026-09-30']), 'prices were sampled once (30 September 2026)');
  assert.equal(pricesSampled(['2026-09-10', '2026-09-30', '2026-10-07']), 'prices were sampled on three days, from 10 September 2026 to 7 October 2026, and not refreshed since');
  assert.match(renderStatus({ ...counts, priceDates: ['2026-09-10', '2026-10-07'] }, acc, '2026-10-07').replace(/\s+/g, ' '), /prices were sampled on two days, from 10 September 2026 to 7 October 2026/);
});
