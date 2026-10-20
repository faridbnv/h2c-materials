// b49: the documents the owner's rulings of 2026-10-20 admit (the materials-science track, T5): two held sheets whose
// homes the round decided (Multi3D Electrifi with its safety data sheet; Stratasys Diran 410MF07), Nanovia ISTROFLEX's
// safety data sheet (what its polymer is), and two INEOS Styrolution references for the SBC row of polymers.csv. Each
// document was staged by digest into this round's ledger (ingest:witness --from staged-manifest-b49.csv, which
// hash-checked every file and cached its text). This script writes one proposal per document, every value bound to the
// line of the cached text that prints it, and the packet the migration pins.
//
//   node docs/audits/2026-10-20-owner-rulings/science/ingest/build-b49.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../../../../build/src/csv.js';
import { cachedText } from '../../../../../scripts/lib/pdf-text.mjs';
import { typedOf } from '../../../../../scripts/lib/profile-settings.mjs';

const HERE = 'docs/audits/2026-10-20-owner-rulings/science/ingest';
const OUT = `${HERE}/proposals/b49`;
const MIGRATION = 'scripts/migrate/m475-batch-b49-owner-rulings.mjs';
const BY = 'Claude Opus 5.5 (the owner\'s rulings 2026-10-20, b49), read on the cached text and the page image';
const DATE = '2026-10-20';
const NP = 'Not published', NA = 'Not applicable';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const rows = (p) => readCsv(p).records.map((r) => r.values);
const ledger = rows(`${HERE}/ledger.csv`);
const header = (table) => readCsv(`data/tables/${table}.csv`).header;
const accepted = (note, visual = false) => ({ status: 'accepted', by: BY, date: DATE, ...(visual ? { visual: true } : {}), ...(note ? { note } : {}) });

/** The line of a document's cached text that holds `quote`, and its page; refused where none does. */
function lineOf(doc, quote, page = null) {
  const text = cachedText(doc);
  const squash = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
  for (const p of text.pages) {
    if (page && p.page !== page) continue;
    const hit = (p.lines ?? []).find((l) => squash(l.text).includes(squash(quote)));
    if (hit) return { page: p.page, text: hit.text };
  }
  throw new Error(`${doc.slice(0, 12)}: "${quote}" is on no line${page ? ` of page ${page}` : ''} of the cached text`);
}

const MEAS = header('measurements');
/** A measurement row with every column, the missing states as the schema accepts them. */
function measurement(fields) {
  const base = {
    MaterialID: '', GradeID: '', 'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1',
    'Normalized uncertainty ±': NA, 'Normalized upper bound': NA, 'Data status': 'Published value',
    'Specimen type': 'Not published (do not assume printed)', Direction: NA, 'Moisture condition': NP, 'Moisture state': 'not-stated',
    'Post-processing': NP, 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA,
    'Test temperature': NP, 'Test temperature °C': NP, 'Standard / load': NP, Standards: NP, 'Test load MPa': NA, Notch: NA,
    'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
  };
  const row = { ...base, ...fields };
  for (const k of MEAS) if (k !== 'MeasurementID' && row[k] === undefined) throw new Error(`measurement ${fields.Locator}: no ${k}`);
  return Object.fromEntries(MEAS.filter((k) => k !== 'MeasurementID').map((k) => [k, row[k]]));
}

const PROF = header('profiles');
function profile(fields) {
  const raw = {
    MaterialID: '', GradeID: '', Profile: 'Manufacturer published guidance', 'Nozzle °C': NP, 'Bed °C': NP, 'Chamber °C': NP,
    Enclosure: NP, Plate: NP, Drying: NP, 'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': NP,
    'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval',
    'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade', 'AMS published': NP,
    'Support pairing': NP, 'Failure modes': NP, 'H2C SourceID': 'H2C-WIKI', 'Parse review': NA, ...fields,
  };
  const row = { ...raw, ...typedOf(raw) };
  for (const k of PROF) if (k !== 'ProfileID' && row[k] === undefined) throw new Error(`profile ${fields.Locator}: no ${k}`);
  return Object.fromEntries(PROF.filter((k) => k !== 'ProfileID').map((k) => [k, row[k]]));
}

