// Parser tests for the build's normalize stage.
//
// This is where the sources' free text becomes machine-readable, and where the most damaging bugs
// have been: a range dash read as a minus sign, an annealing schedule read as a chamber
// requirement. Both silently produced plausible-looking wrong numbers rather than failing, so each
// is pinned here with a comment explaining the failure it prevents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTemperature, withinH2C, parseNozzleDiameters, parseDrying, parseAbrasion, parseEnclosure, REQUIREMENT, PROCESS_STATE, H2C_BASELINE }
  from '../build/src/normalize/process.js';
import { parseHdtStandard } from '../build/src/normalize/thermal.js';
import { normalizeDirection, DIRECTION, directionsComparable } from '../build/src/normalize/direction.js';
import { parseValue, parseBoolean, toInterval, MISSING } from '../build/src/normalize/values.js';
import { classifyTopic, classifyFinding, VERDICT } from '../build/src/normalize/chemical.js';

// Regression: a leading minus in the number pattern made the range dash in "255-275C" read as the
// sign of -275, which failed the plausibility window and collapsed the range to its lower end.
test('a range dash is not read as a minus sign', () => {
  for (const [text, min, max] of [
    ['255-275C', 255, 275], ['25 -45 °C', 25, 45], ['190 - 230 °C', 190, 230],
    ['250 – 270 (℃)', 250, 270], ['40 - 60 (˚C)', 40, 60], ['265-285C', 265, 285],
  ]) {
    const p = parseTemperature(text, { plausible: [0, 500] });
    assert.equal(p.min, min, text);
    assert.equal(p.max, max, text);
  }
});

// Regression: "Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve S1" is a room-temperature
// chamber plus a post-print anneal. Scraping its 100 C as a chamber requirement wrongly excluded
// four printable support materials.
test('annealing text after a room-temperature declaration is not a chamber requirement', () => {
  const p = parseTemperature('Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve™ S1', { plausible: [0, 200] });
  assert.equal(p.state, PROCESS_STATE.AMBIENT);
  assert.equal(p.max, null);
  assert.equal(withinH2C(p, H2C_BASELINE.chamberC).verdict, 'within');
  assert.match(p.strippedTail, /Annealing/);
});

test('a recommendation is not a requirement', () => {
  const rec = parseTemperature('Recommended 70-140C if possible', { plausible: [0, 200] });
  assert.equal(rec.requirement, REQUIREMENT.RECOMMENDED);
  assert.equal(withinH2C(rec, 65).verdict, 'exceeds-recommended');

  const req = parseTemperature('90- 150 °C', { plausible: [0, 200] });
  assert.equal(req.requirement, REQUIREMENT.REQUIRED);
  assert.equal(withinH2C(req, 65).verdict, 'exceeds');
});

// Regression: read by its upper end alone, a chamber window that starts below 65 °C failed outright.
// Only the chamber gets a partial verdict; nozzle and bed keep the upper-end rule.
test('a chamber window the printer partly reaches is partial, only when asked for', () => {
  const w = parseTemperature('60 - 90 °C', { plausible: [0, 200] });
  const partial = withinH2C(w, 65, { partialWindow: true });
  assert.equal(partial.verdict, 'partial');
  assert.deepEqual(partial.reachable, { min: 60, max: 65 });
  assert.equal(withinH2C(w, 65).verdict, 'exceeds');
  assert.equal(withinH2C(parseTemperature('70-140C', { plausible: [0, 200] }), 65, { partialWindow: true }).verdict, 'exceeds');
  const rec = withinH2C(parseTemperature('Recommended, up to 50-90°C if available', { plausible: [0, 200] }), 65, { partialWindow: true });
  assert.equal(rec.verdict, 'partial');
  assert.match(rec.reason, /^Recommends/);
});

test('"no setpoint" and "recommended" are statements, not temperatures', () => {
  const none = parseTemperature("No setpoint published ('-' in TDS)", { plausible: [0, 200] });
  assert.equal(none.state, PROCESS_STATE.NO_SETPOINT);
  assert.equal(none.max, null);
  assert.equal(withinH2C(none, 65).verdict, 'unknown');
  assert.ok(!none.unparsed);
  assert.equal(withinH2C(parseTemperature('Recommended', { plausible: [0, 200] }), 65).verdict, 'unknown');
  assert.equal(withinH2C(parseTemperature('Not required (enclosure not needed)', { plausible: [0, 200] }), 65).verdict, 'within');
});

