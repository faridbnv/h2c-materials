#!/usr/bin/env node
// Migration m38: the second-formulation evidence the screening back-test is short of.
//
// Two evidence classes cannot screen because the back-test has too few honest cases. At maxWrongRate 0.1 and
// confidence 0.9 a screening limit needs 22 (build/src/estimate/screening.js minimumCases); before this migration
// build/snapshot/screening.csv held hdt045 this-material at 18 and tensileStrengthXY this-material at 12. A case
// there needs a second formulation of a material whose headline is already measured (D48, D59), publishing a
// related kind: any tensile endpoint or a flexural strength for strength, and an HDT at any load, a Vicat, a Tg on
// an amorphous matrix or a Tm on a filled semicrystalline one for heat deflection.
//
// The 2026-09-15 workstream fetched and read seven data sheets that supply them and imported none
// (docs/audits/2026-09-15-filtering-estimates-data/sources/open-items.md, section 3). This is that import. Every
// file was supplied by the owner on 2026-09-17, cached in .cache/sources, and its SHA-256 matched the prefix that
// workstream recorded, so these are the same documents it read:
//
//   3471ec2c PolyLite ABS V5.3   f51a4df9 PolyLite ASA V5.3   89097c63 PolyLite PC V5.3   2a0902b5 PolyMax PC-FR V5.1
//   640a5ed4 Fiberon PET-CF17    39068040 Fiberon PETG-rCF08  29bce0ad Ultrafuse PAHT CF15
//
// Each value below was then read from the cached file page by page, not taken from that workstream's reading (D35).
// Re-reading found three things it had not recorded:
//
// 1. The BASF sheet is Version No. 4.0, dated 09.05.2023, although BASF serves it at a URL ending v3.5-1. The
//    Revision is what the publisher printed (D63), and the SourceID follows the document, not the file name.
// 2. That sheet answers the open question about its specimens: p. 2 has a "Used for test specimens" column
//    (DDdrop printer, 285 °C nozzle, 110 °C bed, >= 0.6 mm nozzle, 45 mm/s), so its bars are printed, and it
//    publishes a dry and a conditioned state of every mechanical and deflection value. Each row says which.
// 3. Fiberon PET-CF17 states "All specimens were annealed at 120 °C for 10 h": every value on that sheet is an
//    annealed state, so the wording, its declared state and the typed schedule go on every row of it.
//
// Deliberately not here:
//   - Polymaker PolyMax PC V5.3. An alternative second PC grade rather than a second one beside PolyLite PC, and
//     its 14.8 C gap between the two loads would be a miss against the amorphous bracket. Owner's call, open.
//   - Stratasys FDM Nylon-CF10. Its base is "a blended nylon"; whether it is M053 PA12-CF or M050 PA6-CF is an
//     identity ruling (D57) and must be made before it can be filed.
//   - Flashforge PET-GF (M068, G068-01). A web page, not a document this can hash; it is read in a browser.
//   - iSANMATE PLA Glass Fiber. M019 is already a strength case and the sheet has no thermal row, so it adds no
//     case; its value is the composition conflict C00003, which is the safety-data-sheet sweep's job.
//   - Properties no registry row covers: decomposition temperature, Poisson number, surface and volume
//     resistivity, light transmission, heat shrinkage. They stay untranscribed and audit:sources will list them.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm38';
const DATE = '2026-09-17';
const NA = 'Not applicable';
const NP = 'Not published';
const ADDED = `Added ${DATE} (${MIGRATION}): re-read from the source document (SHA-256 recorded in sources.csv).`;

const PRINTED = 'Printed specimen';
const UNSTATED = 'Not published (do not assume printed)';
const DENSITY_FORM = 'Not published (density specimen form not explicitly established)';
const FILAMENT = 'Filament';
const THERMAL = { Direction: NA };

// Post-processing wordings this migration introduces, with the state each declares (D53). They go into
// schema/vocab/post-processing.csv in this same commit, or the build stops.
export const POST_PROCESSING_WORDINGS = [
  // Room temperature is not an anneal: the sheet states the only treatment its specimens had, and it was not one.
  ['All specimens were conditioned at room temperature for 24 h prior to testing', 'as-printed'],
  ['All specimens were annealed at 120 °C for 10 h', 'annealed'],
];
// Likewise for schema/vocab/moisture-conditions.csv.
export const MOISTURE_WORDINGS = [
  ['Conditioned: standard climate (23 °C, 50% RH, 72 h)', 'conditioned'],
];

const POLYMAKER_REST = 'All specimens were conditioned at room temperature for 24 h prior to testing';
const FIBERON_ANNEAL = 'All specimens were annealed at 120 °C for 10 h';
const BASF_CONDITIONED = 'Conditioned: standard climate (23 °C, 50% RH, 72 h)';

