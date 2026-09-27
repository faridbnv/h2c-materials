#!/usr/bin/env node
// Migration m198 (2026-09-27): LEHVOSS's printed-specimen sheet for LUVOCOM 3F PAHT 9825 NT, transcribed by a migration
// that checks each figure on its page (the owner's decision 7 of 2026-09-26, docs/GOALS.md).
//
// Batch b36 fetched the sheet (colorFabb hosts it; ledger url:e0449d7a872e6ec0, SHA-256 ce40603f…) and deferred it: the
// reader takes its specimen shape ("ISO 3167:2014 Typ A") for a moulded bar and "100% infill" for an elongation, and
// drops half the orientations, so no row it proposed could be accepted (archive/ingest-2026-09-18/proposals/b36-held).
// The owner chose a migration over a new reader rule. This one reads the page's own lines.
//
// The product. The sheet is "LUVOCOM 3F Filament PAHT® 9825 NT", "High-temperature polyamide, unreinforced, natural
// color" (pp. 1-2): the product G147-01 already is, under PAHT (M147), from LEHVOSS's injection moulded sheet of the same
// filament. It is registered as a second source of that grade, not a new product; the grade's name gains the HT both
// sheets print as a superscript ("PA^HT 9825 NT"), which the import dropped.
//
// What is recorded, as printed:
//   The tensile table, printed on an Ultimaker S5 Pro in two of LEHVOSS's profiles ("Engineering settings" and "Fast
//   settings", both offered on the Cura Marketplace, p. 2), each at 100 % infill in three XY rasters (0°, 45/135°, 90°)
//   and upright (ZX): tensile strength, elongation at maximum force (the strain at the strength) and modulus, each with
//   its spread, ISO 527-2 on an ISO 3167 type A bar. 24 values, Printed specimen, the direction the sheet labels each.
//   The table is headed "Mechanical properties at 23°C / 50% rh": the test atmosphere, with no conditioning stated,
//   so Moisture state not-stated with the heading's words kept, and Test temperature 23 °C.
//   Heat deflection, "HDT A – 1.8 MPa, Printed specimen, 80 °C" (ISO 75).
//   The rows the sheet carries over from the moulded sheet on "MPTS ISO 3167 A" (ISO's injection moulded test bar, m111)
//   or on pellets: specific gravity, water absorption, melt flow and volume rates, continuous service temperature; and
//   the thermal conductivity (hot disk, in plane) and surface resistance it prints.
// The rows stay in the record tier that the registry has no property for (insulation resistance, the 200 h service
// temperature), and the thermal expansion it prints as 0.5 × 10⁻⁵/K, a tenth of what an unfilled polyamide expands,
// which a reader should confirm with LEHVOSS before it is a number here.
//
// Which XY value is the product's. The rule prefers nothing among the six XY bars (three rasters, two profiles), so it
// takes the lowest ID (D83). The rows are written so that is the Engineering profile's 45/135° bar: LEHVOSS's first
// profile, and the alternating raster a maker's flat XY bar is usually printed with (D91). The other five stand beside
// it as the product's values at the other raster and profile; the 0° and 90° bars are the extremes of the raster.
//
// The ledger row is settled as applied, naming this migration and its reviewer: an AI agent (claude-opus-5.5, agent
// reviewer), not a person. Every figure is checked on the page's lines before anything is written, and the page's bytes
// against the digest. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m198-lehvoss-paht-9825-printed-specimens.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { readCsv, csvText } from '../../build/src/csv.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { testTemperatureCell } from '../../build/src/typed-values.js';

const migration = 'm198-lehvoss-paht-9825-printed-specimens';
const date = '2026-09-27';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const SHA = 'ce40603f06ddc81effd4a7ac26bd7e3e162c427013aa60aa18eabb6677397eb7';
const SOURCE = 'R-COLORFABB-TDS-LUVOCOM-3F-Filaments-9825-NT';
const GRADE = 'G147-01';
const MATERIAL = 'M147';
const NA = 'Not applicable';
const NP = 'Not published';
const t = openTables();