test('enclosure wording separates "not needed" from "recommended"', () => {
  for (const t of ['not necessary', 'for printing not necessary', 'Not needed', 'No enclosure needed']) {
    assert.equal(parseEnclosure(t).state, 'not-needed', t);
  }
  for (const t of ['recommended for larger prints', 'recommended', 'Yes', 'active heated (60-80°C)']) {
    assert.equal(parseEnclosure(t).state, 'recommended', t);
  }
  assert.equal(parseEnclosure('Not published').state, 'unknown');
});

test('ambient as the lower end of a stated range, and "up to"', () => {
  const r = parseTemperature('Room temperature - 50 (˚C)', { plausible: [0, 200] });
  assert.equal(r.state, PROCESS_STATE.RANGE);
  assert.equal(r.max, 50);
  assert.ok(r.ambientFloor);
  const u = parseTemperature('Up to 120C', { plausible: [0, 200] });
  assert.equal(u.min, null);
  assert.equal(u.max, 120);
});

test('HDT load is recovered across every spelling, and never invented', () => {
  assert.equal(parseHdtStandard('ISO 75 0.45 MPa').loadMPa, 0.45);
  assert.equal(parseHdtStandard('ISO 75 0.45MPa').loadMPa, 0.45);
  assert.equal(parseHdtStandard('ISO 75，0.45 MPa 103 °C；').loadMPa, 0.45, 'full-width comma');
  assert.equal(parseHdtStandard('ASTM D648, 0.455 MPa load').loadMPa, 0.45);
  assert.equal(parseHdtStandard('ISO 75 1.8 MPa').loadMPa, 1.8);
  assert.equal(parseHdtStandard('ASTM D648; 1.82 MPa; 3.2 mm; unannealed').loadMPa, 1.8);
  // Spellings the transcription dropped (2026-09-14): 1.81 MN/m², 1.820 MPa, and ISO 75-2's method letters, which
  // the standard defines as loads (A 1.80 MPa, B 0.45 MPa), so a letter states the load rather than implying it.
  assert.equal(parseHdtStandard('1.81mn/m2').loadMPa, 1.8);
  assert.equal(parseHdtStandard('@ 1.820 Mpa').loadMPa, 1.8);
  assert.equal(parseHdtStandard('ISO 75-2/B').loadMPa, 0.45);
  assert.equal(parseHdtStandard('ISO 75-2, HDT A').loadMPa, 1.8);
  assert.equal(parseHdtStandard('ISO 75-2, 0,45 MPa').loadMPa, 0.45, 'decimal comma beside the unit');
  for (const bare of ['ISO 75', 'Deflection', 'ASTM', 'ISO 75-1/2', 'D 648', '1.85 MPa', 'Not published']) {
    const h = parseHdtStandard(bare);
    assert.equal(h.loadStated, false, bare);
    assert.equal(h.loadMPa, null, bare);
  }
});

test('a source label is never promoted to a build orientation', () => {
  assert.equal(normalizeDirection('XY').canonical, DIRECTION.XY);
  assert.equal(normalizeDirection('Horizontal (source label)').canonical, DIRECTION.HORIZONTAL_LABEL);
  assert.equal(normalizeDirection('Not published').canonical, DIRECTION.UNKNOWN);
  assert.equal(directionsComparable(DIRECTION.HORIZONTAL_LABEL, DIRECTION.XY, 'strict'), false);
  assert.equal(directionsComparable(DIRECTION.UNKNOWN, DIRECTION.XY, 'strict'), false, 'unknown direction is not XY');
  assert.equal(directionsComparable(DIRECTION.UNKNOWN, DIRECTION.XY, 'broad'), true);
});

test('missing states stay distinct and never become zero', () => {
  assert.deepEqual(parseValue('1090'), { known: true, value: 1090 });
  assert.equal(parseValue('Not published').missing, MISSING.NOT_PUBLISHED);
  assert.equal(parseValue('Not applicable').missing, MISSING.NOT_APPLICABLE);
  assert.equal(parseValue('Not available in sampled Canadian market').missing, MISSING.NOT_AVAILABLE_MARKET);
  assert.equal(parseValue('Unresolved unit / layout').missing, MISSING.QUARANTINED);
  assert.equal(parseValue('Not published').value, undefined);
});

