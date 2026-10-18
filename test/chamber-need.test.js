// A silent chamber read from its kind of plastic (data/tables/chamber_need.csv, build/src/chamber-need.js, D151). The rule
// on a small hand-built database, then over the compiled one: a row fills only a truly silent chamber, never over a
// product's own sheet, its twin's or its guide's; a reported row decides nothing; a within row needs its makers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachChamberNeed, chamberNeedStats, compileChamberNeed, CHAMBER_NEED } from '../build/src/chamber-need.js';
import { speaksTo } from '../build/src/products.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// A product of `maker` whose chamber is `chamber` ({ state, verdict }), read from `origin` (own when null).
const chamberOf = (state, verdict, min = null, max = null) => ({ verdict, reason: 'r', state, min, max, profileId: null });
const SILENT = () => chamberOf('unknown', 'unknown');
function mini({ products, rows, bands = [] }) {
  const grades = products.map((p, i) => ({
    id: `G001-${String(i + 1).padStart(2, '0')}`, materialId: p.material ?? 'M001', manufacturer: p.maker ?? `Maker ${i}`, product: `P${i}`, retired: false,
    variant: p.variant ?? null,
    print: p.print === null ? null : {
      profileIds: p.profiles ?? [`P${i}`], nozzle: chamberOf('range', 'within', 200, 220), bed: chamberOf('range', 'within', 50, 60),
      chamber: p.chamber ?? SILENT(), enclosure: p.enclosure ?? 'unknown', hardenedNozzle: null, drying: null, anneal: [],
      ...(p.from ? { from: { chamber: { origin: p.from, label: p.from } } } : {}),
    },
  }));
  const profiles = products.map((p, i) => ({ id: `P${i}`, gradeId: grades[i].id, retired: false,
    chamber: { state: p.profileChamber ?? 'unknown', unparsed: p.unparsed ?? undefined }, enclosureState: p.enclosure ?? 'unknown' }));
  const ids = [...new Set(grades.map((g) => g.materialId))];
  const materials = ids.map((id) => ({ id, gradeIds: grades.filter((g) => g.materialId === id).map((g) => g.id), familyEntry: null }));
  const materialRows = ids.map((id) => ({ MaterialID: id, Family: id === 'M002' ? 'PETG' : 'PLA' }));
  const db = { materials, grades, profiles };
  const wb = { 'Chamber need': { rows }, 'Chamber bands': { rows: bands } };
  return { db, wb, materialRows, grade: (i) => grades[i] };
}
const row = (over = {}) => ({ RuleID: 'CN01', 'Applies to': 'Family: PLA', Verdict: 'within', Status: 'deciding', 'Reviewed by': 'test', Reason: 'test', ...over });
// Ten makers that state a chamber the H2C meets, and the products under test after them.
const stating = (n = 10, above = 0) => Array.from({ length: n }, (_, i) => ({ maker: `Stating ${i}`,
  chamber: i < above ? chamberOf('range', 'exceeds', 80, 90) : chamberOf('not-required', 'within'), profileChamber: i < above ? 'range' : 'not-required' }));

test('a deciding within row reads a truly silent chamber as within, labelled with its counts', () => {
  const m = mini({ products: [...stating(), { maker: 'Silent' }], rows: [row()] });
  const issues = attachChamberNeed(m.db, m.wb, { materialRows: m.materialRows });
  assert.deepEqual(issues.filter((i) => i.level === 'error'), []);
  const g = m.grade(10);
  assert.equal(g.print.chamber.verdict, 'within');
  assert.equal(g.print.chamber.state, 'unknown', 'the sheet still states nothing');
  assert.deepEqual(g.print.from.chamber, { origin: 'family', ruleId: 'CN01', label: 'No chamber stated; of the 10 makers of PLA who state one, none asks above 65 °C' });
  assert.equal(g.print.chamber.reason, g.print.from.chamber.label);
  assert.deepEqual(g.print.nozzle, chamberOf('range', 'within', 200, 220), 'the nozzle is never filled');
  assert.equal(m.db.chamberNeed[0].filled, 1);
  assert.equal(m.db.chamberNeed[0].makers, 10);
});