// ------------------------------------------------------------------------------------------------ the page
const pdf = cacheDir('sources/by-sha', `${SHA}.pdf`);
if (!existsSync(pdf)) throw new Error(`${migration}: ${pdf} is not cached; fetch the sheet and check it hashes to ${SHA}`);
if (sha256(readFileSync(pdf)) !== SHA) throw new Error(`${migration}: ${pdf} does not hash to ${SHA}`);
const text = cachedText(SHA);
if (!text) throw new Error(`${migration}: no cached text for ${SHA}; extract the sheet first`);
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const pageLines = (n) => text.pages.find((p) => p.page === n).lines.map((l) => norm(typeof l === 'string' ? l : l.text));
const P1 = pageLines(1);
const P2 = pageLines(2);
// A run of consecutive lines, in a range of the page.
function block(lines, want, from = 0, to = lines.length) {
  const w = want.map(norm);
  for (let i = from; i + w.length <= to; i++) if (w.every((x, k) => lines[i + k] === x)) return i;
  throw new Error(`${migration}: the page does not print, in order: ${w.map((x) => `"${x}"`).join(' / ')}`);
}
const at = (lines, pattern) => {
  const i = lines.findIndex((l) => pattern.test(l));
  if (i < 0) throw new Error(`${migration}: the page prints no line matching ${pattern}`);
  return i;
};

// The product, on both pages.
for (const lines of [P1, P2]) block(lines, ['LUVOCOM 3F Filament', 'HT', 'PA ® 9825 NT', 'High-temperature polyamide', 'unreinforced, natural color']);
block(P2, ['LUVOCOM 3F Filament PAHT® 9825 NT is an unreinforced polyamide based formulation with the ability to be printable on']);
block(P2, ['Engineering and Fast settings print profiles can be found in Ultimaker Cura Marketplace for download and use.']);

// The two profiles' sections of the tensile table.
const ENG = at(P1, /^Mechanical properties at 23°C \/ 50% rh \*Printed using Ultimak ?er S5 Pro and Engineering settings$/);
const FAST = at(P1, /^Mechanical properties at 23°C \/ 50% rh \*Printed using Ultima ?k?er S5 Pro and Fast settings$/);
const END = at(P1, /^1\/2$/);
if (!(ENG < FAST && FAST < END)) throw new Error(`${migration}: the page's two tensile sections are not where they were read`);