const GRADE = {
  electrifi: {
    MaterialID: 'M176', Role: 'procurement', Status: 'active', Manufacturer: 'Multi3D', 'Product name': 'Electrifi',
    'Shared formulation key': 'R-MULTI3D-ELECTRIFI-TDS',
    'Composition / filler': '"Highly conductive copper-filled thermoplastic filament" with "a percolated copper network embedded in a thermoplastic matrix" (R-MULTI3D-ELECTRIFI-TDS, p. 1); its safety data sheet lists "biodegradable polyester" and "Conductive Filler" and gives a melting point of "Approximately 60 °C" (R-MULTI3D-ELECTRIFI-SDS, pp. 1, 3). Inferred filing (the owner\'s rulings, 2026-10-20, R227, D176): the one biodegradable polyester that melts near 60 °C is polycaprolactone, and its 140-160 °C nozzle and soft, low-modulus filament are a PCL\'s; the maker names no polymer.',
    Variant: NA, 'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: NP, 'Certification claims': NP,
    'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence (the owner\'s rulings, 2026-10-20, b49)',
    SourceID: 'R-MULTI3D-ELECTRIFI-TDS', 'Source locator': 'TDS / official product page', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
  },
  diran: {
    MaterialID: 'M177', Role: 'procurement', Status: 'active', Manufacturer: 'Stratasys', 'Product name': 'Diran 410MF07',
    'Shared formulation key': 'R-STRATASYS-mds-fdm-diran410mf07-0224a',
    'Composition / filler': '"Diran™ 410MF07 is a nylon-based thermoplastic FDM® material, mineral-filled 7% by weight." (p. 2, as the sheet states it); no Stratasys document names the polyamide or the mineral (the owner\'s rulings, 2026-10-20, R230).',
    Variant: NA, 'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: NP, 'Certification claims': NP,
    'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence (the owner\'s rulings, 2026-10-20, b49)',
    SourceID: 'R-STRATASYS-mds-fdm-diran410mf07-0224a', 'Source locator': 'TDS / official product page', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
  },
};
const gradeEntry = (key, doc, quote) => ({ key, row: GRADE[key], review: accepted(`A held sheet the owner's rulings admit (2026-10-20, D176), filed under ${GRADE[key].MaterialID}.`), evidence: lineOf(doc, quote) });

// ---- The documents -----------------------------------------------------------------------------------------------
const ELECTRIFI_TDS = '2688570615b2eb8271bd31e4cd226408741ffcc89ba5ddc8df4ba705cc34d021';
const ELECTRIFI_SDS = '6904261403724ebe7f6f7fb4888ea0d8c8ffba6a8f7bbdeaa16f397d834053c2';
const DIRAN = '34f028a12c8cfa940d8b95df18918b63ed079346363212618c68cb86d66b3b7c';
const ISTROFLEX_SDS = 'a62b2abe821937080ee1333751a4ce91e802920fa17fd8719f93ee9cb614eb67';
const STYROLUX = 'a0e20a397574c19027ee0e8582d54daf92b111a9cd9bc91b95539d7414de3bda';
const KRESIN = 'e7f210454338ec4b2c3266e66a32739c41fa7958acd8637e2fa4d40bb173f6e3';

const sourceRow = (o) => ({
  SourceID: o.id, Publisher: o.publisher, Title: o.title, Revision: o.revision ?? NP, 'Publication date': o.published ?? NP, 'Access date': o.accessed,
  'Source class': o.cls, 'Source note': o.note ?? NA, 'Citation role': o.role ?? 'cited', URL: o.url, Locator: 'Document / product page',
  'Applicable grades': o.applicable, 'Access state': 'retrieved',
  'Access note': `${o.access} Staged by digest into the owner's rulings' ledger (ingest:witness --from, ${HERE}/staged-manifest-b49.csv) on ${DATE}, admitted in batch b49.`,
  SHA256: o.sha,
});