test('a family row never fills a chamber a sheet speaks to, a recommended or a "-" chamber, a variant or a product with no recipe', () => {
  const cases = [
    { maker: 'Recommended', chamber: chamberOf('recommended', 'unknown'), profileChamber: 'recommended' },
    { maker: 'No setpoint', chamber: chamberOf('no-setpoint', 'unknown'), profileChamber: 'no-setpoint' },
    { maker: 'Enclosure asked', enclosure: 'recommended' },
    { maker: 'Unread words', unparsed: true },
    { maker: 'Guide', from: 'guide', chamber: chamberOf('unknown', 'unknown') },
    { maker: 'Twin', from: 'twin', chamber: chamberOf('recommended', 'unknown') },
    { maker: 'Variant', variant: 'lightweight' },
    { maker: 'No recipe', print: null },
  ];
  const m = mini({ products: [...stating(), ...cases], rows: [row()] });
  attachChamberNeed(m.db, m.wb, { materialRows: m.materialRows });
  cases.forEach((c, i) => {
    const g = m.grade(10 + i);
    assert.notEqual(g.print?.from?.chamber?.origin, 'family', c.maker);
    if (g.print) assert.equal(g.print.chamber.verdict, 'unknown', c.maker);
  });
  assert.equal(m.db.chamberNeed[0].filled, 0);
});

test('a reported row decides nothing, and an unknown verdict fills nothing', () => {
  for (const over of [{ Status: 'reported' }, { Verdict: 'unknown' }]) {
    const m = mini({ products: [...stating(), { maker: 'Silent' }], rows: [row(over)] });
    attachChamberNeed(m.db, m.wb, { materialRows: m.materialRows });
    assert.equal(m.grade(10).print.chamber.verdict, 'unknown', JSON.stringify(over));
    assert.equal(m.grade(10).print.from, undefined);
  }
});

test('the makers are counted once each, from their own sheets and their twins\' only; one above 65 °C counts its maker', () => {
  const products = [
    ...stating(9),
    { maker: 'Stating 0', chamber: chamberOf('range', 'edge', 65, 90), profileChamber: 'range' }, // the same maker, on the line
    { maker: 'Twin maker', from: 'twin', chamber: chamberOf('range', 'exceeds-recommended', 70, 80) },
    { maker: 'Guide maker', from: 'guide', chamber: chamberOf('not-required', 'within') },
    { maker: 'Variant maker', variant: 'dense', chamber: chamberOf('range', 'exceeds', 90, 90), profileChamber: 'range' },
    { maker: 'stating 1 ', chamber: chamberOf('enclosed', 'within'), profileChamber: 'enclosed' }, // the same maker, spelled otherwise
  ];
  const m = mini({ products, rows: [row({ Status: 'reported' })] });
  const rules = compileChamberNeed(m.wb['Chamber need'].rows, { materialRows: m.materialRows, issues: [] });
  const s = chamberNeedStats(rules[0], { materials: m.db.materials, materialRowById: new Map(m.materialRows.map((r) => [r.MaterialID, r])), gradeById: new Map(m.db.grades.map((g) => [g.id, g])) });
  assert.equal(s.makers, 10, 'nine stating makers and the twin\'s; the guide and the variant are not counted');
  assert.equal(s.above, 2, 'Stating 0 (on the line) and the twin\'s maker (recommended above)');
  assert.deepEqual(s.aboveMakers.map((x) => x.maker), ['Stating 0', 'Twin maker']);
  assert.equal(s.qualifies, false, '2 of 10 is more than one in ten');
});

