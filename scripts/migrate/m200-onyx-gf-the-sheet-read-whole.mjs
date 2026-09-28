#!/usr/bin/env node
// Migration m200 (2026-09-27): Markforged's Onyx GF sheet, read whole (GOALS C3, method step 2; the research package
// of 2026-09-26, P1-VALUES).
//
// Batch b34 (m143) entered Onyx GF (G166-01, Nylon-GF, polymer not stated) from its two-page Composite Material
// Datasheet and read one column of it: p. 2's XZ Orientation, four tensile values. The rest of the sheet, the product's
// flat XY bars and its only other values, was never read. The research package of 2026-09-26 found the XY modulus
// (P1-VALUES-ROOT-009 to 013); the sheet, read here on its cached, hash-checked page, prints:
//
//   p. 1, "Onyx GF XY Orientation": tensile yield, break, modulus and elongation (ASTM D638 type I), flexural strength
//     and modulus (D790), compressive strength (D695), notched Izod (D256, "printed with a notch"), density, heat
//     deflection at 1.8 MPa ("D648 A", by DMA "using an internal method based on ASTM D648"), two thermal expansions
//     and a thermal conductivity. The Carbon Fiber column beside it is the continuous fibre, "derived from pure fiber
//     test specimens", and is not this product.
//   p. 2, "Directional mechanical and thermal properties": the XZ column m143 read, the XY column (the p. 1 figures
//     again) and ZX; and "Mechanical properties in different environments", the XY tensile bar dry, conditioned (the
//     p. 1 figures again) and wet.
//
// Both pages say how: "Onyx GF specimens were printed with a layer height of 125 μm using default solid fill settings
// on an FX10 and conditioned at 52% RH and 23 ± 2°C for 44 ± 2 h in accordance with Procedure A of ASTM D618 unless
// otherwise noted." So every bar is a printed specimen, m143's four XZ rows among them (they said "do not assume
// printed", and held the table's header "Property Unit" as their print parameters), and every figure is conditioned
// unless the page says dry or wet. D84 compares dry or unstated values: the dry XY column decides; the conditioned and
// wet ones are recorded beside it. Figures p. 2 repeats from p. 1 are recorded once, from p. 1.
//
// The ZX tensile bar: footnote 5, "ZX tensile specimens were machined from a cuboidal tube printed on an FX-10 with
// solid fill settings, 4 walls, and 4 floors", and the page's drawing stands the ZX bar upright beside the flat XY and
// on-edge XZ bars (rendered and read by the reviewer; the drawing is an image). A tensile bar the sheet shows upright
// is Z, the layer strength (D92, m191). The part it was machined from was printed, so it is a printed part.
//
// Left in the record tier: the compressive modulus (no property for it) and the XZ thermal expansions, which footnote
// 6 says are the XY specimens ("CTE specimens have cuboid geometry, so XY and XZ specimens are identical").
//
// Every figure is checked on the page's own lines before anything is written, and the page's bytes against the
// digest. The reader is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m200-onyx-gf-the-sheet-read-whole.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables, nextId } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { testTemperatureCell } from '../../build/src/typed-values.js';
import { correct } from './source-edits.mjs';

const migration = 'm200-onyx-gf-the-sheet-read-whole';
const date = '2026-09-27';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const SOURCE = 'R-MARKFORGED-Onyx-GF-Material-Datasheet';
const GRADE = 'G166-01';
const MATERIAL = 'M166';
const NA = 'Not applicable';
const NP = 'Not published';
const t = openTables();

// ------------------------------------------------------------------------------------------------ the page
const SHA = t.get('sources', SOURCE).SHA256;
const pdf = cacheDir('sources/by-sha', `${SHA}.pdf`);
if (!existsSync(pdf)) throw new Error(`${migration}: ${pdf} is not cached; fetch the sheet and check it hashes to ${SHA}`);
if (sha256(readFileSync(pdf)) !== SHA) throw new Error(`${migration}: ${pdf} does not hash to ${SHA}`);
const text = cachedText(SHA);
if (!text) throw new Error(`${migration}: no cached text for ${SHA}; extract the sheet first`);
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const pageLines = (n) => text.pages.find((p) => p.page === n).lines.map((l) => norm(typeof l === 'string' ? l : l.text));
const P1 = pageLines(1);
const P2 = pageLines(2);
function block(lines, want) {
  const w = want.map(norm);
  for (let i = 0; i + w.length <= lines.length; i++) if (w.every((x, k) => lines[i + k] === x)) return i;
  throw new Error(`${migration}: the page does not print, in order: ${w.map((x) => `"${x}"`).join(' / ')}`);
}

