#!/usr/bin/env node
// Migration m37 (2026-09-16): FormFutura STYX PA6 as a second PA6 grade (owner ruling; withdrawn from m35 pending it).
//
// PA6 (M049) had one grade, Spectrum PA6 Neat (G049-01), a declared "undisclosed dense filler" variant (m26). The
// FormFutura STYX PA6 Technical Data Sheet (Version 1.0, print date 28-02-2023) was fetched from formfutura.com on
// 2026-09-16, hashed (sources.csv) and read page by page. It publishes, on p. 1, an unfilled PA6's density, moisture
// and water absorption, melt volume rate, ISO 527-1/-2 tensile modulus (1 mm/min), strength and elongation at break
// (50 mm/min), ISO 178 flexural modulus and strength (2 mm/min), Charpy unnotched and notched impact (ISO 179/1eU as
// printed on both rows), melting temperature (DSC, ISO 3146), a heat deflection temperature with no load stated
// (ISO 75-1/-2) and a UL-94 V2 flammability rating at 1.5 mm. It states no specimen, no print direction, no moisture
// state at test and no print settings; the Storage and handling block (store below 15 % humidity at 18-25 °C, dry
// before use, print from a dry box) is guidance, not a test condition. Every value is transcribed as printed (decimal
// commas kept in Raw value) with Direction and Specimen type "Not published"; the HDT row carries Test load MPa
// "Not published", so it is bracketed by the definition, never read as a 0.45 MPa value.
//
// Spectrum PA6 Neat stays the representative grade: its Variant declaration keeps its compound values from moving the
// polyamide family, and the STYX values, unstated in direction and specimen, back no XY headline. The Grades coverage
// finding is superseded with the new manufacturer count, and the Thermal finding with the STYX HDT and Tm.
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';

const MIGRATION = 'm37';
const DATE = '2026-09-16';
const NA = 'Not applicable';
const NP = 'Not published';
const ADDED = `Added ${DATE} (${MIGRATION}): re-read from the source document (SHA-256 recorded in sources.csv).`;

const SOURCE = {
  SourceID: 'R-FORMFUTURA-STYX-PA6-TDS', Publisher: 'FormFutura', Title: 'Technical Data Sheet STYX PA6', Revision: 'Version: 1.0; print date 28-02-2023', 'Publication date': '2023-02-28',
  'Access date': DATE, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
  URL: 'https://www.formfutura.com/web/content/281451?download=true',
  Locator: 'p. 1: Material properties, Mechanical properties, Thermal properties (typical value and test method; no specimen, direction or print settings stated); Storage and handling; p. 2: Disclaimer',
  'Applicable grades': 'G049-02', 'Access status': 'Retrieved',
  SHA256: '5202ff7a803935abd6b61daa5b25dfa389515abd1a1ff0e1944fad91068b381c',
};

const GRADE = {
  MaterialID: 'M049', Role: 'procurement', Status: 'active', Manufacturer: 'FormFutura', 'Product name': 'STYX PA6', 'Shared formulation key': SOURCE.SourceID,
  'Composition / filler': 'PA6 (nylon) filament, "Low warping PA6 filament" (TDS); no filler or additive disclosed, and its 1.15 g/cm³ and 2.9 GPa are within neat PA6',
  Variant: NA, 'Colour caveat': 'Properties may vary by colour; use TDS scope (the sheet names no colour)',
  Availability: 'Current FormFutura product; TDS served from formfutura.com, retrieved 2026-09-16',
  'Certification claims': 'Flammability UL-94 V2 at 1.5 mm (TDS "Flammability" row); a typical value, not a certificate: verify grade, thickness and certificate',
  'Selected-grade rationale': `Second PA6 manufacturer, added ${DATE} (${MIGRATION}, owner ruling): an unfilled PA6 whose sheet publishes ISO 527-1/-2 tensile values, ISO 178 flexural values, Charpy impact, Tm and an HDT with no load stated. Direction and specimen not stated, so it backs no XY headline; Spectrum PA6 Neat (G049-01, a declared undisclosed dense filler) stays the representative grade`,
  SourceID: SOURCE.SourceID, 'Source locator': 'Version 1.0, p. 1', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance (the sheet states no diameter)',
};