test('a within row the makers do not support, two rows on one material and a band above 65 °C stop the build', () => {
  const few = mini({ products: [...stating(CHAMBER_NEED.MIN_MAKERS - 1), { maker: 'Silent' }], rows: [row()] });
  const codes = (m) => attachChamberNeed(m.db, m.wb, { materialRows: m.materialRows }).filter((i) => i.level === 'error').map((i) => i.code);
  assert.deepEqual(codes(few), ['CHAMBER-NEED-DRIFT']);
  assert.equal(few.grade(9).print.chamber.verdict, 'unknown', 'a row the data no longer support decides nothing');
  assert.deepEqual(codes(mini({ products: [...stating(10, 2), { maker: 'Silent' }], rows: [row()] })), ['CHAMBER-NEED-DRIFT'], 'two of ten above');
  assert.deepEqual(codes(mini({ products: [...stating(10, 1)], rows: [row()] })), [], 'one of ten above is enough');
  assert.deepEqual(codes(mini({ products: stating(), rows: [row(), row({ RuleID: 'CN02', Status: 'reported' })] })), ['CHAMBER-NEED-OVERLAP']);
  const band = [{ MaterialID: 'M001', Kind: 'band', 'Low °C': '80', 'High °C': '120', Basis: 'b', Caution: 'Not applicable', Source: 's' }];
  assert.deepEqual(codes(mini({ products: stating(), rows: [row()], bands: band })), ['CHAMBER-NEED-BAND-CONFLICT']);
  const info = attachChamberNeed(...(() => { const m = mini({ products: stating(), rows: [row({ Status: 'reported' })] }); return [m.db, m.wb, { materialRows: m.materialRows }]; })());
  assert.deepEqual(info.map((i) => [i.level, i.code]), [['info', 'CHAMBER-NEED-READY']], 'a reported row the data support says so');
});

// ---------------------------------------------------------------------------------------------------------------------
// Over the compiled database.

const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const profileById = new Map(db.profiles.map((p) => [p.id, p]));

test('every chamber read from its kind is a deciding within row\'s, on a product whose own sheets say nothing of it', () => {
  const rules = new Map((db.chamberNeed ?? []).map((r) => [r.id, r]));
  let filled = 0;
  for (const g of db.grades) {
    const from = g.print?.from?.chamber;
    if (from?.origin !== 'family') continue;
    filled++;
    const r = rules.get(from.ruleId);
    assert.ok(r && r.status === 'deciding' && r.verdict === 'within' && r.qualifies, `${g.id}: ${from.ruleId} decides nothing`);
    assert.ok(r.materials.includes(g.materialId), `${g.id}: ${from.ruleId} does not name ${g.materialId}`);
    assert.ok(!g.variant, `${g.id}: a variant is not its kind (D129)`);
    assert.equal(g.print.chamber.verdict, 'within', g.id);
    assert.equal(g.print.chamber.state, 'unknown', `${g.id}: a filled chamber states no temperature`);
    assert.ok(!speaksTo(g.print.profileIds.map((id) => profileById.get(id)), 'chamber'), `${g.id}: its own sheet speaks to the chamber`);
    assert.ok(!['nozzle', 'bed'].some((a) => g.print.from[a]?.origin === 'family'), `${g.id}: the nozzle and bed are never filled`);
  }
  assert.equal(filled, (db.chamberNeed ?? []).reduce((n, r) => n + r.filled, 0), 'the rows count what they filled');
});

test('the counts a row shows are its makers\' own statements, and a within row is supported by them', () => {
  for (const r of db.chamberNeed ?? []) {
    assert.ok(r.makers >= r.above, r.id);
    assert.equal(r.qualifies, r.makers >= CHAMBER_NEED.MIN_MAKERS && r.above * 10 <= r.makers, r.id);
    if (r.verdict === 'within') assert.ok(r.qualifies, `${r.id} is within on ${r.makers} makers, ${r.above} above`);
    if (r.status === 'reported') assert.equal(r.filled, 0, `${r.id} is reported and filled ${r.filled}`);
  }
});