// ------------------------------------------------------------------------------------ sources
const SOURCES = [
  { SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite ABS Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ABS_TDS_V5.3.pdf',
    Locator: 'p. 2: physical properties and chemical resistance; p. 3: thermal properties; p. 4: mechanical properties (X-Y and Z) and the printing guide; p. 5: how to make specimens',
    'Applicable grades': 'G027-02 (Polymaker PolyLite ABS, the second ABS formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: '3471ec2cb7244564bd7e64ccee2e49633f5a416958f0e8307be4a1607232dfac' },
  { SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite ASA Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ASA_TDS_V5.3.pdf',
    Locator: 'p. 2: physical properties and chemical resistance; p. 3: thermal properties; p. 4: mechanical properties (X-Y and Z) and the printing guide; p. 5: how to make specimens',
    'Applicable grades': 'G031-02 (Polymaker PolyLite ASA, the second ASA formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: 'f51a4df921be2a531fe4870fcc9ef2c88c498522fecbde9490eca488635054a5' },
  { SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite PC Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_PC_TDS_V5.3.pdf',
    Locator: 'p. 2: physical properties and chemical resistance; p. 3: thermal properties; p. 4: mechanical properties (X-Y and Z), the printing guide and the annealing recommendation; p. 5: how to make specimens',
    'Applicable grades': 'G035-02 (Polymaker PolyLite PC, the second PC formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: '89097c63d3da49edfcfff88f0c5c1a0e24684997a55d539fe52bd45742e4404d' },
  { SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', Publisher: 'Polymaker', Title: 'PolyMax PC-FR Technical Data Sheet',
    Revision: 'V5.1', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_FR_TDS_V5.1.pdf',
    Locator: 'p. 2: physical properties, UL94 rating and chemical resistance; p. 3: thermal properties; p. 4: mechanical properties (X-Y and Z), the low-temperature impact row, the printing guide and the annealing recommendation; p. 6: how to make specimens',
    'Applicable grades': 'G036-02 (Polymaker PolyMax PC-FR, the second PC FR formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: '2a0902b570748c80a189a0b25007ebdde1d1b62f04e846fbf54e84d96c7ce114' },
  { SourceID: 'R-FIBERON-PETCF17-TDS', Publisher: 'Polymaker (Fiberon)', Title: 'Fiberon PET-CF17 Technical Data Sheet',
    Revision: 'V1.0', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PET-CF17_V1.0_EN.pdf',
    Locator: 'p. 1 (single page): physical, thermal and mechanical properties, the moisture-absorption and HDT curves, the shrinkage test, the recommended printing conditions, the annealing note and how to make specimens',
    'Applicable grades': 'G067-02 (Fiberon PET-CF17, the second PET-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: '640a5ed487a8475805af3ecf387e942805182e263fdef5ebe0e5587a3e60a254' },
  { SourceID: 'R-FIBERON-PETGRCF08-TDS', Publisher: 'Polymaker (Fiberon)', Title: 'Fiberon PETG-rCF08 Technical Data Sheet',
    Revision: 'V1.0', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PETG-rCF08_V1.0_EN.pdf',
    Locator: 'p. 1 (single page): physical, thermal and mechanical properties, the moisture-absorption and HDT curves, the recommended printing conditions, the nozzle-wear and moisture notes and how to make specimens',
    'Applicable grades': 'G024-02 (Fiberon PETG-rCF08, the second PETG-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading', SHA256: '390680407162c21163e2a8d3ef1088ef2bfe86cf035a0b7041b8a7f45a94ce3e' },
  // The document prints "Version No.: 4.0" and "Date / Revised: 09.05.2023"; BASF serves it at a URL ending
  // v3.5-1. The Revision and the SourceID follow the document (D63); the URL is recorded as it is served.
  { SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v4-0', Publisher: 'BASF Forward AM', Title: 'Technical Data Sheet for Ultrafuse PAHT CF15',
    Revision: 'Version No.: 4.0', 'Publication date': '2023-05-09', 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://forward-am.com/wp-content/uploads/2024/10/Ultrafuse_PAHT_CF15_TDS_EN_v3.5-1.pdf',
    Locator: 'p. 1: components, product description, storage and product safety; p. 2: filament and spool properties, the recommended and the as-tested print parameters, drying and support compatibility; p. 3: general and thermal properties, dry and conditioned; p. 4: mechanical and electrical properties, dried specimens, XY / XZ / ZX; p. 5: the same for conditioned specimens',
    'Applicable grades': 'G048-02 (BASF Ultrafuse PAHT CF15, the second PAHT-CF formulation)',
    'Access status': 'Retrieved; owner-supplied copy hash-matched to the 2026-09-15 reading. The file is served at a v3.5-1 URL and prints Version No. 4.0', SHA256: '29bce0add561a20979c9d5bcefc7a4811e4ff827768fc679977c93b388cac34f' },
];

// ------------------------------------------------------------------------------------ grades
const GRADE_DEFAULTS = {
  Role: 'procurement', Status: 'active', Variant: NA, 'Certification claims': NP,
  'Colour caveat': 'Properties may vary by colour; use TDS scope',
  'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
};
const rationale = (material, adds) => `Second ${material} manufacturer, added ${DATE} (${MIGRATION}): it publishes ${adds}, which gives the screening back-test a second-formulation case for this material (D48, D59).`;

const GRADES = [
  { key: 'polylite-abs', MaterialID: 'M027', Manufacturer: 'Polymaker', 'Product name': 'PolyLite ABS',
    'Shared formulation key': 'S-POLYCN-PolyLite-ABS-TDS-V5-3',
    'Composition / filler': 'Bulk-polymerized ABS resin with a lower volatile content than traditional ABS resins (TDS p. 2); no filler disclosed',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3',
    'Source locator': 'V5.3, pp. 2-5', 'Selected-grade rationale': rationale('ABS', 'heat deflection at both loads and a printed X-Y bending strength') },
  { key: 'polylite-asa', MaterialID: 'M031', Manufacturer: 'Polymaker', 'Product name': 'PolyLite ASA',
    'Shared formulation key': 'S-POLYCN-PolyLite-ASA-TDS-V5-3',
    'Composition / filler': 'ASA, described as an alternative to ABS with improved weather and UV resistance (TDS p. 2); no filler disclosed',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3',
    'Source locator': 'V5.3, pp. 2-5', 'Selected-grade rationale': rationale('ASA', 'heat deflection at both loads and a printed X-Y bending strength') },
  { key: 'polylite-pc', MaterialID: 'M035', Manufacturer: 'Polymaker', 'Product name': 'PolyLite PC',
    'Shared formulation key': 'S-POLYCN-PolyLite-PC-TDS-V5-3',
    'Composition / filler': 'Polycarbonate resin engineered for 3D printing, with light-diffusing properties (TDS p. 2); no filler disclosed',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3',
    'Source locator': 'V5.3, pp. 2-5', 'Selected-grade rationale': rationale('PC', 'heat deflection at both loads and a printed X-Y bending strength') },
  { key: 'polymax-pc-fr', MaterialID: 'M036', Manufacturer: 'Polymaker', 'Product name': 'PolyMax PC-FR',
    'Shared formulation key': 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1',
    'Composition / filler': "Flame-retardant polycarbonate from Covestro's Makrolon family (TDS p. 2); the retardant is not disclosed",
    'Certification claims': 'UL94 V0 (TDS p. 2, Flame retardancy); verify colour, thickness and certificate. Not printed-part certification',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1',
    'Source locator': 'V5.1, pp. 2-6', 'Selected-grade rationale': rationale('PC FR', 'heat deflection at both loads and a printed X-Y bending strength') },
  { key: 'fiberon-pet-cf17', MaterialID: 'M067', Manufacturer: 'Polymaker (Fiberon)', 'Product name': 'Fiberon PET-CF17',
    'Shared formulation key': 'R-FIBERON-PETCF17-TDS',
    'Composition / filler': 'Carbon-fibre reinforced PET; the product designation states 17 % carbon fibre (TDS p. 1)',
    'Certification claims': 'UL 94 HB at 1.5 mm (TDS p. 1, Flame retardancy); verify colour, thickness and certificate. Not printed-part certification',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FIBERON-PETCF17-TDS',
    'Source locator': 'V1.0, p. 1', 'Selected-grade rationale': rationale('PET-CF', 'heat deflection at both loads, a melting point and a printed X-Y tensile strength, all on specimens annealed at 120 °C for 10 h') },
  // Recycled carbon fibre. schema/vocab/grade-variants.csv has no value for it, and inventing one would give the
  // estimate model a covariate nothing has back-tested, so it is said here and Variant stays not applicable.
  { key: 'fiberon-petg-rcf08', MaterialID: 'M024', Manufacturer: 'Polymaker (Fiberon)', 'Product name': 'Fiberon PETG-rCF08',
    'Shared formulation key': 'R-FIBERON-PETGRCF08-TDS',
    'Composition / filler': 'Recycled carbon-fibre reinforced PETG; the product designation states 8 % recycled carbon fibre (TDS p. 1). Recycled fibre is not a declared variant class in this database',
    'Certification claims': 'UL 94 HB at 1.5 mm (TDS p. 1, Flame retardancy); verify colour, thickness and certificate. Not printed-part certification',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FIBERON-PETGRCF08-TDS',
    'Source locator': 'V1.0, p. 1', 'Selected-grade rationale': rationale('PETG-CF', 'heat deflection at both loads, a glass transition and a printed X-Y tensile strength') },
  { key: 'ultrafuse-paht-cf15', MaterialID: 'M048', Manufacturer: 'BASF Forward AM', 'Product name': 'Ultrafuse PAHT CF15',
    'Shared formulation key': 'R-FORWARDAM-PAHT-CF15-TDS-v4-0',
    'Composition / filler': 'High-temperature polyamide filled with 15 % carbon fibres (TDS p. 1, Components)',
    'Certification claims': 'ESD-safe claimed at a surface resistivity of 1e5 to 1e11 ohm (TDS p. 1); no printed-part certification stated',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v4-0',
    'Source locator': 'Version No. 4.0, pp. 1-5', 'Diameter compatibility': '1.75 mm and 2.85 mm (TDS p. 2); select 1.75 mm',
    'Selected-grade rationale': rationale('PAHT-CF', 'heat deflection at both loads in a dry and a conditioned state, and printed XY and ZX tensile and flexural strengths') },
];

const EXPECTED_GRADE_IDS = {
  'polylite-abs': 'G027-02', 'polylite-asa': 'G031-02', 'polylite-pc': 'G035-02', 'polymax-pc-fr': 'G036-02',
  'fiberon-pet-cf17': 'G067-02', 'fiberon-petg-rcf08': 'G024-02', 'ultrafuse-paht-cf15': 'G048-02',
};

// ------------------------------------------------------------------------------------ measurement builders
const M_DEFAULTS = {
  'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1',
  'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
  'Data status': 'Published value', 'Specimen type': UNSTATED,
  Direction: NP, 'Moisture condition': NP, 'Post-processing': NP, 'Anneal °C': NA, 'Anneal h': NA,
  'Test temperature': NP, 'Test load MPa': NA, Notch: NA,
  'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
};

const UNIT = {
  MPa: ['MPa', 1], MPaGPa: ['GPa', 0.001], pct: ['%', 1], C: ['°C', 1],
  gcc: ['kg/m³', 1000], kgm3: ['kg/m³', 1], kJm2: ['kJ/m²', 1], g10: ['g/10 min', 1],
  cm310: ['cm³/10 min', 1], Shore: ['Shore (scale not specified by source)', 1],
};
const round = (x) => Number(x.toPrecision(10));

/** A published number: the sheet's own text, its unit as printed, and the conversion the build reconciles. */
function num(property, raw, rawUnit, unitKey, standard, locator, over = {}) {
  const [unit, factor] = UNIT[unitKey];
  const m = /^(-?[\d.]+)(?:\s*±\s*([\d.]+))?/.exec(String(raw).replace(/^[<>]\s*/, ''));
  if (!m) throw new Error(`${MIGRATION}: cannot read a number from ${JSON.stringify(raw)}`);
  const value = Number(m[1]);
  const unc = m[2] == null ? null : Number(m[2]);
  return {
    ...M_DEFAULTS, Property: property,
    'Raw value': String(raw), 'Raw unit': rawUnit, 'Raw numeric': String(value),
    'Raw uncertainty ±': unc == null ? NA : String(unc),
    'Conversion factor': String(factor), 'Normalized value': String(round(value * factor)),
    'Normalized uncertainty ±': unc == null ? NA : String(round(unc * factor)),
    'Normalized unit': unit, 'Standard / load': standard, Locator: locator, ...over,
  };
}

/** A published range ("9 - 14 g/10min"): the low end is the value, the high end sits beside it. */
function range(property, raw, rawUnit, unitKey, lo, hi, standard, locator, over = {}) {
  const [unit, factor] = UNIT[unitKey];
  return {
    ...M_DEFAULTS, Property: property,
    'Raw value': String(raw), 'Raw unit': rawUnit, 'Raw numeric': String(lo), 'Raw upper bound': String(hi),
    'Conversion factor': String(factor), 'Normalized value': String(round(lo * factor)),
    'Normalized upper bound': String(round(hi * factor)),
    'Normalized unit': unit, 'Standard / load': standard, Locator: locator, ...over,
  };
}

/** A qualitative result ("No break"): no number, so no conversion is asserted and nothing is normalized. */
function qual(property, raw, unitKey, standard, locator, over = {}) {
  const [unit] = UNIT[unitKey];
  return {
    ...M_DEFAULTS, Property: property, 'Data status': 'Published qualitative result',
    'Raw value': String(raw), 'Raw unit': unit, 'Raw numeric': NP, Operator: NA,
    'Normalized value': NP, 'Normalized unit': unit,
    'Standard / load': standard, Locator: locator, ...over,
  };
}

// ------------------------------------------------------------------------------------ measurements
// The four Polymaker sheets share a layout: physical on p. 2, thermal on p. 3, mechanical X-Y and Z on p. 4, and a
// "how to make specimens" page giving the print recipe and the one treatment the specimens had. The printing
// parameter table on p. 4 is a printing guide and belongs in profiles.csv, not in a specimen condition (D63).
const ISO527 = 'ISO 527, GB/T 1040';
const ISO178 = 'ISO 178, GB/T 9341';
const ISO179 = 'ISO 179, GB/T 1043';
const ISO306 = 'ISO 306, GB/T 1633';
const ISO1183 = 'ISO1183, GB/T1033';
const DSC = 'DSC, 10°C/min';
const spec = (nozzle, bed, env, fan, page) => `Printed at ${nozzle} nozzle, ${bed} bed, 2 shells, 4 top and bottom layers, 100% infill, ${env} environmental temperature, cooling fan ${fan} (${page}: how to make specimens)`;

const polymaker = (printParameters) => (over = {}) => ({ 'Specimen type': PRINTED, 'Post-processing': POLYMAKER_REST, 'Specimen / print parameters': printParameters, ...over });

/** The rows every Polymaker sheet of this layout publishes, given its own values. */
function polymakerRows(p, printParameters) {
  const on = polymaker(printParameters);
  const rows = [
    num('Density', p.density, 'g/cm3', 'gcc', ISO1183, 'p. 2: Density', { ...THERMAL, 'Specimen type': DENSITY_FORM, 'Test temperature': '23 °C' }),
    range('Melt mass-flow rate', p.melt.raw, 'g/10min', 'g10', p.melt.lo, p.melt.hi, p.melt.standard, 'p. 2: Melt index', THERMAL),
    num('Water absorption', p.water, '%', 'pct', NP, 'p. 2: Equilibrium water absorption', { ...THERMAL, Notes: 'The sheet prints this as an equilibrium value and names no test method.' }),
    num('Glass transition temperature', p.tg, '°C', 'C', DSC, 'p. 3: Glass transition temperature', THERMAL),
    num('Vicat softening temperature', p.vicat, '°C', 'C', ISO306, 'p. 3: Vicat softening temperature', on(THERMAL)),
    num('HDT', p.hdt18, '°C', 'C', 'ISO 75 1.8MPa', 'p. 3: Heat deflection temperature ISO 75 1.8MPa', on({ ...THERMAL, 'Test load MPa': '1.8' })),
    num('HDT', p.hdt045, '°C', 'C', 'ISO 75 0.45MPa', 'p. 3: Heat deflection temperature ISO 75 0.45MPa', on({ ...THERMAL, 'Test load MPa': '0.45' })),
    num('Tensile modulus', p.modulusXY, 'MPa', 'MPaGPa', ISO527, "p. 4: Young's modulus (X-Y)", on({ Direction: 'XY' })),
    num('Tensile modulus', p.modulusZ, 'MPa', 'MPaGPa', ISO527, "p. 4: Young's modulus (Z)", on({ Direction: 'Z' })),
    num('Tensile strength (endpoint unspecified)', p.strengthXY, 'MPa', 'MPa', ISO527, 'p. 4: Tensile strength (X-Y)', on({ Direction: 'XY' })),
    num('Tensile strength (endpoint unspecified)', p.strengthZ, 'MPa', 'MPa', ISO527, 'p. 4: Tensile strength (Z)', on({ Direction: 'Z' })),
    num('Elongation at break', p.elongationXY, '%', 'pct', ISO527, 'p. 4: Elongation at break (X-Y)', on({ Direction: 'XY' })),
    num('Elongation at break', p.elongationZ, '%', 'pct', ISO527, 'p. 4: Elongation at break (Z)', on({ Direction: 'Z' })),
    num('Flexural modulus', p.bendModulusXY, 'M P a', 'MPaGPa', ISO178, 'p. 4: Bending modulus (X-Y)', on({ Direction: 'XY' })),
    num('Flexural strength', p.bendStrengthXY, 'M P a', 'MPa', ISO178, 'p. 4: Bending strength (X-Y)', on({ Direction: 'XY' })),
    num('Charpy strength', p.charpyXY, 'kJ /m2', 'kJm2', ISO179, 'p. 4: Charpy impact strength (X-Y)', on({ Direction: 'XY', Notch: NP })),
  ];
  if (p.charpyLowTemp) rows.push(num('Charpy strength', p.charpyLowTemp, 'kJ /m2', 'kJm2', 'ISO 179-1/1eA:2010, -30°C',
    'p. 4: Low temperature impact strength (X-Y)', on({ Direction: 'XY', Notch: NP, 'Test temperature': '-30°C' })));
  return rows;
}

const ABS_SPEC = spec('255 °C', '100 °C', '90 °C', 'off', 'p. 5');
const ASA_SPEC = spec('260 °C', '80 °C', '70 °C', 'off', 'p. 5');
const PC_SPEC = `${spec('255 °C', '100 °C', '80 °C', 'off', 'p. 5')}; the mechanical table adds "Specimens printed on Raise 3D E2 with 0.4mm nozzle" (p. 4)`;
const PCFR_SPEC = spec('270 °C', '105 °C', '90 ˚C', 'off', 'p. 6');

const MEASUREMENTS = {
  'polylite-abs': { MaterialID: 'M027', SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3', rows: polymakerRows({
    density: '1.12 g/cm3', melt: { raw: '9 - 14 g/10min', lo: 9, hi: 14, standard: '220°C, 2.16kg' }, water: '0.35 %',
    tg: '101.1 °C', vicat: '103.9 °C', hdt18: '98.2 °C', hdt045: '99.6 °C',
    modulusXY: '2246.6 ± 58.2 MPa', modulusZ: '2080.9 ± 92.7 MPa',
    strengthXY: '33.4 ± 0.6 MPa', strengthZ: '29.7 ± 0.3 MPa',
    elongationXY: '17.9 ± 1.3 %', elongationZ: '3.1 ± 0.3 %',
    bendModulusXY: '2127.2 ± 29.9 M P a', bendStrengthXY: '56.2 ± 0.3 M P a', charpyXY: '18.0 ± 0.9 kJ /m2',
  }, ABS_SPEC) },
  'polylite-asa': { MaterialID: 'M031', SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3', rows: polymakerRows({
    density: '1.13 g/cm3', melt: { raw: '25 g/10min', lo: 25, hi: 25, standard: '220°C, 10 kg' }, water: '0.40 %',
    tg: '97.8 °C', vicat: '105.3 °C', hdt18: '100.2 °C', hdt045: '102.6 °C',
    modulusXY: '2174.6 ± 41.1 MPa', modulusZ: '1971.6 ± 78.8 MPa',
    strengthXY: '38.6 ± 0.3 MPa', strengthZ: '30.0 ± 0.5 MPa',
    elongationXY: '4.4 ± 1.0 %', elongationZ: '2.4 ± 0.1 %',
    bendModulusXY: '1939.7 ± 50.4 M P a', bendStrengthXY: '60.9 ± 0.9 M P a', charpyXY: '10.5 ± 0.6 kJ /m2',
  }, ASA_SPEC) },
  'polylite-pc': { MaterialID: 'M035', SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3', rows: polymakerRows({
    density: '1.19 g/cm3', melt: { raw: '8 - 11 g/10min', lo: 8, hi: 11, standard: '260°C, 2.16kg' }, water: '0.253 %',
    tg: '113.4 °C', vicat: '119.5 °C', hdt18: '106.6 °C', hdt045: '111.2 °C',
    modulusXY: '2497 ± 154 MPa', modulusZ: '2371 ± 55 MPa',
    strengthXY: '69.1 ± 3.0 MPa', strengthZ: '52.8 ± 1.7 MPa',
    elongationXY: '4.8 ± 0.9 %', elongationZ: '2.7 ± 0.1 %',
    bendModulusXY: '2640 ± 47 M P a', bendStrengthXY: '106.1 ± 1.6 M P a', charpyXY: '4.1 ± 0.9 kJ /m2',
  }, PC_SPEC) },
  'polymax-pc-fr': { MaterialID: 'M036', SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', rows: polymakerRows({
    density: '1.2 g/cm3', melt: { raw: '12 - 17 g/10min', lo: 12, hi: 17, standard: '260°C, 5 kg' }, water: '0.22 %',
    tg: '115 °C', vicat: '116 °C', hdt18: '107 °C', hdt045: '110 °C',
    modulusXY: '2634 ± 182 MPa', modulusZ: '2743 ± 72 MPa',
    strengthXY: '67 ± 4.5 MPa', strengthZ: '46 ± 4.8 MPa',
    elongationXY: '3.49 ± 0.7 %', elongationZ: '2.2 ± 0.3 %',
    bendModulusXY: '2518 ± 53 M P a', bendStrengthXY: '96.6 ± 1.3 M P a', charpyXY: '11.7 ± 1.6 kJ /m2',
    charpyLowTemp: '7.5 ± 1.6 kJ /m2',
  }, PCFR_SPEC) },
};