// Each value: its profile, raster, property, the page's own lines that hold it, and the figure and spread.
const PROPERTY = {
  strength: { name: 'Tensile strength (endpoint unspecified)', label: 'Tensile strength', unit: 'MPa' },
  strain: { name: 'Tensile strain at strength', label: 'Elongation at maximum force', unit: '%' },
  modulus: { name: 'Tensile modulus', label: 'Modulus of elasticity', unit: 'GPa' },
};
const ENGINEERING = [
  ['45/135°', 'XY', 'strength', '82.1', '0.9', ['Tensile strength', '82.1 ± 0.9', '100% infill - 45/135° - XY ISO 527-2 ISO 3167:2014 Typ A MPa']],
  ['45/135°', 'XY', 'strain', '3.7', '0.0', ['Elongation at maximum force', '100% infill - 45/135° - XY ISO 3167:2014 Typ A % 3.7 ± 0.0', 'ISO 527-2']],
  ['45/135°', 'XY', 'modulus', '3.1', '0.1', ['Modulus of elasticity', '100% infill - 45/135° - X ISO 3167:2014 Typ A GPa 3.1 ± 0.1', 'Y ISO 527-2']],
  ['0°', 'XY', 'strength', '69.1', '2.9', ['Tensile strength', '100% infill - 0 ° - XY', 'ISO 527-2 ISO 3167:2014 Typ A MPa 69.1 ± 2.9']],
  ['0°', 'XY', 'strain', '2.7', '0.3', ['Elongation at maximum force', '100% infill - 0 ° - XY ISO 3167:2014 Typ A % 2.7 ± 0.3', 'ISO 527-2']],
  ['0°', 'XY', 'modulus', '3.1', '0.1', ['Modulus of elasticity 100% infill - 0 ° - X', 'Y GPa 3.1 ± 0.1', 'ISO 527-2 ISO 3167:2014 Typ A']],
  ['90°', 'XY', 'strength', '81.6', '0.9', ['Tensile strength 81.6 ± 0.9', '100% infill - 90° - XY ISO 527-2 ISO 3167:2014 Typ A MPa']],
  ['90°', 'XY', 'strain', '3.7', '0.0', ['3.7 ± 0.0', 'Elongation at maximum force 100% infill - 90° - XY ISO 527-2 ISO 3167:2014 Typ A %']],
  ['90°', 'XY', 'modulus', '3.1', '0.0', ['Modulus of elasticity 100% infill - 90° - X GPa 3.1 ± 0.0', 'Y ISO 527-2 ISO 3167:2014 Typ A']],
  ['ZX', 'ZX', 'strength', '26.3', '2.7', ['Tensile strength MPa 26.3 ± 2.7', '100% infill - ZX ISO 527-2 ISO 3167:2014 Typ A']],
  ['ZX', 'ZX', 'strain', '1.1', '0.1', ['Elongation at maximum force 100% infill - ZX ISO 527-2 ISO 3167:2014 Typ A % 1.1 ± 0.1']],
  ['ZX', 'ZX', 'modulus', '2.8', '0.1', ['Modulus of elasticity GPa 2.8 ± 0.1', '100% infill - ZX ISO 527-2 ISO 3167:2014 Typ A']],
];
const FASTSET = [
  ['45/135°', 'XY', 'strength', '51.2', '1.9', ['Tensile strength 100% infill - 45/135° - XY ISO 527-2 MPa 51.2 ± 1.9', 'ISO 3167:2014 Typ A']],
  ['45/135°', 'XY', 'strain', '2.8', '0.1', ['Elongation at maximum force 100% infill - 45/135° - X % 2.8 ± 0.1', 'Y ISO 527-2 ISO 3167:2014 Typ A']],
  ['45/135°', 'XY', 'modulus', '2.9', '0.2', ['GPa', 'Modulus of elasticity 100% infill - 45/135° - XY ISO 527-2 2.9 ± 0.2', 'ISO 3167:2014 Typ A']],
  ['0°', 'XY', 'strength', '54.8', '1.7', ['Tensile strength', '100% infill - 0 ° - X ISO 527-2 MPa', 'Y 54.8 ± 1.7', 'ISO 3167:2014 Typ A']],
  ['0°', 'XY', 'strain', '2.6', '0.1', ['Elongation at maximum force', '100% infill - 0 ° - X ISO 527-2 %', 'Y ISO 3167:2014 Typ A 2.6 ± 0.1']],
  ['0°', 'XY', 'modulus', '2.8', '0.1', ['Modulus of elasticity ISO 527-2 GPa', '100% infill - 0 ° - XY 2.8 ± 0.1', 'ISO 3167:2014 Typ A']],
  ['90°', 'XY', 'strength', '66.2', '2.6', ['Tensile strength ISO 527-2 MPa 66.2 ± 2.6', '100% infill - 90° - XY ISO 3167:2014 Typ A']],
  ['90°', 'XY', 'strain', '3.2', '0.2', ['100% infill - 90° - XY %', 'Elongation at maximum force ISO 527-2 ISO 3167:2014 Typ A 3.2 ± 0.2']],
  ['90°', 'XY', 'modulus', '2.8', '0.3', ['Modulus of elasticity 100% infill - 90° - XY ISO 527-2 ISO 3167:2014 Typ A GPa 2.8 ± 0.3']],
  ['ZX', 'ZX', 'strength', '22.2', '3.5', ['Tensile strength', '100% infill - ZX ISO 527-2 MPa 22.2 ± 3.5', 'ISO 3167:2014 Typ A']],
  ['ZX', 'ZX', 'strain', '1.0', '0.2', ['Elongation at maximum force 100% infill - ZX ISO 527-2 1.0 ± 0.2', 'ISO 3167:2014 Typ A %']],
  ['ZX', 'ZX', 'modulus', '2.8', '0.1', ['Modulus of elasticity 2.8 ± 0.1', '100% infill - ZX ISO 527-2 ISO 3167:2014 Typ A GPa']],
];

// ------------------------------------------------------------------------------------------------ the source
let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