const PRINTED = 'Onyx GF specimens were printed with a layer height of 125 μm using default solid fill settings on an FX10 and conditioned at 52% RH and 23 ± 2°C for 44 ± 2 h in accordance with Procedure A of ASTM';
for (const lines of [P1, P2]) if (!lines.some((l) => l.startsWith(norm(PRINTED)))) throw new Error(`${migration}: the page no longer says how the specimens were printed`);
block(P1, ['Onyx GF', 'Test (ASTM) Carbon Fiber', 'Material Properties Unit Test (ASTM)', 'XY Orientation']);
block(P1, ['Tensile specimens are ASTM D638 type I beams.']);
block(P1, ['Impact specimens were 12.7 mm wide and printed with a notch according to the geometry specified in ASTM D256.']);
block(P1, ['HDT was measured via DMA using an internal method based on ASTM D648.']);
block(P2, ['Property Unit XZ Orientation XY Orientation ZX Orientation']);
block(P2, ['ZX tensile specimens were machined from a cuboidal tube printed on an FX-10 with solid fill settings, 4 walls, and 4 floors.']);
block(P2, ['Property (XY Orientation) Unit Dry Conditioned Wet']);
block(P2, ['Dry specimens were dried under vacuum at 75°C for 24 h prior to testing.']);
block(P2, ['Wet specimens were soaked in water for 72 h prior to testing.']);

const PRINT = 'Printed on an FX10 with a layer height of 125 μm and default solid fill settings (pp. 1-2)';
const CONDITIONED = 'Conditioned: 52% RH and 23 ± 2°C for 44 ± 2 h, ASTM D618 Procedure A';
const DRY = 'Dry: dried under vacuum at 75°C for 24 h prior to testing';
const WET = 'Wet: soaked in water for 72 h prior to testing';

// ------------------------------------------------------------------------------------------------ m143's four XZ rows
let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };
const XZ = ['V011150', 'V011151', 'V011152', 'V011153'];
count('m143\'s XZ rows: a printed specimen, printed as the page says', correct(t, {
  source: SOURCE, ids: XZ, migration, date,
  set: { 'Specimen type': ['Not published (do not assume printed)', 'Printed specimen'], 'Specimen / print parameters': ['Property Unit', PRINT] },
  note: `both pages say "${PRINTED} D618 unless otherwise noted"; the print parameters held the table's header ("Property Unit"). ${READER}`,
}));

// ------------------------------------------------------------------------------------------------ the values
const rows = () => t.rows('measurements');
function add(row, why) {
  if (rows().some((r) => r.SourceID === SOURCE && r.Locator === row.Locator && r['Data status'] !== 'Retired duplicate record')) return false;
  const full = {
    MeasurementID: nextId('measurements', rows().map((r) => r.MeasurementID)), MaterialID: MATERIAL, GradeID: GRADE,
    'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized uncertainty ±': NA,
    'Normalized upper bound': NA, 'Data status': 'Published value', 'Specimen type': 'Printed specimen', Direction: NA,
    'Moisture condition': CONDITIONED, 'Moisture state': 'conditioned', 'Post-processing': NP, 'Post-processing state': 'not-stated',
    'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP, 'Test load MPa': NA, Notch: NA, 'Specimen / print parameters': PRINT,
    SourceID: SOURCE, 'Parse review': NA,
    ...row,
    Notes: `Added ${date} (${migration}): ${why} ${READER}`,
  };
  full['Test temperature °C'] = testTemperatureCell(full['Test temperature']);
  full.Standards = readStandards(full['Standard / load']).join('; ') || NP;
  const header = t.header('measurements');
  for (const k of header) if (full[k] == null) throw new Error(`${migration}: ${full.Locator} has no ${k}`);
  t.append('measurements', Object.fromEntries(header.map((k) => [k, full[k]])));
  return true;
}
// A value with its spread, as the page prints it.
const v = (value, spread, unit, extra = {}) => ({
  'Raw value': `${value}${spread ? ` ± ${spread}` : ''} ${unit}`, 'Raw unit': unit, 'Raw numeric': value, 'Normalized value': value, 'Normalized unit': unit,
  ...(spread ? { 'Raw uncertainty ±': spread, 'Normalized uncertainty ±': spread } : {}), ...extra,
});