// The two Fiberon sheets are a single page each, with their own specimen drawings and recipe. PET-CF17 states that
// all of its specimens were annealed, so every row of it carries that state and its typed schedule; PETG-rCF08
// states no post-processing, and its moisture note is storage guidance, not the state at test.
const PETCF_SPEC = 'Printed at 300 °C nozzle, 70 °C bed, 100% infill, 2 shells, 3 top and bottom layers, cooling fan off; tensile, flexural and impact specimens to the drawings on the sheet (ASTM D638 / ISO 527, GB/T 1040 and ISO 179, GB/T 1043) (p. 1: how to make specimens)';
const PETGRCF_SPEC = 'Printed at 270 °C nozzle, 60 °C bed, 100% infill, 2 shells, 3 top and bottom layers, cooling fan 0-50%; tensile, flexural and impact specimens to the drawings on the sheet (ASTM D638 / ISO 527, GB/T 1040 and ISO 179, GB/T 1043) (p. 1: how to make specimens)';

const petcf = (over = {}) => ({ 'Specimen type': PRINTED, 'Post-processing': FIBERON_ANNEAL, 'Anneal °C': '120', 'Anneal h': '10', 'Specimen / print parameters': PETCF_SPEC, ...over });
const petgrcf = (over = {}) => ({ 'Specimen type': PRINTED, 'Moisture condition': '<20% RH during printing/storage', 'Specimen / print parameters': PETGRCF_SPEC, ...over });