const SOURCE_ROW = {
  SourceID: SOURCE, Publisher: 'LEHVOSS', Title: 'LUVOCOM 3F Filament PAHT® 9825 NT', Revision: NP, 'Publication date': NP,
  'Access date': '2026-09-26', 'Source class': 'Manufacturer TDS',
  'Source note': 'Hosted by colorFabb; the sheet is LEHVOSS\'s. The printed-specimen edition of the injection moulded sheet S-PET-TDS-LUVOCOM-3F-PAHT-9825-NT-Injection-molded-specimen: tensile values on printed ISO 3167 type A bars in two Ultimaker profiles, three XY rasters and ZX. Fetched in batch b36; entered by m198, a migration that checks each figure on its page (the owner\'s decision 7 of 2026-09-26).',
  'Citation role': 'cited', URL: 'https://colorfabb.com/media/datasheets/tds/lehvoss/TDS_LUVOCOM_3F_Filaments_9825_NT.PDF',
  Locator: 'Document / product page', 'Applicable grades': GRADE, 'Access state': 'retrieved', 'Access note': NA, SHA256: SHA,
};
const existing = t.find('sources', SOURCE);
if (existing) {
  for (const [k, v] of Object.entries(SOURCE_ROW)) if (existing[k] !== v) throw new Error(`${migration}: ${SOURCE} ${k} is "${existing[k]}", not "${v}"; the data moved`);
} else {
  if (t.rows('sources').some((s) => s.SHA256 === SHA)) throw new Error(`${migration}: another source already holds ${SHA}`);
  t.append('sources', SOURCE_ROW);
  count('the sheet registered as a source of G147-01');
}

// The product's name, as both sheets print it.
const grade = t.get('grades', GRADE);
if (grade.MaterialID !== MATERIAL) throw new Error(`${migration}: ${GRADE} is filed under ${grade.MaterialID}, not ${MATERIAL}`);
const NAME = 'LUVOCOM 3F PAHT 9825 NT';
if (grade['Product name'] !== NAME) {
  if (grade['Product name'] !== 'LUVOCOM 3F PA 9825 NT') throw new Error(`${migration}: ${GRADE} is named "${grade['Product name']}"; the data moved`);
  t.set('grades', GRADE, 'Product name', NAME, { expect: grade['Product name'] });
  count('G147-01 named as its sheets print it');
}