// Electrifi's data sheet (Multi3D's, as Filament2Print serves it).
const eTds = (q, p) => lineOf(ELECTRIFI_TDS, q, p);
const electrifiTds = {
  sha: ELECTRIFI_TDS, publisher: 'Multi3D',
  source: sourceRow({ id: 'R-MULTI3D-ELECTRIFI-TDS', publisher: 'Multi3D', title: 'Electrifi Conductive Filament – Technical Data Sheet', accessed: '2026-09-17', cls: 'Manufacturer TDS', note: 'Hosted by Filament2Print; the sheet is Multi3D\'s ("Manufacturer: Multi3D, Inc.", p. 1).', url: 'https://filament2print.com/en/index.php?controller=attachment&id_attachment=3925', applicable: '${grade:electrifi}', access: 'Fetched 2026-09-17 by the V2 import (ledger doc 2688570615b2eb82, deferred for its identity), hash-checked.', sha: ELECTRIFI_TDS }),
  identityQuote: 'Highly conductive copper-filled thermoplastic filament',
  grades: [gradeEntry('electrifi', ELECTRIFI_TDS, 'Highly conductive copper-filled thermoplastic filament')],
  measurements: [
    { id: 'm01', row: measurement({ Property: 'Volume resistivity', 'Raw value': '0.001-0.1 Ω·cm', 'Raw unit': 'Ω·cm', 'Raw numeric': '0.001', 'Raw upper bound': '0.1', 'Normalized value': '0.001', 'Normalized upper bound': '0.1', 'Normalized unit': 'Ω·cm', 'Specimen / print parameters': 'Note: Values are typical and depend on print geometry, orientation, and processing conditions.', SourceID: 'R-MULTI3D-ELECTRIFI-TDS', Locator: 'p. 1: Electrical Properties: Volume resistivity' }), evidence: eTds('Volume resistivity 0.001-0.1', 1) },
    { id: 'm02', row: measurement({ Property: 'Density', 'Raw value': '~2.0–4.0 g/cm³ (formulation dependent)', 'Raw unit': 'g/cm3', 'Raw numeric': '2.0', 'Raw upper bound': '4.0', 'Conversion factor': '1000', 'Normalized value': '2000', 'Normalized upper bound': '4000', 'Normalized unit': 'kg/m³', 'Specimen type': 'Not published (density specimen form not explicitly established)', SourceID: 'R-MULTI3D-ELECTRIFI-TDS', Locator: 'p. 2: Physical Properties: Density', Notes: 'The sheet prints the density as approximate ("~") and "formulation dependent".' }), evidence: eTds('Density ~2.0–4.0', 2) },
    { id: 'm03', row: measurement({ Property: 'Continuous service temperature', 'Raw value': '≤ 45 °C (room temperature applications preferred)', 'Raw unit': '°C', 'Raw numeric': '45', Operator: '<=', 'Normalized value': '45', 'Normalized unit': '°C', SourceID: 'R-MULTI3D-ELECTRIFI-TDS', Locator: 'p. 2: Thermal Properties: Continuous use temperature' }), evidence: eTds('Continuous use temperature ≤ 45', 2) },
  ],
  profiles: [{
    gradeKey: 'electrifi',
    row: profile({ 'Nozzle °C': '140–160 °C', 'Bed °C': '≤50 °C', 'Nozzle material': 'Hardened steel or standard brass nozzle (≥0.4 mm)', 'Nozzle diameter': '≥0.4 mm', 'AMS published': 'Not Recommended: AMS / multi-material feed systems with long filament paths', SourceID: 'R-MULTI3D-ELECTRIFI-TDS', Locator: 'p. 2: 4. Printing Guidelines: Typical Print Settings; Recommended Printer Configuration; Not Recommended' }),
    notes: [{ Topic: 'Speed', Text: 'Slow to moderate (e.g., 10–30 mm/s)' }],
    evidence: eTds('Nozzle temperature: 140–160', 2),
    review: accepted('The sheet\'s "Typical Print Settings" (nozzle 140-160 °C, bed ≤50 °C); its thermal table\'s "Recommended nozzle temperature 140–180 °C" is the wider window of the same sheet, kept in the record tier.'),
  }],
  note: 'Multi3D\'s data sheet for Electrifi, a copper-filled conductive filament, admitted under the owner\'s rulings of 2026-10-20 (D176): filed under PCL-EC (M176), an inferred filing (R227).',
};
for (const m of electrifiTds.measurements) Object.assign(m, { gradeKey: 'electrifi', confidence: 1, review: accepted('Read against the page: the value, its unit and its row as the sheet prints them.') });

// Electrifi's safety data sheet: what its polymer is, its melting point and its density.
const eSds = (q, p) => lineOf(ELECTRIFI_SDS, q, p);
const electrifiSds = {
  sha: ELECTRIFI_SDS, publisher: 'Multi3D',
  source: sourceRow({ id: 'R-MULTI3D-ELECTRIFI-SDS', publisher: 'Multi3D', title: 'Electrifi Conductive 3D Printer Filament – Safety Data Sheet', published: '2016-09-27', accessed: '2026-10-19', cls: 'Manufacturer SDS', url: 'https://www.multi3dllc.com/wp-content/uploads/2016/09/Electrifi_MSDS.pdf', applicable: '${grade:electrifi}', access: 'Saved and hashed by the research agent of 2026-10-19 (the V2 import\'s witness of 2026-09-26 is the same bytes) and fetched again, byte for byte, by a Claude Sonnet reader on 2026-10-19.', sha: ELECTRIFI_SDS }),
  grades: [gradeEntry('electrifi', ELECTRIFI_TDS, 'Highly conductive copper-filled thermoplastic filament')],
  measurements: [
    { id: 'm01', row: measurement({ Property: 'Melting temperature', 'Raw value': 'Approximately 60 °C', 'Raw unit': '°C', 'Raw numeric': '60', 'Normalized value': '60', 'Normalized unit': '°C', SourceID: 'R-MULTI3D-ELECTRIFI-SDS', Locator: 'p. 3: Section 9: Melting point/freezing point', Notes: 'The safety data sheet prints it as approximate.' }), evidence: eSds('Melting point/freezing point: Approximately 60', 3) },
    { id: 'm02', row: measurement({ Property: 'Density', 'Raw value': 'Approximatley 2.5 g/cm3', 'Raw unit': 'g/cm3', 'Raw numeric': '2.5', 'Conversion factor': '1000', 'Normalized value': '2500', 'Normalized unit': 'kg/m³', 'Specimen type': 'Not published (density specimen form not explicitly established)', SourceID: 'R-MULTI3D-ELECTRIFI-SDS', Locator: 'p. 3: Section 9: Specific gravity (relative density)', Notes: 'The safety data sheet prints it as approximate ("Approximatley", as printed).' }), evidence: eSds('Specific gravity (relative density): Approximatley 2.5', 3) },
  ],
  profiles: [],
  note: 'Multi3D\'s safety data sheet for Electrifi: "CHEMICAL FAMILY: Polymer-metal composite" and "biodegradable polyester" (p. 1), the identity the owner\'s rulings file it by (R227).',
};
// The grade entry of the SDS finds the grade the data sheet created (one product, two documents).
electrifiSds.grades[0].evidence = eSds('biodegradable polyester', 1);
for (const m of electrifiSds.measurements) Object.assign(m, { gradeKey: 'electrifi', confidence: 1, review: accepted('Read against the page: the value and its row as the safety data sheet prints them, approximate as it says.') });