const M_DEFAULTS = {
  'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
  'Data status': 'Published value', 'Specimen type': 'Not published (do not assume printed)', Direction: NP, 'Moisture condition': NP,
  'Post-processing': NP, 'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP, 'Test load MPa': NA, Notch: NA,
  'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
};
const UNIT = { MPaGPa: ['GPa', 0.001], MPa: ['MPa', 1], pct: ['%', 1], C: ['°C', 1], gcc: ['kg/m³', 1000], kJm2: ['kJ/m²', 1], cm310: ['cm³/10 min', 1] };
const round = (x) => Number(x.toPrecision(10));
/** A published number: [property, raw value text as printed, raw unit text, unit key, standard, locator, overrides]. */
function num(property, raw, rawUnit, unitKey, standard, locator, over = {}) {
  const [normUnit, factor] = UNIT[unitKey];
  const [, main] = /^(-?\d+(?:[.,]\d+)?)/.exec(String(raw).trim()) ?? [];
  if (main == null) throw new Error(`${MIGRATION}: cannot read a number from "${raw}"`);
  const numeric = main.replace(',', '.');
  return {
    ...M_DEFAULTS, Property: property, 'Raw value': String(raw), 'Raw unit': rawUnit, 'Raw numeric': numeric, 'Conversion factor': String(factor),
    'Normalized value': String(round(Number(numeric) * factor)), 'Normalized unit': normUnit, 'Standard / load': standard, Locator: locator, ...over,
  };
}
const THERMAL = { Direction: NA };
const AT23 = { 'Test temperature': '23 °C' };
const COMMA = 'The sheet prints a decimal comma.';

const MEASUREMENTS = [
  num('Density', '1.15 g/cm3', 'g/cm3', 'gcc', 'ISO 1183', 'p. 1: Density', { 'Specimen type': 'Not published (density specimen form not explicitly established)', ...THERMAL }),
  num('Water absorption', '3,00%', '%', 'pct', 'ISO 62; 23 °C / 50% r.h.', 'p. 1: Moisture absorption, 23°C/ 50% r.h.', { ...THERMAL, ...AT23, Notes: `The sheet labels the row "Moisture absorption" (23 °C, 50% r.h., ISO 62): the equilibrium water uptake at 50% RH. ${COMMA}` }),
  num('Water absorption', '9.5%', '%', 'pct', 'ISO 62; 23 °C / saturation in water', 'p. 1: Water absorption, 23°C/ saturation in water', { ...THERMAL, ...AT23 }),
  num('Melt volume-flow rate', '120 cm3/10 min', 'cm3/10 min', 'cm310', 'ISO 1133; 275 °C, 5 kg', 'p. 1: Melt Volume Rate, 275°C/5kg', { ...THERMAL, 'Test temperature': '275 °C' }),
  num('Tensile modulus', '2900 MPa', 'MPa', 'MPaGPa', 'ISO 527-1/-2; 23 °C, 1 mm/min', 'p. 1: Tensile modulus (23°C, 1mm/min)', { ...AT23 }),
  num('Tensile strength (endpoint unspecified)', '50 MPa', 'MPa', 'MPa', 'ISO 527-1/-2; 23 °C, 50 mm/min', 'p. 1: Tensile strength (23°C, 50mm/min)', { ...AT23 }),
  num('Elongation at break', '1,9%', '%', 'pct', 'ISO 527-1/-2; 23 °C, 50 mm/min', 'p. 1: Elongation at break (23°C, 50mm/min)', { ...AT23, Notes: COMMA }),
  num('Flexural modulus', '2800 MPa', 'MPa', 'MPaGPa', 'ISO 178; 23 °C, 2 mm/min', 'p. 1: Flexural modulus (23°C, 2mm/min)', { ...AT23 }),
  num('Flexural strength', '112 MPa', 'MPa', 'MPa', 'ISO 178; 23 °C, 2 mm/min', 'p. 1: Flexural strength (23°C, 2mm/min)', { ...AT23 }),
  num('Charpy strength', '139 NB kJ/m²', 'kJ/m²', 'kJm2', 'ISO 179/1eU', 'p. 1: Charpy unnotched impact strength, 23°C', { ...AT23, Notch: 'Unnotched', Notes: 'The sheet prints "139 NB" (NB: no break) beside the unnotched value; the number is recorded as printed and the NB mark noted here.' }),
  num('Charpy strength', '6,8 kJ/m²', 'kJ/m²', 'kJm2', 'ISO 179/1eU', 'p. 1: Charpy notched impact strength, 23°C', { ...AT23, Notch: 'Notched', Notes: `The sheet cites ISO 179/1eU for the notched row as well as the unnotched one; 1eU is the unnotched method (1eA is the notched one). Recorded as printed. ${COMMA}` }),
  num('Melting temperature', '185°C', '°C', 'C', 'ISO 3146; DSC, 10 °C/min', 'p. 1: Melting temperature (DSC), 10°C/min', { ...THERMAL }),
  num('HDT', '60°C', '°C', 'C', 'ISO 75-1/-2', 'p. 1: Heat Deflection Temperature (HDT)', { ...THERMAL, 'Test load MPa': NP, Notes: 'Test load not published; do not combine with specified-load HDT.' }),
];