MEASUREMENTS['fiberon-pet-cf17'] = { MaterialID: 'M067', SourceID: 'R-FIBERON-PETCF17-TDS', rows: [
  num('Density', '1.34 g/cm3', 'g/cm3', 'gcc', ISO1183, 'p. 1: Density', { ...THERMAL, 'Specimen type': DENSITY_FORM, 'Test temperature': '23°C' }),
  num('Melt mass-flow rate', '30.7 g/10min', 'g/10min', 'g10', '270°C, 2.16 kg', 'p. 1: Melt index', THERMAL),
  num('Water absorption', '0.53', '%', 'pct', NP, 'p. 1: Equilibrium water absorption', { ...THERMAL, Notes: 'The sheet prints this as an equilibrium value beside a moisture-absorption curve at 70% RH and 23 °C, and names no test method.' }),
  num('Glass transition temperature', '79.3 °C', '°C', 'C', DSC, 'p. 1: Glass transition temp.', THERMAL),
  num('Melting temperature', '241.3 °C', '°C', 'C', DSC, 'p. 1: Melting temperature', THERMAL),
  num('Crystallization temperature', '202.9 °C', '°C', 'C', DSC, 'p. 1: Crystallization temp.', THERMAL),
  num('Vicat softening temperature', '238.4 °C', '°C', 'C', ISO306, 'p. 1: Vicat softening temp.', petcf(THERMAL)),
  num('HDT', '105 °C', '°C', 'C', 'ISO 75 1.8MPa', 'p. 1: Heat deflection temp. ISO 75 1.8MPa', petcf({ ...THERMAL, 'Test load MPa': '1.8' })),
  num('HDT', '147.5 °C', '°C', 'C', 'ISO 75 0.45MPa', 'p. 1: Heat deflection temp. ISO 75 0.45MPa', petcf({ ...THERMAL, 'Test load MPa': '0.45' })),
  num('Tensile modulus', '5481.0 ± 223.7 MPa', 'MPa', 'MPaGPa', ISO527, "p. 1: Young's modulus (X-Y)", petcf({ Direction: 'XY' })),
  num('Tensile modulus', '3558.8 ± 260.4 MPa', 'MPa', 'MPaGPa', ISO527, "p. 1: Young's modulus (Z)", petcf({ Direction: 'Z' })),
  num('Tensile strength (endpoint unspecified)', '65.9 ± 1.0 MPa', 'MPa', 'MPa', ISO527, 'p. 1: Tensile strength (X-Y)', petcf({ Direction: 'XY' })),
  num('Tensile strength (endpoint unspecified)', '27.9 ± 1.3 MPa', 'MPa', 'MPa', ISO527, 'p. 1: Tensile strength (Z)', petcf({ Direction: 'Z' })),
  num('Elongation at break', '2.4 ± 0.5%', '%', 'pct', ISO527, 'p. 1: Elongation at break (X-Y)', petcf({ Direction: 'XY' })),
  num('Elongation at break', '0.8 ± 0.1%', '%', 'pct', ISO527, 'p. 1: Elongation at break (Z)', petcf({ Direction: 'Z' })),
  num('Flexural modulus', '4744.4± 136.3 MPa', 'MPa', 'MPaGPa', ISO178, 'p. 1: Bending modulus (X-Y)', petcf({ Direction: 'XY' })),
  num('Flexural modulus', '2768.2 ± 422.6 MPa', 'MPa', 'MPaGPa', ISO178, 'p. 1: Bending modulus (Z)', petcf({ Direction: 'Z' })),
  num('Flexural strength', '109.3 ± 2.0 MPa', 'MPa', 'MPa', ISO178, 'p. 1: Bending strength (X-Y)', petcf({ Direction: 'XY' })),
  num('Flexural strength', '43.4 ± 8.8 MPa', 'MPa', 'MPa', ISO178, 'p. 1: Bending strength (Z)', petcf({ Direction: 'Z' })),
  num('Charpy strength', '5.1 ± 0.2 kJ/m2', 'kJ/m2', 'kJm2', ISO179, 'p. 1: Charpy impact strength (X-Y) notched', petcf({ Direction: 'XY', Notch: 'Notched' })),
  num('Charpy strength', '25.1 ± 2.8 kJ/m2', 'kJ/m2', 'kJm2', ISO179, 'p. 1: Charpy impact strength (X-Y) un-notched', petcf({ Direction: 'XY', Notch: 'Unnotched' })),
  num('Charpy strength', '3.1 ± 0.7 kJ/m2', 'kJ/m2', 'kJm2', ISO179, 'p. 1: Charpy impact strength (Z) un-notched', petcf({ Direction: 'Z', Notch: 'Unnotched' })),
] };