// p. 1, the XY column: the page's line, and the row it gives.
const P1ROWS = [
  [['Tensile Strength at Yield MPa (ksi) D638¹ 57.9 ± 0.7 (8.4 ± 0.1) -'], { Property: 'Tensile yield strength', ...v('57.9', '0.7', 'MPa'), Direction: 'XY', 'Standard / load': 'D638¹ (ASTM D638 type I beams)', Locator: 'p. 1: Tensile Strength at Yield, XY Orientation' }],
  [['Tensile Strength at Break', 'MPa (ksi) D638¹ 56.5 ± 0.9 (8.2 ± 0.1) D3039 800 (116)'], { Property: 'Tensile break strength', ...v('56.5', '0.9', 'MPa'), Direction: 'XY', 'Standard / load': 'D638¹ (ASTM D638 type I beams)', Locator: 'p. 1: Tensile Strength at Break, XY Orientation' }],
  [['Tensile Modulus', 'GPa (ksi) D638¹ 3.1 ± 0.1 (446 ± 10) D3039 60 (8,702)'], { Property: 'Tensile modulus', ...v('3.1', '0.1', 'GPa'), Direction: 'XY', 'Standard / load': 'D638¹ (ASTM D638 type I beams)', Locator: 'p. 1: Tensile Modulus, XY Orientation' }],
  [['% D638¹ 6.2 ± 0.6 D3039', 'Elongation at Break 1.5'], { Property: 'Elongation at break', ...v('6.2', '0.6', '%'), Direction: 'XY', 'Standard / load': 'D638¹ (ASTM D638 type I beams)', Locator: 'p. 1: Elongation at Break, XY Orientation' }],
  [['Flexural Strength MPa (ksi) D790 88.2 ± 2.4 (12.8 ± 0.3) D790 540 (78.3)'], { Property: 'Flexural strength', ...v('88.2', '2.4', 'MPa'), Direction: 'XY', 'Standard / load': 'D790', Locator: 'p. 1: Flexural Strength, XY Orientation' }],
  [['2.4 ± 0.1 (343 ± 8)', 'Flexural Modulus GPa (ksi) D790 D790 51 (7,397)'], { Property: 'Flexural modulus', ...v('2.4', '0.1', 'GPa'), Direction: 'XY', 'Standard / load': 'D790', Locator: 'p. 1: Flexural Modulus, XY Orientation' }],
  [['Compressive Strength MPa (ksi) D695² 71.8 ± 4.0 (10.4 ± 0.6) D6641 420 (60.9)'], { Property: 'Compression strength', ...v('71.8', '4.0', 'MPa'), Direction: 'XY', 'Standard / load': 'D695² (an accredited third party test facility)', Locator: 'p. 1: Compressive Strength, XY Orientation' }],
  [['Notched Izod Impact Resistance D256 A3 161 ± 9 (3.0 ± 0.2) D256 960 (18)', 'J/m (ft*lb/in)'], { Property: 'Izod impact strength', ...v('161', '9', 'J/m'), Direction: 'XY', Notch: 'Notched', 'Standard / load': 'D256 A³ (12.7 mm wide, printed with a notch)', Locator: 'p. 1: Notched Izod Impact Resistance, XY Orientation' }],
  [['g/cm - 1.21 ± 0.01 1.4', 'Density -'], { Property: 'Density', ...v('1.21', '0.01', 'g/cm³', { 'Conversion factor': '1000', 'Normalized value': '1210', 'Normalized uncertainty ±': '10', 'Normalized unit': 'kg/m³' }), 'Specimen type': 'Not published (density specimen form not explicitly established)', 'Moisture condition': NP, 'Moisture state': 'not-stated', 'Standard / load': NP, Locator: 'p. 1: Density' }],
  [['138 (280)', 'Heat Deflection Temperature (1.8 MPa) °C (°F) D648 A4 - -'], { Property: 'HDT', ...v('138', '', '°C'), 'Test load MPa': '1.8', 'Standard / load': 'Heat Deflection Temperature (1.8 MPa) D648 A⁴ (measured via DMA using an internal method based on ASTM D648)', Locator: 'p. 1: Heat Deflection Temperature (1.8 MPa)' }],
  [['Mean CTE (30 to 50°C) μm/(m*°C) E831² 35.8 - -'], { Property: 'Coefficient of thermal expansion', ...v('35.8', '', 'µm/m/K', { 'Raw unit': 'µm/m/K', 'Raw value': '35.8 μm/(m*°C)' }), Direction: 'XY', 'Test temperature': '30 to 50°C', 'Standard / load': 'E831² (an accredited third party test facility)', Locator: 'p. 1: Mean CTE (30 to 50°C), XY Orientation' }],
  [['Mean CTE (60 to 160°C) μm/(m*°C) E831² 45.7 - -'], { Property: 'Coefficient of thermal expansion', ...v('45.7', '', 'µm/m/K', { 'Raw unit': 'µm/m/K', 'Raw value': '45.7 μm/(m*°C)' }), Direction: 'XY', 'Test temperature': '60 to 160°C', 'Standard / load': 'E831² (an accredited third party test facility)', Locator: 'p. 1: Mean CTE (60 to 160°C), XY Orientation' }],
  [['Thermal Conductivity W/(m*K) E1530² 0.280 ± 0.002 - -'], { Property: 'Thermal conductivity', ...v('0.280', '0.002', 'W/(m·K)', { 'Raw unit': 'W/(m*K)', 'Raw value': '0.280 ± 0.002 W/(m*K)', 'Normalized value': '0.28' }), 'Standard / load': 'E1530² (an accredited third party test facility)', Locator: 'p. 1: Thermal Conductivity' }],
];
for (const [lines, row] of P1ROWS) {
  block(P1, lines);
  const why = `the sheet, p. 1, the "Onyx GF XY Orientation" column: ${lines.map((l) => `"${l}"`).join(' / ')}; "${PRINTED} D618 unless otherwise noted".`;
  if (add(row, why)) count(`p. 1, XY: ${row.Property}`);
}