// Diran 410MF07: its physical table (p. 4) and its mechanical table (p. 6).
const d = (q, p) => lineOf(DIRAN, q, p);
const T2 = 'Table 2. Diran 410MF07 Thermoplastic Filament Physical Properties';
const T3 = 'Table 3. Diran 410MF07 Thermoplastic Filament Mechanical Properties · 0.010 in. (0.254 mm) layer height';
const phys = (property, o) => measurement({ Property: property, 'Specimen type': 'Printed specimen', 'Post-processing': 'As printed', 'Post-processing state': 'as-printed', SourceID: 'R-STRATASYS-mds-fdm-diran410mf07-0224a', ...o });
const mech = (property, o) => measurement({ Property: property, 'Specimen type': 'Printed specimen', SourceID: 'R-STRATASYS-mds-fdm-diran410mf07-0224a', ...o });
const sd = (v, s, unit, factor = '1') => ({ 'Raw numeric': v, 'Raw uncertainty ±': s, 'Raw unit': unit, 'Conversion factor': factor, 'Normalized value': v, 'Normalized uncertainty ±': s, 'Normalized unit': unit });
const DIRAN_ROWS = [
  ['HDT', phys('HDT', { 'Raw value': '90 °C (194 °F)', 'Raw unit': '°C', 'Raw numeric': '90', 'Normalized value': '90', 'Normalized unit': '°C', Direction: 'XY', 'Standard / load': 'HDT @ 66psi ASTM D648 Method B', Standards: 'ASTM D648', 'Test load MPa': '0.45', 'Specimen / print parameters': `${T2} · XY column`, Locator: 'p. 4: HDT @ 66psi, XY' }), d('HDT @ 66psi 90', 4)],
  ['HDT', phys('HDT', { 'Raw value': '90 °C (194 °F)', 'Raw unit': '°C', 'Raw numeric': '90', 'Normalized value': '90', 'Normalized unit': '°C', Direction: 'Stated, not a usable direction', 'Standard / load': 'HDT @ 66psi ASTM D648 Method B', Standards: 'ASTM D648', 'Test load MPa': '0.45', 'Specimen / print parameters': `${T2} · XZ/ZX column`, Locator: 'p. 4: HDT @ 66psi, XZ/ZX' }), d('HDT @ 66psi 90', 4)],
  ['HDT', phys('HDT', { 'Raw value': '70 °C (158 °F)', 'Raw unit': '°C', 'Raw numeric': '70', 'Normalized value': '70', 'Normalized unit': '°C', Direction: 'XY', 'Standard / load': 'HDT @ 264psi ASTM D648 Method B', Standards: 'ASTM D648', 'Test load MPa': '1.8', 'Specimen / print parameters': `${T2} · XY column`, Locator: 'p. 4: HDT @ 264psi, XY' }), d('HDT @ 264psi 70', 4)],
  ['HDT', phys('HDT', { 'Raw value': '70 °C (158 °F)', 'Raw unit': '°C', 'Raw numeric': '70', 'Normalized value': '70', 'Normalized unit': '°C', Direction: 'Stated, not a usable direction', 'Standard / load': 'HDT @ 264psi ASTM D648 Method B', Standards: 'ASTM D648', 'Test load MPa': '1.8', 'Specimen / print parameters': `${T2} · XZ/ZX column`, Locator: 'p. 4: HDT @ 264psi, XZ/ZX' }), d('HDT @ 264psi 70', 4)],
  ['Glass transition temperature', phys('Glass transition temperature', { 'Raw value': '117.34 °C (243.21 °F)', 'Raw unit': '°C', 'Raw numeric': '117.34', 'Normalized value': '117.34', 'Normalized unit': '°C', 'Standard / load': 'ASTM D7426 Inflection Point', Standards: 'ASTM D7426', 'Specimen / print parameters': T2, Locator: 'p. 4: Tg' }), d('Tg 117.34', 4)],
  ['Coefficient of thermal expansion', phys('Coefficient of thermal expansion', { 'Raw value': '56.60 μm/[m·°C]', 'Raw unit': 'µm/m/K', 'Raw numeric': '56.60', 'Normalized value': '56.6', 'Normalized unit': 'µm/m/K', 'Test temperature': '40 °C to 140 °C', 'Standard / load': 'ASTM E831 (40 °C to 140 °C)', Standards: 'ASTM E831', 'Specimen / print parameters': `${T2} · XY column`, Locator: 'p. 4: Mean CTE, XY' }), d('56.60', 4)],
  ['Coefficient of thermal expansion', phys('Coefficient of thermal expansion', { 'Raw value': '112.6 μm/[m·°C]', 'Raw unit': 'µm/m/K', 'Raw numeric': '112.6', 'Normalized value': '112.6', 'Normalized unit': 'µm/m/K', 'Test temperature': '40 °C to 140 °C', 'Standard / load': 'ASTM E831 (40 °C to 140 °C)', Standards: 'ASTM E831', 'Specimen / print parameters': `${T2} · XZ/ZX column`, Locator: 'p. 4: Mean CTE, XZ/ZX' }), d('112.6', 4)],
  ['Density', phys('Density', { 'Raw value': '1.16', 'Raw unit': 'g/cm3', 'Raw numeric': '1.16', 'Conversion factor': '1000', 'Normalized value': '1160', 'Normalized unit': 'kg/m³', 'Test temperature': '23 °C', 'Test temperature °C': '23', 'Standard / load': 'ASTM D792 @ 23 °C', Standards: 'ASTM D792', 'Specimen / print parameters': T2, Locator: 'p. 4: Specific Gravity' }), d('Specific Gravity 1.16', 4)],
  ['Tensile yield strength', mech('Tensile yield strength', { 'Raw value': '44.8 (1.5)', ...sd('44.8', '1.5', 'MPa'), Direction: 'XZ', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Yield Strength MPa (XZ), Table 3' }), d('MPa 44.8 (1.5)', 6)],
  ['Elongation at yield', mech('Elongation at yield', { 'Raw value': '4.3 (0.041)', ...sd('4.3', '0.041', '%'), Direction: 'XZ', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Elongation @ Yield % (XZ), Table 3' }), d('4.3 (0.041)', 6)],
  ['Tensile break strength', mech('Tensile break strength', { 'Raw value': '40.4 (3.0)', ...sd('40.4', '3.0', 'MPa'), Direction: 'XZ', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Strength @ Break MPa (XZ), Table 3' }), d('MPa 40.4 (3.0)', 6)],
  ['Tensile break strength', mech('Tensile break strength', { 'Raw value': '30.7 (2.0)', ...sd('30.7', '2.0', 'MPa'), Direction: 'Z', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Strength @ Break MPa (ZX), Table 3' }), d('30.7 (2.0)', 6)],
  ['Elongation at break', mech('Elongation at break', { 'Raw value': '12 (3.2)', ...sd('12', '3.2', '%'), Direction: 'XZ', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Elongation @ Break % (XZ), Table 3' }), d('12 (3.2)', 6)],
  ['Elongation at break', mech('Elongation at break', { 'Raw value': '3.1 (1.0)', ...sd('3.1', '1.0', '%'), Direction: 'Z', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Elongation @ Break % (ZX), Table 3' }), d('3.1 (1.0)', 6)],
  ['Tensile modulus', mech('Tensile modulus', { 'Raw value': '1.69 (0.017)', ...sd('1.69', '0.017', 'GPa'), Direction: 'XZ', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Modulus (Elastic) GPa (XZ), Table 3' }), d('1.69 (0.017)', 6)],
  ['Tensile modulus', mech('Tensile modulus', { 'Raw value': '1.46 (0.021)', ...sd('1.46', '0.021', 'GPa'), Direction: 'Z', 'Standard / load': 'ASTM D638', Standards: 'ASTM D638', 'Specimen / print parameters': T3, Locator: 'p. 6: Tensile Properties: Modulus (Elastic) GPa (ZX), Table 3' }), d('1.46 (0.021)', 6)],
  ['Flexural strength', mech('Flexural strength', { 'Raw value': '46.7 (2.3)', ...sd('46.7', '2.3', 'MPa'), Direction: 'ZX', 'Standard / load': 'ASTM D790, Procedure A', Standards: 'ASTM D790', 'Specimen / print parameters': T3, Locator: 'p. 6: Flexural Properties: Strength @ Break MPa (ZX), Table 3' }), d('No break 46.7 (2.3)', 6)],
  ['Flexural stress at conventional deflection', mech('Flexural stress at conventional deflection', { 'Raw value': '59.9 (1.6)', ...sd('59.9', '1.6', 'MPa'), Direction: 'XZ', 'Standard / load': 'ASTM D790, Procedure A (Strength @ 5% Strain)', Standards: 'ASTM D790', 'Specimen / print parameters': `${T3}; the XZ bar does not break ("No break")`, Locator: 'p. 6: Flexural Properties: Strength @ 5% Strain MPa (XZ), Table 3' }), d('MPa 59.9 (1.6)', 6)],
  ['Flexural elongation at break', mech('Flexural elongation at break', { 'Raw value': '3.1 (0.53)', ...sd('3.1', '0.53', '%'), Direction: 'ZX', 'Standard / load': 'ASTM D790, Procedure A', Standards: 'ASTM D790', 'Specimen / print parameters': T3, Locator: 'p. 6: Flexural Properties: Strain @ Break % (ZX), Table 3' }), d('No break 3.1 (0.53)', 6)],
  ['Flexural modulus', mech('Flexural modulus', { 'Raw value': '1.85 (0.043)', ...sd('1.85', '0.043', 'GPa'), Direction: 'XZ', 'Standard / load': 'ASTM D790, Procedure A', Standards: 'ASTM D790', 'Specimen / print parameters': T3, Locator: 'p. 6: Flexural Properties: Modulus GPa (XZ), Table 3' }), d('GPa 1.85 (0.043)', 6)],
  ['Flexural modulus', mech('Flexural modulus', { 'Raw value': '1.47 (0.065)', ...sd('1.47', '0.065', 'GPa'), Direction: 'ZX', 'Standard / load': 'ASTM D790, Procedure A', Standards: 'ASTM D790', 'Specimen / print parameters': T3, Locator: 'p. 6: Flexural Properties: Modulus GPa (ZX), Table 3' }), d('1.47 (0.065)', 6)],
  ['Compression strength', mech('Compression strength', { 'Raw value': '75.8 (4.3)', ...sd('75.8', '4.3', 'MPa'), Direction: 'XZ', 'Standard / load': 'ASTM D695 (Yield Strength)', Standards: 'ASTM D695', 'Specimen / print parameters': T3, Locator: 'p. 6: Compression Properties: Yield Strength MPa (XZ), Table 3' }), d('MPa 75.8 (4.3)', 6)],
  ['Compression strength', mech('Compression strength', { 'Raw value': '163 (30)', ...sd('163', '30', 'MPa'), Direction: 'ZX', 'Standard / load': 'ASTM D695 (Yield Strength)', Standards: 'ASTM D695', 'Specimen / print parameters': T3, Locator: 'p. 6: Compression Properties: Yield Strength MPa (ZX), Table 3' }), d('163 (30)', 6)],
  ['Izod impact strength', mech('Izod impact strength', { 'Raw value': '442 (76)', ...sd('442', '76', 'J/m'), Direction: 'XZ', Notch: 'Notched', 'Standard / load': 'ASTM D256, ASTM D4812', Standards: 'ASTM D256; ASTM D4812', 'Specimen / print parameters': T3, Locator: 'p. 6: Impact Properties: Izod, Notched J/m (XZ), Table 3' }), d('442 (76)', 6)],
  ['Izod impact strength', mech('Izod impact strength', { 'Raw value': '26.8 (5.3)', ...sd('26.8', '5.3', 'J/m'), Direction: 'ZX', Notch: 'Notched', 'Standard / load': 'ASTM D256, ASTM D4812', Standards: 'ASTM D256; ASTM D4812', 'Specimen / print parameters': T3, Locator: 'p. 6: Impact Properties: Izod, Notched J/m (ZX), Table 3' }), d('442 (76) 26.8 (5.3)', 6)],
  ['Izod impact strength', mech('Izod impact strength', { 'Raw value': '1420 (200)', ...sd('1420', '200', 'J/m'), Direction: 'XZ', Notch: 'Unnotched', 'Standard / load': 'ASTM D256, ASTM D4812', Standards: 'ASTM D256; ASTM D4812', 'Specimen / print parameters': T3, Locator: 'p. 6: Impact Properties: Izod, Unnotched J/m (XZ), Table 3' }), d('1420 (200)', 6)],
  ['Izod impact strength', mech('Izod impact strength', { 'Raw value': '142 (25)', ...sd('142', '25', 'J/m'), Direction: 'ZX', Notch: 'Unnotched', 'Standard / load': 'ASTM D256, ASTM D4812', Standards: 'ASTM D256; ASTM D4812', 'Specimen / print parameters': T3, Locator: 'p. 6: Impact Properties: Izod, Unnotched J/m (ZX), Table 3' }), d('1420 (200) 142 (25)', 6)],
];
const diran = {
  sha: DIRAN, publisher: 'Stratasys',
  source: sourceRow({ id: 'R-STRATASYS-mds-fdm-diran410mf07-0224a', publisher: 'Stratasys', title: 'Diran 410MF07 Data Sheet', revision: 'MDS_FDM_Diran410MF07_0224a', accessed: '2026-09-17', cls: 'Manufacturer TDS', url: 'https://www.stratasys.com/contentassets/6729604c61704654ac5c0392276a2d57/mds_fdm_diran410mf07_0224a-1.pdf?v=4aa22c', applicable: '${grade:diran}', access: 'Fetched 2026-09-17 by the V2 import (deferred for its identity: "for the owner: the Nylon home with a declared filler, or a filled home"), hash-checked.', sha: DIRAN }),
  grades: [gradeEntry('diran', DIRAN, 'nylon-based thermoplastic FDM')],
  measurements: DIRAN_ROWS.map(([property, row, evidence, visual], i) => ({ id: `m${String(i + 1).padStart(2, '0')}`, gradeKey: 'diran', row: { ...row, Property: property }, evidence, confidence: 1, review: accepted(visual ? 'Read on the page image (p. 4): "1.50*10^15 Ω·cm" in both columns; the text layer prints the exponent as "10^15", which binds no whole number.' : 'Read against the page and its image: the value, its standard deviation in parentheses, its orientation column and its table as the sheet prints them.', visual) })),
  profiles: [],
  note: 'Stratasys\'s data sheet for Diran 410MF07, "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight" (p. 2), admitted under the owner\'s rulings of 2026-10-20 (D176) into Nylon-CE, maker-undisclosed polyamide (M177, R229, R230). Left in the record tier: the volume resistivity, dielectric constants and dissipation factors (p. 4), the compression moduli and every psi or ksi twin (p. 6), and the UV-aging table (p. 7).',
};

// Nanovia ISTROFLEX's safety data sheet: what its polymer is.
const iSds = (q, p) => lineOf(ISTROFLEX_SDS, q, p);
const istroflex = {
  sha: ISTROFLEX_SDS, publisher: 'Nanovia',
  source: sourceRow({ id: 'R-NANOVIA-ISTROFLEX-SDS', publisher: 'Nanovia', title: 'Nanovia ISTROFLEX – Material Safety Data Sheet', revision: 'Updated: February 2023', accessed: '2026-10-19', cls: 'Manufacturer SDS', url: 'https://nanovia.tech/media/ref/istroflex/nanovia-istroflex-msds.pdf', applicable: 'G167-12', access: 'Fetched from the maker\'s site and hashed by a Claude Sonnet reader on 2026-10-19.', sha: ISTROFLEX_SDS }),
  grades: [],
  measurements: [
    { id: 'm01', row: measurement({ MaterialID: 'M167', GradeID: 'G167-12', Property: 'Glass transition temperature', 'Raw value': '-32 °C', 'Raw unit': '°C', 'Raw numeric': '-32', 'Normalized value': '-32', 'Normalized unit': '°C', SourceID: 'R-NANOVIA-ISTROFLEX-SDS', Locator: 'p. 2: Section 9.1: Tg' }), evidence: iSds('Tg -32', 2) },
    { id: 'm02', row: measurement({ MaterialID: 'M167', GradeID: 'G167-12', Property: 'Density', 'Raw value': '1,34 g/cm3', 'Raw unit': 'g/cm3', 'Raw numeric': '1.34', 'Conversion factor': '1000', 'Normalized value': '1340', 'Normalized unit': 'kg/m³', 'Specimen type': 'Not published (density specimen form not explicitly established)', SourceID: 'R-NANOVIA-ISTROFLEX-SDS', Locator: 'p. 2: Section 9.1: Density', Notes: 'The product page prints 1.55 g/cm3 (V011321); the two Nanovia documents disagree.' }), evidence: iSds('Density 1,34', 2) },
  ],
  profiles: [],
  note: 'Nanovia\'s safety data sheet for ISTROFLEX: "Modified Polyester alloy and oyster shell powder" (p. 1) and a glass transition of -32 °C (p. 2), the evidence the owner\'s rulings file it by (R232).',
};
for (const m of istroflex.measurements) Object.assign(m, { confidence: 1, review: accepted('Read against the page: the value and its row as the safety data sheet prints them.') });

// INEOS Styrolution's references for the SBC row of polymers.csv: no product of the catalogue, no values recorded.
const styrolux = {
  sha: STYROLUX, publisher: 'INEOS Styrolution', polymer: 'SBC',
  source: sourceRow({ id: 'R-INEOS-STYROLUX-656C-TDS', publisher: 'INEOS Styrolution', title: 'Styrolux 656C Styrene Butadiene Copolymer (SBC)', accessed: '2026-10-19', cls: 'Resin supplier data sheet', note: 'INEOS Styrolution\'s own data sheet, as the distributor plastore.it serves it.', url: 'https://plastore.it/cgi2018/file818/264_sbc%20styrolux%20656c.pdf', applicable: 'Polymer reference of SBC (polymers.csv): Styrolux 656C', access: 'Saved and hashed by the research agent of 2026-10-19.', sha: STYROLUX }),
  grades: [], measurements: [], profiles: [],
  note: 'A reference for the polymer SBC of polymers.csv (the migration cites it): "Styrolux® 656C is a clear styrene-butadiene copolymer (SBC)", "Tough and stiff grade", a tensile modulus of 1800 MPa, Shore D 72 and a density of 1020 kg/m³ (ISO 1183).',
  evidenceQuote: 'is a clear styrene-butadiene copolymer (SBC)',
};
const kresin = {
  sha: KRESIN, publisher: 'INEOS Styrolution', polymer: 'SBC',
  source: sourceRow({ role: 'corroboration', id: 'R-INEOS-KRESIN-KR03-PAGE', publisher: 'INEOS Styrolution', title: 'K-Resin KR03 (INEOS Styrolution product page)', accessed: '2026-10-19', cls: 'Resin supplier data sheet', note: 'INEOS Styrolution\'s own product page, as the Wayback Machine captured it on 2021-11-04; the live page no longer serves it.', url: 'https://web.archive.org/web/20211104060444/https://www.ineos-styrolution.com/Product/K-Resin_K-Resin-KR03_SKU400900481370.html', applicable: 'Polymer reference of SBC (polymers.csv): K-Resin KR03', access: 'Saved and hashed by a Claude Sonnet reader on 2026-10-19 from the Wayback Machine\'s capture of the maker\'s page.', sha: KRESIN }),
  grades: [], measurements: [], profiles: [],
  note: 'A reference for the polymer SBC of polymers.csv (the migration cites it): K-Resin KR03, an SBC of "Excellent Clarity" and "Good Stiffness", Shore D 63 and a density of 1.01 g/cm³ (ASTM D 792), the figures FormFutura\'s Crystal Flex prints.',
  evidenceQuote: 'Density (ASTM )  ASTM D 792  g/cm³  1.01',
};

// ---- Proposals and packet --------------------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [];
for (const doc of [electrifiTds, electrifiSds, diran, istroflex, styrolux, kresin]) {
  const text = cachedText(doc.sha);
  if (!text) throw new Error(`${doc.sha.slice(0, 12)}: no cached text; stage it first (ingest:witness --from)`);
  const witness = ledger.find((r) => r.sha256 === doc.sha);
  if (!witness) throw new Error(`${doc.sha.slice(0, 12)}: not in the round's ledger`);
  const evidence = doc.grades[0]?.evidence ?? lineOf(doc.sha, doc.evidenceQuote ?? doc.identityQuote ?? doc.source.row?.Title ?? '');
  const proposal = {
    version: 1, generated: { tool: 'build-b49.mjs (the owner\'s rulings 2026-10-20)', date: DATE },
    document: { sha256: doc.sha, url: doc.source.URL, pages: text.pages.length, provider: doc.publisher, manufacturer: doc.publisher, docKey: witness.doc_key },
    identity: { polymer: doc.polymer ?? null, materialId: doc.grades[0]?.row.MaterialID ?? null, note: doc.polymer ? `A reference for the polymer ${doc.polymer} of polymers.csv (the migration cites it), not a product of the catalogue.` : doc.note },
    source: { row: doc.source, evidence, review: { status: 'accepted', by: BY, date: DATE } },
    grades: doc.grades, measurements: doc.measurements, profiles: doc.profiles, evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
    skipped: [{ note: 'What the document prints and no row here holds stays in the record tier (its cached text, dist/h2c.sqlite source_facts).' }],
    review: { status: 'reviewed', by: BY, date: DATE, note: doc.note },
  };
  const name = `${doc.sha.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  packetDocs.push({ File: name, ProposalSHA256: sha(body), OriginalSHA256: doc.sha, Source: doc.source, Grades: doc.grades.map((g) => ({ Key: g.key, MaterialID: g.row.MaterialID, Manufacturer: g.row.Manufacturer, 'Product name': g.row['Product name'] })), Polymer: doc.polymer ?? null, Values: doc.measurements.length, Profiles: doc.profiles.length });
}
const packet = {
  PacketID: 'b49-owner-rulings', Batch: 'b49', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, NewGrades: 2, Values: packetDocs.reduce((n, d) => n + d.Values, 0), Profiles: packetDocs.reduce((n, d) => n + d.Profiles, 0) },
  NewMaterials: [{ MaterialID: 'M176', 'Original name': 'PCL-EC', Ruling: 'R228' }, { MaterialID: 'M177', 'Original name': 'Nylon-CE, maker-undisclosed polyamide', Ruling: 'R229' }],
  NewVocabulary: [{ Vocabulary: 'manufacturers', Value: 'Multi3D', Meaning: 'US maker of Electrifi, a copper-filled conductive filament; its sheet says "Manufacturer: Multi3D, Inc.".', Aliases: 'Multi3D, Inc.;Multi3D LLC;multi3d' }],
  Review: { prepared_by: BY, scope: 'the owner\'s rulings of 2026-10-20 (the materials-science track): the held sheets whose homes it decided, the safety data sheet that names ISTROFLEX\'s polymer class, and the references for the SBC row of polymers.csv' },
  NotAdmitted: [
    { Document: 'FKuR Fibrolon V 135002 (trial grade), ledger doc af2a1612aba91481', Why: 'a compounder\'s sheet for a PLA/wood compound "suitable for the production of 3D printing filaments", measured on injection-moulded ISO 3167 bars; colorFabb\'s woodFill sheets print its figures, but the catalogue holds no colorFabb woodFill, and a resin sheet is registered only to a product it records (R194, R236)' },
    { Document: 'Nuterials JECTO, ledger doc 4a90a1e5e22db834', Why: 'sold as pellets; Nuterials\' walnut filament (FILA) is "currently under development and undergoing testing" (R237)' },
    { Document: 'Stratasys ST-130, ledger doc of its URL', Why: 'a sacrificial tooling material no Stratasys document names a polymer or family for, sold in canisters for Fortus 450mc and 900mc (R238)' },
  ],
};
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b49-packet.json`, packetBody);
console.log(`${packetDocs.length} proposals, ${packet.Totals.Values} values, ${packet.Totals.Profiles} profile(s); packet sha ${sha(packetBody).slice(0, 12)}`);
if (existsSync(MIGRATION)) writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
else console.log(`(no ${MIGRATION} yet: pin ${sha(packetBody)} by hand)`);