MEASUREMENTS['fiberon-petg-rcf08'] = { MaterialID: 'M024', SourceID: 'R-FIBERON-PETGRCF08-TDS', rows: [
  num('Density', '1.30 g/cm3', 'g/cm3', 'gcc', ISO1183, 'p. 1: Density', { ...THERMAL, 'Specimen type': DENSITY_FORM, 'Test temperature': '23°C' }),
  num('Melt mass-flow rate', '11.5 g/10min', 'g/10min', 'g10', '230°C, 2.16 kg', 'p. 1: Melt index', THERMAL),
  num('Water absorption', '0.55', '%', 'pct', NP, 'p. 1: Equilibrium water absorption', { ...THERMAL, Notes: 'The sheet prints this as an equilibrium value beside a moisture-absorption curve at 70% RH and 23 °C, and names no test method.' }),
  num('Glass transition temperature', '69.7 °C', '°C', 'C', DSC, 'p. 1: Glass transition temp.', THERMAL),
  num('Vicat softening temperature', '81.6 °C', '°C', 'C', ISO306, 'p. 1: Vicat softening temp.', petgrcf(THERMAL)),
  num('HDT', '65.7 °C', '°C', 'C', 'ISO 75 1.8MPa', 'p. 1: Heat deflection temp. ISO 75 1.8MPa', petgrcf({ ...THERMAL, 'Test load MPa': '1.8' })),
  num('HDT', '68.6 °C', '°C', 'C', 'ISO 75 0.45MPa', 'p. 1: Heat deflection temp. ISO 75 0.45MPa', petgrcf({ ...THERMAL, 'Test load MPa': '0.45' })),
  num('Tensile modulus', '3710.1 ± 151.1 MPa', 'MPa', 'MPaGPa', ISO527, "p. 1: Young's modulus (X-Y)", petgrcf({ Direction: 'XY' })),
  num('Tensile modulus', '2651.9 ± 51.0 MPa', 'MPa', 'MPaGPa', ISO527, "p. 1: Young's modulus (Z)", petgrcf({ Direction: 'Z' })),
  num('Tensile strength (endpoint unspecified)', '59.8 ± 0.3 MPa', 'MPa', 'MPa', ISO527, 'p. 1: Tensile strength (X-Y)', petgrcf({ Direction: 'XY' })),
  num('Tensile strength (endpoint unspecified)', '41.1 ± 4.1 MPa', 'MPa', 'MPa', ISO527, 'p. 1: Tensile strength (Z)', petgrcf({ Direction: 'Z' })),
  num('Elongation at break', '5.7 ± 1.0%', '%', 'pct', ISO527, 'p. 1: Elongation at break (X-Y)', petgrcf({ Direction: 'XY' })),
  num('Elongation at break', '1.9 ± 0.3%', '%', 'pct', ISO527, 'p. 1: Elongation at break (Z)', petgrcf({ Direction: 'Z' })),
  num('Flexural modulus', '3779.1 ± 40.6 MPa', 'MPa', 'MPaGPa', ISO178, 'p. 1: Bending modulus (X-Y)', petgrcf({ Direction: 'XY' })),
  num('Flexural modulus', '1622.2 ± 104.6 MPa', 'MPa', 'MPaGPa', ISO178, 'p. 1: Bending modulus (Z)', petgrcf({ Direction: 'Z' })),
  num('Flexural strength', '94.6 ± 1.3 MPa', 'MPa', 'MPa', ISO178, 'p. 1: Bending strength (X-Y)', petgrcf({ Direction: 'XY' })),
  num('Flexural strength', '47.8 ± 2.4 MPa', 'MPa', 'MPa', ISO178, 'p. 1: Bending strength (Z)', petgrcf({ Direction: 'Z' })),
  num('Charpy strength', '4.0 ± 0.9 kJ/m2', 'kJ/m2', 'kJm2', ISO179, 'p. 1: Charpy impact strength (X-Y) notched', petgrcf({ Direction: 'XY', Notch: 'Notched' })),
  num('Charpy strength', '18.0 ± 1.1 kJ/m2', 'kJ/m2', 'kJm2', ISO179, 'p. 1: Charpy impact strength (X-Y) un-notched', petgrcf({ Direction: 'XY', Notch: 'Unnotched' })),
] };

