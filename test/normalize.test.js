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
  // A table with a column headed "Enclosed Space" answers in one word, and "no" is the whole answer.
  for (const t of ['not necessary', 'for printing not necessary', 'Not needed', 'No enclosure needed', 'no', 'No', 'none']) {
    assert.equal(parseEnclosure(t).state, 'not-needed', t);
  }
  for (const t of ['recommended for larger prints', 'recommended', 'Yes', 'active heated (60-80°C)', 'for larger components']) {
    assert.equal(parseEnclosure(t).state, 'recommended', t);
  }
  // A question the row answers (Extrudr's product pages, the 2026-10-01 sweep).
  assert.equal(parseEnclosure('Enclosed chamber required No').state, 'not-needed');
  assert.equal(parseEnclosure('Enclosed chamber required Yes').state, 'recommended');
  assert.equal(parseEnclosure('Not published').state, 'unknown');
  // A comparison table may answer with a drawn mark: Bambu Lab's guide ticks or crosses "Print with Enclosure" (D88).
  assert.equal(parseEnclosure('✓').state, 'recommended');
  assert.equal(parseEnclosure('✗').state, 'not-needed');
  // The revision that prints the row in words: Required for the tick, Optional for the cross.
  assert.equal(parseEnclosure('Optional').state, 'not-needed');
  assert.equal(parseEnclosure('Required').state, 'recommended');
  assert.equal(parseEnclosure('✓ see notes').unparsed, true, 'a mark is read only as the whole answer');
});

// Phase 6, lane 2, finished (m172): the wordings the sheets print for a closed printer, each read as the state it
// states, and never as a temperature. A wording that states no state stays unread, so a new one shows as PARSE-UNREAD.
test('every enclosure wording the sheets print reads as the state it states', () => {
  const says = {
    'not-needed': [
      'No Needed', 'No needed', // Polymaker's "Closure chamber" row
      'Supports open/closed printing', 'Open printing', 'Open Printing/closed printing', 'enclosed printing/open printing',
      'supports open printing, and the sealing effect is better if it is sealed', 'Supports open printing; better results with enclosure.',
      'Sealing print quality is better, supporting open printing', // Eryone's "Sealed printing" row: it prints open
      'The surface is delicate, with no obvious layer lines, easy to use, and does not require sealed printing.',
      'Pro PCTG typically doesn’t require an enclosure', "Pro PCTG typically doesn't require an enclosure",
    ],
    recommended: [
      'Needed', 'Needed (90-100°C)', 'Needed (ambient temperature)', // Polymaker's "Closure chamber" row
      'Closed printing', 'closed printing', 'enclosed printing', 'Box Sealing Print', // Eryone's row, for the ones that need it
      'Due to its high shrinkage rate, we highly recommend printing PC-HT material within a closed chamber printer.',
      'The shrinkage rate of ABS+ material is large, so you should pay attention to heat preservation when printing, and print in a printer with a closed chamber.',
      'Use an enclosure to maintain consistent temperature and reduce potential warping, especially for larger prints.',
    ],
  };
  for (const [state, texts] of Object.entries(says)) for (const t of texts) assert.equal(parseEnclosure(t).state, state, t);
  // A sentence that is about something else says nothing about an enclosure.
  assert.equal(parseEnclosure('Printing speed 30-150mm/s').unparsed, true);
});

test('a chamber cell that states no temperature is read as the state it states, never as a number', () => {
  const read = (t) => parseTemperature(t, { plausible: [0, 200] });
  // BASF's lone dash is no setpoint, which is neither zero nor not required.
  assert.deepEqual([read('-').state, withinH2C(read('-'), 65).verdict], [PROCESS_STATE.NO_SETPOINT, 'unknown']);
  // CreatBot's "OFF", and a maker's word that its filament prints on non-heated chamber printers, want no heated chamber.
  for (const t of ['OFF', 'printable on non-heated chamber FFF 3D printers', 'can be used on 3D printers in non-heated chambers', 'can be used on FFF 3D printers in non-heated chambers']) {
    const p = read(t);
    assert.deepEqual([p.state, p.min, p.max, withinH2C(p, 65).verdict], [PROCESS_STATE.NOT_REQUIRED, null, null, 'within'], t);
  }
});