// Regression: the stored XML holds 1/0 but SheetJS renders Excel booleans as TRUE/FALSE.
test('Excel booleans are read in both spellings', () => {
  for (const t of ['TRUE', 'true', '1', 'yes']) assert.equal(parseBoolean(t), true, t);
  for (const f of ['FALSE', 'false', '0', 'no']) assert.equal(parseBoolean(f), false, f);
  assert.equal(parseBoolean('Not applicable'), null);
});

test('unbounded interval ends are null, because JSON has no Infinity', () => {
  assert.deepEqual(toInterval({ value: 650, operator: '>' }), { lo: 650, hi: null, openLow: true });
  assert.deepEqual(toInterval({ value: 0.8, operator: '<' }), { lo: null, hi: 0.8, openHigh: true });
  assert.equal(JSON.parse(JSON.stringify(toInterval({ value: 650, operator: '>' }))).hi, null);
});

test('the two chemical vocabularies merge but keep their strength qualifier', () => {
  assert.equal(classifyTopic('Resistance to Acid').category, 'acid');
  assert.equal(classifyTopic('Effect of weak acids').category, 'acid');
  assert.equal(classifyTopic('Effect of weak acids').strength, 'weak');
  assert.equal(classifyTopic('Effect of strong acids').strength, 'strong');
  assert.equal(classifyTopic('Resistance to Acid').strength, 'unspecified');
});

test('specimen preparation is not environment evidence', () => {
  assert.equal(classifyTopic('Test specimen preparation').filterable, false);
  assert.equal(classifyTopic('Resistance to Alkali').filterable, true);
});

test('qualified findings read as limited, not as a clean verdict', () => {
  assert.equal(classifyFinding('Not resistant').verdict, VERDICT.NOT_RESISTANT);
  assert.equal(classifyFinding('Resistant').verdict, VERDICT.RESISTANT);
  assert.equal(classifyFinding('Not resistant to some organic solvents').verdict, VERDICT.LIMITED);
  assert.equal(classifyFinding('Resistant to most kinds of oil and grease').verdict, VERDICT.LIMITED);
  assert.equal(classifyFinding('Slight resistant').verdict, VERDICT.LIMITED);
  assert.equal(classifyFinding('No data available').verdict, VERDICT.NO_DATA);
  assert.equal(classifyFinding('Manufacturer describes hydrolytic stability and dimensional retention').verdict, VERDICT.NARRATIVE);
});

test('nozzle, drying and abrasion text', () => {
  assert.deepEqual(parseNozzleDiameters('0.2, 0.4,0.6, 0.8 mm').diameters, [0.2, 0.4, 0.6, 0.8]);
  assert.equal(parseNozzleDiameters('≥0.4 mm').atLeast, true);
  assert.equal(parseDrying('Blast Drying Oven: 55 °C，8 h').tempC, 55);
  assert.equal(parseDrying('120C for 4 hours').hours, 4);
  assert.equal(parseAbrasion('Use abrasion-resistant nozzle; verify minimum orifice.').requiresHardened, true);
  assert.equal(parseAbrasion('No special concerns').requiresHardened, false);
  assert.equal(parseAbrasion('Not published').requiresHardened, null);
});

// Every temperature the app shows carries its unit. The gate reasons were the one place that
// dropped the degree symbol, which read as a different kind of number beside every other one.
test('gate reasons carry the degree symbol', () => {
  const within = withinH2C(parseTemperature('220-240 C', { plausible: [0, 500] }), 350);
  assert.match(within.reason, /°C/);
  const over = withinH2C(parseTemperature('390-480 C', { plausible: [0, 500] }), 350);
  assert.match(over.reason, /°C/);
});

// SD-04: a tolerance's delta is neither a range endpoint nor a second setting.
test('process tolerances retain both ends around the nominal temperature', () => {
  for (const [text, min, max] of [['180 ±20°C',160,200], ['215 ±10°C',205,225], ['75 ±5°C',70,80], ['215 +/- 10°C',205,225]]) {
    const p = parseTemperature(text);
    assert.equal(p.min,min,text); assert.equal(p.max,max,text);
  }
  assert.ok(parseTemperature('490 ±20°C', {plausible:[100,500]}).unparsed);
});

test('limonene support cannot back water-solubility evidence', () => {
  const topic = classifyTopic('Limonene support');
  assert.equal(topic.category,'organic-solvent');
  assert.equal(topic.agent,'d-Limonene');
});