// The BASF sheet publishes every mechanical and deflection value in two states, dried (p. 4) and conditioned at
// standard climate (p. 5), in up to three print directions, and its p. 2 "Used for test specimens" column says how
// the bars were printed. Each row therefore names its own state, direction and page: one source printing two
// tables must say which table each row came from (MEAS-CONDITIONS-INDISTINCT).
const PAHT_SPEC = 'Printed on a DDdrop FFF printer at 285 °C nozzle, 110 °C bed on glass, nozzle diameter >= 0.6 mm, 45 mm/s (p. 2: Recommended 3D-Print processing parameters, the "Used for test specimens" column)';
const DRY = 'Dry';
const paht = (state, over = {}) => ({ 'Specimen type': PRINTED, 'Moisture condition': state, 'Specimen / print parameters': PAHT_SPEC, ...over });
const DIRS = { XY: 'XY', XZ: 'XZ', ZX: 'ZX' };
const LABEL = { XY: 'XY Flat', XZ: 'XZ On its edge', ZX: 'ZX Upright' };

/** One mechanical row per direction the table fills, on one page and in one moisture state. */
const pahtRows = (page, state, property, unitKey, rawUnit, standard, label, values) =>
  Object.entries(values).filter(([, raw]) => raw != null).map(([dir, raw]) =>
    num(property, raw, rawUnit, unitKey, standard, `p. ${page}: ${label}, print direction ${LABEL[dir]}`,
      paht(state, { Direction: DIRS[dir] })));