test('"none needed" is not required, with the window the sheet gives if one is used', () => {
  const p = parseTemperature('None needed (or 50-70°C if applicable)', { plausible: [0, 250] });
  assert.deepEqual([p.state, p.min, p.max, p.requirement], [PROCESS_STATE.RANGE, 50, 70, REQUIREMENT.NONE]);
  assert.equal(withinH2C(p, H2C_BASELINE.bedC).verdict, 'within');
});

test('an at-least value is a lower end with no upper end, never within by its upper end', () => {
  const chamber = parseTemperature('65˚C+', { plausible: [0, 200] });
  assert.deepEqual([chamber.state, chamber.min, chamber.max, chamber.openHigh], [PROCESS_STATE.RANGE, 65, null, true]);
  // The H2C's 65 °C chamber reaches the bottom of an open window and no more: partial, as a window it partly reaches.
  assert.equal(withinH2C(chamber, H2C_BASELINE.chamberC, { partialWindow: true }).verdict, 'partial');
  assert.equal(withinH2C(parseTemperature('70°C+', { plausible: [0, 200] }), H2C_BASELINE.chamberC, { partialWindow: true }).verdict, 'exceeds');
  // A bed or nozzle the printer reaches is met; one it does not is exceeded.
  assert.equal(withinH2C(parseTemperature('140 ºC +', { plausible: [0, 250] }), H2C_BASELINE.bedC).verdict, 'exceeds');
  assert.equal(withinH2C(parseTemperature('100 ºC +', { plausible: [0, 250] }), H2C_BASELINE.bedC).verdict, 'within');
  // LEHVOSS prints the same as "> 120 °C".
  const bed = parseTemperature('> 120 °C', { plausible: [0, 250] });
  assert.deepEqual([bed.min, bed.max, withinH2C(bed, H2C_BASELINE.bedC).verdict], [120, null, 'within']);
  assert.equal(withinH2C(parseTemperature('> 130 °C', { plausible: [0, 250] }), H2C_BASELINE.bedC).verdict, 'exceeds');
});