// Coverage findings the new grade changes. [old row, domain, new status, finding(manufacturer count)]
const COVERAGE = [
  ['C00014', 'Grades', 'Gap', (n) => `${n} distinct manufacturer(s) documented against target 3. FormFutura STYX PA6 (G049-02) added ${DATE} (${MIGRATION}): unfilled, direction and specimen not stated; Spectrum PA6 Neat (G049-01) stays the representative grade.`],
  ['C00547', 'Thermal', 'Evidence recorded', () => `Spectrum PA6 Neat (G049-01) publishes HDT A (1.8 MPa) 90 °C and a continuous service temperature of 120 °C (20,000 h). FormFutura STYX PA6 (G049-02) HDT 60 °C with no load stated (ISO 75-1/-2) and melting temperature 185 °C (DSC) recorded ${DATE} (${MIGRATION}). No 0.45 MPa value. HDT, Tg and Vicat are not continuous-service ratings.`],
];

export function migrate(t) {
  if (!t.find('sources', SOURCE.SourceID)) t.append('sources', SOURCE);

  let grade = t.rows('grades').find((g) => g.SourceID === SOURCE.SourceID && g['Product name'] === GRADE['Product name']);
  if (!grade) {
    grade = { ...GRADE, GradeID: nextId('grades', t.rows('grades').map((r) => r.GradeID), { materialId: 'M049' }) };
    t.append('grades', grade);
  }
  if (grade.GradeID !== 'G049-02') throw new Error(`${MIGRATION}: STYX PA6 became ${grade.GradeID}, not G049-02, which the source's "Applicable grades" names`);

  for (const r of MEASUREMENTS) {
    if (t.rows('measurements').some((x) => x.SourceID === SOURCE.SourceID && x.Locator === r.Locator)) continue;
    const row = { ...r, MeasurementID: nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID)), MaterialID: 'M049', GradeID: grade.GradeID, SourceID: SOURCE.SourceID };
    row.Notes = row.Notes === NA ? ADDED : `${ADDED} ${row.Notes}`;
    t.append('measurements', row);
  }

  const manufacturers = new Set(t.rows('grades').filter((g) => g.MaterialID === 'M049' && g.Role === 'procurement' && g.Status === 'active').map((g) => g.Manufacturer)).size;
  for (const [oldId, domain, status, finding] of COVERAGE) {
    const old = t.get('coverage', oldId);
    if (old.Status === 'Superseded') continue;
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', { CoverageID: newId, MaterialID: 'M049', Domain: domain, Status: status, 'Manufacturer count': domain === 'Grades' ? String(manufacturers) : NA, Finding: finding(manufacturers) });
    t.set('coverage', oldId, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', oldId, 'Status', 'Superseded', { expect: old.Status });
    if (old['Manufacturer count'] !== NA) t.set('coverage', oldId, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