MEASUREMENTS['ultrafuse-paht-cf15'] = { MaterialID: 'M048', SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v4-0', rows: [
  // p. 3, general and thermal. The density is measured on filament, which is not a part and bounds nothing (D55).
  num('Density', '1203 kg/m3', 'kg/m3', 'kgm3', 'ISO 1183-1', 'p. 3: Filament Density (conditioned)',
    { ...THERMAL, 'Specimen type': FILAMENT, 'Moisture condition': BASF_CONDITIONED, Notes: 'The sheet marks this row "measured on filament".' }),
  num('Hardness', '72', NP, 'Shore', 'ISO 7619-1', 'p. 3: Shore Hardness D, 15s / A, 30s',
    { ...THERMAL, Notes: 'The row is headed "Shore Hardness D, 15s / A, 30s" and prints one value, so the scale it belongs to is not established.' }),
  num('Glass transition temperature', '70 °C', '°C', 'C', 'ISO 11357-2', 'p. 3: Glass Transition Temperature', THERMAL),
  num('Crystallization temperature', '180 °C', '°C', 'C', 'ISO 11357-3', 'p. 3: Crystallization Temperature', THERMAL),
  num('Melting temperature', '234 °C', '°C', 'C', 'ISO 11357-3', 'p. 3: Melting Temperature', THERMAL),
  num('Melt volume-flow rate', '42.2 cm3/10min', 'cm3/10min', 'cm310', 'ISO 1133 (275°C/5kg)', 'p. 3: Melt Volume Flow Rate', THERMAL),
  num('Vicat softening temperature', '205 °C', '°C', 'C', 'ISO 306 (50 N)', 'p. 3: Vicat softening point @ 50 N (dry)', paht(DRY, THERMAL)),
  num('Vicat softening temperature', '221 °C', '°C', 'C', 'ISO 306 (10 N)', 'p. 3: Vicat softening point @ 10 N (dry)', paht(DRY, THERMAL)),
  num('HDT', '92 °C', '°C', 'C', 'ISO 75-2, 1.8 MPa', 'p. 3: HDT at 1.8 MPa (dry)', paht(DRY, { ...THERMAL, 'Test load MPa': '1.8' })),
  num('HDT', '145 °C', '°C', 'C', 'ISO 75-2, 0.45 MPa', 'p. 3: HDT at 0.45 MPa (dry)', paht(DRY, { ...THERMAL, 'Test load MPa': '0.45' })),
  // The sheet's conditioned heat-deflection and Vicat values (HDT 91 and 128 °C, Vicat 192 and 217 °C) are NOT
  // entered. kindOf gives a conditioned value its own conversion kind for the mechanical headlines, but the HDT and
  // Vicat branches return a literal kind with no moisture in it (build/src/estimate/observations.js), so a
  // conditioned row would be averaged with its dry twin: 145 and 128 °C would become one observation of 136.5 °C
  // describing neither state, and the conflict check would then inflate its noise and discard this formulation's
  // heat evidence altogether - the defect C-01 fixed for annealed twins, in the moisture dimension. Teaching the
  // model a conditioned HDT is a new conversion kind, which needs its own decision and a back-test showing it
  // helps (D58), so it is not done here. The values stay published and untranscribed, and audit:sources lists
  // them. The conditioned MECHANICAL rows of pp. 4-5 are entered: those the model does separate.

  // p. 4, dried specimens.
  ...pahtRows(4, DRY, 'Tensile strength (endpoint unspecified)', 'MPa', 'MPa', 'ISO 527 (testing speed 5 mm/min)', 'Tensile strength', { XY: '103.2 MPa', ZX: '18.2 MPa' }),
  ...pahtRows(4, DRY, 'Elongation at break', 'pct', '%', 'ISO 527 (testing speed 5 mm/min)', 'Elongation at Break', { XY: '1.8 %', ZX: '0.5 %' }),
  ...pahtRows(4, DRY, 'Tensile modulus', 'MPaGPa', 'MPa', 'ISO 527 (testing speed 1 mm/min)', "Young's Modulus", { XY: '8386 MPa', ZX: '3532 MPa' }),
  ...pahtRows(4, DRY, 'Flexural strength', 'MPa', 'MPa', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Strength', { XY: '160.7 MPa', XZ: '171.8 MPa', ZX: '50.8 MPa' }),
  ...pahtRows(4, DRY, 'Flexural modulus', 'MPaGPa', 'MPa', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Modulus', { XY: '8258 MPa', XZ: '7669 MPa', ZX: '2715 MPa' }),
  ...pahtRows(4, DRY, 'Flexural elongation at break', 'pct', '%', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Elongation at Break', { XY: '2.4 %', XZ: '2.8 %', ZX: '1.8 %' }),
  ...pahtRows(4, DRY, 'Charpy strength', 'kJm2', 'kJ/m²', 'ISO 179-2', 'Impact Strength Charpy (notched)', { XY: '4.8 kJ/m2', XZ: '3.9 kJ/m2', ZX: '1.3 kJ/m2' }).map((r) => ({ ...r, Notch: 'Notched' })),
  ...pahtRows(4, DRY, 'Charpy strength', 'kJm2', 'kJ/m²', 'ISO 179-2', 'Impact Strength Charpy (unnotched)', { XY: '20.6 kJ/m2', XZ: '19.3 kJ/m2', ZX: '2.9 kJ/m2' }).map((r) => ({ ...r, Notch: 'Unnotched' })),
  ...pahtRows(4, DRY, 'Izod impact strength', 'kJm2', 'kJ/m²', 'ISO 180', 'Impact Strength Izod (notched)', { XY: '4.9 kJ/m2', XZ: '5.1 kJ/m2' }).map((r) => ({ ...r, Notch: 'Notched' })),
  ...pahtRows(4, DRY, 'Izod impact strength', 'kJm2', 'kJ/m²', 'ISO 180', 'Impact Strength Izod (unnotched)', { XY: '16.4 kJ/m2', XZ: '18.1 kJ/m2', ZX: '2.9 kJ/m2' }).map((r) => ({ ...r, Notch: 'Unnotched' })),

  // p. 5, conditioned specimens.
  ...pahtRows(5, BASF_CONDITIONED, 'Tensile strength (endpoint unspecified)', 'MPa', 'MPa', 'ISO 527 (testing speed 5 mm/min)', 'Tensile strength', { XY: '62.9 MPa', ZX: '19.1 MPa' }),
  ...pahtRows(5, BASF_CONDITIONED, 'Elongation at break', 'pct', '%', 'ISO 527 (testing speed 5 mm/min)', 'Elongation at Break', { XY: '2.9 %', ZX: '0.8 %' }),
  ...pahtRows(5, BASF_CONDITIONED, 'Tensile modulus', 'MPaGPa', 'MPa', 'ISO 527 (testing speed 1 mm/min)', "Young's Modulus", { XY: '5052 MPa', ZX: '2455 MPa' }),
  ...pahtRows(5, BASF_CONDITIONED, 'Flexural strength', 'MPa', 'MPa', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Strength', { XY: '125.1 MPa', XZ: '121.9 MPa', ZX: '56.0 MPa' }),
  ...pahtRows(5, BASF_CONDITIONED, 'Flexural modulus', 'MPaGPa', 'MPa', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Modulus', { XY: '6063 MPa', XZ: '6260 MPa', ZX: '2190 MPa' }),
  qual('Flexural elongation at break', 'No break', 'pct', 'ISO 178 (testing speed 2 mm/min)', 'p. 5: Flexural Elongation at Break, print direction XY Flat', paht(BASF_CONDITIONED, { Direction: 'XY' })),
  ...pahtRows(5, BASF_CONDITIONED, 'Flexural elongation at break', 'pct', '%', 'ISO 178 (testing speed 2 mm/min)', 'Flexural Elongation at Break', { XZ: '3.6 %', ZX: '4.0 %' }),
  ...pahtRows(5, BASF_CONDITIONED, 'Charpy strength', 'kJm2', 'kJ/m²', 'ISO 179-2', 'Impact Strength Charpy (notched)', { XY: '5.1 kJ/m2', XZ: '5.3 kJ/m2', ZX: '1.6 kJ/m2' }).map((r) => ({ ...r, Notch: 'Notched' })),
  ...pahtRows(5, BASF_CONDITIONED, 'Charpy strength', 'kJm2', 'kJ/m²', 'ISO 179-2', 'Impact Strength Charpy (unnotched)', { XY: '21.9 kJ/m2', XZ: '20.4 kJ/m2', ZX: '2.8 kJ/m2' }).map((r) => ({ ...r, Notch: 'Unnotched' })),
  ...pahtRows(5, BASF_CONDITIONED, 'Izod impact strength', 'kJm2', 'kJ/m²', 'ISO 180', 'Impact Strength Izod (notched)', { XY: '6.5 kJ/m2', XZ: '5.8 kJ/m2' }).map((r) => ({ ...r, Notch: 'Notched' })),
  ...pahtRows(5, BASF_CONDITIONED, 'Izod impact strength', 'kJm2', 'kJ/m²', 'ISO 180', 'Impact Strength Izod (unnotched)', { XY: '16.3 kJ/m2', XZ: '15.1 kJ/m2', ZX: '4.1 kJ/m2' }).map((r) => ({ ...r, Notch: 'Unnotched' })),
] };

// ------------------------------------------------------------------------------------ coverage
// A new grade changes a material's manufacturer count, and a Grades row whose count or whose own words disagree
// with the records stops the build (COVERAGE-UNTRUE, D39). The finding is written from the live count, so the prose
// and the column cannot drift apart. A row is never edited in place: it is superseded and replaced (AGENTS.md).
const COVERAGE_GRADES = ['M024', 'M027', 'M031', 'M035', 'M036', 'M048', 'M067'];

// ------------------------------------------------------------------------------------ the guard
// Nothing enters from a report, a summary or an earlier audit's reading (D35). Every source must be cached and hash
// -matched, and every number below must be on the page it cites, checked against the text of the cached file itself.
const cachePath = (id) => join(projectRoot, '.cache/sources', `${id}.pdf`);

/** The text of a PDF, page by page, with every space removed so a value split across spans still matches. */
async function pageText(path) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), useSystemFonts: true }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.map((i) => i.str ?? '').join('').replace(/\s+/g, ''));
  }
  return pages;
}

