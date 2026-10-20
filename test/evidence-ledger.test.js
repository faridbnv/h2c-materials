// The evidence ledger (D153) and the physics limits per kind of plastic (D154): build/src/evidence-ledger.js on small
// hand-built products, the engine's answer on them (app/js/engine/constraints.js), and the invariants over the compiled
// database: a comparable value always wins, a reported row never decides, allowing annealing never removes a pass, and
// adding a requirement never adds a candidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachLedger, compileConversions, compileClassLimits, lowerBoundDrift } from '../build/src/evidence-ledger.js';
import { ledgerInterval } from '../app/js/engine/ledger.js';
import { runSelection, evaluateConstraint, STATUS, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { productsByMaterial, productView, scenarioStates } from '../app/js/engine/products.js';
import { loadTables } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { TEMPLATES } from '../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { db } = buildDatabase(loadTables(join(root, 'data')));
const registry = db.registry;

// ------------------------------------------------------------------------------------------------ a hand-built product

const ROWS = [
  { MaterialID: 'M001', Family: 'PLA', 'Base polymer': 'PLA', 'Estimate identity': 'PLA', 'Modifier / filler': 'Unfilled / unspecified', Morphology: 'amorphous' },
  { MaterialID: 'M002', Family: 'Nylon / Polyamide', 'Base polymer': 'PA6', 'Estimate identity': 'PA6', 'Modifier / filler': 'Carbon fibre', Morphology: 'semicrystalline' },
  { MaterialID: 'M003', Family: 'Flexible Elastomers', 'Base polymer': 'TPU', 'Estimate identity': 'TPU', 'Modifier / filler': 'Unfilled / unspecified', Morphology: 'elastomer' },
  { MaterialID: 'M004', Family: 'Flexible Elastomers', 'Base polymer': 'TPC', 'Estimate identity': 'TPC', 'Modifier / filler': 'Commercial variant / undisclosed', Morphology: 'elastomer' },
];
const conversionRow = (over) => ({ ConversionID: 'CV01', 'Target headline': 'hdt045', 'Source properties': 'HDT', 'Source load MPa': '1.8', 'Source direction': 'same',
  'Source state': 'same', 'Source specimen': 'as target', Kind: 'floor', 'Factor low': '1', 'Factor high': 'Not applicable', 'Absolute offset': '0', 'Applies to': '',
  'Physical relation': 'PR08', Status: 'deciding', 'Reason words': 'its HDT at 1.8 MPa, a harsher load', SourceID: 'Not applicable', Basis: 'test', ...over });
const ROW = {
  hdt18: conversionRow({}),
  annealedHdt: conversionRow({ ConversionID: 'CV03', 'Source load MPa': 'Not applicable', 'Source state': 'annealed', Kind: 'ceiling', 'Factor low': 'Not applicable', 'Factor high': '1', 'Physical relation': 'Not applicable', 'Reason words': 'its HDT after annealing' }),
  demote: conversionRow({ ConversionID: 'CV05', 'Source load MPa': 'Not applicable', 'Source specimen': 'moulded or not stated', Kind: 'demote-to-ceiling', 'Factor low': 'Not applicable', 'Factor high': '1', 'Applies to': 'Base polymer: PLA', 'Physical relation': 'Not applicable', 'Reason words': 'its HDT on a moulded bar or one its sheet does not describe' }),
  flex: conversionRow({ ConversionID: 'CV08', 'Target headline': 'tensileModulusXY', 'Source properties': 'Flexural modulus', 'Source load MPa': 'Not applicable', Kind: 'band', 'Factor low': '0.46', 'Factor high': '1.91', 'Physical relation': 'Not applicable', 'Reason words': 'its flexural modulus' }),
};
const LIMIT = { LimitID: 'CL01', 'Target headline': 'tensileModulusXY', Kind: 'ceiling', Value: '0.5', 'Applies to': 'Morphology: elastomer', Status: 'deciding', 'Reason words': 'An unfilled rubber', SourceID: 'S-TEST', Basis: 'test' };
const SOURCES = [{ id: 'S-TEST', accessState: 'retrieved', citationRole: 'cited' }];

let next = 0;
const meas = (gradeId, property, value, over = {}) => ({
  id: `V${String(++next).padStart(6, '0')}`, gradeId, materialId: over.materialId ?? 'M001', property, value, unit: over.unit ?? (property.includes('modulus') ? 'GPa' : '°C'), numeric: true,
  interval: { lo: value, hi: value, kind: 'point' }, specimenType: 'Printed specimen', specimenForm: 'printed', direction: property.includes('modulus') ? 'XY' : 'not-applicable',
  moistureState: 'dry', postProcessingState: 'as-printed', anneal: null, standards: [], notch: 'Not applicable', sourceId: 'S1',
  ...(property === 'HDT' ? { thermal: { loadMPa: over.load ?? 0.45, loadStated: true } } : {}), ...over,
});
const productWith = (gradeId, materialId, values = {}, over = {}) => ({ id: gradeId, materialId, manufacturer: 'Maker', product: gradeId, retired: false, variant: over.variant ?? null,
  headline: { ...values }, states: [{ id: 'as-printed', treatment: null, moisture: 'dry', values: { ...values } }], print: null });

/** Compile the rows, attach the ledger to the products, and return the issues. */
function ledger(grades, measurements, { rows = [], limits = [] } = {}) {
  const issues = [];
  const conversions = compileConversions(rows, { materialRows: ROWS, registry, issues });
  const classLimits = compileClassLimits(limits, { materialRows: ROWS, registry, sources: SOURCES, issues });
  const out = attachLedger({ grades, materialRows: ROWS, measurements, registry, conversions, classLimits, polymers: db.polymers, issues });
  return { issues, ...out, mini: { registry, conversions: out.conversions, classLimits: out.classLimits } };
}

const missingHeadline = (unit) => ({ known: false, missing: 'not-published', unit });
const within = { verdict: 'within', reason: 'within' };
const materialOf = (id, grades) => ({ id, name: id, excluded: false, gradeIds: grades.map((g) => g.id), summary: {},
  headline: { hdt045: missingHeadline('°C'), tensileModulusXY: missingHeadline('GPa'), density: missingHeadline('kg/m³') },
  gates: { scope: 'within', nozzle: within, bed: within, chamber: within, abrasive: 'unknown', drying: 'unknown' }, facets: {} });
const ask = (grade, mini, property, operator, value, extra = {}) => {
  const material = materialOf(grade.materialId, [grade]);
  const ctx = { db: { ...mini, registry }, unknownPolicy: UNKNOWN_POLICY.EXPLORATION, ...extra };
  return evaluateConstraint(productView(material, grade, ctx, grade.states[0]), { kind: 'numeric', property, operator, value }, ctx);
};

test('a deciding floor passes a minimum on the record it reads and names it; a reported one only lists it', () => {
  const g = productWith('G001-01', 'M001');
  const m = meas(g.id, 'HDT', 80, { load: 1.8 });
  const r = ledger([g], [m], { rows: [ROW.hdt18] });
  // The rows here hold hdt045's lower bound and not elongation's: that drift is the next test's.
  assert.deepEqual(r.issues.filter((i) => i.level === 'error' && i.code !== 'LEDGER-LB-DRIFT'), []);
  const b = g.states[0].bounds.hdt045;
  assert.deepEqual([b.lo, b.hi, b.by.length, b.by[0].rule, b.by[0].measurementId], [80, null, 1, 'CV01', m.id]);
  const pass = ask(g, r.mini, 'hdt045', '>=', 70);
  assert.equal(pass.status, STATUS.PASS);
  // The record in words, never its ID (stage 3d): the answer carries the ID for the trace and the export.
  assert.equal(pass.reason, 'Meets it on its HDT at 1.8 MPa, a harsher load: 80 °C');
  assert.deepEqual([pass.measurementId, pass.ledger.rule, pass.ledger.bound], [m.id, 'CV01', 80]);
  // A floor says nothing against a higher minimum: the next answer, with what the floor still says.
  const open = ask(g, r.mini, 'hdt045', '>=', 100);
  assert.equal(open.status, STATUS.UNKNOWN);
  assert.match(open.reason, /Its other records put it at least 80 °C, which leaves 100 °C on either side$/);

  const g2 = productWith('G001-02', 'M001');
  const r2 = ledger([g2], [meas(g2.id, 'HDT', 80, { load: 1.8 })], { rows: [{ ...ROW.hdt18, Status: 'reported' }] });
  assert.deepEqual([g2.states[0].bounds.hdt045.lo, g2.states[0].bounds.hdt045.by[0].status], [null, 'reported']);
  const reported = ask(g2, r2.mini, 'hdt045', '>=', 75);
  assert.equal(reported.status, STATUS.UNKNOWN, 'a reported row never decides');
  assert.equal(reported.reason, 'Not published in the sampled sources; ask the maker or test a printed coupon', 'nor changes a reason');
});

test('a comparable value always wins over the ledger, and is doubtful where a deciding record contradicts it beyond the scatter', () => {
  const g = productWith('G001-03', 'M001', { hdt045: { value: 60, level: 'comparable', measurementId: 'V900001' } });
  const r = ledger([g], [meas(g.id, 'HDT', 80, { load: 1.8 })], { rows: [ROW.hdt18] });
  assert.equal(g.states[0].bounds, undefined, 'no bounds where a value decides');
  assert.deepEqual(g.states[0].values.hdt045.doubtful.map((d) => [d.rule, d.lo]), [['CV01', 80]]);
  assert.equal(r.issues.filter((i) => i.code === 'LEDGER-CONTRADICTS-VALUE').length, 1);
  const e = ask(g, r.mini, 'hdt045', '>=', 70);
  assert.equal(e.status, STATUS.FAIL, 'the value decides, not the floor');
  assert.ok(e.doubtful);
  assert.match(e.reason, /Doubtful: its HDT at 1\.8 MPa, a harsher load puts it at least 80 °C; re-read before relying on it$/);
  // Within the test scatter, no doubt.
  const g2 = productWith('G001-04', 'M001', { hdt045: { value: 77, level: 'comparable', measurementId: 'V900002' } });
  ledger([g2], [meas(g2.id, 'HDT', 80, { load: 1.8 })], { rows: [ROW.hdt18] });
  assert.equal(g2.states[0].values.hdt045.doubtful, undefined);
});

test('an annealed value is a ceiling for the printed part: it fails a minimum it misses, a near miss too', () => {
  const g = productWith('G001-05', 'M001');
  const m = meas(g.id, 'HDT', 60, { postProcessingState: 'annealed', anneal: { tempC: 90, hours: 2 } });
  const r = ledger([g], [m], { rows: [ROW.annealedHdt] });
  const fail = ask(g, r.mini, 'hdt045', '>=', 100);
  assert.equal(fail.status, STATUS.FAIL);
  assert.equal(fail.reason, 'Its HDT after annealing: 60 °C, the most it reaches as printed: fails 100 °C');
  // A ceiling is compared with the limit as it is: 4 °C short fails (stage 3d; it had been on the line).
  const near = ask(g, r.mini, 'hdt045', '>=', 64);
  assert.deepEqual([near.status, near.onTheLine], [STATUS.FAIL, undefined]);
  // It bounds only the state with no treatment.
  assert.equal(ask(g, r.mini, 'hdt045', '>=', 50).status, STATUS.UNKNOWN, 'a ceiling never passes a minimum');
});

test('a PLA HDT from an undescribed bar stays its value but only as a ceiling, and a floor may still pass it', () => {
  const g = productWith('G001-06', 'M001', { hdt045: { value: 108, level: 'comparable', measurementId: 'V900003' } });
  const own = meas(g.id, 'HDT', 108, { id: 'V900003', specimenType: 'Not published (do not assume printed)', specimenForm: 'not-stated' });
  const r = ledger([g], [own], { rows: [ROW.demote] });
  assert.equal(g.states[0].values.hdt045.ceilingOnly, true);
  assert.equal(g.headline.hdt045.ceilingOnly, undefined, 'the published value the table shows is untouched');
  const open = ask(g, r.mini, 'hdt045', '>=', 80);
  assert.deepEqual([open.status, open.ceilingOnly.measurementId], [STATUS.INDETERMINATE, 'V900003']);
  assert.match(open.reason, /^Published 108 °C on a bar its sheet does not describe\./);
  assert.equal(ask(g, r.mini, 'hdt045', '>=', 120).status, STATUS.FAIL, 'a ceiling fails a minimum it misses');
  assert.equal(ask(g, r.mini, 'hdt045', '<=', 120).status, STATUS.PASS, 'and passes a maximum it meets');
  // With its HDT at 1.8 MPa as a floor, the ledger passes what the ceiling could not.
  const g2 = productWith('G001-07', 'M001', { hdt045: { value: 108, level: 'comparable', measurementId: 'V900004' } });
  const r2 = ledger([g2], [meas(g2.id, 'HDT', 108, { id: 'V900004', specimenForm: 'not-stated', specimenType: 'Not published (do not assume printed)' }), meas(g2.id, 'HDT', 90, { load: 1.8 })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(ask(g2, r2.mini, 'hdt045', '>=', 80).status, STATUS.PASS);
  // An annealed state's value is not demoted: annealing has crystallised that part.
  const g4 = productWith('G001-10', 'M001');
  g4.states.push({ id: 'annealed:90:4', treatment: { tempC: 90, hours: 4 }, moisture: 'dry', values: { hdt045: { value: 116, level: 'comparable', measurementId: 'V900007' } } });
  ledger([g4], [meas(g4.id, 'HDT', 116, { id: 'V900007', specimenForm: 'not-stated', specimenType: 'Not published (do not assume printed)', postProcessingState: 'annealed', anneal: { tempC: 90, hours: 4 } })], { rows: [ROW.demote] });
  assert.equal(g4.states[1].values.hdt045.ceilingOnly, undefined);
  assert.equal(g4.states[1].bounds, undefined);
  // A PA6 (no Applies to match) keeps its value.
  const g3 = productWith('G002-01', 'M002', { hdt045: { value: 108, level: 'comparable', measurementId: 'V900005' } });
  ledger([g3], [meas(g3.id, 'HDT', 108, { id: 'V900005', materialId: 'M002', specimenForm: 'not-stated', specimenType: 'Not published (do not assume printed)' })], { rows: [ROW.demote] });
  assert.equal(g3.states[0].values.hdt045.ceilingOnly, undefined);
});

// Stage 3d (R01 of the round's review): a bar the ledger demotes is only a ceiling for the printed part, whichever row reads
// it. MatterHackers Tough PLA's undescribed 75 °C at 1.8 MPa had passed PLA at 70 °C through CV01.
test('a bar the ledger demotes floors nothing: CV01 takes no undescribed PLA bar where CV05 decides, and a band keeps only its upper end', () => {
  const undescribed = { specimenForm: 'not-stated', specimenType: 'Not published (do not assume printed)' };
  const g = productWith('G001-11', 'M001');
  const r = ledger([g], [meas(g.id, 'HDT', 75, { load: 1.8, ...undescribed })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(g.states[0].bounds, undefined, 'no floor from a bar CV05 demotes');
  assert.equal(ask(g, r.mini, 'hdt045', '>=', 70).status, STATUS.UNKNOWN);
  // A printed bar still floors the printed part.
  const printed = productWith('G001-12', 'M001');
  const rp = ledger([printed], [meas(printed.id, 'HDT', 75, { load: 1.8 })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(ask(printed, rp.mini, 'hdt045', '>=', 70).status, STATUS.PASS);
  // Since the owner's ruling of 2026-10-20 (D172) a bar no document describes as printed floors nothing whatever CV05 says,
  // a nylon's too; one its document implies was printed (m463) floors a nylon's printed part, which crystallises as it prints.
  const reported = productWith('G001-13', 'M001');
  const rr = ledger([reported], [meas(reported.id, 'HDT', 75, { load: 1.8, ...undescribed })], { rows: [{ ...ROW.demote, Status: 'reported' }, ROW.hdt18] });
  assert.equal(ask(reported, rr.mini, 'hdt045', '>=', 70).status, STATUS.UNKNOWN);
  const nylon = productWith('G002-04', 'M002');
  ledger([nylon], [meas(nylon.id, 'HDT', 75, { materialId: 'M002', load: 1.8, ...undescribed })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(nylon.states[0].bounds?.hdt045?.lo ?? null, null, 'an undescribed bar floors no printed part (D172)');
  const implied = productWith('G002-06', 'M002');
  ledger([implied], [meas(implied.id, 'HDT', 75, { materialId: 'M002', load: 1.8, specimenForm: 'printed', specimenType: 'Printed (implied by the document)' })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(implied.states[0].bounds.hdt045.lo, 75);
  // A row that would draw both ends from a demoted bar marks it a ceiling; since D172 an undescribed bar is set apart, so
  // only the demote-to-ceiling row itself reads its ceiling, and another row draws nothing from it.
  const band = conversionRow({ ConversionID: 'CV98', Kind: 'band', 'Factor low': '1', 'Factor high': '1.5', 'Physical relation': 'Not applicable' });
  const g4 = productWith('G001-14', 'M001');
  ledger([g4], [meas(g4.id, 'HDT', 75, { load: 1.8, ...undescribed })], { rows: [ROW.demote, band] });
  const b4 = g4.states[0].bounds.hdt045;
  assert.deepEqual([b4.lo, b4.hi, b4.by[0].ceilingOnly, b4.by[0].level], [null, null, true, 'as-published']);
  // An implied printed bar is no demoted bar: the band draws both its ends.
  const g6 = productWith('G001-18', 'M001');
  ledger([g6], [meas(g6.id, 'HDT', 75, { load: 1.8, specimenForm: 'printed', specimenType: 'Printed (implied by the document)' })], { rows: [ROW.demote, band] });
  assert.deepEqual([g6.states[0].bounds.hdt045.lo, g6.states[0].bounds.hdt045.hi], [75, 112.5]);
  // Nor is such a bar a same-sheet pair of the floor it no longer draws.
  const g5 = productWith('G001-15', 'M001');
  const pr = ledger([g5], [meas(g5.id, 'HDT', 55), meas(g5.id, 'HDT', 75, { load: 1.8, ...undescribed })], { rows: [ROW.demote, ROW.hdt18] });
  assert.equal(pr.conversions.find((c) => c.id === 'CV01').pairs.n, 0);
});

// Stage 3d (R02 of the round's review, and the second trial's "PLA on the line at 5 GPa"): the test scatter belongs to a
// point (D152). Spectrum PLA Tough's flexural band, 1.15 to 4.81 GPa, had been on the line for 5 GPa.
test('the test scatter belongs to a point: a band, floor or ceiling is compared as it is; an equality and a class limit keep it', () => {
  const g = productWith('G002-05', 'M002');
  const r = ledger([g], [meas(g.id, 'Flexural modulus', 2.493, { materialId: 'M002' })], { rows: [{ ...ROW.flex, 'Factor high': '1.93' }] });
  const band = ask(g, r.mini, 'tensileModulusXY', '>=', 5);
  assert.deepEqual([band.status, band.onTheLine, band.thinMargin], [STATUS.FAIL, undefined, undefined]);
  // Its numbers as the page prints every other (R16): about three significant figures, never "4.81149 GPa".
  assert.equal(band.reason, 'Its flexural modulus: 2.49 GPa, so between 1.15 and 4.81 GPa: fails 5 GPa');
  const annealed = productWith('G001-16', 'M001');
  const ra = ledger([annealed], [meas(annealed.id, 'HDT', 60, { postProcessingState: 'annealed', anneal: { tempC: 90, hours: 2 } })], { rows: [ROW.annealedHdt] });
  assert.equal(ask(annealed, ra.mini, 'hdt045', '>=', 62).status, STATUS.FAIL, 'a ceiling 2 °C short fails');
  const floor = productWith('G001-17', 'M001');
  const rf = ledger([floor], [meas(floor.id, 'HDT', 80, { load: 1.8 })], { rows: [ROW.hdt18] });
  assert.equal(ask(floor, rf.mini, 'hdt045', '>=', 79).thinMargin, undefined, 'a floor that meets the limit has no thin margin');
  // An equality is the value itself: on the line within the scatter.
  const equal = conversionRow({ ConversionID: 'CV97', 'Target headline': 'tensileModulusXY', 'Source properties': 'Tensile modulus', 'Source load MPa': 'Not applicable',
    'Source state': 'conditioned', Kind: 'equal', 'Factor low': '1', 'Factor high': '1', 'Physical relation': 'Not applicable' });
  const ge = productWith('G002-06', 'M002');
  const re = ledger([ge], [meas(ge.id, 'Tensile modulus', 4.8, { materialId: 'M002', moistureState: 'conditioned' })], { rows: [equal] });
  const line = ask(ge, re.mini, 'tensileModulusXY', '>=', 5);
  assert.deepEqual([line.status, line.onTheLine], [STATUS.INDETERMINATE, true]);
  // A class limit keeps the scatter D154 adds before it fails anything.
  const rubber = productWith('G003-04', 'M003');
  const rl = ledger([rubber], [], { limits: [LIMIT] });
  assert.equal(ask(rubber, rl.mini, 'tensileModulusXY', '>=', 0.52).onTheLine, true);
  assert.equal(ask(rubber, rl.mini, 'tensileModulusXY', '>=', 0.6).status, STATUS.FAIL);
});

test('two records with no value between them are "sheets disagree": unresolved, a reviewed finding', () => {
  const g = productWith('G001-08', 'M001');
  const r = ledger([g], [meas(g.id, 'HDT', 80, { load: 1.8 }), meas(g.id, 'HDT', 60, { postProcessingState: 'annealed', anneal: { tempC: 90, hours: 2 } })], { rows: [ROW.hdt18, ROW.annealedHdt] });
  assert.equal(g.states[0].bounds.hdt045.disagree, true);
  assert.deepEqual(r.issues.filter((i) => i.code === 'LEDGER-DISAGREE').map((i) => i.records), [['G001-08 as-printed hdt045']]);
  for (const v of [50, 70, 90]) {
    const e = ask(g, r.mini, 'hdt045', '>=', v);
    assert.deepEqual([e.status, !!e.sheetsDisagree], [STATUS.INDETERMINATE, true], `${v}`);
  }
  assert.match(ask(g, r.mini, 'hdt045', '>=', 70).reason, /^Its records disagree: its HDT at 1\.8 MPa, a harsher load: 80 °C puts it at least 80 °C, and its HDT after annealing: 60 °C at most 60 °C\./);
});

test('a band decides only when wholly on one side; a printed record without its direction is read flat, and an undescribed one decides only where an audit admits it (D172)', () => {
  const g = productWith('G002-02', 'M002');
  const flex = meas(g.id, 'Flexural modulus', 2, { materialId: 'M002' });
  const r = ledger([g], [flex], { rows: [ROW.flex] });
  const b = g.states[0].bounds.tensileModulusXY;
  assert.deepEqual([b.lo, b.hi], [0.92, 3.82]);
  assert.equal(ask(g, r.mini, 'tensileModulusXY', '>=', 5).reason, 'Its flexural modulus: 2 GPa, so between 0.92 and 3.82 GPa: fails 5 GPa');
  assert.equal(ask(g, r.mini, 'tensileModulusXY', '>=', 5).measurementId, flex.id, 'the answer keeps the record for the trace and the export');
  assert.equal(ask(g, r.mini, 'tensileModulusXY', '>=', 4.2).status, STATUS.FAIL, 'a band end near the limit is not on the line (stage 3d)');
  assert.equal(ask(g, r.mini, 'tensileModulusXY', '>=', 3).status, STATUS.UNKNOWN);
  assert.equal(ask(g, r.mini, 'tensileModulusXY', '>=', 0.9).status, STATUS.PASS);
  const g2 = productWith('G002-03', 'M002');
  const r2 = ledger([g2], [meas(g2.id, 'Flexural modulus', 2, { materialId: 'M002', direction: 'unknown', specimenForm: 'not-stated', specimenType: 'Not published' })], { rows: [ROW.flex] });
  assert.equal(g2.states[0].bounds.tensileModulusXY.by[0].level, 'as-published');
  const g3 = productWith('G002-07', 'M002');
  ledger([g3], [meas(g3.id, 'Flexural modulus', 2, { materialId: 'M002', direction: 'unknown' })], { rows: [ROW.flex] });
  assert.equal(g3.states[0].bounds.tensileModulusXY.by[0].level, 'comparable', 'a printed bar with no stated orientation is read flat');
  assert.equal(ask(g2, r2.mini, 'tensileModulusXY', '>=', 5).status, STATUS.UNKNOWN);
  assert.equal(ask(g2, r2.mini, 'tensileModulusXY', '>=', 5, { evidence: 'as-published' }).status, STATUS.FAIL);
});

test('a class limit bounds its kind\'s products with no value, never a variant or an undisclosed commercial variant, widened to what the kind publishes', () => {
  const plain = productWith('G003-01', 'M003');
  const hard = productWith('G003-02', 'M003', { tensileModulusXY: { value: 0.62, level: 'comparable', measurementId: 'V900006' } });
  const variant = productWith('G003-03', 'M003', {}, { variant: 'lightweight additive' });
  const commercial = productWith('G004-01', 'M004');
  const r = ledger([plain, hard, variant, commercial], [], { limits: [LIMIT] });
  const b = plain.states[0].bounds.tensileModulusXY.by[0];
  assert.deepEqual([b.rule, b.hi, b.limit.hi, b.widened, b.widenedBy], ['CL01', 0.62, 0.5, true, ['G003-02']]);
  assert.equal(variant.states[0].bounds, undefined);
  assert.equal(commercial.states[0].bounds, undefined);
  const e = ask(plain, r.mini, 'tensileModulusXY', '>=', 5);
  assert.equal(e.status, STATUS.FAIL);
  assert.equal(e.reason, 'An unfilled rubber is never stiffer than 0.62 GPa, as far as its kind\'s own products publish: fails 5 GPa');
  // The harder product's own 0.62 GPa is beyond the sourced 0.5 by more than the scatter: doubtful, a reviewed finding.
  assert.ok(hard.states[0].values.tensileModulusXY.doubtful);
  assert.deepEqual(r.issues.filter((i) => i.code === 'CLASS-LIMIT-CONTRADICTED').flatMap((i) => i.records), ['CL01 V900006']);
  // A deciding limit needs a cited source.
  const issues = [];
  compileClassLimits([{ ...LIMIT, SourceID: 'Not recorded' }], { materialRows: ROWS, registry, sources: SOURCES, issues });
  assert.deepEqual(issues.map((i) => i.code), ['CLASS-LIMIT-SOURCE']);
});

test('a row that cannot be read is an error, and a headline lower bound without its floor row is LEDGER-LB-DRIFT', () => {
  const issues = [];
  compileConversions([
    conversionRow({ ConversionID: 'CV90', 'Target headline': 'tensileModulusZ' }),
    conversionRow({ ConversionID: 'CV91', Kind: 'ceiling' }),
    conversionRow({ ConversionID: 'CV92', 'Source properties': 'Density' }),
    conversionRow({ ConversionID: 'CV93', Kind: 'band', 'Factor high': '0.5' }),
  ], { materialRows: ROWS, registry, issues });
  assert.deepEqual(issues.filter((i) => i.code === 'CONVERSION-ROW').map((i) => i.where), ['conversions CV90', 'conversions CV91', 'conversions CV91', 'conversions CV92', 'conversions CV92', 'conversions CV93']);
  assert.ok(issues.some((i) => i.code === 'LEDGER-LB-DRIFT' && /elongationXY takes Elongation at yield/.test(i.message)));
  assert.deepEqual(lowerBoundDrift(db.conversions.map((r) => ({ ...r, offset: r.offset })), registry.headlines.filter((h) => h.kind === 'measurement')), [], 'the compiled rows hold every lower bound');
});

test('the pairs check lists a pair that breaks a row, and raises it only for a deciding row', () => {
  const g = productWith('G001-09', 'M001');
  const ms = [meas(g.id, 'HDT', 58), meas(g.id, 'HDT', 62, { load: 1.8 })];
  const deciding = ledger([g], ms, { rows: [ROW.hdt18] });
  assert.deepEqual(deciding.conversions[0].pairs.breaking.map((b) => [b.targetValue, b.sourceValue]), [[58, 62]]);
  assert.deepEqual(deciding.issues.filter((i) => i.code === 'CONVERSION-PAIRS').flatMap((i) => i.records), [`CV01 ${ms[0].id} ${ms[1].id}`]);
  const reported = ledger([productWith('G001-09', 'M001')], ms, { rows: [{ ...ROW.hdt18, Status: 'reported' }] });
  assert.equal(reported.conversions[0].pairs.breaking.length, 1);
  assert.equal(reported.issues.filter((i) => i.code === 'CONVERSION-PAIRS').length, 0);
});

test('the intersection takes the tightest deciding end at the levels the reader admits', () => {
  const by = [
    { rule: 'CV01', status: 'deciding', level: 'comparable', lo: 80, hi: null },
    { rule: 'CV06', status: 'deciding', level: 'as-published', lo: 90, hi: null },
    { rule: 'CV08', status: 'reported', level: 'comparable', lo: 95, hi: 100 },
    { rule: 'CV03', status: 'deciding', level: 'comparable', lo: null, hi: 120 },
  ];
  assert.deepEqual((({ lo, hi, disagree }) => ({ lo, hi, disagree }))(ledgerInterval(by)), { lo: 80, hi: 120, disagree: false });
  assert.equal(ledgerInterval(by, { evidence: 'as-published' }).lo, 90);
  assert.equal(ledgerInterval(by.filter((b) => b.status === 'reported')), null);
});

// ------------------------------------------------------------------------------------------------ the compiled database

const PRODUCTS = productsByMaterial(db);
const ctxOf = (scenario) => ({ db, productsByMaterial: PRODUCTS, unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: false, ...scenario });
const candidates = db.materials.filter((m) => !m.familyEntry);
const verdicts = (ev) => ev.evaluations.map((e) => [e.materialId, e.verdict, ...(e.products ?? []).map((p) => `${p.gradeId}:${p.verdict}`)].join(' '));
/** The database with every ledger row reported: no bound decides, no value is demoted or doubtful. */
function allReported(d) {
  const copy = structuredClone(d);
  for (const g of copy.grades) for (const s of g.states ?? []) {
    for (const v of Object.values(s.values)) { delete v.ceilingOnly; delete v.doubtful; }
    for (const b of Object.values(s.bounds ?? {})) for (const x of b.by) x.status = 'reported';
  }
  return copy;
}
/** The database with no bounds at all: what the engine judged before the ledger. */
function noLedger(d) {
  const copy = allReported(d);
  for (const g of copy.grades) for (const s of g.states ?? []) delete s.bounds;
  return copy;
}

test('over the compiled database, a reported row never decides: every row reported answers as no ledger at all', () => {
  const a = allReported(db), b = noLedger(db);
  for (const t of TEMPLATES) {
    const run = (d) => runSelection(d.materials.filter((m) => !m.familyEntry), t.constraints, { ...ctxOf({}), db: d, productsByMaterial: productsByMaterial(d) });
    const x = run(a), y = run(b);
    assert.deepEqual(verdicts(x), verdicts(y), t.name);
    assert.deepEqual(x.evaluations.flatMap((e) => e.products.flatMap((p) => p.results.map((r) => r.reason))), y.evaluations.flatMap((e) => e.products.flatMap((p) => p.results.map((r) => r.reason))), `${t.name}: no reason changes`);
  }
});

test('over the compiled database, the ledger never overrides a comparable value', () => {
  const plain = noLedger(db);
  const plainGrades = new Map(plain.grades.map((g) => [g.id, g]));
  const keys = ['hdt045', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'density'];
  let checked = 0;
  for (const m of candidates) {
    for (const g of PRODUCTS.get(m.id) ?? []) {
      for (const key of keys) {
        const v = g.states?.[0]?.values?.[key];
        if (!v || v.level !== 'comparable' || v.ceilingOnly) continue;
        for (const value of [v.value * 0.5, v.value, v.value * 1.5]) {
          const c = { kind: 'numeric', property: key, operator: '>=', value };
          const ctx = ctxOf({});
          const with_ = evaluateConstraint(productView(m, g, ctx, g.states[0]), c, ctx);
          const without = evaluateConstraint(productView(m, plainGrades.get(g.id), ctx, plainGrades.get(g.id).states[0]), c, ctx);
          assert.equal(with_.status, without.status, `${g.id} ${key} >= ${value}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 1000, `${checked} comparisons`);
});

test('over the compiled database, allowing annealing never removes a pass, and adding a requirement never adds a candidate', () => {
  for (const t of TEMPLATES) {
    const asPrinted = runSelection(candidates, t.constraints, ctxOf({}));
    const annealed = runSelection(candidates, t.constraints, ctxOf({ anneal: true }));
    const passes = (ev) => new Set(ev.evaluations.flatMap((e) => (e.products ?? []).filter((p) => p.verdict === STATUS.PASS).map((p) => p.gradeId)));
    const after = passes(annealed);
    for (const id of passes(asPrinted)) assert.ok(after.has(id), `${t.name}: ${id} loses its pass when annealing is allowed`);
    const more = runSelection(candidates, [...t.constraints, { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2, mandatory: true }], ctxOf({}));
    const listed = new Set(asPrinted.candidates.map((e) => e.materialId));
    for (const e of more.candidates) assert.ok(listed.has(e.materialId), `${t.name}: ${e.materialId} becomes a candidate on a further requirement`);
  }
  // The states the engine may judge are untouched by the ledger.
  for (const g of db.grades.slice(0, 50)) assert.deepEqual(scenarioStates(g, {}).map((s) => s.id), scenarioStates(noLedger({ grades: [g] }).grades[0], {}).map((s) => s.id));
});

// Stage 3d over the compiled database: the review's R01 and R02, and the second trial's plain PLA at 80 °C.
test('over the compiled database: no undescribed PLA bar passes 70 °C, PLA is unlikely at 80 °C, and no band holds PLA one check from 5 GPa', () => {
  const byName = new Map(candidates.map((m) => [m.name, m]));
  const run = (constraints) => runSelection(candidates, constraints, ctxOf({}));
  const hot = (value) => [{ kind: 'numeric', property: 'hdt045', operator: '>=', value, mandatory: true }];
  const at70 = run(hot(70)).evaluations.find((e) => e.materialId === byName.get('PLA').id);
  for (const id of ['G001-16', 'G001-55', 'G001-115']) assert.notEqual(at70.products.find((p) => p.gradeId === id).verdict, STATUS.PASS, `${id} passes 70 °C on an undescribed bar`);
  const warm = run(TEMPLATES.find((t) => t.name === 'Warm environment').constraints);
  assert.equal(warm.evaluations.find((e) => e.materialId === byName.get('PLA').id).group, 'unlikely-to-meet');
  const petGf = warm.evaluations.flatMap((e) => e.products).find((p) => p.gradeId === 'G068-04');
  assert.notEqual(petGf.results.find((r) => r.constraint.property === 'hdt045').status, STATUS.PASS, 'Raise3D PET GF on 99 °C at 1.8 MPa');
  const stiff = run(TEMPLATES.find((t) => t.name === 'High-stiffness fixture').constraints);
  for (const name of ['PLA', 'PLA Silk', 'PC']) assert.notEqual(stiff.evaluations.find((e) => e.materialId === byName.get(name).id).group, 'one-check-away', name);
});