// p. 2: the XY tensile bar dry and wet (its conditioned column is p. 1's), and the ZX column.
const TENSILE = [
  ['Tensile yield strength', 'Tensile Strength at Yield', 'MPa'], ['Tensile break strength', 'Tensile Strength at Break', 'MPa'],
  ['Tensile modulus', 'Tensile Modulus', 'GPa'], ['Elongation at break', 'Elongation at Break', '%'],
];
block(P2, ['Tensile Strength at Yield MPa 60.4 ± 1.9 57.9 ± 0.7 41.7 ± 0.7', 'Tensile Strength at Break MPa 56.5 ± 0.9 40.4 ± 0.9', '59.4 ± 1.7', 'Tensile Modulus GPa 3.1 ± 0.1', '3.1 ± 0.1 1.9 ± 0.1', '% 6.2 ± 0.6 21.9 ± 3.0', 'Elongation at Break 5.5 ± 0.3']);
// The text layer takes the break strength's and the elongation's dry figures out of their rows; the rendered page
// prints them in the Dry column (59.4 ± 1.7, 5.5 ± 0.3), where the reviewer read them.
const ENVIRONMENTS = {
  dry: { moisture: DRY, state: 'dry', note: 'footnote 7', values: [['60.4', '1.9'], ['59.4', '1.7'], ['3.1', '0.1'], ['5.5', '0.3']] },
  wet: { moisture: WET, state: 'conditioned', note: 'footnote 9', values: [['41.7', '0.7'], ['40.4', '0.9'], ['1.9', '0.1'], ['21.9', '3.0']] },
};
for (const [label, e] of Object.entries(ENVIRONMENTS)) {
  TENSILE.forEach(([property, printed, unit], i) => {
    const [value, spread] = e.values[i];
    const row = { Property: property, ...v(value, spread, unit), Direction: 'XY', 'Moisture condition': e.moisture, 'Moisture state': e.state, 'Standard / load': NP,
      Locator: `p. 2: Mechanical properties in different environments, ${printed}, ${label === 'dry' ? 'Dry' : 'Wet'}` };
    if (add(row, `the sheet, p. 2, "Mechanical properties in different environments", "Property (XY Orientation) Unit Dry Conditioned Wet": ${printed} ${value} ± ${spread} ${unit} in the ${label === 'dry' ? 'Dry' : 'Wet'} column; ${e.note}, "${e.moisture.replace(/^\w+: /, '')}".`)) count(`p. 2, XY ${label}: ${property}`);
  });
}
block(P2, ['Tensile Strength at Break', 'MPa 70.7 ± 1.8 56.5 ± 0.9 25.9 ± 3.5', 'Tensile Modulus GPa 4.2 ± 0.2 3.1 ± 0.1 1.5 ± 0.2', '6.2 ± 0.6', '% 5.9 ± 0.4 3.2 ± 0.3', 'Elongation at Break']);
block(P2, ['Mean CTE (30 to 50°C)⁶ 35.8 121']);
block(P2, ['Mean CTE (60 to 160°C)⁶ μm/(m*°C) 45.7 284']);
const MACHINED = 'Machined from a cuboidal tube printed on an FX-10 with solid fill settings, 4 walls, and 4 floors (p. 2, footnote 5)';
const UPRIGHT = 'The ZX column: footnote 5, "ZX tensile specimens were machined from a cuboidal tube printed on an FX-10 with solid fill settings, 4 walls, and 4 floors", and the page\'s drawing stands the ZX bar upright beside the flat XY and on-edge XZ bars: pulled along Z, across its layers (D92, m191).';
const ZX = [
  [{ Property: 'Tensile break strength', ...v('25.9', '3.5', 'MPa') }, 'Tensile Strength at Break'],
  [{ Property: 'Tensile modulus', ...v('1.5', '0.2', 'GPa') }, 'Tensile Modulus'],
  [{ Property: 'Elongation at break', ...v('3.2', '0.3', '%') }, 'Elongation at Break'],
];
for (const [row, printed] of ZX) {
  const full = { ...row, 'Specimen type': 'Printed part', Direction: 'Z', 'Standard / load': NP, 'Specimen / print parameters': MACHINED, Locator: `p. 2: ${printed}, ZX Orientation` };
  if (add(full, `the sheet, p. 2, "Directional mechanical and thermal properties", ${printed} ${row['Raw value']} in the ZX Orientation column. ${UPRIGHT}`)) count(`p. 2, ZX: ${row.Property}`);
}
for (const [value, range] of [['121', '30 to 50°C'], ['284', '60 to 160°C']]) {
  const row = { Property: 'Coefficient of thermal expansion', ...v(value, '', 'µm/m/K', { 'Raw unit': 'µm/m/K', 'Raw value': `${value} μm/(m*°C)` }), Direction: 'ZX', 'Test temperature': range, 'Standard / load': 'E831² (an accredited third party test facility; p. 1)',
    Locator: `p. 2: Mean CTE (${range}), ZX Orientation` };
  if (add(row, `the sheet, p. 2, Mean CTE (${range}) ${value} μm/(m*°C) in the ZX Orientation column; the highest in Z "when print layers are stacked", as the page says.`)) count('p. 2, ZX: Coefficient of thermal expansion');
}

// The sheet's rows are all of G166-01.
const mine = rows().filter((r) => r.SourceID === SOURCE && r['Data status'] !== 'Retired duplicate record');
if (mine.length !== XZ.length + P1ROWS.length + 8 + ZX.length + 2) throw new Error(`${migration}: ${SOURCE} has ${mine.length} rows`);
if (mine.some((r) => r.GradeID !== GRADE)) throw new Error(`${migration}: a row of ${SOURCE} is not ${GRADE}'s`);
if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