async function assertReadable() {
  const problems = [];
  for (const s of SOURCES) {
    const path = cachePath(s.SourceID);
    if (!existsSync(path)) { problems.push(`${s.SourceID}: not cached at .cache/sources/${s.SourceID}.pdf`); continue; }
    const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (sha !== s.SHA256) { problems.push(`${s.SourceID}: the cached file is ${sha.slice(0, 12)}, this migration was written against ${s.SHA256.slice(0, 12)}`); continue; }

    // Every value of this source, on the page its Locator names, in the document's own text.
    const pages = await pageText(path);
    const rows = Object.values(MEASUREMENTS).filter((m) => m.SourceID === s.SourceID).flatMap((m) => m.rows);
    for (const r of rows) {
      const page = Number(/^p\.\s*(\d+)/.exec(r.Locator)?.[1]);
      if (!page || !pages[page - 1]) { problems.push(`${s.SourceID}: ${r.Locator} names no page this document has`); continue; }
      const digits = String(r['Raw value']).replace(/\s+/g, '');
      const number = /^[<>]?\s*(-?[\d.]+)/.exec(String(r['Raw value']))?.[1];
      if (!number) continue;
      if (!pages[page - 1].includes(number)) problems.push(`${s.SourceID}: "${number}" (${r.Property}, ${r.Locator}) is not on page ${page} of the document; the transcription or the locator is wrong`);
      const unc = /±\s*([\d.]+)/.exec(digits)?.[1];
      if (unc && !pages[page - 1].includes(unc)) problems.push(`${s.SourceID}: the uncertainty "${unc}" of ${r.Property} (${r.Locator}) is not on page ${page}`);
    }
  }
  if (problems.length) {
    throw new Error(`${MIGRATION}: nothing entered. Under D35 a value enters only from a fetched, hashed source, re-read page by page.\n  - ${problems.join('\n  - ')}`);
  }
}

export async function migrate(t) {
  await assertReadable();

  for (const s of SOURCES) if (!t.find('sources', s.SourceID)) t.append('sources', { 'Access date': DATE, ...s });

  const gradeIds = {};
  for (const { key, ...g } of GRADES) {
    const existing = t.rows('grades').find((r) => r.SourceID === g.SourceID && r['Product name'] === g['Product name']);
    if (existing) { gradeIds[key] = existing.GradeID; continue; }
    const row = { ...GRADE_DEFAULTS, ...g, GradeID: nextId('grades', t.rows('grades').map((r) => r.GradeID), { materialId: g.MaterialID }) };
    t.append('grades', row);
    gradeIds[key] = row.GradeID;
  }
  for (const [key, id] of Object.entries(EXPECTED_GRADE_IDS)) {
    if (gradeIds[key] !== id) throw new Error(`${MIGRATION}: ${key} became ${gradeIds[key]}, not ${id}; the sources' "Applicable grades" name ${id}`);
  }

  for (const [key, { MaterialID, SourceID, rows }] of Object.entries(MEASUREMENTS)) {
    for (const r of rows) {
      if (t.rows('measurements').some((x) => x.SourceID === SourceID && x.Locator === r.Locator)) continue;
      const row = { ...r, MeasurementID: nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID)), MaterialID, GradeID: gradeIds[key], SourceID };
      row.Notes = row.Notes === NA ? ADDED : `${ADDED} ${row.Notes}`;
      t.append('measurements', row);
    }
  }

  const manufacturers = (materialId) => new Set(t.rows('grades')
    .filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active')
    .map((g) => g.Manufacturer)).size;
  for (const materialId of COVERAGE_GRADES) {
    const old = t.rows('coverage').find((r) => r.MaterialID === materialId && r.Domain === 'Grades' && r.Status !== 'Superseded');
    if (!old) continue;
    const n = manufacturers(materialId);
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', {
      CoverageID: newId, MaterialID: materialId, Domain: 'Grades',
      Status: n >= 3 ? 'Resolved' : 'Gap', 'Manufacturer count': String(n),
      Finding: `${n} distinct manufacturer(s) documented against target 3. A second formulation was recorded ${DATE} (${MIGRATION}) from a data sheet publishing heat deflection at both loads and a printed strength, so the screening back-test has a case for this material (D48, D59).`,
    });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  await migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