// ------------------------------------------------------------------------------------------------ the values
const rows = () => t.rows('measurements');
function add(row, why) {
  if (rows().some((r) => r.SourceID === SOURCE && r.Locator === row.Locator && r['Data status'] !== 'Retired duplicate record')) return false;
  const full = {
    MeasurementID: nextId('measurements', rows().map((r) => r.MeasurementID)), MaterialID: MATERIAL, GradeID: GRADE,
    'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized uncertainty ±': NA,
    'Normalized upper bound': NA, 'Data status': 'Published value', Direction: NA, 'Moisture condition': NP, 'Moisture state': 'not-stated',
    'Post-processing': NP, 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP,
    'Test load MPa': NA, Notch: NA, 'Specimen / print parameters': NP, SourceID: SOURCE, 'Parse review': NA,
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

const HEADING = 'Mechanical properties at 23°C / 50% rh';
for (const [profile, list, from, to] of [['Engineering', ENGINEERING, ENG, FAST], ['Fast', FASTSET, FAST, END]]) {
  for (const [raster, direction, key, value, spread, lines] of list) {
    const p = PROPERTY[key];
    block(P1, lines, from, to);
    const joined = lines.join(' ');
    if (!joined.includes(`${value} ± ${spread}`)) throw new Error(`${migration}: "${joined}" does not hold ${value} ± ${spread}`);
    if (!joined.includes(p.label) || !joined.includes(p.unit)) throw new Error(`${migration}: "${joined}" is not a ${p.label} in ${p.unit}`);
    const rasterWords = raster === 'ZX' ? '100% infill - ZX' : `100% infill - ${raster === '0°' ? '0 °' : raster}`;
    if (!joined.includes(rasterWords)) throw new Error(`${migration}: "${joined}" is not the ${raster} bar`);
    const conditions = raster === 'ZX' ? '100% infill - ZX' : `100% infill - ${raster} - XY`;
    const added = add({
      Property: p.name, 'Raw value': `${value} ± ${spread} ${p.unit}`, 'Raw unit': p.unit, 'Raw numeric': value,
      'Raw uncertainty ±': spread, 'Normalized value': value, 'Normalized uncertainty ±': spread, 'Normalized unit': p.unit,
      'Specimen type': 'Printed specimen', Direction: direction,
      'Moisture condition': `Not published; the table is headed "${HEADING}", the test atmosphere`,
      'Test temperature': '23°C', 'Standard / load': 'ISO 527-2 ISO 3167:2014 Typ A',
      'Specimen / print parameters': `${conditions}; ISO 3167:2014 type A bar; printed using Ultimaker S5 Pro and ${profile} settings`,
      Locator: `p. 1: ${p.label}, ${conditions} (${profile} settings)`,
    }, `the printed-specimen sheet, p. 1, under "*Printed using Ultimaker S5 Pro and ${profile} settings": ${lines.map((l) => `"${norm(l)}"`).join(' / ')}. The sheet labels the bar ${direction}${raster === 'ZX' ? '' : ` at a ${raster} raster`}.${key === 'strain' ? ' The elongation at maximum force is the strain at the tensile strength.' : ''}`);
    if (added) count(`${profile} settings: ${p.name}`);
  }
}

// Heat deflection on a printed bar, and the rows carried over from the moulded sheet.
const OTHER = [
  { lines: ['Heat distortion temperature °C', 'HDT A – 1.8 MPa Printed specimen 80', 'ISO 75'],
    row: { Property: 'HDT', 'Raw value': '80 °C', 'Raw unit': '°C', 'Raw numeric': '80', 'Normalized value': '80', 'Normalized unit': '°C',
      'Specimen type': 'Printed specimen', 'Standard / load': 'HDT A – 1.8 MPa ISO 75', 'Test load MPa': '1.8', Locator: 'p. 1: Heat distortion temperature, HDT A – 1.8 MPa, Printed specimen' },
    why: 'the specimen column says "Printed specimen".' },
  { lines: ['Specific gravity ISO 1183-3 g/cm³ 1.20'],
    row: { Property: 'Density', 'Raw value': '1.20 g/cm³', 'Raw unit': 'g/cm³', 'Raw numeric': '1.2', 'Conversion factor': '1000', 'Normalized value': '1200', 'Normalized unit': 'kg/m³',
      'Specimen type': 'Not published (density specimen form not explicitly established)', 'Standard / load': 'ISO 1183-3', Locator: 'p. 1: Specific gravity ISO 1183-3' },
    why: 'the specimen column is empty on this row.' },
  { lines: ['Water absorption 23°C / 24h ISO 62 MPTS ISO 3167 A % <0.3'],
    row: { Property: 'Water absorption', 'Raw value': '<0.3 %', 'Raw unit': '%', 'Raw numeric': '0.3', Operator: '<', 'Normalized value': '0.3', 'Normalized unit': '%',
      'Specimen type': 'Raw material value', 'Standard / load': '23°C / 24h ISO 62 MPTS ISO 3167 A', Locator: 'p. 1: Water absorption 23°C / 24h ISO 62' },
    why: 'on "MPTS ISO 3167 A", ISO\'s injection moulded test bar (m111), as on the moulded sheet.' },
  { lines: ['Melt flow rates (MFR) 250°C / 2.16kg Pellet g/10min 3.6', 'ISO 1133'],
    row: { Property: 'Melt mass-flow rate', 'Raw value': '3.6 g/10min', 'Raw unit': 'g/10min', 'Raw numeric': '3.6', 'Normalized value': '3.6', 'Normalized unit': 'g/10 min',
      'Specimen type': 'Not published (do not assume printed)', 'Standard / load': '250°C / 2.16kg ISO 1133', 'Specimen / print parameters': 'Pellet', Locator: 'p. 1: Melt flow rates (MFR) 250°C / 2.16kg' },
    why: 'measured on pellets.' },
  { lines: ['Melt volume rate (MVR) 250°C / 2.16kg ISO 1133 Pellet cm³/10min 3.5'],
    row: { Property: 'Melt volume-flow rate', 'Raw value': '3.5 cm³/10min', 'Raw unit': 'cm³/10min', 'Raw numeric': '3.5', 'Normalized value': '3.5', 'Normalized unit': 'cm³/10 min',
      'Specimen type': 'Not published (do not assume printed)', 'Standard / load': '250°C / 2.16kg ISO 1133', 'Specimen / print parameters': 'Pellet', Locator: 'p. 1: Melt volume rate (MVR) 250°C / 2.16kg' },
    why: 'measured on pellets.' },
  { lines: ['Continuous service temperature', 'IEC 60216 MPTS ISO 3167 A °C 100', '20,000 h'],
    row: { Property: 'Continuous service temperature', 'Raw value': '100 °C', 'Raw unit': '°C', 'Raw numeric': '100', 'Normalized value': '100', 'Normalized unit': '°C',
      'Specimen type': 'Raw material value', 'Standard / load': '20,000 h IEC 60216 MPTS ISO 3167 A', Locator: 'p. 1: Continuous service temperature IEC 60216, 20,000 h' },
    why: 'on "MPTS ISO 3167 A", ISO\'s injection moulded test bar (m111). The moulded sheet prints 120 °C to UL 746B.' },
  { lines: ['Thermal conductivity in plane || 60x60x3mm', 'hot disk W/mK 0.3', 'ISO 22007'],
    row: { Property: 'Thermal conductivity', 'Raw value': '0.3 W/mK', 'Raw unit': 'W/(m·K)', 'Raw numeric': '0.3', 'Normalized value': '0.3', 'Normalized unit': 'W/(m·K)',
      'Specimen type': 'Not published (do not assume printed)', 'Standard / load': 'hot disk ISO 22007', 'Specimen / print parameters': 'in plane, 60x60x3mm', Locator: 'p. 1: Thermal conductivity in plane, hot disk ISO 22007' },
    why: 'on a 60 × 60 × 3 mm plate, in plane; the sheet does not say how the plate was made.' },
  { lines: ['ROB DIN IEC 60093 Ronde 60x4mm', 'Surface resistance Ω', '>10¹²'],
    row: { Property: 'Surface resistivity', 'Raw value': '10¹² Ω', 'Raw unit': 'Ω', 'Raw numeric': '1000000000000', Operator: '>', 'Normalized value': '1000000000000', 'Normalized unit': 'Ω',
      'Specimen type': 'Not published (do not assume printed)', 'Standard / load': '60x4mm IEC 60093', 'Specimen / print parameters': 'Ronde 60x4mm', Locator: 'p. 1: Surface resistance ROB DIN IEC 60093' },
    why: 'on a 60 × 4 mm disc; the sheet does not say how the disc was made.' },
];
for (const o of OTHER) {
  block(P1, o.lines, 0, ENG);
  if (add(o.row, `the printed-specimen sheet, p. 1: ${o.lines.map((l) => `"${norm(l)}"`).join(' / ')}; ${o.why}`)) count(`physical and thermal: ${o.row.Property}`);
}

// ------------------------------------------------------------------------------------------------ the ledger
const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const { records } = readCsv(LEDGER);
const ledger = records.map((r) => r.values);
const head = Object.keys(ledger[0]);
const entry = ledger.find((r) => r.sha256 === SHA);
if (!entry) throw new Error(`${migration}: the ledger has no row for ${SHA}`);
const NOTE = `applied by ${migration} (the owner's decision 7 of 2026-09-26: a migration that checks each figure on its page, not a new reader rule): the tensile table in both profiles and all four bars, heat deflection on a printed bar and the rows carried over from the moulded sheet, registered as ${SOURCE}, a second source of ${GRADE}; reviewed by claude-opus-5.5 (agent reviewer), ${date}`;
if (entry.status !== 'applied') {
  if (entry.status !== 'deferred') throw new Error(`${migration}: the ledger row is "${entry.status}", not deferred; the data moved`);
  Object.assign(entry, { status: 'applied', registered_source_id: SOURCE, registered_by: 'sha', status_note: NOTE, updated: date });
  writeFileSync(LEDGER, csvText(head, ledger));
  count('the ledger row settled as applied');
} else if (entry.registered_source_id !== SOURCE) throw new Error(`${migration}: the ledger row is applied as ${entry.registered_source_id}`);

// The sheet's values are all of G147-01, and the rule's XY value is the Engineering 45/135° bar.
const mine = rows().filter((r) => r.SourceID === SOURCE);
if (mine.length !== ENGINEERING.length + FASTSET.length + OTHER.length) throw new Error(`${migration}: ${SOURCE} has ${mine.length} rows`);
for (const p of Object.values(PROPERTY)) {
  const xy = mine.filter((r) => r.Property === p.name && r.Direction === 'XY').sort((a, b) => (a.MeasurementID < b.MeasurementID ? -1 : 1));
  if (!/45\/135° - XY; .* Engineering settings$/.test(xy[0]['Specimen / print parameters'])) throw new Error(`${migration}: the first XY ${p.name} is not the Engineering 45/135° bar`);
}
if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