// m172: the hardened-nozzle statements on the products' own sheets. A negation is read as one wherever the word
// "required" falls, and a wear-resistant nozzle is the hardened one by another name.
test('a hardened-nozzle statement reads as what it says, a negation included', () => {
  const says = {
    false: ['Hardened nozzle not required', 'No hardened nozzle required', 'Nozzle: High quality metal nozzle, harden steel nozzle is not needed',
      'Ruby or hardened nozzle not necessary', 'Ruby or hardened nozzle recommended No', 'Hardened Nozzle no',
      'Even though its high silver-aluminium-flaked content Galaxy PLA is not abrasive to the nozzle of your 3D printer.'],
    true: ['When using PolyMide™ CoPA, we recommend to switch to a wear resistant nozzle', 'Nozzle & Gear Material Hardened steel',
      'A reinforced nozzle, suitable for abrasive materials is recommended.', 'It is recommended to use hardening steel nozzle, tungsten steel or ruby nozzle to avoid nozzle abrasion.',
      'Hardened Nozzle Recommended', 'Ruby or hardened nozzle recommended Yes', 'We recommend to use ruby nozzles or hardened steel nozzles.',
      'nozzle material: abbrasion resistant'],
  };
  for (const [want, texts] of Object.entries(says)) for (const t of texts) assert.equal(parseAbrasion(t).requiresHardened, want === 'true', t);
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
  // A sheet that asks the question in the label and answers it in the cell is answering it. Spectrum prints
  // "Ruby or hardened nozzle recommended | No" for its unfilled filaments; read by its words alone that row
  // says "hardened", which is the opposite of what the sheet says.
  assert.equal(parseAbrasion('Ruby or hardened nozzle recommended No').requiresHardened, false);
  assert.equal(parseAbrasion('Ruby or hardened nozzle recommended Yes').requiresHardened, true);
  assert.equal(parseAbrasion('Ruby or hardened nozzle Yes').requiresHardened, true);
  assert.equal(parseAbrasion('Hardened nozzle: not necessary').requiresHardened, false);
  // And a statement that names the nozzle it wants is still a statement, whatever word it ends on.
  assert.equal(parseAbrasion('Hardened steel, diamond, tungsten carbide, etc').requiresHardened, true);
  assert.equal(parseAbrasion('Abrasive milled carbon fibre; accelerated brass wear').requiresHardened, true);
  // Bambu Lab's guide lists the nozzles each filament prints on (D88): any nozzle is no requirement, hardened steel
  // alone is one, and hardened or stainless steel is stated but settles nothing about brass.
  assert.equal(parseAbrasion('All Size/Material').requiresHardened, false);
  assert.equal(parseAbrasion('0.6 mm (recommended) / 0.4 mm / 0.8 mm Hardened Steel').requiresHardened, true);
  const both = parseAbrasion('0.4 mm / 0.6 mm / 0.8 mm Hardened Steel / Stainless Steel');
  assert.deepEqual([both.requiresHardened, both.state], [null, 'stated']);
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

test('HDT loads in psi and kgf/cm² are read; a text naming both loads states neither (C-08)', () => {
  assert.equal(parseHdtStandard('ASTM D648, 264 psi').loadMPa, 1.8);
  assert.equal(parseHdtStandard('ASTM D648 @ 66psi').loadMPa, 0.45);
  assert.equal(parseHdtStandard('ISO 75, 18.5 kgf/cm²').loadMPa, 1.8);
  assert.equal(parseHdtStandard('ISO 75, 0.45 MPa (66 psi)').loadMPa, 0.45);
  const both = parseHdtStandard('ISO 75 1.8 MPa / 0.45 MPa');
  assert.equal(both.loadStated, false);
  assert.equal(both.ambiguous, true);
  assert.equal(both.label, 'both loads named');
});

test('a ±45° raster is its own orientation, comparable only with itself (C-06)', () => {
  const d = normalizeDirection('45/45');
  assert.equal(d.mapped, true);
  assert.equal(d.canonical, 'raster-45');
  assert.equal(directionsComparable('raster-45', 'XY'), false);
});

test('the error-class sweep of 2026-10-01: the spellings the readers found unread', () => {
  // ISO 75's method letter in its slash, hyphen and "Method" spellings, and a stated load outranking a mislabelled letter.
  for (const [text, load] of [['HDT/A D3418', 1.8], ['HDT-A ISO-R 75 Method A', 1.8], ['HDT/B', 0.45], ['ISO 75：Method B', 0.45], ['ISO 75: Method A (0.45 MPa)', 0.45]]) {
    assert.equal(parseHdtStandard(text).loadMPa, load, text);
  }
  assert.equal(parseHdtStandard('HDT-A ISO-R 75 Method A').standard, 'ISO 75');
  // Polymaker's "(recommended)" after a window recommends the window; a recommended point inside one does not.
  assert.equal(parseTemperature('70 – 80 (recommended) (˚C)').requirement, REQUIREMENT.RECOMMENDED);
  assert.equal(parseTemperature('70-80 (˚C)(Recommended)').requirement, REQUIREMENT.RECOMMENDED);
  assert.equal(parseTemperature('230~260 ℃ (recommended: 240℃)').requirement, REQUIREMENT.REQUIRED);
  // An industrial build chamber is read whole, not cut at 200 °C into a single point.
  const kumovis = parseTemperature('160 - 230 °C', { plausible: [0, 250] });
  assert.deepEqual([kumovis.min, kumovis.max], [160, 230]);
});

test('the control re-read of 2026-10-01: an at-most bed, a conditional bed, an answered question in German', () => {
  // "< 80°C" is at most 80, not the point 80.
  const atMost = parseTemperature('< 80°C', { plausible: [0, 250] });
  assert.deepEqual([atMost.min, atMost.max, atMost.openLow], [null, 80, true]);
  // A window for a printer that has a heated bed is a recommendation.
  assert.equal(parseTemperature('If you have a heated bed the recommended temperature is ± 35-60˚C').requirement, REQUIREMENT.RECOMMENDED);
  assert.equal(parseAbrasion('Hardened Nozzle nein').requiresHardened, false);
  assert.equal(parseAbrasion('Hardened Nozzle ja').requiresHardened, true);
  // A recommended point inside a window is not one of its ends.
  const flash = parseTemperature('Room temperature~60℃ (40℃ recommended)', { plausible: [0, 250] });
  assert.deepEqual([flash.min, flash.max], [25, 60]);
  // An at-least value with its plus before the unit.
  assert.deepEqual([parseTemperature('100+ °C', { plausible: [0, 250] }).min, parseTemperature('100+ °C', { plausible: [0, 250] }).max], [100, null]);
  const nozzle = parseTemperature('240~270°C (250°C recommended)', { plausible: [100, 500] });
  assert.deepEqual([nozzle.min, nozzle.max], [240, 270]);
});

test('the wordings the profile root-cause sweep found are read (2026-10-02)', () => {
  const chamber = (v) => parseTemperature(v, { plausible: [0, 250] });
  for (const v of ['Normal temperature', 'Normal', '常温']) assert.equal(chamber(v).state, PROCESS_STATE.AMBIENT, v);
  for (const v of ['no need of temperature chamber', 'no heating chamber are required during the printing process', 'material does not require a heated building chamber', 'does not require a heated print chamber']) {
    assert.equal(chamber(v).requirement, REQUIREMENT.NONE, v);
  }
  assert.equal(chamber('It is recommended to print using a heated chamber.').requirement, REQUIREMENT.RECOMMENDED);
  for (const v of ['works best with an enclosed print area', 'Printing in an enclosed printer', 'At least closed chamber', 'enclosed-chamber printing']) assert.equal(parseEnclosure(v).state, 'recommended', v);
  assert.equal(parseEnclosure('It is ideal for use in open desktop 3D printers.').state, 'not-needed');
  assert.equal(parseEnclosure('keep the printer chamber closed').state, 'recommended');
  assert.equal(parseEnclosure('Seal the Box: No').state, 'not-needed');
  assert.equal(parseEnclosure('Seal the Box: Yes').state, 'recommended');
  assert.equal(parseEnclosure('Seal the Box: Yes/No').state, 'not-needed', 'either: the printer decides');
  assert.equal(parseEnclosure('printable without an enclosure').state, 'not-needed');
  assert.equal(parseEnclosure('an enclosed printer is recommended for printing').state, 'recommended');
  assert.equal(parseEnclosure('Enclosed-frame (rec.), open-frame').state, 'unknown', 'it allows both; a reviewer reads it');
  assert.equal(parseAbrasion('Compatible Nozzle Material Any common material').requiresHardened, false);
  assert.equal(parseAbrasion('with air filtration and use of brass nozzle.').requiresHardened, false);
  assert.equal(parseAbrasion('it is recommended to use steel or ruby nozzles during printing').requiresHardened, true);
});

test('a negation is read as one (the independent review of the profile root-cause sweep)', () => {
  assert.notEqual(parseTemperature('It is not recommended to print using a heated chamber.', { plausible: [0, 250] }).requirement, REQUIREMENT.RECOMMENDED);
  assert.equal(parseAbrasion('We do not recommend using a brass nozzle').requiresHardened, true);
  assert.equal(parseAbrasion('No need to use a steel nozzle').requiresHardened, false);
  assert.notEqual(parseAbrasion('Use a brass or steel nozzle').requiresHardened, true);
  assert.notEqual(parseAbrasion('recommended to use a stainless steel nozzle').requiresHardened, true);
});

test('a drying window is read at its upper end however its unit is printed, and the first schedule in a cell decides', () => {
  for (const [v, tempC, hours] of [['70-80℃, 8-12h', 80, 12], ['50℃-60℃, 6h', 60, 6], ['at 90℃-100℃ for at least 12 hours', 100, 12], ['70℃-80℃,8h-12h', 80, 12],
    ['50°C - 65°C for 4-6 hours', 65, 6], ['Blast Drying Oven: 55 °C, 8 h X1 Series Heatbed: 65 - 75 °C, 12 h', 55, 8], ['55 °C; Minimum Time 1 hour', 55, 1]]) {
    const d = parseDrying(v);
    assert.deepEqual([d.tempC, d.hours], [tempC, hours], v);
  }
});

